import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      forceRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-zinc-200 rounded-xl bg-white",
          headerTitle: "text-zinc-900",
          headerSubtitle: "text-zinc-500",
          socialButtonsBlockButton:
            "border border-zinc-200 hover:bg-zinc-50 text-zinc-700",
          formFieldLabel: "text-zinc-700",
          formFieldInput:
            "border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500",
          formButtonPrimary:
            "bg-emerald-600 hover:bg-emerald-700 text-white normal-case text-sm",
          footerActionLink: "text-emerald-600 hover:text-emerald-700",
        },
      }}
    />
  );
}