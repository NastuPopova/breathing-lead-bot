// Файл: core/bot.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const { Telegraf } = require('telegraf');
const config = require('../config');

// Импорт компонентов ядра
const Handlers = require('./handlers');
const Middleware = require('./middleware');

// Импорт модулей системы
const ExtendedSurveyQuestions = require('../modules/survey/extended_questions');
const BreathingVERSEAnalysis = require('../modules/analysis/verse_analysis');
const LeadTransferSystem = require('../modules/integration/lead_transfer');
const ContentGenerator = require('../modules/bonus/content-generator');
const FileHandler = require('../modules/bonus/file-handler');
const AdminNotificationSystem = require('../modules/admin/notifications');

class BreathingLeadBot {
  constructor() {
    console.log('🤖 Инициализация BreathingLeadBot v2.6...');
    
    // Создаем экземпляр Telegraf
    this.bot = new Telegraf(config.LEAD_BOT_TOKEN);
    
    // Инициализируем модули системы
    this.initializeModules();
    
    // Инициализируем компоненты ядра
    this.initializeCore();
    
    // Настраиваем бота
    this.setupBot();
    
    console.log('✅ BreathingLeadBot инициализирован');
  }

  // Инициализация основных модулей системы
  initializeModules() {
    try {
      console.log('📦 Загрузка модулей системы...');
      
      // Модуль анкетирования
      this.surveyQuestions = new ExtendedSurveyQuestions();
      console.log('✅ ExtendedSurveyQuestions загружен');
      
      // Модуль VERSE-анализа
      this.verseAnalysis = new BreathingVERSEAnalysis();
      console.log('✅ BreathingVERSEAnalysis загружен');
      
      // Модуль передачи лидов
      this.leadTransfer = new LeadTransferSystem();
      console.log('✅ LeadTransferSystem загружен');
      
      // ИСПРАВЛЕНО: Правильная инициализация PDF модулей
      this.contentGenerator = new ContentGenerator();
      this.fileHandler = new FileHandler(this.contentGenerator);
      
      // Создаем простой адаптер pdfManager для обратной совместимости
      this.pdfManager = this.fileHandler;
      
      console.log('✅ ContentGenerator, FileHandler загружены');
      
      // Модуль админ-уведомлений
      this.adminNotifications = new AdminNotificationSystem(this.bot);
      console.log('✅ AdminNotificationSystem загружен');
      
      console.log('✅ Все модули системы загружены');
    } catch (error) {
      console.error('❌ Ошибка загрузки модулей:', error.message);
      console.error('Стек:', error.stack);
      throw error;
    }
  }

  // Инициализация компонентов ядра
  initializeCore() {
    try {
      console.log('🔧 Инициализация компонентов ядра...');
      
      // Middleware для обработки сессий и логирования
      this.middleware = new Middleware(this);
      console.log('✅ Middleware инициализирован');
      
      // Обработчики команд и callback
      this.handlers = new Handlers(this);
      console.log('✅ Handlers инициализированы');
      
      console.log('✅ Компоненты ядра готовы');
    } catch (error) {
      console.error('❌ Ошибка инициализации ядра:', error.message);
      throw error;
    }
  }

  // Настройка бота
  setupBot() {
    try {
      console.log('⚙️ Настройка бота...');
      
      // Настраиваем middleware
      this.middleware.setup();
      
      // Настраиваем обработчики
      this.handlers.setup();
      
      // Настраиваем обработку ошибок
      this.setupErrorHandling();
      
      console.log('✅ Бот настроен');
    } catch (error) {
      console.error('❌ Ошибка настройки бота:', error.message);
      throw error;
    }
  }

  // Настройка обработки ошибок
  setupErrorHandling() {
    this.bot.catch(async (err, ctx) => {
      console.error('💥 Критическая ошибка бота:', {
        error: err.message,
        user_id: ctx.from?.id,
        timestamp: new Date().toISOString()
      });

      // Пытаемся отправить сообщение об ошибке пользователю
      try {
        await ctx.reply(
          '😔 Произошла техническая ошибка. Попробуйте /start или обратитесь к [Анастасии Поповой](https://t.me/breathing_opros_bot)',
          { parse_mode: 'Markdown' }
        );
      } catch (replyError) {
        console.error('❌ Не удалось отправить сообщение об ошибке:', replyError.message);
      }
    });

    // Обработка системных сигналов
    process.once('SIGINT', () => this.stop('SIGINT'));
    process.once('SIGTERM', () => this.stop('SIGTERM'));
  }

  // Запуск бота
  async launch() {
    try {
      console.log('🚀 Запуск бота...');
      
      // Проверяем конфигурацию перед запуском
      this.validateConfiguration();
      
      // Запускаем polling
      await this.bot.launch();
      
      console.log('✅ Бот запущен и работает!');
      console.log(`📊 Конфигурация: ${config.NODE_ENV || 'development'}`);
      console.log(`🔗 Основной бот: ${config.MAIN_BOT_API_URL ? 'настроен' : 'не настроен'}`);
      console.log(`👨‍💼 Админ: ${config.ADMIN_ID ? 'настроен' : 'не настроен'}`);
      
    } catch (error) {
      console.error('💥 Ошибка запуска бота:', error);
      throw error;
    }
  }

  // Остановка бота
  stop(reason = 'manual') {
    console.log(`🛑 Остановка бота...`);
    this.bot.stop(reason);
    console.log('✅ Бот остановлен');
  }

  // Валидация конфигурации
  validateConfiguration() {
    console.log('🔍 Проверка конфигурации...');
    
    if (!config.LEAD_BOT_TOKEN) {
      throw new Error('Отсутствует обязательный параметр: LEAD_BOT_TOKEN');
    }
    
    if (!config.MAIN_BOT_API_URL) {
      console.warn('⚠️ MAIN_BOT_API_URL не настроен - лиды будут сохраняться локально');
    }
    
    if (!config.ADMIN_ID) {
      console.warn('⚠️ ADMIN_ID не настроен - админ-уведомления отключены');
    }
    
    console.log('✅ Конфигурация валидна');
  }

  // Получение информации о боте
  getBotInfo() {
    return {
      name: 'BreathingLeadBot',
      version: '2.6.0',
      status: 'running',
      uptime: process.uptime(),
      configuration: {
        main_bot_connected: !!config.MAIN_BOT_API_URL,
        crm_connected: !!config.CRM_WEBHOOK_URL,
        admin_configured: !!config.ADMIN_ID,
        environment: config.NODE_ENV || 'development'
      },
      modules: {
        survey_questions: !!this.surveyQuestions,
        verse_analysis: !!this.verseAnalysis,
        lead_transfer: !!this.leadTransfer,
        pdf_manager: !!this.pdfManager,
        admin_notifications: !!this.adminNotifications
      },
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = BreathingLeadBot;
