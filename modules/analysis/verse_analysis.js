// Файл: lead_bot/modules/analysis/verse_analysis.js
// Система VERSE-анализа для персонализации рекомендаций дыхательных практик

class BreathingVERSEAnalysis {
  constructor() {
    this.segmentWeights = {
      urgency: 0.4,    // 40% - насколько срочно нужна помощь
      readiness: 0.35, // 35% - готовность к практикам  
      fit: 0.25        // 25% - подходит ли наша программа
    };
  }

  /**
   * Главный метод анализа пользователя
   * @param {Object} surveyData - данные анкеты
   * @returns {Object} - полный анализ с рекомендациями
   */
  analyzeUser(surveyData) {
    console.log('🧠 Начинаем VERSE-анализ пользователя...');
    
    // 1. Вычисляем компоненты скоринга
    const urgencyScore = this.calculateUrgencyScore(surveyData);
    const readinessScore = this.calculateReadinessScore(surveyData);
    const fitScore = this.calculateFitScore(surveyData);
    
    // 2. Определяем сегмент
    const totalScore = this.calculateTotalScore(urgencyScore, readinessScore, fitScore);
    const segment = this.determineSegment(totalScore);
    
    // 3. Выявляем основную проблему
    const primaryIssue = this.identifyPrimaryIssue(surveyData);
    
    // 4. Генерируем персональные рекомендации
    const recommendations = this.generatePersonalizedRecommendations(
      primaryIssue, 
      segment, 
      surveyData
    );
    
    // 5. Создаем персональное сообщение
    const personalMessage = this.generatePersonalMessage(
      primaryIssue,
      segment,
      surveyData,
      recommendations
    );

    return {
      scores: {
        urgency: urgencyScore,
        readiness: readinessScore,
        fit: fitScore,
        total: totalScore
      },
      segment,
      primaryIssue,
      recommendations,
      personalMessage,
      profile: this.generateUserProfile(surveyData, segment, primaryIssue)
    };
  }

  /**
   * Расчет срочности помощи (0-100)
   */
  calculateUrgencyScore(data) {
    let urgencyScore = 0;
    
    // Возрастной фактор (молодые люди часто игнорируют проблемы)
    const ageMultiplier = {
      '18-30': 0.8,
      '31-45': 1.0,
      '46-60': 1.2,
      '60+': 1.3
    };
    
    // Базовый скор от уровня стресса (0-40 баллов)
    urgencyScore += (data.stress_level || 0) * 4;
    
    // Критические проблемы (+15 баллов за каждую)
    const criticalIssues = [
      'panic_attacks', 'severe_breathing_issues', 
      'chronic_insomnia', 'high_pressure',
      'chronic_stress', 'anxiety'
    ];
    
    if (data.current_problems) {
      criticalIssues.forEach(issue => {
        if (data.current_problems.includes(issue)) {
          urgencyScore += 15;
        }
      });
    }
    
    // Частота проблем с дыханием (0-20 баллов)
    const breathingMultiplier = {
      'constantly': 20,
      'often': 15,
      'sometimes': 10,
      'rarely': 5,
      'never': 0
    };
    urgencyScore += breathingMultiplier[data.breathing_frequency] || 0;
    
    // Поверхностное дыхание (дополнительный фактор)
    if (data.shallow_breathing === 'yes_often') {
      urgencyScore += 10;
    } else if (data.shallow_breathing === 'sometimes') {
      urgencyScore += 5;
    }
    
    // Профессиональные факторы риска
    const riskOccupations = {
      'office_work': 10,     // сидячий образ жизни
      'physical_work': 5,    // физические нагрузки
      'student': 8,          // стресс учебы
      'maternity_leave': 12, // послеродовый период
      'retired': 3           // меньше стресса, но возрастные проблемы
    };
    urgencyScore += riskOccupations[data.occupation] || 0;
    
    // Применяем возрастной множитель
    const ageMultiplierValue = ageMultiplier[data.age_group] || 1.0;
    urgencyScore *= ageMultiplierValue;
    
    return Math.min(Math.round(urgencyScore), 100);
  }

