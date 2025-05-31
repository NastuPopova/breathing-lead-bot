// Файл: modules/admin/notifications/notification_formatters.js
// Форматирование данных и переводы для уведомлений

const config = require('../../../config');

class NotificationFormatters {
  constructor() {
    // Расширенные переводы для уведомлений
    this.translations = {
      // Основные проблемы взрослых
      'chronic_stress': 'Хронический стресс',
      'insomnia': 'Плохой сон, бессонница',
      'breathing_issues': 'Одышка, нехватка воздуха',
      'high_pressure': 'Повышенное давление',
      'headaches': 'Частые головные боли',
      'fatigue': 'Постоянная усталость',
      'anxiety': 'Тревожность, панические атаки',
      'concentration_issues': 'Проблемы с концентрацией',
      'back_pain': 'Боли в шее, плечах, спине',
      'digestion_issues': 'Проблемы с пищеварением',
      'panic_attacks': 'Панические атаки',
      
      // Детские проблемы
      'tantrums': 'Частые истерики, капризы',
      'sleep_problems': 'Проблемы с засыпанием',
      'nightmares': 'Беспокойный сон, кошмары',
      'hyperactivity': 'Гиперактивность',
      'separation_anxiety': 'Боится разлуки с родителями',
      'social_difficulties': 'Сложности в общении',
      'aggression': 'Агрессивное поведение',
      'weak_immunity': 'Частые простуды',
      'prevention': 'В целом здоров, профилактика',
      
      // Возрастные группы
      '18-30': '18-30 лет',
      '31-45': '31-45 лет',
      '46-60': '46-60 лет',
      '60+': '60+ лет',
      'for_child': 'Для ребенка',
      '3-4': '3-4 года',
      '5-6': '5-6 лет',
      '7-8': '7-8 лет',
      '9-10': '9-10 лет',
      '11-12': '11-12 лет',
      '13-15': '13-15 лет',
      '16-17': '16-17 лет',
      
      // Деятельность
      'office_work': 'Офисная работа',
      'home_work': 'Работа дома/фриланс',
      'physical_work': 'Физический труд',
      'student': 'Учеба',
      'maternity_leave': 'Декретный отпуск',
      'retired': 'Пенсия',
      'management': 'Руководящая должность',
      
      // Физическая активность
      'daily': 'Ежедневно',
      'regular': '3-4 раза в неделю',
      'sometimes': '1-2 раза в неделю',
      'rarely': 'Несколько раз в месяц',
      'never': 'Практически не занимаюсь',
      
      // Опыт с дыхательными практиками
      'never': 'Никогда не пробовал(а)',
      'few_times': 'Пробовал(а) пару раз',
      'theory_only': 'Изучал(а) теорию',
      'sometimes': 'Иногда практикую',
      'regularly': 'Практикую регулярно',
      'expert': 'Опытный практик',
      
      // Время на практики
      '3-5_minutes': '3-5 минут',
      '10-15_minutes': '10-15 минут',
      '20-30_minutes': '20-30 минут',
      '30+_minutes': '30+ минут',
      
      // Основные цели
      'quick_relaxation': 'Быстро расслабляться',
      'stress_resistance': 'Повысить стрессоустойчивость',
      'reduce_anxiety': 'Избавиться от тревожности',
      'improve_sleep': 'Наладить сон',
      'increase_energy': 'Повысить энергию',
      'normalize_pressure': 'Нормализовать давление',
      'improve_breathing': 'Улучшить дыхание',
      'improve_focus': 'Улучшить концентрацию',
      'weight_management': 'Поддержать похудение',
      'general_health': 'Общее оздоровление',
      
      // Детское образование
      'home_only': 'Дома',
      'private_kindergarten': 'Частный детский сад',
      'public_kindergarten': 'Государственный детский сад',
      'private_school': 'Частная школа',
      'public_school': 'Государственная школа',
      'gymnasium': 'Гимназия/лицей',
      'homeschooling': 'Семейное обучение',
      'alternative_school': 'Альтернативная школа',
      
      // Загруженность ребенка
      'relaxed': 'Свободное расписание',
      'moderate': 'Учеба + 1-2 секции',
      'busy': 'Учеба + 3-4 занятия',
      'overloaded': 'Очень загружен',
      'intensive': 'Интенсивная подготовка',
      
      // Участие родителей
      'mother': 'Только мама',
      'father': 'Только папа',
      'both_parents': 'Оба родителя',
      'grandparent': 'Бабушка/дедушка',
      'child_independent': 'Ребенок самостоятельно',
      'group_sessions': 'Групповые занятия',
      
      // Мотивация ребенка
      'games_stories': 'Игровая форма, сказки',
      'reward_system': 'Система наград',
      'family_activities': 'Совместные занятия',
      'digital_interactive': 'Интерактивные приложения',
      'creative_tasks': 'Творческие задания',
      'adult_explanation': 'Объяснение пользы',
      'peer_group': 'Занятия в группе',
      
      // Время занятий с ребенком
      'morning_routine': 'Утром перед садом/школой',
      'after_school': 'После садика/школы',
      'afternoon': 'После обеда/полдника',
      'before_sleep': 'Вечером перед сном',
      'during_homework': 'Во время домашних заданий',
      'stress_situations': 'В моменты стресса/капризов',
      'weekends': 'В выходные дни',
      
      // Сегменты
      'HOT_LEAD': 'требует срочного внимания',
      'WARM_LEAD': 'активно мотивирован к изменениям',
      'COLD_LEAD': 'умеренный интерес к практикам',
      'NURTURE_LEAD': 'долгосрочное развитие'
    };
  }

