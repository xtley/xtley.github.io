/**
 * 音乐播放器 + PJAX 无刷新切换
 * 功能：页面切换时音乐不中断，刷新后自动恢复播放进度
 * v2 - 重写状态恢复逻辑
 */
(function () {
    // ========== 歌曲列表配置 ==========
    var musicList = [
        {
            name: '别辜负眼前季节',
            artist: '七朵组合',
            url: '/medias/music/yongchun_dj.m4a',
            cover: '/medias/music/yongchun_dj.jpg'
        },
    ];
    // ==================================

    var SK = 'aplayer_state';
    var _playing = false;
    var _unloading = false;

    // ---- 状态持久化 ----
    function save() {
        if (!window._aplayer) return;
        try {
            localStorage.setItem(SK, JSON.stringify({
                i: window._aplayer.list.index,
                t: window._aplayer.audio.currentTime,
                p: _playing,
                v: window._aplayer.audio.volume
            }));
        } catch (e) {}
    }

    function saveOnUnload() {
        if (!window._aplayer) return;
        try {
            var raw = localStorage.getItem(SK);
            var old = raw ? JSON.parse(raw) : {};
            // 只更新进度，保留 playing 状态（浏览器 unload 时会暂停音频）
            old.t = window._aplayer.audio.currentTime;
            old.i = window._aplayer.list.index;
            localStorage.setItem(SK, JSON.stringify(old));
        } catch (e) {}
    }

    function load() {
        try {
            var raw = localStorage.getItem(SK);
            if (!raw) return null;
            var s = JSON.parse(raw);
            return s;
        } catch (e) { return null; }
    }

    // ---- 播放器初始化 ----
    function initMusicPlayer() {
        if (window._aplayer) return;
        if (musicList.length === 0) return;

        var container = document.getElementById('aplayer-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'aplayer-container';
            document.body.appendChild(container);
        }

        var saved = load();

        window._aplayer = new APlayer({
            container: container,
            fixed: true,
            autoplay: false,
            theme: '#42b983',
            loop: 'all',
            order: 'list',
            preload: 'auto',
            volume: (saved && saved.v != null) ? saved.v : 0.7,
            listFolded: true,
            audio: musicList
        });

        var ap = window._aplayer;

        // 跟踪播放状态
        ap.on('play', function () {
            _playing = true;
            save();
        });
        ap.on('pause', function () {
            if (!_unloading) {
                _playing = false;
                save();
            }
        });

        // 定期保存进度
        setInterval(function () {
            if (!_unloading) save();
        }, 2000);

        // unload 只更新进度
        window.addEventListener('beforeunload', function () {
            _unloading = true;
            saveOnUnload();
        });

        // ---- 恢复播放 ----
        if (saved && saved.p) {
            // 切歌
            if (saved.i > 0 && saved.i < musicList.length) {
                ap.list.switch(saved.i);
            }

            var restored = false;
            function doRestore() {
                if (restored) return;
                restored = true;
                // 跳转进度
                if (saved.t > 0) {
                    try { ap.seek(saved.t); } catch (e) {}
                }
                // 尝试播放
                ap.play();
                // 500ms 后检查是否成功
                setTimeout(function () {
                    if (ap.audio.paused) {
                        // 被浏览器阻止了，等用户任意交互
                        bindClick();
                    }
                }, 500);
            }

            function bindClick() {
                function handler() {
                    document.removeEventListener('click', handler, true);
                    document.removeEventListener('touchstart', handler, true);
                    document.removeEventListener('keydown', handler, true);
                    if (ap.audio.paused) {
                        if (saved.t > 0) {
                            try { ap.seek(saved.t); } catch (e) {}
                        }
                        ap.play();
                    }
                }
                document.addEventListener('click', handler, true);
                document.addEventListener('touchstart', handler, true);
                document.addEventListener('keydown', handler, true);
            }

            // 等音频就绪
            if (ap.audio.readyState >= 2) {
                doRestore();
            } else {
                ap.audio.addEventListener('canplay', function h() {
                    ap.audio.removeEventListener('canplay', h);
                    doRestore();
                });
                setTimeout(doRestore, 3000);
            }
        }
    }

    // ---- PJAX ----
    function initPjax() {
        if (!window.Pjax) return;

        var wasPlaying = false;

        new Pjax({
            selectors: ['title', 'main.content'],
            cacheBust: false
        });

        document.addEventListener('pjax:send', function () {
            if (window._aplayer && !window._aplayer.audio.paused) {
                wasPlaying = true;
            }
        });

        document.addEventListener('pjax:complete', function () {
            if (wasPlaying && window._aplayer) {
                window._aplayer.play();
                wasPlaying = false;
            }
            if (window.M) {
                var elems = document.querySelectorAll('.sidenav');
                if (elems.length) M.Sidenav.init(elems);
                var tooltips = document.querySelectorAll('.tooltipped');
                if (tooltips.length) M.Tooltip.init(tooltips);
            }
            if (window.Prism) Prism.highlightAll();
            if (window.lightGallery) {
                document.querySelectorAll('.article-content').forEach(function (el) {
                    try { lightGallery(el, { selector: 'img' }); } catch (e) {}
                });
            }
            if (window.tocbot) { try { tocbot.refresh(); } catch (e) {} }
            window.dispatchEvent(new Event('scroll'));
            if (window.MathJax) { try { MathJax.typeset(); } catch (e) {} }
        });
    }

    // ---- 启动 ----
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
