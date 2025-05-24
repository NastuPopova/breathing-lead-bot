// Файл: lead_bot/index.js
// Главный файл лидогенерирующего бота для дыхательных практик

const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');
const ExtendedSurveyQuestions = require('./modules/survey/extended_questions');
const BreathingVERSEAnalysis = require('./modules/analysis/verse_analysis');
const LeadTransferSystem = require('./modules/integration/lead_transfer');

class BreathingLeadBot {
  constructor() {
    this.bot = new Telegraf(config.LEAD_BOT_TOKEN);
    this.surveyQuestions = new ExtendedSurveyQuestions();
    this.verseAnalysis = new BreathingVERSEAnalysis();
    this.leadTransfer = new LeadTransferSystem();
    
    this.setupMiddleware();
    this.setupHandlers();
    this.setupErrorHandling();
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

    // Логирование
    this.bot.use((ctx, next) => {
      console.log(`[${new Date().toISOString()}] User ${ctx.from.id}: ${ctx.message?.text || ctx.callbackQuery?.data || 'callback'}`);
      return next();
    });
  }

  setupHandlers() {
    // Команда /start
    this.bot.start(async (ctx) => {
      await this.handleStart(ctx);
    });

    // Админские команды
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

    // Обработка callback_query (нажатия кнопок)
    this.bot.on('callback_query', async (ctx) => {
      await this.handleCallback(ctx);
    });

    // Обработка текстовых сообщений
    this.bot.on('text', async (ctx) => {
      await this.handleTextMessage(ctx);
    });
  }

