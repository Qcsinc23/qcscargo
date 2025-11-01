import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Building2,
  ScanBarcode,
  FileText,
  Activity
} from 'lucide-react'

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut, userRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, current: location.pathname === '/admin' },
    { name: 'Quotes', href: '/admin/quotes', icon: FileText, current: location.pathname.startsWith('/admin/quotes') },
    { name: 'Bookings', href: '/admin/bookings', icon: Calendar, current: location.pathname.startsWith('/admin/bookings') },
    { name: 'Vehicles', href: '/admin/vehicles', icon: Truck, current: location.pathname.startsWith('/admin/vehicles') },
    { name: 'Customers', href: '/admin/customers', icon: Users, current: location.pathname.startsWith('/admin/customers') },
    { name: 'Mailboxes', href: '/admin/mailboxes', icon: Building2, current: location.pathname.startsWith('/admin/mailboxes') },
    {
      name: 'Package Receiving',
      href: '/admin/package-receiving',
      icon: ScanBarcode,
      current: location.pathname.startsWith('/admin/package-receiving')
    },
    { name: 'Blog', href: '/admin/blog', icon: FileText, current: location.pathname.startsWith('/admin/blog') },
    { name: 'Content Queue', href: '/admin/blog/queue', icon: FileText, current: location.pathname === '/admin/blog/queue' },
    { name: 'Monitoring', href: '/admin/monitoring', icon: Activity, current: location.pathname.startsWith('/admin/monitoring') },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: location.pathname.startsWith('/admin/reports') },
    { name: 'Settings', href: '/admin/settings', icon: Settings, current: location.pathname.startsWith('/admin/settings') },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <MobileNavigation navigation={navigation} user={user} userRole={userRole} onSignOut={handleSignOut} />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <Link
                to="/"
                className="flex items-center hover:opacity-80 transition-opacity"
                title="QCS Cargo - Return to Homepage"
              >
                <img
                  src="/qcs-logo.svg"
                  alt="QCS Cargo - Precision Air Cargo Solutions"
                  className="h-8 w-auto mr-2"
                  loading="lazy"
                  decoding="async"
                  width="128"
                  height="32"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/QCS_Cargo_Logo.png";
                  }}
                />
                <span className="text-xl font-bold text-gray-900">QCS Admin</span>
              </Link>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    item.current
                      ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                >
                  <item.icon
                    className={`${
                      item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-6 w-6`}
                  />
                  {item.name}
                  {item.current && <ChevronRight className="ml-auto h-4 w-4 text-blue-500" />}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-3 flex-shrink-0 p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-opacity"
              title="QCS Cargo - Return to Homepage"
            >
              <img
                src="/qcs-logo.svg"
                alt="QCS Cargo"
                className="h-6 w-auto mr-2"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/QCS_Cargo_Logo.png";
                }}
              />
              <span className="text-lg font-semibold text-gray-900">QCS Admin</span>
            </Link>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
        </div>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// Mobile navigation component
const MobileNavigation: React.FC<{
  navigation: any[]
  user: any
  userRole: string | null
  onSignOut: () => void
}> = ({ navigation, user, userRole, onSignOut }) => {
  return (
    <>
      <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
        <div className="flex-shrink-0 flex items-center px-4 mb-8">
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-opacity"
              title="QCS Cargo - Return to Homepage"
            >
              <img
                src="/qcs-logo.svg"
                alt="QCS Cargo - Precision Air Cargo Solutions"
                className="h-8 w-auto mr-2"
                loading="lazy"
                decoding="async"
                width="128"
                height="32"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/QCS_Cargo_Logo.png";
              }}
            />
            <span className="text-xl font-bold text-gray-900">QCS Admin</span>
          </Link>
        </div>
        <nav className="mt-5 px-2 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                item.current
                  ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors`}
            >
              <item.icon
                className={`${
                  item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                } mr-4 h-6 w-6`}
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-base font-medium text-gray-700">{user?.email}</p>
            <p className="text-sm text-gray-500 capitalize">{userRole}</p>
            <button
              onClick={onSignOut}
              className="mt-1 text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminLayout
