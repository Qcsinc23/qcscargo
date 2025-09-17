import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StickyCTA } from "../StickyCTA";
import Footer from "../Footer";

export function AppLayout({
  children,
  showStickyCTA = true,
  showDesktopBreadcrumb = false,
  breadcrumbSlot,
}: {
  children: React.ReactNode;
  showStickyCTA?: boolean;
  showDesktopBreadcrumb?: boolean;
  breadcrumbSlot?: React.ReactNode; // your breadcrumb component
}) {
  const [hideCTA, setHideCTA] = useState(false);
  
  return (
    <div className="min-h-dvh bg-white pt-header-safe">
      <AppHeader onMenuToggle={setHideCTA} />
      {showDesktopBreadcrumb && (
        <div className="hidden md:block border-b bg-rose-50/70">{breadcrumbSlot}</div>
      )}
      <main className={showStickyCTA && !hideCTA ? "pb-sticky-safe" : ""}>
        {children}
      </main>
      <Footer />
      {showStickyCTA && !hideCTA && <StickyCTA />}
    </div>
  );
}
