import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CertificateTemplate, CertificateData } from "@/components/dashboard/CertificateTemplate";

/**
 * Generate PDF certificate with dynamic data and html2canvas.
 * Uses the image template /assets/certificate-template.png
 */
export async function generateCertificate(data: CertificateData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // 1. Create a temporary container
      const container = document.createElement("div");
      // Hide it offscreen
      container.style.position = "absolute";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "1123px";
      container.style.height = "794px";
      document.body.appendChild(container);

      // 2. Render the React Component into the container
      const root = createRoot(container);
      
      const onRendered = async () => {
        try {
          // Wait a tiny bit for the image to load
          await new Promise(r => setTimeout(r, 800));

          // 3. Render HTML to Canvas
          const canvas = await html2canvas(container, {
            useCORS: true,
            scale: 2, // High resolution
            width: 1123,
            height: 794,
            logging: false,
          });

          // 4. Create PDF
          // Dimensions in mm for A4 landscape: 297 x 210
          const pdf = new jsPDF("landscape", "mm", "a4");
          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", 0, 0, 297, 210);

          // 5. Output as Blob
          const blob = pdf.output("blob");

          // Cleanup
          root.unmount();
          document.body.removeChild(container);
          resolve(blob);
        } catch (err) {
          root.unmount();
          document.body.removeChild(container);
          reject(err);
        }
      };

      // We render an inner wrapper that notifies us when mounted
      root.render(
        <div ref={() => setTimeout(onRendered, 0)}>
          <CertificateTemplate data={data} />
        </div>
      );
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Trigger download of the PDF certificate.
 */
export function downloadCertificate(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  // Ensure we save as PDF now!
  const fixedFileName = filename.replace(/\.docx$/, '.pdf')
  anchor.download = fixedFileName.includes('.pdf') ? fixedFileName : `${fixedFileName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
