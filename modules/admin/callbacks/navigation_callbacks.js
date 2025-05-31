// Файл: modules/admin/callbacks/navigation_callbacks.js
// Обработчики основной навигации админ-панели

class NavigationCallbacks {
  constructor(adminHandlers, adminNotifications) {
    this.adminHandlers = adminHandlers;
    this.adminNotifications = adminNotifications;
    
    // Статистика навигации
    this.navigationStats = {
      totalNavigations: 0,
      routesUsed: {},
      lastNavigation: null
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
    message += `• Проверяйте системные метрики\n`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
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
      most_used_route: this.getMostUsedRoute(),
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
    console.log('✅ NavigationCallbacks очищен');
  }
}

module.exports = NavigationCallbacks;
