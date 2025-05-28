// Файл: scripts/admin-test.js
// Тестирование админ-панели

require('dotenv').config();

async function testAdminPanel() {
  console.log('🎛️ Тестирование админ-панели...\n');

  try {
    // Проверяем переменные окружения
    console.log('1️⃣ Проверка переменных окружения:');
    const requiredVars = ['LEAD_BOT_TOKEN', 'ADMIN_ID'];
    const missingVars = requiredVars.filter(key => !process.env[key]);
    
    if (missingVars.length > 0) {
      console.log('❌ Отсутствуют переменные:', missingVars.join(', '));
      process.exit(1);
    }
    console.log('✅ Все необходимые переменные настроены\n');

    // Проверяем доступность файлов
    console.log('2️⃣ Проверка файлов админ-панели:');
    const fs = require('fs');
    const files = [
      'modules/admin/enhanced_admin_panel.js',
      'core/admin_integration.js',
      'core/bot.js'
    ];
    
    files.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ ${file} - файл не найден`);
      }
    });
    console.log();

    // Инициализируем бота для тестирования
    console.log('3️⃣ Инициализация бота:');
    const BreathingLeadBot = require('../core/bot');
    const bot = new BreathingLeadBot();
    
    console.log('✅ Бот инициализирован');
    console.log(`✅ Админ-панель: ${bot.adminIntegration ? 'активна' : 'отключена'}`);
    
    if (bot.adminIntegration) {
      console.log(`✅ Admin ID: ${bot.adminIntegration.adminPanel.adminId}`);
    }
    console.log();

    // Тестируем диагностику
    if (bot.adminIntegration) {
      console.log('4️⃣ Тестирование диагностики:');
      const diagnostics = await bot.runDiagnostics();
      console.log(`✅ Диагностика выполнена: ${diagnostics.overall_status}`);
      
      Object.entries(diagnostics.checks).forEach(([check, result]) => {
        const emoji = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
        console.log(`${emoji} ${check}: ${result.message}`);
      });
      console.log();
    }

    // Тестируем создание резервной копии
    if (bot.adminIntegration) {
      console.log('5️⃣ Тестирование резервного копирования:');
      const backup = await bot.createBackup();
      console.log(`✅ Резервная копия создана`);
      console.log(`📊 Лидов в копии: ${backup.metadata.total_leads}`);
      console.log(`💾 Размер: ${Math.round(backup.metadata.backup_size / 1024)} KB`);
      console.log();
    }

    console.log('🎉 Все тесты пройдены успешно!');
    console.log('💡 Теперь можете использовать команду /admin в боте');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    console.error('💡 Проверьте конфигурацию и файлы');
    process.exit(1);
  }
}

if (require.main === module) {
  testAdminPanel();
}

module.exports = testAdminPanel;
