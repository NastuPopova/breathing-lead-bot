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

    // Rate limiting для предотвращения спама
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
    
    // Rate limiting
    this.setupRateLimiting();
    
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

  // Настройка rate limiting
  setupRateLimiting() {
    this.telegramBot.use(async (ctx, next) => {
      const userId = ctx.from?.id;
      if (!userId) return next();

      const now = Date.now();
      const userLimits = this.rateLimits.get(userId) || { requests: [], lastRequest: 0 };

      // Очищаем старые запросы (старше 1 минуты)
      userLimits.requests = userLimits.requests.filter(time => now - time < 60000);

      // Проверяем лимиты
      if (this.checkRateLimit(ctx, userLimits, now)) {
        userLimits.requests.push(now);
        userLimits.lastRequest = now;
        this.rateLimits.set(userId, userLimits);
        return next();
      } else {
        console.warn(`🚫 Rate limit для пользователя ${userId}`);
        await this.handleRateLimitExceeded(ctx);
      }
    });

    console.log('✅ Rate limiting настроен');
  }

  // Проверка лимитов запросов
  checkRateLimit(ctx, userLimits, now) {
    const messageType = this.getMessageType(ctx);
    const limits = config.RATE_LIMITS || {};

    switch (messageType) {
      case 'start':
        const startLimit = limits.survey_start || { max: 3, window: 60000 };
        return userLimits.requests.length < startLimit.max;
        
      case 'contact':
        const contactLimit = limits.contact_submission || { max: 1, window: 300000 };
        const recentContacts = userLimits.requests.filter(time => now - time < contactLimit.window);
        return recentContacts.length < contactLimit.max;
        
      default:
        // Общий лимит: 30 запросов в минуту
        return userLimits.requests.length < 30;
    }
  }

  // Определение типа сообщения
  getMessageType(ctx) {
    if (ctx.message?.text === '/start' || ctx.callbackQuery?.data === 'start_survey') {
      return 'start';
    }
    if (ctx.callbackQuery?.data === 'contact_request') {
      return 'contact';
    }
    return 'general';
  }

  // Обработка превышения лимитов
  async handleRateLimitExceeded(ctx) {
    const messageType = this.getMessageType(ctx);
    
    let message = '⏳ Пожалуйста, подождите немного перед следующим действием.';
    
    if (messageType === 'start') {
      message = '⏳ Слишком много попыток начать анкету. Подождите минуту.';
    } else if (messageType === 'contact') {
      message = '⏳ Запрос на контакт уже отправлен. Подождите 5 минут.';
    }

    try {
      await ctx.reply(message);
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
      version: '2.5.0',
      features: {
        sessions: true,
        logging: true,
        rate_limiting: true,
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
        max_unique_users: 1000
      },
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Middleware;
