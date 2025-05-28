// Файл: core/handlers.js
const { Markup } = require('telegraf');
const config = require('./config');

class Handler {
  constructor(bot) {
    this.bot = bot;
  }

  // Генерирует сообщение для бонуса
  generateBonusMessage(bonus, analysisResult) {
    let message = `🎁 *${bonus.title}*\n\n`;
    message += `${bonus.subtitle}\n\n`;
    message += `${bonus.description}\n\n`;
    if (analysisResult.segment === 'HOT_LEAD') {
      message += `⚡ *СРОЧНО:* Начните с техники прямо сейчас!\n\n`;
    }
    message += `📱 Нажмите кнопку ниже, чтобы получить ваш гид.\n`;
    message += `👩‍⚕️ Больше техник у [Анастасии Поповой](https://t.me/breathing_opros_bot)`;

    return message;
  }

  // Генерирует клавиатуру для бонуса
  generateBonusKeyboard(bonus) {
    const buttons = [
      [Markup.button.callback('📥 Получить гид', `download_pdf_${bonus.id}`)],
      [Markup.button.callback('📞 Хочу больше техник!', 'contact_request')],
      [Markup.button.callback('🎁 Дополнительные материалы', 'more_materials')],
      [Markup.button.url('💬 Написать Анастасии', 'https://t.me/breathing_opros_bot')]
    ];
    return Markup.inlineKeyboard(buttons);
  }

  async handleStaticPDFDownload(ctx) {
    try {
      const pdfType = ctx.match[1];
      console.log(`📥 Запрос статичного PDF: ${pdfType}`);
      await this.pdfManager.sendAdditionalPDF(ctx, pdfType);
      this.pdfManager.logBonusDelivery(
        ctx.from.id,
        `static_${pdfType}`,
        'static_pdf',
        ctx.session?.analysisResult?.segment || 'UNKNOWN',
        'static_material'
      );
      await ctx.answerCbQuery('✅ PDF отправлен!');
    } catch (error) {
      console.error('❌ Ошибка handleStaticPDFDownload:', error);
      await ctx.answerCbQuery('❌ Ошибка загрузки PDF', { show_alert: true });
    }
  }

