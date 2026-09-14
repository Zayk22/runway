"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/db/queries";
import type { NormalizedTransaction } from "@/lib/csv";

export type ImportResult = {
  success: boolean;
  inserted: number;
  error?: string;
};

const MAX_ROWS_PER_IMPORT = 5000;

export async function importTransactions(
  rows: NormalizedTransaction[]
): Promise<ImportResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, inserted: 0, error: "Not signed in." };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, inserted: 0, error: "No transactions to import." };
  }

  if (rows.length > MAX_ROWS_PER_IMPORT) {
    return {
      success: false,
      inserted: 0,
      error: `Too many rows. Max ${MAX_ROWS_PER_IMPORT} per import.`,
    };
  }

  // Validate + normalize the payload coming from the client
  const cleaned = rows
    .map((r) => {
      const description = String(r.description ?? "").trim().slice(0, 200);
      const amount = Number(r.amount);
      const type = r.type === "income" ? "income" : "expense";
      const txDate = new Date(r.transactionDate);

      if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        isNaN(txDate.getTime())
      ) {
        return null;
      }

      return {
        userId: user.id,
        description,
        amount: Math.round(amount),
        type: type as "income" | "expense",
        transactionDate: txDate,
        source: "csv" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (cleaned.length === 0) {
    return {
      success: false,
      inserted: 0,
      error: "No valid transactions in the file.",
    };
  }

  await db.insert(transactions).values(cleaned);

  revalidatePath("/dashboard");
  revalidatePath("/upload");

  return { success: true, inserted: cleaned.length };
}