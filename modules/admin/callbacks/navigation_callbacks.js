// Файл: modules/admin/callbacks/navigation_callbacks.js
// Обновленная версия с поддержкой управления уведомлениями

class NavigationCallbacks {
  constructor(adminHandlers, adminNotifications) {
    this.adminHandlers = adminHandlers;
    this.adminNotifications = adminNotifications;
    
    // Статистика навигации
    this.navigationStats = {
      totalNavigations: 0,
      routesUsed: {},
      lastNavigation: null,
      notificationToggles: 0
    };
  }

  /**
   * Обработка callback'ов навигации
   */
  async handleCallback(ctx, callbackData) {
    this.trackNavigation(callbackData);
    
    try {
      switch (callbackData) {
        case 'admin_main':
        case 'admin_refresh':
          await this.showMainPanel(ctx);
          break;
          
        case 'admin_help':
          await this.showHelp(ctx);
          break;

        case 'admin_toggle_notifications':
          await this.handleToggleNotifications(ctx);
          break;

        case 'admin_test_notification':
          await this.handleTestNotification(ctx);
          break;

        case 'admin_notification_status':
          await this.handleNotificationStatus(ctx);
          break;
          
        default:
          return false; // Не обработано этим модулем
      }
      return true;
    } catch (error) {
      console.error('❌ Ошибка NavigationCallbacks:', error);
      throw error;
    }
  }

  /**
   * Показ главной панели
   */
  async showMainPanel(ctx) {
    console.log('🎛️ Показ главной админ-панели');
    
    try {
      await this.adminHandlers.handleMainCommand(ctx);
    } catch (error) {
      console.error('❌ Ошибка показа главной панели:', error);
      await this.showErrorMessage(ctx, 'Ошибка загрузки главной панели');
    }
  }

  /**
   * Переключение режима уведомлений
   */
  async handleToggleNotifications(ctx) {
    console.log('🔔 Переключение режима уведомлений через callback');
    this.navigationStats.notificationToggles++;
    
    try {
      if (this.adminHandlers.mainHandler && this.adminHandlers.mainHandler.handleToggleNotifications) {
        await this.adminHandlers.mainHandler.handleToggleNotifications(ctx);
      } else {
        // Fallback реализация
        await this.fallbackToggleNotifications(ctx);
      }
    } catch (error) {
      console.error('❌ Ошибка переключения уведомлений:', error);
      await ctx.answerCbQuery('Ошибка переключения режима');
    }
  }

