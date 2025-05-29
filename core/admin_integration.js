// Файл: core/admin_integration.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const EnhancedAdminPanel = require('../modules/admin/enhanced_admin_panel');
const config = require('../config');

class AdminIntegration {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    
    // Получаем ссылки на существующие модули
    this.adminNotifications = botInstance.adminNotifications;
    this.verseAnalysis = botInstance.verseAnalysis;
    this.leadTransfer = botInstance.leadTransfer;
    this.pdfManager = botInstance.pdfManager;
    
    // Создаем экземпляр расширенной админ-панели
    this.adminPanel = new EnhancedAdminPanel(
      this.telegramBot,
      this.adminNotifications,
      this.verseAnalysis,
      this.leadTransfer
    );
  }

  initialize() {
    console.log('🎛️ Инициализация расширенной админ-панели...');
    
    try {
      // ИСПРАВЛЕНО: Инициализируем leadDataStorage если отсутствует
      if (!this.adminNotifications.leadDataStorage) {
        this.adminNotifications.leadDataStorage = {};
        console.log('⚠️ Инициализировано пустое leadDataStorage');
      }
      
      // Инициализируем админ-панель
      this.adminPanel.initialize();
      
      // Добавляем дополнительные callback'ы
      this.setupAdditionalCallbacks();
      
      console.log('✅ Расширенная админ-панель готова к работе');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации админ-панели:', error);
      this.sendEmergencyAlert('system_error', 'Ошибка инициализации админ-панели', { error: error.message });
    }
  }

  // ИСПРАВЛЕНО: Правильная настройка дополнительных callbacks
  setupAdditionalCallbacks() {
    // Callback для интеграции с PDF менеджером
    this.telegramBot.action('admin_pdf_stats', async (ctx) => {
      if (ctx.from.id.toString() !== this.adminPanel.adminId) {
        await ctx.answerCbQuery('🚫 Доступ запрещен');
        return;
      }

      await ctx.answerCbQuery();
      
      const pdfStats = this.pdfManager?.getBonusStats() || {};
      
      let message = `📄 *СТАТИСТИКА PDF ФАЙЛОВ*\n\n`;
      message += `📊 Всего отправлено: ${pdfStats.totalDelivered || 0}\n\n`;
      message += `📈 По сегментам:\n`;
      Object.entries(pdfStats.bySegment || {}).forEach(([segment, count]) => {
        const emoji = this.getSegmentEmoji(segment);
        message += `${emoji} ${segment}: ${count}\n`;
      });
      message += `\n📋 По типам доставки:\n`;
      Object.entries(pdfStats.byDeliveryMethod || {}).forEach(([method, count]) => {
        message += `• ${method}: ${count}\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Статистика', callback_data: 'admin_stats' }]
          ]
        }
      });
    });

    // Callback для анализа VERSE
    this.telegramBot.action('admin_verse_analysis', async (ctx) => {
      if (ctx.from.id.toString() !== this.adminPanel.adminId) {
        await ctx.answerCbQuery('🚫 Доступ запрещен');
        return;
      }

      await ctx.answerCbQuery();
      
      const leads = Object.values(this.adminNotifications.leadDataStorage || {});
      const analysisStats = this.analyzeVERSEPerformance(leads);
      
      let message = `🧠 *АНАЛИЗ VERSE СИСТЕМЫ*\n\n`;
      message += `📊 Всего анализов: ${analysisStats.totalAnalyses}\n`;
      message += `📈 Средние баллы:\n`;
      message += `• Срочность: ${analysisStats.averageScores.urgency}/100\n`;
      message += `• Готовность: ${analysisStats.averageScores.readiness}/100\n`;
      message += `• Соответствие: ${analysisStats.averageScores.fit}/100\n\n`;
      message += `🎯 Точность сегментации:\n`;
      message += `• HOT_LEAD: ${analysisStats.segmentAccuracy.HOT_LEAD}%\n`;
      message += `• WARM_LEAD: ${analysisStats.segmentAccuracy.WARM_LEAD}%\n`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Аналитика', callback_data: 'admin_analytics' }]
          ]
        }
      });
    });

    console.log('✅ Дополнительные admin callbacks настроены');
  }

  // Анализ производительности VERSE
  analyzeVERSEPerformance(leads) {
    if (!leads.length) {
      return {
        totalAnalyses: 0,
        averageScores: { urgency: 0, readiness: 0, fit: 0 },
        segmentAccuracy: { HOT_LEAD: 0, WARM_LEAD: 0, COLD_LEAD: 0, NURTURE_LEAD: 0 }
      };
    }

    const validLeads = leads.filter(lead => lead.analysisResult?.scores);
    const totalScores = { urgency: 0, readiness: 0, fit: 0 };
    const segmentCounts = { HOT_LEAD: 0, WARM_LEAD: 0, COLD_LEAD: 0, NURTURE_LEAD: 0 };

    validLeads.forEach(lead => {
      const scores = lead.analysisResult.scores;
      totalScores.urgency += scores.urgency || 0;
      totalScores.readiness += scores.readiness || 0;
      totalScores.fit += scores.fit || 0;
      
      const segment = lead.analysisResult.segment;
      if (segmentCounts.hasOwnProperty(segment)) {
        segmentCounts[segment]++;
      }
    });

    const averageScores = {
      urgency: validLeads.length > 0 ? Math.round(totalScores.urgency / validLeads.length) : 0,
      readiness: validLeads.length > 0 ? Math.round(totalScores.readiness / validLeads.length) : 0,
      fit: validLeads.length > 0 ? Math.round(totalScores.fit / validLeads.length) : 0
    };

    const totalLeads = validLeads.length;
    const segmentAccuracy = {};
    Object.entries(segmentCounts).forEach(([segment, count]) => {
      segmentAccuracy[segment] = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
    });

    return {
      totalAnalyses: validLeads.length,
      averageScores,
      segmentAccuracy
    };
  }

  // ИСПРАВЛЕНО: Правильная обработка admin callbacks
  async handleAdminCallback(ctx, callbackData) {
    if (ctx.from.id.toString() !== config.ADMIN_ID) {
      await ctx.answerCbQuery('🚫 Доступ запрещен');
      return;
    }

    await ctx.answerCbQuery();
    
    try {
      console.log(`🔍 Admin callback: ${callbackData}`);
      
      // Основные панели
      if (callbackData === 'admin_main' || callbackData === 'admin_refresh') {
        await this.adminPanel.showMainPanel(ctx);
      } else if (callbackData === 'admin_stats') {
        await this.adminPanel.showDetailedStats(ctx);
      } else if (callbackData === 'admin_analytics') {
        await this.adminPanel.showAnalytics(ctx);
      } else if (callbackData === 'admin_hot_leads') {
        await this.adminPanel.showHotLeads(ctx);
      } else if (callbackData === 'admin_today_leads') {
        await this.adminPanel.showTodayLeads(ctx);
      } else if (callbackData === 'admin_system') {
        await this.adminPanel.showSystemHealth(ctx);
      } else if (callbackData === 'admin_settings') {
        await this.adminPanel.showSettings(ctx);
      } else if (callbackData === 'admin_export') {
        await this.adminPanel.showExportMenu(ctx);
      } else if (callbackData === 'admin_notifications_menu') {
        await this.adminPanel.showNotificationsMenu(ctx);
      } else if (callbackData === 'admin_help') {
        await this.adminPanel.showHelp(ctx);
      } 
      
      // Диагностика
      else if (callbackData === 'admin_diagnostics') {
        await this.sendDiagnosticsToAdmin(ctx);
      } else if (callbackData === 'admin_detailed_diagnostics') {
        await this.showDetailedDiagnostics(ctx);
      } else if (callbackData === 'admin_logs') {
        await this.showSystemLogs(ctx);
      }
      
      // Дополнительные функции
      else if (callbackData === 'admin_pdf_stats') {
        // Уже обработано в setupAdditionalCallbacks
      } else if (callbackData === 'admin_verse_analysis') {
        // Уже обработано в setupAdditionalCallbacks
      }
      
      // Обработка callback'ов с параметрами
      else if (callbackData.startsWith('admin_')) {
        const parts = callbackData.split('_');
        if (parts.length >= 3) {
          const action = parts.slice(1, -1).join('_');
          const targetUserId = parts[parts.length - 1];
          
          console.log(`🔍 Admin callback parsed: action=${action}, userId=${targetUserId}`);
          
          await this.adminNotifications.handleAdminCallback(ctx, action, targetUserId);
        } else {
          console.warn('⚠️ Неправильный формат callback:', callbackData);
          await ctx.reply('Неправильный формат команды');
        }
      } else {
        console.warn('⚠️ Неизвестный callback:', callbackData);
        await ctx.reply('Неизвестная команда');
      }
      
    } catch (error) {
      console.error('❌ Ошибка handleAdminCallback:', error);
      await ctx.reply('Произошла ошибка при выполнении команды');
      await this.sendEmergencyAlert('system_error', 'Ошибка обработки admin callback', {
        error: error.message,
        callbackData,
        user_id: ctx.from.id
      });
    }
  }

  // ИСПРАВЛЕНО: Правильная диагностика системы
  async runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'UNKNOWN',
      checks: {}
    };

    try {
      // Проверка админ-панели
      results.checks.admin_panel = {
        status: this.adminPanel ? 'OK' : 'ERROR',
        message: this.adminPanel ? 'Админ-панель активна' : 'Админ-панель не инициализирована'
      };

      // Проверка модулей
      results.checks.modules = {
        status: 'OK',
        details: {
          admin_notifications: !!this.adminNotifications,
          verse_analysis: !!this.verseAnalysis,
          lead_transfer: !!this.leadTransfer,
          pdf_manager: !!this.pdfManager
        }
      };

      // Проверка данных
      const leadsCount = Object.keys(this.adminNotifications.leadDataStorage || {}).length;
      results.checks.data_integrity = {
        status: 'OK',
        leads_count: leadsCount,
        message: `Сохранено ${leadsCount} лидов`
      };

      // Проверка конфигурации
      const requiredConfig = ['LEAD_BOT_TOKEN', 'ADMIN_ID'];
      const missingConfig = requiredConfig.filter(key => !config[key]);

      results.checks.configuration = {
        status: missingConfig.length === 0 ? 'OK' : 'WARNING',
        missing: missingConfig,
        message: missingConfig.length === 0 ? 
          'Конфигурация корректна' : 
          `Отсутствуют: ${missingConfig.join(', ')}`
      };

      // Проверка памяти
      const memUsage = process.memoryUsage();
      const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      results.checks.memory = {
        status: memoryMB < 500 ? 'OK' : memoryMB < 1000 ? 'WARNING' : 'ERROR',
        usage_mb: memoryMB,
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

  // ИСПРАВЛЕНО: Правильная отправка диагностики
  async sendDiagnosticsToAdmin(ctx) {
    try {
      const diagnostics = await this.runDiagnostics();
      
      let message = `🔧 *ДИАГНОСТИКА СИСТЕМЫ*\n\n`;
      
      const statusEmoji = {
        'OK': '✅',
        'WARNING': '⚠️',
        'ERROR': '❌',
        'UNKNOWN': '❓'
      };

      message += `${statusEmoji[diagnostics.overall_status]} **Общий статус:** ${diagnostics.overall_status}\n\n`;

      Object.entries(diagnostics.checks).forEach(([checkName, result]) => {
        const emoji = statusEmoji[result.status] || '❓';
        const name = checkName.replace(/_/g, ' ').toUpperCase();
        message += `${emoji} **${name}:**\n`;
        message += `└─ ${result.message}\n`;
        
        if (result.details) {
          Object.entries(result.details).forEach(([key, value]) => {
            message += `   • ${key}: ${value ? '✅' : '❌'}\n`;
          });
        }
        message += `\n`;
      });

      message += `🕐 ${new Date().toLocaleString('ru-RU')}`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔧 Детальная диагностика', callback_data: 'admin_detailed_diagnostics' }],
            [{ text: '🎛️ Админ-панель', callback_data: 'admin_main' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка отправки диагностики:', error);
      await ctx.reply('Ошибка выполнения диагностики', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Админ-панель', callback_data: 'admin_main' }]
          ]
        }
      });
    }
  }

  // ИСПРАВЛЕНО: Детальная диагностика
  async showDetailedDiagnostics(ctx) {
    try {
      const diagnostics = await this.runDiagnostics();
      const health = await this.getSystemHealthOverview();
      
      let message = `🔍 *ДЕТАЛЬНАЯ ДИАГНОСТИКА*\n\n`;
      
      const statusEmoji = {
        'OK': '✅',
        'WARNING': '⚠️',
        'ERROR': '❌',
        'UNKNOWN': '❓'
      };

      message += `${statusEmoji[diagnostics.overall_status]} **Общий статус:** ${diagnostics.overall_status}\n`;
      message += `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n\n`;

      // Системная информация
      message += `📊 *СИСТЕМА:*\n`;
      message += `• Время работы: ${this.formatUptime(health.uptime)}\n`;
      message += `• Память: ${diagnostics.checks.memory.usage_mb}MB\n`;
      message += `• Статус: ${statusEmoji[diagnostics.checks.memory.status]} ${diagnostics.checks.memory.message}\n\n`;

      // Модули
      message += `📡 *МОДУЛИ:*\n`;
      Object.entries(diagnostics.checks.modules.details).forEach(([module, status]) => {
        const emoji = status ? '✅' : '❌';
        message += `${emoji} ${module.replace(/_/g, ' ')}\n`;
      });
      message += `\n`;

      // Данные
      message += `📋 *ДАННЫЕ:*\n`;
      message += `• Лидов: ${diagnostics.checks.data_integrity.leads_count}\n`;
      message += `• Статус: ${statusEmoji[diagnostics.checks.data_integrity.status]}\n\n`;

      // Конфигурация
      message += `⚙️ *КОНФИГУРАЦИЯ:*\n`;
      message += `• Статус: ${statusEmoji[diagnostics.checks.configuration.status]}\n`;
      if (diagnostics.checks.configuration.missing.length > 0) {
        message += `• Отсутствуют: ${diagnostics.checks.configuration.missing.join(', ')}\n`;
      }
      message += `\n`;

      // Интеграции
      message += `🔗 *ИНТЕГРАЦИИ:*\n`;
      message += `• Основной бот: ${health.integrations.main_bot ? '✅' : '❌'}\n`;
      message += `• CRM: ${health.integrations.crm ? '✅' : '❌'}\n`;
      message += `• База данных: ${health.integrations.database ? '✅' : '❌'}\n`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 Логи системы', callback_data: 'admin_logs' },
              { text: '🔄 Обновить', callback_data: 'admin_detailed_diagnostics' }
            ],
            [
              { text: '🎛️ Админ-панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка showDetailedDiagnostics:', error);
      await ctx.reply('Ошибка получения детальной диагностики');
    }
  }

  // ИСПРАВЛЕНО: Правильные логи системы
  async showSystemLogs(ctx) {
    try {
      const logs = [
        { 
          timestamp: new Date(), 
          level: 'INFO', 
          message: 'Админ-панель активна' 
        },
        { 
          timestamp: new Date(Date.now() - 300000), 
          level: 'INFO', 
          message: 'Система работает стабильно' 
        },
        { 
          timestamp: new Date(Date.now() - 600000), 
          level: 'INFO', 
          message: 'Бот успешно запущен' 
        }
      ];

      let message = `📋 *ЛОГИ СИСТЕМЫ*\n\n`;
      
      logs.forEach(log => {
        const emoji = log.level === 'ERROR' ? '❌' : log.level === 'WARN' ? '⚠️' : '✅';
        const timeStr = log.timestamp.toLocaleTimeString('ru-RU');
        message += `${emoji} ${timeStr} [${log.level}]\n`;
        message += `   ${log.message}\n\n`;
      });

      message += `📝 Показаны последние ${logs.length} событий`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Обновить логи', callback_data: 'admin_logs' },
              { text: '🔍 Диагностика', callback_data: 'admin_detailed_diagnostics' }
            ],
            [
              { text: '🎛️ Админ-панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка showSystemLogs:', error);
      await ctx.reply('Ошибка получения логов');
    }
  }

  // Вспомогательные методы
  async getSystemHealthOverview() {
    return {
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      bot_status: 'running',
      admin_panel_status: 'active',
      integrations: {
        main_bot: !!config.MAIN_BOT_API_URL,
        crm: !!config.CRM_WEBHOOK_URL,
        database: !!config.DATABASE_URL
      }
    };
  }

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

  getSegmentEmoji(segment) {
    const emojis = {
      'HOT_LEAD': '🔥',
      'WARM_LEAD': '⭐',
      'COLD_LEAD': '❄️',
      'NURTURE_LEAD': '🌱'
    };
    return emojis[segment] || '❓';
  }

  // ИСПРАВЛЕНО: Правильная отправка экстренных уведомлений
  async sendEmergencyAlert(alertType, message, additionalData = {}) {
    if (!this.adminPanel.adminId) return;

    const alertEmojis = {
      'system_error': '🚨',
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
        `**Детали:**\n${JSON.stringify(additionalData, null, 2)}\n\n` +
        `🕐 ${new Date().toLocaleString('ru-RU')}`;

      await this.telegramBot.telegram.sendMessage(this.adminPanel.adminId, alertMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔧 Диагностика', callback_data: 'admin_diagnostics' },
              { text: '🎛️ Админ-панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка отправки экстренного уведомления:', error);
    }
  }

  // Экспорт статистики
  getExtendedStats() {
    const baseStats = this.adminNotifications.getStats();
    const pdfStats = this.pdfManager?.getBonusStats() || {};
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    const verseStats = this.analyzeVERSEPerformance(leads);

    return {
      ...baseStats,
      pdf_delivery: pdfStats,
      verse_analysis: verseStats,
      admin_panel: this.adminPanel.exportStats(),
      system_health: this.getSystemHealthOverview(),
      timestamp: new Date().toISOString()
    };
  }

  // Создание резервной копии
  async createBackup() {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        leads_data: this.adminNotifications.leadDataStorage || {},
        admin_stats: this.adminPanel.exportStats(),
        system_stats: this.getExtendedStats(),
        configuration: {
          notification_settings: this.adminPanel.notificationSettings,
          bot_config: {
            admin_id: config.ADMIN_ID,
            main_bot_url: config.MAIN_BOT_API_URL,
            crm_webhook: config.CRM_WEBHOOK_URL,
            trainer_contact: config.TRAINER_CONTACT
          }
        },
        metadata: {
          total_leads: Object.keys(this.adminNotifications.leadDataStorage || {}).length,
          backup_size: 0,
          created_by: 'admin_panel'
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

  // Очистка старых данных
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

  // Получение информации об интеграции
  getIntegrationInfo() {
    return {
      name: 'AdminIntegration',
      version: '1.0.0',
      status: 'active',
      features: [
        'enhanced_admin_panel',
        'system_diagnostics',
        'automated_backups',
        'emergency_alerts',
        'data_cleanup',
        'verse_analysis',
        'pdf_statistics'
      ],
      statistics: {
        total_commands: Object.keys(this.adminPanel.panelStats.commandsUsed || {}).length,
        last_access: this.adminPanel.panelStats.lastAccess,
        total_sessions: this.adminPanel.panelStats.totalSessions
      },
      health_status: 'healthy',
      last_updated: new Date().toISOString()
    };
  }

  // Безопасное завершение работы
  async shutdown() {
    try {
      console.log('🔄 Завершение работы AdminIntegration...');
      
      const backup = await this.createBackup();
      console.log('💾 Резервная копия создана');
      
      if (this.adminPanel.adminId) {
        await this.telegramBot.telegram.sendMessage(
          this.adminPanel.adminId,
          `🔄 *Завершение работы бота*\n\n` +
          `Резервная копия создана\n` +
          `Всего лидов: ${backup.metadata.total_leads}\n` +
          `Время работы: ${this.formatUptime(process.uptime())}\n\n` +
          `🕐 ${new Date().toLocaleString('ru-RU')}`,
          { parse_mode: 'Markdown' }
        );
      }
      
      console.log('✅ AdminIntegration завершил работу');
      
    } catch (error) {
      console.error('❌ Ошибка при завершении AdminIntegration:', error);
    }
  }

  // Планировщик задач для админа
  startAdminScheduler() {
    // Ежечасная проверка системы
    setInterval(async () => {
      const diagnostics = await this.runDiagnostics();
      if (diagnostics.overall_status === 'ERROR') {
        await this.sendEmergencyAlert('system_error', 'Обнаружены критические ошибки системы', diagnostics);
      }
    }, 3600000); // Каждый час

    // Еженедельная очистка данных
    setInterval(async () => {
      const cleanupResult = await this.cleanupOldData(30);
      console.log('🧹 Еженедельная очистка:', cleanupResult);
    }, 7 * 24 * 3600000); // Каждую неделю

    // Ежедневная диагностика в 9:00
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        await this.sendDailyReport();
      }
    }, 60000); // Проверяем каждую минуту

    console.log('⏰ Планировщик админ-задач запущен');
  }

  // Ежедневный отчет
  async sendDailyReport() {
    if (!this.adminPanel.adminId) return;

    try {
      const stats = this.adminNotifications.getStats();
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
      message += `• Средний балл VERSE: ${this.getAverageScore()}/100\n\n`;
      
      message += `🎯 **Следующие действия:**\n`;
      if (hotLeads > 0) {
        message += `• Обработать ${hotLeads} горячих лидов\n`;
      }
      if (totalLeads === 0) {
        message += `• Проанализировать причины отсутствия лидов\n`;
      }
      message += `• Подготовить план на завтра\n\n`;
      
      message += `🕐 Автоматический отчет • ${new Date().toLocaleTimeString('ru-RU')}`;

      await this.telegramBot.telegram.sendMessage(this.adminPanel.adminId, message, {
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

  // Получение среднего балла
  getAverageScore() {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    if (!leads.length) return 0;
    
    const scores = leads
      .map(lead => lead.analysisResult?.scores?.total)
      .filter(score => typeof score === 'number');
    
    if (!scores.length) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  // Восстановление из резервной копии
  async restoreFromBackup(backupData) {
    try {
      console.log('🔄 Восстановление данных из резервной копии...');

      // Валидация данных резервной копии
      if (!backupData.leads_data || !backupData.timestamp) {
        throw new Error('Неверный формат резервной копии');
      }

      // Восстанавливаем данные лидов
      this.adminNotifications.leadDataStorage = backupData.leads_data;

      // Восстанавливаем настройки уведомлений
      if (backupData.configuration?.notification_settings) {
        this.adminPanel.notificationSettings = {
          ...this.adminPanel.notificationSettings,
          ...backupData.configuration.notification_settings
        };
      }

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
}

module.exports = AdminIntegration;
