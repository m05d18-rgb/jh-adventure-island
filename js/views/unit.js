// 單元頁：重點整理 / 互動活動 / 測驗 / 錯題本 四個分頁。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  var TABS = [
    { key: 'concepts', label: '重點整理' },
    { key: 'activities', label: '互動活動' },
    { key: 'quiz', label: '測驗' },
    { key: 'wrong', label: '錯題本' },
  ];

  var mounted = []; // 目前掛載中的活動與計時器，切換分頁時清掉
  var current = null; // { root, ctx, unit, tab, tabsEl }

  function unmountAll() {
    mounted.forEach(function (m) { try { m.destroy(); } catch (e) { /* ignore */ } });
    mounted = [];
  }

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    mounted.push({ destroy: function () { clearTimeout(id); } });
  }

  // 只重繪分頁列（完成狀態、錯題數），不動內容
  function refreshTabs() {
    if (!current || !current.tabsEl.isConnected) return;
    var fresh = buildTabs(current.ctx, current.unit, current.tab);
    current.tabsEl.replaceWith(fresh);
    current.tabsEl = fresh;
  }

  function buildTabs(ctx, unit, tab) {
    var h = ctx.h;
    var p = ctx.store.get(unit.id);
    var total = unit.activities.length;
    var done = {
      concepts: p.conceptsDone,
      activities: total > 0 && p.activitiesDone.length >= total,
      quiz: p.bestScore != null,
      wrong: p.wrongIds.length === 0 && p.bestScore != null,
    };
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
      ctx.store.markConceptsDone(unit.id);
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
            ctx.store.markActivityDone(unit.id, a.id);
            status.className = 'badge ok';
            status.textContent = '✓ 完成';
            refreshTabs();
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

    function intro() {
      root.innerHTML = '';
      root.appendChild(h('div', { class: 'card', style: { textAlign: 'center', padding: '30px 20px' } },
        h('h2', null, '單元測驗'),
        h('p', { class: 'muted' }, '共 ' + total + ' 題單選題，答完每一題都會立刻告訴你為什麼。'),
        p.bestScore != null ? h('p', null, '目前最高分：', h('strong', null, p.bestScore + ' / ' + p.quizTotal), '（做過 ' + p.attempts + ' 次）') : null,
        h('button', { class: 'btn primary', type: 'button', onClick: start }, p.attempts ? '再測一次' : '開始測驗')
      ));
    }

    function start() {
      var order = window.APP_QUIZ.shuffle(unit.quiz);
      var answers = {};
      var idx = 0;
      var startedAt = Date.now();

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
        ctx.store.recordQuiz(unit.id, r);
        refreshTabs();
        var secs = Math.round((Date.now() - startedAt) / 1000);
        var wrongQs = unit.quiz.filter(function (q) { return r.wrongIds.indexOf(q.id) !== -1; });
        root.innerHTML = '';
        root.appendChild(h('div', { class: 'card', style: { textAlign: 'center', padding: '30px 20px' } },
          h('div', { class: 'score-big' }, r.score + ' / ' + r.total),
          h('p', { class: 'muted' }, '用時 ' + Math.floor(secs / 60) + ' 分 ' + (secs % 60) + ' 秒'),
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
              ctx.store.resolveWrong(unit.id, q.id);
              refreshTabs();
              // 只重繪錯題本這個面板；若使用者已離開這個分頁（面板被拆掉）就什麼都不做
              later(function () {
                if (!root.isConnected) return;
                renderWrong(root, ctx, unit);
              }, 1800);
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
  // 離開單元頁時由 app.js 呼叫，清掉活動與計時器
  window.APP_VIEWS.teardownUnit = function () {
    unmountAll();
    current = null;
  };

  window.APP_VIEWS.unit = function (root, ctx, unit, tab) {
    var h = ctx.h;
    var s = ctx.subjects[unit.subject];
    unmountAll();
    root.className = s.cls;

    var backRoute = { view: 'subject', subject: unit.subject, track: unit.track };
    root.appendChild(h('div', { class: 'page-head' },
      h('a', { class: 'back-link', href: ctx.hashOf(backRoute) }, '← ' + s.name + (unit.track ? '・' + s.tracks[unit.track] : '')),
      h('h1', null, unit.title),
      h('span', { class: 'muted small' }, unit.publisher + '版')
    ));

    var tabsEl = buildTabs(ctx, unit, tab);
    root.appendChild(tabsEl);
    current = { root: root, ctx: ctx, unit: unit, tab: tab, tabsEl: tabsEl };

    var panel = h('div', { role: 'tabpanel' });
    root.appendChild(panel);
    if (tab === 'concepts') renderConcepts(panel, ctx, unit);
    else if (tab === 'activities') renderActivities(panel, ctx, unit);
    else if (tab === 'quiz') renderQuiz(panel, ctx, unit);
    else renderWrong(panel, ctx, unit);
  };
})();
