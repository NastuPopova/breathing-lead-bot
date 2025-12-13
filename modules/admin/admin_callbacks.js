// Файл: modules/admin/admin_callbacks.js - РЕФАКТОРИРОВАННАЯ ВЕРСИЯ
// Координатор callback'ов администратора (использует модульную архитектуру)

const NavigationCallbacks = require('./callbacks/navigation_callbacks');
const StatsCallbacks = require('./callbacks/stats_callbacks');
const LeadsCallbacks = require('./callbacks/leads_callbacks');
const SystemCallbacks = require('./callbacks/system_callbacks');
const config = require('../../config');

class AdminCallbacks {
  constructor(adminHandlers, adminNotifications, verseAnalysis, leadTransfer) {
    this.adminHandlers = adminHandlers;
    this.adminNotifications = adminNotifications;
    this.verseAnalysis = verseAnalysis;
    this.leadTransfer = leadTransfer;
    this.adminId = config.ADMIN_ID;
    
    // Инициализируем модульные обработчики
    this.navigationCallbacks = new NavigationCallbacks(adminHandlers, adminNotifications);
    this.statsCallbacks = new StatsCallbacks(adminHandlers, adminNotifications);
    this.leadsCallbacks = new LeadsCallbacks(adminHandlers, adminNotifications);
    this.systemCallbacks = new SystemCallbacks(adminHandlers, adminNotifications);
    
    // Статистика общих callback'ов
    this.callbackStats = {
      totalCallbacks: 0,
      callbacksUsed: {},
      lastCallback: null,
      errors: 0,
      moduleStats: {
        navigation: 0,
        stats: 0,
        leads: 0,
        system: 0,
        other: 0
      }
    };

    console.log('✅ AdminCallbacks инициализирован с модульной архитектурой');
  }

  // ===== НАСТРОЙКА CALLBACK ОБРАБОТЧИКОВ =====

  setupCallbacks(bot) {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, админ-callbacks отключены');
      return;
    }

    console.log('🔧 Настройка модульных админ-callback обработчиков...');
    this.bot = bot;
    console.log('✅ Админ-callbacks настроены');
  }

  // ===== ОСНОВНОЙ ОБРАБОТЧИК CALLBACK'ОВ =====

  // ✅ НОВЫЙ handleCallback с логом и защитой от падений
