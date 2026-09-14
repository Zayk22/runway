// ============================================
// PACING ENGINE
// Core formula (v1, from architecture doc):
//   remaining_budget = monthly_cap - spent_this_month
//   remaining_days = days_left_in_month (including today)
//   daily_allowance = remaining_budget / remaining_days
//
// All money is stored in kobo (integer). ₦1 = 100 kobo.
// ============================================

// Nigeria (WAT) is UTC+1 year-round, no DST. We use a fixed offset
// instead of a full timezone library for the MVP. When we support
// multiple timezones, swap this for `date-fns-tz` or similar.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

export type PacingResult = {
  monthlyCap: number;
  spentThisMonth: number;
  remainingBudget: number;
  daysLeftInMonth: number;
  dailyAllowance: number;
  weeklyAllowance: number;
  percentUsed: number;
  isOverBudget: boolean;
};

export function calculatePacing(
  monthlyCapKobo: number,
  spentThisMonthKobo: number,
  now: Date = new Date()
): PacingResult {
  const remainingBudget = monthlyCapKobo - spentThisMonthKobo;
  const daysLeftInMonth = getDaysLeftInMonth(now);
  const isOverBudget = remainingBudget <= 0;

  const dailyAllowance = isOverBudget
    ? 0
    : Math.floor(remainingBudget / daysLeftInMonth);

  const weeklyAllowance = dailyAllowance * 7;

  const percentUsed =
    monthlyCapKobo > 0
      ? Math.min(100, (spentThisMonthKobo / monthlyCapKobo) * 100)
      : 0;

  return {
    monthlyCap: monthlyCapKobo,
    spentThisMonth: spentThisMonthKobo,
    remainingBudget,
    daysLeftInMonth,
    dailyAllowance,
    weeklyAllowance,
    percentUsed,
    isOverBudget,
  };
}

// Returns the UTC instant corresponding to 00:00 on the 1st of the
// current month, in Lagos time. Use this to filter "this month's
// transactions" from the DB.
export function getStartOfMonthUtc(now: Date = new Date()): Date {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const year = lagosNow.getUTCFullYear();
  const month = lagosNow.getUTCMonth();
  const startOfMonthUtcMs = Date.UTC(year, month, 1) - LAGOS_OFFSET_MS;
  return new Date(startOfMonthUtcMs);
}

function getDaysLeftInMonth(now: Date): number {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const year = lagosNow.getUTCFullYear();
  const month = lagosNow.getUTCMonth();
  const day = lagosNow.getUTCDate();

  // Day 0 of next month = last day of this month
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return Math.max(1, daysInMonth - day + 1);
}

// ============================================
// FORMATTING
// ============================================

export function formatKobo(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}

export function formatKoboCompact(kobo: number): string {
  // No decimals for large values, for compact display contexts
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}