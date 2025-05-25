// debug_stress_level.js - Отладочный скрипт для проблемы с stress_level
const config = require('./config');

let ExtendedSurveyQuestions;

try {
  ExtendedSurveyQuestions = require('./modules/survey/extended_questions');
  console.log('✅ ExtendedSurveyQuestions загружен успешно');
} catch (error) {
  console.error('❌ Ошибка загрузки ExtendedSurveyQuestions:', error.message);
  console.error('Стек ошибки:', error.stack);
  process.exit(1);
}

const surveyQuestions = new ExtendedSurveyQuestions();

console.log('\n=== ДИАГНОСТИКА ПРОБЛЕМЫ STRESS_LEVEL ===\n');

// 1. Проверяем, что вопрос stress_level существует
console.log('1. Проверяем существование вопроса stress_level:');
const stressQuestion = surveyQuestions.getQuestion('stress_level');
if (stressQuestion) {
  console.log('✅ Вопрос stress_level найден');
  console.log('   - Тип:', stressQuestion.type);
  console.log('   - Блок:', stressQuestion.block);
  console.log('   - Обязательный:', stressQuestion.required);
  console.log('   - Есть клавиатура:', !!stressQuestion.keyboard);
} else {
  console.log('❌ Вопрос stress_level НЕ НАЙДЕН!');
  console.log('Доступные вопросы:', surveyQuestions.getAllQuestions());
  process.exit(1);
}

// 2. Проверяем следующий вопрос после stress_level
console.log('\n2. Проверяем следующий вопрос после stress_level:');
const mockUserData = {
  age_group: '31-45',
  occupation: 'office_work',
  physical_activity: 'sometimes',
  current_problems: ['chronic_stress', 'insomnia'],
  stress_level: 7 // имитируем уже выбранный уровень стресса
};

const nextQuestion = surveyQuestions.getNextQuestion('stress_level', mockUserData);
console.log('Следующий вопрос после stress_level:', nextQuestion);

if (nextQuestion) {
  const nextQuestionObj = surveyQuestions.getQuestion(nextQuestion);
  if (nextQuestionObj) {
    console.log('✅ Следующий вопрос найден:', nextQuestion);
    console.log('   - Тип:', nextQuestionObj.type);
    console.log('   - Блок:', nextQuestionObj.block);
  } else {
    console.log('❌ Следующий вопрос не найден в базе вопросов!');
  }
} else {
  console.log('❌ getNextQuestion вернул null для stress_level');
}

// 3. Проверяем маппинг callback данных для stress_level
console.log('\n3. Проверяем маппинг callback данных для stress_level:');
const stressCallbacks = [
  'stress_1', 'stress_2', 'stress_3', 'stress_4', 'stress_5',
  'stress_6', 'stress_7', 'stress_8', 'stress_9', 'stress_10'
];

console.log('Результаты маппинга:');
stressCallbacks.forEach(callback => {
  const mapped = surveyQuestions.mapCallbackToValue(callback);
  const status = mapped !== undefined ? '✅' : '❌';
  console.log(`   ${status} ${callback} -> ${mapped}`);
});

// 4. Проверяем валидацию ответов для stress_level
console.log('\n4. Проверяем валидацию ответов для stress_level:');
const testAnswers = [1, 5, 10, 'invalid', undefined, null];

testAnswers.forEach(answer => {
  const validation = surveyQuestions.validateAnswer('stress_level', answer);
  const status = validation.valid ? '✅' : '❌';
  console.log(`   ${status} Ответ "${answer}": ${validation.valid ? 'валиден' : validation.error}`);
});

// 5. Проверяем стандартный поток вопросов
console.log('\n5. Проверяем позицию stress_level в стандартном потоке:');
const flowLogic = surveyQuestions.flowLogic;
const stressIndex = flowLogic.standardFlow.indexOf('stress_level');
console.log('Позиция stress_level в потоке:', stressIndex);
console.log('Общее количество вопросов в стандартном потоке:', flowLogic.standardFlow.length);

