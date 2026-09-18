"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  ArrowLeft,
  Check,
  FileSpreadsheet,
  FileText,
  Upload,
} from "lucide-react";
import {
  guessMapping,
  normalizeRows,
  type ColumnMapping,
  type NormalizedTransaction,
} from "@/lib/csv";
import { parseOpayPdf } from "@/lib/pdf";
import { importTransactions } from "@/app/(app)/upload/actions";

type Stage = "idle" | "mapping" | "pdf-preview" | "importing" | "success";

const PREVIEW_ROWS = 5;

type Props = {
  nextHref?: string;
  nextLabel?: string;
};

export function CsvUpload({
  nextHref = "/dashboard",
  nextLabel = "Back to dashboard",
}: Props = {}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState("");
  const [fileSource, setFileSource] = useState<string>("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
    typeMode: "expense",
  });
  const [pdfTxs, setPdfTxs] = useState<NormalizedTransaction[]>([]);
  const [pdfSkipped, setPdfSkipped] = useState(0);
  const [pdfInternalFiltered, setPdfInternalFiltered] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);

    const lower = file.name.toLowerCase();

    if (lower.endsWith(".csv")) {
      setFileSource("csv");
      handleCsv(file);
      return;
    }

    if (lower.endsWith(".pdf")) {
      setFileSource("pdf-opay");
      await handlePdf(file);
      return;
    }

    setError("Unsupported file type. Use .csv or .pdf.");
  }, []);

  const handleCsv = (file: File) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: "greedy",
      complete: (result) => {
        const data = result.data.filter(
          (r) => Array.isArray(r) && r.some((c) => String(c).trim())
        );
        if (data.length < 2) {
          setError("File appears to be empty or missing a header row.");
          return;
        }

        const rawHeaders = data[0].map((h) =>
          String(h).replace(/^\uFEFF/, "").trim()
        );
        const bodyRows = data.slice(1).map((r) =>
          r.map((c) => (c === null || c === undefined ? "" : String(c)))
        );

        setHeaders(rawHeaders);
        setRows(bodyRows);

        const guessed = guessMapping(rawHeaders);
        setMapping({
          date: guessed.date ?? "",
          description: guessed.description ?? "",
          amount: guessed.amount ?? "",
          typeMode: "expense",
        });

        setStage("mapping");
      },
      error: (err) => setError(`Could not read file: ${err.message}`),
    });
  };

  const handlePdf = async (file: File) => {
    setIsParsingPdf(true);
    setError(null);

    try {
      const result = await parseOpayPdf(file);

      if (result.transactions.length === 0) {
        setError(
          `Couldn't extract any transactions from this PDF. ${result.totalRows} rows matched the date pattern, but no valid amounts were found.`
        );
        setIsParsingPdf(false);
        return;
      }

      setPdfTxs(result.transactions);
      setPdfSkipped(result.skipped);
      setPdfInternalFiltered(result.internalFiltered);
      setStage("pdf-preview");
    } catch (err) {
      setError(
        `PDF parsing failed: ${err instanceof Error ? err.message : "unknown error"}`
      );
    } finally {
      setIsParsingPdf(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const preview = useMemo(() => {
    if (!headers.length) return [];
    return rows.slice(0, PREVIEW_ROWS).map((r) =>
      headers.reduce<Record<string, string>>((acc, h, i) => {
        acc[h] = r[i] ?? "";
        return acc;
      }, {})
    );
  }, [headers, rows]);

  const canImportCsv =
    mapping.date && mapping.description && mapping.amount && rows.length > 0;

  const handleImportCsv = async () => {
    if (!canImportCsv) return;

    setStage("importing");
    setError(null);

    const { valid, skipped } = normalizeRows(headers, rows, mapping);

    if (valid.length === 0) {
      setError(`No valid rows found. Checked ${rows.length}.`);
      setStage("mapping");
      return;
    }

    const result = await importTransactions(valid, "csv");

    if (!result.success) {
      setError(result.error ?? "Import failed.");
      setStage("mapping");
      return;
    }

    setImportedCount(result.inserted);
    setSkippedCount(skipped);
    setStage("success");
  };

  const handleImportPdf = async () => {
    if (pdfTxs.length === 0) return;

    setStage("importing");
    setError(null);

    const result = await importTransactions(pdfTxs, "pdf-opay");

    if (!result.success) {
      setError(result.error ?? "Import failed.");
      setStage("pdf-preview");
      return;
    }

    setImportedCount(result.inserted);
    setSkippedCount(pdfSkipped);
    setStage("success");
  };

  const reset = () => {
    setStage("idle");
    setFileName("");
    setFileSource("csv");
    setHeaders([]);
    setRows([]);
    setPdfTxs([]);
    setPdfSkipped(0);
    setPdfInternalFiltered(0);
    setError(null);
    setImportedCount(0);
    setSkippedCount(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ============ IDLE ============
  if (stage === "idle") {
    return (
      <div>
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-300 transition-colors p-12 text-center cursor-pointer"
          onClick={() => !isParsingPdf && inputRef.current?.click()}
        >
          {isParsingPdf ? (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-zinc-200 border-t-zinc-900 mx-auto animate-spin" />
              <p className="mt-5 text-[13.5px] text-zinc-500">
                Reading PDF…
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-5 h-5 text-zinc-600" strokeWidth={1.75} />
              </div>
              <p className="text-[14px] font-medium text-zinc-900">
                Drop your statement here, or click to browse
              </p>
              <p className="text-[12.5px] text-zinc-400 mt-2">
                CSV or PDF. Parsed entirely in your browser.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.pdf,text/csv,application/pdf"
                onChange={onFileInputChange}
                className="hidden"
              />
            </>
          )}
        </div>

        {error && <p className="mt-4 text-[13px] text-red-600">{error}</p>}
      </div>
    );
  }

  // ============ PDF PREVIEW ============
  if (stage === "pdf-preview") {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-zinc-900 truncate">
                {fileName}
              </p>
              <p className="text-[12px] text-zinc-400">
                {pdfTxs.length} transaction{pdfTxs.length === 1 ? "" : "s"} ready
                {pdfInternalFiltered > 0 &&
                  ` · ${pdfInternalFiltered} internal transfer${pdfInternalFiltered === 1 ? "" : "s"} filtered`}
                {pdfSkipped > 0 &&
                  ` · ${pdfSkipped} row${pdfSkipped === 1 ? "" : "s"} skipped`}
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="text-[12.5px] text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
          >
            Change file
          </button>
        </div>

        <div>
          <h3 className="text-[12px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-3">
            Preview · first {Math.min(8, pdfTxs.length)} transaction
            {Math.min(8, pdfTxs.length) === 1 ? "" : "s"}
          </h3>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500 whitespace-nowrap">
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">
                      Description
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-zinc-500 whitespace-nowrap">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pdfTxs.slice(0, 8).map((tx, i) => (
                    <tr key={i} className="hover:bg-zinc-50/60">
                      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap tabular-nums">
                        {new Date(tx.transactionDate).toLocaleDateString(
                          "en-NG",
                          { month: "short", day: "numeric" }
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-700 max-w-[400px] truncate">
                        {tx.description}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right whitespace-nowrap tabular-nums font-medium ${
                          tx.type === "income"
                            ? "text-emerald-600"
                            : "text-zinc-900"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "−"}₦
                        {(tx.amount / 100).toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {pdfInternalFiltered > 0 && (
            <p className="mt-3 text-[12px] text-zinc-400 leading-relaxed">
              We filtered out {pdfInternalFiltered} internal OWealth transfer
              {pdfInternalFiltered === 1 ? "" : "s"} — those are moves between your
              own savings and current account, not real income or spending.
            </p>
          )}
        </div>

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={reset}
            className="h-11 px-5 rounded-xl border border-zinc-200 text-[13px] font-medium text-zinc-700 hover:border-zinc-300 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            Back
          </button>
          <button
            onClick={handleImportPdf}
            className="h-11 px-6 rounded-xl bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-800 transition-colors"
          >
            Import {pdfTxs.length} transaction{pdfTxs.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    );
  }

  // ============ CSV MAPPING ============
  if (stage === "mapping") {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileSpreadsheet className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-zinc-900 truncate">
                {fileName}
              </p>
              <p className="text-[12px] text-zinc-400">
                {rows.length} row{rows.length === 1 ? "" : "s"} detected
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="text-[12.5px] text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
          >
            Change file
          </button>
        </div>

        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900 mb-1">
            Map your columns
          </h2>
          <p className="text-[13px] text-zinc-500 mb-5">
            Tell us which column in your statement holds which piece of data.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MappingSelect
              label="Date"
              value={mapping.date}
              headers={headers}
              onChange={(v) => setMapping({ ...mapping, date: v })}
            />
            <MappingSelect
              label="Description"
              value={mapping.description}
              headers={headers}
              onChange={(v) => setMapping({ ...mapping, description: v })}
            />
            <MappingSelect
              label="Amount"
              value={mapping.amount}
              headers={headers}
              onChange={(v) => setMapping({ ...mapping, amount: v })}
            />
          </div>

          <div className="mt-4">
            <label className="block text-[12px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">
              Transaction type
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { v: "expense", l: "All expenses" },
                  { v: "income", l: "All income" },
                  { v: "sign", l: "From amount sign" },
                ] as const
              ).map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMapping({ ...mapping, typeMode: v })}
                  className={`h-9 px-4 rounded-lg text-[13px] font-medium border transition-colors ${
                    mapping.typeMode === v
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[12px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-3">
            Preview · first {Math.min(PREVIEW_ROWS, rows.length)} rows
          </h3>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 font-medium text-zinc-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50/60">
                      {headers.map((h) => (
                        <td
                          key={h}
                          className="px-4 py-2.5 text-zinc-700 whitespace-nowrap max-w-[280px] truncate"
                        >
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={reset}
            className="h-11 px-5 rounded-xl border border-zinc-200 text-[13px] font-medium text-zinc-700 hover:border-zinc-300 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            Back
          </button>
          <button
            onClick={handleImportCsv}
            disabled={!canImportCsv}
            className="h-11 px-6 rounded-xl bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import {rows.length} row{rows.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    );
  }

  // ============ IMPORTING ============
  if (stage === "importing") {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-200 border-t-zinc-900 mx-auto animate-spin" />
        <p className="mt-5 text-[13.5px] text-zinc-500">Importing…</p>
      </div>
    );
  }

  // ============ SUCCESS ============
  return (
    <div className="py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
        <Check className="w-5 h-5 text-emerald-600" strokeWidth={2} />
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-zinc-900">
        Imported {importedCount} transaction{importedCount === 1 ? "" : "s"}
      </h2>
      <p className="text-[13.5px] text-zinc-500 mt-2">
        {pdfInternalFiltered > 0 && fileSource.startsWith("pdf") ? (
          <>
            {pdfInternalFiltered} internal transfer
            {pdfInternalFiltered === 1 ? "" : "s"} filtered out.
            {skippedCount > 0 &&
              ` ${skippedCount} row${skippedCount === 1 ? "" : "s"} skipped (couldn't parse).`}
          </>
        ) : skippedCount > 0 ? (
          `${skippedCount} row${skippedCount === 1 ? "" : "s"} skipped (couldn't parse)`
        ) : (
          "All rows imported cleanly."
        )}
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="h-11 px-5 rounded-xl border border-zinc-200 text-[13px] font-medium text-zinc-700 hover:border-zinc-300 transition-colors"
        >
          Upload another
        </button>
        <button
          onClick={() => router.push(nextHref)}
          className="h-11 px-6 rounded-xl bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-800 transition-colors"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function MappingSelect({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 text-[13.5px] text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 transition-colors bg-white cursor-pointer"
      >
        <option value="">Select column…</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}