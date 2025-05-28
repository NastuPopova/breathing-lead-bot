/ Файл: scripts/create-backup.js
// Создание резервной копии данных

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function createBackup() {
  console.log('💾 Создание резервной копии...\n');

  try {
    const BreathingLeadBot = require('../core/bot');
    const bot = new BreathingLeadBot();

    if (!bot.adminIntegration) {
      console.log('❌ Админ-панель не активна');
      process.exit(1);
    }

    // Создаем резервную копию
    const backup = await bot.createBackup();
    
    // Создаем директорию для бэкапов
    const backupsDir = './backups';
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Сохраняем бэкап
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${timestamp}.json`;
    const filePath = path.join(backupsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

    console.log('✅ Резервная копия создана успешно!');
    console.log(`📁 Файл: ${filePath}`);
    console.log(`📊 Лидов: ${backup.metadata.total_leads}`);
    console.log(`💾 Размер: ${Math.round(backup.metadata.backup_size / 1024)} KB`);
    console.log(`🕐 Время: ${backup.timestamp}`);

  } catch (error) {
    console.error('❌ Ошибка создания резервной копии:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createBackup();
}

module.exports = createBackup;
