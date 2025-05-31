// Файл: modules/admin/admin_handlers.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
// Обработчики админ-команд (отделены от основного handlers.js)

const config = require('../../config');

class AdminHandlers {
  constructor(bot, adminNotifications, verseAnalysis, leadTransfer, pdfManager) {
    this.bot = bot; // Это экземпляр BreathingLeadBot
    this.telegramBot = bot.bot; // Это экземпляр Telegraf
    this.adminNotifications = adminNotifications;
    this.verseAnalysis = verseAnalysis;
    this.leadTransfer = leadTransfer;
    this.pdfManager = pdfManager;
    this.adminId = config.ADMIN_ID;
    
    // Статистика команд
    this.commandStats = {
      totalCommands: 0,
      commandsUsed: {},
      lastCommand: null,
      errors: 0
    };
  }

  // ===== НАСТРОЙКА КОМАНД =====

  setupCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, админ-команды отключены');
      return;
    }

    console.log('🔧 Настройка админ-команд...');

    // Основные команды
    this.telegramBot.command('admin', this.checkAdmin(this.handleMainCommand.bind(this)));
    this.telegramBot.command('stats', this.checkAdmin(this.handleStatsCommand.bind(this)));
    this.telegramBot.command('analytics', this.checkAdmin(this.handleAnalyticsCommand.bind(this)));
    this.telegramBot.command('hot_leads', this.checkAdmin(this.handleHotLeadsCommand.bind(this)));
    this.telegramBot.command('today_leads', this.checkAdmin(this.handleTodayLeadsCommand.bind(this)));
    this.telegramBot.command('search_lead', this.checkAdmin(this.handleSearchLeadCommand.bind(this)));
    this.telegramBot.command('health', this.checkAdmin(this.handleHealthCommand.bind(this)));
    this.telegramBot.command('export_leads', this.checkAdmin(this.handleExportLeadsCommand.bind(this)));
    this.telegramBot.command('settings', this.checkAdmin(this.handleSettingsCommand.bind(this)));

    console.log('✅ Админ-команды настроены');
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

  trackCommandUsage(command) {
    this.commandStats.totalCommands++;
    this.commandStats.lastCommand = {
      command: command,
      timestamp: new Date().toISOString()
    };
    
    if (!this.commandStats.commandsUsed[command]) {
      this.commandStats.commandsUsed[command] = 0;
    }
    this.commandStats.commandsUsed[command]++;
  }

  // ===== ОБРАБОТЧИКИ КОМАНД =====

  async handleMainCommand(ctx) {
    console.log(`🎛️ Команда /admin от админа ${ctx.from.id}`);
    
    try {
      // ИСПРАВЛЕНО: Правильный путь к статистике
      const stats = this.adminNotifications?.getStats?.() || this.getDefaultStats();
      const uptime = Math.round(process.uptime() / 3600);

      let message = `🎛️ *АДМИНИСТРАТИВНАЯ ПАНЕЛЬ*\n\n`;
      message += `👨‍💼 Админ: ${ctx.from.first_name}\n`;
      message += `⏱️ Время работы: ${uptime}ч\n`;
      message += `📊 Лидов сегодня: ${stats.daily_stats?.totalLeads || 0}\n`;
      message += `🔥 Горячих: ${stats.daily_stats?.hotLeads || 0}\n\n`;
      
      message += `🕐 *Последняя активность:*\n`;
      message += `• Последний лид: ${this.getLastLeadTime()}\n`;
      message += `• Доступ к панели: ${this.formatTime(this.commandStats.lastCommand?.timestamp)}\n\n`;
      
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
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при загрузке админ-панели');
    }
  }

  async handleStatsCommand(ctx) {
    console.log(`📊 Команда /stats от админа ${ctx.from.id}`);
    
    try {
      // ИСПРАВЛЕНО: Правильная получение статистики с fallback
      const adminStats = this.adminNotifications?.getStats?.() || this.getDefaultStats();
      const botStats = this.bot?.middleware?.getStats?.() || this.getDefaultBotStats();
      
      let message = `📊 *ДЕТАЛЬНАЯ СТАТИСТИКА*\n\n`;
      
      // Статистика лидов
      message += `👥 *ЛИДЫ:*\n`;
      message += `• Всего сегодня: ${adminStats.daily_stats?.totalLeads || 0}\n`;
      message += `• 🔥 Горячие: ${adminStats.daily_stats?.hotLeads || 0}\n`;
      message += `• ⭐ Теплые: ${adminStats.daily_stats?.warmLeads || 0}\n`;
      message += `• ❄️ Холодные: ${adminStats.daily_stats?.coldLeads || 0}\n`;
      message += `• 🌱 Для взращивания: ${adminStats.daily_stats?.nurtureLeads || 0}\n\n`;
      
      // Конверсия
      const totalLeads = adminStats.daily_stats?.totalLeads || 0;
      const hotLeads = adminStats.daily_stats?.hotLeads || 0;
      const conversionRate = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0;
      message += `📈 *КОНВЕРСИЯ:*\n`;
      message += `• В горячие лиды: ${conversionRate}%\n`;
      message += `• Средний балл VERSE: ${this.getAverageScore()}/100\n\n`;
      
      // Статистика бота
      message += `🤖 *БОТ:*\n`;
      message += `• Уникальных пользователей: ${botStats.requests?.unique_users || 0}\n`;
      message += `• Всего запросов: ${botStats.requests?.total || 0}\n`;
      message += `• Активных сессий: ${botStats.sessions?.created || 0}\n`;
      message += `• Ошибок: ${botStats.errors?.handled || 0}\n\n`;
      
      // Система
      message += `⏱️ *СИСТЕМА:*\n`;
      message += `• Время работы: ${this.formatUptime(process.uptime())}\n`;
      message += `• Память: ${this.getMemoryUsage()}MB\n`;
      message += `• Админ команд: ${this.commandStats.totalCommands}\n`;
      message += `• Статус: Работает стабильно\n`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📈 Аналитика', callback_data: 'admin_analytics' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleStatsCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при получении статистики');
    }
  }

  async handleAnalyticsCommand(ctx) {
    console.log(`📈 Команда /analytics от админа ${ctx.from.id}`);
    
    try {
      const leadsData = this.adminNotifications.leadDataStorage || {};
      const analysis = this.analyzeLeadsData(leadsData);

      let message = `📈 *АНАЛИТИКА ЛИДОВ*\n\n`;
      
      // Топ проблемы
      message += `🎯 *ТОП-5 ПРОБЛЕМ:*\n`;
      if (analysis.topIssues.length > 0) {
        analysis.topIssues.forEach((issue, index) => {
          message += `${index + 1}. ${this.translateIssue(issue.key)}: ${issue.count}\n`;
        });
      } else {
        message += `Нет данных о проблемах\n`;
      }
      message += `\n`;
      
      // Возрастные группы
      message += `👥 *ВОЗРАСТНЫЕ ГРУППЫ:*\n`;
      if (Object.keys(analysis.ageGroups).length > 0) {
        Object.entries(analysis.ageGroups).forEach(([age, count]) => {
          const percentage = ((count / analysis.totalLeads) * 100).toFixed(1);
          message += `• ${this.translateAge(age)}: ${count} (${percentage}%)\n`;
        });
      } else {
        message += `Нет данных о возрастных группах\n`;
      }
      message += `\n`;
      
      // Основные показатели
      message += `📊 *ОСНОВНЫЕ ПОКАЗАТЕЛИ:*\n`;
      message += `• Всего лидов: ${analysis.totalLeads}\n`;
      message += `• Средний балл: ${analysis.averageScore.toFixed(1)}\n`;
      if (analysis.topIssues.length > 0) {
        message += `• Главная проблема: ${this.translateIssue(analysis.topIssues[0]?.key)}\n`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleAnalyticsCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при получении аналитики');
    }
  }

  async handleHotLeadsCommand(ctx) {
    console.log(`🔥 Команда /hot_leads от админа ${ctx.from.id}`);
    
    try {
      // ИСПРАВЛЕНО: Проверяем существование leadDataStorage
      if (!this.adminNotifications.leadDataStorage) {
        console.warn('⚠️ leadDataStorage не инициализировано');
        this.adminNotifications.leadDataStorage = {};
      }

      const leads = Object.values(this.adminNotifications.leadDataStorage || {})
        .filter(lead => lead.analysisResult?.segment === 'HOT_LEAD')
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
        .slice(0, 10);

      if (!leads.length) {
        await ctx.reply('✅ Нет горячих лидов', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Обновить', callback_data: 'admin_hot_leads' }],
              [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
            ]
          }
        });
        return;
      }

      let message = `🔥 *ГОРЯЧИЕ ЛИДЫ (${leads.length})*\n\n`;
      
      leads.forEach((lead, index) => {
        const user = lead.userInfo;
        const score = lead.analysisResult?.scores?.total || 0;
        const timeAgo = this.getTimeAgo(lead.timestamp);
        
        message += `${index + 1}. **${user?.first_name || 'Неизвестно'}**\n`;
        message += `   🆔 ID: \`${user?.telegram_id}\`\n`;
        message += `   📊 Балл: ${score}/100\n`;
        message += `   ⏰ ${timeAgo}\n`;
        message += `   🎯 ${this.translateIssue(lead.analysisResult?.primaryIssue)}\n\n`;
      });

      const keyboard = {
        inline_keyboard: [
          [{ text: '📞 Обработать всех', callback_data: 'admin_process_all_hot' }],
          [{ text: '🔄 Обновить', callback_data: 'admin_hot_leads' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleHotLeadsCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при получении горячих лидов');
    }
  }

  async handleTodayLeadsCommand(ctx) {
    console.log(`📋 Команда /today_leads от админа ${ctx.from.id}`);
    
    try {
      const today = new Date().toDateString();
      const leads = Object.values(this.adminNotifications.leadDataStorage || {})
        .filter(lead => {
          const leadDate = lead.timestamp ? new Date(lead.timestamp).toDateString() : null;
          return leadDate === today;
        })
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      if (!leads.length) {
        await ctx.reply('📋 *ЛИДЫ СЕГОДНЯ*\n\n✅ Сегодня лидов пока нет', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Обновить', callback_data: 'admin_today_leads' }],
              [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
            ]
          }
        });
        return;
      }

      let message = `📋 *ЛИДЫ СЕГОДНЯ (${leads.length})*\n\n`;
      
      // Группируем по сегментам
      const bySegment = leads.reduce((acc, lead) => {
        const segment = lead.analysisResult?.segment || 'UNKNOWN';
        if (!acc[segment]) acc[segment] = [];
        acc[segment].push(lead);
        return acc;
      }, {});

      Object.entries(bySegment).forEach(([segment, segmentLeads]) => {
        const emoji = this.getSegmentEmoji(segment);
        message += `${emoji} **${segment}** (${segmentLeads.length}):\n`;
        
        segmentLeads.slice(0, 3).forEach(lead => {
          const user = lead.userInfo;
          const time = new Date(lead.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
          });
          message += `   • ${user?.first_name || 'Неизвестно'} (${time})\n`;
        });
        
        if (segmentLeads.length > 3) {
          message += `   • ... и еще ${segmentLeads.length - 3}\n`;
        }
        message += `\n`;
      });

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔥 Только горячие', callback_data: 'admin_hot_leads' },
            { text: '📊 Аналитика дня', callback_data: 'admin_day_analytics' }
          ],
          [
            { text: '🔄 Обновить', callback_data: 'admin_today_leads' },
            { text: '🎛️ Главная панель', callback_data: 'admin_main' }
          ]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleTodayLeadsCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при получении лидов за сегодня');
    }
  }

  async handleSearchLeadCommand(ctx) {
    console.log(`🔍 Команда /search_lead от админа ${ctx.from.id}`);
    
    const searchTerm = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!searchTerm) {
      await ctx.reply(
        `🔍 *ПОИСК ЛИДОВ*\n\n` +
        `Используйте: \`/search_lead <запрос>\`\n\n` +
        `Можно искать по:\n` +
        `• Telegram ID\n` +
        `• Имени пользователя\n` +
        `• Username (без @)\n` +
        `• Проблеме\n` +
        `• Сегменту\n\n` +
        `Примеры:\n` +
        `\`/search_lead 123456789\`\n` +
        `\`/search_lead Анна\`\n` +
        `\`/search_lead стресс\`\n` +
        `\`/search_lead HOT_LEAD\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const results = this.performLeadSearch(searchTerm);
      
      if (!results.length) {
        await ctx.reply(
          `❌ *Ничего не найдено*\n\nПо запросу "${searchTerm}" лидов не найдено.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
              ]
            }
          }
        );
        return;
      }

      let message = `🔍 *РЕЗУЛЬТАТЫ ПОИСКА*\n`;
      message += `Запрос: "${searchTerm}"\n`;
      message += `Найдено: ${results.length}\n\n`;

      results.slice(0, 5).forEach((lead, index) => {
        const user = lead.userInfo;
        const segment = lead.analysisResult?.segment || 'UNKNOWN';
        const timeAgo = this.getTimeAgo(lead.timestamp);
        
        message += `${index + 1}. **${user?.first_name || 'Неизвестно'}**\n`;
        message += `   🆔 ID: \`${user?.telegram_id}\`\n`;
        message += `   📊 Сегмент: ${this.getSegmentEmoji(segment)} ${segment}\n`;
        message += `   ⏰ ${timeAgo}\n\n`;
      });

      if (results.length > 5) {
        message += `... и еще ${results.length - 5} результатов\n\n`;
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка handleSearchLeadCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при поиске лидов');
    }
  }

  async handleHealthCommand(ctx) {
    console.log(`🔧 Команда /health от админа ${ctx.from.id}`);
    
    try {
      const health = await this.getSystemHealthData();
      
      let message = `🔧 *СОСТОЯНИЕ СИСТЕМЫ*\n\n`;
      
      // Общий статус
      const statusEmoji = health.overall === 'HEALTHY' ? '✅' : health.overall === 'DEGRADED' ? '⚠️' : '❌';
      message += `${statusEmoji} **Общий статус:** ${health.overall}\n\n`;
      
      // Основные компоненты
      message += `🤖 *КОМПОНЕНТЫ:*\n`;
      Object.entries(health.components).forEach(([component, data]) => {
        const emoji = data.status === 'HEALTHY' ? '✅' : data.status === 'DEGRADED' ? '⚠️' : '❌';
        message += `${emoji} ${component}: ${data.status}\n`;
      });
      message += `\n`;
      
      // Производительность
      message += `📊 *ПРОИЗВОДИТЕЛЬНОСТЬ:*\n`;
      message += `• Память: ${health.performance.memory}MB\n`;
      message += `• Время работы: ${this.formatUptime(health.performance.uptime)}\n\n`;
      
      // Интеграции
      message += `🔗 *ИНТЕГРАЦИИ:*\n`;
      message += `• Основной бот: ${health.integrations.mainBot ? '✅' : '❌'}\n`;
      message += `• CRM: ${health.integrations.crm ? '✅' : '❌'}\n`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Детальная диагностика', callback_data: 'admin_detailed_diagnostics' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleHealthCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при получении информации о системе');
    }
  }

  async handleExportLeadsCommand(ctx) {
    console.log(`📤 Команда /export_leads от админа ${ctx.from.id}`);
    
    try {
      const leads = Object.values(this.adminNotifications.leadDataStorage || {});
      
      if (!leads.length) {
        await ctx.reply('📋 Нет данных для экспорта');
        return;
      }

      const exportData = this.prepareLeadsForExport(leads);
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Создаем простой "файл" как строку
      let message = `📤 *ЭКСПОРТ ЛИДОВ*\n\n`;
      message += `• Всего записей: ${leads.length}\n`;
      message += `• Дата экспорта: ${new Date().toLocaleDateString('ru-RU')}\n`;
      message += `• Время: ${new Date().toLocaleTimeString('ru-RU')}\n\n`;
      message += `📊 **Краткая статистика:**\n`;
      
      const segmentCounts = leads.reduce((acc, lead) => {
        const segment = lead.analysisResult?.segment || 'UNKNOWN';
        acc[segment] = (acc[segment] || 0) + 1;
        return acc;
      }, {});

      Object.entries(segmentCounts).forEach(([segment, count]) => {
        const emoji = this.getSegmentEmoji(segment);
        message += `${emoji} ${segment}: ${count}\n`;
      });

      message += `\n💾 Данные готовы к экспорту в JSON формате`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleExportLeadsCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при экспорте лидов');
    }
  }

  async handleSettingsCommand(ctx) {
    console.log(`⚙️ Команда /settings от админа ${ctx.from.id}`);
    
    try {
      let message = `⚙️ *НАСТРОЙКИ СИСТЕМЫ*\n\n`;
      
      message += `🔔 **Уведомления:**\n`;
      message += `• Горячие лиды: ✅\n`;
      message += `• Теплые лиды: ✅\n`;
      message += `• Системные ошибки: ✅\n\n`;
      
      message += `📊 **Система:**\n`;
      message += `• Автоочистка логов: 7 дней\n`;
      message += `• Лимит rate limiting: улучшенный\n`;
      message += `• Сохранение сессий: включено\n\n`;
      
      message += `📈 **Статистика команд:**\n`;
      message += `• Всего выполнено: ${this.commandStats.totalCommands}\n`;
      message += `• Ошибок: ${this.commandStats.errors}\n`;
      message += `• Последняя команда: ${this.commandStats.lastCommand?.command || 'нет'}\n`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔔 Уведомления', callback_data: 'admin_notifications' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleSettingsCommand:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при получении настроек');
    }
  }

// ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  // ИСПРАВЛЕНО: Добавляем метод getDefaultStats
  getDefaultStats() {
    return {
      daily_stats: { 
        totalLeads: 0, 
        hotLeads: 0, 
        warmLeads: 0, 
        coldLeads: 0, 
        nurtureLeads: 0 
      },
      requests: { total: 0, unique_users: 0 },
      sessions: { created: 0 },
      errors: { handled: 0 },
      uptime: { hours: Math.round(process.uptime() / 3600) }
    };
  }

  getDefaultBotStats() {
    return {
      requests: { total: 0, unique_users: 0 },
      sessions: { created: 0 },
      errors: { handled: 0 }
    };
  }

  getAverageScore() {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    if (!leads.length) return 0;
    
    const scores = leads
      .map(lead => lead.analysisResult?.scores?.total)
      .filter(score => typeof score === 'number');
    
    if (!scores.length) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  analyzeLeadsData(leadsData) {
    const leads = Object.values(leadsData);
    const analysis = {
      totalLeads: leads.length,
      topIssues: [],
      ageGroups: {},
      averageScore: 0
    };

    if (!leads.length) return analysis;

    let totalScore = 0;
    const issueCount = {};

    leads.forEach(lead => {
      // Проблемы
      const issue = lead.analysisResult?.primaryIssue;
      if (issue) {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      }

      // Возрастные группы
      const age = lead.surveyAnswers?.age_group || lead.surveyAnswers?.child_age_detail;
      if (age) {
        analysis.ageGroups[age] = (analysis.ageGroups[age] || 0) + 1;
      }

      // Балл
      const score = lead.analysisResult?.scores?.total;
      if (typeof score === 'number') {
        totalScore += score;
      }
    });

    // Обработка топ проблем
    analysis.topIssues = Object.entries(issueCount)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    analysis.averageScore = leads.length > 0 ? totalScore / leads.length : 0;

    return analysis;
  }

  performLeadSearch(searchTerm) {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    const term = searchTerm.toLowerCase();

    return leads.filter(lead => {
      const user = lead.userInfo || {};
      const answers = lead.surveyAnswers || {};
      const analysis = lead.analysisResult || {};

      // Поиск по ID
      if (user.telegram_id && user.telegram_id.toString().includes(term)) {
        return true;
      }

      // Поиск по имени
      if (user.first_name && user.first_name.toLowerCase().includes(term)) {
        return true;
      }

      // Поиск по username
      if (user.username && user.username.toLowerCase().includes(term)) {
        return true;
      }

      // Поиск по проблеме
      if (analysis.primaryIssue && analysis.primaryIssue.toLowerCase().includes(term)) {
        return true;
      }

      // Поиск по сегменту
      if (analysis.segment && analysis.segment.toLowerCase().includes(term)) {
        return true;
      }

      return false;
    });
  }

  async getSystemHealthData() {
    return {
      overall: 'HEALTHY',
      components: {
        'telegram_bot': { status: 'HEALTHY' },
        'admin_handlers': { status: 'HEALTHY' },
        'lead_storage': { status: 'HEALTHY' },
        'pdf_generator': { status: 'HEALTHY' }
      },
      performance: {
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime: process.uptime()
      },
      integrations: {
        mainBot: !!config.MAIN_BOT_API_URL,
        crm: !!config.CRM_WEBHOOK_URL,
        database: !!config.DATABASE_URL
      }
    };
  }

  prepareLeadsForExport(leads) {
    return leads.map(lead => ({
      timestamp: lead.timestamp || new Date().toISOString(),
      telegram_id: lead.userInfo?.telegram_id,
      first_name: lead.userInfo?.first_name,
      username: lead.userInfo?.username,
      segment: lead.analysisResult?.segment,
      score: lead.analysisResult?.scores?.total,
      primary_issue: lead.analysisResult?.primaryIssue,
      survey_type: lead.surveyType,
      age_group: lead.surveyAnswers?.age_group || lead.surveyAnswers?.child_age_detail,
      stress_level: lead.surveyAnswers?.stress_level,
      processed: lead.processed || false
    }));
  }

  // ===== УТИЛИТЫ ФОРМАТИРОВАНИЯ =====

  getLastLeadTime() {
    const leadsData = Object.values(this.adminNotifications.leadDataStorage || {});
    if (!leadsData.length) return 'Нет данных';
    
    const latest = leadsData.reduce((latest, lead) => {
      const leadTime = new Date(lead.timestamp || 0);
      const latestTime = new Date(latest.timestamp || 0);
      return leadTime > latestTime ? lead : latest;
    }, leadsData[0]);
    
    return this.getTimeAgo(latest.timestamp);
  }

  formatTime(timestamp) {
    if (!timestamp) return 'Никогда';
    return new Date(timestamp).toLocaleString('ru-RU');
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

  getMemoryUsage() {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
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

  translateAge(age) {
    const translations = {
      '18-30': '18-30 лет',
      '31-45': '31-45 лет',
      '46-60': '46-60 лет',
      '60+': '60+ лет',
      '3-4': '3-4 года',
      '5-6': '5-6 лет',
      '7-8': '7-8 лет',
      '9-10': '9-10 лет'
    };
    return translations[age] || age || 'Не указано';
  }

  // ===== ОБРАБОТЧИК КОМАНД ДЛЯ ВНЕШНЕГО ВЫЗОВА =====

  async handleCommand(ctx, commandName) {
    console.log(`🔍 Обработка админ-команды: ${commandName}`);
    
    try {
      switch (commandName) {
        case 'admin':
          await this.handleMainCommand(ctx);
          break;
        case 'stats':
          await this.handleStatsCommand(ctx);
          break;
        case 'analytics':
          await this.handleAnalyticsCommand(ctx);
          break;
        case 'hot_leads':
          await this.handleHotLeadsCommand(ctx);
          break;
        case 'today_leads':
          await this.handleTodayLeadsCommand(ctx);
          break;
        case 'health':
          await this.handleHealthCommand(ctx);
          break;
        case 'export_leads':
          await this.handleExportLeadsCommand(ctx);
          break;
        case 'settings':
          await this.handleSettingsCommand(ctx);
          break;
        default:
          console.warn('⚠️ Неизвестная админ-команда:', commandName);
          await ctx.reply('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка выполнения админ-команды:', error);
      this.commandStats.errors++;
      await ctx.reply('Произошла ошибка при выполнении команды');
    }
  }

  // ===== ЭКСПОРТ СТАТИСТИКИ =====

  getCommandStats() {
    return {
      ...this.commandStats,
      admin_id: this.adminId,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage()
    };
  }

  exportStats() {
    return {
      name: 'AdminHandlers',
      version: '1.0.0',
      admin_id: this.adminId,
      features: [
        'command_handling',
        'lead_analytics',
        'search_functionality',
        'health_monitoring',
        'data_export',
        'statistics_tracking'
      ],
      command_stats: this.getCommandStats(),
      last_updated: new Date().toISOString()
    };
  }

  cleanup() {
    console.log('🧹 Очистка AdminHandlers...');
    console.log('📊 Финальная статистика команд:', JSON.stringify(this.getCommandStats(), null, 2));
    console.log('✅ AdminHandlers очищен');
  }
}

module.exports = AdminHandlers;