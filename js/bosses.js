// BOSS：四條路線各一隻（純 SVG），mood 'idle' | 'hit' | 'ko' | 'win'
(function () {
  'use strict';

  var BOSSES = {
    bio: { name: '細胞史萊姆', color: '#4caf7a', dark: '#2f7d55' },
    geo: { name: '岩石巨人', color: '#9c8b74', dark: '#6b5d4a' },
    hist: { name: '幽靈船長', color: '#8a7fd1', dark: '#5c53a0' },
    civ: { name: '規則機器人', color: '#5aa5e0', dark: '#3b78ad' },
  };

  function eyes(mood, cx1, cx2, cy) {
    if (mood === 'ko') {
      var x = function (cx) { return '<path d="M' + (cx - 7) + ' ' + (cy - 7) + ' l14 14 M' + (cx + 7) + ' ' + (cy - 7) + ' l-14 14" stroke="#222" stroke-width="4" stroke-linecap="round"/>'; };
      return x(cx1) + x(cx2);
    }
    if (mood === 'hit') {
      return '<circle cx="' + cx1 + '" cy="' + cy + '" r="9" fill="#fff"/><circle cx="' + cx1 + '" cy="' + cy + '" r="3" fill="#222"/>'
        + '<circle cx="' + cx2 + '" cy="' + cy + '" r="9" fill="#fff"/><circle cx="' + cx2 + '" cy="' + cy + '" r="3" fill="#222"/>';
    }
    return '<circle cx="' + cx1 + '" cy="' + cy + '" r="9" fill="#fff"/><circle cx="' + (cx1 + 2) + '" cy="' + (cy + 1) + '" r="5" fill="#222"/>'
      + '<circle cx="' + cx2 + '" cy="' + cy + '" r="9" fill="#fff"/><circle cx="' + (cx2 + 2) + '" cy="' + (cy + 1) + '" r="5" fill="#222"/>'
      + '<path d="M' + (cx1 - 10) + ' ' + (cy - 14) + ' l16 5 M' + (cx2 + 10) + ' ' + (cy - 14) + ' l-16 5" stroke="#222" stroke-width="3" stroke-linecap="round"/>';
  }

  function mouth(mood, cx, cy) {
    if (mood === 'ko') return '<ellipse cx="' + cx + '" cy="' + (cy + 4) + '" rx="7" ry="9" fill="#222"/>';
    if (mood === 'hit') return '<path d="M' + (cx - 12) + ' ' + (cy + 6) + ' q12 -10 24 0" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>';
    return '<path d="M' + (cx - 14) + ' ' + cy + ' q14 12 28 0" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>'
      + '<path d="M' + (cx - 6) + ' ' + (cy + 3) + ' l0 6 M' + (cx + 6) + ' ' + (cy + 3) + ' l0 6" stroke="#fff" stroke-width="3"/>';
  }

  function body(chain, b) {
    switch (chain) {
      case 'geo':
        return '<path d="M30 110 l10 -55 l25 -25 l30 0 l25 25 l10 55 z" fill="' + b.color + '" stroke="' + b.dark + '" stroke-width="4" stroke-linejoin="round"/>'
          + '<path d="M50 60 l10 -12 M95 48 l12 10" stroke="' + b.dark + '" stroke-width="4" stroke-linecap="round"/>';
      case 'hist':
        return '<path d="M35 110 q0 -70 45 -70 q45 0 45 70 l-12 -10 l-11 10 l-11 -10 l-11 10 l-11 -10 l-11 10 l-11 -10 z" fill="' + b.color + '" stroke="' + b.dark + '" stroke-width="4" stroke-linejoin="round"/>'
          + '<path d="M44 44 q36 -22 72 0 l-6 -18 q-30 -10 -60 0 z" fill="#2b2b2b"/><circle cx="80" cy="26" r="5" fill="#fff"/><path d="M70 30 l20 0 M74 24 l12 0" stroke="#2b2b2b" stroke-width="2"/>';
      case 'civ':
        return '<rect x="38" y="40" width="84" height="70" rx="12" fill="' + b.color + '" stroke="' + b.dark + '" stroke-width="4"/>'
          + '<rect x="72" y="24" width="16" height="16" rx="3" fill="' + b.dark + '"/><circle cx="80" cy="20" r="5" fill="#f2b705"/>'
          + '<rect x="26" y="60" width="12" height="30" rx="4" fill="' + b.dark + '"/><rect x="122" y="60" width="12" height="30" rx="4" fill="' + b.dark + '"/>'
          + '<rect x="56" y="92" width="48" height="8" rx="4" fill="' + b.dark + '"/>';
      default:
        return '<path d="M30 110 q-8 -60 50 -70 q58 10 50 70 q-50 14 -100 0 z" fill="' + b.color + '" stroke="' + b.dark + '" stroke-width="4" stroke-linejoin="round"/>'
          + '<circle cx="56" cy="50" r="6" fill="' + b.dark + '" opacity="0.5"/><circle cx="104" cy="56" r="4" fill="' + b.dark + '" opacity="0.5"/><circle cx="70" cy="96" r="5" fill="' + b.dark + '" opacity="0.5"/>';
    }
  }

  function svg(chain, mood) {
    var b = BOSSES[chain] || BOSSES.bio;
    mood = mood || 'idle';
    var cy = chain === 'civ' ? 66 : 70;
    return '<svg class="boss boss-' + chain + ' boss-' + mood + '" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + b.name + '">'
      + body(chain, b) + eyes(mood, 64, 96, cy) + mouth(mood, 80, cy + 20) + '</svg>';
  }

  window.APP_BOSSES = {
    info: function (chain) { return BOSSES[chain] || BOSSES.bio; },
    svg: svg,
    chainOf: function (unit) { return unit.subject === 'bio' ? 'bio' : unit.track; },
  };
})();