async handleCallback(ctx, callbackData) {
  console.log('🔍 CALLBACK ПОЙМАН:', callbackData, 'from', ctx.from.id);

  if (ctx.from.id.toString() !== this.adminId) {
    await ctx.answerCbQuery('🚫 Доступ запрещен');
    return;
  }

  await ctx.answerCbQuery().catch(() => {});

  try {
    this.trackCallbackUsage(callbackData);

    // Маршрутизация по модулям
    const handled = await this.routeCallbackToModules(ctx, callbackData);

    if (!handled) {
      // Параметризованные callback'ы
      if (callbackData.includes('_') && callbackData.startsWith('admin_')) {
        await this.handleParameterizedCallback(ctx, callbackData);
      } else {
        console.warn('⚠️ Неизвестный админ callback:', callbackData);
        await ctx.reply('Неизвестная команда', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
            ]
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Ошибка handleCallback:', error);
    this.callbackStats.errors++;
    await ctx.reply('Произошла ошибка при выполнении действия', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      }
    });
  }
}

  // ===== МАРШРУТИЗАЦИЯ ПО МОДУЛЯМ =====

  async routeCallbackToModules(ctx, callbackData) {
    try {
      // Навигационные callback'ы
      if (await this.navigationCallbacks.handleCallback(ctx, callbackData)) {
        this.callbackStats.moduleStats.navigation++;
        return true;
      }

      // Статистика и аналитика
      if (await this.statsCallbacks.handleCallback(ctx, callbackData)) {
        this.callbackStats.moduleStats.stats++;
        return true;
      }

      // Работа с лидами
      if (await this.leadsCallbacks.handleCallback(ctx, callbackData)) {
        this.callbackStats.moduleStats.leads++;
        return true;
      }

      // Системные функции
      if (await this.systemCallbacks.handleCallback(ctx, callbackData)) {
        this.callbackStats.moduleStats.system++;
        return true;
      }

      // Не обработано ни одним модулем
      this.callbackStats.moduleStats.other++;
      return false;

    } catch (error) {
      console.error('❌ Ошибка маршрутизации callback:', error);
      this.callbackStats.errors++;
      throw error;
    }
  }

  // ===== ОБРАБОТКА ПАРАМЕТРИЗОВАННЫХ CALLBACK'ОВ =====

  async handleParameterizedCallback(ctx, callbackData) {
    console.log(`🔍 Обработка параметризованного callback: ${callbackData}`);
    
    // Парсим callback типа admin_action_userId
    const parts = callbackData.split('_');
    if (parts.length < 3) {
      console.warn('⚠️ Неправильный формат callback:', callbackData);
      await ctx.reply('Неправильный формат команды');
      return;
    }

    const action = parts.slice(1, -1).join('_');
    const targetUserId = parts[parts.length - 1];
    
    console.log(`🔍 Parsed callback: action=${action}, userId=${targetUserId}`);
    
    // Проверяем, есть ли обработчик в notification handlers
    if (this.adminNotifications?.handlers) {
      try {
        await this.adminNotifications.handlers.handleCallback(ctx, action, targetUserId);
        return;
      } catch (error) {
        console.error('❌ Ошибка обработки через notification handlers:', error);
      }
    }

    // Fallback - базовые действия
    switch (action) {
      case 'view_lead':
        await this.viewLeadDetails(ctx, targetUserId);
        break;
      case 'contact_lead':
        await this.contactLead(ctx, targetUserId);
        break;
      case 'mark_processed':
        await this.markLeadProcessed(ctx, targetUserId);
        break;
      default:
        console.warn('⚠️ Неизвестное действие:', action);
        await ctx.reply('Неизвестное действие');
    }
  }

  // ===== БАЗОВЫЕ ДЕЙСТВИЯ С ЛИДАМИ =====

  async viewLeadDetails(ctx, userId) {
    const leadData = this.adminNotifications.leadDataStorage?.[userId];
    if (!leadData) {
      await ctx.reply('Лид не найден');
      return;
    }

    let message = `👤 *ДЕТАЛИ ЛИДА*\n\n`;
    message += `🆔 ID: ${userId}\n`;
    message += `👤 Имя: ${leadData.userInfo?.first_name || 'Неизвестно'}\n`;
    message += `📊 Сегмент: ${this.getSegmentEmoji(leadData.analysisResult?.segment)} ${leadData.analysisResult?.segment}\n`;
    message += `🎯 Проблема: ${this.translateIssue(leadData.analysisResult?.primaryIssue)}\n`;
    message += `⏰ Время: ${this.getTimeAgo(leadData.timestamp)}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'admin_main' }]
        ]
      }
    });
  }

  async contactLead(ctx, userId) {
    const leadData = this.adminNotifications.leadDataStorage?.[userId];
    if (!leadData) {
      await ctx.reply('Лид не найден');
      return;
    }

    let message = `📞 *КОНТАКТ С ЛИДОМ*\n\n`;
    message += `👤 ${leadData.userInfo?.first_name || 'Неизвестно'}\n`;
    if (leadData.userInfo?.username) {
      message += `💬 @${leadData.userInfo.username}\n`;
    }
    message += `🆔 ID: ${userId}\n\n`;
    message += `✅ Отмечено как "Связались"`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 К лидам', callback_data: 'admin_hot_leads' }]
        ]
      }
    });
  }

  async markLeadProcessed(ctx, userId) {
    let message = `✅ *ЛИД ОБРАБОТАН*\n\n`;
    message += `👤 ID: ${userId}\n`;
    message += `🕐 Обработан: ${new Date().toLocaleString('ru-RU')}\n\n`;
    message += `📊 Статус: Закрыт`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 К лидам', callback_data: 'admin_hot_leads' }]
        ]
      }
    });
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  trackCallbackUsage(callbackData) {
    this.callbackStats.totalCallbacks++;
    this.callbackStats.lastCallback = {
      callback: callbackData,
      timestamp: new Date().toISOString()
    };
    
    if (!this.callbackStats.callbacksUsed[callbackData]) {
      this.callbackStats.callbacksUsed[callbackData] = 0;
    }
    this.callbackStats.callbacksUsed[callbackData]++;
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

  translateIssue(issue) {
    const translations = {
      'chronic_stress': 'Хронический стресс',
      'anxiety': 'Тревожность',
      'insomnia': 'Бессонница',
      'breathing_issues': 'Проблемы с дыханием',
      'high_pressure': 'Высокое давление',
      'fatigue': 'Усталость',
      'hyperactivity': 'Гиперактивность',
      'sleep_problems': 'Проблемы со сном'
    };
    return translations[issue] || issue || 'Не указано';
  }

  getTimeAgo(timestamp) {
    if (!timestamp) return 'Неизвестно';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн назад`;
  }

  // ===== ЭКСПОРТ СТАТИСТИКИ =====

  getCallbackStats() {
    const moduleStats = {
      navigation: this.navigationCallbacks.getStats(),
      stats: this.statsCallbacks.getStats(),
      leads: this.leadsCallbacks.getStats(),
      system: this.systemCallbacks.getStats()
    };

    return {
      ...this.callbackStats,
      admin_id: this.adminId,
      module_statistics: moduleStats,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage()
    };
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}д ${remainingHours}ч ${minutes}м`;
    }
    
    return `${hours}ч ${minutes}м`;
  }

  getMemoryUsage() {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  }

  exportCallbackInfo() {
    return {
      name: 'AdminCallbacks',
      version: '2.0.0', // Увеличили версию после рефакторинга
      architecture: 'modular',
      admin_id: this.adminId,
      modules: [
        'navigation_callbacks',
        'stats_callbacks', 
        'leads_callbacks',
        'system_callbacks'
      ],
      features: [
        'modular_architecture',
        'callback_routing',
        'parameterized_callbacks',
        'module_statistics',
        'error_handling',
        'fallback_processing'
      ],
      callback_stats: this.getCallbackStats(),
      last_updated: new Date().toISOString()
    };
  }

  cleanup() {
    console.log('🧹 Очистка модульных AdminCallbacks...');
    
    // Очищаем все модули
    this.navigationCallbacks.cleanup();
    this.statsCallbacks.cleanup();
    this.leadsCallbacks.cleanup();
    this.systemCallbacks.cleanup();
    
    console.log('📊 Финальная статистика callbacks:', JSON.stringify(this.getCallbackStats(), null, 2));
    console.log('✅ Модульные AdminCallbacks очищены');
  }
}

module.exports = AdminCallbacks;
