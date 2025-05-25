// Файл: lead_bot/modules/analysis/verse_analysis.js
// Система VERSE-анализа для персонализации рекомендаций дыхательных практик
// ОБНОВЛЕННАЯ ВЕРСИЯ с поддержкой детских анкет

class BreathingVERSEAnalysis {
  constructor() {
    this.segmentWeights = {
      urgency: 0.4,    // 40% - насколько срочно нужна помощь
      readiness: 0.35, // 35% - готовность к практикам  
      fit: 0.25        // 25% - подходит ли наша программа
    };

    // Дополнительные веса для детского анализа
    this.childSegmentWeights = {
      urgency: 0.5,    // 50% - проблемы ребенка более критичны
      readiness: 0.3,  // 30% - готовность родителей
      fit: 0.2         // 20% - подходящость детских программ
    };
  }

  /**
   * Проверка является ли это детским потоком
   */
  isChildFlow(surveyData) {
    return surveyData.age_group && (
      surveyData.age_group.includes('5-12') || 
      surveyData.age_group.includes('13-17') || 
      surveyData.age_group === 'for_child'
    );
  }

  /**
   * Главный метод анализа пользователя - ОБНОВЛЕННЫЙ
   * @param {Object} surveyData - данные анкеты
   * @returns {Object} - полный анализ с рекомендациями
   */
  analyzeUser(surveyData) {
    console.log('🧠 Начинаем VERSE-анализ пользователя...');
    
    const isChildFlow = this.isChildFlow(surveyData);
    console.log('👶 Тип анализа:', isChildFlow ? 'детский' : 'взрослый');
    
    if (isChildFlow) {
      return this.analyzeChildFlow(surveyData);
    } else {
      return this.analyzeAdultFlow(surveyData);
    }
  }

