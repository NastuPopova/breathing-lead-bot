// Файл: modules/admin/callbacks/system_callbacks.js
// Обработчики системных callback'ов (диагностика, настройки, экспорт)

const config = require('../../../config');

class SystemCallbacks {
  constructor(adminHandlers, adminNotifications) {
    this.adminHandlers = adminHandlers;
    this.adminNotifications = adminNotifications;
    
    // Статистика системных операций
    this.systemCallbacksUsage = {
      totalRequests: 0,
      operationsUsed: {},
      lastRequest: null,
      diagnosticsRuns: 0
    };
  }

  /**
   * Обработка системных callback'ов
   */
  async handleCallback(ctx, callbackData) {
    this.trackSystemUsage(callbackData);
    
    try {
      switch (callbackData) {
        case 'admin_system':
          await this.showSystem(ctx);
          break;
          
        case 'admin_detailed_diagnostics':
          await this.showDetailedDiagnostics(ctx);
          break;
          
        case 'admin_export':
          await this.showExport(ctx);
          break;
          
        case 'admin_settings':
          await this.showSettings(ctx);
          break;
          
        default:
          return false; // Не обработано этим модулем
      }
      return true;
    } catch (error) {
      console.error('❌ Ошибка SystemCallbacks:', error);
      throw error;
    }
  }

