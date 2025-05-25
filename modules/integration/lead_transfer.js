// Файл: lead_bot/modules/integration/lead_transfer.js
// Обновленная версия с улучшенным логированием и проверкой вебхуков

const axios = require('axios');
const config = require('../../config');

class LeadTransferSystem {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 2000;
    this.mainBotWebhook = config.MAIN_BOT_WEBHOOK || '';
    this.crmWebhook = config.CRM_WEBHOOK || '';
    this.notificationBotWebhook = config.NOTIFICATION_BOT_WEBHOOK || '';
  }

  async processLead(userData) {
    console.log('🚀 Начинаем обработку лида:', userData.userInfo?.telegram_id);

    try {
      await this.transferToMainBot(userData);

      if (this.crmWebhook) {
        await this.transferToCRM(userData);
      } else {
        console.warn('⚠️ CRM webhook не настроен, пропускаем передачу');
      }

      await this.notifyAnalyst(userData);
    } catch (error) {
      console.error('❌ Критическая ошибка обработки лида:', error.message);
      throw error;
    }
  }

  async transferToMainBot(userData) {
    if (!this.mainBotWebhook) {
      console.warn('⚠️ Main bot webhook не настроен');
      throw new Error('Main bot webhook не настроен');
    }

    console.log(`📤 Передаем лида в основной бот: ${userData.userInfo?.telegram_id}`);
    console.log(`🔗 Main bot webhook URL: ${this.mainBotWebhook}`);

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await axios.post(this.mainBotWebhook, userData);
        console.log('✅ Лид успешно передан в основной бот');
        return;
      } catch (error) {
        console.error(`Попытка ${attempt}/${this.retryAttempts} неудачна:`, error.message);
        if (attempt === this.retryAttempts) {
          throw new Error(`Ошибка передачи в основной бот: ${error.message}`);
        }
        console.log(`Ожидание ${this.retryDelay}ms перед повтором...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async transferToCRM(userData) {
    console.log(`📤 Передаем лида в CRM: ${userData.userInfo?.telegram_id}`);
    console.log(`🔗 CRM webhook URL: ${this.crmWebhook}`);

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await axios.post(this.crmWebhook, userData);
        console.log('✅ Лид успешно передан в CRM');
        return;
      } catch (error) {
        console.error(`Попытка ${attempt}/${this.retryAttempts} неудачна:`, error.message);
        if (attempt === this.retryAttempts) {
          throw new Error(`Ошибка передачи в CRM: ${error.message}`);
        }
        console.log(`Ожидание ${this.retryDelay}ms перед повтором...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async notifyAnalyst(userData) {
    if (!this.notificationBotWebhook) {
      console.warn('⚠️ Notification bot webhook не настроен');
      throw new Error('Notification bot webhook не настроен');
    }

    console.log('📢 Отправляем уведомление Анастасии');
    console.log(`🔗 Notification bot webhook URL: ${this.notificationBotWebhook}`);

    const notificationData = {
      telegram_id: userData.userInfo?.telegram_id,
      survey_type: userData.surveyType,
      segment: userData.analysisResult?.segment,
      primary_issue: userData.analysisResult?.primaryIssue
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await axios.post(this.notificationBotWebhook, notificationData);
        console.log('✅ Уведомление отправлено');
        return;
      } catch (error) {
        console.error(`Попытка ${attempt}/${this.retryAttempts} неудачна:`, error.message);
        if (attempt === this.retryAttempts) {
          throw new Error(`Ошибка отправки уведомления: ${error.message}`);
        }
        console.log(`Ожидание ${this.retryDelay}ms перед повтором...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }
}

module.exports = LeadTransferSystem;
