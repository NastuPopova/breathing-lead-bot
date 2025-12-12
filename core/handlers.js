// Файл: core/handlers.js - ЧАСТЬ 1 (строки 1-400)
// ПЕРЕПИСАННАЯ ВЕРСИЯ с правильной структурой тизера

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
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔔 User Callback: "${callbackData}" от ${ctx.from.id}`);
      console.log(`📋 Текущий вопрос в сессии: ${ctx.session?.currentQuestion}`);
      console.log(`${'='.repeat(50)}\n`);

      await ctx.answerCbQuery().catch(() => {});

      // === ПОЛУЧЕНИЕ ПЕРСОНАЛЬНОЙ ТЕХНИКИ - КРАСИВЫЙ СОВРЕМЕННЫЙ ТИЗЕР ===
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

    // Генерируем бонус
    const bonus = this.pdfManager.getBonusForUser(analysisResult, surveyAnswers);
    ctx.session.pendingBonus = bonus;

    // === ИСПОЛЬЗУЕМ НОВЫЙ КРАСИВЫЙ ТИЗЕР ИЗ PDFManager ===
    const teaserMessage = this.pdfManager.generateBonusMessage(bonus, analysisResult);

    await ctx.reply(teaserMessage, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
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

      // === СКАЧИВАНИЕ PDF ПО КНОПКЕ (ИСПРАВЛЕННАЯ ВЕРСИЯ ИЗ ДОКУМЕНТА 1) ===
      if (callbackData === 'download_bonus') {
        console.log('📥 Нажата кнопка: Получить мой гид (PDF)');
        
        // Сразу отвечаем, чтобы не было ошибки «Произошла ошибка»
        await ctx.answerCbQuery('Готовлю ваш персональный гид...');
        
        try {
          const bonus = ctx.session?.pendingBonus;

          if (!bonus) {
            await ctx.reply('😔 Гид не найден. Пройдите диагностику заново: /start');
            return;
          }

          // ИСПРАВЛЕНО: используем существующий метод через bot.pdfManager
          await this.bot.pdfManager.fileHandler.sendPDFFile(ctx, bonus);

          delete ctx.session.pendingBonus;

        } catch (error) {
          console.error('❌ Ошибка отправки гида:', error);
          await ctx.reply('😔 Не удалось отправить файл. Напишите @NastuPopova — она пришлёт гид лично');
        }
        return;
      }

      // === ВОЗВРАТ К РЕЗУЛЬТАТАМ ===
      if (callbackData === 'back_to_results') {
        await ctx.answerCbQuery();
        if (ctx.session?.analysisResult) {
          await this.showResults(ctx, ctx.session.analysisResult);
        }
        return;
      }

      // === ВСЕ ОСТАЛЬНЫЕ CALLBACK'И (ОБРАБОТКА АНКЕТЫ) ===
      
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
        callbackData.startsWith('work_') ||
        callbackData.startsWith('occ_') ||
        callbackData.startsWith('activity_') ||
        callbackData.startsWith('condition_') ||
        callbackData.startsWith('child_age_') ||
        callbackData.startsWith('edu_') ||
        callbackData.startsWith('schedule_') ||
        callbackData.startsWith('parent_') ||
        callbackData.startsWith('motivation_') ||
        callbackData.startsWith('weight_') ||
        callbackData.startsWith('both_parents') ||
        callbackData.startsWith('mother') ||
        callbackData.startsWith('father') ||
        callbackData === 'nav_back' ||
        callbackData.endsWith('_done');

      if (isSurveyAnswer) {
        console.log('✅ Распознано как ответ на анкету, отправляем в handleSurveyAnswer');
        return await this.handleSurveyAnswer(ctx, callbackData);
      }

      console.log('⚠️ Callback не распознан ни одним обработчиком!');
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


  
  // === НОВЫЙ ВСПОМОГАТЕЛЬНЫЙ МЕТОД: ПОЛУЧЕНИЕ ОТЗЫВОВ (ИЗ ДОКУМЕНТА 2) ===
  getReviewsForTechnique(problem, isChild) {
    const reviewsMap = {
      adult: {
        'Хронический стресс': [
          'Быстро уходит внутреннее напряжение',
          'Появляется ясность и контроль',
          'Легче справляться с дедлайнами',
          'Улучшается эмоциональный фон'
        ],
        'Высокое давление': [
          'Давление приходит в норму',
          'Головные боли уменьшаются',
          'Улучшается самочувствие',
          'Меньше зависимость от таблеток'
        ],
        'Головные боли': [
          'Головные боли проходят за 5–7 минут',
          'Уходит напряжение в висках и затылке',
          'Появляется лёгкость в голове',
          'Меньше нужно обезболивающих'
        ],
        'Бессонница': [
          'Легче засыпаете',
          'Сон становится глубже',
          'Меньше ночных пробуждений',
          'Утром чувствуете себя отдохнувшим'
        ],
        'Проблемы с концентрацией': [
          'Уходит «туман в голове»',
          'Появляется лёгкость и приток энергии',
          'Мысли становятся упорядоченнее',
          'Учёба/работа идёт легче и спокойнее'
        ]
      },
      child: {
        'Гиперактивность': [
          'Меньше импульсивности',
          'Легче выполнять задания',
          'Улучшается самоконтроль',
          'Ребёнок становится более уравновешенным'
        ],
        'Проблемы со сном': [
          'Легче засыпает',
          'Меньше кошмаров',
          'Сон спокойнее',
          'Утром бодрый'
        ],
        'Тревожность': [
          'Меньше страхов',
          'Увереннее в себе',
          'Легче идёт в садик/школу',
          'Спокойнее реагирует на новое'
        ],
        'Головные боли': [
          'Головные боли проходят за 5–7 минут',
          'Уходит напряжение в висках',
          'Появляется лёгкость в голове',
          'Реже нужны обезболивающие'
        ]
      }
    };

    const source = isChild ? reviewsMap.child : reviewsMap.adult;
    return source[problem] || [
      'Уходит напряжение',
      'Появляется энергия',
      'Улучшается самочувствие',
      'Быстрый эффект'
    ];
  }

  // === ОСНОВНЫЕ МЕТОДЫ (ИЗ ОРИГИНАЛА) ===
  
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

  async handleHelp(ctx) {
    await ctx.reply('Используйте /start для начала диагностики');
  }

  async handleRestart(ctx) {
    ctx.session = {};
    await this.handleStart(ctx);
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

  async backToMain(ctx) {
    await ctx.deleteMessage().catch(() => {});
    await this.handleStart(ctx);
  }

  // === АНКЕТА ===
  
  async startSurvey(ctx) {
    console.log(`🚀 Начинаем анкету для пользователя ${ctx.from.id}`);
    
    ctx.session = { 
      answers: {}, 
      completedQuestions: [], 
      startTime: Date.now(),
      multipleChoiceSelections: {},
      questionStartTime: Date.now()
    };
    
    console.log('✅ Сессия создана:', ctx.session);
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

      ctx.session.currentQuestion = questionKey;
      ctx.session.questionStartTime = Date.now();

      const progress = this.surveyQuestions.getProgress(
        ctx.session.completedQuestions || [],
        ctx.session.answers || {}
      );

      const progressBar = this.generateProgressBar(progress.percentage);
      const questionText = `${progressBar}\n\n${question.text}`;

      if (question.note) {
        await ctx.editMessageText(
          `${questionText}\n\n💡 ${question.note}`,
          {
            parse_mode: 'Markdown',
            reply_markup: question.keyboard.reply_markup
          }
        ).catch(async () => {
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
    console.log(`\n${'*'.repeat(60)}`);
    console.log(`📝 НАЧАЛО ОБРАБОТКИ ОТВЕТА`);
    console.log(`Callback Data: "${callbackData}"`);
    console.log(`${'*'.repeat(60)}`);

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

    console.log(`📌 Текущий вопрос: "${currentQuestion}"`);

    if (callbackData === 'nav_back') {
      console.log('⬅️ Обработка навигации назад');
      return await this.handleNavBack(ctx);
    }

    const question = this.surveyQuestions.getQuestion(currentQuestion);
    
    if (!question) {
      console.error(`❌ Вопрос "${currentQuestion}" не найден в surveyQuestions`);
      await ctx.reply('Ошибка загрузки вопроса. Попробуйте /restart');
      return;
    }

    console.log(`✅ Вопрос найден, тип: ${question.type}`);

    if (question.type === 'multiple_choice') {
      console.log('🔀 Обработка как множественный выбор');
      return await this.handleMultipleChoice(ctx, callbackData, question);
    }

    console.log(`🔄 Маппинг значения...`);
    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
    
    console.log(`✅ Результат маппинга: "${mappedValue}"`);

    const validation = this.surveyQuestions.validateAnswer(
      currentQuestion,
      mappedValue
    );

    console.log(`📋 Результат валидации:`, validation);

    if (!validation.valid) {
      console.log(`❌ Валидация не пройдена: ${validation.error}`);
      await ctx.answerCbQuery(validation.error || 'Некорректный ответ');
      return;
    }

    console.log(`✅ Валидация пройдена успешно`);

    if (validation.warning) {
      console.log(`⚠️ Показываем предупреждение: ${validation.warning}`);
      await ctx.answerCbQuery(validation.warning, { show_alert: true });
    } else {
      await ctx.answerCbQuery('✅ Ответ сохранен');
    }

    console.log(`💾 Сохранение ответа...`);
    ctx.session.answers[currentQuestion] = mappedValue;
    
    if (!ctx.session.completedQuestions.includes(currentQuestion)) {
      ctx.session.completedQuestions.push(currentQuestion);
    }

    console.log(`✅ Ответ сохранен: ${currentQuestion} = ${mappedValue}`);
    console.log(`➡️ Переход к следующему вопросу...`);
    
    await this.moveToNextQuestion(ctx);
  }

  async handleMultipleChoice(ctx, callbackData, question) {
    const currentQuestion = ctx.session.currentQuestion;
    
    if (!ctx.session.multipleChoiceSelections) {
      ctx.session.multipleChoiceSelections = {};
    }
    
    if (!ctx.session.multipleChoiceSelections[currentQuestion]) {
      ctx.session.multipleChoiceSelections[currentQuestion] = [];
    }

    const selections = ctx.session.multipleChoiceSelections[currentQuestion];

    if (callbackData.endsWith('_done')) {
      console.log(`✅ Завершение выбора для ${currentQuestion}`);
      
      if (question.minSelections && selections.length < question.minSelections) {
        await ctx.answerCbQuery(`Выберите минимум ${question.minSelections} вариант(ов)`);
        return;
      }

      ctx.session.answers[currentQuestion] = [...selections];
      
      if (!ctx.session.completedQuestions.includes(currentQuestion)) {
        ctx.session.completedQuestions.push(currentQuestion);
      }

      console.log(`💾 Множественный выбор сохранен: ${currentQuestion} = [${selections.join(', ')}]`);

      delete ctx.session.multipleChoiceSelections[currentQuestion];

      return await this.moveToNextQuestion(ctx);
    }

    const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);

    if (question.maxSelections && selections.length >= question.maxSelections && !selections.includes(mappedValue)) {
      await ctx.answerCbQuery(`Можно выбрать максимум ${question.maxSelections} вариант(ов)`);
      return;
    }

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
    
    await this.updateMultipleChoiceKeyboard(ctx, question, selections);
  }

  async updateMultipleChoiceKeyboard(ctx, question, selections) {
    try {
      const originalKeyboard = question.keyboard.reply_markup.inline_keyboard;
      
      const updatedKeyboard = originalKeyboard.map(row => {
        return row.map(button => {
          const callbackData = button.callback_data;
          
          if (callbackData === 'nav_back' || callbackData.endsWith('_done')) {
            return button;
          }
          
          let newText = button.text.trim();
          const mappedValue = this.surveyQuestions.mapCallbackToValue(callbackData);
          const isSelected = selections.includes(mappedValue);
          
          if (isSelected) {
            if (!newText.startsWith('✅')) {
              newText = '✅ ' + newText;
            }
          } else {
            newText = newText.replace(/^✅\s*/, '');
          }
          
          return {
            text: newText,
            callback_data: callbackData
          };
        });
      });
      
      const progress = this.surveyQuestions.getProgress(
        ctx.session.completedQuestions || [],
        ctx.session.answers || {}
      );
      
      const progressBar = this.generateProgressBar(progress.percentage);
      const questionText = `${progressBar}\n\n${question.text}`;
      
      const fullText = question.note 
        ? `${questionText}\n\n💡 ${question.note}\n\n📝 Выбрано: ${selections.length}`
        : `${questionText}\n\n📝 Выбрано: ${selections.length}`;
      
      await ctx.editMessageText(fullText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: updatedKeyboard
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка обновления клавиатуры множественного выбора:', error);
    }
  }

  async handleNavBack(ctx) {
    console.log('⬅️ Навигация назад');
    
    const currentQuestion = ctx.session.currentQuestion;
    const previousQuestion = this.surveyQuestions.getPreviousQuestion(
      currentQuestion,
      ctx.session.answers
    );

    if (!previousQuestion) {
      console.log('⚠️ Нет предыдущего вопроса');
      await ctx.answerCbQuery('Это первый вопрос');
      return;
    }

    console.log(`⬅️ Переход к предыдущему вопросу: ${previousQuestion}`);

    const index = ctx.session.completedQuestions.indexOf(currentQuestion);
    if (index > -1) {
      ctx.session.completedQuestions.splice(index, 1);
    }

    delete ctx.session.answers[currentQuestion];

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

      await ctx.editMessageText(
        '✅ *Диагностика завершена!*\n\n⏳ Анализирую ваши ответы...',
        { parse_mode: 'Markdown' }
      );

      console.log('🧠 Запуск VERSE-анализа...');
      const analysisResult = this.verseAnalysis.analyzeUser(ctx.session.answers);
      console.log('✅ VERSE-анализ завершен:', analysisResult.segment);

      ctx.session.analysisResult = analysisResult;
      ctx.session.completedAt = new Date().toISOString();

      await this.showResults(ctx, analysisResult);

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
  console.log('📊 Показ результатов — только приглашение к персональному гиду');

  await ctx.reply(
    '✅ *Диагностика завершена!*\n\n' +
    'Я тщательно проанализировала ваши ответы и подготовила *персональную дыхательную технику* специально под ваш профиль, возраст и уровень стресса.\n\n' +
    'Готовы получить ваш индивидуальный гид в PDF с пошаговой инструкцией, научным обоснованием и планом на 3 дня?',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎁 Получить персональную технику', 'get_bonus')],
        [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
      ])
    }
  );
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

   	  // ИСПРАВЛЕНО: Защита от падения на админ-уведомлениях (ИЗ ДОКУМЕНТА 1)
      if (this.bot.adminIntegration) {
        try {
          await this.bot.adminIntegration.notifySurveyResults(userData);
        } catch (err) {
          console.warn('Админ-уведомление не отправлено (не критично):', err.message);
        }
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
      version: '7.1.0-FINAL-WITH-TEASER',
      features: [
        'two_step_bonus', 
        'intriguing_teaser', 
        'full_survey_flow', 
        'multiple_choice_with_checks', 
        'back_navigation',
        'protected_admin_notifications'
      ],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Handlers;
