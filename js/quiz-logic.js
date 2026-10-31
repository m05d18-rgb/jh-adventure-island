// 測驗純邏輯：計分、錯題依概念分組、洗牌。
// 瀏覽器端：window.APP_QUIZ；Node 端：require 回傳同物件。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.APP_QUIZ = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // questions: [{ id, answer, ... }]；answers: { [id]: chosenIndex }
  function scoreQuiz(questions, answers) {
    var results = questions.map(function (q) {
      var chosen = Object.prototype.hasOwnProperty.call(answers, q.id) ? answers[q.id] : null;
      return { id: q.id, correct: chosen === q.answer, chosen: chosen, answer: q.answer };
    });
    var right = results.filter(function (r) { return r.correct; }).map(function (r) { return r.id; });
    var wrong = results.filter(function (r) { return !r.correct; }).map(function (r) { return r.id; });
    return { score: right.length, total: questions.length, wrongIds: wrong, rightIds: right, results: results };
  }

  // 只保留 ids 中的題目，依題目原順序；概念順序依「整份題目中概念首次出現」排序，
  // 這樣錯題本的分組順序會跟概念卡順序一致。沒有錯題的概念不列出。
  function groupByConcept(questions, ids) {
    var wanted = {};
    ids.forEach(function (id) { wanted[id] = true; });
    var groups = [];
    var byConcept = {};
    questions.forEach(function (q) {
      if (!byConcept[q.concept]) {
        byConcept[q.concept] = { concept: q.concept, questions: [] };
        groups.push(byConcept[q.concept]);
      }
      if (wanted[q.id]) byConcept[q.concept].questions.push(q);
    });
    return groups.filter(function (g) { return g.questions.length > 0; });
  }

  // Fisher–Yates，回傳新陣列
  function shuffle(array, rng) {
    var r = rng || Math.random;
    var a = array.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  return { scoreQuiz: scoreQuiz, groupByConcept: groupByConcept, shuffle: shuffle };
});
