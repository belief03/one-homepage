/**
 * One｜お客様の声 API（Google Apps Script）
 *
 * 対象フォーム:
 * https://docs.google.com/forms/d/e/1FAIpQLSfhnmBjHsr3SAr7T8lrn77qvDmr3_RF0qstr0iPiRPLm0sysw/viewform
 *
 * 紐づけイメージ:
 * HP「株式会社青木 様」 ← アンケート Q1「株式会社青木」＋ Q7お声 ＋ Q8掲載可
 *
 * 【セットアップ】
 * 1. フォームの回答をスプレッドシート連携
 * 2. そのスプレッドシートで 拡張機能 → Apps Script を開き、このコードを貼り付け
 * 3. SPREADSHEET_ID をシートURLの /d/XXXX/ に書き換え
 * 4. ウェブアプリとしてデプロイ（実行:自分 / アクセス:全員）
 * 5. 発行URLを index.html の #works[data-voices-url] に貼る
 *
 * 【公開条件】
 * - Q8 が「はい（実名・社名）」のもののみ
 * - Q1 社名・お名前（漢字）があるもののみ
 * - Q7 自由記述が十分な長さのもののみ
 */

var SPREADSHEET_ID = '1Qakz9ZSitS6babZhOFaoS0J3WhyJhQGozGjmlmDnjWA'; // ← 反映済み
var SHEET_NAME = ''; // 空なら先頭シート。例: 'フォームの回答 1'
var CACHE_SECONDS = 300; // 5分キャッシュ

/**
 * 列見出しの部分一致キーワード
 * （シートの見出しはフォーム設問文がそのまま入ることが多い）
 */
var COL = {
  // Q1 のみ（Q2カナは除外）
  company: ['社名・お名前（漢字）'],
  // Q7
  feedback: ['ご意見やご感想', 'ご意見', 'ご感想'],
  // Q8
  consent: ['お客様の声として掲載', '掲載させていただいても'],
  // Q3
  service: ['ご利用いただいたサービス', '利用いただいたサービス']
};

function doGet() {
  try {
    var payload = getVoicesPayload_();
    return jsonResponse_(payload);
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      updatedAt: new Date().toISOString(),
      voices: []
    });
  }
}

/** 手動テスト用（エディタで実行） */
function testVoices() {
  Logger.log(JSON.stringify(getVoicesPayload_(), null, 2));
}

function getVoicesPayload_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('voices_payload_v3');
  if (cached) {
    return JSON.parse(cached);
  }

  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
    throw new Error('SPREADSHEET_ID を設定してください');
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  if (!sheet) throw new Error('シートが見つかりません');

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return cacheAndReturn_({ ok: true, updatedAt: new Date().toISOString(), voices: [] });
  }

  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });
  var idx = {
    company: findCompanyCol_(headers),
    feedback: findCol_(headers, COL.feedback),
    consent: findCol_(headers, COL.consent),
    service: findCol_(headers, COL.service)
  };

  if (idx.company < 0 || idx.feedback < 0 || idx.consent < 0) {
    throw new Error(
      '必要な列が見つかりません。Q1社名（漢字）/ Q7ご意見 / Q8掲載 があるか確認してください。headers=' +
        headers.join(' | ')
    );
  }

  var voices = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var consent = String(row[idx.consent] || '').trim();
    if (!isNamedPublishable_(consent)) continue;

    var company = String(row[idx.company] || '').trim();
    if (!company) continue;

    var text = String(row[idx.feedback] || '').trim();
    if (text.length < 8) continue;

    var service = idx.service >= 0 ? String(row[idx.service] || '').trim() : '';

    voices.push({
      id: 'row-' + (r + 1),
      text: text,
      service: service,
      company: company,
      attribution: company.replace(/様$/, '') + ' 様',
      consent: 'named'
    });
  }

  // 新しい回答を上に（同一社名が複数ならサイト側は先頭＝最新を採用）
  voices.reverse();

  return cacheAndReturn_({
    ok: true,
    updatedAt: new Date().toISOString(),
    voices: voices
  });
}

/** Q8「はい（実名・社名）」のみ。いいえ・匿名系は除外 */
function isNamedPublishable_(consent) {
  if (!consent) return false;
  if (/いいえ|不可|匿名|イニシャル/.test(consent)) return false;
  if (!/^はい/.test(consent)) return false;
  return /実名|社名/.test(consent) || consent === 'はい';
}

function findCompanyCol_(headers) {
  // Q1「社名・お名前（漢字）」専用。Q2カナは除外
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (/カナ/.test(h)) continue;
    if (/漢字/.test(h) && /(社名|お名前)/.test(h)) return i;
  }
  return findCol_(headers, COL.company);
}

function findCol_(headers, keywords) {
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    for (var k = 0; k < keywords.length; k++) {
      if (h.indexOf(keywords[k]) !== -1) return i;
    }
  }
  return -1;
}

function cacheAndReturn_(payload) {
  try {
    CacheService.getScriptCache().put('voices_payload_v3', JSON.stringify(payload), CACHE_SECONDS);
  } catch (e) {}
  return payload;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
