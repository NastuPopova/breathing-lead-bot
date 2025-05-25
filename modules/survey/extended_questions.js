// Файл: lead_bot/modules/survey/extended_questions.js
// Расширенная анкета с вопросами и адаптивной логикой
// Улучшения: логирование, валидация, маппинг, детские вопросы

const { Markup } = require('telegraf');
const childQuestions = require('./child_questions');

class ExtendedSurveyQuestions {
  constructor() {
    this.questions = this.initializeQuestions();
    this.flowLogic = this.initializeFlowLogic();
    console.log('✅ ExtendedSurveyQuestions инициализирован');
  }

  initializeQuestions() {
    console.log('🔍 Инициализация вопросов...');
    const questions = {
      age_group: {
        id: 'age_group',
        block: 'A',
        text: '📅 *Расскажите о себе:*\n\nВыберите ваш возраст и для кого заполняете анкету.',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('👶 5-12 лет', 'age_5-12'), Markup.button.callback('🧒 13-17 лет', 'age_13-17')],
          [Markup.button.callback('👨‍💼 18-30 лет', 'age_18-30'), Markup.button.callback('👩‍💼 31-45 лет', 'age_31-45')],
          [Markup.button.callback('👨‍🦳 46-60 лет', 'age_46-60'), Markup.button.callback('👴 60+ лет', 'age_60+')],
          [Markup.button.callback('👨‍👩‍👧‍👦 Заполняю для ребенка', 'age_for_child')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: false
      },
      occupation: {
        id: 'occupation',
        block: 'A',
        text: '💼 *Чем вы занимаетесь?*',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('Офисная работа', 'office_work')],
          [Markup.button.callback('Физический труд', 'physical_work')],
          [Markup.button.callback('Учусь', 'student')],
          [Markup.button.callback('Другое', 'other')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },
      physical_activity: {
        id: 'physical_activity',
        block: 'A',
        text: '🏃 *Как часто вы занимаетесь физической активностью?*',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('Каждый день', 'daily')],
          [Markup.button.callback('Несколько раз в неделю', 'sometimes')],
          [Markup.button.callback('Редко или никогда', 'rarely')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },
      current_problems: {
        id: 'current_problems',
        block: 'B',
        text: '😔 *Какие проблемы вас беспокоят?*\n\nВыберите все подходящие варианты.\nНажмите "Готово", когда закончите.',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('Хронический стресс', 'chronic_stress')],
          [Markup.button.callback('Тревожность', 'anxiety')],
          [Markup.button.callback('Проблемы со сном', 'insomnia')],
          [Markup.button.callback('Панические атаки', 'panic_attacks')],
          [Markup.button.callback('✅ Готово', 'problems_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'multiple_choice',
        allowBack: true,
        minSelections: 1,
        maxSelections: 4
      },
      stress_level: {
        id: 'stress_level',
        block: 'B',
        text: '📊 *Уровень стресса за последние 2 недели:*\n\n1 - почти нет стресса\n10 - критический стресс',
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('😌 1', 'stress_1'), Markup.button.callback('😊 2', 'stress_2'),
            Markup.button.callback('🙂 3', 'stress_3'), Markup.button.callback('😐 4', 'stress_4'),
            Markup.button.callback('😕 5', 'stress_5')
          ],
          [
            Markup.button.callback('😟 6', 'stress_6'), Markup.button.callback('😰 7', 'stress_7'),
            Markup.button.callback('😨 8', 'stress_8'), Markup.button.callback('😱 9', 'stress_9'),
            Markup.button.callback('🆘 10', 'stress_10')
          ],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'scale',
        allowBack: true
      },
      main_goals: {
        id: 'main_goals',
        block: 'B',
        text: '🎯 *Какие цели вы хотите достичь?*\n\nВыберите все подходящие варианты.',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('Снизить стресс', 'goal_stress')],
          [Markup.button.callback('Улучшить сон', 'goal_sleep')],
          [Markup.button.callback('Повысить энергию', 'goal_energy')],
          [Markup.button.callback('✅ Готово', 'goals_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'multiple_choice',
        allowBack: true,
        minSelections: 1,
        maxSelections: 3
      },
      chronic_conditions: {
        id: 'chronic_conditions',
        block: 'B',
        text: '🏥 *Есть ли у вас хронические заболевания?*',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('Да', 'yes_conditions')],
          [Markup.button.callback('Нет', 'no_conditions')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true,
        condition: (userData) => userData?.age_group?.includes('60+')
      },
      time_commitment: {
        id: 'time_commitment',
        block: 'B',
        text: '⏰ *Сколько времени вы готовы уделять практикам?*',
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('3-5 минут', '3-5_minutes')],
          [Markup.button.callback('10-15 минут', '10-15_minutes')],
          [Markup.button.callback('20-30 минут', '20-30_minutes')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },
      // Импортируем детские вопросы
      ...childQuestions
    };
    console.log('✅ Вопросы инициализированы:', Object.keys(questions).length);
    return questions;
  }

  initializeFlowLogic() {
    console.log('🔍 Инициализация логики потоков...');
    const flowLogic = {
      standardFlow: [
        'age_group',
        'occupation',
        'physical_activity',
        'current_problems',
        'stress_level',
        'main_goals',
        'time_commitment'
      ],
      childFlow: [
        'child_age_detail',
        'child_problems_detailed',
        'child_parent_involvement',
        'stress_level',
        'main_goals',
        'time_commitment'
      ],
      adaptiveQuestions: ['chronic_conditions']
    };
    console.log('✅ Логика потоков инициализирована');
    return flowLogic;
  }

  isChildFlow(userData) {
    if (!userData || !userData.age_group) {
      console.warn('⚠️ userData не содержит age_group');
      return false;
    }
    const isChild = ['age_5-12', 'age_13-17', 'age_for_child'].some(age => userData.age_group === age);
    console.log(`🔍 Проверка childFlow: ${isChild}`);
    return isChild;
  }

  getNextQuestion(currentQuestion, userData) {
    if (!currentQuestion) {
      console.warn('⚠️ currentQuestion не указан');
      return null;
    }
    if (!userData || typeof userData !== 'object') {
      console.error('❌ Неверный userData:', userData);
      return null;
    }
    console.log(`🔍 Получение следующего вопроса после "${currentQuestion}"...`);

    const flow = this.isChildFlow(userData) ? this.flowLogic.childFlow : this.flowLogic.standardFlow;
    const currentIndex = flow.indexOf(currentQuestion);

    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      const next = flow[currentIndex + 1];
      console.log(`✅ Следующий вопрос в потоке: ${next}`);
      if (this.shouldShowQuestion(next, userData)) {
        return next;
      }
      return this.getNextQuestion(next, userData); // Рекурсия для пропуска неподходящих вопросов
    }

    // Проверка адаптивных вопросов
    for (const adaptiveId of this.flowLogic.adaptiveQuestions) {
      if (!userData[adaptiveId] && this.shouldShowQuestion(adaptiveId, userData)) {
        console.log(`✅ Адаптивный вопрос: ${adaptiveId}`);
        return adaptiveId;
      }
    }

    console.log('ℹ️ Конец потока вопросов');
    return null;
  }

