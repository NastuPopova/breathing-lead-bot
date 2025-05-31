// Файл: modules/admin/callbacks/stats_callbacks.js
// Обработчики статистики и аналитики

class StatsCallbacks {
  constructor(adminHandlers, adminNotifications) {
    this.adminHandlers = adminHandlers;
    this.adminNotifications = adminNotifications;
    
    // Статистика использования
    this.statsCallbacksUsage = {
      totalRequests: 0,
      callbacksUsed: {},
      lastRequest: null
    };
  }

  /**
   * Обработка callback'ов статистики
   */
  async handleCallback(ctx, callbackData) {
    this.trackStatsUsage(callbackData);
    
    try {
      switch (callbackData) {
        case 'admin_stats':
          await this.showStats(ctx);
          break;
          
        case 'admin_analytics':
          await this.showAnalytics(ctx);
          break;
          
        case 'admin_day_analytics':
          await this.showDayAnalytics(ctx);
          break;
          
        default:
          return false; // Не обработано этим модулем
      }
      return true;
    } catch (error) {
      console.error('❌ Ошибка StatsCallbacks:', error);
      throw error;
    }
  }

  /**
   * Показ общей статистики
   */
  async showStats(ctx) {
    console.log('📊 Показ статистики');
    
    try {
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

  /**
   * Показ аналитики
   */
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

  /**
   * Показ аналитики за день
   */
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

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

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

  async showErrorMessage(ctx, errorText) {
    try {
      await ctx.editMessageText(`❌ ${errorText}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Попробовать снова', callback_data: 'admin_stats' }],
            [{ text: '🎛️ Главная панель', callback_data: 'admin_main' }]
          ]
        }
      });
    } catch (error) {
      console.error('❌ Ошибка показа сообщения об ошибке:', error);
      await ctx.reply(`❌ ${errorText}`);
    }
  }

  trackStatsUsage(callback) {
    this.statsCallbacksUsage.totalRequests++;
    this.statsCallbacksUsage.lastRequest = {
      callback: callback,
      timestamp: new Date().toISOString()
    };
    
    if (!this.statsCallbacksUsage.callbacksUsed[callback]) {
      this.statsCallbacksUsage.callbacksUsed[callback] = 0;
    }
    this.statsCallbacksUsage.callbacksUsed[callback]++;
  }

  getStats() {
    return {
      name: 'StatsCallbacks',
      total_requests: this.statsCallbacksUsage.totalRequests,
      callbacks_used: this.statsCallbacksUsage.callbacksUsed,
      last_request: this.statsCallbacksUsage.lastRequest,
      last_updated: new Date().toISOString()
    };
  }

  cleanup() {
    console.log('🧹 Очистка StatsCallbacks...');
    console.log('📊 Статистика использования:', JSON.stringify(this.getStats(), null, 2));
    console.log('✅ StatsCallbacks очищен');
  }
}

module.exports = StatsCallbacks;