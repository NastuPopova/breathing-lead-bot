// Файл: lead_bot/config.js
// Конфигурация лидогенерирующего бота

require('dotenv').config();

module.exports = {
  // Telegram Bot Configuration
  LEAD_BOT_TOKEN: process.env.LEAD_BOT_TOKEN,
  MAIN_BOT_API_URL: process.env.MAIN_BOT_API_URL || 'https://breathing-practice-bot-production.up.railway.app',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL, // для кэширования сессий
  
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
    savePartialResponses: true
  },
  
  // Lead Scoring Configuration
  SCORING_WEIGHTS: {
    urgency: 0.4,    // 40% - насколько срочно нужна помощь
    readiness: 0.35, // 35% - готовность к покупке  
    fit: 0.25        // 25% - подходит ли наша программа
  },
  
  // Segmentation Thresholds
  SEGMENT_THRESHOLDS: {
    HOT_LEAD: 80,    // 80+ баллов
    WARM_LEAD: 60,   // 60-79 баллов
    COLD_LEAD: 40,   // 40-59 баллов
    NURTURE_LEAD: 0  // менее 40 баллов
  },
  
  // Integrations
  CRM_WEBHOOK_URL: process.env.CRM_WEBHOOK_URL,
  EMAIL_SERVICE_API: process.env.EMAIL_SERVICE_API,
  
  // Railway/Deployment
  PORT: parseInt(process.env.PORT, 10) || 3001,
  APP_URL: process.env.APP_URL || 'https://breathing-lead-bot-production.up.railway.app',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
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

Мы свяжемся с вами в течение 24 часов.`
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
      window: 60 * 1000, // 1 минута
      max: 3 // максимум 3 попытки в минуту
    },
    contact_submission: {
      window: 5 * 60 * 1000, // 5 минут
      max: 1 // одна отправка контактов в 5 минут
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
