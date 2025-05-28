// Файл: modules/bonus/file-handler.js - ПОЛНАЯ ПЕРЕЗАПИСЬ

const fs = require('fs');
const { Markup } = require('telegraf');
const config = require('../../config');

class FileHandler {
  constructor(contentGenerator) {
    this.contentGenerator = contentGenerator;

    // Google Drive ссылки для статичных PDF
    this.additionalMaterials = {
      adult_antistress: {
        url: 'https://drive.google.com/uc?export=download&id=1MDxi9nR7aplsvG1d1EG-R9eKbklaJVEM',
        directUrl: 'https://drive.google.com/file/d/1MDxi9nR7aplsvG1d1EG-R9eKbklaJVEM/view',
        title: '📄 Базовый гид "Антистресс дыхание"',
        description: 'Универсальные техники для снятия стресса для взрослых',
        fileName: 'Базовый_гид_Антистресс_дыхание_взрослые.pdf'
      },
      child_games: {
        url: 'https://drive.google.com/uc?export=download&id=1Vv-6T1EFJOek3Kiu2KYxjmPizuFOVfuE',
        directUrl: 'https://drive.google.com/file/d/1Vv-6T1EFJOek3Kiu2KYxjmPizuFOVfuE/view',
        title: '📄 Базовый гид "Дыхательные игры"',
        description: 'Игровые техники для детей всех возрастов',
        fileName: 'Базовый_гид_Дыхательные_игры_дети.pdf'
      }
    };

    // Статистика
    this.bonusStats = {
      totalDelivered: 0,
      bySegment: { HOT_LEAD: 0, WARM_LEAD: 0, COLD_LEAD: 0, NURTURE_LEAD: 0 },
      byIssue: {},
      byDeliveryMethod: { file: 0, static_pdf: 0, fallback_link: 0 }
    };
  }

  // ===== ОСНОВНЫЕ МЕТОДЫ =====

  // Получение бонуса для пользователя
  getBonusForUser(analysisResult, surveyData) {
    try {
      const technique = this.contentGenerator.getMasterTechnique(analysisResult, surveyData);
      const isChildFlow = analysisResult.analysisType === 'child';
      
      return {
        id: `personalized_${isChildFlow ? 'child' : 'adult'}_${analysisResult.primaryIssue || 'wellness'}`,
        title: this.contentGenerator.generatePersonalizedTitle(analysisResult, surveyData),
        subtitle: this.contentGenerator.generatePersonalizedSubtitle(analysisResult, surveyData),
        description: `Персонализированная техника "${technique.name}" с планом на 3 дня`,
        technique,
        target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
      };
    } catch (error) {
      console.error('❌ Ошибка getBonusForUser:', error);
      return this.getFallbackBonus();
    }
  }

  // Отправка персонального PDF файла
  async sendPDFFile(ctx) {
    try {
      console.log(`📝 Генерация персонального гида для пользователя ${ctx.from.id}`);

      const bonus = this.getBonusForUser(ctx.session.analysisResult, ctx.session.answers);
      const filePath = await this.contentGenerator.generatePersonalizedHTML(
        ctx.from.id,
        ctx.session.analysisResult,
        ctx.session.answers
      );

      const isChildFlow = ctx.session.analysisResult.analysisType === 'child';
      const technique = bonus.technique;

      let caption = `🎁 *${bonus.title}*\n\n`;
      caption += isChildFlow
        ? `🧸 Персональная игровая техника для вашего ребенка!\n\n`
        : `🌬️ Ваша персональная дыхательная техника!\n\n`;
      caption += `✨ *В файле:*\n`;
      caption += `• ${technique.name}\n`;
      caption += `• Пошаговая инструкция\n`;
      caption += `• План освоения на 3 дня\n`;
      caption += `• Ожидаемые результаты\n\n`;
      caption += `📱 Откройте файл в браузере для лучшего отображения.\n\n`;
      caption += `📞 *Больше техник у* [Анастасии Поповой](https://t.me/NastuPopova)`;

      await ctx.replyWithDocument(
        { source: filePath },
        { caption, parse_mode: 'Markdown' }
      );

      await this.showPostPDFMenu(ctx);
      this.cleanupTempFile(filePath);
      this.bonusStats.byDeliveryMethod.file++;
      
    } catch (error) {
      console.error('❌ Ошибка отправки персонального гида:', error.message);
      await this.sendFallbackTechnique(ctx, this.getBonusForUser(ctx.session.analysisResult, ctx.session.answers));
    }
  }

