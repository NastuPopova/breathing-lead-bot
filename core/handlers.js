  setupUserCommands() {
    this.telegramBot.start(async (ctx) => {
      try { await this.handleStart(ctx);
      } catch (e) { await this.handleError(ctx, e); }
    });

    this.telegramBot.command('help', (ctx) => ctx.reply('Начните с /start'));
    this.telegramBot.command('restart', (ctx) => {
      ctx.session = {};
      ctx.reply('Сессия сброшена. Нажмите /start');
    });
  }

  setupUserCallbacks() {
    this.telegramBot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;
      await ctx.answerCbQuery().catch(() => {});

      if (data === 'begin_survey') {
        const first = this.surveyQuestions.getFirstQuestion();
        ctx.session.currentQuestion = first;
        ctx.session.answers = {};
        await this.askQuestion(ctx, first);
        return;
      }

      // ← весь твой остальной код callback'ов (next, answer_, get_bonus и т.д.) ←
    });
  }
