// Файл: core/middleware.js - ИСПРАВЛЕННАЯ ВЕРСИЯ с фиксом rate limiting
const { session } = require('telegraf');
const config = require('../config');

class Middleware {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    
    // Статистика использования
    this.stats = {
      totalRequests: 0,
      uniqueUsers: new Set(),
      sessionsCreated: 0,
      errorsHandled: 0,
      startTime: Date.now()
    };

    // ИСПРАВЛЕНО: Более мягкий rate limiting для предотвращения блокировки переходов
    this.rateLimits = new Map();
    this.cleanupInterval = null;
  }

  // Настройка всех middleware
  setup() {
    console.log('🔧 Настройка middleware...');

    // Сессии
    this.setupSessions();
    
    // Логирование и статистика
    this.setupLogging();
    
    // ИСПРАВЛЕНО: Более умный rate limiting
    this.setupImprovedRateLimiting();
    
    // Обработка ошибок middleware
    this.setupErrorHandling();
    
    // Очистка данных
    this.setupCleanup();
    
    console.log('✅ Middleware настроен');
  }

  // Настройка сессий
  setupSessions() {
    this.telegramBot.use(session({
      defaultSession: () => this.getDefaultSession()
    }));

    console.log('✅ Сессии настроены');
  }

  // Настройка логирования
  setupLogging() {
    this.telegramBot.use(async (ctx, next) => {
      const startTime = Date.now();
      const messageText = ctx.message?.text || ctx.callbackQuery?.data || 'callback';
      const userId = ctx.from?.id || 'unknown';
      const username = ctx.from?.username || 'no_username';
      const firstName = ctx.from?.first_name || 'Unknown';

      // Обновляем статистику
      this.updateStats(userId);

      // Логируем запрос
      console.log(`[${new Date().toISOString()}] User ${userId} (@${username}, ${firstName}): ${messageText}`);

      // Проверяем/инициализируем сессию
      if (!ctx.session) {
        console.warn('⚠️ Сессия отсутствует, инициализируем новую');
        ctx.session = this.getDefaultSession();
        this.stats.sessionsCreated++;
      }

      try {
        await next();
        
        // Логируем время выполнения
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.log(`⏱️ Медленный запрос: ${duration}ms для пользователя ${userId}`);
        }
        
      } catch (error) {
        this.stats.errorsHandled++;
        console.error(`❌ Ошибка middleware для пользователя ${userId}:`, error);
        throw error;
      }
    });

    console.log('✅ Логирование настроено');
  }

  // ИСПРАВЛЕНО: Улучшенный rate limiting с учетом типов действий
  setupImprovedRateLimiting() {
    this.telegramBot.use(async (ctx, next) => {
      const userId = ctx.from?.id;
      if (!userId) return next();

      const now = Date.now();
      const userLimits = this.rateLimits.get(userId) || { 
        requests: [], 
        lastRequest: 0,
        actionCounts: {}
      };

      // Очищаем старые запросы (старше 1 минуты)
      userLimits.requests = userLimits.requests.filter(time => now - time < 60000);

      // ИСПРАВЛЕНО: Определяем тип действия
      const actionType = this.getActionType(ctx);
      
      // ИСПРАВЛЕНО: Проверяем лимиты с учетом типа действия
      if (this.checkImprovedRateLimit(ctx, userLimits, now, actionType)) {
        userLimits.requests.push(now);
        userLimits.lastRequest = now;
        
        // Обновляем счетчик для этого типа действия
        if (!userLimits.actionCounts[actionType]) {
          userLimits.actionCounts[actionType] = [];
        }
        userLimits.actionCounts[actionType].push(now);
        
        // Очищаем старые действия этого типа
        userLimits.actionCounts[actionType] = userLimits.actionCounts[actionType]
          .filter(time => now - time < 60000);
        
        this.rateLimits.set(userId, userLimits);
        return next();
      } else {
        console.warn(`🚫 Rate limit для пользователя ${userId}, действие: ${actionType}`);
        await this.handleRateLimitExceeded(ctx, actionType);
      }
    });

    console.log('✅ Улучшенный Rate limiting настроен');
  }

  // ИСПРАВЛЕНО: Более точное определение типа действия
  getActionType(ctx) {
    // Команды
    if (ctx.message?.text?.startsWith('/start')) return 'start_command';
    if (ctx.message?.text?.startsWith('/')) return 'command';
    
    // Callback действия
    if (ctx.callbackQuery?.data) {
      const data = ctx.callbackQuery.data;
      
      // ИСПРАВЛЕНО: Специальные исключения для безопасных переходов
      if (data === 'start_survey' || data === 'start_survey_from_about') return 'start_survey';
      if (data === 'about_survey' || data === 'back_to_main') return 'navigation';
      if (data.startsWith('download_')) return 'download';
      if (data === 'contact_request') return 'contact';
      if (data.includes('_done') || data === 'nav_back') return 'survey_navigation';
      if (data.startsWith('age_') || data.startsWith('prob_') || data.startsWith('stress_')) return 'survey_answer';
      if (data.startsWith('more_materials') || data.startsWith('show_all')) return 'materials';
      if (data === 'close_menu' || data === 'delete_menu') return 'menu_action';
      
      return 'callback';
    }
    
    // Текстовые сообщения
    if (ctx.message?.text) return 'text_message';
    
    return 'unknown';
  }

  // ИСПРАВЛЕНО: Улучшенная проверка лимитов с разными правилами для разных действий
  checkImprovedRateLimit(ctx, userLimits, now, actionType) {
    // ИСПРАВЛЕНО: Более мягкие лимиты для разных типов действий
    const rateLimitRules = {
      start_command: { max: 3, window: 60000 }, // 3 команды /start в минуту
      start_survey: { max: 5, window: 60000 },  // 5 попыток начать анкету в минуту
      navigation: { max: 20, window: 60000 },   // 20 переходов по меню в минуту (УВЕЛИЧЕНО)
      survey_answer: { max: 30, window: 60000 }, // 30 ответов на вопросы в минуту
      survey_navigation: { max: 15, window: 60000 }, // 15 переходов по анкете в минуту
      download: { max: 3, window: 300000 },     // 3 скачивания в 5 минут
      contact: { max: 2, window: 300000 },      // 2 запроса контакта в 5 минут
      materials: { max: 10, window: 60000 },    // 10 переходов по материалам в минуту
      menu_action: { max: 15, window: 60000 },  // 15 действий с меню в минуту
      callback: { max: 25, window: 60000 },     // 25 общих callback в минуту (УВЕЛИЧЕНО)
      text_message: { max: 10, window: 60000 }, // 10 текстовых сообщений в минуту
      command: { max: 5, window: 60000 },       // 5 команд в минуту
      unknown: { max: 15, window: 60000 }       // 15 неизвестных действий в минуту
    };

    const rule = rateLimitRules[actionType] || rateLimitRules.unknown;
    const actionRequests = userLimits.actionCounts[actionType] || [];
    const recentActions = actionRequests.filter(time => now - time < rule.window);

    // ИСПРАВЛЕНО: Проверяем как специфичный лимит для действия, так и общий лимит
    const withinActionLimit = recentActions.length < rule.max;
    const withinGeneralLimit = userLimits.requests.length < 40; // Общий лимит 40 запросов в минуту

    return withinActionLimit && withinGeneralLimit;
  }

  // ИСПРАВЛЕНО: Более информативная обработка превышения лимитов
  async handleRateLimitExceeded(ctx, actionType) {
    const messages = {
      start_command: '⏳ Слишком много команд /start. Подождите минуту.',
      start_survey: '⏳ Подождите немного перед началом новой анкеты.',
      navigation: '⏳ Слишком быстрые переходы по меню. Замедлите темп.',
      survey_answer: '⏳ Отвечайте на вопросы чуть медленнее.',
      download: '⏳ Слишком много запросов на скачивание. Подождите 5 минут.',
      contact: '⏳ Запрос на контакт уже отправлен. Подождите 5 минут.',
      materials: '⏳ Слишком быстро переключаетесь между материалами.',
      default: '⏳ Пожалуйста, подождите немного перед следующим действием.'
    };

    const message = messages[actionType] || messages.default;

    try {
      // ИСПРАВЛЕНО: Используем answerCbQuery для callback запросов, reply для команд
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(message, { show_alert: false });
      } else {
        await ctx.reply(message);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения о rate limit:', error);
    }
  }

  // Настройка обработки ошибок middleware
  setupErrorHandling() {
    this.telegramBot.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        console.error('💥 Ошибка в middleware chain:', {
          error: error.message,
          stack: error.stack,
          user_id: ctx.from?.id,
          message_type: ctx.message ? 'message' : 'callback',
          timestamp: new Date().toISOString()
        });

        // Пытаемся восстановить сессию если она повреждена
        if (error.message.includes('session') || !ctx.session) {
          console.log('🔧 Восстанавливаем поврежденную сессию');
          ctx.session = this.getDefaultSession();
          this.stats.sessionsCreated++;
        }

        throw error; // Передаем ошибку дальше для основного обработчика
      }
    });

    console.log('✅ Обработка ошибок middleware настроена');
  }

  // Настройка очистки данных
  setupCleanup() {
    // Очищаем rate limits каждые 5 минут
    this.cleanupInterval = setInterval(() => {
      this.cleanupRateLimits();
      this.cleanupStats();
    }, 5 * 60 * 1000);

    console.log('✅ Автоочистка данных настроена');
  }

  // Очистка старых rate limits
  cleanupRateLimits() {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, userLimits] of this.rateLimits.entries()) {
      // Удаляем пользователей, которые не активны более 1 часа
      if (now - userLimits.lastRequest > 3600000) {
        this.rateLimits.delete(userId);
        cleaned++;
      } else {
        // Очищаем старые записи у активных пользователей
        userLimits.requests = userLimits.requests.filter(time => now - time < 3600000);
        Object.keys(userLimits.actionCounts).forEach(actionType => {
          userLimits.actionCounts[actionType] = userLimits.actionCounts[actionType]
            .filter(time => now - time < 3600000);
        });
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Очищено ${cleaned} неактивных rate limits`);
    }
  }

  // Очистка статистики
  cleanupStats() {
    // Ограничиваем размер уникальных пользователей (последние 1000)
    if (this.stats.uniqueUsers.size > 1000) {
      const users = Array.from(this.stats.uniqueUsers);
      this.stats.uniqueUsers = new Set(users.slice(-1000));
      console.log('🧹 Очищена статистика уникальных пользователей');
    }
  }

  // Обновление статистики
  updateStats(userId) {
    this.stats.totalRequests++;
    this.stats.uniqueUsers.add(userId);
  }

  // Получение дефолтной сессии
  getDefaultSession() {
    return {
      currentQuestion: null,
      answers: {},
      multipleChoiceSelections: {},
      startTime: Date.now(),
      questionStartTime: Date.now(),  
      completedQuestions: [],
      navigationHistory: [],
      analysisResult: null,
      contactInfo: {},
      sessionId: this.generateSessionId(),
      createdAt: new Date().toISOString(),
      lastActivity: Date.now()
    };
  }

  // Генерация уникального ID сессии
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Валидация сессии
  validateSession(session) {
    if (!session) return false;
    
    const required = ['answers', 'startTime', 'completedQuestions'];
    return required.every(field => session.hasOwnProperty(field));
  }

  // Восстановление поврежденной сессии
  repairSession(session) {
    const defaultSession = this.getDefaultSession();
    
    return {
      ...defaultSession,
      ...session,
      answers: session.answers || {},
      completedQuestions: session.completedQuestions || [],
      multipleChoiceSelections: session.multipleChoiceSelections || {},
      lastActivity: Date.now()
    };
  }

  // Получение статистики middleware
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      requests: {
        total: this.stats.totalRequests,
        unique_users: this.stats.uniqueUsers.size,
        requests_per_minute: Math.round(this.stats.totalRequests / (uptime / 60000))
      },
      sessions: {
        created: this.stats.sessionsCreated,
        active_rate_limits: this.rateLimits.size
      },
      errors: {
        handled: this.stats.errorsHandled,
        error_rate: this.stats.totalRequests > 0 ? 
          (this.stats.errorsHandled / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
      },
      uptime: {
        milliseconds: uptime,
        minutes: Math.round(uptime / 60000),
        hours: Math.round(uptime / 3600000)
      },
      memory: {
        rate_limits_size: this.rateLimits.size,
        unique_users_size: this.stats.uniqueUsers.size
      },
      last_updated: new Date().toISOString()
    };
  }

  // Middleware для логирования специальных событий
  logSpecialEvent(eventType, userId, data = {}) {
    const logEntry = {
      event: eventType,
      timestamp: new Date().toISOString(),
      user_id: userId,
      data: data
    };

    console.log(`📊 СОБЫТИЕ [${eventType}]:`, JSON.stringify(logEntry, null, 2));
  }

  // Middleware для проверки здоровья сессии
  setupHealthCheck() {
    this.telegramBot.use(async (ctx, next) => {
      if (ctx.session) {
        // Обновляем время последней активности
        ctx.session.lastActivity = Date.now();
        
        // Проверяем валидность сессии
        if (!this.validateSession(ctx.session)) {
          console.warn(`⚠️ Невалидная сессия для пользователя ${ctx.from?.id}, восстанавливаем`);
          ctx.session = this.repairSession(ctx.session);
        }
      }
      
      return next();
    });
  }

  // Middleware для отслеживания прогресса анкеты
  setupProgressTracking() {
    this.telegramBot.use(async (ctx, next) => {
      if (ctx.session?.currentQuestion && ctx.callbackQuery) {
        const progress = {
          user_id: ctx.from.id,
          question: ctx.session.currentQuestion,
          action: ctx.callbackQuery.data,
          timestamp: Date.now(),
          session_duration: Date.now() - ctx.session.startTime
        };
        
        this.logSpecialEvent('survey_progress', ctx.from.id, progress);
      }
      
      return next();
    });
  }

  // Получение информации о пользователе для логирования
  getUserInfo(ctx) {
    return {
      id: ctx.from?.id,
      username: ctx.from?.username,
      first_name: ctx.from?.first_name,
      last_name: ctx.from?.last_name,
      language_code: ctx.from?.language_code,
      is_bot: ctx.from?.is_bot
    };
  }

  // Получение информации о сообщении
  getMessageInfo(ctx) {
    if (ctx.message) {
      return {
        type: 'message',
        text: ctx.message.text,
        date: ctx.message.date,
        chat_id: ctx.message.chat.id
      };
    }
    
    if (ctx.callbackQuery) {
      return {
        type: 'callback_query',
        data: ctx.callbackQuery.data,
        message_id: ctx.callbackQuery.message?.message_id,
        chat_id: ctx.callbackQuery.message?.chat?.id
      };
    }
    
    return { type: 'unknown' };
  }

  // Остановка middleware (очистка ресурсов)
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('✅ Автоочистка middleware остановлена');
    }
    
    // Финальная очистка
    this.rateLimits.clear();
    this.stats.uniqueUsers.clear();
    
    console.log('✅ Middleware остановлен и очищен');
  }

  // Экспорт конфигурации middleware
  exportConfig() {
    return {
      name: 'Middleware',
      version: '2.6.0',
      features: {
        sessions: true,
        logging: true,
        improved_rate_limiting: true,
        action_type_detection: true,
        error_handling: true,
        auto_cleanup: true,
        progress_tracking: true,
        health_checks: true
      },
      stats: this.getStats(),
      configuration: {
        cleanup_interval: 5 * 60 * 1000, // 5 минут
        rate_limit_window: 60000, // 1 минута
        session_timeout: 3600000, // 1 час
        max_unique_users: 1000,
        improved_limits: true
      },
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Middleware;
