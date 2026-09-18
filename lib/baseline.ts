import type { Transaction } from "./db/schema";

// ============================================
// SIMPLE CATEGORIZATION
// Keyword-based. Good enough for baseline insights.
// Full ML categorization comes in Phase 5.
// ============================================

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Airtime & Data",
    keywords: ["mtn", "airtel", "glo", "9mobile", "mobile data", "airtime"],
  },
  {
    category: "Betting",
    keywords: ["betting", "sportybet", "sporty", "bet9ja", "1xbet"],
  },
  {
    category: "Utilities",
    keywords: [
      "electricity",
      "capricorn",
      "kwh",
      "prepaid",
      "water bill",
      "ikedc",
      "ekedc",
    ],
  },
  {
    category: "Food & Drinks",
    keywords: [
      "food",
      "restaurant",
      "eats",
      "kitchen",
      "grill",
      "delicacy",
      "cafe",
      "café",
      "chophouse",
      "restaurants",
    ],
  },
  {
    category: "Transport",
    keywords: ["uber", "bolt", "taxi", "ride", "keke"],
  },
  {
    category: "Shopping",
    keywords: ["superstore", "supermarket", "shoprite", "market", "store", "mart"],
  },
  {
    category: "Bank Fees",
    keywords: ["stamp duty", "vat", "bank charge", "maintenance fee"],
  },
  {
    category: "Transfers Out",
    keywords: ["transfer to"],
  },
];

export function categorizeTransaction(description: string): string {
  const d = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (d.includes(kw)) return rule.category;
    }
  }
  return "Other";
}

// ============================================
// DATE RANGE HELPERS
// ============================================

const LAGOS_OFFSET_MS = 60 * 60 * 1000;

export function getLastMonthRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const year = lagosNow.getUTCFullYear();
  const month = lagosNow.getUTCMonth();

  const startUtc = Date.UTC(year, month - 1, 1) - LAGOS_OFFSET_MS;
  const endUtc = Date.UTC(year, month, 1) - LAGOS_OFFSET_MS;

  return {
    start: new Date(startUtc),
    end: new Date(endUtc),
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatMonthName(date: Date): string {
  const lagosDate = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return `${MONTH_NAMES[lagosDate.getUTCMonth()]} ${lagosDate.getUTCFullYear()}`;
}

// ============================================
// BASELINE INSIGHTS
// ============================================

export type BaselineInsights = {
  totalSpent: number;
  totalIncome: number;
  transactionCount: number;
  topCategories: Array<{
    category: string;
    total: number;
    count: number;
    percent: number;
  }>;
  biggestTransaction: {
    description: string;
    amount: number;
    date: Date;
  } | null;
  hasData: boolean;
};

export function computeBaseline(
  transactions: Transaction[]
): BaselineInsights {
  const expenses = transactions.filter((t) => t.type === "expense");
  const incomes = transactions.filter((t) => t.type === "income");

  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  if (expenses.length === 0) {
    return {
      totalSpent: 0,
      totalIncome,
      transactionCount: 0,
      topCategories: [],
      biggestTransaction: null,
      hasData: false,
    };
  }

  const categories = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const cat = categorizeTransaction(t.description);
    const existing = categories.get(cat) ?? { total: 0, count: 0 };
    existing.total += t.amount;
    existing.count += 1;
    categories.set(cat, existing);
  }

  const topCategories = Array.from(categories.entries())
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percent: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const biggest = expenses.reduce((max, t) =>
    t.amount > max.amount ? t : max
  );

  return {
    totalSpent,
    totalIncome,
    transactionCount: expenses.length,
    topCategories,
    biggestTransaction: {
      description: biggest.description,
      amount: biggest.amount,
      date: new Date(biggest.transactionDate),
    },
    hasData: true,
  };
}