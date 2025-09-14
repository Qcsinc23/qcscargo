import { AppHeader } from "./AppHeader";
import { StickyCTA } from "../StickyCTA";

export function AppLayout({ children, showStickyCTA = true }: {
  children: React.ReactNode;
  showStickyCTA?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-white pt-header-safe">
      <AppHeader />
      <main className={showStickyCTA ? "pb-sticky-safe" : ""}>
        {children}
      </main>
      {showStickyCTA && <StickyCTA />}
    </div>
  );
}