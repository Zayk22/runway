import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""} 👋
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          You're signed in. Let's finish setting up your budget.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
          Debug info
        </h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="text-zinc-500 w-24 shrink-0">Clerk ID</span>
            <span className="font-mono text-zinc-700 break-all">{userId}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-zinc-500 w-24 shrink-0">Email</span>
            <span className="font-mono text-zinc-700 break-all">
              {user?.emailAddresses[0]?.emailAddress ?? "—"}
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-6">
          This page is temporary — it will be replaced with your budget dashboard
          in Phase 3.
        </p>
      </div>
    </div>
  );
}