/**
 * Server-side parser for CSV and Excel files.
 * Accepts base64-encoded file content and returns parsed rows + detected columns.
 */
import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedRow = Record<string, string>;

export interface ParseResult {
  columns: string[];
  rows: ParsedRow[];
  totalRows: number;
  errors: string[];
}

/**
 * Parse a base64-encoded CSV or XLSX file.
 * @param base64 - base64 string of the file content
 * @param mimeType - MIME type hint ("text/csv" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | etc.)
 */
export function parseImportFile(base64: string, mimeType: string): ParseResult {
  const errors: string[] = [];

  try {
    const buffer = Buffer.from(base64, "base64");
    const isExcel =
      mimeType.includes("spreadsheetml") ||
      mimeType.includes("excel") ||
      mimeType.includes("xls");

    if (isExcel) {
      return parseExcel(buffer);
    } else {
      return parseCsv(buffer.toString("utf-8"));
    }
  } catch (err: any) {
    errors.push(err?.message ?? "Erro ao processar arquivo");
    return { columns: [], rows: [], totalRows: 0, errors };
  }
}

function parseCsv(content: string): ParseResult {
  const errors: string[] = [];

  const result = Papa.parse<ParsedRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  if (result.errors.length > 0) {
    errors.push(...result.errors.slice(0, 3).map((e) => e.message));
  }

  const rows = result.data as ParsedRow[];
  const columns = result.meta.fields ?? [];

  return { columns, rows, totalRows: rows.length, errors };
}

function parseExcel(buffer: Buffer): ParseResult {
  const errors: string[] = [];

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { columns: [], rows: [], totalRows: 0, errors: ["Planilha vazia ou inválida"] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const rows: ParsedRow[] = rawRows.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? "").trim()])
    )
  );

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { columns, rows, totalRows: rows.length, errors };
}

/**
 * Apply column mapping to parsed rows and return contact-shaped objects.
 * mapping: { nome: "Column A", telefone: "Column B", tags: "Column C", email: "Column D" }
 */
export function applyMapping(
  rows: ParsedRow[],
  mapping: Record<string, string>
): Array<{ name: string; phone: string; tags: string[]; email?: string }> {
  return rows
    .map((row) => {
      const name = mapping.nome ? (row[mapping.nome] ?? "").trim() : "";
      const phone = mapping.telefone ? (row[mapping.telefone] ?? "").trim() : "";
      const tagsRaw = mapping.tags ? (row[mapping.tags] ?? "").trim() : "";
      const email = mapping.email ? (row[mapping.email] ?? "").trim() : undefined;

      const tags = tagsRaw
        ? tagsRaw
            .split(/[,;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      return { name, phone, tags, email };
    })
    .filter((c) => c.name || c.phone); // skip completely empty rows
}
