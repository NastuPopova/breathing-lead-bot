// Файл: modules/bonus/file-handler.js - ПЕРЕПИСАННАЯ ВЕРСИЯ с надежной обработкой help_choose_program

const fs = require('fs');
const { Markup } = require('telegraf');
const config = require('../../config');

class FileHandler {
  constructor(contentGenerator) {
    this.contentGenerator = contentGenerator;

    // Google Drive ссылки для статичных PDF
    this.additionalMaterials = {
      adult_antistress: {
        url: 'https://drive.google.com/uc?export=download&id=1MDxi9nR7aplsvG1d1EG-R9eKbklaJVEM',
        directUrl: 'https://drive.google.com/file/d/1MDxi9nR7aplsvG1d1EG-R9eKbklaJVEM/view',
        title: '📄 Базовый гид "Антистресс дыхание"',
        description: 'Универсальные техники для снятия стресса для взрослых',
        fileName: 'Базовый_гид_Антистресс_дыхание_взрослые.pdf'
      },
      child_games: {
        url: 'https://drive.google.com/uc?export=download&id=1Vv-6T1EFJOek3Kiu2KYxjmPizuFOVfuE',
        directUrl: 'https://drive.google.com/file/d/1Vv-6T1EFJOek3Kiu2KYxjmPizuFOVfuE/view',
        title: '📄 Базовый гид "Дыхательные игры"',
        description: 'Игровые техники для детей всех возрастов',
        fileName: 'Базовый_гид_Дыхательные_игры_дети.pdf'
      }
    };

    // Статистика
    this.bonusStats = {
      totalDelivered: 0,
      helpChooseProgramCalls: 0,
      personalizedRecommendations: 0,
      genericHelpShown: 0,
      emergencyFallbacks: 0,
      bySegment: { HOT_LEAD: 0, WARM_LEAD: 0, COLD_LEAD: 0, NURTURE_LEAD: 0 },
      byIssue: {},
      byDeliveryMethod: { file: 0, static_pdf: 0, fallback_link: 0 }
    };

    // Проверяем инициализацию
    this.validateInitialization();
  }

  // Проверка инициализации
  validateInitialization() {
    console.log('📦 FileHandler: проверка инициализации...');
    
    const checks = {
      contentGenerator: !!this.contentGenerator,
      additionalMaterials: Object.keys(this.additionalMaterials).length > 0,
      handleHelpChooseProgram: typeof this.handleHelpChooseProgram === 'function',
      showPersonalizedHelp: typeof this.showPersonalizedHelp === 'function',
      showGenericHelp: typeof this.showGenericHelp === 'function'
    };
    
    Object.entries(checks).forEach(([check, result]) => {
      console.log(`${result ? '✅' : '❌'} ${check}: ${result}`);
    });
    
    console.log('✅ FileHandler инициализирован');
  }

  // ===== ГЛАВНЫЙ МЕТОД: ПОМОЩЬ В ВЫБОРЕ ПРОГРАММЫ =====
  
  async handleHelpChooseProgram(ctx) {
    console.log('🤔 === НАЧАЛО handleHelpChooseProgram ===');
    
    // Увеличиваем счетчик
    this.bonusStats.helpChooseProgramCalls++;
    
    // Полная диагностика
    const diagnostics = this.runFullDiagnostics(ctx);
    console.log('📊 Диагностика:', diagnostics);
    
    try {
      const analysisResult = ctx.session?.analysisResult;
      const surveyData = ctx.session?.answers;
      
      // ПУТЬ 1: Есть данные анализа - показываем персонализированную помощь
      if (analysisResult && surveyData && Object.keys(surveyData).length > 0) {
        console.log('✅ Путь 1: Персонализированная помощь');
        this.bonusStats.personalizedRecommendations++;
        return await this.showPersonalizedHelp(ctx, analysisResult, surveyData);
      }
      
      // ПУТЬ 2: Попытка восстановить данные из других источников
      const recoveredData = await this.tryRecoverUserData(ctx);
      if (recoveredData) {
        console.log('✅ Путь 2: Данные восстановлены, персонализированная помощь');
        this.bonusStats.personalizedRecommendations++;
        return await this.showPersonalizedHelp(ctx, recoveredData.analysis, recoveredData.survey);
      }
      
      // ПУТЬ 3: Нет данных - показываем общую помощь
      console.log('📋 Путь 3: Общая помощь (нет данных анализа)');
      this.bonusStats.genericHelpShown++;
      return await this.showGenericHelp(ctx);
      
    } catch (error) {
      console.error('❌ Ошибка в handleHelpChooseProgram:', error);
      console.error('Стек ошибки:', error.stack);
      
      // ПУТЬ 4: Экстренный fallback
      console.log('🆘 Путь 4: Экстренный fallback');
      this.bonusStats.emergencyFallbacks++;
      return await this.showEmergencyHelp(ctx);
    } finally {
      console.log('🏁 === КОНЕЦ handleHelpChooseProgram ===');
    }
  }

  // ===== ДИАГНОСТИКА =====
  
