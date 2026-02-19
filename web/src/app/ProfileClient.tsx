"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, User as UserIcon, BookOpen, Loader2, Trash2, XCircle } from "lucide-react";
import { createUser, deleteUser } from "./user-actions";
import { useUser } from "@/components/UserContext";
import { toast } from "sonner";

interface User {
    id: string;
    name: string;
    focus: string | null;
}

export default function ProfileClient({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const { setUser } = useUser();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isCreating, setIsCreating] = useState(false);
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function refreshUsers() {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (res.ok) {
        const data = await res.json();
        setUsers(data);
    }
  }

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsPending(true);
    const res = await createUser(formData);
    setIsPending(false);

    if (res.success) {
      toast.success(`Welcome, ${res.user.name}!`);
      setUser(res.user);
      router.push(`/dashboard?userId=${res.user.id}`);
    } else {
      toast.error(res.error);
    }
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}'s profile? All quizzes and results will be lost.`)) return;
    
    setIsPending(true);
    const res = await deleteUser(id);
    setIsPending(false);

    if (res.success) {
      toast.success("Profile removed");
      refreshUsers();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
        <div className="w-full max-w-2xl space-y-8 text-slate-900 dark:text-slate-100 font-sans text-center">
            <header className="space-y-4">
                <div className="inline-flex bg-primary/10 p-4 rounded-3xl text-primary mb-2 sm:mb-0">
                    <BookOpen size={40} className="sm:size-8" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Study Assistant</h1>
                <p className="text-xl sm:text-lg text-muted-foreground font-medium">Select your profile to continue your journey.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                {users.map((user) => (
                <Link 
                    key={user.id} 
                    href={isRemoveMode ? "#" : `/dashboard?userId=${user.id}`}
                    onClick={(e) => {
                        if (isRemoveMode) {
                            e.preventDefault();
                            return;
                        }
                        // Only set user context if hydrated
                        if (mounted) {
                            setUser(user);
                        }
                    }}
                    className="block no-underline outline-none"
                >
                    <Card 
                        className={`relative transition-all duration-300 group rounded-[2.5rem] shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-card ${
                            isRemoveMode ? 'ring-2 ring-destructive/20 border-destructive/50 opacity-90' : 'hover:border-primary hover:bg-primary/5 hover:scale-[1.02]'
                        } ${!mounted && 'cursor-default pointer-events-auto'}`}
                    >
                        <CardContent className="p-8 sm:p-6 flex items-center gap-6 text-slate-600 dark:text-slate-400">
                        <div className={`bg-slate-200 dark:bg-slate-800 p-4 sm:p-3 rounded-2xl transition-colors ${!isRemoveMode && mounted && 'group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                            <UserIcon size={32} className="sm:size-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-2xl sm:text-lg text-slate-900 dark:text-slate-100 truncate">{user.name}</h3>
                            <p className="text-sm sm:text-xs text-muted-foreground uppercase font-black tracking-widest truncate">{user.focus || "General Mastery"}</p>
                        </div>

                        {isRemoveMode && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteUser(user.id, user.name); }}
                                className="ml-2 text-destructive hover:scale-110 transition-transform"
                            >
                                <Trash2 size={28} className="sm:size-6" />
                            </button>
                        )}
                        </CardContent>
                    </Card>
                </Link>
                ))}

                {!isCreating && (
                    <Button 
                        variant="outline" 
                        onClick={() => { setIsCreating(true); setIsRemoveMode(false); }}
                        className="h-auto p-10 sm:p-8 rounded-[2.5rem] border-dashed border-2 flex flex-col gap-3 hover:bg-muted/50 transition-all active:scale-95 border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-100"
                    >
                        <UserPlus size={32} className="text-primary sm:size-6" />
                        <span className="font-black text-xl sm:text-base">Add New Profile</span>
                    </Button>
                )}

                {isCreating && (
                <Card className="rounded-3xl border-primary bg-primary/5 animate-in zoom-in-95 duration-200 shadow-lg">
                    <CardContent className="p-6">
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="space-y-2">
                        <Input name="name" placeholder="Your Name" className="h-12 rounded-xl text-left" required autoFocus />
                        <Input name="focus" placeholder="Primary Focus" className="h-12 rounded-xl text-left" />
                        </div>
                        <div className="flex gap-2">
                        <Button type="submit" className="flex-1 rounded-xl h-11 font-bold" disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : "Create"}
                        </Button>
                        <Button variant="ghost" type="button" onClick={() => setIsCreating(false)} className="rounded-xl h-11 text-slate-900 dark:text-slate-100" disabled={isPending}>
                            Cancel
                        </Button>
                        </div>
                    </form>
                    </CardContent>
                </Card>
                )}
            </div>

            <div className="flex justify-center pt-4">
                <Button 
                    variant={isRemoveMode ? "default" : "ghost"}
                    onClick={() => { setIsRemoveMode(!isRemoveMode); setIsCreating(false); }}
                    className={`rounded-2xl font-bold ${isRemoveMode ? 'bg-destructive text-white hover:bg-destructive/90 shadow-lg' : 'text-muted-foreground'}`}
                >
                    {isRemoveMode ? <XCircle className="mr-2" size={18} /> : <Trash2 className="mr-2" size={18} />}
                    {isRemoveMode ? "Cancel Removal" : "Remove Profile"}
                </Button>
            </div>
        </div>
    </div>
  );
}
