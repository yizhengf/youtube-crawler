"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/channels", label: "頻道管理" },
  { href: "/videos", label: "影片資料庫" },
  { href: "/jobs", label: "任務中心" },
  { href: "/settings", label: "設定" },
  { href: "/analysis", label: "AI 分析" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-800 text-white flex flex-col">
      <div className="px-5 py-6 border-b border-slate-700">
        <h1 className="text-base font-bold leading-tight">
          AI 影片工廠 MVP
        </h1>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const className = `block px-5 py-3 text-sm transition-colors ${
            item.disabled
              ? "text-slate-500 cursor-not-allowed"
              : isActive
                ? "bg-slate-700 text-white font-medium"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`;

          if (item.disabled) {
            return (
              <div key={item.href} className={className}>
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    soon
                  </span>
                </div>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={className}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        v2.0
      </div>
    </aside>
  );
}
