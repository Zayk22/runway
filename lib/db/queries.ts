import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, type User } from "./schema";

/**
 * Get the current authenticated user's DB row.
 *
 * Returns null in three cases:
 *   1. No Clerk session (not signed in)
 *   2. Clerk session exists but the webhook hasn't synced the row yet
 *   3. Anything else went wrong looking them up
 *
 * Callers should handle null by redirecting to onboarding or sign-in.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  return user ?? null;
}

/**
 * Ensure the current Clerk user has a DB row.
 *
 * Fallback for the rare case where a user signs in before the webhook
 * has synced them. Idempotent — safe to call on every page load.
 *
 * Returns the user row (existing or newly created), or null if not signed in.
 */
export async function ensureCurrentUser(): Promise<User | null> {
  const existing = await getCurrentUser();
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) return null;

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  const [created] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email: primaryEmail,
      displayName,
    })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();

  // If onConflictDoNothing returned nothing (race condition), re-fetch.
  if (!created) {
    return getCurrentUser();
  }

  return created;
}