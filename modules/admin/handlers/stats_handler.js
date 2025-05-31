// Файл: modules/admin/handlers/stats_handler.js
// Обработчики команд статистики и аналитики

const config = require('../../../config');

class StatsHandler {
  constructor(bot, adminNotifications) {
    this.bot = bot;
    this.telegramBot = bot.bot;
    this.adminNotifications = adminNotifications;
    this.adminId = config.ADMIN_ID;
    
    // Статистика команд статистики
    this.statsHandlerStats = {
      totalRequests: 0,
      commandsUsed: {},
      lastRequest: null,
      analyticsRuns: 0
    };
  }

  /**
   * Настройка команд статистики
   */
  setupCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, команды статистики отключены');
      return;
    }

    console.log('🔧 Настройка команд статистики...');
    
    this.telegramBot.command('stats', this.checkAdmin(this.handleStatsCommand.bind(this)));
    this.telegramBot.command('analytics', this.checkAdmin(this.handleAnalyticsCommand.bind(this)));
    
    console.log('✅ Команды статистики настроены');
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
      
      this.trackStatsUsage(ctx.message.text);
      return handler(ctx);
    };
  }

  /**
   * Обработка команды /stats
   */
  async handleStatsCommand(ctx) {
    console.log(`📊 Команда /stats от админа ${ctx.from.id}`);
    
    try {
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
      message += `• Статистических запросов: ${this.statsHandlerStats.totalRequests}\n`;
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
      this.statsHandlerStats.errors = (this.statsHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при получении статистики');
    }
  }

  /**
   * Обработка команды /analytics
   */
  async handleAnalyticsCommand(ctx) {
    console.log(`📈 Команда /analytics от админа ${ctx.from.id}`);
    this.statsHandlerStats.analyticsRuns++;
    
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

      // Временная аналитика
      const timeAnalysis = this.analyzeTimePatterns(leadsData);
      message += `\n⏰ *ВРЕМЕННЫЕ ПАТТЕРНЫ:*\n`;
      message += `• Пиковый час: ${timeAnalysis.peakHour}:00\n`;
      message += `• Активных дней: ${timeAnalysis.activeDays}\n`;
      message += `• Средняя активность: ${timeAnalysis.averagePerDay.toFixed(1)} лидов/день\n`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
          [{ text: '📋 Экспорт данных', callback_data: 'admin_export' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleAnalyticsCommand:', error);
      this.statsHandlerStats.errors = (this.statsHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при получении аналитики');
    }
  }

  /**
   * Обработка команд для внешнего вызова
   */
  async handleCommand(ctx, commandName) {
    console.log(`🔍 Обработка команды статистики: ${commandName}`);
    
    try {
      switch (commandName) {
        case 'stats':
          await this.handleStatsCommand(ctx);
          break;
        case 'analytics':
          await this.handleAnalyticsCommand(ctx);
          break;
        default:
          console.warn('⚠️ Неизвестная команда статистики:', commandName);
          await ctx.reply('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка выполнения команды статистики:', error);
      this.statsHandlerStats.errors = (this.statsHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при выполнении команды');
    }
  }

  // ===== АНАЛИТИЧЕСКИЕ МЕТОДЫ =====

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

  analyzeTimePatterns(leadsData) {
    const leads = Object.values(leadsData);
    const hourCounts = {};
    const dayCounts = {};

    leads.forEach(lead => {
      if (lead.timestamp) {
        const date = new Date(lead.timestamp);
        const hour = date.getHours();
        const day = date.toDateString();

        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    // Находим пиковый час
    let peakHour = 0;
    let maxHourCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = parseInt(hour);
      }
    });

    const activeDays = Object.keys(dayCounts).length;
    const averagePerDay = activeDays > 0 ? leads.length / activeDays : 0;

    return {
      peakHour,
      activeDays,
      averagePerDay,
      hourDistribution: hourCounts,
      dayDistribution: dayCounts
    };
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  trackStatsUsage(command) {
    this.statsHandlerStats.totalRequests++;
    this.statsHandlerStats.lastRequest = {
      command: command,
      timestamp: new Date().toISOString()
    };
    
    if (!this.statsHandlerStats.commandsUsed[command]) {
      this.statsHandlerStats.commandsUsed[command] = 0;
    }
    this.statsHandlerStats.commandsUsed[command]++;
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

  getDefaultBotStats() {
    return {
      requests: { total: 0, unique_users: 0 },
      sessions: { created: 0 },
      errors: { handled: 0 }
    };
  }

  /**
   * Получение статистики обработчика
   */
  getStats() {
    return {
      name: 'StatsHandler',
      total_requests: this.statsHandlerStats.totalRequests,
      commands_used: this.statsHandlerStats.commandsUsed,
      last_request: this.statsHandlerStats.lastRequest,
      analytics_runs: this.statsHandlerStats.analyticsRuns,
      errors: this.statsHandlerStats.errors || 0,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage(),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    console.log('🧹 Очистка StatsHandler...');
    console.log('📊 Статистика команд статистики:', JSON.stringify(this.getStats(), null, 2));
    console.log('✅ StatsHandler очищен');
  }
}

module.exports = StatsHandler;