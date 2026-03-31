import { APP_NAME } from "@/lib/branding";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

const sizeClassMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

const textClassMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
} as const;

const BrandLogo = ({ size = "md", showText = true, className = "" }: BrandLogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src="/logo.png"
        alt={`${APP_NAME} logo`}
        className={`${sizeClassMap[size]} rounded-md object-contain`}
        loading="eager"
      />
      {showText ? <span className={`font-display font-bold ${textClassMap[size]}`}>{APP_NAME}</span> : null}
    </div>
  );
};

export default BrandLogo;
