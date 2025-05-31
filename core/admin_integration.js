// Файл: core/admin_integration.js - ОБНОВЛЕННАЯ ВЕРСИЯ для работы с модульными уведомлениями
// Координирует работу всех админ-модулей

const AdminHandlers = require('../modules/admin/admin_handlers');
const AdminCallbacks = require('../modules/admin/admin_callbacks');
// ИСПРАВЛЕНО: Используем новую модульную систему уведомлений
const AdminNotificationSystem = require('../modules/admin/notifications/notification_system');
const config = require('../config');

class AdminIntegration {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    this.adminId = config.ADMIN_ID;
    
    // ИСПРАВЛЕНО: Используем модульную систему уведомлений
    this.adminNotifications = new AdminNotificationSystem(this.bot);
    
    // Получаем ссылки на существующие модули
    this.verseAnalysis = botInstance.verseAnalysis;
    this.leadTransfer = botInstance.leadTransfer;
    this.pdfManager = botInstance.pdfManager;
    
    // Инициализируем админ-модули
    this.adminHandlers = null;
    this.adminCallbacks = null;
    
    // Статистика интеграции
    this.integrationStats = {
      initialized: false,
      startTime: new Date().toISOString(),
      totalAdminActions: 0,
      lastAction: null,
      errors: 0,
      moduleVersion: '3.0.0'
    };
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====

  initialize() {
    console.log('🎛️ Инициализация модульной админ-панели v3.0...');
    
    try {
      // ИСПРАВЛЕНО: Инициализируем leadDataStorage если отсутствует
      if (!this.adminNotifications.leadDataStorage) {
        this.adminNotifications.leadDataStorage = {};
        console.log('⚠️ Инициализировано пустое leadDataStorage');
      }
      
      // Создаем админ-модули
      this.createAdminModules();
      
      // Настраиваем модули
      this.setupAdminModules();
      
      // Запускаем планировщик
      this.startAdminScheduler();
      
      this.integrationStats.initialized = true;
      console.log('✅ Модульная админ-панель v3.0 готова к работе');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации админ-панели:', error);
      this.integrationStats.errors++;
      this.sendEmergencyAlert('system_error', 'Ошибка инициализации админ-панели v3.0', { error: error.message });
    }
  }

  createAdminModules() {
    console.log('📦 Создание админ-модулей v3.0...');
    
    // ИСПРАВЛЕНО: Передаем модульную систему уведомлений
    this.adminHandlers = new AdminHandlers(
      this.bot,
      this.adminNotifications,
      this.verseAnalysis,
      this.leadTransfer,
      this.pdfManager
    );
    console.log('✅ AdminHandlers создан');
    
    // ИСПРАВЛЕНО: Передаем модульную систему уведомлений
    this.adminCallbacks = new AdminCallbacks(
      this.adminHandlers,
      this.adminNotifications,
      this.verseAnalysis,
      this.leadTransfer
    );
    console.log('✅ AdminCallbacks создан');
    
    console.log('✅ Все админ-модули созданы с модульными уведомлениями');
  }

  setupAdminModules() {
    console.log('⚙️ Настройка админ-модулей...');
    
    // Настраиваем команды
    if (this.adminHandlers) {
      this.adminHandlers.setupCommands();
      console.log('✅ Админ-команды настроены');
    }
    
    // Настраиваем callbacks
    if (this.adminCallbacks) {
      this.adminCallbacks.setupCallbacks(this.telegramBot);
      console.log('✅ Админ-callbacks настроены');
    }
  }

  // ===== ОСНОВНОЙ ОБРАБОТЧИК АДМИН-CALLBACK'ОВ =====

  async handleAdminCallback(ctx, callbackData) {
    if (!this.adminId) {
      await ctx.answerCbQuery('Админ-панель не настроена');
      return;
    }

    if (ctx.from.id.toString() !== this.adminId) {
      await ctx.answerCbQuery('🚫 Доступ запрещен');
      return;
    }

    try {
      this.trackAdminAction(callbackData, ctx.from.id);
      
      console.log(`🔍 Admin callback integration: ${callbackData}`);
      
      // ИСПРАВЛЕНО: Передаем обработку в AdminCallbacks
      if (this.adminCallbacks) {
        await this.adminCallbacks.handleCallback(ctx, callbackData);
      } else {
        console.error('❌ AdminCallbacks не инициализирован');
        await ctx.answerCbQuery('Админ-панель временно недоступна');
      }
      
    } catch (error) {
      console.error('❌ Ошибка handleAdminCallback в интеграции:', error);
      this.integrationStats.errors++;
      
      await ctx.answerCbQuery('Произошла ошибка');
      await this.sendEmergencyAlert('admin_error', `Ошибка admin callback: ${error.message}`, {
        callback_data: callbackData,
        user_id: ctx.from.id,
        error_stack: error.stack
      });
    }
  }

