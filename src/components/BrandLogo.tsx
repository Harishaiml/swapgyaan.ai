import { APP_NAME } from "@/lib/branding";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { container: "w-8 h-8", icon: "w-8 h-8", text: "text-base" },
  md: { container: "w-9 h-9", icon: "w-9 h-9", text: "text-lg" },
  lg: { container: "w-14 h-14", icon: "w-14 h-14", text: "text-3xl" },
} as const;

const BrandLogo = ({ size = "md", showText = true, className = "" }: BrandLogoProps) => {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <img
        src="/logo.png"
        alt={APP_NAME}
        className={`${s.icon} object-contain flex-shrink-0 transition-transform duration-300 hover:scale-105`}
      />
      {showText && (
        <span className={`font-display font-bold ${s.text} text-foreground leading-none`}>
          {APP_NAME}
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
