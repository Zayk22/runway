import { redirect } from "next/navigation";
import { ArrowUpRight, Wallet } from "lucide-react";
import { ensureCurrentUser } from "@/lib/db/queries";

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}

export default async function DashboardPage() {
  const user = await ensureCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // New user hasn't completed onboarding yet → send them there
  if (user.monthlyCap === null) {
    redirect("/onboarding");
  }

  const firstName = user.displayName?.split(" ")[0] ?? null;
  const capFormatted = formatNaira(user.monthlyCap);

  return (
    <div className="space-y-14">
      {/* Page header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-4">
          Dashboard
        </p>
        <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.035em] text-zinc-900">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-[15px] text-zinc-500 mt-3 leading-relaxed max-w-lg">
          Upload a statement to see how much you can safely spend each day.
        </p>
      </div>

      {/* Two-column: action + stat */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Primary action */}
        <div className="md:col-span-3 rounded-2xl border border-zinc-200 p-7 flex flex-col justify-between min-h-[200px]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
                Upload a statement
              </h2>
              <p className="text-[13.5px] text-zinc-500 mt-1.5 leading-relaxed max-w-sm">
                Drop in a CSV or PDF from your bank. We'll parse it in your
                browser — nothing is stored.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[12px] font-medium tracking-wide text-zinc-400">
              Coming next
            </span>
            <ArrowUpRight
              className="w-3.5 h-3.5 text-zinc-300"
              strokeWidth={1.75}
            />
          </div>
        </div>

        {/* At-a-glance stat */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-200 p-7 flex flex-col justify-between min-h-[200px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
            This month
          </p>
          <div>
            <p className="text-[32px] font-semibold tracking-[-0.035em] text-zinc-900 tabular-nums leading-none">
              {capFormatted}
            </p>
            <p className="text-[12.5px] text-zinc-400 mt-2">Monthly cap</p>
          </div>
        </div>
      </div>

      {/* Session details */}
      <details className="group">
        <summary className="text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer select-none list-none flex items-center gap-2">
          <span className="inline-block w-1 h-1 rounded-full bg-zinc-300 group-open:bg-emerald-500 transition-colors" />
          Session details
        </summary>
        <div className="mt-4 pl-5 border-l border-zinc-100 space-y-2 font-mono text-[11px] text-zinc-500">
          <div className="flex gap-3">
            <span className="text-zinc-400 w-20 shrink-0">User ID</span>
            <span className="break-all">{user.id}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-zinc-400 w-20 shrink-0">Email</span>
            <span className="break-all">{user.email}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-zinc-400 w-20 shrink-0">Monthly cap</span>
            <span className="break-all">
              {user.monthlyCap} kobo ({capFormatted})
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}