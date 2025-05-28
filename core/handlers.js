const { Markup } = require('telegraf');
const config = require('../config');

class Handlers {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    
    // Ссылки на модули системы
    this.surveyQuestions = botInstance.surveyQuestions;
    this.verseAnalysis = botInstance.verseAnalysis;
    this.leadTransfer = botInstance.leadTransfer;
    this.pdfManager = botInstance.pdfManager;
    this.adminNotifications = botInstance.adminNotifications;
  }

  // Настройка обработчиков
  setup() {
    console.log('🔧 Настройка обработчиков...');

    // Команды
    this.telegramBot.start(ctx => this.handleStart(ctx));
    this.telegramBot.command('reset', ctx => this.handleReset(ctx));
    this.telegramBot.command('help', ctx => this.handleHelp(ctx));
    this.telegramBot.command('about', ctx => this.handleAbout(ctx));
    this.telegramBot.command('contact', ctx => this.handleContact(ctx));

    // Callback-запросы
    this.telegramBot.action(/.*/, ctx => this.handleCallback(ctx));
    this.telegramBot.action(/download_static_(.+)/, ctx => this.handleStaticPDFDownload(ctx));
    this.telegramBot.action(/download_(.+)/, ctx => this.handlePDFDownload(ctx));
    this.telegramBot.action('more_materials', ctx => this.handleMoreMaterials(ctx));
    this.telegramBot.action('retry_pdf', ctx => this.handlePDFRetry(ctx));
    this.telegramBot.action(/admin_(.+)_(\d+)/, ctx => this.handleAdminAction(ctx));

    // Админские команды
    this.telegramBot.command('pdfstats', ctx => this.handleAdminPDFStats(ctx));
    this.telegramBot.command('testpdf', ctx => this.handleTestPDF(ctx));

    // Обработка текста
    this.telegramBot.on('text', ctx => this.handleText(ctx));

    // Дополнительные действия
    this.telegramBot.action('other_programs', ctx => this.handleOtherPrograms(ctx));
    this.telegramBot.action(/order_(.+)/, ctx => this.handleOrderProgram(ctx));
    this.telegramBot.action('help_choose', ctx => this.handleHelpChoose(ctx));

    console.log('✅ Обработчики настроены');
  }

  async handleStart(ctx) {
    try {
      ctx.session = this.bot.middleware.getDefaultSession();
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка запуска' });
      await ctx.reply('😔 Ошибка запуска', { parse_mode: 'Markdown' });
    }
  }

  async handleReset(ctx) {
    try {
      ctx.session = this.bot.middleware.getDefaultSession();
      await ctx.reply('🔄 Сессия сброшена. Начните заново: /start');
    } catch (error) {
      console.error('❌ Ошибка /reset:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка сброса' });
      await ctx.reply('😔 Ошибка сброса', { parse_mode: 'Markdown' });
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка обработки контакта' });
      await ctx.reply(config.MESSAGES.CONTACT_TRAINER, { parse_mode: 'Markdown' });
    }
  }

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    
    console.log(`🔍 DEBUG: Получен callback: ${data}`);
    if (data.startsWith('download_pdf_')) {
      console.log(`🎯 Это статичный PDF запрос: ${data}`);
    }
    
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
      } else if (data === 'other_programs') {
        await this.handleOtherPrograms(ctx);
      } else if (data.startsWith('order_')) {
        await this.handleOrderProgram(ctx);
      } else if (data === 'help_choose') {
        await this.handleHelpChoose(ctx);
      } else {
        await this.handleSurveyAnswer(ctx, data);
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ Ошибка callback:', error, { data });
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка обработки callback' });
      await ctx.reply('😔 Ошибка обработки', { parse_mode: 'Markdown' });
    }
  }

  async handleStaticPDFDownload(ctx) {
    try {
      const pdfType = ctx.match[1];
      console.log(`📄 Запрос статичного PDF: ${pdfType}`);
      
      await ctx.answerCbQuery('📥 Отправляю статичный PDF...');
      await this.pdfManager.sendAdditionalPDF(ctx, pdfType);
      
      this.pdfManager.logBonusDelivery(
        ctx.from.id,
        `static_${pdfType}`,
        'static_pdf',
        ctx.session?.analysisResult?.segment || 'UNKNOWN',
        'static_material'
      );
      
    } catch (error) {
      console.error('❌ Ошибка handleStaticPDFDownload:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка загрузки PDF' });
      await ctx.answerCbQuery('❌ Ошибка загрузки PDF');
    }
  }

  async handlePDFDownload(ctx) {
    try {
      const bonusId = ctx.match[1];
      
      console.log(`📥 Запрос персонального гида: ${bonusId}`);
      
      if (!ctx.session?.analysisResult) {
        await ctx.answerCbQuery('⚠️ Пройдите анкету заново', { show_alert: true });
        return;
      }

      const bonus = this.pdfManager.getBonusForUser(
        ctx.session.analysisResult,
        ctx.session.answers
      );

      await ctx.answerCbQuery('📥 Готовлю ваш персональный гид...');
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка загрузки PDF' });
      await ctx.answerCbQuery('❌ Ошибка загрузки. Попробуйте позже.', { show_alert: true });
    }
  }

  async handleMoreMaterials(ctx) {
    try {
      await this.pdfManager.showMoreMaterials(ctx);
    } catch (error) {
      console.error('❌ Ошибка handleMoreMaterials:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка загрузки материалов' });
      await ctx.reply('😔 Ошибка загрузки материалов', { parse_mode: 'Markdown' });
    }
  }

  async handlePDFRetry(ctx) {
    try {
      if (!ctx.session?.analysisResult) {
        await ctx.answerCbQuery('Пройдите анкету заново');
        return;
      }

      const bonus = this.pdfManager.getBonusForUser(
        ctx.session.analysisResult, 
        ctx.session.answers
      );
      
      await ctx.answerCbQuery('📥 Повторно отправляю файл...');
      await this.pdfManager.sendPDFFile(ctx, bonus);
      
    } catch (error) {
      console.error('❌ Ошибка handlePDFRetry:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка повторной отправки PDF' });
      await ctx.answerCbQuery('Ошибка отправки');
    }
  }

  async handleAdminAction(ctx) {
    try {
      const action = ctx.match[1];
      const targetUserId = ctx.match[2];
      await this.adminNotifications.handleAdminCallback(ctx, action, targetUserId);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ Ошибка handleAdminAction:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка админского действия' });
      await ctx.reply('😔 Ошибка обработки админского действия', { parse_mode: 'Markdown' });
    }
  }

  async handleAdminPDFStats(ctx) {
    if (ctx.from.id.toString() !== config.ADMIN_ID) return;
    
    try {
      const stats = this.pdfManager.getBonusStats();
      const message = `📊 *СТАТИСТИКА PDF-БОНУСОВ*\n\n` +
        `📚 Доступно бонусов: ${stats.available_bonuses}\n` +
        `🎯 Типы: ${stats.bonus_types.join(', ')}\n` +
        `📈 Сегменты: ${stats.target_segments.length}\n` +
        `🕐 Обновлено: ${new Date(stats.last_updated).toLocaleString('ru')}`;
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Ошибка handleAdminPDFStats:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка получения статистики PDF' });
      await ctx.reply('😔 Ошибка получения статистики', { parse_mode: 'Markdown' });
    }
  }

  async handleTestPDF(ctx) {
    if (ctx.from.id.toString() !== config.ADMIN_ID) return;
    
    try {
      const bonus = this.pdfManager.bonuses.adult;
      await this.pdfManager.sendPDFFile(ctx, bonus);
      await ctx.reply('✅ Тестовый PDF отправлен');
    } catch (error) {
      console.error('❌ Ошибка тестовой отправки PDF:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка тестовой отправки PDF' });
      await ctx.reply('❌ Ошибка отправки тестового PDF');
    }
  }

  async startSurvey(ctx) {
    try {
      ctx.session.currentQuestion = 'age_group';
      ctx.session.questionStartTime = Date.now();
      await this.askQuestion(ctx, 'age_group');
    } catch (error) {
      console.error('❌ Ошибка startSurvey:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка начала анкеты' });
      await ctx.reply('😔 Ошибка начала анкеты', { parse_mode: 'Markdown' });
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка показа информации об анкете' });
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

      // Используем процент прогресса вместо прогресс-бара
      let message = `Прогресс: ${Math.round(progress.percentage)}% (${progress.completed}/${progress.total})\n\n${question.text}`;

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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка отображения вопроса' });
      await ctx.reply('😔 Ошибка отображения вопроса', { parse_mode: 'Markdown' });
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка обработки ответа' });
      await ctx.reply('😔 Ошибка обработки ответа', { parse_mode: 'Markdown' });
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка множественного выбора' });
      await ctx.reply('😔 Ошибка множественного выбора', { parse_mode: 'Markdown' });
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка навигации назад' });
      await ctx.reply('😔 Ошибка навигации', { parse_mode: 'Markdown' });
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка перехода к следующему вопросу' });
      await ctx.reply('😔 Ошибка перехода', { parse_mode: 'Markdown' });
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

      const bonus = this.pdfManager.getBonusForUser(analysisResult, ctx.session.answers);
      const bonusMessage = this.pdfManager.generateBonusMessage(bonus, analysisResult);
      const bonusKeyboard = this.pdfManager.generateBonusKeyboard(bonus, 'file');

      await ctx.editMessageText(bonusMessage, {
        parse_mode: 'Markdown',
        ...bonusKeyboard
      });

      if (analysisResult.segment === 'HOT_LEAD') {
        setTimeout(async () => {
          await this.pdfManager.sendPDFFile(ctx, bonus);
          await ctx.reply(
            '⚡ *Срочная рекомендация:* Начните с первой техники прямо сейчас!',
            { parse_mode: 'Markdown' }
          );
        }, 2000);
      }

      await this.transferLeadAsync(ctx);
    } catch (error) {
      console.error('❌ Ошибка completeSurvey:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка завершения анкеты' });
      await ctx.reply('😔 Ошибка анализа', { parse_mode: 'Markdown' });
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
    } catch (error) {
      console.error('❌ Ошибка showResults:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка показа результатов' });
      await ctx.reply('😔 Ошибка показа результатов', { parse_mode: 'Markdown' });
    }
  }

  async transferLeadAsync(ctx) {
    try {
      const bonus = this.pdfManager.getBonusForUser(
        ctx.session.analysisResult, 
        ctx.session.answers
      );

      const userData = {
        userInfo: {
          telegram_id: ctx.from?.id?.toString() || 'unknown',
          username: ctx.from?.username || 'unknown',
          first_name: ctx.from?.first_name || 'Пользователь'
        },
        surveyAnswers: ctx.session.answers || {},
        analysisResult: ctx.session.analysisResult || {},
        bonusDelivered: {
          bonus_id: bonus.id,
          bonus_title: bonus.title,
          delivery_time: new Date().toISOString()
        },
        contactInfo: ctx.session.contactInfo || {},
        surveyType: this.surveyQuestions.isChildFlow(ctx.session.answers) ? 'child' : 'adult',
        startTime: ctx.session.startTime
      };
      
      console.log(`🔍 Передача лида с бонусом:`, userData);
      await this.adminNotifications.notifySurveyResults(userData);
      await this.adminNotifications.notifyNewLead(userData);
      await this.leadTransfer.processLead(userData);
    } catch (error) {
      console.error('❌ Ошибка передачи лида:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка передачи лида' });
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
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка обработки текста' });
      await ctx.reply('😔 Ошибка обработки текста', { parse_mode: 'Markdown' });
    }
  }

  async handleOtherPrograms(ctx) {
    try {
      await this.pdfManager.showAllPrograms(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ Ошибка handleOtherPrograms:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка показа программ' });
      await ctx.answerCbQuery('Ошибка загрузки программ');
    }
  }

  async handleOrderProgram(ctx) {
    try {
      const programType = ctx.match[1];
      await this.pdfManager.showOrderDetails(ctx, programType);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ Ошибка handleOrderProgram:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка обработки заказа' });
      await ctx.answerCbQuery('Ошибка обработки заказа');
    }
  }

  async handleHelpChoose(ctx) {
    try {
      await this.pdfManager.showProgramHelper(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ Ошибка handleHelpChoose:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка помощника выбора' });
      await ctx.answerCbQuery('Ошибка помощника выбора');
    }
  }

  getTranslatedSelections(selections) {
    return selections.map(selection => {
      return config.TRANSLATIONS[selection] || selection;
    });
  }

  debugStressLevelCallback(ctx, callbackData) {
    console.log('🔬 ULTRA DETAILED STRESS_LEVEL DEBUG:', {
      callbackData,
      expectedFormat: 'stress_1 to stress_10',
      isValidFormat: /^stress_\d+$/.test(callbackData),
      extractedValue: callbackData.split('_')[1],
      parsedIntValue: parseInt(callbackData.split('_')[1]),
      isValidValue: parseInt(callbackData.split('_')[1]) >= 1 && 
                    parseInt(callbackData.split('_')[1]) <= 10,
      sessionCurrentQuestion: ctx.session.currentQuestion,
      questionType: 'scale'
    });
  }
}

module.exports = Handlers;
