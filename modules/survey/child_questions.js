// Файл: lead_bot/modules/survey/child_questions.js
// Вопросы для детского потока

const { Markup } = require('telegraf');

const childQuestions = {
  child_age_detail: {
    id: 'child_age_detail',
    block: 'C',
    text: '👶 *Возраст ребенка:*\n\nУкажите возраст вашего ребенка.',
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('0-3 года', 'child_age_0-3'), Markup.button.callback('4-7 лет', 'child_age_4-7')],
      [Markup.button.callback('8-12 лет', 'child_age_8-12'), Markup.button.callback('13-17 лет', 'child_age_13-17')],
      [Markup.button.callback('⬅️ Назад', 'nav_back')]
    ]),
    required: true,
    type: 'single_choice',
    allowBack: true
  },
  child_problems_detailed: {
    id: 'child_problems_detailed',
    block: 'C',
    text: '😔 *Какие проблемы беспокоят ребенка?*\n\nВыберите все подходящие варианты.\nНажмите "Готово", когда закончите.',
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('Тревожность', 'child_anxiety')],
      [Markup.button.callback('Проблемы со сном', 'child_sleep_problems')],
      [Markup.button.callback('Гиперактивность', 'child_hyperactivity')],
      [Markup.button.callback('Дыхательные проблемы', 'child_breathing_issues')],
      [Markup.button.callback('✅ Готово', 'child_problems_done')],
      [Markup.button.callback('⬅️ Назад', 'nav_back')]
    ]),
    required: true,
    type: 'multiple_choice',
    allowBack: true,
    minSelections: 1,
    maxSelections: 4
  },
  child_parent_involvement: {
    id: 'child_parent_involvement',
    block: 'C',
    text: '👨‍👩‍👧 *Кто будет помогать ребенку с практиками?*',
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('Оба родителя', 'both_parents')],
      [Markup.button.callback('Только мама', 'mother')],
      [Markup.button.callback('Только папа', 'father')],
      [Markup.button.callback('⬅️ Назад', 'nav_back')]
    ]),
    required: true,
    type: 'single_choice',
    allowBack: true
  }
};

module.exports = childQuestions;
