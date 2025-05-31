// Файл: modules/admin/handlers/system_handler.js
// Обработчики системных команд (здоровье, экспорт, настройки)

const config = require('../../../config');

class SystemHandler {
  constructor(bot, adminNotifications) {
    this.bot = bot;
    this.telegramBot = bot.bot;
    this.adminNotifications = adminNotifications;
    this.adminId = config.ADMIN_ID;
    
    // Статистика системных команд
    this.systemHandlerStats = {
      totalCommands: 0,
      commandsUsed: {},
      lastCommand: null,
      healthChecks: 0,
      exports: 0,
      diagnosticsRuns: 0
    };
  }

  /**
   * Настройка системных команд
   */
  setupCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, системные команды отключены');
      return;
    }

    console.log('🔧 Настройка системных команд...');
    
    this.telegramBot.command('health', this.checkAdmin(this.handleHealthCommand.bind(this)));
    this.telegramBot.command('export_leads', this.checkAdmin(this.handleExportLeadsCommand.bind(this)));
    this.telegramBot.command('settings', this.checkAdmin(this.handleSettingsCommand.bind(this)));
    this.telegramBot.command('diagnostics', this.checkAdmin(this.handleDiagnosticsCommand.bind(this)));
    
    console.log('✅ Системные команды настроены');
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
      
      this.trackSystemUsage(ctx.message.text);
      return handler(ctx);
    };
  }

  /**
   * Обработка команды /health
   */
  async handleHealthCommand(ctx) {
    console.log(`🔧 Команда /health от админа ${ctx.from.id}`);
    this.systemHandlerStats.healthChecks++;
    
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
        const name = component.replace(/_/g, ' ').toUpperCase();
        message += `${emoji} ${name}: ${data.status}\n`;
      });
      message += `\n`;
      
      // Производительность
      message += `📊 *ПРОИЗВОДИТЕЛЬНОСТЬ:*\n`;
      message += `• Память: ${health.performance.memory}MB\n`;
      message += `• Время работы: ${this.formatUptime(health.performance.uptime)}\n`;
      message += `• CPU: ${health.performance.cpu_load || 'N/A'}\n\n`;
      
      // Интеграции
      message += `🔗 *ИНТЕГРАЦИИ:*\n`;
      message += `• Основной бот: ${health.integrations.mainBot ? '✅ Подключен' : '❌ Отключен'}\n`;
      message += `• CRM: ${health.integrations.crm ? '✅ Подключен' : '❌ Отключен'}\n`;
      message += `• База данных: ${health.integrations.database ? '✅ Подключена' : '❌ Отключена'}\n\n`;
      
      // Статистика проверок
      message += `🔍 *Проверка здоровья #${this.systemHandlerStats.healthChecks}*\n`;
      message += `🕐 ${new Date().toLocaleString('ru-RU')}`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Детальная диагностика', callback_data: 'admin_detailed_diagnostics' }],
          [{ text: '📊 Системные метрики', callback_data: 'admin_system_metrics' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleHealthCommand:', error);
      this.systemHandlerStats.errors = (this.systemHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при получении информации о системе');
    }
  }

  /**
   * Обработка команды /export_leads
   */
  async handleExportLeadsCommand(ctx) {
    console.log(`📤 Команда /export_leads от админа ${ctx.from.id}`);
    this.systemHandlerStats.exports++;
    
    try {
      const leads = Object.values(this.adminNotifications.leadDataStorage || {});
      
      if (!leads.length) {
        await ctx.reply('📋 Нет данных для экспорта', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
            ]
          }
        });
        return;
      }

      const exportData = this.prepareLeadsForExport(leads);
      const statistics = this.calculateExportStatistics(leads);
      
      let message = `📤 *ЭКСПОРТ ЛИДОВ*\n\n`;
      message += `📊 **Статистика экспорта:**\n`;
      message += `• Всего записей: ${leads.length}\n`;
      message += `• Дата экспорта: ${new Date().toLocaleDateString('ru-RU')}\n`;
      message += `• Время: ${new Date().toLocaleTimeString('ru-RU')}\n\n`;
      
      message += `📈 **Распределение по сегментам:**\n`;
      Object.entries(statistics.bySegment).forEach(([segment, count]) => {
        const emoji = this.getSegmentEmoji(segment);
        const percentage = ((count / leads.length) * 100).toFixed(1);
        message += `${emoji} ${segment}: ${count} (${percentage}%)\n`;
      });
      
      message += `\n📋 **Топ-3 проблемы:**\n`;
      statistics.topIssues.slice(0, 3).forEach((issue, index) => {
        message += `${index + 1}. ${this.translateIssue(issue.key)}: ${issue.count}\n`;
      });
      
      message += `\n💾 Данные готовы к экспорту\n`;
      message += `📊 Экспорт #${this.systemHandlerStats.exports}`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📄 JSON формат', callback_data: 'admin_export_json' },
            { text: '📊 CSV формат', callback_data: 'admin_export_csv' }
          ],
          [{ text: '📈 Расширенный отчет', callback_data: 'admin_export_detailed' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleExportLeadsCommand:', error);
      this.systemHandlerStats.errors = (this.systemHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при экспорте лидов');
    }
  }

  /**
   * Обработка команды /settings
   */
  async handleSettingsCommand(ctx) {
    console.log(`⚙️ Команда /settings от админа ${ctx.from.id}`);
    
    try {
      const systemInfo = this.getSystemInfo();
      
      let message = `⚙️ *НАСТРОЙКИ СИСТЕМЫ*\n\n`;
      
      message += `🔔 **Уведомления:**\n`;
      message += `• Горячие лиды: ${systemInfo.notifications.hotLeads ? '✅' : '❌'}\n`;
      message += `• Теплые лиды: ${systemInfo.notifications.warmLeads ? '✅' : '❌'}\n`;
      message += `• Системные ошибки: ${systemInfo.notifications.systemErrors ? '✅' : '❌'}\n`;
      message += `• Ежедневные сводки: ${systemInfo.notifications.dailySummary ? '✅' : '❌'}\n\n`;
      
      message += `📊 **Система:**\n`;
      message += `• Автоочистка данных: ${systemInfo.cleanup.enabled ? systemInfo.cleanup.days + ' дней' : 'Отключена'}\n`;
      message += `• Лимит памяти: ${systemInfo.limits.memory}MB\n`;
      message += `• Rate limiting: ${systemInfo.limits.rateLimit}\n`;
      message += `• Логирование: ${systemInfo.logging.level}\n\n`;
      
      message += `🔧 **Модули:**\n`;
      Object.entries(systemInfo.modules).forEach(([module, status]) => {
        const emoji = status ? '✅' : '❌';
        const name = module.replace(/_/g, ' ').toUpperCase();
        message += `${emoji} ${name}\n`;
      });
      
      message += `\n📈 **Статистика команд:**\n`;
      message += `• Всего выполнено: ${this.systemHandlerStats.totalCommands}\n`;
      message += `• Проверок здоровья: ${this.systemHandlerStats.healthChecks}\n`;
      message += `• Экспортов: ${this.systemHandlerStats.exports}\n`;
      message += `• Ошибок: ${this.systemHandlerStats.errors || 0}\n`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔔 Уведомления', callback_data: 'admin_settings_notifications' },
            { text: '🧹 Очистка', callback_data: 'admin_settings_cleanup' }
          ],
          [
            { text: '📊 Лимиты', callback_data: 'admin_settings_limits' },
            { text: '🔧 Модули', callback_data: 'admin_settings_modules' }
          ],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleSettingsCommand:', error);
      this.systemHandlerStats.errors = (this.systemHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при получении настроек');
    }
  }

  /**
   * Обработка команды /diagnostics
   */
  async handleDiagnosticsCommand(ctx) {
    console.log(`🔍 Команда /diagnostics от админа ${ctx.from.id}`);
    this.systemHandlerStats.diagnosticsRuns++;
    
    try {
      const diagnostics = await this.runComprehensiveDiagnostics();
      
      let message = `🔍 *КОМПЛЕКСНАЯ ДИАГНОСТИКА*\n\n`;
      message += `🕐 Запущена: ${new Date().toLocaleString('ru-RU')}\n`;
      message += `📊 Диагностика #${this.systemHandlerStats.diagnosticsRuns}\n\n`;
      
      // Общий статус
      const overallEmoji = diagnostics.overall_status === 'HEALTHY' ? '✅' : 
                          diagnostics.overall_status === 'DEGRADED' ? '⚠️' : '❌';
      message += `${overallEmoji} **Общий статус:** ${diagnostics.overall_status}\n\n`;
      
      // Детальные проверки
      message += `🔍 **Результаты проверок:**\n`;
      Object.entries(diagnostics.checks).forEach(([checkName, result]) => {
        const emoji = result.status === 'OK' ? '✅' : 
                     result.status === 'WARNING' ? '⚠️' : '❌';
        const name = checkName.replace(/_/g, ' ').toUpperCase();
        message += `${emoji} ${name}\n`;
        message += `   └─ ${result.message}\n`;
      });
      
      // Рекомендации
      if (diagnostics.recommendations && diagnostics.recommendations.length > 0) {
        message += `\n💡 **Рекомендации:**\n`;
        diagnostics.recommendations.forEach((rec, index) => {
          message += `${index + 1}. ${rec}\n`;
        });
      }
      
      message += `\n⏱️ Время выполнения: ${diagnostics.execution_time}ms`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔧 Проверить здоровье', callback_data: 'admin_system' }],
          [{ text: '📊 Системные метрики', callback_data: 'admin_system_metrics' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Ошибка handleDiagnosticsCommand:', error);
      this.systemHandlerStats.errors = (this.systemHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при выполнении диагностики');
    }
  }

  /**
   * Обработка команд для внешнего вызова
   */
  async handleCommand(ctx, commandName) {
    console.log(`🔍 Обработка системной команды: ${commandName}`);
    
    try {
      switch (commandName) {
        case 'health':
          await this.handleHealthCommand(ctx);
          break;
        case 'export_leads':
          await this.handleExportLeadsCommand(ctx);
          break;
        case 'settings':
          await this.handleSettingsCommand(ctx);
          break;
        case 'diagnostics':
          await this.handleDiagnosticsCommand(ctx);
          break;
        default:
          console.warn('⚠️ Неизвестная системная команда:', commandName);
          await ctx.reply('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка выполнения системной команды:', error);
      this.systemHandlerStats.errors = (this.systemHandlerStats.errors || 0) + 1;
      await ctx.reply('Произошла ошибка при выполнении команды');
    }
  }

  // ===== СИСТЕМНЫЕ МЕТОДЫ =====

  async getSystemHealthData() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      overall: this.determineOverallHealth(),
      components: {
        'telegram_bot': { status: 'HEALTHY' },
        'admin_handlers': { status: 'HEALTHY' },
        'lead_storage': { 
          status: Object.keys(this.adminNotifications.leadDataStorage || {}).length > 0 ? 'HEALTHY' : 'DEGRADED' 
        },
        'notification_system': { 
          status: this.adminNotifications ? 'HEALTHY' : 'ERROR' 
        },
        'middleware': { status: 'HEALTHY' }
      },
      performance: {
        memory: Math.round(memUsage.heapUsed / 1024 / 1024),
        uptime: process.uptime(),
        cpu_load: ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(2) + 'ms'
      },
      integrations: {
        mainBot: !!config.MAIN_BOT_API_URL,
        crm: !!config.CRM_WEBHOOK_URL,
        database: !!config.DATABASE_URL
      }
    };
  }

  async runComprehensiveDiagnostics() {
    const startTime = Date.now();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      overall_status: 'HEALTHY',
      execution_time: 0,
      checks: {},
      recommendations: []
    };

    try {
      // Проверка памяти
      const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      diagnostics.checks.memory_usage = {
        status: memUsage < 500 ? 'OK' : memUsage < 1000 ? 'WARNING' : 'ERROR',
        message: `Использование памяти: ${memUsage}MB`,
        value: memUsage
      };

      // Проверка времени работы
      const uptime = process.uptime();
      diagnostics.checks.uptime = {
        status: 'OK',
        message: `Время работы: ${this.formatUptime(uptime)}`,
        value: uptime
      };

      // Проверка хранилища лидов
      const leadsCount = Object.keys(this.adminNotifications.leadDataStorage || {}).length;
      diagnostics.checks.leads_storage = {
        status: leadsCount > 0 ? 'OK' : 'WARNING',
        message: `Лидов в хранилище: ${leadsCount}`,
        value: leadsCount
      };

      // Проверка конфигурации
      diagnostics.checks.configuration = {
        status: config.ADMIN_ID ? 'OK' : 'ERROR',
        message: config.ADMIN_ID ? 'Конфигурация корректна' : 'ADMIN_ID не настроен',
        value: !!config.ADMIN_ID
      };

      // Проверка интеграций
      const integrations = [
        { name: 'MAIN_BOT', value: !!config.MAIN_BOT_API_URL },
        { name: 'CRM', value: !!config.CRM_WEBHOOK_URL },
        { name: 'DATABASE', value: !!config.DATABASE_URL }
      ];
      
      const activeIntegrations = integrations.filter(i => i.value).length;
      diagnostics.checks.integrations = {
        status: activeIntegrations > 0 ? 'OK' : 'WARNING',
        message: `Активных интеграций: ${activeIntegrations}/${integrations.length}`,
        value: activeIntegrations
      };

      // Проверка команд системы
      diagnostics.checks.system_commands = {
        status: this.systemHandlerStats.totalCommands > 0 ? 'OK' : 'WARNING',
        message: `Выполнено команд: ${this.systemHandlerStats.totalCommands}`,
        value: this.systemHandlerStats.totalCommands
      };

      // Определяем общий статус
      const statuses = Object.values(diagnostics.checks).map(check => check.status);
      if (statuses.includes('ERROR')) {
        diagnostics.overall_status = 'ERROR';
      } else if (statuses.includes('WARNING')) {
        diagnostics.overall_status = 'DEGRADED';
      } else {
        diagnostics.overall_status = 'HEALTHY';
      }

      // Генерируем рекомендации
      if (memUsage > 1000) {
        diagnostics.recommendations.push('Рассмотреть оптимизацию использования памяти');
      }
      if (!config.ADMIN_ID) {
        diagnostics.recommendations.push('Настроить ADMIN_ID для полного функционала');
      }
      if (activeIntegrations === 0) {
        diagnostics.recommendations.push('Настроить интеграции для расширенного функционала');
      }
      if (leadsCount === 0) {
        diagnostics.recommendations.push('Проверить работу системы сбора лидов');
      }

    } catch (error) {
      diagnostics.overall_status = 'ERROR';
      diagnostics.error = error.message;
    }

    diagnostics.execution_time = Date.now() - startTime;
    return diagnostics;
  }

  determineOverallHealth() {
    const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const hasAdmin = !!config.ADMIN_ID;
    const hasLeads = Object.keys(this.adminNotifications.leadDataStorage || {}).length > 0;
    
    if (!hasAdmin || memUsage > 1000) return 'ERROR';
    if (memUsage > 500 || !hasLeads) return 'DEGRADED';
    return 'HEALTHY';
  }

  getSystemInfo() {
    return {
      notifications: {
        hotLeads: true,
        warmLeads: true,
        systemErrors: true,
        dailySummary: true
      },
      cleanup: {
        enabled: true,
        days: 7
      },
      limits: {
        memory: 1000,
        rateLimit: 'улучшенный'
      },
      logging: {
        level: 'info'
      },
      modules: {
        admin_handlers: !!this.bot,
        admin_notifications: !!this.adminNotifications,
        lead_storage: Object.keys(this.adminNotifications.leadDataStorage || {}).length > 0,
        telegram_bot: !!this.telegramBot,
        middleware: !!this.bot.middleware
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
      urgency_score: lead.analysisResult?.scores?.urgency,
      readiness_score: lead.analysisResult?.scores?.readiness,
      fit_score: lead.analysisResult?.scores?.fit,
      primary_issue: lead.analysisResult?.primaryIssue,
      survey_type: lead.surveyType,
      age_group: lead.surveyAnswers?.age_group || lead.surveyAnswers?.child_age_detail,
      stress_level: lead.surveyAnswers?.stress_level,
      sleep_quality: lead.surveyAnswers?.sleep_quality,
      problems: Array.isArray(lead.surveyAnswers?.current_problems) ? 
        lead.surveyAnswers.current_problems.join(', ') : 
        lead.surveyAnswers?.current_problems,
      goals: Array.isArray(lead.surveyAnswers?.main_goals) ? 
        lead.surveyAnswers.main_goals.join(', ') : 
        lead.surveyAnswers?.main_goals,
      processed: lead.processed || false,
      export_date: new Date().toISOString()
    }));
  }

  calculateExportStatistics(leads) {
    const stats = {
      total: leads.length,
      bySegment: {},
      byType: {},
      topIssues: []
    };

    const issueCounts = {};

    leads.forEach(lead => {
      // По сегментам
      const segment = lead.analysisResult?.segment || 'UNKNOWN';
      stats.bySegment[segment] = (stats.bySegment[segment] || 0) + 1;

      // По типу анкеты
      const type = lead.surveyType || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // По проблемам
      const issue = lead.analysisResult?.primaryIssue;
      if (issue) {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      }
    });

    // Топ проблем
    stats.topIssues = Object.entries(issueCounts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  trackSystemUsage(command) {
    this.systemHandlerStats.totalCommands++;
    this.systemHandlerStats.lastCommand = {
      command: command,
      timestamp: new Date().toISOString()
    };
    
    if (!this.systemHandlerStats.commandsUsed[command]) {
      this.systemHandlerStats.commandsUsed[command] = 0;
    }
    this.systemHandlerStats.commandsUsed[command]++;
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

  getMemoryUsage() {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  }

  /**
   * Получение расширенных системных метрик
   */
  getSystemMetrics() {
    const process_metrics = process.memoryUsage();
    const cpu_usage = process.cpuUsage();
    
    return {
      memory: {
        heap_used: Math.round(process_metrics.heapUsed / 1024 / 1024),
        heap_total: Math.round(process_metrics.heapTotal / 1024 / 1024),
        external: Math.round(process_metrics.external / 1024 / 1024),
        rss: Math.round(process_metrics.rss / 1024 / 1024)
      },
      cpu: {
        user: Math.round(cpu_usage.user / 1000),
        system: Math.round(cpu_usage.system / 1000)
      },
      uptime: {
        seconds: Math.round(process.uptime()),
        formatted: this.formatUptime(process.uptime())
      },
      system_stats: {
        platform: process.platform,
        node_version: process.version,
        pid: process.pid
      },
      admin_stats: {
        total_commands: this.systemHandlerStats.totalCommands,
        health_checks: this.systemHandlerStats.healthChecks,
        exports: this.systemHandlerStats.exports,
        diagnostics: this.systemHandlerStats.diagnosticsRuns,
        errors: this.systemHandlerStats.errors || 0
      }
    };
  }

  /**
   * Получение отчета о системе
   */
  generateSystemReport() {
    const metrics = this.getSystemMetrics();
    const health = this.getSystemHealthData();
    const info = this.getSystemInfo();
    
    return {
      generated_at: new Date().toISOString(),
      report_type: 'system_status',
      overall_health: health.overall,
      system_metrics: metrics,
      health_data: health,
      system_info: info,
      handler_stats: this.getStats(),
      recommendations: this.generateSystemRecommendations(metrics, health)
    };
  }

  generateSystemRecommendations(metrics, health) {
    const recommendations = [];
    
    if (metrics.memory.heap_used > 500) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Рассмотреть оптимизацию использования памяти'
      });
    }
    
    if (health.overall !== 'HEALTHY') {
      recommendations.push({
        type: 'health',
        priority: 'high',
        message: 'Требуется внимание к состоянию системы'
      });
    }
    
    if (!health.integrations.mainBot && !health.integrations.crm) {
      recommendations.push({
        type: 'integration',
        priority: 'low',
        message: 'Настроить интеграции для расширенного функционала'
      });
    }
    
    if (this.systemHandlerStats.errors > 5) {
      recommendations.push({
        type: 'stability',
        priority: 'high',
        message: 'Высокое количество ошибок - требуется диагностика'
      });
    }
    
    return recommendations;
  }

  /**
   * Получение статистики обработчика
   */
  getStats() {
    return {
      name: 'SystemHandler',
      total_commands: this.systemHandlerStats.totalCommands,
      commands_used: this.systemHandlerStats.commandsUsed,
      last_command: this.systemHandlerStats.lastCommand,
      health_checks: this.systemHandlerStats.healthChecks,
      exports: this.systemHandlerStats.exports,
      diagnostics_runs: this.systemHandlerStats.diagnosticsRuns,
      errors: this.systemHandlerStats.errors || 0,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage(),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    console.log('🧹 Очистка SystemHandler...');
    console.log('📊 Статистика системных команд:', JSON.stringify(this.getStats(), null, 2));
    console.log('✅ SystemHandler очищен');
  }
}

module.exports = SystemHandler;
