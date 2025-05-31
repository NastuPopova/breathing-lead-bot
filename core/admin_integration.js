// Файл: core/admin_integration.js - ИСПРАВЛЕННАЯ ВЕРСИЯ с модульной архитектурой
// Координирует работу всех админ-модулей

const AdminHandlers = require('../modules/admin/admin_handlers');
const AdminCallbacks = require('../modules/admin/admin_callbacks');
const config = require('../config');

class AdminIntegration {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    this.adminId = config.ADMIN_ID;
    
    // Получаем ссылки на существующие модули
    this.adminNotifications = botInstance.adminNotifications;
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
      errors: 0
    };
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====

  initialize() {
    console.log('🎛️ Инициализация модульной админ-панели...');
    
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
      console.log('✅ Модульная админ-панель готова к работе');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации админ-панели:', error);
      this.integrationStats.errors++;
      this.sendEmergencyAlert('system_error', 'Ошибка инициализации админ-панели', { error: error.message });
    }
  }

  createAdminModules() {
    console.log('📦 Создание админ-модулей...');
    
    // Создаем обработчик команд
    this.adminHandlers = new AdminHandlers(
      this.bot,
      this.adminNotifications,
      this.verseAnalysis,
      this.leadTransfer,
      this.pdfManager
    );
    console.log('✅ AdminHandlers создан');
    
    // Создаем обработчик callback'ов
    this.adminCallbacks = new AdminCallbacks(
      this.adminHandlers,
      this.adminNotifications,
      this.verseAnalysis,
      this.leadTransfer
    );
    console.log('✅ AdminCallbacks создан');
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
      checks: {}
    };

    try {
      // Проверка интеграции
      results.checks.admin_integration = {
        status: this.integrationStats.initialized ? 'OK' : 'ERROR',
        message: `Интеграция ${this.integrationStats.initialized ? 'активна' : 'не инициализирована'}`
      };

      // Проверка модулей
      results.checks.admin_modules = {
        status: (this.adminHandlers && this.adminCallbacks) ? 'OK' : 'ERROR',
        message: `Handlers: ${!!this.adminHandlers}, Callbacks: ${!!this.adminCallbacks}`
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
      integrations: {
        main_bot: !!config.MAIN_BOT_API_URL,
        crm: !!config.CRM_WEBHOOK_URL,
        database: !!config.DATABASE_URL
      },
      admin_modules: {
        handlers: !!this.adminHandlers,
        callbacks: !!this.adminCallbacks,
        notifications: !!this.adminNotifications
      }
    };
  }

  // ===== СТАТИСТИКА И АНАЛИТИКА =====

  getExtendedStats() {
    const baseStats = this.adminNotifications?.getStats() || {};
    const handlerStats = this.adminHandlers?.getCommandStats() || {};
    const callbackStats = this.adminCallbacks?.getCallbackStats() || {};

    return {
      ...baseStats,
      admin_integration: this.integrationStats,
      admin_handlers: handlerStats,
      admin_callbacks: callbackStats,
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
    console.log('⏰ Запуск планировщика админ-задач...');
    
    // Ежечасная проверка системы
    setInterval(async () => {
      try {
        const diagnostics = await this.runDiagnostics();
        if (diagnostics.overall_status === 'ERROR') {
          await this.sendEmergencyAlert('system_error', 'Обнаружены критические ошибки системы', diagnostics);
        }
      } catch (error) {
        console.error('❌ Ошибка планировщика диагностики:', error);
      }
    }, 3600000); // Каждый час

    // Еженедельная очистка данных
    setInterval(async () => {
      try {
        const cleanupResult = await this.cleanupOldData(30);
        console.log('🧹 Еженедельная очистка:', cleanupResult);
      } catch (error) {
        console.error('❌ Ошибка планировщика очистки:', error);
      }
    }, 7 * 24 * 3600000); // Каждую неделю

    // Ежедневная диагностика в 9:00
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        await this.sendDailyReport();
      }
    }, 60000); // Проверяем каждую минуту

    console.log('✅ Планировщик админ-задач запущен');
  }

  async sendDailyReport() {
    if (!this.adminId) return;

    try {
      const stats = this.adminNotifications?.getStats() || {};
      const today = new Date().toLocaleDateString('ru-RU');
      
      let message = `📊 *ЕЖЕДНЕВНЫЙ ОТЧЕТ*\n`;
      message += `📅 ${today}\n\n`;
      
      message += `👥 **Лиды за день:**\n`;
      message += `• Всего: ${stats.daily_stats?.totalLeads || 0}\n`;
      message += `• 🔥 Горячие: ${stats.daily_stats?.hotLeads || 0}\n`;
      message += `• ⭐ Теплые: ${stats.daily_stats?.warmLeads || 0}\n`;
      message += `• ❄️ Холодные: ${stats.daily_stats?.coldLeads || 0}\n\n`;
      
      const totalLeads = stats.daily_stats?.totalLeads || 0;
      const hotLeads = stats.daily_stats?.hotLeads || 0;
      const conversion = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0;
      
      message += `📈 **Эффективность:**\n`;
      message += `• Конверсия в горячие: ${conversion}%\n`;
      message += `• Админ-действий: ${this.integrationStats.totalAdminActions}\n\n`;
      
      message += `🎯 **Следующие действия:**\n`;
      if (hotLeads > 0) {
        message += `• Обработать ${hotLeads} горячих лидов\n`;
      }
      if (totalLeads === 0) {
        message += `• Проанализировать причины отсутствия лидов\n`;
      }
      message += `• Подготовить план на завтра\n\n`;
      
      message += `🕐 Автоматический отчет • ${new Date().toLocaleTimeString('ru-RU')}`;

      await this.telegramBot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Подробная статистика', callback_data: 'admin_stats' }],
            [{ text: '🎛️ Админ-панель', callback_data: 'admin_main' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка отправки ежедневного отчета:', error);
    }
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
      const alertMessage = `${emoji} *ЭКСТРЕННОЕ УВЕДОМЛЕНИЕ*\n\n` +
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
        version: '2.0.0',
        leads_data: this.adminNotifications.leadDataStorage || {},
        integration_stats: this.integrationStats,
        admin_stats: this.getExtendedStats(),
        configuration: {
          admin_id: this.adminId,
          main_bot_url: config.MAIN_BOT_API_URL,
          crm_webhook: config.CRM_WEBHOOK_URL,
          trainer_contact: config.TRAINER_CONTACT
        },
        metadata: {
          total_leads: Object.keys(this.adminNotifications.leadDataStorage || {}).length,
          backup_size: 0,
          created_by: 'admin_integration_v2'
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

      let cleanedCount = 0;
      const leadsData = this.adminNotifications.leadDataStorage || {};

      Object.entries(leadsData).forEach(([userId, leadData]) => {
        const leadDate = new Date(leadData.timestamp || 0);
        if (leadDate < cutoffDate) {
          delete leadsData[userId];
          cleanedCount++;
        }
      });

      console.log(`🧹 Очищено ${cleanedCount} старых записей лидов`);

      return {
        cleaned_count: cleanedCount,
        remaining_count: Object.keys(leadsData).length,
        cutoff_date: cutoffDate.toISOString()
      };

    } catch (error) {
      console.error('❌ Ошибка очистки данных:', error);
      return { error: error.message };
    }
  }

  // ===== ВОССТАНОВЛЕНИЕ И МИГРАЦИЯ =====

  async restoreFromBackup(backupData) {
    try {
      console.log('🔄 Восстановление данных из резервной копии...');

      // Валидация данных резервной копии
      if (!backupData.leads_data || !backupData.timestamp) {
        throw new Error('Неверный формат резервной копии');
      }

      // Восстанавливаем данные лидов
      this.adminNotifications.leadDataStorage = backupData.leads_data;

      console.log(`✅ Восстановлено ${Object.keys(backupData.leads_data).length} лидов`);
      console.log(`📅 Дата резервной копии: ${backupData.timestamp}`);

      return {
        success: true,
        restored_leads: Object.keys(backupData.leads_data).length,
        backup_date: backupData.timestamp
      };

    } catch (error) {
      console.error('❌ Ошибка восстановления:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===== ИНФОРМАЦИЯ О ИНТЕГРАЦИИ =====

  getIntegrationInfo() {
    return {
      name: 'AdminIntegration',
      version: '2.0.0',
      status: this.integrationStats.initialized ? 'active' : 'inactive',
      features: [
        'modular_architecture',
        'command_handlers',
        'callback_handlers',
        'system_diagnostics',
        'automated_scheduling',
        'emergency_alerts',
        'data_backup',
        'cleanup_automation'
      ],
      modules: {
        admin_handlers: !!this.adminHandlers,
        admin_callbacks: !!this.adminCallbacks,
        admin_notifications: !!this.adminNotifications
      },
      statistics: this.integrationStats,
      health_status: 'healthy',
      last_updated: new Date().toISOString()
    };
  }

  exportStats() {
    return {
      integration_info: this.getIntegrationInfo(),
      extended_stats: this.getExtendedStats(),
      system_health: this.getSystemHealthOverview(),
      timestamp: new Date().toISOString()
    };
  }

  // ===== БЕЗОПАСНОЕ ЗАВЕРШЕНИЕ РАБОТЫ =====

  async shutdown() {
    try {
      console.log('🔄 Завершение работы AdminIntegration v2.0...');
      
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
      
      // Отправляем финальное уведомление админу
      if (this.adminId) {
        await this.telegramBot.telegram.sendMessage(
          this.adminId,
          `🔄 *Завершение работы модульной админ-панели*\n\n` +
          `Резервная копия создана\n` +
          `Всего лидов: ${backup.metadata.total_leads}\n` +
          `Админ-действий: ${this.integrationStats.totalAdminActions}\n` +
          `Время работы: ${this.formatUptime(process.uptime())}\n\n` +
          `🕐 ${new Date().toLocaleString('ru-RU')}`,
          { parse_mode: 'Markdown' }
        );
      }
      
      console.log('✅ AdminIntegration v2.0 завершил работу');
      
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

  // Проверка готовности админ-панели
  isReady() {
    return this.integrationStats.initialized && this.adminHandlers && this.adminCallbacks;
  }

  // Получение статуса админ-панели
  getStatus() {
    return {
      ready: this.isReady(),
      admin_id: this.adminId,
      modules_loaded: {
        handlers: !!this.adminHandlers,
        callbacks: !!this.adminCallbacks,
        notifications: !!this.adminNotifications
      },
      total_actions: this.integrationStats.totalAdminActions,
      last_action: this.integrationStats.lastAction,
      errors: this.integrationStats.errors
    };
  }
}

module.exports = AdminIntegration;
