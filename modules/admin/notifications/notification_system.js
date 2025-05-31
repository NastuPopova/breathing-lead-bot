// Файл: modules/admin/notifications/notification_system.js
// Основной класс системы уведомлений администратора

const NotificationTemplates = require('./notification_templates');
const NotificationHandlers = require('./notification_handlers');
const NotificationFormatters = require('./notification_formatters');
const NotificationAnalytics = require('./notification_analytics');
const config = require('../../../config');

class AdminNotificationSystem {
  constructor(bot) {
    this.bot = bot;
    this.adminId = config.ADMIN_ID;
    this.enableNotifications = true;
    
    // Инициализируем компоненты
    this.templates = new NotificationTemplates();
    this.handlers = new NotificationHandlers(this);
    this.formatters = new NotificationFormatters();
    this.analytics = new NotificationAnalytics();
    
    // Статистика для администратора
    this.dailyStats = {
      totalLeads: 0,
      hotLeads: 0,
      warmLeads: 0,
      coldLeads: 0,
      nurtureLeads: 0,
      lastReset: new Date().toDateString()
    };

    // Хранилище данных в памяти
    this.segmentStorage = {};
    this.leadDataStorage = {};
    
    console.log('✅ AdminNotificationSystem инициализирован');
  }

  /**
   * Отправляет уведомление администратору о новом лиде
   */
  async notifyNewLead(userData) {
    if (!this.adminId || !this.enableNotifications) {
      console.log('⚠️ Уведомления администратора отключены или ADMIN_ID не настроен');
      return;
    }

    console.log(`📤 Отправляем уведомление админу ${this.adminId} о лиде ${userData.userInfo?.telegram_id}`);

    try {
      // Сбрасываем статистику если новый день
      this.resetDailyStatsIfNeeded();
      
      // Обновляем статистику
      this.updateDailyStats(userData.analysisResult?.segment);

      // Сохраняем данные лида
      this.storeLeadData(userData.userInfo?.telegram_id, userData);

      // Генерируем уведомление через templates
      const message = this.templates.generateLeadNotification(userData, this.dailyStats);
      const keyboard = this.templates.generateAdminKeyboard(userData);

      // Отправляем уведомление
      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log('✅ Сообщение админу отправлено успешно');
      
      // Если это горячий лид, отправляем дополнительное срочное уведомление
      if (userData.analysisResult?.segment === 'HOT_LEAD') {
        await this.sendUrgentNotification(userData);
      }

    } catch (error) {
      console.error('❌ Ошибка отправки уведомления администратору:', error);
      this.analytics.logError('notification_send_error', error, userData);
    }
  }

  /**
   * Отправляет результаты анкетирования администратору
   */
  async notifySurveyResults(userData) {
    if (!this.adminId || !this.enableNotifications) {
      console.log('⚠️ Уведомления администратора отключены');
      return;
    }

    try {
      const message = this.templates.generateSurveyResultsMessage(userData);
      const keyboard = this.templates.generateSurveyResultsKeyboard(userData);

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log(`✅ Результаты анкетирования отправлены администратору: ${userData.userInfo?.telegram_id}`);

    } catch (error) {
      console.error('❌ Ошибка отправки результатов анкетирования:', error);
      this.analytics.logError('survey_results_error', error, userData);
    }
  }

  /**
   * Отправляет срочное уведомление для горячих лидов
   */
  async sendUrgentNotification(userData) {
    try {
      const urgentMessage = this.templates.generateUrgentNotification(userData, this.dailyStats);
      const urgentKeyboard = this.templates.generateUrgentKeyboard(userData);

      console.log('📨 Отправляем срочное уведомление о горячем лиде...');

      await this.bot.telegram.sendMessage(this.adminId, urgentMessage, {
        parse_mode: 'Markdown',
        ...urgentKeyboard
      });

      console.log('✅ Срочное уведомление отправлено успешно');

    } catch (error) {
      console.error('❌ Ошибка отправки срочного уведомления:', error);
      this.analytics.logError('urgent_notification_error', error, userData);
    }
  }

  /**
   * Отправляет ежедневную сводку администратору
   */
  async sendDailySummary() {
    if (!this.adminId) return;

    try {
      const message = this.templates.generateDailySummary(this.dailyStats);
      const keyboard = this.templates.generateDailySummaryKeyboard();

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log('✅ Ежедневная сводка отправлена успешно');

    } catch (error) {
      console.error('❌ Ошибка отправки ежедневной сводки:', error);
      this.analytics.logError('daily_summary_error', error);
    }
  }

