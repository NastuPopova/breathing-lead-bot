const { Markup } = require('telegraf');
const config = require('../../config');

class ExtendedSurveyQuestions {
  constructor() {
    this.questions = this.initializeQuestions();
    this.flowLogic = this.initializeFlowLogic();
  }

  initializeQuestions() {
    return {
      // БЛОК А: ДЕМОГРАФИЯ И КОНТЕКСТ
      age_group: {
        id: 'age_group',
        block: 'A',
        text: `📅 *Расскажите о себе:*\n\nВыберите ваш возраст или укажите, что заполняете анкету для ребенка.`,
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('👨‍💼 18-30 лет', 'age_18-30'),
            Markup.button.callback('👩‍💼 31-45 лет', 'age_31-45')
          ],
          [
            Markup.button.callback('👨‍🦳 46-60 лет', 'age_46-60'),
            Markup.button.callback('👴 60+ лет', 'age_60+')
          ],
          [
            Markup.button.callback('👨‍👩‍👧‍👦 Заполняю для ребенка', 'age_for_child')
          ]
        ]),
        required: true,
        type: 'single_choice',
        adaptive: true,
        allowBack: false
      },

      occupation: {
        id: 'occupation',
        block: 'A',
        text: `💼 *Основная деятельность:*\n\nРазные виды деятельности создают разные паттерны дыхания и стресса.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💻 Офисная работа', 'occ_office')],
          [Markup.button.callback('🏠 Работа дома/фриланс', 'occ_home')],
          [Markup.button.callback('🏗️ Физический труд', 'occ_physical')],
          [Markup.button.callback('🎓 Учеба', 'occ_student')],
          [Markup.button.callback('👶 В декрете', 'occ_maternity')],
          [Markup.button.callback('🌅 На пенсии', 'occ_retired')],
          [Markup.button.callback('👔 Руководящая должность', 'occ_management')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      physical_activity: {
        id: 'physical_activity',
        block: 'A',
        text: `🏃 *Физическая активность:*\n\nКак часто занимаетесь спортом или физическими упражнениями?`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🔥 Ежедневно', 'activity_daily')],
          [Markup.button.callback('💪 3-4 раза в неделю', 'activity_regular')],
          [Markup.button.callback('🚶 1-2 раза в неделю', 'activity_sometimes')],
          [Markup.button.callback('📚 Несколько раз в месяц', 'activity_rarely')],
          [Markup.button.callback('🛋️ Практически не занимаюсь', 'activity_never')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      // БЛОК Б: ОСНОВНЫЕ ПРОБЛЕМЫ
      current_problems: {
        id: 'current_problems',
        block: 'B',
        text: `⚠️ *Какие проблемы беспокоят вас СЕЙЧАС?*\n\nВыберите до 3 наиболее важных проблем. Чем честнее ответы, тем точнее рекомендации.`,
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
          [Markup.button.callback('✅ Завершить выбор', 'prob_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'multiple_choice',
        minSelections: 1,
        maxSelections: 3,
        note: "Выберите до 3 наиболее важных проблем, затем нажмите '✅ Завершить выбор'",
        allowBack: true
      },

      stress_level: {
        id: 'stress_level',
        block: 'B',
        text: `😰 *Оцените уровень стресса:*\n\n` +
              `Насколько часто вы испытываете стресс по шкале от 1 до 10?\n\n` +
              `*1-3:* Низкий уровень\n` +
              `*4-6:* Умеренный стресс\n` +
              `*7-10:* Высокий уровень`,
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('1️⃣ Минимальный (почти нет стресса)', 'stress_1'),
            Markup.button.callback('2️⃣ Очень низкий', 'stress_2'),
            Markup.button.callback('3️⃣ Низкий', 'stress_3')
          ],
          [
            Markup.button.callback('4️⃣ Легкий', 'stress_4'),
            Markup.button.callback('5️⃣ Средний', 'stress_5'),
            Markup.button.callback('6️⃣ Умеренный', 'stress_6')
          ],
          [
            Markup.button.callback('7️⃣ Повышенный', 'stress_7'),
            Markup.button.callback('8️⃣ Высокий', 'stress_8'),
            Markup.button.callback('9️⃣ Очень высокий', 'stress_9')
          ],
          [
            Markup.button.callback('🔟 Критический (не справляюсь)', 'stress_10')
          ],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'scale',
        note: '💡 Чем выше число, тем сильнее стресс',
        allowBack: true
      },

      sleep_quality: {
        id: 'sleep_quality',
        block: 'B',
        text: `😴 *Качество сна за последний месяц:*\n\n1 - сплю очень плохо, постоянно просыпаюсь\n10 - сон отличный, высыпаюсь и чувствую себя бодро`,
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
          ],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'scale',
        allowBack: true
      },

      priority_problem: {
        id: 'priority_problem',
        block: 'B',
        text: `🎯 *Что беспокоит БОЛЬШЕ ВСЕГО прямо сейчас?*\n\nВыберите одну главную проблему, которую хотите решить в первую очередь.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😰 Не могу справиться со стрессом', 'prio_stress')],
          [Markup.button.callback('😴 Плохо сплю, не высыпаюсь', 'prio_sleep')],
          [Markup.button.callback('🫁 Проблемы с дыханием', 'prio_breathing')],
          [Markup.button.callback('💔 Высокое давление, проблемы с сердцем', 'prio_pressure')],
          [Markup.button.callback('😨 Постоянная тревога, панические атаки', 'prio_anxiety')],
          [Markup.button.callback('😵 Хроническая усталость, нет энергии', 'prio_fatigue')],
          [Markup.button.callback('🧠 Не могу сосредоточиться', 'prio_focus')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      // БЛОК В: ДЫХАТЕЛЬНЫЕ ПРИВЫЧКИ
      breathing_method: {
        id: 'breathing_method',
        block: 'C',
        text: `👃 *Как вы обычно дышите в течение дня?*\n\nПонаблюдайте за своим дыханием прямо сейчас и ответьте честно.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('👃 В основном носом', 'method_nose')],
          [Markup.button.callback('👄 Часто дышу ртом', 'method_mouth')],
          [Markup.button.callback('🔄 Попеременно носом и ртом', 'method_mixed')],
          [Markup.button.callback('🤷 Не обращаю внимания на дыхание', 'method_unaware')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      breathing_frequency: {
        id: 'breathing_frequency',
        block: 'C',
        text: `🫁 *Как часто замечаете проблемы с дыханием?*\n\nПроблемы: одышка, нехватка воздуха, учащенное дыхание, дыхание ртом.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🔴 Постоянно (каждый день)', 'freq_constantly')],
          [Markup.button.callback('🟡 Часто (несколько раз в неделю)', 'freq_often')],
          [Markup.button.callback('🟠 Периодически (несколько раз в месяц)', 'freq_sometimes')],
          [Markup.button.callback('🟢 Редко (несколько раз в год)', 'freq_rarely')],
          [Markup.button.callback('⚪ Никогда не замечаю проблем', 'freq_never')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      shallow_breathing: {
        id: 'shallow_breathing',
        block: 'C',
        text: `💨 *Замечали ли поверхностное дыхание или задержки?*\n\nОсобенно во время работы, концентрации или стрессовых ситуаций.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('✅ Да, часто ловлю себя на этом', 'shallow_yes_often')],
          [Markup.button.callback('🤔 Иногда замечаю в стрессе', 'shallow_sometimes')],
          [Markup.button.callback('❌ Нет, дышу нормально и глубоко', 'shallow_no')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      stress_breathing: {
        id: 'stress_breathing',
        block: 'C',
        text: `😰 *Что происходит с дыханием, когда нервничаете?*\n\nВспомните последнюю стрессовую ситуацию.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💨 Дыхание учащается, становится поверхностным', 'stress_rapid')],
          [Markup.button.callback('⏸️ Начинаю задерживать дыхание', 'stress_hold')],
          [Markup.button.callback('😤 Чувствую нехватку воздуха', 'stress_shortage')],
          [Markup.button.callback('👄 Дышу ртом вместо носа', 'stress_mouth')],
          [Markup.button.callback('🤷 Не замечаю изменений', 'stress_no_change')],
          [Markup.button.callback('🧘 Стараюсь дышать глубже', 'stress_conscious')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      // БЛОК Г: ОПЫТ И ЦЕЛИ
      breathing_experience: {
        id: 'breathing_experience',
        block: 'D',
        text: `🧘 *Ваш опыт с дыхательными практиками:*\n\nЙога, медитация, специальные дыхательные упражнения.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🆕 Никогда не пробовал(а)', 'exp_never')],
          [Markup.button.callback('🔍 Пробовал(а) пару раз, не пошло', 'exp_few_times')],
          [Markup.button.callback('📚 Изучал(а) теорию, но не практиковал(а)', 'exp_theory')],
          [Markup.button.callback('📅 Иногда практикую (несколько раз в месяц)', 'exp_sometimes')],
          [Markup.button.callback('💪 Практикую регулярно (несколько раз в неделю)', 'exp_regularly')],
          [Markup.button.callback('🎯 Опытный практик (ежедневно)', 'exp_expert')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      time_commitment: {
        id: 'time_commitment',
        block: 'D',
        text: `⏰ *Время для дыхательных практик:*\n\nСколько времени готовы уделять ежедневно? Будьте реалистичны!`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('⚡ 3-5 минут (в перерывах, по дороге)', 'time_3-5')],
          [Markup.button.callback('🎯 10-15 минут (утром или вечером)', 'time_10-15')],
          [Markup.button.callback('💎 20-30 минут (полноценная практика)', 'time_20-30')],
          [Markup.button.callback('🏆 30+ минут (глубокое изучение)', 'time_30+')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      format_preferences: {
        id: 'format_preferences',
        block: 'D',
        text: `📱 *Удобные форматы изучения:*\n\nКак вам комфортнее изучать дыхательные техники? Можно выбрать до 4 форматов.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🎥 Видеоуроки с демонстрацией', 'format_video')],
          [Markup.button.callback('🎧 Аудиопрактики с голосом', 'format_audio')],
          [Markup.button.callback('📖 Текст с картинками', 'format_text')],
          [Markup.button.callback('💻 Живые онлайн-занятия', 'format_online')],
          [Markup.button.callback('👨‍⚕️ Индивидуальные консультации', 'format_individual')],
          [Markup.button.callback('📱 Мобильное приложение', 'format_app')],
          [Markup.button.callback('✅ Завершить выбор', 'format_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'multiple_choice',
        minSelections: 1,
        maxSelections: 4,
        note: "Выберите до 4 удобных форматов, затем нажмите '✅ Завершить выбор'",
        allowBack: true
      },

      main_goals: {
        id: 'main_goals',
        block: 'D',
        text: `🎯 *Главные цели на ближайший месяц:*\n\nВыберите максимум 2 самые важные цели.`,
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
          [Markup.button.callback('✅ Завершить выбор', 'goals_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'multiple_choice',
        minSelections: 1,
        maxSelections: 2,
        note: "Выберите максимум 2 цели, затем нажмите '✅ Завершить выбор'",
        allowBack: true
      },

      // БЛОК Д: ДЕТСКИЕ ВОПРОСЫ
      child_age_detail: {
        id: 'child_age_detail',
        block: 'E',
        condition: (userData) => this.isChildFlow(userData),
        text: `👶 *Уточните возраст ребенка:*\n\nВозраст важен для подбора подходящих техник и упражнений.`,
        keyboard: Markup.inlineKeyboard([
          [
            Markup.button.callback('👶 3-4 года', 'child_age_3-4'),
            Markup.button.callback('🧒 5-6 лет', 'child_age_5-6')
          ],
          [
            Markup.button.callback('👦 7-8 лет', 'child_age_7-8'),
            Markup.button.callback('👧 9-10 лет', 'child_age_9-10')
          ],
          [
            Markup.button.callback('🧑 11-12 лет', 'child_age_11-12'),
            Markup.button.callback('👨‍🎓 13-15 лет', 'child_age_13-15')
          ],
          [
            Markup.button.callback('👩‍🎓 16-17 лет', 'child_age_16-17')
          ],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      child_education_status: {
        id: 'child_education_status',
        block: 'E',
        condition: (userData) => this.isChildFlow(userData),
        text: `🎓 *Где учится/воспитывается ребенок?*\n\nОбразовательная среда влияет на стресс и дыхательные привычки.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Дома (не посещает учреждения)', 'edu_home')],
          [Markup.button.callback('🌟 Частный детский сад', 'edu_private_garden')],
          [Markup.button.callback('🏢 Государственный детский сад', 'edu_public_garden')],
          [Markup.button.callback('🎯 Частная школа', 'edu_private_school')],
          [Markup.button.callback('🏫 Государственная школа', 'edu_public_school')],
          [Markup.button.callback('🏆 Гимназия/лицей', 'edu_gymnasium')],
          [Markup.button.callback('💻 Семейное обучение/экстернат', 'edu_homeschool')],
          [Markup.button.callback('🎨 Альтернативные школы (Монтессори, Вальдорф)', 'edu_alternative')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      child_schedule_stress: {
        id: 'child_schedule_stress',
        block: 'E',
        condition: (userData) => this.isChildFlow(userData),
        text: `⏰ *Насколько загружен день ребенка?*\n\nЗагруженность влияет на стресс и потребность в релаксации.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😌 Свободное расписание, много отдыха', 'schedule_relaxed')],
          [Markup.button.callback('🎯 Учеба + 1-2 секции/кружка', 'schedule_moderate')],
          [Markup.button.callback('⚡ Учеба + 3-4 дополнительных занятия', 'schedule_busy')],
          [Markup.button.callback('🔥 Очень загружен: учеба + много секций', 'schedule_overloaded')],
          [Markup.button.callback('📚 Интенсивная подготовка (экзамены, олимпиады)', 'schedule_intensive')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      child_problems_detailed: {
        id: 'child_problems_detailed',
        block: 'E',
        condition: (userData) => this.isChildFlow(userData),
        text: `🎭 *Что беспокоит в поведении или состоянии ребенка?*\n\nВыберите до 3 наиболее важных проблем для точного подбора техник.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('😭 Частые истерики, капризы', 'child_prob_tantrums')],
          [Markup.button.callback('😴 Проблемы с засыпанием', 'child_prob_sleep_issues')],
          [Markup.button.callback('🌙 Беспокойный сон, кошмары', 'child_prob_nightmares')],
          [Markup.button.callback('⚡ Гиперактивность, не может усидеть', 'child_prob_hyperactive')],
          [Markup.button.callback('😰 Тревожность, страхи', 'child_prob_anxiety')],
          [Markup.button.callback('👪 Боится разлуки с родителями', 'child_prob_separation')],
          [Markup.button.callback('📚 Проблемы с концентрацией в учебе', 'child_prob_focus')],
          [Markup.button.callback('👥 Сложности в общении со сверстниками', 'child_prob_social')],
          [Markup.button.callback('😤 Агрессивное поведение', 'child_prob_aggression')],
          [Markup.button.callback('🤧 Частые простуды, слабый иммунитет', 'child_prob_immunity')],
          [Markup.button.callback('🫁 Астма или проблемы с дыханием', 'child_prob_breathing')],
          [Markup.button.callback('💚 В целом здоров, профилактика', 'child_prob_prevention')],
          [Markup.button.callback('✅ Завершить выбор', 'child_prob_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'multiple_choice',
        minSelections: 1,
        maxSelections: 3,
        note: "Выберите до 3 наиболее важных проблем, затем нажмите '✅ Завершить выбор'",
        allowBack: true
      },

      child_parent_involvement: {
        id: 'child_parent_involvement',
        block: 'E',
        condition: (userData) => this.isChildFlow(userData),
        text: `👨‍👩‍👧‍👦 *Кто будет заниматься с ребенком дыхательными практиками?*\n\nЭто поможет адаптировать программу под ваши возможности.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('👩 Только мама', 'parent_mother')],
          [Markup.button.callback('👨 Только папа', 'parent_father')],
          [Markup.button.callback('👨‍👩‍👧‍👦 Оба родителя по очереди', 'parent_both')],
          [Markup.button.callback('👵 Бабушка/дедушка', 'parent_grandparent')],
          [Markup.button.callback('🎯 Ребенок самостоятельно (с контролем)', 'parent_independent')],
          [Markup.button.callback('👨‍🏫 Планируем групповые занятия', 'parent_group')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      child_motivation_approach: {
        id: 'child_motivation_approach',
        block: 'E',
        condition: (userData) => this.isChildFlow(userData),
        text: `🎯 *Как лучше мотивировать вашего ребенка?*\n\nПонимание мотивации поможет сделать практики увлекательными.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🎮 Игровая форма, сказки', 'motivation_games')],
          [Markup.button.callback('🏆 Система наград и достижений', 'motivation_rewards')],
          [Markup.button.callback('👨‍👩‍👧‍👦 Совместные занятия с родителями', 'motivation_family')],
          [Markup.button.callback('📱 Интерактивные приложения', 'motivation_digital')],
          [Markup.button.callback('🎨 Творческие задания', 'motivation_creative')],
          [Markup.button.callback('📚 Объяснение пользы "по-взрослому"', 'motivation_explanation')],
          [Markup.button.callback('👥 Занятия в группе со сверстниками', 'motivation_peer')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      child_time_availability: {
        id: 'child_time_availability',
        block: 'E',
        condition: (userData) => this.isChildFlow(userData),
        text: `⏰ *Когда удобнее заниматься дыхательными упражнениями?*\n\nВремя занятий влияет на эффективность и регулярность.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🌅 Утром перед садом/школой (5-10 мин)', 'time_morning')],
          [Markup.button.callback('🎒 После садика/школы (10-15 мин)', 'time_after_school')],
          [Markup.button.callback('🍽️ После обеда/полдника', 'time_afternoon')],
          [Markup.button.callback('🌆 Вечером перед сном (успокаивающие)', 'time_evening')],
          [Markup.button.callback('📚 Во время выполнения домашних заданий', 'time_homework')],
          [Markup.button.callback('🎯 В моменты стресса/капризов', 'time_stress_moments')],
          [Markup.button.callback('🏖️ В выходные дни (больше времени)', 'time_weekends')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'single_choice',
        allowBack: true
      },

      // БЛОК Е: АДАПТИВНЫЕ ВОПРОСЫ ДЛЯ ВЗРОСЛЫХ
      
      // НОВЫЙ ВОПРОС: Хронические заболевания (показывается всем взрослым)
      chronic_conditions: {
        id: 'chronic_conditions',
        block: 'F',
        condition: (userData) => !this.isChildFlow(userData),
        text: `🏥 *Есть ли у вас хронические заболевания?*\n\nЭто важно для безопасного подбора дыхательных техник. Вся информация конфиденциальна.\n\nВыберите все подходящие варианты:`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🫁 Астма/бронхит/ХОБЛ', 'condition_respiratory')],
          [Markup.button.callback('💔 Гипертония/аритмия', 'condition_cardiovascular')],
          [Markup.button.callback('🩸 Диабет 1 или 2 типа', 'condition_diabetes')],
          [Markup.button.callback('🦴 Остеохондроз/грыжи', 'condition_spine')],
          [Markup.button.callback('🧠 Мигрени/головные боли', 'condition_headaches')],
          [Markup.button.callback('😰 Панические атаки/ВСД', 'condition_panic')],
          [Markup.button.callback('🔥 Заболевания щитовидной железы', 'condition_thyroid')],
          [Markup.button.callback('🍽️ Гастрит/язва/рефлюкс', 'condition_digestive')],
          [Markup.button.callback('💚 Нет хронических заболеваний', 'condition_none')],
          [Markup.button.callback('✅ Завершить выбор', 'condition_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: true,
        type: 'multiple_choice',
        minSelections: 1,
        note: "⚠️ Дыхательные практики дополняют, но не заменяют лечение!",
        allowBack: true
      },

      // НОВЫЙ АДАПТИВНЫЙ ВОПРОС 1: Медикаменты
      current_medications: {
        id: 'current_medications',
        block: 'F',
        condition: (userData) => !this.isChildFlow(userData) && 
          userData.chronic_conditions && 
          userData.chronic_conditions.length > 0 && 
          !userData.chronic_conditions.includes('none'),
        text: `💊 *Принимаете ли вы регулярно медикаменты?*\n\nНекоторые препараты могут влиять на дыхание и требуют адаптации техник.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💊 Да, от давления', 'meds_pressure')],
          [Markup.button.callback('🫁 Да, ингаляторы/от астмы', 'meds_respiratory')],
          [Markup.button.callback('🧠 Да, успокоительные/антидепрессанты', 'meds_mental')],
          [Markup.button.callback('💉 Да, инсулин/от диабета', 'meds_diabetes')],
          [Markup.button.callback('🔥 Да, гормональные препараты', 'meds_hormonal')],
          [Markup.button.callback('💊 Да, другие препараты', 'meds_other')],
          [Markup.button.callback('❌ Не принимаю регулярно', 'meds_none')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: false,
        type: 'single_choice',
        allowBack: true
      },

      // НОВЫЙ АДАПТИВНЫЙ ВОПРОС 2: Панические атаки
      panic_experience: {
        id: 'panic_experience',
        block: 'F',
        condition: (userData) => !this.isChildFlow(userData) && (
          userData.stress_level >= 7 ||
          userData.current_problems?.includes('anxiety') ||
          userData.priority_problem === 'anxiety' ||
          userData.chronic_conditions?.includes('panic')
        ),
        text: `😰 *Были ли у вас панические атаки?*\n\nЭто поможет подобрать специальные успокаивающие техники дыхания.`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('🚨 Да, регулярно (раз в неделю и чаще)', 'panic_regular')],
          [Markup.button.callback('😟 Да, иногда (раз в месяц)', 'panic_sometimes')],
          [Markup.button.callback('😔 Да, редко (несколько раз в год)', 'panic_rarely')],
          [Markup.button.callback('🤔 Были раньше, сейчас нет', 'panic_past')],
          [Markup.button.callback('✅ Нет, не было', 'panic_never')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: false,
        type: 'single_choice',
        allowBack: true
      },

      // НОВЫЙ АДАПТИВНЫЙ ВОПРОС 3: Рабочая среда
      work_environment: {
        id: 'work_environment',
        block: 'F',
        condition: (userData) => !this.isChildFlow(userData) && 
          ['office_work', 'home_work', 'management'].includes(userData.occupation),
        text: `💼 *Особенности вашей работы:*\n\nЭто поможет подобрать техники для рабочего дня.\n\nВыберите все подходящие варианты:`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('💻 Работаю за компьютером 8+ часов', 'work_computer')],
          [Markup.button.callback('📞 Много разговариваю/переговоры', 'work_talking')],
          [Markup.button.callback('✈️ Частые перелеты/командировки', 'work_travel')],
          [Markup.button.callback('🏢 Работа в душном помещении', 'work_stuffy')],
          [Markup.button.callback('⏰ Ненормированный график', 'work_irregular')],
          [Markup.button.callback('🌙 Ночные смены', 'work_night')],
          [Markup.button.callback('👥 Постоянный стресс от общения', 'work_social_stress')],
          [Markup.button.callback('✅ Завершить выбор', 'work_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: false,
        type: 'multiple_choice',
        maxSelections: 5,
        note: "Выберите до 5 наиболее важных особенностей",
        allowBack: true
      },

      // Существующий адаптивный вопрос о весе
      weight_goals: {
        id: 'weight_goals',
        block: 'F',
        condition: (userData) => !this.isChildFlow(userData) && userData.main_goals && userData.main_goals.includes('goal_weight'),
        text: `⚖️ *Цели по снижению веса:*\n\nРасскажите подробнее о ваших целях:`,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('📏 Нужно сбросить до 5 кг', 'weight_5kg')],
          [Markup.button.callback('📐 Нужно сбросить 5-15 кг', 'weight_15kg')],
          [Markup.button.callback('📊 Нужно сбросить более 15 кг', 'weight_more15')],
          [Markup.button.callback('🍽️ Проблемы с аппетитом (переедание)', 'weight_appetite')],
          [Markup.button.callback('🐌 Медленный обмен веществ', 'weight_metabolism')],
          [Markup.button.callback('😰 Заедаю стресс', 'weight_stress_eating')],
          [Markup.button.callback('🥗 Хочу поддержать диету дыханием', 'weight_diet_support')],
          [Markup.button.callback('🧘 Интересуют дыхательные методики для фигуры', 'weight_breathing_methods')],
          [Markup.button.callback('✅ Завершить выбор', 'weight_done')],
          [Markup.button.callback('⬅️ Назад', 'nav_back')]
        ]),
        required: false,
        type: 'multiple_choice',
        allowBack: true
      }
    };
  }

  // Вспомогательные методы для определения типа потока
  isChildFlow(userData) {
    const ageGroup = userData?.age_group;
    console.log(`🔍 Проверка childFlow с age_group: ${ageGroup}`);
    if (!ageGroup) return false;
    return ageGroup === 'for_child';
  }

  // Метод для получения переводов выбранных элементов
  getSelectionDisplayText(selections, translationCategory = 'default') {
    if (!selections || selections.length === 0) return '';
    
    const translations = config.TRANSLATIONS;
    return selections.map(selection => {
      return translations[selection] || selection;
    }).join(', ');
  }

  initializeFlowLogic() {
    return {
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
      childFlow: [
        'child_age_detail',
        'child_education_status',
        'child_schedule_stress',
        'child_problems_detailed',
        'child_parent_involvement',
        'child_motivation_approach',
        'child_time_availability'
      ],
      adaptiveQuestions: [
        'chronic_conditions',     // показывается всем взрослым
        'current_medications',    // новый - при наличии хронических заболеваний
        'panic_experience',       // новый - при высоком стрессе или тревожности
        'work_environment',       // новый - для офисных работников
        'weight_goals'           // существующий - при цели похудения
      ]
    };
  }

  // МЕТОДЫ НАВИГАЦИИ
  getPreviousQuestion(currentQuestion, userData) {
    const { standardFlow, childFlow, adaptiveQuestions } = this.flowLogic;

    if (standardFlow.includes(currentQuestion)) {
      const currentIndex = standardFlow.indexOf(currentQuestion);
      if (currentIndex > 0) {
        return standardFlow[currentIndex - 1];
      }
      return null;
    }

    if (childFlow.includes(currentQuestion)) {
      const currentIndex = childFlow.indexOf(currentQuestion);
      if (currentIndex > 0) {
        return childFlow[currentIndex - 1];
      } else {
        return 'age_group';
      }
    }

    if (adaptiveQuestions.includes(currentQuestion)) {
      const prevAdaptive = this.getPreviousAdaptiveQuestion(currentQuestion, userData);
      if (prevAdaptive) {
        return prevAdaptive;
      } else {
        if (this.isChildFlow(userData)) {
          return childFlow[childFlow.length - 1];
        } else {
          return standardFlow[standardFlow.length - 1];
        }
      }
    }

    return null;
  }

  getPreviousAdaptiveQuestion(currentQuestion, userData) {
    const { adaptiveQuestions } = this.flowLogic;
    const currentIndex = adaptiveQuestions.indexOf(currentQuestion);

    for (let i = currentIndex - 1; i >= 0; i--) {
      const questionId = adaptiveQuestions[i];
      const question = this.questions[questionId];
      if (question.condition && question.condition(userData)) {
        return questionId;
      }
    }
    return null;
  }

  getNextQuestion(currentQuestion, userData) {
    const { standardFlow, childFlow, adaptiveQuestions } = this.flowLogic;

    if (currentQuestion === 'age_group') {
      if (this.isChildFlow(userData)) {
        return childFlow[0];
      }
      return standardFlow[1];
    }

    if (standardFlow.includes(currentQuestion)) {
      const currentIndex = standardFlow.indexOf(currentQuestion);
      if (currentIndex < standardFlow.length - 1) {
        return standardFlow[currentIndex + 1];
      }
      if (!this.isChildFlow(userData)) {
        return this.getFirstAdaptiveQuestion(userData);
      }
      return null;
    }

    if (childFlow.includes(currentQuestion)) {
      const currentIndex = childFlow.indexOf(currentQuestion);
      if (currentIndex < childFlow.length - 1) {
        return childFlow[currentIndex + 1];
      }
      return null;
    }

    if (adaptiveQuestions.includes(currentQuestion)) {
      return this.getNextAdaptiveQuestion(currentQuestion, userData);
    }

    return null;
  }

  getFirstAdaptiveQuestion(userData) {
    for (const questionId of this.flowLogic.adaptiveQuestions) {
      const question = this.questions[questionId];
      if (!question.condition || question.condition(userData)) {
        return questionId;
      }
    }
    return null;
  }

  getNextAdaptiveQuestion(currentQuestion, userData) {
    const { adaptiveQuestions } = this.flowLogic;
    const currentIndex = adaptiveQuestions.indexOf(currentQuestion);

    for (let i = currentIndex + 1; i < adaptiveQuestions.length; i++) {
      const questionId = adaptiveQuestions[i];
      const question = this.questions[questionId];
      if (!question.condition || question.condition(userData)) {
        return questionId;
      }
    }
    return null;
  }

  shouldShowQuestion(questionId, userData) {
    const question = this.questions[questionId];
    if (!question) {
      return false;
    }

    if (!question.condition) {
      return true;
    }

    return question.condition(userData);
  }

  getQuestion(questionId) {
    return this.questions[questionId];
  }

  // ВАЛИДАЦИЯ С ПОДДЕРЖКОЙ ОГРАНИЧЕНИЙ
 getQuestion(questionId) {
    return this.questions[questionId];
  }

  improvedValidateStressLevel(questionId, answer) {
    if (questionId !== 'stress_level') return { valid: true };

    const num = Number(String(answer).replace('stress_', ''));

    if (isNaN(num) || num < 1 || num > 10) {
      return {
        valid: false,
        error: 'Пожалуйста, выберите уровень стресса от 1 до 10'
      };
    }

    return { valid: true };
  }
    
  validateAnswer(questionId, answer, currentSelections = []) {
    const question = this.questions[questionId];
    if (!question) {
      return { valid: false, error: 'Неизвестный вопрос' };
    }

    // Проверяем stress_level с помощью улучшенной валидации
    if (questionId === 'stress_level') {
      const stressValidation = this.improvedValidateStressLevel(questionId, answer);
      if (!stressValidation.valid) {
        return stressValidation;
      }
      return stressValidation;
    }

    switch (question.type) {
      case 'single_choice':
      case 'scale':
        const isValid = typeof answer === 'string' && answer.length > 0;
        return {
          valid: isValid,
          error: isValid ? null : 'Выберите один из вариантов'
        };

      case 'multiple_choice':
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
          const questionLimits = {
            'current_problems': 'Можно выбрать максимум 3 проблемы',
            'child_problems_detailed': 'Можно выбрать максимум 3 проблемы',
            'format_preferences': 'Можно выбрать максимум 4 формата',
            'main_goals': 'Можно выбрать максимум 2 цели',
            'work_environment': 'Можно выбрать максимум 5 особенностей'
          };
          return {
            valid: false,
            error: questionLimits[questionId] || `Можно выбрать максимум ${question.maxSelections} вариант(ов)`
          };
        }

        return { valid: true };

      default:
        return { valid: true };
    }
  }

  getProgress(completedQuestions, userData) {
    const totalQuestions = this.getTotalQuestions(userData);
    const completed = completedQuestions.length;
    const percentage = Math.round((completed / totalQuestions) * 100);

    return {
      completed,
      total: totalQuestions,
      percentage
    };
  }

  getTotalQuestions(userData) {
    let total = this.flowLogic.standardFlow.length;

    if (this.isChildFlow(userData)) {
      total += this.flowLogic.childFlow.length;
    } else {
      // Для взрослых считаем адаптивные вопросы
      for (const questionId of this.flowLogic.adaptiveQuestions) {
        if (this.shouldShowQuestion(questionId, userData)) {
          total++;
        }
      }
    }

    return total;
  }

  // РАСШИРЕННЫЙ МАППИНГ С НОВЫМИ ЗНАЧЕНИЯМИ
  mapCallbackToValue(callbackData) {
    const mapping = {
      // Возрастные группы
      'age_18-30': '18-30',
      'age_31-45': '31-45',
      'age_46-60': '46-60',
      'age_60+': '60+',
      'age_for_child': 'for_child',

      // Профессии
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

      // Текущие проблемы
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

      // Уровень стресса (1-10)
      'stress_1': 1, 'stress_2': 2, 'stress_3': 3, 'stress_4': 4, 'stress_5': 5,
      'stress_6': 6, 'stress_7': 7, 'stress_8': 8, 'stress_9': 9, 'stress_10': 10,

      // Качество сна (1-10)
      'sleep_1': 1, 'sleep_2': 2, 'sleep_3': 3, 'sleep_4': 4, 'sleep_5': 5,
      'sleep_6': 6, 'sleep_7': 7, 'sleep_8': 8, 'sleep_9': 9, 'sleep_10': 10,

      // Приоритетные проблемы
      'prio_stress': 'chronic_stress',
      'prio_sleep': 'insomnia',
      'prio_breathing': 'breathing_issues',
      'prio_pressure': 'high_pressure',
      'prio_anxiety': 'anxiety',
      'prio_fatigue': 'fatigue',
      'prio_focus': 'concentration_issues',

      // Методы дыхания
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

      // Опыт с дыхательными практиками
      'exp_never': 'never',
      'exp_few_times': 'few_times',
      'exp_theory': 'theory_only',
      'exp_sometimes': 'sometimes',
      'exp_regularly': 'regularly',
      'exp_expert': 'expert',

      // Время на практики
      'time_3-5': '3-5_minutes',
      'time_10-15': '10-15_minutes',
      'time_20-30': '20-30_minutes',
      'time_30+': '30+_minutes',

      // Форматы изучения
      'format_video': 'video',
      'format_audio': 'audio',
      'format_text': 'text',
      'format_online': 'online_live',
      'format_individual': 'individual',
      'format_app': 'mobile_app',

      // Основные цели
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

      // Детские вопросы - возраст
      'child_age_3-4': '3-4',
      'child_age_5-6': '5-6',
      'child_age_7-8': '7-8',
      'child_age_9-10': '9-10',
      'child_age_11-12': '11-12',
      'child_age_13-15': '13-15',
      'child_age_16-17': '16-17',

      // Детские вопросы - образование
      'edu_home': 'home_only',
      'edu_private_garden': 'private_kindergarten',
      'edu_public_garden': 'public_kindergarten',
      'edu_private_school': 'private_school',
      'edu_public_school': 'public_school',
      'edu_gymnasium': 'gymnasium',
      'edu_homeschool': 'homeschooling',
      'edu_alternative': 'alternative_school',

      // Детские вопросы - расписание
      'schedule_relaxed': 'relaxed',
      'schedule_moderate': 'moderate',
      'schedule_busy': 'busy',
      'schedule_overloaded': 'overloaded',
      'schedule_intensive': 'intensive',

      // Детские проблемы
      'child_prob_tantrums': 'tantrums',
      'child_prob_sleep_issues': 'sleep_problems',
      'child_prob_nightmares': 'nightmares',
      'child_prob_hyperactive': 'hyperactivity',
      'child_prob_anxiety': 'anxiety',
      'child_prob_separation': 'separation_anxiety',
      'child_prob_focus': 'concentration_issues',
      'child_prob_social': 'social_difficulties',
      'child_prob_aggression': 'aggression',
      'child_prob_immunity': 'weak_immunity',
      'child_prob_breathing': 'breathing_issues',
      'child_prob_prevention': 'prevention',

      // Детские вопросы - участие родителей
      'parent_mother': 'mother',
      'parent_father': 'father',
      'parent_both': 'both_parents',
      'parent_grandparent': 'grandparent',
      'parent_independent': 'child_independent',
      'parent_group': 'group_sessions',

      // Детские вопросы - мотивация
      'motivation_games': 'games_stories',
      'motivation_rewards': 'reward_system',
      'motivation_family': 'family_activities',
      'motivation_digital': 'digital_interactive',
      'motivation_creative': 'creative_tasks',
      'motivation_explanation': 'adult_explanation',
      'motivation_peer': 'peer_group',

      // Детские вопросы - время
      'time_morning': 'morning_routine',
      'time_after_school': 'after_school',
      'time_afternoon': 'afternoon',
      'time_evening': 'before_sleep',
      'time_homework': 'during_homework',
      'time_stress_moments': 'stress_situations',
      'time_weekends': 'weekends',

      // НОВЫЕ: Хронические заболевания
      'condition_respiratory': 'respiratory_diseases',
      'condition_cardiovascular': 'cardiovascular_diseases',
      'condition_diabetes': 'diabetes',
      'condition_spine': 'spine_problems',
      'condition_headaches': 'chronic_headaches',
      'condition_panic': 'panic_disorder',
      'condition_thyroid': 'thyroid_diseases',
      'condition_digestive': 'digestive_diseases',
      'condition_none': 'none',
      
      // === УРОВЕНЬ СТРЕССА (ОБЯЗАТЕЛЬНО!) ===
      'stress_1': 1,
      'stress_2': 2,
      'stress_3': 3,
      'stress_4': 4,
      'stress_5': 5,
      'stress_6': 6,
      'stress_7': 7,
      'stress_8': 8,
      'stress_9': 9,
      'stress_10': 10,
      
      // НОВЫЕ: Медикаменты
      'meds_pressure': 'pressure_medications',
      'meds_respiratory': 'respiratory_medications',
      'meds_mental': 'mental_medications',
      'meds_diabetes': 'diabetes_medications',
      'meds_hormonal': 'hormonal_medications',
      'meds_other': 'other_medications',
      'meds_none': 'no_medications',

      // НОВЫЕ: Панические атаки
      'panic_regular': 'panic_regular',
      'panic_sometimes': 'panic_sometimes',
      'panic_rarely': 'panic_rarely',
      'panic_past': 'panic_past',
      'panic_never': 'panic_never',

      // НОВЫЕ: Рабочая среда
      'work_computer': 'long_computer_work',
      'work_talking': 'frequent_talking',
      'work_travel': 'frequent_travel',
      'work_stuffy': 'stuffy_environment',
      'work_irregular': 'irregular_schedule',
      'work_night': 'night_shifts',
      'work_social_stress': 'social_stress',

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

  getAllQuestions() {
    return Object.keys(this.questions);
  }

  isSurveyComplete(completedQuestions, userData) {
    const totalQuestions = this.getTotalQuestions(userData);
    return completedQuestions.length >= totalQuestions;
  }

  exportConfig() {
    return {
      totalQuestions: Object.keys(this.questions).length,
      standardFlowLength: this.flowLogic.standardFlow.length,
      childFlowLength: this.flowLogic.childFlow.length,
      adaptiveQuestionsCount: this.flowLogic.adaptiveQuestions.length,
      navigationSupport: true,
      childFlowSupport: true,
      multipleChoiceLimits: {
        currentProblems: 3,
        childProblems: 3,
        formats: 4,
        goals: 2,
        workEnvironment: 5
      },
      version: '3.0.0', // Обновлена версия
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = ExtendedSurveyQuestions;
