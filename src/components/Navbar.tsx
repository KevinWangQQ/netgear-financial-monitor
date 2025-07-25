'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, TrendingUp, Users } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()

  const navItems = [
    {
      name: '财务仪表板',
      href: '/',
      icon: BarChart3,
      active: pathname === '/'
    },
    {
      name: '营收分析',
      href: '/revenue',
      icon: TrendingUp,
      active: pathname === '/revenue'
    },
    {
      name: '竞争对比',
      href: '/competition',
      icon: Users,
      active: pathname === '/competition'
    }
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              Netgear Financial Monitor
            </span>
          </div>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}