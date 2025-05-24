// Файл: lead_bot/modules/survey/extended_questions.js
// Расширенная анкета из 18 вопросов с адаптивной логикой

const { Markup } = require('telegraf');

class ExtendedSurveyQuestions {
  constructor() {
    this.questions = this.initializeQuestions();
    this.flowLogic = this.initializeFlowLogic();
  }

  initializeQuestions() {
    return {
      // БЛОК А: ДЕМОГРАФИЯ И КОНТЕКСТ (3 вопроса)
      age_group: {
        id: 'age_group',
        block: 'A',
        text: `📅 *Расскажите о себе:*

Выберите ваш возраст и для кого заполняете анкету. Это поможет подобрать подходящие техники.`,
        
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('👶 5-12 лет', 'age_5-12'),
            Markup.button.callback('🧒 13-17 лет', 'age_13-17')
          ],
          [
            Markup.button.callback('👨‍💼 18-30 лет', 'age_18-30'),
            Markup.button.callback('👩‍💼 31-45 лет', 'age_31-45')
          ],
          [
            Markup.button.callback('👨‍🦳 46-60 лет', 'age_46-60'),
            Markup.button.callback('👴 60+ лет', 'age_60+')
          ],
          [Markup.button.callback('👨‍👩‍👧‍👦 Заполняю для ребенка', 'age_for_child')]
        ]),
        
