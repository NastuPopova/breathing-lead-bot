// Файл: modules/admin/handlers/main_handler.js
// ИСПРАВЛЕННАЯ ВЕРСИЯ без ошибок Markdown

const config = require('../../../config');

class MainHandler {
  constructor(bot, adminNotifications) {
    this.bot = bot;
    this.telegramBot = bot.bot;
    this.adminNotifications = adminNotifications;
    this.adminId = config.ADMIN_ID;
    
    // Статистика основных команд
    this.mainHandlerStats = {
      totalCommands: 0,
      commandsUsed: {},
      lastCommand: null,
      panelViews: 0,
      modeToggles: 0
    };
  }

  setupCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, основные команды отключены');
      return;
    }

    console.log('🔧 Настройка основных админ-команд...');
    
    this.telegramBot.command('admin', this.checkAdmin(this.handleMainCommand.bind(this)));
    
    console.log('✅ Основные админ-команды настроены');
  }

  checkAdmin(handler) {
    return async (ctx) => {
      if (ctx.from.id.toString() !== this.adminId) {
        await ctx.reply('🚫 Доступ запрещен');
        return;
      }
      
      this.trackCommandUsage(ctx.message.text);
      return handler(ctx);
    };
  }

  /**
   * Главная команда админ-панели с кнопкой управления уведомлениями
   */
  async handleMainCommand(ctx) {
    console.log(`🎛️ Команда /admin от админа ${ctx.from.id}`);
    this.mainHandlerStats.panelViews++;
    
    try {
      const stats = this.adminNotifications?.getStats?.() || this.getDefaultStats();
      const currentMode = this.adminNotifications?.getNotificationMode?.() || this.getDefaultMode();
      const uptime = Math.round(process.uptime() / 3600);

      let message = `🎛️ *АДМИНИСТРАТИВНАЯ ПАНЕЛЬ*\n\n`;
      message += `👨‍💼 Админ: ${ctx.from.first_name}\n`;
      message += `⏱️ Время работы: ${uptime}ч\n`;
      message += `📊 Лидов сегодня: ${stats.daily_stats?.totalLeads || 0}\n`;
      message += `🔥 Горячих: ${stats.daily_stats?.hotLeads || 0}\n\n`;
      
      // Информация о режиме уведомлений
      message += `🔔 *Режим уведомлений:*\n`;
      message += `${currentMode.emoji} ${currentMode.description}\n\n`;
      
      message += `🕐 *Последняя активность:*\n`;
      message += `• Последний лид: ${this.getLastLeadTime()}\n`;
      message += `• Доступ к панели: ${this.formatTime(this.mainHandlerStats.lastCommand?.timestamp)}\n\n`;
      
      message += `⚡ *Быстрые действия:*`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔥 Горячие лиды', callback_data: 'admin_hot_leads' },
            { text: '📊 Статистика', callback_data: 'admin_stats' }
          ],
          [
            { text: '📋 Все лиды сегодня', callback_data: 'admin_today_leads' },
            { text: '🔍 Поиск лида', callback_data: 'admin_search' }
          ],
          [
            { text: '📈 Аналитика', callback_data: 'admin_analytics' },
            { text: '🔧 Система', callback_data: 'admin_system' }
          ],
          [
            { text: currentMode.buttonText, callback_data: 'admin_toggle_notifications' },
            { text: '🧪 Тест уведомления', callback_data: 'admin_test_notification' }
          ],
          [
            { text: '⚙️ Настройки', callback_data: 'admin_settings' },
            { text: '📤 Экспорт', callback_data: 'admin_export' }
          ],
          [
            { text: '🆘 Помощь', callback_data: 'admin_help' },
            { text: '🔄 Обновить', callback_data: 'admin_refresh' }
          ]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleMainCommand:', error);
      this.mainHandlerStats.errors = (this.mainHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при загрузке админ-панели');
    }
  }

  /**
   * Обработка переключения режима уведомлений
   */
  async handleToggleNotifications(ctx) {
    console.log(`🔔 Переключение режима уведомлений от админа ${ctx.from.id}`);
    this.mainHandlerStats.modeToggles++;
    
    try {
      if (!this.adminNotifications) {
        await ctx.answerCbQuery('Система уведомлений недоступна');
        return;
      }

      const oldMode = this.adminNotifications.getNotificationMode();
      const newMode = this.adminNotifications.toggleNotificationMode();
      
      // ИСПРАВЛЕНО: Убираны двойные звездочки, используем только одинарные
      let message = `🔄 *РЕЖИМ УВЕДОМЛЕНИЙ ИЗМЕНЕН*\n\n`;
      message += `📤 Было: ${oldMode.emoji} ${oldMode.mode}\n`;
      message += `📥 Стало: ${newMode.emoji} ${newMode.mode}\n\n`;
      message += `📝 ${newMode.description}\n\n`;
      
      // Добавляем подсказки по режимам
      message += `💡 *Доступные режимы:*\n`;
      message += `🔇 Тихий - никаких уведомлений\n`;
      message += `🔒 Фильтр - только от других пользователей\n`;
      message += `🧪 Тест - все уведомления (включая свои)\n`;
      message += `🔓 Все - без фильтров\n\n`;
      
      message += `🔄 Нажмите кнопку еще раз для следующего режима`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: newMode.buttonText, callback_data: 'admin_toggle_notifications' },
              { text: '🧪 Тест уведомления', callback_data: 'admin_test_notification' }
            ],
            [
              { text: '📊 Статус уведомлений', callback_data: 'admin_notification_status' },
              { text: '🎛️ Главная панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });

      await ctx.answerCbQuery(`${newMode.emoji} ${newMode.mode}`);

    } catch (error) {
      console.error('❌ Ошибка handleToggleNotifications:', error);
      await ctx.answerCbQuery('Ошибка переключения режима');
      await ctx.reply('Произошла ошибка при переключении режима уведомлений');
    }
  }

  /**
   * Отправка тестового уведомления
   */
  async handleTestNotification(ctx) {
    console.log(`🧪 Тест уведомления от админа ${ctx.from.id}`);
    
    try {
      if (!this.adminNotifications) {
        await ctx.answerCbQuery('Система уведомлений недоступна');
        return;
      }

      await ctx.answerCbQuery('Отправляю тестовое уведомление...');

      await this.adminNotifications.sendTestNotification();

      const message = `🧪 *ТЕСТОВОЕ УВЕДОМЛЕНИЕ ОТПРАВЛЕНО*\n\n` +
        `✅ Проверьте чат - должно прийти тестовое сообщение\n` +
        `📊 Текущий режим: ${this.adminNotifications.getNotificationMode().emoji} ${this.adminNotifications.getNotificationMode().mode}\n\n` +
        `💡 Если уведомление не пришло, проверьте:\n` +
        `• Настройки режима уведомлений\n` +
        `• ADMIN_ID в переменных окружения\n` +
        `• Подключение к Telegram API`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще тест', callback_data: 'admin_test_notification' },
              { text: '🔔 Режим', callback_data: 'admin_toggle_notifications' }
            ],
            [
              { text: '🎛️ Главная панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка handleTestNotification:', error);
      await ctx.answerCbQuery('Ошибка отправки тестового уведомления');
      
      const errorMessage = `❌ *ОШИБКА ТЕСТОВОГО УВЕДОМЛЕНИЯ*\n\n` +
        `🚫 Не удалось отправить тестовое уведомление\n` +
        `📝 Ошибка: ${error.message}\n\n` +
        `🔧 Возможные причины:\n` +
        `• ADMIN_ID не настроен\n` +
        `• Проблемы с Telegram API\n` +
        `• Ошибка в системе уведомлений`;

      await ctx.editMessageText(errorMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔧 Диагностика', callback_data: 'admin_detailed_diagnostics' },
              { text: '🎛️ Главная панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });
    }
  }

  /**
   * Показ детального статуса уведомлений
   */
  async handleNotificationStatus(ctx) {
    console.log(`📊 Статус уведомлений от админа ${ctx.from.id}`);
    
    try {
      if (!this.adminNotifications) {
        await ctx.editMessageText('❌ Система уведомлений недоступна');
        return;
      }

      const mode = this.adminNotifications.getNotificationMode();
      const stats = this.adminNotifications.getStats();
      
      // ИСПРАВЛЕНО: Убираны двойные звездочки
      let message = `📊 *ДЕТАЛЬНЫЙ СТАТУС УВЕДОМЛЕНИЙ*\n\n`;
      
      message += `${mode.emoji} *Текущий режим:* ${mode.mode}\n`;
      message += `📝 ${mode.description}\n\n`;
      
      message += `⚙️ *Настройки:*\n`;
      message += `• Уведомления включены: ${stats.notifications_enabled ? '✅' : '❌'}\n`;
      message += `• Тестовый режим: ${stats.settings.test_mode ? '✅' : '❌'}\n`;
      message += `• Фильтр администратора: ${stats.settings.filter_admin_responses ? '✅' : '❌'}\n`;
      message += `• Тихий режим: ${stats.settings.silent_mode ? '✅' : '❌'}\n`;
      message += `• Admin ID: ${stats.admin_id || 'не настроен'}\n\n`;
      
      message += `📈 *Статистика:*\n`;
      message += `• Лидов в системе: ${stats.stored_leads_count}\n`;
      message += `• Всего сегодня: ${stats.daily_stats.totalLeads}\n`;
      message += `• 🔥 Горячих: ${stats.daily_stats.hotLeads}\n`;
      message += `• ⭐ Теплых: ${stats.daily_stats.warmLeads}\n`;
      message += `• ❄️ Холодных: ${stats.daily_stats.coldLeads}\n`;
      message += `• 🌱 Взращивание: ${stats.daily_stats.nurtureLeads}\n\n`;
      
      if (stats.analytics) {
        message += `📊 *Аналитика уведомлений:*\n`;
        message += `• Всего отправлено: ${stats.analytics.notifications?.totalSent || 0}\n`;
        message += `• Успешных: ${stats.analytics.notifications?.successful || 0}\n`;
        message += `• Ошибок: ${stats.analytics.notifications?.failed || 0}\n`;
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Изменить режим', callback_data: 'admin_toggle_notifications' },
              { text: '🧪 Тест', callback_data: 'admin_test_notification' }
            ],
            [
              { text: '📊 Аналитика', callback_data: 'admin_analytics' },
              { text: '🔧 Диагностика', callback_data: 'admin_detailed_diagnostics' }
            ],
            [
              { text: '🎛️ Главная панель', callback_data: 'admin_main' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка handleNotificationStatus:', error);
      await ctx.reply('Произошла ошибка при получении статуса уведомлений');
    }
  }

  /**
   * Обработка команд для внешнего вызова
   */
  async handleCommand(ctx, commandName) {
    console.log(`🔍 Обработка основной админ-команды: ${commandName}`);
    
    try {
      switch (commandName) {
        case 'admin':
          await this.handleMainCommand(ctx);
          break;
        default:
          console.warn('⚠️ Неизвестная основная команда:', commandName);
          await ctx.reply('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка выполнения основной команды:', error);
      this.mainHandlerStats.errors = (this.mainHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при выполнении команды');
    }
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  trackCommandUsage(command) {
    this.mainHandlerStats.totalCommands++;
    this.mainHandlerStats.lastCommand = {
      command: command,
      timestamp: new Date().toISOString()
    };
    
    if (!this.mainHandlerStats.commandsUsed[command]) {
      this.mainHandlerStats.commandsUsed[command] = 0;
    }
    this.mainHandlerStats.commandsUsed[command]++;
  }

  getDefaultStats() {
    return {
      daily_stats: { 
        totalLeads: 0, 
        hotLeads: 0, 
        warmLeads: 0, 
        coldLeads: 0, 
        nurtureLeads: 0 
      }
    };
  }

  getDefaultMode() {
    return {
      mode: 'filtered',
      description: 'Фильтр включен - собственные ответы администратора игнорируются',
      emoji: '🔒',
      buttonText: '🧪 Тестовый режим'
    };
  }

  getLastLeadTime() {
    const leadsData = Object.values(this.adminNotifications?.leadDataStorage || {});
    if (!leadsData.length) return 'Нет данных';
    
    const latest = leadsData.reduce((latest, lead) => {
      const leadTime = new Date(lead.timestamp || 0);
      const latestTime = new Date(latest.timestamp || 0);
      return leadTime > latestTime ? lead : latest;
    }, leadsData[0]);
    
    return this.getTimeAgo(latest.timestamp);
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

  formatTime(timestamp) {
    if (!timestamp) return 'Никогда';
    return new Date(timestamp).toLocaleString('ru-RU');
  }

  /**
   * Получение статистики обработчика
   */
  getStats() {
    return {
      name: 'MainHandler',
      total_commands: this.mainHandlerStats.totalCommands,
      commands_used: this.mainHandlerStats.commandsUsed,
      last_command: this.mainHandlerStats.lastCommand,
      panel_views: this.mainHandlerStats.panelViews,
      mode_toggles: this.mainHandlerStats.modeToggles,
      errors: this.mainHandlerStats.errors || 0,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage(),
      last_updated: new Date().toISOString()
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

  /**
   * Очистка ресурсов
   */
  cleanup() {
    console.log('🧹 Очистка MainHandler...');
    console.log('📊 Статистика основных команд:', JSON.stringify(this.getStats(), null, 2));
    console.log('✅ MainHandler очищен');
  }
}

module.exports = MainHandler;
