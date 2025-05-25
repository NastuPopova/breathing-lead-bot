// Файл: lead_bot/modules/survey/extended_questions.js
// Обновленная версия с исправлением импорта Markup

const { Markup } = require('telegraf'); // Добавляем импорт Markup

class ExtendedSurveyQuestions {
  constructor() {
    this.questions = {
      age_group: {
        text: 'Для кого подбираем практики?\nWho are we selecting practices for?',
        type: 'single_choice',
        options: [
          { text: 'Для ребенка 5-12 лет / For a child 5-12 years', value: '5-12', callback: 'age_5-12' },
          { text: 'Для подростка 13-17 лет / For a teen 13-17 years', value: '13-17', callback: 'age_13-17' },
          { text: 'Для взрослого 18+ / For an adult 18+', value: '18+', callback: 'age_18+' }
        ],
        keyboard: null
      },
      child_problems_detailed: {
        text: 'Какие проблемы есть у ребенка? (можно выбрать несколько)\nWhat issues does the child have? (select multiple)',
        type: 'multiple_choice',
        options: [
          { text: 'Проблемы с дыханием / Breathing issues', value: 'breathing_issues', callback: 'child_breathing_issues' },
          { text: 'Тревожность / Anxiety', value: 'anxiety', callback: 'child_anxiety' },
          { text: 'Гиперактивность / Hyperactivity', value: 'hyperactivity', callback: 'child_hyperactivity' },
          { text: 'Проблемы со сном / Sleep problems', value: 'sleep_problems', callback: 'child_sleep_problems' }
        ],
        keyboard: null
      },
      occupation: {
        text: 'Чем вы занимаетесь?\nWhat do you do?',
        type: 'single_choice',
        options: [
          { text: 'Офисная работа / Office work', value: 'office_work', callback: 'occ_office_work' },
          { text: 'Работа на дому / Work from home', value: 'home_work', callback: 'occ_home_work' },
          { text: 'Другое / Other', value: 'other', callback: 'occ_other' }
        ],
        keyboard: null
      },
      chronic_conditions: {
        text: 'Есть ли у вас хронические заболевания?\nDo you have chronic conditions?',
        type: 'single_choice',
        options: [
          { text: 'Да / Yes', value: 'yes', callback: 'chronic_yes' },
          { text: 'Нет / No', value: 'no', callback: 'chronic_no' }
        ],
        keyboard: null
      }
    };

    this.flowLogic = {
      age_group: {
        '5-12': 'child_problems_detailed',
        '13-17': 'child_problems_detailed',
        '18+': 'occupation'
      },
      child_problems_detailed: {
        default: 'child_parent_involvement'
      },
      occupation: {
        default: 'chronic_conditions'
      }
    };

    this.initKeyboards();
  }

  initKeyboards() {
    Object.keys(this.questions).forEach(questionId => {
      const question = this.questions[questionId];
      if (question.options) {
        const buttons = question.options.map(option =>
          Markup.button.callback(option.text, option.callback)
        );
        if (question.type === 'multiple_choice') {
          buttons.push(Markup.button.callback('Готово / Done', `${questionId}_done`));
        }
        buttons.push(Markup.button.callback('⬅️ Назад / Back', 'nav_back'));
        question.keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });
      }
    });
  }

  isChildFlow(answers) {
    const ageGroup = answers.age_group;
    return ageGroup && (ageGroup.includes('5-12') || ageGroup.includes('13-17'));
  }

  getQuestion(questionId) {
    return this.questions[questionId];
  }

  getNextQuestion(currentQuestion, answers) {
    const flow = this.flowLogic[currentQuestion];
    if (!flow) return null;

    if (this.isChildFlow(answers)) {
      return flow.default || null;
    }

    const answer = answers[currentQuestion];
    return flow[answer] || flow.default || null;
  }

  shouldShowQuestion(questionId, answers) {
    if (questionId === 'occupation' || questionId === 'chronic_conditions') {
      return !this.isChildFlow(answers);
    }
    if (questionId.startsWith('child_')) {
      return this.isChildFlow(answers);
    }
    return true;
  }

  mapCallbackToValue(callbackData) {
    console.log(`🔍 Маппинг callback: ${callbackData}`);
    let found = false;
    let output = null;

    Object.values(this.questions).some(question => {
      return question.options?.some(option => {
        if (option.callback === callbackData) {
          output = option.value;
          found = true;
          return true;
        }
        return false;
      });
    });

    console.log(`🔍 Маппинг "${callbackData}" -> ${output !== null ? output : 'не найдено'}`);
    return { input: callbackData, output, found };
  }

  validateAnswer(questionId, callbackData, selections = []) {
    console.log(`🔍 Валидация ответа для "${questionId}": ${callbackData}`);
    const question = this.questions[questionId];
    if (!question) return { valid: false, error: 'Вопрос не найден / Question not found' };

    if (question.type === 'multiple_choice' && callbackData === 'done') {
      return selections.length > 0
        ? { valid: true }
        : { valid: false, error: 'Выберите хотя бы один вариант / Select at least one option' };
    }

    const option = question.options?.find(opt => opt.callback === callbackData);
    if (!option) return { valid: false, error: 'Неверный выбор / Invalid choice' };

    return { valid: true };
  }

  getPreviousQuestion(currentQuestion, answers) {
    if (currentQuestion === 'occupation') return 'age_group';
    if (currentQuestion === 'child_problems_detailed') return 'age_group';
    return null;
  }

  getProgress(completedQuestions, answers) {
    const total = Object.keys(this.questions).length;
    const completed = completedQuestions.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }
}

module.exports = ExtendedSurveyQuestions;
