// Файл: core/bot.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const { Telegraf } = require('telegraf');
const config = require('../config');

// Импорт компонентов ядра
const Handlers = require('./handlers');
const Middleware = require('./middleware');
const AdminIntegration = require('./admin_integration'); // НОВОЕ

// Импорт модулей системы
const ExtendedSurveyQuestions = require('../modules/survey/extended_questions');
const BreathingVERSEAnalysis = require('../modules/analysis/verse_analysis');
const LeadTransferSystem = require('../modules/integration/lead_transfer');
const ContentGenerator = require('../modules/bonus/content-generator');
const FileHandler = require('../modules/bonus/file-handler');
// ИСПРАВЛЕНО: Правильный импорт AdminNotificationSystem
const AdminNotificationSystem = require('../modules/admin/notifications/notification_system');

class BreathingLeadBot {
  constructor() {
    console.log('🤖 Инициализация BreathingLeadBot v2.7 с расширенной админ-панелью...');
    
    // Создаем экземпляр Telegraf
    this.bot = new Telegraf(config.LEAD_BOT_TOKEN);
    
    // Инициализируем модули системы
    this.initializeModules();
    
    // Инициализируем компоненты ядра
    this.initializeCore();
    
    // НОВОЕ: Инициализируем админ-панель
    this.initializeAdminPanel();
    
    // Настраиваем бота
    this.setupBot();
    
    console.log('✅ BreathingLeadBot с админ-панелью инициализирован');
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
      
      // PDF модули
      this.contentGenerator = new ContentGenerator();
      this.fileHandler = new FileHandler(this.contentGenerator);
      this.pdfManager = this.fileHandler;
      console.log('✅ ContentGenerator, FileHandler загружены');
      
      // ИСПРАВЛЕНО: Модуль админ-уведомлений с правильным импортом
      this.adminNotifications = new AdminNotificationSystem(this);
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

  // НОВОЕ: Инициализация админ-панели
  initializeAdminPanel() {
    try {
      console.log('🎛️ Инициализация расширенной админ-панели...');
      
      // Создаем интеграцию админ-панели
      this.adminIntegration = new AdminIntegration(this);
      
      // Инициализируем админ-панель
      this.adminIntegration.initialize();
      
      console.log('✅ Расширенная админ-панель готова');
    } catch (error) {
      console.error('❌ Ошибка инициализации админ-панели:', error.message);
      console.warn('⚠️ Бот будет работать без расширенной админ-панели');
      this.adminIntegration = null;
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
      
      // НОВОЕ: Запускаем планировщик админ-задач
      if (this.adminIntegration) {
        this.adminIntegration.startAdminScheduler();
      }
      
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

      // НОВОЕ: Отправляем экстренное уведомление админу
      if (this.adminIntegration) {
        await this.adminIntegration.sendEmergencyAlert(
          'system_error',
          `Критическая ошибка бота: ${err.message}`,
          {
            user_id: ctx.from?.id,
            error_stack: err.stack,
            context: ctx.message?.text || ctx.callbackQuery?.data
          }
        );
      }

      // Пытаемся отправить сообщение об ошибке пользователю
      try {
        await ctx.reply(
          '😔 Произошла техническая ошибка. Попробуйте /start или обратитесь к [Анастасии Поповой](https://t.me/NastuPopova)',
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
      
      // НОВОЕ: Запускаем диагностику перед стартом
      if (this.adminIntegration) {
        const diagnostics = await this.adminIntegration.runDiagnostics();
        console.log(`🔧 Предстартовая диагностика: ${diagnostics.overall_status}`);
        
        if (diagnostics.overall_status === 'ERROR') {
          console.warn('⚠️ Обнаружены проблемы, но запуск продолжается');
        }
      }
      
      // Запускаем polling
      await this.bot.launch();
      
      console.log('✅ Бот запущен и работает!');
      console.log(`📊 Конфигурация: ${config.NODE_ENV || 'development'}`);
      console.log(`🔗 Основной бот: ${config.MAIN_BOT_API_URL ? 'настроен' : 'автономный режим'}`);
      console.log(`👨‍💼 Админ: ${config.ADMIN_ID ? 'настроен' : 'не настроен'}`);
      console.log(`🎛️ Админ-панель: ${this.adminIntegration ? 'активна' : 'отключена'}`);
      
    } catch (error) {
      console.error('💥 Ошибка запуска бота:', error);
      
      // НОВОЕ: Отправляем экстренное уведомление о проблемах запуска
      if (this.adminIntegration) {
        await this.adminIntegration.sendEmergencyAlert(
          'system_error',
          `Ошибка запуска бота: ${error.message}`,
          { error_stack: error.stack }
        );
      }
      
      throw error;
    }
  }

  // Остановка бота
  async stop(reason = 'manual') {
    console.log(`🛑 Остановка бота... (причина: ${reason})`);
    
    try {
      // НОВОЕ: Безопасное завершение работы админ-панели
      if (this.adminIntegration) {
        await this.adminIntegration.shutdown();
      }
      
      // Останавливаем middleware
      if (this.middleware) {
        this.middleware.stop();
      }
      
      // Останавливаем бота
      this.bot.stop(reason);
      
      console.log('✅ Бот остановлен');
      
    } catch (error) {
      console.error('❌ Ошибка при остановке бота:', error);
    }
  }

  // Валидация конфигурации
  validateConfiguration() {
    console.log('🔍 Проверка конфигурации...');
    
    if (!config.LEAD_BOT_TOKEN) {
      throw new Error('Отсутствует обязательный параметр: LEAD_BOT_TOKEN');
    }
    
    if (!config.MAIN_BOT_API_URL) {
      console.log('ℹ️ MAIN_BOT_API_URL не настроен - работаем в автономном режиме');
    }
    
    if (!config.ADMIN_ID) {
      console.warn('⚠️ ADMIN_ID не настроен - админ-панель будет ограничена');
    }
    
    console.log('✅ Конфигурация валидна');
  }

  // НОВОЕ: Получение расширенной информации о боте
  getBotInfo() {
    const baseInfo = {
      name: 'BreathingLeadBot',
      version: '2.7.0',
      status: 'running',
      uptime: process.uptime(),
      configuration: {
        main_bot_connected: !!config.MAIN_BOT_API_URL,
        crm_connected: !!config.CRM_WEBHOOK_URL,
        admin_configured: !!config.ADMIN_ID,
        environment: config.NODE_ENV || 'development',
        standalone_mode: !config.MAIN_BOT_API_URL
      },
      modules: {
        survey_questions: !!this.surveyQuestions,
        verse_analysis: !!this.verseAnalysis,
        lead_transfer: !!this.leadTransfer,
        pdf_manager: !!this.pdfManager,
        admin_notifications: !!this.adminNotifications,
        admin_integration: !!this.adminIntegration
      },
      last_updated: new Date().toISOString()
    };

    // НОВОЕ: Добавляем информацию от админ-интеграции
    if (this.adminIntegration) {
      baseInfo.admin_panel = this.adminIntegration.getIntegrationInfo();
      baseInfo.extended_stats = this.adminIntegration.getExtendedStats();
    }

    return baseInfo;
  }

  // НОВОЕ: Методы для работы с админ-панелью
  async getAdminStats() {
    if (!this.adminIntegration) return null;
    return this.adminIntegration.getExtendedStats();
  }

  async createBackup() {
    if (!this.adminIntegration) return null;
    return this.adminIntegration.createBackup();
  }

  async runDiagnostics() {
    if (!this.adminIntegration) return null;
    return this.adminIntegration.runDiagnostics();
  }

  async cleanupOldData(days) {
    if (!this.adminIntegration) return null;
    return this.adminIntegration.cleanupOldData(days);
  }

  // НОВОЕ: Экстренное уведомление админа
  async sendAdminAlert(type, message, data = {}) {
    if (!this.adminIntegration) return false;
    await this.adminIntegration.sendEmergencyAlert(type, message, data);
    return true;
  }

  // НОВОЕ: Проверка здоровья системы
  async checkHealth() {
    const health = {
      bot_status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      modules_loaded: Object.keys(this.modules || {}).length,
      admin_panel: this.adminIntegration ? 'active' : 'inactive',
      timestamp: new Date().toISOString()
    };

    // Добавляем диагностику если доступна
    if (this.adminIntegration) {
      const diagnostics = await this.adminIntegration.runDiagnostics();
      health.diagnostics = diagnostics;
    }

    return health;
  }

  // НОВОЕ: Метод для доступа к админ-функциям из других модулей
  getAdminPanel() {
    return this.adminIntegration;
  }

  // НОВОЕ: Метод для обновления настроек в runtime
  async updateSettings(newSettings) {
    try {
      console.log('⚙️ Обновление настроек бота...');
      
      // Обновляем настройки уведомлений
      if (this.adminIntegration && newSettings.notifications) {
        this.adminIntegration.adminPanel.notificationSettings = {
          ...this.adminIntegration.adminPanel.notificationSettings,
          ...newSettings.notifications
        };
      }
      
      console.log('✅ Настройки обновлены');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Ошибка обновления настроек:', error);
      return { success: false, error: error.message };
    }
  }

  // НОВОЕ: Получение статистики производительности
  getPerformanceStats() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
      middleware_stats: this.middleware ? this.middleware.getStats() : null,
      admin_stats: this.adminIntegration ? this.adminIntegration.getExtendedStats() : null
    };
  }
}

module.exports = BreathingLeadBot;
