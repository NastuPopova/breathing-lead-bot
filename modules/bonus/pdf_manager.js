// Файл: modules/bonus/pdf_manager.js
// Система управления PDF-бонусами для лид-бота с поддержкой русского языка

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
   * Переводит значения в читаемый текст
   */
  translateValue(value) {
    return config.TRANSLATIONS[value] || value;
  }

  /**
   * Переводит массив значений
   */
  translateArray(values) {
    if (!values || !Array.isArray(values)) return [];
    return values.map(value => this.translateValue(value));
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
   * Генерирует персонализированный PDF с поддержкой русского языка
   */
  async generatePersonalizedPDF(userId, bonus, surveyData, analysisResult) {
    return new Promise((resolve, reject) => {
      try {
        // Проверяем и создаем папку temp
        if (!fs.existsSync('./temp')) {
          fs.mkdirSync('./temp');
        }

        // ИСПРАВЛЕНО: используем встроенный шрифт для кириллицы
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          bufferPages: true
        });
        
        const filePath = `./temp/personalized_bonus_${userId}.pdf`;
        const stream = fs.createWriteStream(filePath);
        
        doc.pipe(stream);

        // Заголовок
        doc.fontSize(22)
           .fillColor('#2E3A87')
           .text(bonus.title.replace(/🌬️|🎈/g, ''), { align: 'center' });
           
        doc.fontSize(16)
           .fillColor('#5A6ACF')
           .text(bonus.subtitle, { align: 'center' });
           
        doc.moveDown(2);

        // Персонализированная информация
        doc.fontSize(14)
           .fillColor('#333333')
           .text('Ваш персональный гид по дыханию', { align: 'center', underline: true });
           
        doc.moveDown(1);

        // Данные анкеты с переводами
        doc.fontSize(12)
           .fillColor('#555555')
           .text('Основные данные анкеты:', { underline: true });
           
        doc.moveDown(0.5);

        if (surveyData.age_group) {
          const translatedAge = this.translateValue(surveyData.age_group);
          doc.fontSize(11).text(`Возрастная группа: ${translatedAge}`);
        }

        if (surveyData.stress_level) {
          doc.text(`Уровень стресса: ${surveyData.stress_level}/10`);
        }

        if (analysisResult.segment) {
          doc.text(`Категория: ${analysisResult.segment}`);
        }

        if (surveyData.current_problems) {
          const translatedProblems = this.translateArray(surveyData.current_problems)
            .slice(0, 2)
            .join(', ');
          doc.text(`Основные проблемы: ${translatedProblems}`);
        }

        if (surveyData.child_age_detail) {
          const translatedAge = this.translateValue(surveyData.child_age_detail);
          doc.text(`Возраст ребенка: ${translatedAge}`);
        }

        if (surveyData.child_problems_detailed) {
          const translatedProblems = this.translateArray(surveyData.child_problems_detailed)
            .slice(0, 2)
            .join(', ');
          doc.text(`Проблемы ребенка: ${translatedProblems}`);
        }

        doc.moveDown(1.5);

        // Рекомендации
        doc.fontSize(14)
           .fillColor('#2E3A87')
           .text('Персональные рекомендации:', { underline: true });
           
        doc.moveDown(0.5);

        if (bonus.id === 'adult_antistress_guide') {
          doc.fontSize(12)
             .fillColor('#333333')
             .text('Техника "Экстренное дыхание":', { underline: true });
             
          doc.fontSize(11)
             .fillColor('#444444')
             .text('1. Сядьте удобно, выпрямите спину.')
             .text('2. Глубокий вдох через нос на 4 счета.')
             .text('3. Задержите дыхание на 4 счета.')
             .text('4. Медленный выдох через рот на 6 счетов.')
             .text('5. Повторите 5-10 раз.');

          doc.moveDown(1);

          if (surveyData.stress_level && parseInt(surveyData.stress_level) > 7) {
            doc.fontSize(12)
               .fillColor('#333333')
               .text('Дополнительно для высокого стресса:', { underline: true });
               
            doc.fontSize(11)
               .fillColor('#444444')
               .text('Техника "Морская волна" перед сном:')
               .text('1. Лягте удобно, закройте глаза.')
               .text('2. Представьте мягкие волны моря.')
               .text('3. Вдох на 5 секунд, выдох на 7 секунд.')
               .text('4. Повторяйте 5-10 минут.');
          }

        } else if (bonus.id === 'child_breathing_games') {
          doc.fontSize(12)
             .fillColor('#333333')
             .text('Игра "Воздушный шарик":', { underline: true });
             
          doc.fontSize(11)
             .fillColor('#444444')
             .text('1. Попросите ребенка представить животик как шарик.')
             .text('2. На вдохе через нос "надуваем шарик".')
             .text('3. На выдохе через рот "сдуваем шарик".')
             .text('4. Повторите 5 раз в игровой форме.');

          doc.moveDown(1);

          if (surveyData.child_age_detail && ['3-4', '5-6'].includes(surveyData.child_age_detail)) {
            doc.fontSize(11)
               .fillColor('#444444')
               .text('Для малышей 3-6 лет:')
               .text('Добавьте звуки: "Фшшш" при выдохе,')
               .text('"Хммм" при вдохе. Делайте вместе!');
          }
        }

        // Новая страница
        doc.addPage();

        // Дополнительные советы
        doc.fontSize(14)
           .fillColor('#2E3A87')
           .text('Дополнительные советы:', { align: 'center', underline: true });
           
        doc.moveDown(1);

        if (bonus.id === 'adult_antistress_guide') {
          doc.fontSize(11)
             .fillColor('#444444')
             .text('• Практикуйте утром и вечером по 5-10 минут')
             .text('• Используйте техники в стрессовых ситуациях')
             .text('• Дышите носом в течение дня')
             .text('• Следите за осанкой во время практик');
        } else {
          doc.fontSize(11)
             .fillColor('#444444')
             .text('• Превратите дыхание в ежедневный ритуал')
             .text('• Делайте упражнения перед сном')
             .text('• Хвалите ребенка за участие')
             .text('• Будьте терпеливы и последовательны');
        }

        // Контактная информация
        doc.moveDown(4);
        
        doc.fontSize(14)
           .fillColor('#2E3A87')
           .text('Свяжитесь с нами:', { align: 'center', underline: true });
           
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .fillColor('#444444')
           .text('Тренер: Анастасия Попова', { align: 'center' })
           .text('Telegram: @NastuPopova', { align: 'center' })
           .text('Запишитесь на консультацию!', { align: 'center' });

        // Завершаем документ
        doc.end();

        stream.on('finish', () => {
          console.log(`✅ PDF успешно создан: ${filePath}`);
          resolve(filePath);
        });
        
        stream.on('error', (err) => {
          console.error('❌ Ошибка создания PDF:', err);
          reject(err);
        });

      } catch (error) {
        console.error('❌ Критическая ошибка генерации PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Отправляет PDF файл пользователю
   */
  async sendPDFFile(ctx, bonus) {
    try {
      console.log(`📝 Начинаем генерацию PDF для пользователя ${ctx.from.id}`);
      
      // Генерируем персонализированный PDF
      const filePath = await this.generatePersonalizedPDF(
        ctx.from.id,
        bonus,
        ctx.session.answers,
        ctx.session.analysisResult
      );

      console.log(`📤 Отправляем PDF файл: ${filePath}`);

      // Отправляем файл
      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption: `📖 ${bonus.title}\n\n💝 Ваш персональный бонус готов!\n\n📞 Запишитесь на консультацию: @NastuPopova\n💬 Личный контакт тренера: @NastuPopova`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        }
      );
      
      console.log(`✅ PDF успешно отправлен пользователю ${ctx.from.id}: ${bonus.title}`);
      
      // Удаляем временный файл
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Временный файл удален: ${filePath}`);
          }
        } catch (cleanupError) {
          console.error('⚠️ Ошибка удаления временного файла:', cleanupError);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Ошибка отправки PDF:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Fallback: текстовое сообщение
      await ctx.reply(
        `⚠️ Извините, не удалось создать персонализированный PDF.\n\n` +
        `📖 *${bonus.title}*\n${bonus.subtitle}\n\n` +
        `${bonus.preview_text}\n\n` +
        `💬 Напишите @NastuPopova для получения материалов.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
            [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')]
          ])
        }
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

    await ctx.answerCbQuery('📥 Создаю ваш персональный бонус...');
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
      `💬 *Записаться:* @NastuPopova\n` +
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
