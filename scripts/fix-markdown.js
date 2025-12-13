# scripts/fix-markdown.js
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('modules/**/*.js');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Найти все editMessageText с parse_mode: 'Markdown'
  const regex = /await\s+ctx\.editMessageText\s*\(\s*([^,]+),\s*\{[^}]*parse_mode:\s*['"]Markdown['"][^}]*\}\s*\)/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, (match, message) => {
      return match.replace(message, `escape(${message})`);
    });
    
    // Добавить импорт утилиты в начало файла
    if (!content.includes("const escape = require('../scripts/escapeMarkdown')")) {
      content = "const escape = require('../scripts/escapeMarkdown');\n" + content;
    }
    
    fs.writeFileSync(file, content);
    console.log(`✅ Исправлен: ${file}`);
  }
});
