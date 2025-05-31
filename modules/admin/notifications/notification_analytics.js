// Файл: modules/admin/notifications/notification_analytics.js
// Аналитика и статистика для системы уведомлений

class NotificationAnalytics {
  constructor() {
    // Статистика уведомлений
    this.notificationStats = {
      totalSent: 0,
      successful: 0,
      failed: 0,
      byType: {
        lead_notification: 0,
        survey_results: 0,
        urgent_notification: 0,
        daily_summary: 0
      },
      bySegment: {
        HOT_LEAD: 0,
        WARM_LEAD: 0,
        COLD_LEAD: 0,
        NURTURE_LEAD: 0
      },
      hourlyDistribution: {},
      lastReset: new Date().toDateString()
    };

    // Статистика ошибок
    this.errorStats = {
      totalErrors: 0,
      byType: {},
      recentErrors: [],
      maxRecentErrors: 10
    };

    // Статистика производительности
    this.performanceStats = {
      averageResponseTime: 0,
      totalResponseTime: 0,
      responseCount: 0,
      slowNotifications: 0,
      fastNotifications: 0
    };

    // Лог активности
    this.activityLog = [];
    this.maxLogEntries = 100;
  }

  /**
   * Обновляет статистику при отправке уведомления
   */
  updateStats(segment, notificationType = 'lead_notification') {
    this.notificationStats.totalSent++;
    this.notificationStats.successful++;
    
    // Статистика по типам
    if (this.notificationStats.byType[notificationType] !== undefined) {
      this.notificationStats.byType[notificationType]++;
    }
    
    // Статистика по сегментам
    if (segment && this.notificationStats.bySegment[segment] !== undefined) {
      this.notificationStats.bySegment[segment]++;
    }
    
    // Почасовое распределение
    const hour = new Date().getHours();
    if (!this.notificationStats.hourlyDistribution[hour]) {
      this.notificationStats.hourlyDistribution[hour] = 0;
    }
    this.notificationStats.hourlyDistribution[hour]++;
    
    this.logActivity('notification_sent', { segment, type: notificationType });
    
    // Сброс статистики если новый день
    this.resetStatsIfNeeded();
  }

  /**
   * Логирует ошибку
   */
  logError(errorType, error, context = {}) {
    this.errorStats.totalErrors++;
    this.notificationStats.failed++;
    
    // Статистика по типам ошибок
    if (!this.errorStats.byType[errorType]) {
      this.errorStats.byType[errorType] = 0;
    }
    this.errorStats.byType[errorType]++;
    
    // Добавляем в список недавних ошибок
    const errorEntry = {
      type: errorType,
      message: error.message || error,
      context: context,
      timestamp: new Date().toISOString(),
      stack: error.stack || null
    };
    
    this.errorStats.recentErrors.unshift(errorEntry);
    
    // Ограничиваем количество сохраняемых ошибок
    if (this.errorStats.recentErrors.length > this.errorStats.maxRecentErrors) {
      this.errorStats.recentErrors = this.errorStats.recentErrors.slice(0, this.errorStats.maxRecentErrors);
    }
    
    this.logActivity('error_occurred', { type: errorType, message: error.message || error });
    
    console.error(`📊 Analytics: ${errorType} error logged`, errorEntry);
  }

  /**
   * Отслеживает время отклика уведомлений
   */
  trackResponseTime(responseTime) {
    this.performanceStats.responseCount++;
    this.performanceStats.totalResponseTime += responseTime;
    this.performanceStats.averageResponseTime = 
      this.performanceStats.totalResponseTime / this.performanceStats.responseCount;
    
    // Классификация по скорости (медленные > 2 секунд)
    if (responseTime > 2000) {
      this.performanceStats.slowNotifications++;
    } else {
      this.performanceStats.fastNotifications++;
    }
    
    this.logActivity('response_time_tracked', { responseTime });
  }

