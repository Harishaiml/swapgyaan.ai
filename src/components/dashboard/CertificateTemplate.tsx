import React, { forwardRef } from 'react';

export interface CertificateData {
  learnerName: string;
  teacherName: string;
  skillName: string;
  date: string;
  certificateId: string;
}

interface Props {
  data: CertificateData;
}

// Ensure the aspect ratio matches a standard certificate (e.g., A4 Landscape 1123x794 or standard image)
export const CertificateTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="relative bg-white overflow-hidden"
      style={{
        width: "1123px",
        height: "794px",
      }}
    >
      {/* Background Image */}
      <img
        src="/assets/certificate-template.png"
        alt="Certificate Background"
        className="absolute inset-0 w-full h-full object-cover"
        crossOrigin="anonymous"
      />

      {/* Dynamic Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-[180px] text-center z-10">
        
        {/* Learner Name - Center Large */}
        <div className="mt-8 mb-4 h-[80px] flex items-center justify-center">
          <h1 className="text-5xl font-bold italic" style={{ color: "#1E3A8A", fontFamily: "'Times New Roman', serif" }}>
            {data.learnerName || "Learner Name"}
          </h1>
        </div>

        {/* Skill Name - Below Learner */}
        <div className="mt-6 mb-8 h-[50px] flex items-center justify-center">
          <p className="text-3xl font-semibold" style={{ color: "#0F766E", fontFamily: "Arial, sans-serif" }}>
            {data.skillName || "Skill Name"}
          </p>
        </div>

        {/* Bottom Section - Teacher Name & Date */}
        <div className="absolute bottom-[160px] left-[200px] w-[300px] text-center">
          <p className="text-2xl font-semibold" style={{ color: "#1E3A8A" }}>
            {data.teacherName || "Teacher Name"}
          </p>
        </div>

        <div className="absolute bottom-[160px] right-[200px] w-[300px] text-center">
          <p className="text-xl font-medium" style={{ color: "#475569" }}>
            {data.date || new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Certificate ID */}
        <div className="absolute bottom-[80px] left-0 right-0 text-center">
          <p className="text-sm font-mono text-gray-500">
            ID: {data.certificateId || "CERT-ID"}
          </p>
        </div>

      </div>
    </div>
  );
});

CertificateTemplate.displayName = "CertificateTemplate";
