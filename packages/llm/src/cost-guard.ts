import { CostLimitError, createChildLogger } from '@forgeclaw/shared';

const log = createChildLogger('cost-guard');

export class CostGuard {
  private dailySpend = 0;
  private lastReset = new Date().toDateString();

  constructor(private maxDailyDollars: number) {}

  checkBudget(_model: { costPer1kOutput: number }): void {
    this.maybeReset();
    const remainingCents = this.maxDailyDollars * 100 - this.dailySpend;
    if (remainingCents <= 0) {
      throw new CostLimitError(this.dailySpend / 100, this.maxDailyDollars);
    }
    if (remainingCents < 100) {
      log.warn({ remaining_cents: remainingCents }, 'Low budget warning');
    }
  }

  recordUsage(costCents: number): void {
    this.maybeReset();
    this.dailySpend += costCents;
    log.debug({ daily_spend: this.dailySpend.toFixed(2), limit_dollars: this.maxDailyDollars }, 'Cost recorded');
  }

  getStatus(): { spent: number; limit: number; remaining: number } {
    this.maybeReset();
    return {
      spent: this.dailySpend / 100,
      limit: this.maxDailyDollars,
      remaining: (this.maxDailyDollars * 100 - this.dailySpend) / 100,
    };
  }

  private maybeReset(): void {
    const today = new Date().toDateString();
    if (today !== this.lastReset) {
      log.info({ previous_spend: this.dailySpend.toFixed(2) }, 'Daily cost reset');
      this.dailySpend = 0;
      this.lastReset = today;
    }
  }
}
