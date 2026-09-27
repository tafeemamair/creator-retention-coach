"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/app", icon: "📊" },
    { label: "New Analysis", href: "/app/analyze", icon: "⚡" },
    { label: "My Analyses", href: "/app/analyses", icon: "📜" },
    { label: "Profile", href: "/app/profile", icon: "👤" },
    { label: "Settings", href: "/app/settings", icon: "⚙️" },
  ];

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0 min-h-screen sticky top-0 h-screen">
        <div>
          {/* Brand Logo */}
          <Link
            href="/app"
            className="p-6 border-b border-slate-800 flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/30">
              CRC
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">Creator Retention</div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">Workspace</div>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <span>🌐</span>
            <span>View Public Site</span>
          </Link>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (<768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                isActive ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-base leading-none mb-0.5">{item.icon}</span>
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
