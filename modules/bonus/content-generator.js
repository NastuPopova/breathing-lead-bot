// Файл: modules/bonus/content-generator.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const fs = require('fs');

class ContentGenerator {
  constructor() {
    // URL аватарки
    this.avatarUrl = 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/images/avatar_anastasia.jpg';

    // Техники для взрослых
    this.masterTechniques = {
      chronic_stress: {
        name: 'Антистресс дыхание',
        problem: 'Хронический стресс',
        duration: '5-7 минут',
        result: 'Снижение уровня стресса и улучшение концентрации',
        steps: [
          'Сядьте удобно, спина прямая.',
          'Сделайте 4 медленных вдоха через нос, считая до 4.',
          'Задержите дыхание на 4 секунды.',
          'Медленно выдохните через рот, считая до 6.',
          'Повторите цикл 5-7 раз.'
        ]
      },
      anxiety: {
        name: 'Техника успокоения',
        problem: 'Тревожность',
        duration: '3-5 минут',
        result: 'Снижение тревоги и внутреннее спокойствие',
        steps: [
          'Найдите тихое место.',
          'Сделайте глубокий вдох через нос на 5 секунд.',
          'Медленно выдохните через рот на 7 секунд.',
          'Представляйте, как тревога уходит с каждым выдохом.',
          'Повторите 6-8 циклов.'
        ]
      },
      insomnia: {
        name: 'Дыхание для сна',
        problem: 'Бессонница',
        duration: '7-10 минут',
        result: 'Улучшение качества сна',
        steps: [
          'Лягте в удобное положение.',
          'Вдохните через нос на 4 секунды.',
          'Задержите дыхание на 7 секунд.',
          'Медленно выдохните через рот на 8 секунд.',
          'Повторите 4-6 раз.'
        ]
      },
      breathing_issues: {
        name: 'Дыхание для легких',
        problem: 'Проблемы с дыханием',
        duration: '6-8 минут',
        result: 'Улучшение дыхательной функции',
        steps: [
          'Сядьте прямо, плечи расслаблены.',
          'Вдохните через нос на 4 секунды.',
          'Задержите дыхание на 4 секунды.',
          'Выдохните через рот на 6 секунд.',
          'Повторите 5-7 раз.'
        ]
      },
      high_pressure: {
        name: 'Дыхание для давления',
        problem: 'Высокое давление',
        duration: '5-7 минут',
        result: 'Снижение давления и расслабление',
        steps: [
          'Сядьте удобно, закройте глаза.',
          'Вдохните через нос на 5 секунд.',
          'Медленно выдохните через рот на 7 секунд.',
          'Повторите 6-8 раз.'
        ]
      },
      fatigue: {
        name: 'Энергетическое дыхание',
        problem: 'Усталость',
        duration: '4-6 минут',
        result: 'Повышение энергии и бодрости',
        steps: [
          'Станьте прямо, руки на поясе.',
          'Быстро вдохните через нос 3 раза.',
          'Медленно выдохните через рот.',
          'Повторите 5-7 циклов.'
        ]
      },
      weak_immunity: {
        name: 'Дыхание для иммунитета',
        problem: 'Слабый иммунитет',
        duration: '6-8 минут',
        result: 'Укрепление иммунной системы',
        steps: [
          'Сядьте, расслабьтесь.',
          'Вдохните через нос на 4 секунды.',
          'Задержите дыхание на 6 секунд.',
          'Выдохните через рот на 8 секунд.',
          'Повторите 5-7 раз.'
        ]
      }
    };

    // ИСПРАВЛЕНО: Техники для детей с правильными проблемами
    this.childMasterTechniques = {
      hyperactivity: {
        name: 'Игровое дыхание "Воздушный шар"',
        problem: 'Гиперактивность',
        duration: '3-5 минут',
        result: 'Успокоение и улучшение концентрации',
        steps: [
          'Представьте, что вы надуваете большой воздушный шар.',
          'Медленно вдохните через нос, считая до 3.',
          'Выдохните через рот, как будто шар медленно сдувается.',
          'Повторите 5-7 раз, делая движения руками.'
        ]
      },
      sleep_problems: {
        name: 'Дыхание "Спящий мишка"',
        problem: 'Проблемы со сном',
        duration: '5 минут',
        result: 'Легкое засыпание',
        steps: [
          'Лягте и положите игрушку на живот.',
          'Вдохните через нос, чтобы игрушка поднялась.',
          'Медленно выдохните, чтобы игрушка опустилась.',
          'Повторите 6-8 раз, представляя спящего мишку.'
        ]
      },
      concentration_issues: {
        name: 'Дыхание "Звездочка"',
        problem: 'Проблемы с концентрацией',
        duration: '3-4 минуты',
        result: 'Улучшение внимания',
        steps: [
          'Сядьте, представьте звезду.',
          'Вдохните через нос на 3 секунды.',
          'Выдохните через рот, как будто задуваете звезду.',
          'Повторите 6-8 раз.'
        ]
      },
      tantrums: {
        name: 'Дыхание "Волшебный ветер"',
        problem: 'Истерики',
        duration: '2-3 минуты',
        result: 'Успокоение эмоций',
        steps: [
          'Представьте, что вы ветер.',
          'Вдохните через нос на 2 секунды.',
          'Выдохните через рот, как будто дуете на облака.',
          'Повторите 5-7 раз.'
        ]
      },
      // ДОБАВЛЕНО: Новые детские техники для других проблем
      anxiety: {
        name: 'Дыхание "Храбрый лев"',
        problem: 'Тревожность',
        duration: '4-5 минут',
        result: 'Уверенность и спокойствие',
        steps: [
          'Сядьте как храбрый лев.',
          'Глубоко вдохните через нос.',
          'Выдохните с звуком "А-а-а", как лев.',
          'Почувствуйте свою силу и храбрость.',
          'Повторите 5-6 раз.'
        ]
      },
      separation_anxiety: {
        name: 'Дыхание "Мамино сердечко"',
        problem: 'Страх разлуки',
        duration: '3-4 минуты',
        result: 'Чувство безопасности',
        steps: [
          'Положите руку на сердце.',
          'Вдохните и представьте мамину любовь.',
          'Выдохните и посылайте любовь маме.',
          'Чувствуйте связь с мамой через дыхание.',
          'Повторите 6-8 раз.'
        ]
      },
      breathing_issues: {
        name: 'Дыхание "Рыбка"',
        problem: 'Проблемы с дыханием',
        duration: '5-6 минут',
        result: 'Улучшение дыхания',
        steps: [
          'Представьте, что вы рыбка в воде.',
          'Медленно "плывите" и дышите носом.',
          'Выдыхайте ртом, как рыбка пускает пузырики.',
          'Плавайте спокойно и ровно дышите.',
          'Повторите 7-10 раз.'
        ]
      }
    };
  }

