const fs = require('fs');
const Markup = require('telegraf/markup');

class FileHandler {
  constructor() {
    // Статичные PDF с красивыми названиями
    this.additionalMaterials = {
      'adult_antistress': {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/Базовый_гид_Антистресс_дыхание_взрослые.pdf',
        title: '📄 Базовый гид "Антистресс дыхание"',
        description: 'Универсальные техники для снятия стресса для взрослых',
        fileName: 'Базовый_гид_Антистресс_дыхание_взрослые.pdf'
      },
      'child_games': {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/Базовый_гид_Дыхательные_игры_дети.pdf',
        title: '📄 Базовый гид "Дыхательные игры"',
        description: 'Игровые техники для детей всех возрастов',
        fileName: 'Базовый_гид_Дыхательные_игры_дети.pdf'
      }
    };
  }

  // Отправка персонального PDF
  async sendPDFFile(ctx, bonus) {
    try {
      console.log(`📝 Генерация персонального гида для пользователя ${ctx.from.id}`);

      const filePath = await this.generatePersonalizedHTML(
        ctx.from.id,
        ctx.session.analysisResult,
        ctx.session.answers,
        bonus
      );

      console.log(`📤 Отправляем персональный файл: ${filePath}`);

      const isChildFlow = ctx.session.analysisResult.analysisType === 'child';
      const isHotLead = ctx.session.analysisResult.segment === 'HOT_LEAD';
      const technique = bonus.technique;

      let caption = `🎁 *${bonus.title}*\n\n`;

      if (isChildFlow) {
        caption += `🧸 Персональная игровая техника для вашего ребенка!\n\n`;
      } else {
        caption += `🌬️ Ваша персональная дыхательная техника!\n\n`;
      }

      caption += `✨ *В файле:*\n`;
      caption += `• ${technique.name}\n`;
      caption += `• Пошаговая инструкция\n`;
      caption += `• План освоения на 3 дня\n`;
      caption += `• Ожидаемые результаты\n\n`;

      if (isHotLead) {
        caption += `⚡ *ВАЖНО:* Начните с техники прямо сейчас!\n\n`;
      }

      caption += `📱 Откройте файл в браузере для лучшего отображения.\n\n`;
      caption += `📞 *Больше техник у* [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption: caption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')]
          ])
        }
      );

      console.log(`✅ Персональный гид отправлен: ${bonus.title}`);

      // Очищаем временный файл
      this.cleanupTempFile(filePath);

    } catch (error) {
      console.error('❌ Ошибка отправки персонального гида:', error.message);
      await this.sendFallbackTechnique(ctx, bonus);
    }
  }

  // Отправка статичных PDF
  async sendAdditionalPDF(ctx, pdfType) {
    console.log(`📥 Отправка статичного PDF: ${pdfType}`);

    const pdf = this.additionalMaterials[pdfType];
    if (!pdf) {
      console.error(`❌ PDF с типом ${pdfType} не найден в additionalMaterials`);
      console.log('Доступные PDF:', Object.keys(this.additionalMaterials));

      await ctx.reply('⚠️ Запрошенный PDF временно недоступен. Свяжитесь с [Анастасией Поповой](https://t.me/breathing_opros_bot) для получения бонуса!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
        ])
      });
      return;
    }

    const message = `🎁 *ДОПОЛНИТЕЛЬНЫЙ БОНУС*\n\n` +
      `${pdf.title}\n\n` +
      `📝 *Что внутри:* ${pdf.description}\n\n` +
      `💡 *Дополняет ваш персональный гид* - используйте оба материала для максимального эффекта!\n\n` +
      `📞 *Хотите еще больше техник?* Запишитесь к [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

    try {
      console.log(`📤 Отправляем PDF по URL: ${pdf.url}`);

      await ctx.replyWithDocument({ url: pdf.url }, {
        caption: message,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📞 Записаться к Анастасии', 'https://t.me/breathing_opros_bot')],
          [Markup.button.callback('🔙 К моей технике', 'back_to_results')]
        ])
      });

      console.log(`✅ Отправлен статичный PDF: ${pdf.title} для пользователя ${ctx.from.id}`);

    } catch (error) {
      console.error(`❌ Ошибка отправки PDF по URL: ${error.message}`);

      await ctx.reply(message + `\n\n📥 [Скачать ${pdf.fileName}](${pdf.url})`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📥 Открыть PDF', pdf.url)],
          [Markup.button.url('📞 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
        ])
      });

      console.log(`✅ Отправлена ссылка на PDF: ${pdf.title}`);
    }
  }

  // Показ дополнительных материалов
  async showMoreMaterials(ctx) {
    const isChildFlow = ctx.session?.analysisResult?.analysisType === 'child';

    let message = `🎁 *ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ*\n\n`;

    message += `💡 *Вы получили персональный дыхательный гид!*\n`;
    message += `Это базовая техника. Полная система включает комплексные программы для глубокой трансформации.\n\n`;

    message += `🎁 *БЕСПЛАТНЫЕ БОНУСЫ:*\n`;

    if (isChildFlow) {
      message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
      message += `• 📄 PDF "Дыхательные игры для детей"\n`;
      message += `• 🎥 Видео "Как научить ребенка дышать" (3 мин)\n`;
      message += `• 📝 Чек-лист "Признаки стресса у детей"\n\n`;
    } else {
      message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
      message += `• 📄 PDF "Антистресс дыхание"\n`;
      message += `• 🎥 Видео "3 техники на каждый день" (5 мин)\n`;
      message += `• 📝 Чек-лист "Самодиагностика дыхания"\n\n`;
    }

    message += `👩‍⚕️ *Записаться к* [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

    const keyboard = [
      [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
      [isChildFlow
        ? Markup.button.callback('📄 PDF: Игры для детей', 'download_pdf_child_games')
        : Markup.button.callback('📄 PDF: Антистресс дыхание', 'download_pdf_adult_antistress')
      ],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
      [Markup.button.callback('🔙 К моей технике', 'back_to_results')]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // Генерация HTML (используется contentGenerator)
  async generatePersonalizedHTML(userId, analysisResult, surveyData, bonus) {
    // Этот метод будет делегирован в ContentGenerator
    // Пока оставляем заглушку для совместимости
    const ContentGenerator = require('./content-generator');
    const contentGenerator = new ContentGenerator();
    return await contentGenerator.generatePersonalizedHTML(userId, analysisResult, surveyData);
  }

  // Fallback техника при ошибке отправки файла
  async sendFallbackTechnique(ctx, bonus) {
    const technique = bonus.technique;
    let fallbackMessage = `⚠️ Файл временно недоступен, но вот ваша техника:\n\n`;
    fallbackMessage += `🎯 *${technique.name}*\n\n`;
    fallbackMessage += `*Пошаговая инструкция:*\n`;
    technique.steps.forEach((step, index) => {
      fallbackMessage += `${index + 1}. ${step}\n`;
    });
    fallbackMessage += `\n⏱️ *Время:* ${technique.duration}\n`;
    fallbackMessage += `✨ *Результат:* ${technique.result}\n\n`;
    fallbackMessage += `💬 Напишите [Анастасии Поповой](https://t.me/breathing_opros_bot) за полным гидом и планом на 3 дня!`;

    await ctx.reply(fallbackMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')]
      ])
    });
  }

  // Очистка временных файлов
  cleanupTempFile(filePath) {
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
  }

  // Получение статичных материалов для отладки
  getAdditionalMaterials() {
    return this.additionalMaterials;
  }

  // Проверка доступности файла
  async checkFileAvailability(pdfType) {
    const pdf = this.additionalMaterials[pdfType];
    if (!pdf) return false;
    
    try {
      // Здесь можно добавить проверку доступности URL
      return true;
    } catch (error) {
      console.error(`❌ Файл ${pdfType} недоступен:`, error.message);
      return false;
    }
  }
}

module.exports = FileHandler;
