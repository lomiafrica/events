import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Minimal purchase shape for the paid-guest PDF. */
export interface PaidGuestPdfPurchase {
  purchase_id: string;
  event_id: string | null;
  status: string;
  customer_name: string;
  customer_email: string;
  ticket_name: string;
  quantity: number;
  is_used: boolean;
  is_bundle?: boolean;
  tickets_per_bundle?: number;
  admission_total?: number;
  scanned_count?: number | null;
}

function isEventTicketPurchase(p: PaidGuestPdfPurchase): boolean {
  return p.event_id != null && String(p.event_id).trim() !== "";
}

function getAdmissionTotal(p: PaidGuestPdfPurchase): number {
  if (typeof p.admission_total === "number" && p.admission_total > 0) {
    return p.admission_total;
  }
  if (p.is_bundle) {
    return Math.max(1, p.quantity * (p.tickets_per_bundle ?? 1));
  }
  return Math.max(1, p.quantity);
}

function getScannedCount(p: PaidGuestPdfPurchase): number {
  if (p.scanned_count !== undefined && p.scanned_count !== null) {
    return Number(p.scanned_count);
  }
  return p.is_used ? getAdmissionTotal(p) : 0;
}

type AdmissionScanState = "none" | "partial" | "full";

function getAdmissionScanState(p: PaidGuestPdfPurchase): AdmissionScanState {
  const total = getAdmissionTotal(p);
  const scanned = getScannedCount(p);
  if (scanned <= 0) return "none";
  if (scanned >= total) return "full";
  return "partial";
}

function collapseExportWhitespace(raw: string | null | undefined): string {
  let s = String(raw ?? "");
  s = s.replace(/[\r\n\u0085\u2028\u2029\t\v\f]+/g, " ");
  s = s.replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, "");
  s = s.replace(/\u00AD/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

/** O-slash-like code points (empty set, diameter, etc.) often used in bad CMS exports. */
const O_SLASH_LIKE = "[\\u00D8\\u00F8\\u019F\\u2205\\u2300]";

/** Remove merge-field noise after O-slash-like glyphs. */
function stripOslashMergeGarbage(s: string): string {
  // Letter/digit jammed against O-slash with no space
  s = s.replace(new RegExp(`([\\p{L}\\p{N}])${O_SLASH_LIKE}`, "gu"), "$1 ");
  // Ø-like + angle/chevron + trailing non-space junk
  s = s.replace(
    new RegExp(
      `\\s*${O_SLASH_LIKE}\\s*[\\x3C\\x3E\\uFF1C\\uFF1E\\u2039\\u203A\\u276E\\u276F\\u00AB\\u00BB]\\S{0,32}`,
      "gu",
    ),
    " ",
  );
  // O-slash-like + Symbol + junk
  s = s.replace(new RegExp(`\\s*${O_SLASH_LIKE}\\p{S}\\S{0,32}`, "gu"), " ");
  // O-slash-like + Latin-1 mojibake tail (thorn, eszett, circled chars, guillemets)
  s = s.replace(
    new RegExp(
      `\\s*${O_SLASH_LIKE}\\s*[\\u00DE\\u00DF\\u00C2\\u00AB\\u00BB\\u00A0]{1,12}\\S{0,12}`,
      "gu",
    ),
    " ",
  );
  s = s.replace(/\s*[\u00AB\u00BB\u2039\u203A\u276E\u276F]{1,3}\s*/g, " ");
  s = s.replace(/\s*\u00DF\u00AB+\s*/g, " ");
  s = s.replace(/\s*\u00DE\u00C2+\s*/g, " ");
  // Orphan angle clusters (e.g. leftover <ß«)
  s = s.replace(
    /\s*[\x3C\x3E\uFF1C\uFF1E][\u00DF\u00DE\u00AB\u00BB]{0,4}\S{0,8}/gu,
    " ",
  );
  return s;
}

/**
 * "BOILER ROOM \u2026 \u2013 REGULAR" \u2192 "REGULAR". Keeps "PACK \u2013 VENUE" when left part is short.
 */
function shortenTicketTitleForPdf(s: string): string {
  const parts = s
    .split(/\s*[\u2013\u2014]\s*|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return s;
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  if (
    first.length >= 26 &&
    last.length >= 4 &&
    last.length <= 72 &&
    last !== first
  ) {
    return last;
  }
  return s;
}

function normalizeTicketTitleForExport(raw: string | null | undefined): string {
  let s = collapseExportWhitespace(raw);
  if (!s) return "\u2014";
  s = s.normalize("NFKC");
  s = stripOslashMergeGarbage(s);
  s = s.replace(/\s*([\u2013\u2014])\s*/g, " $1 ");
  s = s.replace(/\s*-\s*/g, " \u2013 ");
  s = s.replace(/\s{2,}/g, " ").trim();
  // Shorten first: garbage often lives in the last segment ("REGULAR Ø<ß«").
  s = shortenTicketTitleForPdf(s);
  s = stripOslashMergeGarbage(s);
  s = stripOslashMergeGarbage(s);
  s = s.replace(/\s{2,}/g, " ").trim();
  s = s.replace(/\s+[\u00AB\u00BB\u2039\u203A]{1,2}\s*$/u, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s || "\u2014";
}

/** Product label only; ticket counts live in the Tickets column. */
function formatItemNameForPdf(p: PaidGuestPdfPurchase): string {
  const name = normalizeTicketTitleForExport(p.ticket_name);
  if (p.is_bundle && name !== "\u2014") {
    return `${name} (pack)`;
  }
  return name;
}

/** Short labels so the Admission column is not clipped in the PDF. */
function formatScanLabelForPdf(p: PaidGuestPdfPurchase): string {
  const st = getAdmissionScanState(p);
  if (st === "full") return "Scanned";
  if (st === "partial") return "Partial";
  return "Not scanned";
}

function slugForFilenamePart(raw: string, maxLen: number): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!s) return "event";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function buildPaidGuestPdfRows(
  purchases: PaidGuestPdfPurchase[],
  selectedEvent: string | null,
): string[][] {
  if (!selectedEvent) return [];
  return purchases
    .filter(isEventTicketPurchase)
    .filter((p) => p.status === "paid")
    .filter((p) => p.event_id === selectedEvent)
    .sort((a, b) => {
      const byName = (a.customer_name || "").localeCompare(
        b.customer_name || "",
        undefined,
        { sensitivity: "base" },
      );
      if (byName !== 0) return byName;
      return (a.purchase_id || "").localeCompare(b.purchase_id || "");
    })
    .map((p) => [
      collapseExportWhitespace(p.customer_name) || "\u2014",
      formatItemNameForPdf(p),
      String(getAdmissionTotal(p)),
      collapseExportWhitespace(p.customer_email) || "\u2014",
      formatScanLabelForPdf(p),
    ]);
}

export function downloadPaidGuestsPdf(options: {
  purchases: PaidGuestPdfPurchase[];
  selectedEvent: string;
  eventTitle: string;
  bodyRows: string[][];
}): void {
  const { purchases, selectedEvent, eventTitle, bodyRows } = options;
  if (!selectedEvent || bodyRows.length === 0) return;

  const paidPurchases = purchases.filter(
    (p) => p.event_id === selectedEvent && p.status === "paid",
  );
  const totalPurchases = paidPurchases.length;
  const totalTickets = paidPurchases.reduce(
    (sum, p) => sum + getAdmissionTotal(p),
    0,
  );

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(eventTitle, margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Purchases: ${totalPurchases}`, margin, 26);
  doc.text(`Total tickets: ${totalTickets}`, margin, 33);

  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, 39);
  doc.setTextColor(0);

  const innerW = pageW - margin * 2;
  const colName = 40;
  const colTickets = 16;
  const colEmail = 58;
  const colAdmission = 46;
  const colItem = innerW - colName - colTickets - colEmail - colAdmission;

  autoTable(doc, {
    startY: 44,
    head: [["Name", "Item", "Tickets", "Email", "Admission"]],
    body: bodyRows,
    styles: {
      fontSize: 9,
      cellPadding: 1.75,
      overflow: "linebreak",
      valign: "top",
      minCellHeight: 10,
    },
    headStyles: {
      fillColor: [41, 41, 55],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: colName },
      1: {
        cellWidth: colItem,
        fontSize: 7.5,
        cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
      },
      2: { cellWidth: colTickets, halign: "center", fontSize: 9 },
      3: { cellWidth: colEmail },
      4: { cellWidth: colAdmission, fontSize: 8.5 },
    },
    margin: { left: margin, right: margin },
  });

  const eventPart = slugForFilenamePart(eventTitle, 40);
  const datePart = new Date().toISOString().split("T")[0];
  doc.save(`paid-guests-${eventPart}-${datePart}.pdf`);
}
