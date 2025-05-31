// Файл: modules/admin/admin_handlers.js - РЕФАКТОРИРОВАННАЯ ВЕРСИЯ
// Координатор обработчиков команд администратора (использует модульную архитектуру)

const MainHandler = require('./handlers/main_handler');
const StatsHandler = require('./handlers/stats_handler');
const LeadsHandler = require('./handlers/leads_handler');
const SystemHandler = require('./handlers/system_handler');
const config = require('../../config');

class AdminHandlers {
  constructor(bot, adminNotifications, verseAnalysis, leadTransfer, pdfManager) {
    this.bot = bot;
    this.telegramBot = bot.bot;
    this.adminNotifications = adminNotifications;
    this.verseAnalysis = verseAnalysis;
    this.leadTransfer = leadTransfer;
    this.pdfManager = pdfManager;
    this.adminId = config.ADMIN_ID;
    
    // Инициализируем модульные обработчики
    this.mainHandler = new MainHandler(bot, adminNotifications);
    this.statsHandler = new StatsHandler(bot, adminNotifications);
    this.leadsHandler = new LeadsHandler(bot, adminNotifications);
    this.systemHandler = new SystemHandler(bot, adminNotifications);
    
    // Статистика общих команд
    this.commandStats = {
      totalCommands: 0,
      commandsUsed: {},
      lastCommand: null,
      errors: 0,
      moduleStats: {
        main: 0,
        stats: 0,
        leads: 0,
        system: 0,
        other: 0
      }
    };

    console.log('✅ AdminHandlers инициализирован с модульной архитектурой');
  }

  // ===== НАСТРОЙКА КОМАНД =====

