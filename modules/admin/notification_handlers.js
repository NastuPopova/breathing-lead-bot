// Файл: modules/admin/notifications/notification_handlers.js
// Обработчики callback'ов для уведомлений администратора

const { Markup } = require('telegraf');
const NotificationFormatters = require('./notification_formatters');

class NotificationHandlers {
  constructor(notificationSystem) {
    this.notificationSystem = notificationSystem;
    this.formatters = new NotificationFormatters();
    
    // Статистика обработки callback'ов
    this.callbackStats = {
      totalHandled: 0,
      byAction: {},
      lastCallback: null,
      errors: 0
    };
  }

  /**
   * Основной обработчик всех admin callback'ов от уведомлений
   */
  async handleCallback(ctx, action, targetUserId) {
    try {
      this.trackCallback(action);
      
      console.log(`🔍 Notification callback: ${action} для пользователя ${targetUserId}`);
      
      // Маршрутизация по типам действий
      switch (action) {
        case 'urgent_call':
          return await this.handleUrgentCall(ctx, targetUserId);
        case 'book_consultation':
          return await this.handleBookConsultation(ctx, targetUserId);
        case 'call':
          return await this.handleCall(ctx, targetUserId);
        case 'send_materials':
          return await this.handleSendMaterials(ctx, targetUserId);
        case 'add_newsletter':
          return await this.handleAddNewsletter(ctx, targetUserId);
        case 'mark_processed':
          return await this.handleMarkProcessed(ctx, targetUserId);
        case 'full_survey':
          return await this.handleFullSurvey(ctx, targetUserId);
        case 'urgent_process':
          return await this.handleUrgentProcess(ctx, targetUserId);
        case 'change_segment':
          return await this.handleChangeSegment(ctx, targetUserId);
        default:
          if (action.startsWith('set_segment_')) {
            return await this.handleSetSegment(ctx, action, targetUserId);
          } else if (action.startsWith('back_to_lead_')) {
            return await this.handleBackToLead(ctx, targetUserId);
          } else {
            console.warn('⚠️ Неизвестное действие notification callback:', action);
            await ctx.answerCbQuery('Действие не распознано');
          }
      }
    } catch (error) {
      console.error('❌ Ошибка обработки notification callback:', error);
      this.callbackStats.errors++;
      throw error;
    }
  }

  // ===== ОБРАБОТЧИКИ ДЕЙСТВИЙ С ЛИДАМИ =====

