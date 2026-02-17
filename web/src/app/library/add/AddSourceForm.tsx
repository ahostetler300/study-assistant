"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Globe, Save, Loader2, X, Plus, Tag } from "lucide-react";
import { uploadFile, uploadFromUrl } from "../actions";
import { toast } from "sonner";

export default function AddSourceForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "url">("file");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    fetch("/api/categories").then(res => res.json()).then(setCategories);
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
    toast.success("Category created");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName) { toast.error("Please provide a name"); return; }
    if (!selectedCategory) { toast.error("Please select a category"); return; }
    
    setIsPending(true);
    const toastId = toast.loading("Ingesting source...");

    try {
        let result;
        if (mode === "file") {
            if (!file) throw new Error("No file selected");
            const formData = new FormData();
            formData.append("file", file);
            formData.append("displayName", displayName);
            formData.append("categoryId", selectedCategory);
            result = await uploadFile(formData);
        } else {
            if (!url) throw new Error("No URL provided");
            result = await uploadFromUrl(url, displayName, selectedCategory);
        }

        if (result.success) {
            toast.success("Source successfully embedded", { id: toastId });
            router.push("/library");
            router.refresh();
        } else {
            toast.error(result.error || "Failed", { id: toastId });
        }
    } catch (err: any) {
        toast.error(err.message, { id: toastId });
    } finally {
        setIsPending(false);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 pt-12">
        <Card className="rounded-3xl shadow-2xl border-slate-200/60 overflow-hidden">
            <CardHeader className="bg-slate-500/5 pb-8">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black">Ingest New Source</CardTitle>
                        <CardDescription>Prepare documents for AI-driven synthesis.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <X size={20} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
                    <div className="flex p-1 bg-muted rounded-2xl">
                    <button 
                        onClick={() => setMode("file")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'file' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                        <Upload size={16} /> Local File
                    </button>
                    <button 
                        onClick={() => setMode("url")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'url' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                        <Globe size={16} /> Web Page
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Source Name</label>
                            <Input 
                                placeholder="e.g. Navigation Basics" 
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="h-12 rounded-xl border-2"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</label>
                            <div className="flex gap-2">
                                {!isCreatingCategory ? (
                                    <>
                                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                            <SelectTrigger className="h-12 rounded-xl border-2 flex-1">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="outline" onClick={() => setIsCreatingCategory(true)} className="h-12 w-12 rounded-xl border-2">
                                            <Plus size={20} />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Input 
                                            placeholder="New Category Name" 
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="h-12 rounded-xl border-2 flex-1"
                                            autoFocus
                                        />
                                        <Button type="button" onClick={handleCreateCategory} className="h-12 rounded-xl px-4 font-bold">Add</Button>
                                        <Button type="button" variant="ghost" onClick={() => setIsCreatingCategory(false)} className="h-12 rounded-xl">Cancel</Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {mode === "file" ? (
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Choose File</label>
                                <Input 
                                    type="file" 
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            setFile(f);
                                            if (!displayName) setDisplayName(f.name.replace(/\.[^/.]+$/, ""));
                                        }
                                    }}
                                    className="h-12 rounded-xl border-2 pt-2"
                                    accept=".pdf,.epub,.docx,.pptx,.xlsx,.html,.txt,.md,.png,.jpg,.jpeg"
                                    required
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Source URL</label>
                                <Input 
                                    placeholder="https://..." 
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="h-12 rounded-xl border-2"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full h-16 rounded-3xl text-xl font-bold shadow-xl transition-all active:scale-[0.98]" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                        {isPending ? "Analyzing..." : "Start Ingestion"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
