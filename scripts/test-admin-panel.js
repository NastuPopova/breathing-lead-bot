// Файл: scripts/test-admin-panel.js
// Полное тестирование админ-панели

require('dotenv').config();

async function testAdminPanel() {
  console.log('🧪 ПОЛНОЕ ТЕСТИРОВАНИЕ АДМИН-ПАНЕЛИ\n');
  console.log('='.repeat(50));

  const tests = [
    testEnvironment,
    testBotInitialization,
    testAdminIntegration,
    testDiagnostics,
    testBackupSystem,
    testDataManagement,
    testNotificationSystem
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🧪 ${test.name}:`);
      await test();
      console.log('✅ ПРОШЕЛ');
      passed++;
    } catch (error) {
      console.log(`❌ ПРОВАЛЕН: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log(`✅ Прошло: ${passed}`);
  console.log(`❌ Провалено: ${failed}`);
  console.log(`📈 Успешность: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Админ-панель готова к работе.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Некоторые тесты провалены. Исправьте ошибки перед использованием.');
    process.exit(1);
  }
}

async function testEnvironment() {
  const requiredVars = ['LEAD_BOT_TOKEN', 'ADMIN_ID'];
  const missingVars = requiredVars.filter(key => !process.env[key]);
  
  if (missingVars.length > 0) {
    throw new Error(`Отсутствуют переменные: ${missingVars.join(', ')}`);
  }
  
  console.log('  ✓ Переменные окружения настроены');
}

async function testBotInitialization() {
  const BreathingLeadBot = require('../core/bot');
  const bot = new BreathingLeadBot();
  
  if (!bot) {
    throw new Error('Не удалось инициализировать бота');
  }
  
  console.log('  ✓ Бот инициализирован');
}

async function testAdminIntegration() {
  const BreathingLeadBot = require('../core/bot');
  const bot = new BreathingLeadBot();
  
  if (!bot.adminIntegration) {
    throw new Error('Админ-интеграция не активна');
  }
  
  if (!bot.adminIntegration.adminPanel) {
    throw new Error('Админ-панель не инициализирована');
  }
  
  console.log('  ✓ Админ-интеграция активна');
  console.log(`  ✓ Admin ID: ${bot.adminIntegration.adminPanel.adminId}`);
}

async function testDiagnostics() {
  const BreathingLeadBot = require('../core/bot');
  const bot = new BreathingLeadBot();
  
  const diagnostics = await bot.runDiagnostics();
  
  if (!diagnostics || !diagnostics.overall_status) {
    throw new Error('Диагностика не работает');
  }
  
  console.log(`  ✓ Диагностика: ${diagnostics.overall_status}`);
}

async function testBackupSystem() {
  const BreathingLeadBot = require('../core/bot');
  const bot = new BreathingLeadBot();
  
  const backup = await bot.createBackup();
  
  if (!backup || !backup.timestamp) {
    throw new Error('Система резервного копирования не работает');
  }
  
  console.log(`  ✓ Резервное копирование работает`);
  console.log(`  ✓ Лидов в копии: ${backup.metadata.total_leads}`);
}

async function testDataManagement() {
  const BreathingLeadBot = require('../core/bot');
  const bot = new BreathingLeadBot();
  
  const result = await bot.cleanupOldData(365); // Тестовая очистка старых данных
  
  if (!result) {
    throw new Error('Система управления данными не работает');
  }
  
  console.log('  ✓ Управление данными работает');
}

async function testNotificationSystem() {
  const BreathingLeadBot = require('../core/bot');
  const bot = new BreathingLeadBot();
  
  if (!bot.adminIntegration.adminPanel.notificationSettings) {
    throw new Error('Система уведомлений не настроена');
  }
  
  console.log('  ✓ Система уведомлений настроена');
}

if (require.main === module) {
  testAdminPanel();
}

module.exports = testAdminPanel;
