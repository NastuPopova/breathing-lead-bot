// Файл: core/handlers.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ

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
    this.telegramBot.on('callback_query', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;
      console.log(`User Callback: ${callbackData} от ${ctx.from.id}`);

      await ctx.answerCbQuery().catch(() => {});

      // ПРИОРИТЕТНАЯ обработка "Подобрать программу"
      if (callbackData === 'help_choose_program') {
        return await this.handleProgramHelp(ctx);
      }

      // Админка
      if (callbackData.startsWith('admin_')) {
        return; // админка обрабатывается отдельно
      }

      // Анкета: основные команды
      if (callbackData === 'start_survey' || callbackData === 'start_survey_from_about') {
        return await this.startSurvey(ctx);
      }
      if (callbackData === 'about_survey') {
        return await this.showAboutSurvey(ctx);
      }
      if (callbackData === 'back_to_main') {
        return await this.backToMain(ctx);
      }

      // ВСЕ ОТВЕТЫ НА ВОПРОСЫ АНКЕТЫ
      if (
        callbackData.startsWith('age_') ||
        callbackData.startsWith('prob_') ||
        callbackData.startsWith('child_prob_') ||
        callbackData.startsWith('goal_') ||
        callbackData.startsWith('format_') ||
        callbackData.startsWith('stress_') ||
        callbackData.startsWith('breath_') ||
        callbackData.startsWith('med_') ||
        callbackData.startsWith('panic_') ||
        callbackData.startsWith('env_') ||
        callbackData.startsWith('occ_') ||
        callbackData.startsWith('activity_') ||
        callbackData.startsWith('condition_') ||
        callbackData.startsWith('child_age_') ||
        callbackData.startsWith('both_parents') ||
        callbackData.startsWith('mother') ||
        callbackData.startsWith('father') ||
        callbackData === 'nav_back' ||
        callbackData.endsWith('_done')
      ) {
        return await this.handleSurveyAnswer(ctx, callbackData);
      }

      this.logCallbackDiagnostics(ctx, callbackData);
    });
  }

  setupTextHandlers() {
    this.telegramBot.on('text', async (ctx) => {
      if (ctx.session?.currentQuestion) {
        await ctx.reply('Пожалуйста, используйте кнопки выше для ответа на вопрос.');
      } else {
        await ctx.reply('Для начала диагностики используйте /start');
      }
    });
  }

  // === ОСНОВНЫЕ МЕТОДЫ ===
  async handleStart(ctx) {
    console.log(`Команда /start от пользователя ${ctx.from.id}`);
    const message = config.MESSAGES.WELCOME;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Запустить тест', 'start_survey')],
        [Markup.button.callback('Подробнее о диагностике', 'about_survey')]
      ])
    });
  }

  async handleRestart(ctx) {
    ctx.session = {};
    await this.handleStart(ctx);
  }

  async showAboutSurvey(ctx) {
    const aboutMessage = config.MESSAGES.ABOUT_SURVEY || 'Подробное описание диагностики...';
    await ctx.editMessageText(aboutMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Запустить тест', 'start_survey_from_about')],
        [Markup.button.callback('Назад', 'back_to_main')]
      ])
    });
  }

  async backToMain(ctx) {
    await ctx.deleteMessage().catch(() => {});
    await this.handleStart(ctx);
  }

  // === АНКЕТА ===
  async startSurvey(ctx) {
    console.log(`🚀 Начинаем анкету для пользователя ${ctx.from.id}`);
    
    // Инициализируем сессию
    ctx.session = { 
      answers: {}, 
      completedQuestions: [], 
      startTime: Date.now(),
      multipleChoiceSelections: {},
      questionStartTime: Date.now()
    };
    
    console.log('✅ Сессия создана:', ctx.session);
    
    // Задаем первый вопрос
    await this.askQuestion(ctx, 'age_group');
  }

  async askQuestion(ctx, questionKey) {
    console.log(`📋 Задаем вопрос: ${questionKey}`);
    
    if (!this.surveyQuestions) {
      console.error('❌ surveyQuestions не инициализирован!');
      await ctx.reply('Ошибка загрузки вопросов. Попробуйте /restart');
      return;
    }

    try {
      const question = this.surveyQuestions.getQuestion(questionKey);
      
      if (!question) {
        console.error(`❌ Вопрос ${questionKey} не найден`);
        await ctx.reply('Ошибка: вопрос не найден. Попробуйте /restart');
        return;
      }

      console.log(`✅ Вопрос найден: ${question.text.substring(0, 50)}...`);

      // Обновляем текущий вопрос в сессии
      ctx.session.currentQuestion = questionKey;
      ctx.session.questionStartTime = Date.now();

      // Добавляем индикатор прогресса
      const progress = this.surveyQuestions.getProgress(
        ctx.session.completedQuestions || [],
        ctx.session.answers || {}
      );

      const progressBar = this.generateProgressBar(progress.percentage);
      const questionText = `${progressBar}\n\n${question.text}`;

      // Отправляем вопрос
      if (question.note) {
        await ctx.editMessageText(
          `${questionText}\n\n💡 ${question.note}`,
          {
            parse_mode: 'Markdown',
            reply_markup: question.keyboard.reply_markup
          }
        ).catch(async () => {
          // Если редактирование не удалось, отправляем новое сообщение
          await ctx.reply(
            `${questionText}\n\n💡 ${question.note}`,
            {
              parse_mode: 'Markdown',
              reply_markup: question.keyboard.reply_markup
            }
          );
        });
      } else {
        await ctx.editMessageText(questionText, {
          parse_mode: 'Markdown',
          reply_markup: question.keyboard.reply_markup
        }).catch(async () => {
          await ctx.reply(questionText, {
            parse_mode: 'Markdown',
            reply_markup: question.keyboard.reply_markup
          });
        });
      }

      console.log(`✅ Вопрос ${questionKey} отправлен пользователю`);

    } catch (error) {
      console.error(`❌ Ошибка при отправке вопроса ${questionKey}:`, error);
      await ctx.reply('Произошла ошибка. Попробуйте /restart');
    }
  }

  generateProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    const bar = '▓'.repeat(filled) + '░'.repeat(empty);
    return `📊 Прогресс: ${bar} ${percentage}%`;
  }

  async handleSurveyAnswer(ctx, callbackData) {
    console.log(`📝 Обрабатываем ответ: ${callbackData}`);

    if (!ctx.session) {
      console.error('❌ Сессия отсутствует!');
      await ctx.reply('Сессия истекла. Начните заново: /start');
      return;
    }

    const currentQuestion = ctx.session.currentQuestion;
    
    if (!currentQuestion) {
      console.error('❌ Текущий вопрос не установлен!');
      await ctx.reply('Ошибка: текущий вопрос не найден. Попробуйте /restart');
      return;
    }

    console.log(`📌 Текущий вопрос: ${currentQuestion}`);

    // Обработка навигации "Назад"
    if (callbackData === 'nav_back') {
      return await this.handleNavBack(ctx);
    }

    const question = this.surveyQuestions.getQuestion(currentQuestion);
    
    if (!question) {
      console.error(`❌ Вопрос ${currentQuestion} не найден в surveyQuestions`);
      await ctx.reply('Ошибка загрузки вопроса. Попробуйте /restart');
      return;
    }

    // Обработка множественного выбора
    if (question.type === 'multiple_choice') {
      return await this.handleMultipleChoice(ctx, callbackData, question);
    }

    // Обработка одиночного выбора
    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
    
    console.log(`✅ Маппинг: ${callbackData} -> ${mappedValue}`);

    // Валидация ответа
    const validation = this.surveyQuestions.validateAnswer(
      currentQuestion,
      mappedValue
    );

    if (!validation.valid) {
      await ctx.answerCbQuery(validation.error || 'Некорректный ответ');
      return;
    }

    // Сохраняем ответ
    ctx.session.answers[currentQuestion] = mappedValue;
    
    if (!ctx.session.completedQuestions.includes(currentQuestion)) {
      ctx.session.completedQuestions.push(currentQuestion);
    }

    console.log(`💾 Ответ сохранен: ${currentQuestion} = ${mappedValue}`);
    console.log(`📊 Всего ответов: ${Object.keys(ctx.session.answers).length}`);

    // Переходим к следующему вопросу
    await this.moveToNextQuestion(ctx);
  }

  async handleMultipleChoice(ctx, callbackData, question) {
    const currentQuestion = ctx.session.currentQuestion;
    
    // Инициализируем массив выборов если его нет
    if (!ctx.session.multipleChoiceSelections) {
      ctx.session.multipleChoiceSelections = {};
    }
    
    if (!ctx.session.multipleChoiceSelections[currentQuestion]) {
      ctx.session.multipleChoiceSelections[currentQuestion] = [];
    }

    const selections = ctx.session.multipleChoiceSelections[currentQuestion];

    // Проверяем, это кнопка "Завершить выбор"
    if (callbackData.endsWith('_done')) {
      console.log(`✅ Завершение выбора для ${currentQuestion}`);
      
      // Валидация минимального количества выборов
      if (question.minSelections && selections.length < question.minSelections) {
        await ctx.answerCbQuery(`Выберите минимум ${question.minSelections} вариант(ов)`);
        return;
      }

      // Сохраняем ответы
      ctx.session.answers[currentQuestion] = [...selections];
      
      if (!ctx.session.completedQuestions.includes(currentQuestion)) {
        ctx.session.completedQuestions.push(currentQuestion);
      }

      console.log(`💾 Множественный выбор сохранен: ${currentQuestion} = [${selections.join(', ')}]`);

      // Очищаем временные выборы
      delete ctx.session.multipleChoiceSelections[currentQuestion];

      // Переходим к следующему вопросу
      return await this.moveToNextQuestion(ctx);
    }

    // Обычный выбор элемента
    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);

    // Проверяем лимит выборов
    if (question.maxSelections && selections.length >= question.maxSelections && !selections.includes(mappedValue)) {
      await ctx.answerCbQuery(`Можно выбрать максимум ${question.maxSelections} вариант(ов)`);
      return;
    }

    // Добавляем или убираем выбор
    if (selections.includes(mappedValue)) {
      const index = selections.indexOf(mappedValue);
      selections.splice(index, 1);
      await ctx.answerCbQuery('✖️ Выбор убран');
      console.log(`➖ Убран выбор: ${mappedValue}`);
    } else {
      selections.push(mappedValue);
      await ctx.answerCbQuery('✓ Выбрано');
      console.log(`➕ Добавлен выбор: ${mappedValue}`);
    }

    console.log(`📋 Текущие выборы для ${currentQuestion}: [${selections.join(', ')}]`);
  }

  async handleNavBack(ctx) {
    console.log('⬅️ Навигация назад');
    
    const currentQuestion = ctx.session.currentQuestion;
    const previousQuestion = this.surveyQuestions.getPreviousQuestion(
      currentQuestion,
      ctx.session.answers
    );

    if (!previousQuestion) {
      console.log('⚠️ Нет предыдущего вопроса, возврат к началу');
      await ctx.answerCbQuery('Это первый вопрос');
      return;
    }

    console.log(`⬅️ Переход к предыдущему вопросу: ${previousQuestion}`);

    // Убираем текущий вопрос из завершенных
    const index = ctx.session.completedQuestions.indexOf(currentQuestion);
    if (index > -1) {
      ctx.session.completedQuestions.splice(index, 1);
    }

    // Удаляем ответ на текущий вопрос
    delete ctx.session.answers[currentQuestion];

    // Задаем предыдущий вопрос
    await this.askQuestion(ctx, previousQuestion);
  }

  async moveToNextQuestion(ctx) {
    console.log('➡️ Переход к следующему вопросу');
    
    const currentQuestion = ctx.session.currentQuestion;
    const nextQuestion = this.surveyQuestions.getNextQuestion(
      currentQuestion,
      ctx.session.answers
    );

    if (!nextQuestion) {
      console.log('✅ Анкета завершена!');
      return await this.completeSurvey(ctx);
    }

    console.log(`➡️ Следующий вопрос: ${nextQuestion}`);
    
    // Проверяем условие показа следующего вопроса
    if (!this.surveyQuestions.shouldShowQuestion(nextQuestion, ctx.session.answers)) {
      console.log(`⏭️ Пропускаем вопрос ${nextQuestion} (не подходит по условиям)`);
      ctx.session.currentQuestion = nextQuestion;
      return await this.moveToNextQuestion(ctx);
    }

    await this.askQuestion(ctx, nextQuestion);
  }

  async completeSurvey(ctx) {
    console.log('🎉 Завершение анкеты');
    
    try {
      const surveyDuration = Date.now() - ctx.session.startTime;
      console.log(`⏱️ Длительность анкетирования: ${Math.round(surveyDuration / 1000)} сек`);

      // Отправляем сообщение о завершении
      await ctx.editMessageText(
        '✅ *Диагностика завершена!*\n\n⏳ Анализирую ваши ответы...',
        { parse_mode: 'Markdown' }
      );

      // VERSE-анализ
      console.log('🧠 Запуск VERSE-анализа...');
      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      console.log('✅ VERSE-анализ завершен:', analysisResult.segment);

      // Сохраняем результаты
      ctx.session.analysisResult = analysisResult;
      ctx.session.completedAt = new Date().toISOString();

      // Отображаем результаты
      await this.showResults(ctx, analysisResult);

      // Передача лида
      console.log('📤 Передача лида...');
      await this.transferLead(ctx, analysisResult);

    } catch (error) {
      console.error('❌ Ошибка завершения анкеты:', error);
      await ctx.reply(
        '😔 Произошла ошибка при обработке результатов. Обратитесь к @NastuPopova',
        { parse_mode: 'Markdown' }
      );
    }
  }

  async showResults(ctx, analysisResult) {
    console.log('📊 Показываем результаты анализа');
    
    const message = analysisResult.personalMessage || 'Ваши результаты готовы!';
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎁 Получить персональную технику', 'get_bonus')],
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
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
        analysisResult: analysisResult,
        surveyType: analysisResult.analysisType,
        completedAt: new Date().toISOString(),
        surveyDuration: Date.now() - ctx.session.startTime
      };

      await this.leadTransfer.processLead(userData);
      console.log('✅ Лид успешно передан');

      // Уведомление админа
      if (this.bot.adminIntegration) {
        await this.bot.adminIntegration.notifySurveyResults(userData);
      }

    } catch (error) {
      console.error('❌ Ошибка передачи лида:', error);
    }
  }

  async handleProgramHelp(ctx) {
    console.log('🤔 handleProgramHelp');
    
    if (!this.pdfManager?.handleHelpChooseProgram) {
      return await this.showBuiltInProgramHelp(ctx);
    }

    try {
      await this.pdfManager.handleHelpChooseProgram(ctx);
    } catch (error) {
      console.error('❌ Ошибка handleProgramHelp:', error);
      await this.showBuiltInProgramHelp(ctx);
    }
  }

  async showBuiltInProgramHelp(ctx) {
    const message = `🤔 *КАК ВЫБРАТЬ ПРОГРАММУ?*\n\n` +
      `🛒 **Стартовый комплект** — для самостоятельного изучения\n\n` +
      `👨‍⚕️ **Персональная консультация** — индивидуальный подход\n\n` +
      `💬 Для точной рекомендации напишите @NastuPopova`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
      ])
    });
  }

  async handleError(ctx, error) {
    console.error('Обработка ошибки:', error);
    try {
      await ctx.reply('Произошла ошибка. Попробуйте /start или напишите @NastuPopova');
    } catch {}
  }

  logCallbackDiagnostics(ctx, callbackData) {
    console.log('=== ДИАГНОСТИКА CALLBACK ===');
    console.log('Data:', callbackData);
    console.log('User:', ctx.from?.id);
    console.log('Session:', !!ctx.session);
    console.log('=====================================');
  }

  getStats() {
    return {
      name: 'MainHandlers',
      version: '6.0.0-COMPLETE',
      features: ['full_survey_working', 'launch_test_button', 'extended_questions_support', 'complete_handlers'],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