        required: true,
        type: 'single_choice',
        adaptive: true
      },

      occupation: {
        id: 'occupation',
        block: 'A',
        text: `💼 *Основная деятельность:*

Разные виды деятельности создают разные паттерны дыхания и стресса.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💻 Офисная работа', 'occ_office')],
          [Markup.button.callback('🏠 Работа дома/фриланс', 'occ_home')],
          [Markup.button.callback('🏗️ Физический труд', 'occ_physical')],
          [Markup.button.callback('🎓 Учеба', 'occ_student')],
          [Markup.button.callback('👶 В декрете', 'occ_maternity')],
          [Markup.button.callback('🌅 На пенсии', 'occ_retired')],
          [Markup.button.callback('👔 Руководящая должность', 'occ_management')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      physical_activity: {
        id: 'physical_activity',
        block: 'A',
        text: `🏃 *Физическая активность:*

Как часто занимаетесь спортом или физическими упражнениями?`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🔥 Ежедневно', 'activity_daily')],
          [Markup.button.callback('💪 3-4 раза в неделю', 'activity_regular')],
          [Markup.button.callback('🚶 1-2 раза в неделю', 'activity_sometimes')],
          [Markup.button.callback('📚 Несколько раз в месяц', 'activity_rarely')],
          [Markup.button.callback('🛋️ Практически не занимаюсь', 'activity_never')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      // БЛОК Б: ОСНОВНЫЕ ПРОБЛЕМЫ (4 вопроса)
      current_problems: {
        id: 'current_problems',
        block: 'B',
        text: `⚠️ *Какие проблемы беспокоят вас СЕЙЧАС?*

Выберите все подходящие варианты. Чем честнее ответы, тем точнее рекомендации.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😰 Хронический стресс, напряжение', 'prob_chronic_stress')],
          [Markup.button.callback('😴 Плохой сон, бессонница', 'prob_insomnia')],
          [Markup.button.callback('🫁 Одышка, нехватка воздуха', 'prob_breathing_issues')],
          [Markup.button.callback('💔 Повышенное давление', 'prob_high_pressure')],
          [Markup.button.callback('🤕 Частые головные боли', 'prob_headaches')],
          [Markup.button.callback('😵 Постоянная усталость', 'prob_fatigue')],
          [Markup.button.callback('😨 Тревожность, панические атаки', 'prob_anxiety')],
          [Markup.button.callback('🧠 Проблемы с концентрацией', 'prob_concentration')],
          [Markup.button.callback('🔙 Боли в шее, плечах, спине', 'prob_back_pain')],
          [Markup.button.callback('🍽️ Проблемы с пищеварением', 'prob_digestion')],
          [Markup.button.callback('✅ Завершить выбор', 'prob_done')]
        ]),
        
        required: true,
        type: 'multiple_choice',
        minSelections: 1,
        note: "Выберите все подходящие проблемы, затем нажмите '✅ Завершить выбор'"
      },

      stress_level: {
        id: 'stress_level',
        block: 'B',
        text: `📊 *Уровень стресса за последние 2 недели:*

1 - почти нет стресса, живу спокойно
10 - критический стресс, на пределе

Оцените честно - это поможет подобрать правильный подход.`,
        
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('😌 1', 'stress_1'),
            Markup.button.callback('😊 2', 'stress_2'),
            Markup.button.callback('🙂 3', 'stress_3'),
            Markup.button.callback('😐 4', 'stress_4'),
            Markup.button.callback('😕 5', 'stress_5')
          ],
          [
            Markup.button.callback('😟 6', 'stress_6'),
            Markup.button.callback('😰 7', 'stress_7'),
            Markup.button.callback('😨 8', 'stress_8'),
            Markup.button.callback('😱 9', 'stress_9'),
            Markup.button.callback('🆘 10', 'stress_10')
          ]
        ]),
        
        required: true,
        type: 'scale'
      },

      sleep_quality: {
        id: 'sleep_quality',
        block: 'B',
        text: `😴 *Качество сна за последний месяц:*

1 - сплю очень плохо, постоянно просыпаюсь
10 - сон отличный, высыпаюсь и чувствую себя бодро

Честная оценка поможет понять приоритеты.`,
        
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('🛌 1', 'sleep_1'),
            Markup.button.callback('😪 2', 'sleep_2'),
            Markup.button.callback('😴 3', 'sleep_3'),
            Markup.button.callback('🥱 4', 'sleep_4'),
            Markup.button.callback('😐 5', 'sleep_5')
          ],
          [
            Markup.button.callback('🙂 6', 'sleep_6'),
            Markup.button.callback('😊 7', 'sleep_7'),
            Markup.button.callback('😌 8', 'sleep_8'),
            Markup.button.callback('😴 9', 'sleep_9'),
            Markup.button.callback('🌟 10', 'sleep_10')
          ]
        ]),
        
        required: true,
        type: 'scale'
      },

      priority_problem: {
        id: 'priority_problem',
        block: 'B',
        text: `🎯 *Что беспокоит БОЛЬШЕ ВСЕГО прямо сейчас?*

Выберите одну главную проблему, которую хотите решить в первую очередь.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😰 Не могу справиться со стрессом', 'prio_stress')],
          [Markup.button.callback('😴 Плохо сплю, не высыпаюсь', 'prio_sleep')],
          [Markup.button.callback('🫁 Проблемы с дыханием', 'prio_breathing')],
          [Markup.button.callback('💔 Высокое давление, проблемы с сердцем', 'prio_pressure')],
          [Markup.button.callback('😨 Постоянная тревога, панические атаки', 'prio_anxiety')],
          [Markup.button.callback('😵 Хроническая усталость, нет энергии', 'prio_fatigue')],
          [Markup.button.callback('🧠 Не могу сосредоточиться', 'prio_focus')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      // БЛОК В: ДЫХАТЕЛЬНЫЕ ПРИВЫЧКИ (4 вопроса)
      breathing_method: {
        id: 'breathing_method',
        block: 'C',
        text: `👃 *Как вы обычно дышите в течение дня?*

Понаблюдайте за своим дыханием прямо сейчас и ответьте честно.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('👃 В основном носом', 'method_nose')],
          [Markup.button.callback('👄 Часто дышу ртом', 'method_mouth')],
          [Markup.button.callback('🔄 Попеременно носом и ртом', 'method_mixed')],
          [Markup.button.callback('🤷 Не обращаю внимания на дыхание', 'method_unaware')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      breathing_frequency: {
        id: 'breathing_frequency',
        block: 'C',
        text: `🫁 *Как часто замечаете проблемы с дыханием?*

Проблемы: одышка, нехватка воздуха, учащенное дыхание, дыхание ртом.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🔴 Постоянно (каждый день)', 'freq_constantly')],
          [Markup.button.callback('🟡 Часто (несколько раз в неделю)', 'freq_often')],
          [Markup.button.callback('🟠 Периодически (несколько раз в месяц)', 'freq_sometimes')],
          [Markup.button.callback('🟢 Редко (несколько раз в год)', 'freq_rarely')],
          [Markup.button.callback('⚪ Никогда не замечаю проблем', 'freq_never')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      shallow_breathing: {
        id: 'shallow_breathing',
        block: 'C',
        text: `💨 *Замечали ли поверхностное дыхание или задержки?*

Особенно во время работы, концентрации или стрессовых ситуаций.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('✅ Да, часто ловлю себя на этом', 'shallow_yes_often')],
          [Markup.button.callback('🤔 Иногда замечаю в стрессе', 'shallow_sometimes')],
          [Markup.button.callback('❌ Нет, дышу нормально и глубоко', 'shallow_no')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      stress_breathing: {
        id: 'stress_breathing',
        block: 'C',
        text: `😰 *Что происходит с дыханием, когда нервничаете?*

Вспомните последнюю стрессовую ситуацию.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💨 Дыхание учащается, становится поверхностным', 'stress_rapid')],
          [Markup.button.callback('⏸️ Начинаю задерживать дыхание', 'stress_hold')],
          [Markup.button.callback('😤 Чувствую нехватку воздуха', 'stress_shortage')],
          [Markup.button.callback('👄 Дышу ртом вместо носа', 'stress_mouth')],
          [Markup.button.callback('🤷 Не замечаю изменений', 'stress_no_change')],
          [Markup.button.callback('🧘 Стараюсь дышать глубже', 'stress_conscious')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      // БЛОК Г: ОПЫТ И ЦЕЛИ (4 вопроса)
      breathing_experience: {
        id: 'breathing_experience',
        block: 'D',
        text: `🧘 *Ваш опыт с дыхательными практиками:*

Йога, медитация, специальные дыхательные упражнения.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🆕 Никогда не пробовал(а)', 'exp_never')],
          [Markup.button.callback('🔍 Пробовал(а) пару раз, не пошло', 'exp_few_times')],
          [Markup.button.callback('📚 Изучал(а) теорию, но не практиковал(а)', 'exp_theory')],
          [Markup.button.callback('📅 Иногда практикую (несколько раз в месяц)', 'exp_sometimes')],
          [Markup.button.callback('💪 Практикую регулярно (несколько раз в неделю)', 'exp_regularly')],
          [Markup.button.callback('🎯 Опытный практик (ежедневно)', 'exp_expert')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      time_commitment: {
        id: 'time_commitment',
        block: 'D',
        text: `⏰ *Время для дыхательных практик:*

Сколько времени готовы уделять ежедневно? Будьте реалистичны!`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('⚡ 3-5 минут (в перерывах, по дороге)', 'time_3-5')],
          [Markup.button.callback('🎯 10-15 минут (утром или вечером)', 'time_10-15')],
          [Markup.button.callback('💎 20-30 минут (полноценная практика)', 'time_20-30')],
          [Markup.button.callback('🏆 30+ минут (глубокое изучение)', 'time_30+')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      format_preferences: {
        id: 'format_preferences',
        block: 'D',
        text: `📱 *Удобные форматы изучения:*

Как вам комфортнее изучать дыхательные техники? Можно выбрать несколько.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🎥 Видеоуроки с демонстрацией', 'format_video')],
          [Markup.button.callback('🎧 Аудиопрактики с голосом', 'format_audio')],
          [Markup.button.callback('📖 Текст с картинками', 'format_text')],
          [Markup.button.callback('💻 Живые онлайн-занятия', 'format_online')],
          [Markup.button.callback('👨‍⚕️ Индивидуальные консультации', 'format_individual')],
          [Markup.button.callback('📱 Мобильное приложение', 'format_app')],
          [Markup.button.callback('✅ Завершить выбор', 'format_done')]
        ]),
        
        required: true,
        type: 'multiple_choice',
        note: "Выберите все подходящие форматы, затем нажмите '✅ Завершить выбор'"
      },

      main_goals: {
        id: 'main_goals',
        block: 'D',
        text: `🎯 *Главные цели на ближайший месяц:*

Выберите максимум 2 самые важные цели.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😌 Научиться быстро расслабляться в стрессе', 'goal_relax')],
          [Markup.button.callback('💪 Повысить стрессоустойчивость', 'goal_resilience')],
          [Markup.button.callback('😨 Избавиться от тревожности и паники', 'goal_anxiety')],
          [Markup.button.callback('😴 Наладить качественный сон', 'goal_sleep')],
          [Markup.button.callback('⚡ Повысить энергию и работоспособность', 'goal_energy')],
          [Markup.button.callback('💔 Нормализовать давление/пульс', 'goal_pressure')],
          [Markup.button.callback('🫁 Улучшить работу легких и дыхания', 'goal_breathing')],
          [Markup.button.callback('🧠 Улучшить концентрацию внимания', 'goal_focus')],
          [Markup.button.callback('⚖️ Поддержать процесс похудения', 'goal_weight')],
          [Markup.button.callback('💚 Общее оздоровление организма', 'goal_health')],
          [Markup.button.callback('✅ Завершить выбор', 'goals_done')]
        ]),
        
        required: true,
        type: 'multiple_choice',
        maxSelections: 2,
        note: "Выберите максимум 2 цели, затем нажмите '✅ Завершить выбор'"
      },

      // БЛОК Д: АДАПТИВНЫЕ ВОПРОСЫ (показываются по условиям)
      child_specific: {
        id: 'child_specific',
        block: 'E',
        condition: (userData) => userData.age_group && (userData.age_group.includes('5-12') || userData.age_group.includes('13-17') || userData.age_group === 'for_child'),
        text: `👶 *Дополнительная информация о ребенке:*

Что особенно беспокоит в поведении или состоянии ребенка?`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😭 Часто капризничает, плачет', 'child_tantrums')],
          [Markup.button.callback('😴 Трудно засыпает, беспокойный сон', 'child_sleep')],
          [Markup.button.callback('⚡ Гиперактивный, не может усидеть', 'child_hyperactive')],
          [Markup.button.callback('😰 Тревожный, боится разлуки', 'child_anxiety')],
          [Markup.button.callback('📚 Проблемы с концентрацией в школе', 'child_focus')],
          [Markup.button.callback('🤧 Часто болеет простудными заболеваниями', 'child_illness')],
          [Markup.button.callback('🫁 Астма или проблемы с дыханием', 'child_asthma')],
          [Markup.button.callback('💚 В целом здоров, хочу научить полезным навыкам', 'child_healthy')],
          [Markup.button.callback('✅ Завершить выбор', 'child_done')]
        ]),
        
        required: false,
        type: 'multiple_choice'
      },

      chronic_conditions: {
        id: 'chronic_conditions',
        block: 'E',
        condition: (userData) => userData.main_goals && (
          userData.main_goals.includes('goal_pressure') || 
          userData.main_goals.includes('goal_breathing') ||
          userData.current_problems?.includes('prob_high_pressure')
        ),
        text: `🏥 *Хронические заболевания:*

Важно учесть для безопасности практик. Выберите если есть:`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🫁 Бронхиальная астма', 'condition_asthma')],
          [Markup.button.callback('💔 Гипертония (повышенное давление)', 'condition_hypertension')],
          [Markup.button.callback('🩸 Сахарный диабет', 'condition_diabetes')],
          [Markup.button.callback('❤️ Сердечно-сосудистые заболевания', 'condition_cardio')],
          [Markup.button.callback('🧬 Аутоиммунные заболевания', 'condition_autoimmune')],
          [Markup.button.callback('🧠 Хронический стресс/депрессия', 'condition_mental')],
          [Markup.button.callback('🍽️ Заболевания ЖКТ', 'condition_digestive')],
          [Markup.button.callback('🔧 Другое хроническое заболевание', 'condition_other')],
          [Markup.button.callback('💚 Нет хронических заболеваний', 'condition_none')],
          [Markup.button.callback('✅ Завершить выбор', 'condition_done')]
        ]),
        
        required: false,
        type: 'multiple_choice',
        note: "⚠️ Важно: дыхательные практики дополняют, но не заменяют лечение!"
      },

      weight_goals: {
        id: 'weight_goals',
        block: 'E',
        condition: (userData) => userData.main_goals && userData.main_goals.includes('goal_weight'),
        text: `⚖️ *Цели по снижению веса:*

Расскажите подробнее о ваших целях:`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('📏 Нужно сбросить до 5 кг', 'weight_5kg')],
          [Markup.button.callback('📐 Нужно сбросить 5-15 кг', 'weight_15kg')],
          [Markup.button.callback('📊 Нужно сбросить более 15 кг', 'weight_more15')],
          [Markup.button.callback('🍽️ Проблемы с аппетитом (переедание)', 'weight_appetite')],
          [Markup.button.callback('🐌 Медленный обмен веществ', 'weight_metabolism')],
          [Markup.button.callback('😰 Заедаю стресс', 'weight_stress_eating')],
          [Markup.button.callback('🥗 Хочу поддержать диету дыханием', 'weight_diet_support')],
          [Markup.button.callback('🧘 Интересуют дыхательные методики для фигуры', 'weight_breathing_methods')],
          [Markup.button.callback('✅ Завершить выбор', 'weight_done')]
        ]),
        
        required: false,
        type: 'multiple_choice'
      }
    };
  }

  initializeFlowLogic() {
    return {
      // Стандартный поток вопросов
      standardFlow: [
        'age_group',
        'occupation', 
        'physical_activity',
        'current_problems',
        'stress_level',
        'sleep_quality',
        'priority_problem',
        'breathing_method',
        'breathing_frequency',
        'shallow_breathing',
        'stress_breathing',
        'breathing_experience',
        'time_commitment',
        'format_preferences',
        'main_goals'
      ],
      
      // Адаптивные вопросы
      adaptiveQuestions: [
        'child_specific',
        'chronic_conditions', 
        'weight_goals'
      ]
    };
  }

  /**
   * Получить следующий вопрос с учетом адаптивной логики
   */
  getNextQuestion(currentQuestion, userData) {
    const { standardFlow, adaptiveQuestions } = this.flowLogic;
    
    // Если это стандартный поток
    if (standardFlow.includes(currentQuestion)) {
      const currentIndex = standardFlow.indexOf(currentQuestion);
      
      // Если есть следующий стандартный вопрос
      if (currentIndex < standardFlow.length - 1) {
        return standardFlow[currentIndex + 1];
      }
      
      // Переходим к адаптивным вопросам
      return this.getFirstAdaptiveQuestion(userData);
    }
    
    // Если это адаптивный вопрос
    if (adaptiveQuestions.includes(currentQuestion)) {
      return this.getNextAdaptiveQuestion(currentQuestion, userData);
    }
    
    // Анкета завершена
    return null;
  }

  /**
   * Получить первый подходящий адаптивный вопрос
   */
  getFirstAdaptiveQuestion(userData) {
    for (const questionId of this.flowLogic.adaptiveQuestions) {
      const question = this.questions[questionId];
      if (question.condition && question.condition(userData)) {
        return questionId;
      }
    }
    return null; // Нет подходящих адаптивных вопросов
  }

  /**
   * Получить следующий адаптивный вопрос
   */
  getNextAdaptiveQuestion(currentQuestion, userData) {
    const { adaptiveQuestions } = this.flowLogic;
    const currentIndex = adaptiveQuestions.indexOf(currentQuestion);
    
    // Проверяем оставшиеся адаптивные вопросы
    for (let i = currentIndex + 1; i < adaptiveQuestions.length; i++) {
      const questionId = adaptiveQuestions[i];
      const question = this.questions[questionId];
      if (question.condition && question.condition(userData)) {
        return questionId;
      }
    }
    
    return null; // Больше нет подходящих вопросов
  }

  /**
   * Проверить, должен ли показываться адаптивный вопрос
   */
  shouldShowQuestion(questionId, userData) {
    const question = this.questions[questionId];
    
    if (!question.condition) {
      return true; // Всегда показывать вопросы без условий
    }
    
    return question.condition(userData);
  }

  /**
   * Получить вопрос по ID
   */
  getQuestion(questionId) {
    return this.questions[questionId];
  }

  /**
   * Валидация ответа
   */
  validateAnswer(questionId, answer, currentSelections = []) {
    const question = this.questions[questionId];
    
    if (!question) return { valid: false, error: 'Неизвестный вопрос' };
    
    switch (question.type) {
      case 'single_choice':
      case 'scale':
        return { 
          valid: typeof answer === 'string' && answer.length > 0,
          error: answer ? null : 'Выберите один из вариантов'
        };
        
      case 'multiple_choice':
        // Для множественного выбора проверяем текущие выборы
        if (answer === 'done' || answer.includes('done')) {
          if (question.minSelections && currentSelections.length < question.minSelections) {
            return { 
              valid: false, 
              error: `Выберите минимум ${question.minSelections} вариант(ов)` 
            };
          }
          return { valid: true };
        }
        
        if (question.maxSelections && currentSelections.length >= question.maxSelections) {
          return { 
            valid: false, 
            error: `Можно выбрать максимум ${question.maxSelections} вариант(ов)` 
          };
        }
        
        return { valid: true };
        
      default:
        return { valid: true };
    }
  }

  /**
   * Получить прогресс прохождения анкеты
   */
  getProgress(completedQuestions, userData) {
    const totalQuestions = this.getTotalQuestions(userData);
    const completed = completedQuestions.length;
    
    return {
      completed,
      total: totalQuestions,
      percentage: Math.round((completed / totalQuestions) * 100)
    };
  }

  /**
   * Рассчитать общее количество вопросов для пользователя
   */
  getTotalQuestions(userData) {
    let total = this.flowLogic.standardFlow.length;
    
    // Добавляем адаптивные вопросы
    for (const questionId of this.flowLogic.adaptiveQuestions) {
      if (this.shouldShowQuestion(questionId, userData)) {
        total++;
      }
    }
    
    return total;
  }

  /**
   * Маппинг callback_data в значения
   */
  mapCallbackToValue(callbackData) {
    const mapping = {
      // Возраст
      'age_5-12': '5-12',
      'age_13-17': '13-17',
      'age_18-30': '18-30',
      'age_31-45': '31-45',
      'age_46-60': '46-60',
      'age_60+': '60+',
      'age_for_child': 'for_child',
      
      // Профессия
      'occ_office
	  

// Расширенная анкета из 18 вопросов с адаптивной логикой

const { Markup } = require('telegraf');

class ExtendedSurveyQuestions {
  constructor() {
    this.questions = this.initializeQuestions();
    this.flowLogic = this.initializeFlowLogic();
  }

  initializeQuestions() {
    return {
      // БЛОК А: ДЕМОГРАФИЯ И КОНТЕКСТ (3 вопроса)
      age_group: {
        id: 'age_group',
        block: 'A',
        text: `📅 *Расскажите о себе:*

Выберите ваш возраст и для кого заполняете анкету. Это поможет подобрать подходящие техники.`,
        
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('👶 5-12 лет', 'age_5-12'),
            Markup.button.callback('🧒 13-17 лет', 'age_13-17')
          ],
          [
            Markup.button.callback('👨‍💼 18-30 лет', 'age_18-30'),
            Markup.button.callback('👩‍💼 31-45 лет', 'age_31-45')
          ],
          [
            Markup.button.callback('👨‍🦳 46-60 лет', 'age_46-60'),
            Markup.button.callback('👴 60+ лет', 'age_60+')
          ],
          [Markup.button.callback('👨‍👩‍👧‍👦 Заполняю для ребенка', 'age_for_child')]
        ]),
        
        required: true,
        type: 'single_choice',
        adaptive: true
      },

      occupation: {
        id: 'occupation',
        block: 'A',
        text: `💼 *Основная деятельность:*

Разные виды деятельности создают разные паттерны дыхания и стресса.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💻 Офисная работа', 'occ_office')],
          [Markup.button.callback('🏠 Работа дома/фриланс', 'occ_home')],
          [Markup.button.callback('🏗️ Физический труд', 'occ_physical')],
          [Markup.button.callback('🎓 Учеба', 'occ_student')],
          [Markup.button.callback('👶 В декрете', 'occ_maternity')],
          [Markup.button.callback('🌅 На пенсии', 'occ_retired')],
          [Markup.button.callback('👔 Руководящая должность', 'occ_management')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      physical_activity: {
        id: 'physical_activity',
        block: 'A',
        text: `🏃 *Физическая активность:*

Как часто занимаетесь спортом или физическими упражнениями?`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🔥 Ежедневно', 'activity_daily')],
          [Markup.button.callback('💪 3-4 раза в неделю', 'activity_regular')],
          [Markup.button.callback('🚶 1-2 раза в неделю', 'activity_sometimes')],
          [Markup.button.callback('📚 Несколько раз в месяц', 'activity_rarely')],
          [Markup.button.callback('🛋️ Практически не занимаюсь', 'activity_never')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      // БЛОК Б: ОСНОВНЫЕ ПРОБЛЕМЫ (4 вопроса)
      current_problems: {
        id: 'current_problems',
        block: 'B',
        text: `⚠️ *Какие проблемы беспокоят вас СЕЙЧАС?*

Выберите все подходящие варианты. Чем честнее ответы, тем точнее рекомендации.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😰 Хронический стресс, напряжение', 'prob_chronic_stress')],
          [Markup.button.callback('😴 Плохой сон, бессонница', 'prob_insomnia')],
          [Markup.button.callback('🫁 Одышка, нехватка воздуха', 'prob_breathing_issues')],
          [Markup.button.callback('💔 Повышенное давление', 'prob_high_pressure')],
          [Markup.button.callback('🤕 Частые головные боли', 'prob_headaches')],
          [Markup.button.callback('😵 Постоянная усталость', 'prob_fatigue')],
          [Markup.button.callback('😨 Тревожность, панические атаки', 'prob_anxiety')],
          [Markup.button.callback('🧠 Проблемы с концентрацией', 'prob_concentration')],
          [Markup.button.callback('🔙 Боли в шее, плечах, спине', 'prob_back_pain')],
          [Markup.button.callback('🍽️ Проблемы с пищеварением', 'prob_digestion')],
          [Markup.button.callback('✅ Завершить выбор', 'prob_done')]
        ]),
        
        required: true,
        type: 'multiple_choice',
        minSelections: 1,
        note: "Выберите все подходящие проблемы, затем нажмите '✅ Завершить выбор'"
      },

      stress_level: {
        id: 'stress_level',
        block: 'B',
        text: `📊 *Уровень стресса за последние 2 недели:*

1 - почти нет стресса, живу спокойно
10 - критический стресс, на пределе

Оцените честно - это поможет подобрать правильный подход.`,
        
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('😌 1', 'stress_1'),
            Markup.button.callback('😊 2', 'stress_2'),
            Markup.button.callback('🙂 3', 'stress_3'),
            Markup.button.callback('😐 4', 'stress_4'),
            Markup.button.callback('😕 5', 'stress_5')
          ],
          [
            Markup.button.callback('😟 6', 'stress_6'),
            Markup.button.callback('😰 7', 'stress_7'),
            Markup.button.callback('😨 8', 'stress_8'),
            Markup.button.callback('😱 9', 'stress_9'),
            Markup.button.callback('🆘 10', 'stress_10')
          ]
        ]),
        
        required: true,
        type: 'scale'
      },

      sleep_quality: {
        id: 'sleep_quality',
        block: 'B',
        text: `😴 *Качество сна за последний месяц:*

1 - сплю очень плохо, постоянно просыпаюсь
10 - сон отличный, высыпаюсь и чувствую себя бодро

Честная оценка поможет понять приоритеты.`,
        
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('🛌 1', 'sleep_1'),
            Markup.button.callback('😪 2', 'sleep_2'),
            Markup.button.callback('😴 3', 'sleep_3'),
            Markup.button.callback('🥱 4', 'sleep_4'),
            Markup.button.callback('😐 5', 'sleep_5')
          ],
          [
            Markup.button.callback('🙂 6', 'sleep_6'),
            Markup.button.callback('😊 7', 'sleep_7'),
            Markup.button.callback('😌 8', 'sleep_8'),
            Markup.button.callback('😴 9', 'sleep_9'),
            Markup.button.callback('🌟 10', 'sleep_10')
          ]
        ]),
        
        required: true,
        type: 'scale'
      },

      priority_problem: {
        id: 'priority_problem',
        block: 'B',
        text: `🎯 *Что беспокоит БОЛЬШЕ ВСЕГО прямо сейчас?*

Выберите одну главную проблему, которую хотите решить в первую очередь.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😰 Не могу справиться со стрессом', 'prio_stress')],
          [Markup.button.callback('😴 Плохо сплю, не высыпаюсь', 'prio_sleep')],
          [Markup.button.callback('🫁 Проблемы с дыханием', 'prio_breathing')],
          [Markup.button.callback('💔 Высокое давление, проблемы с сердцем', 'prio_pressure')],
          [Markup.button.callback('😨 Постоянная тревога, панические атаки', 'prio_anxiety')],
          [Markup.button.callback('😵 Хроническая усталость, нет энергии', 'prio_fatigue')],
          [Markup.button.callback('🧠 Не могу сосредоточиться', 'prio_focus')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      // БЛОК В: ДЫХАТЕЛЬНЫЕ ПРИВЫЧКИ (4 вопроса)
      breathing_method: {
        id: 'breathing_method',
        block: 'C',
        text: `👃 *Как вы обычно дышите в течение дня?*

Понаблюдайте за своим дыханием прямо сейчас и ответьте честно.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('👃 В основном носом', 'method_nose')],
          [Markup.button.callback('👄 Часто дышу ртом', 'method_mouth')],
          [Markup.button.callback('🔄 Попеременно носом и ртом', 'method_mixed')],
          [Markup.button.callback('🤷 Не обращаю внимания на дыхание', 'method_unaware')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      breathing_frequency: {
        id: 'breathing_frequency',
        block: 'C',
        text: `🫁 *Как часто замечаете проблемы с дыханием?*

Проблемы: одышка, нехватка воздуха, учащенное дыхание, дыхание ртом.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🔴 Постоянно (каждый день)', 'freq_constantly')],
          [Markup.button.callback('🟡 Часто (несколько раз в неделю)', 'freq_often')],
          [Markup.button.callback('🟠 Периодически (несколько раз в месяц)', 'freq_sometimes')],
          [Markup.button.callback('🟢 Редко (несколько раз в год)', 'freq_rarely')],
          [Markup.button.callback('⚪ Никогда не замечаю проблем', 'freq_never')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      shallow_breathing: {
        id: 'shallow_breathing',
        block: 'C',
        text: `💨 *Замечали ли поверхностное дыхание или задержки?*

Особенно во время работы, концентрации или стрессовых ситуаций.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('✅ Да, часто ловлю себя на этом', 'shallow_yes_often')],
          [Markup.button.callback('🤔 Иногда замечаю в стрессе', 'shallow_sometimes')],
          [Markup.button.callback('❌ Нет, дышу нормально и глубоко', 'shallow_no')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      stress_breathing: {
        id: 'stress_breathing',
        block: 'C',
        text: `😰 *Что происходит с дыханием, когда нервничаете?*

Вспомните последнюю стрессовую ситуацию.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💨 Дыхание учащается, становится поверхностным', 'stress_rapid')],
          [Markup.button.callback('⏸️ Начинаю задерживать дыхание', 'stress_hold')],
          [Markup.button.callback('😤 Чувствую нехватку воздуха', 'stress_shortage')],
          [Markup.button.callback('👄 Дышу ртом вместо носа', 'stress_mouth')],
          [Markup.button.callback('🤷 Не замечаю изменений', 'stress_no_change')],
          [Markup.button.callback('🧘 Стараюсь дышать глубже', 'stress_conscious')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      // БЛОК Г: ОПЫТ И ЦЕЛИ (4 вопроса)
      breathing_experience: {
        id: 'breathing_experience',
        block: 'D',
        text: `🧘 *Ваш опыт с дыхательными практиками:*

Йога, медитация, специальные дыхательные упражнения.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🆕 Никогда не пробовал(а)', 'exp_never')],
          [Markup.button.callback('🔍 Пробовал(а) пару раз, не пошло', 'exp_few_times')],
          [Markup.button.callback('📚 Изучал(а) теорию, но не практиковал(а)', 'exp_theory')],
          [Markup.button.callback('📅 Иногда практикую (несколько раз в месяц)', 'exp_sometimes')],
          [Markup.button.callback('💪 Практикую регулярно (несколько раз в неделю)', 'exp_regularly')],
          [Markup.button.callback('🎯 Опытный практик (ежедневно)', 'exp_expert')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      time_commitment: {
        id: 'time_commitment',
        block: 'D',
        text: `⏰ *Время для дыхательных практик:*

Сколько времени готовы уделять ежедневно? Будьте реалистичны!`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('⚡ 3-5 минут (в перерывах, по дороге)', 'time_3-5')],
          [Markup.button.callback('🎯 10-15 минут (утром или вечером)', 'time_10-15')],
          [Markup.button.callback('💎 20-30 минут (полноценная практика)', 'time_20-30')],
          [Markup.button.callback('🏆 30+ минут (глубокое изучение)', 'time_30+')]
        ]),
        
        required: true,
        type: 'single_choice'
      },

      format_preferences: {
        id: 'format_preferences',
        block: 'D',
        text: `📱 *Удобные форматы изучения:*

Как вам комфортнее изучать дыхательные техники? Можно выбрать несколько.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🎥 Видеоуроки с демонстрацией', 'format_video')],
          [Markup.button.callback('🎧 Аудиопрактики с голосом', 'format_audio')],
          [Markup.button.callback('📖 Текст с картинками', 'format_text')],
          [Markup.button.callback('💻 Живые онлайн-занятия', 'format_online')],
          [Markup.button.callback('👨‍⚕️ Индивидуальные консультации', 'format_individual')],
          [Markup.button.callback('📱 Мобильное приложение', 'format_app')],
          [Markup.button.callback('✅ Завершить выбор', 'format_done')]
        ]),
        
        required: true,
        type: 'multiple_choice',
        note: "Выберите все подходящие форматы, затем нажмите '✅ Завершить выбор'"
      },

      main_goals: {
        id: 'main_goals',
        block: 'D',
        text: `🎯 *Главные цели на ближайший месяц:*

Выберите максимум 2 самые важные цели.`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😌 Научиться быстро расслабляться в стрессе', 'goal_relax')],
          [Markup.button.callback('💪 Повысить стрессоустойчивость', 'goal_resilience')],
          [Markup.button.callback('😨 Избавиться от тревожности и паники', 'goal_anxiety')],
          [Markup.button.callback('😴 Наладить качественный сон', 'goal_sleep')],
          [Markup.button.callback('⚡ Повысить энергию и работоспособность', 'goal_energy')],
          [Markup.button.callback('💔 Нормализовать давление/пульс', 'goal_pressure')],
          [Markup.button.callback('🫁 Улучшить работу легких и дыхания', 'goal_breathing')],
          [Markup.button.callback('🧠 Улучшить концентрацию внимания', 'goal_focus')],
          [Markup.button.callback('⚖️ Поддержать процесс похудения', 'goal_weight')],
          [Markup.button.callback('💚 Общее оздоровление организма', 'goal_health')],
          [Markup.button.callback('✅ Завершить выбор', 'goals_done')]
        ]),
        
        required: true,
        type: 'multiple_choice',
        maxSelections: 2,
        note: "Выберите максимум 2 цели, затем нажмите '✅ Завершить выбор'"
      },

      // БЛОК Д: АДАПТИВНЫЕ ВОПРОСЫ (показываются по условиям)
      child_specific: {
        id: 'child_specific',
        block: 'E',
        condition: (userData) => userData.age_group && (userData.age_group.includes('5-12') || userData.age_group.includes('13-17') || userData.age_group === 'for_child'),
        text: `👶 *Дополнительная информация о ребенке:*

Что особенно беспокоит в поведении или состоянии ребенка?`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😭 Часто капризничает, плачет', 'child_tantrums')],
          [Markup.button.callback('😴 Трудно засыпает, беспокойный сон', 'child_sleep')],
          [Markup.button.callback('⚡ Гиперактивный, не может усидеть', 'child_hyperactive')],
          [Markup.button.callback('😰 Тревожный, боится разлуки', 'child_anxiety')],
          [Markup.button.callback('📚 Проблемы с концентрацией в школе', 'child_focus')],
          [Markup.button.callback('🤧 Часто болеет простудными заболеваниями', 'child_illness')],
          [Markup.button.callback('🫁 Астма или проблемы с дыханием', 'child_asthma')],
          [Markup.button.callback('💚 В целом здоров, хочу научить полезным навыкам', 'child_healthy')],
          [Markup.button.callback('✅ Завершить выбор', 'child_done')]
        ]),
        
        required: false,
        type: 'multiple_choice'
      },

      chronic_conditions: {
        id: 'chronic_conditions',
        block: 'E',
        condition: (userData) => userData.main_goals && (
          userData.main_goals.includes('goal_pressure') || 
          userData.main_goals.includes('goal_breathing') ||
          userData.current_problems?.includes('prob_high_pressure')
        ),
        text: `🏥 *Хронические заболевания:*

Важно учесть для безопасности практик. Выберите если есть:`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🫁 Бронхиальная астма', 'condition_asthma')],
          [Markup.button.callback('💔 Гипертония (повышенное давление)', 'condition_hypertension')],
          [Markup.button.callback('🩸 Сахарный диабет', 'condition_diabetes')],
          [Markup.button.callback('❤️ Сердечно-сосудистые заболевания', 'condition_cardio')],
          [Markup.button.callback('🧬 Аутоиммунные заболевания', 'condition_autoimmune')],
          [Markup.button.callback('🧠 Хронический стресс/депрессия', 'condition_mental')],
          [Markup.button.callback('🍽️ Заболевания ЖКТ', 'condition_digestive')],
          [Markup.button.callback('🔧 Другое хроническое заболевание', 'condition_other')],
          [Markup.button.callback('💚 Нет хронических заболеваний', 'condition_none')],
          [Markup.button.callback('✅ Завершить выбор', 'condition_done')]
        ]),
        
        required: false,
        type: 'multiple_choice',
        note: "⚠️ Важно: дыхательные практики дополняют, но не заменяют лечение!"
      },

      weight_goals: {
        id: 'weight_goals',
        block: 'E',
        condition: (userData) => userData.main_goals && userData.main_goals.includes('goal_weight'),
        text: `⚖️ *Цели по снижению веса:*

Расскажите подробнее о ваших целях:`,
        
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('📏 Нужно сбросить до 5 кг', 'weight_5kg')],
          [Markup.button.callback('📐 Нужно сбросить 5-15 кг', 'weight_15kg')],
          [Markup.button.callback('📊 Нужно сбросить более 15 кг', 'weight_more15')],
          [Markup.button.callback('🍽️ Проблемы с аппетитом (переедание)', 'weight_appetite')],
          [Markup.button.callback('🐌 Медленный обмен веществ', 'weight_metabolism')],
          [Markup.button.callback('😰 Заедаю стресс', 'weight_stress_eating')],
          [Markup.button.callback('🥗 Хочу поддержать диету дыханием', 'weight_diet_support')],
          [Markup.button.callback('🧘 Интересуют дыхательные методики для фигуры', 'weight_breathing_methods')],
          [Markup.button.callback('✅ Завершить выбор', 'weight_done')]
        ]),
        
        required: false,
        type: 'multiple_choice'
      }
    };
  }

  initializeFlowLogic() {
    return {
      // Стандартный поток вопросов
      standardFlow: [
        'age_group',
        'occupation', 
        'physical_activity',
        'current_problems',
        'stress_level',
        'sleep_quality',
        'priority_problem',
        'breathing_method',
        'breathing_frequency',
        'shallow_breathing',
        'stress_breathing',
        'breathing_experience',
        'time_commitment',
        'format_preferences',
        'main_goals'
      ],
      
      // Адаптивные вопросы
      adaptiveQuestions: [
        'child_specific',
        'chronic_conditions', 
        'weight_goals'
      ]
    };
  }

  /**
   * Получить следующий вопрос с учетом адаптивной логики
   */
  getNextQuestion(currentQuestion, userData) {
    const { standardFlow, adaptiveQuestions } = this.flowLogic;
    
    // Если это стандартный поток
    if (standardFlow.includes(currentQuestion)) {
      const currentIndex = standardFlow.indexOf(currentQuestion);
      
      // Если есть следующий стандартный вопрос
      if (currentIndex < standardFlow.length - 1) {
        return standardFlow[currentIndex + 1];
      }
      
      // Переходим к адаптивным вопросам
      return this.getFirstAdaptiveQuestion(userData);
    }
    
    // Если это адаптивный вопрос
    if (adaptiveQuestions.includes(currentQuestion)) {
      return this.getNextAdaptiveQuestion(currentQuestion, userData);
    }
    
    // Анкета завершена
    return null;
  }

  /**
   * Получить первый подходящий адаптивный вопрос
   */
  getFirstAdaptiveQuestion(userData) {
    for (const questionId of this.flowLogic.adaptiveQuestions) {
      const question = this.questions[questionId];
      if (question.condition && question.condition(userData)) {
        return questionId;
      }
    }
    return null; // Нет подходящих адаптивных вопросов
  }

  /**
   * Получить следующий адаптивный вопрос
   */
  getNextAdaptiveQuestion(currentQuestion, userData) {
    const { adaptiveQuestions } = this.flowLogic;
    const currentIndex = adaptiveQuestions.indexOf(currentQuestion);
    
    // Проверяем оставшиеся адаптивные вопросы
    for (let i = currentIndex + 1; i < adaptiveQuestions.length; i++) {
      const questionId = adaptiveQuestions[i];
      const question = this.questions[questionId];
      if (question.condition && question.condition(userData)) {
        return questionId;
      }
    }
    
    return null; // Больше нет подходящих вопросов
  }

  /**
   * Проверить, должен ли показываться адаптивный вопрос
   */
  shouldShowQuestion(questionId, userData) {
    const question = this.questions[questionId];
    
    if (!question.condition) {
      return true; // Всегда показывать вопросы без условий
    }
    
    return question.condition(userData);
  }

  /**
   * Получить вопрос по ID
   */
  getQuestion(questionId) {
    return this.questions[questionId];
  }

  /**
   * Валидация ответа
   */
  validateAnswer(questionId, answer, currentSelections = []) {
    const question = this.questions[questionId];
    
    if (!question) return { valid: false, error: 'Неизвестный вопрос' };
    
    switch (question.type) {
      case 'single_choice':
      case 'scale':
        return { 
          valid: typeof answer === 'string' && answer.length > 0,
          error: answer ? null : 'Выберите один из вариантов'
        };
        
      case 'multiple_choice':
        // Для множественного выбора проверяем текущие выборы
        if (answer === 'done' || answer.includes('done')) {
          if (question.minSelections && currentSelections.length < question.minSelections) {
            return { 
              valid: false, 
              error: `Выберите минимум ${question.minSelections} вариант(ов)` 
            };
          }
          return { valid: true };
        }
        
        if (question.maxSelections && currentSelections.length >= question.maxSelections) {
          return { 
            valid: false, 
            error: `Можно выбрать максимум ${question.maxSelections} вариант(ов)` 
          };
        }
        
        return { valid: true };
        
      default:
        return { valid: true };
    }
  }

  /**
   * Получить прогресс прохождения анкеты
   */
  getProgress(completedQuestions, userData) {
    const totalQuestions = this.getTotalQuestions(userData);
    const completed = completedQuestions.length;
    
    return {
      completed,
      total: totalQuestions,
      percentage: Math.round((completed / totalQuestions) * 100)
    };
  }

  /**
   * Рассчитать общее количество вопросов для пользователя
   */
  getTotalQuestions(userData) {
    let total = this.flowLogic.standardFlow.length;
    
    // Добавляем адаптивные вопросы
    for (const questionId of this.flowLogic.adaptiveQuestions) {
      if (this.shouldShowQuestion(questionId, userData)) {
        total++;
      }
    }
    
    return total;
  }

  /**
   * Маппинг callback_data в значения
   */
  mapCallbackToValue(callbackData) {
    const mapping = {
      // Возраст
      'age_5-12': '5-12',
      'age_13-17': '13-17',
      'age_18-30': '18-30',
      'age_31-45': '31-45',
      'age_46-60': '46-60',
      'age_60+': '60+',
      'age_for_child': 'for_child',
      
      // Профессия
      'occ_office': 'office_work',
      'occ_home': 'home_work',
      'occ_physical': 'physical_work',
      'occ_student': 'student',
      'occ_maternity': 'maternity_leave',
      'occ_retired': 'retired',
      'occ_management': 'management',
      
      // Физическая активность
      'activity_daily': 'daily',
      'activity_regular': 'regular',
      'activity_sometimes': 'sometimes',
      'activity_rarely': 'rarely',
      'activity_never': 'never',
      
      // Проблемы
      'prob_chronic_stress': 'chronic_stress',
      'prob_insomnia': 'insomnia',
      'prob_breathing_issues': 'breathing_issues',
      'prob_high_pressure': 'high_pressure',
      'prob_headaches': 'headaches',
      'prob_fatigue': 'fatigue',
      'prob_anxiety': 'anxiety',
      'prob_concentration': 'concentration_issues',
      'prob_back_pain': 'back_pain',
      'prob_digestion': 'digestion_issues',
      
      // Стресс и сон (числовые значения)
      'stress_1': 1, 'stress_2': 2, 'stress_3': 3, 'stress_4': 4, 'stress_5': 5,
      'stress_6': 6, 'stress_7': 7, 'stress_8': 8, 'stress_9': 9, 'stress_10': 10,
      'sleep_1': 1, 'sleep_2': 2, 'sleep_3': 3, 'sleep_4': 4, 'sleep_5': 5,
      'sleep_6': 6, 'sleep_7': 7, 'sleep_8': 8, 'sleep_9': 9, 'sleep_10': 10,
      
      // Приоритетная проблема
      'prio_stress': 'chronic_stress',
      'prio_sleep': 'insomnia',
      'prio_breathing': 'breathing_issues',
      'prio_pressure': 'high_pressure',
      'prio_anxiety': 'anxiety',
      'prio_fatigue': 'fatigue',
      'prio_focus': 'concentration_issues',
      
      // Способ дыхания
      'method_nose': 'nose',
      'method_mouth': 'mouth',
      'method_mixed': 'mixed',
      'method_unaware': 'unaware',
      
      // Частота проблем с дыханием
      'freq_constantly': 'constantly',
      'freq_often': 'often',
      'freq_sometimes': 'sometimes',
      'freq_rarely': 'rarely',
      'freq_never': 'never',
      
      // Поверхностное дыхание
      'shallow_yes_often': 'yes_often',
      'shallow_sometimes': 'sometimes',
      'shallow_no': 'no',
      
      // Дыхание в стрессе
      'stress_rapid': 'rapid_shallow',
      'stress_hold': 'breath_holding',
      'stress_shortage': 'air_shortage',
      'stress_mouth': 'mouth_breathing',
      'stress_no_change': 'no_change',
      'stress_conscious': 'conscious_breathing',
      
      // Опыт
      'exp_never': 'never',
      'exp_few_times': 'few_times',
      'exp_theory': 'theory_only',
      'exp_sometimes': 'sometimes',
      'exp_regularly': 'regularly',
      'exp_expert': 'expert',
      
      // Время
      'time_3-5': '3-5_minutes',
      'time_10-15': '10-15_minutes',
      'time_20-30': '20-30_minutes',
      'time_30+': '30+_minutes',
      
      // Форматы
      'format_video': 'video',
      'format_audio': 'audio',
      'format_text': 'text',
      'format_online': 'online_live',
      'format_individual': 'individual',
      'format_app': 'mobile_app',
      
      // Цели
      'goal_relax': 'quick_relaxation',
      'goal_resilience': 'stress_resistance',
      'goal_anxiety': 'reduce_anxiety',
      'goal_sleep': 'improve_sleep',
      'goal_energy': 'increase_energy',
      'goal_pressure': 'normalize_pressure',
      'goal_breathing': 'improve_breathing',
      'goal_focus': 'improve_focus',
      'goal_weight': 'weight_management',
      'goal_health': 'general_health',
      
      // Детские проблемы
      'child_tantrums': 'tantrums',
      'child_sleep': 'sleep_issues',
      'child_hyperactive': 'hyperactivity',
      'child_anxiety': 'separation_anxiety',
      'child_focus': 'concentration_issues',
      'child_illness': 'frequent_illness',
      'child_asthma': 'breathing_issues',
      'child_healthy': 'preventive_care',
      
      // Хронические заболевания
      'condition_asthma': 'asthma',
      'condition_hypertension': 'hypertension',
      'condition_diabetes': 'diabetes',
      'condition_cardio': 'cardiovascular',
      'condition_autoimmune': 'autoimmune',
      'condition_mental': 'mental_health',
      'condition_digestive': 'digestive',
      'condition_other': 'other_chronic',
      'condition_none': 'none',
      
      // Цели по весу
      'weight_5kg': 'up_to_5kg',
      'weight_15kg': '5_to_15kg',
      'weight_more15': 'more_than_15kg',
      'weight_appetite': 'appetite_control',
      'weight_metabolism': 'slow_metabolism',
      'weight_stress_eating': 'stress_eating',
      'weight_diet_support': 'diet_support',
      'weight_breathing_methods': 'breathing_methods'
    };
    
    return mapping[callbackData] || callbackData;
  }
}

module.exports = ExtendedSurveyQuestions;
