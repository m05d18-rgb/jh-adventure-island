// 測試用的合法單元，六種活動各一、兩題測驗
module.exports = {
  id: 'test-unit',
  subject: 'bio',
  track: null,
  order: 1,
  title: '測試單元',
  publisher: '測試',
  summary: '用來測驗證腳本的單元',
  concepts: [
    { title: '概念甲', body: '甲的說明。', keywords: ['甲'] },
    { title: '概念乙', body: '乙的說明。', keywords: [] },
  ],
  activities: [
    { id: 'a-match', type: 'match', title: '配對', data: { pairs: [
      { left: '一', right: '1' }, { left: '二', right: '2' }, { left: '三', right: '3' },
    ] } },
    { id: 'a-sort', type: 'sort', title: '分類', data: { buckets: ['奇數', '偶數'], items: [
      { text: '1', bucket: 0 }, { text: '2', bucket: 1 }, { text: '3', bucket: 0 },
    ] } },
    { id: 'a-seq', type: 'sequence', title: '排序', data: { prompt: '由小到大', items: ['1', '2', '3'] } },
    { id: 'a-fill', type: 'fill', title: '填空', data: { sentence: '一加一等於[[二]]。', distractors: ['三'] } },
    { id: 'a-label', type: 'label', title: '標示', data: { svg: '<svg viewBox="0 0 100 100"></svg>', labels: [
      { text: '左上', x: 20, y: 20 }, { text: '右下', x: 80, y: 80 },
    ] } },
    { id: 'a-flash', type: 'flashcard', title: '翻牌', data: { cards: [
      { front: '1', back: '一' }, { front: '2', back: '二' }, { front: '3', back: '三' },
    ] } },
  ],
  quiz: [
    { id: 'q1', concept: '概念甲', question: '一加一？', options: ['一', '二', '三'], answer: 1, explanation: '二才對；一、三都算錯。' },
    { id: 'q2', concept: '概念乙', question: '二加一？', options: ['二', '三'], answer: 1, explanation: '三才對；二少了一。' },
  ],
};
