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

  // ご案内：クリックで本のように開く
  var jumpNav = document.querySelector('.jump-nav');
  var jumpNavTrigger = document.getElementById('jump-nav-trigger');
  if (jumpNav && jumpNavTrigger) {
    jumpNavTrigger.addEventListener('click', function () {
      var isOpen = jumpNav.classList.toggle('is-open');
      jumpNavTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // お問い合わせ：よくある質問バーの開閉
  var faqTrigger = document.getElementById('faq-trigger');
  var faqPanel = document.getElementById('faq-panel');
  if (faqTrigger && faqPanel) {
    faqTrigger.addEventListener('click', function () {
      var isOpen = faqPanel.classList.toggle('is-open');
      faqTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // よくある質問：チャット形式（ボタン選択 → ・・・・ → 回答表示）
  var faqAnswersEl = document.getElementById('faq-answers-data');
  var faqTypingWrap = document.getElementById('faq-typing-wrap');
  var faqAnswerWrap = document.getElementById('faq-answer-wrap');
  var faqAnswerText = document.getElementById('faq-answer-text');
  var faqBtns = document.querySelectorAll('.faq-btn');
  var faqTypingDuration = 1800;

  if (faqAnswersEl && faqTypingWrap && faqAnswerWrap && faqAnswerText && faqBtns.length) {
    var faqAnswers = [];
    try {
      faqAnswers = JSON.parse(faqAnswersEl.textContent);
    } catch (e) {}

    faqBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var index = parseInt(btn.getAttribute('data-faq'), 10);
        if (index < 0 || index >= faqAnswers.length) return;

        faqAnswerWrap.classList.remove('is-visible');
        faqAnswerText.textContent = '';
        faqTypingWrap.setAttribute('aria-hidden', 'false');
        faqTypingWrap.classList.add('is-visible');

        faqBtns.forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');

        setTimeout(function () {
          faqTypingWrap.classList.remove('is-visible');
          faqTypingWrap.setAttribute('aria-hidden', 'true');
          faqAnswerText.textContent = faqAnswers[index];
          faqAnswerWrap.classList.add('is-visible');
        }, faqTypingDuration);
      });
    });
  }
})();
