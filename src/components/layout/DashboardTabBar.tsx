import { Home, Package, CalendarDays, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function DashboardTabBar() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-14 bg-white/95 backdrop-blur border-t">
      <div className="grid grid-cols-4 h-full">
        <Link 
          to="/dashboard" 
          className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
            isActive('/dashboard') ? 'text-shopify-pink' : 'text-slate-600'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link 
          to="/dashboard/shipments" 
          className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
            isActive('/dashboard/shipments') ? 'text-shopify-pink' : 'text-slate-600'
          }`}
        >
          <Package className="h-5 w-5" />
          <span>Shipments</span>
        </Link>
        <Link 
          to="/booking" 
          className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
            isActive('/booking') ? 'text-shopify-pink' : 'text-slate-600'
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span>Bookings</span>
        </Link>
        <Link 
          to="/customer/profile" 
          className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
            isActive('/customer/profile') ? 'text-shopify-pink' : 'text-slate-600'
          }`}
        >
          <User className="h-5 w-5" />
          <span>Account</span>
        </Link>
      </div>
    </nav>
  );
}