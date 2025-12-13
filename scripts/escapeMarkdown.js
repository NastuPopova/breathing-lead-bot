// scripts/escapeMarkdown.js
module.exports = function escapeMarkdown(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
};
