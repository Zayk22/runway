import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/queries";

// ============================================
// ONBOARDING ROUTER
// Inspects the user's onboarding_step and routes them to the correct
// step of the wizard. Never renders anything itself.
//
//   0 = needs cap            → /onboarding/cap
//   1 = needs baseline       → /onboarding/baseline
//   2 = needs pacing mode    → /onboarding/mode
//   3 = complete             → /dashboard
// ============================================

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  switch (user.onboardingStep) {
    case 0:
      redirect("/onboarding/cap");
    case 1:
      redirect("/onboarding/baseline");
    case 2:
      redirect("/onboarding/mode");
    default:
      redirect("/dashboard");
  }
}