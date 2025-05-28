// Файл: modules/bonus/file-handler.js
const fs = require('fs');
const Markup = require('telegraf/markup');
const config = require('../../config');

class FileHandler {
  constructor(contentGenerator) {
    this.contentGenerator = contentGenerator; // Инстанс ContentGenerator для генерации контента

    // Статичные PDF
    this.additionalMaterials = {
      adult_antistress: {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/Базовый_гид_Антистресс_дыхание_взрослые.pdf',
        title: '📄 Базовый гид "Антистресс дыхание"',
        description: 'Универсальные техники для снятия стресса для взрослых',
        fileName: 'Базовый_гид_Антистресс_дыхание_взрослые.pdf'
      },
      child_games: {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/Базовый_гид_Дыхательные_игры_дети.pdf',
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
      byDeliveryMethod: { file: 0, static_pdf: 0 }
    };
  }

  // Получение бонуса для пользователя
  getBonusForUser(analysisResult, surveyData) {
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

      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')]
          ])
        }
      );

      console.log(`✅ Персональный гид отправлен: ${bonus.title}`);
      this.cleanupTempFile(filePath);
    } catch (error) {
      console.error('❌ Ошибка отправки персонального гида:', error.message);
      await this.sendFallbackTechnique(ctx, this.getBonusForUser(ctx.session.analysisResult, ctx.session.answers));
    }
  }

  // Отправка статичных PDF
  async sendAdditionalPDF(ctx, pdfType) {
    try {
      const material = this.additionalMaterials[pdfType];
      if (!material) {
        throw new Error(`Материал ${pdfType} не найден`);
      }

      console.log(`📤 Отправляем статичный PDF: ${material.fileName}`);

      await ctx.replyWithDocument(
        { url: material.url },
        {
          caption: `🎁 *${material.title}*\n\n${material.description}\n\n📞 Больше материалов у [Анастасии Поповой](https://t.me/breathing_opros_bot)`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
            [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
          ])
        }
      );

      console.log(`✅ Статичный PDF отправлен: ${material.title}`);
    } catch (error) {
      console.error('❌ Ошибка отправки статичного PDF:', error);
      await ctx.reply('😔 Не удалось отправить PDF. Попробуйте позже.', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
        ])
      });
    }
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
      [Markup.button.callback('🔥 Хочу стартовый комплект за 990₽!', 'contact_request')],
      [Markup.button.callback('📞 Узнать о других программах', 'other_programs')],
      [isChildFlow
        ? Markup.button.callback('📄 PDF: Игры для детей', 'download_pdf_child_games')
        : Markup.button.callback('📄 PDF: Антистресс дыхание', 'download_pdf_adult_antistress')
      ],
      [Markup.button.url('💬 Заказать в основном боте', 'https://t.me/breathing_opros_bot')],
      [Markup.button.callback('🔙 К моей технике', 'back_to_results')]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // Показ всех программ
  async showAllPrograms(ctx) {
    let message = `🌬️ *ПРОГРАММЫ ДЫХАТЕЛЬНЫХ ПРАКТИК*\n\n`;

    message += `🔥 *СТАРТОВЫЙ КОМПЛЕКТ* - 990₽ *(вместо 2600₽, скидка 62%)*\n`;
    message += `• 📹 Видеоурок (40 минут)\n`;
    message += `• 📋 PDF-инструкция\n`;
    message += `• 🎧 Аудиозапись (15 минут)\n`;
    message += `• ⚡ Мгновенный доступ\n`;
    message += `💡 Идеально для знакомства\n\n`;

    message += `👨‍⚕️ *ИНДИВИДУАЛЬНАЯ КОНСУЛЬТАЦИЯ* - 2000₽\n`;
    message += `• 🕒 60 минут с Анастасией\n`;
    message += `• 📋 Персональный план на 30 дней\n`;
    message += `• 📞 Поддержка в чате\n`;
    message += `💡 Для глубокого разбора\n\n`;

    message += `👩‍🏫 *ПАКЕТ ЗАНЯТИЙ* - 6000₽\n`;
    message += `• 🕒 4 занятия по 60 минут\n`;
    message += `• 📹 Записи занятий\n`;
    message += `• 📋 План на 2 месяца\n`;
    message += `• 📞 Поддержка 24/7\n`;
    message += `💡 Для устойчивых результатов\n\n`;

    message += `🎥 *ВИДЕОКУРС* - 3500₽\n`;
    message += `• 📹 8 видеоуроков\n`;
    message += `• 📋 Рабочая тетрадь\n`;
    message += `• 📞 Чат с куратором\n`;
    message += `💡 Для самостоятельного обучения\n\n`;

    message += `📞 *Свяжитесь с* [Анастасией Поповой](https://t.me/breathing_opros_bot)`;

    const keyboard = [
      [Markup.button.callback('🔥 Стартовый комплект', 'order_starter')],
      [Markup.button.callback('👨‍⚕️ Консультация', 'order_individual')],
      [Markup.button.callback('👩‍🏫 Пакет занятий', 'order_package')],
      [Markup.button.callback('🎥 Видеокурс', 'order_videocourse')],
      [Markup.button.callback('🤔 Помогите выбрать', 'help_choose')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // Показ деталей программы
  async showOrderDetails(ctx, programType) {
    const programs = {
      starter: {
        title: 'Стартовый комплект',
        price: '990₽ (вместо 2600₽, скидка 62%)',
        details: [
          '📹 Видеоурок (40 минут)',
          '📋 PDF-инструкция',
          '🎧 Аудиозапись (15 минут)',
          '⚡ Мгновенный доступ'
        ],
        benefits: 'Идеально для знакомства с дыхательными практиками'
      },
      individual: {
        title: 'Индивидуальная консультация',
        price: '2000₽',
        details: [
          '🕒 60 минут с Анастасией',
          '📋 Персональный план на 30 дней',
          '📞 Поддержка в чате'
        ],
        benefits: 'Глубокий разбор вашей ситуации'
      },
      package: {
        title: 'Пакет занятий',
        price: '6000₽',
        details: [
          '🕒 4 занятия по 60 минут',
          '📹 Записи занятий',
          '📋 План на 2 месяца',
          '📞 Поддержка 24/7'
        ],
        benefits: 'Устойчивые результаты за 2 месяца'
      },
      videocourse: {
        title: 'Видеокурс',
        price: '3500₽',
        details: [
          '📹 8 видеоуроков',
          '📋 Рабочая тетрадь',
          '📞 Чат с куратором'
        ],
        benefits: 'Самостоятельное обучение в удобном темпе'
      }
    };

    const program = programs[programType];
    if (!program) {
      await ctx.reply('⚠️ Программа не найдена.');
      return;
    }

    let message = `🌬️ *${program.title}*\n\n`;
    message += `💰 *Цена:* ${program.price}\n\n`;
    message += `📋 *Что входит:*\n`;
    program.details.forEach(detail => {
      message += `• ${detail}\n`;
    });
    message += `\n💡 *Почему стоит выбрать:*\n${program.benefits}\n\n`;
    message += `📞 *Записаться:* [Анастасия Попова](https://t.me/breathing_opros_bot)`;

    const keyboard = [
      [Markup.button.callback(`✅ Заказать ${program.title}`, `contact_request`)],
      [Markup.button.callback('📞 Узнать о других программах', 'other_programs')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // Помощь в выборе программы
  async showProgramHelper(ctx) {
    let message = `🤔 *КАКАЯ ПРОГРАММА ВАМ ПОДХОДИТ?*\n\n`;
    message += `Ответьте на 3 вопроса, чтобы подобрать идеальный вариант:\n\n`;
    message += `1️⃣ *Ваш опыт с дыхательными практиками:*\n`;
    message += `• Новичок → Стартовый комплект\n`;
    message += `• Пробовали → Видеокурс\n`;
    message += `• Практикуете → Индивидуальная консультация\n\n`;
    message += `2️⃣ *Ваш бюджет:*\n`;
    message += `• До 1000₽ → Стартовый комплект (990₽)\n`;
    message += `• До 3500₽ → Видеокурс (3500₽)\n`;
    message += `• 2000-6000₽ → Консультация или Пакет\n\n`;
    message += `3️⃣ *Ваши цели:*\n`;
    message += `• Быстрый старт → Стартовый комплект\n`;
    message += `• Глубокая работа → Индивидуальная консультация\n`;
    message += `• Долгосрочный результат → Пакет занятий\n\n`;
    message += `📞 Напишите [Анастасии](https://t.me/breathing_opros_bot) для персональной рекомендации!`;

    const keyboard = [
      [Markup.button.callback('🔥 Стартовый комплект', 'order_starter')],
      [Markup.button.callback('👨‍⚕️ Консультация', 'order_individual')],
      [Markup.button.callback('👩‍🏫 Пакет занятий', 'order_package')],
      [Markup.button.callback('🎥 Видеокурс', 'order_videocourse')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // Перевод значения
  translateValue(value) {
    return config.TRANSLATIONS[value] || value;
  }

  // Перевод массива значений
  translateArray(values) {
    return values.map(value => this.translateValue(value)).filter(Boolean);
  }

  // Описание уровня стресса
  getStressDescription(level) {
    if (level >= 8) return 'Высокий уровень стресса. Рекомендуется срочное внимание.';
    if (level >= 5) return 'Средний уровень стресса. Практики помогут стабилизировать состояние.';
    return 'Низкий уровень стресса. Практики поддержат ваше благополучие.';
  }

  // Логирование доставки бонуса
  logBonusDelivery(userId, bonusId, deliveryMethod, segment, primaryIssue) {
    const logEntry = {
      userId,
      bonusId,
      deliveryMethod,
      segment,
      primaryIssue,
      timestamp: new Date().toISOString()
    };

    this.bonusDeliveryLog.push(logEntry);
    this.bonusStats.totalDelivered++;
    this.bonusStats.bySegment[segment] = (this.bonusStats.bySegment[segment] || 0) + 1;
    this.bonusStats.byIssue[primaryIssue] = (this.bonusStats.byIssue[primaryIssue] || 0) + 1;
    this.bonusStats.byDeliveryMethod[deliveryMethod] = (this.bonusStats.byDeliveryMethod[deliveryMethod] || 0) + 1;

    console.log(`📊 Лог доставки бонуса: ${bonusId} для пользователя ${userId}`);
  }

  // Получение статистики бонусов
  getBonusStats() {
    return {
      totalDelivered: this.bonusStats.totalDelivered,
      bySegment: this.bonusStats.bySegment,
      byIssue: this.bonusStats.byIssue,
      byDeliveryMethod: this.bonusStats.byDeliveryMethod,
      recentLogs: this.bonusDeliveryLog.slice(-10)
    };
  }

  // Обработка запроса на скачивание
  async handleDownloadRequest(ctx, bonusId) {
    if (bonusId.startsWith('static_')) {
      const pdfType = bonusId.replace('static_', '');
      await this.sendAdditionalPDF(ctx, pdfType);
    } else {
      await this.sendPDFFile(ctx);
    }
  }

  // Fallback техника при ошибке
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
      } catch (error) {
        console.error('⚠️ Ошибка удаления временного файла:', error);
      }
    }, 1000);
  }

  // Получение статичных материалов для отладки
  getAdditionalMaterials() {
    return this.additionalMaterials;
  }
}

module.exports = FileHandler;
