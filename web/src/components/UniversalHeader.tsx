"use client";

import Link from "next/link";
import { Library, BookOpen, Settings, User as UserIcon, Home, Layers, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "./UserContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export default function UniversalHeader() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-16 w-full border-b bg-background/80" />;
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href={user ? `/dashboard?userId=${user.id}` : "/"} className="flex items-center gap-2 group text-slate-900 dark:text-slate-100 no-underline">
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground group-hover:scale-110 transition-transform shadow-md">
              <BookOpen size={20} />
            </div>
            <span className="font-bold hidden sm:inline-block tracking-tight font-sans">Study Assistant</span>
          </Link>
          
          {user && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
              <Link href={`/dashboard?userId=${user.id}`} className={`transition-colors flex items-center gap-1.5 ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                <Home size={16} /> Dashboard
              </Link>
              <Link href="/library" className={`transition-colors flex items-center gap-1.5 ${pathname === '/library' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                <Library size={16} /> Sources
              </Link>
              <Link href="/study-sets" className={`transition-colors flex items-center gap-1.5 ${pathname.startsWith('/study-sets') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                <Layers size={16} /> Study Sets
              </Link>
              <Link href={`/quizzes?userId=${user.id}`} className={`transition-colors flex items-center gap-1.5 ${pathname.startsWith('/quizzes') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                <ClipboardCheck size={16} /> My Quizzes
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden sm:flex flex-col items-end mr-3 text-right">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-none">{user.name}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">{user.focus || "General Mastery"}</span>
            </div>
          )}
          
          <ThemeToggle />

          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10 hover:bg-primary/5 hover:text-primary transition-all">
              <Settings size={20} />
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400">
                <UserIcon size={20} />
            </Button>
          </Link>
        </div>
    </header>
  );
}
