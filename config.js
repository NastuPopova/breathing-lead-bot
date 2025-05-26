// Файл: config.js
// ДОПОЛНЕННАЯ версия с расширенными переводами

require('dotenv').config();

module.exports = {
  // Telegram Bot Configuration
  LEAD_BOT_TOKEN: process.env.LEAD_BOT_TOKEN,
  MAIN_BOT_API_URL: process.env.MAIN_BOT_API_URL || 'https://breathing-practice-bot-production.up.railway.app',
  
  // Контакт тренера для переадресации
  TRAINER_CONTACT: '@NastuPopova',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  
  // Admin Configuration
  ADMIN_ID: process.env.ADMIN_ID,
  
  // Analytics & Monitoring
  ANALYTICS_API_KEY: process.env.ANALYTICS_API_KEY,
  SENTRY_DSN: process.env.SENTRY_DSN,
  
  // Business Logic
  SURVEY_TIMEOUT_MINUTES: parseInt(process.env.SURVEY_TIMEOUT_MINUTES, 10) || 30,
  MAX_RETRIES_PER_QUESTION: parseInt(process.env.MAX_RETRIES_PER_QUESTION, 10) || 3,
  ANALYSIS_DELAY_SECONDS: parseInt(process.env.ANALYSIS_DELAY_SECONDS, 10) || 3,
  
  // Survey Configuration
  SURVEY_CONFIG: {
    maxQuestions: 18,
    timeoutMinutes: parseInt(process.env.SURVEY_TIMEOUT_MINUTES, 10) || 30,
    allowSkip: false,
    savePartialResponses: true,
    maxProblemsSelection: 3,
    maxChildProblemsSelection: 3,
    maxGoalsSelection: 2,
    maxFormatsSelection: 4
  },
  
  // Lead Scoring Configuration
  SCORING_WEIGHTS: {
    urgency: 0.4,
    readiness: 0.35,
    fit: 0.25
  },
  
  // Segmentation Thresholds
  SEGMENT_THRESHOLDS: {
    HOT_LEAD: 80,
    WARM_LEAD: 60,
    COLD_LEAD: 40,
    NURTURE_LEAD: 0
  },
  
  // Integrations
  CRM_WEBHOOK_URL: process.env.CRM_WEBHOOK_URL,
  EMAIL_SERVICE_API: process.env.EMAIL_SERVICE_API,
  
  // Railway/Deployment
  PORT: parseInt(process.env.PORT, 10) || 3001,
  APP_URL: process.env.APP_URL || 'https://breathing-lead-bot-production.up.railway.app',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // РАСШИРЕННЫЕ ПЕРЕВОДЫ для всех компонентов системы
  TRANSLATIONS: {
    // === ОСНОВНЫЕ ПРОБЛЕМЫ ВЗРОСЛЫХ ===
    'chronic_stress': 'Хронический стресс',
    'insomnia': 'Плохой сон, бессонница',
    'breathing_issues': 'Одышка, нехватка воздуха',
    'high_pressure': 'Повышенное давление',
    'headaches': 'Частые головные боли',
    'fatigue': 'Постоянная усталость',
    'anxiety': 'Тревожность, панические атаки',
    'concentration_issues': 'Проблемы с концентрацией',
    'back_pain': 'Боли в шее, плечах, спине',
    'digestion_issues': 'Проблемы с пищеварением',
    'panic_attacks': 'Панические атаки',
    
    // === ДЕТСКИЕ ПРОБЛЕМЫ ===
    'tantrums': 'Частые истерики, капризы',
    'sleep_problems': 'Проблемы с засыпанием',
    'nightmares': 'Беспокойный сон, кошмары',
    'hyperactivity': 'Гиперактивность',
    'separation_anxiety': 'Боится разлуки с родителями',
    'social_difficulties': 'Сложности в общении',
    'aggression': 'Агрессивное поведение',
    'weak_immunity': 'Частые простуды',
    'prevention': 'В целом здоров, профилактика',
    
    // === ВОЗРАСТНЫЕ ГРУППЫ ===
    '18-30': '18-30 лет (молодые взрослые)',
    '31-45': '31-45 лет (активный возраст)', 
    '46-60': '46-60 лет (зрелый возраст)',
    '60+': '60+ лет (старший возраст)',
    'for_child': 'Заполняю для ребенка',
    
    // Детские возрастные группы
    '3-4': '3-4 года (дошкольный возраст)',
    '5-6': '5-6 лет (старший дошкольный)',
    '7-8': '7-8 лет (младший школьный)',
    '9-10': '9-10 лет (младший школьный)',
    '11-12': '11-12 лет (средний школьный)',
    '13-15': '13-15 лет (подростковый)',
    '16-17': '16-17 лет (старший подростковый)',
    
    // === ДЕЯТЕЛЬНОСТЬ ===
    'office_work': 'Офисная работа',
    'home_work': 'Работа дома/фриланс',
    'physical_work': 'Физический труд',
    'student': 'Учеба',
    'maternity_leave': 'В декрете',
    'retired': 'На пенсии',
    'management': 'Руководящая должность',
    
    // === ФИЗИЧЕСКАЯ АКТИВНОСТЬ ===
    'daily': 'Ежедневно',
    'regular': '3-4 раза в неделю',
    'sometimes': '1-2 раза в неделю',
    'rarely': 'Несколько раз в месяц',
    'never': 'Практически не занимаюсь',
    
    // === МЕТОДЫ ДЫХАНИЯ ===
    'nose': 'В основном носом',
    'mouth': 'Часто дышу ртом',
    'mixed': 'Попеременно носом и ртом',
    'unaware': 'Не обращаю внимания на дыхание',
    
    // === ЧАСТОТА ПРОБЛЕМ С ДЫХАНИЕМ ===
    'constantly': 'Постоянно (каждый день)',
    'often': 'Часто (несколько раз в неделю)',
    'rarely': 'Редко (несколько раз в год)',
    
    // === ПОВЕРХНОСТНОЕ ДЫХАНИЕ ===
    'yes_often': 'Да, часто ловлю себя на этом',
    'no': 'Нет, дышу нормально и глубоко',
    
    // === ДЫХАНИЕ В СТРЕССЕ ===
    'rapid_shallow': 'Дыхание учащается, становится поверхностным',
    'breath_holding': 'Начинаю задерживать дыхание',
    'air_shortage': 'Чувствую нехватку воздуха',
    'mouth_breathing': 'Дышу ртом вместо носа',
    'no_change': 'Не замечаю изменений',
    'conscious_breathing': 'Стараюсь дышать глубже',
    
    // === ОПЫТ С ДЫХАТЕЛЬНЫМИ ПРАКТИКАМИ ===
    'few_times': 'Пробовал(а) пару раз, не пошло',
    'theory_only': 'Изучал(а) теорию, но не практиковал(а)',
    'regularly': 'Практикую регулярно (несколько раз в неделю)',
    'expert': 'Опытный практик (ежедневно)',
    
    // === ВРЕМЯ НА ПРАКТИКИ ===
    '3-5_minutes': '3-5 минут (в перерывах, по дороге)',
    '10-15_minutes': '10-15 минут (утром или вечером)',
    '20-30_minutes': '20-30 минут (полноценная практика)',
    '30+_minutes': '30+ минут (глубокое изучение)',
    
    // === ФОРМАТЫ ИЗУЧЕНИЯ ===
    'video': 'Видеоуроки с демонстрацией',
    'audio': 'Аудиопрактики с голосом',
    'text': 'Текст с картинками',
    'online_live': 'Живые онлайн-занятия',
    'individual': 'Индивидуальные консультации',
    'mobile_app': 'Мобильное приложение',
    
    // === ОСНОВНЫЕ ЦЕЛИ ===
    'quick_relaxation': 'Быстро расслабляться в стрессе',
    'stress_resistance': 'Повысить стрессоустойчивость',
    'reduce_anxiety': 'Избавиться от тревожности',
    'improve_sleep': 'Наладить качественный сон',
    'increase_energy': 'Повысить энергию',
    'normalize_pressure': 'Нормализовать давление/пульс',
    'improve_breathing': 'Улучшить работу легких',
    'improve_focus': 'Улучшить концентрацию',
    'weight_management': 'Поддержать процесс похудения',
    'general_health': 'Общее оздоровление',
    
    // === ДЕТСКОЕ ОБРАЗОВАНИЕ ===
    'home_only': 'Домашнее воспитание',
    'private_kindergarten': 'Частный детский сад',
    'public_kindergarten': 'Государственный детский сад',
    'private_school': 'Частная школа',
    'public_school': 'Государственная школа',
    'gymnasium': 'Гимназия/лицей',
    'homeschooling': 'Семейное обучение',
    'alternative_school': 'Альтернативная школа',
    
    // === ДЕТСКОЕ РАСПИСАНИЕ ===
    'relaxed': 'Свободное расписание, много отдыха',
    'moderate': 'Учеба + 1-2 секции/кружка',
    'busy': 'Учеба + 3-4 дополнительных занятия',
    'overloaded': 'Очень загружен: учеба + много секций',
    'intensive': 'Интенсивная подготовка (экзамены, олимпиады)',
    
    // === УЧАСТИЕ РОДИТЕЛЕЙ ===
    'mother': 'Только мама',
    'father': 'Только папа',
    'both_parents': 'Оба родителя по очереди',
    'grandparent': 'Бабушка/дедушка',
    'child_independent': 'Ребенок самостоятельно (с контролем)',
    'group_sessions': 'Планируем групповые занятия',
    
    // === МОТИВАЦИЯ РЕБЕНКА ===
    'games_stories': 'Игровая форма, сказки',
    'reward_system': 'Система наград и достижений',
    'family_activities': 'Совместные занятия с родителями',
    'digital_interactive': 'Интерактивные приложения',
    'creative_tasks': 'Творческие задания',
    'adult_explanation': 'Объяснение пользы "по-взрослому"',
    'peer_group': 'Занятия в группе со сверстниками',
    
    // === ВРЕМЯ ДЕТСКИХ ЗАНЯТИЙ ===
    'morning_routine': 'Утром перед садом/школой (5-10 мин)',
    'after_school': 'После садика/школы (10-15 мин)',
    'afternoon': 'После обеда/полдника',
    'before_sleep': 'Вечером перед сном (успокаивающие)',
    'during_homework': 'Во время выполнения домашних заданий',
    'stress_situations': 'В моменты стресса/капризов',
    'weekends': 'В выходные дни (больше времени)',
    
    // === СЕГМЕНТЫ ЛИДОВ ===
    'HOT_LEAD': 'требует срочного внимания',
    'WARM_LEAD': 'активно мотивирован к изменениям',
    'COLD_LEAD': 'умеренный интерес к практикам', 
    'NURTURE_LEAD': 'долгосрочное развитие',
    
    // === ОБЩИЕ ПРОБЛЕМЫ ===
    'general_wellness': 'общее оздоровление и профилактика',
    
    // === ХРОНИЧЕСКИЕ ЗАБОЛЕВАНИЯ ===
    'asthma': 'Бронхиальная астма',
    'hypertension': 'Гипертония (повышенное давление)',
    'diabetes': 'Сахарный диабет',
    'cardiovascular': 'Сердечно-сосудистые заболевания',
    'autoimmune': 'Аутоиммунные заболевания',
    'mental_health': 'Хронический стресс/депрессия',
    'digestive': 'Заболевания ЖКТ',
    'other_chronic': 'Другое хроническое заболевание',
    'none': 'Нет хронических заболеваний',
    
    // === ЦЕЛИ ПО ВЕСУ ===
    'up_to_5kg': 'Нужно сбросить до 5 кг',
    '5_to_15kg': 'Нужно сбросить 5-15 кг',
    'more_than_15kg': 'Нужно сбросить более 15 кг',
    'appetite_control': 'Проблемы с аппетитом (переедание)',
    'slow_metabolism': 'Медленный обмен веществ',
    'stress_eating': 'Заедаю стресс',
    'diet_support': 'Хочу поддержать диету дыханием',
    'breathing_methods': 'Интересуют дыхательные методики для фигуры'
  },
  
  // Message Templates
  MESSAGES: {
    WELCOME: `🌬️ *Добро пожаловать в диагностику дыхания!*

Пройдите быструю диагностику дыхания (4-5 минут) и получите:

✅ Персональный анализ состояния
✅ Индивидуальные рекомендации  
✅ Бесплатные материалы для практики

Готовы узнать, как улучшить свое дыхание?`,

    ANALYSIS_START: `🧠 *Анализирую ваши ответы...*

Анастасия изучает ваш профиль и подбирает персональные рекомендации.

Это займет несколько секунд...`,

    THANK_YOU: `🙏 *Спасибо за прохождение диагностики!*

Ваши данные переданы Анастасии для подготовки персональной программы.

Мы свяжемся с вами в течение 24 часов.`,

    CONTACT_TRAINER: `📞 *Связаться с тренером*

Для записи на консультацию и получения персональной программы обратитесь к нашему эксперту:

👩‍⚕️ Анастасия Поповна
${module.exports.TRAINER_CONTACT || '@NastuPopova'}

Просто напишите ей в Telegram!`
  },
  
  // Free Materials by Segment
  FREE_MATERIALS: {
    HOT_LEAD: [
      'SOS-техники при панике (PDF)',
      'Аудиогид "Экстренное успокоение" (10 мин)',
      'Чек-лист домашней диагностики',
      'Прямая связь с Анастасией в Telegram'
    ],
    WARM_LEAD: [
      '5 дыхательных техник для офиса (PDF)',
      'Аудиогид "Дыхание для сна" (15 мин)',
      'План практик на 7 дней',
      'Доступ к закрытому каналу'
    ],
    COLD_LEAD: [
      'Основы правильного дыхания (PDF)',
      'Видео "3 простые техники" (5 мин)',
      'Мини-курс в рассылке',
      'Календарь дыхательных практик'
    ],
    NURTURE_LEAD: [
      'Гид "Дыхание и здоровье" (PDF)',
      'Доступ к бесплатным вебинарам',
      'Подписка на полезные статьи',
      'Сообщество единомышленников'
    ]
  },
  
  // Product Recommendations by Issue
  PRODUCT_RECOMMENDATIONS: {
    panic_attacks: {
      urgent: 'individual_emergency',
      standard: 'anti_panic_course'
    },
    chronic_stress: {
      urgent: 'stress_management_intensive', 
      standard: 'starter_pack_plus'
    },
    insomnia: {
      urgent: 'sleep_restoration_program',
      standard: 'evening_practices_course'
    },
    breathing_issues: {
      urgent: 'individual_assessment',
      standard: 'breathing_fundamentals'
    },
    general_wellness: {
      urgent: 'comprehensive_evaluation',
      standard: 'starter_pack'
    }
  },

  // Logging Configuration
  LOGGING: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/bot.log',
    console: process.env.NODE_ENV !== 'production'
  },

  // Rate Limiting
  RATE_LIMITS: {
    survey_start: {
      window: 60 * 1000,
      max: 3
    },
    contact_submission: {
      window: 5 * 60 * 1000,
      max: 1
    }
  },

  // Feature Flags
  FEATURES: {
    enable_analytics: process.env.ENABLE_ANALYTICS === 'true',
    enable_crm_integration: process.env.ENABLE_CRM === 'true',
    enable_admin_commands: process.env.ENABLE_ADMIN === 'true',
    enable_health_checks: process.env.ENABLE_HEALTH_CHECKS !== 'false'
  }
};
