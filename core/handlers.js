// Файл: core/handlers.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const { Markup } = require('telegraf');
const config = require('../config');

class Handlers {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    
    // Ссылки на модули бота
    this.surveyQuestions = botInstance.surveyQuestions;
    this.verseAnalysis = botInstance.verseAnalysis;
    this.leadTransfer = botInstance.leadTransfer;
    this.pdfManager = botInstance.pdfManager;
    this.adminNotifications = botInstance.adminNotifications;
  }

  // Настройка всех обработчиков
  setup() {
    console.log('🔧 Настройка обработчиков команд и событий...');

    // Основные команды
    this.setupCommands();
    
    // Callback обработчики
    this.setupCallbacks();
    
    // Обработчики текстовых сообщений
    this.setupTextHandlers();
    
    // Административные команды
    this.setupAdminCommands();
    
    console.log('✅ Обработчики настроены');
  }

  // Настройка основных команд
  setupCommands() {
    // Команда /start
    this.telegramBot.start(async (ctx) => {
      try {
        await this.handleStart(ctx);
      } catch (error) {
        console.error('❌ Ошибка в команде /start:', error);
        await this.handleError(ctx, error);
      }
    });

    // Команда /help
    this.telegramBot.help(async (ctx) => {
      try {
        await this.handleHelp(ctx);
      } catch (error) {
        console.error('❌ Ошибка в команде /help:', error);
        await this.handleError(ctx, error);
      }
    });

    // Команда /restart
    this.telegramBot.command('restart', async (ctx) => {
      try {
        await this.handleRestart(ctx);
      } catch (error) {
        console.error('❌ Ошибка в команде /restart:', error);
        await this.handleError(ctx, error);
      }
    });
  }

  // Настройка callback обработчиков
  setupCallbacks() {
    // Обработчик всех callback запросов
    this.telegramBot.on('callback_query', async (ctx) => {
      try {
        await this.handleCallback(ctx);
      } catch (error) {
        console.error('❌ Ошибка в callback:', error);
        await this.handleError(ctx, error);
      }
    });
  }

  // Настройка текстовых обработчиков
  setupTextHandlers() {
    // Обработчик текстовых сообщений
    this.telegramBot.on('text', async (ctx) => {
      try {
        await this.handleText(ctx);
      } catch (error) {
        console.error('❌ Ошибка в text handler:', error);
        await this.handleError(ctx, error);
      }
    });
  }

  // Настройка административных команд
  setupAdminCommands() {
    if (!config.ADMIN_ID) {
      console.log('⚠️ ADMIN_ID не настроен, админ-команды отключены');
      return;
    }

    // Админ статистика
    this.telegramBot.command('admin_stats', async (ctx) => {
      if (ctx.from.id.toString() !== config.ADMIN_ID) return;
      try {
        await this.handleAdminStats(ctx);
      } catch (error) {
        console.error('❌ Ошибка в админ команде:', error);
      }
    });

    // Тест PDF
    this.telegramBot.command('test_pdf', async (ctx) => {
      if (ctx.from.id.toString() !== config.ADMIN_ID) return;
      try {
        await this.handleTestPDF(ctx);
      } catch (error) {
        console.error('❌ Ошибка тестового PDF:', error);
      }
    });
  }

  // Обработчик команды /start
  async handleStart(ctx) {
    console.log(`🚀 Команда /start от пользователя ${ctx.from.id}`);

    // Инициализируем сессию если нужно
    if (!ctx.session) {
      ctx.session = this.bot.middleware.getDefaultSession();
    }

    // Сбрасываем состояние анкеты
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

  // Обработчик команды /help
  async handleHelp(ctx) {
    const helpMessage = `🆘 *Помощь по боту*\n\n` +
      `🔬 */start* - начать диагностику дыхания\n` +
      `📱 Просто следуйте инструкциям бота\n` +
      `⏱️ Диагностика занимает 4-5 минут\n\n` +
      `📞 Вопросы? Обратитесь к [Анастасии Поповой](${config.TRAINER_CONTACT})`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  }

  // Обработчик команды /restart
  async handleRestart(ctx) {
    await ctx.reply('🔄 Перезапускаю анкету...');
    await this.handleStart(ctx);
  }

  // ИСПРАВЛЕННЫЙ: Основной обработчик callback запросов
  async handleCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    console.log(`📞 Callback: ${callbackData} от пользователя ${ctx.from.id}`);

    // Отвечаем на callback чтобы убрать "часики"
    await ctx.answerCbQuery().catch(() => {});

    // ИСПРАВЛЕННАЯ маршрутизация callback
    try {
      // Основные действия
      if (callbackData === 'start_survey') {
        await this.startSurvey(ctx);
      } else if (callbackData === 'about_survey') {
        await this.showAboutSurvey(ctx);
      } else if (callbackData === 'nav_back') {
        await this.handleNavBack(ctx);
      } else if (callbackData.endsWith('_done')) {
        await this.handleMultipleChoiceDone(ctx, callbackData);
      }
      
      // PDF и материалы - ИСПРАВЛЕНО
      else if (callbackData.startsWith('download_pdf_')) {
        await this.handlePDFDownload(ctx);
      } else if (callbackData.startsWith('download_static_')) {
        await this.pdfManager.handleDownloadRequest(ctx, callbackData);
      }
      
      // Меню материалов - ИСПРАВЛЕНО
      else if (callbackData === 'more_materials') {
        await this.pdfManager.showMoreMaterials(ctx);
      } else if (callbackData === 'show_all_programs') {
        await this.pdfManager.showAllPrograms(ctx);
      } else if (callbackData === 'close_menu') {
        await this.pdfManager.closeMenu(ctx);
      }
      
      // Заказы программ - НОВОЕ
      else if (callbackData.startsWith('order_')) {
        const programType = callbackData.replace('order_', '');
        await this.pdfManager.showOrderDetails(ctx, programType);
      } else if (callbackData === 'help_choose_program') {
        await this.pdfManager.showProgramHelper(ctx);
      }
      
      // Контакты
      else if (callbackData === 'contact_request') {
        await this.handleContactRequest(ctx);
      }
      
      // Админ callback
      else if (callbackData.startsWith('admin_')) {
        await this.handleAdminCallback(ctx, callbackData);
      } 
      
      // Ответы на вопросы анкеты (должно быть в конце)
      else {
        await this.handleSurveyAnswer(ctx, callbackData);
      }
    } catch (error) {
      console.error('❌ Ошибка в handleCallback:', error);
      await ctx.answerCbQuery('Произошла ошибка. Попробуйте еще раз.');
    }
  }

  // Запуск анкеты
  async startSurvey(ctx) {
    console.log(`📋 Начинаем анкету для пользователя ${ctx.from.id}`);

    if (!ctx.session) {
      ctx.session = this.bot.middleware.getDefaultSession();
    }

    // Начинаем с первого вопроса
    const firstQuestion = 'age_group';
    ctx.session.currentQuestion = firstQuestion;
    ctx.session.startTime = Date.now();

    await this.askQuestion(ctx, firstQuestion);
  }

  // Показ информации о диагностике
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
        [Markup.button.callback('🔬 Начать диагностику', 'start_survey')],
        [Markup.button.callback('🔙 Назад к главному меню', 'start_survey')]
      ])
    });
  }

  // Задать вопрос
  async askQuestion(ctx, questionId) {
    const question = this.surveyQuestions.getQuestion(questionId);
    if (!question) {
      console.error(`❌ Вопрос ${questionId} не найден`);
      await ctx.reply('Ошибка анкеты. Попробуйте /start');
      return;
    }

    console.log(`❓ Задаем вопрос: ${questionId}`);

    // Обновляем прогресс
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
      // Fallback - отправляем новое сообщение
      await ctx.reply(questionText, {
        parse_mode: 'Markdown',
        ...question.keyboard
      });
    }
  }

  // Обработка ответов на вопросы анкеты
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

    // Обрабатываем ответ в зависимости от типа вопроса
    if (question.type === 'multiple_choice') {
      await this.handleMultipleChoiceAnswer(ctx, callbackData, currentQuestion);
    } else {
      await this.handleSingleChoiceAnswer(ctx, callbackData, currentQuestion);
    }
  }

  // Обработка одиночного выбора
  async handleSingleChoiceAnswer(ctx, callbackData, questionId) {
    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
    
    // Сохраняем ответ
    ctx.session.answers[questionId] = mappedValue;
    
    // Добавляем в список завершенных
    if (!ctx.session.completedQuestions.includes(questionId)) {
      ctx.session.completedQuestions.push(questionId);
    }

    console.log(`✅ Ответ на ${questionId}: ${mappedValue}`);

    // Переходим к следующему вопросу
    await this.moveToNextQuestion(ctx);
  }

  // Обработка множественного выбора
  async handleMultipleChoiceAnswer(ctx, callbackData, questionId) {
    if (!ctx.session.multipleChoiceSelections) {
      ctx.session.multipleChoiceSelections = {};
    }

    if (!ctx.session.multipleChoiceSelections[questionId]) {
      ctx.session.multipleChoiceSelections[questionId] = [];
    }

    const selections = ctx.session.multipleChoiceSelections[questionId];
    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);

    // Добавляем или убираем выбор
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

    // Обновляем интерфейс (показываем текущие выборы)
    await this.updateMultipleChoiceDisplay(ctx, questionId);
  }

  // Обновление отображения множественного выбора
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

  // Завершение множественного выбора
  async handleMultipleChoiceDone(ctx, callbackData) {
    const questionId = ctx.session.currentQuestion;
    const selections = ctx.session.multipleChoiceSelections[questionId] || [];

    // Валидация
    const question = this.surveyQuestions.getQuestion(questionId);
    if (question.minSelections && selections.length < question.minSelections) {
      await ctx.answerCbQuery(`Выберите минимум ${question.minSelections} вариант(ов)`, { show_alert: true });
      return;
    }

    // Сохраняем ответ
    ctx.session.answers[questionId] = selections;
    
    // Добавляем в список завершенных
    if (!ctx.session.completedQuestions.includes(questionId)) {
      ctx.session.completedQuestions.push(questionId);
    }

    console.log(`✅ Множественный выбор завершен ${questionId}:`, selections);

    // Переходим к следующему вопросу
    await this.moveToNextQuestion(ctx);
  }

  // Переход к следующему вопросу
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

  // Завершение анкеты и анализ
  async completeSurvey(ctx) {
    try {
      // Показываем сообщение об анализе
      await ctx.editMessageText(config.MESSAGES.ANALYSIS_START, {
        parse_mode: 'Markdown'
      });

      // Имитируем время анализа
      await new Promise(resolve => setTimeout(resolve, config.ANALYSIS_DELAY_SECONDS * 1000));

      // Выполняем VERSE-анализ
      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      ctx.session.analysisResult = analysisResult;

      console.log(`🧠 Анализ завершен для пользователя ${ctx.from.id}:`, {
        segment: analysisResult.segment,
        score: analysisResult.scores?.total,
        primaryIssue: analysisResult.primaryIssue
      });

      // Показываем результаты
      await this.showResults(ctx, analysisResult);

      // Уведомляем админа
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

      // Передаем лид в систему
      await this.transferLead(ctx, analysisResult);

    } catch (error) {
      console.error('❌ Ошибка завершения анкеты:', error);
      await ctx.reply('😔 Произошла ошибка при анализе. Попробуйте позже или обратитесь к [Анастасии](https://t.me/breathing_opros_bot)', {
        parse_mode: 'Markdown'
      });
    }
  }

  // Показ результатов
  async showResults(ctx, analysisResult) {
    const bonus = this.pdfManager.getBonusForUser(analysisResult, ctx.session.answers);
    const message = this.generateBonusMessage(bonus, analysisResult);
    const keyboard = this.generateBonusKeyboard(bonus);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    // Для горячих лидов автоматически отправляем PDF
    if (analysisResult.segment === 'HOT_LEAD') {
      setTimeout(async () => {
        await this.pdfManager.sendPDFFile(ctx);
      }, 2000);
    }
  }

  // Генерация сообщения о бонусе
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
    message += `Консультация с [Анастасией Поповой](https://t.me/breathing_opros_bot)`;

    return message;
  }

  // Генерация клавиатуры для бонуса
  generateBonusKeyboard(bonus) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📥 Получить мой гид', `download_pdf_${bonus.id}`)],
      [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
      [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
    ]);
  }

  // Передача лида в систему
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

  // Обработка навигации назад
  async handleNavBack(ctx) {
    if (!ctx.session || !ctx.session.currentQuestion) {
      await ctx.reply('Анкета не начата. Используйте /start');
      return;
    }

    const currentQuestion = ctx.session.currentQuestion;
    const prevQuestion = this.surveyQuestions.getPreviousQuestion(currentQuestion, ctx.session.answers);

    if (prevQuestion) {
      // Удаляем текущий вопрос из завершенных
      const index = ctx.session.completedQuestions.indexOf(currentQuestion);
      if (index > -1) {
        ctx.session.completedQuestions.splice(index, 1);
      }

      // Удаляем ответ на текущий вопрос
      delete ctx.session.answers[currentQuestion];
      delete ctx.session.multipleChoiceSelections?.[currentQuestion];

      ctx.session.currentQuestion = prevQuestion;
      await this.askQuestion(ctx, prevQuestion);
    } else {
      await ctx.answerCbQuery('Это первый вопрос');
    }
  }

  // ИСПРАВЛЕНО: Обработка загрузки PDF
  async handlePDFDownload(ctx) {
    try {
      await this.pdfManager.sendPDFFile(ctx);
    } catch (error) {
      console.error('❌ Ошибка загрузки PDF:', error);
      await ctx.reply('😔 Ошибка загрузки файла. Попробуйте позже.');
    }
  }

  // Обработка запроса контакта
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

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
          [Markup.button.callback('🔙 Назад к материалам', 'more_materials')],
          [Markup.button.callback('❌ Закрыть', 'close_menu')]
        ])
      });
    } catch (error) {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
        ])
      });
    }
  }

  // Обработка административных callback
  async handleAdminCallback(ctx, callbackData) {
    if (ctx.from.id.toString() !== config.ADMIN_ID) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    try {
      const parts = callbackData.split('_');
      const action = parts.slice(1, -1).join('_'); // все кроме первого и последнего
      const targetUserId = parts[parts.length - 1]; // последний элемент

      await this.adminNotifications.handleAdminCallback(ctx, action, targetUserId);
    } catch (error) {
      console.error('❌ Ошибка админ callback:', error);
      await ctx.answerCbQuery('Ошибка выполнения действия');
    }
  }

  // Административная статистика
  async handleAdminStats(ctx) {
    const stats = this.bot.middleware.getStats();
    let message = `📊 *Статистика бота*\n\n`;
    message += `👥 Уникальных пользователей: ${stats.requests.unique_users}\n`;
    message += `📨 Всего запросов: ${stats.requests.total}\n`;
    message += `💾 Активных сессий: ${stats.sessions.created}\n`;
    message += `❌ Ошибок: ${stats.errors.handled}\n`;
    message += `⏱️ Время работы: ${Math.round(stats.uptime.hours)} часов\n`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  // Тест PDF
  async handleTestPDF(ctx) {
    try {
      const testAnalysisResult = {
        analysisType: 'adult',
        primaryIssue: 'chronic_stress',
        segment: 'WARM_LEAD',
        scores: { total: 65 }
      };
      const testSurveyData = { age_group: '31-45', stress_level: 6 };

      ctx.session = { analysisResult: testAnalysisResult, answers: testSurveyData };
      await this.pdfManager.sendPDFFile(ctx);
      await ctx.reply('✅ Тестовый PDF отправлен');
    } catch (error) {
      console.error('❌ Ошибка тестового PDF:', error);
      await ctx.reply('❌ Ошибка отправки тестового PDF');
    }
  }

  // Обработка текстовых сообщений
  async handleText(ctx) {
    if (ctx.session?.currentQuestion) {
      await ctx.reply('👆 Пожалуйста, используйте кнопки выше для ответа на вопрос.');
    } else {
      await ctx.reply('Для начала диагностики используйте /start');
    }
  }

 
// Общий обработчик ошибок
  async handleError(ctx, error) {
    console.error('💥 Обработка ошибки:', error);
    
    try {
      await ctx.reply(
        '😔 Произошла техническая ошибка. Попробуйте /start или обратитесь к [Анастасии](https://t.me/breathing_opros_bot)',
        { parse_mode: 'Markdown' }
      );
    } catch (replyError) {
      console.error('❌ Не удалось отправить сообщение об ошибке:', replyError);
    }
  }
}

module.exports = Handlers;
