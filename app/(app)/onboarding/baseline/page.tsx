import { redirect } from "next/navigation";
import Link from "next/link";
import { and, eq, gte, lt } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/db/queries";
import {
  computeBaseline,
  formatMonthName,
  getLastMonthRange,
} from "@/lib/baseline";
import { formatKobo } from "@/lib/pacing";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { CsvUpload } from "@/components/csv-upload";

// ============================================
// SERVER ACTION — advance past the baseline step
// ============================================
async function finishBaselineStep() {
  "use server";

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await db
    .update(users)
    .set({
      baselineCompletedAt: new Date(),
      onboardingStep: 2,
    })
    .where(eq(users.clerkUserId, userId));

  redirect("/onboarding/mode");
}

// ============================================
// PAGE
// ============================================
export default async function BaselinePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.onboardingStep < 1) redirect("/onboarding/cap");
  if (user.onboardingStep >= 2) redirect("/onboarding/mode");

  const params = await searchParams;
  const forceUpload = params.mode === "upload";

  const { start, end } = getLastMonthRange();

  const baselineTxs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        gte(transactions.transactionDate, start),
        lt(transactions.transactionDate, end)
      )
    );

  const insights = computeBaseline(baselineTxs);
  const showInsights = insights.hasData && !forceUpload;
  const monthLabel = formatMonthName(start);

  // ============================================
  // UPLOAD VIEW
  // ============================================
  if (!showInsights) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <OnboardingProgress currentStep={2} />

        <div className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-3">
            Last month, in review
          </p>
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] text-zinc-900">
            Let's see how you've been spending
          </h1>
          <p className="text-[15px] text-zinc-500 mt-3 leading-relaxed max-w-lg">
            Upload last month's bank statement and we'll show you where your
            money actually went. This makes your pacing plan smarter.
          </p>
        </div>

        <CsvUpload
          nextHref="/onboarding/baseline"
          nextLabel="See your baseline"
        />

        <form action={finishBaselineStep} className="mt-8 text-center">
          <button
            type="submit"
            className="text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Skip for now
          </button>
        </form>
      </div>
    );
  }

  // ============================================
  // INSIGHTS VIEW
  // ============================================
  return (
    <div className="max-w-2xl mx-auto pt-8">
      <OnboardingProgress currentStep={2} />

      <div className="mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-3">
          Last month, in review
        </p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] text-zinc-900">
          Here's how you spent
        </h1>
        <p className="text-[14px] text-zinc-500 mt-3">
          {monthLabel} · {insights.transactionCount} transaction
          {insights.transactionCount === 1 ? "" : "s"} reviewed
        </p>
      </div>

      {/* Total spent */}
      <div className="rounded-2xl border border-zinc-200 p-8 mb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          Total spent
        </p>
        <p className="mt-3 text-[42px] leading-none font-semibold tracking-[-0.04em] tabular-nums text-zinc-900">
          {formatKobo(insights.totalSpent)}
        </p>
        <p className="mt-3 text-[13px] text-zinc-500">
          Across {insights.transactionCount} transaction
          {insights.transactionCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Two-column: categories + biggest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top categories */}
        <div className="rounded-2xl border border-zinc-200 p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-5">
            Top categories
          </p>
          <div className="space-y-4">
            {insights.topCategories.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13px] text-zinc-700 truncate pr-3">
                    {cat.category}
                  </span>
                  <span className="text-[13px] tabular-nums text-zinc-900 font-medium shrink-0">
                    {formatKobo(cat.total)}
                  </span>
                </div>
                <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 rounded-full"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  {Math.round(cat.percent)}% · {cat.count} transaction
                  {cat.count === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Biggest single expense */}
        <div className="rounded-2xl border border-zinc-200 p-6 flex flex-col">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-5">
            Biggest single expense
          </p>
          {insights.biggestTransaction && (
            <>
              <p className="text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-zinc-900">
                {formatKobo(insights.biggestTransaction.amount)}
              </p>
              <p className="mt-4 text-[13px] text-zinc-700 leading-relaxed line-clamp-3">
                {insights.biggestTransaction.description}
              </p>
              <p className="mt-2 text-[11.5px] text-zinc-400">
                {new Date(insights.biggestTransaction.date).toLocaleDateString(
                  "en-NG",
                  { month: "long", day: "numeric" }
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-10 flex items-center justify-between gap-4">
        <Link
          href="/onboarding/baseline?mode=upload"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
          Upload a different statement
        </Link>

        <form action={finishBaselineStep}>
          <button
            type="submit"
            className="h-11 px-6 rounded-xl bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
          >
            Looks good, continue
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}