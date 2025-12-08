// Файл: core/handlers.js - ИСПРАВЛЕННАЯ ВЕРСИЯ с кнопкой "Запустить тест"

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
    
    // Проверяем критические зависимости
    this.validateDependencies();
  }

  // Проверка зависимостей при инициализации
  validateDependencies() {
    console.log('🔧 Handlers: проверка зависимостей...');
    
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
    
    if (!checks.pdfManager) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: pdfManager не подключен!');
    }
    
    if (!checks.handleHelpChooseProgram) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: handleHelpChooseProgram отсутствует!');
    }
  }

  // Настройка обработчиков
  setup() {
    console.log('🔧 Настройка обработчиков команд и событий...');

    this.setupUserCommands();
    this.setupUserCallbacks();
    this.setupTextHandlers();
    
    console.log('✅ Обработчики настроены');
  }

  // Настройка пользовательских команд
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
    
    // НОВАЯ ТЕСТОВАЯ КОМАНДА для отладки
    this.telegramBot.command('test_help', async (ctx) => {
      try {
        await this.handleTestHelp(ctx);
      } catch (error) {
        console.error('❌ Ошибка в команде /test_help:', error);
        await ctx.reply('Ошибка тестирования: ' + error.message);
      }
    });
  }

  // Настройка callback обработчиков
  setupUserCallbacks() {
    this.telegramBot.on('callback_query', async (ctx) => {
      try {
        await this.handleUserCallback(ctx);
      } catch (error) {
        console.error('❌ Критическая ошибка в callback:', error);
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

  // ===== ОСНОВНОЙ CALLBACK ОБРАБОТЧИК =====
  async handleUserCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    console.log(`📞 User Callback: ${callbackData} от пользователя ${ctx.from.id}`);

    // Обязательно отвечаем на callback
    try {
      await ctx.answerCbQuery();
    } catch (error) {
      console.log('⚠️ answerCbQuery failed:', error.message);
    }

    try {
      // =======================================================================
      // ПРИОРИТЕТНАЯ ОБРАБОТКА help_choose_program - ПЕРВЫМ ДЕЛОМ!
      // =======================================================================
      if (callbackData === 'help_choose_program') {
        console.log('🎯 === НАЧАЛО ОБРАБОТКИ help_choose_program ===');
        
        // Диагностика состояния
        this.logCallbackDiagnostics(ctx, callbackData);
        
        // Надежная обработка с множественными fallback
        return await this.handleProgramHelp(ctx);
      }

      // =======================================================================
      // ОСТАЛЬНЫЕ CALLBACK'И
      // =======================================================================
      
      // Админ-функции
      if (callbackData.startsWith('admin_')) {
        console.log('🔧 Обработка админ-функции:', callbackData);
        const adminIntegration = this.bot.getAdminPanel();
        if (adminIntegration && adminIntegration.isReady()) {
          return await adminIntegration.handleAdminCallback(ctx, callbackData);
        } else {
          await ctx.reply('🚫 Админ-панель недоступна');
          return;
        }
      }

      // Анкета
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
      
      // PDF и материалы
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
      
      // Заказы программ
      else if (callbackData === 'order_starter') {
        await this.pdfManager.handleOrderStarter(ctx);
      } else if (callbackData === 'order_individual') {
        await this.pdfManager.handleOrderIndividual(ctx);
      }
      
      // Контакты
      else if (callbackData === 'contact_request') {
        await this.handleContactRequest(ctx);
      }
      
      // Ответы на вопросы анкеты (должно быть в конце)
      else {
        console.log('📝 Обрабатываем как ответ на анкету:', callbackData);
        await this.handleSurveyAnswer(ctx, callbackData);
      }
      
    } catch (error) {
      console.error('❌ Критическая ошибка в handleUserCallback:', error);
      console.error('Стек ошибки:', error.stack);
      console.error('Контекст:', {
        callbackData,
        userId: ctx.from?.id,
        hasSession: !!ctx.session,
        pdfManagerExists: !!this.pdfManager
      });
      
      // Попытка восстановления
      await this.handleError(ctx, error);
    }
  }

  // ===== ИСПРАВЛЕННЫЙ МЕТОД: ОБРАБОТКА ПОМОЩИ В ВЫБОРЕ ПРОГРАММЫ =====
  async handleProgramHelp(ctx) {
    console.log('🤔 handleProgramHelp: начало обработки');
    
    try {
      // Проверка 1: pdfManager
      if (!this.pdfManager) {
        console.error('❌ pdfManager отсутствует - используем встроенный fallback');
        return await this.showBuiltInProgramHelp(ctx);
      }
      
      // Проверка 2: метод handleHelpChooseProgram
      if (typeof this.pdfManager.handleHelpChooseProgram !== 'function') {
        console.error('❌ handleHelpChooseProgram не функция - используем встроенный fallback');
        return await this.showBuiltInProgramHelp(ctx);
      }
      
      // Проверка 3: сессия
      if (!ctx.session) {
        console.log('⚠️ Сессия отсутствует, создаем новую');
        ctx.session = this.bot.middleware.getDefaultSession();
      }
      
      console.log('✅ Все проверки пройдены, вызываем pdfManager.handleHelpChooseProgram');
      
      // Вызываем основной метод
      await this.pdfManager.handleHelpChooseProgram(ctx);
      
      console.log('✅ handleProgramHelp завершен успешно');
      
    } catch (error) {
      console.error('❌ Ошибка в handleProgramHelp:', error);
      console.error('Стек ошибки:', error.stack);
      
      // Последний fallback - встроенная помощь
      await this.showBuiltInProgramHelp(ctx);
    }
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
  
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
    
    // ИСПРАВЛЕНИЕ: Добавлена кнопка "Запустить тест"
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔬 Запустить тест', 'start_survey')],
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

  // ===== АНКЕТА =====
  
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
        [Markup.button.callback('🔬 Запустить тест', 'start_survey')],
        [Markup.button.callback('ℹ️ Подробнее о диагностике', 'about_survey')]
      ])
    });
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
  
  async safeEditOrReply(ctx, message, keyboard) {
    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      console.log('✅ Сообщение отредактировано');
    } catch (editError) {
      console.log('⚠️ Редактирование не удалось, отправляем новое сообщение');
      try {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
        console.log('✅ Новое сообщение отправлено');
      } catch (replyError) {
        console.error('❌ И reply не удался:', replyError);
        try {
          await ctx.reply(message.replace(/\*/g, ''), {
            reply_markup: { inline_keyboard: keyboard }
          });
          console.log('✅ Сообщение отправлено без Markdown');
        } catch (finalError) {
          console.error('❌ Все попытки не удались:', finalError);
        }
      }
    }
  }

  async handleError(ctx, error) {
    console.error('❌ Обработка ошибки для пользователя:', error);
    
    try {
      await ctx.reply(
        '😔 Произошла техническая ошибка. Попробуйте /start или обратитесь к [Анастасии Поповой](https://t.me/NastuPopova)',
        { parse_mode: 'Markdown' }
      );
    } catch (replyError) {
      console.error('❌ Не удалось отправить сообщение об ошибке:', replyError);
    }
  }

  // Методы для работы с анкетой (заглушки для компиляции)
  async askQuestion(ctx, questionKey) {
    // Этот метод должен быть реализован в surveyQuestions модуле
    console.log(`📋 Задаем вопрос: ${questionKey}`);
    await ctx.reply('Вопрос загружается...');
  }

  async handleSurveyAnswer(ctx, answerData) {
    // Этот метод должен быть реализован в surveyQuestions модуле
    console.log(`📋 Обрабатываем ответ: ${answerData}`);
  }

  async handleNavBack(ctx) {
    // Этот метод должен быть реализован в surveyQuestions модуле
    console.log('🔙 Назад');
  }

  async handleMultipleChoiceDone(ctx, callbackData) {
    // Этот метод должен быть реализован в surveyQuestions модуле
    console.log(`✅ Множественный выбор завершен: ${callbackData}`);
  }

  async handlePDFDownload(ctx) {
    // Этот метод должен быть реализован в pdfManager модуле
    console.log('📄 Скачивание PDF');
  }

  async handleContactRequest(ctx) {
    // Этот метод должен быть реализован в leadTransfer модуле
    console.log('📞 Запрос контакта');
  }

  async handleText(ctx) {
    // Обработка текстовых сообщений
    console.log('📝 Обработка текстового сообщения');
  }

  // Диагностика
  logCallbackDiagnostics(ctx, callbackData) {
    console.log('🔍 === ДИАГНОСТИКА CALLBACK ===');
    console.log('Callback Data:', callbackData);
    console.log('User ID:', ctx.from?.id);
    console.log('Chat ID:', ctx.chat?.id);
    console.log('Session exists:', !!ctx.session);
    
    if (ctx.session) {
      console.log('Session data:', {
        hasAnswers: !!ctx.session.answers,
        answersCount: Object.keys(ctx.session.answers || {}).length,
        hasAnalysisResult: !!ctx.session.analysisResult,
        analysisType: ctx.session.analysisResult?.analysisType,
        segment: ctx.session.analysisResult?.segment
      });
    }
    
    console.log('Dependencies:', {
      pdfManager: !!this.pdfManager,
      handleHelpChooseProgram: !!this.pdfManager?.handleHelpChooseProgram,
      middleware: !!this.bot.middleware
    });
    console.log('='.repeat(40));
  }

  // Тестовая команда
  async handleTestHelp(ctx) {
    console.log('🧪 Тестовая команда /test_help');
    
    const scenarios = [
      {
        name: 'С полными данными',
        session: {
          answers: {
            age_group: '31-45',
            stress_level: 7,
            current_problems: ['chronic_stress']
          },
          analysisResult: {
            segment: 'WARM_LEAD',
            analysisType: 'adult',
            primaryIssue: 'chronic_stress'
          }
        }
      },
      {
        name: 'Без данных анализа',
        session: {
          answers: {},
          analysisResult: null
        }
      },
      {
        name: 'Пустая сессия',
        session: null
        }
    ];
    
    let message = '🧪 **ТЕСТ КНОПКИ "ПОДОБРАТЬ ПРОГРАММУ"**\n\n';
    message += 'Выберите сценарий для тестирования:\n\n';
    
    const keyboard = scenarios.map((scenario, index) => [
      { text: `${index + 1}. ${scenario.name}`, callback_data: `test_scenario_${index}` }
    ]);
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }
}

module.exports = Handlers;
