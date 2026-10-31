// 單元頁：重點整理 / 互動活動 / 測驗 / 錯題本 四個分頁，加上三星、咕博士泡泡、通知與彩帶。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  var GAME = window.APP_GAME;
  var M = window.APP_MASCOT;

  var TABS = [
    { key: 'concepts', label: '重點整理' },
    { key: 'activities', label: '互動活動' },
    { key: 'quiz', label: '測驗' },
    { key: 'wrong', label: '錯題本' },
  ];
  var STAR_NAMES = { concepts: '讀完重點', activities: '活動全部完成', quiz: '測驗過關' };

  var mounted = []; // 目前掛載中的活動與計時器，切換分頁時清掉
  var current = null; // { root, ctx, unit, tab, tabsEl, starsEl, bubble, panel }

  function unmountAll() {
    mounted.forEach(function (m) { try { m.destroy(); } catch (e) { /* ignore */ } });
    mounted = [];
  }

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    mounted.push({ destroy: function () { clearTimeout(id); } });
  }

  function say(key, mood) {
    if (!current || !current.bubble) return;
    var name = current.ctx.store.getPlayer().name || '';
    current.bubble.say(M.pick(key, { name: name }), mood);
  }

  // ---------- 獎勵：比較動作前後的星星與徽章 ----------
  function snapshot(ctx, unit) {
    var player = ctx.store.getPlayer();
    return {
      stars: GAME.computeStars(ctx.store.get(unit.id), unit),
      badges: GAME.computeBadges(ctx.store.allUnits(), ctx.content.all(), player.streak),
    };
  }

  function checkRewards(ctx, unit, before) {
    ctx.store.touchStreak(GAME.todayStr());
    var after = snapshot(ctx, unit);
    var delay = 0;
    // 通知與彩帶用一般 setTimeout：切換分頁不該取消獎勵
    ['concepts', 'activities', 'quiz'].forEach(function (k) {
      if (!before.stars[k] && after.stars[k]) {
        setTimeout(function () { M.notify({ icon: '★', title: '獲得星星：' + STAR_NAMES[k], desc: unit.title }); }, delay);
        delay += 500;
      }
    });
    var seen = ctx.store.getPlayer().badgesSeen;
    var fresh = after.badges.filter(function (id) { return seen.indexOf(id) === -1; });
    fresh.forEach(function (id) {
      var b = GAME.BADGES.find(function (x) { return x.id === id; });
      setTimeout(function () { M.notify({ icon: '🏅', title: '徽章：' + b.name, desc: b.desc, duration: 4000 }); }, delay);
      delay += 500;
    });
    if (fresh.length) ctx.store.markBadgesSeen(fresh);
    if (!before.stars.flag && after.stars.flag) {
      setTimeout(function () { M.confetti(3000); }, 300);
      say('flag', 'cheer');
      showFlagBanner(ctx, unit);
    }
    refreshTabs();
    refreshStars();
    return after;
  }

  function showFlagBanner(ctx, unit) {
    if (!current || !current.panel || current.panel.querySelector('.flag-banner')) return;
    var h = ctx.h;
    current.panel.insertBefore(h('div', { class: 'flag-banner' },
      h('span', { style: { fontSize: '1.6rem' } }, '🚩'),
      h('div', { style: { flex: '1' } }, h('strong', null, '三顆星集滿，金旗升起！'), h('div', { class: 'small muted' }, unit.title)),
      h('a', { class: 'btn primary', href: '#/' }, '回地圖看金旗 →')
    ), current.panel.firstChild);
  }

  // 只重繪分頁列與星星，不動內容
  function refreshTabs() {
    if (!current || !current.tabsEl.isConnected) return;
    var fresh = buildTabs(current.ctx, current.unit, current.tab);
    current.tabsEl.replaceWith(fresh);
    current.tabsEl = fresh;
  }
  function refreshStars() {
    if (!current || !current.starsEl.isConnected) return;
    var fresh = M.starsEl(GAME.computeStars(current.ctx.store.get(current.unit.id), current.unit));
    fresh.classList.add('unit-stars');
    current.starsEl.replaceWith(fresh);
    current.starsEl = fresh;
  }

  function buildTabs(ctx, unit, tab) {
    var h = ctx.h;
    var p = ctx.store.get(unit.id);
    var st = GAME.computeStars(p, unit);
    var done = { concepts: st.concepts, activities: st.activities, quiz: st.quiz, wrong: p.wrongIds.length === 0 && p.bestScore != null };
    return h('div', { class: 'tabs', role: 'tablist' }, TABS.map(function (t) {
      return h('button', {
        type: 'button', role: 'tab', 'aria-selected': t.key === tab ? 'true' : 'false',
        onClick: function () { ctx.navigate({ view: 'unit', unitId: unit.id, tab: t.key }); },
      }, t.label, done[t.key] ? h('span', { class: 'tick', 'aria-label': '已完成' }, '✓') : null,
        t.key === 'wrong' && p.wrongIds.length ? h('span', { class: 'badge bad' }, p.wrongIds.length) : null);
    }));
  }

  function optionLabel(i) { return String.fromCharCode(65 + i); }

  // ---------- 重點整理 ----------
  function renderConcepts(root, ctx, unit) {
    var h = ctx.h;
    var p = ctx.store.get(unit.id);
    var n = unit.concepts.length;
    root.appendChild(h('p', { class: 'muted small' }, '一次看一張就好，看完想一想：能不能用自己的話講一遍？'));
    unit.concepts.forEach(function (c, i) {
      root.appendChild(h('article', { class: 'card concept' },
        h('span', { class: 'index' }, (i + 1) + ' / ' + n),
        h('h3', null, c.title),
        h('p', null, c.body),
        c.keywords && c.keywords.length ? h('div', { class: 'keywords' }, c.keywords.map(function (k) { return h('span', { class: 'badge' }, k); })) : null
      ));
    });
    var btn = h('button', { class: 'btn primary', type: 'button', onClick: function () {
      var before = snapshot(ctx, unit);
      ctx.store.markConceptsDone(unit.id);
      var after = checkRewards(ctx, unit, before);
      if (after.stars.flag) return; // 金旗畫面留在這頁
      ctx.navigate({ view: 'unit', unitId: unit.id, tab: 'activities' });
    } }, p.conceptsDone ? '再讀了一次，去做活動 →' : '我讀完了，去做活動 →');
    root.appendChild(h('div', { class: 'btn-row' }, btn, p.conceptsDone ? h('span', { class: 'badge ok' }, '✓ 已讀完') : null));
  }

  // ---------- 互動活動 ----------
  function renderActivities(root, ctx, unit) {
    var h = ctx.h;
    var p = ctx.store.get(unit.id);
    root.appendChild(h('p', { class: 'muted small' }, '每個活動都做到全對，就會打勾。做錯沒關係，再試一次。'));
    unit.activities.forEach(function (a, i) {
      var done = p.activitiesDone.indexOf(a.id) !== -1;
      var status = h('span', { class: 'badge ' + (done ? 'ok' : '') }, done ? '✓ 完成' : '未完成');
      var body = h('div', { class: 'body' });
      var details = h('details', { class: 'card activity', open: i === firstUndone(unit, p) },
        h('summary', null, h('span', null, (i + 1) + '. ' + a.title), status, h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')),
        body
      );
      var instance = null;
      details.addEventListener('toggle', function () {
        if (details.open && !instance) {
          var mountFn = window.APP_ACTIVITIES[a.type];
          if (!mountFn) { body.textContent = '這種活動型態尚未支援：' + a.type; return; }
          instance = mountFn(body, a.data, { onComplete: function () {
            var before = snapshot(ctx, unit);
            ctx.store.markActivityDone(unit.id, a.id);
            status.className = 'badge ok';
            status.textContent = '✓ 完成';
            var after = checkRewards(ctx, unit, before);
            if (!after.stars.flag) say('activityDone', 'cheer');
          } });
          mounted.push(instance);
        }
      });
      if (details.open) details.dispatchEvent(new Event('toggle'));
      root.appendChild(details);
    });
    root.appendChild(h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', type: 'button', onClick: function () {
        ctx.navigate({ view: 'unit', unitId: unit.id, tab: 'quiz' });
      } }, '去做測驗 →')));
  }

  function firstUndone(unit, p) {
    for (var i = 0; i < unit.activities.length; i++) {
      if (p.activitiesDone.indexOf(unit.activities[i].id) === -1) return i;
    }
    return -1;
  }

  // ---------- 測驗 ----------
  function renderQuiz(root, ctx, unit) {
    var h = ctx.h;
    var p = ctx.store.get(unit.id);
    var total = unit.quiz.length;
    var passNeed = Math.ceil(total * GAME.PASS_RATIO);

    function intro() {
      root.innerHTML = '';
      root.appendChild(h('div', { class: 'card', style: { textAlign: 'center', padding: '30px 20px' } },
        h('h2', null, '單元測驗'),
        h('p', { class: 'muted' }, '共 ' + total + ' 題單選題，答對 ' + passNeed + ' 題以上就拿到測驗星星。答完每一題都會立刻告訴你為什麼。'),
        p.bestScore != null ? h('p', null, '目前最高分：', h('strong', null, p.bestScore + ' / ' + p.quizTotal), '（做過 ' + p.attempts + ' 次）') : null,
        h('button', { class: 'btn primary', type: 'button', onClick: start }, p.attempts ? '再測一次' : '開始測驗')
      ));
    }

    function start() {
      var order = window.APP_QUIZ.shuffle(unit.quiz);
      var answers = {};
      var idx = 0;
      var startedAt = Date.now();
      say('quizIntro', 'think');

      function showQuestion() {
        root.innerHTML = '';
        if (idx > 0) window.scrollTo(0, Math.max(0, root.getBoundingClientRect().top + window.scrollY - 70));
        var q = order[idx];
        var explain = h('div');
        var next = h('button', { class: 'btn primary', type: 'button', disabled: true, onClick: function () {
          idx += 1;
          if (idx < order.length) showQuestion(); else finish();
        } }, idx === order.length - 1 ? '看結果 →' : '下一題 →');

        var optionEls = q.options.map(function (opt, i) {
          return h('button', { class: 'option', type: 'button', onClick: function () {
            answers[q.id] = i;
            optionEls.forEach(function (b, j) {
              b.disabled = true;
              if (j === q.answer) b.classList.add('correct');
              else if (j === i) b.classList.add('wrong');
            });
            var ok = i === q.answer;
            explain.appendChild(h('div', { class: 'explain ' + (ok ? 'ok' : 'bad') },
              h('strong', null, ok ? '答對了！' : '答錯了，正確答案是 ' + optionLabel(q.answer) + '。'),
              h('p', { style: { margin: '6px 0 0' } }, q.explanation)));
            if (!ok) say('quizWrong', 'oops');
            next.disabled = false;
            next.focus();
          } }, h('span', { class: 'mark' }, optionLabel(i)), h('span', null, opt));
        });

        root.appendChild(h('div', { class: 'card' },
          h('div', { class: 'quiz-meta' }, h('span', null, '第 ' + (idx + 1) + ' / ' + total + ' 題'), h('span', null, '觀念：' + q.concept)),
          h('div', { class: 'quiz-q' }, q.question),
          h('div', { class: 'options' }, optionEls),
          explain,
          h('div', { class: 'btn-row' }, next)
        ));
      }

      function finish() {
        var r = window.APP_QUIZ.scoreQuiz(unit.quiz, answers);
        var before = snapshot(ctx, unit);
        ctx.store.recordQuiz(unit.id, r);
        var after = checkRewards(ctx, unit, before);
        var passed = r.score / r.total >= GAME.PASS_RATIO;
        if (!after.stars.flag) say(passed ? 'quizPass' : 'quizFail', passed ? 'cheer' : 'think');
        var secs = Math.round((Date.now() - startedAt) / 1000);
        var wrongQs = unit.quiz.filter(function (q) { return r.wrongIds.indexOf(q.id) !== -1; });
        root.innerHTML = '';
        if (after.stars.flag) showFlagBanner(ctx, unit);
        root.appendChild(h('div', { class: 'card', style: { textAlign: 'center', padding: '30px 20px' } },
          h('div', { class: 'score-big' }, r.score + ' / ' + r.total),
          h('p', { class: 'muted' }, '用時 ' + Math.floor(secs / 60) + ' 分 ' + (secs % 60) + ' 秒' + (passed ? '　★ 測驗過關' : '　還差 ' + (passNeed - r.score) + ' 題就過關')),
          r.score === r.total
            ? h('p', null, '全部答對，太棒了！')
            : h('div', { style: { textAlign: 'left' } },
              h('p', null, '答錯的題目已放進錯題本：'),
              h('ul', { class: 'wrong-list' }, wrongQs.map(function (q) {
                return h('li', null, q.question, h('span', { class: 'muted small' }, '　正解：' + q.options[q.answer]));
              }))),
          h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
            h('button', { class: 'btn', type: 'button', onClick: start }, '再測一次'),
            r.score < r.total ? h('button', { class: 'btn primary', type: 'button', onClick: function () {
              ctx.navigate({ view: 'unit', unitId: unit.id, tab: 'wrong' });
            } }, '去看錯題本 →') : null)
        ));
      }

      showQuestion();
    }

    intro();
  }

  // ---------- 錯題本 ----------
  function renderWrong(root, ctx, unit) {
    var h = ctx.h;
    var p = ctx.store.get(unit.id);
    var groups = window.APP_QUIZ.groupByConcept(unit.quiz, p.wrongIds);
    root.innerHTML = '';
    if (!groups.length) {
      root.appendChild(h('div', { class: 'empty' }, '目前沒有錯題。', h('br'), h('span', { class: 'small' }, '做測驗答錯的題目會自動出現在這裡。')));
      return;
    }
    root.appendChild(h('p', { class: 'muted small' }, '題目按「觀念」分組。哪一組最多，就回「重點整理」把那個觀念再讀一次。'));
    groups.forEach(function (g) {
      var section = h('section', { class: 'wrong-group' },
        h('h3', null, g.concept, h('span', { class: 'badge bad' }, g.questions.length + ' 題')));
      g.questions.forEach(function (q) {
        var item = h('div', { class: 'card wrong-item' });
        var explain = h('div');
        var optionEls = q.options.map(function (opt, i) {
          return h('button', { class: 'option', type: 'button', onClick: function () {
            optionEls.forEach(function (b, j) {
              b.disabled = true;
              if (j === q.answer) b.classList.add('correct');
              else if (j === i) b.classList.add('wrong');
            });
            var ok = i === q.answer;
            explain.appendChild(h('div', { class: 'explain ' + (ok ? 'ok' : 'bad') },
              h('strong', null, ok ? '答對了，這題會從錯題本移出。' : '還是不對，再看一次解析。'),
              h('p', { style: { margin: '6px 0 0' } }, q.explanation)));
            if (ok) {
              var before = snapshot(ctx, unit);
              ctx.store.resolveWrong(unit.id, q.id);
              checkRewards(ctx, unit, before);
              if (ctx.store.get(unit.id).wrongIds.length === 0) say('cleanBook', 'cheer');
              else say('activityDone', 'happy');
              // 只重繪錯題本這個面板；若使用者已離開這個分頁（面板被拆掉）就什麼都不做
              later(function () {
                if (!root.isConnected) return;
                renderWrong(root, ctx, unit);
              }, 1800);
            } else {
              say('quizWrong', 'oops');
            }
          } }, h('span', { class: 'mark' }, optionLabel(i)), h('span', null, opt));
        });
        item.appendChild(h('div', { class: 'q' }, q.question));
        item.appendChild(h('div', { class: 'options', style: { marginTop: '8px' } }, optionEls));
        item.appendChild(explain);
        section.appendChild(item);
      });
      root.appendChild(section);
    });
  }

  // ---------- 主畫面 ----------
  // 離開單元頁時由 app.js 呼叫，清掉活動、計時器與泡泡
  window.APP_VIEWS.teardownUnit = function () {
    unmountAll();
    if (current && current.bubble) current.bubble.destroy();
    document.body.classList.remove('has-mascot');
    current = null;
  };

  window.APP_VIEWS.unit = function (root, ctx, unit, tab) {
    var h = ctx.h;
    var s = ctx.subjects[unit.subject];
    unmountAll();
    if (current && current.bubble) current.bubble.destroy();
    root.className = s.cls;
    ctx.store.setLastUnit(unit.id);

    var stars = GAME.computeStars(ctx.store.get(unit.id), unit);
    var starsEl = M.starsEl(stars);
    starsEl.classList.add('unit-stars');
    root.appendChild(h('div', { class: 'page-head' },
      h('a', { class: 'back-link', href: '#/' }, '← 冒險地圖'),
      h('h1', null, unit.title, starsEl),
      h('span', { class: 'muted small' }, s.name + (unit.track ? '・' + s.tracks[unit.track] : '') + '・' + unit.publisher + '版')
    ));

    var tabsEl = buildTabs(ctx, unit, tab);
    root.appendChild(tabsEl);

    var panel = h('div', { role: 'tabpanel' });
    root.appendChild(panel);

    document.body.classList.add('has-mascot');
    var bubble = M.mountBubble(document.body, { mood: 'happy' });
    current = { root: root, ctx: ctx, unit: unit, tab: tab, tabsEl: tabsEl, starsEl: starsEl, bubble: bubble, panel: panel };

    if (stars.flag) showFlagBanner(ctx, unit);
    if (tab === 'concepts') { renderConcepts(panel, ctx, unit); say('concepts', 'happy'); }
    else if (tab === 'activities') { renderActivities(panel, ctx, unit); say('activities', 'happy'); }
    else if (tab === 'quiz') { renderQuiz(panel, ctx, unit); say('quizIntro', 'think'); }
    else { renderWrong(panel, ctx, unit); say(ctx.store.get(unit.id).wrongIds.length ? 'activities' : 'cleanBook', 'happy'); }
  };
})();
