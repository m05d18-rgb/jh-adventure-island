// 音效：用 WebAudio 合成的小音效，不需要音檔。偏好存在 localStorage 鍵 jh-learn-sound（'off' 表示關閉）。
(function () {
  'use strict';
  var KEY = 'jh-learn-sound';
  var ctx = null;
  var enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* ignore */ }

  function ac() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  // 在 t 秒後播一個音：freq 頻率、dur 秒、type 波形
  function tone(freq, dur, type, when, vol) {
    var c = ac();
    if (!c) return;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) { /* ignore */ } }
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    var t0 = c.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  var SOUNDS = {
    correct: function () { tone(660, 0.1, 'triangle'); tone(880, 0.14, 'triangle', 0.09); },
    wrong: function () { tone(220, 0.18, 'sawtooth', 0, 0.12); tone(160, 0.22, 'sawtooth', 0.12, 0.12); },
    hit: function () { tone(140, 0.08, 'square', 0, 0.1); },
    star: function () { tone(1047, 0.12, 'sine'); tone(1319, 0.2, 'sine', 0.1); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', i * 0.12); }); tone(1319, 0.4, 'triangle', 0.5); },
    fail: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.22, 'sawtooth', i * 0.18, 0.12); }); },
    unlock: function () { tone(784, 0.1, 'sine'); tone(988, 0.1, 'sine', 0.1); tone(1319, 0.25, 'sine', 0.2); },
  };

  window.APP_SOUND = {
    play: function (name) {
      if (!enabled) return;
      var fn = SOUNDS[name];
      if (fn) { try { fn(); } catch (e) { /* ignore */ } }
    },
    get enabled() { return enabled; },
    setEnabled: function (on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
    },
  };
})();
