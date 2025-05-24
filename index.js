// Файл: lead_bot/index.js - ЧАСТЬ 1
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
        completedQuestions: []
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
            completedQuestions: []
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

    // Обработка callback_query (нажатия кнопок) - ИСПРАВЛЕННАЯ ВЕРСИЯ
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
   * Безопасная обработка callback с полным логированием
   */
  async safeHandleCallback(ctx) {
    const callbackData = ctx.callbackQuery?.data;
    
    try {
      console.log(`\n=== CALLBACK START: ${callbackData} ===`);
      
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
          completedQuestions: []
        };
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
      console.error('Callback data:', callbackData);
      console.error('User ID:', ctx.from?.id);
      
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
      completedQuestions: []
    };

    console.log('🚀 Пользователь начал диагностику:', user.id);

    const welcomeMessage = `🌬️ *Добро пожаловать в диагностику дыхания!*

Привет, ${user.first_name}! Меня зовут Анна, я помощник Анастасии.

За 4-5 минут мы:
✅ Определим ваши проблемы с дыханием
✅ Подберем персональные техники  
✅ Дадим рекомендации от Анастасии
✅ Предложим бесплатные материалы

*Готовы узнать, как улучшить своё дыхание и самочувствие?*`;

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

🔍 *18 умных вопросов* о ваших:
• Привычках дыхания
• Уровне стресса и проблемах
• Целях и предпочтениях
• Образе жизни

🧠 *VERSE-анализ* на основе:
• Современных исследований психологии
• Данных о 1000+ успешных случаев  
• Методик Анастасии Скородумовой

🎯 *Персональные рекомендации:*
• Конкретные техники под ваши проблемы
• Программа занятий
• Бесплатные материалы
• План консультации с Анастасией

