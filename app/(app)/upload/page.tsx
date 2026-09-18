import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ensureCurrentUser } from "@/lib/db/queries";
import { CsvUpload } from "@/components/csv-upload";

export default async function UploadPage() {
  const user = await ensureCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.monthlyCap === null) {
    redirect("/onboarding");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
        Back to dashboard
      </Link>

      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-3">
          Import
        </p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] text-zinc-900">
          Upload a statement
        </h1>
        <p className="text-[14px] text-zinc-500 mt-3 leading-relaxed max-w-lg">
          CSV or PDF. Your file is parsed entirely in your browser. Only the
          extracted transactions are sent to our server — the raw file never
          leaves your device.
        </p>
      </div>

      <CsvUpload />
    </div>
  );
}