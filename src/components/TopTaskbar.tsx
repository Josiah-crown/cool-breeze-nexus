import React from "react";

type TopTaskbarProps = {
  title: string;
  subtitle?: string;
  rightActions: React.ReactNode;
  logoHref?: string;
};

const TopTaskbar: React.FC<TopTaskbarProps> = ({ title, subtitle, rightActions, logoHref = "/" }) => {
  return (
    <header
      className="border-b border-border backdrop-blur-sm relative overflow-hidden flex flex-col sm:flex-row"
      style={{ backgroundColor: "#8FB83D" }}
    >
      {/* Logo section - entire left section #303329 */}
      <a
        href={logoHref}
        className="flex items-center flex-shrink-0 justify-center sm:justify-start"
        style={{ backgroundColor: "#303329", padding: "16px 24px", minWidth: "260px" }}
      >
        <img src="/3.png" alt="Crown Technologies Logo" className="h-16 sm:h-20 lg:h-24 w-auto object-contain" />
      </a>

      {/* Rest of header content */}
      <div className="flex-1 px-4 sm:px-8 lg:px-[80px] py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Centered heading */}
        <div className="flex-1 flex justify-center order-2 sm:order-1">
          <div className="text-center">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-accent-foreground">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-accent-foreground/80">{subtitle}</p>}
          </div>
        </div>

        {/* Buttons on the right */}
        <div className="flex flex-wrap gap-2 flex-shrink-0 justify-center sm:justify-end order-1 sm:order-2 w-full sm:w-auto">
          {rightActions}
        </div>
      </div>
    </header>
  );
};

export default TopTaskbar;

