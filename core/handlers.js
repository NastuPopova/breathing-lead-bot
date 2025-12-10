// Файл: core/handlers.js - ПОЛНАЯ ВЕРСИЯ с всеми методами

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
      console.log(`${result ? '✅' : '❌'} ${check}: ${result}`);
    });
  }

  setup() {
    console.log('Настройка обработчиков команд и событий...');
    this.setupUserCommands();
    this.setupUserCallbacks();
    this.setupTextHandlers();
    console.log('Обработчики настроены');
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
    // Единый обработчик всех callback_query
    this.telegramBot.on('callback_query', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔔 User Callback: "${callbackData}" от ${ctx.from.id}`);
      console.log(`📋 Текущий вопрос в сессии: ${ctx.session?.currentQuestion}`);
      console.log(`${'='.repeat(50)}\n`);

      await ctx.answerCbQuery().catch(() => {});

      // === ПОЛУЧЕНИЕ ПЕРСОНАЛЬНОЙ ТЕХНИКИ (ТИЗЕР) ===
      if (callbackData === 'get_bonus') {
        console.log('🎁 Нажата кнопка: Получить персональную технику');
        await ctx.answerCbQuery('🧠 Готовлю ваш персональный гид...');

        try {
          const analysisResult = ctx.session?.analysisResult;
          const surveyAnswers = ctx.session?.answers || {};

          if (!analysisResult) {
            await ctx.reply('😔 Результаты анализа не найдены. Начните заново: /start');
            return;
          }

          // Генерируем бонус, но пока НЕ отправляем PDF
          const bonus = this.pdfManager.getBonusForUser(analysisResult, surveyAnswers);

          // Сохраняем в сессию для последующей отправки
          ctx.session.pendingBonus = bonus;

          // Интригующий тизер
          await this.sendIntriguingTeaser(ctx, bonus, analysisResult);

          // Кнопка для скачивания PDF
          await ctx.reply('📥 Нажмите кнопку ниже, чтобы получить ваш персональный гид в PDF:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('📥 Получить мой гид (PDF)', 'download_bonus')]
            ])
          });

        } catch (error) {
          console.error('❌ Ошибка при подготовке гида:', error);
          await ctx.reply('😔 Произошла временная ошибка. Напишите @NastuPopova — она отправит материалы лично');
        }
        return;
      }

      // === СКАЧИВАНИЕ PDF ПО КНОПКЕ ===
      if (callbackData === 'download_bonus') {
        console.log('📥 Нажата кнопка: Получить мой гид (PDF)');
        await ctx.answerCbQuery('📄 Отправляю ваш гид...');

        try {
          const bonus = ctx.session?.pendingBonus;

          if (!bonus) {
            await ctx.reply('😔 Гид не найден. Пройдите диагностику заново: /start');
            return;
          }

          // Отправляем сам PDF
          await this.pdfManager.fileHandler.sendPDFFile(ctx);

          // Бонус — канал
          await ctx.reply(
            `📖 *Дополнительный бонус для вас*\n\n` +
            `Присоединяйтесь к открытому каналу «Дыхание как путь к здоровью»\n` +
            `https://t.me/spokoinoe_dyhanie\n\n` +
            `Там полезные статьи о дыхании, научные факты, истории клиентов и вдохновение на изменения 🌿`,
            { parse_mode: 'Markdown' }
          );

          // Финальное меню
          await this.pdfManager.fileHandler.showPostPDFMenu(ctx);

          // Очищаем сессию
          delete ctx.session.pendingBonus;

        } catch (error) {
          console.error('❌ Ошибка отправки гида:', error);
          await ctx.reply('😔 Не удалось отправить файл. Напишите @NastuPopova — она пришлёт гид лично');
        }
        return;
      }

      // === НАЧАЛО АНКЕТЫ ===
      if (callbackData === 'start_survey' || callbackData === 'start_survey_from_about') {
        console.log('📋 Начинаем анкету');
        await this.startSurvey(ctx);
        return;
      }

      // === ИНФОРМАЦИЯ О ДИАГНОСТИКЕ ===
      if (callbackData === 'about_survey') {
        await this.showAboutSurvey(ctx);
        return;
      }

      // === ВОЗВРАТ В ГЛАВНОЕ МЕНЮ ===
      if (callbackData === 'back_to_main') {
        await this.handleStart(ctx);
        return;
      }

      // === ЗАПИСЬ НА КОНСУЛЬТАЦИЮ ===
      if (callbackData === 'contact_request') {
        console.log('📞 Нажата кнопка: Записаться на консультацию');
        await ctx.answerCbQuery();

        const message = config.MESSAGES?.CONTACT_TRAINER || 
          `🌟 *Мои продукты и программы*\n\n` +
          `Перейдите в основной бот — там все мои курсы, консультации и программы по дыханию:\n\n` +
          `🤖 @breathing_opros_bot\n\n` +
          `Выберите подходящую программу и запишитесь!`;

        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('🤖 Перейти в основной бот', 'https://t.me/breathing_opros_bot')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        });
        return;
      }

      // === ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ ===
      if (callbackData === 'more_materials') {
        await this.pdfManager.fileHandler.showMoreMaterials(ctx);
        return;
      }

      // === ПОМОЩЬ В ВЫБОРЕ ПРОГРАММЫ ===
      if (callbackData === 'help_choose_program') {
        await this.pdfManager.fileHandler.handleHelpChooseProgram(ctx);
        return;
      }

      // === ВСЕ ПРОГРАММЫ ===
      if (callbackData === 'show_all_programs') {
        await this.pdfManager.fileHandler.showAllPrograms(ctx);
        return;
      }

      // === ЗАКАЗ ПРОГРАММ ===
      if (callbackData === 'order_starter') {
        await this.pdfManager.fileHandler.handleOrderStarter(ctx);
        return;
      }

      if (callbackData === 'order_individual') {
        await this.pdfManager.fileHandler.handleOrderIndividual(ctx);
        return;
      }

      // === СКАЧИВАНИЕ СТАТИЧНЫХ PDF ===
      if (callbackData.startsWith('download_static_')) {
        await this.pdfManager.fileHandler.handleDownloadRequest(ctx, callbackData);
        return;
      }

      // === ЗАКРЫТИЕ МЕНЮ ===
      if (callbackData === 'delete_menu' || callbackData === 'close_menu') {
        await this.pdfManager.fileHandler.closeMenu(ctx);
        return;
      }

      // === ОТВЕТЫ НА ВОПРОСЫ АНКЕТЫ ===
      if (ctx.session?.currentQuestion) {
        await this.handleSurveyAnswer(ctx, callbackData);
        return;
      }

      // Если ничего не подошло — логируем
      console.log(`⚠️ Необработанный callback: ${callbackData}`);
    });
  }

  setupTextHandlers() {
    // Заглушка: текстовые обработчики пока не используются
    console.log('✅ Текстовые обработчики настроены (заглушка)');
  }

  // === ОСНОВНЫЕ ОБРАБОТЧИКИ КОМАНД ===

  async handleStart(ctx) {
    console.log('▶️ Обработка команды /start');
    
    // Инициализируем сессию если её нет
    if (!ctx.session || Object.keys(ctx.session).length === 0) {
      ctx.session = this.getDefaultSession();
    }
    
    const welcomeMessage = config.MESSAGES?.WELCOME || 
      `🌬️ *Добро пожаловать в диагностику дыхания!*\n\n` +
      `Пройдите быструю диагностику дыхания (4-5 минут) и получите:\n\n` +
      `✅ Персональный анализ состояния\n` +
      `✅ Индивидуальные рекомендации\n` +
      `✅ Бесплатные материалы для практики\n\n` +
      `Готовы узнать, как улучшить свое дыхание?`;
    
    await ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('▶️ Начать диагностику', 'start_survey')],
        [Markup.button.callback('ℹ️ Подробнее о диагностике', 'about_survey')]
      ])
    });
  }

  async handleHelp(ctx) {
    console.log('❓ Обработка команды /help');
    
    const helpMessage = `💡 *СПРАВКА ПО БОТУ*\n\n` +
      `🌬️ *Что делает этот бот:*\n` +
      `Проводит быструю диагностику вашего дыхания и подбирает персональные техники.\n\n` +
      `📋 *Доступные команды:*\n` +
      `/start - Начать диагностику заново\n` +
      `/help - Показать эту справку\n` +
      `/restart - Перезапустить анкету\n\n` +
      `💬 *Нужна помощь?*\n` +
      `Напишите [Анастасии Поповой](https://t.me/NastuPopova)`;
    
    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('▶️ Начать диагностику', 'start_survey')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
      ])
    });
  }

  async handleRestart(ctx) {
    console.log('🔄 Обработка команды /restart');
    
    // Очищаем сессию
    ctx.session = this.getDefaultSession();
    
    await ctx.reply('🔄 Анкета сброшена. Начните заново:', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('▶️ Начать диагностику', 'start_survey')]
      ])
    });
  }

  getDefaultSession() {
    return {
      currentQuestion: null,
      answers: {},
      multipleChoiceSelections: {},
      startTime: Date.now(),
      questionStartTime: Date.now(),
      completedQuestions: [],
      navigationHistory: [],
      analysisResult: null,
      contactInfo: {},
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      lastActivity: Date.now()
    };
  }

  // === АНКЕТА ===

  async startSurvey(ctx) {
    console.log('📋 Запуск анкеты');
    
    try {
      // Сброс сессии для новой анкеты
      ctx.session.currentQuestion = null;
      ctx.session.answers = {};
      ctx.session.multipleChoiceSelections = {};
      ctx.session.startTime = Date.now();
      ctx.session.completedQuestions = [];
      
      // Проверяем доступные методы surveyQuestions
      console.log('🔍 Доступные методы surveyQuestions:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.surveyQuestions)));
      
      // Пробуем разные способы получить первый вопрос
      let firstQuestion = null;
      
      // Способ 1: прямой доступ к questions
      if (this.surveyQuestions.questions && Array.isArray(this.surveyQuestions.questions)) {
        firstQuestion = this.surveyQuestions.questions[0];
        console.log('✅ Первый вопрос получен через questions[0]');
      }
      // Способ 2: метод getQuestion
      else if (typeof this.surveyQuestions.getQuestion === 'function') {
        firstQuestion = this.surveyQuestions.getQuestion('age_group');
        console.log('✅ Первый вопрос получен через getQuestion("age_group")');
      }
      // Способ 3: метод getQuestionById
      else if (typeof this.surveyQuestions.getQuestionById === 'function') {
        firstQuestion = this.surveyQuestions.getQuestionById('age_group');
        console.log('✅ Первый вопрос получен через getQuestionById("age_group")');
      }
      
      if (!firstQuestion) {
        throw new Error('Не удалось получить первый вопрос анкеты. Проверьте модуль ExtendedSurveyQuestions.');
      }
      
      await this.askQuestion(ctx, firstQuestion);
      
    } catch (error) {
      console.error('❌ Ошибка запуска анкеты:', error);
      console.error('Детали:', error.stack);
      await ctx.reply(
        '😔 Произошла ошибка при запуске анкеты. Попробуйте /start или напишите @NastuPopova'
      );
    }
  }

  async askQuestion(ctx, question) {
    console.log(`❓ Задаем вопрос: ${question.id}`);
    
    ctx.session.currentQuestion = question.id;
    ctx.session.questionStartTime = Date.now();
    
    const keyboard = this.buildKeyboard(question);
    
    try {
      await ctx.reply(question.text, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка отправки вопроса:', error);
      // Пробуем без Markdown
      await ctx.reply(question.text.replace(/\*/g, ''), keyboard);
    }
  }

  buildKeyboard(question) {
    if (question.type === 'single_choice' || question.type === 'age_group') {
      const buttons = question.options.map(opt => [
        Markup.button.callback(opt.label, opt.value)
      ]);
      return Markup.inlineKeyboard(buttons);
    }
    
    if (question.type === 'multiple_choice') {
      const buttons = question.options.map(opt => [
        Markup.button.callback(opt.label, opt.value)
      ]);
      buttons.push([Markup.button.callback('✅ Готово', `${question.id}_done`)]);
      return Markup.inlineKeyboard(buttons);
    }
    
    return Markup.inlineKeyboard([]);
  }

  async handleSurveyAnswer(ctx, callbackData) {
    const currentQuestionId = ctx.session.currentQuestion;
    
    console.log(`📝 Обработка ответа: ${callbackData} на вопрос ${currentQuestionId}`);
    
    try {
      // Пробуем разные способы получить текущий вопрос
      let currentQuestion = null;
      
      if (typeof this.surveyQuestions.getQuestionById === 'function') {
        currentQuestion = this.surveyQuestions.getQuestionById(currentQuestionId);
      } else if (typeof this.surveyQuestions.getQuestion === 'function') {
        currentQuestion = this.surveyQuestions.getQuestion(currentQuestionId);
      } else if (this.surveyQuestions.questions) {
        currentQuestion = this.surveyQuestions.questions.find(q => q.id === currentQuestionId);
      }
      
      if (!currentQuestion) {
        console.error('❌ Вопрос не найден:', currentQuestionId);
        await ctx.answerCbQuery('Ошибка: вопрос не найден');
        return;
      }
      
      // Обработка множественного выбора
      if (currentQuestion.type === 'multiple_choice') {
        if (callbackData === `${currentQuestionId}_done`) {
          await this.finishMultipleChoice(ctx, currentQuestion);
          return;
        } else {
          await this.handleMultipleChoiceSelection(ctx, callbackData, currentQuestion);
          return;
        }
      }
      
      // Обработка одиночного выбора
      ctx.session.answers[currentQuestionId] = callbackData;
      ctx.session.completedQuestions.push(currentQuestionId);
      
      await ctx.answerCbQuery('✅ Ответ сохранен');
      
      // Переход к следующему вопросу - пробуем разные методы
      let nextQuestion = null;
      
      if (typeof this.surveyQuestions.getNextQuestion === 'function') {
        nextQuestion = this.surveyQuestions.getNextQuestion(currentQuestionId, ctx.session.answers);
      } else if (typeof this.surveyQuestions.getNext === 'function') {
        nextQuestion = this.surveyQuestions.getNext(currentQuestionId, ctx.session.answers);
      } else {
        // Fallback: пытаемся найти следующий вопрос вручную
        console.warn('⚠️ Метод getNextQuestion не найден, используем fallback');
        nextQuestion = this.findNextQuestionFallback(currentQuestionId, ctx.session.answers);
      }
      
      if (nextQuestion) {
        await this.askQuestion(ctx, nextQuestion);
      } else {
        await this.finishSurvey(ctx);
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки ответа:', error);
      console.error('Стек:', error.stack);
      await ctx.answerCbQuery('Произошла ошибка');
    }
  }

  findNextQuestionFallback(currentQuestionId, answers) {
    console.log('🔄 Fallback: поиск следующего вопроса');
    
    // Базовая последовательность вопросов
    const questionFlow = [
      'age_group',
      'current_problems', 
      'stress_level',
      'breathing_frequency',
      'main_goals'
    ];
    
    const currentIndex = questionFlow.indexOf(currentQuestionId);
    
    if (currentIndex === -1 || currentIndex === questionFlow.length - 1) {
      return null; // Конец анкеты
    }
    
    const nextQuestionId = questionFlow[currentIndex + 1];
    
    // Пытаемся получить вопрос
    if (typeof this.surveyQuestions.getQuestionById === 'function') {
      return this.surveyQuestions.getQuestionById(nextQuestionId);
    } else if (this.surveyQuestions.questions) {
      return this.surveyQuestions.questions.find(q => q.id === nextQuestionId);
    }
    
    return null;
  }

  async handleMultipleChoiceSelection(ctx, callbackData, question) {
    if (!ctx.session.multipleChoiceSelections[question.id]) {
      ctx.session.multipleChoiceSelections[question.id] = [];
    }
    
    const selections = ctx.session.multipleChoiceSelections[question.id];
    const index = selections.indexOf(callbackData);
    
    if (index > -1) {
      selections.splice(index, 1);
      await ctx.answerCbQuery('❌ Выбор отменен');
    } else {
      const maxSelections = question.maxSelections || 5;
      if (selections.length >= maxSelections) {
        await ctx.answerCbQuery(`⚠️ Максимум ${maxSelections} вариантов`);
        return;
      }
      selections.push(callbackData);
      await ctx.answerCbQuery('✅ Выбрано');
    }
  }

  async finishMultipleChoice(ctx, question) {
    const selections = ctx.session.multipleChoiceSelections[question.id] || [];
    
    if (selections.length === 0) {
      await ctx.answerCbQuery('⚠️ Выберите хотя бы один вариант');
      return;
    }
    
    ctx.session.answers[question.id] = selections;
    ctx.session.completedQuestions.push(question.id);
    delete ctx.session.multipleChoiceSelections[question.id];
    
    await ctx.answerCbQuery('✅ Ответ сохранен');
    
    // Пробуем разные способы получить следующий вопрос
    let nextQuestion = null;
    
    if (typeof this.surveyQuestions.getNextQuestion === 'function') {
      nextQuestion = this.surveyQuestions.getNextQuestion(question.id, ctx.session.answers);
    } else if (typeof this.surveyQuestions.getNext === 'function') {
      nextQuestion = this.surveyQuestions.getNext(question.id, ctx.session.answers);
    } else {
      nextQuestion = this.findNextQuestionFallback(question.id, ctx.session.answers);
    }
    
    if (nextQuestion) {
      await this.askQuestion(ctx, nextQuestion);
    } else {
      await this.finishSurvey(ctx);
    }
  }

  async finishSurvey(ctx) {
    console.log('🏁 Завершение анкеты');
    
    try {
      // Показываем сообщение анализа
      const analysisMessage = config.MESSAGES?.ANALYSIS_START ||
        `🧠 *Анализирую ваши ответы...*\n\n` +
        `Анастасия изучает ваш профиль и подбирает персональные рекомендации.\n\n` +
        `Это займет несколько секунд...`;
      
      await ctx.reply(analysisMessage, { parse_mode: 'Markdown' });
      
      // Небольшая задержка для реалистичности
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Анализ результатов
      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      ctx.session.analysisResult = analysisResult;
      
      console.log('✅ Анализ завершен:', analysisResult.segment);
      
      // Передача лида
      await this.transferLead(ctx, analysisResult);
      
      // Показываем результаты
      await this.showResults(ctx, analysisResult);
      
    } catch (error) {
      console.error('❌ Ошибка завершения анкеты:', error);
      await ctx.reply('😔 Произошла ошибка при анализе. Напишите @NastuPopova');
    }
  }

  async showResults(ctx, analysisResult) {
    console.log('📊 Показываем результаты анализа');
    
    const message = analysisResult.personalMessage || 'Ваши результаты готовы!';
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎁 Получить персональную технику', 'get_bonus')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
      ])
    });
  }

  // === ИНТРИГУЮЩИЙ ТИЗЕР ===

  async sendIntriguingTeaser(ctx, bonus, analysisResult) {
    const technique = bonus.technique;
    const segment = analysisResult.segment || 'WARM_LEAD';
    const isHot = segment === 'HOT_LEAD';
    const isChild = analysisResult.analysisType === 'child';

    let profileTitle = '';
    let urgencyText = '';
    let teaserText = '';

    if (isChild) {
      profileTitle = '🎈 *Дыхательный профиль ребёнка*';
      urgencyText = isHot ? 'Требует внимания в ближайшие дни' : 'Можно начать улучшать уже сейчас';

      teaserText = `Я подобрала игровую технику *«${technique.name}»* — дети играют с удовольствием, а родители быстро замечают положительные изменения.\n\n` +
                   `🔥 Представьте: меньше капризов, спокойные вечера и радостные утра.\n\n` +
                   `Полная игровая инструкция для родителей, план на 3 дня и советы по мотивации — в вашем персональном гиде ниже.`;
    } else {
      const profileMap = {
        'insomnia': 'Тревожный сон на фоне стресса',
        'chronic_stress': 'Хроническое напряжение и перегруз',
        'anxiety': 'Тревожность и внутреннее беспокойство',
        'panic_attacks': 'Панические атаки и страх',
        'high_pressure': 'Повышенное давление и головные боли',
        'breathing_issues': 'Одышка и нехватка воздуха',
        'fatigue': 'Постоянная усталость и снижение энергии',
        'headaches': 'Частые головные боли и мигрени',
        'concentration_issues': 'Проблемы с концентрацией',
        'digestion_issues': 'Проблемы с пищеварением'
      };

      const mainIssue = analysisResult.primaryIssue || 'chronic_stress';
      profileTitle = `🎯 *Ваш дыхательный профиль:* ${profileMap[mainIssue] || 'Напряжённое состояние'}`;
      urgencyText = isHot ? 'Требует внимания в ближайшие дни' : 'Можно улучшить уже сейчас';

      const hotHint = isHot ? '🔥 Эта техника даёт заметный эффект уже с первого применения.\n\n' : '';

      teaserText = `Я подобрала для вас мощную технику *«${technique.name}»* — она помогает организму быстро перейти в режим восстановления.\n\n` +
                   `${hotHint}` +
                   `Многие мои клиенты отмечают: напряжение уходит, мысли затихают, появляется лёгкость и ясность.\n\n` +
                   `🔥 Представьте: всего несколько минут практики — и вы чувствуете себя спокойнее и энергичнее.\n\n` +
                   `Полная пошаговая инструкция, научное объяснение и план на 3 дня — в вашем персональном гиде ниже.`;
    }

    const message = `${profileTitle}\n\n` +
                    `Основная проблема: ${technique.problem}\n` +
                    `Уровень срочности: ${urgencyText}\n\n` +
                    `${teaserText}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  // === ОСТАЛЬНЫЕ МЕТОДЫ ===

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
        analysisResult: analysisResult,
        surveyType: analysisResult.analysisType,
        completedAt: new Date().toISOString(),
        surveyDuration: Date.now() - ctx.session.startTime
      };

      await this.leadTransfer.processLead(userData);
      console.log('✅ Лид успешно передан');

      if (this.bot.adminIntegration) {
        await this.bot.adminIntegration.notifySurveyResults(userData);
      }

    } catch (error) {
      console.error('❌ Ошибка передачи лида:', error);
    }
  }

  async showAboutSurvey(ctx) {
    console.log('ℹ️ Показ информации о диагностике');

    const message = `🌬️ *Подробно о диагностике дыхания*\n\n` +
      `Это быстрая и точная проверка вашего дыхания (всего 4-5 минут).\n\n` +
      `Что вы получите:\n` +
      `✅ Персональный анализ текущего состояния\n` +
      `✅ Индивидуальные рекомендации по улучшению\n` +
      `✅ Бесплатные дыхательные техники для старта\n` +
      `✅ Советы, адаптированные под вашу ситуацию\n\n` +
      `Диагностика полностью анонимна и конфиденциальна.\n\n` +
      `Готовы узнать, как дыхание влияет на ваше здоровье?`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('▶️ Начать диагностику', 'start_survey_from_about')],
        [Markup.button.callback('🔙 Назад в меню', 'back_to_main')]
      ])
    });
  }

  async handleError(ctx, error) {
    console.error('Обработка ошибки:', error);
    try {
      await ctx.reply('Произошла ошибка. Попробуйте /start или напишите @NastuPopova');
    } catch {}
  }

  getStats() {
    return {
      name: 'MainHandlers',
      version: '8.0.0-COMPLETE',
      features: ['full_survey_flow', 'two_step_bonus', 'intriguing_teaser', 'all_commands'],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
