/**
 * 音乐播放器 + PJAX 无刷新切换
 * v3 - autoplay 恢复
 */
(function () {
    var musicList = [
        {
            name: '别辜负眼前季节',
            artist: '七朵组合',
            url: '/medias/music/yongchun_dj.m4a',
            cover: '/medias/music/yongchun_dj.jpg'
        },
    ];

    var SK = 'aplayer_state';
    var _playing = false;
    var _unloading = false;

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

    function load() {
        try {
            var raw = localStorage.getItem(SK);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function initMusicPlayer() {
        if (window._aplayer || musicList.length === 0) return;

        var container = document.getElementById('aplayer-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'aplayer-container';
            document.body.appendChild(container);
        }

        var saved = load();
        var shouldPlay = saved && saved.p;

        // 如果之前在播放，直接用 autoplay:true 创建
        window._aplayer = new APlayer({
            container: container,
            fixed: true,
            autoplay: shouldPlay,
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
        ap.on('play', function () { _playing = true; save(); });
        ap.on('pause', function () {
            if (!_unloading) { _playing = false; save(); }
        });

        // 定期保存进度
        setInterval(function () { if (!_unloading) save(); }, 2000);

        // unload 时只更新进度，不改 playing 状态
        window.addEventListener('beforeunload', function () {
            _unloading = true;
            if (!window._aplayer) return;
            try {
                var raw = localStorage.getItem(SK);
                var old = raw ? JSON.parse(raw) : {};
                old.t = ap.audio.currentTime;
                old.i = ap.list.index;
                localStorage.setItem(SK, JSON.stringify(old));
            } catch (e) {}
        });

        // 恢复进度
        if (saved) {
            if (saved.i > 0 && saved.i < musicList.length) {
                ap.list.switch(saved.i);
            }
            if (saved.t > 0) {
                // 等音频就绪后 seek
                function doSeek() {
                    try { ap.seek(saved.t); } catch (e) {}
                }
                if (ap.audio.readyState >= 2) {
                    doSeek();
                } else {
                    ap.audio.addEventListener('canplay', function h() {
                        ap.audio.removeEventListener('canplay', h);
                        doSeek();
                    });
                    setTimeout(doSeek, 3000);
                }
            }

            // 如果 autoplay 被浏览器阻止，绑定用户交互恢复
            if (shouldPlay) {
                setTimeout(function () {
                    if (ap.audio.paused) {
                        // autoplay 被阻止了
                        var events = ['mousedown', 'touchstart', 'keydown'];
                        function resume() {
                            events.forEach(function (e) {
                                document.removeEventListener(e, resume, true);
                            });
                            if (ap.audio.paused) {
                                if (saved.t > 0) {
                                    try { ap.seek(saved.t); } catch (e) {}
                                }
                                ap.play();
                            }
                        }
                        events.forEach(function (e) {
                            document.addEventListener(e, resume, true);
                        });
                    }
                }, 1000);
            }
        }
    }

    function initPjax() {
        if (!window.Pjax) return;
        var wasPlaying = false;
        new Pjax({ selectors: ['title', 'main.content'], cacheBust: false });

        document.addEventListener('pjax:send', function () {
            if (window._aplayer && !window._aplayer.audio.paused) wasPlaying = true;
        });
        document.addEventListener('pjax:complete', function () {
            if (wasPlaying && window._aplayer) {
                window._aplayer.play();
                wasPlaying = false;
            }
            if (window.M) {
                var e = document.querySelectorAll('.sidenav');
                if (e.length) M.Sidenav.init(e);
                var t = document.querySelectorAll('.tooltipped');
                if (t.length) M.Tooltip.init(t);
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