  // ИСПРАВЛЕНО: Метод выбора техники с правильным маппингом проблем
  getMasterTechnique(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    
    console.log(`🎯 Выбираем технику для: ${isChildFlow ? 'ребенка' : 'взрослого'}, проблема: ${primaryIssue}`);
    
    const techniques = isChildFlow ? this.childMasterTechniques : this.masterTechniques;
    
    // ИСПРАВЛЕНО: Правильный маппинг детских проблем
    let selectedTechnique = techniques[primaryIssue];
    
    if (!selectedTechnique && isChildFlow) {
      // Маппинг взрослых проблем на детские техники
      const childMapping = {
        'chronic_stress': 'hyperactivity',
        'insomnia': 'sleep_problems',
        'concentration_issues': 'concentration_issues',
        'anxiety': 'anxiety',
        'breathing_issues': 'breathing_issues'
      };
      
      const mappedIssue = childMapping[primaryIssue];
      if (mappedIssue && techniques[mappedIssue]) {
        selectedTechnique = techniques[mappedIssue];
        console.log(`🔄 Маппинг детской проблемы: ${primaryIssue} -> ${mappedIssue}`);
      }
    }
    
    // Fallback техники
    if (!selectedTechnique) {
      selectedTechnique = isChildFlow ? 
        this.childMasterTechniques.hyperactivity : 
        this.masterTechniques.chronic_stress;
      console.log(`⚠️ Используем fallback технику для ${isChildFlow ? 'ребенка' : 'взрослого'}`);
    }
    
    console.log(`✅ Выбрана техника: ${selectedTechnique.name}`);
    return selectedTechnique;
  }

