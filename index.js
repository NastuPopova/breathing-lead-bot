// index.js - Точка входа для BreathingLeadBot v2.5
// Минимальный файл запуска после рефакторинга

const BreathingLeadBot = require('./core/bot');

console.log('🌬️ Запуск BreathingLeadBot v2.5 (рефакторинг)...');

// Запуск приложения
async function startBot() {
  try {
    const bot = new BreathingLeadBot();
    await bot.launch();
  } catch (error) {
    console.error('💥 Критическая ошибка запуска:', error.message);
    console.error('Стек ошибки:', error.stack);
    
    // Логируем детали ошибки для отладки
    console.error('Детали ошибки:', {
      name: error.name,
      code: error.code,
      response: error.response?.description || 'N/A',
      timestamp: new Date().toISOString()
    });
    
    process.exit(1);
  }
}

// Обработка неперехваченных ошибок на уровне процесса
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Необработанное отклонение промиса в index.js:', reason);
  console.error('Промис:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Неперехваченное исключение в index.js:', error);
  process.exit(1);
});

// Запускаем бота
startBot();