  /**
   * Получает детальную аналитику
   */
  getDetailedAnalytics() {
    const now = new Date();
    const uptime = Date.now() - (this.activityLog[0]?.timestamp || Date.now());
    
    return {
      // Основная статистика
      overview: {
        total_notifications: this.notificationStats.totalSent,
        successful: this.notificationStats.successful,
        failed: this.notificationStats.failed,
        success_rate: this.calculateSuccessRate(),
        error_rate: this.calculateErrorRate()
      },
      
      // Распределение по типам
      by_type: this.notificationStats.byType,
      
      // Распределение по сегментам
      by_segment: this.notificationStats.bySegment,
      
      // Почасовое распределение
      hourly_distribution: this.getHourlyAnalytics(),
      
      // Статистика ошибок
      errors: {
        total: this.errorStats.totalErrors,
        by_type: this.errorStats.byType,
        recent: this.errorStats.recentErrors.slice(0, 5), // Последние 5 ошибок
        most_frequent_error: this.getMostFrequentError()
      },
      
      // Производительность
      performance: {
        average_response_time: Math.round(this.performanceStats.averageResponseTime),
        fast_notifications: this.performanceStats.fastNotifications,
        slow_notifications: this.performanceStats.slowNotifications,
        performance_ratio: this.calculatePerformanceRatio()
      },
      
      // Временные метрики
      time_metrics: {
        uptime: uptime,
        last_reset: this.notificationStats.lastReset,
        analysis_date: now.toISOString(),
        timezone: 'Europe/Moscow'
      }
    };
  }

  /**
   * Получает аналитику по сегментам
   */
  getSegmentAnalytics() {
    const total = this.notificationStats.totalSent;
    const segments = this.notificationStats.bySegment;
    
    const analytics = {};
    
    Object.entries(segments).forEach(([segment, count]) => {
      analytics[segment] = {
        count: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
        trend: this.getSegmentTrend(segment)
      };
    });
    
    return {
      segments: analytics,
      most_active_segment: this.getMostActiveSegment(),
      total_leads: total,
      distribution_analysis: this.analyzeSegmentDistribution()
    };
  }

  /**
   * Получает аналитику производительности
   */
  getPerformanceAnalytics() {
    return {
      response_times: {
        average: Math.round(this.performanceStats.averageResponseTime),
        total_measured: this.performanceStats.responseCount,
        fast_count: this.performanceStats.fastNotifications,
        slow_count: this.performanceStats.slowNotifications
      },
      efficiency: {
        fast_ratio: this.calculatePerformanceRatio(),
        success_rate: this.calculateSuccessRate(),
        reliability_score: this.calculateReliabilityScore()
      },
      recommendations: this.getPerformanceRecommendations()
    };
  }

  /**
   * Получает аналитику ошибок
   */
  getErrorAnalytics() {
    return {
      error_summary: {
        total_errors: this.errorStats.totalErrors,
        error_rate: this.calculateErrorRate(),
        most_frequent: this.getMostFrequentError(),
        recent_count: this.errorStats.recentErrors.length
      },
      error_types: this.errorStats.byType,
      recent_errors: this.errorStats.recentErrors.slice(0, 3),
      error_trends: this.analyzeErrorTrends(),
      recommendations: this.getErrorRecommendations()
    };
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ РАСЧЕТОВ =====

  /**
   * Рассчитывает успешность отправки
   */
  calculateSuccessRate() {
    if (this.notificationStats.totalSent === 0) return 100;
    return ((this.notificationStats.successful / this.notificationStats.totalSent) * 100).toFixed(1);
  }

  /**
   * Рассчитывает долю ошибок
   */
  calculateErrorRate() {
    if (this.notificationStats.totalSent === 0) return 0;
    return ((this.notificationStats.failed / this.notificationStats.totalSent) * 100).toFixed(1);
  }

  /**
   * Рассчитывает отношение быстрых уведомлений
   */
  calculatePerformanceRatio() {
    const total = this.performanceStats.fastNotifications + this.performanceStats.slowNotifications;
    if (total === 0) return 100;
    return ((this.performanceStats.fastNotifications / total) * 100).toFixed(1);
  }

  /**
   * Рассчитывает общую надежность системы
   */
  calculateReliabilityScore() {
    const successRate = parseFloat(this.calculateSuccessRate());
    const performanceRatio = parseFloat(this.calculatePerformanceRatio());
    const errorPenalty = Math.min(this.errorStats.totalErrors * 2, 20); // Максимум -20 за ошибки
    
    const score = Math.max(0, (successRate + performanceRatio) / 2 - errorPenalty);
    return Math.round(score);
  }

  /**
   * Получает наиболее частую ошибку
   */
  getMostFrequentError() {
    const errors = this.errorStats.byType;
    let maxType = null;
    let maxCount = 0;
    
    Object.entries(errors).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    });
    
