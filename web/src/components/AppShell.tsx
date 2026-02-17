"use client";

import { UserProvider } from "@/components/UserContext";
import { UserSync } from "./UserSync";
import { Suspense, useEffect, useState } from "react";
import UniversalHeader from "./UniversalHeader";
import MobileNav from "./MobileNav";
import { Toaster } from "./ui/sonner";
import { ThemeProvider } from "next-themes";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UserProvider>
        <Suspense fallback={null}>
            <UserSync />
        </Suspense>
        <div className="relative flex min-h-screen flex-col bg-background text-foreground transition-colors duration-500 font-sans">
          {mounted && <UniversalHeader />}
          <main className="flex-1">
            {children}
          </main>
          {mounted && <MobileNav />}
          {mounted && <Toaster position="top-center" />}
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}
