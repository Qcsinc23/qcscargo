import { AppHeader } from "./AppHeader";
import { DashboardTabBar } from "./DashboardTabBar";

export function AuthLayout({
  children,
  back,                 // {href, label?}
  showTabs = true,
}: {
  children: React.ReactNode;
  back?: { href: string; label?: string };
  showTabs?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-white pt-header-safe">
      <AppHeader back={back} />
      <main className={showTabs ? "pb-16" : "" /* leaves room for tab bar */}>
        {children}
      </main>
      {showTabs && <DashboardTabBar />}
    </div>
  );
}