  /**
   * Расчет готовности к практикам (0-100)
   */
  calculateReadinessScore(data) {
    let readinessScore = 20; // базовый скор
    
    // Опыт с дыхательными практиками (0-25 баллов)
    const experienceBonus = {
      'never': 20,      // новички часто более мотивированы
      'few_times': 25,  // пробовали, понимают ценность
      'sometimes': 15,  // уже практикуют, но не регулярно
      'regularly': 10   // уже практикуют, меньше мотивации к изменениям
    };
    readinessScore += experienceBonus[data.breathing_experience] || 15;
    
    // Готовность уделять время (0-30 баллов)
    const timeCommitment = {
      '5-10_minutes': 30,   // реалистичные ожидания
      '15-30_minutes': 25,  // хорошая мотивация
      '30+_minutes': 15     // может быть нереалистично
    };
    readinessScore += timeCommitment[data.time_commitment] || 20;
    
    // Конкретность целей (0-25 баллов)
    const specificGoals = [
      'reduce_stress', 'improve_sleep', 'reduce_anxiety', 
      'normalize_pressure', 'increase_energy'
    ];
    
    if (data.main_goals) {
      const specificGoalsCount = data.main_goals.filter(
        goal => specificGoals.includes(goal)
      ).length;
      readinessScore += Math.min(specificGoalsCount * 12, 25);
    }
    
    // Осознанность проблем с дыханием (бонус за самоанализ)
    if (data.breathing_method === 'mouth') {
      readinessScore += 8; // понимают, что есть проблема
    }
    
    if (data.shallow_breathing === 'yes_often') {
      readinessScore += 10; // высокая осознанность
    } else if (data.shallow_breathing === 'sometimes') {
      readinessScore += 5;
    }
    
    return Math.min(readinessScore, 100);
  }

  /**
   * Расчет соответствия нашей программе (0-100)
   */
  calculateFitScore(data) {
    let fitScore = 30; // базовый скор
    
    // Проблемы, которые мы хорошо решаем (по 10 баллов)
    const ourStrengths = [
      'chronic_stress', 'anxiety', 'insomnia', 
      'high_pressure', 'fatigue', 'concentration_issues'
    ];
    
    if (data.current_problems) {
      ourStrengths.forEach(strength => {
        if (data.current_problems.includes(strength)) {
          fitScore += 10;
        }
      });
    }
    
    // Цели, в которых мы эффективны
    const ourStrengthGoals = [
      'reduce_stress', 'improve_sleep', 'reduce_anxiety',
      'normalize_pressure', 'increase_energy'
    ];
    
    if (data.main_goals) {
      ourStrengthGoals.forEach(goal => {
        if (data.main_goals.includes(goal)) {
          fitScore += 8;
        }
      });
    }
    
    // Профессиональные группы, с которыми мы работаем успешно
    const idealOccupations = {
      'office_work': 15,     // наша основная аудитория
      'home_work': 12,       // гибкий график для практик
      'student': 10,         // молодые, открытые к новому
      'maternity_leave': 15, // время и мотивация
      'retired': 8           // время есть, но консервативность
    };
    fitScore += idealOccupations[data.occupation] || 5;
    
    // Возрастные группы (наш sweet spot)
    const ageBonus = {
      '18-30': 5,   // открыты к новому, но менее дисциплинированы
      '31-45': 15,  // наша основная аудитория
      '46-60': 12,  // мотивированы здоровьем
      '60+': 8      // консервативны, но время есть
    };
    fitScore += ageBonus[data.age_group] || 8;
    
    return Math.min(fitScore, 100);
  }

  /**
   * Расчет общего скора
   */
  calculateTotalScore(urgency, readiness, fit) {
    return Math.round(
      urgency * this.segmentWeights.urgency +
      readiness * this.segmentWeights.readiness +
      fit * this.segmentWeights.fit
    );
  }

  /**
   * Определение сегмента пользователя
   */
  determineSegment(totalScore) {
    if (totalScore >= 80) return 'HOT_LEAD';
    if (totalScore >= 60) return 'WARM_LEAD';
    if (totalScore >= 40) return 'COLD_LEAD';
    return 'NURTURE_LEAD';
  }

