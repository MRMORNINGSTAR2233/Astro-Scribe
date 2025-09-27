"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/mission-planner", label: "Mission Planner" },
  { href: "/manager", label: "Manager View" },
]

export function Navbar() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/50 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          Project Bio-Nexus
        </Link>
        <ul className="flex items-center gap-4">
          {links.map((l) => {
            const active = pathname === l.href
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`text-sm ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