  // Генерация заголовка
  generatePersonalizedTitle(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    
    const problemMap = {
      chronic_stress: 'Антистресс',
      anxiety: 'От тревоги',
      insomnia: 'Для сна',
      breathing_issues: 'Для дыхания',
      high_pressure: 'Для давления',
      fatigue: 'Для энергии',
      weak_immunity: 'Для иммунитета',
      hyperactivity: 'Гиперактивность',
      sleep_problems: 'Детский сон',
      concentration_issues: 'Концентрация',
      tantrums: 'От капризов',
      separation_anxiety: 'От страхов'
    };
    
    const problem = problemMap[primaryIssue] || 'Здоровье';
    return isChildFlow
      ? `Дыхательный гид для ребенка: ${problem}`
      : `Ваш дыхательный гид: ${problem}`;
  }

  // Генерация подзаголовка
  generatePersonalizedSubtitle(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    return isChildFlow
      ? 'Игровая техника для вашего ребенка'
      : 'Персональная техника для вашего здоровья';
  }

  // Генерация плана на 3 дня
  generate3DayPlan(technique, isChildFlow, segment) {
    const basePlan = isChildFlow ? [
      `День 1: Познакомьте ребенка с игрой "${technique.name}". Практикуйте ${technique.duration}.`,
      `День 2: Повторите игру утром и вечером, добавьте 1-2 цикла.`,
      `День 3: Делайте технику когда ребенок расстроен или перед сном.`
    ] : [
      `День 1: Ознакомьтесь с техникой "${technique.name}". Практикуйте ${technique.duration}.`,
      `День 2: Увеличьте количество повторений на 1-2 цикла.`,
      `День 3: Практикуйте утром и вечером для закрепления результата.`
    ];
    
    if (segment === 'HOT_LEAD') {
      basePlan.push(isChildFlow ? 
        'Начните играть с ребенком прямо сейчас!' : 
        'Срочно начните практику для быстрого эффекта!');
    }
    return basePlan;
  }

  // ИСПРАВЛЕНО: Генерация красивых названий файлов для детей
  generateBeautifulFileName(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    const segment = analysisResult.segment || 'COLD_LEAD';

    const fileNameParts = [];

    if (isChildFlow) {
      fileNameParts.push('Детский_гид');
      
      // ИСПРАВЛЕНО: Правильное получение возраста ребенка
      const childAge = surveyData.child_age_detail;
      if (childAge) {
        const ageMap = {
          '3-4': '3-4_года',
          '5-6': '5-6_лет',
          '7-8': '7-8_лет',
          '9-10': '9-10_лет',
          '11-12': '11-12_лет',
          '13-15': '13-15_лет',
          '16-17': '16-17_лет'
        };
        fileNameParts.push(ageMap[childAge] || childAge.replace('-', '_'));
      }
    } else {
      fileNameParts.push('Дыхательный_гид');
      if (surveyData.age_group) {
        const ageMap = {
          '18-30': '18-30_лет',
          '31-45': '31-45_лет',
          '46-60': '46-60_лет',
          '60+': '60+_лет'
        };
        fileNameParts.push(ageMap[surveyData.age_group] || surveyData.age_group);
      }
    }

    // ИСПРАВЛЕНО: Правильный маппинг проблем для имени файла
    const problemMap = {
      chronic_stress: 'Антистресс',
      anxiety: 'От_тревоги',
      insomnia: 'Для_сна',
      breathing_issues: 'Дыхание',
      high_pressure: 'От_давления',
      fatigue: 'Энергия',
      hyperactivity: 'Гиперактивность',
      sleep_problems: 'Детский_сон',
      weak_immunity: 'Иммунитет',
      concentration_issues: 'Концентрация',
      tantrums: 'От_капризов',
      separation_anxiety: 'От_страхов'
    };

    if (problemMap[primaryIssue]) {
      fileNameParts.push(problemMap[primaryIssue]);
    }

    const segmentMap = {
      HOT_LEAD: 'SOS',
      WARM_LEAD: 'Активный',
      COLD_LEAD: 'Базовый',
      NURTURE_LEAD: 'Профилактика'
    };

    if (segmentMap[segment]) {
      fileNameParts.push(segmentMap[segment]);
    }

    const today = new Date();
    const dateStr = `${today.getDate()}.${today.getMonth() + 1}`;
    fileNameParts.push(dateStr);

    const fileName = fileNameParts.join('_').replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_');
    console.log(`📁 Сгенерировано имя файла: ${fileName}.html`);
    return fileName;
  }

