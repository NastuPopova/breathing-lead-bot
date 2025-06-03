// Файл: modules/admin/notifications/notification_system.js
// Обновленная версия с управлением режимами уведомлений

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
    
    // Режимы работы уведомлений
    this.testMode = false;                // Тестовый режим (все уведомления)
    this.filterAdminResponses = true;     // Фильтр собственных ответов
    this.silentMode = false;              // Тихий режим (без уведомлений)
    
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
    
    // Настройки по умолчанию
    this.initializeDefaultSettings();
    
    console.log('✅ AdminNotificationSystem инициализирован с управлением режимами');
  }

  // ===== ИНИЦИАЛИЗАЦИЯ И НАСТРОЙКИ =====

  initializeDefaultSettings() {
    // Читаем настройки из переменных окружения
    if (process.env.ADMIN_FILTER_ENABLED === 'false') {
      this.filterAdminResponses = false;
    }
    
    if (process.env.ADMIN_TEST_MODE === 'true') {
      this.testMode = true;
      this.filterAdminResponses = false;
    }
    
    if (process.env.ADMIN_NOTIFICATIONS_ENABLED === 'false') {
      this.enableNotifications = false;
    }
    
    console.log(`🔧 Начальные настройки: фильтр=${this.filterAdminResponses}, тест=${this.testMode}, уведомления=${this.enableNotifications}`);
  }

  // ===== УПРАВЛЕНИЕ РЕЖИМАМИ =====

  /**
   * Включает тестовый режим (получать уведомления от собственных ответов)
   */
  enableTestMode() {
    this.testMode = true;
    this.filterAdminResponses = false;
    this.silentMode = false;
    console.log('🧪 ТЕСТОВЫЙ РЕЖИМ ВКЛЮЧЕН - все уведомления принудительно отправляются');
    return this.getNotificationMode();
  }

  /**
   * Отключает тестовый режим
   */
  disableTestMode() {
    this.testMode = false;
    this.filterAdminResponses = true;
    console.log('🧪 Тестовый режим выключен, включен фильтр администратора');
    return this.getNotificationMode();
  }

  /**
   * Включает фильтрацию собственных ответов администратора
   */
  enableAdminFilter() {
    this.filterAdminResponses = true;
    this.testMode = false;
    this.silentMode = false;
    console.log('🔒 Фильтр администратора ВКЛЮЧЕН - собственные ответы не будут вызывать уведомления');
    return this.getNotificationMode();
  }

  /**
   * Отключает фильтрацию собственных ответов администратора
   */
  disableAdminFilter() {
    this.filterAdminResponses = false;
    this.testMode = false;
    this.silentMode = false;
    console.log('🔓 Фильтр администратора ОТКЛЮЧЕН - все ответы будут вызывать уведомления');
    return this.getNotificationMode();
  }

  /**
   * Включает тихий режим (никаких уведомлений)
   */
  enableSilentMode() {
    this.silentMode = true;
    this.testMode = false;
    this.filterAdminResponses = false;
    console.log('🔇 ТИХИЙ РЕЖИМ ВКЛЮЧЕН - уведомления отключены');
    return this.getNotificationMode();
  }

  /**
   * Отключает тихий режим
   */
  disableSilentMode() {
    this.silentMode = false;
    this.filterAdminResponses = true;
    console.log('🔊 Тихий режим выключен, включен фильтр администратора');
    return this.getNotificationMode();
  }

  /**
   * Циклическое переключение режимов
   */
  toggleNotificationMode() {
    if (this.silentMode) {
      // Тихий -> Фильтр
      return this.enableAdminFilter();
    } else if (this.filterAdminResponses && !this.testMode) {
      // Фильтр -> Тест
      return this.enableTestMode();
    } else if (this.testMode) {
      // Тест -> Все
      return this.disableAdminFilter();
    } else {
      // Все -> Тихий
      return this.enableSilentMode();
    }
  }

  /**
   * Получение текущего режима уведомлений
   */
  getNotificationMode() {
    if (this.silentMode) {
      return {
        mode: 'silent',
        description: 'Тихий режим - все уведомления отключены',
        emoji: '🔇',
        buttonText: '🔊 Включить фильтр'
      };
    } else if (this.testMode) {
      return {
        mode: 'test_mode',
        description: 'Тестовый режим - все уведомления принудительно отправляются',
        emoji: '🧪',
        buttonText: '🔓 Все уведомления'
      };
    } else if (this.filterAdminResponses) {
      return {
        mode: 'filtered',
        description: 'Фильтр включен - собственные ответы администратора игнорируются',
        emoji: '🔒',
        buttonText: '🧪 Тестовый режим'
      };
    } else {
      return {
        mode: 'all_notifications',
        description: 'Все уведомления - включая собственные ответы администратора',
        emoji: '🔓',
        buttonText: '🔇 Тихий режим'
      };
    }
  }

  // ===== ПРОВЕРКИ И ФИЛЬТРЫ =====

  /**
   * Проверяет, является ли пользователь администратором
   */
  isAdmin(userId) {
    return userId && userId.toString() === this.adminId;
  }

  /**
   * Проверяет, нужно ли отправлять уведомление
   */
  shouldSendNotification(userData) {
    const userId = userData.userInfo?.telegram_id;
    
    // Проверяем общие настройки
    if (!this.adminId || !this.enableNotifications) {
      console.log('⚠️ Уведомления отключены или ADMIN_ID не настроен');
      return { send: false, reason: 'notifications_disabled' };
    }

    // Тихий режим
    if (this.silentMode) {
      console.log('🔇 Тихий режим - уведомление заблокировано');
      return { send: false, reason: 'silent_mode' };
    }

    // Тестовый режим - отправляем все
    if (this.testMode) {
      console.log('🧪 Тестовый режим - принудительная отправка');
      return { send: true, reason: 'test_mode', forceTest: true };
    }

    // Фильтрация администратора
    if (this.filterAdminResponses && this.isAdmin(userId)) {
      console.log(`🔒 Фильтр: Уведомление от администратора (${userId}) заблокировано`);
      return { send: false, reason: 'admin_filtered' };
    }

    // Все проверки пройдены
    return { send: true, reason: 'normal' };
  }

  // ===== ОСНОВНЫЕ МЕТОДЫ УВЕДОМЛЕНИЙ =====

  /**
   * Отправляет уведомление администратору о новом лиде
   */
  async notifyNewLead(userData) {
    const shouldSend = this.shouldSendNotification(userData);
    
    if (!shouldSend.send) {
      console.log(`📵 Уведомление заблокировано: ${shouldSend.reason}`);
      return;
    }

    const userId = userData.userInfo?.telegram_id;
    console.log(`📤 Отправляем уведомление админу ${this.adminId} о лиде ${userId} (режим: ${shouldSend.reason})`);

    try {
      // Сбрасываем статистику если новый день
      this.resetDailyStatsIfNeeded();
      
      // Обновляем статистику
      this.updateDailyStats(userData.analysisResult?.segment);

      // Сохраняем данные лида
      this.storeLeadData(userData.userInfo?.telegram_id, userData);

      // Генерируем уведомление
      let message = this.templates.generateLeadNotification(userData, this.dailyStats);
      const keyboard = this.templates.generateAdminKeyboard(userData);

      // Добавляем метку режима
      if (shouldSend.forceTest) {
        message = `🧪 **ТЕСТОВЫЙ РЕЖИМ** 🧪\n\n${message}`;
      } else if (this.isAdmin(userId)) {
        message = `🔓 **УВЕДОМЛЕНИЕ ОТ АДМИНИСТРАТОРА** 🔓\n\n${message}`;
      }

      // Отправляем уведомление
      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log('✅ Сообщение админу отправлено успешно');
      this.analytics.updateStats(userData.analysisResult?.segment, 'lead_notification');
      
      // Если это горячий лид, отправляем дополнительное срочное уведомление
      if (userData.analysisResult?.segment === 'HOT_LEAD') {
        await this.sendUrgentNotification(userData, shouldSend.forceTest);
      }

    } catch (error) {
      console.error('❌ Ошибка отправки уведомления администратору:', error);
      this.analytics.logError('notification_send_error', error, userData);
    }
  }

  /**
   * Отправляет срочное уведомление для горячих лидов
   */
  async sendUrgentNotification(userData, isTest = false) {
    try {
      let urgentMessage = this.templates.generateUrgentNotification(userData, this.dailyStats);
      const urgentKeyboard = this.templates.generateUrgentKeyboard(userData);

      if (isTest) {
        urgentMessage = `🧪 **ТЕСТ** 🧪\n\n${urgentMessage}`;
      }

      console.log('📨 Отправляем срочное уведомление о горячем лиде...');

      await this.bot.telegram.sendMessage(this.adminId, urgentMessage, {
        parse_mode: 'Markdown',
        ...urgentKeyboard
      });

      console.log('✅ Срочное уведомление отправлено успешно');
      this.analytics.updateStats(userData.analysisResult?.segment, 'urgent_notification');

    } catch (error) {
      console.error('❌ Ошибка отправки срочного уведомления:', error);
      this.analytics.logError('urgent_notification_error', error, userData);
    }
  }

  /**
   * Отправляет результаты анкетирования администратору
   */
  async notifySurveyResults(userData) {
    const shouldSend = this.shouldSendNotification(userData);
    
    if (!shouldSend.send) {
      console.log(`📵 Уведомление о результатах заблокировано: ${shouldSend.reason}`);
      return;
    }

    try {
      let message = this.templates.generateSurveyResultsMessage(userData);
      const keyboard = this.templates.generateSurveyResultsKeyboard(userData);

      if (shouldSend.forceTest) {
        message = `🧪 **ТЕСТОВЫЕ РЕЗУЛЬТАТЫ** 🧪\n\n${message}`;
      }

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log(`✅ Результаты анкетирования отправлены администратору: ${userData.userInfo?.telegram_id}`);
      this.analytics.updateStats(userData.analysisResult?.segment, 'survey_results');

    } catch (error) {
      console.error('❌ Ошибка отправки результатов анкетирования:', error);
      this.analytics.logError('survey_results_error', error, userData);
    }
  }

  /**
   * Отправляет ежедневную сводку администратору
   */
  async sendDailySummary() {
    if (!this.adminId || this.silentMode) return;

    try {
      const message = this.templates.generateDailySummary(this.dailyStats);
      const keyboard = this.templates.generateDailySummaryKeyboard();

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log('✅ Ежедневная сводка отправлена успешно');
      this.analytics.updateStats(null, 'daily_summary');

    } catch (error) {
      console.error('❌ Ошибка отправки ежедневной сводки:', error);
      this.analytics.logError('daily_summary_error', error);
    }
  }

  /**
   * Отправляет тестовое уведомление
   */
  async sendTestNotification() {
    if (!this.adminId) {
      throw new Error('ADMIN_ID не настроен');
    }

    const testData = this.createTestLeadData();
    
    try {
      const currentMode = this.getNotificationMode();
      
      const message = `🧪 **ТЕСТОВОЕ УВЕДОМЛЕНИЕ** 🧪\n\n` +
        `📊 Текущий режим: ${currentMode.emoji} ${currentMode.mode}\n` +
        `📝 ${currentMode.description}\n\n` +
        this.templates.generateLeadNotification(testData, this.dailyStats);

      const keyboard = this.templates.generateAdminKeyboard(testData);

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log('✅ Тестовое уведомление отправлено');
      return true;

    } catch (error) {
      console.error('❌ Ошибка отправки тестового уведомления:', error);
      throw error;
    }
  }

  // ===== ОБРАБОТКА CALLBACK'ОВ =====

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

  storeLeadData(userId, leadData) {
    if (!this.leadDataStorage) this.leadDataStorage = {};
    this.leadDataStorage[userId] = {
      ...leadData,
      timestamp: new Date().toISOString()
    };
    
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
  }

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

  getStats() {
    const currentMode = this.getNotificationMode();
    
    return {
      daily_stats: this.dailyStats,
      admin_id: this.adminId,
      notifications_enabled: this.enableNotifications,
      current_mode: currentMode,
      settings: {
        test_mode: this.testMode,
        filter_admin_responses: this.filterAdminResponses,
        silent_mode: this.silentMode
      },
      stored_segments_count: Object.keys(this.segmentStorage || {}).length,
      stored_leads_count: Object.keys(this.leadDataStorage || {}).length,
      analytics: this.analytics.getStats(),
      last_updated: new Date().toISOString()
    };
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  createTestLeadData() {
    return {
      userInfo: {
        telegram_id: this.adminId,
        first_name: 'Тест Администратора',
        username: 'admin_test'
      },
      surveyType: 'adult',
      surveyAnswers: {
        age_group: '31-45',
        occupation: 'management',
        stress_level: 8,
        current_problems: ['chronic_stress', 'insomnia'],
        breathing_experience: 'never',
        time_commitment: '10-15_minutes',
        main_goals: ['stress_resistance', 'improve_sleep']
      },
      analysisResult: {
        segment: 'HOT_LEAD',
        scores: {
          total: 85,
          urgency: 90,
          readiness: 80,
          fit: 85
        },
        primaryIssue: 'chronic_stress'
      },
      timestamp: new Date().toISOString()
    };
  }

  cleanupOldData(daysToKeep = 7) {
    if (!this.leadDataStorage) return { cleaned_count: 0 };

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

  exportConfig() {
    const currentMode = this.getNotificationMode();
    
    return {
      name: 'AdminNotificationSystem',
      version: '4.0.0',
      admin_id: this.adminId,
      notifications_enabled: this.enableNotifications,
      current_mode: currentMode,
      settings: {
        test_mode: this.testMode,
        filter_admin_responses: this.filterAdminResponses,
        silent_mode: this.silentMode
      },
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
