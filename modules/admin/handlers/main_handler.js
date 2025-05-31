// Файл: modules/admin/handlers/main_handler.js
// Обработчики главной панели и основных команд

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
      panelViews: 0
    };
  }

  /**
   * Настройка основных команд
   */
  setupCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, основные команды отключены');
      return;
    }

    console.log('🔧 Настройка основных админ-команд...');
    
    // Основная команда админ-панели
    this.telegramBot.command('admin', this.checkAdmin(this.handleMainCommand.bind(this)));
    
    console.log('✅ Основные админ-команды настроены');
  }

  /**
   * Проверка прав администратора
   */
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
   * Обработка главной команды /admin
   */
  async handleMainCommand(ctx) {
    console.log(`🎛️ Команда /admin от админа ${ctx.from.id}`);
    this.mainHandlerStats.panelViews++;
    
    try {
      const stats = this.adminNotifications?.getStats?.() || this.getDefaultStats();
      const uptime = Math.round(process.uptime() / 3600);

      let message = `🎛️ *АДМИНИСТРАТИВНАЯ ПАНЕЛЬ*\n\n`;
      message += `👨‍💼 Админ: ${ctx.from.first_name}\n`;
      message += `⏱️ Время работы: ${uptime}ч\n`;
      message += `📊 Лидов сегодня: ${stats.daily_stats?.totalLeads || 0}\n`;
      message += `🔥 Горячих: ${stats.daily_stats?.hotLeads || 0}\n\n`;
      
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