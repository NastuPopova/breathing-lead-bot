const { Markup } = require('telegraf');
const fs = require('fs');
const config = require('../../config');

class PDFBonusManager {
  constructor() {
    // Master techniques for adults
    this.masterTechniques = {
      'chronic_stress': {
        name: 'Дыхание "4-7-8" - мгновенное успокоение',
        problem: 'хронический стресс и напряжение',
        result: 'Снятие стресса за 2-3 минуты',
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
      }
    };

    // Child techniques
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
   * Generates personalized HTML content
   */
  async generatePersonalizedHTML(userId, analysisResult, surveyData) {
    try {
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp');
      }

      const filePath = `./temp/bonus_${userId}.html`;
      
      // Get personalized data
      const technique = this.getMasterTechnique(analysisResult, surveyData);
      const title = this.generatePersonalizedTitle(analysisResult, surveyData);
      const subtitle = this.generatePersonalizedSubtitle(analysisResult, surveyData);
      const isChildFlow = analysisResult.analysisType === 'child';
      const threeDayPlan = this.generate3DayPlan(technique, isChildFlow, analysisResult.segment);

      // Function to clean text from emojis
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f0f2f5;
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            color: #1a3c87;
            margin: 0;
        }
        .header h2 {
            font-size: 20px;
            color: #4a5568;
            margin: 10px 0 0;
            font-weight: normal;
        }
        .section-title {
            font-size: 22px;
            font-weight: bold;
            color: #1a3c87;
            margin: 30px 0 15px;
        }
        .urgent-banner {
            background: #fefcbf;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 5px solid #ed8936;
        }
        .technique-details {
            background: #edf2ff;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .technique-details ul {
            padding-left: 20px;
            margin: 15px 0;
        }
        .technique-details li {
            margin-bottom: 10px;
        }
        .info-box {
            background: #e6fffa;
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
        }
        .day-plan {
            background: #f7fafc;
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
        }
        .day-plan ul {
            padding-left: 20px;
            margin: 10px 0;
        }
        .contact-section {
            text-align: center;
            margin: 40px 0;
            background: #4c51bf;
            padding: 30px;
            border-radius: 15px;
            color: white;
        }
        .cta-button {
            display: inline-block;
            background: #48bb78;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            margin: 10px;
            font-weight: bold;
            transition: background 0.3s;
        }
        .cta-button:hover {
            background: #38a169;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${cleanText(title)}</h1>
            <h2>${cleanText(subtitle)}</h2>
            <p>Ваша персональная техника дыхания</p>
        </div>
`;

      // Urgent banner for HOT_LEAD
      if (analysisResult.segment === 'HOT_LEAD') {
        htmlContent += `
        <div class="urgent-banner">
            <p><strong>⚡ СРОЧНО:</strong> Ваши ответы показывают критический уровень проблемы.</p>
            <p>Освойте эту технику прямо сейчас - она поможет уже через 2-3 минуты!</p>
        </div>
`;
      }

      // User profile
      htmlContent += `
        <div class="section-title">📊 Ваш персональный профиль</div>
        <div class="info-box">
`;
      if (isChildFlow) {
        if (surveyData.child_age_detail) {
          htmlContent += `<p><strong>Возраст ребенка:</strong> ${this.translateValue(surveyData.child_age_detail)}</p>`;
        }
        if (surveyData.child_problems_detailed) {
          const problems = this.translateArray(surveyData.child_problems_detailed).slice(0, 2).join(', ');
          htmlContent += `<p><strong>Основные проблемы:</strong> ${problems}</p>`;
        }
        if (surveyData.child_parent_involvement) {
          htmlContent += `<p><strong>Кто занимается:</strong> ${this.translateValue(surveyData.child_parent_involvement)}</p>`;
        }
      } else {
        if (surveyData.age_group) {
          htmlContent += `<p><strong>Возраст:</strong> ${this.translateValue(surveyData.age_group)}</p>`;
        }
        if (surveyData.stress_level) {
          const stressDesc = this.getStressDescription(surveyData.stress_level);
          htmlContent += `<p><strong>Уровень стресса:</strong> ${surveyData.stress_level}/10 (${stressDesc})</p>`;
        }
        if (surveyData.current_problems) {
          const problems = this.translateArray(surveyData.current_problems).slice(0, 2).join(', ');
          htmlContent += `<p><strong>Проблемы:</strong> ${problems}</p>`;
        }
      }

      const segmentNames = {
        'HOT_LEAD': 'Требует срочного внимания',
        'WARM_LEAD': 'Активно мотивирован к изменениям',
        'COLD_LEAD': 'Умеренный интерес к практикам',
        'NURTURE_LEAD': 'Долгосрочное развитие'
      };

      htmlContent += `
            <p><strong>Категория:</strong> ${segmentNames[analysisResult.segment]}</p>
            <p><strong>Персональная проблема:</strong> ${technique.problem}</p>
        </div>
`;

      // Main technique
      htmlContent += `
        <div class="section-title">${technique.name}</div>
        <div class="technique-details">
            <p><strong>Решает проблему:</strong> ${technique.problem}</p>
            <ul>
`;
      technique.steps.forEach(step => {
        htmlContent += `<li>${step}</li>`;
      });
      htmlContent += `
            </ul>
            <p><strong>⏱️ Время выполнения:</strong> ${technique.duration}</p>
            <p><strong>✨ Результат:</strong> ${technique.timeframe}</p>
            <p><strong>💡 Научное обоснование:</strong> ${technique.science || 'Проверенная техника с доказанной эффективностью'}</p>
`;
      if (technique.emergency_note) {
        htmlContent += `<p><strong>⚠️ Важно:</strong> ${technique.emergency_note}</p>`;
      }
      if (technique.parent_tip && isChildFlow) {
        htmlContent += `<p><strong>👨‍👩‍👧‍👦 Совет родителям:</strong> ${technique.parent_tip}</p>`;
      }
      htmlContent += `
        </div>
`;

      // 3-day plan
      htmlContent += `
        <div class="section-title">📅 ПЛАН ОСВОЕНИЯ НА 3 ДНЯ</div>
`;
      Object.entries(threeDayPlan).forEach(([day, plan]) => {
        htmlContent += `
        <div class="day-plan">
            <h3>${plan.title}</h3>
            <ul>
`;
        plan.tasks.forEach(task => {
          htmlContent += `<li>${task}</li>`;
        });
        htmlContent += `
            </ul>
            <p><strong>🎯 Цель дня:</strong> ${plan.goal}</p>
        </div>
`;
      });

      // Expected results
      htmlContent += `
        <div class="section-title">🎯 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ</div>
        <div class="info-box">
`;
      if (isChildFlow) {
        htmlContent += `
            <p>📈 Улучшение поведения через 2-3 дня</p>
            <p>😴 Более спокойный сон и засыпание</p>
            <p>🎯 Развитие навыков самоуспокоения</p>
            <p>👨‍👩‍👧‍👦 Укрепление связи с родителями</p>
`;
      } else {
        htmlContent += `
            <p>⚡ ${technique.result}</p>
            <p>📈 Снижение общего уровня стресса</p>
            <p>💪 Развитие навыков самопомощи</p>
            <p>🌟 Улучшение общего самочувствия</p>
`;
      }
      htmlContent += `
        </div>
`;

      // Contact section and CTA
      htmlContent += `
        <div class="contact-section">
            <div class="section-title" style="color: white; margin-bottom: 25px;">
                📞 ХОТИТЕ БОЛЬШЕ ТЕХНИК?
            </div>
            <p style="font-size: 18px; margin-bottom: 25px;">
                Это только 1 из 15+ техник в моей авторской системе!<br>
                На персональной консультации подберем полную программу под вашу ситуацию.
            </p>
            <div style="margin: 30px 0;">
                <p style="font-size: 20px; font-weight: bold;">👩‍⚕️ Анастасия Попова</p>
                <p style="font-size: 16px; margin: 10px 0;">Эксперт по дыхательным практикам</p>
                <p style="font-size: 16px;">Telegram: @NastuPopova</p>
            </div>
            <div style="margin-top: 30px;">
                <a href="https://t.me/NastuPopova" class="cta-button">💬 Записаться на консультацию</a>
                <a href="https://t.me/NastuPopova" class="cta-button">📞 Задать вопрос</a>
            </div>
            <p style="font-size: 14px; margin-top: 30px; opacity: 0.9;">
                💝 Консультация поможет: подобрать техники под вашу проблему • составить план на 30 дней • 
                отследить прогресс • ответить на все вопросы
            </p>
        </div>
`;

      // Footer
      htmlContent += `
        <div class="footer">
            <p><strong>Создано специально для вас</strong> • ${new Date().toLocaleDateString('ru-RU')}</p>
            <p>Дыхательные практики дополняют, но не заменяют медицинское лечение</p>
            <p style="margin-top: 15px; color: #667eea;">
                🌬️ Начните прямо сейчас - ваше дыхание изменит вашу жизнь!
            </p>
        </div>
    </div>
</body>
</html>
`;

      // Write HTML file
      fs.writeFileSync(filePath, htmlContent, 'utf8');
      console.log(`✅ Минималистичный HTML создан: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Ошибка генерации минималистичного HTML:', error);
      throw error;
    }
  }