  getPreviousQuestion(currentQuestion, userData) {
    if (!currentQuestion) {
      console.warn('⚠️ currentQuestion не указан');
      return null;
    }
    if (!userData || typeof userData !== 'object') {
      console.error('❌ Неверный userData:', userData);
      return null;
    }
    console.log(`🔍 Получение предыдущего вопроса перед "${currentQuestion}"...`);

    const flow = this.isChildFlow(userData) ? this.flowLogic.childFlow : this.flowLogic.standardFlow;
    const currentIndex = flow.indexOf(currentQuestion);

    if (currentIndex > 0) {
      const prev = flow[currentIndex - 1];
      console.log(`✅ Предыдущий вопрос: ${prev}`);
      return prev;
    }

    console.log('ℹ️ Это первый вопрос');
    return null;
  }

  shouldShowQuestion(questionId, userData) {
    const question = this.questions[questionId];
    if (!question) {
      console.error(`❌ Вопрос "${questionId}" не найден`);
      return false;
    }
    console.log(`🔍 Проверка отображения "${questionId}"`);

    if (question.condition) {
      const shouldShow = question.condition(userData);
      console.log(`🔍 Условие для "${questionId}": ${shouldShow}`);
      return shouldShow;
    }
    return true;
  }

  validateAnswer(questionId, answer, selections = []) {
    const question = this.questions[questionId];
    if (!question) {
      console.error(`❌ Вопрос "${questionId}" не найден для валидации`);
      return { valid: false, error: 'Вопрос не найден' };
    }
    console.log(`🔍 Валидация ответа для "${questionId}": ${answer}`);

    if (questionId === 'stress_level') {
      const isValidFormat = /^stress_\d+$/.test(answer);
      if (!isValidFormat) {
        return { valid: false, error: 'Неверный формат ответа' };
      }
      const value = parseInt(answer.split('_')[1]);
      const isValidValue = value >= 1 && value <= 10;
      return {
        valid: isValidValue,
        error: isValidValue ? null : 'Пожалуйста, выберите уровень стресса от 1 до 10'
      };
    }

    if (question.type === 'multiple_choice') {
      if (answer === 'done') {
        if (selections.length < question.minSelections) {
          return { valid: false, error: `Выберите минимум ${question.minSelections} вариант(а)` };
        }
        if (selections.length > question.maxSelections) {
          return { valid: false, error: `Максимум ${question.maxSelections} вариант(а)` };
        }
        return { valid: true };
      }
      if (selections.includes(answer)) {
        return { valid: true }; // Удаление варианта
      }
      if (selections.length >= question.maxSelections) {
        return { valid: false, error: `Максимум ${question.maxSelections} вариант(а)` };
      }
      return { valid: true };
    }

    return { valid: true };
  }