  setupCommands() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, админ-команды отключены');
      return;
    }

    console.log('🔧 Настройка модульных админ-команд...');

    // Настраиваем команды во всех модулях
    this.mainHandler.setupCommands();
    this.statsHandler.setupCommands();
    this.leadsHandler.setupCommands();
    this.systemHandler.setupCommands();
    
    console.log('✅ Модульные админ-команды настроены');
  }

  // ===== ОСНОВНОЙ ОБРАБОТЧИК КОМАНД =====

  async handleCommand(ctx, commandName) {
    if (ctx.from.id.toString() !== this.adminId) {
      await ctx.reply('🚫 Доступ запрещен');
      return;
    }

    try {
      this.trackCommandUsage(commandName);
      
      console.log(`🔍 Обработка админ-команды: ${commandName}`);
      
      // Маршрутизация команд по модулям
      const handled = await this.routeCommandToModules(ctx, commandName);
      
      if (!handled) {
        console.warn('⚠️ Неизвестная админ-команда:', commandName);
        await ctx.reply('Неизвестная команда', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }],
              [{ text: '🆘 Помощь', callback_data: 'admin_help' }]
            ]
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Ошибка handleCommand:', error);
      this.commandStats.errors++;
      
      await ctx.reply('Произошла ошибка при выполнении команды', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
    }
  }

  // ===== МАРШРУТИЗАЦИЯ ПО МОДУЛЯМ =====

  async routeCommandToModules(ctx, commandName) {
    try {
      // Основные команды (admin)
      if (commandName === 'admin') {
        await this.mainHandler.handleCommand(ctx, commandName);
        this.commandStats.moduleStats.main++;
        return true;
      }

      // Команды статистики (stats, analytics)
      if (['stats', 'analytics'].includes(commandName)) {
        await this.statsHandler.handleCommand(ctx, commandName);
        this.commandStats.moduleStats.stats++;
        return true;
      }

      // Команды работы с лидами (hot_leads, today_leads, search_lead)
      if (['hot_leads', 'today_leads', 'search_lead'].includes(commandName)) {
        await this.leadsHandler.handleCommand(ctx, commandName);
        this.commandStats.moduleStats.leads++;
        return true;
      }

      // Системные команды (health, export_leads, settings, diagnostics)
      if (['health', 'export_leads', 'settings', 'diagnostics'].includes(commandName)) {
        await this.systemHandler.handleCommand(ctx, commandName);
        this.commandStats.moduleStats.system++;
        return true;
      }

      // Команда не обработана ни одним модулем
      this.commandStats.moduleStats.other++;
      return false;

    } catch (error) {
      console.error('❌ Ошибка маршрутизации команды:', error);
      this.commandStats.errors++;
      throw error;
    }
  }

  // ===== МЕТОДЫ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ =====

  /**
   * Обработка главной команды (для обратной совместимости)
   */
  async handleMainCommand(ctx) {
    return await this.mainHandler.handleMainCommand(ctx);
  }

  /**
   * Проверка прав администратора (для обратной совместимости)
   */
  checkAdmin(handler) {
    return async (ctx) => {
      if (ctx.from.id.toString() !== this.adminId) {
        await ctx.reply('🚫 Доступ запрещен');
        return;
      }
      
      this.trackCommandUsage(ctx.message?.text || 'unknown');
      return handler(ctx);
    };
  }

  // ===== АГРЕГИРОВАННЫЕ МЕТОДЫ =====

  /**
   * Получение общей статистики всех модулей
   */
  getAggregatedStats() {
    return {
      main_handler: this.mainHandler.getStats(),
      stats_handler: this.statsHandler.getStats(),
      leads_handler: this.leadsHandler.getStats(),
      system_handler: this.systemHandler.getStats()
    };
  }

  /**
   * Получение агрегированной аналитики
   */
  getAggregatedAnalytics() {
    const leadsStats = this.leadsHandler.getStats();
    const systemStats = this.systemHandler.getStats();
    const statsHandlerStats = this.statsHandler.getStats();
    
    return {
      leads: {
        total_processed: leadsStats.leads_processed,
        search_queries: leadsStats.search_queries,
        conversion_stats: leadsStats.conversion_stats,
        top_issues: leadsStats.top_issues
      },
      system: {
        health_checks: systemStats.health_checks,
        exports: systemStats.exports,
        diagnostics: systemStats.diagnostics_runs,
        uptime: systemStats.uptime
      },
      statistics: {
        requests: statsHandlerStats.total_requests,
        analytics_runs: statsHandlerStats.analytics_runs
      },
      overall: {
        total_commands: this.commandStats.totalCommands,
        errors: this.commandStats.errors,
        module_distribution: this.commandStats.moduleStats
      }
    };
  }

  /**
   * Выполнение диагностики всех модулей
   */
  async performModulesDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      overall_status: 'HEALTHY',
      modules: {}
    };

    try {
      // Диагностика каждого модуля
      const modules = [
        { name: 'main', handler: this.mainHandler },
        { name: 'stats', handler: this.statsHandler },
        { name: 'leads', handler: this.leadsHandler },
        { name: 'system', handler: this.systemHandler }
      ];

      for (const module of modules) {
        try {
          const moduleStats = module.handler.getStats();
          diagnostics.modules[module.name] = {
            status: moduleStats.errors > 5 ? 'DEGRADED' : 'HEALTHY',
            stats: moduleStats,
            last_activity: moduleStats.last_command || moduleStats.last_request,
            error_count: moduleStats.errors || 0
          };
        } catch (error) {
          diagnostics.modules[module.name] = {
            status: 'ERROR',
            error: error.message
          };
        }
      }

      // Определяем общий статус
      const moduleStatuses = Object.values(diagnostics.modules).map(m => m.status);
      if (moduleStatuses.includes('ERROR')) {
        diagnostics.overall_status = 'ERROR';
      } else if (moduleStatuses.includes('DEGRADED')) {
        diagnostics.overall_status = 'DEGRADED';
      }

    } catch (error) {
      diagnostics.overall_status = 'ERROR';
      diagnostics.error = error.message;
    }

    return diagnostics;
  }

  /**
   * Создание комплексного отчета
   */
  async generateComprehensiveReport() {
    const report = {
      generated_at: new Date().toISOString(),
      report_type: 'comprehensive_admin_report',
      version: '2.0.0',
      architecture: 'modular',
      
      // Общая информация
      overview: {
        admin_id: this.adminId,
        total_commands: this.commandStats.totalCommands,
        uptime: this.formatUptime(process.uptime()),
        memory_usage: this.getMemoryUsage() + 'MB'
      },
      
      // Статистика модулей
      module_stats: this.getAggregatedStats(),
      
      // Агрегированная аналитика
      analytics: this.getAggregatedAnalytics(),
      
      // Диагностика модулей
      modules_diagnostics: await this.performModulesDiagnostics(),
      
      // Системные метрики
      system_metrics: this.systemHandler.getSystemMetrics(),
      
      // Рекомендации
      recommendations: this.generateOverallRecommendations()
    };

    return report;
  }

  generateOverallRecommendations() {
    const recommendations = [];
    const totalErrors = this.commandStats.errors;
    const moduleStats = this.commandStats.moduleStats;
    
    if (totalErrors > 10) {
      recommendations.push({
        type: 'stability',
        priority: 'high',
        message: 'Высокое количество ошибок - требуется комплексная диагностика'
      });
    }
    
    if (moduleStats.other > moduleStats.main + moduleStats.stats + moduleStats.leads + moduleStats.system) {
      recommendations.push({
        type: 'architecture',
        priority: 'medium',
        message: 'Много необработанных команд - рассмотреть расширение модулей'
      });
    }
    
    const memUsage = this.getMemoryUsage();
    if (memUsage > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Высокое потребление памяти - требуется оптимизация'
      });
    }
    
    if (this.commandStats.totalCommands === 0) {
      recommendations.push({
        type: 'usage',
        priority: 'low',
        message: 'Админ-панель не используется - проверить доступность'
      });
    }
    
    return recommendations;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

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

  // ===== ЭКСПОРТ СТАТИСТИКИ =====

  getCommandStats() {
    const moduleStats = this.getAggregatedStats();
    
    return {
      ...this.commandStats,
      admin_id: this.adminId,
      module_statistics: moduleStats,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage()
    };
  }

  exportStats() {
    return {
      name: 'AdminHandlers',
      version: '2.0.0', // Увеличили версию после рефакторинга
      architecture: 'modular',
      admin_id: this.adminId,
      modules: [
        'main_handler',
        'stats_handler',
        'leads_handler',
        'system_handler'
      ],
      features: [
        'modular_architecture',
        'command_routing',
        'aggregated_analytics',
        'comprehensive_reporting',
        'module_diagnostics',
        'error_handling',
        'backward_compatibility'
      ],
      command_stats: this.getCommandStats(),
      aggregated_stats: this.getAggregatedStats(),
      last_updated: new Date().toISOString()
    };
  }

  cleanup() {
    console.log('🧹 Очистка модульных AdminHandlers...');
    
    // Очищаем все модули
    this.mainHandler.cleanup();
    this.statsHandler.cleanup();
    this.leadsHandler.cleanup();
    this.systemHandler.cleanup();
    
    console.log('📊 Финальная статистика команд:', JSON.stringify(this.getCommandStats(), null, 2));
    console.log('✅ Модульные AdminHandlers очищены');
  }
}

module.exports = AdminHandlers;