  /**
   * Определение основной проблемы
   */
  identifyPrimaryIssue(data) {
    // Приоритизация проблем по критичности и нашей экспертности
    const issuePriority = {
      'panic_attacks': 100,
      'chronic_stress': 90,
      'anxiety': 85,
      'insomnia': 80,
      'high_pressure': 75,
      'breathing_issues': 70,
      'fatigue': 60,
      'headaches': 50,
      'concentration_issues': 45
    };
    
    let topIssue = 'general_wellness';
    let maxPriority = 0;
    
    if (data.current_problems) {
      data.current_problems.forEach(problem => {
        const priority = issuePriority[problem] || 0;
        if (priority > maxPriority) {
          maxPriority = priority;
          topIssue = problem;
        }
      });
    }
    
    // Если проблем нет, определяем по целям
    if (topIssue === 'general_wellness' && data.main_goals) {
      const goalToProblem = {
        'reduce_stress': 'chronic_stress',
        'improve_sleep': 'insomnia',
        'reduce_anxiety': 'anxiety',
        'normalize_pressure': 'high_pressure',
        'increase_energy': 'fatigue'
      };
      
      for (const goal of data.main_goals) {
        if (goalToProblem[goal]) {
          topIssue = goalToProblem[goal];
          break;
        }
      }
    }
    
    return topIssue;
  }

  /**
   * Генерация персональных рекомендаций
   */
  generatePersonalizedRecommendations(primaryIssue, segment, data) {
    const recommendations = {
      urgent_techniques: [],
      main_program: '',
      support_materials: [],
      consultation_type: '',
      timeline: ''
    };
    
    // Программы по проблемам и сегментам
    const programMatrix = {
      'panic_attacks': {
        'HOT_LEAD': {
          main: 'Индивидуальная экстренная программа "SOS-дыхание"',
          urgent: ['4-7-8 дыхание', 'Техника заземления', 'Контролируемая гипервентиляция'],
          consultation: 'Срочная консультация в течение 24 часов',
          timeline: 'Первые результаты через 1-3 дня'
        },
        'WARM_LEAD': {
          main: 'Курс "Дыхание против паники" (2 недели)',
          urgent: ['Базовое диафрагмальное дыхание', 'Техника 4-7-8'],
          consultation: 'Групповая консультация + 1 индивидуальная',
          timeline: 'Заметные улучшения через неделю'
        }
      },
      'chronic_stress': {
        'HOT_LEAD': {
          main: 'Персональная программа "Стресс-детокс" (4 недели)',
          urgent: ['Когерентное дыхание', 'Техника Box Breathing', 'Вечернее расслабление'],
          consultation: 'Еженедельные индивидуальные сессии',
          timeline: 'Значительные изменения через 2 недели'
        },
        'WARM_LEAD': {
          main: 'Групповой курс "Дыхание для стрессоустойчивости"',
          urgent: ['5-минутные офисные техники', 'Утреннее энергетическое дыхание'],
          consultation: 'Групповые занятия + консультации по запросу',
          timeline: 'Первые результаты через 5-7 дней'
        }
      },
      'insomnia': {
        'HOT_LEAD': {
          main: 'Интенсивная программа восстановления сна (3 недели)',
          urgent: ['Дыхание 4-7-8', 'Прогрессивная релаксация', 'Вечерний ритуал'],
          consultation: 'Индивидуальный план + еженедельный мониторинг',
          timeline: 'Улучшение сна через 3-5 дней'
        }
      },
      'anxiety': {
        'HOT_LEAD': {
          main: 'Программа "Спокойное дыхание - уверенная жизнь"',
          urgent: ['Анти-тревожное дыхание', 'Техника осознанности', 'Дыхание в стрессе'],
          consultation: 'Индивидуальное сопровождение',
          timeline: 'Снижение тревожности через 1 неделю'
        }
      }
    };
    
    // Получаем рекомендации для конкретной проблемы и сегмента
    const issuePrograms = programMatrix[primaryIssue];
    if (issuePrograms && issuePrograms[segment]) {
      const program = issuePrograms[segment];
      recommendations.main_program = program.main;
      recommendations.urgent_techniques = program.urgent;
      recommendations.consultation_type = program.consultation;
      recommendations.timeline = program.timeline;
    } else {
      // Fallback для других случаев
      recommendations.main_program = this.getDefaultProgram(segment);
      recommendations.urgent_techniques = this.getDefaultTechniques(primaryIssue);
      recommendations.consultation_type = this.getDefaultConsultation(segment);
      recommendations.timeline = 'Первые результаты через 1-2 недели';
    }
    
    // Поддерживающие материалы
    recommendations.support_materials = this.getSupportMaterials(primaryIssue, segment, data);
    
    return recommendations;
  }

