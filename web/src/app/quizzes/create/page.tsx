"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Loader2, X, Layers, ListOrdered, CheckCircle2, Tag } from "lucide-react";
import { createQuizAction } from "../actions";
import { toast } from "sonner";
import { useUser } from "@/components/UserContext";

export default function CreateQuizPage() {
  const router = useRouter();
  const { user } = useUser();
  const [sets, setSets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [count, setCount] = useState(10);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    Promise.all([
        fetch("/api/study-sets", { cache: "no-store" }).then(res => res.json()),
        fetch("/api/categories", { cache: "no-store" }).then(res => res.json())
    ]).then(([s, c]) => {
        setSets(s);
        setCategories(c);
    });
  }, []);

  const filteredSets = sets.filter(set => 
    selectedCategory === "all" || set.categoryId === selectedCategory
  );

  const totalAvailable = sets
    .filter(s => selectedSets.includes(s.id))
    .reduce((acc, curr) => acc + curr._count.questions, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSets.length === 0) { toast.error("Select at least one study set"); return; }
    if (!user) { toast.error("Select a profile first"); return; }
    if (!title) { toast.error("Quiz title is mandatory"); return; }

    setIsPending(true);
    const toastId = toast.loading("Assembling your quiz...");

    try {
        const res = await createQuizAction({
            userId: user.id,
            title: title,
            setIds: selectedSets,
            limit: mode === "custom" ? count : undefined
        });

        if (res.success) {
            toast.success("Quiz built!", { id: toastId });
            router.push(`/quizzes/${res.quizId}`);
        } else {
            toast.error(res.error || "Failed", { id: toastId });
        }
    } catch (err) {
        toast.error("Error creating quiz", { id: toastId });
    } finally {
        setIsPending(false);
    }
  }

  const toggleSet = (id: string) => {
    setSelectedSets(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 pt-12 text-slate-900 dark:text-slate-100 font-sans">
        <Card className="rounded-3xl shadow-2xl border-slate-200/60 overflow-hidden">
            <CardHeader className="bg-slate-500/5 pb-8 border-b">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black">Build Custom Quiz</CardTitle>
                        <CardDescription className="text-xs text-slate-500">Combine shared study sets into a personal session.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <X size={20} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-sans">Quiz Title</label>
                            <Input 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                className="h-12 rounded-xl border-2" 
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Tag size={12} /> Filter by Category
                            </label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="h-12 rounded-xl border-2">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Layers size={14} /> Select Shared Study Sets
                        </label>
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredSets.map(set => {
                                const isSelected = selectedSets.includes(set.id);
                                return (
                                    <label 
                                        key={set.id} 
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? "border-primary bg-primary/5 shadow-sm scale-[1.01]" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-200"}`}
                                    >
                                        <Checkbox 
                                            checked={isSelected} 
                                            onCheckedChange={() => toggleSet(set.id)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{set.title}</p>
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase">{set.category?.name || 'General'} • {set._count.questions} Qs</p>
                                        </div>
                                        {isSelected && <CheckCircle2 className="text-primary" size={16} />}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ListOrdered size={14} /> Quiz Configuration
                        </label>
                        <div className="flex p-1 bg-muted rounded-2xl">
                            <button type="button" onClick={() => setMode("all")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'all' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Include All ({totalAvailable})</button>
                            <button type="button" onClick={() => setMode("custom")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'custom' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Random Subset</button>
                        </div>

                        {mode === "custom" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-muted-foreground">Select how many:</span>
                                    <span className="text-2xl font-black text-primary">{count}</span>
                                </div>
                                <input 
                                    type="range" min="1" max={Math.max(1, totalAvailable)} step="1"
                                    value={count}
                                    onChange={(e) => setCount(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl transition-all active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending || selectedSets.length === 0 || !user}>
                        {isPending ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Play size={24} fill="currentColor" className="mr-3" />}
                        {isPending ? "Assembling..." : "Generate & Start"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
