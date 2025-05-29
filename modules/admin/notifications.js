const { Markup } = require('telegraf');
const config = require('../../config');

class AdminNotificationSystem {
  constructor(bot) {
    this.bot = bot;
    this.adminId = config.ADMIN_ID;
    this.enableNotifications = true;
    
    // Статистика для администратора
    this.dailyStats = {
      totalLeads: 0,
      hotLeads: 0,
      warmLeads: 0,
      coldLeads: 0,
      nurtureLeads: 0,
      lastReset: new Date().toDateString()
    };

    // Хранилище сегментов в памяти (в продакшене лучше использовать БД)
    this.segmentStorage = {};
    this.leadDataStorage = {};
  }

  /**
   * Переводит массив значений в человекочитаемый текст
   */
  translateArray(values, maxItems = 3) {
    if (!values || !Array.isArray(values)) return 'Не указано';
    
    const translated = values.slice(0, maxItems).map(value => {
      return config.TRANSLATIONS[value] || value;
    });
    
    const result = translated.join(', ');
    if (values.length > maxItems) {
      return `${result} и еще ${values.length - maxItems}`;
    }
    return result;
  }

  /**
   * Переводит одно значение
   */
  translateValue(value) {
    if (!value) return 'Не указано';
    return config.TRANSLATIONS[value] || value;
  }

  /**
   * Отправляет уведомление администратору о новом лиде
   */
  async notifyNewLead(userData) {
    if (!this.adminId || !this.enableNotifications) {
      console.log('⚠️ Уведомления администратора отключены или ADMIN_ID не настроен');
      console.log(`   adminId: ${this.adminId}`);
      console.log(`   enableNotifications: ${this.enableNotifications}`);
      return;
    }

    console.log(`📤 Отправляем уведомление админу ${this.adminId} о лиде ${userData.userInfo?.telegram_id}`);

    try {
      // Сбрасываем статистику если новый день
      this.resetDailyStatsIfNeeded();
      
      // Обновляем статистику
      this.updateDailyStats(userData.analysisResult?.segment);

      // Сохраняем данные лида для последующего использования
      this.storeLeadData(userData.userInfo?.telegram_id, userData);

      // Формируем уведомление
      const message = this.generateLeadNotification(userData);
      const keyboard = this.generateAdminKeyboard(userData);

      // Логирование перед отправкой
      console.log('📨 Отправляем сообщение админу...');
      console.log(`   Message length: ${message?.length || 0}`);
      console.log(`   User ID: ${userData.userInfo?.telegram_id}`);
      console.log(`   Segment: ${userData.analysisResult?.segment || 'UNKNOWN'}`);

      // Отправляем уведомление
      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log('✅ Сообщение админу отправлено успешно');
      
      // Если это горячий лид, отправляем дополнительное срочное уведомление
      if (userData.analysisResult?.segment === 'HOT_LEAD') {
        await this.sendUrgentNotification(userData);
      }

    } catch (error) {
      console.error('❌ Ошибка отправки уведомления администратору:', error);
      console.error('   Admin ID:', this.adminId);
      console.error('   Message length:', message?.length || 'unknown');
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Отправляет результаты анкетирования администратору
   */
  async notifySurveyResults(userData) {
    if (!this.adminId || !this.enableNotifications) {
      console.log('⚠️ Уведомления администратора отключены или ADMIN_ID не настроен');
      console.log(`   adminId: ${this.adminId}`);
      console.log(`   enableNotifications: ${this.enableNotifications}`);
      return;
    }

    try {
      const { userInfo, surveyAnswers, surveyType, analysisResult } = userData;
      const isChildFlow = surveyType === 'child';

      let message = `📋 *РЕЗУЛЬТАТЫ АНКЕТИРОВАНИЯ*\n\n`;

      // Информация о пользователе
      message += `👤 *Пользователь:*\n`;
      message += `• Имя: ${userInfo?.first_name || 'Неизвестно'}\n`;
      message += `• Username: ${userInfo?.username ? '@' + userInfo.username : 'Не указан'}\n`;
      message += `• Telegram ID: \`${userInfo?.telegram_id}\`\n`;
      message += `• Тип анкеты: ${isChildFlow ? '👶 Детская' : '👨‍💼 Взрослая'}\n\n`;

      // Контактная информация
      message += `📞 *Контактные данные:*\n`;
      if (userData.contactInfo?.phone) {
        message += `• Телефон: ${userData.contactInfo.phone}\n`;
      }
      if (userData.contactInfo?.email) {
        message += `• Email: ${userData.contactInfo.email}\n`;
      }
      message += `• Telegram: ${userInfo?.username ? '@' + userInfo.username : 'Не указан'}\n\n`;

      // Результаты анкеты С ПЕРЕВОДАМИ
      message += `📝 *Ответы пользователя:*\n`;
      if (isChildFlow) {
        if (surveyAnswers?.child_age_detail) {
          message += `• Возраст ребенка: ${this.translateValue(surveyAnswers.child_age_detail)}\n`;
        }
        if (surveyAnswers?.child_problems_detailed) {
          message += `• Проблемы: ${this.translateArray(surveyAnswers.child_problems_detailed)}\n`;
        }
        if (surveyAnswers?.child_parent_involvement) {
          message += `• Кто занимается: ${this.translateValue(surveyAnswers.child_parent_involvement)}\n`;
        }
        if (surveyAnswers?.child_education_status) {
          message += `• Образование: ${this.translateValue(surveyAnswers.child_education_status)}\n`;
        }
        if (surveyAnswers?.child_schedule_stress) {
          message += `• Загруженность: ${this.translateValue(surveyAnswers.child_schedule_stress)}\n`;
        }
      } else {
        if (surveyAnswers?.age_group) {
          message += `• Возрастная группа: ${this.translateValue(surveyAnswers.age_group)}\n`;
        }
        if (surveyAnswers?.stress_level) {
          message += `• Уровень стресса: ${surveyAnswers.stress_level}/10\n`;
        }
        if (surveyAnswers?.current_problems) {
          message += `• Проблемы: ${this.translateArray(surveyAnswers.current_problems)}\n`;
        }
        if (surveyAnswers?.occupation) {
          message += `• Деятельность: ${this.translateValue(surveyAnswers.occupation)}\n`;
        }
        if (surveyAnswers?.time_commitment) {
          message += `• Время на практики: ${this.translateValue(surveyAnswers.time_commitment)}\n`;
        }
        if (surveyAnswers?.main_goals) {
          message += `• Цели: ${this.translateArray(surveyAnswers.main_goals, 2)}\n`;
        }
      }

      // Результат анализа
      message += `\n📊 *Результат анализа:*\n`;
      message += `• Сегмент: ${analysisResult?.segment || 'Не определен'}\n`;
      message += `• Общий балл: ${analysisResult?.scores?.total || 0}/100\n`;
      if (analysisResult?.scores) {
        message += `• Срочность: ${analysisResult.scores.urgency}/100\n`;
        message += `• Готовность: ${analysisResult.scores.readiness}/100\n`;
        message += `• Соответствие: ${analysisResult.scores.fit}/100\n`;
      }

      // Время
      message += `\n🕐 *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

      // Логирование перед отправкой
      console.log('📨 Отправляем результаты анкетирования админу...');
      console.log(`   User ID: ${userInfo?.telegram_id}`);
      console.log(`   Message length: ${message.length}`);

      // Отправляем сообщение только администратору
      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать пользователю', `https://t.me/${userInfo?.username || 'user'}`)],
          [Markup.button.callback('📊 Полная анкета', `admin_full_survey_${userInfo?.telegram_id}`)]
        ])
      });

