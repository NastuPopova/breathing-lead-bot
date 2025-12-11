// core/handlers.js — ИСПРАВЛЕННАЯ ВЕРСИЯ (декабрь 2025)

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
      surveyQuestions: !!this.surveyQuestions,
      verseAnalysis: !!this.verseAnalysis,
    };
    Object.entries(checks).forEach(([k, v]) => console.log(`${v ? '✅' : '❌'} ${k}`));
  }

  setup() {
    console.log('⚙️ Настройка обработчиков...');
    this.setupUserCommands();
    this.setupUserCallbacks();
    this.setupTextHandlers();
    console.log('✅ Все обработчики готовы');
  }

  // ═══════════════════════════════════════════════════════════
  // 1. КОМАНДЫ — ИСПРАВЛЕНО
  // ═══════════════════════════════════════════════════════════
  setupUserCommands() {
    this.telegramBot.start(async (ctx) => {
      try {
        await this.handleStart(ctx);
      } catch (e) {
        console.error('❌ Ошибка в /start:', e);
        await ctx.reply('Произошла ошибка. Попробуйте ещё раз через /start');
      }
    });

    this.telegramBot.command('help', async (ctx) => {
      await ctx.reply('Начните с команды /start для диагностики дыхания');
    });

    this.telegramBot.command('restart', async (ctx) => {
      ctx.session = { startTime: Date.now(), answers: {} };
      await ctx.reply('Сессия сброшена. Нажмите /start для новой диагностики');
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 2. CALLBACK QUERIES — ИСПРАВЛЕНО
  // ═══════════════════════════════════════════════════════════
  setupUserCallbacks() {
    this.telegramBot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;
      await ctx.answerCbQuery().catch(() => {});

     // НАЧАЛО АНКЕТЫ — САМАЯ ВАЖНАЯ СТРОКА!
      if (data === 'begin_survey') {
        console.log('Пользователь начал анкету');
        const firstQuestion = this.surveyQuestions.getFirstQuestion();
        if (!firstQuestion) {
          await ctx.reply('Ошибка: анкета не загрузилась. Напишите @NastuPopova');
          return;
        }
        ctx.session.currentQuestion = firstQuestion;
        ctx.session.answers = {};
        await this.askQuestion(ctx, firstQuestion);
        return;
      }

      // ═══ ПЕРЕХОД К СЛЕДУЮЩЕМУ ВОПРОСУ ═══
      if (data === 'next') {
        await this.moveToNextQuestion(ctx);
        return;
      }

      // ═══ ВЫБОР ОТВЕТА ═══
      if (data.startsWith('answer_')) {
        const key = data.replace('answer_', '');
        const q = ctx.session.currentQuestion;
        
        if (!q) {
          console.error('❌ Нет текущего вопроса в сессии');
          await ctx.reply('Ошибка сессии. Начните заново: /start');
          return;
        }

        ctx.session.answers = ctx.session.answers || {};

        const questionData = this.surveyQuestions.getQuestion(q);
        if (!questionData) {
          console.error(`❌ Вопрос ${q} не найден`);
          return;
        }

        // Проверка на множественный выбор
        if (this.surveyQuestions.isMultipleChoice(q)) {
          ctx.session.answers[q] = ctx.session.answers[q] || [];
          if (ctx.session.answers[q].includes(key)) {
            ctx.session.answers[q] = ctx.session.answers[q].filter((x) => x !== key);
          } else {
            ctx.session.answers[q].push(key);
          }
        } else {
          ctx.session.answers[q] = key;
        }
        
        console.log(`📝 Ответ сохранён: ${q} = ${JSON.stringify(ctx.session.answers[q])}`);
        await this.askQuestion(ctx, q);
        return;
      }

      // ═══ НАЗАД ═══
      if (data === 'back') {
        const prev = this.surveyQuestions.getPreviousQuestion(
          ctx.session.currentQuestion,
          ctx.session.answers
        );
        if (prev) {
          delete ctx.session.answers[ctx.session.currentQuestion];
          ctx.session.currentQuestion = prev;
          await this.askQuestion(ctx, prev);
        } else {
          await ctx.reply('Вы на первом вопросе');
        }
        return;
      }

      // ═══ ПОЛУЧИТЬ ПЕРСОНАЛЬНУЮ ТЕХНИКУ ═══
      if (data === 'get_bonus') {
        await ctx.answerCbQuery('Готовлю ваш гид...');
        const bonus = this.pdfManager.getBonusForUser(
          ctx.session.analysisResult,
          ctx.session.answers || {}
        );
        ctx.session.pendingBonus = bonus;
        await this.sendIntriguingTeaser(ctx, bonus, ctx.session.analysisResult);

        await ctx.reply('Нажмите, чтобы получить PDF:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📥 Получить мой гид (PDF)', callback_data: 'download_bonus' }]
            ]
          }
        });
        return;
      }

      // ═══ СКАЧАТЬ PDF ═══
      if (data === 'download_bonus') {
        await ctx.answerCbQuery('Отправляю файл...');
        const bonus = ctx.session?.pendingBonus;
        if (!bonus) {
          await ctx.reply('Гид не найден. Пройдите заново: /start');
          return;
        }

        await this.pdfManager.sendPDFFile(ctx, bonus);
        await ctx.reply('*✅ Гид отправлен выше!*', { parse_mode: 'Markdown' });
        await this.pdfManager.fileHandler.showPostPDFMenu(ctx);
        delete ctx.session.pendingBonus;
        return;
      }

      // ═══ ПОМОЩЬ В ВЫБОРЕ ПРОГРАММЫ ═══
      if (data === 'help_choose_program') {
        await this.handleProgramHelp(ctx);
        return;
      }

      // ═══ ВЕРНУТЬСЯ К РЕЗУЛЬТАТАМ ═══
      if (data === 'back_to_results' && ctx.session?.analysisResult) {
        await this.showResults(ctx, ctx.session.analysisResult);
        return;
      }

      // ═══ ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ ═══
      if (data === 'more_materials') {
        await this.pdfManager.fileHandler.showMoreMaterials(ctx);
        return;
      }

      // ═══ ВСЕ ПРОГРАММЫ ═══
      if (data === 'show_all_programs') {
        await this.pdfManager.fileHandler.showAllPrograms(ctx);
        return;
      }

      // ═══ ЗАКАЗ ПРОГРАММ ═══
      if (data === 'order_starter') {
        await this.pdfManager.fileHandler.handleOrderStarter(ctx);
        return;
      }

      if (data === 'order_individual') {
        await this.pdfManager.fileHandler.handleOrderIndividual(ctx);
        return;
      }

      // ═══ СКАЧИВАНИЕ СТАТИЧНЫХ PDF ═══
      if (data.startsWith('download_static_')) {
        await this.pdfManager.fileHandler.handleDownloadRequest(ctx, data);
        return;
      }

      // ═══ УДАЛЕНИЕ МЕНЮ ═══
      if (data === 'delete_menu' || data === 'close_menu') {
        await this.pdfManager.fileHandler.closeMenu(ctx);
        return;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 3. ТЕКСТОВЫЕ СООБЩЕНИЯ — ИСПРАВЛЕНО
  // ═══════════════════════════════════════════════════════════
  setupTextHandlers() {
    this.telegramBot.on('text', async (ctx) => {
      // Игнорируем команды (они обрабатываются отдельно)
      if (ctx.message.text.startsWith('/')) {
        return;
      }

      // Сбрасываем сессию и предлагаем начать
      ctx.session = { startTime: Date.now(), answers: {} };
      await ctx.reply('Я работаю только через кнопки. Давайте начнём:', {
        reply_markup: {
          inline_keyboard: [[{ text: '🎯 Начать диагностику', callback_data: 'begin_survey' }]]
        }
      });
    });

    this.telegramBot.on(['sticker', 'photo', 'video', 'voice', 'document'], async (ctx) => {
      await ctx.reply('❤️');
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 4. ОБРАБОТКА СТАРТА
  // ═══════════════════════════════════════════════════════════
  async handleStart(ctx) {
    console.log(`👤 Пользователь ${ctx.from.id} запустил бота`);
    
    ctx.session = { 
      startTime: Date.now(), 
      answers: {},
      currentQuestion: null 
    };

    const message = '👋 **Привет!**\n\n' +
      'Я помогу подобрать дыхательные практики под ваши задачи.\n\n' +
      '⏱️ Это займёт всего **2-3 минуты**\n\n' +
      '🎁 В конце вы получите **персональный гид** с техникой, ' +
      'подобранной специально для вас!';

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎯 Начать диагностику', callback_data: 'begin_survey' }]
        ]
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 5. ПОКАЗ ВОПРОСА — ИСПРАВЛЕНО
  // ═══════════════════════════════════════════════════════════
  async askQuestion(ctx, key) {
    const q = this.surveyQuestions.getQuestion(key);
    
    if (!q) {
      console.log(`✅ Вопрос ${key} не найден — завершаем анкету`);
      return this.completeSurvey(ctx);
    }

    console.log(`❓ Показываем вопрос: ${key}`);
    ctx.session.currentQuestion = key;

    // Формируем клавиатуру
    const keyboard = [];
    const currentAnswers = ctx.session.answers[key];
    
    // ИСПРАВЛЕНО: правильная обработка ответов
    if (Array.isArray(q.answers)) {
      // Формат: [{key: 'x', text: 'X'}]
      for (const answer of q.answers) {
        const isSelected = Array.isArray(currentAnswers) && currentAnswers.includes(answer.key);
        const buttonText = isSelected ? `✅ ${answer.text}` : answer.text;
        keyboard.push([
          Markup.button.callback(buttonText, `answer_${answer.key}`)
        ]);
      }
    } else {
      // Формат объекта: {key: 'text'}
      for (const [answerKey, answerText] of Object.entries(q.answers)) {
        const isSelected = currentAnswers === answerKey;
        const buttonText = isSelected ? `✅ ${answerText}` : answerText;
        keyboard.push([
          Markup.button.callback(buttonText, `answer_${answerKey}`)
        ]);
      }
    }

    // Добавляем кнопки навигации
    const navButtons = [];
    
    // Кнопка "Далее" для множественного выбора или если ответ выбран
    if (this.surveyQuestions.isMultipleChoice(key)) {
      navButtons.push(Markup.button.callback('➡️ Далее', 'next'));
    } else if (currentAnswers) {
      navButtons.push(Markup.button.callback('➡️ Далее', 'next'));
    }

    // Кнопка "Назад"
    const prevQuestion = this.surveyQuestions.getPreviousQuestion(key, ctx.session.answers);
    if (prevQuestion) {
      navButtons.push(Markup.button.callback('⬅️ Назад', 'back'));
    }

    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }

    // Отправляем вопрос
    try {
      await ctx.editMessageText(q.text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (editError) {
      // Если редактирование не удалось, отправляем новое сообщение
      await ctx.reply(q.text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. ПЕРЕХОД К СЛЕДУЮЩЕМУ ВОПРОСУ
  // ═══════════════════════════════════════════════════════════
  async moveToNextQuestion(ctx) {
    if (!ctx.session?.currentQuestion) {
      console.error('❌ Нет текущего вопроса');
      return;
    }

    const next = this.surveyQuestions.getNextQuestion(
      ctx.session.currentQuestion,
      ctx.session.answers
    );

    if (!next) {
      console.log('✅ Больше нет вопросов — завершаем анкету');
      return this.completeSurvey(ctx);
    }

    // Проверяем, нужно ли показывать следующий вопрос
    if (this.surveyQuestions.shouldShowQuestion(next, ctx.session.answers)) {
      ctx.session.currentQuestion = next;
      return this.askQuestion(ctx, next);
    } else {
      // Пропускаем вопрос и идём дальше
      console.log(`⏭️ Пропускаем вопрос ${next}`);
      ctx.session.currentQuestion = next;
      return this.moveToNextQuestion(ctx);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 7. ЗАВЕРШЕНИЕ АНКЕТЫ
  // ═══════════════════════════════════════════════════════════
  async completeSurvey(ctx) {
    console.log('🎉 Анкета завершена');
    console.log('📊 Ответы:', JSON.stringify(ctx.session.answers, null, 2));

    await ctx.editMessageText('✅ Диагностика завершена! Анализирую ответы...', {
      parse_mode: 'Markdown'
    });

    // Анализ результатов
    const result = this.verseAnalysis.analyzeUser(ctx.session.answers);
    ctx.session.analysisResult = result;

    console.log('📈 Результат анализа:', JSON.stringify(result, null, 2));

    // Показываем результаты
    await this.showResults(ctx, result);
    
    // Передаём лид
    await this.transferLead(ctx, result);
  }

  // ═══════════════════════════════════════════════════════════
  // 8. ПОКАЗ РЕЗУЛЬТАТОВ
  // ═══════════════════════════════════════════════════════════
  async showResults(ctx, result) {
    const msg = result.personalMessage || '✨ Ваши результаты готовы!';
    
    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎁 Получить персональную технику', callback_data: 'get_bonus' }],
          [{ text: '📞 Записаться на консультацию', url: 'https://t.me/NastuPopova' }]
        ]
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 9. ПЕРЕДАЧА ЛИДА
  // ═══════════════════════════════════════════════════════════
  async transferLead(ctx, result) {
    try {
      const data = {
        userInfo: {
          telegram_id: ctx.from.id,
          username: ctx.from.username || null,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name || null,
        },
        surveyAnswers: ctx.session.answers || {},
        analysisResult: result,
        surveyType: result.analysisType,
        completedAt: new Date().toISOString(),
        surveyDuration: Date.now() - ctx.session.startTime
      };

      await this.leadTransfer.processLead(data);
      console.log('✅ Лид успешно передан');

      // Админ-уведомления
      if (this.bot.adminIntegration) {
        try {
          await this.bot.adminIntegration.notifySurveyResults(data);
        } catch (e) {
          console.warn('⚠️ Админ-уведомление не отправлено:', e.message);
        }
      }
    } catch (err) {
      console.error('❌ Ошибка передачи лида:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 10. ПОМОЩЬ В ВЫБОРЕ ПРОГРАММЫ
  // ═══════════════════════════════════════════════════════════
  async handleProgramHelp(ctx) {
    if (this.pdfManager?.fileHandler?.handleHelpChooseProgram) {
      await this.pdfManager.fileHandler.handleHelpChooseProgram(ctx);
    } else {
      await ctx.reply(
        '*🤔 Как выбрать программу?*\n\n' +
        'Напишите @NastuPopova — Анастасия поможет подобрать ' +
        'оптимальный вариант под вашу ситуацию!',
        { parse_mode: 'Markdown' }
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 11. ТИЗЕР ПЕРЕД PDF
  // ═══════════════════════════════════════════════════════════
  async sendIntriguingTeaser(ctx, bonus, analysisResult) {
    const t = bonus.technique;
    const isHot = analysisResult.segment === 'HOT_LEAD';
    const isChild = analysisResult.analysisType === 'child';

    let msg = isChild 
      ? '🎁 *Персональная игровая техника для вашего ребёнка готова\\!*\n\n'
      : '🎁 *Ваша персональная техника готова\\!*\n\n';

    msg += `*«${this.escapeMarkdown(t.name)}»*\n\n`;
    msg += `🎯 Проблема: ${this.escapeMarkdown(t.problem)}\n`;
    msg += `⏱️ Время: ${this.escapeMarkdown(t.duration)}\n`;
    msg += `✨ Результат: ${this.escapeMarkdown(t.result)}\n\n`;

    if (isHot) {
      msg += '🚨 *СРОЧНО\\!* Начните прямо сейчас\\!\n\n';
    }

    msg += '📥 Нажмите кнопку ниже, чтобы получить полный гид\\!';

    await ctx.reply(msg, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 12. ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ═══════════════════════════════════════════════════════════
  escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  async handleError(ctx, error) {
    console.error('❌ Ошибка обработчика:', error);
    try {
      await ctx.reply(
        '😔 Произошла ошибка. Попробуйте начать заново: /start\n\n' +
        'Если проблема повторяется, напишите @NastuPopova'
      );
    } catch (replyError) {
      console.error('❌ Не удалось отправить сообщение об ошибке:', replyError);
    }
  }

  getStats() {
    return {
      name: 'Handlers',
      version: 'FIXED-2025',
      features: ['survey', 'pdf_delivery', 'lead_transfer', 'error_handling'],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
