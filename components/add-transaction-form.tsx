"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { addTransaction, type ActionResult } from "@/app/(app)/actions";

export function AddTransactionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(addTransaction, null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <form ref={formRef} action={formAction}>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-stretch">
        <input
          name="description"
          type="text"
          placeholder="What was it for?"
          required
          maxLength={200}
          className="h-11 px-4 text-[14px] text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400"
        />

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-zinc-400 select-none">
            ₦
          </span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            className="w-full h-11 pl-8 pr-4 text-[14px] tabular-nums text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400"
          />
        </div>

        <select
          name="type"
          defaultValue="expense"
          className="h-11 px-4 text-[14px] text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 transition-colors bg-white cursor-pointer"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <input type="hidden" name="date" value={today} />

        <button
          type="submit"
          disabled={isPending}
          className="h-11 px-5 rounded-xl bg-zinc-900 text-white text-[13px] font-medium tracking-[-0.01em] hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          {isPending ? "Adding…" : "Add"}
        </button>
      </div>

      {state && !state.success && state.error && (
        <p className="mt-2 text-[12.5px] text-red-600">{state.error}</p>
      )}
    </form>
  );
}