      console.log(`✅ Результаты анкетирования отправлены администратору: ${userInfo?.telegram_id}`);

    } catch (error) {
      console.error('❌ Ошибка отправки результатов анкетирования администратору:', error);
      console.error('   Admin ID:', this.adminId);
      console.error('   Message length:', message?.length || 'unknown');
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Генерирует сообщение-уведомление о новом лиде
   */
  generateLeadNotification(userData) {
    const { userInfo, analysisResult, surveyAnswers, surveyType } = userData;
    const isChildFlow = surveyType === 'child';
    
    // Эмодзи для сегментов
    const segmentEmojis = {
      'HOT_LEAD': '🔥',
      'WARM_LEAD': '⭐',
      'COLD_LEAD': '❄️',
      'NURTURE_LEAD': '🌱'
    };

    // Определяем приоритет
    const segment = analysisResult?.segment || 'UNKNOWN';
    const emoji = segmentEmojis[segment] || '❓';
    const score = analysisResult?.scores?.total || 0;

    let message = `${emoji} *НОВЫЙ ЛИД ${segment}*\n\n`;
    
    // Информация о пользователе
    message += `👤 *Пользователь:*\n`;
    message += `• Имя: ${userInfo?.first_name || 'Неизвестно'}\n`;
    message += `• Username: ${userInfo?.username ? '@' + userInfo.username : 'Не указан'}\n`;
    message += `• Telegram ID: \`${userInfo?.telegram_id}\`\n`;
    message += `• Тип анкеты: ${isChildFlow ? '👶 Детская' : '👨‍💼 Взрослая'}\n\n`;

    // Скор и анализ
    message += `📊 *Анализ VERSE:*\n`;
    message += `• Общий балл: ${score}/100\n`;
    if (analysisResult?.scores) {
      message += `• Срочность: ${analysisResult.scores.urgency}/100\n`;
      message += `• Готовность: ${analysisResult.scores.readiness}/100\n`;
      message += `• Соответствие: ${analysisResult.scores.fit}/100\n`;
    }
    message += `\n`;

    // Основная проблема
    if (analysisResult?.primaryIssue) {
      const problemDescriptions = {
        'chronic_stress': 'Хронический стресс',
        'anxiety': 'Тревожность и паника',
        'insomnia': 'Проблемы со сном',
        'breathing_issues': 'Проблемы с дыханием',
        'high_pressure': 'Повышенное давление',
        'hyperactivity': 'Гиперактивность (детская)',
        'separation_anxiety': 'Страх разлуки (детская)',
        'sleep_problems': 'Проблемы со сном (детская)'
      };
      
      const problemDesc = problemDescriptions[analysisResult.primaryIssue] || analysisResult.primaryIssue;
      message += `🎯 *Основная проблема:* ${problemDesc}\n\n`;
    }

    // Контактная информация и следующие шаги
    if (segment === 'HOT_LEAD') {
      message += `⚡ *СРОЧНО:* Связаться в течение 2 часов!\n\n`;
    } else if (segment === 'WARM_LEAD') {
      message += `⏰ *Связаться в течение 24 часов*\n\n`;
    }

    // Ключевые ответы из анкеты С ПЕРЕВОДАМИ
    message += `📝 *Ключевые ответы:*\n`;
    
    if (isChildFlow) {
      // Детская анкета
      if (surveyAnswers?.child_age_detail) {
        message += `• Возраст ребенка: ${this.translateValue(surveyAnswers.child_age_detail)}\n`;
      }
      if (surveyAnswers?.child_problems_detailed) {
        message += `• Проблемы: ${this.translateArray(surveyAnswers.child_problems_detailed, 2)}\n`;
      }
      if (surveyAnswers?.child_parent_involvement) {
        message += `• Кто занимается: ${this.translateValue(surveyAnswers.child_parent_involvement)}\n`;
      }
    } else {
      // Взрослая анкета
      if (surveyAnswers?.stress_level) {
        message += `• Уровень стресса: ${surveyAnswers.stress_level}/10\n`;
      }
      if (surveyAnswers?.current_problems) {
        message += `• Проблемы: ${this.translateArray(surveyAnswers.current_problems, 2)}\n`;
      }
      if (surveyAnswers?.occupation) {
        message += `• Деятельность: ${this.translateValue(surveyAnswers.occupation)}\n`;
      }
      if (surveyAnswers?.time_commitment) {
        message += `• Время на практики: ${this.translateValue(surveyAnswers.time_commitment)}\n`;
      }
    }

    // Статистика дня
    message += `\n📈 *Статистика сегодня:*\n`;
    message += `• Всего лидов: ${this.dailyStats.totalLeads}\n`;
    message += `• 🔥 Горячих: ${this.dailyStats.hotLeads}\n`;
    message += `• ⭐ Теплых: ${this.dailyStats.warmLeads}\n`;
    message += `• ❄️ Холодных: ${this.dailyStats.coldLeads}\n`;

    // Время получения
    message += `\n🕐 *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

    return message;
  }

  /**
   * Генерирует клавиатуру для администратора
   */
  generateAdminKeyboard(userData) {
    const userTelegramId = userData.userInfo?.telegram_id;
    const username = userData.userInfo?.username;
    const segment = userData.analysisResult?.segment;

    const buttons = [];

    // Кнопка связи с пользователем
    if (username) {
      buttons.push([Markup.button.url('💬 Написать пользователю', `https://t.me/${username}`)]);
    }

    // Кнопки действий в зависимости от сегмента
    if (segment === 'HOT_LEAD') {
      buttons.push([
        Markup.button.callback('🔥 Срочный звонок', `admin_urgent_call_${userTelegramId}`),
        Markup.button.callback('📅 Записать на консультацию', `admin_book_consultation_${userTelegramId}`)
      ]);
    } else if (segment === 'WARM_LEAD') {
      buttons.push([
        Markup.button.callback('📞 Позвонить', `admin_call_${userTelegramId}`),
        Markup.button.callback('📧 Отправить материалы', `admin_send_materials_${userTelegramId}`)
      ]);
    } else {
      buttons.push([
        Markup.button.callback('📧 Добавить в рассылку', `admin_add_newsletter_${userTelegramId}`)
      ]);
    }

    // Служебные кнопки
    buttons.push([
      Markup.button.callback('📊 Полная анкета', `admin_full_survey_${userTelegramId}`),
      Markup.button.callback('🏷️ Изменить сегмент', `admin_change_segment_${userTelegramId}`)
    ]);

    buttons.push([
      Markup.button.callback('✅ Обработано', `admin_mark_processed_${userTelegramId}`)
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Отправляет срочное уведомление для горячих лидов
   */
  async sendUrgentNotification(userData) {
    try {
      const urgentMessage = `🚨 *СРОЧНЫЙ ГОРЯЧИЙ ЛИД!*\n\n` +
        `👤 ${userData.userInfo?.first_name || 'Пользователь'}\n` +
        `💬 ${userData.userInfo?.username ? '@' + userData.userInfo.username : 'Без username'}\n` +
        `📞 ID: \`${userData.userInfo?.telegram_id}\`\n\n` +
        `⚡ *Требует связи в течение 2 часов!*\n` +
        `🎯 Балл: ${userData.analysisResult?.scores?.total || 0}/100\n\n` +
        `🔔 Уведомление #${this.dailyStats.hotLeads}`;

      console.log('📨 Отправляем срочное уведомление о горячем лиде...');
      console.log(`   User ID: ${userData.userInfo?.telegram_id}`);

      await this.bot.telegram.sendMessage(this.adminId, urgentMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔥 Обработать срочно', `admin_urgent_process_${userData.userInfo?.telegram_id}`)],
          [Markup.button.url('💬 Написать сейчас', `https://t.me/${userData.userInfo?.username || 'user'}`)]
        ])
      });

      console.log('✅ Срочное уведомление отправлено успешно');

    } catch (error) {
      console.error('❌ Ошибка отправки срочного уведомления:', error);
      console.error('   Admin ID:', this.adminId);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Обрабатывает нажатия на кнопки администратора
   */
  async handleAdminCallback(ctx, action, targetUserId) {
    try {
      console.log('🔍 Admin callback:', { action, targetUserId });

      switch (action) {
        case 'urgent_call':
          await ctx.editMessageText(
            `🔥 *СРОЧНЫЙ ЗВОНОК ЗАПЛАНИРОВАН*\n\n` +
            `👤 Пользователь: ${targetUserId}\n` +
            `⏰ Время: ${new Date().toLocaleString('ru-RU')}\n\n` +
            `✅ Статус изменен на "Обработка"`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'book_consultation':
          await ctx.editMessageText(
            `📅 *КОНСУЛЬТАЦИЯ ЗАПЛАНИРОВАНА*\n\n` +
            `👤 Пользователь: ${targetUserId}\n` +
            `📋 Добавлен в календарь консультаций\n\n` +
            `✅ Следующий шаг: Связаться для подтверждения времени`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'call':
          await ctx.editMessageText(
            `📞 *ЗВОНОК ЗАПЛАНИРОВАН*\n\n` +
            `👤 Пользователь: ${targetUserId}\n` +
            `⏰ Позвонить в течение 24 часов\n\n` +
            `✅ Статус: В работе`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'send_materials':
          await ctx.editMessageText(
            `📧 *МАТЕРИАЛЫ ОТПРАВЛЕНЫ*\n\n` +
            `👤 Пользователь: ${targetUserId}\n` +
            `📦 Высланы дополнительные материалы\n\n` +
            `✅ Добавлен в теплую базу`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'add_newsletter':
          await ctx.editMessageText(
            `📧 *ДОБАВЛЕН В РАССЫЛКУ*\n\n` +
            `👤 Пользователь: ${targetUserId}\n` +
            `📮 Будет получать еженедельные материалы\n\n` +
            `✅ Сегмент: Долгосрочное взращивание`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'mark_processed':
          await ctx.editMessageText(
            `✅ *ЛИД ОБРАБОТАН*\n\n` +
            `👤 Пользователь: ${targetUserId}\n` +
            `🕐 Обработан: ${new Date().toLocaleString('ru-RU')}\n\n` +
            `📊 Статус: Закрыт`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'full_survey':
          await this.sendFullSurveyData(ctx, targetUserId);
          break;

        case 'urgent_process':
          await ctx.answerCbQuery('🔥 Лид взят в срочную обработку');
          await ctx.editMessageText(
            `🔥 *В СРОЧНОЙ ОБРАБОТКЕ*\n\n` +
            `👤 Пользователь: ${targetUserId}\n` +
            `⏰ Взято в работу: ${new Date().toLocaleString('ru-RU')}\n\n` +
            `✅ Приоритет: МАКСИМАЛЬНЫЙ`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'change_segment':
          await this.showSegmentChangeMenu(ctx, targetUserId);
          break;

        default:
          if (action.startsWith('set_segment_')) {
            await this.handleSegmentChange(ctx, action, targetUserId);
          } else if (action.startsWith('back_to_lead_')) {
            await this.backToLeadInfo(ctx, targetUserId);
          } else {
            console.warn('⚠️ Неизвестное действие:', action);
            await ctx.answerCbQuery('Действие не распознано');
          }
      }

    } catch (error) {
      console.error('❌ Ошибка обработки admin callback:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
      await ctx.answerCbQuery('Ошибка выполнения действия');
    }
  }

  /**
   * Показ меню выбора сегмента
   */
  async showSegmentChangeMenu(ctx, targetUserId) {
    try {
      const currentSegment = this.getStoredSegment(targetUserId) || 'UNKNOWN';
      const currentSegmentName = this.getSegmentDisplayName(currentSegment);

      const message = `🔄 *ИЗМЕНИТЬ СЕГМЕНТ*\n\n` +
        `👤 *Пользователь:* ${targetUserId}\n` +
        `📊 *Текущий сегмент:* ${currentSegmentName}\n\n` +
        `Выберите новый сегмент:`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔥 Горячий (срочно)', `admin_set_segment_HOT_LEAD_${targetUserId}`),
            Markup.button.callback('⭐ Теплый (24ч)', `admin_set_segment_WARM_LEAD_${targetUserId}`)
          ],
          [
            Markup.button.callback('❄️ Холодный (плановый)', `admin_set_segment_COLD_LEAD_${targetUserId}`),
            Markup.button.callback('🌱 Взращивание', `admin_set_segment_NURTURE_LEAD_${targetUserId}`)
          ],
          [
            Markup.button.callback('❌ Отмена', `admin_back_to_lead_${targetUserId}`)
          ]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка showSegmentChangeMenu:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
      await ctx.answerCbQuery('Ошибка показа меню сегментов');
    }
  }

  /**
   * Обработка изменения сегмента
   */
  async handleSegmentChange(ctx, action, targetUserId) {
    try {
      const newSegment = action.replace('set_segment_', '');
      const oldSegment = this.getStoredSegment(targetUserId) || 'UNKNOWN';

      // Сохраняем новый сегмент
      this.updateStoredSegment(targetUserId, newSegment);

      const oldSegmentName = this.getSegmentDisplayName(oldSegment);
      const newSegmentName = this.getSegmentDisplayName(newSegment);

      const message = `✅ *СЕГМЕНТ ОБНОВЛЕН*\n\n` +
        `👤 *Пользователь:* ${targetUserId}\n` +
        `🔄 *Изменение:* ${oldSegmentName} → ${newSegmentName}\n` +
        `⏰ *Время:* ${new Date().toLocaleString('ru-RU')}\n\n` +
        `${this.getSegmentActionRecommendation(newSegment)}`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📞 Связаться', `admin_call_${targetUserId}`)],
          [Markup.button.callback('📊 Полная анкета', `admin_full_survey_${targetUserId}`)],
          [Markup.button.callback('✅ Обработано', `admin_mark_processed_${targetUserId}`)]
        ])
      });

      // Логируем изменение
      this.logSegmentChange(targetUserId, oldSegment, newSegment, ctx.from);

      // Отправляем срочное уведомление если повысили до HOT_LEAD
      if (newSegment === 'HOT_LEAD' && oldSegment !== 'HOT_LEAD') {
        setTimeout(() => {
          this.sendUrgentSegmentChangeNotification(targetUserId, oldSegment, newSegment);
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Ошибка handleSegmentChange:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
      await ctx.answerCbQuery('Ошибка изменения сегмента');
    }
  }

  /**
   * Возврат к информации о лиде
   */
  async backToLeadInfo(ctx, targetUserId) {
    try {
      const segment = this.getStoredSegment(targetUserId) || 'UNKNOWN';
      const segmentName = this.getSegmentDisplayName(segment);
      const leadData = this.getStoredLeadData(targetUserId);

      let message = `👤 *ИНФОРМАЦИЯ О ЛИДЕ*\n\n`;
      message += `🆔 *ID:* ${targetUserId}\n`;
      message += `📊 *Сегмент:* ${segmentName}\n`;
      
      if (leadData?.userInfo?.first_name) {
        message += `👤 *Имя:* ${leadData.userInfo.first_name}\n`;
      }
      if (leadData?.userInfo?.username) {
        message += `💬 *Username:* @${leadData.userInfo.username}\n`;
      }
      
      message += `⏰ *Обновлено:* ${new Date().toLocaleString('ru-RU')}\n\n`;
      message += `Выберите действие:`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Изменить сегмент', `admin_change_segment_${targetUserId}`)],
          [Markup.button.callback('📞 Связаться', `admin_call_${targetUserId}`)],
          [Markup.button.callback('📊 Полная анкета', `admin_full_survey_${targetUserId}`)],
          [Markup.button.callback('✅ Обработано', `admin_mark_processed_${targetUserId}`)]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка backToLeadInfo:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
      await ctx.answerCbQuery('Ошибка возврата к информации о лиде');
    }
  }

  /**
   * Рекомендации по действиям для сегмента
   */
  getSegmentActionRecommendation(segment) {
    const recommendations = {
      'HOT_LEAD': `🚨 *СРОЧНЫЕ ДЕЙСТВИЯ:*\n• Связаться в течение 2 часов\n• Предложить экстренную консультацию\n• Подготовить индивидуальное предложение`,
      'WARM_LEAD': `⏰ *РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ:*\n• Связаться в течение 24 часов\n• Отправить персональные материалы\n• Запланировать консультацию`,
      'COLD_LEAD': `📅 *ПЛАНОВЫЕ ДЕЙСТВИЯ:*\n• Добавить в еженедельный план\n• Отправить образовательные материалы\n• Периодически поддерживать контакт`,
      'NURTURE_LEAD': `🌱 *ДОЛГОСРОЧНАЯ РАБОТА:*\n• Добавить в образовательную рассылку\n• Приглашать на бесплатные вебинары\n• Отслеживать изменения потребностей`
    };

    return recommendations[segment] || '💡 Стандартная обработка лида';
  }

  /**
   * Получение отображаемого имени сегмента
   */
  getSegmentDisplayName(segment) {
    const segmentNames = {
      'HOT_LEAD': '🔥 Горячий лид (срочно)',
      'WARM_LEAD': '⭐ Теплый лид (24 часа)',
      'COLD_LEAD': '❄️ Холодный лид (плановый)',
      'NURTURE_LEAD': '🌱 Для взращивания',
      'UNKNOWN': '❓ Неизвестен'
    };

    return segmentNames[segment] || `❓ ${segment}`;
  }

  /**
   * Логирование изменений сегмента
   */
  logSegmentChange(userId, oldSegment, newSegment, admin) {
    const logEntry = {
      event: 'segment_changed',
      timestamp: new Date().toISOString(),
      user_id: userId,
      old_segment: oldSegment,
      new_segment: newSegment,
      changed_by: {
        admin_id: admin?.id,
        admin_username: admin?.username,
        admin_first_name: admin?.first_name
      }
    };

    console.log('📝 ИЗМЕНЕНИЕ СЕГМЕНТА:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Срочное уведомление об изменении сегмента на HOT_LEAD
   */
  async sendUrgentSegmentChangeNotification(userId, oldSegment, newSegment) {
    try {
      if (!this.adminId) return;

      const message = `🚨 *СРОЧНОЕ ИЗМЕНЕНИЕ СЕГМЕНТА*\n\n` +
        `👤 *Пользователь:* ${userId}\n` +
        `🔄 *Изменение:* ${oldSegment} → ${newSegment}\n` +
        `⏰ *Время:* ${new Date().toLocaleString('ru-RU')}\n\n` +
        `⚡ *Лид повышен до ГОРЯЧЕГО!*\n` +
        `Требуется связаться в течение 2 часов.`;

      console.log('📨 Отправляем срочное уведомление об изменении сегмента...');
      console.log(`   User ID: ${userId}`);

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔥 Обработать срочно', `admin_urgent_process_${userId}`)],
          [Markup.button.callback('📞 Связаться сейчас', `admin_urgent_call_${userId}`)]
        ])
      });

      console.log('✅ Срочное уведомление об изменении сегмента отправлено успешно');

    } catch (error) {
      console.error('❌ Ошибка отправки срочного уведомления об изменении сегмента:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Отправляет полную информацию об анкете
   */
  async sendFullSurveyData(ctx, targetUserId) {
    try {
      const leadData = this.getStoredLeadData(targetUserId);
      
      if (!leadData) {
        await ctx.reply(
          `📋 *ПОЛНАЯ АНКЕТА ПОЛЬЗОВАТЕЛЯ*\n\n` +
          `👤 *ID:* ${targetUserId}\n\n` +
          `⚠️ *Данные анкеты не найдены.*\n` +
          `Возможно, информация была очищена или пользователь не завершил анкету.\n\n` +
          `💡 *Рекомендация:* Свяжитесь с пользователем напрямую для получения актуальной информации.`,
          { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔙 Назад к лиду', `admin_back_to_lead_${targetUserId}`)]
            ])
          }
        );
        return;
      }

      const { surveyAnswers, analysisResult, userInfo, surveyType } = leadData;
      const isChildFlow = surveyType === 'child';

      let message = `📋 *ПОЛНАЯ АНКЕТА ПОЛЬЗОВАТЕЛЯ*\n\n`;
      message += `👤 *Основная информация:*\n`;
      message += `• Имя: ${userInfo?.first_name || 'Неизвестно'}\n`;
      message += `• Username: ${userInfo?.username ? '@' + userInfo.username : 'Не указан'}\n`;
      message += `• Telegram ID: \`${targetUserId}\`\n`;
      message += `• Тип анкеты: ${isChildFlow ? '👶 Детская' : '👨‍💼 Взрослая'}\n\n`;

      message += `📊 *Результат анализа:*\n`;
      message += `• Сегмент: ${analysisResult?.segment || 'Не определен'}\n`;
      message += `• Общий балл: ${analysisResult?.scores?.total || 0}/100\n`;
      if (analysisResult?.scores) {
        message += `• Срочность: ${analysisResult.scores.urgency}/100\n`;
        message += `• Готовность: ${analysisResult.scores.readiness}/100\n`;
        message += `• Соответствие: ${analysisResult.scores.fit}/100\n`;
      }
      message += `• Основная проблема: ${this.translateValue(analysisResult?.primaryIssue)}\n\n`;

      message += `📝 *Детальные ответы:*\n`;
      
      if (isChildFlow) {
        // Детская анкета
        if (surveyAnswers?.child_age_detail) {
          message += `• Возраст ребенка: ${this.translateValue(surveyAnswers.child_age_detail)}\n`;
        }
        if (surveyAnswers?.child_education_status) {
          message += `• Образование: ${this.translateValue(surveyAnswers.child_education_status)}\n`;
        }
        if (surveyAnswers?.child_schedule_stress) {
          message += `• Загруженность: ${this.translateValue(surveyAnswers.child_schedule_stress)}\n`;
        }
        if (surveyAnswers?.child_problems_detailed) {
          message += `• Проблемы: ${this.translateArray(surveyAnswers.child_problems_detailed)}\n`;
        }
        if (surveyAnswers?.child_parent_involvement) {
          message += `• Кто занимается: ${this.translateValue(surveyAnswers.child_parent_involvement)}\n`;
        }
        if (surveyAnswers?.child_motivation_approach) {
          message += `• Мотивация: ${this.translateValue(surveyAnswers.child_motivation_approach)}\n`;
        }
        if (surveyAnswers?.child_time_availability) {
          message += `• Время занятий: ${this.translateValue(surveyAnswers.child_time_availability)}\n`;
        }
      } else {
        // Взрослая анкета
        if (surveyAnswers?.age_group) {
          message += `• Возраст: ${this.translateValue(surveyAnswers.age_group)}\n`;
        }
        if (surveyAnswers?.occupation) {
          message += `• Деятельность: ${this.translateValue(surveyAnswers.occupation)}\n`;
        }
        if (surveyAnswers?.physical_activity) {
          message += `• Физ.активность: ${this.translateValue(surveyAnswers.physical_activity)}\n`;
        }
        if (surveyAnswers?.stress_level) {
          message += `• Уровень стресса: ${surveyAnswers.stress_level}/10\n`;
        }
        if (surveyAnswers?.sleep_quality) {
          message += `• Качество сна: ${surveyAnswers.sleep_quality}/10\n`;
        }
        if (surveyAnswers?.current_problems) {
          message += `• Текущие проблемы: ${this.translateArray(surveyAnswers.current_problems)}\n`;
        }
        if (surveyAnswers?.priority_problem) {
          message += `• Приоритетная проблема: ${this.translateValue(surveyAnswers.priority_problem)}\n`;
        }
        if (surveyAnswers?.breathing_method) {
          message += `• Метод дыхания: ${this.translateValue(surveyAnswers.breathing_method)}\n`;
        }
        if (surveyAnswers?.breathing_frequency) {
          message += `• Частота проблем с дыханием: ${this.translateValue(surveyAnswers.breathing_frequency)}\n`;
        }
        if (surveyAnswers?.shallow_breathing) {
          message += `• Поверхностное дыхание: ${this.translateValue(surveyAnswers.shallow_breathing)}\n`;
        }
        if (surveyAnswers?.stress_breathing) {
          message += `• Дыхание в стрессе: ${this.translateValue(surveyAnswers.stress_breathing)}\n`;
        }
        if (surveyAnswers?.breathing_experience) {
          message += `• Опыт с практиками: ${this.translateValue(surveyAnswers.breathing_experience)}\n`;
        }
        if (surveyAnswers?.time_commitment) {
          message += `• Время на практики: ${this.translateValue(surveyAnswers.time_commitment)}\n`;
        }
        if (surveyAnswers?.format_preferences) {
          message += `• Предпочитаемые форматы: ${this.translateArray(surveyAnswers.format_preferences)}\n`;
        }
        if (surveyAnswers?.main_goals) {
          message += `• Основные цели: ${this.translateArray(surveyAnswers.main_goals)}\n`;
        }
      }

      message += `\n🕐 *Дата анкетирования:* ${new Date(leadData.timestamp || Date.now()).toLocaleString('ru-RU')}`;

      console.log('📨 Отправляем полную анкету админу...');
      console.log(`   User ID: ${targetUserId}`);
      console.log(`   Message length: ${message.length}`);

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Назад к лиду', `admin_back_to_lead_${targetUserId}`)],
          [Markup.button.url('💬 Написать пользователю', `https://t.me/${userInfo?.username || 'user'}`)]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка отправки полной анкеты:', error);
      console.error('   Admin ID:', this.adminId);
      console.error('   Message length:', message?.length || 'unknown');
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
      await ctx.reply(
        `😔 Произошла ошибка при получении данных анкеты.\n\n` +
        `📞 Свяжитесь с пользователем напрямую: ${targetUserId}`,
        { 
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Назад', `admin_back_to_lead_${targetUserId}`)]
          ])
        }
      );
    }
  }

  /**
   * Отправляет ежедневную сводку администратору
   */
  async sendDailySummary() {
    if (!this.adminId) {
      console.log('⚠️ ADMIN_ID не настроен, ежедневная сводка не отправлена');
      return;
    }

    try {
      const message = `📊 *ЕЖЕДНЕВНАЯ СВОДКА*\n\n` +
        `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
        `👥 *Всего лидов за день:* ${this.dailyStats.totalLeads}\n\n` +
        `🔥 Горячих лидов: ${this.dailyStats.hotLeads}\n` +
        `⭐ Теплых лидов: ${this.dailyStats.warmLeads}\n` +
        `❄️ Холодных лидов: ${this.dailyStats.coldLeads}\n` +
        `🌱 Для взращивания: ${this.dailyStats.nurtureLeads}\n\n` +
        `💡 *Конверсия в горячие лиды:* ${this.dailyStats.totalLeads > 0 ? Math.round((this.dailyStats.hotLeads / this.dailyStats.totalLeads) * 100) : 0}%\n\n` +
        `📈 Хорошая работа за день!`;

      console.log('📨 Отправляем ежедневную сводку админу...');
      console.log(`   Admin ID: ${this.adminId}`);
      console.log(`   Message length: ${message.length}`);

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📊 Детальная статистика', 'admin_detailed_stats')],
          [Markup.button.callback('📋 Экспорт данных', 'admin_export_data')]
        ])
      });

      console.log('✅ Ежедневная сводка отправлена успешно');

    } catch (error) {
      console.error('❌ Ошибка отправки ежедневной сводки:', error);
      console.error('   Admin ID:', this.adminId);
      console.error('   Message length:', message?.length || 'unknown');
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Обновляет ежедневную статистику
   */
  updateDailyStats(segment) {
    this.dailyStats.totalLeads++;
    
    switch (segment) {
      case 'HOT_LEAD':
        this.dailyStats.hotLeads++;
        break;
      case 'WARM_LEAD':
        this.dailyStats.warmLeads++;
        break;
      case 'COLD_LEAD':
        this.dailyStats.coldLeads++;
        break;
      case 'NURTURE_LEAD':
        this.dailyStats.nurtureLeads++;
        break;
    }
  }

  /**
   * Сбрасывает статистику если новый день
   */
  resetDailyStatsIfNeeded() {
    const today = new Date().toDateString();
    
    if (this.dailyStats.lastReset !== today) {
      this.dailyStats = {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        nurtureLeads: 0,
        lastReset: today
      };
    }
  }

  /**
   * Хранение данных лидов в памяти
   */
  getStoredSegment(userId) {
    if (!this.segmentStorage) this.segmentStorage = {};
    return this.segmentStorage[userId];
  }

  updateStoredSegment(userId, segment) {
    if (!this.segmentStorage) this.segmentStorage = {};
    this.segmentStorage[userId] = segment;
  }

  storeLeadData(userId, leadData) {
    if (!this.leadDataStorage) this.leadDataStorage = {};
    this.leadDataStorage[userId] = {
      ...leadData,
      timestamp: new Date().toISOString()
    };
    
    // Также сохраняем сегмент отдельно для быстрого доступа
    if (leadData.analysisResult?.segment) {
      this.updateStoredSegment(userId, leadData.analysisResult.segment);
    }
  }

  getStoredLeadData(userId) {
    if (!this.leadDataStorage) this.leadDataStorage = {};
    return this.leadDataStorage[userId];
  }

  /**
   * Включает/выключает уведомления
   */
  toggleNotifications(enabled) {
    this.enableNotifications = enabled;
    console.log(`🔔 Уведомления администратора: ${enabled ? 'ВКЛЮЧЕНЫ' : 'ВЫКЛЮЧЕНЫ'}`);
  }

  /**
   * Получение статистики для экспорта
   */
  getStats() {
    return {
      daily_stats: this.dailyStats,
      admin_id: this.adminId,
      notifications_enabled: this.enableNotifications,
      stored_segments_count: Object.keys(this.segmentStorage || {}).length,
      stored_leads_count: Object.keys(this.leadDataStorage || {}).length,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Очистка старых данных
   */
  cleanupOldData(daysToKeep = 7) {
    if (!this.leadDataStorage) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let cleanedCount = 0;
    
    Object.entries(this.leadDataStorage).forEach(([userId, data]) => {
      const dataDate = new Date(data.timestamp);
      if (dataDate < cutoffDate) {
        delete this.leadDataStorage[userId];
        delete this.segmentStorage[userId];
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Очищено ${cleanedCount} старых записей лидов`);
    }
  }
}

module.exports = AdminNotificationSystem;