  async handlePDFDownload(ctx) {
    try {
      const bonusId = ctx.match[1];
      console.log(`📥 Запрос персонального гида: ${bonusId}`);
      if (!ctx.session?.analysisResult) {
        await ctx.answerCbQuery('⚠️ Пройдите анкету заново', { show_alert: true });
        return;
      }

      await ctx.answerCbQuery('📥 Готовлю ваш персональный гид...');
      await this.pdfManager.handleDownloadRequest(ctx, bonusId);

      const bonus = this.pdfManager.getBonusForUser(ctx.session.analysisResult, ctx.session.answers);
      this.pdfManager.logBonusDelivery(
        ctx.from.id,
        bonus.id,
        'file',
        ctx.session?.analysisResult?.segment,
        ctx.session?.analysisResult?.primaryIssue
      );
    } catch (error) {
      console.error('❌ Ошибка handlePDFDownload:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка загрузки PDF' });
      await ctx.answerCbQuery('❌ Ошибка загрузки PDF', { show_alert: true });
    }
  }

  async handleMoreMaterials(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.pdfManager.showMoreMaterials(ctx);
    } catch (error) {
      console.error('❌ Ошибка handleMoreMaterials:', error);
      await ctx.answerCbQuery('❌ Ошибка отображения материалов');
    }
  }

  async handlePDFRetry(ctx) {
    try {
      if (!ctx.session?.analysisResult) {
        await ctx.answerCbQuery('Пройдите анкету заново');
        return;
      }

      await ctx.answerCbQuery('📥 Повторно отправляю файл...');
      await this.pdfManager.sendPDFFile(ctx);
    } catch (error) {
      console.error('❌ Ошибка handlePDFRetry:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка повторной отправки PDF' });
      await ctx.answerCbQuery('Ошибка');
    }
  }

  async handleAdminPDFStats(ctx) {
    if (ctx.from.id.toString() !== config.ADMIN_ID) return;
    try {
      const stats = this.pdfManager.getBonusStats();
      let message = `📊 *Статистика бонусов*\n\n`;
      message += `Всего выдано: ${stats.totalDelivered}\n\n`;
      message += `По сегментам:\n`;
      for (const [segment, count] of Object.entries(stats.bySegment)) {
        message += `• ${config.TRANSLATIONS[segment] || segment}: ${count}\n`;
      }
      message += `\nПо проблемам:\n`;
      for (const [issue, count] of Object.entries(stats.byIssue)) {
        message += `• ${config.TRANSLATIONS[issue] || issue}: ${count}\n`;
      }
      message += `\nПо способу доставки:\n`;
      for (const [method, count] of Object.entries(stats.byDeliveryMethod)) {
        message += `• ${method}: ${count}\n`;
      }
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Ошибка handleAdminPDFStats:', error);
      await ctx.reply('❌ Ошибка получения статистики');
    }
  }

  async handleTestPDF(ctx) {
    if (ctx.from.id.toString() !== config.ADMIN_ID) return;
    try {
      const testAnalysisResult = {
        analysisType: 'adult',
        primaryIssue: 'chronic_stress',
        segment: 'COLD_LEAD'
      };
      const testSurveyData = { age_group: '18-30', stress_level: 5 };

      ctx.session.analysisResult = testAnalysisResult;
      ctx.session.answers = testSurveyData;

      await this.pdfManager.sendPDFFile(ctx);
      await ctx.reply('✅ Тестовый PDF отправлен');
    } catch (error) {
      console.error('❌ Ошибка тестовой отправки PDF:', error);
      this.bot.middleware.logSpecialEvent('error', ctx.from?.id, { error: 'Ошибка тестовой отправки PDF' });
      await ctx.reply('❌ Ошибка отправки тестового PDF');
    }
  }

  async completeSurvey(ctx, analysisResult) {
    try {
      const bonus = this.pdfManager.getBonusForUser(analysisResult, ctx.session.answers);
      const bonusMessage = this.generateBonusMessage(bonus, analysisResult);
      const bonusKeyboard = this.generateBonusKeyboard(bonus);

      await ctx.editMessageText(bonusMessage, {
        parse_mode: 'Markdown',
        ...bonusKeyboard
      });

      if (analysisResult.segment === 'HOT_LEAD') {
        setTimeout(async () => {
          await this.pdfManager.sendPDFFile(ctx);
          await ctx.reply(
            '⚡ *Срочная рекомендация:* Начните с первой техники прямо сейчас!',
            { parse_mode: 'Markdown' }
          );
        }, 2000);
      }

      this.bot.middleware.logSpecialEvent('survey_completed', ctx.from?.id, {
        segment: analysisResult.segment,
        primaryIssue: analysisResult.primaryIssue
      });
    } catch (error) {
      console.error('❌ Ошибка completeSurvey:', error);
      await ctx.reply('❌ Ошибка обработки результатов. Попробуйте позже.');
    }
  }

  async showResults(ctx) {
    try {
      if (!ctx.session?.analysisResult) {
        await ctx.reply('⚠️ Пройдите анкету заново.', {
          ...Markup.inlineKeyboard([[Markup.button.callback('🔬 Пройти диагностику', 'start_survey')]])
        });
        return;
      }

      const bonus = this.pdfManager.getBonusForUser(ctx.session.analysisResult, ctx.session.answers);
      const message = this.generateBonusMessage(bonus, ctx.session.analysisResult);
      const keyboard = this.generateBonusKeyboard(bonus);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('❌ Ошибка showResults:', error);
      await ctx.reply('❌ Ошибка отображения результатов');
    }
  }

  async handleOtherPrograms(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.pdfManager.showAllPrograms(ctx);
    } catch (error) {
      console.error('❌ Ошибка handleOtherPrograms:', error);
      await ctx.answerCbQuery('❌ Ошибка отображения программ');
    }
  }

  async handleOrderProgram(ctx) {
    try {
      const programType = ctx.match[1];
      await ctx.answerCbQuery();
      await this.pdfManager.showOrderDetails(ctx, programType);
    } catch (error) {
      console.error('❌ Ошибка handleOrderProgram:', error);
      await ctx.answerCbQuery('❌ Ошибка отображения программы');
    }
  }

  async handleHelpChoose(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.pdfManager.showProgramHelper(ctx);
    } catch (error) {
      console.error('❌ Ошибка handleHelpChoose:', error);
      await ctx.answerCbQuery('❌ Ошибка выбора программы');
    }
  }

  async transferLeadAsync(ctx) {
    try {
      const userData = {
        id: ctx.from.id,
        username: ctx.from?.username,
        firstName: ctx.from?.firstName,
        analysisResult: ctx.session?.analysisResult,
        answers: ctx.session?.answers
      };

      const bonus = this.pdfManager.getBonusForUser(ctx.session.analysisResult, ctx.session.answers);
      await this.leadTransfer.sendToCRM(userData, bonus);

      await ctx.reply(config.MESSAGES.THANK_YOU, { parse_mode: 'Markdown' });
      await ctx.reply(config.MESSAGES.CONTACT_TRAINER, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Ошибка transferLeadAsync:', error);
      await ctx.reply('❌ Ошибка передачи данных. Попробуйте позже.');
    }
  }

  // ... остальные методы ...
}

module.exports = Handler;