  /**
   * Срочный звонок горячему лиду
   */
  async handleUrgentCall(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      const userName = leadData?.userInfo?.first_name || 'Неизвестно';
      
      const message = `🔥 *СРОЧНЫЙ ЗВОНОК ЗАПЛАНИРОВАН*\n\n` +
        `👤 Пользователь: ${userName}\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `⏰ Время: ${this.formatters.formatDateTime(new Date())}\n\n` +
        `✅ Статус изменен на "Экстренная обработка"\n\n` +
        `📞 *Следующие шаги:*\n` +
        `• Связаться в течение 2 часов\n` +
        `• Предложить экстренную консультацию\n` +
        `• Подготовить индивидуальное предложение`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📞 Связался', callback_data: `admin_mark_contacted_${targetUserId}` }],
            [{ text: '📊 Полная анкета', callback_data: `admin_full_survey_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      console.log(`🔥 Срочный звонок запланирован для лида ${targetUserId}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleUrgentCall:', error);
      await ctx.editMessageText(
        `❌ *Ошибка обработки*\n\nПользователь: ${targetUserId}\nОбратитесь к разработчику.`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Запись на консультацию
   */
  async handleBookConsultation(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      const userName = leadData?.userInfo?.first_name || 'Неизвестно';
      const userUsername = leadData?.userInfo?.username;
      
      const message = `📅 *КОНСУЛЬТАЦИЯ ЗАПЛАНИРОВАНА*\n\n` +
        `👤 Пользователь: ${userName}\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `💬 Username: ${userUsername ? `@${userUsername}` : 'Не указан'}\n` +
        `📋 Добавлен в календарь консультаций\n\n` +
        `✅ *Следующий шаг:* Связаться для подтверждения времени\n\n` +
        `💡 *Рекомендации для консультации:*\n` +
        `• Индивидуальная диагностика дыхания\n` +
        `• Персональная программа на 30 дней\n` +
        `• Обучение эффективным техникам`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📞 Связался', callback_data: `admin_mark_contacted_${targetUserId}` }],
            [{ text: '📊 Полная анкета', callback_data: `admin_full_survey_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      console.log(`📅 Консультация запланирована для лида ${targetUserId}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleBookConsultation:', error);
      await this.showErrorMessage(ctx, 'Ошибка планирования консультации', targetUserId);
    }
  }

  /**
   * Обычный звонок
   */
  async handleCall(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      const userName = leadData?.userInfo?.first_name || 'Неизвестно';
      
      const message = `📞 *ЗВОНОК ЗАПЛАНИРОВАН*\n\n` +
        `👤 Пользователь: ${userName}\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `⏰ Позвонить в течение 24 часов\n\n` +
        `✅ Статус: В работе\n\n` +
        `💡 *План звонка:*\n` +
        `• Обсудить результаты диагностики\n` +
        `• Предложить подходящую программу\n` +
        `• Ответить на вопросы`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📞 Связался', callback_data: `admin_mark_contacted_${targetUserId}` }],
            [{ text: '📊 Полная анкета', callback_data: `admin_full_survey_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      console.log(`📞 Звонок запланирован для лида ${targetUserId}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleCall:', error);
      await this.showErrorMessage(ctx, 'Ошибка планирования звонка', targetUserId);
    }
  }

  /**
   * Отправка материалов
   */
  async handleSendMaterials(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      const userName = leadData?.userInfo?.first_name || 'Неизвестно';
      const isChildFlow = leadData?.surveyType === 'child';
      
      const message = `📧 *МАТЕРИАЛЫ ОТПРАВЛЕНЫ*\n\n` +
        `👤 Пользователь: ${userName}\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `📦 Тип: ${isChildFlow ? 'Детские материалы' : 'Взрослые материалы'}\n\n` +
        `✅ *Отправлено:*\n` +
        `• Персональный дыхательный гид\n` +
        `• Дополнительные PDF материалы\n` +
        `• Ссылка на полезные ресурсы\n\n` +
        `📈 Добавлен в теплую базу для дальнейшей работы`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📧 Отправил еще', callback_data: `admin_send_more_${targetUserId}` }],
            [{ text: '📞 Позвонить', callback_data: `admin_call_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      console.log(`📧 Материалы отправлены лиду ${targetUserId}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleSendMaterials:', error);
      await this.showErrorMessage(ctx, 'Ошибка отправки материалов', targetUserId);
    }
  }

  /**
   * Добавление в рассылку
   */
  async handleAddNewsletter(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      const userName = leadData?.userInfo?.first_name || 'Неизвестно';
      
      const message = `📧 *ДОБАВЛЕН В РАССЫЛКУ*\n\n` +
        `👤 Пользователь: ${userName}\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `📮 Будет получать еженедельные материалы\n\n` +
        `✅ Сегмент: Долгосрочное взращивание\n\n` +
        `📬 *План рассылки:*\n` +
        `• Еженедельные дыхательные техники\n` +
        `• Полезные статьи и советы\n` +
        `• Приглашения на бесплатные вебинары`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📧 Отправить материалы', callback_data: `admin_send_materials_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      console.log(`📧 Лид ${targetUserId} добавлен в рассылку`);
      
    } catch (error) {
      console.error('❌ Ошибка handleAddNewsletter:', error);
      await this.showErrorMessage(ctx, 'Ошибка добавления в рассылку', targetUserId);
    }
  }

  /**
   * Отметка как обработанный
   */
  async handleMarkProcessed(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      const userName = leadData?.userInfo?.first_name || 'Неизвестно';
      const segment = leadData?.analysisResult?.segment || 'UNKNOWN';
      
      const message = `✅ *ЛИД ОБРАБОТАН*\n\n` +
        `👤 Пользователь: ${userName}\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `📊 Сегмент: ${this.formatters.getSegmentEmoji(segment)} ${segment}\n` +
        `🕐 Обработан: ${this.formatters.formatDateTime(new Date())}\n\n` +
        `📊 Статус: Закрыт\n\n` +
        `📈 *Итоги работы с лидом:*\n` +
        `• Диагностика проведена\n` +
        `• Контакт установлен\n` +
        `• Рекомендации даны`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Возобновить работу', callback_data: `admin_reopen_${targetUserId}` }],
            [{ text: '📊 Архив', callback_data: `admin_archive_${targetUserId}` }]
          ]
        }
      });

      // Обновляем данные лида
      if (leadData) {
        leadData.processed = true;
        leadData.processedAt = new Date().toISOString();
        this.notificationSystem.storeLeadData(targetUserId, leadData);
      }

      console.log(`✅ Лид ${targetUserId} отмечен как обработанный`);
      
    } catch (error) {
      console.error('❌ Ошибка handleMarkProcessed:', error);
      await this.showErrorMessage(ctx, 'Ошибка отметки обработки', targetUserId);
    }
  }

  // ===== ОБРАБОТЧИКИ ИНФОРМАЦИИ О ЛИДАХ =====

  /**
   * Показ полной анкеты пользователя
   */
  async handleFullSurvey(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      
      if (!leadData) {
        await ctx.reply(
          `📋 *ПОЛНАЯ АНКЕТА ПОЛЬЗОВАТЕЛЯ*\n\n` +
          `👤 *ID:* ${targetUserId}\n\n` +
          `⚠️ *Данные анкеты не найдены.*\n` +
          `Возможно, информация была очищена или пользователь не завершил анкету.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад к лиду', callback_data: `admin_back_to_lead_${targetUserId}` }]
              ]
            }
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
      message += `• Сегмент: ${this.formatters.getSegmentEmoji(analysisResult?.segment)} ${analysisResult?.segment || 'Не определен'}\n`;
      message += `• Общий балл: ${this.formatters.formatScore(analysisResult?.scores?.total)}\n`;
      if (analysisResult?.scores) {
        message += `• Срочность: ${analysisResult.scores.urgency}/100\n`;
        message += `• Готовность: ${analysisResult.scores.readiness}/100\n`;
        message += `• Соответствие: ${analysisResult.scores.fit}/100\n`;
      }
      message += `• Основная проблема: ${this.formatters.translateIssue(analysisResult?.primaryIssue)}\n\n`;

      message += `📝 *Детальные ответы:*\n`;
      message += this.formatDetailedAnswers(surveyAnswers, isChildFlow);

      message += `\n🕐 *Дата анкетирования:* ${this.formatters.formatDateTime(leadData.timestamp)}`;

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад к лиду', callback_data: `admin_back_to_lead_${targetUserId}` }],
            [{ text: '💬 Написать пользователю', url: `https://t.me/${userInfo?.username || 'user'}` }]
          ]
        }
      });

      console.log(`📋 Показана полная анкета для лида ${targetUserId}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleFullSurvey:', error);
      await this.showErrorMessage(ctx, 'Ошибка получения анкеты', targetUserId);
    }
  }

  // ===== УПРАВЛЕНИЕ СЕГМЕНТАМИ =====

  /**
   * Изменение сегмента лида
   */
  async handleChangeSegment(ctx, targetUserId) {
    try {
      const currentSegment = this.notificationSystem.getStoredSegment(targetUserId) || 'UNKNOWN';
      const currentSegmentName = this.formatters.translateSegment(currentSegment);

      const message = `🔄 *ИЗМЕНИТЬ СЕГМЕНТ*\n\n` +
        `👤 *Пользователь:* ${targetUserId}\n` +
        `📊 *Текущий сегмент:* ${this.formatters.getSegmentEmoji(currentSegment)} ${currentSegmentName}\n\n` +
        `Выберите новый сегмент:`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔥 Горячий (срочно)', callback_data: `admin_set_segment_HOT_LEAD_${targetUserId}` },
              { text: '⭐ Теплый (24ч)', callback_data: `admin_set_segment_WARM_LEAD_${targetUserId}` }
            ],
            [
              { text: '❄️ Холодный (плановый)', callback_data: `admin_set_segment_COLD_LEAD_${targetUserId}` },
              { text: '🌱 Взращивание', callback_data: `admin_set_segment_NURTURE_LEAD_${targetUserId}` }
            ],
            [
              { text: '❌ Отмена', callback_data: `admin_back_to_lead_${targetUserId}` }
            ]
          ]
        }
      });

      console.log(`🔄 Показано меню изменения сегмента для лида ${targetUserId}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleChangeSegment:', error);
      await this.showErrorMessage(ctx, 'Ошибка показа меню сегментов', targetUserId);
    }
  }

  /**
   * Установка нового сегмента
   */
  async handleSetSegment(ctx, action, targetUserId) {
    try {
      const newSegment = action.replace('set_segment_', '').replace(`_${targetUserId}`, '');
      const oldSegment = this.notificationSystem.getStoredSegment(targetUserId) || 'UNKNOWN';

      // Сохраняем новый сегмент
      this.notificationSystem.updateStoredSegment(targetUserId, newSegment);

      const oldSegmentName = this.formatters.translateSegment(oldSegment);
      const newSegmentName = this.formatters.translateSegment(newSegment);

      const message = `✅ *СЕГМЕНТ ОБНОВЛЕН*\n\n` +
        `👤 *Пользователь:* ${targetUserId}\n` +
        `🔄 *Изменение:* ${this.formatters.getSegmentEmoji(oldSegment)} ${oldSegmentName} → ${this.formatters.getSegmentEmoji(newSegment)} ${newSegmentName}\n` +
        `⏰ *Время:* ${this.formatters.formatDateTime(new Date())}\n\n` +
        `${this.getSegmentActionRecommendation(newSegment)}`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📞 Связаться', callback_data: `admin_call_${targetUserId}` }],
            [{ text: '📊 Полная анкета', callback_data: `admin_full_survey_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      // Логируем изменение
      this.logSegmentChange(targetUserId, oldSegment, newSegment, ctx.from);

      console.log(`✅ Сегмент изменен: ${targetUserId} ${oldSegment} → ${newSegment}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleSetSegment:', error);
      await this.showErrorMessage(ctx, 'Ошибка изменения сегмента', targetUserId);
    }
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Возврат к информации о лиде
   */
  async handleBackToLead(ctx, targetUserId) {
    try {
      const segment = this.notificationSystem.getStoredSegment(targetUserId) || 'UNKNOWN';
      const segmentName = this.formatters.translateSegment(segment);
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);

      let message = `👤 *ИНФОРМАЦИЯ О ЛИДЕ*\n\n`;
      message += `🆔 *ID:* ${targetUserId}\n`;
      message += `📊 *Сегмент:* ${this.formatters.getSegmentEmoji(segment)} ${segmentName}\n`;
      
      if (leadData?.userInfo?.first_name) {
        message += `👤 *Имя:* ${leadData.userInfo.first_name}\n`;
      }
      if (leadData?.userInfo?.username) {
        message += `💬 *Username:* @${leadData.userInfo.username}\n`;
      }
      
      message += `⏰ *Обновлено:* ${this.formatters.formatDateTime(new Date())}\n\n`;
      message += `Выберите действие:`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Изменить сегмент', callback_data: `admin_change_segment_${targetUserId}` }],
            [{ text: '📞 Связаться', callback_data: `admin_call_${targetUserId}` }],
            [{ text: '📊 Полная анкета', callback_data: `admin_full_survey_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      console.log(`🔙 Возврат к информации о лиде ${targetUserId}`);
      
    } catch (error) {
      console.error('❌ Ошибка handleBackToLead:', error);
      await this.showErrorMessage(ctx, 'Ошибка возврата к лиду', targetUserId);
    }
  }

  /**
   * Показ сообщения об ошибке
   */
  async showErrorMessage(ctx, errorText, targetUserId = null) {
    try {
      const message = `❌ *${errorText}*\n\n` +
        (targetUserId ? `👤 Пользователь: ${targetUserId}\n` : '') +
        `🕐 Время: ${this.formatters.formatDateTime(new Date())}\n\n` +
        `💡 Попробуйте еще раз или обратитесь к разработчику.`;

      const keyboard = [];
      if (targetUserId) {
        keyboard.push([{ text: '🔄 Попробовать снова', callback_data: `admin_back_to_lead_${targetUserId}` }]);
      }
      keyboard.push([{ text: '🎛️ Админ-панель', callback_data: 'admin_main' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('❌ Ошибка показа сообщения об ошибке:', error);
      await ctx.reply(`❌ ${errorText}`);
    }
  }

  /**
   * Форматирует детальные ответы анкеты
   */
  formatDetailedAnswers(surveyAnswers, isChildFlow) {
    if (!surveyAnswers) return 'Нет данных';

    let formatted = '';
    
    if (isChildFlow) {
      // Детская анкета
      const childFields = [
        'child_age_detail', 'child_education_status', 'child_schedule_stress',
        'child_problems_detailed', 'child_parent_involvement', 
        'child_motivation_approach', 'child_time_availability'
      ];
      
      childFields.forEach(field => {
        if (surveyAnswers[field]) {
          const label = this.getFieldLabel(field);
          const value = Array.isArray(surveyAnswers[field]) ? 
            this.formatters.translateArray(surveyAnswers[field]) :
            this.formatters.translateValue(surveyAnswers[field]);
          formatted += `• ${label}: ${value}\n`;
        }
      });
    } else {
      // Взрослая анкета
      const adultFields = [
        'age_group', 'occupation', 'stress_level', 'sleep_quality',
        'current_problems', 'breathing_experience', 'time_commitment', 'main_goals'
      ];
      
      adultFields.forEach(field => {
        if (surveyAnswers[field] !== undefined) {
          const label = this.getFieldLabel(field);
          let value;
          
          if (Array.isArray(surveyAnswers[field])) {
            value = this.formatters.translateArray(surveyAnswers[field]);
          } else if (field === 'stress_level') {
            value = this.formatters.formatStressLevel(surveyAnswers[field]);
          } else if (field === 'sleep_quality') {
            value = this.formatters.formatSleepQuality(surveyAnswers[field]);
          } else {
            value = this.formatters.translateValue(surveyAnswers[field]);
          }
          
          formatted += `• ${label}: ${value}\n`;
        }
      });
    }

    return formatted || 'Нет данных';
  }

 
   /**
   * Получает названия полей
   */
  getFieldLabel(field) {
    const labels = {
      // Детские поля
      'child_age_detail': 'Возраст',
      'child_education_status': 'Образование',
      'child_schedule_stress': 'Загруженность',
      'child_problems_detailed': 'Проблемы',
      'child_parent_involvement': 'Кто занимается',
      'child_motivation_approach': 'Мотивация',
      'child_time_availability': 'Время занятий',
      
      // Взрослые поля
      'age_group': 'Возраст',
      'occupation': 'Деятельность',
      'stress_level': 'Уровень стресса',
      'sleep_quality': 'Качество сна',
      'current_problems': 'Проблемы',
      'breathing_experience': 'Опыт',
      'time_commitment': 'Время на практики',
      'main_goals': 'Цели'
    };

    return labels[field] || field;
  }

  /**
   * Получает рекомендации по действиям для сегмента
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
   * Логирование изменений сегмента
   */
  logSegmentChange(userId, oldSegment, newSegment, admin) {
    const logEntry = {
      event: 'segment_changed_via_notification',
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

    console.log('📝 ИЗМЕНЕНИЕ СЕГМЕНТА (NOTIFICATION):', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Трекинг использования callback'ов
   */
  trackCallback(action) {
    this.callbackStats.totalHandled++;
    this.callbackStats.lastCallback = {
      action: action,
      timestamp: new Date().toISOString()
    };
    
    if (!this.callbackStats.byAction[action]) {
      this.callbackStats.byAction[action] = 0;
    }
    this.callbackStats.byAction[action]++;
    
    console.log(`📊 Notification callback tracked: ${action} (total: ${this.callbackStats.totalHandled})`);
  }

  /**
   * Обработка срочного процесса
   */
  async handleUrgentProcess(ctx, targetUserId) {
    try {
      const leadData = this.notificationSystem.getStoredLeadData(targetUserId);
      const userName = leadData?.userInfo?.first_name || 'Неизвестно';
      
      await ctx.answerCbQuery('🔥 Лид взят в срочную обработку');
      
      const message = `🔥 *В СРОЧНОЙ ОБРАБОТКЕ*\n\n` +
        `👤 Пользователь: ${userName}\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `⏰ Взято в работу: ${this.formatters.formatDateTime(new Date())}\n\n` +
        `✅ Приоритет: МАКСИМАЛЬНЫЙ\n\n` +
        `⚡ *Экстренные действия:*\n` +
        `• Связаться немедленно\n` +
        `• Предложить срочную помощь\n` +
        `• Подготовить экстренные техники`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📞 Связался', callback_data: `admin_mark_contacted_${targetUserId}` }],
            [{ text: '📊 Полная анкета', callback_data: `admin_full_survey_${targetUserId}` }],
            [{ text: '✅ Обработано', callback_data: `admin_mark_processed_${targetUserId}` }]
          ]
        }
      });

      // Обновляем данные лида
      if (leadData) {
        leadData.urgentProcessing = true;
        leadData.urgentProcessingAt = new Date().toISOString();
        this.notificationSystem.storeLeadData(targetUserId, leadData);
      }

      console.log(`🔥 Лид ${targetUserId} взят в срочную обработку`);
      
    } catch (error) {
      console.error('❌ Ошибка handleUrgentProcess:', error);
      await this.showErrorMessage(ctx, 'Ошибка срочной обработки', targetUserId);
    }
  }

  /**
   * Получение статистики обработчика
   */
  getStats() {
    return {
      total_callbacks: this.callbackStats.totalHandled,
      callbacks_by_action: this.callbackStats.byAction,
      last_callback: this.callbackStats.lastCallback,
      errors: this.callbackStats.errors,
      success_rate: this.callbackStats.totalHandled > 0 ? 
        ((this.callbackStats.totalHandled - this.callbackStats.errors) / this.callbackStats.totalHandled * 100).toFixed(2) + '%' : 
        '100%',
      most_used_actions: this.getMostUsedActions(),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Получает наиболее используемые действия
   */
  getMostUsedActions() {
    return Object.entries(this.callbackStats.byAction)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
  }

  /**
   * Информация о компоненте
   */
  getInfo() {
    return {
      name: 'NotificationHandlers',
      version: '1.0.0',
      features: [
        'lead_action_handling',
        'segment_management',
        'survey_display',
        'urgent_processing',
        'callback_tracking',
        'error_handling'
      ],
      supported_actions: [
        'urgent_call', 'book_consultation', 'call', 'send_materials',
        'add_newsletter', 'mark_processed', 'full_survey', 'urgent_process',
        'change_segment', 'set_segment', 'back_to_lead'
      ],
      stats: this.getStats(),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    console.log('🧹 Очистка NotificationHandlers...');
    console.log('📊 Финальная статистика callback\'ов:', JSON.stringify(this.getStats(), null, 2));
    
    // Сброс статистики
    this.callbackStats = {
      totalHandled: 0,
      byAction: {},
      lastCallback: null,
      errors: 0
    };
    
    console.log('✅ NotificationHandlers очищен');
  }
}

module.exports = NotificationHandlers;