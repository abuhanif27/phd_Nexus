import { jsPDF } from 'jspdf';

const MARGIN = 20;
const PAGE_W = 210;
const LINE_HEIGHT = 6;
const SECTION_GAP = 10;

export type HealthSummaryPdfData = {
  aiSummary: string;
  contentFromRecords: string[];
  conditions: Array<{ name?: string }>;
  medications: Array<{ name?: string }>;
  sourceCounts: { lab?: number; prescription?: number; encounter?: number; file?: number };
  dateRange?: { newest?: string; oldest?: string };
  recordCount: number;
};

function addSection(
  doc: jsPDF,
  y: number,
  title: string,
  content: string | string[],
  maxWidth: number
): number {
  const startY = y;
  doc.setFontSize(11);
  doc.setTextColor(88, 80, 236); // purple-600
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, startY);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81); // gray-800
  doc.setFont('helvetica', 'normal');

  const lines = Array.isArray(content) ? content : [content];
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    for (const w of wrapped) {
      if (y > 270) {
        doc.addPage();
        y = MARGIN + LINE_HEIGHT;
      }
      doc.text(w, MARGIN, y);
      y += LINE_HEIGHT;
    }
    y += 2;
  }
  return y + SECTION_GAP;
}

export function exportHealthSummaryPdf(data: HealthSummaryPdfData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const maxWidth = PAGE_W - 2 * MARGIN;
  let y = MARGIN + 5;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(88, 80, 236);
  doc.setFont('helvetica', 'bold');
  doc.text('NexusCare', MARGIN, y);
  y += LINE_HEIGHT + 2;
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('Health Summary', MARGIN, y);
  y += 4;
  doc.setDrawColor(88, 80, 236);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + 50, y);
  y += LINE_HEIGHT + 4;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  const generatedOn = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated on ${generatedOn}`, MARGIN, y);
  y += LINE_HEIGHT + 6;

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += SECTION_GAP + 4;

  // Source summary
  if (data.recordCount > 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const src = data.sourceCounts;
    const parts: string[] = [];
    if (src.lab) parts.push(`${src.lab} lab(s)`);
    if (src.prescription) parts.push(`${src.prescription} prescription(s)`);
    if (src.encounter) parts.push(`${src.encounter} encounter(s)`);
    if (src.file) parts.push(`${src.file} document(s)`);
    if (parts.length) {
      doc.text(`Based on ${data.recordCount} record(s): ${parts.join(', ')}.`, MARGIN, y);
      y += LINE_HEIGHT + 2;
    }
    if (data.dateRange?.newest) {
      doc.text(`Latest record: ${data.dateRange.newest}`, MARGIN, y);
      y += LINE_HEIGHT + 4;
    }
  }

  // AI Summary (narrative)
  if (data.aiSummary) {
    y = addSection(doc, y, 'Summary', data.aiSummary, maxWidth);
  }

  // Key findings
  if (data.contentFromRecords.length > 0) {
    y = addSection(
      doc,
      y,
      'Key findings',
      data.contentFromRecords.map((b, i) => `${i + 1}. ${b}`),
      maxWidth
    );
  }

  // Conditions
  if (data.conditions.length > 0) {
    const conditionLines = data.conditions
      .map((c) => (typeof c === 'string' ? c : (c.name ?? '')))
      .filter(Boolean);
    if (conditionLines.length) {
      y = addSection(doc, y, 'Conditions noted', conditionLines, maxWidth);
    }
  }

  // Medications
  if (data.medications.length > 0) {
    const medLines = data.medications
      .map((m) => (typeof m === 'string' ? m : (m.name ?? '')))
      .filter(Boolean);
    if (medLines.length) {
      y = addSection(doc, y, 'Medications noted', medLines, maxWidth);
    }
  }

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`NexusCare Health Summary — Page ${p} of ${pageCount}`, MARGIN, 290);
    doc.text(
      'This summary is for personal use. Consult your healthcare provider for medical decisions.',
      MARGIN,
      294
    );
  }

  doc.save(`NexusCare-Health-Summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}
