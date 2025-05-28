// Файл: scripts/run-diagnostics.js
// Запуск системной диагностики

require('dotenv').config();

async function runDiagnostics() {
  console.log('🔧 Запуск системной диагностики...\n');

  try {
    const BreathingLeadBot = require('../core/bot');
    const bot = new BreathingLeadBot();

    if (!bot.adminIntegration) {
      console.log('❌ Админ-панель не активна');
      process.exit(1);
    }

    const diagnostics = await bot.runDiagnostics();

    console.log('📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ');
    console.log('='.repeat(50));
    
    const statusEmoji = {
      'OK': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌',
      'UNKNOWN': '❓'
    };

    console.log(`${statusEmoji[diagnostics.overall_status]} Общий статус: ${diagnostics.overall_status}\n`);

    Object.entries(diagnostics.checks).forEach(([checkName, result]) => {
      const emoji = statusEmoji[result.status] || '❓';
      console.log(`${emoji} ${checkName.toUpperCase()}:`);
      console.log(`   └─ ${result.message}`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`      • ${key}: ${value ? '✅' : '❌'}`);
        });
      }
      console.log();
    });

    if (diagnostics.overall_status === 'ERROR') {
      console.log('🚨 ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ!');
      console.log('💡 Рекомендуется немедленное устранение');
      process.exit(1);
    } else if (diagnostics.overall_status === 'WARNING') {
      console.log('⚠️ Есть предупреждения, но система работает');
      process.exit(0);
    } else {
      console.log('🎉 Все системы работают нормально!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runDiagnostics();
}

module.exports = runDiagnostics;
