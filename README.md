# 🌬️ Breathing Lead Bot

Лидогенерирующий бот для диагностики дыхательных практик с персонализацией на основе VERSE-фреймворка.

## 🎯 Возможности

- **18 умных вопросов** с адаптивной логикой
- **VERSE-анализ** для персонализации рекомендаций
- **Автоматическая сегментация** лидов (HOT/WARM/COLD/NURTURE)
- **Интеграция** с основным ботом и CRM
- **Персональные рекомендации** на основе ИИ-анализа
- **Система передачи лидов** в реальном времени

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────┐
│               LEAD BOT                      │
├─────────────────────────────────────────────┤
│  📋 Extended Survey (18 questions)         │
│  🧠 VERSE Analysis Engine                   │
│  🎯 Personalization System                 │
│  🔄 Lead Transfer Integration               │
└─────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│             MAIN BOT + CRM                  │
├─────────────────────────────────────────────┤
│  💼 Lead Management                         │
│  📞 Consultation Booking                    │
│  📊 Analytics & Reporting                   │
└─────────────────────────────────────────────┘
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Отредактируйте `.env` файл:

```env
# Обязательные настройки
LEAD_BOT_TOKEN=your_bot_token_from_botfather
MAIN_BOT_API_URL=https://your-main-bot.herokuapp.com

# Опциональные настройки
ADMIN_ID=your_telegram_id
CRM_WEBHOOK_URL=https://your-crm-webhook.com/leads
```

### 3. Проверка настроек

```bash
npm run health-check
```

### 4. Запуск бота

```bash
# Разработка
npm run dev

# Продакшен
npm start
```

## 📋 Как получить токен бота

1. Напишите @BotFather в Telegram
2. Отправьте команду `/newbot`
3. Выберите имя и username для бота
4. Скопируйте полученный токен в `.env` файл

## 🔧 Конфигурация

### Основные настройки

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `LEAD_BOT_TOKEN` | Токен Telegram бота | ✅ |
| `MAIN_BOT_API_URL` | URL API основного бота | ✅ |
| `ADMIN_ID` | Telegram ID администратора | ❌ |
| `CRM_WEBHOOK_URL` | URL webhook для CRM | ❌ |

### Дополнительные настройки

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `SURVEY_TIMEOUT_MINUTES` | 30 | Таймаут прохождения анкеты |
| `ANALYSIS_DELAY_SECONDS` | 3 | Задержка "анализа" для UX |
| `PORT` | 3001 | Порт для webhook |

## 📊 Система анализа VERSE

### Компоненты скоринга

- **Urgency (40%)**: Насколько срочно нужна помощь
- **Readiness (35%)**: Готовность к практикам  
- **Fit (25%)**: Подходит ли наша программа

### Сегментация лидов

| Сегмент | Диапазон баллов | Действия |
|---------|----------------|----------|
| **🔥 HOT_LEAD** | 80-100 | Связаться в течение 2 часов |
| **⭐ WARM_LEAD** | 60-79 | Связаться в течение 24 часов |
| **❄️ COLD_LEAD** | 40-59 | Добавить в еженедельный план |
| **🌱 NURTURE_LEAD** | 0-39 | Долгосрочное взращивание |

## 🔄 Интеграции

### API основного бота

```javascript
// Endpoint для получения лидов
POST /api/leads/import
{
  "telegram_id": 123456789,
  "source": "lead_bot",
  "segment": "HOT_LEAD",
  "analysis": { ... },
  "recommendations": { ... }
}
```

### CRM Webhook

```javascript
// Данные отправляемые в CRM
{
  "contact": {
    "name": "Иван Иванов",
    "telegram": "@username",
    "phone": "+7 999 123-45-67"
  },
  "lead_info": {
    "source": "Telegram Diagnostic Bot",
    "quality": "HOT_LEAD",
    "score": 85
  }
}
```

## 📱 Пользовательский флоу