  /**
   * Gets one master technique for the user
   */
  getMasterTechnique(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'chronic_stress';
    
    if (isChildFlow) {
      return this.childMasterTechniques[primaryIssue] || this.childMasterTechniques['anxiety'];
    } else {
      return this.masterTechniques[primaryIssue] || this.masterTechniques['chronic_stress'];
    }
  }

  /**
   * Creates personalized title
   */
  generatePersonalizedTitle(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue;
    const segment = analysisResult.segment;

    if (isChildFlow) {
      const titles = {
        'anxiety': '🧸 СПОКОЙНЫЙ РЕБЕНОК',
        'hyperactivity': '🎯 КОНЦЕНТРАЦИЯ РЕБЕНКА', 
        'sleep_problems': '😴 КРЕПКИЙ СОН РЕБЕНКА'
      };
      return titles[primaryIssue] || '🌟 ДЫХАНИЕ ДЛЯ РЕБЕНКА';
    } else {
      if (segment === 'HOT_LEAD') {
        const hotTitles = {
          'chronic_stress': '🚨 SOS ОТ СТРЕССА',
          'anxiety': '🚨 SOS ОТ ПАНИКИ',
          'insomnia': '🚨 SOS ДЛЯ СНА',
          'breathing_issues': '🚨 SOS ДЫХАНИЕ',
          'high_pressure': '🚨 SOS ДАВЛЕНИЕ'
        };
        return hotTitles[primaryIssue] || '🚨 SOS ТЕХНИКА';
      } else {
        const titles = {
          'chronic_stress': '🌬️ АНТИСТРЕСС ДЫХАНИЕ',
          'anxiety': '🌬️ СТОП ПАНИКА',
          'insomnia': '🌬️ ДЫХАНИЕ ДЛЯ СНА',
          'breathing_issues': '🌬️ ПРАВИЛЬНОЕ ДЫХАНИЕ',
          'high_pressure': '🌬️ ДЫХАНИЕ ОТ ДАВЛЕНИЯ',
          'fatigue': '🌬️ ЭНЕРГИЯ ДЫХАНИЯ'
        };
        return titles[primaryIssue] || '🌬️ ДЫХАТЕЛЬНАЯ ТЕХНИКА';
      }
    }
  }

