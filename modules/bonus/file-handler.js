// Файл: modules/bonus/file-handler.js - ВЕРСИЯ С GOOGLE DRIVE
const fs = require('fs');
const { Markup } = require('telegraf');
const config = require('../../config');

class FileHandler {
  constructor(contentGenerator) {
    this.contentGenerator = contentGenerator;

    // ИСПРАВЛЕНО: Google Drive ссылки для статичных PDF с реальными ID
    this.additionalMaterials = {
      adult_antistress: {
        // Формат: https://drive.google.com/uc?export=download&id=FILE_ID
        url: 'https://drive.google.com/uc?export=download&id=1MDxi9nR7aplsvG1d1EG-R9eKbklaJVEM',
        directUrl: 'https://drive.google.com/file/d/1MDxi9nR7aplsvG1d1EG-R9eKbklaJVEM/view',
        title: '📄 Базовый гид "Антистресс дыхание"',
        description: 'Универсальные техники для снятия стресса для взрослых',
        fileName: 'Базовый_гид_Антистресс_дыхание_взрослые.pdf'
      },
      child_games: {
        // Детский PDF с реальным ID
        url: 'https://drive.google.com/uc?export=download&id=1Vv-6T1EFJOek3Kiu2KYxjmPizuFOVfuE',
        directUrl: 'https://drive.google.com/file/d/1Vv-6T1EFJOek3Kiu2KYxjmPizuFOVfuE/view',
        title: '📄 Базовый гид "Дыхательные игры"',
        description: 'Игровые техники для детей всех возрастов',
        fileName: 'Базовый_гид_Дыхательные_игры_дети.pdf'
      }
    };

    // Лог доставки бонусов
    this.bonusDeliveryLog = [];
    this.bonusStats = {
      totalDelivered: 0,
      bySegment: { HOT_LEAD: 0, WARM_LEAD: 0, COLD_LEAD: 0, NURTURE_LEAD: 0 },
      byIssue: {},
      byDeliveryMethod: { file: 0, static_pdf: 0, fallback_link: 0 }
    };
  }

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

  // НОВЫЙ МЕТОД: Множественные попытки отправки PDF
  async sendAdditionalPDF(ctx, pdfType) {
    const material = this.additionalMaterials[pdfType];
    if (!material) {
      await ctx.reply('😔 Материал не найден. Обратитесь к [Анастасии](https://t.me/breathing_opros_bot)', {
        parse_mode: 'Markdown'
      });
      return;
    }

    console.log(`📤 Попытка отправки PDF: ${material.fileName}`);

    // Попытка 1: Прямая загрузка с Google Drive
    try {
      console.log(`🔗 Попытка 1 - Google Drive URL: ${material.url}`);
      
      await ctx.replyWithDocument(
        { url: material.url, filename: material.fileName },
        {
          caption: `🎁 *${material.title}*\n\n${material.description}\n\n📞 Больше материалов у [Анастасии Поповой](https://t.me/breathing_opros_bot)`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
            [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
          ])
        }
      );

      console.log(`✅ PDF успешно отправлен: ${material.title}`);
      this.bonusStats.byDeliveryMethod.static_pdf++;
      return;

    } catch (error1) {
      console.log(`⚠️ Попытка 1 неудачна: ${error1.message}`);
    }

    // Попытка 2: Альтернативный формат Google Drive
    try {
      console.log(`🔗 Попытка 2 - Альтернативный Google Drive формат`);
      
      const alternativeUrl = material.url.replace('uc?export=download&id=', 'uc?id=').replace('&export=download', '');
      
      await ctx.replyWithDocument(
        { url: alternativeUrl, filename: material.fileName },
        {
          caption: `🎁 *${material.title}*\n\n${material.description}\n\n📞 Больше материалов у [Анастасии Поповой](https://t.me/breathing_opros_bot)`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
            [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
          ])
        }
      );