  /**
   * Fallback реализация переключения уведомлений
   */
  async fallbackToggleNotifications(ctx) {
    if (!this.adminNotifications) {
      await ctx.answerCbQuery('Система уведомлений недоступна');
      return;
    }

    const oldMode = this.adminNotifications.getNotificationMode();
    const newMode = this.adminNotifications.toggleNotificationMode();
    
    let message = `🔄 *РЕЖИМ УВЕДОМЛЕНИЙ ИЗМЕНЕН*\n\n`;
    message += `📤 Было: ${oldMode.emoji} ${oldMode.mode}\n`;
    message += `📥 Стало: ${newMode.emoji} ${newMode.mode}\n\n`;
    message += `📝 ${newMode.description}\n\n`;
    message += `💡 Нажмите кнопку еще раз для следующего режима`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: newMode.buttonText, callback_data: 'admin_toggle_notifications' },
            { text: '🧪 Тест', callback_data: 'admin_test_notification' }
          ],
          [
            { text: '🎛️ Главная панель', callback_data: 'admin_main' }
          ]
        ]
      }
    });

    await ctx.answerCbQuery(`${newMode.emoji} ${newMode.mode}`);
  }

  /**
   * Отправка тестового уведомления
   */
  async handleTestNotification(ctx) {
    console.log('🧪 Тест уведомления через callback');
    
    try {
      if (this.adminHandlers.mainHandler && this.adminHandlers.mainHandler.handleTestNotification) {
        await this.adminHandlers.mainHandler.handleTestNotification(ctx);
      } else {
        // Fallback реализация
        await this.fallbackTestNotification(ctx);
      }
    } catch (error) {
      console.error('❌ Ошибка тестового уведомления:', error);
      await ctx.answerCbQuery('Ошибка отправки тестового уведомления');
    }
  }

  /**
   * Fallback реализация тестового уведомления
   */
  async fallbackTestNotification(ctx) {
    if (!this.adminNotifications) {
      await ctx.answerCbQuery('Система уведомлений недоступна');
      return;
    }

    await ctx.answerCbQuery('Отправляю тестовое уведомление...');

    try {
      await this.adminNotifications.sendTestNotification();
      
      const message = `🧪 *ТЕСТОВОЕ УВЕДОМЛЕНИЕ ОТПРАВЛЕНО*\n\n` +
        `✅ Проверьте чат - должно прийти тестовое сообщение\n` +
        `📊 Текущий режим: ${this.adminNotifications.getNotificationMode().emoji}\n\n` +
        `💡 Если уведомление не пришло, проверьте настройки`;

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
      const errorMessage = `❌ *ОШИБКА ТЕСТОВОГО УВЕДОМЛЕНИЯ*\n\n` +
        `🚫 ${error.message}\n\n` +
        `🔧 Проверьте настройки системы`;

      await ctx.editMessageText(errorMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
    }
  }

  /**
   * Показ статуса уведомлений
   */
  async handleNotificationStatus(ctx) {
    console.log('📊 Статус уведомлений через callback');
    
    try {
      if (this.adminHandlers.mainHandler && this.adminHandlers.mainHandler.handleNotificationStatus) {
        await this.adminHandlers.mainHandler.handleNotificationStatus(ctx);
      } else {
        // Fallback реализация
        await this.fallbackNotificationStatus(ctx);
      }
    } catch (error) {
      console.error('❌ Ошибка показа статуса уведомлений:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения статуса уведомлений');
    }
  }

  /**
   * Fallback реализация статуса уведомлений
   */
  async fallbackNotificationStatus(ctx) {
    if (!this.adminNotifications) {
      await ctx.editMessageText('❌ Система уведомлений недоступна');
      return;
    }

    const mode = this.adminNotifications.getNotificationMode();
    const stats = this.adminNotifications.getStats();
    
    let message = `📊 *СТАТУС УВЕДОМЛЕНИЙ*\n\n`;
    message += `${mode.emoji} **Режим:** ${mode.mode}\n`;
    message += `📝 ${mode.description}\n\n`;
    message += `📈 **Статистика:**\n`;
    message += `• Лидов сегодня: ${stats.daily_stats.totalLeads}\n`;
    message += `• Горячих: ${stats.daily_stats.hotLeads}\n`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Изменить', callback_data: 'admin_toggle_notifications' },
            { text: '🧪 Тест', callback_data: 'admin_test_notification' }
          ],
          [
            { text: '🎛️ Главная панель', callback_data: 'admin_main' }
          ]
        ]
      }
    });
  }

  /**
   * Показ справки
   */
  async showHelp(ctx) {
    console.log('🆘 Показ справки');
    
    let message = `🆘 *СПРАВКА ПО АДМИН-ПАНЕЛИ*\n\n`;
    
    message += `📋 **Основные команды:**\n`;
    message += `• \`/admin\` - главная панель\n`;
    message += `• \`/stats\` - детальная статистика\n`;
    message += `• \`/hot_leads\` - горячие лиды\n`;
    message += `• \`/search_lead <запрос>\` - поиск лидов\n`;
    message += `• \`/health\` - состояние системы\n\n`;
    
    message += `🔔 **Режимы уведомлений:**\n`;
    message += `• 🔇 Тихий - никаких уведомлений\n`;
    message += `• 🔒 Фильтр - только от других пользователей\n`;
    message += `• 🧪 Тест - все уведомления (включая свои)\n`;
    message += `• 🔓 Все - без фильтров\n\n`;
    
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
    message += `• Следите за горячими лидами\n`;
    message += `• Переключайте режимы уведомлений\n`;
    message += `• Тестируйте функциональность\n`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔔 Настройки уведомлений', callback_data: 'admin_notification_status' },
            { text: '🧪 Тест', callback_data: 'admin_test_notification' }
          ],
          [
            { text: '🎛️ Главная панель', callback_data: 'admin_main' }
          ]
        ]
      }
    });
  }

  /**
   * Показ сообщения об ошибке
   */
  async showErrorMessage(ctx, errorText) {
    try {
      await ctx.editMessageText(`❌ ${errorText}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Попробовать снова', callback_data: 'admin_main' }],
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
   * Отслеживание навигации
   */
  trackNavigation(route) {
    this.navigationStats.totalNavigations++;
    this.navigationStats.lastNavigation = {
      route: route,
      timestamp: new Date().toISOString()
    };
    
    if (!this.navigationStats.routesUsed[route]) {
      this.navigationStats.routesUsed[route] = 0;
    }
    this.navigationStats.routesUsed[route]++;
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      name: 'NavigationCallbacks',
      total_navigations: this.navigationStats.totalNavigations,
      routes_used: this.navigationStats.routesUsed,
      last_navigation: this.navigationStats.lastNavigation,
      notification_toggles: this.navigationStats.notificationToggles,
      most_used_route: this.getMostUsedRoute(),
      supported_callbacks: [
        'admin_main',
        'admin_refresh', 
        'admin_help',
        'admin_toggle_notifications',
        'admin_test_notification',
        'admin_notification_status'
      ],
      last_updated: new Date().toISOString()
    };
  }

  getMostUsedRoute() {
    const routes = this.navigationStats.routesUsed;
    let maxRoute = null;
    let maxCount = 0;
    
    Object.entries(routes).forEach(([route, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxRoute = route;
      }
    });
    
    return maxRoute ? { route: maxRoute, count: maxCount } : null;
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    console.log('🧹 Очистка NavigationCallbacks...');
    console.log('📊 Статистика навигации:', JSON.stringify(this.getStats(), null, 2));
    console.log(`📈 Переключений уведомлений: ${this.navigationStats.notificationToggles}`);
    console.log('✅ NavigationCallbacks очищен');
  }
}

module.exports = NavigationCallbacks;
