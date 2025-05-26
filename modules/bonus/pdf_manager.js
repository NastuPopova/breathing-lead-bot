// Файл: modules/bonus/pdf_manager.js
// Система управления PDF-бонусами для лид-бота

const { Markup } = require('telegraf');
const PDFDocument = require('pdfkit');
const fs = require('fs');
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
        preview_text: `📖 *Что внутри гида:*
• Техника "Экстренное дыхание" от панических атак
• Техника "Морская волна" для глубокого расслабления
• Научное обоснование каждого метода
• Пошаговые инструкции

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

    // Статистика бонусов
    this.stats = {
      available_bonuses: Object.keys(this.bonuses).length,
      bonus_types: Object.keys(this.bonuses),
      target_segments: [...new Set(Object.values(this.bonuses).flatMap(b => b.target_segments))],
      last_updated: new Date().toISOString()
    };

    // Логирование доставки бонусов
    this.deliveryLog = [];
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
   * Генерирует персонализированный PDF на основе ответов (2 страницы)
   */
  async generatePersonalizedPDF(userId, bonus, surveyData, analysisResult) {
    return new Promise((resolve, reject) => {
      // Проверяем и создаем папку temp, если она не существует
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp');
      }

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const filePath = `./temp/personalized_bonus_${userId}.pdf`;
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Страница 1: Заголовок и персонализированные данные
      doc.fontSize(20).fillColor('#2E2E2E').text(bonus.title, { align: 'center' });
      doc.fontSize(14).fillColor('#4A4A4A').text(bonus.subtitle, { align: 'center' });
      doc.moveDown(2);

      // Персонализированные данные
      doc.fontSize(12).fillColor('#333333').text('Ваш персонализированный гид', { align: 'center', underline: true });
      doc.moveDown(1);
      
      doc.fontSize(11).fillColor('#555555').text('Основные данные анкеты:', { underline: true });
      doc.moveDown(0.5);
      
      if (surveyData.age_group) {
        doc.text(`Возрастная группа: ${surveyData.age_group}`);
      }
      if (surveyData.stress_level) {
        doc.text(`Уровень стресса: ${surveyData.stress_level}/10`);
      }
      if (analysisResult.segment) {
        doc.text(`Сегмент: ${analysisResult.segment}`);
      }
      if (surveyData.current_problems) {
        const problems = Array.isArray(surveyData.current_problems) 
          ? surveyData.current_problems.slice(0, 2).join(', ')
          : surveyData.current_problems;
        doc.text(`Проблемы: ${problems}`);
      }
      doc.moveDown(1);

      // Рекомендации на основе ответов
      doc.fontSize(12).fillColor('#333333').text('Рекомендации:', { underline: true });
      doc.moveDown(0.5);
      
      if (bonus.id === 'adult_antistress_guide') {
        doc.fontSize(10).fillColor('#444444').text('Техника "Экстренное дыхание":');
        doc.text('1. Сядьте удобно, выпрямите спину.');
        doc.text('2. Сделайте глубокий вдох через нос на 4 секунды.');
        doc.text('3. Задержите дыхание на 4 секунды.');
        doc.text('4. Медленно выдохните через рот на 6 секунд.');
        doc.text('5. Повторите 5-10 раз.');
        doc.moveDown(1);

        if (surveyData.stress_level && parseInt(surveyData.stress_level) > 7) {
          doc.fontSize(10).fillColor('#444444').text('Дополнительно для высокого стресса:');
          doc.text('Попробуйте технику "Морская волна" перед сном:');
          doc.text('1. Лягте, закройте глаза.');
          doc.text('2. Представьте волны моря.');
          doc.text('3. Вдох на 5 секунд, выдох на 7 секунд.');
          doc.text('4. Повторите 5 минут.');
        }
      } else if (bonus.id === 'child_breathing_games') {
        doc.fontSize(10).fillColor('#444444').text('Игра "Воздушный шарик":');
        doc.text('1. Попросите ребенка представить, что его живот — шарик.');
        doc.text('2. На вдохе через нос "надуваем шарик" (живот).');
        doc.text('3. На выдохе через рот "сдуваем шарик".');
        doc.text('4. Повторите 5 раз, делая процесс игривым.');
        doc.moveDown(1);

        if (surveyData.age_group && surveyData.age_group.includes('3-6')) {
          doc.fontSize(10).fillColor('#444444').text('Для возраста 3-6 лет:');
          doc.text('Добавьте звуки, например, "Фшшш" при выдохе.');
        }
      }

      // Переход на вторую страницу
      doc.addPage();

      // Страница 2: Дополнительные рекомендации и контакты
      doc.fontSize(12).fillColor('#333333').text('Дополнительные советы:', { align: 'center', underline: true });
      doc.moveDown(1);

      if (bonus.id === 'adult_antistress_guide') {
        doc.fontSize(10).fillColor('#444444').text('Совет:');
        doc.text('Практикуйте дыхательные упражнения утром и вечером.');
        doc.text('Это поможет поддерживать уровень стресса под контролем.');
      } else {
        doc.fontSize(10).fillColor('#444444').text('Совет:');
        doc.text('Превратите дыхательные игры в ежедневный ритуал.');
        doc.text('Например, делайте их перед сном или после школы.');
      }

      // Контактная информация (внизу страницы)
      doc.moveDown(3);
      doc.fontSize(12).fillColor('#2E2E2E').text('Свяжитесь с нами:', { align: 'center', underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#444444').text('Тренер: Анастасия Попова', { align: 'center' });
      doc.text('📞 Telegram: @breathing_opros_bot', { align: 'center' });
      doc.text('💬 Личный контакт: @NastuPopova', { align: 'center' });
      doc.text('📅 Запишитесь на консультацию!', { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Отправляет PDF файл пользователю
   */
  async sendPDFFile(ctx, bonus) {
    try {
      // Пробуем сгенерировать и отправить динамический PDF
      const filePath = await this.generatePersonalizedPDF(
        ctx.from.id,
        bonus,
        ctx.session.answers,
        ctx.session.analysisResult
      );

      await ctx.replyWithDocument(
        { source: filePath },
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
      
      // Удаляем временный файл после отправки
      fs.unlinkSync(filePath);
      
    } catch (error) {
      console.error('❌ Ошибка отправки динамического PDF:', error.message);
      console.error(error.stack);
      // Fallback: отправляем статичный PDF по URL
      if (bonus.file_url) {
        await ctx.reply(
          `⚠️ Не удалось сгенерировать персонализированный PDF, но вы можете скачать общий гид:\n\n📖 ${bonus.title}`,
          Markup.inlineKeyboard([
            [Markup.button.url('📥 Скачать PDF', bonus.file_url)],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        );
        console.log(`✅ Отправлен статичный PDF пользователю ${ctx.from.id}: ${bonus.file_url}`);
      } else {
        await ctx.reply(
          '⚠️ Не удалось отправить файл. Напишите @NastuPopova для получения бонуса.',
          Markup.inlineKeyboard([
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        );
      }
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
   * Логирует доставку бонуса
   */
  logBonusDelivery(userId, bonusId, deliveryMethod, segment) {
    const logEntry = {
      user_id: userId,
      bonus_id: bonusId,
      delivery_method: deliveryMethod,
      segment: segment,
      timestamp: new Date().toISOString()
    };
    this.deliveryLog.push(logEntry);
    console.log(`📊 Лог доставки бонуса:`, logEntry);
  }

  /**
   * Возвращает статистику бонусов (для админ-команд)
   */
  getBonusStats() {
    return {
      ...this.stats,
      delivery_log: this.deliveryLog,
      delivery_count: this.deliveryLog.length
    };
  }
}

module.exports = PDFBonusManager;
