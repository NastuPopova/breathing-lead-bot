// Файл: scripts/cleanup-data.js
// Очистка старых данных

require('dotenv').config();

async function cleanupData() {
  console.log('🧹 Очистка старых данных...\n');

  try {
    const BreathingLeadBot = require('../core/bot');
    const bot = new BreathingLeadBot();

    if (!bot.adminIntegration) {
      console.log('❌ Админ-панель не активна');
      process.exit(1);
    }

    // Получаем параметры из аргументов командной строки
    const args = process.argv.slice(2);
    const daysToKeep = args[0] ? parseInt(args[0]) : 30;

    console.log(`📅 Удаляем данные старше ${daysToKeep} дней...`);

    const result = await bot.cleanupOldData(daysToKeep);

    if (result.error) {
      console.log(`❌ Ошибка очистки: ${result.error}`);
      process.exit(1);
    }

    console.log('✅ Очистка завершена!');
    console.log(`🗑️ Удалено записей: ${result.cleaned_count}`);
    console.log(`📊 Осталось записей: ${result.remaining_count}`);
    console.log(`📅 Граничная дата: ${new Date(result.cutoff_date).toLocaleDateString('ru-RU')}`);

  } catch (error) {
    console.error('❌ Ошибка очистки данных:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupData();
}

module.exports = cleanupData;
