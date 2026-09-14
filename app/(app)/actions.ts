"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/db/queries";

export type ActionResult = { success: boolean; error?: string };

export async function addTransaction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not signed in." };

  const description = String(formData.get("description") ?? "").trim();
  const rawAmount = String(formData.get("amount") ?? "");
  const rawType = String(formData.get("type") ?? "expense");
  const rawDate = String(formData.get("date") ?? "");

  if (!description || description.length > 200) {
    return {
      success: false,
      error: "Description is required (max 200 characters).",
    };
  }

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter a valid amount greater than 0." };
  }
  if (amount > 100_000_000) {
    return { success: false, error: "Amount is too large." };
  }

  if (rawType !== "income" && rawType !== "expense") {
    return { success: false, error: "Invalid transaction type." };
  }

  const txDate = rawDate ? new Date(rawDate) : new Date();
  if (isNaN(txDate.getTime())) {
    return { success: false, error: "Invalid date." };
  }

  const amountInKobo = Math.round(amount * 100);

  await db.insert(transactions).values({
    userId: user.id,
    description,
    amount: amountInKobo,
    type: rawType,
    transactionDate: txDate,
    source: "manual",
  });

  revalidatePath("/dashboard");
  return { success: true };
}