  mapCallbackToValue(callbackData) {
    console.log(`🔍 Маппинг callback: ${callbackData}`);
    if (callbackData.startsWith('stress_')) {
      const value = callbackData.split('_')[1];
      const parsedValue = parseInt(value);
      const result = {
        input: callbackData,
        output: parsedValue,
        found: !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 10
      };
      console.log('🔬 STRESS_LEVEL MAPPING:', result);
      return result;
    }

    // Другие маппинги
    const mapping = {
      'age_5-12': '5-12',
      'age_13-17': '13-17',
      'age_18-30': '18-30',
      'age_31-45': '31-45',
      'age_46-60': '46-60',
      'age_60+': '60+',
      'age_for_child': 'for_child'
      // Добавьте другие маппинги по необходимости
    };
    const value = mapping[callbackData];
    console.log(`🔍 Маппинг "${callbackData}" -> ${value !== undefined ? value : 'не найдено'}`);
    return value !== undefined ? { input: callbackData, output: value, found: true } : { input: callbackData, output: callbackData, found: false };
  }

  getQuestion(questionId) {
    const question = this.questions[questionId];
    if (!question) {
      console.error(`❌ Вопрос "${questionId}" не найден`);
    }
    return question;
  }

  getProgress(completedQuestions, userData) {
    const total = this.getTotalQuestions(userData);
    const completed = completedQuestions.length;
    const percentage = Math.round((completed / total) * 100);
    console.log(`🔍 Прогресс: ${completed}/${total} (${percentage}%)`);
    return { completed, total, percentage };
  }

  getTotalQuestions(userData) {
    let total = this.flowLogic.standardFlow.length;
    if (this.isChildFlow(userData)) {
      total = this.flowLogic.childFlow.length;
    }
    total += this.flowLogic.adaptiveQuestions.filter(id => this.shouldShowQuestion(id, userData)).length;
    console.log(`🔍 Общее количество вопросов: ${total}`);
    return total;
  }

  exportConfig() {
    return {
      questions: Object.keys(this.questions),
      standardFlow: this.flowLogic.standardFlow,
      childFlow: this.flowLogic.childFlow,
      adaptiveQuestions: this.flowLogic.adaptiveQuestions
    };
  }
}

module.exports = ExtendedSurveyQuestions;
