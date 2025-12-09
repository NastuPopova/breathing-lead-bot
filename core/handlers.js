// Файл: core/handlers.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ (с персональными PDF и всеми обработчиками)

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
    this.setupTextHandlers();  // ← ВОССТАНОВЛЕНО! Обязательно
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

  // ВОССТАНОВЛЕННЫЙ setupTextHandlers
  setupTextHandlers() {
    this.telegramBot.on('text', async (ctx) => {
      // Если пользователь просто пишет текст вне анкеты — игнорируем или можно добавить помощь
      if (!ctx.session?.inSurvey) {
        return await ctx.reply('Напишите /start, чтобы начать диагностику');
      }

      // Если ожидается свободный ввод (например, имя или комментарий) — можно добавить обработку
      // Сейчас в анкете только кнопки, так что текст игнорируем
      await ctx.reply('Пожалуйста, используйте кнопки для ответов 😊');
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

      // === НОВЫЕ КНОПКИ ПОСЛЕ РЕЗУЛЬТАТОВ ===
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

          const bonus = this.pdfManager.getBonusForUser(analysisResult, surveyAnswers);
          console.log(`✅ Бонус сгенерирован: ${bonus.technique.name} (${bonus.segment})`);

          await this.pdfManager.fileHandler.sendPersonalizedBonus(ctx, bonus);
          await this.pdfManager.fileHandler.showPostPDFMenu(ctx);

        } catch (error) {
          console.error('❌ Ошибка генерации бонуса:', error);
          await ctx.reply('😔 Ошибка при создании гида. Напишите @NastuPopova');
        }
        return;
      }

      if (callbackData === 'contact_request') {
        console.log('📞 Нажата кнопка: Записаться на консультацию');
        await ctx.answerCbQuery();

        const message = config.MESSAGES?.CONTACT_TRAINER || 
          `📞 *Запись на консультацию*\n\n` +
          `Для получения персональной программы:\n\n` +
          `👩‍⚕️ Анастасия Попова: @NastuPopova\n` +
          `🤖 Основной бот: ${config.MAIN_BOT_URL || '@breathing_opros_bot'}\n\n` +
          `Напишите ей — она ждёт вас!`;

        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
            [Markup.button.url('🤖 Основной бот', config.MAIN_BOT_URL || 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🔙 Назад к результатам', 'back_to_results')]
