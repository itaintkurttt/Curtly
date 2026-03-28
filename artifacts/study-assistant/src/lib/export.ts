import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseMdToLines(text: string): Array<{ type: 'h1' | 'h2' | 'h3' | 'body' | 'blank'; text: string }> {
  return text.split('\n').map((line) => {
    if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2) };
    if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3) };
    if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4) };
    if (!line.trim()) return { type: 'blank', text: '' };
    return { type: 'body', text: line };
  });
}

function stripBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

export async function exportToPdf(content: string, title: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const usableW = pageW - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkY = (needed: number) => {
    if (y + needed > pageH - margin) addPage();
  };

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(title, usableW);
  checkY(titleLines.length * 8 + 6);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 6;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const lines = parseMdToLines(content);

  for (const line of lines) {
    if (line.type === 'blank') {
      y += 3;
      continue;
    }

    if (line.type === 'h1') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 120);
      const wrapped = doc.splitTextToSize(stripBold(line.text), usableW);
      checkY(wrapped.length * 7 + 5);
      y += 4;
      doc.text(wrapped, margin, y);
      y += wrapped.length * 7 + 3;
    } else if (line.type === 'h2') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 160);
      const wrapped = doc.splitTextToSize(stripBold(line.text), usableW);
      checkY(wrapped.length * 6.5 + 5);
      y += 4;
      doc.text(wrapped, margin + 2, y);
      y += wrapped.length * 6.5 + 3;
    } else if (line.type === 'h3') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      const wrapped = doc.splitTextToSize(stripBold(line.text), usableW);
      checkY(wrapped.length * 6 + 4);
      y += 3;
      doc.text(wrapped, margin + 4, y);
      y += wrapped.length * 6 + 2;
    } else {
      // Body — handle **bold**: keyword and definition
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      const boldPattern = /\*\*(.*?)\*\*/g;
      const parts: Array<{ text: string; bold: boolean }> = [];
      let lastIdx = 0;
      let match;
      while ((match = boldPattern.exec(line.text)) !== null) {
        if (match.index > lastIdx) {
          parts.push({ text: line.text.slice(lastIdx, match.index), bold: false });
        }
        parts.push({ text: match[1], bold: true });
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < line.text.length) {
        parts.push({ text: line.text.slice(lastIdx), bold: false });
      }

      const fullLine = stripBold(line.text);
      const wrapped = doc.splitTextToSize(fullLine, usableW - 4);
      checkY(wrapped.length * 5.5 + 2);

      // Simple: render first bold segment as bold, rest as normal
      let xCursor = margin + 4;
      let firstLine = true;
      for (const part of parts) {
        doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
        doc.setTextColor(part.bold ? 20 : 60, part.bold ? 20 : 60, part.bold ? 100 : 60);
        if (firstLine) {
          doc.text(part.text, xCursor, y);
          xCursor += doc.getTextWidth(part.text);
          firstLine = false;
        }
      }
      // If multi-line, render the rest as plain
      if (wrapped.length > 1) {
        for (let i = 1; i < wrapped.length; i++) {
          y += 5.5;
          checkY(5.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(wrapped[i], margin + 4, y);
        }
      }
      y += 5.5 + 2;
    }
  }

  doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_reviewer.pdf`);
}

export async function exportToDocx(content: string, title: string): Promise<void> {
  const lines = parseMdToLines(content);

  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({ text: '' }),
  ];

  for (const line of lines) {
    if (line.type === 'blank') {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    if (line.type === 'h1') {
      paragraphs.push(new Paragraph({ text: stripBold(line.text), heading: HeadingLevel.HEADING_1 }));
    } else if (line.type === 'h2') {
      paragraphs.push(new Paragraph({ text: stripBold(line.text), heading: HeadingLevel.HEADING_2 }));
    } else if (line.type === 'h3') {
      paragraphs.push(new Paragraph({ text: stripBold(line.text), heading: HeadingLevel.HEADING_3 }));
    } else {
      // Parse bold inline
      const boldPattern = /\*\*(.*?)\*\*/g;
      const runs: TextRun[] = [];
      let lastIdx = 0;
      let match;
      while ((match = boldPattern.exec(line.text)) !== null) {
        if (match.index > lastIdx) {
          runs.push(new TextRun({ text: line.text.slice(lastIdx, match.index) }));
        }
        runs.push(new TextRun({ text: match[1], bold: true }));
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < line.text.length) {
        runs.push(new TextRun({ text: line.text.slice(lastIdx) }));
      }
      if (runs.length === 0) runs.push(new TextRun({ text: line.text }));
      paragraphs.push(new Paragraph({ children: runs }));
    }
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveBlob(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_reviewer.docx`);
}
