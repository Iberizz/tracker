"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
    { href: "/offres", label: "Offres", color: "#818cf8" },
    { href: "/candidatures", label: "Candidatures", color: "#22c55e" },
    { href: "/profil", label: "Profil", color: "#06b6d4" },
]

const toolItems = [
  { href: "/sources", label: "Sources RSS", color: "#4b5563" },
  { href: "/profil", label: "Profil", color: "#4b5563" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-title">JobTracker</span>
        <span className="logo-sub">v0.1 · dev mode</span>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-label">Workspace</span>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
          >
            <span className="nav-dot" style={{ background: item.color }} />
            <span className="nav-text">{item.label}</span>
          </Link>
        ))}

        <span className="nav-label" style={{ marginTop: "16px" }}>Outils</span>
        {toolItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
          >
            <span className="nav-dot" style={{ background: item.color }} />
            <span className="nav-text">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="profile">
          <div className="avatar">T</div>
          <div>
            <p className="profile-name">Toi</p>
            <p className="profile-status">● Disponible</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
