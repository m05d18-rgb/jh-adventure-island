// 吉祥物「咕博士」：2D SVG、對話泡泡、通知卡、彩帶、文案。
(function () {
  'use strict';

  var C = { body: '#8a5a3c', belly: '#f3e3c3', wing: '#6e4530', eye: '#ffffff', pupil: '#2b2b2b', beak: '#f0a030', foot: '#f0a030', blush: '#f4a6a6' };

  // ---- SVG ----
  function eyes(mood) {
    switch (mood) {
      case 'cheer':
        return '<path d="M38 52 q8 -10 16 0" stroke="' + C.pupil + '" stroke-width="4" fill="none" stroke-linecap="round"/>'
          + '<path d="M66 52 q8 -10 16 0" stroke="' + C.pupil + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
      case 'sleep':
        return '<path d="M38 54 q8 6 16 0" stroke="' + C.pupil + '" stroke-width="4" fill="none" stroke-linecap="round"/>'
          + '<path d="M66 54 q8 6 16 0" stroke="' + C.pupil + '" stroke-width="4" fill="none" stroke-linecap="round"/>'
          + '<text x="92" y="30" font-size="14" fill="' + C.pupil + '" font-weight="700">z</text><text x="100" y="20" font-size="10" fill="' + C.pupil + '">z</text>';
      case 'think':
        return '<circle cx="46" cy="52" r="11" fill="' + C.eye + '"/><circle cx="48" cy="52" r="5" fill="' + C.pupil + '"/>'
          + '<circle cx="74" cy="52" r="11" fill="' + C.eye + '"/><path d="M64 44 l20 0" stroke="' + C.body + '" stroke-width="5" stroke-linecap="round"/><circle cx="76" cy="54" r="5" fill="' + C.pupil + '"/>';
      case 'oops':
        return '<circle cx="46" cy="52" r="13" fill="' + C.eye + '"/><circle cx="46" cy="52" r="7" fill="' + C.pupil + '"/>'
          + '<circle cx="74" cy="52" r="13" fill="' + C.eye + '"/><circle cx="74" cy="52" r="7" fill="' + C.pupil + '"/>';
      default: // happy
        return '<circle cx="46" cy="52" r="12" fill="' + C.eye + '"/><circle cx="48" cy="53" r="6" fill="' + C.pupil + '"/><circle cx="50" cy="50" r="2" fill="#fff"/>'
          + '<circle cx="74" cy="52" r="12" fill="' + C.eye + '"/><circle cx="76" cy="53" r="6" fill="' + C.pupil + '"/><circle cx="78" cy="50" r="2" fill="#fff"/>';
    }
  }

  function beak(mood) {
    if (mood === 'cheer') return '<path d="M52 64 l16 0 l-8 12 z" fill="' + C.beak + '"/><path d="M50 78 q10 8 20 0" stroke="' + C.pupil + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if (mood === 'oops') return '<path d="M54 64 l12 0 l-6 9 z" fill="' + C.beak + '"/><circle cx="60" cy="80" r="4" fill="none" stroke="' + C.pupil + '" stroke-width="3"/>';
    return '<path d="M52 64 l16 0 l-8 11 z" fill="' + C.beak + '"/>';
  }

  function svg(mood) {
    mood = mood || 'happy';
    return '<svg class="owl owl-' + mood + '" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="咕博士" role="img">'
      + '<path d="M30 30 l8 -18 l10 16 z" fill="' + C.body + '"/><path d="M90 30 l-8 -18 l-10 16 z" fill="' + C.body + '"/>'
      + '<ellipse cx="60" cy="68" rx="40" ry="42" fill="' + C.body + '"/>'
      + '<ellipse cx="60" cy="82" rx="26" ry="24" fill="' + C.belly + '"/>'
      + '<ellipse cx="24" cy="76" rx="9" ry="20" fill="' + C.wing + '" transform="rotate(12 24 76)"/>'
      + '<ellipse cx="96" cy="76" rx="9" ry="20" fill="' + C.wing + '" transform="rotate(-12 96 76)"/>'
      + '<circle cx="34" cy="68" r="5" fill="' + C.blush + '" opacity="0.7"/><circle cx="86" cy="68" r="5" fill="' + C.blush + '" opacity="0.7"/>'
      + eyes(mood) + beak(mood)
      + '<path d="M46 108 l-4 8 M46 108 l0 9 M46 108 l4 8" stroke="' + C.foot + '" stroke-width="4" stroke-linecap="round"/>'
      + '<path d="M74 108 l-4 8 M74 108 l0 9 M74 108 l4 8" stroke="' + C.foot + '" stroke-width="4" stroke-linecap="round"/>'
      + '<path d="M44 36 q16 -10 32 0" stroke="' + C.belly + '" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.6"/>'
      + '</svg>';
  }

  // ---- 文案 ----
  var LINES = {
    welcome: ['嗨{name}！我是咕博士，接下來的冒險我陪你。', '{name}，歡迎上島！每座島做完三件事就能升旗。', '準備好了嗎{name}？先從一座島開始就好。'],
    mapHint: ['{name}，今天從「{unit}」開始吧！', '「{unit}」還差一點點，{name}去把它點亮。', '{name}，下一站是「{unit}」，走！'],
    concepts: ['一次看一張，看完想想能不能講給別人聽。', '先看例子，再記名詞，這樣比較不會忘。', '讀完一張就停一下，問自己：這在說什麼？'],
    activities: ['動手做一遍，比看十遍還有用。', '做錯沒關係，再試一次就會了。', '每個活動全對就打勾，慢慢來。'],
    activityDone: ['漂亮！', '這題你已經會了。', '太棒了，{name}！', '穩穩的，下一個！'],
    quizIntro: ['答錯也沒關係，解析才是重點。', '一題一題來，不用急。', '試試看現在記得多少。'],
    quizWrong: ['沒關係，看看解析：為什麼是那個答案？', '這題記下來，等等錯題本再練一次。', '差一點！把解析讀完再往下。'],
    quizPass: ['拿到星星了！{name}真的有讀進去。', '八成以上！這座島快亮了。', '厲害，{name}！測驗過關。'],
    quizFail: ['再回去讀一次重點，再試一次就會更好。', '先把錯題本的題目弄懂，再測一次。', '沒關係，{name}，這次知道哪裡不熟了。'],
    cleanBook: ['錯題本空了，太強了！', '全部弄懂了，{name}！', '清空！這座島沒有你不會的題了。'],
    flag: ['金旗升起來了！{name}，這座島是你的了。', '三顆星集滿！回地圖看看旗子吧。', '完成一座島！下一座在等你。'],
  };

  function pick(key, vars) {
    var list = LINES[key] || [''];
    var text = list[Math.floor(Math.random() * list.length)];
    vars = vars || {};
    return text.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }

  // ---- 對話泡泡（右下角固定） ----
  function mountBubble(container, opts) {
    opts = opts || {};
    var h = window.APP_UI.h;
    var bubble = h('div', { class: 'bubble', role: 'status', 'aria-live': 'polite' });
    var owlWrap = h('button', { class: 'owl-btn', type: 'button', 'aria-label': '咕博士' });
    var dock = h('div', { class: 'mascot-dock' }, bubble, owlWrap);
    var hidden = false;

    function setMood(mood) { owlWrap.innerHTML = svg(mood); }
    function say(text, mood) {
      bubble.textContent = text;
      if (mood) setMood(mood);
      if (!hidden) bubble.classList.add('show');
      bubble.classList.remove('pop');
      void bubble.offsetWidth;
      bubble.classList.add('pop');
    }
    owlWrap.addEventListener('click', function () {
      hidden = !hidden;
      bubble.classList.toggle('show', !hidden);
    });
    setMood(opts.mood || 'happy');
    (container || document.body).appendChild(dock);
    if (opts.text) say(opts.text, opts.mood);

    return {
      say: say,
      setMood: setMood,
      hide: function () { hidden = true; bubble.classList.remove('show'); },
      show: function () { hidden = false; bubble.classList.add('show'); },
      destroy: function () { dock.remove(); },
    };
  }

  // ---- 通知卡（上方堆疊） ----
  var stack = null;
  function notify(o) {
    var h = window.APP_UI.h;
    if (!stack || !stack.isConnected) {
      stack = h('div', { class: 'notify-stack', 'aria-live': 'polite' });
      document.body.appendChild(stack);
    }
    var card = h('div', { class: 'notify' },
      h('span', { class: 'notify-icon', 'aria-hidden': 'true' }, o.icon || '★'),
      h('div', null, h('div', { class: 'notify-title' }, o.title), o.desc ? h('div', { class: 'notify-desc' }, o.desc) : null));
    stack.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('show'); });
    setTimeout(function () {
      card.classList.remove('show');
      setTimeout(function () { card.remove(); }, 400);
    }, o.duration || 3200);
    return card;
  }

  // ---- 彩帶 ----
  function confetti(durationMs) {
    durationMs = durationMs || 2500;
    var canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = canvas.width = window.innerWidth, H = canvas.height = window.innerHeight;
    var colors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#f9844a'];
    var pieces = [];
    for (var i = 0; i < 160; i++) {
      pieces.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
        w: 6 + Math.random() * 6, hgt: 8 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2,
        color: colors[i % colors.length],
      });
    }
    var start = performance.now();
    var raf;
    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, W, H);
      var fade = t > durationMs - 600 ? Math.max(0, (durationMs - t) / 600) : 1;
      ctx.globalAlpha = fade;
      pieces.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.03;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.hgt / 2, p.w, p.hgt);
        ctx.restore();
      });
      if (t < durationMs) raf = requestAnimationFrame(frame);
      else canvas.remove();
    }
    raf = requestAnimationFrame(frame);
    // 分頁被隱藏時 rAF 不會跑，時間到一律移除
    var guard = setTimeout(function () { cancelAnimationFrame(raf); canvas.remove(); }, durationMs + 500);
    return { stop: function () { clearTimeout(guard); cancelAnimationFrame(raf); canvas.remove(); } };
  }

  // ---- 三顆星 ----
  function starsEl(stars, opts) {
    var h = window.APP_UI.h;
    var labels = ['重點', '活動', '測驗'];
    var keys = ['concepts', 'activities', 'quiz'];
    return h('span', { class: 'stars' + (opts && opts.small ? ' small' : ''), 'aria-label': stars.count + ' / 3 顆星' },
      keys.map(function (k, i) {
        return h('span', { class: 'star' + (stars[k] ? ' lit' : ''), title: labels[i] }, '★');
      }),
      stars.flag ? h('span', { class: 'flag', title: '金旗' }, '🚩') : null
    );
  }

  window.APP_MASCOT = { svg: svg, LINES: LINES, pick: pick, mountBubble: mountBubble, notify: notify, confetti: confetti, starsEl: starsEl };
})();