  // ИСПРАВЛЕНО: Генерация персонализированного HTML с правильной обработкой детских файлов
  async generatePersonalizedHTML(userId, analysisResult, surveyData) {
    try {
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true });
      }

      const beautifulFileName = this.generateBeautifulFileName(analysisResult, surveyData);
      const filePath = `./temp/${beautifulFileName}.html`;

      console.log(`✨ Создаем файл: ${beautifulFileName}.html для пользователя ${userId}`);
      console.log(`📊 Тип анализа: ${analysisResult.analysisType}, проблема: ${analysisResult.primaryIssue}`);

      const technique = this.getMasterTechnique(analysisResult, surveyData);
      const title = this.generatePersonalizedTitle(analysisResult, surveyData);
      const subtitle = this.generatePersonalizedSubtitle(analysisResult, surveyData);
      const isChildFlow = analysisResult.analysisType === 'child';
      const threeDayPlan = this.generate3DayPlan(technique, isChildFlow, analysisResult.segment);

      const cleanText = (text) => {
        return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      };

      // ИСПРАВЛЕНО: Разные стили для детских и взрослых файлов
      const backgroundGradient = isChildFlow 
        ? 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'  // Детский теплый градиент
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Взрослый синий градиент

      const headerColor = isChildFlow ? '#ff6b6b' : 'white';
      const accentColor = isChildFlow ? '#4ecdc4' : '#1e90ff';

      let htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanText(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      line-height: 1.6;
      color: #333;
      background-color: #f9f9f9;
    }
    .header-with-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 30px;
      padding: 25px;
      background: ${backgroundGradient};
      border-radius: 15px;
      color: ${headerColor};
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-right: 20px;
      border: 3px solid ${headerColor};
      object-fit: cover;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    .header-text {
      flex: 1;
    }
    .header-text h1 {
      margin: 0;
      color: ${headerColor};
      font-size: 24px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .header-text .subtitle {
      margin: 5px 0 0 0;
      color: ${isChildFlow ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)'};
      font-size: 16px;
    }
    .header-text .author {
      margin: 8px 0 0 0;
      color: ${isChildFlow ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'};
      font-size: 14px;
      font-style: italic;
    }
    .section {
      background: #fff;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ${isChildFlow ? 'border-left: 4px solid #4ecdc4;' : ''}
    }
    .technique h3 {
      color: ${accentColor};
      ${isChildFlow ? 'font-size: 20px;' : ''}
    }
    .plan {
      background: ${isChildFlow ? '#fff5f5' : '#f0f8ff'};
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid ${accentColor};
    }
    ${isChildFlow ? `
    .child-highlight {
      background: linear-gradient(90deg, #ffeaa7, #fab1a0);
      padding: 10px;
      border-radius: 8px;
      margin: 10px 0;
      text-align: center;
      font-weight: bold;
      color: #2d3436;
    }
    ` : ''}
    @media (max-width: 600px) {
      .header-with-avatar {
        flex-direction: column;
        text-align: center;
        padding: 20px;
      }
      .avatar {
        margin-right: 0;
        margin-bottom: 15px;
      }
    }
    a {
      color: ${accentColor};
      text-decoration: none;
      font-weight: bold;
    }
    a:hover {
      text-decoration: underline;
      color: #ff4500;
    }
    ul {
      list-style-type: none;
      padding: 0;
    }
    ul li {
      padding: 10px 0;
    }
    ul li:before {
      content: "${isChildFlow ? '🎮 ' : '✔ '}";
      color: ${accentColor};
    }
  </style>
</head>
<body>
  <div class="header-with-avatar">
    <img src="${this.avatarUrl}" 
         alt="Анастасия Попова" 
         class="avatar"
         onerror="this.style.display='none'">
    <div class="header-text">
      <h1>${cleanText(title)}</h1>
      <div class="subtitle">${cleanText(subtitle)}</div>
      <div class="author">${isChildFlow ? '👩‍⚕️ Детский специалист' : '👩‍⚕️ Персональная программа'} от Анастасии Поповой</div>
    </div>
  </div>
  
  ${isChildFlow ? '<div class="child-highlight">🎁 Специально для вашего ребенка! 🎁</div>' : ''}
  
  <div class="section">
    <h3>${isChildFlow ? '🎮 Игровая техника готова!' : '🎯 Ваша персональная техника готова!'}</h3>
    <p>${isChildFlow ? 'Эта игровая техника была подобрана специально для вашего ребенка.' : 'Эта техника была подобрана специально под ваш профиль и основные проблемы.'}</p>
    <div class="technique">
      <h3>${isChildFlow ? '🎲 Игра:' : '✨ Техника:'} ${cleanText(technique.name)}</h3>
      <p><strong>${isChildFlow ? 'Помогает при:' : 'Проблема:'}</strong> ${cleanText(technique.problem)}</p>
      <p><strong>Время:</strong> ${cleanText(technique.duration)}</p>
      <p><strong>Результат:</strong> ${cleanText(technique.result)}</p>
      <h4>${isChildFlow ? 'Как играть с ребенком:' : 'Пошаговая инструкция:'}</h4>
      <ul>
        ${technique.steps.map(step => `<li>${cleanText(step)}</li>`).join('')}
      </ul>
    </div>
    <div class="plan">
      <h3>📅 План на 3 дня</h3>
      <ul>
        ${threeDayPlan.map(plan => `<li>${cleanText(plan)}</li>`).join('')}
      </ul>
    </div>
  </div>
  
  <div class="section cta">
    <h3>${isChildFlow ? '🤝 ПОМОЖЕМ ВАШЕМУ РЕБЕНКУ!' : '📞 ХОТИТЕ БОЛЬШЕ ТЕХНИК?'}</h3>
    <p>${isChildFlow ? 
      'Ваш ребенок заслуживает быть здоровым и счастливым!' : 
      'Это только 1 из техник в моей авторской системе!'}</p>
    <p>${isChildFlow ? 
      'На консультации научим ребенка дышать правильно, быть спокойным и уверенным в себе.' : 
      'На персональной консультации подберем полную программу под вашу ситуацию.'}</p>
    <p><strong>👩‍⚕️ <a href="https://t.me/breathing_opros_bot">Анастасия Попова</a></strong><br>${isChildFlow ? 'Помогаю детям и родителям' : 'Эксперт по дыхательным практикам'}</p>
    <p><a href="https://t.me/breathing_opros_bot">💬 Записаться на консультацию</a></p>
    <p><a href="https://t.me/breathing_opros_bot">📞 Задать вопрос</a></p>
    <p>💝 ${isChildFlow ? 
      'Вместе мы поможем вашему малышу: 🌟 быть спокойнее 🌟 лучше спать 🌟 увереннее себя чувствовать 🌟 радоваться каждому дню!' : 
      'Консультация поможет: подобрать техники под вашу проблему • составить план на 30 дней • отследить прогресс • ответить на все вопросы'}</p>
  </div>
  
  <div class="footer">
    <p>Создано специально для ${isChildFlow ? 'вашего ребенка' : 'вас'} • ${new Date().toLocaleDateString('ru-RU')}</p>
    <p>${isChildFlow ? 
      'Дыхательные игры помогают детям развиваться гармонично' : 
      'Дыхательные практики дополняют, но не заменяют медицинское лечение'}</p>
    <p>🌬️ ${isChildFlow ? 
      'Начните играть с ребенком уже сегодня - подарите ему здоровое будущее!' : 
      'Начните прямо сейчас - ваше дыхание изменит вашу жизнь!'}</p>
  </div>
</body>
</html>
`;

      fs.writeFileSync(filePath, htmlContent, 'utf8');
      console.log(`✅ ${isChildFlow ? 'Детский' : 'Взрослый'} HTML создан: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Ошибка генерации HTML:', {
        error: error.message,
        stack: error.stack,
        userId,
        analysisResult: analysisResult.analysisType,
        primaryIssue: analysisResult.primaryIssue
      });
      throw error;
    }
  }
}

module.exports = ContentGenerator;







                                                                            
