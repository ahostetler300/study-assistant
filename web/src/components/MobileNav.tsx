"use client";

import { Home, BookOpen, Library, Settings, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "./UserContext";

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();

  if (pathname === "/") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-xl p-2 md:hidden z-50 px-4 h-16 flex justify-around items-center shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
        <Link href={user ? `/dashboard?userId=${user.id}` : "/dashboard"} className={`flex flex-col items-center p-2 transition-colors ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Home size={22} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-tighter">Home</span>
        </Link>
        <Link href="/library" className={`flex flex-col items-center p-2 transition-colors ${pathname === '/library' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Library size={22} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-tighter">Library</span>
        </Link>
        
        <Link href="/study-sets" className={`flex flex-col items-center p-2 transition-colors ${pathname.startsWith('/study-sets') ? 'text-primary' : 'text-muted-foreground'}`}>
          <Layers size={22} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-tighter">Sets</span>
        </Link>

        <Link href={user ? `/quizzes?userId=${user.id}` : "/quizzes"} className={`flex flex-col items-center p-2 transition-colors ${pathname === '/quizzes' ? 'text-primary' : 'text-muted-foreground'}`}>
          <BookOpen size={22} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-tighter">Quizzes</span>
        </Link>
        <Link href="/settings" className={`flex flex-col items-center p-2 transition-colors ${pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Settings size={22} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-tighter">Admin</span>
        </Link>
    </nav>
  );
}
