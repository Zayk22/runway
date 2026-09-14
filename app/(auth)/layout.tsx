import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-2xl font-bold tracking-tight text-zinc-900 hover:text-zinc-700 transition-colors"
          >
            Runway
          </Link>
          <p className="text-sm text-zinc-500 mt-1">
            Stay on budget, one day at a time
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}