1. **Старт** → Приветствие и информация о диагностике
2. **Анкетирование** → 18 вопросов с прогресс-баром
3. **Анализ** → VERSE-обработка ответов (3 сек)
4. **Результаты** → Персональные рекомендации
5. **Контакты** → Сбор контактной информации
6. **Передача** → Автоматическая отправка в системы

## 🛠️ Разработка

### Структура проекта

```
lead_bot/
├── index.js                          # Главный файл
├── config.js                         # Конфигурация
├── modules/
│   ├── survey/
│   │   └── extended_questions.js     # Расширенная анкета
│   ├── analysis/
│   │   └── verse_analysis.js         # VERSE-анализ
│   └── integration/
│       └── lead_transfer.js          # Система интеграций
├── scripts/
│   └── health-check.js               # Проверка здоровья
└── package.json
```

### Добавление новых вопросов

1. Откройте `modules/survey/extended_questions.js`
2. Добавьте вопрос в объект `questions`
3. Обновите `flowLogic` если нужно
4. Добавьте маппинг в `mapCallbackToValue`

### Изменение логики анализа

1. Откройте `modules/analysis/verse_analysis.js`
2. Измените методы `calculateUrgencyScore`, `calculateReadinessScore`, `calculateFitScore`
3. Обновите `generatePersonalizedRecommendations`

## 🧪 Тестирование

```bash
# Проверка здоровья всей системы
npm run health-check

# Запуск в режиме разработки
npm run dev

# Проверка конфигурации
node -e "console.log(require('./config'))"
```

### Тестовые команды бота

- `/start` - начать диагностику
- Любое сообщение в процессе анкеты - получить подсказку
- Кнопки в интерфейсе - навигация по анкете

## 📈 Мониторинг

### Логи

Бот ведет подробные логи всех действий:

```bash
# Просмотр логов в реальном времени
tail -f logs/bot.log

# Поиск ошибок
grep "ERROR" logs/bot.log
```

### Метрики

- Количество начатых анкет
- Процент завершения анкеты  
- Распределение по сегментам
- Время прохождения анкеты
- Успешность передачи лидов

## 🚀 Деплой

### Heroku

```bash
# Установка Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Создание приложения
heroku create your-lead-bot

# Настройка переменных
heroku config:set LEAD_BOT_TOKEN=your_token
heroku config:set MAIN_BOT_API_URL=https://your-main-bot.herokuapp.com

# Деплой
git push heroku main
```

### Railway

```bash
# Подключение к Railway
railway login
railway init

# Настройка переменных через dashboard
# railway.app → your-project → Variables

# Деплой
railway up
```

### VPS

```bash
# Клонирование на сервер
git clone https://github.com/your-repo/breathing-lead-bot.git
cd breathing-lead-bot

# Установка зависимостей
npm install --production

# Настройка переменных
cp .env.example .env
nano .env

# Запуск с PM2
npm install -g pm2
pm2 start index.js --name "lead-bot"
pm2 startup
pm2 save
```

## ❓ FAQ

### Как добавить новый тип проблемы?

1. Добавьте вариант в `current_problems` или `priority_problem`
2. Обновите `issuePriority` в `identifyPrimaryIssue`
3. Добавьте рекомендации в `generatePersonalizedRecommendations`

### Как изменить критерии сегментации?

Измените `segmentWeights` и пороги в `determineSegment` в файле `verse_analysis.js`

### Как добавить интеграцию с новой CRM?

1. Создайте новый метод в `LeadTransferSystem`
2. Добавьте вызов в `processLead`
3. Настройте переменные окружения

### Бот не отвечает

1. Проверьте токен: `npm run health-check`
2. Убедитесь что webhook настроен правильно
3. Проверьте логи на ошибки

## 📞 Поддержка

- **Issues**: [GitHub Issues](https://github.com/your-repo/breathing-lead-bot/issues)
- **Документация**: [Wiki](https://github.com/your-repo/breathing-lead-bot/wiki)
- **Email**: support@breathingbot.com

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

---

**Версия**: 1.0.0  
**Дата обновления**: Декабрь 2024  
**Автор**: Анастасия Скородумова  

🌬️ *Помогаем людям дышать правильно и жить лучше*