  /**
   * Генерация персонального сообщения
   */
  generatePersonalMessage(primaryIssue, segment, data, recommendations) {
    const templates = {
      'panic_attacks': {
        'HOT_LEAD': `🆘 *Ваш дыхательный профиль: "Срочная помощь при панике"*

Анастасия видит, что вы переживаете серьезные трудности с паническими атаками. Это состояние требует немедленного внимания.

💡 *ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ:*

🚨 *ЭКСТРЕННЫЕ ТЕХНИКИ (применяйте сегодня):*
${recommendations.urgent_techniques.map(tech => `• ${tech}`).join('\n')}

📋 *ВАША ПРОГРАММА:* ${recommendations.main_program}

⏰ *РЕЗУЛЬТАТ:* ${recommendations.timeline}

🎁 *ВАШИ БОНУСЫ:*
✅ PDF "SOS-техники при панике"
✅ Аудиогид "Экстренное успокоение" (7 мин)
✅ Прямая связь с Анастасией в Telegram

📞 *СЛЕДУЮЩИЙ ШАГ:* ${recommendations.consultation_type}

⚠️ *Важно:* Анастасия свяжется с вами сегодня до 20:00 для составления индивидуального плана помощи.`
      },
      
      'chronic_stress': {
        'HOT_LEAD': `🎯 *Ваш дыхательный профиль: "${this.getProfileName(data)}"*

📊 *АНАЛИЗ ВАШЕЙ СИТУАЦИИ:*
• Уровень стресса: ${data.stress_level}/10 - ${this.getStressDescription(data.stress_level)}
• Основная проблема: ${this.getProblemDescription(primaryIssue)}
• Готовность к изменениям: Высокая (${segment === 'HOT_LEAD' ? 'горячий лид' : 'теплый лид'})

💡 *ПЕРСОНАЛЬНАЯ ПРОГРАММА:*

🔥 *НАЧНИТЕ СЕГОДНЯ:*
${recommendations.urgent_techniques.map(tech => `• ${tech} (5-10 мин)`).join('\n')}

📈 *ВАША ГЛАВНАЯ ПРОГРАММА:*
${recommendations.main_program}

⏰ *ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:* ${recommendations.timeline}

🎁 *ПЕРСОНАЛЬНЫЕ БОНУСЫ:*
${recommendations.support_materials.map(material => `✅ ${material}`).join('\n')}

📞 *СЛЕДУЮЩИЙ ШАГ:* ${recommendations.consultation_type}

💬 Анастасия подготовит для вас персональный план и свяжется в течение 24 часов.`
      }
    };
    
    // Получаем шаблон или создаем базовый
    const template = templates[primaryIssue]?.[segment] || this.getDefaultTemplate(primaryIssue, segment, data, recommendations);
    
    return template;
  }

  /**
   * Вспомогательные методы
   */
  getProfileName(data) {
    const profiles = {
      'office_work': 'Стрессовое дыхание офисного работника',
      'home_work': 'Домашний стресс и изоляция',
      'student': 'Учебный стресс и перегрузки',
      'maternity_leave': 'Материнское выгорание',
      'physical_work': 'Физический стресс и усталость'
    };
    return profiles[data.occupation] || 'Хронический стресс и напряжение';
  }

  getStressDescription(level) {
    if (level >= 8) return 'критически высокий';
    if (level >= 6) return 'высокий';
    if (level >= 4) return 'умеренный';
    return 'низкий';
  }

  getProblemDescription(issue) {
    const descriptions = {
      'chronic_stress': 'хроническое напряжение и стресс',
      'panic_attacks': 'панические атаки и острая тревожность',
      'anxiety': 'повышенная тревожность',
      'insomnia': 'проблемы со сном и бессонница',
      'high_pressure': 'повышенное давление',
      'breathing_issues': 'проблемы с дыханием',
      'fatigue': 'хроническая усталость'
    };
    return descriptions[issue] || 'общие проблемы с самочувствием';
  }

