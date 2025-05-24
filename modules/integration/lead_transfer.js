// Файл: lead_bot/modules/integration/lead_transfer.js
// Система интеграции с основным ботом и CRM

const axios = require('axios');
const config = require('../../config');

class LeadTransferSystem {
  constructor() {
    this.mainBotApiUrl = config.MAIN_BOT_API_URL;
    this.crmWebhookUrl = config.CRM_WEBHOOK_URL;
    this.retryAttempts = 3;
    this.retryDelay = 2000; // 2 секунды
  }

  /**
   * Передача лида в основной бот
   */
  async transferToMainBot(userData) {
    const payload = this.prepareMainBotPayload(userData);
    
    try {
      console.log('📤 Передаем лида в основной бот:', userData.telegram_id);
      
      const response = await this.makeRequest('POST', `${this.mainBotApiUrl}/api/leads/import`, payload);
      
      console.log('✅ Лид успешно передан в основной бот');
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('❌ Ошибка передачи в основной бот:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Передача данных в CRM
   */
  async transferToCRM(userData) {
    if (!this.crmWebhookUrl) {
      console.log('⚠️ CRM webhook не настроен, пропускаем передачу');
      return { success: true, skipped: true };
    }

    const payload = this.prepareCRMPayload(userData);
    
    try {
      console.log('📤 Передаем лида в CRM:', userData.telegram_id);
      
      const response = await this.makeRequest('POST', this.crmWebhookUrl, payload);
      
      console.log('✅ Лид успешно передан в CRM');
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('❌ Ошибка передачи в CRM:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Уведомление Анастасии о новом лиде
   */
  async notifyAnastasia(userData) {
    if (!config.ADMIN_ID) {
      console.log('⚠️ ADMIN_ID не настроен, пропускаем уведомление');
      return { success: true, skipped: true };
    }

    const message = this.prepareAdminNotification(userData);
    
    try {
      console.log('📢 Отправляем уведомление Анастасии');
      
      // Здесь можно отправить через основной бот или напрямую через Telegram API
      const response = await this.makeRequest('POST', `${this.mainBotApiUrl}/api/admin/notify`, {
        admin_id: config.ADMIN_ID,
        message: message,
        priority: this.getNotificationPriority(userData.analysisResult)
      });
      
      console.log('✅ Уведомление отправлено');
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Комплексная передача лида во все системы
   */
  async processLead(userData) {
    const results = {
      mainBot: null,
      crm: null,
      notification: null,
      timestamp: new Date().toISOString(),
      success: false
    };

    console.log('🚀 Начинаем обработку лида:', userData.telegram_id);

    // 1. Передача в основной бот (критично)
    results.mainBot = await this.transferToMainBot(userData);
    
    // 2. Передача в CRM (желательно)
    results.crm = await this.transferToCRM(userData);
    
    // 3. Уведомление администратора (желательно)
    results.notification = await this.notifyAnastasia(userData);

    // Определяем общий успех
    results.success = results.mainBot.success;

    if (results.success) {
      console.log('✅ Лид успешно обработан');
    } else {
      console.log('❌ Критическая ошибка обработки лида');
    }

    return results;
  }

  /**
   * Подготовка данных для основного бота
   */
  prepareMainBotPayload(userData) {
    const { userInfo, surveyAnswers, analysisResult, contactInfo } = userData;
    
    return {
      // Базовая информация о пользователе
      telegram_id: userInfo.telegram_id,
      username: userInfo.username,
      first_name: userInfo.first_name,
      last_name: userInfo.last_name,
      
      // Источник лида
      source: 'lead_bot',
      source_channel: 'telegram_diagnostic_bot',
      
      // Результаты анкеты
      survey_data: {
        answers: surveyAnswers,
        completed_at: new Date().toISOString(),
        session_duration: this.calculateSessionDuration(userData),
        questions_count: Object.keys(surveyAnswers).length
      },
      
      // Результаты VERSE-анализа
      analysis: {
        segment: analysisResult.segment,
        primary_issue: analysisResult.primaryIssue,
        scores: analysisResult.scores,
        profile: analysisResult.profile,
        recommendations: analysisResult.recommendations
      },
      
      // Персонализация
      personalization: {
        recommended_program: analysisResult.recommendations.main_program,
        urgent_techniques: analysisResult.recommendations.urgent_techniques,
        consultation_type: analysisResult.recommendations.consultation_type,
        support_materials: analysisResult.recommendations.support_materials,
        timeline: analysisResult.recommendations.timeline
      },
      
      // Контактная информация (если есть)
      contact_info: contactInfo || null,
      
      // Метаданные
      metadata: {
        lead_quality: analysisResult.segment,
        urgency_level: this.getUrgencyLevel(analysisResult.scores.urgency),
        expected_success_rate: analysisResult.profile.expectedSuccess,
        processing_timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Подготовка данных для CRM
   */
  prepareCRMPayload(userData) {
    const { userInfo, analysisResult, contactInfo } = userData;
    
    return {
      // Контактная информация
      contact: {
        name: `${userInfo.first_name} ${userInfo.last_name || ''}`.trim(),
        telegram: userInfo.username ? `@${userInfo.username}` : null,
        telegram_id: userInfo.telegram_id,
        phone: contactInfo?.phone || null,
        email: contactInfo?.email || null
      },
      
      // Информация о лиде
      lead_info: {
        source: 'Telegram Diagnostic Bot',
        quality: analysisResult.segment,
        score: analysisResult.scores.total,
        primary_problem: this.translateIssueForCRM(analysisResult.primaryIssue),
        urgency: this.getUrgencyLevel(analysisResult.scores.urgency)
      },
      
      // Рекомендованные продукты
      recommendations: {
        main_program: analysisResult.recommendations.main_program,
        consultation_type: analysisResult.recommendations.consultation_type,
        estimated_value: this.estimateLeadValue(analysisResult)
      },
      
      // Дополнительные данные
      additional_data: {
        stress_level: userData.surveyAnswers.stress_level,
        sleep_quality: userData.surveyAnswers.sleep_quality,
        breathing_experience: userData.surveyAnswers.breathing_experience,
        time_commitment: userData.surveyAnswers.time_commitment,
        preferred_formats: userData.surveyAnswers.format_preferences
      },
      
      // Системные поля
      created_at: new Date().toISOString(),
      source_details: {
        bot_version: '1.0',
        survey_version: 'extended_18q',
        analysis_engine: 'VERSE_3.0'
      }
    };
  }

  /**
   * Подготовка уведомления для администратора
   */
  prepareAdminNotification(userData) {
    const { userInfo, analysisResult } = userData;
    const urgencyEmoji = this.getUrgencyEmoji(analysisResult.scores.urgency);
    const segmentEmoji = this.getSegmentEmoji(analysisResult.segment);
    
    return `${urgencyEmoji} *НОВЫЙ ЛИД* ${segmentEmoji}

👤 *Пользователь:* ${userInfo.first_name} ${userInfo.last_name || ''}
📱 *Telegram:* ${userInfo.username ? '@' + userInfo.username : `ID: ${userInfo.telegram_id}`}

📊 *Анализ:*
• Сегмент: ${analysisResult.segment} (${analysisResult.scores.total} баллов)
• Проблема: ${this.translateIssueForCRM(analysisResult.primaryIssue)}
• Стресс: ${userData.surveyAnswers.stress_level}/10
• Сон: ${userData.surveyAnswers.sleep_quality}/10

🎯 *Рекомендации:*
• Программа: ${analysisResult.recommendations.main_program}
• Консультация: ${analysisResult.recommendations.consultation_type}
• Ожидаемый результат: ${analysisResult.recommendations.timeline}

⏰ *Время обработки:* ${new Date().toLocaleString('ru-RU')}

${this.getActionButtons(analysisResult.segment)}`;
  }

  /**
   * HTTP-запрос с повторными попытками
   */
  async makeRequest(method, url, data, attempt = 1) {
    try {
      const config = {
        method,
        url,
        timeout: 30000, // 30 секунд
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BreathingLeadBot/1.0'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
      
    } catch (error) {
      console.error(`Попытка ${attempt}/${this.retryAttempts} неудачна:`, error.message);
      
      if (attempt < this.retryAttempts) {
        console.log(`Ожидание ${this.retryDelay}ms перед повтором...`);
        await this.delay(this.retryDelay);
        return this.makeRequest(method, url, data, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Вспомогательные методы
   */
  calculateSessionDuration(userData) {
    if (userData.startTime) {
      return Math.round((Date.now() - userData.startTime) / 1000); // в секундах
    }
    return null;
  }

  getUrgencyLevel(urgencyScore) {
    if (urgencyScore >= 80) return 'CRITICAL';
    if (urgencyScore >= 60) return 'HIGH';
    if (urgencyScore >= 40) return 'MEDIUM';
    return 'LOW';
  }

  getUrgencyEmoji(urgencyScore) {
    if (urgencyScore >= 80) return '🆘';
    if (urgencyScore >= 60) return '🔥';
    if (urgencyScore >= 40) return '⚠️';
    return '💚';
  }

  getSegmentEmoji(segment) {
    const emojis = {
      'HOT_LEAD': '🔥',
      'WARM_LEAD': '⭐',
      'COLD_LEAD': '❄️',
      'NURTURE_LEAD': '🌱'
    };
    return emojis[segment] || '📊';
  }

  getNotificationPriority(analysisResult) {
    const priorities = {
      'HOT_LEAD': 'HIGH',
      'WARM_LEAD': 'MEDIUM',
      'COLD_LEAD': 'LOW',
      'NURTURE_LEAD': 'LOW'
    };
    return priorities[analysisResult.segment] || 'MEDIUM';
  }

  translateIssueForCRM(issue) {
    const translations = {
      'panic_attacks': 'Панические атаки',
      'chronic_stress': 'Хронический стресс',
      'anxiety': 'Тревожность',
      'insomnia': 'Бессонница',
      'high_pressure': 'Повышенное давление',
      'breathing_issues': 'Проблемы с дыханием',
      'fatigue': 'Хроническая усталость',
      'concentration_issues': 'Проблемы с концентрацией',
      'general_wellness': 'Общее оздоровление'
    };
    return translations[issue] || issue;
  }

  estimateLeadValue(analysisResult) {
    // Примерная оценка стоимости лида на основе сегмента и проблемы
    const baseValues = {
      'HOT_LEAD': 15000,    // высокая вероятность покупки дорогой программы
      'WARM_LEAD': 8000,    // средняя программа
      'COLD_LEAD': 3000,    // базовая программа
      'NURTURE_LEAD': 1000  // материалы и подогрев
    };

    const problemMultipliers = {
      'panic_attacks': 1.5,     // критическая проблема, готовы платить больше
      'chronic_stress': 1.2,    // популярная проблема
      'anxiety': 1.3,           // высокая мотивация
      'insomnia': 1.1,          // хорошая мотивация
      'general_wellness': 0.8   // профилактика, меньшая готовность платить
    };

    const baseValue = baseValues[analysisResult.segment] || 5000;
    const multiplier = problemMultipliers[analysisResult.primaryIssue] || 1.0;
    
    return Math.round(baseValue * multiplier);
  }

  getActionButtons(segment) {
    if (segment === 'HOT_LEAD') {
      return '🚨 *ПРИОРИТЕТ:* Связаться в течение 2 часов!';
    } else if (segment === 'WARM_LEAD') {
      return '⏰ *ДЕЙСТВИЕ:* Связаться в течение 24 часов';
    } else {
      return '📅 *ПЛАН:* Добавить в план обзвона на неделю';
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получение статистики передач
   */
  async getTransferStats(period = '24h') {
    try {
      const response = await this.makeRequest('GET', `${this.mainBotApiUrl}/api/leads/stats?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Ошибка получения статистики:', error.message);
      return null;
    }
  }

  /**
   * Проверка здоровья интеграций
   */
  async healthCheck() {
    const results = {
      mainBot: false,
      crm: false,
      timestamp: new Date().toISOString()
    };

    // Проверка основного бота
    try {
      await this.makeRequest('GET', `${this.mainBotApiUrl}/api/health`);
      results.mainBot = true;
    } catch (error) {
      console.error('Основной бот недоступен:', error.message);
    }

    // Проверка CRM
    if (this.crmWebhookUrl) {
      try {
        await this.makeRequest('POST', this.crmWebhookUrl, { test: true });
        results.crm = true;
      } catch (error) {
        console.error('CRM недоступен:', error.message);
      }
    } else {
      results.crm = 'not_configured';
    }

    return results;
  }
}

module.exports = LeadTransferSystem;
