const fs = require('fs');
const Markup = require('telegraf/markup');

class PDFManager {
  constructor() {
    // URL аватарки
    this.avatarUrl = 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/images/avatar_anastasia.jpg';

    // Общий шаблон для персонализированного гида
    this.bonusesTemplate = {
      id: 'personalized_guide',
      title: '🌬️ ПЕРСОНАЛЬНЫЙ ДЫХАТЕЛЬНЫЙ ГИД',
      subtitle: 'Техника под вашу ситуацию',
      description: 'Персонализированная техника с планом на 3 дня',
      target_segments: ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'NURTURE_LEAD']
    };

    // Статичные PDF с красивыми названиями
    this.additionalMaterials = {
      'adult_antistress': {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/Базовый_гид_Антистресс_дыхание_взрослые.pdf',
        title: '📄 Базовый гид "Антистресс дыхание"',
        description: 'Универсальные техники для снятия стресса для взрослых',
        fileName: 'Базовый_гид_Антистресс_дыхание_взрослые.pdf'
      },
      'child_games': {
        url: 'https://raw.githubusercontent.com/NastuPopova/breathing-lead-bot/main/assets/pdf/Базовый_гид_Дыхательные_игры_дети.pdf',
        title: '📄 Базовый гид "Дыхательные игры"',
        description: 'Игровые техники для детей всех возрастов',
        fileName: 'Базовый_гид_Дыхательные_игры_дети.pdf'
      }
    };

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
      }
    };
  }

  // Основной метод получения бонуса для пользователя
  getBonusForUser(analysisResult, surveyData) {
    try {
      console.log(`🎁 Подбираем бонус для пользователя`);

      // Получаем технику на основе анализа
      const technique = this.getMasterTechnique(analysisResult, surveyData);

      // Генерируем персонализированные данные
      const title = this.generatePersonalizedTitle(analysisResult, surveyData);
      const subtitle = this.generatePersonalizedSubtitle(analysisResult, surveyData);

      // Определяем тип потока (взрослый/детский)
      const isChildFlow = analysisResult.analysisType === 'child';
      const segment = analysisResult.segment || 'COLD_LEAD';

      // Создаем объект бонуса
      const bonus = {
        id: this.bonusesTemplate.id,
        title: title,
        subtitle: subtitle,
        description: this.bonusesTemplate.description,
        technique: technique,
        target_segments: this.bonusesTemplate.target_segments,

        // Дополнительные метаданные
        analysisType: analysisResult.analysisType,
        primaryIssue: analysisResult.primaryIssue,
        segment: segment,
        isChildFlow: isChildFlow,

        // Для логирования и аналитики
        createdAt: new Date().toISOString(),
        fileName: this.generateBeautifulFileName(analysisResult, surveyData)
      };

      console.log(`✅ Бонус подобран: ${technique.name} для сегмента ${segment}`);
      return bonus;

    } catch (error) {
      console.error(`❌ Ошибка подбора бонуса для пользователя:`, error);

      // Возвращаем дефолтный бонус в случае ошибки
      return {
        id: this.bonusesTemplate.id,
        title: this.bonusesTemplate.title,
        subtitle: this.bonusesTemplate.subtitle,
        description: this.bonusesTemplate.description,
        technique: this.masterTechniques.chronic_stress, // дефолтная техника
        target_segments: this.bonusesTemplate.target_segments,
        analysisType: 'adult',
        primaryIssue: 'chronic_stress',
        segment: 'COLD_LEAD',
        isChildFlow: false,
        createdAt: new Date().toISOString(),
        fileName: `Дыхательный_гид_Базовый_${new Date().getDate()}.${new Date().getMonth() + 1}`
      };
    }
  }

  // Метод выбора техники
  getMasterTechnique(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'wellness';
    const techniques = isChildFlow ? this.childMasterTechniques : this.masterTechniques;
    return techniques[primaryIssue] || techniques['chronic_stress'];
  }

  // Генерация заголовка
  generatePersonalizedTitle(analysisResult, surveyData) {
    const isChildFlow = analysisResult.analysisType === 'child';
    const primaryIssue = analysisResult.primaryIssue || 'wellness';
    const problemMap = {
      chronic_stress: 'Антистресс',
      anxiety: 'От тревоги',
      insomnia: 'Для сна',
      hyperactivity: 'Гиперактивность',
      sleep_problems: 'Детский сон'
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
    const primaryIssue = analysisResult.primaryIssue || 'wellness';
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
      tantrums: 'От_капризов',
      separation_anxiety: 'От_страхов'
    };

    if (problemMap[primaryIssue]) {
      fileNameParts.push(problemMap[primaryIssue]);
    }

    const segmentMap = {
      'HOT_LEAD': 'SOS',
      'WARM_LEAD': 'Активный',
      'COLD_LEAD': 'Базовый',
      'NURTURE_LEAD': 'Профилактика'
    };

    if (segmentMap[segment]) {
      fileNameParts.push(segmentMap[segment]);
    }

    const today = new Date();
    const dateStr = `${today.getDate()}.${today.getMonth() + 1}`;
    fileNameParts.push(dateStr);

    return fileNameParts.join('_').replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_');
  }

  // Логирование доставки бонусов
  logBonusDelivery(userId, bonusId, bonusType, segment, primaryIssue) {
    const logEntry = {
      event: 'bonus_delivered',
      timestamp: new Date().toISOString(),
      user_id: userId,
      bonus_id: bonusId,
      bonus_type: bonusType,
      segment: segment,
      primary_issue: primaryIssue
    };

    console.log('📊 ДОСТАВКА БОНУСА:', JSON.stringify(logEntry, null, 2));
  }

  // Получение статистики бонусов
  getBonusStats() {
    return {
      available_bonuses: Object.keys(this.masterTechniques).length + Object.keys(this.childMasterTechniques).length,
      bonus_types: ['personalized_guide', 'static_pdf'],
      target_segments: this.bonusesTemplate.target_segments,
      last_updated: new Date().toISOString()
    };
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

    /* КРАСИВАЯ ШАПКА С АВАТАРКОЙ */
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

    /* Остальные стили */
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

  // Отправка статичных PDF
  async sendAdditionalPDF(ctx, pdfType) {
    console.log(`📥 Отправка статичного PDF: ${pdfType}`);

    const pdf = this.additionalMaterials[pdfType];
    if (!pdf) {
      console.error(`❌ PDF с типом ${pdfType} не найден в additionalMaterials`);
      console.log('Доступные PDF:', Object.keys(this.additionalMaterials));

      await ctx.reply('⚠️ Запрошенный PDF временно недоступен. Свяжитесь с [Анастасией Поповой](https://t.me/breathing_opros_bot) для получения бонуса!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
        ])
      });
      return;
    }

    const message = `🎁 *ДОПОЛНИТЕЛЬНЫЙ БОНУС*\n\n` +
      `${pdf.title}\n\n` +
      `📝 *Что внутри:* ${pdf.description}\n\n` +
      `💡 *Дополняет ваш персональный гид* - используйте оба материала для максимального эффекта!\n\n` +
      `📞 *Хотите еще больше техник?* Запишитесь к [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

    try {
      console.log(`📤 Отправляем PDF по URL: ${pdf.url}`);

      await ctx.replyWithDocument({ url: pdf.url }, {
        caption: message,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📞 Записаться к Анастасии', 'https://t.me/breathing_opros_bot')],
          [Markup.button.callback('🔙 К моей технике', 'back_to_results')]
        ])
      });

      console.log(`✅ Отправлен статичный PDF: ${pdf.title} для пользователя ${ctx.from.id}`);

    } catch (error) {
      console.error(`❌ Ошибка отправки PDF по URL: ${error.message}`);

      await ctx.reply(message + `\n\n📥 [Скачать ${pdf.fileName}](${pdf.url})`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📥 Открыть PDF', pdf.url)],
          [Markup.button.url('📞 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
        ])
      });

      console.log(`✅ Отправлена ссылка на PDF: ${pdf.title}`);
    }
  }

  // Отправка персонального PDF
  async sendPDFFile(ctx, bonus) {
    try {
      console.log(`📝 Генерация персонального гида для пользователя ${ctx.from.id}`);

      const filePath = await this.generatePersonalizedHTML(
        ctx.from.id,
        ctx.session.analysisResult,
        ctx.session.answers
      );

      console.log(`📤 Отправляем персональный файл: ${filePath}`);

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
      caption += `📞 *Больше техник у* [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

      await ctx.replyWithDocument(
        { source: filePath },
        {
          caption: caption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
            [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
            [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')]
          ])
        }
      );

      console.log(`✅ Персональный гид отправлен: ${bonus.title}`);

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
      console.error('❌ Ошибка отправки персонального гида:', error.message);

      const technique = bonus.technique;
      let fallbackMessage = `⚠️ Файл временно недоступен, но вот ваша техника:\n\n`;
      fallbackMessage += `🎯 *${technique.name}*\n\n`;
      fallbackMessage += `*Пошаговая инструкция:*\n`;
      technique.steps.forEach((step, index) => {
        fallbackMessage += `${index + 1}. ${step}\n`;
      });
      fallbackMessage += `\n⏱️ *Время:* ${technique.duration}\n`;
      fallbackMessage += `✨ *Результат:* ${technique.result}\n\n`;
      fallbackMessage += `💬 Напишите [Анастасии Поповой](https://t.me/breathing_opros_bot) за полным гидом и планом на 3 дня!`;

      await ctx.reply(fallbackMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
          [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')]
        ])
      });
    }
  }

  // Показ дополнительных материалов
  async showMoreMaterials(ctx) {
    const isChildFlow = ctx.session?.analysisResult?.analysisType === 'child';

    let message = `🎁 *ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ*\n\n`;

    message += `💡 *Вы получили персональный дыхательный гид!*\n`;
    message += `Это базовая техника. Полная система включает комплексные программы для глубокой трансформации.\n\n`;

    message += `🎁 *БЕСПЛАТНЫЕ БОНУСЫ:*\n`;

    if (isChildFlow) {
      message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
      message += `• 📄 PDF "Дыхательные игры для детей"\n`;
      message += `• 🎥 Видео "Как научить ребенка дышать" (3 мин)\n`;
      message += `• 📝 Чек-лист "Признаки стресса у детей"\n\n`;
    } else {
      message += `• 📱 Ваш персональный HTML-гид (уже получили)\n`;
      message += `• 📄 PDF "Антистресс дыхание"\n`;
      message += `• 🎥 Видео "3 техники на каждый день" (5 мин)\n`;
      message += `• 📝 Чек-лист "Самодиагностика дыхания"\n\n`;
    }

    message += `👩‍⚕️ *Записаться к* [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

    const keyboard = [
      [Markup.button.callback('📞 Записаться на консультацию', 'contact_request')],
      [isChildFlow
        ? Markup.button.callback('📄 PDF: Игры для детей', 'download_pdf_child_games')
        : Markup.button.callback('📄 PDF: Антистресс дыхание', 'download_pdf_adult_antistress')
      ],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')],
      [Markup.button.callback('🔙 К моей технике', 'back_to_results')]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });
  }

  // Генерация сообщения о бонусе
  generateBonusMessage(bonus, analysisResult) {
    const segment = analysisResult.segment;
    const isHotLead = analysisResult.segment === 'HOT_LEAD';
    const isChildFlow = analysisResult.analysisType === 'child';
    const technique = bonus.technique;

    let message = `🎁 *ВАША ПЕРСОНАЛЬНАЯ ТЕХНИКА ГОТОВА!*\n\n`;

    message += `${bonus.title}\n`;
    message += `${bonus.subtitle}\n\n`;

    message += `🎯 *Ваша проблема:* ${technique.problem}\n`;
    message += `✨ *Решение:* ${technique.name}\n`;
    message += `⏳ *Время:* ${technique.duration}\n`;
    message += `🎉 *Результат:* ${technique.result}\n\n`;

    message += `📖 *В вашем персональном гиде:*\n`;
    if (isChildFlow) {
      message += `• 🎮 Игровая техника специально для вашего ребенка\n`;
      message += `• 👨‍👩‍👧‍👦 Подробные инструкции для родителей\n`;
      message += `• 📅 План освоения на 3 дня\n`;
      message += `• 💡 Советы по мотивации ребенка\n\n`;
    } else {
      message += `• 🌬️ Одна мощная техника с пошаговой инструкцией\n`;
      message += `• 🧠 Научное обоснование\n`;
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
    message += `Дополнительные бонусы для взрослых и детей доступны в разделе материалов ниже.\n\n`;
    message += `На персональной консультации получите:\n`;
    message += `• Полная программа под вашу ситуацию\n`;
    message += `• План на 30 дней\n`;
    message += `• Контроль прогресса\n`;
    message += `• Ответы на все вопросы\n\n`;
    message += `👩‍⚕️ *[Записаться к Анастасии](https://t.me/breathing_opros_bot)*`;

    return message;
  }

  // Генерация клавиатуры для бонуса
  generateBonusKeyboard(bonus, type) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📥 Получить мой гид', `download_${bonus.id}`)],
      [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
      [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
    ]);
  }
}

module.exports = PDFManager;
