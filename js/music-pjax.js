/**
 * 音乐播放器 + PJAX 无刷新切换
 * 功能：页面切换时音乐不中断，刷新后自动恢复播放进度
 */
(function () {
    // ========== 歌曲列表配置 ==========
    // 添加歌曲：在数组中添加一条记录即可
    var musicList = [
        {
            name: '别辜负眼前季节',
            artist: '七朵组合',
            url: '/medias/music/yongchun_dj.m4a',
            cover: '/medias/music/yongchun_dj.jpg'
        },
        // 添加更多歌曲示例：
        // {
        //     name: '歌曲名',
        //     artist: '歌手',
        //     url: '/medias/music/文件名.mp3',
        //     cover: '/medias/music/封面.jpg'
        // },
    ];
    // ==================================

    var STORAGE_KEY = 'aplayer_state';

    // 保存播放状态到 localStorage
    function saveState() {
        if (!window._aplayer) return;
        try {
            var state = {
                songIndex: window._aplayer.list.index,
                currentTime: window._aplayer.audio.currentTime,
                wasPlaying: !window._aplayer.audio.paused,
                volume: window._aplayer.audio.volume,
                ts: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {}
    }

    // 从 localStorage 恢复播放状态
    function restoreState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var state = JSON.parse(raw);
            // 状态超过 24 小时则忽略
            if (Date.now() - state.ts > 86400000) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return state;
        } catch (e) {
            return null;
        }
    }

    // 初始化音乐播放器（全局只初始化一次）
    function initMusicPlayer() {
        if (window._aplayer) return; // 已经初始化过，不重复创建
        if (musicList.length === 0) return;

        // 创建播放器容器（如果不存在）
        var container = document.getElementById('aplayer-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'aplayer-container';
            document.body.appendChild(container);
        }

        var savedState = restoreState();

        window._aplayer = new APlayer({
            container: container,
            fixed: true,
            autoplay: false,
            theme: '#42b983',
            loop: 'all',
            order: 'list',
            preload: 'auto',
            volume: savedState ? savedState.volume : 0.7,
            listFolded: true,
            audio: musicList
        });

        // 恢复上次播放状态
        if (savedState && savedState.songIndex < musicList.length) {
            var ap = window._aplayer;
            // 切换到上次播放的歌曲
            ap.list.switch(savedState.songIndex);
            // 等音频加载后跳转到上次的进度
            ap.on('canplay', function onCanPlay() {
                ap.off('canplay', onCanPlay);
                if (savedState.currentTime > 0) {
                    ap.seek(savedState.currentTime);
                }
                if (savedState.wasPlaying) {
                    ap.play();
                }
            });
        }

        // 页面关闭或刷新前保存状态
        window.addEventListener('beforeunload', saveState);

        // 定期保存状态（防止浏览器崩溃丢失）
        setInterval(saveState, 3000);
    }

    // 初始化 PJAX
    function initPjax() {
        if (!window.Pjax) return;

        var wasPlaying = false;

        new Pjax({
            selectors: ['title', 'main.content'],
            cacheBust: false
        });

        // PJAX 开始前记录播放状态
        document.addEventListener('pjax:send', function () {
            if (window._aplayer && !window._aplayer.audio.paused) {
                wasPlaying = true;
            }
        });

        // PJAX 切换完成后，恢复播放状态并重新初始化页面脚本
        document.addEventListener('pjax:complete', function () {
            // 恢复音乐播放
            if (wasPlaying && window._aplayer) {
                window._aplayer.play();
                wasPlaying = false;
            }
            // 重新初始化 Materialize 组件
            if (window.M) {
                var elems = document.querySelectorAll('.sidenav');
                if (elems.length) M.Sidenav.init(elems);
                var tooltips = document.querySelectorAll('.tooltipped');
                if (tooltips.length) M.Tooltip.init(tooltips);
            }

            // 重新初始化代码高亮
            if (window.Prism) Prism.highlightAll();

            // 重新初始化图片灯箱
            if (window.lightGallery) {
                var galleries = document.querySelectorAll('.article-content');
                galleries.forEach(function (el) {
                    try { lightGallery(el, { selector: 'img' }); } catch (e) {}
                });
            }

            // 重新初始化 TOC
            if (window.tocbot) {
                try { tocbot.refresh(); } catch (e) {}
            }

            // 触发页面滚动事件（让 AOS 等动画库重新工作）
            window.dispatchEvent(new Event('scroll'));

            // MathJax 重新渲染
            if (window.MathJax) {
                try { MathJax.typeset(); } catch (e) {}
            }
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initMusicPlayer();
            initPjax();
        });
    } else {
        initMusicPlayer();
        initPjax();
    }
})();
