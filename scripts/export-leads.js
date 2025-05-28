// Файл: scripts/export-leads.js
// Экспорт лидов в файл

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function exportLeads() {
  console.log('📤 Экспорт лидов...\n');

  try {
    const BreathingLeadBot = require('../core/bot');
    const bot = new BreathingLeadBot();

    if (!bot.adminIntegration) {
      console.log('❌ Админ-панель не активна');
      process.exit(1);
    }

    // Получаем параметры
    const args = process.argv.slice(2);
    const format = args[0] || 'json'; // json или csv
    const filter = args[1] || 'all'; // all, hot, warm, cold, today

    console.log(`📋 Экспорт в формате: ${format}`);
    console.log(`🎯 Фильтр: ${filter}`);

    // Получаем данные лидов
    const allLeads = Object.values(bot.adminIntegration.adminNotifications.leadDataStorage || {});
    
    let leads = allLeads;
    
    // Применяем фильтры
    switch (filter) {
      case 'hot':
        leads = allLeads.filter(lead => lead.analysisResult?.segment === 'HOT_LEAD');
        break;
      case 'warm':
        leads = allLeads.filter(lead => lead.analysisResult?.segment === 'WARM_LEAD');
        break;
      case 'cold':
        leads = allLeads.filter(lead => lead.analysisResult?.segment === 'COLD_LEAD');
        break;
      case 'today':
        const today = new Date().toDateString();
        leads = allLeads.filter(lead => {
          const leadDate = lead.timestamp ? new Date(lead.timestamp).toDateString() : null;
          return leadDate === today;
        });
        break;
    }

    if (!leads.length) {
      console.log('📋 Нет данных для экспорта');
      process.exit(0);
    }

    // Подготавливаем данные для экспорта
    const exportData = leads.map(lead => ({
      timestamp: lead.timestamp || new Date().toISOString(),
      telegram_id: lead.userInfo?.telegram_id,
      first_name: lead.userInfo?.first_name,
      username: lead.userInfo?.username,
      segment: lead.analysisResult?.segment,
      score: lead.analysisResult?.scores?.total,
      primary_issue: lead.analysisResult?.primaryIssue,
      survey_type: lead.surveyType,
      age_group: lead.surveyAnswers?.age_group || lead.surveyAnswers?.child_age_detail,
      stress_level: lead.surveyAnswers?.stress_level,
      processed: lead.processed || false
    }));

    // Создаем директорию для экспорта
    const exportsDir = './exports';
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Генерируем имя файла
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `leads_${filter}_${timestamp}.${format}`;
    const filePath = path.join(exportsDir, fileName);

    // Сохраняем файл
    if (format === 'csv') {
      const csvContent = convertToCSV(exportData);
      fs.writeFileSync(filePath, csvContent, 'utf8');
    } else {
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    }

    console.log('✅ Экспорт завершен!');
    console.log(`📁 Файл: ${filePath}`);
    console.log(`📊 Записей: ${leads.length}`);
    console.log(`📏 Размер: ${Math.round(fs.statSync(filePath).size / 1024)} KB`);

  } catch (error) {
    console.error('❌ Ошибка экспорта:', error.message);
    process.exit(1);
  }
}

function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

if (require.main === module) {
  exportLeads();
}

module.exports = exportLeads;
