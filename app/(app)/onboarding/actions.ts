"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function setMonthlyCap(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { success: false, error: "You must be signed in." };
  }

  const rawAmount = formData.get("cap");
  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter a valid amount greater than 0." };
  }

  if (amount > 100_000_000) {
    return { success: false, error: "That's too large. Enter a realistic cap." };
  }

  const capInKobo = Math.round(amount * 100);

  await db
    .update(users)
    .set({
      monthlyCap: capInKobo,
      capCompletedAt: new Date(),
      onboardingStep: 1, // cap done, needs baseline
    })
    .where(eq(users.clerkUserId, clerkUserId));

  redirect("/onboarding/baseline");
}