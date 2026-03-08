import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ProgressProvider } from "@/lib/ProgressContext";
import XPBar from "@/components/XPBar";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "CodeCamp – Gamified R & Python Courses",
  description:
    "Learn R and Python through interactive, gamified courses. Economics, data science, and statistics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen font-sans">
        <ProgressProvider>
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link
                href="/"
                className="font-bold text-lg text-indigo-600 tracking-tight hover:text-indigo-700 transition-colors"
              >
                🎓 CodeCamp
              </Link>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/classroom"
                  className="text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1 text-gray-600 hover:bg-gray-50"
                >
                  Classroom
                </Link>
                <ThemeToggle />
                <XPBar />
              </div>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </ProgressProvider>
      </body>
    </html>
  );
}
