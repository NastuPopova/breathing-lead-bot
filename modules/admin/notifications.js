// Файл: modules/admin/notifications.js
// Система уведомлений администратора о новых лидах

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
  }

  /**
   * Отправляет уведомление администратору о новом лиде
   */
  async notifyNewLead(userData) {
    if (!this.adminId || !this.enableNotifications) {
      console.log('⚠️ Уведомления администратора отключены или ADMIN_ID не настроен');
      return;
    }

    try {
      // Сбрасываем статистику если новый день
      this.resetDailyStatsIfNeeded();
      
      // Обновляем статистику
      this.updateDailyStats(userData.analysisResult?.segment);

      // Формируем уведомление
      const message = this.generateLeadNotification(userData);
      const keyboard = this.generateAdminKeyboard(userData);

      // Отправляем уведомление
      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log(`✅ Уведомление о лиде отправлено администратору: ${userData.userInfo?.telegram_id}`);
      
      // Если это горячий лид, отправляем дополнительное срочное уведомление
      if (userData.analysisResult?.segment === 'HOT_LEAD') {
        await this.sendUrgentNotification(userData);
      }

    } catch (error) {
      console.error('❌ Ошибка отправки уведомления администратору:', error);
    }
  }

  /**
   * Отправляет результаты анкетирования администратору
   */
  async notifySurveyResults(userData) {
    if (!this.adminId || !this.enableNotifications) {
      console.log('⚠️ Уведомления администратора отключены или ADMIN_ID не настроен');
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

      // Результаты анкеты
      message += `📝 *Ответы пользователя:*\n`;
      if (isChildFlow) {
        if (surveyAnswers?.child_age_detail mỹ) {
          message += `• Возраст ребенка: ${surveyAnswers.child_age_detail}\n`;
        }
        if (surveyAnswers?.child_problems_detailed) {
          const problems = Array.isArray(surveyAnswers.child_problems_detailed) 
            ? surveyAnswers.child_problems_detailed.join(', ')
            : surveyAnswers.child_problems_detailed;
          message += `• Проблемы: ${problems}\n`;
        }
        if (surveyAnswers?.child_parent_involvement) {
          message += `• Кто занимается: ${surveyAnswers.child_parent_involvement}\n`;
        }
      } else {
        if (surveyAnswers?.age_group) {
          message += `• Возрастная группа: ${surveyAnswers.age_group}\n`;
        }
        if (surveyAnswers?.stress_level) {
          message += `• Уровень стресса: ${surveyAnswers.stress_level}/10\n`;
        }
        if (surveyAnswers?.current_problems) {
          const problems = Array.isArray(surveyAnswers.current_problems) 
            ? surveyAnswers.current_problems.join(', ')
            : surveyAnswers.current_problems;
          message += `• Проблемы: ${problems}\n`;
        }
        if (surveyAnswers?.occupation) {
          message += `• Деятельность: ${surveyAnswers.occupation}\n`;
        }
        if (surveyAnswers?.time_commitment) {
          message += `• Время на практики: ${surveyAnswers.time_commitment}\n`;
        }
      }

      // Результат анализа
      message += `\n📊 *Результат анализа:*\n`;
      message += `• Сегмент: ${analysisResult?.segment || 'Не определен'}\n`;
      message += `• Общий балл: ${analysisResult?.scores?.total || 0}/100\n`;

      // Время
      message += `\n🕐 *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

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

    // Ключевые ответы из анкеты
    message += `📝 *Ключевые ответы:*\n`;
    
    if (isChildFlow) {
      // Детская анкета
      if (surveyAnswers?.child_age_detail) {
        message += `• Возраст ребенка: ${surveyAnswers.child_age_detail}\n`;
      }
      if (surveyAnswers?.child_problems_detailed) {
        const problems = Array.isArray(surveyAnswers.child_problems_detailed) 
          ? surveyAnswers.child_problems_detailed.slice(0, 2).join(', ')
          : surveyAnswers.child_problems_detailed;
        message += `• Проблемы: ${problems}\n`;
      }
      if (surveyAnswers?.child_parent_involvement) {
        message += `• Кто занимается: ${surveyAnswers.child_parent_involvement}\n`;
      }
    } else {
      // Взрослая анкета
      if (surveyAnswers?.stress_level) {
        message += `• Уровень стресса: ${surveyAnswers.stress_level}/10\n`;
      }
      if (surveyAnswers?.current_problems) {
        const problems = Array.isArray(surveyAnswers.current_problems) 
          ? surveyAnswers.current_problems.slice(0, 2).join(', ')
          : surveyAnswers.current_problems;
        message += `• Проблемы: ${problems}\n`;
      }
      if (surveyAnswers?.occupation) {
        message += `• Деятельность: ${surveyAnswers.occupation}\n`;
      }
      if (surveyAnswers?.time_commitment) {
        message += `• Время на практики: ${surveyAnswers.time_commitment}\n`;
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

      await this.bot.telegram.sendMessage(this.adminId, urgentMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔥 Обработать срочно', `admin_urgent_process_${userData.userInfo?.telegram_id}`)],
          [Markup.button.url('💬 Написать сейчас', `https://t.me/${userData.userInfo?.username || 'user'}`)]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка отправки срочного уведомления:', error);
    }
  }

  /**
   * Обрабатывает нажатия на кнопки администратора
   */
  async handleAdminCallback(ctx, action, targetUserId) {
    try {
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

        default:
          await ctx.answerCbQuery('Действие не распознано');
      }

    } catch (error) {
      console.error('❌ Ошибка обработки admin callback:', error);
      await ctx.answerCbQuery('Ошибка выполнения действия');
    }
  }

  /**
   * Отправляет полную информацию об анкете
   */
  async sendFullSurveyData(ctx, targetUserId) {
    try {
      // Здесь можно получить полные данные анкеты из базы данных
      // Пока отправляем заглушку
      const message = `📋 *ПОЛНАЯ АНКЕТА ПОЛЬЗОВАТЕЛЯ*\n\n` +
        `👤 ID: ${targetUserId}\n\n` +
        `📄 Полные данные анкеты доступны в административной панели.\n\n` +
        `🔗 Ссылка на детальный отчет:\n` +
        `${config.MAIN_BOT_API_URL}/admin/leads/${targetUserId}`;

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('❌ Ошибка отправки полной анкеты:', error);
      await ctx.answerCbQuery('Ошибка получения данных');
    }
  }

  /**
   * Отправляет ежедневную сводку администратору
   */
  async sendDailySummary() {
    if (!this.adminId) return;

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

      await this.bot.telegram.sendMessage(this.adminId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📊 Детальная статистика', 'admin_detailed_stats')],
          [Markup.button.callback('📋 Экспорт данных', 'admin_export_data')]
        ])
      });

    } catch (error) {
      console.error('❌ Ошибка отправки ежедневной сводки:', error);
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
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = AdminNotificationSystem;
