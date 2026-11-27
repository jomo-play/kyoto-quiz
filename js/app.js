/* 京言葉クイズ: 画面の動き */
(function () {
  "use strict";
  var D = window.KQ_DATA, G = window.KQ;
  var N = 10;
  var TAG = "京言葉クイズ";
  var URL0 = "https://jomo-play.github.io/kyoto-quiz/";

  // 称号(点数ごと)。言い切りすぎず、自分を笑える物に
  var TITLES = [
    { name: "言葉どおりに受け取る、まっすぐな人", comment: "素直なんは、ええことどす。そのまんまのあなたで、おいでやす。" },
    { name: "ぶぶ漬けを、おかわりしそうな人", comment: "「ほな、いただきます」が言えるのも才能…かもしれまへん。" },
    { name: "修学旅行で来たきりの人", comment: "八ッ橋の味は覚えてはるけど、本音はまだ聞こえてへんみたい。" },
    { name: "はじめての京都観光客", comment: "まずは清水さんでも、ゆっくり見ておいでやす。" },
    { name: "週末だけ京都に来る人", comment: "ちょっとずつ、言葉の裏に気づきはじめてはります。" },
    { name: "京都通の見習い", comment: "半分は聞こえてはる。あと半分は、聞こえへんふりも上手に。" },
    { name: "京都に住んで半年の人", comment: "ご近所さんの「ええ声してはりますなぁ」に、もうドキッとできるはず。" },
    { name: "町家暮らし三年目", comment: "回覧板が回ってくる速さで、空気が読めるようになってきました。" },
    { name: "ご近所づきあいの達人", comment: "ここまで聞こえたら、立派なもんどす。…ほんまに。" },
    { name: "ぶぶ漬けの気配がわかる人", comment: "出される前に「ほな、そろそろ」が言えるお人どすなぁ。" },
    { name: "京の本音が聞こえる人(かもしれへん)", comment: "全問正解。…と、言うてはりますけど、ほんまのところはどうどすやろ。" }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var qs = [], idx = 0, score = 0, log = [], mode = { daily: false, level: "normal" };

  function show(id) {
    var s = document.querySelectorAll(".screen");
    for (var i = 0; i < s.length; i++) s[i].classList.remove("active");
    $(id).classList.add("active");
    window.scrollTo(0, 0);
  }

  // 135441942 → 「1億3,544万通り」
  function bigNum(n) {
    if (n >= 1e8) { var oku = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / 1e4); return oku + "億" + (man ? man.toLocaleString("ja-JP") + "万" : "") + "通り"; }
    if (n >= 1e4) return Math.floor(n / 1e4).toLocaleString("ja-JP") + "万通り";
    return n.toLocaleString("ja-JP") + "通り";
  }
  function modeLabel() {
    return mode.daily ? "今日の京言葉 #" + mode.no : G.LEVELS[mode.level].name;
  }

  function srcLinks(ids, box) {
    box.textContent = "";
    if (!ids || !ids.length) { box.textContent = "このサイトの創作の場面(よく知られた型をもとにしています)"; return; }
    box.appendChild(document.createTextNode("参考: "));
    ids.forEach(function (id, i) {
      var s = D.SOURCES[id]; if (!s) return;
      if (i) box.appendChild(document.createTextNode(" / "));
      var a = document.createElement("a");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener";
      a.textContent = s.short || s.name; a.title = s.name;
      box.appendChild(a);
    });
  }

  function start(m) {
    mode = m;
    if (mode.daily) { var d = G.dailyInfo(); mode.no = d.no; mode.level = d.level; qs = G.daily(N); }
    else qs = G.round(N, Math.random, mode.level);
    idx = 0; score = 0; log = [];
    $("res-img").classList.add("hidden");
    show("screen-quiz");
    render();
  }

  function render() {
    var q = qs[idx];
    $("q-mode").textContent = modeLabel();
    $("q-num").textContent = (idx + 1) + " / " + qs.length;
    $("q-bar").style.width = (idx / qs.length * 100) + "%";
    $("q-score").textContent = "正解 " + score;
    // 答える前は型の名前・話題を出さない(答えがばれるため)
    $("q-tag").textContent = "場面 " + (idx + 1);
    $("q-scene").textContent = q.scene;
    $("q-av").textContent = q.sp.av;
    $("q-name").textContent = q.sp.name;
    $("q-line").textContent = "「" + q.line + "」";
    $("me-msg").classList.add("hidden");
    $("q-ask").textContent = q.q === "reply" ? "どう返すのがいちばん?" : "この言葉の本音は?";
    $("feedback").classList.add("hidden");
    var box = $("choices");
    box.textContent = "";
    q.choices.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "choice"; b.textContent = c;
      b.addEventListener("click", function () { answer(c, b); });
      box.appendChild(b);
    });
  }

  function answer(c, btn) {
    var q = qs[idx];
    var ok = c === q.answer;
    if (ok) score++;
    log.push({ q: q, ok: ok, picked: c });
    var bs = $("choices").querySelectorAll("button");
    for (var i = 0; i < bs.length; i++) {
      bs[i].disabled = true;
      if (bs[i].textContent === q.answer) bs[i].classList.add("right");
    }
    if (!ok) btn.classList.add("wrong");
    if (q.q === "reply") {
      $("me-line").textContent = "「" + c + "」";
      $("me-msg").classList.remove("hidden");
    }
    $("q-score").textContent = "正解 " + score;
    $("fb-verdict").textContent = ok ? "○ 正解どす" : "× 残念、ちゃいます";
    $("fb-verdict").className = "verdict " + (ok ? "ok" : "ng");
    $("fb-honne").textContent = "「" + q.honne + "」";
    $("fb-type").textContent = q.classic ? "★ 名作ネタ" : "型: " + q.typeName;
    $("fb-kai").textContent = q.kai;
    srcLinks(q.src, $("fb-src"));
    $("btn-next").textContent = idx + 1 < qs.length ? "次へ" : "結果を見る";
    $("feedback").classList.remove("hidden");
    $("feedback").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function next() {
    idx++;
    if (idx < qs.length) render(); else result();
  }

  function grid() { return log.map(function (l) { return l.ok ? "🟩" : "⬜"; }).join(""); }
  function pageUrl() { return /^https?:/.test(location.protocol) ? location.href.split("#")[0].split("?")[0] : URL0; }

  function shareText(t) {
    // 答え・せりふはシェア文に入れない
    var head = mode.daily ? "今日の京言葉 #" + mode.no + " " + score + "/10" : TAG + "(" + G.LEVELS[mode.level].name + ") " + score + "/10";
    return head + "\n" + grid() + "\n称号「" + t.name + "」\nあなたは京都人の本音、何問わかる?\n#" + TAG;
  }

  function result() {
    var t = TITLES[Math.max(0, Math.min(10, score))];
    $("res-mode").textContent = modeLabel();
    $("res-score").textContent = score;
    $("res-grid").textContent = grid();
    $("res-title").textContent = "「" + t.name + "」";
    $("res-comment").textContent = t.comment;
    $("btn-share").href = "https://x.com/intent/tweet?text=" + encodeURIComponent(shareText(t)) + "&url=" + encodeURIComponent(pageUrl());
    $("btn-again").textContent = mode.daily ? "難易度を選んで、もう一回" : "もう一回(" + G.LEVELS[mode.level].name + ")";
    var rv = $("review"); rv.textContent = "";
    log.forEach(function (l) {
      var li = document.createElement("li");
      li.className = l.ok ? "ok" : "ng";
      var a = document.createElement("p"); a.className = "rv-line";
      a.textContent = (l.ok ? "○ " : "× ") + l.q.sp.name + "「" + l.q.line + "」";
      var b = document.createElement("p"); b.className = "rv-honne";
      b.textContent = "本音: " + l.q.honne;
      li.appendChild(a); li.appendChild(b);
      rv.appendChild(li);
    });
    show("screen-result");
  }

  // 結果カード画像(1200×630)
  var MINCHO = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif';
  var GOTHIC = 'system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif';
  function fitText(ctx, text, maxW, size, font, weight) {
    var s = size;
    do { ctx.font = weight + " " + s + "px " + font; s -= 2; } while (ctx.measureText(text).width > maxW && s > 20);
  }
  function drawCard() {
    var cv = $("card-canvas"), c = cv.getContext("2d"), W = 1200, H = 630;
    var t = TITLES[Math.max(0, Math.min(10, score))];
    c.fillStyle = "#f3eee4"; c.fillRect(0, 0, W, H);
    // 青海波ふうの地紋
    c.strokeStyle = "rgba(142,59,44,0.08)"; c.lineWidth = 2;
    for (var y = 0; y <= H + 40; y += 40) for (var x = (y / 40) % 2 ? 40 : 0; x <= W + 80; x += 80) {
      for (var r = 36; r > 8; r -= 12) { c.beginPath(); c.arc(x, y, r, Math.PI, 2 * Math.PI); c.stroke(); }
    }
    // 中央の札
    c.fillStyle = "#fffdf8"; c.strokeStyle = "#e2d9c8"; c.lineWidth = 2;
    c.beginPath(); c.rect(70, 60, W - 140, H - 120); c.fill(); c.stroke();
    c.fillStyle = "#8e3b2c"; c.fillRect(70, 60, 14, H - 120);
    c.textBaseline = "alphabetic"; c.textAlign = "left";
    c.fillStyle = "#8e3b2c"; c.font = "700 30px " + GOTHIC; c.fillText("京言葉クイズ", 120, 120);
    c.fillStyle = "#7b7064"; c.font = "500 28px " + GOTHIC; c.textAlign = "right";
    c.fillText(modeLabel(), W - 120, 120);
    c.textAlign = "left";
    c.fillStyle = "#2b2622"; c.font = "700 120px " + MINCHO; c.fillText(String(score), 120, 270);
    var sw = c.measureText(String(score)).width;
    c.font = "500 44px " + MINCHO; c.fillText("/ 10 問", 130 + sw, 270);
    // 正誤のマス
    log.forEach(function (l, i) {
      c.fillStyle = l.ok ? "#4f6f3a" : "#d9d1c3";
      c.fillRect(560 + i * 50, 200, 40, 40);
    });
    c.fillStyle = "#7b7064"; c.font = "500 28px " + GOTHIC; c.fillText("称号", 120, 350);
    c.fillStyle = "#8e3b2c"; fitText(c, "「" + t.name + "」", W - 240, 64, MINCHO, "700");
    c.fillText("「" + t.name + "」", 110, 430);
    c.fillStyle = "#2b2622"; c.font = "500 30px " + GOTHIC;
    c.fillText("あなたは京都人の本音、何問わかる?", 120, 505);
    c.fillStyle = "#7b7064"; c.font = "500 24px " + GOTHIC; c.textAlign = "right";
    c.fillText("jomo-play.github.io/kyoto-quiz", W - 120, 540);
    c.textAlign = "left";
    return cv;
  }
  function saveImage() {
    var cv = drawCard();
    var name = "kyoto-quiz-" + (mode.daily ? "daily-" + mode.no : mode.level) + "-" + score + ".png";
    var url = cv.toDataURL("image/png");
    var img = $("res-img"); img.src = url; img.classList.remove("hidden");
    cv.toBlob(function (blob) {
      if (!blob) return;
      try {
        var file = new File([blob], name, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
          navigator.share({ files: [file], text: shareText(TITLES[score]) }).catch(function () {});
          return;
        }
      } catch (e) { /* 共有できないときはダウンロード */ }
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
    }, "image/png");
  }

  function init() {
    $("pattern-count").textContent = bigNum(G.total());
    $("daily-no").textContent = "#" + G.dailyInfo().no;
    var ul = $("ref-list");
    Object.keys(D.SOURCES).forEach(function (k) {
      var s = D.SOURCES[k];
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.name;
      li.appendChild(a); ul.appendChild(li);
    });
    $("btn-daily").addEventListener("click", function () { start({ daily: true }); });
    var lvs = document.querySelectorAll(".btn.lv");
    for (var i = 0; i < lvs.length; i++) lvs[i].addEventListener("click", function (e) {
      start({ daily: false, level: e.currentTarget.getAttribute("data-level") });
    });
    $("btn-next").addEventListener("click", next);
    $("btn-again").addEventListener("click", function () {
      if (mode.daily) show("screen-title"); else start({ daily: false, level: mode.level });
    });
    $("btn-home").addEventListener("click", function () { show("screen-title"); });
    $("btn-image").addEventListener("click", saveImage);
  }

  init();
})();
