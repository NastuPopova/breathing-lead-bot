// Файл: core/handlers.js - ИСПРАВЛЕННАЯ ВЕРСИЯ (только основной функционал бота)

const { Markup } = require('telegraf');
const config = require('../config');

class Handlers {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    
    // Ссылки на модули бота (НЕ админ-модули)
    this.surveyQuestions = botInstance.surveyQuestions;
    this.verseAnalysis = botInstance.verseAnalysis;
    this.leadTransfer = botInstance.leadTransfer;
    this.pdfManager = botInstance.pdfManager;
    this.adminNotifications = botInstance.adminNotifications;
  }

  // Настройка обработчиков (ТОЛЬКО основные функции)
  setup() {
    console.log('🔧 Настройка основных обработчиков команд и событий...');

    // Основные команды пользователей
    this.setupUserCommands();
    
    // Callback обработчики для анкеты и материалов
    this.setupUserCallbacks();
    
    // Обработчики текстовых сообщений
    this.setupTextHandlers();
    
    console.log('✅ Основные обработчики настроены');
  }

  // Настройка основных пользовательских команд
  setupUserCommands() {
    this.telegramBot.start(async (ctx) => {
      try {
        await this.handleStart(ctx);
      } catch (error) {
        console.error('❌ Ошибка в команде /start:', error);
        await this.handleError(ctx, error);
      }
    });

    this.telegramBot.help(async (ctx) => {
      try {
        await this.handleHelp(ctx);
      } catch (error) {
        console.error('❌ Ошибка в команде /help:', error);
        await this.handleError(ctx, error);
      }
    });

    this.telegramBot.command('restart', async (ctx) => {
      try {
        await this.handleRestart(ctx);
      } catch (error) {
        console.error('❌ Ошибка в команде /restart:', error);
        await this.handleError(ctx, error);
      }
    });
  }

  // Настройка пользовательских callback обработчиков
  setupUserCallbacks() {
    this.telegramBot.on('callback_query', async (ctx) => {
      try {
        await this.handleUserCallback(ctx);
      } catch (error) {
        console.error('❌ Ошибка в callback:', error);
        await this.handleError(ctx, error);
      }
    });
  }

  // Настройка текстовых обработчиков
  setupTextHandlers() {
    this.telegramBot.on('text', async (ctx) => {
      try {
        await this.handleText(ctx);
      } catch (error) {
        console.error('❌ Ошибка в text handler:', error);
        await this.handleError(ctx, error);
      }
    });
  }

  // ===== ОСНОВНЫЕ КОМАНДЫ ПОЛЬЗОВАТЕЛЕЙ =====

  async handleStart(ctx) {
    console.log(`🚀 Команда /start от пользователя ${ctx.from.id}`);

    if (!ctx.session) {
      ctx.session = this.bot.middleware.getDefaultSession();
    }

    ctx.session.currentQuestion = null;
    ctx.session.answers = {};
    ctx.session.completedQuestions = [];
    ctx.session.startTime = Date.now();

    const message = config.MESSAGES.WELCOME;
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔬 Начать диагностику', 'start_survey')],
        [Markup.button.callback('ℹ️ Подробнее о диагностике', 'about_survey')]
      ])
    });
  }

  async handleHelp(ctx) {
    const helpMessage = `🆘 *Помощь по боту*\n\n` +
      `🔬 */start* - начать диагностику дыхания\n` +
      `📱 Просто следуйте инструкциям бота\n` +
      `⏱️ Диагностика занимает 4-5 минут\n\n` +
      `📞 Вопросы? Обратитесь к [Анастасии Поповой](${config.TRAINER_CONTACT})`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  }

  async handleRestart(ctx) {
    await ctx.reply('🔄 Перезапускаю анкету...');
    await this.handleStart(ctx);
  }

  // ИСПРАВЛЕНО: Основной обработчик callback запросов
  async handleUserCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    console.log(`📞 User Callback: ${callbackData} от пользователя ${ctx.from.id}`);

    // Отвечаем на callback чтобы убрать "часики"
    await ctx.answerCbQuery().catch(() => {});

    try {
      // ИСПРАВЛЕНО: Сначала проверяем админ-функции и передаем их в админ-модуль
      if (callbackData.startsWith('admin_')) {
        const adminIntegration = this.bot.getAdminPanel();
        if (adminIntegration) {
          return await adminIntegration.handleAdminCallback(ctx, callbackData);
        } else {
          await ctx.answerCbQuery('Админ-панель недоступна');
          return;
        }
      }

      // Основные действия анкеты
      if (callbackData === 'start_survey') {
        await this.startSurvey(ctx);
      } else if (callbackData === 'start_survey_from_about') {
        await this.startSurveyFromAbout(ctx);
      } else if (callbackData === 'about_survey') {
        await this.showAboutSurvey(ctx);
      } else if (callbackData === 'back_to_main') {
        await this.backToMain(ctx);
      } else if (callbackData === 'nav_back') {
        await this.handleNavBack(ctx);
      } else if (callbackData.endsWith('_done')) {
        await this.handleMultipleChoiceDone(ctx, callbackData);
      }
      
      // PDF и персональные файлы
      else if (callbackData.startsWith('download_pdf_')) {
        await this.handlePDFDownload(ctx);
      } else if (callbackData === 'download_static_adult_antistress') {
        await this.pdfManager.handleDownloadRequest(ctx, callbackData);
      } else if (callbackData === 'download_static_child_games') {
        await this.pdfManager.handleDownloadRequest(ctx, callbackData);
      }
      
      // Меню материалов
      else if (callbackData === 'more_materials') {
        await this.pdfManager.showMoreMaterials(ctx);
      } else if (callbackData === 'show_all_programs') {
        await this.pdfManager.showAllPrograms(ctx);
      } else if (callbackData === 'close_menu') {
        await this.pdfManager.closeMenu(ctx);
      } else if (callbackData === 'delete_menu') {
        await this.pdfManager.deleteMenu(ctx);
      }
      
      // ИСПРАВЛЕНО: Заказы программ - теперь обрабатываются через pdfManager
      else if (callbackData === 'order_starter') {
        await this.pdfManager.handleOrderStarter(ctx);
      } else if (callbackData === 'order_individual') {
        await this.pdfManager.handleOrderIndividual(ctx);
      } else if (callbackData === 'help_choose_program') {
        await this.pdfManager.handleHelpChooseProgram(ctx);
      }
      
      // Контакты
      else if (callbackData === 'contact_request') {
        await this.handleContactRequest(ctx);
      }
      
      // Ответы на вопросы анкеты (должно быть в конце)
      else {
        await this.handleSurveyAnswer(ctx, callbackData);
      }
    } catch (error) {
      console.error('❌ Ошибка в handleUserCallback:', error);
      await ctx.answerCbQuery('Произошла ошибка. Попробуйте еще раз.');
    }
  }

  // ===== ФУНКЦИИ АНКЕТЫ =====

  async startSurvey(ctx) {
    console.log(`📋 Начинаем анкету для пользователя ${ctx.from.id}`);

    if (!ctx.session) {
      ctx.session = this.bot.middleware.getDefaultSession();
    }

    const firstQuestion = 'age_group';
    ctx.session.currentQuestion = firstQuestion;
    ctx.session.startTime = Date.now();

    await this.askQuestion(ctx, firstQuestion);
  }

  async showAboutSurvey(ctx) {
    const aboutMessage = `📋 *О диагностике дыхания*\n\n` +
      `🎯 *Что вы получите:*\n` +
      `• Персональный анализ состояния дыхания\n` +
      `• Индивидуальные рекомендации\n` +
      `• Дыхательные техники под вашу проблему\n` +
      `• Бесплатные материалы для практики\n\n` +
      `⏱️ *Время:* 4-5 минут\n` +
      `📊 *Вопросов:* 15-18 (адаптивно)\n` +
      `🔒 *Конфиденциально:* данные не передаются третьим лицам\n\n` +
      `Готовы начать?`;

    await ctx.editMessageText(aboutMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔬 Да, начать диагностику!', 'start_survey_from_about')],
        [Markup.button.callback('🔙 Назад к главному меню', 'back_to_main')]
      ])
    });
  }

  async startSurveyFromAbout(ctx) {
    console.log(`📋 Начинаем анкету из "Подробнее" для пользователя ${ctx.from.id}`);

    if (!ctx.session) {
      ctx.session = this.bot.middleware.getDefaultSession();
    }

    ctx.session.currentQuestion = null;
    ctx.session.answers = {};
    ctx.session.completedQuestions = [];
    ctx.session.startTime = Date.now();

    const firstQuestion = 'age_group';
    ctx.session.currentQuestion = firstQuestion;

    await this.askQuestion(ctx, firstQuestion);
  }

  async backToMain(ctx) {
    const message = config.MESSAGES.WELCOME;
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔬 Начать диагностику', 'start_survey')],
        [Markup.button.callback('ℹ️ Подробнее о диагностике', 'about_survey')]
      ])
    });
  }

  async askQuestion(ctx, questionId) {
    const question = this.surveyQuestions.getQuestion(questionId);
    if (!question) {
      console.error(`❌ Вопрос ${questionId} не найден`);
      await ctx.reply('Ошибка анкеты. Попробуйте /start');
      return;
    }

    console.log(`❓ Задаем вопрос: ${questionId}`);

    const progress = this.surveyQuestions.getProgress(
      ctx.session.completedQuestions || [], 
      ctx.session.answers || {}
    );

    const progressText = `📊 Прогресс: ${progress.completed}/${progress.total} (${progress.percentage}%)`;
    const questionText = `${question.text}\n\n${progressText}`;

    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(questionText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
      } else {
        await ctx.reply(questionText, {
          parse_mode: 'Markdown',
          ...question.keyboard
        });
      }
    } catch (error) {
      console.error('❌ Ошибка отправки вопроса:', error);
      await ctx.reply(questionText, {
        parse_mode: 'Markdown',
        ...question.keyboard
      });
    }
  }

  async handleSurveyAnswer(ctx, callbackData) {
    if (!ctx.session || !ctx.session.currentQuestion) {
      await ctx.reply('Анкета не начата. Используйте /start');
      return;
    }

    const currentQuestion = ctx.session.currentQuestion;
    const question = this.surveyQuestions.getQuestion(currentQuestion);

    if (!question) {
      console.error(`❌ Текущий вопрос ${currentQuestion} не найден`);
      return;
    }

    if (question.type === 'multiple_choice') {
      await this.handleMultipleChoiceAnswer(ctx, callbackData, currentQuestion);
    } else {
      await this.handleSingleChoiceAnswer(ctx, callbackData, currentQuestion);
    }
  }

  async handleSingleChoiceAnswer(ctx, callbackData, questionId) {
    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
    
    ctx.session.answers[questionId] = mappedValue;
    
    if (!ctx.session.completedQuestions.includes(questionId)) {
      ctx.session.completedQuestions.push(questionId);
    }

    console.log(`✅ Ответ на ${questionId}: ${mappedValue}`);

    await this.moveToNextQuestion(ctx);
  }

  async handleMultipleChoiceAnswer(ctx, callbackData, questionId) {
    if (!ctx.session.multipleChoiceSelections) {
      ctx.session.multipleChoiceSelections = {};
    }

    if (!ctx.session.multipleChoiceSelections[questionId]) {
      ctx.session.multipleChoiceSelections[questionId] = [];
    }

    const selections = ctx.session.multipleChoiceSelections[questionId];
    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);

    if (selections.includes(mappedValue)) {
      const index = selections.indexOf(mappedValue);
      selections.splice(index, 1);
    } else {
      const question = this.surveyQuestions.getQuestion(questionId);
      if (question.maxSelections && selections.length >= question.maxSelections) {
        await ctx.answerCbQuery(`Максимум ${question.maxSelections} выборов`, { show_alert: true });
        return;
      }
      selections.push(mappedValue);
    }

    console.log(`🔄 Множественный выбор ${questionId}:`, selections);

    await this.updateMultipleChoiceDisplay(ctx, questionId);
  }

  async updateMultipleChoiceDisplay(ctx, questionId) {
    const question = this.surveyQuestions.getQuestion(questionId);
    const selections = ctx.session.multipleChoiceSelections[questionId] || [];
    
    let displayText = question.text;
    if (selections.length > 0) {
      displayText += `\n\n✅ *Выбрано (${selections.length}):*\n`;
      selections.forEach(sel => {
        const translated = config.TRANSLATIONS[sel] || sel;
        displayText += `• ${translated}\n`;
      });
    }

    const progress = this.surveyQuestions.getProgress(
      ctx.session.completedQuestions || [], 
      ctx.session.answers || {}
    );
    displayText += `\n📊 Прогресс: ${progress.completed}/${progress.total} (${progress.percentage}%)`;

    try {
      await ctx.editMessageText(displayText, {
        parse_mode: 'Markdown',
        ...question.keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка обновления множественного выбора:', error);
    }
  }

  async handleMultipleChoiceDone(ctx, callbackData) {
    const questionId = ctx.session.currentQuestion;
    const selections = ctx.session.multipleChoiceSelections[questionId] || [];

    const question = this.surveyQuestions.getQuestion(questionId);
    if (question.minSelections && selections.length < question.minSelections) {
      await ctx.answerCbQuery(`Выберите минимум ${question.minSelections} вариант(ов)`, { show_alert: true });
      return;
    }

    ctx.session.answers[questionId] = selections;
    
    if (!ctx.session.completedQuestions.includes(questionId)) {
      ctx.session.completedQuestions.push(questionId);
    }

    console.log(`✅ Множественный выбор завершен ${questionId}:`, selections);

    await this.moveToNextQuestion(ctx);
  }

  async moveToNextQuestion(ctx) {
    const currentQuestion = ctx.session.currentQuestion;
    const nextQuestion = this.surveyQuestions.getNextQuestion(currentQuestion, ctx.session.answers);

    if (nextQuestion) {
      console.log(`➡️ Переход: ${currentQuestion} -> ${nextQuestion}`);
      ctx.session.currentQuestion = nextQuestion;
      await this.askQuestion(ctx, nextQuestion);
    } else {
      console.log('🏁 Анкета завершена, начинаем анализ');
      await this.completeSurvey(ctx);
    }
  }

  async completeSurvey(ctx) {
    try {
      await ctx.editMessageText(config.MESSAGES.ANALYSIS_START, {
        parse_mode: 'Markdown'
      });

      await new Promise(resolve => setTimeout(resolve, config.ANALYSIS_DELAY_SECONDS * 1000));

      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      ctx.session.analysisResult = analysisResult;

      console.log(`🧠 Анализ завершен для пользователя ${ctx.from.id}:`, {
        segment: analysisResult.segment,
        score: analysisResult.scores?.total,
        primaryIssue: analysisResult.primaryIssue
      });

      await this.showResults(ctx, analysisResult);

      if (this.adminNotifications) {
        const userData = {
          userInfo: {
            telegram_id: ctx.from.id,
            username: ctx.from.username,
            first_name: ctx.from.first_name
          },
          surveyAnswers: ctx.session.answers,
          analysisResult: analysisResult,
          surveyType: analysisResult.analysisType || 'adult'
        };
        
        await this.adminNotifications.notifyNewLead(userData);
      }

      await this.transferLead(ctx, analysisResult);

    } catch (error) {
      console.error('❌ Ошибка завершения анкеты:', error);
      await ctx.reply('😔 Произошла ошибка при анализе. Попробуйте позже или обратитесь к [Анастасии](https://t.me/NastuPopova)', {
        parse_mode: 'Markdown'
      });
    }
  }

  async showResults(ctx, analysisResult) {
    const bonus = this.pdfManager.getBonusForUser(analysisResult, ctx.session.answers);
    const message = this.generateBonusMessage(bonus, analysisResult);
    const keyboard = this.generateBonusKeyboard(bonus);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    if (analysisResult.segment === 'HOT_LEAD') {
      setTimeout(async () => {
        await this.pdfManager.sendPDFFile(ctx);
      }, 2000);
    }
  }

  generateBonusMessage(bonus, analysisResult) {
    let message = `🎁 *ВАША ПЕРСОНАЛЬНАЯ ТЕХНИКА ГОТОВА!*\n\n`;
    message += `${bonus.title}\n\n`;
    message += `🎯 *Ваша проблема:* ${bonus.technique.problem}\n`;
    message += `✨ *Решение:* ${bonus.technique.name}\n`;
    message += `⏳ *Время:* ${bonus.technique.duration}\n`;
    message += `🎉 *Результат:* ${bonus.technique.result}\n\n`;

    if (analysisResult.segment === 'HOT_LEAD') {
      message += `⚡ *СРОЧНАЯ РЕКОМЕНДАЦИЯ:*\n`;
      message += `Начните с техники прямо сейчас!\n\n`;
    }

    message += `📞 *Хотите больше техник?*\n`;
    message += `Консультация с [Анастасией Поповой](https://t.me/NastuPopova)`;

    return message;
  }

  generateBonusKeyboard(bonus) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📥 Получить мой гид', `download_pdf_${bonus.id}`)],
      [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
      [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
    ]);
  }

  async transferLead(ctx, analysisResult) {
    try {
      const userData = {
        userInfo: {
          telegram_id: ctx.from.id,
          username: ctx.from.username,
          first_name: ctx.from.first_name
        },
        surveyAnswers: ctx.session.answers,
        analysisResult: analysisResult,
        surveyType: analysisResult.analysisType || 'adult',
        startTime: ctx.session.startTime
      };

      await this.leadTransfer.processLead(userData);
    } catch (error) {
      console.error('❌ Ошибка передачи лида:', error);
    }
  }

  async handleNavBack(ctx) {
    if (!ctx.session || !ctx.session.currentQuestion) {
      await ctx.reply('Анкета не начата. Используйте /start');
      return;
    }

    const currentQuestion = ctx.session.currentQuestion;
    const prevQuestion = this.surveyQuestions.getPreviousQuestion(currentQuestion, ctx.session.answers);

    if (prevQuestion) {
      const index = ctx.session.completedQuestions.indexOf(currentQuestion);
      if (index > -1) {
        ctx.session.completedQuestions.splice(index, 1);
      }

      delete ctx.session.answers[currentQuestion];
      delete ctx.session.multipleChoiceSelections?.[currentQuestion];

      ctx.session.currentQuestion = prevQuestion;
      await this.askQuestion(ctx, prevQuestion);
    } else {
      await ctx.answerCbQuery('Это первый вопрос');
    }
  }

  // ===== ОБРАБОТКА PDF И МАТЕРИАЛОВ =====

  async handlePDFDownload(ctx) {
    try {
      await this.pdfManager.sendPDFFile(ctx);
    } catch (error) {
      console.error('❌ Ошибка загрузки PDF:', error);
      await ctx.reply('😔 Ошибка загрузки файла. Попробуйте позже.');
    }
  }

  // ===== КОНТАКТЫ =====

  async handleContactRequest(ctx) {
    const message = `📞 *Связь с экспертом*\n\n` +
      `Для записи на консультацию обратитесь к нашему эксперту:\n\n` +
      `👩‍⚕️ **Анастасия Попова**\n` +
      `Эксперт по дыхательным практикам\n\n` +
      `💬 Telegram: @NastuPopova\n\n` +
      `📋 *На консультации:*\n` +
      `• Диагностика вашего дыхания\n` +
      `• Персональная программа на 30 дней\n` +
      `• Обучение эффективным техникам\n` +
      `• Поддержка и контроль результатов`;

    await this.safeEditOrReply(ctx, message, [
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
      [Markup.button.callback('🔙 Назад к материалам', 'more_materials')],
      [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
    ]);
  }

  // ===== ОБРАБОТКА ТЕКСТА =====

  async handleText(ctx) {
    if (ctx.session?.currentQuestion) {
      await ctx.reply('👆 Пожалуйста, используйте кнопки выше для ответа на вопрос.');
    } else {
      await ctx.reply('Для начала диагностики используйте /start');
    }
  }

  // ===== УТИЛИТЫ =====

  async safeEditOrReply(ctx, message, keyboard) {
    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
    } catch (error) {
      console.log('⚠️ Не удалось отредактировать сообщение, отправляем новое');
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });
    }
  }

  async handleError(ctx, error) {
    console.error('💥 Обработка ошибки:', error);
    
    try {
      await ctx.reply(
        '😔 Произошла техническая ошибка. Попробуйте /start или обратитесь к [Анастасии](https://t.me/NastuPopova)',
        { parse_mode: 'Markdown' }
      );
    } catch (replyError) {
      console.error('❌ Не удалось отправить сообщение об ошибке:', replyError);
    }
  }

  // ===== ГЕТТЕРЫ ДЛЯ СТАТИСТИКИ =====

  getStats() {
    return {
      name: 'MainHandlers',
      version: '3.0.0',
      features: [
        'survey_processing',
        'pdf_delivery',
        'contact_handling',
        'error_handling'
      ],
      admin_functions_moved: true,
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
