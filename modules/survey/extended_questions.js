// Файл: lead_bot/modules/survey/extended_questions.js
const { Markup } = require('telegraf');

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
      child_parent_involvement: {
        text: 'Кто будет заниматься с ребенком?\nWho will work with the child?',
        type: 'single_choice',
        options: [
          { text: 'Оба родителя / Both parents', value: 'both_parents', callback: 'child_both_parents' },
          { text: 'Мама / Mother', value: 'mother', callback: 'child_mother' },
          { text: 'Папа / Father', value: 'father', callback: 'child_father' }
        ],
        keyboard: null
      },
      child_motivation_approach: {
        text: 'Что мотивирует ребенка?\nWhat motivates the child?',
        type: 'single_choice',
        options: [
          { text: 'Игры и рассказы / Games and stories', value: 'games_stories', callback: 'child_games_stories' },
          { text: 'Семейные занятия / Family activities', value: 'family_activities', callback: 'child_family_activities' }
        ],
        keyboard: null
      },
      child_time_availability: {
        text: 'Когда удобно заниматься?\nWhen is it convenient to practice?',
        type: 'single_choice',
        options: [
          { text: 'Перед сном / Before sleep', value: 'before_sleep', callback: 'child_before_sleep' },
          { text: 'После школы / After school', value: 'after_school', callback: 'child_after_school' }
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
      },
      breathing_habits: {
        text: 'Как вы обычно дышите?\nHow do you usually breathe?',
        type: 'single_choice',
        options: [
          { text: 'Глубоко и медленно / Deep and slow', value: 'deep_slow', callback: 'breath_deep_slow' },
          { text: 'Быстро и поверхностно / Fast and shallow', value: 'fast_shallow', callback: 'breath_fast_shallow' },
          { text: 'Не обращаю внимания / Don’t pay attention', value: 'no_attention', callback: 'breath_no_attention' }
        ],
        keyboard: null
      },
      meditation_experience: {
        text: 'Есть ли опыт медитации или дыхательных практик?\nDo you have experience with meditation or breathing practices?',
        type: 'single_choice',
        options: [
          { text: 'Да, регулярно / Yes, regularly', value: 'regular', callback: 'exp_regular' },
          { text: 'Да, иногда / Yes, occasionally', value: 'occasional', callback: 'exp_occasional' },
          { text: 'Нет / No', value: 'none', callback: 'exp_none' }
        ],
        keyboard: null
      },
      practice_goals: {
        text: 'Какая ваша цель практики?\nWhat is your practice goal?',
        type: 'single_choice',
        options: [
          { text: 'Снижение стресса / Stress reduction', value: 'stress_reduction', callback: 'goal_stress' },
          { text: 'Улучшение сна / Better sleep', value: 'better_sleep', callback: 'goal_sleep' },
          { text: 'Повышение энергии / More energy', value: 'more_energy', callback: 'goal_energy' }
        ],
        keyboard: null
      },
      stress_level: {
        text: 'Каков ваш уровень стресса? (1 - низкий, 10 - высокий)\nWhat is your stress level? (1 - low, 10 - high)',
        type: 'single_choice',
        options: Array.from({ length: 10 }, (_, i) => ({
          text: `${i + 1}`, value: `${i + 1}`, callback: `stress_${i + 1}`
        })),
        keyboard: null
      },
      time_availability: {
        text: 'Когда вам удобно заниматься?\nWhen is it convenient for you to practice?',
        type: 'single_choice',
        options: [
          { text: 'Утром / Morning', value: 'morning', callback: 'time_morning' },
          { text: 'Вечером / Evening', value: 'evening', callback: 'time_evening' },
          { text: 'В любое время / Anytime', value: 'anytime', callback: 'time_anytime' }
        ],
        keyboard: null
      },
      support_preference: {
        text: 'Нужна ли вам поддержка куратора?\nDo you need curator support?',
        type: 'single_choice',
        options: [
          { text: 'Да / Yes', value: 'yes', callback: 'support_yes' },
          { text: 'Нет / No', value: 'no', callback: 'support_no' }
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
      child_parent_involvement: {
        default: 'child_motivation_approach'
      },
      child_motivation_approach: {
        default: 'child_time_availability'
      },
      child_time_availability: {
        default: null
      },
      occupation: {
        default: 'chronic_conditions'
      },
      chronic_conditions: {
        default: 'breathing_habits'
      },
      breathing_habits: {
        default: 'meditation_experience'
      },
      meditation_experience: {
        default: 'practice_goals'
      },
      practice_goals: {
        default: 'stress_level'
      },
      stress_level: {
        default: 'time_availability'
      },
      time_availability: {
        default: 'support_preference'
      },
      support_preference: {
        default: null
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
    if (questionId === 'occupation' || questionId === 'chronic_conditions' || questionId === 'breathing_habits' ||
        questionId === 'meditation_experience' || questionId === 'practice_goals' || questionId === 'stress_level' ||
        questionId === 'time_availability' || questionId === 'support_preference') {
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
    if (currentQuestion === 'child_parent_involvement') return 'child_problems_detailed';
    if (currentQuestion === 'child_motivation_approach') return 'child_parent_involvement';
    if (currentQuestion === 'child_time_availability') return 'child_motivation_approach';
    if (currentQuestion === 'chronic_conditions') return 'occupation';
    if (currentQuestion === 'breathing_habits') return 'chronic_conditions';
    if (currentQuestion === 'meditation_experience') return 'breathing_habits';
    if (currentQuestion === 'practice_goals') return 'meditation_experience';
    if (currentQuestion === 'stress_level') return 'practice_goals';
    if (currentQuestion === 'time_availability') return 'stress_level';
    if (currentQuestion === 'support_preference') return 'time_availability';
    return null;
  }

  getProgress(completedQuestions, answers) {
    const total = Object.keys(this.questions).length;
    const completed = completedQuestions.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }
}

module.exports = ExtendedSurveyQuestions;
