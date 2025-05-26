// Файл: modules/bonus/pdf_manager.js
// ИСПРАВЛЕННАЯ версия 2 - решение проблемы с кириллицей

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
   * НОВАЯ ВЕРСИЯ: Генерирует простой HTML вместо PDF с кириллицей
   */
  async generatePersonalizedHTML(userId, bonus, surveyData, analysisResult) {
    try {
      // Проверяем и создаем папку temp
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp');
      }

      const filePath = `./temp/bonus_${userId}.html`;
      
      // Функция для очистки текста от эмодзи
      const cleanText = (text) => {
        return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      };

      // Создаем HTML контент с корректной кодировкой
      let htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cleanText(bonus.title)}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
            background-color: #f9f9f9;
        }
        .header {
            text-align: center;
            color: #2E3A87;
            border-bottom: 2px solid #5A6ACF;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 18px;
            color: #5A6ACF;
        }
        .section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2E3A87;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .data-item {
            margin: 8px 0;
            padding: 5px 0;
        }
        .technique {
            background: #f0f8ff;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #5A6ACF;
            border-radius: 4px;
        }
        .contact-info {
            text-align: center;
            background: #e8f0fe;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>`;

      // Заголовок
      htmlContent += `
    <div class="header">
        <div class="title">${cleanText(bonus.title)}</div>
        <div class="subtitle">${cleanText(bonus.subtitle)}</div>
        <p>Ваш персональный гид по дыханию</p>
    </div>`;

      // Персональные данные
      htmlContent += `
    <div class="section">
        <div class="section-title">Основные данные анкеты</div>`;

      if (surveyData.age_group) {
        const translatedAge = this.translateValue(surveyData.age_group);
        htmlContent += `<div class="data-item"><strong>Возрастная группа:</strong> ${translatedAge}</div>`;
      }

      if (surveyData.stress_level) {
        htmlContent += `<div class="data-item"><strong>Уровень стресса:</strong> ${surveyData.stress_level}/10</div>`;
      }

      if (analysisResult.segment) {
        const segmentNames = {
          'HOT_LEAD': 'Требует срочного внимания',
          'WARM_LEAD': 'Активно мотивирован',
          'COLD_LEAD': 'Умеренный интерес',
          'NURTURE_LEAD': 'Долгосрочное развитие'
        };
        htmlContent += `<div class="data-item"><strong>Категория:</strong> ${segmentNames[analysisResult.segment] || analysisResult.segment}</div>`;
      }

      if (surveyData.current_problems) {
        const translatedProblems = this.translateArray(surveyData.current_problems).slice(0, 2).join(', ');
        htmlContent += `<div class="data-item"><strong>Основные проблемы:</strong> ${translatedProblems}</div>`;
      }

      if (surveyData.child_age_detail) {
        const translatedAge = this.translateValue(surveyData.child_age_detail);
        htmlContent += `<div class="data-item"><strong>Возраст ребенка:</strong> ${translatedAge}</div>`;
      }

      if (surveyData.child_problems_detailed) {
        const translatedProblems = this.translateArray(surveyData.child_problems_detailed).slice(0, 2).join(', ');
        htmlContent += `<div class="data-item"><strong>Проблемы ребенка:</strong> ${translatedProblems}</div>`;
      }

      htmlContent += `</div>`;

      // Рекомендации
      htmlContent += `
    <div class="section">
        <div class="section-title">Персональные рекомендации</div>`;

      if (bonus.id === 'adult_antistress_guide') {
        htmlContent += `
        <div class="technique">
            <strong>Техника "Экстренное дыхание":</strong>
            <ol>
                <li>Сядьте удобно, выпрямите спину.</li>
                <li>Глубокий вдох через нос на 4 счета.</li>
                <li>Задержите дыхание на 4 счета.</li>
                <li>Медленный выдох через рот на 6 счетов.</li>
                <li>Повторите 5-10 раз.</li>
            </ol>
        </div>`;

        if (surveyData.stress_level && parseInt(surveyData.stress_level) > 7) {
          htmlContent += `
        <div class="technique">
            <strong>Дополнительно для высокого стресса - Техника "Морская волна":</strong>
            <ol>
                <li>Лягте удобно, закройте глаза.</li>
                <li>Представьте мягкие волны моря.</li>
                <li>Вдох на 5 секунд, выдох на 7 секунд.</li>
                <li>Повторяйте 5-10 минут.</li>
            </ol>
        </div>`;
        }

      } else if (bonus.id === 'child_breathing_games') {
        htmlContent += `
        <div class="technique">
            <strong>Игра "Воздушный шарик":</strong>
            <ol>
                <li>Попросите ребенка представить животик как шарик.</li>
                <li>На вдохе через нос "надуваем шарик".</li>
                <li>На выдохе через рот "сдуваем шарик".</li>
                <li>Повторите 5 раз в игровой форме.</li>
            </ol>
        </div>`;

        if (surveyData.child_age_detail && ['3-4', '5-6'].includes(surveyData.child_age_detail)) {
          htmlContent += `
        <div class="technique">
            <strong>Для малышей 3-6 лет:</strong>
            <p>Добавьте звуки: "Фшшш" при выдохе, "Хммм" при вдохе. Делайте вместе!</p>
        </div>`;
        }
      }

      htmlContent += `</div>`;

      // Дополнительные советы
      htmlContent += `
    <div class="section">
        <div class="section-title">Дополнительные советы</div>`;

      if (bonus.id === 'adult_antistress_guide') {
        htmlContent += `
        <ul>
            <li>Практикуйте утром и вечером по 5-10 минут</li>
            <li>Используйте техники в стрессовых ситуациях</li>
            <li>Дышите носом в течение дня</li>
            <li>Следите за осанкой во время практик</li>
        </ul>`;
      } else {
        htmlContent += `
        <ul>
            <li>Превратите дыхание в ежедневный ритуал</li>
            <li>Делайте упражнения перед сном</li>
            <li>Хвалите ребенка за участие</li>
            <li>Будьте терпеливы и последовательны</li>
        </ul>`;
      }

      htmlContent += `</div>`;

      // Контактная информация
      htmlContent += `
    <div class="contact-info">
        <div class="section-title">Свяжитесь с нами</div>
        <p><strong>Тренер:</strong> Анастасия Попова</p>
        <p><strong>Telegram:</strong> @NastuPopova</p>
        <p>Запишитесь на консультацию!</p>
    </div>

    <div class="footer">
        <p>Создано специально для вас • ${new Date().toLocaleDateString('ru-RU')}</p>
    </div>

</body>
</html>`;

      // Записываем HTML файл
      fs.writeFileSync(filePath, htmlContent, 'utf8');
      
      console.log(`✅ HTML файл успешно создан: ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error('❌ Критическая ошибка генерации HTML:', error);
      throw error;
    }
  }

  /**
   * Отправляет HTML файл как документ пользователю
   */
  async sendPDFFile(ctx, bonus) {
    try {
      console.log(`📝 Начинаем генерацию HTML для пользователя ${ctx.from.id}`);
      
      // Генерируем HTML вместо PDF
      const filePath = await this.generatePersonalizedHTML(
        ctx.from.id,
        bonus,
        ctx.session.answers,
        ctx.session.analysisResult
      );

      console.log(`📤 Отправляем HTML файл: ${filePath}`);

      // Отправляем файл как документ
      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption: `📖 ${bonus.title}\n\n💝 Ваш персональный бонус готов!\n\nОткройте файл в браузере для лучшего отображения.\n\n📞 Запишитесь на консультацию: @NastuPopova`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        }
      );
      
      console.log(`✅ HTML файл успешно отправлен пользователю ${ctx.from.id}: ${bonus.title}`);
      
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
      console.error('❌ Ошибка отправки HTML:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Fallback: текстовое сообщение
      await ctx.reply(
        `⚠️ Извините, не удалось создать персонализированный файл.\n\n` +
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
