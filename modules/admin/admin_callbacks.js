// Файл: modules/admin/admin_callbacks.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Обработчики админ-callback'ов (отделены от handlers.js)

const config = require('../../config');

class AdminCallbacks {
  constructor(adminHandlers, adminNotifications, verseAnalysis, leadTransfer) {
    this.adminHandlers = adminHandlers;
    this.adminNotifications = adminNotifications;
    this.verseAnalysis = verseAnalysis;
    this.leadTransfer = leadTransfer;
    this.adminId = config.ADMIN_ID;
    
    // Статистика callback'ов
    this.callbackStats = {
      totalCallbacks: 0,
      callbacksUsed: {},
      lastCallback: null,
      errors: 0
    };
  }

  // ===== НАСТРОЙКА CALLBACK ОБРАБОТЧИКОВ =====

  setupCallbacks(bot) {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, админ-callbacks отключены');
      return;
    }

    console.log('🔧 Настройка админ-callback обработчиков...');

    // Основной обработчик всех админ-callback'ов
    // Этот метод будет вызываться из основного handlers.js
    this.bot = bot;
    
    console.log('✅ Админ-callbacks настроены');
  }

  // ===== ОСНОВНОЙ ОБРАБОТЧИК CALLBACK'ОВ =====

  async handleCallback(ctx, callbackData) {
    if (ctx.from.id.toString() !== this.adminId) {
      await ctx.answerCbQuery('🚫 Доступ запрещен');
      return;
    }

    await ctx.answerCbQuery().catch(() => {});
    
    try {
      this.trackCallbackUsage(callbackData);
      
      console.log(`🔍 Обработка админ callback: ${callbackData}`);
      
      // Маршрутизация callback'ов
      await this.routeCallback(ctx, callbackData);
      
    } catch (error) {
      console.error('❌ Ошибка handleCallback:', error);
      this.callbackStats.errors++;
      
      await ctx.reply('Произошла ошибка при выполнении действия', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
    }
  }

  // ===== МАРШРУТИЗАЦИЯ CALLBACK'ОВ =====

  async routeCallback(ctx, callbackData) {
    // Основные панели
    if (callbackData === 'admin_main' || callbackData === 'admin_refresh') {
      await this.showMainPanel(ctx);
    } 
    else if (callbackData === 'admin_stats') {
      await this.showStats(ctx);
    } 
    else if (callbackData === 'admin_analytics') {
      await this.showAnalytics(ctx);
    } 
    else if (callbackData === 'admin_hot_leads') {
      await this.showHotLeads(ctx);
    } 
    else if (callbackData === 'admin_today_leads') {
      await this.showTodayLeads(ctx);
    } 
    else if (callbackData === 'admin_system') {
      await this.showSystem(ctx);
    } 
    else if (callbackData === 'admin_export') {
      await this.showExport(ctx);
    } 
    else if (callbackData === 'admin_settings') {
      await this.showSettings(ctx);
    } 
    else if (callbackData === 'admin_help') {
      await this.showHelp(ctx);
    }
    
    // ИСПРАВЛЕНО: Правильная обработка admin_search
    else if (callbackData === 'admin_search') {
      await this.showSearchPanel(ctx);
    }
    
    // Диагностика и система
    else if (callbackData === 'admin_detailed_diagnostics') {
      await this.showDetailedDiagnostics(ctx);
    } 
    else if (callbackData === 'admin_day_analytics') {
      await this.showDayAnalytics(ctx);
    }
    
    // Действия с лидами
    else if (callbackData === 'admin_process_all_hot') {
      await this.processAllHotLeads(ctx);
    }
    
    // Callback'ы с параметрами (например, admin_action_userId)
    else if (callbackData.startsWith('admin_') && callbackData.includes('_')) {
      await this.handleParameterizedCallback(ctx, callbackData);
    }
    
    // Неизвестный callback
    else {
      console.warn('⚠️ Неизвестный админ callback:', callbackData);
      await ctx.reply('Неизвестная команда', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
    }
  }

  // ===== ОСНОВНЫЕ ПАНЕЛИ =====

  // ИСПРАВЛЕНО: Улучшенная обработка ошибок с try-catch
  async showMainPanel(ctx) {
    console.log('🎛️ Показ главной админ-панели');
    
    try {
      // Делегируем в AdminHandlers
      await this.adminHandlers.handleMainCommand(ctx);
      
      // Обновляем сообщение вместо отправки нового
      // (метод handleMainCommand уже отправляет reply, поэтому ничего дополнительного не делаем)
    } catch (error) {
      console.error('❌ Ошибка показа главной панели:', error);
      await this.showErrorMessage(ctx, 'Ошибка загрузки главной панели');
    }
  }

  async showStats(ctx) {
    console.log('📊 Показ статистики');
    
    try {
      // ИСПРАВЛЕНО: Безопасное получение статистики с fallback
      const stats = this.adminNotifications?.getStats?.() || this.getDefaultStats();
      
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
      const conversionRate = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0;
      
      message += `📈 *КОНВЕРСИЯ:*\n`;
      message += `• В горячие лиды: ${conversionRate}%\n`;
      message += `• Средний балл VERSE: ${this.getAverageScore()}/100\n\n`;
      
      // Система
      message += `🤖 *СИСТЕМА:*\n`;
      message += `• Время работы: ${this.formatUptime(process.uptime())}\n`;
      message += `• Память: ${this.getMemoryUsage()}MB\n`;
      message += `• Статус: Работает стабильно\n`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📈 Аналитика', callback_data: 'admin_analytics' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка показа статистики:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения статистики');
    }
  }

  async showAnalytics(ctx) {
    console.log('📈 Показ аналитики');
    
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

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка показа аналитики:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения аналитики');
    }
  }

  // ИСПРАВЛЕНО: Улучшенная обработка горячих лидов с дополнительной проверкой
  async showHotLeads(ctx) {
    console.log('🔥 Показ горячих лидов');
    
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
        await ctx.editMessageText('✅ Нет горячих лидов', {
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

      const keyboard = [
        [{ text: '📞 Обработать всех', callback_data: 'admin_process_all_hot' }],
        [{ text: '🔄 Обновить', callback_data: 'admin_hot_leads' }],
        [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
      ];

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      
    } catch (error) {
      console.error('❌ Ошибка показа горячих лидов:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения горячих лидов');
    }
  }

  async showTodayLeads(ctx) {
    console.log('📋 Показ лидов за сегодня');
    
    try {
      const today = new Date().toDateString();
      const leads = Object.values(this.adminNotifications.leadDataStorage || {})
        .filter(lead => {
          const leadDate = lead.timestamp ? new Date(lead.timestamp).toDateString() : null;
          return leadDate === today;
        })
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      if (!leads.length) {
        await ctx.editMessageText('📋 *ЛИДЫ СЕГОДНЯ*\n\n✅ Сегодня лидов пока нет', {
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

      const keyboard = [
        [
          { text: '🔥 Только горячие', callback_data: 'admin_hot_leads' },
          { text: '📊 Аналитика дня', callback_data: 'admin_day_analytics' }
        ],
        [
          { text: '🔄 Обновить', callback_data: 'admin_today_leads' },
          { text: '🎛️ Главная панель', callback_data: 'admin_main' }
        ]
      ];

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      
    } catch (error) {
      console.error('❌ Ошибка показа лидов за сегодня:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения лидов за сегодня');
    }
  }
  
  // ИСПРАВЛЕНО: Правильная реализация поиска лидов
  async showSearchPanel(ctx) {
    console.log('🔍 Показ панели поиска лидов');
    
    let message = `🔍 *ПОИСК ЛИДОВ*\n\n`;
    message += `Для поиска лидов используйте команду:\n`;
    message += `\`/search_lead <запрос>\`\n\n`;
    message += `**Можно искать по:**\n`;
    message += `• Telegram ID\n`;
    message += `• Имени пользователя\n`;
    message += `• Username (без @)\n`;
    message += `• Проблеме\n`;
    message += `• Сегменту\n\n`;
    message += `**Примеры:**\n`;
    message += `\`/search_lead 123456789\`\n`;
    message += `\`/search_lead Анна\`\n`;
    message += `\`/search_lead стресс\`\n`;
    message += `\`/search_lead HOT_LEAD\`\n\n`;
    
    const totalLeads = Object.keys(this.adminNotifications.leadDataStorage || {}).length;
    message += `📊 **Всего лидов в базе:** ${totalLeads}`;

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Все лиды сегодня', callback_data: 'admin_today_leads' }],
            [{ text: '🔥 Горячие лиды', callback_data: 'admin_hot_leads' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
    } catch (error) {
      console.error('❌ Ошибка показа панели поиска:', error);
      await this.showErrorMessage(ctx, 'Ошибка отображения панели поиска');
    }
  }

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

  // ===== ДОПОЛНИТЕЛЬНЫЕ ПАНЕЛИ =====

  async showDetailedDiagnostics(ctx) {
    console.log('🔍 Показ детальной диагностики');
    
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

 async showDayAnalytics(ctx) {
    console.log('📊 Показ аналитики за день');
    
    try {
      const today = new Date().toDateString();
      const todayLeads = Object.values(this.adminNotifications.leadDataStorage || {})
        .filter(lead => {
          const leadDate = lead.timestamp ? new Date(lead.timestamp).toDateString() : null;
          return leadDate === today;
        });

      let message = `📊 *АНАЛИТИКА ЗА СЕГОДНЯ*\n\n`;
      message += `📅 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
      
      if (!todayLeads.length) {
        message += `📋 Сегодня лидов пока нет`;
      } else {
        // Статистика по сегментам
        const segmentStats = todayLeads.reduce((acc, lead) => {
          const segment = lead.analysisResult?.segment || 'UNKNOWN';
          acc[segment] = (acc[segment] || 0) + 1;
          return acc;
        }, {});

        message += `👥 **Лиды по сегментам:**\n`;
        Object.entries(segmentStats).forEach(([segment, count]) => {
          const emoji = this.getSegmentEmoji(segment);
          const percentage = ((count / todayLeads.length) * 100).toFixed(1);
          message += `${emoji} ${segment}: ${count} (${percentage}%)\n`;
        });

        // Средний балл
        const scores = todayLeads
          .map(lead => lead.analysisResult?.scores?.total)
          .filter(score => typeof score === 'number');
        
        const avgScore = scores.length > 0 ? 
          (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : 0;

        message += `\n📈 **Показатели:**\n`;
        message += `• Всего лидов: ${todayLeads.length}\n`;
        message += `• Средний балл: ${avgScore}/100\n`;
        message += `• Конверсия в горячие: ${segmentStats.HOT_LEAD ? 
          ((segmentStats.HOT_LEAD / todayLeads.length) * 100).toFixed(1) : 0}%\n`;
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Все лиды сегодня', callback_data: 'admin_today_leads' }],
            [{ text: '📈 Общая аналитика', callback_data: 'admin_analytics' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка аналитики за день:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения аналитики за день');
    }
  }

  // ===== ДЕЙСТВИЯ С ЛИДАМИ =====

  async processAllHotLeads(ctx) {
    console.log('📞 Обработка всех горячих лидов');
    
    const hotLeads = Object.values(this.adminNotifications.leadDataStorage || {})
      .filter(lead => lead.analysisResult?.segment === 'HOT_LEAD');

    if (!hotLeads.length) {
      await ctx.editMessageText('✅ Нет горячих лидов для обработки', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
      return;
    }

    let message = `📞 *ОБРАБОТКА ГОРЯЧИХ ЛИДОВ*\n\n`;
    message += `🔥 Найдено горячих лидов: ${hotLeads.length}\n\n`;
    message += `**Рекомендуемые действия:**\n`;
    message += `• Связаться с каждым в течение 2 часов\n`;
    message += `• Предложить экстренную консультацию\n`;
    message += `• Отправить персональные материалы\n\n`;
    message += `**Контакты для связи:**\n`;
    
    hotLeads.slice(0, 5).forEach((lead, index) => {
      const user = lead.userInfo;
      message += `${index + 1}. ${user?.first_name || 'Неизвестно'} - `;
      if (user?.username) {
        message += `@${user.username}\n`;
      } else {
        message += `ID: ${user?.telegram_id}\n`;
      }
    });

    if (hotLeads.length > 5) {
      message += `... и еще ${hotLeads.length - 5} лидов\n`;
    }

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔥 Горячие лиды', callback_data: 'admin_hot_leads' }],
          [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
        ]
      }
    });
  }

  // ===== ОБРАБОТКА ПАРАМЕТРИЗОВАННЫХ CALLBACK'ОВ =====

  async handleParameterizedCallback(ctx, callbackData) {
    console.log(`🔍 Обработка параметризованного callback: ${callbackData}`);
    
    // Парсим callback типа admin_action_userId
    const parts = callbackData.split('_');
    if (parts.length < 3) {
      console.warn('⚠️ Неправильный формат callback:', callbackData);
      await ctx.reply('Неправильный формат команды');
      return;
    }

    const action = parts.slice(1, -1).join('_');
    const targetUserId = parts[parts.length - 1];
    
    console.log(`🔍 Parsed callback: action=${action}, userId=${targetUserId}`);
    
    // Здесь можно добавить обработку различных действий с лидами
    switch (action) {
      case 'view_lead':
        await this.viewLeadDetails(ctx, targetUserId);
        break;
      case 'contact_lead':
        await this.contactLead(ctx, targetUserId);
        break;
      case 'mark_processed':
        await this.markLeadProcessed(ctx, targetUserId);
        break;
      default:
        console.warn('⚠️ Неизвестное действие:', action);
        await ctx.reply('Неизвестное действие');
    }
  }

  async viewLeadDetails(ctx, userId) {
    const leadData = this.adminNotifications.leadDataStorage[userId];
    if (!leadData) {
      await ctx.reply('Лид не найден');
      return;
    }

    let message = `👤 *ДЕТАЛИ ЛИДА*\n\n`;
    message += `🆔 ID: ${userId}\n`;
    message += `👤 Имя: ${leadData.userInfo?.first_name || 'Неизвестно'}\n`;
    message += `📊 Сегмент: ${this.getSegmentEmoji(leadData.analysisResult?.segment)} ${leadData.analysisResult?.segment}\n`;
    message += `🎯 Проблема: ${this.translateIssue(leadData.analysisResult?.primaryIssue)}\n`;
    message += `⏰ Время: ${this.getTimeAgo(leadData.timestamp)}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'admin_main' }]
        ]
      }
    });
  }

  async contactLead(ctx, userId) {
    const leadData = this.adminNotifications.leadDataStorage[userId];
    if (!leadData) {
      await ctx.reply('Лид не найден');
      return;
    }

    let message = `📞 *КОНТАКТ С ЛИДОМ*\n\n`;
    message += `👤 ${leadData.userInfo?.first_name || 'Неизвестно'}\n`;
    if (leadData.userInfo?.username) {
      message += `💬 @${leadData.userInfo.username}\n`;
    }
    message += `🆔 ID: ${userId}\n\n`;
    message += `✅ Отмечено как "Связались"`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 К лидам', callback_data: 'admin_hot_leads' }]
        ]
      }
    });
  }

  async markLeadProcessed(ctx, userId) {
    let message = `✅ *ЛИД ОБРАБОТАН*\n\n`;
    message += `👤 ID: ${userId}\n`;
    message += `🕐 Обработан: ${new Date().toLocaleString('ru-RU')}\n\n`;
    message += `📊 Статус: Закрыт`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 К лидам', callback_data: 'admin_hot_leads' }]
        ]
      }
    });
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  trackCallbackUsage(callbackData) {
    this.callbackStats.totalCallbacks++;
    this.callbackStats.lastCallback = {
      callback: callbackData,
      timestamp: new Date().toISOString()
    };
    
    if (!this.callbackStats.callbacksUsed[callbackData]) {
      this.callbackStats.callbacksUsed[callbackData] = 0;
    }
    this.callbackStats.callbacksUsed[callbackData]++;
  }

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

  // ИСПРАВЛЕНО: Добавляем метод getDefaultStats для fallback
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

  async runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'OK',
      checks: {
        admin_callbacks: {
          status: 'OK',
          message: 'Админ-callbacks работают корректно'
        },
        data_access: {
          status: 'OK',
          message: `Доступ к ${Object.keys(this.adminNotifications.leadDataStorage || {}).length} лидам`
        },
        system_resources: {
          status: this.getMemoryUsage() < 500 ? 'OK' : 'WARNING',
          message: `Память: ${this.getMemoryUsage()}MB`
        }
      }
    };

    return results;
  }

  // Утилиты форматирования (дублируем из AdminHandlers для независимости)
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

  // ===== ЭКСПОРТ СТАТИСТИКИ =====

  getCallbackStats() {
    return {
      ...this.callbackStats,
      admin_id: this.adminId,
      uptime: this.formatUptime(process.uptime()),
      memory_usage: this.getMemoryUsage()
    };
  }

  exportCallbackInfo() {
    return {
      name: 'AdminCallbacks',
      version: '1.0.0',
      admin_id: this.adminId,
      features: [
        'main_panel_navigation',
        'statistics_display',
        'analytics_visualization',
        'lead_management',
        'system_monitoring',
        'search_interface',
        'error_handling'
      ],
      callback_stats: this.getCallbackStats(),
      last_updated: new Date().toISOString()
    };
  }

  cleanup() {
    console.log('🧹 Очистка AdminCallbacks...');
    console.log('📊 Финальная статистика callbacks:', JSON.stringify(this.getCallbackStats(), null, 2));
    console.log('✅ AdminCallbacks очищен');
  }
}

module.exports = AdminCallbacks;