  runFullDiagnostics(ctx) {
    return {
      timestamp: new Date().toISOString(),
      user: {
        id: ctx.from?.id,
        username: ctx.from?.username,
        first_name: ctx.from?.first_name
      },
      session: {
        exists: !!ctx.session,
        hasAnswers: !!ctx.session?.answers,
        answersCount: Object.keys(ctx.session?.answers || {}).length,
        hasAnalysisResult: !!ctx.session?.analysisResult,
        analysisType: ctx.session?.analysisResult?.analysisType,
        segment: ctx.session?.analysisResult?.segment,
        primaryIssue: ctx.session?.analysisResult?.primaryIssue
      },
      callback: {
        data: ctx.callbackQuery?.data,
        messageId: ctx.callbackQuery?.message?.message_id
      },
      stats: {
        totalCalls: this.bonusStats.helpChooseProgramCalls,
        personalizedCount: this.bonusStats.personalizedRecommendations,
        genericCount: this.bonusStats.genericHelpShown,
        emergencyCount: this.bonusStats.emergencyFallbacks
      }
    };
  }

  // ===== ВОССТАНОВЛЕНИЕ ДАННЫХ =====
  
  async tryRecoverUserData(ctx) {
    console.log('🔍 Попытка восстановления данных пользователя');
    
    try {
      const userId = ctx.from?.id;
      if (!userId) return null;
      
      // Пытаемся найти данные в админской системе
      const adminData = this.searchInAdminSystem(userId);
      if (adminData) {
        console.log('✅ Данные найдены в админской системе');
        return adminData;
      }
      
      // Пытаемся восстановить из контекста сообщений
      const contextData = this.tryRecoverFromContext(ctx);
      if (contextData) {
        console.log('✅ Данные восстановлены из контекста');
        return contextData;
      }
      
      return null;
      
    } catch (error) {
      console.log('⚠️ Не удалось восстановить данные:', error.message);
      return null;
    }
  }

