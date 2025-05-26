// Файл: modules/bonus/pdf_manager.js
// Система управления PDF-бонусами для лид-бота

const { Markup } = require('telegraf');
const config = require('../../config');

class PDFBonusManager {
  constructor() {
    // Конфигурация PDF-бонусов
    this.bonuses = {
      adult: {
        id: 'adult_antistress_guide',
        title: '🌬️ АНТИСТРЕСС ДЫХАНИЕ',
        subtitle: '2 техники быстрой помощи',
        description: 'Научитесь справляться со стрессом за 2-5 минут',
        file_url: 'https://your-domain.com/bonus/antistress_breathing.pdf',
        file_path: './assets/pdf/antistress_breathing.pdf', // ← подчеркивания
        preview_text: `📖 *Что внутри гида:*
• Техника "Экстренное дыхание" от панических атак
• Техника "Морская волна" для глубокого расслабления
• Научное обоснование каждого метода
• Пошаговые инструкции с иллюстрациями

⏱️ *Время освоения:* 10 минут
🎯 *Результат:* Снятие стресса за 2-3 минуты`,
        target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
      },
      
      child: {
        id: 'child_breathing_games',
        title: '🎈 ДЫХАТЕЛЬНЫЕ ИГРЫ',
        subtitle: '2 техники для спокойствия ребенка',
        description: 'Превратите дыхание в увлекательную игру',
        file_url: 'https://your-domain.com/bonus/child_breathing_games.pdf',
        file_path: './assets/pdf/child_breathing_games.pdf', // ← подчеркивания
        preview_text: `🎮 *Что внутри гида:*
• Игра "Воздушный шарик" от истерик и капризов
• Игра "Как спит мишка" для быстрого засыпания
• Советы для родителей по возрастам
• План освоения на 4 недели

👶 *Возраст:* 3-12 лет
🎯 *Результат:* Спокойный ребенок за 5 минут`,
        target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
      }
    };
  }

  /**
   * Определяет, какой PDF дать пользователю
   */
  getBonusForUser(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    
    if (isChildFlow) {
      return this.bonuses.child;
    } else {
      return this.bonuses.adult;
    }
  }

  /**
   * Генерирует сообщение с бонусом
   */
  generateBonusMessage(bonus, analysisResult) {
    const segment = analysisResult.segment;
    const isHotLead = segment === 'HOT_LEAD';
    
    let message = `🎁 *ВАША ПЕРСОНАЛЬНАЯ ПРОГРАММА ГОТОВА!*\n\n`;
    
    message += `${bonus.title}\n`;
    message += `${bonus.subtitle}\n\n`;
    
    message += bonus.preview_text + '\n\n';
    
    // Персонализация по сегменту
    if (isHotLead) {
      message += `⚡ *ОСОБАЯ РЕКОМЕНДАЦИЯ для вас:*\n`;
      message += `Судя по вашим ответам, вам нужна срочная помощь. `;
      message += `Начните с первой техники уже сегодня!\n\n`;
    }
    
    message += `📞 *СЛЕДУЮЩИЙ ШАГ:*\n`;
    message += `Запишитесь на персональную консультацию для составления `;
    message += `индивидуальной программы дыхательных практик.\n\n`;
    
    message += `👩‍⚕️ *Анастасия Попова* ответит на все ваши вопросы `;
    message += `и подберет техники под ваши конкретные потребности.`;
    
    return message;
  }

  /**
   * Генерирует клавиатуру для бонуса
   */
  generateBonusKeyboard(bonus, method = 'file') {
    const buttons = [];
    
    // Кнопка получения бонуса
    if (method === 'file') {
      buttons.push([Markup.button.callback('📥 Получить PDF-гид', `download_${bonus.id}`)]);
    } else if (method === 'url') {
      buttons.push([Markup.button.url('📥 Скачать PDF-гид', bonus.file_url)]);
    }
    
    // Кнопка записи на консультацию
    buttons.push([Markup.button.callback('📞 Записаться на консультацию', 'contact_request')]);
    
    // Кнопка связи с тренером
    buttons.push([Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]);
    
    // Дополнительные материалы
    buttons.push([Markup.button.callback('🎁 Еще материалы', 'more_materials')]);
    
    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Отправляет PDF файл пользователю
   */
  async sendPDFFile(ctx, bonus) {
    try {
      // Проверяем, существует ли файл
      const fs = require('fs');
      if (!fs.existsSync(bonus.file_path)) {
        console.error(`PDF файл не найден: ${bonus.file_path}`);
        await ctx.reply('⚠️ Файл временно недоступен. Свяжитесь с @NastuPopova');
        return;
      }

      // Отправляем файл
      await ctx.replyWithDocument(
        { source: bonus.file_path },
        {
          caption: `📖 ${bonus.title}\n\n💝 Ваш персональный бонус готов!\n\n📞 Запишитесь на консультацию: @breathing_opros_bot\n💬 Личный контакт: @NastuPopova`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        }
      );
      
      console.log(`✅ PDF отправлен пользователю ${ctx.from.id}: ${bonus.title}`);
      
    } catch (error) {
      console.error('❌ Ошибка отправки PDF:', error);
      await ctx.reply(
        '⚠️ Не удалось отправить файл. Напишите @NastuPopova для получения бонуса.',
        Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
        ])
      );
    }
  }

  /**
   * Обрабатывает запрос на скачивание PDF
   */
  async handleDownloadRequest(ctx, bonusId) {
    const bonus = Object.values(this.bonuses).find(b => b.id === bonusId);
    
    if (!bonus) {
      await ctx.answerCbQuery('Бонус не найден', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery('📥 Отправляю ваш бонус...');
    await this.sendPDFFile(ctx, bonus);
  }

  /**
   * Показывает дополнительные материалы
   */
  async showMoreMaterials(ctx) {
    const message = `🎁 *ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ*\n\n` +
      `📚 *Что еще доступно:*\n` +
      `• Персональная диагностика типа дыхания\n` +
      `• Индивидуальная программа на 30 дней\n` +
      `• Видеоуроки с демонстрацией техник\n` +
      `• Ответы на все вопросы о дыхании\n\n` +
      `📞 *Все это вы получите на консультации с Анастасией Поповой*\n\n` +
      `💬 *Записаться:* @breathing_opros_bot\n` +
      `📱 *Написать напрямую:* @NastuPopova`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
        [Markup.button.callback('🔙 К результатам', 'back_to_results')]
      ])
    });
  }

  /**
   * Логирование выдачи бонусов
   */
  logBonusDelivery(userId, bonusId, method, segment) {
    const logData = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      bonus_id: bonusId,
      delivery_method: method,
      user_segment: segment,
      event: 'bonus_delivered'
    };
    
    console.log('🎁 БОНУС ВЫДАН:', JSON.stringify(logData, null, 2));
    
    // Здесь можно добавить отправку в аналитику
    // analytics.track('bonus_delivered', logData);
  }

  /**
   * Получение статистики по бонусам
   */
  getBonusStats() {
    return {
      available_bonuses: Object.keys(this.bonuses).length,
      bonus_types: Object.keys(this.bonuses),
      delivery_methods: ['file', 'url'],
      target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD'],
      total_materials: 2,
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = PDFBonusManager;