if (stressIndex >= 0) {
  console.log('Вопросы вокруг stress_level:');
  console.log('   Предыдущий:', flowLogic.standardFlow[stressIndex - 1] || 'нет');
  console.log('   Текущий:', flowLogic.standardFlow[stressIndex]);
  console.log('   Следующий:', flowLogic.standardFlow[stressIndex + 1] || 'нет');
}

// 6. Тестируем shouldShowQuestion для sleep_quality
console.log('\n6. Проверяем shouldShowQuestion для sleep_quality:');
const shouldShow = surveyQuestions.shouldShowQuestion('sleep_quality', mockUserData);
console.log('Должен ли показываться sleep_quality:', shouldShow);

const sleepQuestion = surveyQuestions.getQuestion('sleep_quality');
if (sleepQuestion) {
  console.log('✅ Вопрос sleep_quality найден');
  console.log('   - Имеет условие (condition):', !!sleepQuestion.condition);
} else {
  console.log('❌ Вопрос sleep_quality не найден!');
}

// 7. Симуляция полного процесса после stress_level
console.log('\n7. Симуляция процесса после выбора stress_level:');

// Имитируем состояние сессии после ответа на stress_level
const sessionState = {
  currentQuestion: 'stress_level',
  answers: {
    age_group: '31-45',
    occupation: 'office_work',
    physical_activity: 'sometimes',
    current_problems: ['chronic_stress', 'insomnia'],
    stress_level: 7
  },
  completedQuestions: ['age_group', 'occupation', 'physical_activity', 'current_problems', 'stress_level']
};

console.log('Текущее состояние сессии:');
console.log('   - Текущий вопрос:', sessionState.currentQuestion);
console.log('   - Количество ответов:', Object.keys(sessionState.answers).length);
console.log('   - Завершенные вопросы:', sessionState.completedQuestions.length);

// Получаем следующий вопрос
const nextAfterStress = surveyQuestions.getNextQuestion('stress_level', sessionState.answers);
console.log('Следующий вопрос должен быть:', nextAfterStress);

// Проверяем, существует ли этот вопрос
if (nextAfterStress) {
  const nextQuestionData = surveyQuestions.getQuestion(nextAfterStress);
  if (nextQuestionData) {
    console.log('✅ Переход будет успешным');
    console.log('   - ID следующего вопроса:', nextAfterStress);
    console.log('   - Тип следующего вопроса:', nextQuestionData.type);
  } else {
    console.log('❌ ОШИБКА: Следующий вопрос не существует в базе!');
  }
} else {
  console.log('❌ ОШИБКА: getNextQuestion вернул null');
}

// 8. Проверяем прогресс
console.log('\n8. Проверяем расчет прогресса:');
const progress = surveyQuestions.getProgress(sessionState.completedQuestions, sessionState.answers);
console.log('Прогресс:', progress);

// 9. Экспорт конфигурации для отладки
console.log('\n9. Конфигурация системы:');
const config = surveyQuestions.exportConfig();
console.log(JSON.stringify(config, null, 2));

console.log('\n=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');

// 10. Рекомендации по исправлению
console.log('\n=== РЕКОМЕНДАЦИИ ===');
console.log('Если проблема обнаружена:');
console.log('1. Проверьте, что sleep_quality корректно определен в questions');
console.log('2. Убедитесь, что stress_level правильно находится в standardFlow');
console.log('3. Проверьте, что mapCallbackToValue корректно обрабатывает stress_X');
console.log('4. Добавьте дополнительные логи в moveToNextQuestion и askQuestion');
console.log('5. Проверьте Railway логи на предмет ошибок Telegram API');

// Если все проверки прошли успешно
if (nextAfterStress && surveyQuestions.getQuestion(nextAfterStress)) {
  console.log('\n✅ ВСЕ ПРОВЕРКИ ПРОШЛИ УСПЕШНО');
  console.log('Проблема может быть в:');
  console.log('- Обработке callback в Telegram API');
  console.log('- Состоянии сессии в runtime');
  console.log('- Логике editMessageText/reply');
  console.log('\nДобавьте больше логов в safeHandleCallback и askQuestion для детальной диагностики.');
} else {
  console.log('\n❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В КОНФИГУРАЦИИ');
  console.log('Исправьте найденные ошибки перед дальнейшим тестированием.');
}