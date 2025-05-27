const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

class PDFBonusManager {
  constructor() {
    // Общий шаблон для персонализированного гида
    this.bonusesTemplate = {
      id: 'personalized_guide',
      title: '🌬️ ПЕРСОНАЛЬНЫЙ ДЫХАТЕЛЬНЫЙ ГИД',
      subtitle: 'Техника под вашу ситуацию',
      description: 'Персонализированная техника с планом на 3 дня',
      target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
    };

    // Статичные PDF-материалы
    this.additionalMaterials = {
      'adult_antistress': {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/antistress_breathing.pdf',
        title: '📄 Базовый гид "Антистресс дыхание"',
        description: 'Универсальные техники для снятия стресса для взрослых'
      },
      'child_games': {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/child_breathing_games.pdf',
        title: '📄 Базовый гид "Дыхательные игры"',
        description: 'Игровые техники для детей всех возрастов'
      }
    };

    // Техники для взрослых
    this.masterTechniques = {
      'chronic_stress': {
        name: 'Дыхание "4-7-8" - мгновенное успокоение',
        problem: 'хронический стресс и напряжение',
        result: 'Снятие стресса за 2-3 минуты', // ИСПРАВЛЕНО: убрана латинская 'а'
        timeframe: 'Эффект через 30 секунд',
        steps: [
          'Сядьте удобно, выпрямите спину',
          'Полностью выдохните через рот со звуком "whoosh"',
          'Закройте рот, вдохните через нос на 4 счета',
          'Задержите дыхание на 7 счетов',
          'Выдохните через рот на 8 счетов со звуком "whoosh"',
          'Повторите 3-4 цикла'
        ],
        duration: '2-3 минуты',
        when: 'При остром стрессе, перед важными встречами, в конфликтных ситуациях',
        science: 'Активирует парасимпатическую нервную систему, снижает кортизол',
        emergency_note: 'Можно делать где угодно - в офисе, машине, дома'
      },
      'anxiety': {
        name: 'Техника "5-4-3-2-1" - стоп паника',
        problem: 'тревожность и панические атаки',
        result: 'Быстрое заземление при панике',
        timeframe: 'Облегчение через 2-3 минуты',
        steps: [
          'ПОСМОТРИТЕ: Назовите 5 предметов, которые видите',
          'УСЛЫШЬТЕ: Назовите 4 звука, которые слышите',
          'ПОТРОГАЙТЕ: Назовите 3 вещи, которые можете потрогать',
          'ПОНЮХАЙТЕ: Назовите 2 запаха',
          'ПОПРОБУЙТЕ: Назовите 1 вкус',
          'Дышите медленно: вдох на 4, выдох на 6'
        ],
        duration: '3-5 минут',
        when: 'При панических атаках, сильной тревоге, навязчивых мыслях',
        science: 'Переключает внимание на тело, прерывает тревожные мысли',
        emergency_note: 'Работает даже в самых сильных приступах паники'
      },
      'insomnia': {
        name: 'Дыхание "4-7-8" для сна',
        problem: 'бессонница и плохой сон',
        result: 'Быстрое засыпание',
        timeframe: 'Засыпание через 5-10 минут',
        steps: [
          'Лягте в кровать, устройтесь удобно',
          'Выдохните полностью через рот',
          'Закройте рот, вдохните через нос на 4 счета',
          'Задержите дыхание на 7 счетов',
          'Выдохните через рот на 8 счетов',
          'Повторяйте, пока не заснете'
        ],
        duration: '5-15 минут',
        when: 'Перед сном, при ночных пробуждениях',
        science: 'Замедляет сердечный ритм, расслабляет нервную систему',
        emergency_note: 'Можно делать даже в полной темноте, не вставая с кровати'
      },
      'breathing_issues': {
        name: 'Диафрагмальное дыхание "Рука на животе"',
        problem: 'проблемы с дыханием и одышка',
        result: 'Восстановление правильного дыхания',
        timeframe: 'Улучшение через 3-5 дней',
        steps: [
          'Лягте или сядьте удобно',
          'Одну руку положите на грудь, другую на живот',
          'Дышите так, чтобы двигалась только рука на животе',
          'Вдох через нос 4 секунды - живот поднимается',
          'Выдох через рот 6 секунд - живот опускается',
          'Грудь остается неподвижной'
        ],
        duration: '5-10 минут',
        when: 'При одышке, для тренировки правильного дыхания',
        science: 'Укрепляет диафрагму, увеличивает объем легких',
        emergency_note: 'Основа всех дыхательных практик'
      },
      'high_pressure': {
        name: 'Когерентное дыхание "5-5"',
        problem: 'повышенное давление',
        result: 'Снижение артериального давления',
        timeframe: 'Эффект через 10-15 минут',
        steps: [
          'Сядьте удобно, ноги на полу',
          'Вдох через нос на 5 счетов',
          'Выдох через нос на 5 счетов',
          'Дышите без пауз и задержек',
          'Ритм: 6 дыханий в минуту',
          'Продолжайте 15-20 минут'
        ],
        duration: '15-20 минут',
        when: 'При повышении давления, для профилактики',
        science: 'Синхронизирует сердечный ритм, снижает давление',
        emergency_note: 'Измеряйте давление до и после практики'
      },
      'fatigue': {
        name: 'Энергетическое дыхание "Воздушный насос"',
        problem: 'хроническая усталость',
        result: 'Прилив энергии и бодрости',
        timeframe: 'Энергия через 3-5 минут',
        steps: [
          'Встаньте прямо, руки на пояс',
          'Быстрый вдох через нос - живот вперед',
          'Быстрый выдох через нос - живот назад',
          'Темп: 1 цикл в секунду',
          'Сделайте 30 быстрых циклов',
          'Затем 3 медленных глубоких вдоха'
        ],
        duration: '3-5 минут',
        when: 'При упадке сил, сонливости, в середине дня',
        science: 'Насыщает кровь кислородом, активирует нервную систему',
        emergency_note: 'Не делать при высоком давлении'
      },
      'weak_immunity': {
        name: 'Дыхание "Полное дыхание йоги"',
        problem: 'слабый иммунитет',
        result: 'Укрепление иммунной системы',
        timeframe: 'Улучшение через 1-2 недели',
        steps: [
          'Сядьте прямо, расслабьте плечи',
          'Вдох через нос: сначала наполните живот, затем грудь',
          'Задержка дыхания на 2-3 секунды',
          'Выдох через нос: сначала опустите грудь, затем живот',
          'Повторите 5-10 циклов'
        ],
        duration: '5-10 минут',
        when: 'Утром или вечером, для профилактики',
        science: 'Улучшает вентиляцию легких, повышает уровень кислорода',
        emergency_note: 'Делайте в проветриваемом помещении'
      }
    };

    // Техники для детей
    this.childMasterTechniques = {
      'anxiety': {
        name: 'Игра "Медвежонок спит"',
        problem: 'тревожность и страхи',
        result: 'Быстрое успокоение ребенка',
        timeframe: 'Спокойствие через 5 минут',
        steps: [
          'Дайте ребенку любимую мягкую игрушку',
          'Пусть ребенок ляжет и положит игрушку на животик',
          'Скажите: "Покажи, как спит мишка"',
          'Вдох носиком: мишка поднимается на животике',
          'Выдох ротиком: мишка опускается и засыпает',
          'Считайте вместе: "Мишка спит 1-2-3-4"'
        ],
        duration: '5-10 минут',
        when: 'При страхах, капризах, перед сном',
        parent_tip: 'Делайте вместе с ребенком, говорите спокойным голосом',
        age_note: 'Подходит для детей 3-12 лет'
      },
      'hyperactivity': {
        name: 'Игра "Стоп-дыхание"',
        problem: 'гиперактивность и невнимательность',
        result: 'Улучшение концентрации',
        timeframe: 'Спокойствие через 10 минут',
        steps: [
          'Включите любимую музыку ребенка',
          'Танцуйте и двигайтесь вместе',
          'Когда музыка останавливается - кричите "СТОП!"',
          'Все замирают как статуи',
          'Делаете 3 глубоких вдоха вместе',
          'Снова включаете музыку и танцуете'
        ],
        duration: '10-15 минут',
        when: 'При гиперактивности, для развития самоконтроля',
        parent_tip: 'Играйте с энтузиазмом, хвалите ребенка',
        age_note: 'Особенно эффективно для детей 5-10 лет'
      },
      'sleep_problems': {
        name: 'Дыхательная сказка "Воздушный шарик"',
        problem: 'проблемы со сном',
        result: 'Быстрое засыпание',
        timeframe: 'Засыпание через 10-15 минут',
        steps: [
          'Ребенок ложится в кровать, кладет руки на животик',
          'Говорите: "В животике живет волшебный шарик"',
          'Вдох носиком: "Шарик надувается и растет"',
          'Выдох ротиком: "Шарик сдувается и уменьшается"',
          'Считайте: "Шарик растет 1-2-3-4"',
          'И: "Шарик уменьшается 1-2-3-4-5-6"'
        ],
        duration: '10-15 минут',
        when: 'Перед сном, при ночных страхах',
        parent_tip: 'Говорите тихим, убаюкивающим голосом',
        age_note: 'Подходит для детей 3-8 лет'
      },
      'weak_immunity': {
        name: 'Игра "Дыхательный лес"',
        problem: 'слабый иммунитет',
        result: 'Укрепление иммунитета через игру',
        timeframe: 'Улучшение через 1-2 недели',
        steps: [
          'Представьте, что вы в лесу с деревьями',
          'Вдох носом: "Деревья растут и набирают силу"',
          'Выдох ртом: "Деревья делятся силой с вами"',
          'Считайте: "Растем 1-2-3", "Дышим 1-2-3-4"',
          'Повторите 5 раз'
        ],
        duration: '5-10 минут',
        when: 'Утром или вечером, для профилактики',
        parent_tip: 'Добавьте игрушки-деревья для интереса',
        age_note: 'Подходит для детей 5-15 лет'
      }
    };

    this.stats = {
      available_techniques: Object.keys(this.masterTechniques).length + Object.keys(this.childMasterTechniques).length,
      approach: 'minimalist',
      last_updated: new Date().toISOString()
    };

    this.deliveryLog = [];
  }

