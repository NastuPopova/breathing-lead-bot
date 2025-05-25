// Файл: lead_bot/index.js - ОБНОВЛЕННАЯ ВЕРСИЯ С НАВИГАЦИЕЙ НАЗАД И ДЕТСКИМИ ВОПРОСАМИ
// Главный файл лидогенерирующего бота для дыхательных практик

const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

// Проверяем наличие всех модулей перед запуском
let ExtendedSurveyQuestions, BreathingVERSEAnalysis, LeadTransferSystem;

try {
  ExtendedSurveyQuestions = require('./modules/survey/extended_questions');
  BreathingVERSEAnalysis = require('./modules/analysis/verse_analysis');
  LeadTransferSystem = require('./modules/integration/lead_transfer');
  console.log('✅ Все модули загружены успешно');
} catch (error) {
  console.error('❌ Ошибка загрузки модулей:', error.message);
  console.error('Проверьте наличие всех файлов модулей');
  process.exit(1);
}

class BreathingLeadBot {
  constructor() {
    try {
      this.bot = new Telegraf(config.LEAD_BOT_TOKEN);
      this.surveyQuestions = new ExtendedSurveyQuestions();
      this.verseAnalysis = new BreathingVERSEAnalysis();
      this.leadTransfer = new LeadTransferSystem();
      
      console.log('✅ Все компоненты бота инициализированы');
      
      this.setupMiddleware();
      this.setupHandlers();
      this.setupErrorHandling();
      
    } catch (error) {
      console.error('❌ Ошибка инициализации бота:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Сессии для хранения состояния пользователя
    this.bot.use(session({
      defaultSession: () => ({
        currentQuestion: null,
        answers: {},
        multipleChoiceSelections: {},
        startTime: Date.now(),
        questionStartTime: Date.now(),
        completedQuestions: [],
        navigationHistory: [] // история навигации для кнопки "назад"
      })
    }));

    // Улучшенное логирование с восстановлением сессии
    this.bot.use(async (ctx, next) => {
      try {
        const messageText = ctx.message?.text || ctx.callbackQuery?.data || 'callback';
        console.log(`[${new Date().toISOString()}] User ${ctx.from.id}: ${messageText}`);
        
        // Проверяем и восстанавливаем сессию если нужно
        if (!ctx.session) {
          console.log('⚠️ Сессия отсутствует, создаем новую для пользователя', ctx.from.id);
          ctx.session = {
            currentQuestion: null,
            answers: {},
            multipleChoiceSelections: {},
            startTime: Date.now(),
            questionStartTime: Date.now(),
            completedQuestions: [],
            navigationHistory: []
          };
        }
        
        return await next();
      } catch (error) {
        console.error('❌ Ошибка в middleware:', error);
        return await next();
      }
    });
  }

  setupHandlers() {
    // Команда /start
    this.bot.start(async (ctx) => {
      try {
        await this.handleStart(ctx);
      } catch (error) {
        console.error('❌ Ошибка в /start:', error);
        await this.sendErrorMessage(ctx, 'Ошибка запуска бота');
      }
    });

    // Отладочные команды для администратора
    this.bot.command('debug', async (ctx) => {
      if (this.isAdmin(ctx.from.id)) {
        await this.handleDebugCommand(ctx);
      }
    });

    this.bot.command('reset', async (ctx) => {
      await this.handleResetCommand(ctx);
    });

    this.bot.command('stats', async (ctx) => {
      if (this.isAdmin(ctx.from.id)) {
        await this.showStats(ctx);
      }
    });

    this.bot.command('health', async (ctx) => {
      if (this.isAdmin(ctx.from.id)) {
        await this.showHealthStatus(ctx);
      }
    });

    // Обработка callback_query (нажатия кнопок) - ОБНОВЛЕННАЯ ВЕРСИЯ С НАВИГАЦИЕЙ
    this.bot.on('callback_query', async (ctx) => {
      await this.safeHandleCallback(ctx);
    });

    // Обработка текстовых сообщений
    this.bot.on('text', async (ctx) => {
      try {
        await this.handleTextMessage(ctx);
      } catch (error) {
        console.error('❌ Ошибка обработки текста:', error);
        await this.sendErrorMessage(ctx, 'Ошибка обработки сообщения');
      }
    });
  }

  setupErrorHandling() {
    this.bot.catch(async (err, ctx) => {
      console.error('💥 Критическая ошибка бота:', err);
      
      try {
        // Логируем детали ошибки
        console.error('Контекст ошибки:', {
          user_id: ctx?.from?.id,
          update_type: ctx?.updateType,
          callback_data: ctx?.callbackQuery?.data,
          message_text: ctx?.message?.text,
          timestamp: new Date().toISOString()
        });
        
        // Пытаемся уведомить пользователя
        await this.sendErrorMessage(ctx, 'Произошла техническая ошибка');
        
        // Уведомляем администратора
        await this.notifyAdminAboutError(err, ctx);
        
      } catch (notificationError) {
        console.error('❌ Не удалось обработать ошибку:', notificationError);
      }
    });
  }

  /**
   * Безопасная обработка callback с поддержкой навигации
   */
  async safeHandleCallback(ctx) {
    const callbackData = ctx.callbackQuery?.data;
    
    try {
      console.log(`\n=== CALLBACK START: ${callbackData} ===`);
      console.log('Session state:', {
        currentQuestion: ctx.session?.currentQuestion,
        hasAnswers: !!ctx.session?.answers,
        answersCount: Object.keys(ctx.session?.answers || {}).length,
        completedQuestionsCount: (ctx.session?.completedQuestions || []).length,
        navigationHistoryLength: (ctx.session?.navigationHistory || []).length
      });
      
      // Проверка целостности системы
      if (!this.surveyQuestions || !this.verseAnalysis) {
        throw new Error('Система не инициализирована');
      }
      
      // Обязательный ответ на callback
      await ctx.answerCbQuery();
      console.log('✅ Callback acknowledged');
      
      // Восстановление сессии если нужно
      if (!ctx.session) {
        console.log('⚠️ Восстанавливаем сессию для пользователя', ctx.from.id);
        ctx.session = {
          currentQuestion: null,
          answers: {},
          multipleChoiceSelections: {},
          startTime: Date.now(),
          questionStartTime: Date.now(),
          completedQuestions: [],
          navigationHistory: []
        };
      }
      
      // Обработка навигации "назад"
      if (callbackData === 'nav_back') {
        console.log('⬅️ Обрабатываем навигацию назад');
        await this.handleBackNavigation(ctx);
        return;
      }
      
      // Маршрутизация callback
      if (callbackData === 'start_survey') {
        console.log('📝 Маршрут: start_survey');
        await this.startSurvey(ctx);
      } else if (callbackData === 'about_survey') {
        console.log('📝 Маршрут: about_survey');
        await this.showSurveyInfo(ctx);
      } else if (callbackData.startsWith('contact_') || 
                 ['back_to_start', 'back_to_results', 'back_to_contact_choice'].includes(callbackData)) {
        console.log('📝 Маршрут: contact_collection');
        await this.handleContactCollection(ctx, callbackData);
      } else {
        console.log('📝 Маршрут: survey_answer');
        await this.handleSurveyAnswer(ctx, callbackData);
      }
      
      console.log('=== CALLBACK END ===\n');
      
    } catch (error) {
      console.error('\n❌ ОШИБКА В CALLBACK HANDLER:');
      console.error('Тип ошибки:', error.name);
      console.error('Сообщение:', error.message);
      console.error('Стек:', error.stack);
      console.error('Callback data:', callbackData);
      console.error('User ID:', ctx.from?.id);
      console.error('Session state:', ctx.session);
      
      // Пытаемся уведомить пользователя
      try {
        await ctx.answerCbQuery('Произошла ошибка. Попробуйте еще раз.', { show_alert: true });
      } catch (cbError) {
        console.error('❌ Не удалось ответить на callback:', cbError.message);
      }
      
      // Отправляем сообщение об ошибке
      await this.sendErrorMessage(ctx, 'Произошла техническая ошибка. Начните заново: /start');
    }
  }

  /**
   * Обработка навигации назад
   */
  async handleBackNavigation(ctx) {
    try {
      const currentQuestion = ctx.session.currentQuestion;
      
      console.log('⬅️ BACK NAVIGATION DEBUG:', {
        currentQuestion,
        hasAnswers: !!ctx.session.answers,
        answersCount: Object.keys(ctx.session.answers || {}).length,
        completedQuestionsCount: (ctx.session.completedQuestions || []).length,
        navigationHistoryLength: (ctx.session.navigationHistory || []).length
      });

      if (!currentQuestion) {
        console.log('⚠️ Нет текущего вопроса, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }

      // Получаем предыдущий вопрос
      const previousQuestion = this.surveyQuestions.getPreviousQuestion(currentQuestion, ctx.session.answers);
      
      if (!previousQuestion) {
        console.log('⚠️ Нет предыдущего вопроса, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }

      console.log('⬅️ Переходим к предыдущему вопросу:', previousQuestion);

      // Удаляем текущий вопрос из завершенных (если он там есть)
      if (ctx.session.completedQuestions.includes(currentQuestion)) {
        const index = ctx.session.completedQuestions.indexOf(currentQuestion);
        ctx.session.completedQuestions.splice(index, 1);
        console.log('🗑️ Удален из завершенных:', currentQuestion);
      }

      // Удаляем ответ на текущий вопрос (если есть)
      if (ctx.session.answers[currentQuestion]) {
        delete ctx.session.answers[currentQuestion];
        console.log('🗑️ Удален ответ на:', currentQuestion);
      }

      // Очищаем множественные выборы для текущего вопроса
      if (ctx.session.multipleChoiceSelections && ctx.session.multipleChoiceSelections[currentQuestion]) {
        delete ctx.session.multipleChoiceSelections[currentQuestion];
        console.log('🗑️ Удалены множественные выборы для:', currentQuestion);
      }

      // Устанавливаем предыдущий вопрос как текущий
      ctx.session.currentQuestion = previousQuestion;
      ctx.session.questionStartTime = Date.now();

      // Показываем предыдущий вопрос
      await this.askQuestion(ctx, previousQuestion);

    } catch (error) {
      console.error('❌ Ошибка в handleBackNavigation:', error);
      console.error('Стек ошибки:', error.stack);
      await this.sendErrorMessage(ctx, 'Ошибка навигации. Начните заново: /start');
    }
  }

  /**
   * Обработка команды /start
   */
  async handleStart(ctx) {
    const user = ctx.from;
    
    // Сброс сессии
    ctx.session = {
      currentQuestion: null,
      answers: {},
      multipleChoiceSelections: {},
      startTime: Date.now(),
      questionStartTime: Date.now(),
      completedQuestions: [],
      navigationHistory: []
    };

    console.log('🚀 Пользователь начал диагностику:', user.id);

    const welcomeMessage = `🌬️ *Добро пожаловать в диагностику дыхания!*

Привет, ${user.first_name}! Меня зовут Анна, я помощник Анастасии.

За 4-5 минут мы:
✅ Определим ваши проблемы с дыханием
✅ Подберем персональные техники  
✅ Дадим рекомендации от Анастасии
✅ Предложим бесплатные материалы

*Готовы узнать, как улучшить своё дыхание и самочувствие?*

💡 *Новое:* Теперь можно вернуться к предыдущему вопросу кнопкой "⬅️ Назад"`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Начать диагностику', 'start_survey')],
      [Markup.button.callback('ℹ️ Подробнее о диагностике', 'about_survey')]
    ]);

    await ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  /**
   * Показ информации о диагностике
   */
  async showSurveyInfo(ctx) {
    const infoMessage = `📋 *Что включает диагностика:*

🔍 *18+ умных вопросов* о ваших:
• Привычках дыхания
• Уровне стресса и проблемах
• Целях и предпочтениях
• Образе жизни

👶 *Детская версия* включает:
• Вопросы о школе/саде
• Особенности детского поведения
• Подходящие возрасту техники
• Рекомендации для родителей

🧠 *VERSE-анализ* на основе:
• Современных исследований психологии
• Данных о 1000+ успешных случаев  
• Методик Анастасии Скородумовой

🎯 *Персональные рекомендации:*
• Конкретные техники под ваши проблемы
• Программа занятий
• Бесплатные материалы
• План консультации с Анастасией

⏱️ *Время:* 4-7 минут (в зависимости от возраста)
🔒 *Конфиденциально:* Данные защищены
💝 *Бесплатно:* Диагностика и базовые материалы
⬅️ *Удобно:* Можно вернуться к предыдущему вопросу`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Отлично, начинаем!', 'start_survey')],
      [Markup.button.callback('🔙 Назад', 'back_to_start')]
    ]);

    try {
      await ctx.editMessageText(infoMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.log('⚠️ Не удалось отредактировать, отправляем новое сообщение');
      await ctx.reply(infoMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  }

  /**
   * Начало анкетирования
   */
  async startSurvey(ctx) {
    console.log('🚀 Начинаем анкетирование для пользователя', ctx.from.id);
    
    // Инициализируем сессию анкетирования
    ctx.session.currentQuestion = 'age_group';
    ctx.session.questionStartTime = Date.now();
    
    await this.askQuestion(ctx, 'age_group');
  }
  
 /**
   * Задать вопрос пользователю - ОБНОВЛЕННАЯ ВЕРСИЯ С НАВИГАЦИЕЙ
   */
  async askQuestion(ctx, questionId) {
    try {
      console.log('🔍 ASK QUESTION DEBUG:', {
        questionId,
        sessionExists: !!ctx.session,
        currentQuestion: ctx.session?.currentQuestion,
        answersCount: Object.keys(ctx.session?.answers || {}).length
      });

      const question = this.surveyQuestions.getQuestion(questionId);
      
      if (!question) {
        console.error('❌ Вопрос не найден:', questionId);
        console.error('Доступные вопросы:', this.surveyQuestions.getAllQuestions());
        return await this.completeSurvey(ctx);
      }

      console.log('✅ Вопрос найден:', {
        id: question.id,
        type: question.type,
        block: question.block,
        hasKeyboard: !!question.keyboard,
        allowBack: question.allowBack
      });

      // Проверяем условие показа вопроса (для адаптивных)
      if (!this.surveyQuestions.shouldShowQuestion(questionId, ctx.session?.answers || {})) {
        console.log('⚠️ Пропускаем вопрос по условию:', questionId);
        return await this.moveToNextQuestion(ctx);
      }

      const progress = this.surveyQuestions.getProgress(
        ctx.session?.completedQuestions || [], 
        ctx.session?.answers || {}
      );

      console.log('📊 Progress info:', progress);

      const progressBar = this.generateProgressBar(progress.percentage);
      
      let messageText = `${progressBar} *${progress.completed}/${progress.total}*\n\n${question.text}`;

      // Для множественного выбора показываем текущие выборы
      if (question.type === 'multiple_choice') {
        const currentSelections = ctx.session?.multipleChoiceSelections?.[questionId] || [];
        if (currentSelections.length > 0) {
          const selectedText = currentSelections
            .map(selection => `• ${this.getSelectionDisplayText(selection)}`)
            .join('\n');
          
          messageText += `\n\n*Выбрано:*\n${selectedText}`;
        }
      }

      if (question.note) {
        messageText += `\n\n💡 ${question.note}`;
      }

      // Добавляем информацию о детском потоке
      if (this.surveyQuestions.isChildFlow(ctx.session?.answers)) {
        messageText += `\n\n👶 *Детская версия анкеты*`;
      }

      console.log('📝 Отправляем вопрос:', {
        questionId,
        messageLength: messageText.length,
        hasKeyboard: !!question.keyboard,
        keyboardType: question.keyboard?.reply_markup?.inline_keyboard ? 'inline' : 'other'
      });

      try {
        await ctx.editMessageText(messageText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
        console.log('✅ Сообщение отредактировано успешно');
      } catch (editError) {
        console.log('⚠️ Не удалось отредактировать сообщение:', editError.message);
        console.log('📤 Отправляем новое сообщение');
        await ctx.reply(messageText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
        console.log('✅ Новое сообщение отправлено успешно');
      }
    } catch (error) {
      console.error('❌ Ошибка в askQuestion:', error);
      console.error('Стек ошибки:', error.stack);
      await this.sendErrorMessage(ctx, 'Ошибка отображения вопроса. Попробуйте /start');
    }
  }

  /**
   * Обработка ответа на вопрос анкеты - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async handleSurveyAnswer(ctx, callbackData) {
    try {
      const currentQuestionId = ctx.session?.currentQuestion;
      
      console.log('🔍 SURVEY ANSWER DEBUG:', {
        currentQuestionId,
        callbackData,
        sessionExists: !!ctx.session,
        hasAnswers: !!ctx.session?.answers,
        answersKeys: Object.keys(ctx.session?.answers || {}),
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session?.answers || {})
      });
      
      if (!currentQuestionId || !ctx.session?.answers) {
        console.log('⚠️ Текущий вопрос или ответы не найдены, перезапускаем анкету...');
        await this.handleStart(ctx);
        return;
      }

      const question = this.surveyQuestions.getQuestion(currentQuestionId);
      if (!question) {
        console.error(`❌ Вопрос ${currentQuestionId} не найден`);
        console.error('Доступные вопросы:', this.surveyQuestions.getAllQuestions());
        await this.handleStart(ctx);
        return;
      }
      
      console.log('📝 Question found:', {
        id: currentQuestionId,
        type: question.type,
        hasOptions: !!question.options,
        required: question.required,
        allowBack: question.allowBack
      });

      const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
      console.log(`📝 Маппинг ответа: ${callbackData} -> ${mappedValue}`);

      // Добавим проверку на undefined mappedValue
      if (mappedValue === undefined || mappedValue === null) {
        console.error('❌ Не удалось сопоставить callback с значением');
        console.error('Callback data:', callbackData);
        await ctx.answerCbQuery('Ошибка обработки ответа. Попробуйте еще раз.', { show_alert: true });
        return;
      }

      // Обработка множественного выбора
      if (question.type === 'multiple_choice') {
        console.log('🔄 Обрабатываем множественный выбор');
        await this.handleMultipleChoice(ctx, currentQuestionId, mappedValue, callbackData);
        return;
      }

      // Валидация ответа
      const validation = this.surveyQuestions.validateAnswer(currentQuestionId, mappedValue);
      console.log('✅ Результат валидации:', validation);
      
      if (!validation.valid) {
        console.log('❌ Валидация не пройдена:', validation.error);
        await ctx.answerCbQuery(validation.error, { show_alert: true });
        return;
      }

      // Сохраняем ответ
      ctx.session.answers[currentQuestionId] = mappedValue;
      
      // Добавляем вопрос в список завершенных только если его там нет
      if (!ctx.session.completedQuestions.includes(currentQuestionId)) {
        ctx.session.completedQuestions.push(currentQuestionId);
      }

      console.log('✅ Ответ сохранен:', {
        question: currentQuestionId,
        answer: mappedValue,
        totalAnswers: Object.keys(ctx.session.answers).length,
        completedQuestions: ctx.session.completedQuestions.length
      });

      // Переходим к следующему вопросу
      await this.moveToNextQuestion(ctx);
      
    } catch (error) {
      console.error('❌ Ошибка в handleSurveyAnswer:', error);
      console.error('Стек ошибки:', error.stack);
      console.error('Контекст ошибки:', {
        currentQuestion: ctx.session?.currentQuestion,
        callbackData,
        sessionState: ctx.session
      });
      await this.sendErrorMessage(ctx, 'Ошибка сохранения ответа');
    }
  }

  /**
   * Обработка множественного выбора - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async handleMultipleChoice(ctx, questionId, value, callbackData) {
    try {
      console.log('🔍 MULTIPLE CHOICE DEBUG:', {
        questionId,
        value,
        callbackData,
        isDone: callbackData.includes('done')
      });

      const question = this.surveyQuestions.getQuestion(questionId);
      
      // Инициализируем массив выборов если нужно
      if (!ctx.session.multipleChoiceSelections) {
        ctx.session.multipleChoiceSelections = {};
      }
      
      if (!ctx.session.multipleChoiceSelections[questionId]) {
        ctx.session.multipleChoiceSelections[questionId] = [];
      }

      const currentSelections = ctx.session.multipleChoiceSelections[questionId];
      console.log('📋 Текущие выборы:', currentSelections);

      // Если нажали "завершить выбор"
      if (callbackData.includes('done')) {
        console.log('✅ Завершаем множественный выбор');
        
        const validation = this.surveyQuestions.validateAnswer(
          questionId, 
          'done', 
          currentSelections
        );
        
        if (!validation.valid) {
          console.log('❌ Валидация множественного выбора не пройдена:', validation.error);
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }

        // Сохраняем все выборы
        ctx.session.answers[questionId] = [...currentSelections];
        
        // Добавляем в завершенные только если его там нет
        if (!ctx.session.completedQuestions.includes(questionId)) {
          ctx.session.completedQuestions.push(questionId);
        }
        
        console.log('✅ Множественный выбор завершен:', {
          question: questionId,
          selections: currentSelections,
          count: currentSelections.length
        });
        
        return await this.moveToNextQuestion(ctx);
      }

      // Добавляем/убираем выбор
      const existingIndex = currentSelections.indexOf(value);
      
      if (existingIndex > -1) {
        // Убираем из выбора
        currentSelections.splice(existingIndex, 1);
        console.log('➖ Выбор убран:', value);
        await ctx.answerCbQuery('❌ Выбор убран');
      } else {
        // Проверяем лимит выборов
        const validation = this.surveyQuestions.validateAnswer(
          questionId, 
          value, 
          currentSelections
        );
        
        if (!validation.valid) {
          console.log('❌ Превышен лимит выборов:', validation.error);
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }

        // Добавляем в выбор
        currentSelections.push(value);
        console.log('➕ Выбор добавлен:', value);
        await ctx.answerCbQuery('✅ Выбор добавлен');
      }

      console.log('🔄 Обновляем вопрос с новыми выборами:', currentSelections);
      // Обновляем вопрос с текущими выборами
      await this.askQuestion(ctx, questionId);
      
    } catch (error) {
      console.error('❌ Ошибка в handleMultipleChoice:', error);
      console.error('Стек ошибки:', error.stack);
      await this.sendErrorMessage(ctx, 'Ошибка обработки выбора');
    }
  }

  /**
   * Переход к следующему вопросу - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async moveToNextQuestion(ctx) {
    try {
      const currentQuestionId = ctx.session.currentQuestion;
      
      console.log('🔍 MOVE TO NEXT QUESTION DEBUG:', {
        currentQuestionId,
        hasAnswers: !!ctx.session.answers,
        answersCount: Object.keys(ctx.session.answers || {}).length,
        completedCount: (ctx.session.completedQuestions || []).length,
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session.answers || {})
      });

      const nextQuestionId = this.surveyQuestions.getNextQuestion(
        currentQuestionId, 
        ctx.session.answers
      );

      console.log('🔍 Next question calculation:', {
        currentQuestion: currentQuestionId,
        nextQuestion: nextQuestionId,
        userData: Object.keys(ctx.session.answers || {}),
        flowType: this.surveyQuestions.isChildFlow(ctx.session.answers || {}) ? 'child' : 'adult'
      });

      if (nextQuestionId) {
        console.log('➡️ Переходим к следующему вопросу:', nextQuestionId);
        ctx.session.currentQuestion = nextQuestionId;
        ctx.session.questionStartTime = Date.now();
        await this.askQuestion(ctx, nextQuestionId);
      } else {
        console.log('🏁 Анкета завершена, переходим к анализу');
        // Анкета завершена
        await this.completeSurvey(ctx);
      }
    } catch (error) {
      console.error('❌ Ошибка в moveToNextQuestion:', error);
      console.error('Стек ошибки:', error.stack);
      console.error('Контекст ошибки:', {
        currentQuestion: ctx.session?.currentQuestion,
        sessionAnswers: ctx.session?.answers,
        systemState: {
          surveyQuestionsAvailable: !!this.surveyQuestions,
          getNextQuestionMethod: !!this.surveyQuestions?.getNextQuestion
        }
      });
      await this.sendErrorMessage(ctx, 'Ошибка перехода к следующему вопросу');
    }
  }

  /**
   * Завершение анкеты и анализ результатов
   */
  async completeSurvey(ctx) {
    try {
      console.log('🏁 Анкета завершена, начинаем анализ...');
      console.log('📊 Финальные данные:', {
        totalAnswers: Object.keys(ctx.session.answers || {}).length,
        completedQuestions: (ctx.session.completedQuestions || []).length,
        answers: ctx.session.answers,
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session.answers || {}),
        surveyType: this.surveyQuestions.isChildFlow(ctx.session.answers || {}) ? 'детская' : 'взрослая'
      });

      // Показываем сообщение об анализе
      const surveyType = this.surveyQuestions.isChildFlow(ctx.session.answers || {}) ? 'детскую' : 'взрослую';
      const analysisMessage = `🧠 *Анализирую ${surveyType} анкету...*

Анастасия изучает профиль и подбирает персональные рекомендации${surveyType === 'детскую' ? ' для ребенка' : ''}.

Это займет несколько секунд... ⏳`;

      await ctx.editMessageText(analysisMessage, { parse_mode: 'Markdown' });

      // Имитируем время анализа
      await this.delay(config.ANALYSIS_DELAY_SECONDS * 1000);

      // VERSE-анализ (адаптированный для детей или взрослых)
      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      
      console.log('📊 Результат анализа:', {
        segment: analysisResult.segment,
        primaryIssue: analysisResult.primaryIssue,
        scores: analysisResult.scores,
        hasRecommendations: !!analysisResult.recommendations,
        surveyType: surveyType
      });

      // Сохраняем результаты в сессии
      ctx.session.analysisResult = analysisResult;
      ctx.session.surveyCompleted = true;
      ctx.session.surveyType = surveyType;

      // Показываем результаты
      await this.showAnalysisResults(ctx, analysisResult);

      // Асинхронная передача лида в системы
      this.transferLeadAsync(ctx);

    } catch (error) {
      console.error('❌ Ошибка анализа:', error);
      console.error('Стек ошибки:', error.stack);
      
      await ctx.editMessageText(
        '😔 Произошла ошибка при анализе. Анастасия свяжется с вами лично для подбора программы.',
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Показ результатов анализа - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async showAnalysisResults(ctx, analysisResult) {
    try {
      console.log('📋 Показываем результаты анализа:', {
        segment: analysisResult.segment,
        hasMessage: !!analysisResult.personalMessage,
        messageLength: analysisResult.personalMessage?.length || 0,
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session?.answers || {})
      });

      const message = analysisResult.personalMessage;
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});

      // Разные кнопки для детского и взрослого потока
      let keyboard;
      if (isChildFlow) {
        keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('📞 Связаться с Анастасией', 'contact_request')],
          [Markup.button.callback('📋 Детская программа подробнее', 'child_program_details')],
          [Markup.button.callback('🎁 Материалы для родителей', 'child_materials')]
        ]);
      } else {
        keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('📞 Оставить контакты для связи', 'contact_request')],
          [Markup.button.callback('📋 Подробнее о программе', 'program_details')],
          [Markup.button.callback('🎁 Получить бесплатные материалы', 'free_materials')]
        ]);
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Сохраняем результаты в сессии для дальнейшего использования
      ctx.session.analysisResult = analysisResult;
      ctx.session.surveyCompleted = true;
      
      console.log('✅ Результаты анализа показаны пользователю');
    } catch (error) {
      console.error('❌ Ошибка показа результатов:', error);
      console.error('Стек ошибки:', error.stack);
      await this.sendErrorMessage(ctx, 'Ошибка отображения результатов');
    }
  }

  /**
   * Обработка сбора контактов - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async handleContactCollection(ctx, callbackData) {
    try {
      console.log('📞 Обрабатываем сбор контактов:', callbackData);
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});

      if (callbackData === 'contact_request') {
        await this.requestContactInfo(ctx);
      } else if (callbackData === 'program_details') {
        await this.showProgramDetails(ctx);
      } else if (callbackData === 'child_program_details') {
        await this.showChildProgramDetails(ctx);
      } else if (callbackData === 'free_materials') {
        await this.showFreeMaterials(ctx);
      } else if (callbackData === 'child_materials') {
        await this.showChildMaterials(ctx);
      } else if (callbackData === 'back_to_start') {
        await this.handleStart(ctx);
      } else if (callbackData === 'back_to_results') {
        if (ctx.session.analysisResult) {
          await this.showAnalysisResults(ctx, ctx.session.analysisResult);
        } else {
          await this.handleStart(ctx);
        }
      } else if (callbackData === 'contact_phone') {
        await this.handleContactInput(ctx, 'phone');
      } else if (callbackData === 'contact_email') {
        await this.handleContactInput(ctx, 'email');
      } else if (callbackData === 'contact_telegram') {
        await this.handleContactInput(ctx, 'telegram');
      } else if (callbackData === 'back_to_contact_choice') {
        await this.requestContactInfo(ctx);
      } else {
        console.log('⚠️ Неизвестная команда контактов:', callbackData);
        await ctx.answerCbQuery('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка обработки контактов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки запроса');
    }
  }

  /**
   * Показ деталей детской программы
   */
  async showChildProgramDetails(ctx) {
    try {
      const analysisResult = ctx.session.analysisResult;
      
      if (!analysisResult) {
        console.log('⚠️ Результат анализа не найден, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }

      const childAge = ctx.session.answers.child_age_detail || 'не указан';
      const education = ctx.session.answers.child_education_status || 'не указано';
      const schedule = ctx.session.answers.child_schedule_stress || 'не указано';
      
      const programMessage = `👶 *Детская программа дыхательных практик*

👦 *Возраст:* ${this.getChildAgeDisplay(childAge)}
🎓 *Обучение:* ${this.getEducationDisplay(education)}
⏰ *Загруженность:* ${this.getScheduleDisplay(schedule)}

🎯 *Персональная программа:*
${analysisResult.recommendations.main_program}

🎮 *Техники для ребенка:*
${analysisResult.recommendations.urgent_techniques.map(tech => `• ${tech}`).join('\n')}

⏰ *Продолжительность занятий:* ${analysisResult.recommendations.timeline}

👨‍👩‍👧‍👦 *Для родителей:* ${analysisResult.recommendations.consultation_type}

🎁 *Материалы и поддержка:*
${analysisResult.recommendations.support_materials.map(material => `• ${material}`).join('\n')}

💡 *Особенности:* Все техники адаптированы под возраст и подаются в игровой форме`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
        [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
      ]);

      await ctx.editMessageText(programMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка показа детской программы:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения детской программы');
    }
  }

  /**
   * Показ детских материалов
   */
  async showChildMaterials(ctx) {
    try {
      const analysisResult = ctx.session.analysisResult;
      
      if (!analysisResult) {
        console.log('⚠️ Результат анализа не найден, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }

      const childAge = ctx.session.answers.child_age_detail || 'не указан';
      
      const materialsMessage = `🎁 *Материалы для детских дыхательных практик*

👶 *Для возраста ${this.getChildAgeDisplay(childAge)}:*

📚 *Для родителей:*
• PDF-гид "Дыхательные игры для детей"
• Видеоинструкции по всем техникам
• Чек-лист "Как мотивировать ребенка"
• Календарь детских практик

🎮 *Для ребенка:*
• Сказки-медитации с дыхательными упражнениями
• Игровые карточки с техниками
• Дыхательные раскраски
• Аудиосказки для сна

🎯 *Специально под вашего ребенка:*
${analysisResult.recommendations.support_materials.map(material => `📄 ${material}`).join('\n')}

💌 *Как получить:*
1. Укажите контакты для связи
2. Материалы придут в течение 2 часов
3. Дополнительно получите доступ к родительскому чату

👨‍👩‍👧‍👦 *Бонус:* Персональная консультация по работе с ребенком (30 мин)`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Получить материалы', 'contact_request')],
        [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
      ]);

      await ctx.editMessageText(materialsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка показа детских материалов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения материалов');
    }
  }

  /**
   * Вспомогательные методы для отображения детских данных
   */
  getChildAgeDisplay(age) {
    const ageMap = {
      '3-4': '3-4 года (дошкольник)',
      '5-6': '5-6 лет (старший дошкольник)',
      '7-8': '7-8 лет (младший школьник)',
      '9-10': '9-10 лет (младший школьник)',
      '11-12': '11-12 лет (средний школьник)',
      '13-15': '13-15 лет (подросток)',
      '16-17': '16-17 лет (старший подросток)'
    };
    return ageMap[age] || age;
  }

  getEducationDisplay(education) {
    const eduMap = {
      'home_only': 'Домашнее воспитание',
      'private_kindergarten': 'Частный детский сад',
      'public_kindergarten': 'Государственный детский сад',
      'private_school': 'Частная школа',
      'public_school': 'Государственная школа',
      'gymnasium': 'Гимназия/лицей',
      'homeschooling': 'Семейное обучение',
      'alternative_school': 'Альтернативная школа'
    };
    return eduMap[education] || education;
  }

  getScheduleDisplay(schedule) {
    const scheduleMap = {
      'relaxed': 'Свободное расписание',
      'moderate': 'Умеренная загруженность',
      'busy': 'Высокая загруженность',
      'overloaded': 'Перегруженность',
      'intensive': 'Интенсивная подготовка'
    };
    return scheduleMap[schedule] || schedule;
  }

  // ... (продолжение следует с остальными методами)

  /**
   /**
   * Задать вопрос пользователю - ОБНОВЛЕННАЯ ВЕРСИЯ С НАВИГАЦИЕЙ
   */
  async askQuestion(ctx, questionId) {
    try {
      console.log('🔍 ASK QUESTION DEBUG:', {
        questionId,
        sessionExists: !!ctx.session,
        currentQuestion: ctx.session?.currentQuestion,
        answersCount: Object.keys(ctx.session?.answers || {}).length
      });

      const question = this.surveyQuestions.getQuestion(questionId);
      
      if (!question) {
        console.error('❌ Вопрос не найден:', questionId);
        console.error('Доступные вопросы:', this.surveyQuestions.getAllQuestions());
        return await this.completeSurvey(ctx);
      }

      console.log('✅ Вопрос найден:', {
        id: question.id,
        type: question.type,
        block: question.block,
        hasKeyboard: !!question.keyboard,
        allowBack: question.allowBack
      });

      // Проверяем условие показа вопроса (для адаптивных)
      if (!this.surveyQuestions.shouldShowQuestion(questionId, ctx.session?.answers || {})) {
        console.log('⚠️ Пропускаем вопрос по условию:', questionId);
        return await this.moveToNextQuestion(ctx);
      }

      const progress = this.surveyQuestions.getProgress(
        ctx.session?.completedQuestions || [], 
        ctx.session?.answers || {}
      );

      console.log('📊 Progress info:', progress);

      const progressBar = this.generateProgressBar(progress.percentage);
      
      let messageText = `${progressBar} *${progress.completed}/${progress.total}*\n\n${question.text}`;

      // Для множественного выбора показываем текущие выборы
      if (question.type === 'multiple_choice') {
        const currentSelections = ctx.session?.multipleChoiceSelections?.[questionId] || [];
        if (currentSelections.length > 0) {
          const selectedText = currentSelections
            .map(selection => `• ${this.getSelectionDisplayText(selection)}`)
            .join('\n');
          
          messageText += `\n\n*Выбрано:*\n${selectedText}`;
        }
      }

      if (question.note) {
        messageText += `\n\n💡 ${question.note}`;
      }

      // Добавляем информацию о детском потоке
      if (this.surveyQuestions.isChildFlow(ctx.session?.answers)) {
        messageText += `\n\n👶 *Детская версия анкеты*`;
      }

      console.log('📝 Отправляем вопрос:', {
        questionId,
        messageLength: messageText.length,
        hasKeyboard: !!question.keyboard,
        keyboardType: question.keyboard?.reply_markup?.inline_keyboard ? 'inline' : 'other'
      });

      try {
        await ctx.editMessageText(messageText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
        console.log('✅ Сообщение отредактировано успешно');
      } catch (editError) {
        console.log('⚠️ Не удалось отредактировать сообщение:', editError.message);
        console.log('📤 Отправляем новое сообщение');
        await ctx.reply(messageText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
        console.log('✅ Новое сообщение отправлено успешно');
      }
    } catch (error) {
      console.error('❌ Ошибка в askQuestion:', error);
      console.error('Стек ошибки:', error.stack);
      await this.sendErrorMessage(ctx, 'Ошибка отображения вопроса. Попробуйте /start');
    }
  }

  /**
   * Обработка ответа на вопрос анкеты - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async handleSurveyAnswer(ctx, callbackData) {
    try {
      const currentQuestionId = ctx.session?.currentQuestion;
      
      console.log('🔍 SURVEY ANSWER DEBUG:', {
        currentQuestionId,
        callbackData,
        sessionExists: !!ctx.session,
        hasAnswers: !!ctx.session?.answers,
        answersKeys: Object.keys(ctx.session?.answers || {}),
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session?.answers || {})
      });
      
      if (!currentQuestionId || !ctx.session?.answers) {
        console.log('⚠️ Текущий вопрос или ответы не найдены, перезапускаем анкету...');
        await this.handleStart(ctx);
        return;
      }

      const question = this.surveyQuestions.getQuestion(currentQuestionId);
      if (!question) {
        console.error(`❌ Вопрос ${currentQuestionId} не найден`);
        console.error('Доступные вопросы:', this.surveyQuestions.getAllQuestions());
        await this.handleStart(ctx);
        return;
      }
      
      console.log('📝 Question found:', {
        id: currentQuestionId,
        type: question.type,
        hasOptions: !!question.options,
        required: question.required,
        allowBack: question.allowBack
      });

      const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
      console.log(`📝 Маппинг ответа: ${callbackData} -> ${mappedValue}`);

      // Добавим проверку на undefined mappedValue
      if (mappedValue === undefined || mappedValue === null) {
        console.error('❌ Не удалось сопоставить callback с значением');
        console.error('Callback data:', callbackData);
        await ctx.answerCbQuery('Ошибка обработки ответа. Попробуйте еще раз.', { show_alert: true });
        return;
      }

      // Обработка множественного выбора
      if (question.type === 'multiple_choice') {
        console.log('🔄 Обрабатываем множественный выбор');
        await this.handleMultipleChoice(ctx, currentQuestionId, mappedValue, callbackData);
        return;
      }

      // Валидация ответа
      const validation = this.surveyQuestions.validateAnswer(currentQuestionId, mappedValue);
      console.log('✅ Результат валидации:', validation);
      
      if (!validation.valid) {
        console.log('❌ Валидация не пройдена:', validation.error);
        await ctx.answerCbQuery(validation.error, { show_alert: true });
        return;
      }

      // Сохраняем ответ
      ctx.session.answers[currentQuestionId] = mappedValue;
      
      // Добавляем вопрос в список завершенных только если его там нет
      if (!ctx.session.completedQuestions.includes(currentQuestionId)) {
        ctx.session.completedQuestions.push(currentQuestionId);
      }

      console.log('✅ Ответ сохранен:', {
        question: currentQuestionId,
        answer: mappedValue,
        totalAnswers: Object.keys(ctx.session.answers).length,
        completedQuestions: ctx.session.completedQuestions.length
      });

      // Переходим к следующему вопросу
      await this.moveToNextQuestion(ctx);
      
    } catch (error) {
      console.error('❌ Ошибка в handleSurveyAnswer:', error);
      console.error('Стек ошибки:', error.stack);
      console.error('Контекст ошибки:', {
        currentQuestion: ctx.session?.currentQuestion,
        callbackData,
        sessionState: ctx.session
      });
      await this.sendErrorMessage(ctx, 'Ошибка сохранения ответа');
    }
  }

  /**
   * Обработка множественного выбора - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async handleMultipleChoice(ctx, questionId, value, callbackData) {
    try {
      console.log('🔍 MULTIPLE CHOICE DEBUG:', {
        questionId,
        value,
        callbackData,
        isDone: callbackData.includes('done')
      });

      const question = this.surveyQuestions.getQuestion(questionId);
      
      // Инициализируем массив выборов если нужно
      if (!ctx.session.multipleChoiceSelections) {
        ctx.session.multipleChoiceSelections = {};
      }
      
      if (!ctx.session.multipleChoiceSelections[questionId]) {
        ctx.session.multipleChoiceSelections[questionId] = [];
      }

      const currentSelections = ctx.session.multipleChoiceSelections[questionId];
      console.log('📋 Текущие выборы:', currentSelections);

      // Если нажали "завершить выбор"
      if (callbackData.includes('done')) {
        console.log('✅ Завершаем множественный выбор');
        
        const validation = this.surveyQuestions.validateAnswer(
          questionId, 
          'done', 
          currentSelections
        );
        
        if (!validation.valid) {
          console.log('❌ Валидация множественного выбора не пройдена:', validation.error);
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }

        // Сохраняем все выборы
        ctx.session.answers[questionId] = [...currentSelections];
        
        // Добавляем в завершенные только если его там нет
        if (!ctx.session.completedQuestions.includes(questionId)) {
          ctx.session.completedQuestions.push(questionId);
        }
        
        console.log('✅ Множественный выбор завершен:', {
          question: questionId,
          selections: currentSelections,
          count: currentSelections.length
        });
        
        return await this.moveToNextQuestion(ctx);
      }

      // Добавляем/убираем выбор
      const existingIndex = currentSelections.indexOf(value);
      
      if (existingIndex > -1) {
        // Убираем из выбора
        currentSelections.splice(existingIndex, 1);
        console.log('➖ Выбор убран:', value);
        await ctx.answerCbQuery('❌ Выбор убран');
      } else {
        // Проверяем лимит выборов
        const validation = this.surveyQuestions.validateAnswer(
          questionId, 
          value, 
          currentSelections
        );
        
        if (!validation.valid) {
          console.log('❌ Превышен лимит выборов:', validation.error);
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }

        // Добавляем в выбор
        currentSelections.push(value);
        console.log('➕ Выбор добавлен:', value);
        await ctx.answerCbQuery('✅ Выбор добавлен');
      }

      console.log('🔄 Обновляем вопрос с новыми выборами:', currentSelections);
      // Обновляем вопрос с текущими выборами
      await this.askQuestion(ctx, questionId);
      
    } catch (error) {
      console.error('❌ Ошибка в handleMultipleChoice:', error);
      console.error('Стек ошибки:', error.stack);
      await this.sendErrorMessage(ctx, 'Ошибка обработки выбора');
    }
  }

  /**
   * Переход к следующему вопросу - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async moveToNextQuestion(ctx) {
    try {
      const currentQuestionId = ctx.session.currentQuestion;
      
      console.log('🔍 MOVE TO NEXT QUESTION DEBUG:', {
        currentQuestionId,
        hasAnswers: !!ctx.session.answers,
        answersCount: Object.keys(ctx.session.answers || {}).length,
        completedCount: (ctx.session.completedQuestions || []).length,
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session.answers || {})
      });

      const nextQuestionId = this.surveyQuestions.getNextQuestion(
        currentQuestionId, 
        ctx.session.answers
      );

      console.log('🔍 Next question calculation:', {
        currentQuestion: currentQuestionId,
        nextQuestion: nextQuestionId,
        userData: Object.keys(ctx.session.answers || {}),
        flowType: this.surveyQuestions.isChildFlow(ctx.session.answers || {}) ? 'child' : 'adult'
      });

      if (nextQuestionId) {
        console.log('➡️ Переходим к следующему вопросу:', nextQuestionId);
        ctx.session.currentQuestion = nextQuestionId;
        ctx.session.questionStartTime = Date.now();
        await this.askQuestion(ctx, nextQuestionId);
      } else {
        console.log('🏁 Анкета завершена, переходим к анализу');
        // Анкета завершена
        await this.completeSurvey(ctx);
      }
    } catch (error) {
      console.error('❌ Ошибка в moveToNextQuestion:', error);
      console.error('Стек ошибки:', error.stack);
      console.error('Контекст ошибки:', {
        currentQuestion: ctx.session?.currentQuestion,
        sessionAnswers: ctx.session?.answers,
        systemState: {
          surveyQuestionsAvailable: !!this.surveyQuestions,
          getNextQuestionMethod: !!this.surveyQuestions?.getNextQuestion
        }
      });
      await this.sendErrorMessage(ctx, 'Ошибка перехода к следующему вопросу');
    }
  }

  /**
   * Завершение анкеты и анализ результатов
   */
  async completeSurvey(ctx) {
    try {
      console.log('🏁 Анкета завершена, начинаем анализ...');
      console.log('📊 Финальные данные:', {
        totalAnswers: Object.keys(ctx.session.answers || {}).length,
        completedQuestions: (ctx.session.completedQuestions || []).length,
        answers: ctx.session.answers,
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session.answers || {}),
        surveyType: this.surveyQuestions.isChildFlow(ctx.session.answers || {}) ? 'детская' : 'взрослая'
      });

      // Показываем сообщение об анализе
      const surveyType = this.surveyQuestions.isChildFlow(ctx.session.answers || {}) ? 'детскую' : 'взрослую';
      const analysisMessage = `🧠 *Анализирую ${surveyType} анкету...*

Анастасия изучает профиль и подбирает персональные рекомендации${surveyType === 'детскую' ? ' для ребенка' : ''}.

Это займет несколько секунд... ⏳`;

      await ctx.editMessageText(analysisMessage, { parse_mode: 'Markdown' });

      // Имитируем время анализа
      await this.delay(config.ANALYSIS_DELAY_SECONDS * 1000);

      // VERSE-анализ (адаптированный для детей или взрослых)
      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      
      console.log('📊 Результат анализа:', {
        segment: analysisResult.segment,
        primaryIssue: analysisResult.primaryIssue,
        scores: analysisResult.scores,
        hasRecommendations: !!analysisResult.recommendations,
        surveyType: surveyType
      });

      // Сохраняем результаты в сессии
      ctx.session.analysisResult = analysisResult;
      ctx.session.surveyCompleted = true;
      ctx.session.surveyType = surveyType;

      // Показываем результаты
      await this.showAnalysisResults(ctx, analysisResult);

      // Асинхронная передача лида в системы
      this.transferLeadAsync(ctx);

    } catch (error) {
      console.error('❌ Ошибка анализа:', error);
      console.error('Стек ошибки:', error.stack);
      
      await ctx.editMessageText(
        '😔 Произошла ошибка при анализе. Анастасия свяжется с вами лично для подбора программы.',
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Показ результатов анализа - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async showAnalysisResults(ctx, analysisResult) {
    try {
      console.log('📋 Показываем результаты анализа:', {
        segment: analysisResult.segment,
        hasMessage: !!analysisResult.personalMessage,
        messageLength: analysisResult.personalMessage?.length || 0,
        isChildFlow: this.surveyQuestions.isChildFlow(ctx.session?.answers || {})
      });

      const message = analysisResult.personalMessage;
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});

      // Разные кнопки для детского и взрослого потока
      let keyboard;
      if (isChildFlow) {
        keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('📞 Связаться с Анастасией', 'contact_request')],
          [Markup.button.callback('📋 Детская программа подробнее', 'child_program_details')],
          [Markup.button.callback('🎁 Материалы для родителей', 'child_materials')]
        ]);
      } else {
        keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('📞 Оставить контакты для связи', 'contact_request')],
          [Markup.button.callback('📋 Подробнее о программе', 'program_details')],
          [Markup.button.callback('🎁 Получить бесплатные материалы', 'free_materials')]
        ]);
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Сохраняем результаты в сессии для дальнейшего использования
      ctx.session.analysisResult = analysisResult;
      ctx.session.surveyCompleted = true;
      
      console.log('✅ Результаты анализа показаны пользователю');
    } catch (error) {
      console.error('❌ Ошибка показа результатов:', error);
      console.error('Стек ошибки:', error.stack);
      await this.sendErrorMessage(ctx, 'Ошибка отображения результатов');
    }
  }

  /**
   * Обработка сбора контактов - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async handleContactCollection(ctx, callbackData) {
    try {
      console.log('📞 Обрабатываем сбор контактов:', callbackData);
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});

      if (callbackData === 'contact_request') {
        await this.requestContactInfo(ctx);
      } else if (callbackData === 'program_details') {
        await this.showProgramDetails(ctx);
      } else if (callbackData === 'child_program_details') {
        await this.showChildProgramDetails(ctx);
      } else if (callbackData === 'free_materials') {
        await this.showFreeMaterials(ctx);
      } else if (callbackData === 'child_materials') {
        await this.showChildMaterials(ctx);
      } else if (callbackData === 'back_to_start') {
        await this.handleStart(ctx);
      } else if (callbackData === 'back_to_results') {
        if (ctx.session.analysisResult) {
          await this.showAnalysisResults(ctx, ctx.session.analysisResult);
        } else {
          await this.handleStart(ctx);
        }
      } else if (callbackData === 'contact_phone') {
        await this.handleContactInput(ctx, 'phone');
      } else if (callbackData === 'contact_email') {
        await this.handleContactInput(ctx, 'email');
      } else if (callbackData === 'contact_telegram') {
        await this.handleContactInput(ctx, 'telegram');
      } else if (callbackData === 'back_to_contact_choice') {
        await this.requestContactInfo(ctx);
      } else {
        console.log('⚠️ Неизвестная команда контактов:', callbackData);
        await ctx.answerCbQuery('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка обработки контактов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки запроса');
    }
  }

  /**
   * Показ деталей детской программы
   */
  async showChildProgramDetails(ctx) {
    try {
      const analysisResult = ctx.session.analysisResult;
      
      if (!analysisResult) {
        console.log('⚠️ Результат анализа не найден, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }

      const childAge = ctx.session.answers.child_age_detail || 'не указан';
      const education = ctx.session.answers.child_education_status || 'не указано';
      const schedule = ctx.session.answers.child_schedule_stress || 'не указано';
      
      const programMessage = `👶 *Детская программа дыхательных практик*

👦 *Возраст:* ${this.getChildAgeDisplay(childAge)}
🎓 *Обучение:* ${this.getEducationDisplay(education)}
⏰ *Загруженность:* ${this.getScheduleDisplay(schedule)}

🎯 *Персональная программа:*
${analysisResult.recommendations.main_program}

🎮 *Техники для ребенка:*
${analysisResult.recommendations.urgent_techniques.map(tech => `• ${tech}`).join('\n')}

⏰ *Продолжительность занятий:* ${analysisResult.recommendations.timeline}

👨‍👩‍👧‍👦 *Для родителей:* ${analysisResult.recommendations.consultation_type}

🎁 *Материалы и поддержка:*
${analysisResult.recommendations.support_materials.map(material => `• ${material}`).join('\n')}

💡 *Особенности:* Все техники адаптированы под возраст и подаются в игровой форме`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
        [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
      ]);

      await ctx.editMessageText(programMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка показа детской программы:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения детской программы');
    }
  }

  /**
   * Показ детских материалов
   */
  async showChildMaterials(ctx) {
    try {
      const analysisResult = ctx.session.analysisResult;
      
      if (!analysisResult) {
        console.log('⚠️ Результат анализа не найден, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }

      const childAge = ctx.session.answers.child_age_detail || 'не указан';
      
      const materialsMessage = `🎁 *Материалы для детских дыхательных практик*

👶 *Для возраста ${this.getChildAgeDisplay(childAge)}:*

📚 *Для родителей:*
• PDF-гид "Дыхательные игры для детей"
• Видеоинструкции по всем техникам
• Чек-лист "Как мотивировать ребенка"
• Календарь детских практик

🎮 *Для ребенка:*
• Сказки-медитации с дыхательными упражнениями
• Игровые карточки с техниками
• Дыхательные раскраски
• Аудиосказки для сна

🎯 *Специально под вашего ребенка:*
${analysisResult.recommendations.support_materials.map(material => `📄 ${material}`).join('\n')}

💌 *Как получить:*
1. Укажите контакты для связи
2. Материалы придут в течение 2 часов
3. Дополнительно получите доступ к родительскому чату

👨‍👩‍👧‍👦 *Бонус:* Персональная консультация по работе с ребенком (30 мин)`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Получить материалы', 'contact_request')],
        [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
      ]);

      await ctx.editMessageText(materialsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка показа детских материалов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения материалов');
    }
  }

  /**
   * Вспомогательные методы для отображения детских данных
   */
  getChildAgeDisplay(age) {
    const ageMap = {
      '3-4': '3-4 года (дошкольник)',
      '5-6': '5-6 лет (старший дошкольник)',
      '7-8': '7-8 лет (младший школьник)',
      '9-10': '9-10 лет (младший школьник)',
      '11-12': '11-12 лет (средний школьник)',
      '13-15': '13-15 лет (подросток)',
      '16-17': '16-17 лет (старший подросток)'
    };
    return ageMap[age] || age;
  }

  getEducationDisplay(education) {
    const eduMap = {
      'home_only': 'Домашнее воспитание',
      'private_kindergarten': 'Частный детский сад',
      'public_kindergarten': 'Государственный детский сад',
      'private_school': 'Частная школа',
      'public_school': 'Государственная школа',
      'gymnasium': 'Гимназия/лицей',
      'homeschooling': 'Семейное обучение',
      'alternative_school': 'Альтернативная школа'
    };
    return eduMap[education] || education;
  }

  getScheduleDisplay(schedule) {
    const scheduleMap = {
      'relaxed': 'Свободное расписание',
      'moderate': 'Умеренная загруженность',
      'busy': 'Высокая загруженность',
      'overloaded': 'Перегруженность',
      'intensive': 'Интенсивная подготовка'
    };
    return scheduleMap[schedule] || schedule;
  }

  // ... (продолжение следует с остальными методами)

  /**
   * Запрос контактной информации - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async requestContactInfo(ctx) {
    try {
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});
      
      const contactMessage = isChildFlow 
        ? `📱 *Как с вами связаться?*

Анастасия подготовит персональную детскую программу и свяжется в течение 24 часов.

Укажите удобный способ связи:`
        : `📱 *Как с вами связаться?*

Анастасия подготовит персональную программу и свяжется в течение 24 часов.

Укажите удобный способ связи:`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Указать номер телефона', 'contact_phone')],
        [Markup.button.callback('✉️ Написать в Telegram', 'contact_telegram')],
        [Markup.button.callback('📧 Указать email', 'contact_email')]
      ]);

      await ctx.editMessageText(contactMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Устанавливаем режим ожидания контакта
      ctx.session.awaitingContact = true;
    } catch (error) {
      console.error('❌ Ошибка запроса контактов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка запроса контактной информации');
    }
  }

  /**
   * Обработка ввода контактной информации
   */
  async handleContactInput(ctx, contactType) {
    try {
      let promptMessage = '';
      let validationRegex = null;
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});
      
      switch (contactType) {
        case 'phone':
          promptMessage = isChildFlow 
            ? '📞 *Укажите ваш номер телефона:*\n\nАнастасия свяжется для обсуждения детской программы\n\nНапример: +7 999 123-45-67'
            : '📞 *Укажите ваш номер телефона:*\n\nНапример: +7 999 123-45-67';
          validationRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
          break;
        case 'email':
          promptMessage = isChildFlow
            ? '📧 *Укажите ваш email:*\n\nМатериалы для детских практик придут на почту\n\nНапример: example@mail.ru'
            : '📧 *Укажите ваш email:*\n\nНапример: example@mail.ru';
          validationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          break;
        case 'telegram':
          // Telegram контакт уже есть, просто подтверждаем
          const confirmMessage = isChildFlow
            ? `✅ *Отлично!*\n\nВаш Telegram: ${ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`}\n\nАнастасия свяжется для обсуждения детской программы дыхательных практик.`
            : `✅ *Отлично!*\n\nВаш Telegram: ${ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`}\n\nАнастасия свяжется для обсуждения персональной программы.`;
          
          await this.saveContactAndFinish(ctx, 'telegram', ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`);
          return;
      }

      ctx.session.contactType = contactType;
      ctx.session.contactValidation = validationRegex;
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Назад к выбору способа связи', 'back_to_contact_choice')]
      ]);

      await ctx.editMessageText(promptMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка ввода контактов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки контактной информации');
    }
  }

  /**
   * Показ деталей программы - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async showProgramDetails(ctx) {
    try {
      const analysisResult = ctx.session.analysisResult;
      
      if (!analysisResult) {
        console.log('⚠️ Результат анализа не найден, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }
      
      const programMessage = `📋 *Детали вашей программы:*

🎯 *Ваш профиль:* ${analysisResult.profile.description}

💪 *Основная программа:*
${analysisResult.recommendations.main_program}

⚡ *Первые техники:*
${analysisResult.recommendations.urgent_techniques.map(tech => `• ${tech}`).join('\n')}

⏰ *Ожидаемый результат:* ${analysisResult.recommendations.timeline}

👩‍⚕️ *Консультация:* ${analysisResult.recommendations.consultation_type}

🎁 *Поддерживающие материалы:*
${analysisResult.recommendations.support_materials.map(material => `• ${material}`).join('\n')}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
        [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
      ]);

      await ctx.editMessageText(programMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка показа деталей программы:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения деталей программы');
    }
  }

  /**
   * Показ бесплатных материалов
   */
  async showFreeMaterials(ctx) {
    try {
      const analysisResult = ctx.session.analysisResult;
      
      if (!analysisResult) {
        console.log('⚠️ Результат анализа не найден, возвращаемся к началу');
        await this.handleStart(ctx);
        return;
      }
      
      const materialsMessage = `🎁 *Ваши бесплатные материалы:*

${analysisResult.recommendations.support_materials.map(material => `📄 ${material}`).join('\n')}

💌 *Как получить:*
1. Укажите контакты для связи
2. Материалы придут в течение 30 минут
3. Дополнительно получите доступ к закрытому каналу

🎯 *Эти материалы специально подобраны под ваш профиль "${analysisResult.profile.description}"*`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Получить материалы', 'contact_request')],
        [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
      ]);

      await ctx.editMessageText(materialsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка показа материалов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения материалов');
    }
  }

  /**
   * Сохранение контакта и завершение процесса - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async saveContactAndFinish(ctx, contactType, contactValue) {
    try {
      console.log('💾 Сохраняем контакт:', { contactType, contactValue });
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});

      // Сохраняем контактную информацию
      ctx.session.contactInfo = {
        type: contactType,
        value: contactValue,
        provided_at: Date.now()
      };

      ctx.session.awaitingContact = false;
      ctx.session.contactType = null;
      ctx.session.contactValidation = null;

      const successMessage = isChildFlow ? `✅ *Контакт сохранен!*

📞 ${contactType === 'phone' ? 'Телефон' : contactType === 'email' ? 'Email' : 'Telegram'}: ${contactValue}

👶 *Что дальше для детской программы:*
• Анастасия получила данные о ребенке
• Детская программа будет готова в течение 24 часов
• Вы получите все материалы для родителей
• Анастасия проконсультирует по работе с ребенком

🎁 *Бонус:* Специальная методичка "Дыхательные игры дома"

🙏 *Спасибо за заботу о здоровье ребенка!*` : `✅ *Контакт сохранен!*

📞 ${contactType === 'phone' ? 'Телефон' : contactType === 'email' ? 'Email' : 'Telegram'}: ${contactValue}

🎯 *Что дальше:*
• Анастасия получила ваши данные
• Персональная программа будет готова в течение 24 часов
• Вы получите все обещанные материалы
• Анастасия свяжется в удобное время

🙏 *Спасибо за доверие!* Скоро мы поможем вам улучшить дыхание и самочувствие.`;

      await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });

      // Обновляем данные лида с контактной информацией
      if (ctx.session.analysisResult) {
        this.transferLeadAsync(ctx);
      }

      console.log('✅ Контакт сохранен и процесс завершен');
    } catch (error) {
      console.error('❌ Ошибка сохранения контакта:', error);
      await this.sendErrorMessage(ctx, 'Ошибка сохранения контактной информации');
    }
  }

  /**
   * Обработка текстовых сообщений
   */
  async handleTextMessage(ctx) {
    try {
      console.log('📝 Обрабатываем текстовое сообщение:', ctx.message.text);

      // Если ожидаем ввод контактной информации
      if (ctx.session.awaitingContact && ctx.session.contactType) {
        console.log('📞 Обрабатываем ввод контактной информации');
        const success = await this.validateAndSaveContact(ctx, ctx.message.text.trim());
        return;
      }

      // Если пользователь в процессе анкеты
      if (ctx.session.currentQuestion) {
        const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});
        const flowMessage = isChildFlow 
          ? 'Пожалуйста, используйте кнопки для ответов на вопросы о ребенке 😊\n\n💡 Можете вернуться к предыдущему вопросу кнопкой "⬅️ Назад"'
          : 'Пожалуйста, используйте кнопки для ответов на вопросы 😊\n\n💡 Можете вернуться к предыдущему вопросу кнопкой "⬅️ Назад"';
        await ctx.reply(flowMessage);
      } else {
        await ctx.reply('Напишите /start чтобы начать диагностику дыхания 🌬️\n\n💡 Теперь доступна детская версия анкеты!');
      }
    } catch (error) {
      console.error('❌ Ошибка обработки текста:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки сообщения');
    }
  }

  /**
   * Валидация и сохранение контактной информации
   */
  async validateAndSaveContact(ctx, contactValue) {
    try {
      const contactType = ctx.session.contactType;
      const validation = ctx.session.contactValidation;
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});
      
      console.log('🔍 Валидируем контакт:', { contactType, contactValue, hasValidation: !!validation });
      
      if (validation && !validation.test(contactValue)) {
        let errorMessage = '';
        switch (contactType) {
          case 'phone':
            errorMessage = isChildFlow
              ? '❌ Неверный формат номера телефона. Попробуйте еще раз (нужен для связи по детской программе):'
              : '❌ Неверный формат номера телефона. Попробуйте еще раз:';
            break;
          case 'email':
            errorMessage = isChildFlow
              ? '❌ Неверный формат email. Попробуйте еще раз (на него придут материалы для ребенка):'
              : '❌ Неверный формат email. Попробуйте еще раз:';
            break;
        }
        await ctx.reply(errorMessage);
        return false;
      }

      await this.saveContactAndFinish(ctx, contactType, contactValue);
      return true;
    } catch (error) {
      console.error('❌ Ошибка валидации контакта:', error);
      await this.sendErrorMessage(ctx, 'Ошибка проверки контактной информации');
      return false;
    }
  }

  /**
   * Асинхронная передача лида в системы - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async transferLeadAsync(ctx) {
    try {
      const userData = this.prepareUserData(ctx);
      console.log('🚀 Начинаем передачу лида в системы...', {
        userId: userData.userInfo.telegram_id,
        segment: userData.analysisResult?.segment,
        hasContact: !!userData.contactInfo,
        surveyType: userData.surveyType || 'adult',
        isChildFlow: this.surveyQuestions.isChildFlow(userData.surveyAnswers || {})
      });
      
      const transferResult = await this.leadTransfer.processLead(userData);
      
      if (transferResult.success) {
        console.log('✅ Лид успешно передан во все системы');
      } else {
        console.error('❌ Ошибки при передаче лида:', transferResult);
      }
      
    } catch (error) {
      console.error('💥 Критическая ошибка передачи лида:', error);
    }
  }

  /**
   * Подготовка данных пользователя для передачи - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  prepareUserData(ctx) {
    const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session?.answers || {});
    
    return {
      userInfo: {
        telegram_id: ctx.from.id,
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        language_code: ctx.from.language_code
      },
      surveyAnswers: ctx.session.answers,
      analysisResult: ctx.session.analysisResult,
      contactInfo: ctx.session.contactInfo || null,
      startTime: ctx.session.startTime,
      completedAt: Date.now(),
      sessionDuration: Date.now() - ctx.session.startTime,
      surveyType: isChildFlow ? 'child' : 'adult',
      childData: isChildFlow ? {
        age: ctx.session.answers.child_age_detail,
        education: ctx.session.answers.child_education_status,
        schedule: ctx.session.answers.child_schedule_stress,
        problems: ctx.session.answers.child_problems_detailed,
        parentInvolvement: ctx.session.answers.child_parent_involvement,
        motivation: ctx.session.answers.child_motivation_approach,
        timeAvailability: ctx.session.answers.child_time_availability
      } : null
    };
  }

  /**
   * Отладочные команды - ОБНОВЛЕННАЯ ВЕРСИЯ
   */
  async handleDebugCommand(ctx) {
    if (!this.isAdmin(ctx.from.id)) {
      return;
    }
    
    const debugInfo = {
      bot_status: 'running',
      current_time: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      node_version: process.version,
      features: {
        navigation_support: true,
        child_flow_support: true,
        back_button: true
      },
      components: {
        survey_questions: !!this.surveyQuestions,
        verse_analysis: !!this.verseAnalysis,
        lead_transfer: !!this.leadTransfer
      },
      session_info: ctx.session ? {
        has_session: true,
        current_question: ctx.session.currentQuestion,
        answers_count: Object.keys(ctx.session.answers || {}).length,
        completed_count: (ctx.session.completedQuestions || []).length,
        survey_completed: ctx.session.surveyCompleted || false,
        has_analysis_result: !!ctx.session.analysisResult,
        navigation_history_length: (ctx.session.navigationHistory || []).length,
        is_child_flow: this.surveyQuestions.isChildFlow(ctx.session.answers || {}),
        survey_type: ctx.session.surveyType || 'adult'
      } : { has_session: false }
    };
    
    await ctx.reply(`🔧 *Debug Info (v2.0 с навигацией):*\n\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\``, {
      parse_mode: 'Markdown'
    });
  }

  async handleResetCommand(ctx) {
    console.log('🔄 Сброс сессии для пользователя:', ctx.from.id);
    
    ctx.session = {
      currentQuestion: null,
      answers: {},
      multipleChoiceSelections: {},
      startTime: Date.now(),
      questionStartTime: Date.now(),
      completedQuestions: [],
      navigationHistory: []
    };
    
    await ctx.reply('🔄 Сессия сброшена. Начните заново: /start\n\n✨ Новые возможности:\n• Кнопка "⬅️ Назад"\n• Детская версия анкеты\n• Улучшенная навигация');
  }

  /**
   * Вспомогательные методы
   */
  async sendErrorMessage(ctx, message) {
    try {
      if (ctx && ctx.reply) {
        await ctx.reply(`😔 ${message}`);
      }
    } catch (error) {
      console.error('❌ Не удалось отправить сообщение об ошибке:', error);
    }
  }

  generateProgressBar(percentage) {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    return '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);
  }

  getSelectionDisplayText(selection) {
    const displayTexts = {
      'chronic_stress': 'Хронический стресс',
      'insomnia': 'Проблемы со сном',
      'breathing_issues': 'Проблемы с дыханием',
      'high_pressure': 'Повышенное давление',
      'anxiety': 'Тревожность',
      'fatigue': 'Усталость',
      'video': 'Видеоуроки',
      'audio': 'Аудиопрактики',
      'text': 'Текстовые материалы',
      'individual': 'Индивидуальные консультации',
      // Детские проблемы
      'tantrums': 'Истерики',
      'sleep_problems': 'Проблемы со сном',
      'hyperactivity': 'Гиперактивность',
      'anxiety': 'Тревожность',
      'separation_anxiety': 'Боязнь разлуки',
      'concentration_issues': 'Проблемы с концентрацией',
      'social_difficulties': 'Сложности в общении',
      'aggression': 'Агрессивность',
      'weak_immunity': 'Слабый иммунитет',
      'breathing_issues': 'Проблемы с дыханием',
      'prevention': 'Профилактика'
    };
    
    return displayTexts[selection] || selection;
  }

  isAdmin(userId) {
    return config.ADMIN_ID && userId.toString() === config.ADMIN_ID.toString();
  }

  async notifyAdminAboutError(error, ctx) {
    if (!config.ADMIN_ID) return;
    
    try {
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx?.session?.answers || {});
      const errorMessage = `🚨 *Ошибка в лид-боте v2.0:*\n\n` +
        `👤 Пользователь: ${ctx?.from?.id}\n` +
        `📝 Тип: ${error.name}\n` +
        `💬 Сообщение: ${error.message}\n` +
        `🎯 Поток: ${isChildFlow ? 'Детский' : 'Взрослый'}\n` +
        `🕐 Время: ${new Date().toLocaleString('ru-RU')}`;
      
      await this.bot.telegram.sendMessage(config.ADMIN_ID, errorMessage, {
        parse_mode: 'Markdown'
      });
    } catch (adminError) {
      console.error('❌ Не удалось уведомить администратора:', adminError);
    }
  }

  /**
   * Дополнительные методы для администратора - ОБНОВЛЕННЫЕ
   */
  async showStats(ctx) {
    try {
      const stats = await this.leadTransfer.getTransferStats('24h');
      
      const statsMessage = `📊 *Статистика за 24 часа (v2.0):*

👤 *Пользователи:*
• Начали анкету: ${stats?.started || 'N/A'}
• Завершили анкету: ${stats?.completed || 'N/A'}
• Конверсия: ${stats?.conversion_rate || 'N/A'}%

🎯 *Сегментация лидов:*
• 🔥 HOT: ${stats?.segments?.hot || 0}
• ⭐ WARM: ${stats?.segments?.warm || 0}
• ❄️ COLD: ${stats?.segments?.cold || 0}
• 🌱 NURTURE: ${stats?.segments?.nurture || 0}

👶 *Новые возможности:*
• Детские анкеты: ${stats?.child_surveys || 'N/A'}
• Использование кнопки "Назад": ${stats?.back_navigation || 'N/A'}

🔄 *Интеграции:*
• Переданы в основной бот: ${stats?.transferred || 'N/A'}
• Ошибки передачи: ${stats?.errors || 0}

⏱️ *Производительность:*
• Среднее время анкеты: ${stats?.avg_duration || 'N/A'} мин

🕐 *Обновлено:* ${new Date().toLocaleString('ru-RU')}`;

      await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      await ctx.reply('❌ Ошибка получения статистики');
    }
  }

  async showHealthStatus(ctx) {
    try {
      const healthStatus = await this.leadTransfer.healthCheck();
      
      const statusEmoji = {
        true: '✅',
        false: '❌',
        'not_configured': '⚠️'
      };
      
      const healthMessage = `🏥 *Статус системы v2.0:*

🤖 *Основной бот:* ${statusEmoji[healthStatus.mainBot]} ${healthStatus.mainBot ? 'Доступен' : 'Недоступен'}

📊 *CRM интеграция:* ${statusEmoji[healthStatus.crm]} ${
        healthStatus.crm === true ? 'Работает' : 
        healthStatus.crm === 'not_configured' ? 'Не настроено' : 'Ошибка'
      }

🆕 *Новые функции:*
• Навигация назад: ✅ Работает
• Детский поток: ✅ Активен
• Адаптивные вопросы: ✅ Работают

🔧 *Версия бота:* 2.0.0 (с навигацией)
📅 *Время работы:* ${this.getUptime()}
💾 *Память:* ${this.getMemoryUsage()}

🕐 *Проверено:* ${new Date().toLocaleString('ru-RU')}`;

      await ctx.reply(healthMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Ошибка проверки здоровья:', error);
      await ctx.reply('❌ Ошибка проверки статуса системы');
    }
  }

  getUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}ч ${minutes}м`;
  }

  getMemoryUsage() {
    const used = process.memoryUsage();
    const mb = Math.round(used.heapUsed / 1024 / 1024);
    return `${mb} MB`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Запуск бота
   */
  launch() {
    console.log('🤖 Запускаем лидогенерирующего бота v2.0...');
    console.log('✨ Новые возможности: навигация назад + детские вопросы');
    
    // Проверяем конфигурацию при запуске
    this.validateConfiguration();
    
    this.bot.launch({
      webhook: process.env.NODE_ENV === 'production' ? {
        domain: config.APP_URL,
        port: config.PORT
      } : undefined
    });

    console.log('✅ Бот v2.0 запущен успешно!');
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log('🆕 Поддерживаемые функции:');
    console.log('   • Навигация назад (⬅️ кнопка)');
    console.log('   • Детская версия анкеты');
    console.log('   • Адаптивные вопросы по возрасту');
    console.log('   • Улучшенная система анализа');
    
    // Graceful shutdown
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  validateConfiguration() {
    const requiredVars = ['LEAD_BOT_TOKEN'];
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Отсутствуют обязательные переменные окружения:');
      missing.forEach(key => console.error(`   - ${key}`));
      process.exit(1);
    }
    
    console.log('✅ Конфигурация валидна');
  }
}

// Создаем и запускаем бота с обработкой ошибок
try {
  const leadBot = new BreathingLeadBot();
  leadBot.launch();
} catch (error) {
  console.error('💥 Критическая ошибка запуска бота:', error);
  process.exit(1);
}
		
