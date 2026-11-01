(function () {
  'use strict';

  var HID = '__qab_host__';
  var LSK = '__qab_cfg__';
  var CK = '__qab_cache__';
  var PK = '__qab_pos__';
  var DEFAULTS = { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', key: '' };
  var TYPES = { single: '单选', multi: '多选', judge: '判断', fill: '填空', short: '简答', code: '编程' };
  var EMBED = (typeof __QAB_EMBED__ === 'undefined') ? null : __QAB_EMBED__;

  var OPT = /^[（(【\[]?\s*([A-Ha-hＡ-Ｈａ-ｈ])\s*[）)】\]．.、:：]\s*(.+)$/;
  var UI_LINE = /^(返回|上一题|下一题|上一道题|下一道题|前一道题|后一道题|题目列表.*|提交|提交答案|交卷|字体大小.*|切换编辑器主题.*|草稿箱|本地草稿箱|控制台|编辑器|提交状态|未提交答案|已提交|保存|全屏|收起|展开)$/;

  function normKey(c) {
    return c.replace(/[Ａ-Ｈａ-ｈ]/g, function (x) {
      return String.fromCharCode(x.charCodeAt(0) - 0xFEE0);
    }).toUpperCase();
  }

  if (typeof document === 'undefined') {
    module.exports = { parse: parse, score: score, buildPrompt: buildPrompt, splitAns: splitAns, answerLetters: answerLetters, extractCode: extractCode, clean: clean };
    return;
  }

  var prev = document.getElementById(HID);
  if (prev) {
    var pbox = prev.shadowRoot.querySelector('.p');
    pbox.classList.toggle('mini');
    return;
  }

  function getCfg() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(LSK) || '{}') || {}; } catch (e) { c = {}; }
    return Object.assign({}, DEFAULTS, EMBED || {}, c);
  }

  var host = document.createElement('div');
  host.id = HID;
  host.style.cssText = 'position:fixed;top:72px;right:16px;z-index:2147483647;';
  var sr = host.attachShadow({ mode: 'open' });

  sr.innerHTML = [
    '<style>',
    ':host{all:initial}',
    '.p{width:392px;max-height:80vh;display:flex;flex-direction:column;background:#fff;border:1px solid #e5e8ec;border-radius:14px;box-shadow:0 16px 44px rgba(15,23,42,.18);font:13px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111827;overflow:hidden}',
    '.hd{display:flex;align-items:center;gap:7px;padding:9px 12px;background:linear-gradient(#fcfdfe,#f3f5f8);border-bottom:1px solid #eef1f4;cursor:move;user-select:none}',
    '.hd b{font-size:13px;font-weight:700;letter-spacing:.2px}',
    '.chip{font:600 10.5px/1.6 inherit;padding:1px 7px;border-radius:5px;background:#eef2ff;color:#4338ca;border:1px solid #e0e7ff;white-space:nowrap}',
    '.chip:empty{display:none}',
    '.st{margin-left:auto;font-size:11px;color:#9aa3af;max-width:112px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    'button{border:1px solid #e2e5e9;background:#fff;border-radius:7px;cursor:pointer;font:12px/1.5 inherit;color:#374151;padding:4px 9px}',
    'button:hover{background:#f3f4f6}',
    '.x{padding:2px 8px}',
    '.cg{display:none;flex-direction:column;gap:7px;padding:11px 12px;background:#fafbfc;border-bottom:1px solid #eef1f4}',
    '.cg.on{display:flex}',
    '.cg input{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #d8dde3;border-radius:7px;font:12px/1.5 inherit}',
    '.cg input:focus{outline:2px solid #c7d2fe;border-color:#a5b4fc}',
    '.cg .row{display:flex;gap:6px}',
    '.cg .row button{flex:1}',
    '.hint{font-size:11px;color:#9aa3af;line-height:1.55}',
    '.bd{padding:11px 12px;overflow:auto}',
    '.q{font-size:12px;line-height:1.62;color:#6b7280;padding:8px 10px;background:#f8fafb;border-radius:9px;margin-bottom:9px;white-space:pre-wrap;word-break:break-word;max-height:72px;overflow:auto}',
    '.q:empty{display:none}',
    '.card{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:11px;background:#f0fdf4;border:1px solid #d9f7e2;margin-bottom:9px}',
    '.card.hide{display:none}',
    '.ans{font-size:25px;font-weight:800;color:#15803d;letter-spacing:1.5px;line-height:1.15;word-break:break-all;padding-top:1px}',
    '.ans.txt{font-size:13px;font-weight:400;letter-spacing:0;line-height:1.74;white-space:pre-wrap;word-break:break-word;color:#1f2937;max-height:210px;overflow:auto}',
    '.ans.wait{color:#b6bdc7;font-weight:700;font-size:16px;letter-spacing:0}',
    '.cf{margin-left:auto;font:600 10.5px/1.7 inherit;padding:1px 8px;border-radius:999px;border:1px solid #d1d5db;color:#6b7280;white-space:nowrap;flex:none;margin-top:2px}',
    '.cf.hi{color:#15803d;border-color:#bbf7d0;background:#dcfce7}',
    '.cf.mid{color:#b45309;border-color:#fde68a;background:#fef3c7}',
    '.cf.low{color:#b91c1c;border-color:#fecaca;background:#fee2e2}',
    '.cf:empty{display:none}',
    '.opts{display:flex;flex-direction:column;gap:5px;margin-bottom:9px}',
    '.opts:empty{display:none}',
    '.oi{display:flex;gap:8px;padding:5px 8px;border-radius:8px;font-size:12.5px;color:#4b5563;border:1px solid transparent}',
    '.oi.hit{background:#f0fdf4;border-color:#bbf7d0;color:#14532d;font-weight:600}',
    '.ok{flex:none;width:17px;height:17px;line-height:17px;text-align:center;border-radius:5px;background:#f1f3f5;font-size:11px;font-weight:700;color:#6b7280}',
    '.oi.hit .ok{background:#16a34a;color:#fff}',
    '.ov{flex:1;word-break:break-word}',
    '.code{display:none;margin-bottom:9px;border-radius:10px;overflow:hidden;border:1px solid #1e293b;background:#0f172a}',
    '.code.on{display:block}',
    '.chd{display:flex;align-items:center;gap:8px;padding:5px 10px;background:#1e293b;color:#cbd5e1;font-size:11px;font-weight:600}',
    '.chd .ccp{margin-left:auto;background:#334155;border-color:#475569;color:#e2e8f0;font-size:11px;padding:2px 8px}',
    '.chd .ccp:hover{background:#475569}',
    '.code pre{margin:0;padding:10px 11px;color:#e2e8f0;font:12px/1.62 ui-monospace,Menlo,Consolas,"Courier New",monospace;max-height:300px;overflow:auto;white-space:pre;tab-size:4}',
    '.sec{margin-top:2px}',
    '.sec h4{display:flex;align-items:center;gap:5px;margin:0 0 3px;font-size:10.5px;font-weight:700;color:#9aa3af;letter-spacing:.6px;cursor:pointer}',
    '.sec h4::before{content:"";width:5px;height:5px;border-right:1.6px solid #b6bdc7;border-bottom:1.6px solid #b6bdc7;transform:rotate(45deg);margin-top:-2px}',
    '.sec.fold h4::before{transform:rotate(-45deg);margin-top:1px}',
    '.ex{white-space:pre-wrap;word-break:break-word;color:#374151;font-size:12.5px;line-height:1.74;max-height:200px;overflow:auto}',
    '.sec.fold .ex{display:none}',
    '.ex:empty{display:none}',
    '.sec.dbg h4{color:#b9c0c9}',
    '.sec.dbg .ex{color:#9aa3af;font-size:11.5px;line-height:1.62;max-height:150px}',
    '.ft{display:flex;gap:6px;padding:9px 12px;border-top:1px solid #f0f2f5;background:#fcfdfe}',
    '.ft button{flex:1}',
    '.mini .bd,.mini .ft,.mini .cg{display:none}',
    '.mini .card,.mini .code{padding:4px 10px}',
    '@keyframes qabPulse{0%,100%{opacity:1}50%{opacity:.32}}',
    '.loading .ans{animation:qabPulse 1.3s ease-in-out infinite}',
    '</style>',
    '<div class="p">',
    '  <div class="hd"><b>答题助手</b><span class="chip"></span><span class="st">…</span><button class="x">✕</button></div>',
    '  <div class="cg">',
    '    <input class="i-base" placeholder="接口地址，如 https://api.deepseek.com/v1">',
    '    <input class="i-model" placeholder="模型，如 deepseek-chat">',
    '    <input class="i-key" type="password" placeholder="API Key（仅存本机浏览器）">',
    '    <div class="row"><button class="save">保存并作答</button><button class="del">清除</button></div>',
    '    <div class="hint">Key 存在本站 localStorage，同站页面脚本理论上可读取。</div>',
    '  </div>',
    '  <div class="bd">',
    '    <div class="q"></div>',
    '    <div class="card"><span class="ans wait">…</span><span class="cf"></span></div>',
    '    <div class="opts"></div>',
    '    <div class="code"><div class="chd"><span class="ct">代码</span><button class="ccp">复制</button></div><pre></pre></div>',
    '    <div class="sec"><h4>解析</h4><div class="ex"></div></div>',
    '    <div class="sec dbg fold"><h4>抓取内容</h4><div class="ex dbgtext"></div></div>',
    '  </div>',
    '  <div class="ft"><button class="re">重新抓题</button><button class="cp">复制</button><button class="op">设置</button></div>',
    '</div>'
  ].join('');

  var $ = function (s) { return sr.querySelector(s); };
  var elP = $('.p'), elSt = $('.st'), elChip = $('.chip'), elQ = $('.q');
  var elCard = $('.card'), elAns = $('.ans'), elCf = $('.cf'), elOpts = $('.opts');
  var elCode = $('.code'), elPre = elCode.querySelector('pre'), elCT = $('.ct');
  var elEx = $('.ex'), elSecH = $('.sec h4');
  var elDbg = $('.dbg'), elDbgText = $('.dbgtext');
  var elCg = $('.cg'), elBase = $('.i-base'), elModel = $('.i-model'), elKey = $('.i-key');
  var busy = false, curQ = null, curRaw = '';

  function setSt(t) { elSt.textContent = t; elSt.title = t; }

  function openCfg() {
    var c = getCfg();
    elBase.value = c.base;
    elModel.value = c.model;
    elKey.value = c.key;
    elCg.classList.add('on');
  }

  function score(t) {
    var ls = t.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!ls.length || ls.length > 80) return -1;
    var seen = {};
    for (var i = 0; i < Math.min(ls.length, 26); i++) {
      var m = ls[i].match(OPT);
      if (m) seen[normKey(m[1])] = 1;
    }
    var s = Object.keys(seen).length * 2;
    if (seen.A && seen.B) s += 3;

    if (/【问题描述】|【题目描述】|问题描述|题目描述/.test(t)) s += 4;
    if (/【样例|样例输入|样例输出|评分标准|输入描述|输出描述/.test(t)) s += 3;
    if (/试述|简述|论述|阐述|列举|请说明|为什么|如何理解|有何区别|分析其/.test(t)) s += 3;
    if (/请编写|实现一个|编写一个|补全代码|主类名|class\s+\w+\s*\{|public\s+static\s+void\s+main/.test(t)) s += 3;

    if (/[?？]\s*$/.test(t.trim())) s += 1;
    if (/^\s*\d+\s*[.、．]\s*\S/.test(t)) s += 1;

    if (/撤销\s*重做|文件\s+编辑\s+视图|字号.*段落.*对齐/.test(t)) s -= 8;
    return s;
  }

  function clean(t) {
    return t.split('\n').map(function (l) { return l.trim(); })
      .filter(function (l) { return l && !UI_LINE.test(l); })
      .join('\n').trim();
  }

  function isEditor(el) {
    var tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'PRE' || tag === 'CODE') return true;
    if (el.isContentEditable) return true;
    return /CodeMirror|monaco-editor|ace_editor|cm-editor|tox-tinymce/.test(String(el.className || ''));
  }

  function fromViewport() {
    var pts = [
      [0.22, 0.42], [0.28, 0.58], [0.3, 0.5],
      [0.5, 0.45], [0.5, 0.6], [0.5, 0.5],
      [0.5, 0.3], [0.5, 0.7], [0.34, 0.5], [0.66, 0.5]
    ];
    var best = '', bestScore = 0;
    for (var p = 0; p < pts.length; p++) {
      var el = document.elementFromPoint(window.innerWidth * pts[p][0], window.innerHeight * pts[p][1]);
      for (var d = 0; el && d < 9; d++, el = el.parentElement) {
        if (isEditor(el)) continue;
        var t = el.innerText || '';
        if (t.length < 12 || t.length > 3000) continue;
        var s = score(t);
        if (s > bestScore) { bestScore = s; best = t; }
        if (bestScore >= 9 && t.length < 1200) break;
      }
    }
    return bestScore >= 3 ? best : '';
  }

  function collectDocs() {
    var docs = [document];
    var frames = document.querySelectorAll('iframe, frame');
    var n = Math.min(frames.length, 12);
    for (var i = 0; i < n; i++) {
      try {
        var fd = frames[i].contentDocument;
        if (fd && fd.body && docs.indexOf(fd) < 0) docs.push(fd);
      } catch (e) {}
    }
    return docs;
  }

  function fromDocs() {
    var docs = collectDocs();
    var best = '', bestScore = 0;
    for (var k = 0; k < docs.length; k++) {
      var doc = docs[k];
      if (!doc.body) continue;
      if (k > 0) {
        var bt = doc.body.innerText || '';
        if (bt.length >= 12 && bt.length <= 3000) {
          var bs = score(bt);
          if (bs > bestScore) { bestScore = bs; best = bt; }
        }
      }
      var nodes = doc.querySelectorAll('div,li,td,section,article,form,p');
      var limit = Math.min(nodes.length, 1200);
      for (var i = 0; i < limit; i++) {
        var el = nodes[i];
        if (isEditor(el)) continue;
        if (el.scrollHeight > 1000 || el.scrollWidth > 1400) continue;
        var t = el.innerText || '';
        if (t.length < 12 || t.length > 3000) continue;
        var s = score(t);
        if (s > bestScore) { bestScore = s; best = t; }
      }
    }
    return bestScore >= 3 ? best : '';
  }

  function extract() {
    var sel = '';
    try { sel = String(window.getSelection() || '').trim(); } catch (e) {}
    if (sel.length >= 8 && sel.length <= 3000) return sel;
    var t = fromViewport() || fromDocs();
    return t ? clean(t) : '';
  }

  function readEditor() {
    var docs = collectDocs();
    var sels = ['textarea', '[contenteditable="true"]', '.monaco-editor', '.CodeMirror-code', '.ace_editor', '.cm-content'];
    for (var k = 0; k < docs.length; k++) {
      for (var i = 0; i < sels.length; i++) {
        var el = docs[k].querySelector(sels[i]);
        if (!el) continue;
        var v = el.tagName === 'TEXTAREA' ? el.value : (el.innerText || '');
        v = String(v || '').trim();
        if (v.length >= 10 && v.length <= 4000) return v;
      }
    }
    return '';
  }

  function detectLang() {
    var s = String(document.title || '') + ' ' + String(document.body ? document.body.innerText.slice(0, 3000) : '');
    if (/\bJAVA\b|Java\s*语言|java\s*语言/.test(s)) return 'Java';
    if (/C\+\+|C\s*语言/.test(s)) return 'C++';
    if (/Python|python/.test(s)) return 'Python';
    if (/JavaScript|Node\.js/.test(s)) return 'JavaScript';
    if (/\bC#/.test(s)) return 'C#';
    return '';
  }

  function parse(text) {
    var lines = text.split('\n').map(function (s) { return s.replace(/\s+$/, ''); });
    var segs = [], cur = null, i, m, k;
    for (i = 0; i < lines.length; i++) {
      m = lines[i].trim().match(OPT);
      if (!m) { if (cur) { segs.push(cur); cur = null; } continue; }
      k = normKey(m[1]);
      if (k === 'A') {
        if (cur) segs.push(cur);
        cur = { start: i, opts: [{ k: 'A', v: m[2].trim() }] };
      } else if (cur && k === String.fromCharCode(cur.opts[cur.opts.length - 1].k.charCodeAt(0) + 1)) {
        cur.opts.push({ k: k, v: m[2].trim() });
      } else if (cur) {
        segs.push(cur);
        cur = null;
      }
    }
    if (cur) segs.push(cur);

    var best = null, j, seg, bp, sp;
    for (j = 0; j < segs.length; j++) {
      seg = segs[j];
      if (seg.opts.length < 2) continue;
      if (!best) { best = seg; continue; }
      bp = best.start > 0 ? 1 : 0;
      sp = seg.start > 0 ? 1 : 0;
      if (sp > bp || (sp === bp && seg.opts.length > best.opts.length)) best = seg;
    }

    if (best) {
      var stem = lines.slice(0, best.start).join('\n').trim();
      if (stem.length > 700) stem = stem.slice(-700);
      var type = 'single';
      if (/多选|不定项|至少.{0,4}项|选出所有|全部正确/.test(stem)) type = 'multi';
      else if (best.opts.length === 2 &&
        /^(正确|对|是|√)$/.test(best.opts[0].v) &&
        /^(错误|错|否|×)$/.test(best.opts[1].v)) type = 'judge';
      return { type: type, stem: stem, options: best.opts };
    }

    var all = lines.join('\n').trim();
    var t = 'fill';
    if (/【问题描述】|【样例|样例输入|样例输出|评分标准|请编写|实现一个|编写一个|补全代码|主类名|public\s+static\s+void\s+main|class\s+\w+\s*\{/.test(all)) {
      t = 'code';
    } else if (/(判断|正确|错误|对错)/.test(all) && all.length < 90) {
      t = 'judge';
    } else if (/试述|简述|论述|阐述|列举|说明|为什么|如何|分析|区别|比较|谈谈|作用|意义|过程|机制|原理/.test(all) && all.length > 24) {
      t = 'short';
    } else if (/_{3,}|（\s*）|\(\s*\)/.test(all) && all.length < 160) {
      t = 'fill';
    } else if (all.length > 60) {
      t = 'short';
    }
    return { type: t, stem: all, options: [] };
  }

  function buildPrompt(q) {
    var label = { single: '单选题', multi: '多选题', judge: '判断题', fill: '填空题', short: '简答题', code: '编程题' }[q.type] || '题目';
    var body = q.stem + (q.options.length ? '\n' + q.options.map(function (o) { return o.k + '. ' + o.v; }).join('\n') : '');
    var head = '你是答题助手。题型：' + label + '\n题目：\n' + body + '\n';

    if (q.type === 'code') {
      return head +
        (q.lang ? '\n语言：' + q.lang : '') +
        (q.code ? '\n\n当前编辑器中的代码（可能不完整，供参考）：\n```\n' + q.code + '\n```' : '') +
        '\n\n要求：\n' +
        '1. 先在内部推理，正文不要输出推理过程。\n' +
        '2. 严格按以下格式输出，不要任何前后缀：\n' +
        '【答案】\n```\n<完整可提交的代码>\n```\n' +
        '【思路】不超过150字，说明关键设计。\n' +
        '【置信度】高/中/低\n' +
        '3. 代码必须完整、可直接编译提交：包含包声明以外的全部 import、类与接口定义；保留题目要求的类名、接口名和主类名。\n' +
        '4. 若题目给出样例输入输出，代码需与该样例一致。';
    }

    if (q.type === 'short') {
      return head + '\n要求：\n' +
        '1. 先在内部推理，正文不要输出推理过程。\n' +
        '2. 严格按以下格式输出，不要任何前后缀：\n' +
        '【答案】分点作答，先给结论，再展开要点，用 1. 2. 3. 编号，控制在300字内。\n' +
        '【置信度】高/中/低\n' +
        '3. 不要写“作为AI”之类的开场白。';
    }

    if (q.type === 'fill') {
      return head + '\n要求：\n' +
        '1. 严格按格式输出：\n【答案】只给要填的内容，多个空用 | 分隔\n【解析】不超过80字\n【置信度】高/中/低\n' +
        '2. 不要输出推理过程。';
    }

    return head + '\n要求：\n' +
      '1. 先在内部逐步推理，正文不要输出推理过程。\n' +
      '2. 严格按以下格式输出，不要任何前后缀：\n' +
      '【答案】B\n' +
      '【解析】不超过120字，说明为什么选它、为什么排除其他。\n' +
      '【置信度】高/中/低\n' +
      '3. 信息不全或不确定时，答案写“不确定”，置信度写“低”。\n' +
      '4. 多选题必须选出全部正确项，答案写成 ABC（字母升序，无分隔符）；单选题只给一个字母。';
  }

  function splitAns(s) {
    var a = /【答案】([\s\S]*?)(?=【解析】|【思路】|【置信度】|$)/.exec(s);
    var e = /【(?:解析|思路)】([\s\S]*?)(?=【置信度】|【答案】|$)/.exec(s);
    var c = /【置信度】\s*([^\n【]*)/.exec(s);
    return { a: a ? a[1].trim() : '', e: e ? e[1].trim() : '', c: c ? c[1].trim() : '' };
  }

  function answerLetters(a) {
    var s = String(a || '').toUpperCase();
    var head = s.match(/^[A-H](?:\s*[、,，.．·和及与]?\s*[A-H])*/);
    if (!head) return [];
    var letters = head[0].match(/[A-H]/g) || [];
    var seen = {}, out = [];
    for (var i = 0; i < letters.length; i++) {
      if (!seen[letters[i]]) { seen[letters[i]] = 1; out.push(letters[i]); }
    }
    return out;
  }

  function extractCode(a) {
    var m = /```[a-zA-Z0-9+#._-]*\n?([\s\S]*?)```/.exec(a);
    if (m) return m[1].replace(/\s+$/, '');
    var open = /```[a-zA-Z0-9+#._-]*\n?([\s\S]*)$/.exec(a);
    if (open) return open[1].replace(/\s+$/, '');
    return String(a || '').trim();
  }

  function renderOpts(q, letters) {
    elOpts.innerHTML = '';
    if (!q || !q.options.length) return;
    for (var i = 0; i < q.options.length; i++) {
      var o = q.options[i];
      var row = document.createElement('div');
      row.className = 'oi' + (letters.indexOf(o.k) >= 0 ? ' hit' : '');
      var kb = document.createElement('span');
      kb.className = 'ok';
      kb.textContent = o.k;
      var vb = document.createElement('span');
      vb.className = 'ov';
      vb.textContent = o.v;
      row.appendChild(kb);
      row.appendChild(vb);
      elOpts.appendChild(row);
    }
  }

  function paint(q, raw) {
    curQ = q;
    curRaw = raw;
    var s = splitAns(raw);
    var isCode = q && q.type === 'code';
    var letters = (q && q.options.length) ? answerLetters(s.a) : [];

    elChip.textContent = q && TYPES[q.type] ? TYPES[q.type] : '';
    elQ.textContent = q ? (q.stem.length > 260 ? q.stem.slice(0, 260) + '…' : q.stem) : '';
    elSecH.textContent = isCode ? '思路' : '解析';

    elAns.classList.remove('wait');
    elCard.classList.remove('long');

    if (isCode) {
      elCard.classList.add('hide');
      elCode.classList.add('on');
      elCT.textContent = q.lang || '代码';
      elPre.textContent = s.a ? extractCode(s.a) : (raw && raw.indexOf('```') >= 0 ? extractCode(raw) : '');
    } else {
      elCard.classList.remove('hide');
      elCode.classList.remove('on');
      elPre.textContent = '';
      if (s.a) {
        if (letters.length) {
          elAns.textContent = letters.join('');
          elAns.classList.remove('txt');
          if (q && q.type === 'single' && letters.length > 1) elChip.textContent = '多选';
        } else {
          elAns.textContent = s.a;
          elAns.classList.add('txt');
          elCard.classList.add('long');
        }
      } else if (raw) {
        elAns.textContent = '生成中';
        elAns.classList.add('wait');
        elAns.classList.remove('txt');
      } else {
        elAns.classList.remove('txt');
        elAns.textContent = '…';
      }
    }

    elCf.className = 'cf' + (/高/.test(s.c) ? ' hi' : /低/.test(s.c) ? ' low' : /中/.test(s.c) ? ' mid' : '');
    elCf.textContent = s.c ? '置信度 ' + s.c : '';

    renderOpts(q, letters);
    elEx.textContent = s.e || '';
  }

  async function ask(cfg, prompt, maxTokens) {
    var url = String(cfg.base).replace(/\/+$/, '') + '/chat/completions';
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model,
        stream: true,
        temperature: 0.2,
        max_tokens: maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) {
      var body = '';
      try { body = (await res.text()).slice(0, 300); } catch (e) {}
      throw new Error('HTTP ' + res.status + (body ? ' · ' + body : ''));
    }
    var reader = res.body.getReader();
    var dec = new TextDecoder();
    var buf = '', full = '';
    while (true) {
      var step = await reader.read();
      if (step.done) break;
      buf += dec.decode(step.value, { stream: true });
      var idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        var line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (line.indexOf('data:') !== 0) continue;
        var data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          var j = JSON.parse(data);
          var piece = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
          if (piece) { full += piece; paint(curQ, full); }
        } catch (e) {}
      }
    }
    if (!full) throw new Error('接口返回为空，请检查模型名是否正确');
    return full;
  }

  function stemKey(q) {
    var s = String(q.stem).replace(/\s+/g, '');
    return s.length + '|' + s.slice(0, 40);
  }

  function saveCache(q, raw) {
    try {
      localStorage.setItem(CK, JSON.stringify({ u: location.href, h: stemKey(q), q: q, a: raw, t: Date.now() }));
    } catch (e) {}
  }

  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CK) || 'null');
      if (c && c.u === location.href && c.q) return c;
    } catch (e) {}
    return null;
  }

  function clearView() {
    elAns.classList.remove('txt', 'wait');
    elAns.textContent = '—';
    elCf.className = 'cf';
    elCf.textContent = '';
    elOpts.innerHTML = '';
    elEx.textContent = '';
    elCode.classList.remove('on');
    elPre.textContent = '';
    elCard.classList.remove('hide', 'long');
  }

  async function run() {
    if (busy) return;
    var cfg = getCfg();
    if (!cfg.key) {
      setSt('请先填 Key');
      openCfg();
      return;
    }

    var cached = readCache();
    if (cached) paint(cached.q, cached.a);

    var text = extract();
    if (!text || text.length < 8) {
      setSt('没找到题目');
      elDbg.classList.remove('fold');
      elDbgText.textContent = '（未从页面抓到任何文本）\n可能原因：题目在跨域 iframe 内、内容尚未渲染、或作答区被误判。\n对策：手动选中题干后再点书签。';
      if (!cached) {
        elQ.textContent = '';
        clearView();
        elEx.textContent = '未识别到题目。请手动选中题干后再次点击书签，或滚动到题目位置再试。';
      }
      return;
    }

    elDbgText.textContent = text.slice(0, 900) + (text.length > 900 ? '\n…（全文 ' + text.length + ' 字）' : '');

    var q = parse(text);
    if (q.type === 'code') {
      q.code = readEditor();
      q.lang = detectLang();
    }

    if (cached && cached.h === stemKey(q) && cached.a) {
      paint(q, cached.a);
      setSt('已恢复上次结果');
      return;
    }

    paint(q, '');
    elAns.textContent = '…';
    elAns.classList.add('wait');
    elAns.classList.remove('txt');
    if (q.type === 'code') elPre.textContent = '';
    else elEx.textContent = '正在作答…';
    elP.classList.add('loading');
    busy = true;
    setSt('请求中');

    var maxTokens = q.type === 'code' ? 4096 : q.type === 'short' ? 1536 : 1024;

    try {
      var full = await ask(cfg, buildPrompt(q), maxTokens);
      paint(q, full);
      saveCache(q, full);
      setSt('完成 · ' + (TYPES[q.type] || '') + ' · ' + text.length + '字');
    } catch (err) {
      var msg = (err && err.message) || String(err);
      if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
        msg = '请求被拦截：可能是接口不支持跨域(CORS)，或本页 CSP 禁止外部请求。';
      } else if (/HTTP 401/.test(msg)) msg = 'API Key 无效，点「设置」重新填写。';
      else if (/HTTP 429/.test(msg)) msg = '触发限流，稍等片刻或更换模型。';
      else if (/HTTP 404/.test(msg)) msg = '接口地址或模型名不对，检查「设置」。';
      setSt('失败');
      elDbg.classList.remove('fold');
      elAns.classList.remove('wait');
      elAns.textContent = '—';
      elAns.classList.remove('txt');
      elEx.textContent = msg;
    } finally {
      busy = false;
      elP.classList.remove('loading');
    }
  }

  function copyText(txt, okMsg) {
    var done = function () { setSt(okMsg || '已复制'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { setSt('复制失败'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { setSt('复制失败'); }
      ta.remove();
    }
  }

  $('.x').addEventListener('click', function () { host.remove(); });

  $('.op').addEventListener('click', function () { elCg.classList.toggle('on'); });

  $('.save').addEventListener('click', function () {
    var c = {
      base: elBase.value.trim() || DEFAULTS.base,
      model: elModel.value.trim() || DEFAULTS.model,
      key: elKey.value.trim()
    };
    try { localStorage.setItem(LSK, JSON.stringify(c)); } catch (e) {}
    elCg.classList.remove('on');
    try { localStorage.removeItem(CK); } catch (e) {}
    run();
  });

  $('.del').addEventListener('click', function () {
    try { localStorage.removeItem(LSK); localStorage.removeItem(CK); } catch (e) {}
    elKey.value = '';
    setSt('已清除');
  });

  $('.re').addEventListener('click', function () {
    try { localStorage.removeItem(CK); } catch (e) {}
    run();
  });

  $('.sec h4').addEventListener('click', function () { $('.sec').classList.toggle('fold'); });

  $('.dbg h4').addEventListener('click', function () { elDbg.classList.toggle('fold'); });

  $('.ccp').addEventListener('click', function () { copyText(elPre.textContent, '代码已复制'); });

  $('.cp').addEventListener('click', function () {
    var s = splitAns(curRaw);
    var txt = '【答案】' + (s.a || elAns.textContent) + '\n' +
      (s.e ? '【解析】' + s.e + '\n' : '') +
      (s.c ? '【置信度】' + s.c : '');
    copyText(txt.trim());
  });

  var hd = $('.hd');
  hd.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button')) return;
    var r = host.getBoundingClientRect();
    var dx = e.clientX - r.left, dy = e.clientY - r.top;
    host.style.right = 'auto';
    host.style.left = r.left + 'px';
    host.style.top = r.top + 'px';
    var mv = function (ev) {
      host.style.left = Math.max(0, Math.min(window.innerWidth - 140, ev.clientX - dx)) + 'px';
      host.style.top = Math.max(0, Math.min(window.innerHeight - 70, ev.clientY - dy)) + 'px';
    };
    var up = function () {
      document.removeEventListener('pointermove', mv);
      document.removeEventListener('pointerup', up);
      try {
        localStorage.setItem(PK, JSON.stringify({
          l: parseInt(host.style.left, 10) || 0,
          t: parseInt(host.style.top, 10) || 0
        }));
      } catch (err) {}
    };
    document.addEventListener('pointermove', mv);
    document.addEventListener('pointerup', up);
  });

  try {
    var pos = JSON.parse(localStorage.getItem(PK) || 'null');
    if (pos && typeof pos.l === 'number' && pos.t >= 0 && pos.l >= 0) {
      host.style.right = 'auto';
      host.style.left = Math.min(pos.l, Math.max(0, window.innerWidth - 160)) + 'px';
      host.style.top = Math.min(pos.t, Math.max(0, window.innerHeight - 80)) + 'px';
    }
  } catch (e) {}

  document.documentElement.appendChild(host);
  run();
})();