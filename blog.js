/**
 * One｜microCMS ブログ
 * - blog.html : 一覧（リンク付きサムネ）
 * - blog-post.html?id= : 詳細 + SEOメタ更新
 * - [data-blog-latest] : トップ等の最新記事
 */
(function () {
  'use strict';

  var cfg = window.ONE_MICROCMS || {};
  var CATEGORY_LABELS = {
    homepage: 'ホームページ制作',
    seo: 'SEO・集客',
    tips: '制作のヒント',
    news: 'お知らせ'
  };

  function hasConfig() {
    return !!(cfg.serviceDomain && cfg.endpoint && cfg.apiKey);
  }

  function apiUrl(path, query) {
    var base = 'https://' + cfg.serviceDomain + '.microcms.io/api/v1/' + cfg.endpoint;
    if (path) base += '/' + encodeURIComponent(path);
    if (query) {
      var qs = Object.keys(query)
        .filter(function (k) {
          return query[k] !== undefined && query[k] !== null && query[k] !== '';
        })
        .map(function (k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]);
        })
        .join('&');
      if (qs) base += '?' + qs;
    }
    return base;
  }

  function fetchCms(path, query) {
    if (!hasConfig()) {
      return Promise.reject(new Error('microCMS APIキーが未設定です'));
    }
    return fetch(apiUrl(path, query), {
      headers: { 'X-MICROCMS-API-KEY': cfg.apiKey }
    }).then(function (res) {
      if (!res.ok) throw new Error('microCMS error: ' + res.status);
      return res.json();
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : String(d.getMonth() + 1);
    var day = d.getDate() < 10 ? '0' + d.getDate() : String(d.getDate());
    return y + '.' + m + '.' + day;
  }

  function categoryLabel(value) {
    if (!value) return '';
    // リッチエディタ等でHTMLが入る場合があるためタグを除去
    var text = String(value).replace(/<[^>]+>/g, '').trim();
    if (!text) return '';
    return CATEGORY_LABELS[text] || text;
  }

  /** microCMS: フィールドIDが title / titile どちらでも可 */
  function postTitle(post) {
    if (!post) return '';
    return post.title || post.titile || '';
  }

  function isNoindex(post) {
    return !!(post && (post.noindex === true || post.noindex === 'true'));
  }

  function eyecatchUrl(post, width) {
    if (!post || !post.eyecatch || !post.eyecatch.url) return '';
    var url = post.eyecatch.url;
    var w = width || 800;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'w=' + w + '&fm=webp';
  }

  function postHref(post) {
    return 'blog-post.html?id=' + encodeURIComponent(post.id);
  }

  function setMeta(name, content, attr) {
    if (!content) return;
    attr = attr || 'name';
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setCanonical(url) {
    var el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      document.head.appendChild(el);
    }
    el.setAttribute('href', url);
  }

  function injectJsonLd(data) {
    var old = document.getElementById('blog-jsonld');
    if (old) old.remove();
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'blog-jsonld';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function renderListItem(post) {
    var href = postHref(post);
    var title = escapeHtml(postTitle(post) || '無題');
    var desc = escapeHtml(post.description || '');
    var date = formatDate(post.publishedAt || post.createdAt);
    var cat = escapeHtml(categoryLabel(post.category));
    var img = eyecatchUrl(post, 640);
    var thumb = img
      ? '<span class="blog-card__thumb"><img src="' +
        escapeHtml(img) +
        '" alt="" width="320" height="180" loading="lazy" decoding="async"></span>'
      : '';

    return (
      '<li class="blog-card">' +
      '<a class="blog-card__link" href="' +
      href +
      '">' +
      thumb +
      '<span class="blog-card__body">' +
      (date || cat
        ? '<span class="blog-card__meta">' +
          (date ? '<time datetime="' + escapeHtml(post.publishedAt || '') + '">' + date + '</time>' : '') +
          (date && cat ? '<span class="blog-card__sep" aria-hidden="true">／</span>' : '') +
          (cat ? '<span class="blog-card__cat">' + cat + '</span>' : '') +
          '</span>'
        : '') +
      '<span class="blog-card__title">' +
      title +
      '</span>' +
      (desc ? '<span class="blog-card__desc">' + desc + '</span>' : '') +
      '</span></a></li>'
    );
  }

  function renderList(posts, listEl, emptyEl) {
    var visible = (posts || []).filter(function (p) {
      return !isNoindex(p);
    });
    if (!visible.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    listEl.innerHTML = visible.map(renderListItem).join('');
  }

  function renderLatest(posts, root) {
    var limit = parseInt(root.getAttribute('data-blog-latest') || '3', 10) || 3;
    var visible = (posts || [])
      .filter(function (p) {
        return !isNoindex(p);
      })
      .slice(0, limit);

    if (!visible.length) {
      root.hidden = true;
      return;
    }

    var list = root.querySelector('[data-blog-latest-list]');
    if (!list) return;

    list.innerHTML = visible
      .map(function (post) {
        var href = postHref(post);
        var title = escapeHtml(postTitle(post) || '無題');
        var date = formatDate(post.publishedAt || post.createdAt);
        var img = eyecatchUrl(post, 480);
        var thumb = img
          ? '<span class="blog-latest__thumb"><img src="' +
            escapeHtml(img) +
            '" alt="" width="160" height="90" loading="lazy" decoding="async"></span>'
          : '';
        return (
          '<li class="blog-latest__item">' +
          '<a class="blog-latest__link" href="' +
          href +
          '">' +
          thumb +
          '<span class="blog-latest__text">' +
          (date ? '<span class="blog-latest__date">' + date + '</span>' : '') +
          '<span class="blog-latest__title">' +
          title +
          '</span></span></a></li>'
        );
      })
      .join('');

    root.hidden = false;
  }

  function applyPostSeo(post) {
    var headline = postTitle(post);
    var title = (headline || 'ブログ') + '｜One';
    var desc = post.description || '';
    var url = 'https://create-to-one.com/blog-post.html?id=' + encodeURIComponent(post.id);
    var image = eyecatchUrl(post, 1200) || 'https://create-to-one.com/images/hero-bg.jpg';

    document.title = title;
    setMeta('description', desc);
    setMeta('robots', isNoindex(post) ? 'noindex,follow' : 'index,follow');
    setCanonical(url);
    setMeta('og:type', 'article', 'property');
    setMeta('og:title', headline || title, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:url', url, 'property');
    setMeta('og:image', image, 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', headline || title);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', image);

    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: headline || '',
      description: desc,
      image: image ? [image] : undefined,
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt || post.publishedAt || post.createdAt,
      mainEntityOfPage: url,
      author: {
        '@type': 'Organization',
        name: 'One',
        url: 'https://create-to-one.com/'
      },
      publisher: {
        '@type': 'Organization',
        name: 'One',
        logo: {
          '@type': 'ImageObject',
          url: 'https://create-to-one.com/images/favicon.png'
        }
      }
    });
  }

  function renderPost(post, root) {
    var titleEl = root.querySelector('[data-blog-title]');
    var metaEl = root.querySelector('[data-blog-meta]');
    var eyecatchEl = root.querySelector('[data-blog-eyecatch]');
    var bodyEl = root.querySelector('[data-blog-body]');
    var errorEl = root.querySelector('[data-blog-error]');

    if (errorEl) errorEl.hidden = true;

    if (titleEl) titleEl.textContent = postTitle(post);

    if (metaEl) {
      var date = formatDate(post.publishedAt || post.createdAt);
      var cat = categoryLabel(post.category);
      var parts = [];
      if (date) {
        parts.push(
          '<time datetime="' + escapeHtml(post.publishedAt || '') + '">' + date + '</time>'
        );
      }
      if (cat) parts.push('<span>' + escapeHtml(cat) + '</span>');
      metaEl.innerHTML = parts.join('<span class="blog-post__sep" aria-hidden="true">／</span>');
    }

    if (eyecatchEl) {
      var img = eyecatchUrl(post, 1200);
      if (img) {
        eyecatchEl.hidden = false;
        eyecatchEl.innerHTML =
          '<img src="' +
          escapeHtml(img) +
          '" alt="' +
          escapeHtml(postTitle(post)) +
          '" width="1200" height="675" decoding="async">';
      } else {
        eyecatchEl.hidden = true;
        eyecatchEl.innerHTML = '';
      }
    }

    if (bodyEl) {
      // microCMS リッチエディタ HTML（管理画面入力前提）
      bodyEl.innerHTML = post.body || '';
    }

    applyPostSeo(post);
  }

  function showError(root, message) {
    var errorEl = root.querySelector('[data-blog-error]');
    var loadingEls = root.querySelectorAll('[data-blog-loading]');
    loadingEls.forEach(function (el) {
      el.hidden = true;
    });
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  }

  function initListPage() {
    var root = document.querySelector('[data-blog-list-page]');
    if (!root) return;

    var listEl = root.querySelector('[data-blog-list]');
    var emptyEl = root.querySelector('[data-blog-empty]');
    var loadingEl = root.querySelector('[data-blog-loading]');
    if (!listEl) return;

    if (!hasConfig()) {
      if (loadingEl) loadingEl.hidden = true;
      showError(root, 'ブログ設定準備中です。しばらくしてから再度お試しください。');
      return;
    }

    fetchCms(null, { limit: 50, orders: '-publishedAt' })
      .then(function (data) {
        if (loadingEl) loadingEl.hidden = true;
        renderList(data.contents || [], listEl, emptyEl);
      })
      .catch(function () {
        if (loadingEl) loadingEl.hidden = true;
        showError(root, '記事を読み込めませんでした。時間をおいて再度お試しください。');
      });
  }

  function initPostPage() {
    var root = document.querySelector('[data-blog-post-page]');
    if (!root) return;

    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var loadingEl = root.querySelector('[data-blog-loading]');

    if (!id) {
      if (loadingEl) loadingEl.hidden = true;
      showError(root, '記事が見つかりませんでした。');
      return;
    }

    if (!hasConfig()) {
      if (loadingEl) loadingEl.hidden = true;
      showError(root, 'ブログ設定準備中です。しばらくしてから再度お試しください。');
      return;
    }

    fetchCms(id, null)
      .then(function (post) {
        if (loadingEl) loadingEl.hidden = true;
        renderPost(post, root);
      })
      .catch(function () {
        if (loadingEl) loadingEl.hidden = true;
        showError(root, '記事を読み込めませんでした。一覧から選び直してください。');
      });
  }

  function initLatestBlocks() {
    var blocks = document.querySelectorAll('[data-blog-latest]');
    if (!blocks.length || !hasConfig()) return;

    fetchCms(null, {
      limit: 6,
      orders: '-publishedAt',
      fields: 'id,title,titile,publishedAt,eyecatch,category,noindex'
    })
      .then(function (data) {
        blocks.forEach(function (block) {
          renderLatest(data.contents || [], block);
        });
      })
      .catch(function () {
        blocks.forEach(function (block) {
          block.hidden = true;
        });
      });
  }

  initListPage();
  initPostPage();
  initLatestBlocks();
})();
