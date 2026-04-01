import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/branding";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { container: "w-8 h-8", text: "text-base" },
  md: { container: "w-9 h-9", text: "text-lg" },
  lg: { container: "w-14 h-14", text: "text-3xl" },
} as const;

const BrandLogo = ({ size = "md", showText = true, className = "" }: BrandLogoProps) => {
  const s = sizeMap[size];
  
  return (
    <Link to="/" className={`flex items-center gap-2.5 group transition-opacity hover:opacity-90 ${className}`.trim()}>
      <div className={`${s.container} rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 border border-border/50 shadow-premium group-hover:shadow-glow transition-all duration-300`}>
        <img src="/logo.png" alt="SwapGyaan AI" className="w-full h-full object-contain p-1" />
      </div>
      {showText && (
        <span className={`font-display font-bold ${s.text} text-foreground leading-none tracking-tight`}>
          {APP_NAME}
        </span>
      )}
    </Link>
  );
};

export default BrandLogo;