      console.log(`✅ PDF успешно отправлен (попытка 2): ${material.title}`);
      this.bonusStats.byDeliveryMethod.static_pdf++;
      return;

    } catch (error2) {
      console.log(`⚠️ Попытка 2 неудачна: ${error2.message}`);
    }

    // Попытка 3: Отправка прямой ссылки
    console.log(`🔗 Попытка 3 - Отправка ссылки на просмотр`);
    await this.sendPDFLink(ctx, material);
  }

  // НОВЫЙ МЕТОД: Отправка ссылки на PDF
  async sendPDFLink(ctx, material) {
    try {
      const message = `📄 *${material.title}*\n\n` +
        `${material.description}\n\n` +
        `📥 К сожалению, автоматическая отправка файла временно недоступна.\n\n` +
        `📱 *Как получить PDF:*\n` +
        `1️⃣ Нажмите кнопку "Открыть PDF" ниже\n` +
        `2️⃣ В открывшемся окне нажмите кнопку скачивания (⬇️)\n` +
        `3️⃣ Файл сохранится в ваши загрузки\n\n` +
        `💡 Если возникнут проблемы, напишите [Анастасии](https://t.me/breathing_opros_bot) - она отправит файл лично`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📥 Открыть PDF', material.directUrl)],
          [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
          [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
          [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
        ])
      });

      console.log(`✅ Ссылка на PDF отправлена: ${material.title}`);
      this.bonusStats.byDeliveryMethod.fallback_link++;

    } catch (error) {
      console.error('❌ Ошибка отправки ссылки на PDF:', error);
      
      // Последний fallback
      await ctx.reply(
        `😔 Временные технические проблемы с отправкой материалов.\n\n📞 Напишите [Анастасии Поповой](https://t.me/breathing_opros_bot) - она отправит все файлы лично!`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
          ])
        }
      );
    }
  }

  // Отправка персонального PDF
  async sendPDFFile(ctx) {
    try {
      console.log(`📝 Генерация персонального гида для пользователя ${ctx.from.id}`);

      const bonus = this.getBonusForUser(ctx.session.analysisResult, ctx.session.answers);
      const filePath = await this.contentGenerator.generatePersonalizedHTML(
        ctx.from.id,
        ctx.session.analysisResult,
        ctx.session.answers
      );

      console.log(`📤 Отправляем персональный файл: ${filePath}`);

      const isChildFlow = ctx.session.analysisResult.analysisType === 'child';
      const isHotLead = ctx.session.analysisResult.segment === 'HOT_LEAD';
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
      if (isHotLead) {
        caption += `⚡ *ВАЖНО:* Начните с техники прямо сейчас!\n\n`;
      }
      caption += `📱 Откройте файл в браузере для лучшего отображения.\n\n`;
      caption += `📞 *Больше техник у* [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

      // Отправляем персональный HTML файл
      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption,
          parse_mode: 'Markdown'
        }
      );

      // Отправляем отдельное сообщение с кнопками управления
      await this.showPostPDFMenu(ctx);

      console.log(`✅ Персональный гид отправлен: ${bonus.title}`);
      this.cleanupTempFile(filePath);
      this.bonusStats.byDeliveryMethod.file++;
      
    } catch (error) {
      console.error('❌ Ошибка отправки персонального гида:', error.message);
      await this.sendFallbackTechnique(ctx, this.getBonusForUser(ctx.session.analysisResult, ctx.session.answers));
    }
  }

  // Показ меню после отправки PDF
  async showPostPDFMenu(ctx) {
    const message = `✅ *Ваш персональный гид отправлен!*\n\n` +
      `🎯 *Что дальше?*\n` +
      `• Изучите технику из файла\n` +
      `• Начните практиковать уже сегодня\n` +
      `• При вопросах обращайтесь к Анастасии\n\n` +
      `💡 *Хотите расширить программу?*`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
        [Markup.button.callback('🎁 Посмотреть другие материалы', 'more_materials')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
        [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
      ])
    });
  }

  // Показ дополнительных материалов
  async showMoreMaterials(ctx) {
    const isChildFlow = ctx.session?.analysisResult?.analysisType === 'child';

    let message = `🎁 *ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ*\n\n`;
    message += `💡 *Вы получили персональный дыхательный гид!*\n`;
    message += `Это базовая техника. Полная система включает комплексные программы.\n\n`;
    message += `🎁 *БЕСПЛАТНЫЕ БОНУСЫ:*\n`;
    message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
    message += isChildFlow
      ? `• 📄 PDF "Дыхательные игры для детей"\n`
      : `• 📄 PDF "Антистресс дыхание"\n`;
    message += `\n🌬️ *КУРСЫ ДЫХАТЕЛЬНЫХ ПРАКТИК:*\n`;
    message += `🔥 *СТАРТОВЫЙ КОМПЛЕКТ - 990₽*\n`;
    message += `*(вместо 2600₽ - скидка 62%)*\n`;
    message += `• 📹 Видеоурок 40 минут\n`;
    message += `• 📋 PDF-инструкция\n`;
    message += `• 🎧 Аудиозапись (15 минут)\n`;
    message += `• ⚡ Мгновенный доступ\n\n`;
    message += `👨‍⚕️ *ИНДИВИДУАЛЬНОЕ ЗАНЯТИЕ - 2000₽*\n`;
    message += `👩‍⚕️ *Записаться к* [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

    const keyboard = [
      [Markup.button.callback('🔥 Стартовый комплект за 990₽!', 'order_starter')],
      [Markup.button.callback('📞 Индивидуальная консультация', 'contact_request')],
      [isChildFlow
        ? Markup.button.callback('📄 PDF: Игры для детей', 'download_static_child_games')
        : Markup.button.callback('📄 PDF: Антистресс дыхание', 'download_static_adult_antistress')
      ],
      [Markup.button.callback('📋 Все программы', 'show_all_programs')],
      [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
    } catch (error) {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
    }
  }

  // ИСПРАВЛЕНО: Полное удаление сообщений
  async closeMenu(ctx) {
    console.log(`🗑️ Полное удаление меню для пользователя ${ctx.from.id}`);
    
    try {
      await ctx.deleteMessage();
      console.log('✅ Сообщение полностью удалено');
      
    } catch (deleteError) {
      console.log('⚠️ Не удалось удалить сообщение:', deleteError.message);
      
      try {
        await ctx.editMessageText(
          `✅ *Меню закрыто*\n\n💬 Вопросы? Пишите [Анастасии Поповой](https://t.me/breathing_opros_bot)`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [] }
          }
        );
        console.log('✅ Сообщение отредактировано (удаление невозможно)');
        
      } catch (editError) {
        console.log('⚠️ Отправляем новое сообщение о закрытии');
        await ctx.reply(
          `✅ *Меню закрыто*\n\n💬 Вопросы? Пишите [Анастасии Поповой](https://t.me/breathing_opros_bot)`,
          { parse_mode: 'Markdown' }
        );
      }
    }
  }

  // Удаление меню (алиас для closeMenu)
  async deleteMenu(ctx) {
    return await this.closeMenu(ctx);
  }

  // Показ всех программ (сокращенная версия для экономии места)
  async showAllPrograms(ctx) {
    let message = `🌬️ *ВСЕ ПРОГРАММЫ ДЫХАТЕЛЬНЫХ ПРАКТИК*\n\n`;
    message += `🔥 *СТАРТОВЫЙ КОМПЛЕКТ* - 990₽ *(скидка 62%)*\n`;
    message += `👨‍⚕️ *КОНСУЛЬТАЦИЯ* - 2000₽\n`;
    message += `👩‍🏫 *ПАКЕТ ЗАНЯТИЙ* - 6000₽\n`;
    message += `🎥 *ВИДЕОКУРС* - 3500₽\n\n`;
    message += `📞 *Записаться:* [Анастасия Попова](https://t.me/breathing_opros_bot)`;

    const keyboard = [
      [Markup.button.callback('🔥 Стартовый комплект', 'order_starter')],
      [Markup.button.callback('👨‍⚕️ Консультация', 'order_individual')],
      [Markup.button.callback('🤔 Помочь выбрать', 'help_choose_program')],
      [Markup.button.callback('🔙 К материалам', 'more_materials')],
      [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
    } catch (error) {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
    }
  }

  // Остальные методы (сокращены для экономии места)
  async showOrderDetails(ctx, programType) { /* ... */ }
  async showProgramHelper(ctx) { /* ... */ }
  async handleDownloadRequest(ctx, callbackData) {
    console.log(`📥 Обработка запроса скачивания: ${callbackData}`);
    
    if (callbackData.startsWith('download_static_')) {
      const pdfType = callbackData.replace('download_static_', '');
      await this.sendAdditionalPDF(ctx, pdfType);
    } else if (callbackData.startsWith('download_pdf_')) {
      await this.sendPDFFile(ctx);
    }
  }

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
    message += `💬 Напишите [Анастасии Поповой](https://t.me/breathing_opros_bot) за полным гидом!`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
        [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
      ])
    });
  }

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

  logBonusDelivery(userId, bonusId, deliveryMethod, segment, primaryIssue) {
    this.bonusStats.totalDelivered++;
    this.bonusStats.byDeliveryMethod[deliveryMethod]++;
    console.log(`📊 Лог доставки: ${deliveryMethod} для ${userId}`);
  }

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

  getBonusStats() {
    return this.bonusStats;
  }

  getAdditionalMaterials() {
    return this.additionalMaterials;
  }
}

module.exports = FileHandler;
