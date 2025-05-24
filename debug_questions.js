// debug_questions.js
const config = require('./config');

let ExtendedSurveyQuestions;

try {
  ExtendedSurveyQuestions = require('./modules/survey/extended_questions');
  console.log('✅ ExtendedSurveyQuestions загружен');
} catch (error) {
  console.error('❌ Ошибка загрузки ExtendedSurveyQuestions:', error.message);
  process.exit(1);
}

const surveyQuestions = new ExtendedSurveyQuestions();

// Проверяем вопрос stress_level
console.log('\n=== DEBUG STRESS_LEVEL ===');
const stressQuestion = surveyQuestions.getQuestion('stress_level');
console.log('Stress question:', JSON.stringify(stressQuestion, null, 2));

// Проверяем mapping для различных значений
const testCallbacks = ['stress_1', 'stress_2', 'stress_3', 'stress_4', 'stress_5', 'stress_6', 'stress_7', 'stress_8', 'stress_9', 'stress_10'];

testCallbacks.forEach(callback => {
  const mapped = surveyQuestions.mapCallbackToValue(callback);
  console.log(`${callback} -> ${mapped}`);
});

console.log('\n=== END DEBUG ===');