  /**
   * Переводит одно значение в читаемый текст
   */
  translateValue(value) {
    if (!value) return 'Не указано';
    return this.translations[value] || config.TRANSLATIONS?.[value] || value;
  }

  /**
   * Переводит массив значений в человекочитаемый текст
   */
  translateArray(values, maxItems = 3) {
    if (!values || !Array.isArray(values)) return 'Не указано';
    
    const translated = values.slice(0, maxItems).map(value => {
      return this.translateValue(value);
    });
    
    const result = translated.join(', ');
    if (values.length > maxItems) {
      return `${result} и еще ${values.length - maxItems}`;
    }
    return result;
  }

  /**
   * Переводит проблему/issue
   */
  translateIssue(issue) {
    if (!issue) return 'Не указано';
    return this.translateValue(issue);
  }

  /**
   * Переводит возрастную группу
   */
  translateAge(age) {
    if (!age) return 'Не указан';
    return this.translateValue(age);
  }

  /**
   * Переводит сегмент лида
   */
  translateSegment(segment) {
    if (!segment) return 'Неизвестен';
    return this.translateValue(segment);
  }

  /**
   * Форматирует время "X назад"
   */
  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Неизвестно';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} нед назад`;
    
    return `${Math.floor(diffWeeks / 4)} мес назад`;
  }

  /**
   * Форматирует время работы системы
   */
  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}д ${remainingHours}ч ${minutes}м`;
    }
    
    return `${hours}ч ${minutes}м ${secs}с`;
  }

  /**
   * Форматирует дату и время для уведомлений
   */
  formatDateTime(date, timezone = 'Europe/Moscow') {
    if (!date) return 'Неизвестно';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleString('ru-RU', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Форматирует только время
   */
  formatTime(date, timezone = 'Europe/Moscow') {
    if (!date) return 'Неизвестно';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleTimeString('ru-RU', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Форматирует только дату
   */
  formatDate(date, timezone = 'Europe/Moscow') {
    if (!date) return 'Неизвестно';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleDateString('ru-RU', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Форматирует количество с правильным склонением
   */
  formatCount(count, singular, plural2to4, plural5plus) {
    if (count === 1) return `${count} ${singular}`;
    if (count >= 2 && count <= 4) return `${count} ${plural2to4}`;
    return `${count} ${plural5plus}`;
  }

  /**
   * Форматирует процент
   */
  formatPercent(value, total, decimals = 1) {
    if (!total || total === 0) return '0%';
    const percent = (value / total * 100).toFixed(decimals);
    return `${percent}%`;
  }

  /**
   * Форматирует балл VERSE с описанием
   */
  formatScore(score) {
    if (typeof score !== 'number') return 'Не определен';
    
    let description = '';
    if (score >= 80) description = ' (очень высокий)';
    else if (score >= 60) description = ' (высокий)';
    else if (score >= 40) description = ' (средний)';
    else description = ' (низкий)';
    
    return `${score}/100${description}`;
  }

  /**
   * Форматирует уровень стресса с эмодзи
   */
  formatStressLevel(level) {
    if (typeof level !== 'number') return 'Не указан';
    
    let emoji = '';
    if (level >= 8) emoji = ' 🔴';
    else if (level >= 6) emoji = ' 🟠';
    else if (level >= 4) emoji = ' 🟡';
    else emoji = ' 🟢';
    
    return `${level}/10${emoji}`;
  }

  /**
   * Форматирует качество сна с эмодзи
   */
  formatSleepQuality(quality) {
    if (typeof quality !== 'number') return 'Не указано';
    
    let emoji = '';
    if (quality >= 8) emoji = ' 😴';
    else if (quality >= 6) emoji = ' 😊';
    else if (quality >= 4) emoji = ' 😐';
    else emoji = ' 😪';
    
    return `${quality}/10${emoji}`;
  }

  /**
   * Получает эмодзи для сегмента
   */
  getSegmentEmoji(segment) {
    const emojis = {
      'HOT_LEAD': '🔥',
      'WARM_LEAD': '⭐',
      'COLD_LEAD': '❄️',
      'NURTURE_LEAD': '🌱'
    };
    return emojis[segment] || '❓';
  }

  /**
   * Получает эмодзи для возраста
   */
  getAgeEmoji(age) {
    if (!age) return '👤';
    
    if (age.includes('child') || age.includes('3-') || age.includes('5-') || age.includes('7-')) {
      return '👶';
    }
    if (age.includes('13-') || age.includes('16-')) {
      return '👨‍🎓';
    }
    if (age.includes('18-') || age.includes('31-')) {
      return '👨‍💼';
    }
    if (age.includes('46-') || age.includes('60+')) {
      return '👨‍🦳';
    }
    
    return '👤';
  }

  /**
   * Получает эмодзи для проблемы
   */
  getProblemEmoji(problem) {
    const emojis = {
      'chronic_stress': '😰',
      'anxiety': '😨',
      'insomnia': '😴',
      'breathing_issues': '🫁',
      'high_pressure': '💔',
      'fatigue': '😵',
      'hyperactivity': '⚡',
      'sleep_problems': '🌙',
      'tantrums': '😭'
    };
    return emojis[problem] || '⚠️';
  }

  /**
   * Экранирует специальные символы для Markdown
   */
  escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/[*_`\[\]()~>#+\-=|{}.!]/g, '\\$&');
  }

  /**
   * Обрезает текст до указанной длины
   */
  truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Форматирует список проблем с эмодзи
   */
  formatProblemsList(problems) {
    if (!problems || !Array.isArray(problems)) return 'Не указаны';
    
    return problems.map(problem => {
      const emoji = this.getProblemEmoji(problem);
      const text = this.translateValue(problem);
      return `${emoji} ${text}`;
    }).join('\n• ');
  }

  /**
   * Информация о компоненте
   */
  getInfo() {
    return {
      name: 'NotificationFormatters',
      version: '1.0.0',
      features: [
        'value_translation',
        'array_translation',
        'time_formatting',
        'score_formatting',
        'markdown_escaping',
        'emoji_support'
      ],
      translations_count: Object.keys(this.translations).length,
      supported_locales: ['ru-RU'],
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = NotificationFormatters;