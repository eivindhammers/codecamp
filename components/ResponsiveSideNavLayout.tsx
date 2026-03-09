"use client";

import { useState } from "react";

type SideNavLink = {
  href: string;
  label: string;
};

type ResponsiveSideNavLayoutProps = {
  title: string;
  links: SideNavLink[];
  children: React.ReactNode;
};

export default function ResponsiveSideNavLayout({
  title,
  links,
  children,
}: ResponsiveSideNavLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="xl:pl-64">
      <aside className="fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-64 overflow-y-auto border-r border-gray-200 bg-white p-4 xl:block">
        <nav>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <ul className="space-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-gray-700 hover:text-indigo-600">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="mb-4 flex items-center gap-3 xl:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
          aria-label={`Open ${title} menu`}
          aria-expanded={mobileOpen}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 xl:hidden"
            aria-label="Close menu backdrop"
          />
          <aside className="fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto border-r border-gray-200 bg-white p-4 xl:hidden">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <nav>
              <ul className="space-y-2 text-sm">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-gray-700 hover:text-indigo-600"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </>
      )}

      <main>{children}</main>
    </div>
  );
}
