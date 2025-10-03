"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from '@/components/ui/button'
import { 
  Home, 
  MessageCircle, 
  FileText, 
  Upload, 
  Sparkles,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: FileText },
  { href: "/search", label: "AI Search", icon: MessageCircle },
  { href: "/upload", label: "Upload", icon: Upload },
]

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Bio-Nexus
          </span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center gap-2">
          {links.map((l) => {
            const active = pathname === l.href
            const Icon = l.icon
            return (
              <li key={l.href}>
                <Link href={l.href}>
                  <Button 
                    variant={active ? "default" : "ghost"} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{l.label}</span>
                  </Button>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="px-4 py-2 space-y-1">
            {links.map((l) => {
              const active = pathname === l.href
              const Icon = l.icon
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{l.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}