  searchInAdminSystem(userId) {
    try {
      // Поиск в системе уведомлений админа (если доступна)
      if (global.bot?.adminIntegration?.adminNotifications?.leadDataStorage) {
        const leadStorage = global.bot.adminIntegration.adminNotifications.leadDataStorage;
        
        const userKey = Object.keys(leadStorage).find(key => 
          leadStorage[key]?.userInfo?.telegram_id?.toString() === userId.toString()
        );
        
        if (userKey && leadStorage[userKey]) {
          const userData = leadStorage[userKey];
          return {
            analysis: userData.analysisResult,
            survey: userData.surveyAnswers
          };
        }
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Ошибка поиска в админской системе:', error.message);
      return null;
    }
  }

  tryRecoverFromContext(ctx) {
    // Пытаемся найти подсказки в тексте сообщения или других данных
    // Это базовая эвристика для восстановления
    try {
      const messageText = ctx.callbackQuery?.message?.text || '';
      
      // Если в сообщении есть упоминания о детях
      if (messageText.includes('ребенок') || messageText.includes('детск')) {
        return {
          analysis: { analysisType: 'child', segment: 'COLD_LEAD', primaryIssue: 'general_wellness' },
          survey: { child_age_detail: '7-8' }
        };
      }
      
      // Если есть упоминания о стрессе
      if (messageText.includes('стресс') || messageText.includes('тревог')) {
        return {
          analysis: { analysisType: 'adult', segment: 'WARM_LEAD', primaryIssue: 'chronic_stress' },
          survey: { age_group: '31-45', stress_level: 6 }
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // ===== ПЕРСОНАЛИЗИРОВАННАЯ ПОМОЩЬ =====
  
  async showPersonalizedHelp(ctx, analysisResult, surveyData) {
    console.log('🎯 Показываем персонализированную помощь');
    
    const isChildFlow = analysisResult?.analysisType === 'child';
    const segment = analysisResult?.segment || 'COLD_LEAD';
    const primaryIssue = analysisResult?.primaryIssue;

    console.log('📋 Данные для персонализации:', { isChildFlow, segment, primaryIssue });

    // Увеличиваем статистику по сегментам
    if (this.bonusStats.bySegment[segment] !== undefined) {
      this.bonusStats.bySegment[segment]++;
    }

    let message = `🤔 *ПЕРСОНАЛЬНАЯ РЕКОМЕНДАЦИЯ*\n\n`;
    
    // Генерируем рекомендацию на основе сегмента
    const recommendation = this.generateRecommendationBySegment(segment, isChildFlow, primaryIssue);
    message += recommendation.text;
    
    // Добавляем информацию о проблеме
    if (primaryIssue) {
      const problemName = this.translateIssue(primaryIssue);
      message += `🎯 *Ваша основная проблема:* ${problemName}\n\n`;
    }
    
    // Особенности для детей
    if (isChildFlow) {
      message += this.getChildSpecificAdvice(segment);
    }
    
    // Анализ готовности (если есть данные)
    const readinessInfo = this.analyzeUserReadiness(surveyData);
    if (readinessInfo) {
      message += readinessInfo;
    }
    
    message += `⚠️ *ВАЖНО:* Используйте только проверенные программы с поддержкой!\n\n`;
    
    // Призыв к действию
    message += recommendation.cta;

    // Генерируем клавиатуру
    const keyboard = this.generatePersonalizedKeyboard(segment, isChildFlow, recommendation.priority);
    
    await this.safeEditOrReply(ctx, message, keyboard);
  }

  generateRecommendationBySegment(segment, isChildFlow, primaryIssue) {
    const recommendations = {
      'HOT_LEAD': {
        text: `🚨 *Для вашей ситуации:*\n` +
              `Судя по анализу, вам нужна срочная помощь. ` +
              `Рекомендуем *персональную консультацию* - ` +
              `Анастасия подберет техники экстренной помощи.\n\n`,
        cta: `🔥 *Действуйте сейчас!* Запишитесь на консультацию сегодня - ` +
             `чем раньше начнете, тем быстрее почувствуете облегчение.`,
        priority: 'consultation'
      },
      'WARM_LEAD': {
        text: `💪 *Для вашей ситуации:*\n` +
              `Вы готовы к изменениям! Можете начать со *стартового комплекта* ` +
              `и при необходимости дополнить персональной консультацией.\n\n`,
        cta: `✨ *Отличная мотивация!* Выберите подходящий вариант и начинайте путь к здоровому дыханию.`,
        priority: 'both'
      },
      'COLD_LEAD': {
        text: `📚 *Для вашей ситуации:*\n` +
              `Рекомендуем начать со *стартового комплекта*. ` +
              `Если понадобится персональный подход - записывайтесь на консультацию.\n\n`,
        cta: `🌱 *Начните с основ!* Стартовый комплект поможет заложить правильную базу.`,
        priority: 'starter'
      },
      'NURTURE_LEAD': {
        text: `🌱 *Для профилактики:*\n` +
              `Начните со *стартового комплекта* для формирования ` +
              `полезных привычек. Профилактика лучше лечения!\n\n`,
        cta: `💚 *Забота о здоровье!* Вложения в профилактику окупаются здоровьем на годы вперед.`,
        priority: 'starter'
      }
    };
    
    return recommendations[segment] || recommendations['COLD_LEAD'];
  }

  getChildSpecificAdvice(segment) {
    if (segment === 'HOT_LEAD') {
      return `👶 *Детская программа:*\n` +
             `При серьезных проблемах у ребенка обязательно нужна консультация ` +
             `с детским специалистом для составления безопасной программы.\n\n`;
    } else {
      return `👶 *Детская программа:*\n` +
             `Специальный подход для работы с ребенком. ` +
             `Все техники адаптированы под детский возраст в игровой форме.\n\n`;
    }
  }

  analyzeUserReadiness(surveyData) {
    if (!surveyData) return '';
    
    let readinessText = '';
    
    // Анализ времени
    if (surveyData.time_commitment) {
      const timeInfo = this.translateTimeCommitment(surveyData.time_commitment);
      readinessText += `⏰ *Ваше время:* ${timeInfo}\n`;
    }
    
    // Анализ опыта
    if (surveyData.breathing_experience) {
      const expInfo = this.translateExperience(surveyData.breathing_experience);
      readinessText += `🧘 *Ваш опыт:* ${expInfo}\n`;
    }
    
    return readinessText ? readinessText + '\n' : '';
  }

  // ===== ОБЩАЯ ПОМОЩЬ =====
  
  async showGenericHelp(ctx) {
    console.log('📋 Показываем общую помощь по выбору программ');
    
    const message = `🤔 *КАК ВЫБРАТЬ ПРОГРАММУ?*\n\n` +

      `✅ *Выбирайте Стартовый комплект, если:*\n` +
      `• Вы новичок в дыхательных практиках\n` +
      `• Хотите освоить базовые техники самостоятельно\n` +
      `• Готовы следовать структурированной программе\n` +
      `• Ограниченный бюджет, но есть мотивация\n\n` +

      `✅ *Выбирайте Консультацию, если:*\n` +
      `• У вас серьезные проблемы со здоровьем\n` +
      `• Нужна персональная программа и диагностика\n` +
      `• Важна поддержка и контроль специалиста\n` +
      `• Хотите быстрых и точных результатов\n\n` +

      `⚠️ *ВАЖНО:* Самостоятельное изучение дыхательных техник из интернета ` +
      `может быть неэффективно и даже небезопасно. Используйте только ` +
      `проверенные программы с профессиональной поддержкой!\n\n` +

      `❓ *Сомневаетесь в выборе?*\n` +
      `Напишите [Анастасии Поповой](https://t.me/NastuPopova) - ` +
      `она даст персональную рекомендацию исходя из вашей ситуации!`;

    const keyboard = [
      [{ text: '🛒 Заказать Стартовый комплект', callback_data: 'order_starter' }],
      [{ text: '👨‍⚕️ Записаться на консультацию', callback_data: 'order_individual' }],
      [{ text: '📋 Показать все программы', callback_data: 'show_all_programs' }],
      [{ text: '💬 Написать Анастасии', url: 'https://t.me/NastuPopova' }],
      [{ text: '🔙 Назад к материалам', callback_data: 'more_materials' }]
    ];

    await this.safeEditOrReply(ctx, message, keyboard);
  }

  // ===== ЭКСТРЕННАЯ ПОМОЩЬ =====
  
  async showEmergencyHelp(ctx) {
    console.log('🆘 Показываем экстренную помощь');
    
    try {
      const message = `🚨 *ТЕХНИЧЕСКАЯ ПРОБЛЕМА*\n\n` +
        `Не удается загрузить систему персональных рекомендаций.\n\n` +
        `💬 **Что делать:**\n` +
        `Напишите [Анастасии Поповой](https://t.me/NastuPopova) - ` +
        `она лично поможет выбрать подходящую программу и ответит ` +
        `на все вопросы о дыхательных практиках!\n\n` +
        `📞 *Быстрые варианты:*\n` +
        `🛒 Стартовый комплект - для самостоятельного изучения\n` +
        `👨‍⚕️ Консультация - для индивидуального подхода`;

      const keyboard = [
        [{ text: '💬 Написать Анастасии', url: 'https://t.me/NastuPopova' }],
        [{ text: '🛒 Стартовый комплект', callback_data: 'order_starter' }],
        [{ text: '👨‍⚕️ Консультация', callback_data: 'order_individual' }]
      ];

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      
    } catch (error) {
      console.error('❌ Даже экстренная помощь не сработала:', error);
      // Самый простой ответ без разметки
      try {
        await ctx.reply('Техническая проблема. Напишите @NastuPopova для помощи в выборе программы.');
      } catch (finalError) {
        console.error('❌ Критический сбой - не удается отправить даже простое сообщение:', finalError);
      }
    }
  }

  // ===== ГЕНЕРАЦИЯ КЛАВИАТУР =====
  
  generatePersonalizedKeyboard(segment, isChildFlow, priority) {
    console.log(`🔘 Генерируем персональную клавиатуру: ${segment}, детский: ${isChildFlow}, приоритет: ${priority}`);
    
    const keyboards = {
      'consultation': [
        [{ text: '🚨 Записаться на срочную консультацию', callback_data: 'order_individual' }],
        [{ text: '🛒 Все же хочу стартовый комплект', callback_data: 'order_starter' }],
        [{ text: '📋 Показать все программы', callback_data: 'show_all_programs' }],
        [{ text: '💬 Написать Анастасии', url: 'https://t.me/NastuPopova' }],
        [{ text: '🔙 Назад к материалам', callback_data: 'more_materials' }]
      ],
      'both': [
        [{ text: '🛒 Заказать Стартовый комплект', callback_data: 'order_starter' }],
        [{ text: '👨‍⚕️ Записаться на консультацию', callback_data: 'order_individual' }],
        [{ text: '📋 Показать все программы', callback_data: 'show_all_programs' }],
        [{ text: '💬 Написать Анастасии', url: 'https://t.me/NastuPopova' }],
        [{ text: '🔙 Назад к материалам', callback_data: 'more_materials' }]
      ],
      'starter': [
        [{ text: '🛒 Начать со Стартового комплекта', callback_data: 'order_starter' }],
        [{ text: '👨‍⚕️ Консультация (если нужен персональный подход)', callback_data: 'order_individual' }],
        [{ text: '📋 Показать все программы', callback_data: 'show_all_programs' }],
        [{ text: '💬 Написать Анастасии', url: 'https://t.me/NastuPopova' }],
        [{ text: '🔙 Назад к материалам', callback_data: 'more_materials' }]
      ]
    };
    
    return keyboards[priority] || keyboards['both'];
  }

  // ===== ПЕРЕВОДЫ И УТИЛИТЫ =====
  
  translateIssue(issue) {
    const translations = {
      'chronic_stress': 'хронический стресс и напряжение',
      'anxiety': 'повышенная тревожность и панические атаки',
      'insomnia': 'проблемы со сном и бессонница',
      'breathing_issues': 'проблемы с дыханием и одышка',
      'high_pressure': 'повышенное давление',
      'fatigue': 'хроническая усталость',
      'headaches': 'частые головные боли',
      'concentration_issues': 'проблемы с концентрацией',
      'hyperactivity': 'гиперактивность у ребенка',
      'separation_anxiety': 'страх разлуки у ребенка',
      'sleep_problems': 'проблемы со сном у ребенка',
      'tantrums': 'частые истерики и капризы',
      'general_wellness': 'общее оздоровление'
    };
    
    return translations[issue] || 'проблемы с самочувствием';
  }

  translateTimeCommitment(time) {
    const translations = {
      '3-5_minutes': '3-5 минут в день (быстрые техники)',
      '10-15_minutes': '10-15 минут в день (стандартные практики)',
      '20-30_minutes': '20-30 минут в день (глубокие практики)',
      '30+_minutes': '30+ минут в день (интенсивное изучение)'
    };
    return translations[time] || time;
  }

  translateExperience(exp) {
    const translations = {
      'never': 'новичок в дыхательных практиках',
      'few_times': 'пробовали несколько раз',
      'theory': 'изучали теорию',
      'sometimes': 'иногда практикуете',
      'regularly': 'регулярно практикуете',
      'expert': 'опытный практик'
    };
    return translations[exp] || exp;
  }

  // ===== БЕЗОПАСНАЯ ОТПРАВКА СООБЩЕНИЙ =====
  
  async safeEditOrReply(ctx, message, keyboard) {
    console.log('📝 safeEditOrReply: попытка отправки сообщения');
    
    try {
      // Попытка 1: editMessageText
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      console.log('✅ Сообщение отредактировано успешно');
    } catch (editError) {
      console.log('⚠️ Редактирование не удалось:', editError.message);
      
      try {
        // Попытка 2: reply
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
        console.log('✅ Новое сообщение отправлено успешно');
      } catch (replyError) {
        console.error('❌ Reply тоже не удался:', replyError.message);
        
        try {
          // Попытка 3: без Markdown
          const cleanMessage = message.replace(/\*/g, '').replace(/_/g, '');
          await ctx.reply(cleanMessage, {
            reply_markup: { inline_keyboard: keyboard }
          });
          console.log('✅ Сообщение отправлено без Markdown');
        } catch (cleanError) {
          console.error('❌ И без Markdown не работает:', cleanError.message);
          
          try {
            // Попытка 4: только текст без клавиатуры
            await ctx.reply('Для помощи в выборе программы напишите @NastuPopova');
            console.log('✅ Простое сообщение отправлено');
          } catch (finalError) {
            console.error('❌ Критический сбой - не удается отправить даже простое сообщение:', finalError);
          }
        }
      }
    }
  }

  // ===== ОСТАЛЬНЫЕ МЕТОДЫ (сохраняем существующие) =====
  
  getBonusForUser(analysisResult, surveyData) {
    // Существующий код getBonusForUser
  }

  async sendPDFFile(ctx) {
    // Существующий код sendPDFFile
  }

  async showMoreMaterials(ctx) {
    // Существующий код showMoreMaterials
  }

  async showAllPrograms(ctx) {
    // Существующий код showAllPrograms
  }

  async handleOrderStarter(ctx) {
    // Существующий код handleOrderStarter
  }

  async handleOrderIndividual(ctx) {
    // Существующий код handleOrderIndividual
  }

  async handleDownloadRequest(ctx, callbackData) {
    // Существующий код handleDownloadRequest
  }

  async closeMenu(ctx) {
    // Существующий код closeMenu
  }

  async deleteMenu(ctx) {
    return await this.closeMenu(ctx);
  }

  // ===== СТАТИСТИКА И ОТЛАДКА =====
  
  getBonusStats() {
    return {
      ...this.bonusStats,
      help_choose_program_reliability: {
        total_calls: this.bonusStats.helpChooseProgramCalls,
        success_rate: this.bonusStats.helpChooseProgramCalls > 0 
          ? ((this.bonusStats.personalizedRecommendations + this.bonusStats.genericHelpShown) / this.bonusStats.helpChooseProgramCalls * 100).toFixed(2) + '%'
          : '0%',
        personalized_rate: this.bonusStats.helpChooseProgramCalls > 0
          ? (this.bonusStats.personalizedRecommendations / this.bonusStats.helpChooseProgramCalls * 100).toFixed(2) + '%'
          : '0%',
        emergency_fallback_rate: this.bonusStats.helpChooseProgramCalls > 0
          ? (this.bonusStats.emergencyFallbacks / this.bonusStats.helpChooseProgramCalls * 100).toFixed(2) + '%'
          : '0%'
      },
      last_updated: new Date().toISOString()
    };
  }

  getAdditionalMaterials() {
    return this.additionalMaterials;
  }

  // Экспорт конфигурации
  exportConfig() {
    return {
      name: 'FileHandler',
      version: '3.0.0',
      features: [
        'reliable_help_choose_program',
        'multiple_fallback_paths',
        'data_recovery_attempts',
        'personalized_recommendations',
        'comprehensive_diagnostics',
        'safe_message_delivery',
        'detailed_statistics'
      ],
      help_choose_program_paths: [
        'personalized_help_with_analysis',
        'recovered_data_personalization',
        'generic_help_fallback',
        'emergency_help_fallback'
      ],
      reliability_features: [
        'full_diagnostics',
        'admin_system_data_recovery',
        'context_based_recovery',
        'multiple_send_attempts',
        'graceful_degradation'
      ],
      statistics: this.getBonusStats(),
      last_updated: new Date().toISOString()
    };
  }

  // ===== СУЩЕСТВУЮЩИЕ МЕТОДЫ (СОХРАНЯЕМ ИЗ ОРИГИНАЛА) =====

  getBonusForUser(analysisResult, surveyData) {
    try {
      const technique = this.contentGenerator.getMasterTechnique(analysisResult, surveyData);
      const isChildFlow = analysisResult.analysisType === 'child';
      
      return {
        id: `personalized_${isChildFlow ? 'child' : 'adult'}_${analysisResult.primaryIssue || 'wellness'}`,
        title: this.contentGenerator.generatePersonalizedTitle(analysisResult, surveyData),
        subtitle: this.contentGenerator.generatePersonalizedSubtitle(analysisResult, surveyData),
        description: `Персонализированная техника "${technique.name}" с планом на 3 дня`,
        technique,
        target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
      };
    } catch (error) {
      console.error('❌ Ошибка getBonusForUser:', error);
      return this.getFallbackBonus();
    }
  }

  async sendPDFFile(ctx, bonus) {  // ← ДОБАВЬ ПАРАМЕТР bonus!
  try {
    if (!bonus) {
      console.error('❌ Bonus не передан в sendPDFFile');
      await ctx.reply('😔 Произошла ошибка. Попробуйте позже или напишите @NastuPopova');
      return;
    }

    // Теперь можно безопасно проверять bonus.type
    if (bonus.type === 'static' && bonus.staticType) {
      console.log(`📄 Отправляем статичный PDF fallback: ${bonus.staticType}`);
      await ctx.answerCbQuery('📤 Отправляю базовый гид...');
      return await this.sendAdditionalPDF(ctx, bonus.staticType);
    }

    // Если персональный — генерируем
    console.log(`📝 Генерация персонального гида для пользователя ${ctx.from.id}`);
    
    // Генерация HTML
    const filePath = await this.contentGenerator.generatePersonalizedHTML(
      ctx.from.id,
      ctx.session.analysisResult || bonus.analysisResult || {},  // защита от undefined
      ctx.session.answers || {}
    );

// Проверяем, что filePath вернулся (на случай ошибки в generatePersonalizedHTML)
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('❌ Не удалось сгенерировать HTML-файл');
      await ctx.reply('😔 Временная проблема с созданием гида. Напишите @NastuPopova — она пришлёт лично');
      return;
    }
    
      const isChildFlow = bonus.isChildFlow || false;
      const technique = bonus.technique;

    if (!technique) {
      console.error('❌ В бонусе нет техники');
      await ctx.reply('😔 Ошибка в персонализации. Напишите @NastuPopova');
      return;
    }

      let caption = `🎁 *${bonus.title}*\n\n`;
      caption += isChildFlow
        ? `🧸 Персональная игровая техника для вашего ребенка!\n\n`
        : `🌬️ Ваша персональная дыхательная техника!\n\n`;
      caption += `✨ *В файле:*\n`;
      caption += `• ${technique.name}\n`;
      caption += `• Пошаговая инструкция\n`;
      caption += `• Научное обоснование\n`;  // ← добавили, т.к. теперь есть science
      caption += `• План освоения на 3 дня\n`;
      caption += `• Ожидаемые результаты\n\n`;
      caption += `📱 Откройте файл в браузере для лучшего отображения.\n\n`;
      caption += `📞 *Больше техник у* [Анастасии Поповой](https://t.me/NastuPopova)`;
/ Отправка документа
      await ctx.replyWithDocument(
        { source: filePath },
        { caption, parse_mode: 'Markdown' }
      );

      await this.showPostPDFMenu(ctx);
      this.cleanupTempFile(filePath);
      this.bonusStats.byDeliveryMethod.file++;
      
    } catch (error) {
    console.error('❌ Ошибка в sendPDFFile:', error);
    await ctx.reply('😔 Не удалось создать гид. Напишите @NastuPopova — она пришлёт материалы лично');
  }
}

  async showMoreMaterials(ctx) {
    console.log(`🎁 Показываем меню материалов для пользователя ${ctx.from.id}`);
    
    const isChildFlow = ctx.session?.analysisResult?.analysisType === 'child';

    let message = `🎁 *ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ*\n\n`;
    message += `💡 Вы получили персональный дыхательный гид!\n`;
    message += `Это базовая техника. Полная система включает комплексные программы.\n\n`;
    
    message += `🎁 *БЕСПЛАТНЫЕ БОНУСЫ:*\n`;
    message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
    message += isChildFlow
      ? `• 📄 PDF "Дыхательные игры для детей"\n`
      : `• 📄 PDF "Антистресс дыхание"\n`;
    
    message += `\n📞 *Записаться:* [Анастасия Попова](https://t.me/breathing_opros_bot)`;

    const keyboard = [
      [Markup.button.url('📖 Все программы и отзывы', 'https://t.me/breathing_opros_bot')],
      [isChildFlow
        ? Markup.button.callback('📄 PDF: Игры для детей', 'download_static_child_games')
        : Markup.button.callback('📄 PDF: Антистресс дыхание', 'download_static_adult_antistress')
      ],
      [Markup.button.callback('🤔 Помочь выбрать программу', 'help_choose_program')],
      [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
    ];

    await this.safeEditOrReply(ctx, message, keyboard);
  }

  async showAllPrograms(ctx) {
    console.log(`📋 Показываем все программы для пользователя ${ctx.from.id}`);
    
    const message = `🎁 *КАКАЯ ПРОГРАММА ВАМ ПОДОЙДЕТ?*\n\n` +

      `🔰 *Стартовый комплект дыхательных практик*\n` +
      `👥 *Для кого:* Базовый набор для начинающих\n` +
      `📦 *Что входит:*\n` +
      `• Видеоурок длительностью 40 минут\n` +
      `• PDF-инструкция для самостоятельной практики\n` +
      `• Мгновенный доступ после оплаты\n\n` +
      `🎁 *Бонусы:*\n` +
      `• Урок по замеру контрольной паузы\n` +
      `• Аудиозапись для медитативного дыхания (15 минут)\n` +
      `💰 *Стоимость:* 990 ₽ (вместо 2600 ₽)\n\n` +

      `👨‍⚕️ *Индивидуальная консультация*\n` +
      `👥 *Для кого:* При серьезных проблемах со здоровьем\n` +
      `📋 *Что включает:*\n` +
      `• Диагностика вашего дыхания\n` +
      `• Персональная программа на 30 дней\n` +
      `• Обучение эффективным техникам\n` +
      `• Поддержка и контроль результатов\n` +
      `💰 *Стоимость:* от 3000 ₽\n\n` +

      `❓ *Не знаете что выбрать?*\n` +
      `Напишите [Анастасии](https://t.me/NastuPopova) - она поможет подобрать оптимальный вариант!`;

    const keyboard = [
      [Markup.button.callback('🛒 Заказать Стартовый комплект', 'order_starter')],
      [Markup.button.callback('👨‍⚕️ Записаться на консультацию', 'order_individual')],
      [Markup.button.callback('🤔 Помочь выбрать программу', 'help_choose_program')],
      [Markup.button.callback('🔙 Назад к материалам', 'more_materials')],
      [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
    ];

    await this.safeEditOrReply(ctx, message, keyboard);
  }

  async handleOrderStarter(ctx) {
    const message = `🔰 *СТАРТОВЫЙ КОМПЛЕКТ ДЫХАТЕЛЬНЫХ ПРАКТИК*\n\n` +
      `👥 *Для кого:* Базовый набор для начинающих\n\n` +
      `📦 *Что входит:*\n` +
      `• 📹 Видеоурок длительностью 40 минут\n` +
      `• 📋 PDF-инструкция для самостоятельной практики\n` +
      `• ⚡ Мгновенный доступ после оплаты\n\n` +
      `🎁 *Бонусы:*\n` +
      `• 📊 Урок по замеру контрольной паузы\n` +
      `• 🎧 Аудиозапись для медитативного дыхания (15 минут)\n\n` +
      `💰 *Стоимость:* 990 ₽ (вместо 2600 ₽)\n\n` +
      `📞 *Для заказа:* напишите [Анастасии Поповой](https://t.me/breathing_opros_bot)\n` +
      `💬 Укажите "Хочу стартовый комплект"`;

    const keyboard = [
      [Markup.button.url('📞 Заказать стартовый комплект', 'https://t.me/breathing_opros_bot')],
      [Markup.button.callback('🔙 К программам', 'show_all_programs')],
      [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
    ];

    await this.safeEditOrReply(ctx, message, keyboard);
  }

  async handleOrderIndividual(ctx) {
    const message = `👨‍⚕️ *ИНДИВИДУАЛЬНАЯ КОНСУЛЬТАЦИЯ*\n\n` +
      `👥 *Для кого:* При серьезных проблемах со здоровьем\n\n` +
      `📋 *Что включает:*\n` +
      `• 🔍 Диагностика вашего дыхания\n` +
      `• 📋 Персональная программа на 30 дней\n` +
      `• 🎓 Обучение эффективным техникам\n` +
      `• 💬 Поддержка и контроль результатов\n\n` +
      `💰 *Стоимость:* от 3000 ₽\n\n` +
      `📞 *Для записи:* напишите [Анастасии Поповой](https://t.me/breathing_opros_bot)\n` +
      `💬 Укажите "Хочу индивидуальную консультацию"`;

    const keyboard = [
      [Markup.button.url('📞 Записаться на консультацию', 'https://t.me/breathing_opros_bot')],
      [Markup.button.callback('🔙 К программам', 'show_all_programs')],
      [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
    ];

    await this.safeEditOrReply(ctx, message, keyboard);
  }

  async handleDownloadRequest(ctx, callbackData) {
    console.log(`📥 Обработка запроса скачивания: ${callbackData}`);
    
    if (callbackData === 'download_static_adult_antistress') {
      await this.sendAdditionalPDF(ctx, 'adult_antistress');
    } else if (callbackData === 'download_static_child_games') {
      await this.sendAdditionalPDF(ctx, 'child_games');
    } else if (callbackData.startsWith('download_pdf_')) {
      await this.sendPDFFile(ctx);
    } else {
      console.log(`⚠️ Неизвестный тип загрузки: ${callbackData}`);
    }
  }

  async sendAdditionalPDF(ctx, pdfType) {
    const material = this.additionalMaterials[pdfType];
    if (!material) {
      await ctx.reply('😔 Материал не найден. Обратитесь к [Анастасии](https://t.me/NastuPopova)', {
        parse_mode: 'Markdown'
      });
      return;
    }

    console.log(`📤 Попытка отправки PDF: ${material.fileName}`);
    await ctx.answerCbQuery('📤 Отправляю файл...');

    try {
      await ctx.replyWithDocument(
        { url: material.url, filename: material.fileName },
        {
          caption: `🎁 *${material.title}*\n\n${material.description}\n\n📞 Больше материалов у [Анастасии Поповой](https://t.me/NastuPopova)`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('👨‍⚕️ Записаться на консультацию', 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
            [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
          ])
        }
      );

      console.log(`✅ PDF успешно отправлен: ${material.title}`);
      this.bonusStats.byDeliveryMethod.static_pdf++;

    } catch (error) {
      console.log(`⚠️ Ошибка отправки файла: ${error.message}`);
      await this.sendPDFFallback(ctx, material);
    }
  }

  async sendPDFFallback(ctx, material) {
    try {
      const message = `📄 *${material.title}*\n\n` +
        `${material.description}\n\n` +
        `📥 К сожалению, автоматическая отправка файла временно недоступна.\n\n` +
        `📱 *Как получить PDF:*\n` +
        `1️⃣ Нажмите кнопку "Открыть PDF" ниже\n` +
        `2️⃣ В открывшемся окне нажмите кнопку скачивания (⬇️)\n` +
        `3️⃣ Файл сохранится в ваши загрузки\n\n` +
        `💡 Если возникнут проблемы, напишите [Анастасии](https://t.me/NastuPopova) - она отправит файл лично`;

      const keyboard = [
        [Markup.button.url('📥 Открыть PDF', material.directUrl)],
        [Markup.button.url('👨‍⚕️ Записаться на консультацию', 'https://t.me/breathing_opros_bot')],
        [Markup.button.callback('🎁 Другие материалы', 'more_materials')],
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
        [Markup.button.callback('🗑️ Удалить это меню', 'delete_menu')]
      ];

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      });

      this.bonusStats.byDeliveryMethod.fallback_link++;

    } catch (error) {
      console.error('❌ Ошибка отправки fallback PDF:', error);
      await ctx.reply(
        `😔 Временные технические проблемы с отправкой материалов.\n\n📞 Напишите [Анастасии Поповой](https://t.me/NastuPopova) - она отправит все файлы лично!`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
          ])
        }
      );
    }
  }

  async showPostPDFMenu(ctx) {
  const message = `✅ *Ваш персональный гид отправлен!*\n\n` +
    `🎯 *Что дальше?*\n` +
    `• Изучите технику и начните практиковать уже сегодня\n` +
    `• При вопросах — пишите Анастасии лично\n\n` +
    `Готовы к более глубоким изменениям?`;

  const keyboard = [
    [Markup.button.url('👩‍⚕️ Записаться на консультацию', 'https://t.me/NastuPopova')],
    [Markup.button.url('🛒 Все программы и курсы', 'https://t.me/breathing_opros_bot')],
    [Markup.button.url('📖 Полезные статьи о дыхании', 'https://t.me/spokoinoe_dyhanie')],
    [Markup.button.callback('🗑️ Закрыть меню', 'delete_menu')]
  ];

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard)
  });
}

