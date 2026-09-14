import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const { type, data } = evt;

    if (type === "user.created" || type === "user.updated") {
      const { id, email_addresses, first_name, last_name, username } = data;

      const primaryEmail =
        email_addresses?.[0]?.email_address ?? null;

      if (!primaryEmail) {
        console.error("Clerk webhook: user has no email", id);
        return NextResponse.json(
          { error: "User has no email address" },
          { status: 400 }
        );
      }

      const displayName =
        [first_name, last_name].filter(Boolean).join(" ") ||
        username ||
        null;

      if (type === "user.created") {
        await db
          .insert(users)
          .values({
            clerkUserId: id,
            email: primaryEmail,
            displayName,
          })
          .onConflictDoNothing({ target: users.clerkUserId });

        console.log(`Webhook: created user ${id}`);
      } else {
        await db
          .update(users)
          .set({
            email: primaryEmail,
            displayName,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkUserId, id));

        console.log(`Webhook: updated user ${id}`);
      }
    }

    if (type === "user.deleted") {
      const { id } = data;
      if (id) {
        await db.delete(users).where(eq(users.clerkUserId, id));
        console.log(`Webhook: deleted user ${id}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }
}