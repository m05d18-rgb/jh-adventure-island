// 單元頁：重點整理 / 互動活動 / 測驗 / 錯題本 四個分頁，加上三星、咕博士泡泡、通知與彩帶。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  var GAME = window.APP_GAME;
  var M = window.APP_MASCOT;

  var TABS = [
    { key: 'concepts', label: '重點' },
    { key: 'activities', label: '訓練場' },
    { key: 'quiz', label: 'BOSS 戰' },
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
        setTimeout(function () { M.notify({ icon: '★', title: '獲得星星：' + STAR_NAMES[k], desc: unit.title }); window.APP_SOUND.play('star'); }, delay);
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
    var banner = h('div', { class: 'flag-banner' },
      h('span', { style: { fontSize: '1.6rem' } }, '🚩'),
      h('div', { style: { flex: '1' } }, h('strong', null, '三顆星集滿，金旗升起！'), h('div', { class: 'small muted' }, unit.title)),
      h('a', { class: 'btn primary', href: '#/' }, '回地圖看金旗 →')
    );
    current.panel.insertBefore(banner, current.panel.firstChild);
    // 觸發時使用者通常在頁面底部，要捲到看得見橫幅
    setTimeout(function () { if (banner.isConnected && banner.scrollIntoView) banner.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 350);
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

  // ---------- BOSS 戰（測驗） ----------
  function nextUnitOf(ctx, unit) {
    var list = ctx.content.list(unit.subject, unit.track);
    var i = list.findIndex(function (u) { return u.id === unit.id; });
    return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
  }

  function renderQuiz(root, ctx, unit) {
    var h = ctx.h;
    var S = window.APP_SOUND;
    var B = window.APP_BOSSES;
    var chain = B.chainOf(unit);
    var boss = B.info(chain);
    var p = ctx.store.get(unit.id);
    var total = unit.quiz.length;
    var passNeed = Math.ceil(total * GAME.PASS_RATIO);
    var heartsMax = GAME.newFight(total).maxHearts;

    function hearts(f) {
      var s = '';
      for (var i = 0; i < f.maxHearts; i++) s += i < f.hearts ? '❤️' : '🖤';
      return s;
    }

    function bossPanel(f, mood) {
      var pct = Math.round((f.hp / f.maxHp) * 100);
      var panel = h('div', { class: 'boss-panel' },
        h('div', { class: 'boss-figure', html: B.svg(chain, mood || 'idle') }),
        h('div', { class: 'boss-stats' },
          h('div', { class: 'boss-name' }, boss.name, h('span', { class: 'muted small' }, '　HP ' + f.hp + ' / ' + f.maxHp)),
          h('div', { class: 'hp-bar', role: 'progressbar', 'aria-valuenow': f.hp, 'aria-valuemax': f.maxHp },
            h('span', { style: { width: pct + '%' }, class: pct <= 30 ? 'low' : '' })),
          h('div', { class: 'boss-row' },
            h('span', { class: 'hearts', 'aria-label': '愛心 ' + f.hearts }, hearts(f)),
            h('span', { class: 'combo' + (f.combo >= 2 ? ' on' : '') }, f.combo >= 2 ? '連擊 ×' + f.combo : ''))));
      return panel;
    }

    function intro() {
      root.innerHTML = '';
      root.appendChild(h('div', { class: 'card boss-intro' },
        h('div', { class: 'boss-figure big', html: B.svg(chain, 'idle') }),
        h('h2', null, 'BOSS 戰：' + boss.name),
        h('p', { class: 'muted' }, '牠有 ' + total + ' 格血，答對一題扣一格。你有 ' + heartsMax + ' 顆愛心，答錯掉一顆，掉光就要重來。打倒牠就拿到測驗星星（答對 ' + passNeed + ' 題以上）。'),
        p.bestScore != null ? h('p', null, '目前最高：', h('strong', null, p.bestScore + ' / ' + p.quizTotal), '（挑戰過 ' + p.attempts + ' 次）') : null,
        h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
          h('button', { class: 'btn primary', type: 'button', onClick: start }, p.attempts ? '再次挑戰！' : '開始挑戰！'))
      ));
    }

    function start() {
      var order = window.APP_QUIZ.shuffle(unit.quiz);
      var answers = {};
      var idx = 0;
      var fight = GAME.newFight(total);
      var startedAt = Date.now();
      var unlockedBefore = GAME.unlockedMap(ctx.content.all(), ctx.store.allUnits(), ctx.store.getPlayer().unlockAll);
      say('quizIntro', 'think');

      function showQuestion(mood) {
        root.innerHTML = '';
        if (idx > 0) window.scrollTo(0, Math.max(0, root.getBoundingClientRect().top + window.scrollY - 70));
        var q = order[idx];
        var panel = bossPanel(fight, mood);
        var explain = h('div');
        var next = h('button', { class: 'btn primary', type: 'button', disabled: true, onClick: function () {
          idx += 1;
          if (idx < order.length) showQuestion(); else finish();
        } }, idx === order.length - 1 ? '最後一擊 →' : '下一題 →');

        var optionEls = q.options.map(function (opt, i) {
          return h('button', { class: 'option', type: 'button', onClick: function () {
            answers[q.id] = i;
            var ok = i === q.answer;
            fight = GAME.applyAnswer(fight, ok);
            optionEls.forEach(function (b, j) {
              b.disabled = true;
              if (j === q.answer) b.classList.add('correct');
              else if (j === i) b.classList.add('wrong');
            });
            var fresh = bossPanel(fight, ok ? 'hit' : 'idle');
            panel.replaceWith(fresh);
            panel = fresh;
            if (ok) { S.play('correct'); panel.classList.add('shake'); }
            else { S.play('wrong'); panel.querySelector('.hearts').classList.add('lose'); }
            explain.appendChild(h('div', { class: 'explain ' + (ok ? 'ok' : 'bad') },
              h('strong', null, ok ? '命中！BOSS 掉了一格血。' : '被打到了！正確答案是 ' + optionLabel(q.answer) + '。'),
              h('p', { style: { margin: '6px 0 0' } }, q.explanation)));
            if (!ok) say('quizWrong', 'oops');
            if (fight.failed) {
              next.textContent = '看結果 →';
              next.onclick = null;
              next.addEventListener('click', fail);
            }
            next.disabled = false;
            next.focus();
          } }, h('span', { class: 'mark' }, optionLabel(i)), h('span', null, opt));
        });

        root.appendChild(panel);
        root.appendChild(h('div', { class: 'card' },
          h('div', { class: 'quiz-meta' }, h('span', null, '第 ' + (idx + 1) + ' / ' + total + ' 題'), h('span', null, '觀念：' + q.concept)),
          h('div', { class: 'quiz-q' }, q.question),
          h('div', { class: 'options' }, optionEls),
          explain,
          h('div', { class: 'btn-row' }, next)
        ));
      }

      // 只記錄實際作答的題目：沒看到的題不進錯題本
      function recordAnswered() {
        var right = [], wrong = [];
        unit.quiz.forEach(function (q) {
          if (!Object.prototype.hasOwnProperty.call(answers, q.id)) return;
          (answers[q.id] === q.answer ? right : wrong).push(q.id);
        });
        var before = snapshot(ctx, unit);
        ctx.store.recordQuiz(unit.id, { score: right.length, total: total, wrongIds: wrong, rightIds: right });
        return { before: before, after: checkRewards(ctx, unit, before), right: right, wrong: wrong };
      }

      function fail() {
        var r = recordAnswered();
        S.play('fail');
        say('quizFail', 'think');
        root.innerHTML = '';
        root.appendChild(h('div', { class: 'card boss-result fail' },
          h('div', { class: 'boss-figure big', html: B.svg(chain, 'win') }),
          h('h2', null, '挑戰失敗⋯'),
          h('p', null, boss.name + ' 還剩 ', h('strong', null, fight.hp + ' 格血'), '。你答對了 ' + r.right.length + ' 題，答錯 ' + r.wrong.length + ' 題。'),
          h('p', { class: 'muted small' }, '答錯的題目已放進錯題本。先回去看重點或把錯題練會，再來挑戰一次！'),
          h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
            h('button', { class: 'btn primary', type: 'button', onClick: start }, '再挑戰一次'),
            h('button', { class: 'btn', type: 'button', onClick: function () { ctx.navigate({ view: 'unit', unitId: unit.id, tab: 'concepts' }); } }, '回去看重點'),
            r.wrong.length ? h('button', { class: 'btn', type: 'button', onClick: function () { ctx.navigate({ view: 'unit', unitId: unit.id, tab: 'wrong' }); } }, '去練錯題') : null)
        ));
      }

      function finish() {
        var r = recordAnswered();
        var secs = Math.round((Date.now() - startedAt) / 1000);
        var passed = r.right.length / total >= GAME.PASS_RATIO;
        var unlockedAfter = GAME.unlockedMap(ctx.content.all(), ctx.store.allUnits(), ctx.store.getPlayer().unlockAll);
        var nxt = nextUnitOf(ctx, unit);
        var newlyUnlocked = nxt && unlockedAfter[nxt.id] && !unlockedBefore[nxt.id];
        S.play(passed ? 'win' : 'fail');
        if (newlyUnlocked) setTimeout(function () { S.play('unlock'); }, 900);
        if (!r.after.stars.flag) say(passed ? 'quizPass' : 'quizFail', passed ? 'cheer' : 'think');
        root.innerHTML = '';
        if (r.after.stars.flag) showFlagBanner(ctx, unit);
        root.appendChild(h('div', { class: 'card boss-result ' + (passed ? 'win' : 'fail') },
          h('div', { class: 'boss-figure big', html: B.svg(chain, passed ? 'ko' : 'win') }),
          h('h2', null, passed ? 'BOSS 擊倒！過關！' : '差一點就過關'),
          h('div', { class: 'score-big' }, r.right.length + ' / ' + total),
          h('p', { class: 'muted' }, '用時 ' + Math.floor(secs / 60) + ' 分 ' + (secs % 60) + ' 秒　最高連擊 ×' + fight.maxCombo),
          newlyUnlocked ? h('div', { class: 'unlock-note' }, '🔓 下一關「' + nxt.title + '」已解鎖！') : null,
          r.wrong.length
            ? h('div', { style: { textAlign: 'left' } },
              h('p', null, '答錯的題目已放進錯題本：'),
              h('ul', { class: 'wrong-list' }, unit.quiz.filter(function (q) { return r.wrong.indexOf(q.id) !== -1; }).map(function (q) {
                return h('li', null, q.question, h('span', { class: 'muted small' }, '　正解：' + q.options[q.answer]));
              })))
            : h('p', null, '全部答對，完美通關！'),
          h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
            newlyUnlocked ? h('button', { class: 'btn primary', type: 'button', onClick: function () { ctx.navigate({ view: 'unit', unitId: nxt.id }); } }, '前往下一關 →') : null,
            h('button', { class: 'btn', type: 'button', onClick: start }, '再挑戰一次'),
            r.wrong.length ? h('button', { class: 'btn', type: 'button', onClick: function () { ctx.navigate({ view: 'unit', unitId: unit.id, tab: 'wrong' }); } }, '去練錯題') : null,
            h('a', { class: 'btn', href: '#/' }, '回地圖'))
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

  // 直接輸入網址進到鎖住的關：顯示鎖定畫面
  function renderLocked(root, ctx, unit) {
    var h = ctx.h;
    var list = ctx.content.list(unit.subject, unit.track);
    var i = list.findIndex(function (u) { return u.id === unit.id; });
    var prev = i > 0 ? list[i - 1] : null;
    root.appendChild(h('div', { class: 'card locked-screen' },
      h('div', { class: 'lock-icon', 'aria-hidden': 'true' }, '🔒'),
      h('h1', null, unit.title),
      h('p', null, '這一關還沒解鎖。', prev ? '先打倒「' + prev.title + '」的 BOSS，這座島就會開！' : ''),
      h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
        prev ? h('a', { class: 'btn primary', href: ctx.hashOf({ view: 'unit', unitId: prev.id, tab: 'quiz' }) }, '前往上一關的 BOSS →') : null,
        h('a', { class: 'btn', href: '#/' }, '回地圖'))
    ));
  }

  window.APP_VIEWS.unit = function (root, ctx, unit, tab) {
    var h = ctx.h;
    var s = ctx.subjects[unit.subject];
    unmountAll();
    if (current && current.bubble) current.bubble.destroy();
    root.className = s.cls;

    var unlocked = GAME.unlockedMap(ctx.content.all(), ctx.store.allUnits(), ctx.store.getPlayer().unlockAll);
    if (!unlocked[unit.id]) { current = null; return renderLocked(root, ctx, unit); }
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
