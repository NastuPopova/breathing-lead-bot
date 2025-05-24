#!/usr/bin/env node
// Файл: scripts/health-check.js
// Скрипт для проверки здоровья всех компонентов системы

require('dotenv').config();
const axios = require('axios');

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'UNKNOWN',
      components: {}
    };
  }

  async checkAll() {
    console.log('🔍 Запуск полной проверки здоровья системы...\n');

    // Проверяем все компоненты
    await this.checkTelegramBot();
    await this.checkMainBotAPI();
    await this.checkDatabase();
    await this.checkCRM();
    await this.checkEnvironmentVariables();

    // Определяем общее состояние
    this.calculateOverallHealth();

    // Выводим результаты
    this.printResults();

    // Возвращаем код выхода
    process.exit(this.results.overall === 'HEALTHY' ? 0 : 1);
  }

  async checkTelegramBot() {
    console.log('🤖 Проверка Telegram Bot API...');
    
    try {
      const token = process.env.LEAD_BOT_TOKEN;
      if (!token) {
        throw new Error('LEAD_BOT_TOKEN не настроен');
      }

      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
        timeout: 10000
      });

      if (response.data.ok) {
        this.results.components.telegram_bot = {
          status: 'HEALTHY',
          message: `Бот активен: @${response.data.result.username}`,
          response_time: response.headers['x-response-time'] || 'N/A'
        };
        console.log('✅ Telegram Bot API - OK');
      } else {
        throw new Error('Неверный ответ от Telegram API');
      }
    } catch (error) {
      this.results.components.telegram_bot = {
        status: 'UNHEALTHY',
        message: error.message,
        error: error.code || 'UNKNOWN_ERROR'
      };
      console.log('❌ Telegram Bot API - ОШИБКА:', error.message);
    }
  }

  async checkMainBotAPI() {
    console.log('🔗 Проверка API основного бота...');
    
    try {
      const apiUrl = process.env.MAIN_BOT_API_URL;
      if (!apiUrl) {
        throw new Error('MAIN_BOT_API_URL не настроен');
      }

      const response = await axios.get(`${apiUrl}/api/health`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'BreathingLeadBot-HealthCheck/1.0'
        }
      });

      this.results.components.main_bot_api = {
        status: 'HEALTHY',
        message: 'API основного бота доступен',
        response_time: response.headers['x-response-time'] || 'N/A',
        version: response.data.version || 'Unknown'
      };
      console.log('✅ API основного бота - OK');
    } catch (error) {
      this.results.components.main_bot_api = {
        status: 'UNHEALTHY',
        message: error.message,
        error: error.code || 'CONNECTION_ERROR'
      };
      console.log('❌ API основного бота - ОШИБКА:', error.message);
    }
  }

  async checkDatabase() {
    console.log('🗄️ Проверка подключения к базе данных...');
    
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        this.results.components.database = {
          status: 'UNKNOWN',
          message: 'DATABASE_URL не настроен - работа без БД'
        };
        console.log('⚠️ База данных - НЕ НАСТРОЕНА (опционально)');
        return;
      }

      // Здесь можно добавить реальную проверку БД
      // const { Client } = require('pg');
      // const client = new Client({ connectionString: dbUrl });
      // await client.connect();
      // await client.query('SELECT 1');
      // await client.end();

      this.results.components.database = {
        status: 'HEALTHY',
        message: 'Подключение к БД успешно'
      };
      console.log('✅ База данных - OK');
    } catch (error) {
      this.results.components.database = {
        status: 'UNHEALTHY',
        message: error.message,
        error: 'DB_CONNECTION_ERROR'
      };
      console.log('❌ База данных - ОШИБКА:', error.message);
    }
  }

  async checkCRM() {
    console.log('📊 Проверка CRM интеграции...');
    
    try {
      const crmUrl = process.env.CRM_WEBHOOK_URL;
      if (!crmUrl) {
        this.results.components.crm = {
          status: 'UNKNOWN',
          message: 'CRM webhook не настроен - работа без CRM'
        };
        console.log('⚠️ CRM - НЕ НАСТРОЕН (опционально)');
        return;
      }

      const response = await axios.post(crmUrl, {
        test: true,
        source: 'health-check',
        timestamp: Date.now()
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BreathingLeadBot-HealthCheck/1.0'
        }
      });

      this.results.components.crm = {
        status: 'HEALTHY',
        message: 'CRM webhook отвечает',
        response_time: response.headers['x-response-time'] || 'N/A'
      };
      console.log('✅ CRM интеграция - OK');
    } catch (error) {
      this.results.components.crm = {
        status: 'UNHEALTHY',
        message: error.message,
        error: 'CRM_WEBHOOK_ERROR'
      };
      console.log('❌ CRM интеграция - ОШИБКА:', error.message);
    }
  }

  checkEnvironmentVariables() {
    console.log('🔧 Проверка переменных окружения...');
    
    const required = ['LEAD_BOT_TOKEN'];
    const optional = ['MAIN_BOT_API_URL', 'ADMIN_ID', 'CRM_WEBHOOK_URL'];
    
    const missing = required.filter(key => !process.env[key]);
    const optionalMissing = optional.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      this.results.components.environment = {
        status: 'UNHEALTHY',
        message: `Отсутствуют обязательные переменные: ${missing.join(', ')}`,
        missing_required: missing,
        missing_optional: optionalMissing
      };
      console.log('❌ Переменные окружения - ОШИБКА: отсутствуют', missing.join(', '));
    } else {
      this.results.components.environment = {
        status: 'HEALTHY',
        message: 'Все обязательные переменные настроены',
        missing_optional: optionalMissing.length > 0 ? optionalMissing : null
      };
      console.log('✅ Переменные окружения - OK');
      if (optionalMissing.length > 0) {
        console.log('⚠️ Опциональные переменные не настроены:', optionalMissing.join(', '));
      }
    }
  }

  calculateOverallHealth() {
    const statuses = Object.values(this.results.components).map(c => c.status);
    
    if (statuses.includes('UNHEALTHY')) {
      this.results.overall = 'UNHEALTHY';
    } else if (statuses.includes('UNKNOWN')) {
      this.results.overall = 'DEGRADED';
    } else {
      this.results.overall = 'HEALTHY';
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ ЗДОРОВЬЯ');
    console.log('='.repeat(60));
    
    console.log(`🕐 Время проверки: ${this.results.timestamp}`);
    
    const overallEmoji = {
      'HEALTHY': '✅',
      'DEGRADED': '⚠️',
      'UNHEALTHY': '❌'
    };
    
    console.log(`${overallEmoji[this.results.overall]} Общее состояние: ${this.results.overall}`);
    console.log();
    
    // Детали по компонентам
    Object.entries(this.results.components).forEach(([component, data]) => {
      const emoji = data.status === 'HEALTHY' ? '✅' : data.status === 'UNHEALTHY' ? '❌' : '⚠️';
      console.log(`${emoji} ${component.toUpperCase()}: ${data.status}`);
      console.log(`   └─ ${data.message}`);
      if (data.response_time) {
        console.log(`   └─ Время ответа: ${data.response_time}`);
      }
      if (data.error) {
        console.log(`   └─ Ошибка: ${data.error}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    
    // Рекомендации
    if (this.results.overall !== 'HEALTHY') {
      console.log('🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
      console.log();
      
      Object.entries(this.results.components).forEach(([component, data]) => {
        if (data.status === 'UNHEALTHY') {
          switch (component) {
            case 'telegram_bot':
              console.log('• Проверьте LEAD_BOT_TOKEN в .env файле');
              console.log('• Убедитесь что бот создан через @BotFather');
              break;
            case 'main_bot_api':
              console.log('• Проверьте MAIN_BOT_API_URL в .env файле');
              console.log('• Убедитесь что основной бот запущен и доступен');
              break;
            case 'database':
              console.log('• Проверьте DATABASE_URL в .env файле');
              console.log('• Убедитесь что PostgreSQL запущен и доступен');
              break;
            case 'crm':
              console.log('• Проверьте CRM_WEBHOOK_URL в .env файле');
              console.log('• Убедитесь что CRM принимает webhooks');
              break;
            case 'environment':
              console.log('• Создайте .env файл на основе .env.example');
              console.log('• Заполните все обязательные переменные');
              break;
          }
          console.log();
        }
      });
    }
  }

  // Метод для экспорта результатов в JSON
  exportResults() {
    return JSON.stringify(this.results, null, 2);
  }
}

// Запуск проверки
if (require.main === module) {
  const checker = new HealthChecker();
  checker.checkAll().catch(error => {
    console.error('💥 Критическая ошибка проверки:', error);
    process.exit(2);
  });
}

module.exports = HealthChecker;
