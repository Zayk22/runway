import { redirect } from "next/navigation";
import { and, desc, eq, gte } from "drizzle-orm";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { ensureCurrentUser } from "@/lib/db/queries";
import {
  calculatePacing,
  formatKobo,
  getStartOfMonthUtc,
} from "@/lib/pacing";
import { AddTransactionForm } from "@/components/add-transaction-form";

export default async function DashboardPage() {
  const user = await ensureCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.monthlyCap === null) {
    redirect("/onboarding");
  }

  const startOfMonth = getStartOfMonthUtc();

  const [monthlyTx, recentTx] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.transactionDate, startOfMonth)
        )
      ),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.transactionDate))
      .limit(6),
  ]);

  const spentThisMonth = monthlyTx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const pacing = calculatePacing(user.monthlyCap, spentThisMonth);
  const firstName = user.displayName?.split(" ")[0] ?? null;

  return (
    <div className="space-y-12">
      {/* Page header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-4">
          Dashboard
        </p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] text-zinc-900">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      {/* Pacing hero */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
            {pacing.isOverBudget ? "Over budget" : "Safe to spend today"}
          </p>
          <p className="text-[12px] text-zinc-400 tabular-nums">
            {pacing.daysLeftInMonth} day
            {pacing.daysLeftInMonth === 1 ? "" : "s"} left
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 p-8">
          <p
            className={`text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums ${
              pacing.isOverBudget ? "text-red-600" : "text-zinc-900"
            }`}
          >
            {formatKobo(pacing.dailyAllowance)}
          </p>

          <p className="mt-3 text-[13.5px] text-zinc-500">
            {pacing.isOverBudget ? (
              <>
                You've spent {formatKobo(spentThisMonth)} of your{" "}
                {formatKobo(pacing.monthlyCap)} cap.
              </>
            ) : (
              <>
                {formatKobo(pacing.remainingBudget)} remaining of{" "}
                {formatKobo(pacing.monthlyCap)} this month
              </>
            )}
          </p>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pacing.isOverBudget ? "bg-red-500" : "bg-zinc-900"
                }`}
                style={{ width: `${pacing.percentUsed}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-zinc-400 tabular-nums">
              <span>{formatKobo(spentThisMonth)} spent</span>
              <span>{Math.round(pacing.percentUsed)}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Add transaction */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" strokeWidth={1.75} />
          </div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
            Add a transaction
          </h2>
        </div>
        <AddTransactionForm />
      </section>

      {/* Recent transactions */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
            Recent
          </h2>
          {recentTx.length > 0 && (
            <p className="text-[12px] text-zinc-400">
              Last {recentTx.length}
            </p>
          )}
        </div>

        {recentTx.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
            <p className="text-[13.5px] text-zinc-400">
              No transactions yet. Add one above to see your pacing update.
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
            {recentTx.map((t) => (
              <li
                key={t.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-zinc-50/60 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    t.type === "income"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {t.type === "income" ? (
                    <ArrowDownRight
                      className="w-4 h-4"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-zinc-900 truncate">
                    {t.description}
                  </p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">
                    {new Date(t.transactionDate).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p
                  className={`text-[14px] font-semibold tabular-nums shrink-0 ${
                    t.type === "income" ? "text-emerald-600" : "text-zinc-900"
                  }`}
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatKobo(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}