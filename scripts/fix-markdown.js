// scripts/fix-markdown.js
// ПРАВИЛЬНАЯ ВЕРСИЯ с обработкой многострочных блоков

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Утилита для экранирования Markdown
function createEscapeFunction() {
  return `
// Утилита для безопасного экранирования Markdown
function escapeMarkdown(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/[*_\`\\[\\]()~>#+\\-=|{}.!]/g, '\\\\$&');
}
`.trim();
}

// Поиск всех JS файлов в modules
const files = glob.sync('modules/**/*.js');

console.log(`🔍 Найдено файлов для проверки: ${files.length}\n`);

let totalFixed = 0;
let totalSkipped = 0;
let errors = [];

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // ИСПРАВЛЕНО: Более гибкий regex для многострочных блоков
    // Ищем: await ctx.editMessageText(..., { parse_mode: 'Markdown', ... })
    const editMessageRegex = /await\s+ctx\.editMessageText\s*\(\s*([^,]+?)\s*,\s*\{[^]*?parse_mode:\s*['"]Markdown['"][^]*?\}\s*\)/g;
    
    // Ищем: await ctx.reply(..., { parse_mode: 'Markdown', ... })
    const replyRegex = /await\s+ctx\.reply\s*\(\s*([^,]+?)\s*,\s*\{[^]*?parse_mode:\s*['"]Markdown['"][^]*?\}\s*\)/g;
    
    // Проверяем, есть ли проблемные места
    const hasEditMessage = editMessageRegex.test(content);
    const hasReply = replyRegex.test(content);
    
    // Сбрасываем regex после test()
    editMessageRegex.lastIndex = 0;
    replyRegex.lastIndex = 0;
    
    if (!hasEditMessage && !hasReply) {
      console.log(`⏭️  Пропущен (нет Markdown): ${file}`);
      totalSkipped++;
      return;
    }
    
    // Проверяем, не является ли это файлом с шаблонами
    if (file.includes('notification_templates.js') || 
        file.includes('content-generator.js') ||
        file.includes('templates')) {
      console.log(`⚠️  Пропущен (файл шаблонов): ${file}`);
      totalSkipped++;
      return;
    }
    
    // Добавляем функцию escapeMarkdown в начало файла, если её нет
    if (!content.includes('function escapeMarkdown')) {
      const firstImport = content.indexOf('const ');
      if (firstImport !== -1) {
        const escapeFunc = createEscapeFunction();
        content = content.slice(0, firstImport) + escapeFunc + '\n\n' + content.slice(firstImport);
        modified = true;
      }
    }
    
    // ИСПРАВЛЕНО: Безопасная замена с проверкой переменных
    let replacementsMade = 0;
    
    // Замена editMessageText
    content = content.replace(editMessageRegex, (match, messageVar) => {
      const trimmedVar = messageVar.trim();
      
      // Пропускаем, если уже обёрнуто в escapeMarkdown
      if (trimmedVar.startsWith('escapeMarkdown(') || trimmedVar.startsWith('escape(')) {
        return match;
      }
      
      // Пропускаем, если это шаблонная строка со сложной структурой
      if (trimmedVar.includes('templates.') || trimmedVar.includes('.generate')) {
        return match;
      }
      
      replacementsMade++;
      return match.replace(trimmedVar, `escapeMarkdown(${trimmedVar})`);
    });
    
    // Замена reply
    content = content.replace(replyRegex, (match, messageVar) => {
      const trimmedVar = messageVar.trim();
      
      if (trimmedVar.startsWith('escapeMarkdown(') || trimmedVar.startsWith('escape(')) {
        return match;
      }
      
      if (trimmedVar.includes('templates.') || trimmedVar.includes('.generate')) {
        return match;
      }
      
      replacementsMade++;
      return match.replace(trimmedVar, `escapeMarkdown(${trimmedVar})`);
    });
    
    if (replacementsMade > 0) {
      modified = true;
    }
    
    // Сохраняем изменённый файл
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Исправлен (${replacementsMade} замен): ${file}`);
      totalFixed++;
    } else {
      console.log(`⏭️  Пропущен (уже исправлен): ${file}`);
      totalSkipped++;
    }
    
  } catch (error) {
    errors.push({ file, error: error.message });
    console.error(`❌ Ошибка в файле ${file}:`, error.message);
  }
});

// Финальный отчёт
console.log('\n' + '='.repeat(60));
console.log('📊 ИТОГИ:');
console.log('='.repeat(60));
console.log(`✅ Исправлено файлов: ${totalFixed}`);
console.log(`⏭️  Пропущено файлов: ${totalSkipped}`);
console.log(`❌ Ошибок: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ Файлы с ошибками:');
  errors.forEach(({ file, error }) => {
    console.log(`  - ${file}: ${error}`);
  });
}

console.log('\n💡 ВАЖНО:');
console.log('   • Проверьте файлы шаблонов вручную!');
console.log('   • Не все сообщения нужно экранировать!');
console.log('   • Сообщения с намеренным Markdown оставляйте как есть!');
console.log('='.repeat(60));
