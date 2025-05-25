// Файл: lead_bot/utils/localization.js
// Модуль локализации для бота

const translations = {
  ru: {
    // Общие фразы
    welcome: 'Добро пожаловать в диагностику дыхания!',
    startSurvey: 'Начать',
    aboutSurvey: 'Подробнее',
    back: 'Назад',

    // Анализ для взрослых
    profilePrefix: 'Ваш дыхательный профиль: ',
    stressLevel: 'Уровень стресса',
    primaryIssue: 'Основная проблема',
    personalProgram: 'ПЕРСОНАЛЬНАЯ ПРОГРАММА',
    urgentTechniques: 'НАЧНИТЕ СЕГОДНЯ',
    mainProgram: 'ВАША ГЛАВНАЯ ПРОГРАММА',
    expectedResult: 'ОЖИДАЕМЫЙ РЕЗУЛЬТАТ',
    supportMaterials: 'ПЕРСОНАЛЬНЫЕ БОНУСЫ',
    nextStep: 'СЛЕДУЮЩИЙ ШАГ',

    // Анализ для детей
    childProfilePrefix: 'Детский дыхательный профиль: ',
    childAge: 'Возраст ребенка',
    childEducation: 'Обучение',
    urgentAttention: 'СРОЧНО ТРЕБУЕТСЯ ВНИМАНИЕ',
    childTechniques: 'ЭКСТРЕННЫЕ ТЕХНИКИ (начните сегодня)',
    childProgram: 'ДЕТСКАЯ ПРОГРАММА',
    childResult: 'РЕЗУЛЬТАТ',
    childMaterials: 'СПЕЦИАЛЬНЫЕ МАТЕРИАЛЫ ДЛЯ РОДИТЕЛЕЙ',
    childNextStep: 'СЛЕДУЮЩИЙ ШАГ',

    // Описания проблем
    chronic_stress: 'хроническое напряжение и стресс',
    anxiety: 'повышенная тревожность',
    insomnia: 'проблемы со сном и бессонница',
    breathing_issues: 'проблемы с дыханием',
    hyperactivity: 'гиперактивность и невнимательность',

    // Сегменты
    HOT_LEAD: 'горячий лид',
    WARM_LEAD: 'теплый лид',
    COLD_LEAD: 'холодный лид',
    NURTURE_LEAD: 'нужный лид'
  },
  en: {
    // Общие фразы
    welcome: 'Welcome to the Breathing Diagnostics!',
    startSurvey: 'Start',
    aboutSurvey: 'More Info',
    back: 'Back',

    // Анализ для взрослых
    profilePrefix: 'Your Breathing Profile: ',
    stressLevel: 'Stress Level',
    primaryIssue: 'Primary Issue',
    personalProgram: 'PERSONAL PROGRAM',
    urgentTechniques: 'START TODAY',
    mainProgram: 'YOUR MAIN PROGRAM',
    expectedResult: 'EXPECTED RESULT',
    supportMaterials: 'PERSONAL BONUSES',
    nextStep: 'NEXT STEP',

    // Анализ для детей
    childProfilePrefix: 'Child Breathing Profile: ',
    childAge: 'Child Age',
    childEducation: 'Education',
    urgentAttention: 'URGENT ATTENTION REQUIRED',
    childTechniques: 'EMERGENCY TECHNIQUES (start today)',
    childProgram: 'CHILD PROGRAM',
    childResult: 'RESULT',
    childMaterials: 'SPECIAL MATERIALS FOR PARENTS',
    childNextStep: 'NEXT STEP',

    // Описания проблем
    chronic_stress: 'chronic stress and tension',
    anxiety: 'increased anxiety',
    insomnia: 'sleep problems and insomnia',
    breathing_issues: 'breathing problems',
    hyperactivity: 'hyperactivity and inattention',

    // Сегменты
    HOT_LEAD: 'hot lead',
    WARM_LEAD: 'warm lead',
    COLD_LEAD: 'cold lead',
    NURTURE_LEAD: 'nurture lead'
  }
};

class Localization {
  constructor(defaultLanguage = 'ru') {
    this.currentLanguage = defaultLanguage;
  }

  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Язык ${lang} не поддерживается, используется ${this.currentLanguage}`);
    }
  }

  get(key, fallback = '') {
    return translations[this.currentLanguage][key] || translations['ru'][key] || fallback;
  }
}

module.exports = new Localization();