    return maxType ? { type: maxType, count: maxCount } : null;
  }

  /**
   * Получает наиболее активный сегмент
   */
  getMostActiveSegment() {
    const segments = this.notificationStats.bySegment;
    let maxSegment = null;
    let maxCount = 0;
    
    Object.entries(segments).forEach(([segment, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxSegment = segment;
      }
    });
    
    return maxSegment ? { segment: maxSegment, count: maxCount } : null;
  }

  /**
   * Анализирует распределение по сегментам
   */
  analyzeSegmentDistribution() {
    const segments = this.notificationStats.bySegment;
    const total = this.notificationStats.totalSent;
    
    if (total === 0) return 'Нет данных';
    
    const hotRatio = (segments.HOT_LEAD / total) * 100;
    
    if (hotRatio > 30) return 'Высокая доля критических лидов';
    if (hotRatio > 15) return 'Нормальная активность горячих лидов';
    if (hotRatio > 5) return 'Умеренная активность';
    return 'Низкая активность горячих лидов';
  }

  /**
   * Получает тренд для сегмента (упрощенная версия)
   */
  getSegmentTrend(segment) {
    // В реальной реализации здесь был бы анализ исторических данных
    const recentActivity = this.activityLog
      .filter(entry => entry.context?.segment === segment)
      .slice(0, 10);
    
    if (recentActivity.length >= 5) return 'Активный';
    if (recentActivity.length >= 2) return 'Умеренный';
    return 'Низкий';
  }

  /**
   * Получает почасовую аналитику
   */
  getHourlyAnalytics() {
    const distribution = this.notificationStats.hourlyDistribution;
    const hours = Object.keys(distribution).map(Number).sort((a, b) => a - b);
    
    if (hours.length === 0) return { peak_hour: null, quiet_hour: null };
    
    let peakHour = hours[0];
    let quietHour = hours[0];
    
    hours.forEach(hour => {
      if (distribution[hour] > distribution[peakHour]) {
        peakHour = hour;
      }
      if (distribution[hour] < distribution[quietHour]) {
        quietHour = hour;
      }
    });
    
    return {
      peak_hour: { hour: peakHour, count: distribution[peakHour] },
      quiet_hour: { hour: quietHour, count: distribution[quietHour] },
      distribution: distribution
    };
  }

  /**
   * Анализирует тренды ошибок
   */
  analyzeErrorTrends() {
    const recentErrors = this.errorStats.recentErrors.slice(0, 5);
    if (recentErrors.length === 0) return 'Нет недавних ошибок';
    
    const errorTypes = {};
    recentErrors.forEach(error => {
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
    });
    
    const dominantError = Object.entries(errorTypes)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (dominantError && dominantError[1] >= 3) {
      return `Повторяющиеся ошибки: ${dominantError[0]}`;
    }
    
    return 'Разрозненные ошибки';
  }

  /**
   * Получает рекомендации по производительности
   */
  getPerformanceRecommendations() {
    const recommendations = [];
    
    if (this.performanceStats.averageResponseTime > 3000) {
      recommendations.push('Оптимизировать время отклика уведомлений');
    }
    
    if (this.calculateErrorRate() > 5) {
      recommendations.push('Улучшить обработку ошибок');
    }
    
    if (this.performanceStats.slowNotifications > this.performanceStats.fastNotifications) {
      recommendations.push('Проанализировать причины медленных уведомлений');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Производительность в норме');
    }
    
    return recommendations;
  }

  /**
   * Получает рекомендации по ошибкам
   */
  getErrorRecommendations() {
    const recommendations = [];
    const mostFrequent = this.getMostFrequentError();
    
    if (mostFrequent && mostFrequent.count > 3) {
      recommendations.push(`Устранить повторяющуюся ошибку: ${mostFrequent.type}`);
    }
    
    if (this.errorStats.totalErrors > 10) {
      recommendations.push('Провести аудит системы уведомлений');
    }
    
    if (this.calculateErrorRate() > 10) {
      recommendations.push('Критический уровень ошибок - требуется немедленное вмешательство');
    }
    
    if (recommendations.length === 0 && this.errorStats.totalErrors === 0) {
      recommendations.push('Ошибок не обнаружено');
    }
    
    return recommendations;
  }

  // ===== УТИЛИТЫ =====

  /**
   * Логирует активность
   */
  logActivity(type, context = {}) {
    const entry = {
      type: type,
      context: context,
      timestamp: new Date().toISOString()
    };
    
    this.activityLog.unshift(entry);
    
    // Ограничиваем размер лога
    if (this.activityLog.length > this.maxLogEntries) {
      this.activityLog = this.activityLog.slice(0, this.maxLogEntries);
    }
  }

  /**
   * Сбрасывает статистику если новый день
   */
  resetStatsIfNeeded() {
    const today = new Date().toDateString();
    
    if (this.notificationStats.lastReset !== today) {
      console.log('🔄 Сброс ежедневной статистики уведомлений');
      
      // Сохраняем данные за предыдущий день
      this.archiveDailyStats();
      
      // Сбрасываем ежедневную статистику
      this.notificationStats = {
        ...this.notificationStats,
        totalSent: 0,
        successful: 0,
        failed: 0,
        byType: {
          lead_notification: 0,
          survey_results: 0,
          urgent_notification: 0,
          daily_summary: 0
        },
        bySegment: {
          HOT_LEAD: 0,
          WARM_LEAD: 0,
          COLD_LEAD: 0,
          NURTURE_LEAD: 0
        },
        hourlyDistribution: {},
        lastReset: today
      };
    }
  }

  /**
   * Архивирует статистику предыдущего дня
   */
  archiveDailyStats() {
    // В реальной реализации здесь было бы сохранение в БД или файл
    console.log('📊 Архивирование статистики за', this.notificationStats.lastReset);
  }

  /**
   * Получает основную статистику
   */
  getStats() {
    return {
      notifications: this.notificationStats,
      errors: {
        total: this.errorStats.totalErrors,
        recent_count: this.errorStats.recentErrors.length
      },
      performance: {
        average_response_time: Math.round(this.performanceStats.averageResponseTime),
        success_rate: this.calculateSuccessRate() + '%'
      },
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Информация о компоненте
   */
  getInfo() {
    return {
      name: 'NotificationAnalytics',
      version: '1.0.0',
      features: [
        'notification_tracking',
        'error_analytics',
        'performance_monitoring',
        'segment_analysis',
        'hourly_distribution',
        'trend_analysis'
      ],
      metrics_tracked: [
        'success_rate',
        'error_rate',
        'response_time',
        'segment_distribution',
        'hourly_activity'
      ],
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Экспорт всех данных аналитики
   */
  exportAllData() {
    return {
      detailed_analytics: this.getDetailedAnalytics(),
      segment_analytics: this.getSegmentAnalytics(),
      performance_analytics: this.getPerformanceAnalytics(),
      error_analytics: this.getErrorAnalytics(),
      activity_log: this.activityLog.slice(0, 20), // Последние 20 событий
      export_timestamp: new Date().toISOString()
    };
  }
}

module.exports = NotificationAnalytics;