⏱️ *Время:* 4-5 минут
🔒 *Конфиденциально:* Данные защищены
💝 *Бесплатно:* Диагностика и базовые материалы`;

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
   * Задать вопрос пользователю - ИСПРАВЛЕННАЯ ВЕРСИЯ
   */
  async askQuestion(ctx, questionId) {
    try {
      const question = this.surveyQuestions.getQuestion(questionId);
      
      if (!question) {
        console.error('❌ Вопрос не найден:', questionId);
        return await this.completeSurvey(ctx);
      }

      // Проверяем условие показа вопроса (для адаптивных)
      if (!this.surveyQuestions.shouldShowQuestion(questionId, ctx.session?.answers || {})) {
        console.log('⚠️ Пропускаем вопрос по условию:', questionId);
        return await this.moveToNextQuestion(ctx);
      }

      const progress = this.surveyQuestions.getProgress(
        ctx.session?.completedQuestions || [], 
        ctx.session?.answers || {}
      );

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

      try {
        await ctx.editMessageText(messageText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
      } catch (editError) {
        console.log('⚠️ Не удалось отредактировать сообщение, отправляем новое');
        await ctx.reply(messageText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
      }
    } catch (error) {
      console.error('❌ Ошибка в askQuestion:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения вопроса. Попробуйте /start');
    }
  }

  /**
   * Обработка ответа на вопрос анкеты - ИСПРАВЛЕННАЯ ВЕРСИЯ
   */
  async handleSurveyAnswer(ctx, callbackData) {
    try {
      const currentQuestionId = ctx.session?.currentQuestion;
      
      if (!currentQuestionId) {
        console.log('⚠️ Текущий вопрос не найден, перезапускаем анкету...');
        await this.handleStart(ctx);
        return;
      }

      const question = this.surveyQuestions.getQuestion(currentQuestionId);
      if (!question) {
        console.error(`❌ Вопрос ${currentQuestionId} не найден`);
        await this.handleStart(ctx);
        return;
      }

      const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
      console.log(`📝 Ответ на вопрос ${currentQuestionId}: ${callbackData} -> ${mappedValue}`);

      // Обработка множественного выбора
      if (question.type === 'multiple_choice') {
        await this.handleMultipleChoice(ctx, currentQuestionId, mappedValue, callbackData);
        return;
      }

      // Валидация ответа
      const validation = this.surveyQuestions.validateAnswer(currentQuestionId, mappedValue);
      
      if (!validation.valid) {
        await ctx.answerCbQuery(validation.error, { show_alert: true });
        return;
      }

      // Сохраняем ответ
      ctx.session.answers[currentQuestionId] = mappedValue;
      
      // Добавляем вопрос в список завершенных только если его там нет
      if (!ctx.session.completedQuestions.includes(currentQuestionId)) {
        ctx.session.completedQuestions.push(currentQuestionId);
      }

      console.log('✅ Ответ сохранен:', currentQuestionId, '=', mappedValue);

      // Переходим к следующему вопросу
      await this.moveToNextQuestion(ctx);
      
    } catch (error) {
      console.error('❌ Ошибка в handleSurveyAnswer:', error);
      await this.sendErrorMessage(ctx, 'Ошибка сохранения ответа');
    }
  }

  /**
   * Обработка множественного выбора - ИСПРАВЛЕННАЯ ВЕРСИЯ
   */
  async handleMultipleChoice(ctx, questionId, value, callbackData) {
    try {
      const question = this.surveyQuestions.getQuestion(questionId);
      
      // Инициализируем массив выборов если нужно
      if (!ctx.session.multipleChoiceSelections) {
        ctx.session.multipleChoiceSelections = {};
      }
      
      if (!ctx.session.multipleChoiceSelections[questionId]) {
        ctx.session.multipleChoiceSelections[questionId] = [];
      }

      const currentSelections = ctx.session.multipleChoiceSelections[questionId];

      // Если нажали "завершить выбор"
      if (callbackData.includes('done')) {
        const validation = this.surveyQuestions.validateAnswer(
          questionId, 
          'done', 
          currentSelections
        );
        
        if (!validation.valid) {
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }

        // Сохраняем все выборы
        ctx.session.answers[questionId] = [...currentSelections];
        
        // Добавляем в завершенные только если его там нет
        if (!ctx.session.completedQuestions.includes(questionId)) {
          ctx.session.completedQuestions.push(questionId);
        }
        
        console.log('✅ Множественный выбор завершен:', questionId, '=', currentSelections);
        
        return await this.moveToNextQuestion(ctx);
      }

      // Добавляем/убираем выбор
      const existingIndex = currentSelections.indexOf(value);
      
      if (existingIndex > -1) {
        // Убираем из выбора
        currentSelections.splice(existingIndex, 1);
        await ctx.answerCbQuery('❌ Выбор убран');
      } else {
        // Проверяем лимит выборов
        const validation = this.surveyQuestions.validateAnswer(
          questionId, 
          value, 
          currentSelections
        );
        
        if (!validation.valid) {
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }

        // Добавляем в выбор
        currentSelections.push(value);
        await ctx.answerCbQuery('✅ Выбор добавлен');
      }

      // Обновляем вопрос с текущими выборами
      await this.askQuestion(ctx, questionId);
      
    } catch (error) {
      console.error('❌ Ошибка в handleMultipleChoice:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки выбора');
    }
  }

  /**
   * Переход к следующему вопросу
   */
  async moveToNextQuestion(ctx) {
    try {
      const currentQuestionId = ctx.session.currentQuestion;
      const nextQuestionId = this.surveyQuestions.getNextQuestion(
        currentQuestionId, 
        ctx.session.answers
      );

      if (nextQuestionId) {
        ctx.session.currentQuestion = nextQuestionId;
        ctx.session.questionStartTime = Date.now();
        await this.askQuestion(ctx, nextQuestionId);
      } else {
        // Анкета завершена
        await this.completeSurvey(ctx);
      }
    } catch (error) {
      console.error('❌ Ошибка в moveToNextQuestion:', error);
      await this.sendErrorMessage(ctx, 'Ошибка перехода к следующему вопросу');
    }
  }

    /**
   * Завершение анкеты и анализ результатов
   */
  async completeSurvey(ctx) {
    try {
      console.log('🏁 Анкета завершена, начинаем анализ...');

      // Показываем сообщение об анализе
      const analysisMessage = `🧠 *Анализирую ваши ответы...*

Анастасия изучает ваш профиль и подбирает персональные рекомендации.