  /**
   * Анализ для взрослых (существующая логика)
   */
  analyzeAdultFlow(surveyData) {
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
      profile: this.generateUserProfile(surveyData, segment, primaryIssue),
      analysisType: 'adult'
    };
  }

  /**
   * Анализ для детского потока
   */
  analyzeChildFlow(surveyData) {
    console.log('👶 Выполняем детский VERSE-анализ...');
    
    // 1. Детский скоринг
    const urgencyScore = this.calculateChildUrgencyScore(surveyData);
    const readinessScore = this.calculateChildReadinessScore(surveyData);
    const fitScore = this.calculateChildFitScore(surveyData);
    
    // 2. Сегмент для детей
    const totalScore = this.calculateChildTotalScore(urgencyScore, readinessScore, fitScore);
    const segment = this.determineChildSegment(totalScore);
    
    // 3. Основная проблема ребенка
    const primaryIssue = this.identifyChildPrimaryIssue(surveyData);
    
    // 4. Детские рекомендации
    const recommendations = this.generateChildRecommendations(
      primaryIssue, 
      segment, 
      surveyData
    );
    
    // 5. Сообщение для родителей
    const personalMessage = this.generateChildPersonalMessage(
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
      profile: this.generateChildProfile(surveyData, segment, primaryIssue),
      analysisType: 'child'
    };
  }

  /**
   * Расчет срочности для детей (0-100)
   */
  calculateChildUrgencyScore(data) {
    let urgencyScore = 0;
    
    // Возрастной фактор (младшие дети - более срочно)
    const ageUrgency = {
      '3-4': 20,   // раннее вмешательство критично
      '5-6': 15,   // формирование привычек
      '7-8': 12,   // школьная адаптация
      '9-10': 10,  // средний возраст
      '11-12': 8,  // подростковые изменения начинаются
      '13-15': 15, // подростковый стресс
      '16-17': 18  // предвзрослая тревожность
    };
    urgencyScore += ageUrgency[data.child_age_detail] || 10;
    
    // Критические детские проблемы
    const criticalChildIssues = [
      'breathing_issues', 'anxiety', 'separation_anxiety', 
      'nightmares', 'aggression', 'hyperactivity'
    ];
    
    if (data.child_problems_detailed) {
      criticalChildIssues.forEach(issue => {
        if (data.child_problems_detailed.includes(issue)) {
          urgencyScore += 20; // детские проблемы критичнее
        }
      });
    }
    
    // Загруженность расписания
    const scheduleStress = {
      'relaxed': 0,
      'moderate': 5,
      'busy': 15,
      'overloaded': 25,
      'intensive': 35
    };
    urgencyScore += scheduleStress[data.child_schedule_stress] || 5;
    
    // Образовательная среда (стресс-факторы)
    const educationStress = {
      'home_only': 0,
      'private_kindergarten': 5,
      'public_kindergarten': 10,
      'private_school': 8,
      'public_school': 15,
      'gymnasium': 20,
      'homeschooling': 3,
      'alternative_school': 5
    };
    urgencyScore += educationStress[data.child_education_status] || 10;
    
    // Проблемы со сном у детей (особенно критично)
    if (data.child_problems_detailed && data.child_problems_detailed.includes('sleep_problems')) {
      urgencyScore += 15;
    }
    if (data.child_problems_detailed && data.child_problems_detailed.includes('nightmares')) {
      urgencyScore += 12;
    }
    
    return Math.min(Math.round(urgencyScore), 100);
  }

  /**
   * Расчет готовности родителей (0-100)
   */
  calculateChildReadinessScore(data) {
    let readinessScore = 30; // базовый скор - родители заботятся
    
    // Кто будет заниматься (мотивация и возможности)
    const parentInvolvementBonus = {
      'mother': 25,        // высокая вовлеченность мам
      'father': 20,        // отцы тоже мотивированы
      'both_parents': 30,  // максимальная поддержка
      'grandparent': 15,   // опыт, но меньше энергии
      'child_independent': 10, // зависит от возраста
      'group_sessions': 20 // внешняя мотивация
    };
    readinessScore += parentInvolvementBonus[data.child_parent_involvement] || 15;
    
    // Понимание мотивации ребенка
    const motivationBonus = {
      'games_stories': 25,      // отлично для всех возрастов
      'reward_system': 20,      // хорошая система
      'family_activities': 25,  // вовлечение семьи
      'digital_interactive': 15, // современные дети
      'creative_tasks': 20,     // развитие творчества
      'adult_explanation': 10,  // для старших детей
      'peer_group': 15          // социальная мотивация
    };
    readinessScore += motivationBonus[data.child_motivation_approach] || 15;
    
    // Время для занятий
    const timeBonus = {
      'morning_routine': 20,     // регулярность
      'after_school': 25,       // хорошее время
      'afternoon': 15,          // может быть уставший
      'before_sleep': 30,       // идеально для релаксации
      'during_homework': 10,    // может отвлекать
      'stress_situations': 35,  // максимальная польза
      'weekends': 15            // нерегулярно
    };
    readinessScore += timeBonus[data.child_time_availability] || 15;
    
    // Бонус за конкретность проблем (родители четко понимают что нужно)
    if (data.child_problems_detailed && data.child_problems_detailed.length >= 2) {
      readinessScore += 10;
    }
    
    return Math.min(readinessScore, 100);
  }

  /**
   * Расчет соответствия детским программам (0-100)
   */
  calculateChildFitScore(data) {
    let fitScore = 40; // базовый скор - дети хорошо реагируют на дыхательные практики
    
    // Возрастная подходящость (sweet spot)
    const ageFit = {
      '3-4': 10,   // сложно удержать внимание
      '5-6': 20,   // начинают понимать
      '7-8': 25,   // отличный возраст для обучения
      '9-10': 30,  // наш sweet spot
      '11-12': 25, // хорошо, но начинается подростковость
      '13-15': 15, // подростковое сопротивление
      '16-17': 20  // уже более сознательные
    };
    fitScore += ageFit[data.child_age_detail] || 20;
    
    // Проблемы, которые мы хорошо решаем у детей
    const ourChildStrengths = [
      'anxiety', 'hyperactivity', 'sleep_problems', 
      'concentration_issues', 'aggression', 'separation_anxiety'
    ];
    
    if (data.child_problems_detailed) {
      ourChildStrengths.forEach(strength => {
        if (data.child_problems_detailed.includes(strength)) {
          fitScore += 12;
        }
      });
    }
    
    // Образовательная среда (где мы эффективны)
    const educationFit = {
      'home_only': 20,          // полный контроль родителей
      'private_kindergarten': 15, // индивидуальный подход
      'public_kindergarten': 10,  // стандартная программа
      'private_school': 18,      // больше возможностей
      'public_school': 12,       // стандартный подход
      'gymnasium': 8,            // высокая нагрузка
      'homeschooling': 25,       // максимальная гибкость
      'alternative_school': 22   // уже ориентированы на развитие
    };
    fitScore += educationFit[data.child_education_status] || 12;
    
    // Мотивационный подход (насколько подходит нашим методам)
    const motivationFit = {
      'games_stories': 25,       // наш основной подход
      'reward_system': 20,      // хорошо работает
      'family_activities': 30,  // идеально
      'digital_interactive': 15, // можем адаптировать
      'creative_tasks': 22,     // наши сильные стороны
      'adult_explanation': 10,  // не наш основной метод
      'peer_group': 12          // можем организовать
    };
    fitScore += motivationFit[data.child_motivation_approach] || 15;
    
    return Math.min(fitScore, 100);
  }

  /**
   * Расчет общего детского скора
   */
  calculateChildTotalScore(urgency, readiness, fit) {
    return Math.round(
      urgency * this.childSegmentWeights.urgency +
      readiness * this.childSegmentWeights.readiness +
      fit * this.childSegmentWeights.fit
    );
  }

  /**
   * Определение детского сегмента
   */
  determineChildSegment(totalScore) {
    // Немного другие пороги для детей
    if (totalScore >= 75) return 'HOT_LEAD';      // 75+ (дети требуют быстрого реагирования)
    if (totalScore >= 55) return 'WARM_LEAD';     // 55-74
    if (totalScore >= 35) return 'COLD_LEAD';     // 35-54
    return 'NURTURE_LEAD';                        // менее 35
  }

  /**
   * Определение основной детской проблемы
   */
  identifyChildPrimaryIssue(data) {
    const childIssuePriority = {
      'breathing_issues': 100,    // критично для здоровья
      'anxiety': 95,              // влияет на развитие
      'separation_anxiety': 90,   // мешает социализации
      'nightmares': 85,           // влияет на сон и психику
      'sleep_problems': 80,       // основа здоровья
      'hyperactivity': 75,        // мешает обучению
      'aggression': 70,           // социальные проблемы
      'concentration_issues': 65, // учебные трудности
      'tantrums': 60,             // поведенческие проблемы
      'social_difficulties': 55,  // коммуникация
      'weak_immunity': 50,        // здоровье
      'prevention': 30            // профилактика
    };
    
    let topIssue = 'general_wellness';
    let maxPriority = 0;
    
    if (data.child_problems_detailed) {
      data.child_problems_detailed.forEach(problem => {
        const priority = childIssuePriority[problem] || 0;
        if (priority > maxPriority) {
          maxPriority = priority;
          topIssue = problem;
        }
      });
    }
    
    return topIssue;
  }

  /**
   * Генерация детских рекомендаций
   */
  generateChildRecommendations(primaryIssue, segment, data) {
    const recommendations = {
      urgent_techniques: [],
      main_program: '',
      support_materials: [],
      consultation_type: '',
      timeline: ''
    };
    
    // Детские программы по проблемам и сегментам
    const childProgramMatrix = {
      'breathing_issues': {
        'HOT_LEAD': {
          main: 'Срочная детская программа "Дыши легко" с индивидуальными занятиями',
          urgent: ['Игра "Воздушный шарик"', 'Дыхание-считалочка', 'Техника "Сонный мишка"'],
          consultation: 'Экстренная консультация родителей + педиатрическое сопровождение',
          timeline: 'Улучшение дыхания через 3-5 дней'
        },
        'WARM_LEAD': {
          main: 'Групповая программа "Дыхательные приключения" (2 недели)',
          urgent: ['Базовое "животное дыхание"', 'Игра "Ветерок"'],
          consultation: 'Групповые занятия + консультация для родителей',
          timeline: 'Заметные улучшения через неделю'
        }
      },
      'anxiety': {
        'HOT_LEAD': {
          main: 'Интенсивная программа "Спокойный ребенок" с семейной терапией',
          urgent: ['Техника "Безопасное место"', 'Дыхание с любимой игрушкой', 'Семейное дыхание'],
          consultation: 'Семейные сессии + индивидуальная работа с ребенком',
          timeline: 'Снижение тревожности через 5-7 дней'
        }
      },
      'hyperactivity': {
        'HOT_LEAD': {
          main: 'Программа "Спокойная энергия" - дыхательные игры для гиперактивных детей',
          urgent: ['Игра "Стоп-дыхание"', 'Техника "Медленная черепаха"', 'Дыхательная пауза'],
          consultation: 'Консультации для родителей + школьные рекомендации',
          timeline: 'Улучшение концентрации через 1-2 недели'
        }
      },
      'sleep_problems': {
        'HOT_LEAD': {
          main: 'Программа "Сонные дыхательные сказки" (индивидуальная)',
          urgent: ['Дыхание "Спящий котик"', 'Вечерняя дыхательная сказка', 'Техника "Облачко"'],
          consultation: 'Консультация по детскому сну + семейные рекомендации',
          timeline: 'Улучшение сна через 3-7 дней'
        }
      }
    };
    
    // Получаем рекомендации для конкретной проблемы и сегмента
    const issuePrograms = childProgramMatrix[primaryIssue];
    if (issuePrograms && issuePrograms[segment]) {
      const program = issuePrograms[segment];
      recommendations.main_program = program.main;
      recommendations.urgent_techniques = program.urgent;
      recommendations.consultation_type = program.consultation;
      recommendations.timeline = program.timeline;
    } else {
      // Fallback для других случаев
      recommendations.main_program = this.getDefaultChildProgram(segment, data);
      recommendations.urgent_techniques = this.getDefaultChildTechniques(primaryIssue, data);
      recommendations.consultation_type = this.getDefaultChildConsultation(segment);
      recommendations.timeline = 'Первые результаты через 1-2 недели';
    }
    
    // Детские поддерживающие материалы
    recommendations.support_materials = this.getChildSupportMaterials(primaryIssue, segment, data);
    
    return recommendations;
  }

  /**
   * Генерация персонального сообщения для родителей
   */
  generateChildPersonalMessage(primaryIssue, segment, data, recommendations) {
    const childAge = data.child_age_detail || 'не указан';
    const education = data.child_education_status || 'не указано';
    
    const templates = {
      'breathing_issues': {
        'HOT_LEAD': `🌬️ *Детский дыхательный профиль: "Помощь при проблемах с дыханием"*

👶 *Возраст ребенка:* ${this.getChildAgeDisplay(childAge)}
🎓 *Обучение:* ${this.getEducationDisplay(education)}

⚠️ *СРОЧНО ТРЕБУЕТСЯ ВНИМАНИЕ*
Проблемы с дыханием у ребенка требуют немедленного вмешательства для правильного развития.

🎯 *ЭКСТРЕННЫЕ ТЕХНИКИ (начните сегодня):*
${recommendations.urgent_techniques.map(tech => `• ${tech} (5-10 мин в игровой форме)`).join('\n')}

📋 *ДЕТСКАЯ ПРОГРАММА:* ${recommendations.main_program}

⏰ *РЕЗУЛЬТАТ:* ${recommendations.timeline}

🎁 *СПЕЦИАЛЬНЫЕ МАТЕРИАЛЫ ДЛЯ РОДИТЕЛЕЙ:*
✅ Видеогид "Дыхательные игры дома"
✅ Сказки с дыхательными упражнениями
✅ Карточки-подсказки для экстренных ситуаций
✅ Прямая связь с детским специалистом

📞 *СЛЕДУЮЩИЙ ШАГ:* ${recommendations.consultation_type}

⚠️ *Важно:* Наш детский специалист свяжется с вами сегодня до 19:00 для составления индивидуального плана помощи ребенку.

💝 *Мы понимаем вашу заботу и поможем вашему малышу дышать легко!*`
      },
      
      'anxiety': {
        'HOT_LEAD': `🧸 *Детский профиль: "Тревожный ребенок - спокойные родители"*

👶 *Возраст:* ${this.getChildAgeDisplay(childAge)}
📊 *Ситуация:* Ребенок испытывает повышенную тревожность

💡 *АНАЛИЗ ДЕТСКОГО ПСИХОЛОГА:*
• Возраст: ${childAge} - критически важный период для формирования навыков саморегуляции
• Среда обучения: ${this.getEducationDisplay(education)} - влияет на уровень стресса
• Готовность семьи: Высокая (${segment === 'HOT_LEAD' ? 'приоритетный случай' : 'важный случай'})

🎮 *НАЧНИТЕ ИГРАТЬ СЕГОДНЯ:*
${recommendations.urgent_techniques.map(tech => `• ${tech} (превратите в веселую игру!)`).join('\n')}

📈 *СЕМЕЙНАЯ ПРОГРАММА:*
${recommendations.main_program}

⏰ *ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:* ${recommendations.timeline}

🎁 *НАБОР "СПОКОЙНАЯ СЕМЬЯ":*
${recommendations.support_materials.map(material => `✅ ${material}`).join('\n')}

👨‍👩‍👧‍👦 *СЛЕДУЮЩИЙ ШАГ:* ${recommendations.consultation_type}

💬 Детский психолог и специалист по дыхательным практикам подготовят семейный план и свяжутся в течение 24 часов.

💖 *Вместе мы поможем вашему ребенку стать спокойнее и увереннее!*`
      }
    };
    
    // Получаем шаблон или создаем базовый
    const template = templates[primaryIssue]?.[segment] || this.getDefaultChildTemplate(primaryIssue, segment, data, recommendations);
    
    return template;
  }

  /**
   * Вспомогательные методы для детского анализа
   */
  getChildAgeDisplay(age) {
    const ageMap = {
      '3-4': '3-4 года (дошкольник)',
      '5-6': '5-6 лет (старший дошкольник)',
      '7-8': '7-8 лет (младший школьник)',
      '9-10': '9-10 лет (младший школьник)',
      '11-12': '11-12 лет (средний школьник)',
      '13-15': '13-15 лет (подросток)',
      '16-17': '16-17 лет (старший подросток)'
    };
    return ageMap[age] || age;
  }

  getEducationDisplay(education) {
    const eduMap = {
      'home_only': 'Домашнее воспитание',
      'private_kindergarten': 'Частный детский сад',
      'public_kindergarten': 'Государственный детский сад',
      'private_school': 'Частная школа',
      'public_school': 'Государственная школа',
      'gymnasium': 'Гимназия/лицей',
      'homeschooling': 'Семейное обучение',
      'alternative_school': 'Альтернативная школа'
    };
    return eduMap[education] || education;
  }

  getChildSupportMaterials(primaryIssue, segment, data) {
    const baseMaterials = [
      'PDF-гид "Дыхательные игры для детей"',
      'Видеоинструкции для родителей',
      'Детские раскраски с дыханием',
      'Доступ к родительскому чату'
    ];
    
    const issueMaterials = {
      'breathing_issues': [
        'Карточки "SOS-дыхание для детей"',
        'Аудиосказки "Дыши и засыпай"',
        'Видео "Дыхательная гимнастика-игра"',
        'Методичка для педиатра'
      ],
      'anxiety': [
        'Набор "Спокойный ребенок"',
        'Игровые карточки от тревожности',
        'Семейные дыхательные ритуалы',
        'Гид по детской психологии'
      ],
      'hyperactivity': [
        'Игры "Стоп-дыхание"',
        'Карточки для школы',
        'Техники быстрого успокоения',
        'Рекомендации для учителей'
      ]
    };
    
    return [...baseMaterials, ...(issueMaterials[primaryIssue] || [])];
  }

  getDefaultChildProgram(segment, data) {
    const programs = {
      'HOT_LEAD': 'Интенсивная детская программа "Дыши и играй"',
      'WARM_LEAD': 'Семейная программа дыхательных практик',
      'COLD_LEAD': 'Ознакомительный курс "Первые дыхательные игры"',
      'NURTURE_LEAD': 'Профилактическая программа здорового дыхания'
    };
    return programs[segment];
  }

  getDefaultChildTechniques(issue, data) {
    const childAge = data.child_age_detail;
    
    // Техники по возрастам
    if (['3-4', '5-6'].includes(childAge)) {
      return [
        'Игра "Надуй воздушный шарик"',
        'Дыхание "Как спит мишка"',
        'Техника "Ветерок и листочек"'
      ];
    } else if (['7-8', '9-10'].includes(childAge)) {
      return [
        'Дыхательная считалочка',
        'Игра "Морские волны"',
        'Техника "Дыхание супергероя"'
      ];
    } else {
      return [
        'Подростковое спокойное дыхание',
        'Техника снятия стресса перед экзаменами',
        'Дыхание для концентрации'
      ];
    }
  }

  getDefaultChildConsultation(segment) {
    const consultations = {
      'HOT_LEAD': 'Срочная семейная консультация (90 мин)',
      'WARM_LEAD': 'Групповые детские занятия + консультация родителей',
      'COLD_LEAD': 'Ознакомительная встреча с детским специалистом',
      'NURTURE_LEAD': 'Доступ к записям детских вебинаров'
    };
    return consultations[segment];
  }

  getDefaultChildTemplate(primaryIssue, segment, data, recommendations) {
    const childAge = data.child_age_detail || 'не указан';
    
    return `👶 *Персональный план дыхательных практик для ребенка*

🎯 *Возраст ребенка:* ${this.getChildAgeDisplay(childAge)}
📋 *Основная проблема:* ${this.getChildProblemDescription(primaryIssue)}

💡 *Рекомендованная программа:*
${recommendations.main_program}

🎮 *Начните с этих игр:*
${recommendations.urgent_techniques.map(tech => `• ${tech}`).join('\n')}

⏰ *Ожидаемые результаты:* ${recommendations.timeline}

👨‍👩‍👧‍👦 *Поддержка родителей:* ${recommendations.consultation_type}

Наш детский специалист свяжется с вами для составления индивидуального плана.`;
  }

  getChildProblemDescription(issue) {
    const descriptions = {
      'breathing_issues': 'проблемы с дыханием',
      'anxiety': 'повышенная тревожность',
      'separation_anxiety': 'страх разлуки с родителями',
      'nightmares': 'ночные кошмары и беспокойный сон',
      'sleep_problems': 'трудности с засыпанием',
      'hyperactivity': 'гиперактивность и невнимательность',
      'aggression': 'агрессивное поведение',
      'concentration_issues': 'проблемы с концентрацией',
      'tantrums': 'частые истерики',
      'social_difficulties': 'сложности в общении',
      'weak_immunity': 'слабый иммунитет',
      'prevention': 'профилактика и общее развитие'
    };
    return descriptions[issue] || 'общие вопросы развития';
  }

  generateChildProfile(surveyData, segment, primaryIssue) {
    return {
      id: `child_${surveyData.child_age_detail}_${surveyData.child_education_status}_${primaryIssue}_${segment}`,
      description: this.getChildProfileName(surveyData),
      segment,
      primaryIssue,
      riskLevel: this.getChildRiskLevel(surveyData),
      parentMotivation: this.getParentMotivationLevel(surveyData),
      expectedSuccess: this.predictChildSuccessRate(surveyData, segment),
      ageGroup: surveyData.child_age_detail,
      educationEnvironment: surveyData.child_education_status,
      scheduleStress: surveyData.child_schedule_stress
    };
  }

  getChildProfileName(data) {
    const age = data.child_age_detail || 'ребенок';
    const problem = this.getChildProblemDescription(data.child_problems_detailed?.[0] || 'general');
    return `${this.getChildAgeDisplay(age)} с проблемой: ${problem}`;
  }

  getChildRiskLevel(data) {
    const criticalIssues = ['breathing_issues', 'anxiety', 'separation_anxiety', 'aggression'];
    const hasСriticalIssues = data.child_problems_detailed?.some(p => criticalIssues.includes(p));
    const isOverloaded = ['overloaded', 'intensive'].includes(data.child_schedule_stress);
    
    if (hasСriticalIssues && isOverloaded) return 'HIGH';
    if (hasСriticalIssues || isOverloaded) return 'MEDIUM';
    return 'LOW';
  }

  getParentMotivationLevel(data) {
    let motivation = 'MEDIUM';
    
    // Высокая мотивация родителей
    if (data.child_parent_involvement === 'both_parents') motivation = 'HIGH';
    if (data.child_motivation_approach === 'family_activities') motivation = 'HIGH';
    if (data.child_time_availability === 'stress_situations') motivation = 'HIGH';
    if (data.child_problems_detailed?.length >= 3) motivation = 'HIGH';
    
    // Низкая мотивация
    if (data.child_parent_involvement === 'child_independent' && 
        ['3-4', '5-6'].includes(data.child_age_detail)) motivation = 'LOW';
    
    return motivation;
  }

  predictChildSuccessRate(data, segment) {
    let baseRate = {
      'HOT_LEAD': 90,   // дети быстро реагируют на помощь
      'WARM_LEAD': 85,  
      'COLD_LEAD': 70,
      'NURTURE_LEAD': 60
    }[segment];
    
    // Модификаторы для детей
    if (data.child_parent_involvement === 'both_parents') baseRate += 10;
    if (data.child_motivation_approach === 'games_stories') baseRate += 8;
    if (['7-8', '9-10'].includes(data.child_age_detail)) baseRate += 5; // sweet spot
    if (data.child_education_status === 'homeschooling') baseRate += 7; // больше контроля
    
    return Math.min(baseRate, 95);
  }

  // === СУЩЕСТВУЮЩИЕ МЕТОДЫ ДЛЯ ВЗРОСЛЫХ (без изменений) ===

  /**
   * Расчет срочности помощи для взрослых (0-100)
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
   * Расчет готовности к практикам для взрослых (0-100)
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
      '3-5_minutes': 30,   // реалистичные ожидания
      '10-15_minutes': 25,  // хорошая мотивация
      '20-30_minutes': 15     // может быть нереалистично
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
   * Расчет соответствия нашей программе для взрослых (0-100)
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
   * Расчет общего скора для взрослых
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
   * Определение основной проблемы для взрослых
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
   * Генерация персональных рекомендаций для взрослых
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
   * Генерация персонального сообщения для взрослых
   */
  generatePersonalMessage(primaryIssue, segment, data, recommendations) {
    const templates = {
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
   * Вспомогательные методы для взрослых
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
    
    if (data.time_commitment === '20-30_minutes') motivation = 'HIGH';
    if (data.breathing_experience === 'never' && data.stress_level >= 7) motivation = 'HIGH';
    if (data.main_goals?.length >= 2) motivation = 'HIGH';
    if (data.time_commitment === '3-5_minutes' && data.stress_level <= 3) motivation = 'LOW';
    
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
    if (data.time_commitment === '10-15_minutes') baseRate += 8;
    if (data.stress_level >= 7) baseRate += 10; // высокая мотивация
    if (data.age_group === '31-45') baseRate += 5; // sweet spot
    
    return Math.min(baseRate, 95);
  }
}

// Экспорт класса
module.exports = BreathingVERSEAnalysis;
