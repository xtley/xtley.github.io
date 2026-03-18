/**
 * 音乐播放器 + PJAX 无刷新切换
 * 功能：页面切换时音乐不中断
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

        window._aplayer = new APlayer({
            container: container,
            fixed: true,
            autoplay: false,
            theme: '#42b983',
            loop: 'all',
            order: 'list',
            preload: 'auto',
            volume: 0.7,
            listFolded: true,
            audio: musicList
        });
    }

    // 初始化 PJAX
    function initPjax() {
        if (!window.Pjax) return;

        new Pjax({
            selectors: ['title', 'main.content'],
            cacheBust: false
        });

        // PJAX 切换完成后，重新初始化页面特定的脚本
        document.addEventListener('pjax:complete', function () {
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