  setupErrorHandling() {
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      ctx.reply('😔 Произошла ошибка. Попробуйте начать заново с команды /start');
    });
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

    // Приветственное сообщение
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
   * Обработка нажатий на кнопки
   */
  async handleCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    
    await ctx.answerCbQuery(); // Убираем "часики" с кнопки

    if (callbackData === 'start_survey') {
      await this.startSurvey(ctx);
    } else if (callbackData === 'about_survey') {
      await this.showSurveyInfo(ctx);
    } else if (callbackData.startsWith('contact_') || 
               ['back_to_start', 'back_to_results', 'back_to_contact_choice'].includes(callbackData)) {
      await this.handleContactCollection(ctx, callbackData);
    } else {
      // Обработка ответов на вопросы анкеты
      await this.handleSurveyAnswer(ctx, callbackData);
    }
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

    await ctx.editMessageText(infoMessage, {
      parse_mode: 'Markdown',
      ...keyboard
    });
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
   * Задать вопрос пользователю
   */
  async askQuestion(ctx, questionId) {
    const question = this.surveyQuestions.getQuestion(questionId);
    
    if (!question) {
      console.error('Вопрос не найден:', questionId);
      return await this.completeSurvey(ctx);
    }

    // Проверяем условие показа вопроса (для адаптивных)
    if (!this.surveyQuestions.shouldShowQuestion(questionId, ctx.session.answers)) {
      console.log('Пропускаем вопрос по условию:', questionId);
      return await this.moveToNextQuestion(ctx);
    }

    const progress = this.surveyQuestions.getProgress(
      ctx.session.completedQuestions, 
      ctx.session.answers
    );

    const progressBar = this.generateProgressBar(progress.percentage);
    
    const messageText = `${progressBar} *${progress.completed}/${progress.total}*

${question.text}`;

    // Для множественного выбора показываем текущие выборы
    if (question.type === 'multiple_choice') {
      const currentSelections = ctx.session.multipleChoiceSelections[questionId] || [];
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
    } catch (error) {
      // Если не удалось отредактировать, отправляем новое сообщение
      await ctx.reply(messageText, {
        parse_mode: 'Markdown',
        ...question.keyboard
      });
    }
  }

  /**
   * Обработка ответа на вопрос анкеты
   */
  async handleSurveyAnswer(ctx, callbackData) {
    const currentQuestionId = ctx.session.currentQuestion;
    
    if (!currentQuestionId) {
      return await this.handleStart(ctx);
    }

    const question = this.surveyQuestions.getQuestion(currentQuestionId);
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
    ctx.session.completedQuestions.push(currentQuestionId);

    console.log('✅ Ответ сохранен:', currentQuestionId, '=', mappedValue);

    // Переходим к следующему вопросу
    await this.moveToNextQuestion(ctx);
  }

  /**
   * Обработка множественного выбора
   */
  async handleMultipleChoice(ctx, questionId, value, callbackData) {
    const question = this.surveyQuestions.getQuestion(questionId);
    
    // Инициализируем массив выборов если нужно
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
      ctx.session.completedQuestions.push(questionId);
      
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
  }

  /**
   * Переход к следующему вопросу
   */
  async moveToNextQuestion(ctx) {
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
  }

  /**
   * Завершение анкеты и анализ результатов
   */
  async completeSurvey(ctx) {
    console.log('🏁 Анкета завершена, начинаем анализ...');

    // Показываем сообщение об анализе
    const analysisMessage = `🧠 *Анализирую ваши ответы...*

Анастасия изучает ваш профиль и подбирает персональные рекомендации.

Это займет несколько секунд... ⏳`;

    await ctx.editMessageText(analysisMessage, { parse_mode: 'Markdown' });

    // Имитируем время анализа
    await this.delay(config.ANALYSIS_DELAY_SECONDS * 1000);

    try {
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
      console.error('Ошибка анализа:', error);
      await ctx.editMessageText(
        '😔 Произошла ошибка при анализе. Анастасия свяжется с вами лично для подбора программы.',
        { parse_mode: 'Markdown' }
      );
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
   * Показ результатов анализа
   */
  async showAnalysisResults(ctx, analysisResult) {
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
  }

  /**
   * Обработка сбора контактов
   */
  async handleContactCollection(ctx, callbackData) {
    if (callbackData === 'contact_request') {
      await this.requestContactInfo(ctx);
    } else if (callbackData === 'program_details') {
      await this.showProgramDetails(ctx);
    } else if (callbackData === 'free_materials') {
      await this.showFreeMaterials(ctx);
    } else {
      // Обработка дополнительных callback'ов
      await this.handleAdditionalCallbacks(ctx, callbackData);
    }
  }

  /**
   * Запрос контактной информации
   */
  async requestContactInfo(ctx) {
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
  }

  /**
   * Обработка ввода контактной информации
   */
  async handleContactInput(ctx, contactType) {
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
  }

  /**
   * Валидация и сохранение контактной информации
   */
  async validateAndSaveContact(ctx, contactValue) {
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
  }

  /**
   * Сохранение контакта и завершение процесса
   */
  async saveContactAndFinish(ctx, contactType, contactValue) {
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
  }

  /**
   * Показ деталей программы
   */
  async showProgramDetails(ctx) {
    const analysisResult = ctx.session.analysisResult;
    
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
  }

  /**
   * Показ бесплатных материалов
   */
  async showFreeMaterials(ctx) {
    const analysisResult = ctx.session.analysisResult;
    
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
  }

  /**
   * Обработка текстовых сообщений
   */
  async handleTextMessage(ctx) {
    // Если ожидаем ввод контактной информации
    if (ctx.session.awaitingContact && ctx.session.contactType) {
      const success = await this.validateAndSaveContact(ctx, ctx.message.text.trim());
      return; // Обработка завершена в validateAndSaveContact
    }

    // Если пользователь в процессе анкеты
    if (ctx.session.currentQuestion) {
      await ctx.reply('Пожалуйста, используйте кнопки для ответов на вопросы 😊');
    } else {
      await ctx.reply('Напишите /start чтобы начать диагностику дыхания 🌬️');
    }
  }

  /**
   * Обработка дополнительных callback'ов
   */
  async handleAdditionalCallbacks(ctx, callbackData) {
    switch (callbackData) {
      case 'back_to_start':
        await this.handleStart(ctx);
        break;
        
      case 'back_to_results':
        if (ctx.session.analysisResult) {
          await this.showAnalysisResults(ctx, ctx.session.analysisResult);
        } else {
          await this.handleStart(ctx);
        }
        break;
        
      case 'contact_phone':
        await this.handleContactInput(ctx, 'phone');
        break;
        
      case 'contact_email':
        await this.handleContactInput(ctx, 'email');
        break;
        
      case 'contact_telegram':
        await this.handleContactInput(ctx, 'telegram');
        break;
        
      case 'back_to_contact_choice':
        await this.requestContactInfo(ctx);
        break;
        
      default:
        await ctx.answerCbQuery('Неизвестная команда');
        break;
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
    // Простой маппинг для отображения выборов
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
   * Показ статистики для администратора
   */
  async showStats(ctx) {
    try {
      // Получаем статистику через интеграцию
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
• Активных сессий: ${this.getActiveSessions()}

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
   * Получение количества активных сессий
   */
  getActiveSessions() {
    // В реальном приложении это можно получать из Redis или базы данных
    return 'N/A';
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
    console.log('📋 Анкета содержит', Object.keys(this.surveyQuestions.questions).length, 'вопросов');
    console.log('🧠 VERSE-анализ готов к работе');
    console.log('🔄 Система интеграций настроена');
    
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
    
    if (config.ADMIN_ID) {
      console.log(`👑 Администратор: ${config.ADMIN_ID}`);
    }
    
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
    
    // Предупреждения об опциональных переменных
    const optional = ['MAIN_BOT_API_URL', 'ADMIN_ID', 'CRM_WEBHOOK_URL'];
    const optionalMissing = optional.filter(key => !process.env[key]);
    
    if (optionalMissing.length > 0) {
      console.log('⚠️ Не настроены опциональные переменные:');
      optionalMissing.forEach(key => console.log(`   - ${key}`));
    }
  }
}

// Создаем и запускаем бота
const leadBot = new BreathingLeadBot();
leadBot.launch();