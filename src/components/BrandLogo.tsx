import { GraduationCap } from "lucide-react";
import { APP_NAME } from "@/lib/branding";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4", text: "text-base" },
  md: { container: "w-9 h-9", icon: "w-4.5 h-4.5", text: "text-lg" },
  lg: { container: "w-14 h-14", icon: "w-7 h-7", text: "text-3xl" },
} as const;

const BrandLogo = ({ size = "md", showText = true, className = "" }: BrandLogoProps) => {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <div
        className={`${s.container} rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm flex-shrink-0`}
        style={{ background: "linear-gradient(135deg, #2563EB 0%, #1d4ed8 50%, #14B8A6 100%)" }}
      >
        <GraduationCap className={`${s.icon} text-white`} strokeWidth={2} />
      </div>
      {showText && (
        <span className={`font-display font-bold ${s.text} text-foreground leading-none`}>
          {APP_NAME}
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