  // ===== МЕНЮ И ИНТЕРФЕЙСЫ =====

  // Главное меню дополнительных материалов
  async showMoreMaterials(ctx) {
    console.log(`🎁 Показываем меню материалов для пользователя ${ctx.from.id}`);
    
    const isChildFlow = ctx.session?.analysisResult?.analysisType === 'child';

    let message = `🎁 *ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ*\n\n`;
    message += `💡 Вы получили персональный дыхательный гид!\n`;
    message += `Это базовая техника. Полная система включает комплексные программы.\n\n`;
    
    message += `🎁 *БЕСПЛАТНЫЕ БОНУСЫ:*\n`;
    message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
    message += isChildFlow
      ? `• 📄 PDF "Дыхательные игры для детей"\n`
      : `• 📄 PDF "Антистресс дыхание"\n`;
    
    message += `\n🌬️ *КУРСЫ ДЫХАТЕЛЬНЫХ ПРАКТИК:*\n\n`;
    
    message += `🔥 *СТАРТОВЫЙ КОМПЛЕКТ - 990₽*\n`;
    message += `*(вместо 2600₽ - скидка 62%)*\n`;
    message += `• 📹 Видеоурок 40 минут\n`;
    message += `• 📋 PDF-инструкция\n`;
    message += `• 🎧 Аудиозапись (15 минут)\n`;
    message += `• ⚡ Мгновенный доступ\n\n`;
    
    message += `👨‍⚕️ *КОНСУЛЬТАЦИЯ - 2000₽*\n`;
    message += `• Индивидуальный подбор техник\n`;
    message += `• План на 30 дней\n`;
    message += `• Поддержка в Telegram\n\n`;
    
    message += `📖 *Подробнее о всех программах* - в основном боте\n`;
    message += `📞 *Записаться:* [Анастасия Попова](https://t.me/NastuPopova)`;

    const keyboard = [
      [Markup.button.url('📖 Все программы и отзывы', 'https://t.me/breathing_opros_bot')],
      [Markup.button.callback('🔥 Стартовый комплект за 990₽!', 'order_starter')],
      [Markup.button.callback('👨‍⚕️ Консультация за 2000₽', 'order_individual')],
      [isChildFlow
        ? Markup.button.callback('📄 PDF: Игры для детей', 'download_static_child_games')
        : Markup.button.callback('📄 PDF: Антистресс дыхание', 'download_static_adult_antistress')
      ],
      [Markup.button.callback('🤔 Помочь выбрать программу', 'help_choose_program')],
      [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
    ];

    await this.safeEditOrReply(ctx, message, keyboard);
  }

  // Меню всех программ
  async showAllPrograms(ctx) {
    console.log(`📋 Показываем все программы для пользователя ${ctx.from.id}`);
    
    let message = `🌬️ *ВСЕ ПРОГРАММЫ ДЫХАТЕЛЬНЫХ ПРАКТИК*\n\n`;
    
    message += `🔥 *СТАРТОВЫЙ КОМПЛЕКТ - 990₽*\n`;
    message += `*(Обычная цена 2600₽ - экономия 1610₽)*\n`;
    message += `• 📹 Видеоурок 40 минут\n`;
    message += `• 📋 PDF с 10 техниками\n`;
    message += `• 🎧 Аудиопрактики\n`;
    message += `• ⚡ Мгновенный доступ\n\n`;
    
    message += `👨‍⚕️ *ПЕРСОНАЛЬНАЯ КОНСУЛЬТАЦИЯ - 2000₽*\n`;
    message += `• 📞 Индивидуальная сессия 60 мин\n`;
    message += `• 📋 Персональная программа на 30 дней\n`;
    message += `• 💬 Поддержка в Telegram 2 недели\n`;
    message += `• 🎁 Бонусные материалы\n\n`;
    
    message += `📖 *Детальные описания, отзывы и примеры* - в основном боте\n`;
    message += `📞 *Записаться:* [Анастасия Попова](https://t.me/NastuPopova)`;

    const keyboard = [
      [Markup.button.url('📖 Подробнее о программах', 'https://t.me/breathing_opros_bot')],
      [Markup.button.callback('🔥 Стартовый комплект', 'order_starter')],
      [Markup.button.callback('👨‍⚕️ Консультация', 'order_individual')],
      [Markup.button.callback('🤔 Помочь выбрать', 'help_choose_program')],
      [Markup.button.callback('🔙 К материалам', 'more_materials')],
      [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
    ];

    await this.safeEditOrReply(ctx, message, keyboard);
  }

  // Меню после отправки персонального PDF
  async showPostPDFMenu(ctx) {
    const message = `✅ *Ваш персональный гид отправлен!*\n\n` +
      `🎯 *Что дальше?*\n` +
      `• Изучите технику из файла\n` +
      `• Начните практиковать уже сегодня\n` +
      `• При вопросах обращайтесь к Анастасии\n\n` +
      `💡 *Хотите расширить программу?*`;

    const keyboard = [
      [Markup.button.callback('👨‍⚕️ Записаться на консультацию', 'order_individual')],
      [Markup.button.callback('🎁 Посмотреть другие материалы', 'more_materials')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
      [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // ===== ОБРАБОТКА ЗАГРУЗОК =====

  // Обработка запросов на загрузку
  async handleDownloadRequest(ctx, callbackData) {
    console.log(`📥 Обработка запроса скачивания: ${callbackData}`);
    
    if (callbackData === 'download_static_adult_antistress') {
      await this.sendAdditionalPDF(ctx, 'adult_antistress');
    } else if (callbackData === 'download_static_child_games') {
      await this.sendAdditionalPDF(ctx, 'child_games');
    } else if (callbackData.startsWith('download_pdf_')) {
      await this.sendPDFFile(ctx);
    } else {
      console.log(`⚠️ Неизвестный тип загрузки: ${callbackData}`);
    }
  }

  // Отправка статичных PDF с множественными попытками
  async sendAdditionalPDF(ctx, pdfType) {
    const material = this.additionalMaterials[pdfType];
    if (!material) {
      await ctx.reply('😔 Материал не найден. Обратитесь к [Анастасии](https://t.me/NastuPopova)', {
        parse_mode: 'Markdown'
      });
      return;
    }

    console.log(`📤 Попытка отправки PDF: ${material.fileName}`);
    await ctx.answerCbQuery('📤 Отправляю файл...');

    // Попытка 1: Прямая загрузка с Google Drive
    try {
      await ctx.replyWithDocument(
        { url: material.url, filename: material.fileName },
        {
          caption: `🎁 *${material.title}*\n\n${material.description}\n\n📞 Больше материалов у [Анастасии Поповой](https://t.me/NastuPopova)`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Записаться на консультацию', 'order_individual')],
            [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
            [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
          ])
        }
      );

      console.log(`✅ PDF успешно отправлен: ${material.title}`);
      this.bonusStats.byDeliveryMethod.static_pdf++;
      return;

    } catch (error) {
      console.log(`⚠️ Ошибка отправки файла: ${error.message}`);
      await this.sendPDFFallback(ctx, material);
    }
  }

  // Fallback для PDF - отправка ссылки
  async sendPDFFallback(ctx, material) {
    try {
      const message = `📄 *${material.title}*\n\n` +
        `${material.description}\n\n` +
        `📥 К сожалению, автоматическая отправка файла временно недоступна.\n\n` +
        `📱 *Как получить PDF:*\n` +
        `1️⃣ Нажмите кнопку "Открыть PDF" ниже\n` +
        `2️⃣ В открывшемся окне нажмите кнопку скачивания (⬇️)\n` +
        `3️⃣ Файл сохранится в ваши загрузки\n\n` +
        `💡 Если возникнут проблемы, напишите [Анастасии](https://t.me/NastuPopova) - она отправит файл лично`;

      const keyboard = [
        [Markup.button.url('📥 Открыть PDF', material.directUrl)],
        [Markup.button.callback('📞 Записаться на консультацию', 'order_individual')],
        [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
        [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
      ];

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });

      this.bonusStats.byDeliveryMethod.fallback_link++;

    } catch (error) {
      console.error('❌ Ошибка отправки fallback PDF:', error);
      await ctx.reply(
        `😔 Временные технические проблемы с отправкой материалов.\n\n📞 Напишите [Анастасии Поповой](https://t.me/NastuPopova) - она отправит все файлы лично!`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        }
      );
    }
  }

  // ===== УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  // Безопасная отправка/редактирование сообщения
  async safeEditOrReply(ctx, message, keyboard) {
    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
      console.log('✅ Сообщение отредактировано');
    } catch (error) {
      console.log('⚠️ Не удалось отредактировать сообщение, отправляем новое');
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
    }
  }

  // Удаление/закрытие меню
  async closeMenu(ctx) {
    console.log(`🗑️ Удаление меню для пользователя ${ctx.from.id}`);
    
    try {
      await ctx.deleteMessage();
      console.log('✅ Сообщение удалено');
    } catch (deleteError) {
      try {
        await ctx.editMessageText(
          `✅ *Меню закрыто*\n\n💬 Вопросы? Пишите [Анастасии Поповой](https://t.me/NastuPopova)`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [] }
          }
        );
      } catch (editError) {
        await ctx.reply(
          `✅ *Меню закрыто*\n\n💬 Вопросы? Пишите [Анастасии Поповой](https://t.me/NastuPopova)`,
          { parse_mode: 'Markdown' }
        );
      }
    }
  }

  async deleteMenu(ctx) {
    return await this.closeMenu(ctx);
  }

  // Fallback техника при ошибках генерации PDF
  async sendFallbackTechnique(ctx, bonus) {
    const technique = bonus.technique;
    let message = `⚠️ Файл временно недоступен, но вот ваша техника:\n\n`;
    message += `🎯 *${technique.name}*\n\n`;
    message += `*Пошаговая инструкция:*\n`;
    technique.steps.forEach((step, idx) => {
      message += `${idx + 1}. ${step}\n`;
    });
    message += `\n⏱️ *Время:* ${technique.duration}\n`;
    message += `✨ *Результат:* ${technique.result}\n\n`;
    message += `💬 Напишите [Анастасии Поповой](https://t.me/NastuPopova) за полным гидом!`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
        [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
      ])
    });
  }

  // Fallback бонус при ошибках
  getFallbackBonus() {
    return {
      id: 'fallback_adult_chronic_stress',
      title: 'Дыхательный гид: Антистресс',
      subtitle: 'Персональная техника для вашего здоровья',
      description: 'Базовая техника дыхания от стресса',
      technique: this.contentGenerator.masterTechniques.chronic_stress,
      target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
    };
  }

  // Очистка временных файлов
  cleanupTempFile(filePath) {
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Временный файл удален: ${filePath}`);
        }
      } catch (error) {
        console.error('⚠️ Ошибка удаления временного файла:', error);
      }
    }, 1000);
  }

  // ===== ГЕТТЕРЫ И СТАТИСТИКА =====

  getBonusStats() {
    return this.bonusStats;
  }

  getAdditionalMaterials() {
    return this.additionalMaterials;
  }
}

module.exports = FileHandler;
