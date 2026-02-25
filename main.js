// One — スクロールでふわっと表示

(function () {
  'use strict';

  // ヒーローはCSSの keyframes で表示済みのためここでは何もしない

  // スクロールで画面に入ったら .is-visible を付与（少し手前で発火）
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -5% 0px',
    threshold: 0.05
  });

  document.querySelectorAll('.section, .footer').forEach(function (el) {
    observer.observe(el);
  });
})();
