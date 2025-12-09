// Файл: core/handlers.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С РАБОТАЮЩИМИ КНОПКАМИ

const { Markup } = require('telegraf');
const config = require('../config');

class Handlers {
  constructor(botInstance) {
    this.bot = botInstance;
    this.telegramBot = botInstance.bot;
    
    this.surveyQuestions = botInstance.surveyQuestions;
    this.verseAnalysis = botInstance.verseAnalysis;
    this.leadTransfer = botInstance.leadTransfer;
    this.pdfManager = botInstance.pdfManager;  // Теперь это настоящий PDFManager
    this.adminNotifications = botInstance.adminNotifications;
    
    this.validateDependencies();
  }

  validateDependencies() {
    console.log('Handlers: проверка зависимостей...');
    const checks = {
      pdfManager: !!this.pdfManager,
      'pdfManager.getBonusForUser': !!this.pdfManager?.getBonusForUser,
      'pdfManager.fileHandler': !!this.pdfManager?.fileHandler,
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
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔔 User Callback: "${callbackData}" от ${ctx.from.id}`);
      console.log(`📋 Текущий вопрос в сессии: ${ctx.session?.currentQuestion}`);
      console.log(`${'='.repeat(50)}\n`);

      await ctx.answerCbQuery().catch(() => {});

      // === НОВОЕ: Обработка кнопок после результатов ===
      if (callbackData === 'get_bonus') {
        console.log('🎁 Нажата кнопка: Получить персональную технику');
        await ctx.answerCbQuery('🧠 Готовлю ваш персональный гид...');

        try {
          const analysisResult = ctx.session?.analysisResult;
          const surveyAnswers = ctx.session?.answers || {};

          if (!analysisResult || !surveyAnswers) {
            await ctx.reply('😔 Результаты анализа не найдены. Пройдите анкету заново: /start');
            return;
          }

          // Генерируем бонус
          const bonus = this.pdfManager.getBonusForUser(analysisResult, surveyAnswers);
          console.log(`✅ Бонус сгенерирован: ${bonus.technique.name} (${bonus.segment})`);

          // Отправляем PDF
          await this.pdfManager.fileHandler.sendPersonalizedBonus(ctx, bonus);

          // Показываем меню после отправки
          await this.pdfManager.fileHandler.showPostPDFMenu(ctx);

        } catch (error) {
          console.error('❌ Ошибка генерации/отправки бонуса:', error);
          await ctx.reply('😔 Произошла ошибка при создании гида. Попробуйте позже или напишите @NastuPopova');
        }
        return;
      }

      if (callbackData === 'contact_request') {
        console.log('📞 Нажата кнопка: Записаться на консультацию');
        await ctx.answerCbQuery();

        const message = config.MESSAGES?.CONTACT_TRAINER || 
          `📞 *Запись на консультацию*\n\n` +
          `Для получения персональной программы и записи:\n\n` +
          `👩‍⚕️ Анастасия Попова: @NastuPopova\n` +
          `🤖 Основной бот: ${config.MAIN_BOT_URL || '@breathing_opros_bot'}\n\n` +
          `Напишите ей прямо сейчас — она ждёт вас!`;

        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
            [Markup.button.url('🤖 Перейти в основной бот', config.MAIN_BOT_URL || 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
          ])
        });
        return;
      }

      if (callbackData === 'back_to_results') {
        await ctx.answerCbQuery();
        if (ctx.session?.analysisResult) {
          await this.showResults(ctx, ctx.session.analysisResult);
        } else {
          await ctx.reply('Результаты не найдены. Пройдите диагностику: /start');
        }
        return;
      }

      // ПРИОРИТЕТНАЯ обработка "Подобрать программу"
      if (callbackData === 'help_choose_program') {
        return await this.handleProgramHelp(ctx);
      }

      // Админка
      if (callbackData.startsWith('admin_')) {
        return; // обрабатывается отдельно
      }

      // Анкета: основные команды
      if (callbackData === 'start_survey' || callbackData === 'start_survey_from_about') {
        console.log('✅ Распознано: start_survey');
        return await this.startSurvey(ctx);
      }
      if (callbackData === 'about_survey') {
        console.log('✅ Распознано: about_survey');
        return await this.showAboutSurvey(ctx);
      }
      if (callbackData === 'back_to_main') {
        console.log('✅ Распознано: back_to_main');
        return await this.backToMain(ctx);
      }

      // ВСЕ ОТВЕТЫ НА ВОПРОСЫ АНКЕТЫ
      const isSurveyAnswer = 
        callbackData.startsWith('age_') ||
        callbackData.startsWith('prob_') ||
        callbackData.startsWith('child_prob_') ||
        callbackData.startsWith('goal_') ||
        callbackData.startsWith('format_') ||
        callbackData.startsWith('stress_') ||
        callbackData.startsWith('sleep_') ||
        callbackData.startsWith('breath_') ||
        callbackData.startsWith('method_') ||
        callbackData.startsWith('freq_') ||
        callbackData.startsWith('shallow_') ||
        callbackData.startsWith('exp_') ||
        callbackData.startsWith('time_') ||
        callbackData.startsWith('prio_') ||
        callbackData.startsWith('med_') ||
        callbackData.startsWith('meds_') ||
        callbackData.startsWith('panic_') ||
        callbackData.startsWith('env_') ||
        callbackData.startsWith('nav_') ||  // навигация назад/вперёд
        callbackData === 'child_problems_done'; // для детского потока

      if (isSurveyAnswer) {
        console.log('✅ Распознано как ответ на вопрос анкеты');
        return await this.handleSurveyAnswer(ctx, callbackData);
      }

      // Если ничего не подошло — логируем
      console.log(`⚠️ Неизвестный callback: ${callbackData}`);
    });
  }

  // ... остальной код (showResults, transferLead, handleProgramHelp и т.д.) остаётся БЕЗ ИЗМЕНЕНИЙ ...

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

  getStats() {
    return {
      name: 'MainHandlers',
      version: '7.0.0-PERSONALIZED_BONUS',
      features: [
        'full_survey_working',
        'personalized_pdf_bonus',
        'contact_request_button',
        'back_to_results',
        'complete_handlers'
      ],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