  // ===== ОБРАБОТКА АДМИН-КОМАНД =====

  async handleAdminCommand(ctx, commandName) {
    if (!this.adminId) {
      await ctx.reply('Админ-панель не настроена');
      return;
    }

    if (ctx.from.id.toString() !== this.adminId) {
      await ctx.reply('🚫 Доступ запрещен');
      return;
    }

    try {
      this.trackAdminAction(commandName, ctx.from.id);
      
      console.log(`🔍 Admin command integration: ${commandName}`);
      
      // Передаем обработку в AdminHandlers
      if (this.adminHandlers) {
        await this.adminHandlers.handleCommand(ctx, commandName);
      } else {
        console.error('❌ AdminHandlers не инициализирован');
        await ctx.reply('Админ-панель временно недоступна');
      }
      
    } catch (error) {
      console.error('❌ Ошибка handleAdminCommand в интеграции:', error);
      this.integrationStats.errors++;
      
      await ctx.reply('Произошла ошибка при выполнении команды');
      await this.sendEmergencyAlert('admin_error', `Ошибка admin command: ${error.message}`, {
        command: commandName,
        user_id: ctx.from.id,
        error_stack: error.stack
      });
    }
  }

  // ===== ДИАГНОСТИКА И МОНИТОРИНГ =====

