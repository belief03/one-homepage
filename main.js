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

  // スマホTOP：今日のことば以外を開閉バー化（初期はサービスのみ展開）
  (function () {
    var isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile) return;

    var sections = document.querySelectorAll('.section:not(.section--daily-quote)');
    sections.forEach(function (section, sectionIndex) {
      var titleEl = section.querySelector('.section__title');
      if (!titleEl) return;

      var titleText = (titleEl.textContent || '').trim();
      if (!titleText) return;

      var panel = document.createElement('div');
      panel.className = 'section__mobile-panel';
      panel.id = (section.id ? section.id : 'section-' + sectionIndex) + '-mobile-panel';

      var node = titleEl.nextElementSibling;
      while (node) {
        var nextNode = node.nextElementSibling;
        panel.appendChild(node);
        node = nextNode;
      }

      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'section__mobile-trigger';
      trigger.setAttribute('aria-controls', panel.id);
      trigger.setAttribute('aria-expanded', 'false');
      trigger.innerHTML =
        '<span class="section__mobile-trigger-title">' + titleText + '</span>' +
        '<span class="section__mobile-trigger-toggle" aria-hidden="true"></span>';

      section.classList.add('section--mobile-collapsible');
      section.appendChild(trigger);
      section.appendChild(panel);

      var isDefaultOpen = section.id === 'services';
      if (isDefaultOpen) {
        panel.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        panel.style.maxHeight = '0';
      }

      function syncPanelHeight() {
        if (panel.classList.contains('is-open')) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        } else {
          panel.style.maxHeight = '0';
        }
      }

      syncPanelHeight();
      window.addEventListener('resize', syncPanelHeight);

      trigger.addEventListener('click', function () {
        var nextOpen = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', nextOpen);
        trigger.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        syncPanelHeight();
      });
    });
  })();

  // お問い合わせ：よくある質問バーの開閉（開いたとき内容の高さまで広がる）
  var faqTrigger = document.getElementById('faq-trigger');
  var faqPanel = document.getElementById('faq-panel');
  if (faqTrigger && faqPanel) {
    faqTrigger.addEventListener('click', function () {
      var isOpen = faqPanel.classList.toggle('is-open');
      faqTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      faqPanel.style.maxHeight = isOpen ? '' : '0';
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

  // 今日のことば：吉田松陰先生語録（日替わり表示）
  var quoteMiniEl = document.getElementById('daily-quote-mini');
  var quoteTriggerEl = document.getElementById('daily-quote-trigger');
  var quoteModalEl = document.getElementById('daily-quote-modal');
  var quoteModalTextEl = document.getElementById('daily-quote-modal-text');
  var quoteModalNoteEl = document.getElementById('daily-quote-modal-note');

  if (quoteMiniEl) {
    var quotes = [
      {
        text: '一日一字を記さば、一年にして三百六十五字となる。',
        note: '小さな積み重ねが、やがて大きな力になることを教えてくれる言葉です。'
      },
      {
        text: '夢なき者に理想なし、理想なき者に計画なし。',
        note: '目指す姿を言葉にすると、具体的な一歩を決めやすくなるという示唆です。'
      }
    ];

    if (quotes.length > 0) {
      function getTodayQuoteIndex() {
        var today = new Date();
        var dayIndex = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
        return Math.abs(dayIndex) % quotes.length;
      }

      function applyQuoteByIndex(index) {
        var todayQuote = quotes[index];
        quoteMiniEl.textContent = todayQuote.text;
        if (quoteModalTextEl) quoteModalTextEl.textContent = todayQuote.text;
        if (quoteModalNoteEl) quoteModalNoteEl.textContent = todayQuote.note || '';
      }

      // 初回描画
      var lastIndex = getTodayQuoteIndex();
      applyQuoteByIndex(lastIndex);

      function refreshIfNeeded() {
        var nextIndex = getTodayQuoteIndex();
        if (nextIndex === lastIndex) return;
        lastIndex = nextIndex;
        applyQuoteByIndex(lastIndex);
      }

      // ページを開きっぱなしでも日付が変わったら更新
      // （分単位で十分。無駄な頻度で負荷を上げない）
      setInterval(function () {
        refreshIfNeeded();
      }, 60 * 1000);

      // バックグラウンドで停止される端末/環境でも、戻ってきた瞬間に再計算
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) refreshIfNeeded();
      });
    }
  }

  // 今日のことば：クリックで意味（現代語訳）を表示
  (function () {
    if (!quoteTriggerEl || !quoteModalEl) return;

    var closeEls = quoteModalEl.querySelectorAll('[data-modal-close="true"]');

    function openModal() {
      quoteModalEl.classList.add('is-open');
      quoteModalEl.setAttribute('aria-hidden', 'false');
      quoteTriggerEl.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-modal-open');

      // フォーカスは閉じるボタン優先
      var closeBtn = quoteModalEl.querySelector('.modal__close');
      if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
      quoteModalEl.classList.remove('is-open');
      quoteModalEl.setAttribute('aria-hidden', 'true');
      quoteTriggerEl.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-modal-open');
      quoteTriggerEl.focus();
    }

    quoteTriggerEl.addEventListener('click', function () {
      openModal();
    });

    closeEls.forEach(function (el) {
      el.addEventListener('click', function () {
        closeModal();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && quoteModalEl.classList.contains('is-open')) {
        closeModal();
      }
    });
  })();
})();
