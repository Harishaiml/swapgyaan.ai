import BrandLogo from "@/components/BrandLogo";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" className="opacity-95" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SwapGyaan AI. Learn, Teach, Validate, and Grow Together.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
