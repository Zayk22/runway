// ============================================
// CSV PARSING UTILITIES
// All parsing happens client-side. The raw file never leaves the browser.
// ============================================

export type ColumnMapping = {
  date: string;         // header name
  description: string;  // header name
  amount: string;       // header name
  typeMode: "expense" | "income" | "sign";
};

export type NormalizedTransaction = {
  description: string;
  amount: number;       // kobo, always positive
  type: "income" | "expense";
  transactionDate: string; // ISO string
};

export type NormalizeResult = {
  valid: NormalizedTransaction[];
  skipped: number;
};

// ============================================
// AMOUNT
// Handles: "1,500.00", "₦1500", "1 500,50", "-2500", "1500 DR"
// ============================================
export function parseAmount(raw: string): number | null {
  if (!raw) return null;

  // Strip currency symbols, spaces, commas, letters (like DR/CR)
  const cleaned = String(raw)
    .replace(/[₦$€£¥,\s]/g, "")
    .replace(/[a-zA-Z]/g, "")
    .trim();

  if (!cleaned) return null;

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;

  return num;
}

// ============================================
// DATE
// Handles: ISO (YYYY-MM-DD), DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
// Returns a Date at 12:00 UTC of the parsed day — timezone-safe.
// ============================================
export function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const m = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let day = parseInt(m[1], 10);
    let month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);

    if (year < 100) year += 2000;

    // If "month" > 12, the CSV is probably MM/DD/YYYY — swap
    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Noon UTC of that day — safe across timezones
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

// ============================================
// NORMALIZE
// Takes raw rows + mapping, returns clean transaction objects.
// ============================================
export function normalizeRows(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping
): NormalizeResult {
  const dateIdx = headers.indexOf(mapping.date);
  const descIdx = headers.indexOf(mapping.description);
  const amountIdx = headers.indexOf(mapping.amount);

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return { valid: [], skipped: rows.length };
  }

  const valid: NormalizedTransaction[] = [];
  let skipped = 0;

  for (const row of rows) {
    const rawDate = row[dateIdx] ?? "";
    const rawDesc = row[descIdx] ?? "";
    const rawAmount = row[amountIdx] ?? "";

    const parsedDate = parseDate(rawDate);
    const parsedAmount = parseAmount(rawAmount);
    const description = String(rawDesc).trim().slice(0, 200);

    if (!parsedDate || parsedAmount === null || !description) {
      skipped++;
      continue;
    }

    let type: "income" | "expense";
    let amount: number;

    if (mapping.typeMode === "expense") {
      type = "expense";
      amount = Math.abs(parsedAmount);
    } else if (mapping.typeMode === "income") {
      type = "income";
      amount = Math.abs(parsedAmount);
    } else {
      // sign-based
      if (parsedAmount === 0) {
        skipped++;
        continue;
      }
      type = parsedAmount < 0 ? "expense" : "income";
      amount = Math.abs(parsedAmount);
    }

    const amountInKobo = Math.round(amount * 100);

    if (amountInKobo <= 0) {
      skipped++;
      continue;
    }

    valid.push({
      description,
      amount: amountInKobo,
      type,
      transactionDate: parsedDate.toISOString(),
    });
  }

  return { valid, skipped };
}

// ============================================
// AUTO-DETECT — guess column names from headers
// ============================================
export function guessMapping(headers: string[]): Partial<ColumnMapping> {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const findFirst = (needles: string[]): string | undefined => {
    for (const needle of needles) {
      const idx = lower.findIndex((h) => h.includes(needle));
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  };

  return {
    date: findFirst(["date", "time", "day"]),
    description: findFirst([
      "narration",
      "description",
      "details",
      "particular",
      "remark",
      "reference",
      "memo",
    ]),
    amount: findFirst(["amount", "value", "debit", "credit"]),
  };
}