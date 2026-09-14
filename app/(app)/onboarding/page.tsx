"use client";

import { useActionState } from "react";
import { Wallet } from "lucide-react";
import { setMonthlyCap, type ActionResult } from "./actions";

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    setMonthlyCap,
    null
  );

  return (
    <div className="max-w-lg mx-auto pt-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-4">
        Step 1 of 1
      </p>
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] text-zinc-900">
        Set your monthly cap
      </h1>
      <p className="text-[15px] text-zinc-500 mt-3 leading-relaxed">
        Tell Runway the maximum you want to spend this month. We'll work out
        how much you can safely spend each day.
      </p>

      <form action={formAction} className="mt-10">
        <label
          htmlFor="cap"
          className="block text-[12px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-3"
        >
          Monthly cap
        </label>

        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[18px] font-medium text-zinc-400 select-none">
            ₦
          </span>
          <input
            id="cap"
            name="cap"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="1"
            placeholder="200000"
            autoFocus
            required
            className="w-full h-16 pl-11 pr-5 text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-900 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-300"
          />
        </div>

        {state && !state.success && state.error && (
          <p className="mt-3 text-[13px] text-red-600">{state.error}</p>
        )}

        <p className="mt-4 text-[12.5px] text-zinc-400 leading-relaxed">
          This is the total amount you want to spend this month, not a
          per-day figure. You can change it anytime from settings.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="mt-8 w-full h-12 rounded-xl bg-zinc-900 text-white text-[14px] font-medium tracking-[-0.01em] hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4" strokeWidth={1.75} />
          {isPending ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}