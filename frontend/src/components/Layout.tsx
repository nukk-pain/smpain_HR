import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut, User, FileText, Home } from 'lucide-react'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/utils/cn'
import { useAuth } from './AuthProvider'

interface NavigationItem {
  text: string
  icon: React.ReactNode
  path: string
  permissions?: string[]
}

const navigationItems: NavigationItem[] = [
  { text: '대시보드', icon: <Home size={16} />, path: '/dashboard' },
  { text: '파일 관리', icon: <FileText size={16} />, path: '/files', permissions: ['files:view'] },
]

const Layout: React.FC = () => {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const filteredItems = navigationItems.filter(item => {
    if (!item.permissions || !user?.permissions) return true
    return item.permissions.some(p => user.permissions?.includes(p))
  })

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 w-full bg-white border-b z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <nav className="p-4 space-y-1">
                {filteredItems.map(item => (
                  <Button
                    key={item.text}
                    variant={location.pathname === item.path ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      navigate(item.path)
                      setOpen(false)
                    }}
                  >
                    {item.icon}
                    <span className="ml-2">{item.text}</span>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-semibold">HR System</h1>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="flex-1 pt-16 px-4">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