  async closeMenu(ctx) {
    console.log(`🗑️ Удаление меню для пользователя ${ctx.from.id}`);
    
    try {
      await ctx.deleteMessage();
      console.log('✅ Сообщение удалено');
    } catch (deleteError) {
      try {
        await ctx.editMessageText(
          `✅ *Меню закрыто*\n\n💬 Вопросы? Пишите [Анастасии Поповой](https://t.me/NastuPopova)`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [] }
          }
        );
      } catch (editError) {
        await ctx.reply(
          `✅ *Меню закрыто*\n\n💬 Вопросы? Пишите [Анастасии Поповой](https://t.me/NastuPopova)`,
          { parse_mode: 'Markdown' }
        );
      }
    }
  }

  sendFallbackTechnique(ctx, bonus) {
    const technique = bonus.technique;
    let message = `⚠️ Файл временно недоступен, но вот ваша техника:\n\n`;
    message += `🎯 *${technique.name}*\n\n`;
    message += `*Пошаговая инструкция:*\n`;
    technique.steps.forEach((step, idx) => {
      message += `${idx + 1}. ${step}\n`;
    });
    message += `\n⏱️ *Время:* ${technique.duration}\n`;
    message += `✨ *Результат:* ${technique.result}\n\n`;
    message += `💬 Напишите [Анастасии Поповой](https://t.me/NastuPopova) за полным гидом!`;

    return ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
        [Markup.button.callback('🗑️ Удалить меню', 'delete_menu')]
      ])
    });
  }

  getFallbackBonus() {
    return {
      id: 'fallback_adult_chronic_stress',
      title: 'Дыхательный гид: Антистресс',
      subtitle: 'Персональная техника для вашего здоровья',
      description: 'Базовая техника дыхания от стресса',
      technique: this.contentGenerator.masterTechniques.chronic_stress,
      target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
    };
  }

  cleanupTempFile(filePath) {
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Временный файл удален: ${filePath}`);
        }
      } catch (error) {
        console.error('⚠️ Ошибка удаления временного файла:', error);
      }
    }, 1000);
  }
}

module.exports = FileHandler;