  /**
   * Creates personalized subtitle
   */
  generatePersonalizedSubtitle(analysisResult, surveyData) {
    const technique = this.getMasterTechnique(analysisResult, surveyData);
    return `${technique.result} за ${technique.duration}`;
  }

  /**
   * Generates 3-day plan
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
   * Gets bonus for user
   */
  getBonusForUser(analysisResult, surveyData) {
    const title = this.generatePersonalizedTitle(analysisResult, surveyData);
    const subtitle = this.generatePersonalizedSubtitle(analysisResult, surveyData);
    const technique = this.getMasterTechnique(analysisResult, surveyData);
    
    return {
      id: `minimalist_${analysisResult.primaryIssue || 'general'}_${analysisResult.segment}`,
      title: title,
      subtitle: subtitle,
      description: `Одна мощная техника для решения проблемы: ${technique.problem}`,
      technique: technique,
      target_segments: [analysisResult.segment],
      approach: 'minimalist',
      primary_issue: analysisResult.primaryIssue,
      is_child: analysisResult.analysisType === 'child'
    };
  }

  /**
   * Generates bonus message
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
    message += `Это только 1 из 15+ техник в авторской системе Анастасии Поповой.\n\n`;
    message += `На персональной консультации получите:\n`;
    message += `• Полную программу под вашу ситуацию\n`;
    message += `• План на 30 дней\n`;
    message += `• Контроль прогресса\n`;
    message += `• Ответы на все вопросы\n\n`;
    message += `👩‍⚕️ *Записаться:* @NastuPopova`;
    
    return message;
  }

  /**
   * Sends PDF file (HTML in this case)
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
            [Markup.button.callback('🎁 Что еще доступно?', 'more_materials')]
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
   * Shows more available materials
   */
  async showMoreMaterials(ctx) {
    const isChildFlow = ctx.session?.analysisResult?.analysisType === 'child';
    const primaryIssue = ctx.session?.analysisResult?.primaryIssue;
    const translatedIssue = this.translateValue(primaryIssue);
    
    let message = `🎁 *ЧТО ЕЩЕ ДОСТУПНО?*\n\n`;
    
    message += `💡 *Вы получили 1 из 15+ техник!*\n\n`;
    
    if (isChildFlow) {
      message += `👶 *Полная детская программа включает:*\n`;
      message += `• 🎮 5 игровых техник для разных ситуаций\n`;
      message += `• 😴 Специальные техники для сна\n`;
      message += `• 🎯 Техники для концентрации в учебе\n`;
      message += `• 👨‍👩‍👧‍👦 Семейные дыхательные практики\n`;
      message += `• 📱 Мобильное приложение с напоминаниями\n`;
      message += `• 🎥 Видеоуроки с демонстрацией\n`;
      message += `• 📞 Индивидуальные консультации детского специалиста\n\n`;
    } else {
      message += `🧘 *Полная программа для "${translatedIssue}" включает:*\n`;
      message += `• 🚨 5 экстренных техник (2-5 мин)\n`;
      message += `• 📅 7 ежедневных практик (5-20 мин)\n`;
      message += `• 🎯 3 специализированные техники под вашу проблему\n`;
      message += `• 🔧 Коррекция неправильных привычек дыхания\n`;
      message += `• 📊 Система отслеживания прогресса\n`;
      message += `• 🎥 Видеоуроки с правильной техникой\n`;
      message += `• 📞 Персональные консультации с экспертом\n\n`;
    }
    
    message += `📈 *Результат через 30 дней:*\n`;
    message += `• Полный контроль над своим состоянием\n`;
    message += `• Навыки быстрой самопомощи\n`;
    message += `• Улучшение качества жизни\n`;
    message += `• Снижение зависимости от лекарств\n\n`;
    
    message += `💝 *Стоимость полной программы:* от 3500₽\n`;
    message += `🎁 *Консультация:* БЕСПЛАТНО при записи сегодня!\n\n`;
    
    message += `👩‍⚕️ *Записаться к Анастасии:* @NastuPopova`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔥 Хочу полную программу!', 'contact_request')],
        [Markup.button.url('💬 Записаться на консультацию', 'https://t.me/NastuPopova')],
        [Markup.button.callback('🔙 К моей технике', 'back_to_results')]
      ])
    });
  }

  /**
   * Helper methods
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
   * Logging for minimalist approach
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
   * Statistics
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
}

module.exports = PDFBonusManager;