  async runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'UNKNOWN',
      version: '3.0.0',
      checks: {}
    };

    try {
      // Проверка интеграции
      results.checks.admin_integration = {
        status: this.integrationStats.initialized ? 'OK' : 'ERROR',
        message: `Интеграция v3.0 ${this.integrationStats.initialized ? 'активна' : 'не инициализирована'}`
      };

      // Проверка модулей
      results.checks.admin_modules = {
        status: (this.adminHandlers && this.adminCallbacks) ? 'OK' : 'ERROR',
        message: `Handlers: ${!!this.adminHandlers}, Callbacks: ${!!this.adminCallbacks}`
      };

      // ИСПРАВЛЕНО: Проверка модульной системы уведомлений
      results.checks.notification_system = {
        status: (this.adminNotifications && this.adminNotifications.templates) ? 'OK' : 'ERROR',
        message: `Модульные уведомления: ${!!this.adminNotifications}, Components: ${!!this.adminNotifications?.templates}`
      };

      // Проверка данных
      const leadsCount = Object.keys(this.adminNotifications.leadDataStorage || {}).length;
      results.checks.data_integrity = {
        status: 'OK',
        message: `Доступ к ${leadsCount} лидам`
      };

      // Проверка конфигурации
      results.checks.configuration = {
        status: this.adminId ? 'OK' : 'WARNING',
        message: this.adminId ? 'ADMIN_ID настроен' : 'ADMIN_ID отсутствует'
      };

      // Проверка памяти
      const memUsage = process.memoryUsage();
      const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      results.checks.memory = {
        status: memoryMB < 500 ? 'OK' : memoryMB < 1000 ? 'WARNING' : 'ERROR',
        message: `Использовано ${memoryMB}MB памяти`
      };

      // НОВОЕ: Проверка аналитики уведомлений
      const analytics = this.adminNotifications.analytics?.getStats();
      results.checks.analytics = {
        status: analytics ? 'OK' : 'WARNING',
        message: analytics ? `Аналитика активна, успешность: ${analytics.performance?.success_rate}` : 'Аналитика недоступна'
      };

      // Определяем общий статус
      const statuses = Object.values(results.checks).map(check => check.status);
      if (statuses.includes('ERROR')) {
        results.overall_status = 'ERROR';
      } else if (statuses.includes('WARNING')) {
        results.overall_status = 'WARNING';
      } else {
        results.overall_status = 'OK';
      }

    } catch (error) {
      results.overall_status = 'ERROR';
      results.error = error.message;
    }

    return results;
  }

  async getSystemHealthOverview() {
    return {
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      admin_panel_status: this.integrationStats.initialized ? 'active' : 'inactive',
      version: '3.0.0',
      integrations: {
        main_bot: !!config.MAIN_BOT_API_URL,
        crm: !!config.CRM_WEBHOOK_URL,
        database: !!config.DATABASE_URL
      },
      admin_modules: {
        handlers: !!this.adminHandlers,
        callbacks: !!this.adminCallbacks,
        notifications: !!this.adminNotifications,
        notification_components: {
          templates: !!this.adminNotifications?.templates,
          handlers: !!this.adminNotifications?.handlers,
          formatters: !!this.adminNotifications?.formatters,
          analytics: !!this.adminNotifications?.analytics
        }
      }
    };
  }

  // ===== СТАТИСТИКА И АНАЛИТИКА =====

  getExtendedStats() {
    const baseStats = this.adminNotifications?.getStats() || {};
    const handlerStats = this.adminHandlers?.getCommandStats() || {};
    const callbackStats = this.adminCallbacks?.getCallbackStats() || {};
    
    // НОВОЕ: Получаем аналитику уведомлений
    const notificationAnalytics = this.adminNotifications?.analytics?.getDetailedAnalytics() || {};

    return {
      ...baseStats,
      admin_integration: this.integrationStats,
      admin_handlers: handlerStats,
      admin_callbacks: callbackStats,
      // НОВОЕ: Добавляем детальную аналитику уведомлений
      notification_analytics: notificationAnalytics,
      system_health: this.getSystemHealthOverview(),
      timestamp: new Date().toISOString()
    };
  }

  trackAdminAction(action, userId) {
    this.integrationStats.totalAdminActions++;
    this.integrationStats.lastAction = {
      action: action,
      user_id: userId,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📊 Admin action tracked: ${action} by ${userId} (total: ${this.integrationStats.totalAdminActions})`);
  }

  // ===== ПЛАНИРОВЩИК И АВТОМАТИЗАЦИЯ =====

  startAdminScheduler() {
    console.log('⏰ Запуск планировщика админ-задач v3.0...');
    
    // Ежечасная проверка системы
    setInterval(async () => {
      try {
        const diagnostics = await this.runDiagnostics();
        if (diagnostics.overall_status === 'ERROR') {
          await this.sendEmergencyAlert('system_error', 'Обнаружены критические ошибки системы v3.0', diagnostics);
        }
      } catch (error) {
        console.error('❌ Ошибка планировщика диагностики:', error);
      }
    }, 3600000); // Каждый час

    // НОВОЕ: Ежедневная отправка сводки в 9:00
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        await this.adminNotifications.sendDailySummary();
      }
    }, 60000); // Проверяем каждую минуту

    // Еженедельная очистка данных
    setInterval(async () => {
      try {
        const cleanupResult = await this.cleanupOldData(30);
        console.log('🧹 Еженедельная очистка:', cleanupResult);
      } catch (error) {
        console.error('❌ Ошибка планировщика очистки:', error);
      }
    }, 7 * 24 * 3600000); // Каждую неделю

    console.log('✅ Планировщик админ-задач v3.0 запущен');
  }

  // ===== ЭКСТРЕННЫЕ УВЕДОМЛЕНИЯ =====

  async sendEmergencyAlert(alertType, message, additionalData = {}) {
    if (!this.adminId) return;

    const alertEmojis = {
      'system_error': '🚨',
      'admin_error': '⚠️',
      'high_load': '⚡',
      'data_corruption': '💥',
      'security_issue': '🛡️',
      'critical_lead': '🔥'
    };

    const emoji = alertEmojis[alertType] || '⚠️';
    
    try {
      const alertMessage = `${emoji} *ЭКСТРЕННОЕ УВЕДОМЛЕНИЕ v3.0*\n\n` +
        `**Тип:** ${alertType}\n` +
        `**Сообщение:** ${message}\n\n` +
        `**Детали:**\n\`\`\`\n${JSON.stringify(additionalData, null, 2)}\n\`\`\`\n\n` +
        `🕐 ${new Date().toLocaleString('ru-RU')}`;

      await this.telegramBot.telegram.sendMessage(this.adminId, alertMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔧 Диагностика', callback_data: 'admin_detailed_diagnostics' },
              { text: '🎛️ Админ-панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка отправки экстренного уведомления:', error);
    }
  }

  // ===== РЕЗЕРВНОЕ КОПИРОВАНИЕ И ОЧИСТКА =====

  async createBackup() {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        leads_data: this.adminNotifications.leadDataStorage || {},
        integration_stats: this.integrationStats,
        admin_stats: this.getExtendedStats(),
        // НОВОЕ: Включаем аналитику уведомлений в бэкап
        notification_analytics: this.adminNotifications.analytics?.exportAllData() || {},
        configuration: {
          admin_id: this.adminId,
          main_bot_url: config.MAIN_BOT_API_URL,
          crm_webhook: config.CRM_WEBHOOK_URL,
          trainer_contact: config.TRAINER_CONTACT
        },
        metadata: {
          total_leads: Object.keys(this.adminNotifications.leadDataStorage || {}).length,
          backup_size: 0,
          created_by: 'admin_integration_v3.0'
        }
      };

      const backupString = JSON.stringify(backup, null, 2);
      backup.metadata.backup_size = Buffer.byteLength(backupString, 'utf8');

      return backup;
    } catch (error) {
      console.error('❌ Ошибка создания резервной копии:', error);
      throw error;
    }
  }

  async cleanupOldData(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Очистка через модульную систему уведомлений
      const cleanupResult = this.adminNotifications.cleanupOldData(daysToKeep);

      console.log(`🧹 Очистка данных v3.0 завершена:`, cleanupResult);

      return cleanupResult;

    } catch (error) {
      console.error('❌ Ошибка очистки данных:', error);
      return { error: error.message };
    }
  }

  // ===== ИНФОРМАЦИЯ О ИНТЕГРАЦИИ =====

  getIntegrationInfo() {
    return {
      name: 'AdminIntegration',
      version: '3.0.0',
      status: this.integrationStats.initialized ? 'active' : 'inactive',
      features: [
        'modular_architecture',
        'notification_system_v3',
        'command_handlers',
        'callback_handlers',
        'system_diagnostics',
        'automated_scheduling',
        'emergency_alerts',
        'data_backup',
        'cleanup_automation',
        'notification_analytics'
      ],
      modules: {
        admin_handlers: !!this.adminHandlers,
        admin_callbacks: !!this.adminCallbacks,
        admin_notifications: !!this.adminNotifications,
        notification_components: {
          templates: !!this.adminNotifications?.templates,
          handlers: !!this.adminNotifications?.handlers,
          formatters: !!this.adminNotifications?.formatters,
          analytics: !!this.adminNotifications?.analytics
        }
      },
      statistics: this.integrationStats,
      health_status: 'healthy',
      last_updated: new Date().toISOString()
    };
  }

  // ===== БЕЗОПАСНОЕ ЗАВЕРШЕНИЕ РАБОТЫ =====

  async shutdown() {
    try {
      console.log('🔄 Завершение работы AdminIntegration v3.0...');
      
      // Создаем резервную копию
      const backup = await this.createBackup();
      console.log('💾 Резервная копия создана');
      
      // Очищаем модули
      if (this.adminHandlers) {
        this.adminHandlers.cleanup();
      }
      
      if (this.adminCallbacks) {
        this.adminCallbacks.cleanup();
      }
      
      // НОВОЕ: Очищаем модульную систему уведомлений
      if (this.adminNotifications?.handlers) {
        this.adminNotifications.handlers.cleanup();
      }
      
      // Отправляем финальное уведомление админу
      if (this.adminId) {
        await this.telegramBot.telegram.sendMessage(
          this.adminId,
          `🔄 *Завершение работы модульной админ-панели v3.0*\n\n` +
          `Резервная копия создана\n` +
          `Всего лидов: ${backup.metadata.total_leads}\n` +
          `Админ-действий: ${this.integrationStats.totalAdminActions}\n` +
          `Время работы: ${this.formatUptime(process.uptime())}\n` +
          `Уведомлений отправлено: ${this.adminNotifications.analytics?.getStats()?.notifications?.totalSent || 0}\n\n` +
          `🕐 ${new Date().toLocaleString('ru-RU')}`,
          { parse_mode: 'Markdown' }
        );
      }
      
      console.log('✅ AdminIntegration v3.0 завершил работу');
      
    } catch (error) {
      console.error('❌ Ошибка при завершении AdminIntegration:', error);
    }
  }

  // ===== УТИЛИТЫ =====

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}д ${remainingHours}ч ${minutes}м`;
    }
    
    return `${hours}ч ${minutes}м ${secs}с`;
  }

  // ===== МЕТОДЫ ДЛЯ ВНЕШНЕГО ИСПОЛЬЗОВАНИЯ =====

  isReady() {
    return this.integrationStats.initialized && this.adminHandlers && this.adminCallbacks && this.adminNotifications;
  }

  getStatus() {
    return {
      ready: this.isReady(),
      version: '3.0.0',
      admin_id: this.adminId,
      modules_loaded: {
        handlers: !!this.adminHandlers,
        callbacks: !!this.adminCallbacks,
        notifications: !!this.adminNotifications,
        notification_analytics: !!this.adminNotifications?.analytics
      },
      total_actions: this.integrationStats.totalAdminActions,
      last_action: this.integrationStats.lastAction,
      errors: this.integrationStats.errors
    };
  }
}

module.exports = AdminIntegration;
