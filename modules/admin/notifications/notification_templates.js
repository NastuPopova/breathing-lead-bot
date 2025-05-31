// Файл: modules/admin/notifications/notification_templates.js
// Генерация шаблонов сообщений и клавиатур для уведомлений

const { Markup } = require('telegraf');
const NotificationFormatters = require('./notification_formatters');

class NotificationTemplates {
  constructor() {
    this.formatters = new NotificationFormatters();
    
    // Эмодзи для сегментов
    this.segmentEmojis = {
      'HOT_LEAD': '🔥',
      'WARM_LEAD': '⭐',
      'COLD_LEAD': '❄️',
      'NURTURE_LEAD': '🌱'
    };
  }

  /**
   * Генерирует сообщение-уведомление о новом лиде
   */
  generateLeadNotification(userData, dailyStats) {
    const { userInfo, analysisResult, surveyAnswers, surveyType } = userData;
    const isChildFlow = surveyType === 'child';
    
    // Определяем приоритет
    const segment = analysisResult?.segment || 'UNKNOWN';
    const emoji = this.segmentEmojis[segment] || '❓';
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
      const problemDesc = this.formatters.translateIssue(analysisResult.primaryIssue);
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
    message += this.formatSurveyAnswers(surveyAnswers, isChildFlow);

    // Статистика дня
    message += `\n📈 *Статистика сегодня:*\n`;
    message += `• Всего лидов: ${dailyStats.totalLeads}\n`;
    message += `• 🔥 Горячих: ${dailyStats.hotLeads}\n`;
    message += `• ⭐ Теплых: ${dailyStats.warmLeads}\n`;
    message += `• ❄️ Холодных: ${dailyStats.coldLeads}\n`;

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
   * Генерирует сообщение с результатами анкетирования
   */
  generateSurveyResultsMessage(userData) {
    const { userInfo, surveyAnswers, surveyType, analysisResult } = userData;
    const isChildFlow = surveyType === 'child';

    let message = `📋 *РЕЗУЛЬТАТЫ АНКЕТИРОВАНИЯ*\n\n`;

    // Информация о пользователе
    message += `👤 *Пользователь:*\n`;
    message += `• Имя: ${userInfo?.first_name || 'Неизвестно'}\n`;
    message += `• Username: ${userInfo?.username ? '@' + userInfo.username : 'Не указан'}\n`;
    message += `• Telegram ID: \`${userInfo?.telegram_id}\`\n`;
    message += `• Тип анкеты: ${isChildFlow ? '👶 Детская' : '👨‍💼 Взрослая'}\n\n`;

    // Результаты анкеты
    message += `📝 *Ответы пользователя:*\n`;
    message += this.formatDetailedSurveyAnswers(surveyAnswers, isChildFlow);

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

    return message;
  }

  /**
   * Генерирует клавиатуру для результатов анкетирования
   */
  generateSurveyResultsKeyboard(userData) {
    const userTelegramId = userData.userInfo?.telegram_id;
    const username = userData.userInfo?.username;

    return Markup.inlineKeyboard([
      [Markup.button.url('💬 Написать пользователю', `https://t.me/${username || 'user'}`)],
      [Markup.button.callback('📊 Полная анкета', `admin_full_survey_${userTelegramId}`)]
    ]);
  }

  /**
   * Генерирует срочное уведомление
   */
  generateUrgentNotification(userData, dailyStats) {
    const urgentMessage = `🚨 *СРОЧНЫЙ ГОРЯЧИЙ ЛИД!*\n\n` +
      `👤 ${userData.userInfo?.first_name || 'Пользователь'}\n` +
      `💬 ${userData.userInfo?.username ? '@' + userData.userInfo.username : 'Без username'}\n` +
      `📞 ID: \`${userData.userInfo?.telegram_id}\`\n\n` +
      `⚡ *Требует связи в течение 2 часов!*\n` +
      `🎯 Балл: ${userData.analysisResult?.scores?.total || 0}/100\n\n` +
      `🔔 Уведомление #${dailyStats.hotLeads}`;

    return urgentMessage;
  }

  /**
   * Генерирует клавиатуру для срочного уведомления
   */
  generateUrgentKeyboard(userData) {
    const userTelegramId = userData.userInfo?.telegram_id;
    const username = userData.userInfo?.username;

    return Markup.inlineKeyboard([
      [Markup.button.callback('🔥 Обработать срочно', `admin_urgent_process_${userTelegramId}`)],
      [Markup.button.url('💬 Написать сейчас', `https://t.me/${username || 'user'}`)]
    ]);
  }

  /**
   * Генерирует ежедневную сводку
   */
  generateDailySummary(dailyStats) {
    const today = new Date().toLocaleDateString('ru-RU');
    
    let message = `📊 *ЕЖЕДНЕВНАЯ СВОДКА*\n\n`;
    message += `📅 Дата: ${today}\n\n`;
    
    message += `👥 **Лиды за день:**\n`;
    message += `• Всего: ${dailyStats.totalLeads}\n`;
    message += `• 🔥 Горячие: ${dailyStats.hotLeads}\n`;
    message += `• ⭐ Теплые: ${dailyStats.warmLeads}\n`;
    message += `• ❄️ Холодные: ${dailyStats.coldLeads}\n`;
    message += `• 🌱 Для взращивания: ${dailyStats.nurtureLeads}\n\n`;
    
    const totalLeads = dailyStats.totalLeads;
    const hotLeads = dailyStats.hotLeads;
    const conversion = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0;
    
    message += `📈 **Эффективность:**\n`;
    message += `• Конверсия в горячие: ${conversion}%\n\n`;
    
    message += `🎯 **Следующие действия:**\n`;
    if (hotLeads > 0) {
      message += `• Обработать ${hotLeads} горячих лидов\n`;
    }
    if (totalLeads === 0) {
      message += `• Проанализировать причины отсутствия лидов\n`;
    }
    message += `• Подготовить план на завтра\n\n`;
    
    message += `🕐 Автоматический отчет • ${new Date().toLocaleTimeString('ru-RU')}`;

    return message;
  }

  /**
   * Генерирует клавиатуру для ежедневной сводки
   */
  generateDailySummaryKeyboard() {
    return Markup.inlineKeyboard([
      [{ text: '📊 Подробная статистика', callback_data: 'admin_stats' }],
      [{ text: '🎛️ Админ-панель', callback_data: 'admin_main' }]
    ]);
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Форматирует ответы анкеты для краткого отображения
   */
  formatSurveyAnswers(surveyAnswers, isChildFlow) {
    if (!surveyAnswers) return 'Нет данных\n';

    let formatted = '';
    
    if (isChildFlow) {
      // Детская анкета
      if (surveyAnswers?.child_age_detail) {
        formatted += `• Возраст ребенка: ${this.formatters.translateValue(surveyAnswers.child_age_detail)}\n`;
      }
      if (surveyAnswers?.child_problems_detailed) {
        formatted += `• Проблемы: ${this.formatters.translateArray(surveyAnswers.child_problems_detailed, 2)}\n`;
      }
      if (surveyAnswers?.child_parent_involvement) {
        formatted += `• Кто занимается: ${this.formatters.translateValue(surveyAnswers.child_parent_involvement)}\n`;
      }
    } else {
      // Взрослая анкета
      if (surveyAnswers?.stress_level) {
        formatted += `• Уровень стресса: ${surveyAnswers.stress_level}/10\n`;
      }
      if (surveyAnswers?.current_problems) {
        formatted += `• Проблемы: ${this.formatters.translateArray(surveyAnswers.current_problems, 2)}\n`;
      }
      if (surveyAnswers?.occupation) {
        formatted += `• Деятельность: ${this.formatters.translateValue(surveyAnswers.occupation)}\n`;
      }
      if (surveyAnswers?.time_commitment) {
        formatted += `• Время на практики: ${this.formatters.translateValue(surveyAnswers.time_commitment)}\n`;
      }
    }

    return formatted || 'Нет ключевых данных\n';
  }

  /**
   * Форматирует детальные ответы анкеты
   */
  formatDetailedSurveyAnswers(surveyAnswers, isChildFlow) {
    if (!surveyAnswers) return 'Нет данных\n';

    let formatted = '';
    
    if (isChildFlow) {
      // Детская анкета - полная информация
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
      // Взрослая анкета - полная информация
      const adultFields = [
        'age_group', 'occupation', 'physical_activity', 'stress_level',
        'sleep_quality', 'current_problems', 'priority_problem',
        'breathing_experience', 'time_commitment', 'main_goals'
      ];
      
      adultFields.forEach(field => {
        if (surveyAnswers[field]) {
          const label = this.getFieldLabel(field);
          const value = Array.isArray(surveyAnswers[field]) ? 
            this.formatters.translateArray(surveyAnswers[field]) :
            (typeof surveyAnswers[field] === 'number' ? 
              `${surveyAnswers[field]}/10` : 
              this.formatters.translateValue(surveyAnswers[field]));
          formatted += `• ${label}: ${value}\n`;
        }
      });
    }

    return formatted || 'Нет данных\n';
  }

  /**
   * Получает человекочитаемые названия полей
   */
  getFieldLabel(field) {
    const labels = {
      // Детские поля
      'child_age_detail': 'Возраст ребенка',
      'child_education_status': 'Образование',
      'child_schedule_stress': 'Загруженность',
      'child_problems_detailed': 'Проблемы',
      'child_parent_involvement': 'Кто занимается',
      'child_motivation_approach': 'Мотивация',
      'child_time_availability': 'Время занятий',
      
      // Взрослые поля
      'age_group': 'Возраст',
      'occupation': 'Деятельность',
      'physical_activity': 'Физ.активность',
      'stress_level': 'Уровень стресса',
      'sleep_quality': 'Качество сна',
      'current_problems': 'Текущие проблемы',
      'priority_problem': 'Приоритетная проблема',
      'breathing_experience': 'Опыт с практиками',
      'time_commitment': 'Время на практики',
      'main_goals': 'Основные цели'
    };

    return labels[field] || field;
  }

  /**
   * Информация о компоненте
   */
  getInfo() {
    return {
      name: 'NotificationTemplates',
      version: '1.0.0',
      features: [
        'lead_notifications',
        'survey_results',
        'urgent_notifications',
        'daily_summaries',
        'admin_keyboards'
      ],
      supported_segments: Object.keys(this.segmentEmojis),
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = NotificationTemplates;