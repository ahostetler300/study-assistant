"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, X, Plus, BookText, ListOrdered, Tag, CheckCircle2 } from "lucide-react";
import { createStudySet } from "../actions";
import { toast } from "sonner";

export default function CreateStudySetForm() {
  const router = useRouter();
  const [files, setFiles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newCategory, setNewCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [useCache, setUseCache] = useState(false);
  
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [count, setCount] = useState(10);

  useEffect(() => {
    Promise.all([
        fetch("/api/files").then(res => res.json()),
        fetch("/api/categories").then(res => res.json())
    ]).then(([f, c]) => {
        setFiles(f);
        setCategories(c);
    });
  }, []);

  async function handleCreateCategory() {
    if (!newCategory) return;
    const res = await fetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategory })
    });
    const cat = await res.json();
    setCategories([...categories, cat]);
    setSelectedCategory(cat.id);
    setNewCategory("");
    setIsCreatingCategory(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0) { toast.error("Select at least one source"); return; }
    if (!selectedCategory || selectedCategory === "all") { 
        toast.error("Please select a target category for this Study Set"); 
        return; 
    }

    setIsPending(true);
    const toastId = toast.loading("AI is analyzing sources and drafting questions...");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("instructions", instructions);
    formData.append("categoryId", selectedCategory);
    formData.append("count", count.toString());
    formData.append("useCache", useCache.toString());
    selectedFiles.forEach(id => formData.append("fileIds", id));

    try {
        const res = await createStudySet(formData);
        if (res.success) {
            let statsMsg = "";
            if (res.stats) {
                if (res.stats.skippedSize) {
                    statsMsg = ` (source too small | ${res.stats.input.toLocaleString()} tokens)`;
                } else if (res.stats.cached && res.stats.isHit) {
                    const cachedCount = res.stats.cachedTokens;
                    const newTokens = res.stats.input - cachedCount;
                    statsMsg = ` (used cache | ${cachedCount.toLocaleString()} from cache | ${newTokens > 0 ? newTokens.toLocaleString() : 0} new tokens)`;
                } else if (res.stats.cached && !res.stats.isHit) {
                    statsMsg = ` (content cached | ${res.stats.input.toLocaleString()} tokens)`;
                } else {
                    statsMsg = ` (no cache | ${res.stats.input.toLocaleString()} tokens)`;
                }
            }
            toast.success(`Study Set generated successfully${statsMsg}`, { id: toastId });
            router.push("/study-sets");
            router.refresh();
        } else {
            toast.error(res.error || "Generation failed", { id: toastId });
        }
    } catch (err) {
        toast.error("A runtime error occurred", { id: toastId });
    } finally {
        setIsPending(false);
    }
  }

  const toggleFile = (id: string) => {
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredFiles = files.filter(file => 
    selectedCategory === "all" || file.categoryId === selectedCategory
  );

  return (
    <div className="container max-w-3xl mx-auto p-4 pt-12 text-slate-900 dark:text-slate-100 font-sans">
        <Card className="rounded-3xl shadow-2xl border-slate-200/60 overflow-hidden">
            <CardHeader className="bg-slate-500/5 pb-8">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black">Generate Study Set</CardTitle>
                        <CardDescription>Synthesize a new question bank using AI.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <X size={20} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Set Title</label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl border-2" required />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</label>
                            <div className="flex gap-2">
                                {!isCreatingCategory ? (
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="h-12 rounded-xl border-2 flex-1">
                                            <SelectValue placeholder="Pick Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input placeholder="Category Name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-12 rounded-xl border-2 flex-1" autoFocus />
                                )}
                                <Button type="button" variant="outline" onClick={() => isCreatingCategory ? handleCreateCategory() : setIsCreatingCategory(true)} className="h-12 px-4 rounded-xl border-2">
                                    {isCreatingCategory ? "Add" : <Plus size={20} />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <BookText size={14} /> Select Grounding Sources
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredFiles.map(file => {
                                const isSelected = selectedFiles.includes(file.id);
                                return (
                                    <label 
                                        key={file.id} 
                                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? "border-primary bg-primary/5 shadow-sm scale-[1.01]" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-200"}`}
                                    >
                                        <Checkbox 
                                            checked={isSelected} 
                                            onCheckedChange={() => toggleFile(file.id)}
                                        />
                                        <span className="text-xs font-bold truncate flex-1">{file.displayName || file.name}</span>
                                        {isSelected && <CheckCircle2 size={14} className="text-primary" />}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Detailed Instructions</label>
                        <textarea 
                            placeholder="Describe what content you want to focus on..." 
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            className="w-full min-h-[150px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-sm leading-relaxed focus:outline-none focus:border-primary transition-colors resize-none"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <ListOrdered size={14} /> Question Quantity
                            </label>
                            <span className="text-3xl font-black text-primary">{count}</span>
                        </div>
                        <input 
                            type="range" min="1" max="100" step="1"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold flex items-center gap-2">
                                <Sparkles size={16} className="text-primary" /> ⚡ Performance Cache
                            </label>
                            <p className="text-[10px] text-muted-foreground italic">Recommended when creating multiple study sets from large books or data sources.</p>
                        </div>
                        <Checkbox 
                            checked={useCache} 
                            onCheckedChange={(checked) => setUseCache(checked as boolean)}
                            className="h-6 w-6 rounded-lg"
                        />
                    </div>

                    <Button type="submit" className="w-full h-20 rounded-3xl text-2xl font-black shadow-2xl transition-all active:scale-[0.98] bg-primary text-primary-foreground" disabled={isPending || selectedFiles.length === 0}>
                        {isPending ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Sparkles className="mr-3 h-8 w-8" />}
                        {isPending ? "Generating..." : "Create Study Set"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