  /**
   * Генерирует персонализированный HTML-контент
   */
  async generatePersonalizedHTML(userId, analysisResult, surveyData) {
    try {
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true });
      }

      const filePath = `./temp/bonus_${userId}.html`;
      
      // Получение персонализированных данных
      const technique = this.getMasterTechnique(analysisResult, surveyData);
      const title = this.generatePersonalizedTitle(analysisResult, surveyData);
      const subtitle = this.generatePersonalizedSubtitle(analysisResult, surveyData);
      const isChildFlow = analysisResult.analysisType === 'child';
      const threeDayPlan = this.generate3DayPlan(technique, isChildFlow, analysisResult.segment);

      // Функция для очистки текста от эмодзи
      const cleanText = (text) => {
        return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      };

      // Полный HTML с DOCTYPE и стилями
      let htmlContent = `<!DOCTYPE html>
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
    h1 {
      color: #2c3e50;
      text-align: center;
      font-size: 24px;
    }
    h2 {
      color: #34495e;
      font-size: 20px;
      margin-top: 20px;
    }
    h3 {
      color: #34495e;
      font-size: 18px;
    }
    .section {
      background: #fff;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .urgent {
      background: #ffebee;
      border-left: 4px solid #e74c3c;
      padding: 15px;
      margin-bottom: 20px;
      color: #c0392b;
    }
    ul {
      list-style-type: disc;
      padding-left: 20px;
    }
    .progress-bar {
      background: #ecf0f1;
      height: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
    .progress {
      background: #3498db;
      height: 100%;
      border-radius: 5px;
    }
    .cta {
      text-align: center;
      background: #e8f4f8;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background: #3498db;
      color: #fff;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px;
    }
    .footer {
      text-align: center;
      font-size: 14px;
      color: #7f8c8d;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="section">
    <h1>${cleanText(title)}</h1>
    <h2>${cleanText(subtitle)}</h2>
    <p>Ваша персональная техника дыхания</p>
  </div>
`;

      // Срочное уведомление для HOT_LEAD
      if (analysisResult.segment === 'HOT_LEAD') {
        htmlContent += `
  <div class="urgent">
    <p>⚡ СРОЧНО: Ваши ответы показывают критический уровень проблемы.</p>
    <p>Освойте эту технику прямо сейчас - она поможет уже через 2-3 минуты!</p>
  </div>
`;
      }

      // Профиль пользователя
      htmlContent += `
  <div class="section">
    <h2>📊 Ваш персональный профиль</h2>
    <ul>
`;
      if (isChildFlow) {
        if (surveyData.child_age_detail) {
          htmlContent += `      <li>Возраст ребенка: ${this.translateValue(surveyData.child_age_detail)}</li>\n`;
        }
        if (surveyData.child_problems_detailed) {
          const problems = this.translateArray(surveyData.child_problems_detailed).slice(0, 2).join(', ');
          htmlContent += `      <li>Основные проблемы: ${problems}</li>\n`;
        }
        if (surveyData.child_parent_involvement) {
          htmlContent += `      <li>Кто занимается: ${this.translateValue(surveyData.child_parent_involvement)}</li>\n`;
        }
      } else {
        if (surveyData.age_group) {
          htmlContent += `      <li>Возраст: ${this.translateValue(surveyData.age_group)}</li>\n`;
        }
        if (surveyData.stress_level) {
          const stressDesc = this.getStressDescription(surveyData.stress_level);
          htmlContent += `      <li>Уровень стресса: ${surveyData.stress_level}/10 (${stressDesc})</li>\n`;
        }
        if (surveyData.current_problems) {
          const problems = this.translateArray(surveyData.current_problems).slice(0, 2).join(', ');
          htmlContent += `      <li>Проблемы: ${problems}</li>\n`;
        }
      }

      const segmentNames = {
        'HOT_LEAD': 'Требует срочного внимания',
        'WARM_LEAD': 'Активно мотивирован к изменениям',
        'COLD_LEAD': 'Умеренный интерес к практикам',
        'NURTURE_LEAD': 'Долгосрочное развитие'
      };

      htmlContent += `
      <li>Категория: ${segmentNames[analysisResult.segment]}</li>
      <li>Персональная проблема: ${technique.problem}</li>
    </ul>
  </div>
`;

      // Основная техника
      htmlContent += `
  <div class="section">
    <h2>${technique.name}</h2>
    <p><strong>Решает проблему:</strong> ${technique.problem}</p>
    <ul>
`;
      technique.steps.forEach(step => {
        htmlContent += `      <li>${step}</li>\n`;
      });
      htmlContent += `
    </ul>
    <p><strong>⏱️ Время выполнения:</strong> ${technique.duration}</p>
    <p><strong>✨ Результат:</strong> ${technique.timeframe}</p>
    <p><strong>💡 Научное обоснование:</strong> ${technique.science || 'Проверенная техника с доказанной эффективностью'}</p>
`;
      if (technique.emergency_note) {
        htmlContent += `    <p><strong>⚠️ Важно:</strong> ${technique.emergency_note}</p>\n`;
      }
      if (technique.parent_tip && isChildFlow) {
        htmlContent += `    <p><strong>👨‍👩‍👧‍👦 Совет родителям:</strong> ${technique.parent_tip}</p>\n`;
      }
      htmlContent += `
  </div>
`;

      // План на 3 дня
      htmlContent += `
  <div class="section">
    <h2>📅 ПЛАН ОСВОЕНИЯ НА 3 ДНЯ</h2>
`;
      Object.entries(threeDayPlan).forEach(([day, plan], index) => {
        const progress = ((index + 1) / 3) * 100;
        htmlContent += `
    <div>
      <h3>${plan.title}</h3>
      <ul>
`;
        plan.tasks.forEach(task => {
          htmlContent += `        <li>${task}</li>\n`;
        });
        htmlContent += `
      </ul>
      <p><strong>🎯 Цель дня:</strong> ${plan.goal}</p>
      <div class="progress-bar">
        <div class="progress" style="width: ${progress}%"></div>
      </div>
    </div>
`;
      });
      htmlContent += `
  </div>
`;

      // Ожидаемые результаты
      htmlContent += `
  <div class="section">
    <h2>🎯 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ</h2>
    <ul>
`;
      if (isChildFlow) {
        htmlContent += `
      <li>📈 Улучшение поведения через 2-3 дня</li>
      <li>😴 Более спокойный сон и засыпание</li>
      <li>🎯 Развитие навыков самоуспокоения</li>
      <li>👨‍👩‍👧‍👦 Укрепление связи с родителями</li>
`;
      } else {
        htmlContent += `
      <li>⚡ ${technique.result}</li>
      <li>📈 Снижение общего уровня стресса</li>
      <li>💪 Развитие навыков самопомощи</li>
      <li>🌟 Улучшение общего самочувствия</li>
`;
      }
      htmlContent += `
    </ul>
  </div>
`;

      // Контакты и CTA
      htmlContent += `
  <div class="cta">
    <h2>📞 ХОТИТЕ БОЛЬШЕ ТЕХНИК?</h2>
    <p>Это только 1 из 15+ техник в моей авторской системе!</p>
    <p>На персональной консультации подберем полную программу под вашу ситуацию.</p>
    <p><strong>👩‍⚕️ Анастасия Попова</strong><br>Эксперт по дыхательным практикам<br>Telegram: @NastuPopova</p>
    <a href="https://t.me/NastuPopova" class="button">💬 Записаться на консультацию</a>
    <a href="https://t.me/NastuPopova" class="button">📞 Задать вопрос</a>
    <p>💝 Консультация поможет: подобрать техники под вашу проблему • составить план на 30 дней • отследить прогресс • ответить на все вопросы</p>
  </div>
`;

      // Футер
      htmlContent += `
  <div class="footer">
    <p>Создано специально для вас • ${new Date().toLocaleDateString('ru-RU')}</p>
    <p>Дыхательные практики дополняют, но не заменяют медицинское лечение</p>
    <p><strong>🌬️ Начните прямо сейчас - ваше дыхание изменит вашу жизнь!</strong></p>
  </div>
</body>
</html>
`;

      // Запись HTML-файла
      fs.writeFileSync(filePath, htmlContent, 'utf8');
      console.log(`✅ Минималистичный HTML создан: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Ошибка генерации минималистичного HTML:', {
        error: error.message,
        stack: error.stack,
        userId,
        analysisResult,
        surveyData
      });
      throw error;
    }
  }

  /**
   * Получает одну мастер-технику для пользователя
   */
  getMasterTechnique(analysisResult, surveyData) {
    if (!analysisResult || !surveyData) {
      throw new Error('Недостаточно данных для выбора техники');
    }
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    
    if (isChildFlow) {
      return this.childMasterTechniques[primaryIssue] || this.childMasterTechniques['anxiety'];
    } else {
      return this.masterTechniques[primaryIssue] || this.masterTechniques['chronic_stress'];
    }
  }

  /**
   * Создает персонализированный заголовок
   */
  generatePersonalizedTitle(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue;
    const segment = analysisResult.segment;

    if (isChildFlow) {
      const titles = {
        'anxiety': '🧸 СПОКОЙНЫЙ РЕБЕНОК',
        'hyperactivity': '🎯 КОНЦЕНТРАЦИЯ РЕБЕНКА', 
        'sleep_problems': '😴 КРЕПКИЙ СОН РЕБЕНКА',
        'weak_immunity': '🌳 ЗДОРОВЫЙ РЕБЕНОК'
      };
      return titles[primaryIssue] || '🌟 ДЫХАНИЕ ДЛЯ РЕБЕНКА';
    } else {
      if (segment === 'HOT_LEAD') {
        const hotTitles = {
          'chronic_stress': '🚨 SOS ОТ СТРЕССА',
          'anxiety': '🚨 SOS ОТ ПАНИКИ',
          'insomnia': '🚨 SOS ДЛЯ СНА',
          'breathing_issues': '🚨 SOS ДЫХАНИЕ',
          'high_pressure': '🚨 SOS ДАВЛЕНИЕ',
          'weak_immunity': '🚨 SOS ИММУНИТЕТ'
        };
        return hotTitles[primaryIssue] || '🚨 SOS ТЕХНИКА';
      } else {
        const titles = {
          'chronic_stress': '🌬️ АНТИСТРЕСС ДЫХАНИЕ',
          'anxiety': '🌬️ СТОП ПАНИКА',
          'insomnia': '🌬️ ДЫХАНИЕ ДЛЯ СНА',
          'breathing_issues': '🌬️ ПРАВИЛЬНОЕ ДЫХАНИЕ',
          'high_pressure': '🌬️ ДЫХАНИЕ ОТ ДАВЛЕНИЯ',
          'fatigue': '🌬️ ЭНЕРГИЯ ДЫХАНИЯ',
          'weak_immunity': '🌬️ УКРЕПЛЕНИЕ ИММУНИТЕТА'
        };
        return titles[primaryIssue] || '🌬️ ДЫХАТЕЛЬНАЯ ТЕХНИКА';
      }
    }
  }

  /**
   * Создает персонализированный подзаголовок
   */
  generatePersonalizedSubtitle(analysisResult, surveyData) {
    const technique = this.getMasterTechnique(analysisResult, surveyData);
    return `${technique.result} за ${technique.duration}`;
  }

  /**
   * Отправляет статичные PDF
   */
  async sendAdditionalPDF(ctx, pdfType) {
    console.log(`📥 Отправка статичного PDF: ${pdfType}`);
    
    const pdf = this.additionalMaterials[pdfType];
    if (!pdf) {
      console.error(`❌ PDF с типом ${pdfType} не найден в additionalMaterials`);
      console.log('Доступные PDF:', Object.keys(this.additionalMaterials));
      
      await ctx.reply('⚠️ Запрошенный PDF временно недоступен. Свяжитесь с @NastuPopova для получения бонуса!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')]
        ])
      });
      return;
    }
    
    const message = `🎁 *ДОПОЛНИТЕЛЬНЫЙ БОНУС*\n\n` +
      `${pdf.title}\n\n` +
      `📝 *Что внутри:* ${pdf.description}\n\n` +
      `💡 *Дополняет ваш персональный гид* - используйте оба материала для максимального эффекта!\n\n` +
      `📞 *Хотите еще больше техник?* Запишитесь на консультацию: @NastuPopova`;
    
    try {
      console.log(`📤 Отправляем PDF по URL: ${pdf.url}`);
      
      await ctx.replyWithDocument({ url: pdf.url }, {
        caption: message,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📞 Записаться на консультацию', 'https://t.me/NastuPopova')],
          [Markup.button.callback('🔙 К материалам', 'more_materials')]
        ])
      });

      console.log(`✅ Отправлен статичный PDF: ${pdf.title} для пользователя ${ctx.from.id}`);
      
    } catch (error) {
      console.error(`❌ Ошибка отправки PDF по URL: ${error.message}`);
      
      // Fallback - отправляем только ссылку
      await ctx.reply(message + `\n\n📥 [Скачать PDF](${pdf.url})`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📥 Открыть PDF', pdf.url)],
          [Markup.button.url('📞 Написать Анастасии', 'https://t.me/NastuPopova')]
        ])
      });
      
      console.log(`✅ Отправлена ссылка на PDF: ${pdf.title}`);
    }
  }

  /**
   * Генерирует план на 3 дня
   */
  generate3DayPlan(technique, isChildFlow, segment) {
    if (isChildFlow) {
      return {
        day1: {
          title: 'День 1: Знакомство с техникой',
          tasks: [
            'Покажите ребенку технику в игровой форме',
            'Сделайте 1 раз вместе, не настаивайте',
            'Похвалите за любое участие'
          ],
          goal: 'Ребенок понял, что это игра'
        },
        day2: {
          title: 'День 2: Привыкание',
          tasks: [
            'Повторите технику 2-3 раза в течение дня',
            'Используйте при капризах или перед сном',
            'Добавьте звуки или движения для интереса'
          ],
          goal: 'Ребенок помнит технику'
        },
        day3: {
          title: 'День 3: Закрепление',
          tasks: [
            'Ребенок показывает технику самостоятельно',
            'Используйте в разных ситуациях',
            'Отметьте улучшения в поведении'
          ],
          goal: 'Техника стала привычкой'
        }
      };
    } else {
      if (segment === 'HOT_LEAD') {
        return {
          day1: {
            title: 'День 1: Экстренная помощь',
            tasks: [
              'Освойте технику прямо сейчас',
              'Применяйте при каждом приступе стресса/паники',
              'Практикуйте 5-6 раз в течение дня'
            ],
            goal: 'Техника работает в критической ситуации'
          },
          day2: {
            title: 'День 2: Профилактика',
            tasks: [
              'Делайте технику каждые 2-3 часа',
              'Не ждите стресса - практикуйте заранее',
              'Отметьте снижение интенсивности симптомов'
            ],
            goal: 'Приступы стали реже и слабее'
          },
          day3: {
            title: 'День 3: Закрепление',
            tasks: [
              'Техника стала автоматической',
              'Используйте при первых признаках напряжения',
              'Оцените общее улучшение состояния'
            ],
            goal: 'Контроль над ситуацией восстановлен'
          }
        };
      } else {
        return {
          day1: {
            title: 'День 1: Освоение',
            tasks: [
              'Изучите технику, потренируйтесь 3-4 раза',
              'Найдите удобное место и время для практики',
              'Отметьте первые ощущения'
            ],
            goal: 'Техника понятна и выполнима'
          },
          day2: {
            title: 'День 2: Регулярность',
            tasks: [
              'Практикуйте в одно и то же время',
              'Используйте при стрессе или проблемах',
              'Заметьте изменения в самочувствии'
            ],
            goal: 'Техника входит в привычку'
          },
          day3: {
            title: 'День 3: Интеграция',
            tasks: [
              'Применяйте технику в разных ситуациях',
              'Адаптируйте под свой ритм жизни',
              'Планируйте дальнейшую практику'
            ],
            goal: 'Техника стала частью жизни'
          }
        };
      }
    }
  }

  /**
   * Получает бонус для пользователя
   */
  getBonusForUser(analysisResult, surveyData) {
    const title = this.generatePersonalizedTitle(analysisResult, surveyData);
    const subtitle = this.generatePersonalizedSubtitle(analysisResult, surveyData);
    const technique = this.getMasterTechnique(analysisResult, surveyData);
    
    return {
      id: `personalized_${analysisResult.primaryIssue || 'general'}_${analysisResult.segment}`,
      title: title,
      subtitle: subtitle,
      description: `Персонализированная техника для решения проблемы: ${technique.problem}`,
      technique: technique,
      target_segments: [analysisResult.segment],
      approach: 'minimalist',
      primary_issue: analysisResult.primaryIssue,
      is_child: analysisResult.analysisType === 'child'
    };
  }

  /**
   * Генерирует сообщение о бонусе
   */
  generateBonusMessage(bonus, analysisResult) {
    const segment = analysisResult.segment;
    const isHotLead = segment === 'HOT_LEAD';
    const isChildFlow = analysisResult.analysisType === 'child';
    const technique = bonus.technique;
    
    let message = `🎁 *ВАША ПЕРСОНАЛЬНАЯ ТЕХНИКА ГОТОВА!*\n\n`;
    
    message += `${bonus.title}\n`;
    message += `${bonus.subtitle}\n\n`;
    
    message += `🎯 *Ваша проблема:* ${technique.problem}\n`;
    message += `✨ *Решение:* ${technique.name}\n`;
    message += `⏱️ *Время:* ${technique.duration}\n`;
    message += `🎉 *Результат:* ${technique.result}\n\n`;
    
    message += `📖 *В вашем персональном гиде:*\n`;
    if (isChildFlow) {
      message += `• 🎮 Игровая техника специально для вашего ребенка\n`;
      message += `• 👨‍👩‍👧‍👦 Подробные инструкции для родителей\n`;
      message += `• 📅 План освоения на 3 дня\n`;
      message += `• 💡 Советы по мотивации ребенка\n\n`;
    } else {
      message += `• 🌬️ Одна мощная техника с пошаговой инструкцией\n`;
      message += `• 🧠 Научное обоснование эффективности\n`;
      message += `• 📅 План освоения на 3 дня\n`;
      message += `• 🎯 Четкие ожидаемые результаты\n\n`;
    }
    
    if (isHotLead) {
      message += `⚡ *СРОЧНАЯ РЕКОМЕНДАЦИЯ:*\n`;
      message += `Ваши ответы показывают критический уровень проблемы. `;
      message += `Эта техника поможет уже через 2-3 минуты!\n\n`;
      message += `🚨 *Начните прямо сейчас!*\n\n`;
    } else {
      message += `💫 *Почему именно эта техника:*\n`;
      message += `Подобрана специально под ваш профиль и основную проблему. `;
      message += `Простая, но очень эффективная!\n\n`;
    }
    
    message += `📞 *ХОТИТЕ БОЛЬШЕ ТЕХНИК?*\n`;
    message += `Ранее отдельные бонусы для взрослых и детей теперь доступны как дополнительные материалы ниже.\n\n`;
    message += `На персональной консультации получите:\n`;
    message += `• Полную программу под вашу ситуацию\n`;
    message += `• План на 30 дней\n`;
    message += `• Контроль прогресса\n`;
    message += `• Ответы на все вопросы\n\n`;
    message += `👩‍⚕️ *Записаться:* @NastuPopova`;
    
    return message;
  }

  /**
   * Генерирует клавиатуру для бонусного сообщения
   */
  generateBonusKeyboard(bonus, deliveryMethod) {
    const keyboard = [
      [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
      [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')]
    ];

    // Если доставка через файл и сегмент не HOT_LEAD, добавляем кнопку для скачивания
    if (deliveryMethod === 'file' && bonus.target_segments[0] !== 'HOT_LEAD') {
      keyboard.unshift([
        Markup.button.callback('📥 Получить гид', `download_${bonus.id}`)
      ]);
    }

    return Markup.inlineKeyboard(keyboard);
  }

  /**
   * Отправляет HTML-файл (называемый PDF в контексте бота)
   */
  async sendPDFFile(ctx, bonus) {
    try {
      console.log(`📝 Генерация минималистичного гида для пользователя ${ctx.from.id}`);
      
      const filePath = await this.generatePersonalizedHTML(
        ctx.from.id,
        ctx.session.analysisResult,
        ctx.session.answers
      );

      console.log(`📤 Отправляем минималистичный файл: ${filePath}`);

      const isChildFlow = ctx.session.analysisResult.analysisType === 'child';
      const isHotLead = ctx.session.analysisResult.segment === 'HOT_LEAD';
      const technique = bonus.technique;

      let caption = `🎁 *${bonus.title}*\n\n`;
      
      if (isChildFlow) {
        caption += `🧸 Персональная игровая техника для вашего ребенка!\n\n`;
      } else {
        caption += `🌬️ Ваша персональная дыхательная техника!\n\n`;
      }
      
      caption += `✨ *В файле:*\n`;
      caption += `• ${technique.name}\n`;
      caption += `• Пошаговая инструкция\n`;
      caption += `• План освоения на 3 дня\n`;
      caption += `• Ожидаемые результаты\n\n`;
      
      if (isHotLead) {
        caption += `⚡ *ВАЖНО:* Начните с техники прямо сейчас!\n\n`;
      }
      
      caption += `📱 Откройте файл в браузере для лучшего отображения.\n\n`;
      caption += `📞 Больше техник у @NastuPopova`;

      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption: caption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
            [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')]
          ])
        }
      );
      
      console.log(`✅ Минималистичный гид отправлен: ${bonus.title}`);
      
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Временный файл удален: ${filePath}`);
          }
        } catch (cleanupError) {
          console.error('⚠️ Ошибка удаления временного файла:', cleanupError);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Ошибка отправки минималистичного гида:', error.message);
      
      const technique = bonus.technique;
      let fallbackMessage = `⚠️ Файл временно недоступен, но вот ваша техника:\n\n`;
      fallbackMessage += `🎯 *${technique.name}*\n\n`;
      fallbackMessage += `*Пошаговая инструкция:*\n`;
      technique.steps.forEach((step, index) => {
        fallbackMessage += `${index + 1}. ${step}\n`;
      });
      fallbackMessage += `\n⏱️ *Время:* ${technique.duration}\n`;
      fallbackMessage += `✨ *Результат:* ${technique.result}\n\n`;
      fallbackMessage += `💬 Напишите @NastuPopova за полным гидом и планом на 3 дня!`;
      
      await ctx.reply(fallbackMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/NastuPopova')],
          [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')]
        ])
      });
    }
  }

  /**
   * Показывает дополнительные доступные материалы
   */
  async showMoreMaterials(ctx) {
    const isChildFlow = ctx.session?.analysisResult?.analysisType === 'child';
    const primaryIssue = ctx.session?.analysisResult?.primaryIssue;
    const translatedIssue = this.translateValue(primaryIssue);
    
    let message = `🎁 *ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ*\n\n`;
    
    message += `💡 *Вы получили персональный HTML-гид!*\n`;
    message += `Это только 1 из 15+ техник в авторской системе. Ранее отдельные бонусы для взрослых и детей теперь доступны здесь.\n\n`;
    
    // БЕСПЛАТНЫЕ БОНУСЫ
    message += `🎁 *БЕСПЛАТНЫЕ БОНУСЫ:*\n`;
    
    if (isChildFlow) {
      message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
      message += `• 📄 PDF "Дыхательные игры для детей" (ранее детский бонус)\n`;
      message += `• 🎥 Видео "Как научить ребенка дышать" (3 мин)\n`;
      message += `• 📝 Чек-лист "Признаки стресса у детей"\n\n`;
    } else {
      message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
      message += `• 📄 PDF "Антистресс дыхание" (ранее взрослый бонус)\n`;
      message += `• 🎥 Видео "3 техники на каждый день" (5 мин)\n`;
      message += `• 📝 Чек-лист "Самодиагностика дыхания"\n\n`;
    }
    
    // ПЛАТНАЯ ПРОГРАММА
    if (isChildFlow) {
      message += `👶 *ПОЛНАЯ ДЕТСКАЯ ПРОГРАММА (от 3500₽):*\n`;
      message += `• 🎮 15 игровых техник для разных ситуаций\n`;
      message += `• 😴 5 специальных техник для сна\n`;
      message += `• 🎯 Техники для концентрации в учебе\n`;
      message += `• 👨‍👩‍👧‍👦 Семейные дыхательные практики\n`;
      message += `• 📱 Мобильное приложение с напоминаниями\n`;
      message += `• 🎥 12 видеоуроков с демонстрацией\n`;
      message += `• 📞 3 индивидуальные консультации детского специалиста\n`;
      message += `• 📊 Система отслеживания прогресса\n\n`;
    } else {
      message += `🧘 *ПОЛНАЯ ПРОГРАММА "${translatedIssue.toUpperCase()}" (от 3500₽):*\n`;
      message += `• 🚨 5 экстренных техник (2-5 мин)\n`;
      message += `• 📅 7 ежедневных практик (5-20 мин)\n`;
      message += `• 🎯 5 специализированных техник под вашу проблему\n`;
      message += `• 🔧 Коррекция неправильных привычек дыхания\n`;
      message += `• 📊 Система отслеживания прогресса\n`;
      message += `• 🎥 20 видеоуроков с правильной техникой\n`;
      message += `• 📞 5 персональных консультаций с экспертом\n`;
      message += `• 📱 Доступ к закрытому сообществу\n\n`;
    }
    
    // РЕЗУЛЬТАТЫ
    message += `📈 *РЕЗУЛЬТАТ ЧЕРЕЗ 30 ДНЕЙ:*\n`;
    message += `• Полный контроль над своим состоянием\n`;
    message += `• Навыки быстрой самопомощи в любой ситуации\n`;
    message += `• Значительное улучшение качества жизни\n`;
    message += `• Снижение зависимости от лекарств\n\n`;
    
    // АКЦИЯ
    message += `🔥 *АКЦИЯ СЕГОДНЯ:*\n`;
    message += `💝 Консультация: БЕСПЛАТНО (обычно 2000₽)\n`;
    message += `📦 Программа: скидка 30% при записи сегодня\n`;
    message += `🎁 Все бонусы: в подарок при покупке программы\n\n`;
    
    message += `👩‍⚕️ *Записаться к Анастасии:* @NastuPopova`;

    // Генерируем клавиатуру с бонусами
    const keyboard = [];
    
    // Первая строка - основные действия
    keyboard.push([
      Markup.button.callback('🔥 Хочу полную программу!', 'contact_request')
    ]);
    
    // Вторая строка - бесплатные бонусы
    if (isChildFlow) {
      keyboard.push([
        Markup.button.callback('📄 PDF: Игры для детей', 'download_pdf_child_games')
      ]);
    } else {
      keyboard.push([
        Markup.button.callback('📄 PDF: Антистресс', 'download_pdf_adult_antistress')
      ]);
    }
    
    // Третья строка - контакты
    keyboard.push([
      Markup.button.url('💬 Записаться на консультацию', 'https://t.me/NastuPopova')
    ]);
    
    // Четвертая строка - навигация
    keyboard.push([
      Markup.button.callback('🔙 К моей технике', 'back_to_results')
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  /**
   * Вспомогательные методы
   */
  translateValue(value) {
    return config.TRANSLATIONS[value] || value;
  }

  translateArray(values) {
    if (!values || !Array.isArray(values)) return [];
    return values.map(value => this.translateValue(value));
  }

  getStressDescription(level) {
    if (level >= 8) return 'критически высокий';
    if (level >= 6) return 'высокий';
    if (level >= 4) return 'умеренный';
    return 'низкий';
  }

  /**
   * Логирование доставки бонусов
   */
  logBonusDelivery(userId, bonusId, deliveryMethod, segment, primaryIssue) {
    const logEntry = {
      user_id: userId,
      bonus_id: bonusId,
      delivery_method: deliveryMethod,
      segment: segment,
      primary_issue: primaryIssue,
      approach: 'minimalist',
      technique_count: 1,
      timestamp: new Date().toISOString()
    };
    this.deliveryLog.push(logEntry);
    console.log(`📊 Лог доставки минималистичного бонуса:`, logEntry);
  }

  /**
   * Получение статистики
   */
  getBonusStats() {
    const minimalistCount = this.deliveryLog.filter(log => log.approach === 'minimalist').length;
    const issueBreakdown = {};
    
    this.deliveryLog.forEach(log => {
      if (log.primary_issue) {
        issueBreakdown[log.primary_issue] = (issueBreakdown[log.primary_issue] || 0) + 1;
      }
    });
    
    return {
      ...this.stats,
      delivery_count: this.deliveryLog.length,
      minimalist_count: minimalistCount,
      issue_breakdown: issueBreakdown,
      approach: 'minimalist',
      conversion_focus: 'single_technique_mastery'
    };
  }

  /**
   * Обработка запроса на скачивание
   */
  async handleDownloadRequest(ctx, bonusId) {
    try {
      console.log(`📥 Запрос на скачивание персонального гида: ${bonusId}`);
      
      if (!ctx.session?.analysisResult) {
        await ctx.answerCbQuery('⚠️ Пройдите анкету заново', { show_alert: true });
        return;
      }

      const bonus = this.getBonusForUser(
        ctx.session.analysisResult,
        ctx.session.answers
      );

      await ctx.answerCbQuery('📥 Готовлю ваш персональный гид...');
      await this.sendPDFFile(ctx, bonus);
      
      this.logBonusDelivery(
        ctx.from.id,
        bonus.id,
        'file',
        ctx.session.analysisResult.segment,
        ctx.session.analysisResult.primaryIssue
      );
      
    } catch (error) {
      console.error('❌ Ошибка handleDownloadRequest:', error);
      await ctx.answerCbQuery('❌ Ошибка загрузки. Попробуйте позже.', { show_alert: true });
    }
  }
}

module.exports = PDFBonusManager;
