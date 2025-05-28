// Файл: core/admin_integration.js
// Интеграция расширенной админ-панели в основной бот

const EnhancedAdminPanel = require('../modules/admin/enhanced_admin_panel');

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

  // Инициализация админ-панели
  initialize() {
    console.log('🎛️ Инициализация расширенной админ-панели...');
    
    try {
      // Инициализируем админ-панель
      this.adminPanel.initialize();
      
      // Добавляем дополнительные callback'ы если нужно
      this.setupAdditionalCallbacks();
      
      console.log('✅ Расширенная админ-панель готова к работе');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации админ-панели:', error);
    }
  }

  // Дополнительные callback'ы специфичные для твоего бота
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
        const emoji = this.adminPanel.getSegmentEmoji(segment);
        message += `${emoji} ${segment}: ${count}\n`;
      });
      message += `\n📋 По типам доставки:\n`;
      Object.entries(pdfStats.byDeliveryMethod || {}).forEach(([method, count]) => {
        message += `• ${method}: ${count}\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...require('telegraf').Markup.inlineKeyboard([
          [require('telegraf').Markup.button.callback('🔙 Статистика', 'admin_stats')]
        ])
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
        ...require('telegraf').Markup.inlineKeyboard([
          [require('telegraf').Markup.button.callback('🔙 Аналитика', 'admin_analytics')]
        ])
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

    // Расчет точности сегментации (примерный)
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

  // Метод для получения расширенной статистики
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

  // Обзор состояния системы
  getSystemHealthOverview() {
    return {
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      bot_status: 'running',
      admin_panel_status: 'active',
      integrations: {
        main_bot: !!require('../config').MAIN_BOT_API_URL,
        crm: !!require('../config').CRM_WEBHOOK_URL,
        database: !!require('../config').DATABASE_URL
      }
    };
  }

  // Экспорт всех данных для резервного копирования
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
            admin_id: require('../config').ADMIN_ID,
            main_bot_url: require('../config').MAIN_BOT_API_URL,
            crm_webhook: require('../config').CRM_WEBHOOK_URL,
            trainer_contact: require('../config').TRAINER_CONTACT
          },
          survey_config: require('../config').SURVEY_CONFIG,
          segment_thresholds: require('../config').SEGMENT_THRESHOLDS
        },
        metadata: {
          total_leads: Object.keys(this.adminNotifications.leadDataStorage || {}).length,
          backup_size: 0, // будет вычислен после stringify
          created_by: 'admin_panel'
        }
      };

      // Вычисляем размер резервной копии
      const backupString = JSON.stringify(backup, null, 2);
      backup.metadata.backup_size = Buffer.byteLength(backupString, 'utf8');

      return backup;
    } catch (error) {
      console.error('❌ Ошибка создания резервной копии:', error);
      throw error;
    }
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

  // Диагностика системы
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
      const config = require('../config');
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

  // Отправка диагностики админу
  async sendDiagnosticsToAdmin() {
    if (!this.adminPanel.adminId) return;

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

      await this.telegramBot.telegram.sendMessage(this.adminPanel.adminId, message, {
        parse_mode: 'Markdown',
        ...require('telegraf').Markup.inlineKeyboard([
          [require('telegraf').Markup.button.callback('🔧 Детальная диагностика', 'admin_detailed_diagnostics')],
          [require('telegraf').Markup.button.callback('🎛️ Админ-панель', 'admin_main')]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка отправки диагностики:', error);
    }
  }

  // Экстренное уведомление админа
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
        ...require('telegraf').Markup.inlineKeyboard([
          [require('telegraf').Markup.button.callback('🔧 Диагностика', 'admin_diagnostics')],
          [require('telegraf').Markup.button.callback('🎛️ Админ-панель', 'admin_main')]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка отправки экстренного уведомления:', error);
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
        await this.sendDiagnosticsToAdmin();
      }
    }, 60000); // Проверяем каждую минуту

    console.log('⏰ Планировщик админ-задач запущен');
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
        'scheduled_reports',
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

  // Метод для безопасного завершения работы
  async shutdown() {
    try {
      console.log('🔄 Завершение работы AdminIntegration...');
      
      // Создаем резервную копию перед завершением
      const backup = await this.createBackup();
      console.log('💾 Резервная копия создана');
      
      // Отправляем последний отчет админу
      if (this.adminPanel.adminId) {
        await this.telegramBot.telegram.sendMessage(
          this.adminPanel.adminId,
          `🔄 *Завершение работы бота*\n\n` +
          `Резервная копия создана\n` +
          `Всего лидов: ${backup.metadata.total_leads}\n` +
          `Время работы: ${this.adminPanel.formatUptime(process.uptime())}\n\n` +
          `🕐 ${new Date().toLocaleString('ru-RU')}`,
          { parse_mode: 'Markdown' }
        );
      }
      
      console.log('✅ AdminIntegration завершил работу');
      
    } catch (error) {
      console.error('❌ Ошибка при завершении AdminIntegration:', error);
    }
  }
}

module.exports = AdminIntegration;
