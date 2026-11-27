/* 京言葉クイズ: 場面の組み立て(ブラウザと node の両方で動く)
 *
 * 1問 = 前置き(中立な状況) + せりふ + 問い(本音 / 返し方) + 4択
 * 前置きは「前置きの骨組み(INTROS) × 出会いの場面(MEET) × 型の状況(ctx)」から作る。
 * せりふは「型の部品(praise ほめ所 / close 締め / ask 問いかけ / hear 人づて / mono ひとりごと)」を
 * いくつかの骨組み(FRAMES)で組み立てる。1回の中で前置き・せりふの骨組みは重ねない。
 */
(function (root) {
  "use strict";

  // 難易度: 外れ肢の混ぜ方
  var LEVELS = {
    easy: { name: "初級", lit: 2, over: 1, near: 0, honest: [1, 2], reply: 0.35 },
    normal: { name: "中級", lit: 1, over: 0, near: 2, honest: [1, 2], reply: 0.4, noFrames: ["p", "m"] },
    // 上級以上は、手がかりがせりふに残る骨組みだけ(ほめ所だけ・人づてだけ・ひとりごとだけは出さない)
    hard: { name: "上級", lit: 0, over: 0, near: 2, sib: 1, honest: [1, 2], reply: 0.45, noFrames: ["p", "h", "m"] },
    kyoto: { name: "京都人級", lit: 0, over: 0, near: 2, sib: 1, honest: [2, 3], reply: 0.6, noFrames: ["p", "h", "m"] }
  };

  // 前置きの骨組み。{ctx}=型の状況(「あなたは」に続く文) {meet}=出会いの場面 {sp}=話し手
  var INTROS = [
    { id: "i1", s: "あなたは{ctx}。{meet}、{sp}が言った。" },
    { id: "i2", s: "{meet}、{sp}に話しかけられた。あなたは{ctx}。" },
    { id: "i3", s: "あなたは{ctx}。そんなある日、{meet}、{sp}と少し話した。" },
    { id: "i4", s: "あなたは{ctx}。{meet}、{sp}がにこやかにこう言った。" },
    { id: "i5", s: "{sp}とは顔なじみだ。あなたは{ctx}。{meet}、こう言われた。" },
    { id: "i6", s: "あなたは{ctx}。{meet}、{sp}がふと口をひらいた。" },
    { id: "i7", s: "【{meet}】あなたは{ctx}。{sp}がひとこと。" },
    { id: "i8", s: "あなたは{ctx}。{meet}、{sp}が笑顔で話しかけてきた。" },
    { id: "i9", s: "あなたは{ctx}。{meet}、{sp}に呼びとめられた。" },
    { id: "i10", s: "あなたは{ctx}。{meet}、{sp}と目が合うと、こう言われた。" },
    { id: "i11", s: "あなたは{ctx}。{meet}、{sp}がのんびりした口調で言った。" },
    { id: "i12", s: "{meet}、{sp}と話していた。あなたは{ctx}。話の切れめに、こう言われた。" },
    { id: "i13", s: "あなたは{ctx}。{meet}、{sp}がしみじみと言った。" },
    { id: "i14", s: "【{sp}と】あなたは{ctx}。{meet}、こんな言葉をかけられた。" }
  ];

  // せりふの骨組み
  var OPENERS = ["そうそう、", "ところで、", "そういえば、", "せやせや、"];

  function make(D) {
    var MEET = D.MEET || {};
    function pick(a, rnd) { return a[Math.floor(rnd() * a.length)]; }
    function asArr(v) { return v == null ? null : (Array.isArray(v) ? v : [v]); }
    function fill(s, v) {
      return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; });
    }
    function shuffle(a, rnd) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x;
      }
      return a;
    }
    function get(t, it, k) { return it[k] != null ? it[k] : t[k]; }

    function tagsFor(t, it) { return asArr(it.sp) || t.spk; }
    function speakersFor(t, it) {
      var tags = tagsFor(t, it);
      return D.SPEAKERS.filter(function (s) {
        return s.tags.some(function (g) { return tags.indexOf(g) >= 0; });
      });
    }
    function meetsFor(t, it, sp) {
      var m = get(t, it, "meet");
      if (m) return m;
      var tags = tagsFor(t, it);
      for (var i = 0; i < sp.tags.length; i++) if (tags.indexOf(sp.tags[i]) >= 0 && MEET[sp.tags[i]]) return MEET[sp.tags[i]];
      return MEET.any || ["ある日"];
    }
    function introsFor(t, it) {
      var c = get(t, it, "intros");
      return c ? c.map(function (s, i) { return { id: t.id + "_i" + i, s: s }; }) : INTROS;
    }
    function prefixesFor(t) { return t.prefixes || D.PREFIXES; }
    function qtypes(t) { return t.noReply || !t.reply ? ["honne"] : ["honne", "reply"]; }

    // 語尾。{E} を含む部品は語尾の数だけ広がる。「ほんまに」が別の部品にあるときは「…、ほんまに」を使わない
    function endings(part, other) {
      if (part.indexOf("{E}") < 0) return [""];
      var dup = /ほんまに/.test(part + (other || ""));
      return D.ENDINGS.filter(function (e) { return !(dup && /ほんまに/.test(e)); });
    }
    function end(s) { return /[。?!」]$/.test(s) ? s : s + "。"; }
    function isQ(s) { return /[?]$/.test(s); }

    // せりふの骨組み: 部品の並べ方
    var FRAMES = [
      { id: "p", need: ["praise"], pre: true },
      { id: "pc", need: ["praise", "close"], pre: true },
      { id: "opc", need: ["praise", "close"], open: true },
      { id: "pa", need: ["praise", "ask"], pre: true },
      { id: "oa", need: ["ask"], open: true },
      { id: "cp", need: ["close", "praise"], stmtClose: true },
      { id: "h", need: ["hear"] },
      { id: "hc", need: ["hear", "close"] },
      { id: "m", need: ["mono"] }
    ];
    function parts(t, it) {
      return { praise: get(t, it, "praise") || [], close: get(t, it, "close") || [], ask: get(t, it, "ask") || [], hear: get(t, it, "hear") || [], mono: get(t, it, "mono") || [] };
    }
    function framesFor(t, it) {
      var P = parts(t, it);
      return FRAMES.filter(function (f) {
        if (!f.need.every(function (k) { return P[k].length; })) return false;
        if (f.stmtClose && !P.close.some(function (c) { return !isQ(c); })) return false;
        return true;
      });
    }
    function openersFor(t) { return OPENERS.concat(t.open || []); }

    // 骨組みごとのせりふの数(数え上げ用)
    function countSpeech(t, it, f) {
      var P = parts(t, it), pre = prefixesFor(t).length, n = 0;
      var stmt = P.close.filter(function (c) { return !isQ(c); });
      switch (f.id) {
        case "p": P.praise.forEach(function (p) { n += endings(p).length; }); return n * pre;
        case "pc": P.praise.forEach(function (p) { P.close.forEach(function (c) { n += endings(p, c).length; }); }); return n * pre;
        case "opc": P.praise.forEach(function (p) { P.close.forEach(function (c) { n += endings(p, c).length; }); }); return n * openersFor(t).length;
        case "pa": P.praise.forEach(function (p) { P.ask.forEach(function (a) { n += endings(p, a).length; }); }); return n * pre;
        case "oa": return P.ask.length * openersFor(t).length;
        case "cp": stmt.forEach(function (c) { P.praise.forEach(function (p) { n += endings(p, c).length; }); }); return n;
        case "h": return P.hear.length;
        case "hc": return P.hear.length * P.close.length;
        case "m": return P.mono.length;
      }
      return 0;
    }
    function countTemplate(t) {
      var n = 0;
      t.items.forEach(function (it) {
        var sp = 0;
        speakersFor(t, it).forEach(function (s) {
          var meets = meetsFor(t, it, s).length;
          introsFor(t, it).forEach(function (I) { sp += I.s.indexOf("{meet}") >= 0 ? meets : 1; });
        });
        var speech = 0;
        framesFor(t, it).forEach(function (f) { speech += countSpeech(t, it, f); });
        n += sp * speech * qtypes(t).length;
      });
      return n;
    }
    function total() {
      var n = D.CLASSICS.length;
      D.TEMPLATES.forEach(function (t) { n += countTemplate(t); });
      return n;
    }

    function buildSpeech(t, it, f, v, rnd) {
      var P = parts(t, it);
      var F = function (s) { return fill(s, v); };
      var withE = function (p, other) { return F(p).replace("{E}", pick(endings(p, other), rnd)); };
      var pre = f.pre ? pick(prefixesFor(t), rnd) : "";
      var p, c, a;
      switch (f.id) {
        case "p": p = pick(P.praise, rnd); return end(pre + withE(p));
        case "pc": p = pick(P.praise, rnd); c = pick(P.close, rnd); return end(pre + withE(p, c)) + end(F(c));
        case "opc": p = pick(P.praise, rnd); c = pick(P.close, rnd); return end(pick(openersFor(t), rnd) + withE(p, c)) + end(F(c));
        case "pa": p = pick(P.praise, rnd); a = pick(P.ask, rnd); return end(pre + withE(p, a)) + end(F(a));
        case "oa": return end(pick(openersFor(t), rnd) + F(pick(P.ask, rnd)));
        case "cp":
          c = pick(P.close.filter(function (x) { return !isQ(x); }), rnd); p = pick(P.praise, rnd);
          return end(F(c)) + end(withE(p, c));
        case "h": return end(F(pick(P.hear, rnd)));
        case "hc": return end(F(pick(P.hear, rnd))) + end(F(pick(P.close, rnd)));
        case "m": return end(F(pick(P.mono, rnd)));
      }
      return "";
    }

    // 外れ肢を難易度に合わせて選ぶ。
    // 「いちばん不満っぽい肢」「いちばん長い肢」を選ぶだけで当たらないよう、
    // 候補の中から、正解と長さ・不満語の量が近い物を優先して取る(初級の悪く取りすぎ肢は除く)
    var TONE = /んといて|控え|うるさ|じゃま|帰|迷惑|文句|やめ|ちょっと|すぎ|あかん|怒|皮肉|遠回し|ほんまは|気にな|困|早う|はよ|もう少し|考えて|すみません|そろそろ|気をつけ|ごめん|申し訳|失礼/g;
    function feat(s) { return { k: (s.match(TONE) || []).length, n: s.length }; }
    function closest(cands, correct, rnd) {
      var c = feat(correct);
      return shuffle(cands.slice(), rnd).map(function (x, i) {
        var f = feat(x); return { x: x, d: Math.abs(f.k - c.k) * 3 + Math.abs(f.n - c.n) / 6 + rnd() * 1.5 };
      }).sort(function (a, b) { return b.d - a.d; }).map(function (o) { return o.x; }); // 末尾が近い(pop で取る)
    }
    function makeChoices(correct, pools, L, rnd) {
      var lit = closest(pools.lit || [], correct, rnd);
      var near = closest(pools.near || [], correct, rnd);
      var over = shuffle((pools.over || []).slice(), rnd);
      var sib = closest(pools.sib || [], correct, rnd);
      var out = [];
      var take = function (arr, n) {
        while (n > 0 && arr.length) { var x = arr.pop(); if (x !== correct && out.indexOf(x) < 0) { out.push(x); n--; } }
      };
      if (L.sib) {
        // 上級以上: 3肢のうち2つ以上を、正解と同じくらい不満っぽい物にする(ニュアンス違いを優先し、足りない分を別の不満で補う)
        var ck = feat(correct).k;
        var strong = function (x) { return feat(x).k >= Math.max(1, ck); };
        var ns = near.filter(strong), nw = near.filter(function (x) { return !strong(x); });
        var ss = sib.filter(strong);
        take(ns, 2); take(ss, Math.min(1, 2 - out.length)); take(nw, 3 - out.length); take(ns, 3 - out.length); take(ss, 3 - out.length);
      } else { take(near, L.near); take(lit, L.lit); take(over, L.over); }
      [near, lit, over].forEach(function (a) { take(a, 3 - out.length); });
      return shuffle([correct].concat(out.slice(0, 3)), rnd);
    }

    // 同じ場所(話し手のタグ)のほかの型の本音・返し方。上級以上で「別の不満」の外れ肢に使う
    var SIB = {};
    function sibFor(t) {
      if (SIB[t.id]) return SIB[t.id];
      var res = { honne: [], reply: [] }, myTopic = t.topic || t.id;
      D.TEMPLATES.forEach(function (u) {
        if (u === t || u.honest || (u.topic || u.id) === myTopic) return;
        if (!u.spk.some(function (g) { return t.spk.indexOf(g) >= 0; })) return;
        u.items.forEach(function (it) {
          var v = { o: it.o || "", x: it.x || "", pet: it.pet || "", sp: "", shop: "" };
          var h = get(u, it, "honne"), r = get(u, it, "reply");
          if (h) { h = fill(h, v); if (!/\{/.test(h) && res.honne.indexOf(h) < 0) res.honne.push(h); }
          if (r) { r = fill(r, v); if (!/\{/.test(r) && res.reply.indexOf(r) < 0) res.reply.push(r); }
        });
      });
      return (SIB[t.id] = res);
    }

    // 型から1問つくる。ex = この回ですでに使った {sp: 話し手, intro: 前置きの骨組み, frame: せりふの骨組み}
    function fromTemplate(t, rnd, ex, L) {
      ex = ex || {}; L = L || LEVELS.normal;
      var exSp = ex.sp || {}, exIntro = ex.intro || {}, exFrame = ex.frame || {};
      var items = t.items.filter(function (it) {
        return speakersFor(t, it).some(function (s) { return !exSp[s.name]; });
      });
      if (!items.length) return null;
      var it = pick(items, rnd);
      var sp = pick(speakersFor(t, it).filter(function (s) { return !exSp[s.name]; }), rnd);
      var intros = introsFor(t, it).filter(function (I) { return !exIntro[I.id]; });
      var frames = framesFor(t, it).filter(function (f) { return !exFrame[f.id] && (L.noFrames || []).indexOf(f.id) < 0; });
      if (!intros.length || !frames.length) return null;
      var I = pick(intros, rnd), f = pick(frames, rnd);
      var v = { sp: sp.name, shop: sp.shop || "", o: it.o || "", x: it.x || "", pet: it.pet || "" };
      v.ctx = fill(it.ctx, v);
      v.meet = pick(meetsFor(t, it, sp), rnd);
      var scene = fill(I.s, v);
      var line = buildSpeech(t, it, f, v, rnd);
      var qt = qtypes(t);
      var q = qt.length > 1 && rnd() < L.reply ? "reply" : "honne";
      var F = function (w) { return fill(w, v); };
      var correct, pools;
      if (q === "honne") {
        correct = F(get(t, it, "honne"));
        pools = { lit: (get(t, it, "wrong") || []).map(F), near: (get(t, it, "near") || []).map(F), over: (get(t, it, "over") || []).map(F), sib: sibFor(t).honne };
      } else {
        correct = F(get(t, it, "reply"));
        pools = { lit: (get(t, it, "replyWrong") || []).map(F), near: (get(t, it, "replyNear") || []).map(F), over: (get(t, it, "replyOver") || []).map(F), sib: sibFor(t).reply };
      }
      return {
        kind: t.honest ? "honest" : "pattern", tid: t.id, topic: get(t, it, "topic") || t.id, typeName: t.name, sp: sp,
        scene: scene, intro: I.id, frame: f.id, line: line, q: q,
        answer: correct, honne: F(get(t, it, "honne")),
        choices: makeChoices(correct, pools, L, rnd),
        kai: get(t, it, "kai"), src: get(t, it, "src") || []
      };
    }

    function fromClassic(c, rnd, L) {
      L = L || LEVELS.normal;
      var correct = c.q === "reply" ? c.reply : c.honne;
      return {
        kind: c.honest ? "honest" : "classic", classic: true, tid: c.id, topic: c.topic, typeName: "名作ネタ", sp: c.sp, scene: c.ctx,
        intro: "c", frame: "c", line: end(c.line), q: c.q,
        answer: correct, honne: c.q === "reply" ? "そろそろお帰りやす" : c.honne,
        choices: makeChoices(correct, { lit: c.wrong, near: c.near, over: c.over ? [c.over] : [] }, L, rnd),
        kai: c.kai, src: c.src || []
      };
    }

    // 1回分(n問)。名作ネタ1〜2問、言葉どおりが正解のひっかけ(難易度で1〜3問)、残りは型から。
    // 同じ型・話題・話し手・言い回し・前置きの骨組みは1回の中で重ねない。せりふの骨組みは2回まで、続けては出さない。
    function round(n, rnd, level) {
      rnd = rnd || Math.random;
      var L = LEVELS[level] || LEVELS.normal;
      var nC = 1 + (rnd() < 0.5 ? 1 : 0);
      var nH = L.honest[0] + (rnd() < 0.5 ? L.honest[1] - L.honest[0] : 0);
      var slots = [];
      for (var i = 0; i < n; i++) slots.push(i < nC ? "classic" : i < nC + nH ? "honest" : "pattern");
      shuffle(slots, rnd);
      var pools = {
        classic: shuffle(D.CLASSICS.slice(), rnd),
        honest: shuffle(D.TEMPLATES.filter(function (t) { return t.honest; }), rnd),
        pattern: shuffle(D.TEMPLATES.filter(function (t) { return !t.honest; }), rnd)
      };
      var usedTopic = {}, usedSp = {}, usedPh = {}, usedIntro = {}, frameN = {}, lastFrame = null, out = [];
      var phr = function (line) { return (D.PHRASES || []).filter(function (p) { return line.indexOf(p) >= 0; }); };
      var fresh = function (q) { return !usedTopic[q.topic] && !phr(q.line).some(function (p) { return usedPh[p]; }); };
      var exFrame = function () {
        var e = {}; Object.keys(frameN).forEach(function (k) { if (frameN[k] >= 2) e[k] = true; });
        if (lastFrame) e[lastFrame] = true; return e;
      };
      slots.forEach(function (kind) {
        var pool = pools[kind], q = null;
        var ex = { sp: usedSp, intro: usedIntro, frame: exFrame() };
        for (var k = 0; k < pool.length && !q; k++) {
          var src = pool[k];
          if (kind === "classic") {
            if (usedSp[src.sp.name]) continue;
            var cq = fromClassic(src, rnd, L);
            if (fresh(cq)) q = cq;
          } else {
            for (var tries = 0; tries < 8 && !q; tries++) {
              var c = fromTemplate(src, rnd, ex, L);
              if (c && fresh(c)) q = c;
            }
          }
          if (q) pool.splice(k, 1);
        }
        if (!q) {
          var pp = pools.pattern;
          for (var j = 0; j < pp.length && !q; j++) {
            var c2 = fromTemplate(pp[j], rnd, ex, L);
            if (c2 && fresh(c2)) { q = c2; pp.splice(j, 1); }
          }
        }
        if (q) {
          usedTopic[q.topic] = true; usedSp[q.sp.name] = true;
          phr(q.line).forEach(function (p) { usedPh[p] = true; });
          if (q.intro !== "c") usedIntro[q.intro] = true;
          if (q.frame !== "c") { frameN[q.frame] = (frameN[q.frame] || 0) + 1; lastFrame = q.frame; } else lastFrame = null;
          out.push(q);
        }
      });
      return out;
    }

    // 日付から決まる乱数(全員同じ問題になる)
    function seeded(str) {
      var h = 1779033703 ^ str.length;
      for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
      var a = h >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    // 今日の京言葉: 日本時間の日付で決まる。#1 = 2026-11-24。難易度は中級
    var DAILY_START = Date.UTC(2026, 10, 24);
    function dailyInfo(now) {
      var jst = new Date((now == null ? Date.now() : now) + 9 * 3600 * 1000);
      var key = jst.getUTCFullYear() + "-" + ("0" + (jst.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + jst.getUTCDate()).slice(-2);
      var day = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
      return { key: key, no: Math.floor((day - DAILY_START) / 86400000) + 1, level: "normal" };
    }
    function daily(n, now) {
      var d = dailyInfo(now);
      return round(n, seeded("kyoto-quiz-" + d.key), d.level);
    }

    return {
      LEVELS: LEVELS, INTROS: INTROS, FRAMES: FRAMES, total: total, countTemplate: countTemplate,
      fromTemplate: fromTemplate, fromClassic: fromClassic, round: round, daily: daily, dailyInfo: dailyInfo, seeded: seeded
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = make;
  else {
    root.KQ_DATA = Object.assign({}, root.KQ_BASE, { TEMPLATES: root.KQ_T || [] });
    root.KQ = make(root.KQ_DATA);
  }
})(this);
