// Файл: modules/bonus/content-generator.js
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

    // Техники для детей
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
      }
    };
  }

  // Метод выбора техники
  getMasterTechnique(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    const techniques = isChildFlow ? this.childMasterTechniques : this.masterTechniques;
    return techniques[primaryIssue] || (isChildFlow ? this.childMasterTechniques.hyperactivity : this.masterTechniques.chronic_stress);
  }

  // Генерация заголовка
  generatePersonalizedTitle(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    const problemMap = {
      chronic_stress: 'Антистресс',
      anxiety: 'От тревоги',
      insomnia: 'Для сна',
      breathing_issues: 'Для легких',
      high_pressure: 'Для давления',
      fatigue: 'Для энергии',
      weak_immunity: 'Для иммунитета',
      hyperactivity: 'Гиперактивность',
      sleep_problems: 'Детский сон',
      concentration_issues: 'Концентрация',
      tantrums: 'От истерик'
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
    const basePlan = [
      `День 1: Ознакомьтесь с техникой "${technique.name}". Практикуйте ${technique.duration}.`,
      `День 2: Увеличьте количество повторений на 1-2 цикла.`,
      `День 3: Практикуйте утром и вечером для закрепления результата.`
    ];
    if (segment === 'HOT_LEAD') {
      basePlan.push('Срочно начните практику для быстрого эффекта!');
    }
    return basePlan;
  }

  // Генерация красивых названий файлов
  generateBeautifulFileName(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    const segment = analysisResult.segment || 'COLD_LEAD';

    const fileNameParts = [];

    if (isChildFlow) {
      fileNameParts.push('Детский_гид');
      if (surveyData.child_age_detail) {
        const ageMap = {
          '3-4': '3-4_года',
          '5-6': '5-6_лет',
          '7-8': '7-8_лет',
          '9-10': '9-10_лет',
          '11-12': '11-12_лет',
          '13-15': '13-15_лет',
          '16-17': '16-17_лет'
        };
        fileNameParts.push(ageMap[surveyData.child_age_detail] || surveyData.child_age_detail);
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
      tantrums: 'От_капризов'
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

    return fileNameParts.join('_').replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_');
  }

  // Генерация персонализированного HTML
  async generatePersonalizedHTML(userId, analysisResult, surveyData) {
    try {
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true });
      }

      const beautifulFileName = this.generateBeautifulFileName(analysisResult, surveyData);
      const filePath = `./temp/${beautifulFileName}.html`;

      console.log(`✨ Создаем красивое название файла: ${beautifulFileName}.html`);

      const technique = this.getMasterTechnique(analysisResult, surveyData);
      const title = this.generatePersonalizedTitle(analysisResult, surveyData);
      const subtitle = this.generatePersonalizedSubtitle(analysisResult, surveyData);
      const isChildFlow = analysisResult.analysisType === 'child';
      const threeDayPlan = this.generate3DayPlan(technique, isChildFlow, analysisResult.segment);

      const cleanText = (text) => {
        return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      };

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      color: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-right: 20px;
      border: 3px solid white;
      object-fit: cover;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    .header-text {
      flex: 1;
    }
    .header-text h1 {
      margin: 0;
      color: white;
      font-size: 24px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .header-text .subtitle {
      margin: 5px 0 0 0;
      color: rgba(255,255,255,0.9);
      font-size: 16px;
    }
    .header-text .author {
      margin: 8px 0 0 0;
      color: rgba(255,255,255,0.8);
      font-size: 14px;
      font-style: italic;
    }
    .section {
      background: #fff;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
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
      color: #1e90ff;
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
      content: "✔ ";
      color: #1e90ff;
    }
    .technique h3 {
      color: #1e90ff;
    }
    .plan {
      background: #f0f8ff;
      padding: 15px;
      border-radius: 8px;
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
      <div class="author">👩‍⚕️ Персональная программа от Анастасии Поповой</div>
    </div>
  </div>
  <div class="section">
    <h3>🎯 Ваша персональная техника дыхания готова!</h3>
    <p>Эта техника была подобрана специально под ваш профиль и основные проблемы.</p>
    <div class="technique">
      <h3>✨ Техника: ${cleanText(technique.name)}</h3>
      <p><strong>Проблема:</strong> ${cleanText(technique.problem)}</p>
      <p><strong>Время:</strong> ${cleanText(technique.duration)}</p>
      <p><strong>Результат:</strong> ${cleanText(technique.result)}</p>
      <h4>Пошаговая инструкция:</h4>
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
    <h3>📞 ХОТИТЕ БОЛЬШЕ ТЕХНИК?</h3>
    <p>Это только 1 из 15+ техник в моей авторской системе!</p>
    <p>На персональной консультации подберем полную программу под вашу ситуацию.</p>
    <p><strong>👩‍⚕️ <a href="https://t.me/breathing_opros_bot">Анастасия Попова</a></strong><br>Эксперт по дыхательным практикам</p>
    <p><a href="https://t.me/breathing_opros_bot">💬 Записаться на консультацию</a></p>
    <p><a href="https://t.me/breathing_opros_bot">📞 Задать вопрос</a></p>
    <p>💝 Консультация поможет: подобрать техники под вашу проблему • составить план на 30 дней • отследить прогресс • ответить на все вопросы</p>
  </div>
  <div class="footer">
    <p>Создано специально для вас • ${new Date().toLocaleDateString('ru-RU')}</p>
    <p>Дыхательные практики дополняют, но не заменяют медицинское лечение</p>
    <p>🌬️ Начните прямо сейчас - ваше дыхание изменит вашу жизнь!</p>
  </div>
</body>
</html>
`;

      fs.writeFileSync(filePath, htmlContent, 'utf8');
      console.log(`✅ Красивый HTML создан: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Ошибка генерации HTML:', {
        error: error.message,
        stack: error.stack,
        userId,
        analysisResult,
        surveyData
      });
      throw error;
    }
  }
}

module.exports = ContentGenerator;
