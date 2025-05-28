const { Markup } = require('telegraf');
const config = require('../../config');

class EnhancedAdminPanel {
  constructor(bot, adminNotifications, verseAnalysis, leadTransfer) {
    this.bot = bot;
    this.adminNotifications = adminNotifications;
    this.verseAnalysis = verseAnalysis;
    this.leadTransfer = leadTransfer;
    this.adminId = config.ADMIN_ID;
    
    // Статистика панели
    this.panelStats = {
      lastAccess: null,
      totalSessions: 0,
      commandsUsed: {}
    };

    // Настройки уведомлений
    this.notificationSettings = {
      hotLeads: true,
      warmLeads: true,
      coldLeads: false,
      systemErrors: true,
      dailyReport: true,
      weeklyReport: true
    };
  }

  // ===== ОСНОВНЫЕ АДМИН КОМАНДЫ =====

  setupAdminCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, админ-панель отключена');
      return;
    }

    // Главная панель
    this.bot.command('admin', this.checkAdmin(this.showMainPanel.bind(this)));
    
    // Статистика и аналитика
    this.bot.command('stats', this.checkAdmin(this.showDetailedStats.bind(this)));
    this.bot.command('analytics', this.checkAdmin(this.showAnalytics.bind(this)));
    this.bot.command('leads_report', this.checkAdmin(this.showLeadsReport.bind(this)));
    
    // Управление лидами
    this.bot.command('hot_leads', this.checkAdmin(this.showHotLeads.bind(this)));
    this.bot.command('today_leads', this.checkAdmin(this.showTodayLeads.bind(this)));
    this.bot.command('search_lead', this.checkAdmin(this.searchLead.bind(this)));
    
    // Системные команды
    this.bot.command('health', this.checkAdmin(this.showSystemHealth.bind(this)));
    this.bot.command('logs', this.checkAdmin(this.showRecentLogs.bind(this)));
    this.bot.command('restart_bot', this.checkAdmin(this.restartBot.bind(this)));
    
    // Настройки
    this.bot.command('settings', this.checkAdmin(this.showSettings.bind(this)));
    this.bot.command('notifications', this.checkAdmin(this.manageNotifications.bind(this)));
    
    // Экспорт данных
    this.bot.command('export_leads', this.checkAdmin(this.exportLeads.bind(this)));
    this.bot.command('export_stats', this.checkAdmin(this.exportStats.bind(this)));

    console.log('✅ Админ-команды настроены');
  }

  // Проверка админских прав
  checkAdmin(handler) {
    return async (ctx) => {
      if (ctx.from.id.toString() !== this.adminId) {
        await ctx.reply('🚫 Доступ запрещен');
        return;
      }
      
      this.trackAdminAccess(ctx.message.text);
      return handler(ctx);
    };
  }

  trackAdminAccess(command) {
    this.panelStats.lastAccess = new Date().toISOString();
    this.panelStats.totalSessions++;
    this.panelStats.commandsUsed[command] = (this.panelStats.commandsUsed[command] || 0) + 1;
  }

  // ===== ГЛАВНАЯ АДМИН ПАНЕЛЬ =====

  async showMainPanel(ctx) {
    const stats = this.adminNotifications.getStats();
    const uptime = Math.round(process.uptime() / 3600);

    let message = `🎛️ *АДМИНИСТРАТИВНАЯ ПАНЕЛЬ*\n\n`;
    message += `👨‍💼 Админ: ${ctx.from.first_name}\n`;
    message += `⏱️ Время работы: ${uptime}ч\n`;
    message += `📊 Лидов сегодня: ${stats.daily_stats?.totalLeads || 0}\n`;
    message += `🔥 Горячих: ${stats.daily_stats?.hotLeads || 0}\n\n`;
    
    message += `🕐 *Последняя активность:*\n`;
    message += `• Последний лид: ${this.getLastLeadTime()}\n`;
    message += `• Доступ к панели: ${this.formatTime(this.panelStats.lastAccess)}\n\n`;
    
    message += `⚡ *Быстрые действия:*`;

    const keyboard = [
      [
        Markup.button.callback('🔥 Горячие лиды', 'admin_hot_leads'),
        Markup.button.callback('📊 Статистика', 'admin_stats')
      ],
      [
        Markup.button.callback('📋 Все лиды сегодня', 'admin_today_leads'),
        Markup.button.callback('🔍 Поиск лида', 'admin_search')
      ],
      [
        Markup.button.callback('📈 Аналитика', 'admin_analytics'),
        Markup.button.callback('📄 Отчеты', 'admin_reports')
      ],
      [
        Markup.button.callback('⚙️ Настройки', 'admin_settings'),
        Markup.button.callback('🔧 Система', 'admin_system')
      ],
      [
        Markup.button.callback('📤 Экспорт данных', 'admin_export'),
        Markup.button.callback('🔔 Уведомления', 'admin_notifications_menu')
      ],
      [
        Markup.button.callback('🆘 Помощь', 'admin_help'),
        Markup.button.callback('🔄 Обновить', 'admin_refresh')
      ]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // ===== ДЕТАЛЬНАЯ СТАТИСТИКА =====

  async showDetailedStats(ctx) {
    const stats = this.adminNotifications.getStats();
    const botStats = this.bot.middleware?.getStats() || {};
    
    let message = `📊 *ДЕТАЛЬНАЯ СТАТИСТИКА*\n\n`;
    
    // Статистика лидов
    message += `👥 *ЛИДЫ:*\n`;
    message += `• Всего сегодня: ${stats.daily_stats?.totalLeads || 0}\n`;
    message += `• 🔥 Горячие: ${stats.daily_stats?.hotLeads || 0}\n`;
    message += `• ⭐ Теплые: ${stats.daily_stats?.warmLeads || 0}\n`;
    message += `• ❄️ Холодные: ${stats.daily_stats?.coldLeads || 0}\n`;
    message += `• 🌱 Для взращивания: ${stats.daily_stats?.nurtureLeads || 0}\n\n`;
    
    // Конверсия
    const totalLeads = stats.daily_stats?.totalLeads || 0;
    const hotLeads = stats.daily_stats?.hotLeads || 0;
    const conversionRate = totalLeads > 0 ? ((hotLeaks / totalLeads) * 100).toFixed(1) : 0;
    message += `📈 *КОНВЕРСИЯ:*\n`;
    message += `• В горячие лиды: ${conversionRate}%\n`;
    message += `• Средний балл VERSE: ${this.getAverageScore()}/100\n\n`;
    
    // Статистика бота
    message += `🤖 *БОТ:*\n`;
    message += `• Уникальных пользователей: ${botStats.requests?.unique_users || 0}\n`;
    message += `• Всего запросов: ${botStats.requests?.total || 0}\n`;
    message += `• Активных сессий: ${botStats.sessions?.created || 0}\n`;
    message += `• Ошибок: ${botStats.errors?.handled || 0}\n\n`;
    
    // Время работы
    const uptime = process.uptime();
    message += `⏱️ *СИСТЕМА:*\n`;
    message += `• Время работы: ${this.formatUptime(uptime)}\n`;
    message += `• Последний перезапуск: ${this.getLastRestart()}\n`;
    message += `• Статус: ${this.getSystemStatus()}\n`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📈 Графики', 'admin_charts')],
        [Markup.button.callback('📊 Экспорт статистики', 'admin_export_stats')],
        [Markup.button.callback('🔙 Главная панель', 'admin_main')]
      ])
    });
  }

  // ===== АНАЛИТИКА И ОТЧЕТЫ =====

  async showAnalytics(ctx) {
    const leadsData = this.adminNotifications.leadDataStorage || {};
    const analysis = this.analyzeLeadsData(leadsData);

    let message = `📈 *АНАЛИТИКА ЛИДОВ*\n\n`;
    
    // Топ проблемы
    message += `🎯 *ТОП-5 ПРОБЛЕМ:*\n`;
    analysis.topIssues.forEach((issue, index) => {
      message += `${index + 1}. ${this.translateIssue(issue.key)}: ${issue.count}\n`;
    });
    message += `\n`;
    
    // Возрастные группы
    message += `👥 *ВОЗРАСТНЫЕ ГРУППЫ:*\n`;
    Object.entries(analysis.ageGroups).forEach(([age, count]) => {
      const percentage = ((count / analysis.totalLeads) * 100).toFixed(1);
      message += `• ${this.translateAge(age)}: ${count} (${percentage}%)\n`;
    });
    message += `\n`;
    
    // Временная статистика
    message += `⏰ *ПО ВРЕМЕНИ СУТОК:*\n`;
    Object.entries(analysis.timeDistribution).forEach(([hour, count]) => {
      message += `• ${hour}:00-${hour}:59: ${count} лидов\n`;
    });
    message += `\n`;
    
    // Тренды
    message += `📊 *ТРЕНДЫ:*\n`;
    message += `• Средний балл VERSE: ${analysis.averageScore.toFixed(1)}\n`;
    message += `• Самая частая проблема: ${this.translateIssue(analysis.topIssues[0]?.key)}\n`;
    message += `• Пиковое время: ${analysis.peakHour}:00\n`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📊 Детальный отчет', 'admin_detailed_report')],
        [Markup.button.callback('📈 Тренды недели', 'admin_weekly_trends')],
        [Markup.button.callback('🔙 Главная панель', 'admin_main')]
      ])
    });
  }

  // ===== УПРАВЛЕНИЕ ЛИДАМИ =====

  async showHotLeads(ctx) {
    const leads = Object.values(this.adminNotifications.leadDataStorage || {})
      .filter(lead => lead.analysisResult?.segment === 'HOT_LEAD')
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 10);

    if (!leads.length) {
      await ctx.reply('✅ Нет горячих лидов', {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Главная панель', 'admin_main')]
        ])
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

    const keyboard = [
      [Markup.button.callback('📞 Обработать всех', 'admin_process_all_hot')],
      [Markup.button.callback('📋 Экспорт списка', 'admin_export_hot_leads')],
      [Markup.button.callback('🔄 Обновить', 'admin_hot_leads')],
      [Markup.button.callback('🔙 Главная панель', 'admin_main')]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // ===== ПОИСК ЛИДОВ =====

  async searchLead(ctx) {
    const searchTerm = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!searchTerm) {
      await ctx.reply(
        `🔍 *ПОИСК ЛИДОВ*\n\n` +
        `Используйте: \`/search_lead <запрос>\`\n\n` +
        `Можно искать по:\n` +
        `• Telegram ID\n` +
        `• Имени пользователя\n` +
        `• Username (без @)\n` +
        `• Проблеме\n\n` +
        `Примеры:\n` +
        `\`/search_lead 123456789\`\n` +
        `\`/search_lead Анна\`\n` +
        `\`/search_lead стресс\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const results = this.performLeadSearch(searchTerm);
    
    if (!results.length) {
      await ctx.reply(
        `❌ *Ничего не найдено*\n\nПо запросу "${searchTerm}" лидов не найдено.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Главная панель', 'admin_main')]
          ])
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
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Полный список', 'admin_full_search_results')],
        [Markup.button.callback('🔙 Главная панель', 'admin_main')]
      ])
    });
  }

  // ===== СИСТЕМНОЕ ЗДОРОВЬЕ =====

  async showSystemHealth(ctx) {
    const health = await this.getSystemHealthData();
    
    let message = `🔧 *СОСТОЯНИЕ СИСТЕМЫ*\n\n`;
    
    // Основные компоненты
    message += `🤖 *КОМПОНЕНТЫ:*\n`;
    Object.entries(health.components).forEach(([component, data]) => {
      const emoji = data.status === 'HEALTHY' ? '✅' : data.status === 'DEGRADED' ? '⚠️' : '❌';
      message += `${emoji} ${component}: ${data.status}\n`;
    });
    message += `\n`;
    
    // Производительность
    message += `📊 *ПРОИЗВОДИТЕЛЬНОСТЬ:*\n`;
    message += `• CPU: ${health.performance.cpu}%\n`;
    message += `• Память: ${health.performance.memory}MB\n`;
    message += `• Время отклика: ${health.performance.responseTime}ms\n\n`;
    
    // Интеграции
    message += `🔗 *ИНТЕГРАЦИИ:*\n`;
    message += `• Основной бот: ${health.integrations.mainBot ? '✅' : '❌'}\n`;
    message += `• CRM: ${health.integrations.crm ? '✅' : '❌'}\n`;
    message += `• База данных: ${health.integrations.database ? '✅' : '❌'}\n`;

    const statusEmoji = health.overall === 'HEALTHY' ? '✅' : health.overall === 'DEGRADED' ? '⚠️' : '❌';

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`${statusEmoji} Общий статус: ${health.overall}`, 'admin_detailed_health')],
        [Markup.button.callback('📋 Логи системы', 'admin_logs')],
        [Markup.button.callback('🔄 Тест соединений', 'admin_test_connections')],
        [Markup.button.callback('🔙 Главная панель', 'admin_main')]
      ])
    });
  }

  // ===== ЭКСПОРТ ДАННЫХ =====

  async exportLeads(ctx, format = 'json') {
    try {
      const leads = Object.values(this.adminNotifications.leadDataStorage || {});
      
      if (!leads.length) {
        await ctx.reply('📋 Нет данных для экспорта');
        return;
      }

      const exportData = this.prepareLeadsForExport(leads);
      const fileName = `leads_export_${new Date().toISOString().split('T')[0]}.${format}`;
      
      let fileContent;
      if (format === 'csv') {
        fileContent = this.convertToCSV(exportData);
      } else {
        fileContent = JSON.stringify(exportData, null, 2);
      }

      // Сохраняем временный файл
      const fs = require('fs');
      const filePath = `./temp/${fileName}`;
      
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true });
      }
      
      fs.writeFileSync(filePath, fileContent, 'utf8');

      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption: `📊 Экспорт лидов\n\n• Всего записей: ${leads.length}\n• Формат: ${format.toUpperCase()}\n• Дата: ${new Date().toLocaleDateString('ru-RU')}`,
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Главная панель', 'admin_main')]
          ])
        }
      );

      // Удаляем временный файл через 30 секунд
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error('Ошибка удаления временного файла:', error);
        }
      }, 30000);

    } catch (error) {
      console.error('Ошибка экспорта лидов:', error);
      await ctx.reply('❌ Ошибка экспорта данных');
    }
  }

  // ===== НАСТРОЙКИ =====

  async showSettings(ctx) {
    let message = `⚙️ *НАСТРОЙКИ СИСТЕМЫ*\n\n`;
    
    message += `🔔 *Уведомления:*\n`;
    message += `• Горячие лиды: ${this.notificationSettings.hotLeads ? '✅' : '❌'}\n`;
    message += `• Теплые лиды: ${this.notificationSettings.warmLeads ? '✅' : '❌'}\n`;
    message += `• Холодные лиды: ${this.notificationSettings.coldLeads ? '✅' : '❌'}\n`;
    message += `• Системные ошибки: ${this.notificationSettings.systemErrors ? '✅' : '❌'}\n`;
    message += `• Ежедневный отчет: ${this.notificationSettings.dailyReport ? '✅' : '❌'}\n`;
    message += `• Недельный отчет: ${this.notificationSettings.weeklyReport ? '✅' : '❌'}\n\n`;
    
    message += `📊 *Система:*\n`;
    message += `• Автоочистка логов: 7 дней\n`;
    message += `• Лимит rate limiting: улучшенный\n`;
    message += `• Сохранение сессий: включено\n`;

    const keyboard = [
      [
        Markup.button.callback('🔔 Настроить уведомления', 'admin_notification_settings'),
        Markup.button.callback('⏱️ Настроить таймауты', 'admin_timeout_settings')
      ],
      [
        Markup.button.callback('🗑️ Очистить данные', 'admin_cleanup_data'),
        Markup.button.callback('🔄 Сбросить статистику', 'admin_reset_stats')
      ],
      [
        Markup.button.callback('💾 Резервная копия', 'admin_backup'),
        Markup.button.callback('📤 Экспорт настроек', 'admin_export_settings')
      ],
      [
        Markup.button.callback('🔙 Главная панель', 'admin_main')
      ]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  analyzeLeadsData(leadsData) {
    const leads = Object.values(leadsData);
    const analysis = {
      totalLeads: leads.length,
      topIssues: {},
      ageGroups: {},
      timeDistribution: {},
      averageScore: 0,
      peakHour: 0
    };

    if (!leads.length) return analysis;

    let totalScore = 0;
    const hourCounts = {};

    leads.forEach(lead => {
      // Проблемы
      const issue = lead.analysisResult?.primaryIssue;
      if (issue) {
        analysis.topIssues[issue] = (analysis.topIssues[issue] || 0) + 1;
      }

      // Возрастные группы
      const age = lead.surveyAnswers?.age_group || lead.surveyAnswers?.child_age_detail;
      if (age) {
        analysis.ageGroups[age] = (analysis.ageGroups[age] || 0) + 1;
      }

      // Время
      const timestamp = lead.timestamp || lead.startTime;
      if (timestamp) {
        const hour = new Date(timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }

      // Балл
      const score = lead.analysisResult?.scores?.total;
      if (typeof score === 'number') {
        totalScore += score;
      }
    });

    // Обработка результатов
    analysis.topIssues = Object.entries(analysis.topIssues)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    analysis.averageScore = leads.length > 0 ? totalScore / leads.length : 0;
    
    analysis.peakHour = Object.entries(hourCounts)
      .reduce((max, [hour, count]) => count > (hourCounts[max] || 0) ? hour : max, 0);

    // Распределение по времени (группируем в интервалы)
    Object.entries(hourCounts).forEach(([hour, count]) => {
      const interval = `${hour}`;
      analysis.timeDistribution[interval] = count;
    });

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
        'main_bot_api': { status: 'HEALTHY' },
        'database': { status: 'UNKNOWN' },
        'crm': { status: 'UNKNOWN' }
      },
      performance: {
        cpu: Math.round(Math.random() * 20 + 10), // Заглушка
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        responseTime: Math.round(Math.random() * 100 + 50)
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

  convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  // ===== ФОРМАТИРОВАНИЕ =====

  getLastLeadTime() {
    const leds = Object.values(this.adminNotifications.leadDataStorage || {});
    if (!leads.length) return 'Нет данных';
    
    const latest = leads.reduce((latest, lead) => {
      const leadTime = new Date(lead.timestamp || 0);
      const latestTime = new Date(latest.timestamp || 0);
      return leadTime > latestTime ? lead : latest;
    }, leads[0]);
    
    return this.getTimeAgo(latest.timestamp);
  }

  formatTime(timestamp) {
    if (!timestamp) return 'Никогда';
    return new Date(timestamp).toLocaleString('ru-RU');
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}д ${remainingHours}ч ${minutes}м`;
    }
    
    return `${hours}ч ${minutes}м ${secs}с`;
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

  getLastRestart() {
    return this.formatTime(new Date(Date.now() - process.uptime() * 1000).toISOString());
  }

  getSystemStatus() {
    const uptime = process.uptime();
    if (uptime < 300) return '🟡 Недавний запуск';
    if (uptime < 3600) return '🟢 Стабильная работа';
    return '🟢 Долгая работа';
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
      '9-10': '9-10 лет',
      '11-12': '11-12 лет',
      '13-15': '13-15 лет',
      '16-17': '16-17 лет'
    };
    return translations[age] || age || 'Не указано';
  }

  // ===== CALLBACK ОБРАБОТЧИКИ =====

  setupCallbacks() {
    // Главное меню
    this.bot.action('admin_main', this.checkAdminCallback(this.showMainPanel.bind(this)));
    this.bot.action('admin_refresh', this.checkAdminCallback(this.showMainPanel.bind(this)));
    
    // Статистика
    this.bot.action('admin_stats', this.checkAdminCallback(this.showDetailedStats.bind(this)));
    this.bot.action('admin_analytics', this.checkAdminCallback(this.showAnalytics.bind(this)));
    this.bot.action('admin_reports', this.checkAdminCallback(this.showLeadsReport.bind(this)));
    
    // Лиды
    this.bot.action('admin_hot_leads', this.checkAdminCallback(this.showHotLeads.bind(this)));
    this.bot.action('admin_today_leads', this.checkAdminCallback(this.showTodayLeads.bind(this)));
    
    // Система
    this.bot.action('admin_system', this.checkAdminCallback(this.showSystemHealth.bind(this)));
    this.bot.action('admin_settings', this.checkAdminCallback(this.showSettings.bind(this)));
    this.bot.action('admin_logs', this.checkAdminCallback(this.showRecentLogs.bind(this)));
    
    // Экспорт
    this.bot.action('admin_export', this.checkAdminCallback(this.showExportMenu.bind(this)));
    this.bot.action('admin_export_leads_json', this.checkAdminCallback((ctx) => this.exportLeads(ctx, 'json')));
    this.bot.action('admin_export_leads_csv', this.checkAdminCallback((ctx) => this.exportLeads(ctx, 'csv')));
    this.bot.action('admin_export_stats', this.checkAdminCallback(this.exportStats.bind(this)));
    
    // Уведомления
    this.bot.action('admin_notifications_menu', this.checkAdminCallback(this.showNotificationsMenu.bind(this)));
    
    // Помощь
    this.bot.action('admin_help', this.checkAdminCallback(this.showHelp.bind(this)));

    // Дополнительные действия
    this.bot.action('admin_confirm_restart', this.checkAdminCallback(this.handleRestartConfirm.bind(this)));
    
    console.log('✅ Все admin callbacks настроены');
  }

  checkAdminCallback(handler) {
    return async (ctx) => {
      if (ctx.from.id.toString() !== this.adminId) {
        await ctx.answerCbQuery('🚫 Доступ запрещен');
        return;
      }
      
      await ctx.answerCbQuery();
      return handler(ctx);
    };
  }

  async showTodayLeads(ctx) {
    const today = new Date().toDateString();
    const leads = Object.values(this.adminNotifications.leadDataStorage || {})
      .filter(lead => {
        const leadDate = lead.timestamp ? new Date(lead.timestamp).toDateString() : null;
        return leadDate === today;
      })
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    if (!leads.length) {
      await ctx.editMessageText(
        '📋 *ЛИДЫ СЕГОДНЯ*\n\n✅ Сегодня лидов пока нет',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Обновить', 'admin_today_leads')],
            [Markup.button.callback('🔙 Главная панель', 'admin_main')]
          ])
        }
      );
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

    const keyboard = [
      [
        Markup.button.callback('🔥 Только горячие', 'admin_hot_leads'),
        Markup.button.callback('📊 Аналитика дня', 'admin_day_analytics')
      ],
      [
        Markup.button.callback('📤 Экспорт списка', 'admin_export_today'),
        Markup.button.callback('🔄 Обновить', 'admin_today_leads')
      ],
      [
        Markup.button.callback('🔙 Главная панель', 'admin_main')
      ]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  async showExportMenu(ctx) {
    let message = `📤 *ЭКСПОРТ ДАННЫХ*\n\n`;
    message += `Выберите что экспортировать:\n\n`;
    message += `📋 **Лиды:**\n`;
    message += `• Все лиды (JSON/CSV)\n`;
    message += `• Только горячие лиды\n`;
    message += `• Лиды за период\n\n`;
    message += `📊 **Статистика:**\n`;
    message += `• Общая статистика\n`;
    message += `• Аналитика по сегментам\n`;
    message += `• Отчет о конверсии\n\n`;
    message += `⚙️ **Система:**\n`;
    message += `• Настройки бота\n`;
    message += `• Логи системы`;

    const keyboard = [
      [
        Markup.button.callback('📋 Лиды (JSON)', 'admin_export_leads_json'),
        Markup.button.callback('📋 Лиды (CSV)', 'admin_export_leads_csv')
      ],
      [
        Markup.button.callback('🔥 Горячие лиды', 'admin_export_hot'),
        Markup.button.callback('📊 Статистика', 'admin_export_stats')
      ],
      [
        Markup.button.callback('📅 За период', 'admin_export_period'),
        Markup.button.callback('⚙️ Настройки', 'admin_export_settings')
      ],
      [
        Markup.button.callback('🔙 Главная панель', 'admin_main')
      ]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  async showNotificationsMenu(ctx) {
    let message = `🔔 *НАСТРОЙКИ УВЕДОМЛЕНИЙ*\n\n`;
    message += `Текущие настройки:\n\n`;
    
    Object.entries(this.notificationSettings).forEach(([key, enabled]) => {
      const emoji = enabled ? '✅' : '❌';
      const name = this.getNotificationName(key);
      message += `${emoji} ${name}\n`;
    });

    const keyboard = [
      [
        Markup.button.callback('🔥 Горячие лиды', 'admin_toggle_hot_notif'),
        Markup.button.callback('⭐ Теплые лиды', 'admin_toggle_warm_notif')
      ],
      [
        Markup.button.callback('❄️ Холодные лиды', 'admin_toggle_cold_notif'),
        Markup.button.callback('⚠️ Ошибки системы', 'admin_toggle_errors_notif')
      ],
      [
        Markup.button.callback('📊 Ежедневный отчет', 'admin_toggle_daily_notif'),
        Markup.button.callback('📈 Недельный отчет', 'admin_toggle_weekly_notif')
      ],
      [
        Markup.button.callback('🔕 Отключить все', 'admin_disable_all_notif'),
        Markup.button.callback('🔔 Включить все', 'admin_enable_all_notif')
      ],
      [
        Markup.button.callback('🔙 Настройки', 'admin_settings')
      ]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  async showHelp(ctx) {
    let message = `🆘 *СПРАВКА ПО АДМИН-ПАНЕЛИ*\n\n`;
    
    message += `📋 **Основные команды:**\n`;
    message += `• \`/admin\` - главная панель\n`;
    message += `• \`/stats\` - детальная статистика\n`;
    message += `• \`/hot_leads\` - горячие лиды\n`;
    message += `• \`/search_lead <запрос>\` - поиск лидов\n`;
    message += `• \`/health\` - состояние системы\n\n`;
    
    message += `🔍 **Поиск лидов:**\n`;
    message += `Можно искать по:\n`;
    message += `• Telegram ID: \`/search_lead 123456\`\n`;
    message += `• Имени: \`/search_lead Анна\`\n`;
    message += `• Проблеме: \`/search_lead стресс\`\n\n`;
    
    message += `📊 **Сегменты лидов:**\n`;
    message += `• 🔥 HOT_LEAD - требует срочного внимания\n`;
    message += `• ⭐ WARM_LEAD - активно мотивирован\n`;
    message += `• ❄️ COLD_LEAD - умеренный интерес\n`;
    message += `• 🌱 NURTURE_LEAD - долгосрочное развитие\n\n`;
    
    message += `⚡ **Быстрые действия:**\n`;
    message += `• Используйте кнопки для навигации\n`;
    message += `• Экспортируйте данные в JSON/CSV\n`;
    message += `• Настройте уведомления под себя\n`;
    message += `• Следите за системными метриками\n\n`;
    
    message += `📞 **Поддержка:**\n`;
    message += `При проблемах с админ-панелью обратитесь к разработчику.`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Команды', 'admin_commands_list')],
        [Markup.button.callback('🔧 Диагностика', 'admin_diagnostics')],
        [Markup.button.callback('🔙 Главная панель', 'admin_main')]
      ])
    });
  }

  getNotificationName(key) {
    const names = {
      hotLeads: 'Горячие лиды',
      warmLeads: 'Теплые лиды',
      coldLeads: 'Холодные лиды',
      systemErrors: 'Системные ошибки',
      dailyReport: 'Ежедневный отчет',
      weeklyReport: 'Недельный отчет'
    };
    return names[key] || key;
  }

  // ===== АВТОМАТИЧЕСКИЕ ОТЧЕТЫ =====

  async startScheduledReports() {
    if (!this.notificationSettings.dailyReport) return;

    // Ежедневный отчет в 20:00
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 20 && now.getMinutes() === 0) {
        await this.sendDailyReport();
      }
    }, 60000); // Проверяем каждую минуту

    console.log('✅ Запланированные отчеты настроены');
  }

  async sendDailyReport() {
    if (!this.adminId) return;

    try {
      const stats = this.adminNotifications.getStats();
      const today = new Date().toLocaleDateString('ru-RU');
      
      let message = `📊 *ЕЖЕДНЕВНЫЙ ОТЧЕТ*\n`;
      message += `📅 ${today}\n\n`;
      
      message += `👥 **Лиды за день:**\n`;
      message += `• Всего: ${stats.daily_stats?.totalLeads || 0}\n`;
      message += `• 🔥 Горячие: ${stats.daily_stats?.hotLeads || 0}\n`;
      message += `• ⭐ Теплые: ${stats.daily_stats?.warmLeads || 0}\n`;
      message += `• ❄️ Холодные: ${stats.daily_stats?.coldLeads || 0}\n\n`;
      
      const totalLeads = stats.daily_stats?.totalLeads || 0;
      const hotLeads = stats.daily_stats?.hotLeads || 0;
      const conversion = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0;
      
      message += `📈 **Эффективность:**\n`;
      message += `• Конверсия в горячие: ${conversion}%\n`;
      message += `• Средний балл VERSE: ${this.getAverageScore()}/100\n\n`;
      
      message += `🎯 **Следующие действия:**\n`;
      if (hotLeads > 0) {
        message += `• Обработать ${hotLeads} горячих лидов\n`;
      }
      if (totalLeads === 0) {
        message += `• Проанализировать причины отсутствия лидов\n`;
      }
      message += `• Подготовить план на завтра\n\n`;
      
      message += `🕐 Автоматический отчет • ${new Date().toLocaleTimeString('ru-RU')}`;

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📊 Подробная статистика', 'admin_stats')],
          [Markup.button.callback('🎛️ Админ-панель', 'admin_main')]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка отправки ежедневного отчета:', error);
    }
  }

  // ===== НЕДОСТАЮЩИЕ МЕТОДЫ ОБРАБОТЧИКОВ =====

  async showLeadsReport(ctx) {
    const leadsData = this.adminNotifications.leadDataStorage || {};
    const analysis = this.analyzeLeadsData(leadsData);

    let message = `📄 *ОТЧЕТ ПО ЛИДАМ*\n\n`;
    
    // Общая информация
    message += `📊 *ОБЩАЯ СТАТИСТИКА:*\n`;
    message += `• Всего лидов: ${analysis.totalLeads}\n`;
    message += `• Средний балл VERSE: ${analysis.averageScore.toFixed(1)}\n`;
    message += `• Пиковое время: ${analysis.peakHour}:00\n\n`;
    
    // Детальный разбор по сегментам
    const segmentCounts = Object.values(this.adminNotifications.leadDataStorage || {})
      .reduce((acc, lead) => {
        const segment = lead.analysisResult?.segment || 'UNKNOWN';
        acc[segment] = (acc[segment] || 0) + 1;
        return acc;
      }, {});

    message += `🎯 *ПО СЕГМЕНТАМ:*\n`;
    Object.entries(segmentCounts).forEach(([segment, count]) => {
      const emoji = this.getSegmentEmoji(segment);
      const percentage = analysis.totalLeads > 0 ? ((count / analysis.totalLeads) * 100).toFixed(1) : 0;
      message += `${emoji} ${segment}: ${count} (${percentage}%)\n`;
    });

    message += `\n📈 *РЕКОМЕНДАЦИИ:*\n`;
    if (segmentCounts.HOT_LEAD > 0) {
      message += `• Срочно обработать ${segmentCounts.HOT_LEAD} горячих лидов\n`;
    }
    if (analysis.averageScore < 50) {
      message += `• Низкий средний балл - пересмотреть стратегию привлечения\n`;
    }
    if (analysis.totalLeads === 0) {
      message += `• Проанализировать причины отсутствия лидов\n`;
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📊 Детальная аналитика', 'admin_analytics')],
        [Markup.button.callback('📤 Экспорт отчета', 'admin_export_report')],
        [Markup.button.callback('🔙 Главная панель', 'admin_main')]
      ])
    });
  }

  async showRecentLogs(ctx) {
    let message = `📋 *ПОСЛЕДНИЕ ЛОГИ СИСТЕМЫ*\n\n`;
    
    // Получаем последние события (заглушка, в реальности читаем из файла логов)
    const recentEvents = [
      { time: new Date(), level: 'INFO', message: 'Бот запущен успешно' },
      { time: new Date(Date.now() - 300000), level: 'INFO', message: 'Новый лид получен' },
      { time: new Date(Date.now() - 600000), level: 'WARN', message: 'Высокая нагрузка на сервер' },
      { time: new Date(Date.now() - 900000), level: 'INFO', message: 'Админ-панель активирована' }
    ];

    recentEvents.forEach((event, index) => {
      const emoji = event.level === 'ERROR' ? '❌' : event.level === 'WARN' ? '⚠️' : '✅';
      const timeStr = event.time.toLocaleTimeString('ru-RU');
      message += `${emoji} ${timeStr} [${event.level}]\n`;
      message += `   ${event.message}\n\n`;
    });

    message += `📝 *Примечание:* Показаны последние 4 события`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Обновить логи', 'admin_logs')],
        [Markup.button.callback('📤 Экспорт логов', 'admin_export_logs')],
        [Markup.button.callback('🔙 Система', 'admin_system')]
      ])
    });
  }

  async restartBot(ctx) {
    let message = `🔄 *ПЕРЕЗАПУСК БОТА*\n\n`;
    message += `⚠️ **ВНИМАНИЕ!** Перезапуск бота:\n`;
    message += `• Прервет все активные сессии пользователей\n`;
    message += `• Может занять 10-30 секунд\n`;
    message += `• Текущие данные будут сохранены\n\n`;
    message += `🤔 Вы действительно хотите перезапустить бота?`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Да, перезапустить', 'admin_confirm_restart'),
          Markup.button.callback('❌ Отмена', 'admin_main')
        ]
      ])
    });
  }

  async handleRestartConfirm(ctx) {
    await ctx.editMessageText(
      `🔄 *ПЕРЕЗАПУСК НАЧАЛСЯ*\n\n` +
      `⏳ Перезапускаем бот...\n` +
      `Это займет около 30 секунд.\n\n` +
      `💾 Данные сохраняются...`,
      { parse_mode: 'Markdown' }
    );

    // Даем время на отправку сообщения
    setTimeout(() => {
      console.log('🔄 Админ инициировал перезапуск бота');
      process.exit(0); // Graceful shutdown, процесс-менеджер перезапустит
    }, 2000);
  }

  async manageNotifications(ctx) {
    await this.showNotificationsMenu(ctx);
  }

  async exportStats(ctx) {
    try {
      const stats = {
        timestamp: new Date().toISOString(),
        admin_panel: this.exportStats(),
        leads_analytics: this.analyzeLeadsData(this.adminNotifications.leadDataStorage || {}),
        system_health: await this.getSystemHealthData(),
        bot_performance: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          leads_count: Object.keys(this.adminNotifications.leadDataStorage || {}).length
        }
      };

      const fs = require('fs');
      const fileName = `stats_export_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `./temp/${fileName}`;
      
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf8');

      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption: `📊 Экспорт статистики\n\n• Дата: ${new Date().toLocaleDateString('ru-RU')}\n• Время: ${new Date().toLocaleTimeString('ru-RU')}`,
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Главная панель', 'admin_main')]
          ])
        }
      );

      // Удаляем временный файл через 30 секунд
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error('Ошибка удаления временного файла:', error);
        }
      }, 30000);

    } catch (error) {
      console.error('Ошибка экспорта статистики:', error);
      await ctx.reply('❌ Ошибка экспорта статистики');
    }
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====

  initialize() {
    this.setupAdminCommands();
    this.setupCallbacks();
    this.startScheduledReports();
    
    console.log('✅ Расширенная админ-панель инициализирована');
    
    // Отправляем приветственное сообщение админу при запуске
    if (this.adminId) {
      setTimeout(async () => {
        try {
          await this.bot.telegram.sendMessage(this.adminId, 
            `🎛️ *Админ-панель активирована*\n\n` +
            `Бот запущен и готов к работе!\n` +
            `Используйте /admin для доступа к панели управления.\n\n` +
            `⏰ ${new Date().toLocaleString('ru-RU')}`, 
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.log('⚠️ Не удалось отправить приветствие админу');
        }
      }, 5000);
    }
  }

  // ===== ЭКСПОРТ СТАТИСТИКИ =====

  exportStats() {
    return {
      panel_stats: this.panelStats,
      notification_settings: this.notificationSettings,
      admin_id: this.adminId,
      version: '1.0.0',
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = EnhancedAdminPanel;