  getSupportMaterials(primaryIssue, segment, data) {
    const baseMaterials = [
      'PDF-гид "Основы правильного дыхания"',
      'Чек-лист для самодиагностики',
      'Доступ к закрытому Telegram-каналу'
    ];
    
    const issueMaterials = {
      'panic_attacks': [
        'Экстренная карточка "SOS при панике"',
        'Аудиопрактика "Быстрое успокоение" (5 мин)',
        'Видеогид "Техники заземления"'
      ],
      'chronic_stress': [
        'Курс "5 офисных техник" (PDF)',
        'Аудиопрактики для рабочего дня',
        'Гид "Дыхание в стрессовых ситуациях"'
      ]
    };
    
    return [...baseMaterials, ...(issueMaterials[primaryIssue] || [])];
  }

  getDefaultProgram(segment) {
    const programs = {
      'HOT_LEAD': 'Персональная программа оздоровления дыхания',
      'WARM_LEAD': 'Базовый курс дыхательных практик',
      'COLD_LEAD': 'Ознакомительный курс с основами',
      'NURTURE_LEAD': 'Профилактическая программа здоровья'
    };
    return programs[segment];
  }

  getDefaultTechniques(issue) {
    return [
      'Диафрагмальное дыхание',
      'Техника 4-7-8',
      'Осознанное дыхание'
    ];
  }

  getDefaultConsultation(segment) {
    const consultations = {
      'HOT_LEAD': 'Индивидуальная консультация (60 мин)',
      'WARM_LEAD': 'Групповая консультация + мини-сессия',
      'COLD_LEAD': 'Ознакомительная групповая сессия',
      'NURTURE_LEAD': 'Доступ к записям вебинаров'
    };
    return consultations[segment];
  }

  getDefaultTemplate(primaryIssue, segment, data, recommendations) {
    return `🌬️ *Ваш персональный план дыхательных практик*

📊 *Ваш профиль:* ${this.getProfileName(data)}

💡 *Рекомендованная программа:*
${recommendations.main_program}

🎯 *Начните с этих техник:*
${recommendations.urgent_techniques.map(tech => `• ${tech}`).join('\n')}

⏰ *Ожидаемые результаты:* ${recommendations.timeline}

📞 *Следующий шаг:* ${recommendations.consultation_type}

Анастасия свяжется с вами для детального обсуждения программы.`;
  }

  generateUserProfile(data, segment, primaryIssue) {
    return {
      id: `${data.age_group}_${data.occupation}_${primaryIssue}_${segment}`,
      description: this.getProfileName(data),
      segment,
      primaryIssue,
      riskLevel: this.getRiskLevel(data),
      motivation: this.getMotivationLevel(data),
      expectedSuccess: this.predictSuccessRate(data, segment)
    };
  }

  getRiskLevel(data) {
    const stressLevel = data.stress_level || 0;
    const hasСriticalIssues = data.current_problems?.some(p => 
      ['panic_attacks', 'high_pressure', 'severe_breathing_issues'].includes(p)
    );
    
    if (stressLevel >= 8 || hasСriticalIssues) return 'HIGH';
    if (stressLevel >= 6) return 'MEDIUM';
    return 'LOW';
  }

  getMotivationLevel(data) {
    let motivation = 'MEDIUM';
    
    if (data.time_commitment === '30+_minutes') motivation = 'HIGH';
    if (data.breathing_experience === 'never' && data.stress_level >= 7) motivation = 'HIGH';
    if (data.main_goals?.length >= 2) motivation = 'HIGH';
    if (data.time_commitment === '5-10_minutes' && data.stress_level <= 3) motivation = 'LOW';
    
    return motivation;
  }

  predictSuccessRate(data, segment) {
    let baseRate = {
      'HOT_LEAD': 85,
      'WARM_LEAD': 72,
      'COLD_LEAD': 55,
      'NURTURE_LEAD': 35
    }[segment];
    
    // Модификаторы
    if (data.breathing_experience !== 'never') baseRate += 5;
    if (data.time_commitment === '15-30_minutes') baseRate += 8;
    if (data.stress_level >= 7) baseRate += 10; // высокая мотивация
    if (data.age_group === '31-45') baseRate += 5; // sweet spot
    
    return Math.min(baseRate, 95);
  }
}

// Экспорт класса
module.exports = BreathingVERSEAnalysis;