Это займет несколько секунд... ⏳`;

      await ctx.editMessageText(analysisMessage, { parse_mode: 'Markdown' });

      // Имитируем время анализа
      await this.delay(config.ANALYSIS_DELAY_SECONDS * 1000);

      // VERSE-анализ
      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      
      console.log('📊 Результат анализа:', {
        segment: analysisResult.segment,
        primaryIssue: analysisResult.primaryIssue,
        scores: analysisResult.scores
      });

      // Сохраняем результаты в сессии
      ctx.session.analysisResult = analysisResult;
      ctx.session.surveyCompleted = true;

      // Показываем результаты
      await this.showAnalysisResults(ctx, analysisResult);

      // Асинхронная передача лида в системы
      this.transferLeadAsync(ctx);

    } catch (error) {
      console.error('❌ Ошибка анализа:', error);
      await ctx.editMessageText(
        '😔 Произошла ошибка при анализе. Анастасия свяжется с вами лично для подбора программы.',
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Показ результатов анализа
   */
  async showAnalysisResults(ctx, analysisResult) {
    try {
      const message = analysisResult.personalMessage;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📞 Оставить контакты для связи', 'contact_request')],
        [Markup.button.callback('📋 Подробнее о программе', 'program_details')],
        [Markup.button.callback('🎁 Получить бесплатные материалы', 'free_materials')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Сохраняем результаты в сессии для дальнейшего использования
      ctx.session.analysisResult = analysisResult;
      ctx.session.surveyCompleted = true;
    } catch (error) {
      console.error('❌ Ошибка показа результатов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка отображения результатов');
    }
  }

  /**
   * Обработка сбора контактов
   */
  async handleContactCollection(ctx, callbackData) {
    try {
      if (callbackData === 'contact_request') {
        await this.requestContactInfo(ctx);
      } else if (callbackData === 'program_details') {
        await this.showProgramDetails(ctx);
      } else if (callbackData === 'free_materials') {
        await this.showFreeMaterials(ctx);
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
        await ctx.answerCbQuery('Неизвестная команда');
      }
    } catch (error) {
      console.error('❌ Ошибка обработки контактов:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки запроса');
    }
  }

  /**
   * Запрос контактной информации
   */
  async requestContactInfo(ctx) {
    try {
      const contactMessage = `📱 *Как с вами связаться?*

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
      
      switch (contactType) {
        case 'phone':
          promptMessage = '📞 *Укажите ваш номер телефона:*\n\nНапример: +7 999 123-45-67';
          validationRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
          break;
        case 'email':
          promptMessage = '📧 *Укажите ваш email:*\n\nНапример: example@mail.ru';
          validationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          break;
        case 'telegram':
          // Telegram контакт уже есть, просто подтверждаем
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
   * Показ деталей программы
   */
  async showProgramDetails(ctx) {
    try {
      const analysisResult = ctx.session.analysisResult;
      
      if (!analysisResult) {
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
   * Сохранение контакта и завершение процесса
   */
  async saveContactAndFinish(ctx, contactType, contactValue) {
    try {
      // Сохраняем контактную информацию
      ctx.session.contactInfo = {
        type: contactType,
        value: contactValue,
        provided_at: Date.now()
      };

      ctx.session.awaitingContact = false;
      ctx.session.contactType = null;
      ctx.session.contactValidation = null;

      const successMessage = `✅ *Контакт сохранен!*

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
      // Если ожидаем ввод контактной информации
      if (ctx.session.awaitingContact && ctx.session.contactType) {
        const success = await this.validateAndSaveContact(ctx, ctx.message.text.trim());
        return;
      }

      // Если пользователь в процессе анкеты
      if (ctx.session.currentQuestion) {
        await ctx.reply('Пожалуйста, используйте кнопки для ответов на вопросы 😊');
      } else {
        await ctx.reply('Напишите /start чтобы начать диагностику дыхания 🌬️');
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
      
      if (validation && !validation.test(contactValue)) {
        let errorMessage = '';
        switch (contactType) {
          case 'phone':
            errorMessage = '❌ Неверный формат номера телефона. Попробуйте еще раз:';
            break;
          case 'email':
            errorMessage = '❌ Неверный формат email. Попробуйте еще раз:';
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
   * Асинхронная передача лида в системы
   */
  async transferLeadAsync(ctx) {
    try {
      const userData = this.prepareUserData(ctx);
      console.log('🚀 Начинаем передачу лида в системы...');
      
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
   * Подготовка данных пользователя для передачи
   */
  prepareUserData(ctx) {
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
      sessionDuration: Date.now() - ctx.session.startTime
    };
  }

  /**
   * Безопасная отправка сообщения об ошибке
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

  /**
   * Отладочные команды
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
      components: {
        survey_questions: !!this.surveyQuestions,
        verse_analysis: !!this.verseAnalysis,
        lead_transfer: !!this.leadTransfer
      },
      session_info: ctx.session ? {
        has_session: true,
        current_question: ctx.session.currentQuestion,
        answers_count: Object.keys(ctx.session.answers || {}).length,
        completed_count: (ctx.session.completedQuestions || []).length
      } : { has_session: false }
    };
    
    await ctx.reply(`🔧 *Debug Info:*\n\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\``, {
      parse_mode: 'Markdown'
    });
  }

  async handleResetCommand(ctx) {
    ctx.session = {
      currentQuestion: null,
      answers: {},
      multipleChoiceSelections: {},
      startTime: Date.now(),
      questionStartTime: Date.now(),
      completedQuestions: []
    };
    
    await ctx.reply('🔄 Сессия сброшена. Начните заново: /start');
  }

  /**
   * Показ статистики для администратора
   */
  async showStats(ctx) {
    try {
      const stats = await this.leadTransfer.getTransferStats('24h');
      
      const statsMessage = `📊 *Статистика за 24 часа:*

👤 *Пользователи:*
• Начали анкету: ${stats?.started || 'N/A'}
• Завершили анкету: ${stats?.completed || 'N/A'}
• Конверсия: ${stats?.conversion_rate || 'N/A'}%

🎯 *Сегментация лидов:*
• 🔥 HOT: ${stats?.segments?.hot || 0}
• ⭐ WARM: ${stats?.segments?.warm || 0}
• ❄️ COLD: ${stats?.segments?.cold || 0}
• 🌱 NURTURE: ${stats?.segments?.nurture || 0}

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

  /**
   * Показ статуса здоровья системы
   */
  async showHealthStatus(ctx) {
    try {
      const healthStatus = await this.leadTransfer.healthCheck();
      
      const statusEmoji = {
        true: '✅',
        false: '❌',
        'not_configured': '⚠️'
      };
      
      const healthMessage = `🏥 *Статус системы:*

🤖 *Основной бот:* ${statusEmoji[healthStatus.mainBot]} ${healthStatus.mainBot ? 'Доступен' : 'Недоступен'}

📊 *CRM интеграция:* ${statusEmoji[healthStatus.crm]} ${
        healthStatus.crm === true ? 'Работает' : 
        healthStatus.crm === 'not_configured' ? 'Не настроено' : 'Ошибка'
      }

🔧 *Версия бота:* 1.0.0
📅 *Время работы:* ${this.getUptime()}
💾 *Память:* ${this.getMemoryUsage()}

🕐 *Проверено:* ${new Date().toLocaleString('ru-RU')}`;

      await ctx.reply(healthMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Ошибка проверки здоровья:', error);
      await ctx.reply('❌ Ошибка проверки статуса системы');
    }
  }

  /**
   * Генерация прогресс-бара
   */
  generateProgressBar(percentage) {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    return '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);
  }

  /**
   * Получение текста для отображения выбора
   */
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
      'individual': 'Индивидуальные консультации'
    };
    
    return displayTexts[selection] || selection;
  }

  /**
   * Проверка является ли пользователь администратором
   */
  isAdmin(userId) {
    return config.ADMIN_ID && userId.toString() === config.ADMIN_ID.toString();
  }

  /**
   * Уведомление администратора об ошибке
   */
  async notifyAdminAboutError(error, ctx) {
    if (!config.ADMIN_ID) return;
    
    try {
      const errorMessage = `🚨 *Ошибка в лид-боте:*\n\n` +
        `👤 Пользователь: ${ctx?.from?.id}\n` +
        `📝 Тип: ${error.name}\n` +
        `💬 Сообщение: ${error.message}\n` +
        `🕐 Время: ${new Date().toLocaleString('ru-RU')}`;
      
      await this.bot.telegram.sendMessage(config.ADMIN_ID, errorMessage, {
        parse_mode: 'Markdown'
      });
    } catch (adminError) {
      console.error('❌ Не удалось уведомить администратора:', adminError);
    }
  }

  /**
   * Получение времени работы бота
   */
  getUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}ч ${minutes}м`;
  }

  /**
   * Получение использования памяти
   */
  getMemoryUsage() {
    const used = process.memoryUsage();
    const mb = Math.round(used.heapUsed / 1024 / 1024);
    return `${mb} MB`;
  }

  /**
   * Вспомогательная функция задержки
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Запуск бота
   */
  launch() {
    console.log('🤖 Запускаем лидогенерирующего бота...');
    
    // Проверяем конфигурацию при запуске
    this.validateConfiguration();
    
    this.bot.launch({
      webhook: process.env.NODE_ENV === 'production' ? {
        domain: config.APP_URL,
        port: config.PORT
      } : undefined
    });

    console.log('✅ Бот запущен успешно!');
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    
    // Graceful shutdown
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  /**
   * Валидация конфигурации при запуске
   */
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
