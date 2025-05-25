// Файл: lead_bot/index.js
// Обновленная версия с исправлением формирования userData и улучшенной логикой

const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

let ExtendedSurveyQuestions, BreathingVERSEAnalysis, LeadTransferSystem;
try {
  ExtendedSurveyQuestions = require('./modules/survey/extended_questions');
  BreathingVERSEAnalysis = require('./modules/analysis/verse_analysis');
  LeadTransferSystem = require('./modules/integration/lead_transfer');
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

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    try {
      await ctx.answerCbQuery();
      if (!ctx.session.answers) {
        console.warn('⚠️ Answers отсутствует, перезапускаем');
        return this.handleStart(ctx);
      }

      if (data === 'nav_back') {
        return this.handleBackNavigation(ctx);
      }
      if (data === 'start_survey') {
        return this.startSurvey(ctx);
      }
      if (data === 'about_survey') {
        return this.showSurveyInfo(ctx);
      }
      return this.handleSurveyAnswer(ctx, data);
    } catch (error) {
      console.error('❌ Ошибка callback:', error, { data });
      await this.sendErrorMessage(ctx, 'Ошибка обработки');
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

      console.log('🔍 Проверка childFlow:', this.surveyQuestions.isChildFlow(ctx.session.answers));
      if (!this.surveyQuestions.shouldShowQuestion(questionId, ctx.session.answers)) {
        console.log(`🔍 Условие для "${questionId}": false`);
        return this.moveToNextQuestion(ctx);
      }

      const progress = this.surveyQuestions.getProgress(
        ctx.session.completedQuestions,
        ctx.session.answers
      );
      console.log(`🔍 Общее количество вопросов: ${progress.total}`);
      console.log(`🔍 Прогресс: ${progress.completed}/${progress.total} (${progress.percentage}%)`);

      let message = `${this.generateProgressBar(progress.percentage)} *${progress.completed}/${progress.total}*\n\n${question.text}`;

      if (question.type === 'multiple_choice') {
        const selections = ctx.session.multipleChoiceSelections[questionId] || [];
        if (selections.length) {
          message += `\n\n*Выбрано:*\n${selections.map(s => `• ${s}`).join('\n')}`;
        }
      }

      if (this.surveyQuestions.isChildFlow(ctx.session.answers)) {
        message += `\n\n👶 *Детская версия*`;
      }

      console.log(`🔍 Проверка отображения "${questionId}"`);
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
        console.log('🔬 ULTRA DETAILED STRESS_LEVEL DEBUG:', {
          callbackData,
          expectedFormat: 'stress_1 to stress_10',
          isValidFormat: /^stress_\d+$/.test(callbackData),
          extractedValue: callbackData.split('_')[1],
          parsedIntValue: parseInt(callbackData.split('_')[1]),
          isValidValue: parseInt(callbackData.split('_')[1]) >= 1 &&
                        parseInt(callbackData.split('_')[1]) <= 10,
          sessionCurrentQuestion: ctx.session.currentQuestion,
          questionType: question.type
        });
      }

      const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
      console.log(`🔍 Сохранено для "${questionId}": ${mappedValue}`);
      if (!mappedValue) {
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
        await ctx.answerCbQuery('❌ Выбор удален');
      } else {
        const validation = this.surveyQuestions.validateAnswer(questionId, value, selections);
        if (!validation.valid) {
          await ctx.answerCbQuery(validation.error, { show_alert: true });
          return;
        }
        selections.push(value);
        await ctx.answerCbQuery('✅ Выбор добавлен');
      }
      await this.askQuestion(ctx, questionId);
    } catch (error) {
      console.error('❌ Ошибка handleMultipleChoice:', error);
      await this.sendErrorMessage(ctx, 'Ошибка выбора');
    }
  }

  async moveToNextQuestion(ctx) {
    try {
      console.log(`🔍 Получение следующего вопроса после "${ctx.session.currentQuestion}"...`);
      const nextQuestionId = this.surveyQuestions.getNextQuestion(
        ctx.session.currentQuestion,
        ctx.session.answers
      );
      console.log('✅ Следующий вопрос в потоке:', nextQuestionId);
      if (nextQuestionId) {
        ctx.session.currentQuestion = nextQuestionId;
        ctx.session.questionStartTime = Date.now();
        await this.askQuestion(ctx, nextQuestionId);
      } else {
        await this.completeSurvey(ctx);
      }
    } catch (error) {
      console.error('❌ Ошибка moveToNextQuestion:', error);
      await this.sendErrorMessage(ctx, 'Ошибка перехода');
    }
  }

  async completeSurvey(ctx) {
    try {
      const isChildFlow = this.surveyQuestions.isChildFlow(ctx.session.answers);
      const surveyType = isChildFlow ? 'детскую' : 'взрослую';
      await ctx.editMessageText(
        `🧠 *Анализирую ${surveyType} анкету...*\n\nПодождите несколько секунд ⏳`,
        { parse_mode: 'Markdown' }
      );

      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      ctx.session.analysisResult = analysisResult;

      const message = analysisResult.personalMessage;
      const keyboard = isChildFlow
        ? Markup.inlineKeyboard([
            [Markup.button.callback('📞 Связаться', 'contact_request')],
            [Markup.button.callback('📋 Программа', 'child_program_details')],
            [Markup.button.callback('🎁 Материалы', 'child_materials')]
          ])
        : Markup.inlineKeyboard([
            [Markup.button.callback('📞 Связаться', 'contact_request')],
            [Markup.button.callback('📋 Программа', 'program_details')],
            [Markup.button.callback('🎁 Материалы', 'free_materials')]
          ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
      await this.transferLeadAsync(ctx);
    } catch (error) {
      console.error('❌ Ошибка completeSurvey:', error);
      await this.sendErrorMessage(ctx, 'Ошибка анализа');
    }
  }

  async transferLeadAsync(ctx) {
    try {
      const userData = {
        userInfo: {
          telegram_id: ctx.from?.id?.toString() || 'unknown',
          username: ctx.from?.username || 'unknown'
        },
        surveyAnswers: ctx.session.answers || {},
        analysisResult: ctx.session.analysisResult || {},
        contactInfo: ctx.session.contactInfo || {},
        surveyType: this.surveyQuestions.isChildFlow(ctx.session.answers) ? 'child' : 'adult'
      };
      console.log(`🔍 Передача лида с userData:`, userData);
      await this.leadTransfer.processLead(userData);
    } catch (error) {
      console.error('❌ Ошибка передачи лида:', error);
    }
  }

  async handleText(ctx) {
    try {
      if (ctx.session.currentQuestion) {
        await ctx.reply(
          'Пожалуйста, используйте кнопки для ответов.\n💡 Есть кнопка "⬅️ Назад"!',
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply('Начните с /start 🌬️\nЕсть детская версия!');
      }
    } catch (error) {
      console.error('❌ Ошибка handleText:', error);
      await this.sendErrorMessage(ctx, 'Ошибка обработки текста');
    }
  }

  async sendErrorMessage(ctx, message) {
    try {
      await ctx.reply(`😔 ${message}`, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Не удалось отправить ошибку:', error);
    }
  }

  generateProgressBar(percentage) {
    const total = 10;
    const filled = Math.round((percentage / 100) * total);
    return '🟩'.repeat(filled) + '⬜'.repeat(total - filled);
  }

  launch() {
    console.log('🤖 Запуск бота v2.3...');
    this.bot.launch();
    console.log('✅ Бот запущен');
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}

try {
  const bot = new BreathingLeadBot();
  bot.launch();
} catch (error) {
  console.error('💥 Ошибка запуска:', error);
  process.exit(1);
}
