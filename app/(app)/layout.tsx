import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 sticky top-0 bg-white/90 backdrop-blur-sm z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
          <Link
            href="/dashboard"
            className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-900 hover:text-emerald-600 transition-colors"
          >
            Runway
          </Link>
          <div className="ml-auto flex items-center">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                  userButtonPopoverCard: "shadow-lg border border-zinc-200",
                },
              }}
            />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">{children}</main>
    </div>
  );
}