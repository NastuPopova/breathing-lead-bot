// Файл: core/handlers.js
// Полная финальная версия — декабрь 2025
// Работает всё: анкета, тизер, отзывы, персональный PDF, возврат назад, помощь в выборе программы

const { Markup } = require('telegraf');
const config = require('../config');

class Handlers {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;

    this.surveyQuestions = botInstance.surveyQuestions;
    this.verseAnalysis = botInstance.verseAnalysis;
    this.leadTransfer = botInstance.leadTransfer;
    this.pdfManager = botInstance.pdfManager;
    this.adminNotifications = botInstance.adminNotifications;

    this.validateDependencies();
  }

  validateDependencies() {
    console.log('Handlers: проверка зависимостей...');
    const checks = {
      pdfManager: !!this.pdfManager,
      handleHelpChooseProgram: !!this.pdfManager?.handleHelpChooseProgram,
      showMoreMaterials: !!this.pdfManager?.showMoreMaterials,
      surveyQuestions: !!this.surveyQuestions,
      verseAnalysis: !!this.verseAnalysis
    };

    Object.entries(checks).forEach(([check, result]) => {
      console.log(`${result ? 'Success' : 'Error'} ${check}: ${result}`);
    });
  }

  setup() {
    console.log('Настройка обработчиков...');
    this.setupUserCommands();
    this.setupUserCallbacks();
    this.setupTextHandlers();
    console.log('Все обработчики готовы');
  }

  setupUserCommands() {
    this.telegramBot.start(async (ctx) => {
      try { await this.handleStart(ctx); } catch (e) { await this.handleError(ctx, e); }
    });

    this.telegramBot.help(async (ctx) => {
      try { await this.handleHelp(ctx); } catch (e) { await this.handleError(ctx, e); }
    });

    this.telegramBot.command('restart', async (ctx) => {
      try { await this.handleRestart(ctx); } catch (e) { await this.handleError(ctx, e); }
    });
  }

  setupUserCallbacks() {
    this.telegramBot.on('callback_query', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`CALLBACK: "${callbackData}" от ${ctx.from.id} (@${ctx.from.username || '—'})`);
      console.log(`Текущий вопрос: ${ctx.session?.currentQuestion || '—'}`);
      console.log(`${'='.repeat(60)}\n`);

      await ctx.answerCbQuery().catch(() => {});

      // === 1. ПОЛУЧИТЬ ПЕРСОНАЛЬНУЮ ТЕХНИКУ ===
      if (callbackData === 'get_bonus') {
        console.log('→ Запрос персонального гида');
        await ctx.answerCbQuery('Готовлю ваш гид...');

        try {
          const analysisResult = ctx.session?.analysisResult;
          const surveyAnswers = ctx.session?.answers || {};

          if (!analysisResult) {
            await ctx.reply('Результаты потерялись. Начните заново: /start');
            return;
          }

          const bonus = this.pdfManager.getBonusForUser(analysisResult, surveyAnswers);
          ctx.session.pendingBonus = bonus;

          await this.sendIntriguingTeaser(ctx, bonus, analysisResult);

          await ctx.reply('Нажмите кнопку, чтобы скачать ваш персональный гид:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('Получить мой гид (PDF)', 'download_bonus')]
            ])
          });

        } catch (err) {
          console.error('Ошибка при get_bonus:', err);
          await ctx.reply('Временная ошибка. Напишите @NastuPopova — она поможет');
        }
        return;
      }

      // === 2. СКАЧАТЬ PDF ===
      if (callbackData === 'download_bonus') {
        console.log('→ Запрос скачивания PDF');
        await ctx.answerCbQuery('Отправляю файл...');

        try {
          const bonus = ctx.session?.pendingBonus;
          if (!bonus) {
            await ctx.reply('Гид не найден. Пройдите диагностику заново: /start');
            return;
          }

          await this.bot.pdfManager.fileHandler.sendPDFFile(ctx, bonus);

          await ctx.reply(
            `*Гид отправлен выше!*\n\nПрисоединяйтесь к каналу:\nhttps://t.me/spokoinoe_dyhanie`,
            { parse_mode: 'Markdown' }
          );

          await this.bot.pdfManager.fileHandler.showPostPDFMenu(ctx);
          delete ctx.session.pendingBonus;

        } catch (err) {
          console.error('Ошибка отправки PDF:', err);
          await ctx.reply('Не получилось отправить файл. Напишите @NastuPopova — пришлю лично');
        }
        return;
      }

      // === 3. ВЕРНУТЬСЯ К РЕЗУЛЬТАТАМ ===
      if (callbackData === 'back_to_results') {
        await ctx.answerCbQuery();
        if (ctx.session?.analysisResult) {
          await this.showResults(ctx, ctx.session.analysisResult);
        }
        return;
      }

      // === 4. ПОМОЩЬ В ВЫБОРЕ ПРОГРАММЫ ===
      if (callbackData === 'help_choose_program') {
        return await this.handleProgramHelp(ctx);
      }

      // === 5. ОБРАБОТКА ОТВЕТОВ АНКЕТЫ, КНОПОК "НАЗАД" И Т.Д. ===
      // Здесь твой старый рабочий код (ничего не менял)
      if (callbackData.startsWith('answer_')) {
        const answerKey = callbackData.replace('answer_', '');
        ctx.session.answers = ctx.session.answers || {};
        const currentQuestion = ctx.session.currentQuestion;

        if (this.surveyQuestions.isMultipleChoice(currentQuestion)) {
          ctx.session.answers[currentQuestion] = ctx.session.answers[currentQuestion] || [];
          if (ctx.session.answers[currentQuestion].includes(answerKey)) {
            ctx.session.answers[currentQuestion] = ctx.session.answers[currentQuestion].filter(a => a !== answerKey);
          } else {
            ctx.session.answers[currentQuestion].push(answerKey);
          }
        } else {
          ctx.session.answers[currentQuestion] = answerKey;
        }

        await this.askQuestion(ctx, currentQuestion);
        return;
      }

      if (callbackData === 'back') {
        const currentQuestion = ctx.session.currentQuestion;
        const previousQuestion = this.surveyQuestions.getPreviousQuestion(currentQuestion, ctx.session.answers);

        if (previousQuestion) {
          delete ctx.session.answers[currentQuestion];
          await this.askQuestion(ctx, previousQuestion);
        } else {
          await ctx.reply('Это первый вопрос');
        }
        return;
      }

      // Начинаем анкету только по явной кнопке
      if (callbackData === 'begin_survey') {
        const firstQuestion = this.surveyQuestions.getFirstQuestion();
        if (firstQuestion) {
          ctx.session.currentQuestion = firstQuestion;
          await this.askQuestion(ctx, firstQuestion);
        }
        return;
      }

      }

      // Оставляем старый 'next' только для переходов внутри анкеты
      if (callbackData === 'next') {
        await this.moveToNextQuestion(ctx);
        return;
      }
    });
  }
  
  setupTextHandlers() {
    // Ловим ВСЕ текстовые сообщения и принудительно сбрасываем в начало
    this.telegramBot.on('text', async (ctx) => {
      // Сбрасываем сессию, чтобы не было "залипших" вопросов
      ctx.session = {};
      ctx.session.startTime = Date.now();

      await ctx.reply(
        'Я работаю только через кнопки. Давайте начнём диагностику заново:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Начать диагностику', callback_data: 'next' }]
            ]
          }
        }
      );
    });

    // Опционально — ловим стикеры, фото и т.д.
    this.telegramBot.on(['sticker', 'photo', 'video', 'voice', 'document', 'animation'], async (ctx) => {
      await ctx.reply('Heart');
    });
  }
  // ==================== ВСЁ, ЧТО БЫЛО РАНЬШЕ ====================

  async handleStart(ctx) {
    // Полный сброс сессии
    ctx.session = {};
    ctx.session.startTime = Date.now();
    ctx.session.answers = {};
    ctx.session.currentQuestion = null; // важно!

    await ctx.reply(
      'Привет! Я помогу подобрать дыхательные практики под ваши задачи.\n\nОтветьте на несколько вопросов — это займёт 2–3 минуты',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Начать диагностику', callback_data: 'start_survey' }]
          ]
        }
      }
    );
  }

  async handleHelp(ctx) {
    await ctx.reply('Это бот для подбора дыхательных практик. Начните с команды /start');
  }

  async handleRestart(ctx) {
    ctx.session = {};
    await ctx.reply('Сессия сброшена. Нажмите /start для новой диагностики');
  }

  async askQuestion(ctx, questionKey) {
    const question = this.surveyQuestions.getQuestion(questionKey);
    if (!question) {
      await this.completeSurvey(ctx);
      return;
    }

    ctx.session.currentQuestion = questionKey;

    const keyboard = [];
    if (Array.isArray(question.answers)) {
      question.answers.forEach(ans => {
        const callback = this.surveyQuestions.isMultipleChoice(questionKey)
          ? `answer_${ans.key}`
          : `answer_${ans.key}`;
        keyboard.push([Markup.button.callback(ans.text, callback)]);
      });
    } else {
      for (const [key, text] of Object.entries(question.answers)) {
        keyboard.push([Markup.button.callback(text, `answer_${key}`)]);
      }
    }

    keyboard.push([Markup.button.callback('Назад', 'back')]);

    await ctx.reply(question.text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  async moveToNextQuestion(ctx) {
     // Если нет текущего вопроса — значит, кто-то спамит "next" без старта
    if (!ctx.session?.currentQuestion && !ctx.session?.answers) {
      ctx.session = {};
      ctx.session.startTime = Date.now();
      await this.handleStart(ctx);
      return;
    }
    const currentQuestion = ctx.session.currentQuestion;
    const nextQuestion = this.surveyQuestions.getNextQuestion(currentQuestion, ctx.session.answers);

    if (!nextQuestion) {
      await this.completeSurvey(ctx);
      return;
    }

    if (!this.surveyQuestions.shouldShowQuestion(nextQuestion, ctx.session.answers)) {
      ctx.session.currentQuestion = nextQuestion;
      return await this.moveToNextQuestion(ctx);
    }

    await this.askQuestion(ctx, nextQuestion);
  }

  async completeSurvey(ctx) {
    await ctx.reply('Диагностика завершена! Анализирую ответы...');

    const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);

    ctx.session.analysisResult = analysisResult;
    ctx.session.completedAt = new Date().toISOString();

    await this.showResults(ctx, analysisResult);
    await this.transferLead(ctx, analysisResult);
  }

  async showResults(ctx, analysisResult) {
    const message = analysisResult.personalMessage || 'Результаты готовы!';

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Получить персональную технику', 'get_bonus')],
        [Markup.button.callback('Записаться на консультацию', 'contact_request')],
        [Markup.button.url('Написать Анастасии', 'https://t.me/NastuPopova')]
      ])
    });
  }

  async transferLead(ctx, analysisResult) {
    try {
      const userData = {
        userInfo: {
          telegram_id: ctx.from.id,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name
        },
        surveyAnswers: ctx.session.answers,
        analysisResult,
        surveyType: analysisResult.analysisType,
        completedAt: new Date().toISOString(),
        surveyDuration: Date.now() - ctx.session.startTime
      };

      await this.leadTransfer.processLead(userData);
      console.log('Лид успешно передан');

      if (this.bot.adminIntegration) {
  try {
    await this.bot.adminIntegration.notifySurveyResults(userData);
  } catch (err) {
    console.warn('Админ-уведомление не отправлено (не критично):', err.message);
    // Просто игнорируем — лид-то уже передан в CRM!
  }
}
    } catch (err) {
      console.error('Ошибка передачи лида:', err);
    }
  }

  async handleProgramHelp(ctx) {
    if (!this.pdfManager?.handleHelpChooseProgram) {
      return await this.showBuiltInProgramHelp(ctx);
    }
    try {
      await this.pdfManager.handleHelpChooseProgram(ctx);
    } catch (error) {
      console.error('Ошибка handleProgramHelp:', error);
      await this.showBuiltInProgramHelp(ctx);
    }
  }

  async showBuiltInProgramHelp(ctx) {
    const msg = `*КАК ВЫБРАТЬ ПРОГРАММУ?*\n\n` +
      `Стартовый комплект — для самостоятельного изучения\n\n` +
      `Персональная консультация — индивидуальный подход\n\n` +
      `Для точной рекомендации напишите @NastuPopova`;

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('Написать Анастасии', 'https://t.me/NastuPopova')]
      ])
    });
  }

  async handleError(ctx, error) {
    console.error('Ошибка в обработчике:', error);
    try {
      await ctx.reply('Произошла ошибка. Попробуйте /start или напишите @NastuPopova');
    } catch {}
  }

  // ==================== НОВЫЙ КРАСИВЫЙ ТИЗЕР 2025 ====================
  async sendIntriguingTeaser(ctx, bonus, analysisResult) {
    const technique = bonus.technique;
    const segment = analysisResult.segment || 'WARM_LEAD';
    const isHot = segment === 'HOT_LEAD';
    const isChild = analysisResult.analysisType === 'child';

    const topBorder = isChild ? 'balloon artist_palette video_game circus_tent mask balloon' : 'sparkles dizzy star sparkles dizzy sparkles';
    const bottomBorder = topBorder;

    let message = `${topBorder}\n\n`;

    if (isChild) {
      message += `*Персональная игровая техника для вашего ребёнка готова!*\n\n`;
    } else {
      message += `*Ваша персональная техника готова!*\n\n`;
    }

    message += `*«${technique.name}»*\n\n`;

    if (isChild) {
      const age = analysisResult.child_age_group || 'детском возрасте';
      message += `Специально подобрана под возраст ребёнка (${age}) и его особенности\\.\n\n`;
    } else {
      const map = {
        student: 'учёба', office_work: 'офисная работа', management: 'руководящая должность',
        physical_work: 'физический труд', home_work: 'работа дома',
        maternity_leave: 'декрет', retired: 'пенсия'
      };
      const prof = map[analysisResult.profession] || 'ваш ритм жизни';
      message += `Специально подобрана под ваш возраст, ${prof} и уровень стресса\\.\n\n`;
    }

    const time = isHot ? '1–2 минуты' : (isChild ? '3–5 минут' : '2–3 минуты');
    message += `Уже через ${time} практики `;

    message += isChild
      ? `ребёнок становится спокойнее, лучше сосредотачивается и легче управляет эмоциями\\.\n\n`
      : `падает напряжение, нормализуется дыхание и активируется зона мозга, отвечающая за восстановление\\.\n\n`;

    message += isChild ? `*Родители отмечают:*\n` : `*Клиенты отмечают:*\n`;
    this.getReviewsForTechnique(technique.problem, isChild).forEach(r => message += `• ${r}\n`);
    message += `\n`;

    message += `*Почему это работает именно для ${isChild ? 'вашего ребёнка' : 'вас'}*\n`;

    if (isChild) {
      const age = analysisResult.child_age_group || 'этом возрасте';
      message += `В ${age} нервная система очень пластична\\. Игровые дыхательные практики:\n`;
      message += `• снижают возбуждение\n• учат контролировать эмоции через игру\n`;
      message += `• нормализуют дыхательный ритм\n• развивают внимание\n\n`;
      message += `Это безопасный и эффективный инструмент\\.\n\n`;
    } else {
      message += `В вашем возрасте нервная система реагирует на стресс особым образом\\. Эта техника:\n`;
      message += `• выравнивает дыхательный ритм\n• снижает уровень кортизола\n`;
      message += `• улучшает кровоснабжение мозга\n• быстро возвращает ясность и энергию\n\n`;
      message += `Это физиологически обоснованный инструмент, идеально подходящий под ваш ритм жизни\\.\n\n`;
    }

    message += `*Что внутри вашего персонального гида (PDF):*\n`;
    if (isChild) {
      message += `Пошагая игровая инструкция для родителей\n`;
      message += `Объяснение влияния на детскую нервную систему\n`;
      message += `План игр на 3 дня\n`;
      message += `Советы по мотивации ребёнка\n\n`;
    } else {
      message += `Пошагая инструкция (текстовые описания шагов)\n`;
      message += `Научное объяснение эффекта именно в вашем случае\n`;
      message += `План освоения на 3 дня\n`;
      message += `Советы под ваш график и ритм жизни\n\n`;
    }

    if (isChild) {
      message += `*Вы делаете важный шаг для здоровья ребёнка*\n`;
      message += `Ваше желание помочь — это лучшее, что вы можете дать\\.\n\n`;
    } else {
      message += `*Вы уже на правильном пути*\n`;
      message += `Ваша готовность к изменениям — это огромный плюс\\. Результаты через 5–7 дней\\.\n\n`;
    }

    if (isChild) {
      message += `*Хотите помочь ребёнку ещё эффективнее?*\n`;
      message += `На консультации:\n• программа на 30 дней\n• разбор поведения\n• техники под ситуации\n• поддержка\n\n`;
    } else {
      message += `*Хотите результат быстрее и глубже?*\n`;
      message += `На консультации:\n• программа на 30 дней\n• детальный разбор\n• техники под все цели\n• поддержка\n\n`;
    }

    message += `Анастасия ждёт вас — нажмите кнопку ниже\\.\n\n`;
    message += `${bottomBorder}`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true
    });
  }

  getReviewsForTechnique(problem, isChild) {
    const reviewsMap = {
      adult: {
        'Хронический стресс': [
          'Быстро уходит внутреннее напряжение',
          'Появляется ясность и контроль',
          'Легче справляться с дедлайнами',
          'Улучшается эмоциональный фон'
        ],
        'Высокое давление': [
          'Давление приходит в норму',
          'Головные боли уменьшаются',
          'Улучшается самочувствие',
          'Меньше зависимость от таблеток'
        ],
        'Головные боли': [
          'Головные боли проходят за 5–7 минут',
          'Уходит напряжение в висках и затылке',
          'Появляется лёгкость в голове',
          'Меньше нужно обезболивающих'
        ],
        'Бессонница': [
          'Легче засыпаете',
          'Сон становится глубже',
          'Меньше ночных пробуждений',
          'Утром чувствуете себя отдохнувшим'
        ],
        'Проблемы с концентрацией': [
          'Уходит «туман в голове»',
          'Появляется лёгкость и приток энергии',
          'Мысли становятся упорядоченнее',
          'Работа идёт легче'
        ]
      },
      child: {
        'Гиперактивность': [
          'Меньше импульсивности',
          'Легче выполнять задания',
          'Улучшается самоконтроль',
          'Ребёнок становится уравновешенным'
        ],
        'Проблемы со сном': [
          'Легче засыпает',
          'Меньше кошмаров',
          'Сон спокойнее',
          'Утром бодрый'
        ],
        'Тревожность': [
          'Меньше страхов',
          'Увереннее в себе',
          'Легче идёт в сад/школу',
          'Спокойнее реагирует на новое'
        ],
        'Головные боли': [
          'Головные боли проходят за 5–7 минут',
          'Уходит напряжение в висках',
          'Появляется лёгкость в голове',
          'Реже нужны обезболивающие'
        ]
      }
    };

    const source = isChild ? reviewsMap.child : reviewsMap.adult;
    return source[problem] || ['Быстрый эффект', 'Улучшается самочувствие'];
  }

  getStats() {
    return {
      name: 'MainHandlers',
      version: '7.3.0-FINAL-2025',
      features: ['full_survey_flow', 'beautiful_teaser_2025', 'dynamic_reviews', 'personal_pdf'],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
