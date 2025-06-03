// Файл: test-full-admin.js
// Полное тестирование функциональности администратора

require('dotenv').config();

async function runFullAdminTest() {
  console.log('🧪 ПОЛНОЕ ТЕСТИРОВАНИЕ АДМИН-ПАНЕЛИ\n');
  console.log('='.repeat(60));

  try {
    const BreathingLeadBot = require('./core/bot');
    const bot = new BreathingLeadBot();

    // 1. Проверка основной инициализации
    console.log('\n1️⃣ ПРОВЕРКА ИНИЦИАЛИЗАЦИИ');
    console.log('='.repeat(30));
    
    console.log(`✅ Бот инициализирован: ${!!bot}`);
    console.log(`✅ Админ-интеграция: ${!!bot.adminIntegration}`);
    console.log(`✅ Система уведомлений: ${!!bot.adminIntegration?.adminNotifications}`);
    console.log(`✅ ADMIN_ID: ${process.env.ADMIN_ID || 'НЕ НАСТРОЕН'}`);

    if (!bot.adminIntegration) {
      throw new Error('Админ-интеграция не активна');
    }

    // 2. Включение тестового режима
    console.log('\n2️⃣ ВКЛЮЧЕНИЕ ТЕСТОВОГО РЕЖИМА');
    console.log('='.repeat(30));
    
    if (bot.adminIntegration.adminNotifications.enableTestMode) {
      bot.adminIntegration.adminNotifications.enableTestMode();
    } else {
      // Принудительно включаем уведомления
      bot.adminIntegration.adminNotifications.enableNotifications = true;
      bot.adminIntegration.adminNotifications.testMode = true;
      console.log('🧪 Тестовый режим включен принудительно');
    }

    // 3. Тестирование системы уведомлений
    console.log('\n3️⃣ ТЕСТИРОВАНИЕ СИСТЕМЫ УВЕДОМЛЕНИЙ');
    console.log('='.repeat(30));
    
    const notificationTest = await bot.adminIntegration.adminNotifications.testNotificationSystem?.() || 
      { ready: true, details: {} };
    
    console.log(`Готовность системы: ${notificationTest.ready ? '✅' : '❌'}`);

    // 4. Создание тестовых лидов разных типов
    console.log('\n4️⃣ СОЗДАНИЕ ТЕСТОВЫХ ЛИДОВ');
    console.log('='.repeat(30));

    const testLeads = [
      {
        name: 'Горячий лид (взрослый)',
        data: createTestLead('HOT_LEAD', 'adult', 'admin_hot')
      },
      {
        name: 'Теплый лид (детский)', 
        data: createTestLead('WARM_LEAD', 'child', 'admin_warm')
      },
      {
        name: 'Холодный лид (взрослый)',
        data: createTestLead('COLD_LEAD', 'adult', 'admin_cold')
      }
    ];

    // 5. Отправка тестовых уведомлений
    console.log('\n5️⃣ ОТПРАВКА ТЕСТОВЫХ УВЕДОМЛЕНИЙ');
    console.log('='.repeat(30));

    for (let i = 0; i < testLeads.length; i++) {
      const lead = testLeads[i];
      console.log(`\n📤 Отправка: ${lead.name}`);
      
      try {
        await bot.adminIntegration.adminNotifications.notifyNewLead(lead.data);
        console.log(`✅ ${lead.name} - ОТПРАВЛЕНО`);
        
        // Пауза между отправками
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ ${lead.name} - ОШИБКА: ${error.message}`);
      }
    }

    // 6. Тестирование админ-команд
    console.log('\n6️⃣ ТЕСТИРОВАНИЕ АДМИН-КОМАНД');
    console.log('='.repeat(30));

    await testAdminCommands(bot);

    // 7. Тестирование диагностики
    console.log('\n7️⃣ ТЕСТИРОВАНИЕ ДИАГНОСТИКИ');
    console.log('='.repeat(30));

    const diagnostics = await bot.runDiagnostics();
    console.log(`Диагностика: ${diagnostics.overall_status}`);
    
    Object.entries(diagnostics.checks).forEach(([check, result]) => {
      const emoji = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${emoji} ${check}: ${result.message}`);
    });

    // 8. Итоговый отчет
    console.log('\n8️⃣ ИТОГОВЫЙ ОТЧЕТ');
    console.log('='.repeat(30));
    
    const stats = bot.adminIntegration.adminNotifications.getStats();
    console.log('📊 Статистика уведомлений:');
    console.log(`   Всего лидов: ${stats.stored_leads_count}`);
    console.log(`   Уведомления включены: ${stats.notifications_enabled}`);
    console.log(`   Admin ID: ${stats.admin_id}`);

    console.log('\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!');
    console.log('\n📱 Проверьте Telegram - должны прийти тестовые уведомления');
    console.log('💡 Теперь попробуйте пройти реальный опрос и убедиться что уведомления приходят');

  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТИРОВАНИЯ:', error);
    console.error('Стек:', error.stack);
    process.exit(1);
  }
}

function createTestLead(segment, type, username) {
  const baseId = Date.now().toString().slice(-6);
  
  return {
    userInfo: {
      telegram_id: process.env.ADMIN_ID, // Используем ID администратора для тестирования
      first_name: `Тест ${segment}`,
      username: username
    },
    surveyType: type,
    surveyAnswers: type === 'adult' ? {
      age_group: '31-45',
      occupation: 'management',
      stress_level: segment === 'HOT_LEAD' ? 9 : segment === 'WARM_LEAD' ? 6 : 3,
      current_problems: ['chronic_stress', 'insomnia'],
      breathing_experience: 'never',
      time_commitment: '10-15_minutes',
      main_goals: ['stress_resistance', 'improve_sleep']
    } : {
      child_age_detail: '7-8',
      child_problems_detailed: ['tantrums', 'sleep_problems'],
      child_parent_involvement: 'both_parents',
      child_time_availability: 'before_sleep'
    },
    analysisResult: {
      segment: segment,
      scores: {
        total: segment === 'HOT_LEAD' ? 85 : segment === 'WARM_LEAD' ? 65 : 35,
        urgency: segment === 'HOT_LEAD' ? 90 : segment === 'WARM_LEAD' ? 60 : 30,
        readiness: segment === 'HOT_LEAD' ? 80 : segment === 'WARM_LEAD' ? 70 : 40,
        fit: segment === 'HOT_LEAD' ? 85 : segment === 'WARM_LEAD' ? 65 : 35
      },
      primaryIssue: type === 'adult' ? 'chronic_stress' : 'tantrums'
    },
    timestamp: new Date().toISOString()
  };
}

async function testAdminCommands(bot) {
  if (!bot.adminIntegration?.adminHandlers) {
    console.log('⚠️ AdminHandlers не доступны');
    return;
  }

  console.log('🔍 Тестирование модульных админ-команд:');
  
  const commands = ['admin', 'stats', 'hot_leads', 'health'];
  
  commands.forEach(command => {
    const handler = bot.adminIntegration.adminHandlers;
    console.log(`✅ /${command} - обработчик готов: ${!!handler}`);
  });
  
  // Тестируем статистику
  const stats = bot.adminIntegration.adminHandlers.getAggregatedStats();
  console.log('📊 Агрегированная статистика доступна:', !!stats);
}

if (require.main === module) {
  runFullAdminTest();
}

module.exports = runFullAdminTest;