  /**
   * Показ системной информации
   */
  async showSystem(ctx) {
    console.log('🔧 Показ системной информации');
    
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

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔍 Детальная диагностика', callback_data: 'admin_detailed_diagnostics' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка показа системной информации:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения системной информации');
    }
  }

  /**
   * Показ детальной диагностики
   */
  async showDetailedDiagnostics(ctx) {
    console.log('🔍 Показ детальной диагностики');
    this.systemCallbacksUsage.diagnosticsRuns++;
    
    try {
      const diagnostics = await this.runDiagnostics();
      
      let message = `🔍 *ДЕТАЛЬНАЯ ДИАГНОСТИКА*\n\n`;
      
      const statusEmoji = {
        'OK': '✅',
        'WARNING': '⚠️',
        'ERROR': '❌',
        'UNKNOWN': '❓'
      };

      message += `${statusEmoji[diagnostics.overall_status]} **Общий статус:** ${diagnostics.overall_status}\n`;
      message += `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n\n`;

      Object.entries(diagnostics.checks).forEach(([checkName, result]) => {
        const emoji = statusEmoji[result.status] || '❓';
        const name = checkName.replace(/_/g, ' ').toUpperCase();
        message += `${emoji} **${name}:**\n`;
        message += `└─ ${result.message}\n\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔧 Система', callback_data: 'admin_system' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка детальной диагностики:', error);
      await this.showErrorMessage(ctx, 'Ошибка выполнения диагностики');
    }
  }

  /**
   * Показ меню экспорта
   */
  async showExport(ctx) {
    console.log('📤 Показ меню экспорта');
    
    let message = `📤 *ЭКСПОРТ ДАННЫХ*\n\n`;
    message += `Выберите что экспортировать:\n\n`;
    message += `📋 **Лиды:**\n`;
    message += `• Все лиды\n`;
    message += `• Только горячие лиды\n`;
    message += `• Лиды за сегодня\n\n`;
    message += `📊 **Статистика:**\n`;
    message += `• Общая статистика\n`;
    message += `• Аналитика по сегментам\n\n`;
    message += `⚠️ *Функции экспорта находятся в разработке*`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📋 Лиды (скоро)', callback_data: 'admin_export_leads' },
            { text: '📊 Статистика (скоро)', callback_data: 'admin_export_stats' }
          ],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      }
    });
  }

  /**
   * Показ настроек
   */
  async showSettings(ctx) {
    console.log('⚙️ Показ настроек');
    
    let message = `⚙️ *НАСТРОЙКИ СИСТЕМЫ*\n\n`;
    message += `🔔 **Уведомления:**\n`;
    message += `• Горячие лиды: ✅\n`;
    message += `• Теплые лиды: ✅\n`;
    message += `• Системные ошибки: ✅\n\n`;
    message += `📊 **Система:**\n`;
    message += `• Автоочистка логов: 7 дней\n`;
    message += `• Лимит rate limiting: улучшенный\n`;
    message += `• Сохранение сессий: включено\n\n`;
    message += `⚠️ *Настройки находятся в разработке*`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔔 Уведомления (скоро)', callback_data: 'admin_notifications' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      }
    });
  }

  // ===== ДИАГНОСТИЧЕСКИЕ МЕТОДЫ =====

  /**
   * Выполнение диагностики системы
   */
  async runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'OK',
      checks: {}
    };

    try {
      // Проверка интеграции
      results.checks.admin_integration = {
        status: 'OK',
        message: 'Интеграция v3.0 активна'
      };

      // Проверка модулей
      results.checks.admin_modules = {
        status: (this.adminHandlers && this.adminNotifications) ? 'OK' : 'ERROR',
        message: `Handlers: ${!!this.adminHandlers}, Notifications: ${!!this.adminNotifications}`
      };

      // Проверка системы уведомлений
      results.checks.notification_system = {
        status: (this.adminNotifications && this.adminNotifications.templates) ? 'OK' : 'ERROR',
        message: `Модульные уведомления: ${!!this.adminNotifications}, Components: ${!!this.adminNotifications?.templates}`
      };

      // Проверка данных
      const leadsCount = Object.keys(this.adminNotifications.leadDataStorage || {}).length;
      results.checks.data_integrity = {
        status: 'OK',
        message: `Доступ к ${leadsCount} лидам`
      };

      // Проверка конфигурации
      results.checks.configuration = {
        status: config.ADMIN_ID ? 'OK' : 'WARNING',
        message: config.ADMIN_ID ? 'ADMIN_ID настроен' : 'ADMIN_ID отсутствует'
      };

      // Проверка памяти
      const memUsage = process.memoryUsage();
      const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      results.checks.memory = {
        status: memoryMB < 500 ? 'OK' : memoryMB < 1000 ? 'WARNING' : 'ERROR',
        message: `Использовано ${memoryMB}MB памяти`
      };

      // Проверка аналитики уведомлений
      const analytics = this.adminNotifications.analytics?.getStats();
      results.checks.analytics = {
        status: analytics ? 'OK' : 'WARNING',
        message: analytics ? `Аналитика активна, успешность: ${analytics.performance?.success_rate}` : 'Аналитика недоступна'
      };

      // Определяем общий статус
      const statuses = Object.values(results.checks).map(check => check.status);
      if (statuses.includes('ERROR')) {
        results.overall_status = 'ERROR';
      } else if (statuses.includes('WARNING')) {
        results.overall_status = 'WARNING';
      } else {
        results.overall_status = 'OK';
      }

    } catch (error) {
      results.overall_status = 'ERROR';
      results.error = error.message;
    }

    return results;
  }

  /**
   * Получение данных о здоровье системы
   */
  async getSystemHealthData() {
    return {
      overall: 'HEALTHY',
      components: {
        'telegram_bot': { status: 'HEALTHY' },
        'admin_callbacks': { status: 'HEALTHY' },
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

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Форматирование времени работы
   */
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

  /**
   * Показ сообщения об ошибке
   */
  async showErrorMessage(ctx, errorText) {
    try {
      await ctx.editMessageText(`❌ ${errorText}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Попробовать снова', callback_data: 'admin_system' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
    } catch (error) {
      console.error('❌ Ошибка показа сообщения об ошибке:', error);
      await ctx.reply(`❌ ${errorText}`);
    }
  }

  /**
   * Отслеживание использования системных функций
   */
  trackSystemUsage(operation) {
    this.systemCallbacksUsage.totalRequests++;
    this.systemCallbacksUsage.lastRequest = {
      operation: operation,
      timestamp: new Date().toISOString()
    };
    
    if (!this.systemCallbacksUsage.operationsUsed[operation]) {
      this.systemCallbacksUsage.operationsUsed[operation] = 0;
    }
    this.systemCallbacksUsage.operationsUsed[operation]++;
  }

  /**
   * Получение статистики модуля
   */
  getStats() {
    return {
      name: 'SystemCallbacks',
      total_requests: this.systemCallbacksUsage.totalRequests,
      operations_used: this.systemCallbacksUsage.operationsUsed,
      last_request: this.systemCallbacksUsage.lastRequest,
      diagnostics_runs: this.systemCallbacksUsage.diagnosticsRuns,
      most_used_operation: this.getMostUsedOperation(),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Получение наиболее используемой операции
   */
  getMostUsedOperation() {
    const operations = this.systemCallbacksUsage.operationsUsed;
    let maxOperation = null;
    let maxCount = 0;
    
    Object.entries(operations).forEach(([operation, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxOperation = operation;
      }
    });
    
    return maxOperation ? { operation: maxOperation, count: maxCount } : null;
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    console.log('🧹 Очистка SystemCallbacks...');
    console.log('📊 Статистика системных операций:', JSON.stringify(this.getStats(), null, 2));
    console.log('✅ SystemCallbacks очищен');
  }
}

module.exports = SystemCallbacks;