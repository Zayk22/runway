"use client";

import * as pdfjsLib from "pdfjs-dist";
import type { NormalizedTransaction } from "./csv";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ============================================
// OPAY PDF PARSER
// ============================================

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const TX_START = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+/;

type TextItem = {
  str: string;
  transform: number[];
};

export type PdfParseResult = {
  transactions: NormalizedTransaction[];
  skipped: number;
  internalFiltered: number;
  totalRows: number;
};

// ============================================
// INTERNAL TRANSFER DETECTION
//
// Opay PDFs include "OWealth" entries that are just money moving between
// the user's own savings pocket and current account. These aren't real
// income or expenses — counting them doubles the actual spend. We skip
// them silently and report the count.
//
// Examples:
//   "OWealth Withdrawal(Transaction Payment)"
//   "Auto-save to OWealth Balance"
//   "OWealth Interest Earned"
//   "OWalith Withdrawal (Transaction Payment)"  ← PDF typo variant
// ============================================

function isInternalTransfer(description: string): boolean {
  const d = description.toLowerCase();
  const hasWealthRef = d.includes("owealth") || d.includes("owalith");
  if (!hasWealthRef) return false;

  return (
    d.includes("withdrawal") ||
    d.includes("auto-save") ||
    d.includes("autosave") ||
    d.includes("auto - save") ||
    d.includes("interest earned")
  );
}

// ============================================
// Extract visual rows from a PDF
// ============================================

async function extractLines(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const rows = new Map<number, TextItem[]>();

    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const it = item as unknown as TextItem;
      if (!Array.isArray(it.transform)) continue;

      const y = Math.round(it.transform[5] / 2) * 2;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push(it);
    }

    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = rows.get(y)!;
      items.sort((a, b) => a.transform[4] - b.transform[4]);
      const line = items
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) allLines.push(line);
    }
  }

  return allLines;
}

function parseAmountStr(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function buildDate(
  day: number,
  monthIdx: number,
  year: number,
  hour = 12,
  minute = 0,
  second = 0
): Date | null {
  const utcHour = hour - 1;
  const d = new Date(Date.UTC(year, monthIdx, day, utcHour, minute, second));
  return isNaN(d.getTime()) ? null : d;
}

function parseOpayLines(lines: string[]): PdfParseResult {
  const transactions: NormalizedTransaction[] = [];
  let skipped = 0;
  let internalFiltered = 0;
  let totalRows = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(TX_START);
    if (!m) continue;

    totalRows++;

    const day = parseInt(m[1], 10);
    const monthIdx = MONTHS[m[2].toLowerCase()];
    const year = parseInt(m[3], 10);
    const hour = parseInt(m[4], 10);
    const minute = parseInt(m[5], 10);
    const second = parseInt(m[6], 10);

    if (monthIdx === undefined) {
      skipped++;
      continue;
    }

    const txDate = buildDate(day, monthIdx, year, hour, minute, second);
    if (!txDate) {
      skipped++;
      continue;
    }

    let rest = line.slice(m[0].length);
    rest = rest.replace(/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+/, "");

    const sepIdx = rest.indexOf(" -- ");
    if (sepIdx === -1) {
      skipped++;
      continue;
    }

    const before = rest.slice(0, sepIdx);
    const after = rest.slice(sepIdx + 4);

    const debitMatch = before.match(/([\d,]+\.\d{2})\s*$/);
    const creditMatch = after.match(/^([\d,]+\.\d{2})/);

    let amount: number | null = null;
    let type: "income" | "expense" | null = null;
    let description = "";

    if (debitMatch) {
      amount = parseAmountStr(debitMatch[1]);
      type = "expense";
      description = before.slice(0, before.length - debitMatch[0].length).trim();
    } else if (creditMatch) {
      amount = parseAmountStr(creditMatch[1]);
      type = "income";
      description = before.trim();
    }

    if (amount === null || type === null || amount <= 0 || !description) {
      skipped++;
      continue;
    }

    const cleanDesc = description
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);

    // Skip internal OWealth transfers (not real income/expense)
    if (isInternalTransfer(cleanDesc)) {
      internalFiltered++;
      continue;
    }

    transactions.push({
      description: cleanDesc,
      amount: Math.round(amount * 100),
      type,
      transactionDate: txDate.toISOString(),
    });
  }

  return { transactions, skipped, internalFiltered, totalRows };
}

export async function parseOpayPdf(file: File): Promise<PdfParseResult> {
  const lines = await extractLines(file);
  return parseOpayLines(lines);
}