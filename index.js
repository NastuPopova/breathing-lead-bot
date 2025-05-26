const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

let ExtendedSurveyQuestions, BreathingVERSEAnalysis, LeadTransferSystem, PDFBonusManager, AdminNotificationSystem;
try {
  ExtendedSurveyQuestions = require('./modules/survey/extended_questions');
  BreathingVERSEAnalysis = require('./modules/analysis/verse_analysis');
  LeadTransferSystem = require('./modules/integration/lead_transfer');
  PDFBonusManager = require('./modules/bonus/pdf_manager');
  AdminNotificationSystem = require('./modules/admin/notifications');
  console.log('✅ Все модули загружены успешно');
} catch (error) {
  console.error('❌ Ошибка загрузки модулей:', error.message);
  process.exit(1);
}

class BreathingLeadBot {
  constructor() {
    this.bot = new Telegraf(config.LEAD_BOT_TOKEN);
    this.surveyQuestions = new ExtendedSurveyQuestions();
    this.verseAnalysis = new BreathingVERSEAnalysis();
    this.leadTransfer = new LeadTransferSystem();
    this.pdfManager = new PDFBonusManager();
    this.adminNotifications = new AdminNotificationSystem(this.bot);

    this.setupMiddleware();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.bot.use(session({
      defaultSession: () => ({
        currentQuestion: null,
        answers: {},
        multipleChoiceSelections: {},
        startTime: Date.now(),
        questionStartTime: Date.now(),
        completedQuestions: [],
        navigationHistory: []
      })
    }));

    this.bot.use(async (ctx, next) => {
      const messageText = ctx.message?.text || ctx.callbackQuery?.data || 'callback';
      console.log(`[${new Date().toISOString()}] User ${ctx.from?.id || 'unknown'}: ${messageText}`);

      if (!ctx.session) {
        console.warn('⚠️ Сессия отсутствует, инициализируем новую');
        ctx.session = this.getDefaultSession();
      }
      return next();
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
      navigationHistory: []
    };
  }

  setupHandlers() {
    this.bot.start(ctx => this.handleStart(ctx));
    this.bot.command('reset', ctx => this.handleReset(ctx));
    this.bot.command('help', ctx => this.handleHelp(ctx));
    this.bot.command('about', ctx => this.handleAbout(ctx));
    this.bot.command('contact', ctx => this.handleContact(ctx));
    this.bot.action(/^download_(.+)$/, ctx => this.handlePDFDownload(ctx));
    this.bot.action(/^download_pdf_(.+)$/, ctx => this.handleAdditionalPDFDownload(ctx));
    this.bot.action('more_materials', ctx => this.handleMoreMaterials(ctx));
    this.bot.action('pdf_error_retry', ctx => this.handlePDFRetry(ctx));
    this.bot.command('pdf_stats', ctx => this.handleAdminPDFStats(ctx));
    this.bot.command('test_pdf', ctx => this.handleTestPDF(ctx));
    this.bot.action(/^admin_(.+)_(\d+)$/, ctx => this.handleAdminAction(ctx));
    this.bot.on('callback_query', ctx => this.handleCallback(ctx));
    this.bot.on('text', ctx => this.handleText(ctx));
  }

  setupErrorHandling() {
    this.bot.catch(async (err, ctx) => {
      console.error('💥 Ошибка бота:', err);
      await this.sendErrorMessage(ctx, 'Произошла ошибка. Попробуйте /start');
    });
  }

  async handleStart(ctx) {
    try {
      ctx.session = this.getDefaultSession();
      const welcomeMessage = `🌬️ *Добро пожаловать в диагностику дыхания!*\n\n` +
        `Привет, ${ctx.from.first_name}! Я помогу подобрать техники дыхания.\n` +
        `За 4-5 минут определим ваши потребности и дадим рекомендации.\n\n` +
        `*Новое:* кнопка "⬅️ Назад" для удобства!`;

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🚀 Начать', 'start_survey')],
          [Markup.button.callback('ℹ️ Подробнее', 'about_survey')]
        ])
      });
    } catch (error) {
      console.error('❌ Ошибка /start:', error);
      await this.sendErrorMessage(ctx, 'Ошибка запуска');
    }
  }

  async handleReset(ctx) {
    try {
      ctx.session = this.getDefaultSession();
      await ctx.reply('🔄 Сессия сброшена. Начните заново: /start');
    } catch (error) {
      console.error('❌ Ошибка /reset:', error);
      await this.sendErrorMessage(ctx, 'Ошибка сброса');
    }
  }

  async handleHelp(ctx) {
    const helpMessage = `🌬️ *ПОМОЩЬ ПО ДИАГНОСТИКЕ ДЫХАНИЯ*\n\n` +
      `🚀 */start* - Начать диагностику дыхания\n` +
      `🔄 */reset* - Сбросить и начать заново\n` +
      `❓ */help* - Показать эту справку\n\n` +
      `📋 *О диагностике:*\n` +
      `• 4-7 минут персональной анкеты\n` +
      `• Анализ по методу VERSE\n` +
      `• Бесплатные PDF-гиды с техниками\n` +
      `• Персональные рекомендации\n` +
      `• Детская версия для родителей\n\n` +
      `👩‍⚕️ *Тренер:* Анастасия Попова\n` +
      `💬 *Личный контакт:* @NastuPopova`;

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Начать диагностику', 'start_survey')],
        [Markup.button.url('💬 Написать тренеру', 'https://t.me/NastuPopova')]
      ])
    });
  }

  async handleAbout(ctx) {
    const aboutMessage = `🌬️ *ДЫХАТЕЛЬНЫЕ ПРАКТИКИ*\n\n` +
      `Дыхание — единственная функция организма, которой мы можем управлять сознательно. ` +
      `Правильные техники помогают:\n\n` +
      `🔥 *Срочно:*\n` +
      `• Снять стресс за 2-3 минуты\n` +
      `• Справиться с паникой\n` +
      `• Быстро заснуть\n\n` +
      `🎯 *Долгосрочно:*\n` +
      `• Нормализовать давление\n` +
      `• Улучшить сон и энергию\n` +
      `• Повысить концентрацию\n` +
      `• Укрепить иммунитет\n\n` +
      `📚 Методы основаны на работах К.П. Бутейко, А.Н. Стрельниковой и современных исследованиях.`;

    await ctx.reply(aboutMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Пройти диагностику', 'start_survey')],
        [Markup.button.callback('📞 Консультация', 'contact_request')]
      ])
    });
  }

  async handleContact(ctx) {
    await this.handleContactRequest(ctx);
  }

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    try {
      if (!ctx.session.answers) {
        console.warn('⚠️ Answers отсутствует, перезапускаем');
        return this.handleStart(ctx);
      }

      if (data === 'nav_back') {
        await this.handleBackNavigation(ctx);
      } else if (data === 'start_survey') {
        await this.startSurvey(ctx);
      } else if (data === 'about_survey') {
        await this.showSurveyInfo(ctx);
      } else if (data === 'contact_request') {
        await this.handleContactRequest(ctx);
      } else if (data === 'back_to_start') {
        await this.handleStart(ctx);
      } else if (data === 'back_to_results') {
        await this.showResults(ctx);
      } else {
        await this.handleSurveyAnswer(ctx, data);
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ Ошибка callback:', error, { data });
      await this.sendErrorMessage(ctx, 'Ошибка обработки');
    }
  }

  async handleAdminAction(ctx) {
    const action = ctx.match[1];
    const targetUserId = ctx.match[2];
    await this.adminNotifications.handleAdminCallback(ctx, action, targetUserId);
    await ctx.answerCbQuery();
  }

  async handleContactRequest(ctx) {
    try {
      const contactMessage = config.MESSAGES.CONTACT_TRAINER;
      
      await ctx.editMessageText(contactMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('👩‍⚕️ Написать Анастасии', `https://t.me/${config.TRAINER_CONTACT.replace('@', '')}`)],
          [Markup.button.callback('🔙 К результатам', 'back_to_results')],
          [Markup.button.callback('🎁 Материалы', 'more_materials')]
        ])
      });
    } catch (error) {
      console.error('❌ Ошибка handleContactRequest:', error);
      await ctx.reply(config.MESSAGES.CONTACT_TRAINER, { parse_mode: 'Markdown' });
    }
  }

  async showResults(ctx) {
    try {
      if (!ctx.session.analysisResult) {
        return this.handleStart(ctx);
      }

      const bonus = this.pdfManager.getBonusForUser(
        ctx.session.analysisResult, 
        ctx.session.answers
      );
      
      const message = this.pdfManager.generateBonusMessage(bonus, ctx.session.analysisResult);
      const keyboard = this.pdfManager.generateBonusKeyboard(bonus, 'file');

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Автоматическая отправка для HOT_LEAD через 2 секунды
      if (ctx.session.analysisResult.segment === 'HOT_LEAD') {
        setTimeout(async () => {
          try {
            await this.pdfManager.sendPDFFile(ctx, bonus);
            this.pdfManager.logBonusDelivery(
              ctx.from.id,
              bonus.id,
              'file',
              ctx.session.analysisResult.segment,
              ctx.session.analysisResult.primaryIssue
            );
          } catch (error) {
            console.error('❌ Ошибка автоматической отправки PDF для HOT_LEAD:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Ошибка showResults:', error);
      await this.sendErrorMessage(ctx, 'Ошибка показа результатов');
    }
  }

  async handleBackNavigation(ctx) {
    try {
      const currentQuestion = ctx.session.currentQuestion;
      if (!currentQuestion) {
        console.log('⚠️ Нет текущего вопроса');
        return this.handleStart(ctx);
      }

      const previousQuestion = this.surveyQuestions.getPreviousQuestion(
        currentQuestion,
        ctx.session.answers
      );

      if (!previousQuestion) {
        await ctx.reply('Вы в начале анкеты! Нажмите /start');
        return;
      }

      if (ctx.session.answers[currentQuestion]) {
        delete ctx.session.answers[currentQuestion];
      }
      if (ctx.session.multipleChoiceSelections[currentQuestion]) {
        delete ctx.session.multipleChoiceSelections[currentQuestion];
      }
      const index = ctx.session.completedQuestions.indexOf(currentQuestion);
      if (index !== -1) {
        ctx.session.completedQuestions.splice(index, 1);
      }

      ctx.session.currentQuestion = previousQuestion;
      ctx.session.questionStartTime = Date.now();
      await this.askQuestion(ctx, previousQuestion);
    } catch (error) {
      console.error('❌ Ошибка навигации назад:', error);
      await this.sendErrorMessage(ctx, 'Ошибка навигации');
    }
  }

  async startSurvey(ctx) {
    try {
      ctx.session.currentQuestion = 'age_group';
      ctx.session.questionStartTime = Date.now();
      await this.askQuestion(ctx, 'age_group');
    } catch (error) {
      console.error('❌ Ошибка startSurvey:', error);
      await this.sendErrorMessage(ctx, 'Ошибка начала анкеты');
    }
  }

  async showSurveyInfo(ctx) {
    try {
      const infoMessage = `📋 *О диагностике:*\n\n` +
        `🔍 18+ вопросов о здоровье и целях\n` +
        `👶 Детская версия для родителей\n` +
        `🧠 Анализ VERSE от экспертов\n` +
        `🎯 Персональные рекомендации\n` +
        `⏱️ 4-7 минут\n` +
        `🔒 Конфиденциально\n` +
        `💝 Бесплатно`;

      await ctx.editMessageText(infoMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🚀 Начать', 'start_survey')],
          [Markup.button.callback('🔙 Назад', 'back_to_start')]
        ])
      });
    } catch (error) {
      console.error('❌ Ошибка showSurveyInfo:', error);
      await ctx.reply(infoMessage, { parse_mode: 'Markdown' });
    }
  }

  async askQuestion(ctx, questionId) {
    try {
      if (!ctx.session?.answers) {
        console.warn('⚠️ Нет answers, перезапуск');
        return this.handleStart(ctx);
      }

      const question = this.surveyQuestions.getQuestion(questionId);
      if (!question) {
        console.error('❌ Вопрос не найден:', questionId);
        return this.completeSurvey(ctx);
      }

      if (!this.surveyQuestions.shouldShowQuestion(questionId, ctx.session.answers)) {
        console.log(`🔍 Условие для "${questionId}": false`);
        return this.moveToNextQuestion(ctx);
      }

      const progress = this.surveyQuestions.getProgress(
        ctx.session.completedQuestions,
        ctx.session.answers
      );

      let message = `${this.generateProgressBar(progress.percentage)} *${progress.completed}/${progress.total}*\n\n${question.text}`;

      if (question.type === 'multiple_choice') {
        const selections = ctx.session.multipleChoiceSelections[questionId] || [];
        if (selections.length > 0) {
          const translatedSelections = this.getTranslatedSelections(selections);
          message += `\n\n*Выбрано (${selections.length}):*\n${translatedSelections.map(s => `• ${s}`).join('\n')}`;
        }
      }

      if (this.surveyQuestions.isChildFlow(ctx.session.answers)) {
        message += `\n\n👶 *Детская версия*`;
      }

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
      } catch {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
      }
    } catch (error) {
      console.error('❌ Ошибка askQuestion:', error);
      await this.sendErrorMessage(ctx, 'Ошибка вопроса');
    }
  }

  getTranslatedSelections(selections) {
    return selections.map(selection => {
      return config.TRANSLATIONS[selection] || selection;
    });
  }

  async handleSurveyAnswer(ctx, callbackData) {
    try {
      const questionId = ctx.session.currentQuestion;
      if (!questionId || !ctx.session.answers) {
        console.warn('⚠️ Нет вопроса/ответов');
        return this.handleStart(ctx);
      }

      const question = this.surveyQuestions.getQuestion(questionId);
      if (!question) {
        console.error('❌ Вопрос не найден:', questionId);
        return this.handleStart(ctx);
      }

      if (questionId === 'stress_level') {
        this.debugStressLevelCallback(ctx, callbackData);
      }

      const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
      console.log(`🔍 Сохранено для "${questionId}": ${mappedValue}`);
      
      if (mappedValue === undefined || mappedValue === null) {
        console.error('❌ Неверный callback:', callbackData);
        await ctx.answerCbQuery('Ошибка ответа', { show_alert: true });
        return;
      }

      if (question.type === 'multiple_choice') {
        return this.handleMultipleChoice(ctx, questionId, mappedValue, callbackData);
      }

      const validation = this.surveyQuestions.validateAnswer(questionId, callbackData);
      if (!validation.valid) {
        await ctx.answerCbQuery(validation.error, { show_alert: true });
        return;
      }

      ctx.session.answers[questionId] = mappedValue;
      console.log(`🔍 Текущие ответы:`, ctx.session.answers);
      if (!ctx.session.completedQuestions.includes(questionId)) {
        ctx.session.completedQuestions.push(questionId);
      }

      if (questionId === 'stress_level') {
        const stressLevel = mappedValue;
        let feedbackMessage = `✅ Вы выбрали уровень стресса: ${stressLevel}`;
        if (validation.warning) {
          feedbackMessage += `\n${validation.warning}`;
        }
        await ctx.answerCbQuery(feedbackMessage, { show_alert: true });
      }

      await this.moveToNextQuestion(ctx);
    } catch (error) {
      console.error('❌ Ошибка handleSurveyAnswer:', error);
      await this.sendErrorMessage(ctx, 'Ошибка ответа');
    }
  }

  async handleMultipleChoice(ctx, questionId, value, callbackData) {
    try {
      if (!ctx.session.multipleChoiceSelections[questionId]) {
        ctx.session.multipleChoiceSelections[questionId] = [];
      }
      const selections = ctx.session.multipleChoiceSelections[questionId];

      if (callbackData.includes('done')) {
        const validation = this.surveyQuestions.validateAnswer(questionId, 'done', selections);
        if (!validation.valid) {
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }
        ctx.session.answers[questionId] = [...selections];
        if (!ctx.session.completedQuestions.includes(questionId)) {
          ctx.session.completedQuestions.push(questionId);
        }
        return this.moveToNextQuestion(ctx);
      }

      const index = selections.indexOf(value);
      if (index > -1) {
        selections.splice(index, 1);
        const translatedValue = config.TRANSLATIONS[value] || value;
        await ctx.answerCbQuery(`❌ Убрано: ${translatedValue}`);
      } else {
        const validation = this.surveyQuestions.validateAnswer(questionId, value, selections);
        if (!validation.valid) {
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }
        selections.push(value);
        const translatedValue = config.TRANSLATIONS[value] || value;
        await ctx.answerCbQuery(`✅ Добавлено: ${translatedValue}`);
      }
      
      await this.askQuestion(ctx, questionId);
    } catch (error) {
      console.error('❌ Ошибка handleMultipleChoice:', error);
      await this.sendErrorMessage(ctx, 'Ошибка выбора');
    }
  }

  async moveToNextQuestion(ctx) {
    try {
      const nextQuestion = this.surveyQuestions.getNextQuestion(
        ctx.session.currentQuestion,
        ctx.session.answers
      );

      if (!nextQuestion) {
        return this.completeSurvey(ctx);
      }

      ctx.session.currentQuestion = nextQuestion;
      ctx.session.questionStartTime = Date.now();
      await this.askQuestion(ctx, nextQuestion);
    } catch (error) {
      console.error('❌ Ошибка moveToNextQuestion:', error);
      await this.sendErrorMessage(ctx, 'Ошибка перехода');
    }
  }

  async completeSurvey(ctx) {
    try {
      const surveyTime = (Date.now() - ctx.session.startTime) / 1000;
      console.log(`📊 Анкета завершена за ${surveyTime} сек`, ctx.session.answers);

      const analysisResult = this.verseAnalysis.analyze(ctx.session.answers);
      ctx.session.analysisResult = analysisResult;

      await this.leadTransfer.transferLead({
        telegram_id: ctx.from.id,
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        answers: ctx.session.answers,
        survey_type: analysisResult.analysisType,
        segment: analysisResult.segment,
        score: analysisResult.score,
        primary_issue: analysisResult.primaryIssue
      });

      await this.showResults(ctx);
    } catch (error) {
      console.error('❌ Ошибка completeSurvey:', error);
      await this.sendErrorMessage(ctx, 'Ошибка завершения');
    }
  }

  async handlePDFDownload(ctx) {
    try {
      if (!ctx.session.analysisResult) {
        await ctx.reply('⚠️ Пройдите анкету заново: /start');
        return;
      }

      const bonus = this.pdfManager.getBonusForUser(
        ctx.session.analysisResult,
        ctx.session.answers
      );

      await this.pdfManager.sendPDFFile(ctx, bonus);
      this.pdfManager.logBonusDelivery(
        ctx.from.id,
        bonus.id,
        'file',
        ctx.session.analysisResult.segment,
        ctx.session.analysisResult.primaryIssue
      );
    } catch (error) {
      console.error('❌ Ошибка handlePDFDownload:', error);
      await ctx.reply('⚠️ Ошибка загрузки PDF. Попробуйте снова:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Повторить', 'pdf_error_retry')]
        ])
      });
    }
  }

  async handleAdditionalPDFDownload(ctx) {
    try {
      const pdfType = ctx.match[1];
      await this.pdfManager.sendAdditionalPDF(ctx, pdfType);
    } catch (error) {
      console.error('❌ Ошибка handleAdditionalPDFDownload:', error);
      await ctx.reply('⚠️ Ошибка загрузки PDF. Свяжитесь с @NastuPopova.', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
        ])
      });
    }
  }

  async handleMoreMaterials(ctx) {
    try {
      await this.pdfManager.showMoreMaterials(ctx);
    } catch (error) {
      console.error('❌ Ошибка handleMoreMaterials:', error);
      await ctx.reply('⚠️ Ошибка загрузки материалов. Свяжитесь с @NastuPopova.', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
        ])
      });
    }
  }

  async handlePDFRetry(ctx) {
    try {
      if (!ctx.session.analysisResult) {
        await ctx.reply('⚠️ Пройдите анкету заново: /start');
        return;
      }

      const bonus = this.pdfManager.getBonusForUser(
        ctx.session.analysisResult,
        ctx.session.answers
      );

      await this.pdfManager.sendPDFFile(ctx, bonus);
      this.pdfManager.logBonusDelivery(
        ctx.from.id,
        bonus.id,
        'file',
        ctx.session.analysisResult.segment,
        ctx.session.analysisResult.primaryIssue
      );
    } catch (error) {
      console.error('❌ Ошибка handlePDFRetry:', error);
      await ctx.reply('⚠️ Ошибка повторной загрузки PDF. Свяжитесь с @NastuPopova.', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
        ])
      });
    }
  }

  async handleAdminPDFStats(ctx) {
    try {
      const stats = this.pdfManager.getBonusStats();
      let message = `📊 *Статистика PDF-бонусов*\n\n`;
      message += `📥 Всего доставлено: ${stats.delivery_count}\n`;
      message += `📱 Минималистичных: ${stats.minimalist_count}\n`;
      message += `📋 Доступно техник: ${stats.available_techniques}\n\n`;
      message += `📉 По проблемам:\n`;
      for (const [issue, count] of Object.entries(stats.issue_breakdown)) {
        message += `• ${config.TRANSLATIONS[issue] || issue}: ${count}\n`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Ошибка handleAdminPDFStats:', error);
      await ctx.reply('⚠️ Ошибка статистики');
    }
  }

  async handleTestPDF(ctx) {
    try {
      const testAnalysis = {
        analysisType: 'adult',
        segment: 'WARM_LEAD',
        score: 60,
        primaryIssue: 'chronic_stress'
      };
      const testAnswers = {
        age_group: '30-45',
        stress_level: 7,
        current_problems: ['chronic_stress', 'insomnia']
      };

      ctx.session.analysisResult = testAnalysis;
      ctx.session.answers = testAnswers;

      const bonus = this.pdfManager.getBonusForUser(testAnalysis, testAnswers);
      await this.pdfManager.sendPDFFile(ctx, bonus);

      this.pdfManager.logBonusDelivery(
        ctx.from.id,
        bonus.id,
        'file',
        testAnalysis.segment,
        testAnalysis.primaryIssue
      );
    } catch (error) {
      console.error('❌ Ошибка handleTestPDF:', error);
      await ctx.reply('⚠️ Ошибка теста PDF');
    }
  }

  async handleText(ctx) {
    try {
      if (!ctx.session.currentQuestion) {
        await ctx.reply('Нажмите /start, чтобы начать диагностику!');
        return;
      }

      await ctx.reply('Пожалуйста, используйте кнопки для ответа.');
    } catch (error) {
      console.error('❌ Ошибка handleText:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки текста');
    }
  }

  async sendErrorMessage(ctx, message) {
    try {
      await ctx.reply(`${message}\n\nПопробуйте /start или свяжитесь с @NastuPopova`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Перезапустить', 'back_to_start')]
        ])
      });
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения об ошибке:', error);
    }
  }

  generateProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `📊 [${'█'.repeat(filled)}${'-'.repeat(empty)}] ${percentage}%`;
  }

  debugStressLevelCallback(ctx, callbackData) {
    console.log('🔍 Callback стресс-уровня:', {
      user_id: ctx.from.id,
      callback_data: callbackData,
      session_answers: ctx.session.answers,
      current_question: ctx.session.currentQuestion
    });
  }

  start() {
    this.bot.launch();
    console.log('🤖 Бот запущен!');
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}

const bot = new BreathingLeadBot();
bot.start();

module.exports = BreathingLeadBot;
