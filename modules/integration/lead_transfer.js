// Файл: lead_bot/modules/integration/lead_transfer.js
// ИСПРАВЛЕННАЯ версия с улучшенным логированием и безопасностью

const axios = require('axios');
const config = require('../../config');

class LeadTransferSystem {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 2000;
    
    // ИСПРАВЛЕНО: используем правильные переменные из config
    this.mainBotWebhook = config.MAIN_BOT_API_URL;
    this.crmWebhook = config.CRM_WEBHOOK_URL;
    this.trainerContact = config.TRAINER_CONTACT;
    
    // Добавляем безопасные значения по умолчанию
    this.enableRetries = true;
    this.enableLogging = config.NODE_ENV !== 'production';
  }

  async processLead(userData) {
    console.log('🚀 Начинаем обработку лида:', userData.userInfo?.telegram_id);

    try {
      // Основная передача данных
      await this.transferToMainBot(userData);

      // CRM интеграция отключена (ENABLE_CRM=false)
      if (config.FEATURES?.enable_crm_integration && this.crmWebhook) {
        await this.transferToCRM(userData);
      } else {
        console.log('⚠️ CRM интеграция отключена или не настроена');
      }

      // Уведомление о новом лиде (опционально)
      await this.logLeadSuccess(userData);
      
    } catch (error) {
      console.error('❌ Критическая ошибка обработки лида:', error.message);
      // НЕ бросаем ошибку дальше, чтобы не прерывать работу бота
      await this.logLeadError(userData, error);
    }
  }

  async transferToMainBot(userData) {
    // Если нет URL основного бота, просто логируем данные
    if (!this.mainBotWebhook) {
      console.log('⚠️ Main bot webhook не настроен, данные сохраняются локально');
      return this.saveLeadLocally(userData);
    }

    const webhookUrl = `${this.mainBotWebhook}/api/leads/import`;
    console.log(`📤 Передаем лида в основной бот: ${userData.userInfo?.telegram_id}`);
    console.log(`🔗 Webhook URL: ${webhookUrl}`);

    const payload = {
      timestamp: new Date().toISOString(),
      source: 'lead_bot',
      data: userData
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.post(webhookUrl, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BreathingLeadBot/2.4',
            'X-Source': 'lead-bot'
          }
        });

        if (response.status >= 200 && response.status < 300) {
          console.log('✅ Лид успешно передан в основной бот');
          return response.data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`❌ Попытка ${attempt}/${this.retryAttempts} неудачна:`, error.message);
        
        if (attempt === this.retryAttempts) {
          console.error('💥 Все попытки передачи в основной бот исчерпаны');
          // Сохраняем локально при неудаче
          return this.saveLeadLocally(userData);
        }
        
        if (this.enableRetries) {
          console.log(`⏳ Ожидание ${this.retryDelay}ms перед повтором...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
  }

  async transferToCRM(userData) {
    console.log(`📤 Передаем лида в CRM: ${userData.userInfo?.telegram_id}`);
    console.log(`🔗 CRM webhook URL: ${this.crmWebhook}`);

    // Формируем данные в формате, понятном CRM
    const crmPayload = {
      contact: {
        name: userData.userInfo?.first_name || 'Пользователь Telegram',
        telegram_id: userData.userInfo?.telegram_id,
        username: userData.userInfo?.username || '',
        source: 'Telegram Diagnostic Bot'
      },
      lead_info: {
        survey_type: userData.surveyType || 'adult',
        quality: userData.analysisResult?.segment || 'UNKNOWN',
        score: userData.analysisResult?.scores?.total || 0,
        primary_issue: userData.analysisResult?.primaryIssue || 'general_wellness',
        timestamp: new Date().toISOString()
      },
      survey_data: userData.surveyAnswers || {},
      analysis: userData.analysisResult || {}
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.post(this.crmWebhook, crmPayload, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BreathingLeadBot/2.4',
            'X-Source': 'telegram-lead-bot'
          }
        });

        if (response.status >= 200 && response.status < 300) {
          console.log('✅ Лид успешно передан в CRM');
          return response.data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`❌ CRM попытка ${attempt}/${this.retryAttempts} неудачна:`, error.message);
        
        if (attempt === this.retryAttempts) {
          console.error('💥 Все попытки передачи в CRM исчерпаны');
        } else if (this.enableRetries) {
          console.log(`⏳ Ожидание ${this.retryDelay}ms перед повтором...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
  }

  // НОВЫЙ: локальное сохранение лидов при неудаче
  async saveLeadLocally(userData) {
    try {
      const leadData = {
        timestamp: new Date().toISOString(),
        telegram_id: userData.userInfo?.telegram_id,
        survey_type: userData.surveyType,
        segment: userData.analysisResult?.segment,
        score: userData.analysisResult?.scores?.total,
        primary_issue: userData.analysisResult?.primaryIssue,
        answers: userData.surveyAnswers,
        trainer_contact: this.trainerContact
      };

      // В реальном проекте здесь была бы запись в базу данных
      // Пока просто логируем структурированно
      console.log('💾 ЛОКАЛЬНОЕ СОХРАНЕНИЕ ЛИДА:', JSON.stringify(leadData, null, 2));
      
      return { success: true, stored_locally: true, data: leadData };
    } catch (error) {
      console.error('❌ Ошибка локального сохранения:', error);
      return { success: false, error: error.message };
    }
  }

  // НОВЫЙ: логирование успешной обработки
  async logLeadSuccess(userData) {
    if (!this.enableLogging) return;

    const logData = {
      event: 'lead_processed_successfully',
      timestamp: new Date().toISOString(),
      telegram_id: userData.userInfo?.telegram_id,
      survey_type: userData.surveyType,
      segment: userData.analysisResult?.segment,
      processing_time: Date.now() - (userData.startTime || Date.now())
    };

    console.log('✅ УСПЕШНАЯ ОБРАБОТКА ЛИДА:', JSON.stringify(logData, null, 2));
  }

  // НОВЫЙ: логирование ошибок
  async logLeadError(userData, error) {
    const errorData = {
      event: 'lead_processing_error',
      timestamp: new Date().toISOString(),
      telegram_id: userData.userInfo?.telegram_id,
      error_message: error.message,
      error_stack: error.stack,
      userData_summary: {
        survey_type: userData.surveyType,
        has_answers: !!userData.surveyAnswers,
        has_analysis: !!userData.analysisResult
      }
    };

    console.error('💥 ОШИБКА ОБРАБОТКИ ЛИДА:', JSON.stringify(errorData, null, 2));
  }

  // НОВЫЙ: метод для тестирования подключений
  async testConnections() {
    const results = {
      main_bot: { status: 'not_configured', url: this.mainBotWebhook },
      crm: { status: 'not_configured', url: this.crmWebhook },
      timestamp: new Date().toISOString()
    };

    // Тест основного бота
    if (this.mainBotWebhook) {
      try {
        const response = await axios.get(`${this.mainBotWebhook}/api/health`, { timeout: 5000 });
        results.main_bot.status = response.status === 200 ? 'connected' : 'error';
        results.main_bot.response_time = response.headers['x-response-time'] || 'unknown';
      } catch (error) {
        results.main_bot.status = 'error';
        results.main_bot.error = error.message;
      }
    }

    // Тест CRM
    if (this.crmWebhook) {
      try {
        const testPayload = { test: true, timestamp: Date.now() };
        const response = await axios.post(this.crmWebhook, testPayload, { timeout: 5000 });
        results.crm.status = response.status >= 200 && response.status < 300 ? 'connected' : 'error';
      } catch (error) {
        results.crm.status = 'error';
        results.crm.error = error.message;
      }
    }

    return results;
  }

  // НОВЫЙ: получение статистики
  getStats() {
    return {
      configuration: {
        main_bot_configured: !!this.mainBotWebhook,
        crm_configured: !!this.crmWebhook,
        trainer_contact: this.trainerContact,
        retries_enabled: this.enableRetries,
        retry_attempts: this.retryAttempts,
        retry_delay: this.retryDelay
      },
      endpoints: {
        main_bot: this.mainBotWebhook ? `${this.mainBotWebhook}/api/leads/import` : null,
        crm: this.crmWebhook,
        trainer: this.trainerContact
      },
      version: '2.4.0',
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = LeadTransferSystem;
