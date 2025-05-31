// Файл: modules/admin/handlers/leads_handler.js
// Обработчики команд для работы с лидами

const config = require('../../../config');

class LeadsHandler {
  constructor(bot, adminNotifications) {
    this.bot = bot;
    this.telegramBot = bot.bot;
    this.adminNotifications = adminNotifications;
    this.adminId = config.ADMIN_ID;
    
    // Статистика команд работы с лидами
    this.leadsHandlerStats = {
      totalCommands: 0,
      commandsUsed: {},
      lastCommand: null,
      leadsProcessed: new Set(),
      searchQueries: 0
    };
  }

  /**
   * Настройка команд для работы с лидами
   */
  setupCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, команды лидов отключены');
      return;
    }

    console.log('🔧 Настройка команд работы с лидами...');
    
    this.telegramBot.command('hot_leads', this.checkAdmin(this.handleHotLeadsCommand.bind(this)));
    this.telegramBot.command('today_leads', this.checkAdmin(this.handleTodayLeadsCommand.bind(this)));
    this.telegramBot.command('search_lead', this.checkAdmin(this.handleSearchLeadCommand.bind(this)));
    
    console.log('✅ Команды работы с лидами настроены');
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
      
      this.trackLeadsUsage(ctx.message.text);
      return handler(ctx);
    };
  }

  /**
   * Обработка команды /hot_leads
   */
  async handleHotLeadsCommand(ctx) {
    console.log(`🔥 Команда /hot_leads от админа ${ctx.from.id}`);
    
    try {
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

      // Отмечаем как просмотренные
      leads.forEach(lead => {
        if (lead.userInfo?.telegram_id) {
          this.leadsHandlerStats.leadsProcessed.add(lead.userInfo.telegram_id);
        }
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
      this.leadsHandlerStats.errors = (this.leadsHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при получении горячих лидов');
    }
  }

  /**
   * Обработка команды /today_leads
   */
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

      // Статистика по сегментам
      message += `📊 *РАСПРЕДЕЛЕНИЕ:*\n`;
      Object.entries(bySegment).forEach(([segment, segmentLeads]) => {
        const emoji = this.getSegmentEmoji(segment);
        const percentage = ((segmentLeads.length / leads.length) * 100).toFixed(1);
        message += `${emoji} ${segment}: ${segmentLeads.length} (${percentage}%)\n`;
      });
      message += `\n`;

      // Детали по сегментам
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
      this.leadsHandlerStats.errors = (this.leadsHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при получении лидов за сегодня');
    }
  }

  /**
   * Обработка команды /search_lead
   */
  async handleSearchLeadCommand(ctx) {
    console.log(`🔍 Команда /search_lead от админа ${ctx.from.id}`);
    this.leadsHandlerStats.searchQueries++;
    
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
          `❌ *Ничего не найдено*\n\nПо запросу "${searchTerm}" лидов не найдено.\n\n` +
          `💡 *Попробуйте:*\n` +
          `• Проверить правильность написания\n` +
          `• Использовать часть имени или проблемы\n` +
          `• Поискать по ID или username`,
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
        const score = lead.analysisResult?.scores?.total || 0;
        
        message += `${index + 1}. **${user?.first_name || 'Неизвестно'}**\n`;
        message += `   🆔 ID: \`${user?.telegram_id}\`\n`;
        message += `   📊 Сегмент: ${this.getSegmentEmoji(segment)} ${segment}\n`;
        message += `   🎯 Балл: ${score}/100\n`;
        message += `   ⏰ ${timeAgo}\n\n`;
      });

      if (results.length > 5) {
        message += `... и еще ${results.length - 5} результатов\n\n`;
        message += `📋 Для полного списка используйте более точный запрос`;
      }

      // Добавляем статистику поиска
      message += `\n🔍 *Поиск #${this.leadsHandlerStats.searchQueries}*`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Новый поиск', callback_data: 'admin_search' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Ошибка handleSearchLeadCommand:', error);
      this.leadsHandlerStats.errors = (this.leadsHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при поиске лидов');
    }
  }

  /**
   * Обработка команд для внешнего вызова
   */
  async handleCommand(ctx, commandName) {
    console.log(`🔍 Обработка команды работы с лидами: ${commandName}`);
    
    try {
      switch (commandName) {
        case 'hot_leads':
          await this.handleHotLeadsCommand(ctx);
          break;
        case 'today_leads':
          await this.handleTodayLeadsCommand(ctx);
          break;
        case 'search_lead':
          await this.handleSearchLeadCommand(ctx);
          break;
        default:
          console.warn('⚠️ Неизвестная команда лидов:', commandName);
          await ctx.reply('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка выполнения команды лидов:', error);
      this.leadsHandlerStats.errors = (this.leadsHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при выполнении команды');
    }
  }

  // ===== ПОИСК И АНАЛИТИКА =====

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

      // Поиск по переводу проблемы
      const translatedIssue = this.translateIssue(analysis.primaryIssue);
      if (translatedIssue && translatedIssue.toLowerCase().includes(term)) {
        return true;
      }

      return false;
    }).sort((a, b) => {
      // Сортируем по релевантности (сначала точные совпадения ID)
      const aUser = a.userInfo || {};
      const bUser = b.userInfo || {};
      
      if (aUser.telegram_id && aUser.telegram_id.toString() === term) return -1;
      if (bUser.telegram_id && bUser.telegram_id.toString() === term) return 1;
      
      // Затем по времени (новые первые)
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
  }

// ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  trackLeadsUsage(command) {
    this.leadsHandlerStats.totalCommands++;
    this.leadsHandlerStats.lastCommand = {
      command: command,
      timestamp: new Date().toISOString()
    };
    
    if (!this.leadsHandlerStats.commandsUsed[command]) {
      this.leadsHandlerStats.commandsUsed[command] = 0;
    }
    this.leadsHandlerStats.commandsUsed[command]++;
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
      'sleep_problems': 'Проблемы со сном',
      'tantrums': 'Частые истерики',
      'nightmares': 'Кошмары',
      'separation_anxiety': 'Страх разлуки',
      'social_difficulties': 'Сложности в общении',
      'aggression': 'Агрессивное поведение'
    };
    return translations[issue] || issue || 'Не указано';
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
   * Получение расширенной статистики по лидам
   */
  getLeadsAnalytics() {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    
    const analytics = {
      total_leads: leads.length,
      by_segment: {},
      by_hour: {},
      by_day: {},
      search_queries: this.leadsHandlerStats.searchQueries,
      processed_leads: this.leadsHandlerStats.leadsProcessed.size
    };

    // Анализ по сегментам
    leads.forEach(lead => {
      const segment = lead.analysisResult?.segment || 'UNKNOWN';
      analytics.by_segment[segment] = (analytics.by_segment[segment] || 0) + 1;

      // Анализ по часам
      if (lead.timestamp) {
        const hour = new Date(lead.timestamp).getHours();
        analytics.by_hour[hour] = (analytics.by_hour[hour] || 0) + 1;

        // Анализ по дням
        const day = new Date(lead.timestamp).toDateString();
        analytics.by_day[day] = (analytics.by_day[day] || 0) + 1;
      }
    });

    return analytics;
  }

  /**
   * Получение топ проблем лидов
   */
  getTopIssues(limit = 5) {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    const issueCounts = {};

    leads.forEach(lead => {
      const issue = lead.analysisResult?.primaryIssue;
      if (issue) {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      }
    });

    return Object.entries(issueCounts)
      .map(([issue, count]) => ({
        issue: issue,
        translated: this.translateIssue(issue),
        count: count,
        percentage: leads.length > 0 ? ((count / leads.length) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Получение статистики конверсии
   */
  getConversionStats() {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    const totalLeads = leads.length;
    
    if (totalLeads === 0) {
      return {
        total_leads: 0,
        hot_conversion: 0,
        warm_conversion: 0,
        average_score: 0
      };
    }

    const hotLeads = leads.filter(lead => lead.analysisResult?.segment === 'HOT_LEAD').length;
    const warmLeads = leads.filter(lead => lead.analysisResult?.segment === 'WARM_LEAD').length;
    
    const scores = leads
      .map(lead => lead.analysisResult?.scores?.total)
      .filter(score => typeof score === 'number');
    
    const averageScore = scores.length > 0 ? 
      scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    return {
      total_leads: totalLeads,
      hot_conversion: ((hotLeads / totalLeads) * 100).toFixed(1),
      warm_conversion: ((warmLeads / totalLeads) * 100).toFixed(1),
      quality_conversion: (((hotLeads + warmLeads) / totalLeads) * 100).toFixed(1),
      average_score: averageScore.toFixed(1)
    };
  }

  /**
   * Получение статистики обработчика
   */
  getStats() {
    const analytics = this.getLeadsAnalytics();
    const conversionStats = this.getConversionStats();
    const topIssues = this.getTopIssues(3);

    return {
      name: 'LeadsHandler',
      total_commands: this.leadsHandlerStats.totalCommands,
      commands_used: this.leadsHandlerStats.commandsUsed,
      last_command: this.leadsHandlerStats.lastCommand,
      search_queries: this.leadsHandlerStats.searchQueries,
      leads_processed: this.leadsHandlerStats.leadsProcessed.size,
      errors: this.leadsHandlerStats.errors || 0,
      analytics: analytics,
      conversion_stats: conversionStats,
      top_issues: topIssues,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage(),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Экспорт данных лидов для анализа
   */
  exportLeadsData() {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {});
    
    return leads.map(lead => ({
      telegram_id: lead.userInfo?.telegram_id,
      first_name: lead.userInfo?.first_name,
      username: lead.userInfo?.username,
      timestamp: lead.timestamp,
      segment: lead.analysisResult?.segment,
      score: lead.analysisResult?.scores?.total,
      urgency: lead.analysisResult?.scores?.urgency,
      readiness: lead.analysisResult?.scores?.readiness,
      fit: lead.analysisResult?.scores?.fit,
      primary_issue: lead.analysisResult?.primaryIssue,
      survey_type: lead.surveyType,
      age_group: lead.surveyAnswers?.age_group || lead.surveyAnswers?.child_age_detail,
      stress_level: lead.surveyAnswers?.stress_level,
      problems: Array.isArray(lead.surveyAnswers?.current_problems) ? 
        lead.surveyAnswers.current_problems.join(', ') : 
        lead.surveyAnswers?.current_problems,
      processed: this.leadsHandlerStats.leadsProcessed.has(lead.userInfo?.telegram_id)
    }));
  }

  /**
   * Получение отчета о работе с лидами
   */
  generateLeadsReport() {
    const stats = this.getStats();
    const exportData = this.exportLeadsData();
    
    return {
      generated_at: new Date().toISOString(),
      handler_stats: stats,
      leads_data: exportData,
      summary: {
        total_leads_in_system: exportData.length,
        commands_executed: stats.total_commands,
        search_queries_made: stats.search_queries,
        leads_processed: stats.leads_processed,
        conversion_rate: stats.conversion_stats.hot_conversion + '%',
        top_issue: stats.top_issues[0]?.translated || 'Нет данных'
      }
    };
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    console.log('🧹 Очистка LeadsHandler...');
    console.log('📊 Статистика команд лидов:', JSON.stringify(this.getStats(), null, 2));
    
    // Очищаем множество обработанных лидов
    this.leadsHandlerStats.leadsProcessed.clear();
    
    console.log('✅ LeadsHandler очищен');
  }
}

module.exports = LeadsHandler;