  /**
   * Обрабатывает нажатия на кнопки администратора
   */
  async handleAdminCallback(ctx, action, targetUserId) {
    try {
      console.log('🔍 Admin callback:', { action, targetUserId });
      return await this.handlers.handleCallback(ctx, action, targetUserId);
    } catch (error) {
      console.error('❌ Ошибка обработки admin callback:', error);
      this.analytics.logError('admin_callback_error', error, { action, targetUserId });
      await ctx.answerCbQuery('Ошибка выполнения действия');
    }
  }

  // ===== УПРАВЛЕНИЕ ДАННЫМИ =====

  /**
   * Сохранение данных лида
   */
  storeLeadData(userId, leadData) {
    if (!this.leadDataStorage) this.leadDataStorage = {};
    this.leadDataStorage[userId] = {
      ...leadData,
      timestamp: new Date().toISOString()
    };
    
    // Также сохраняем сегмент отдельно для быстрого доступа
    if (leadData.analysisResult?.segment) {
      this.updateStoredSegment(userId, leadData.analysisResult.segment);
    }
    
    console.log(`💾 Данные лида сохранены: ${userId}`);
  }

  getStoredLeadData(userId) {
    if (!this.leadDataStorage) this.leadDataStorage = {};
    return this.leadDataStorage[userId];
  }

  getStoredSegment(userId) {
    if (!this.segmentStorage) this.segmentStorage = {};
    return this.segmentStorage[userId];
  }

  updateStoredSegment(userId, segment) {
    if (!this.segmentStorage) this.segmentStorage = {};
    this.segmentStorage[userId] = segment;
    console.log(`🔄 Сегмент обновлен: ${userId} -> ${segment}`);
  }

  // ===== СТАТИСТИКА =====

  /**
   * Обновляет ежедневную статистику
   */
  updateDailyStats(segment) {
    this.dailyStats.totalLeads++;
    
    switch (segment) {
      case 'HOT_LEAD':
        this.dailyStats.hotLeads++;
        break;
      case 'WARM_LEAD':
        this.dailyStats.warmLeads++;
        break;
      case 'COLD_LEAD':
        this.dailyStats.coldLeads++;
        break;
      case 'NURTURE_LEAD':
        this.dailyStats.nurtureLeads++;
        break;
    }
    
    this.analytics.updateStats(segment);
  }

  /**
   * Сбрасывает статистику если новый день
   */
  resetDailyStatsIfNeeded() {
    const today = new Date().toDateString();
    
    if (this.dailyStats.lastReset !== today) {
      this.dailyStats = {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        nurtureLeads: 0,
        lastReset: today
      };
      console.log('🔄 Сброшена ежедневная статистика');
    }
  }

  /**
   * Получение статистики для экспорта
   */
  getStats() {
    return {
      daily_stats: this.dailyStats,
      admin_id: this.adminId,
      notifications_enabled: this.enableNotifications,
      stored_segments_count: Object.keys(this.segmentStorage || {}).length,
      stored_leads_count: Object.keys(this.leadDataStorage || {}).length,
      analytics: this.analytics.getStats(),
      last_updated: new Date().toISOString()
    };
  }

  // ===== НАСТРОЙКИ =====

  /**
   * Включает/выключает уведомления
   */
  toggleNotifications(enabled) {
    this.enableNotifications = enabled;
    console.log(`🔔 Уведомления администратора: ${enabled ? 'ВКЛЮЧЕНЫ' : 'ВЫКЛЮЧЕНЫ'}`);
  }

  /**
   * Очистка старых данных
   */
  cleanupOldData(daysToKeep = 7) {
    if (!this.leadDataStorage) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let cleanedCount = 0;
    
    Object.entries(this.leadDataStorage).forEach(([userId, data]) => {
      const dataDate = new Date(data.timestamp);
      if (dataDate < cutoffDate) {
        delete this.leadDataStorage[userId];
        delete this.segmentStorage[userId];
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Очищено ${cleanedCount} старых записей лидов`);
    }
    
    return { cleaned_count: cleanedCount };
  }

  /**
   * Экспорт конфигурации
   */
  exportConfig() {
    return {
      name: 'AdminNotificationSystem',
      version: '3.0.0',
      admin_id: this.adminId,
      notifications_enabled: this.enableNotifications,
      components: {
        templates: this.templates.getInfo(),
        handlers: this.handlers.getInfo(),
        formatters: this.formatters.getInfo(),
        analytics: this.analytics.getInfo()
      },
      stats: this.getStats(),
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = AdminNotificationSystem;
