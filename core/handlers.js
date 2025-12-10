// Файл: core/handlers.js - ПОЛНАЯ ПЕРЕРАБОТАННАЯ ВЕРСИЯ С ТИЗЕРОМ И ДВУХШАГОВЫМ ГИДОМ

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
    // ВСЁ через один общий обработчик callback_query
    this.telegramBot.on('callback_query', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔔 User Callback: "${callbackData}" от ${ctx.from.id}`);
      console.log(`📋 Текущий вопрос в сессии: ${ctx.session?.currentQuestion}`);
      console.log(`${'='.repeat(50)}\n`);

      await ctx.answerCbQuery().catch(() => {});

      // === ПОЛУЧЕНИЕ ПЕРСОНАЛЬНОЙ ТЕХНИКИ (ТИЗЕР) ===
      if (callbackData === 'get_bonus') {
        console.log('🎁 Нажата кнопка: Получить персональную технику');
        await ctx.answerCbQuery('🧠 Готовлю ваш персональный гид...');

        try {
          const analysisResult = ctx.session?.analysisResult;
          const surveyAnswers = ctx.session?.answers || {};

          if (!analysisResult) {
            await ctx.reply('😔 Результаты анализа не найдены. Начните заново: /start');
            return;
          }

          // Генерируем бонус, но пока НЕ отправляем PDF
          const bonus = this.pdfManager.getBonusForUser(analysisResult, surveyAnswers);

          // Сохраняем в сессию для последующей отправки
          ctx.session.pendingBonus = bonus;

          // Интригующий тизер
          await this.sendIntriguingTeaser(ctx, bonus, analysisResult);

          // Кнопка для скачивания PDF
          await ctx.reply('📥 Нажмите кнопку ниже, чтобы получить ваш персональный гид в PDF:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('📥 Получить мой гид (PDF)', 'download_bonus')]
            ])
          });

        } catch (error) {
          console.error('❌ Ошибка при подготовке гида:', error);
          await ctx.reply('😔 Произошла временная ошибка. Напишите @NastuPopova — она отправит материалы лично');
        }
        return;
      }

      // === СКАЧИВАНИЕ PDF ПО КНОПКЕ ===
      if (callbackData === 'download_bonus') {
        console.log('📥 Нажата кнопка: Получить мой гид (PDF)');
        await ctx.answerCbQuery('📄 Отправляю ваш гид...');

        try {
          const bonus = ctx.session?.pendingBonus;

          if (!bonus) {
            await ctx.reply('😔 Гид не найден. Пройдите диагностику заново: /start');
            return;
          }

          // Отправляем сам PDF
          await this.bot.pdfManager.fileHandler.sendPersonalizedBonus(ctx, bonus);

          // Бонус — канал
          await ctx.reply(
            `📖 *Дополнительный бонус для вас*\n\n` +
            `Присоединяйтесь к открытому каналу «Дыхание как путь к здоровью»\n` +
            `https://t.me/spokoinoe_dyhanie\n\n` +
            `Там полезные статьи о дыхании, научные факты, истории клиентов и вдохновение на изменения 🌿`,
            { parse_mode: 'Markdown' }
          );

          // Финальное меню
          await this.bot.pdfManager.fileHandler.showPostPDFMenu(ctx);

          // Очищаем сессию
          delete ctx.session.pendingBonus;

        } catch (error) {
          console.error('❌ Ошибка отправки гида:', error);
          await ctx.reply('😔 Не удалось отправить файл. Напишите @NastuPopova — она пришлёт гид лично');
        }
        return;
      }

      // === ЗАПИСЬ НА КОНСУЛЬТАЦИЮ ===
      if (callbackData === 'contact_request') {
        console.log('📞 Нажата кнопка: Записаться на консультацию');
        await ctx.answerCbQuery();

        const message = config.MESSAGES?.CONTACT_TRAINER || 
          `🌟 *Мои продукты и программы*\n\n` +
          `Перейдите в основной бот — там все мои курсы, консультации и программы по дыханию:\n\n` +
          `🤖 @breathing_opros_bot\n\n` +
          `Выберите подходящую программу и запишитесь!`;

        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('🤖 Перейти в основной бот', 'https://t.me/breathing_opros_bot')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        });
        return;
      }

      // === ЗАКРЫТИЕ МЕНЮ ===
      if (callbackData === 'delete_menu') {
        await this.bot.pdfManager.fileHandler.closeMenu(ctx);
        return;
      }

      // === ДРУГИЕ CALLBACK'И (если есть в твоём старом коде — оставь их здесь) ===
      // Например: back_to_main, start_survey, more_materials и т.д.
      // Если они есть в твоём текущем handlers.js — просто скопируй их сюда ниже

      // Если ничего не подошло — логируем
      console.log(`⚠️ Необработанный callback: ${callbackData}`);
    });
  }

  // === ИНТРИГУЮЩИЙ ТИЗЕР ===
  async sendIntriguingTeaser(ctx, bonus, analysisResult) {
    const technique = bonus.technique;
    const segment = analysisResult.segment || 'WARM_LEAD';
    const isHot = segment === 'HOT_LEAD';
    const isChild = analysisResult.analysisType === 'child';

    let profileTitle = '';
    let urgencyText = '';
    let teaserText = '';

    if (isChild) {
      profileTitle = '🎈 *Дыхательный профиль ребёнка*';
      urgencyText = isHot ? 'Требует внимания в ближайшие дни' : 'Можно начать улучшать уже сейчас';

      teaserText = `Я подобрала игровую технику *«${technique.name}»* — дети играют с удовольствием, а родители быстро замечают положительные изменения.\n\n` +
                   `🔥 Представьте: меньше капризов, спокойные вечера и радостные утра.\n\n` +
                   `Полная игровая инструкция для родителей, план на 3 дня и советы по мотивации — в вашем персональном гиде ниже.`;
    } else {
      // Маппинг проблем на красивые названия профиля
      const profileMap = {
        insomnia: 'Тревожный сон на фоне стресса',
        chronic_stress: 'Хроническое напряжение и перегруз',
        anxiety: 'Тревожность и внутреннее беспокойство',
        panic_attacks: 'Панические атаки и страх',
        high_pressure: 'Повышенное давление и головные боли',
        breathing_issues: 'Одышка и нехватка воздуха',
        fatigue: 'Постоянная усталость и снижение энергии',
        headaches: 'Частые головные боли и мигрени',
        concentration_issues: 'Проблемы с концентрацией',
        digestion_issues: 'Проблемы с пищеварением'
      };

      const mainIssue = analysisResult.primaryIssue || 'chronic_stress';
      profileTitle = `🎯 *Ваш дыхательный профиль:* ${profileMap[mainIssue] || 'Напряжённое состояние'}`;
      urgencyText = isHot ? 'Требует внимания в ближайшие дни' : 'Можно улучшить уже сейчас';

      const hotHint = isHot ? '🔥 Эта техника даёт заметный эффект уже с первого применения.\n\n' : '';

      teaserText = `Я подобрала для вас мощную технику *«${technique.name}»* — она помогает организму быстро перейти в режим восстановления.\n\n` +
                   `${hotHint}` +
                   `Многие мои клиенты отмечают: напряжение уходит, мысли затихают, появляется лёгкость и ясность.\n\n` +
                   `🔥 Представьте: всего несколько минут практики — и вы чувствуете себя спокойнее и энергичнее.\n\n` +
                   `Полная пошаговая инструкция, научное объяснение и план на 3 дня — в вашем персональном гиде ниже.`;
    }

    const message = `${profileTitle}\n\n` +
                    `Основная проблема: ${technique.problem}\n` +
                    `Уровень срочности: ${urgencyText}\n\n` +
                    `${teaserText}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  // === ПОКАЗ РЕЗУЛЬТАТОВ АНАЛИЗА ===
  async showResults(ctx, analysisResult) {
    console.log('📊 Показываем результаты анализа');
    
    const message = analysisResult.personalMessage || 'Ваши результаты готовы!';
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎁 Получить персональную технику', 'get_bonus')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
      ])
    });
  }

  // === ОСТАЛЬНЫЕ МЕТОДЫ (оставь как было) ===
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

  async showAboutSurvey(ctx) {
    console.log('ℹ️ Показ информации о диагностике');

    const message = `🌬️ *Подробно о диагностике дыхания*\n\n` +
      `Это быстрая и точная проверка вашего дыхания (всего 4-5 минут).\n\n` +
      `Что вы получите:\n` +
      `✅ Персональный анализ текущего состояния\n` +
      `✅ Индивидуальные рекомендации по улучшению\n` +
      `✅ Бесплатные дыхательные техники для старта\n` +
      `✅ Советы, адаптированные под вашу ситуацию\n\n` +
      `Диагностика полностью анонимна и конфиденциальна.\n\n` +
      `Готовы узнать, как дыхание влияет на ваше здоровье?`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('▶️ Начать диагностику', 'start_survey')],
        [Markup.button.callback('🔙 Назад в меню', 'back_to_main')]
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
      version: '7.0.0-TWO-STEP-BONUS',
      features: ['two_step_bonus', 'intriguing_teaser', 'personalized_profile', 'final_menu_v2'],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
