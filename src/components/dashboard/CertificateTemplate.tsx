/**
 * CertificateTemplate.tsx
 *
 * Re-exports the shared CertificateData type so existing import paths
 * (e.g., from SessionsView / CertificatesView) continue to work.
 *
 * The visual template is now rendered through the Canvas API in
 * `src/utils/certificateGenerator.tsx` using the new image:
 *   /assets/new-certificate-template.png
 *
 * This React component is kept for optional preview purposes only.
 */

import React, { forwardRef } from "react";
export type { CertificateData } from "@/utils/certificateGenerator";

// Local type alias for the component props
interface Props {
  data: {
    learnerName: string;
    teacherName: string;
    skillName: string;
    date: string;
    certificateId: string;
  };
}

/**
 * Visual preview component (used in the browser / test page).
 * The actual downloadable certificate is generated via the Canvas API.
 */
export const CertificateTemplate = forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="relative bg-white overflow-hidden"
        style={{ width: "1123px", height: "794px" }}
      >
        {/* ── New background template ── */}
        <img
          src="/assets/new-certificate-template.png"
          alt="Certificate Background"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
        />

        {/* ── Dynamic content overlay — mirrors canvas positions ── */}
        <div className="absolute inset-0 z-10" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>

          {/* Certificate of Completion header */}
          <div
            className="absolute text-center w-full font-bold"
            style={{ top: "182px", fontSize: "26px", color: "#1B5E20", letterSpacing: "0.05em" }}
          >
            CERTIFICATE OF COMPLETION
          </div>

          {/* Decorative gold rule */}
          <div
            className="absolute"
            style={{
              top: "204px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "400px",
              height: "2px",
              backgroundColor: "#B8860B",
            }}
          />

          {/* "This is to certify that" */}
          <div
            className="absolute text-center w-full italic"
            style={{ top: "226px", fontSize: "18px", color: "#4A4A4A" }}
          >
            This is to certify that
          </div>

          {/* Learner name */}
          <div
            className="absolute text-center w-full font-bold"
            style={{
              top: "274px",
              fontSize: "48px",
              color: "#1B5E20",
              textShadow: "1px 2px 6px rgba(0,0,0,0.18)",
            }}
          >
            {data.learnerName || "Learner Name"}
          </div>

          {/* Gold underline beneath name */}
          <div
            className="absolute"
            style={{
              top: "330px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "400px",
              height: "2px",
              backgroundColor: "#B8860B",
            }}
          />

          {/* Bridging text */}
          <div
            className="absolute text-center w-full italic"
            style={{ top: "344px", fontSize: "17px", color: "#555555" }}
          >
            has successfully completed the skill:
          </div>

          {/* Skill name */}
          <div
            className="absolute text-center w-full font-bold"
            style={{
              top: "382px",
              fontSize: "30px",
              color: "#B8860B",
              textShadow: "1px 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {data.skillName || "Skill Name"}
          </div>

          {/* "Certified by" label */}
          <div
            className="absolute text-center w-full italic"
            style={{ top: "450px", fontSize: "15px", color: "#777777" }}
          >
            Certified by
          </div>

          {/* Teacher name */}
          <div
            className="absolute text-center w-full font-bold"
            style={{ top: "472px", fontSize: "22px", color: "#1B5E20" }}
          >
            {data.teacherName || "Teacher Name"}
          </div>

          {/* Date — bottom right */}
          <div
            className="absolute font-bold text-center"
            style={{
              bottom: "100px",
              right: "140px",
              fontSize: "15px",
              color: "#333333",
              minWidth: "160px",
            }}
          >
            {data.date || new Date().toLocaleDateString()}
          </div>

          {/* Certificate ID — bottom centre */}
          <div
            className="absolute text-center w-full"
            style={{
              bottom: "36px",
              fontSize: "12px",
              color: "#888888",
              fontFamily: "'Courier New', monospace",
            }}
          >
            ID: {data.certificateId}
          </div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = "CertificateTemplate";
