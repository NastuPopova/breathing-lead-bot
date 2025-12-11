// core/handlers.js — ФИНАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ (декабрь 2025)

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

    this.validateDependencies();
  }

  validateDependencies() {
    console.log('Handlers: проверка зависимостей...');
    const checks = {
      pdfManager: !!this.pdfManager,
      surveyQuestions: !!this.surveyQuestions,
      verseAnalysis: !!this.verseAnalysis,
      leadTransfer: !!this.leadTransfer
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

  setupUserCommands() {
    this.telegramBot.start(async (ctx) => {
      try {
        await this.handleStart(ctx);
      } catch (e) {
        console.error('Ошибка в /start:', e);
        await ctx.reply('Произошла ошибка. Попробуйте /start ещё раз');
      }
    });

    this.telegramBot.command('help', async (ctx) => {
      await ctx.reply('Начните с /start для прохождения диагностики');
    });

    this.telegramBot.command('restart', async (ctx) => {
      ctx.session = {};
      await ctx.reply('Сессия сброшена. Нажмите /start');
    });
  }

  setupUserCallbacks() {
    this.telegramBot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;
      console.log(`Callback: "${data}" от ${ctx.from.id}`);

      await ctx.answerCbQuery().catch(() => {});

      // НАЧАЛО АНКЕТЫ
      if (data === 'begin_survey') {
        const first = this.surveyQuestions.getFirstQuestion();
        if (!first) {
          await ctx.reply('Ошибка загрузки анкеты. Напишите @NastuPopova');
          return;
        }
        ctx.session.currentQuestion = first;
        ctx.session.answers = {};
        await this.askQuestion(ctx, first);
        return;
      }

      // ВЫБОР ОТВЕТА
      if (data.startsWith('answer_')) {
        const key = data.replace('answer_', '');
        const q = ctx.session.currentQuestion;
        ctx.session.answers = ctx.session.answers || {};

        if (this.surveyQuestions.isMultipleChoice(q)) {
          ctx.session.answers[q] = ctx.session.answers[q] || [];
          if (ctx.session.answers[q].includes(key)) {
            ctx.session.answers[q] = ctx.session.answers[q].filter(a => a !== key);
          } else {
            ctx.session.answers[q].push(key);
          }
        } else {
          ctx.session.answers[q] = key;
        }
        await this.askQuestion(ctx, q);
        return;
      }

      // НАЗАД
      if (data === 'back') {
        const prev = this.surveyQuestions.getPreviousQuestion(ctx.session.currentQuestion, ctx.session.answers);
        if (prev) {
          delete ctx.session.answers[ctx.session.currentQuestion];
          ctx.session.currentQuestion = prev;
          await this.askQuestion(ctx, prev);
        }
        return;
      }

      // СЛЕДУЮЩИЙ ВОПРОС
      if (data === 'next') {
        await this.moveToNextQuestion(ctx);
        return;
      }

      // ПОЛУЧИТЬ БОНУС
      if (data === 'get_bonus') {
        await ctx.answerCbQuery('Готовлю ваш гид...');

        if (!ctx.session.analysisResult?.primaryIssue) {
          await ctx.reply('Результаты не готовы. Пройдите диагностику заново');
          return;
        }

        try {
          const bonus = this.pdfManager.getBonusForUser(ctx.session.analysisResult, ctx.session.answers || {});
          if (!bonus?.technique) {
            await ctx.reply('Не удалось подобрать технику. Напишите @NastuPopova');
            return;
          }

          ctx.session.pendingBonus = bonus;
          await this.sendIntriguingTeaser(ctx, bonus, ctx.session.analysisResult);

          await ctx.reply('Нажмите кнопку ниже, чтобы получить PDF:', {
            reply_markup: {
              inline_keyboard: [[{ text: '📥 Получить гид (PDF)', callback_data: 'download_bonus' }]]
            }
          });
        } catch (err) {
          console.error('Ошибка подготовки бонуса:', err.message);
          await ctx.reply('Ошибка создания гида. Напишите @NastuPopova');
        }
        return;
      }

      // СКАЧАТЬ PDF
      if (data === 'download_bonus') {
        await ctx.answerCbQuery('Отправляю...');

        const bonus = ctx.session?.pendingBonus;
        if (!bonus) {
          await ctx.reply('Гид не найден. Пройдите заново: /start');
          return;
        }

        try {
          await this.bot.pdfManager.fileHandler.sendPDFFile(ctx, bonus);
          await ctx.reply('*Гид отправлен выше!*', { parse_mode: 'Markdown' });
          if (this.bot.pdfManager.fileHandler.showPostPDFMenu) {
            await this.bot.pdfManager.fileHandler.showPostPDFMenu(ctx);
          }
          delete ctx.session.pendingBonus;
        } catch (err) {
          console.error('Ошибка отправки PDF:', err.message);
          await ctx.reply('Не удалось отправить файл. Напишите @NastuPopova');
        }
        return;
      }

      // ПОМОЩЬ В ВЫБОРЕ
      if (data === 'help_choose_program') {
        await this.handleProgramHelp(ctx);
        return;
      }
    });
  }

  setupTextHandlers() {
    this.telegramBot.on('text', async (ctx) => {
      ctx.session = { startTime: Date.now() };
      await ctx.reply('Я работаю через кнопки. Начнём диагностику:', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Начать диагностику', callback_data: 'begin_survey' }]]
        }
      });
    });
  }

  async handleStart(ctx) {
    ctx.session = { startTime: Date.now(), answers: {} };
    await ctx.reply('Привет! Я помогу подобрать дыхательные практики.\n\nЭто займёт 2–3 минуты', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Начать диагностику', callback_data: 'begin_survey' }]]
      }
    });
  }

  async askQuestion(ctx, key) {
    const q = this.surveyQuestions.getQuestion(key);
    if (!q) {
      await this.completeSurvey(ctx);
      return;
    }

    ctx.session.currentQuestion = key;

    const keyboard = [];
    const answers = Array.isArray(q.answers) ? q.answers : Object.entries(q.answers);
    answers.forEach(a => {
      const text = Array.isArray(q.answers) ? a.text : a[1];
      const val = Array.isArray(q.answers) ? a.key : a[0];
      keyboard.push([Markup.button.callback(text, `answer_${val}`)]);
    });
    keyboard.push([Markup.button.callback('Назад', 'back')]);

    await ctx.reply(q.text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  async moveToNextQuestion(ctx) {
    if (!ctx.session.currentQuestion) return;

    const next = this.surveyQuestions.getNextQuestion(ctx.session.currentQuestion, ctx.session.answers);
    if (!next) {
      await this.completeSurvey(ctx);
      return;
    }

    if (this.surveyQuestions.shouldShowQuestion(next, ctx.session.answers)) {
      ctx.session.currentQuestion = next;
      await this.askQuestion(ctx, next);
    } else {
      ctx.session.currentQuestion = next;
      await this.moveToNextQuestion(ctx);
    }
  }

  async completeSurvey(ctx) {
    await ctx.reply('Анализирую ответы...');

    const result = this.verseAnalysis.analyzeUser(ctx.session.answers);
    ctx.session.analysisResult = result;

    await this.showResults(ctx, result);
    await this.transferLead(ctx, result);
  }

  async showResults(ctx, result) {
    const msg = result.personalMessage || 'Ваши результаты готовы!';
    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Получить персональную технику', callback_data: 'get_bonus' }],
          [{ text: 'Записаться на консультацию', url: 'https://t.me/NastuPopova' }]
        ]
      }
    });
  }

  async transferLead(ctx, result) {
    try {
      const data = {
        userInfo: {
          telegram_id: ctx.from.id,
          username: ctx.from.username || null,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name || null
        },
        surveyAnswers: ctx.session.answers || {},
        analysisResult: result,
        surveyType: result.analysisType,
        completedAt: new Date().toISOString(),
        surveyDuration: Date.now() - ctx.session.startTime
      };

      await this.leadTransfer.processLead(data);
      console.log('Лид передан');

      if (this.bot.adminIntegration) {
        try {
          await this.bot.adminIntegration.notifySurveyResults(data);
        } catch (e) {
          console.warn('Админ-уведомление не отправлено:', e.message);
        }
      }
    } catch (err) {
      console.error('Ошибка передачи лида:', err);
    }
  }

  async handleProgramHelp(ctx) {
    await ctx.reply('*Как выбрать программу?*\n\nНапишите @NastuPopova — она поможет', { parse_mode: 'Markdown' });
  }

  // КРАСИВЫЙ ТИЗЕР С ОТЗЫВАМИ
  async sendIntriguingTeaser(ctx, bonus, analysisResult) {
    const technique = bonus.technique;
    const segment = analysisResult.segment || 'WARM_LEAD';
    const isHot = segment === 'HOT_LEAD';
    const isChild = analysisResult.analysisType === 'child';

    const topBorder = isChild ? '🎈🎨🎮🎪🎭🎈' : '✨💫⭐🌟💫✨';
    const bottomBorder = topBorder;

    let message = `${topBorder}\n\n`;

    message += isChild ? `*Персональная игровая техника для вашего ребёнка готова!*\n\n` : `*Ваша персональная техника готова!*\n\n`;

    message += `*«${technique.name}»*\n\n`;

    if (isChild) {
      const age = analysisResult.child_age_group || 'детском возрасте';
      message += `Специально подобрана под возраст ребёнка (${age}) и его особенности\\.\\n\\n`;
    } else {
      const map = { student: 'учёба', office_work: 'офисная работа', management: 'руководящая должность', physical_work: 'физический труд', home_work: 'работа дома', maternity_leave: 'декрет', retired: 'пенсия' };
      const prof = map[analysisResult.profession] || 'ваш ритм жизни';
      message += `Специально подобрана под ваш возраст, ${prof} и уровень стресса\\.\\n\\n`;
    }

    const time = isHot ? '1–2 минуты' : (isChild ? '3–5 минут' : '2–3 минуты');
    message += `Уже через ${time} практики `;

    message += isChild ? `ребёнок становится спокойнее, лучше сосредотачивается и легче управляет эмоциями\\.\\n\\n` : `падает напряжение, нормализуется дыхание и активируется зона мозга, отвечающая за восстановление\\.\\n\\n`;

    message += isChild ? `*Родители отмечают:*\\n` : `*Клиенты отмечают:*\\n`;
    this.getReviewsForTechnique(technique.problem, isChild).forEach(r => message += `• ${r}\\n`);
    message += `\\n`;

    message += `*Почему это работает именно для ${isChild ? 'вашего ребёнка' : 'вас'}*\\n`;

    if (isChild) {
      message += `В детском возрасте нервная система очень пластична\\. Игровые практики помогают гармонично развиваться\\.\\n\\n`;
    } else {
      message += `Эта техника учитывает ваш ритм жизни и уровень нагрузки\\.\\n\\n`;
    }

    message += `*Что внутри гида (PDF):*\\n`;
    message += isChild ? `Игровые инструкции, план на 3 дня, советы родителям\\n\\n` : `Пошаговая инструкция, наука, план на 3 дня\\n\\n`;

    message += `Анастасия ждёт вас — нажмите кнопку ниже\\.\\n\\n`;
    message += `${bottomBorder}`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true
    });
  }

  getReviewsForTechnique(problem, isChild) {
    const map = {
      adult: {
        'Хронический стресс': ['Быстро уходит напряжение', 'Ясность в голове', 'Легче дедлайны', 'Лучший фон'],
        'Высокое давление': ['Давление в норме', 'Меньше головных болей', 'Лучшее самочувствие', 'Меньше таблеток'],
        'Головные боли': ['Боль уходит за 5–7 минут', 'Нет напряжения в висках', 'Лёгкость в голове', 'Реже обезболивающие'],
        'Бессонница': ['Легче засыпать', 'Глубокий сон', 'Меньше пробуждений', 'Бодрость утром'],
        'Проблемы с концентрацией': ['Уходит туман', 'Прилив энергии', 'Мысли упорядочены', 'Работа легче']
      },
      child: {
        'Гиперактивность': ['Меньше импульсивности', 'Легче задания', 'Лучший самоконтроль', 'Уравновешенность'],
        'Проблемы со сном': ['Легче засыпает', 'Меньше кошмаров', 'Спокойный сон', 'Бодрый утром'],
        'Тревожность': ['Меньше страхов', 'Уверенность', 'Легче в сад/школу', 'Спокойнее на новое'],
        'Головные боли': ['Боль уходит быстро', 'Лёгкость в голове', 'Реже жалобы']
      }
    };
    return (isChild ? map.child : map.adult)[problem] || ['Быстрый эффект', 'Улучшение самочувствия'];
  }

  async handleError(ctx, error) {
    console.error('Ошибка:', error);
    try {
      await ctx.reply('Ошибка. /start или @NastuPopova');
    } catch {}
  }

  getStats() {
    return { version: 'FINAL-DEC2025', status: 'ready' };
  }
}

module.exports = Handlers;
