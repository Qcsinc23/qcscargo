import { AppHeader } from "./AppHeader";
import { StickyCTA } from "../StickyCTA";

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
  return (
    <div className="min-h-dvh bg-white pt-header-safe">
      <AppHeader />
      {showDesktopBreadcrumb && (
        <div className="hidden md:block border-b bg-rose-50/70">{breadcrumbSlot}</div>
      )}
      <main className={showStickyCTA ? "pb-sticky-safe" : ""}>
        {children}
      </main>
      {showStickyCTA && <StickyCTA />}
    </div>
  );
}