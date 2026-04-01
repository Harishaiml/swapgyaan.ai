import jsPDF from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface CertificateData {
  learnerName: string;
  teacherName: string;
  skillName: string;
  date: string;          // e.g. "April 1, 2026"
  certificateId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Image load failed: ${src.substring(0, 80)}`));
    img.src = src; // same-origin: no crossOrigin needed
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Core canvas renderer
// Layout (all centered):
//   Shifted down significantly to be "below the logo"
// ─────────────────────────────────────────────────────────────────────────────
export async function renderCertificateCanvas(
  data: CertificateData
): Promise<HTMLCanvasElement> {
  const W = 1123;
  const H = 794;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── 1. Background template ────────────────────────────────────────────────
  const bg = await loadImage("/assets/new-certificate-template.png");
  ctx.drawImage(bg, 0, 0, W, H);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const cx = W / 2;

  const txt = (
    str: string,
    y: number,
    font: string,
    color: string,
    opts: { shadow?: boolean; maxWidth?: number; letterSpacing?: number } = {}
  ) => {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (opts.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.20)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
    }

    if (opts.maxWidth !== undefined) {
      ctx.fillText(str, cx, y, opts.maxWidth);
    } else {
      ctx.fillText(str, cx, y);
    }
    ctx.restore();
  };

  const hline = (
    halfWidth: number,
    y: number,
    color: string,
    lineWidth = 1.5
  ) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, y);
    ctx.lineTo(cx + halfWidth, y);
    ctx.stroke();
    ctx.restore();
  };

  // ── 2. CERTIFICATE OF COMPLETION ─────────────────────────────────────────
  txt(
    "CERTIFICATE OF COMPLETION",
    280,
    "bold 26px 'Georgia','Times New Roman',serif",
    "#1B5E20"
  );

  hline(220, 298, "#B8860B", 1.5);

  // ── 3. "This is to certify that" ─────────────────────────────────────────
  txt(
    "This is to certify that",
    324,
    "italic 17px 'Georgia','Times New Roman',serif",
    "#666666"
  );

  // ── 4. Learner name ───────────────────────────────────────────────────────
  const learner = data.learnerName || "Learner Name";
  txt(
    learner,
    380,
    "bold 48px 'Georgia','Times New Roman',serif",
    "#1B5E20",
    { shadow: true, maxWidth: W - 160 }
  );

  ctx.save();
  ctx.font = "bold 48px 'Georgia','Times New Roman',serif";
  const rawNameW = ctx.measureText(learner).width;
  ctx.restore();
  const nameLineW = Math.min(rawNameW, W - 160) / 2;
  hline(nameLineW, 406, "#B8860B", 2);

  // ── 5. "has successfully completed" ──────────────────────────────────────
  txt(
    "has successfully completed",
    434,
    "italic 17px 'Georgia','Times New Roman',serif",
    "#666666"
  );

  // ── 6. Skill name ─────────────────────────────────────────────────────────
  txt(
    data.skillName || "Skill Name",
    474,
    "bold 34px 'Georgia','Times New Roman',serif",
    "#B8860B",
    { shadow: true, maxWidth: W - 160 }
  );

  // ── 7. "under the guidance of" ────────────────────────────────────────────
  txt(
    "under the guidance of",
    516,
    "italic 16px 'Georgia','Times New Roman',serif",
    "#666666"
  );

  // ── 8. Teacher name ───────────────────────────────────────────────────────
  txt(
    data.teacherName || "Teacher Name",
    548,
    "bold 24px 'Georgia','Times New Roman',serif",
    "#1B5E20",
    { maxWidth: W - 200 }
  );

  // ── 9. Elegant section divider ────────────────────────────────────────────
  hline(120, 582, "#C8A850", 1);
  ctx.save();
  ctx.fillStyle = "#C8A850";
  ctx.font = "12px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("◆", cx, 582);
  ctx.restore();

  // ── 10. Date ──────────────────────────────────────────────────────────────
  const displayDate =
    data.date ||
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  txt(
    `Date:  ${displayDate}`,
    610,
    "15px 'Georgia','Times New Roman',serif",
    "#444444"
  );

  // ── 11. Certificate ID ────────────────────────────────────────────────────
  txt(
    `Certificate ID:  ${data.certificateId}`,
    636,
    "12px 'Courier New',monospace",
    "#555555"
  );




  return canvas;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API – PDF blob (A4 landscape)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCertificate(
  data: CertificateData
): Promise<Blob> {
  const canvas = await renderCertificateCanvas(data);
  const imgData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF("landscape", "mm", "a4");
  pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
  return pdf.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API – PNG blob (preview / sharing)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCertificatePNG(
  data: CertificateData
): Promise<Blob> {
  const canvas = await renderCertificateCanvas(data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/png",
      1.0
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Download helper
// ─────────────────────────────────────────────────────────────────────────────
export function downloadCertificate(blob: Blob, filename: string): void {
  const base = filename.replace(/\.(docx|doc|png|pdf)$/i, "");
  const isPdf =
    blob.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  const finalName = isPdf ? `${base}.pdf` : `${base}.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
