"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, ShieldCheck, ShieldAlert, Eye, EyeOff, Loader2, Save, Sparkles, RotateCcw, Tag, Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { saveGeminiKey, checkSettingsStatus, getCategories, createCategory, updateCategory, deleteCategory, saveGeminiModel, saveCacheTtl, purgeAllCaches, getActiveCaches } from "./actions";
import { getSystemPrompt, updateSystemPrompt, resetSystemPrompt, getDefaultPrompt } from "@/lib/prompts";
import { toast } from "sonner";

export default function SettingsPage() {
  const [showKey, setShowKey] = useState(false);
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<{ hasSecret: boolean; hasEncryptedKey: boolean; selectedModel?: string; cacheTtl?: number } | null>(null);
  const [quizPrompt, setQuizPrompt] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [tempTtl, setTempTtl] = useState<number | null>(null);
  
  // Category state
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Cache Inspector state
  const [activeCaches, setActiveCaches] = useState<any[] | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  async function loadData() {
    const s = await checkSettingsStatus();
    setStatus(s);
    setTempTtl(s.cacheTtl || 3);
    const p = await getSystemPrompt();
    setQuizPrompt(p);
    const c = await getCategories();
    setCategories(c);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Debounced TTL saving
  useEffect(() => {
    if (tempTtl === null || status?.cacheTtl === tempTtl) return;
    
    const timer = setTimeout(async () => {
        const res = await saveCacheTtl(tempTtl);
        if (res.success) {
            toast.success(`Cache duration set to ${tempTtl}m`);
            setStatus(prev => prev ? { ...prev, cacheTtl: tempTtl } : null);
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, [tempTtl, status?.cacheTtl]);

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    const res = await createCategory(newCatName.trim());
    if (res.success) {
      toast.success("Category added");
      setNewCatName("");
      loadData();
    } else {
      toast.error(res.error);
    }
  }

  async function handleUpdateCategory(id: string) {
    if (!editingName.trim()) return;
    const res = await updateCategory(id, editingName.trim());
    if (res.success) {
      toast.success("Category updated");
      setEditingCatId(null);
      loadData();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Delete this category? Associated items will remain but lose their category tag.")) return;
    const res = await deleteCategory(id);
    if (res.success) {
      toast.success("Category removed");
      loadData();
    } else {
      toast.error(res.error);
    }
  }

  async function handleSubmitKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsPending(true);
    const res = await saveGeminiKey(formData);
    setIsPending(false);

    if (res.success) {
      toast.success("API Key secured!");
      loadData();
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error(res.error || "Failed to save");
    }
  }

  async function handleSavePrompt() {
    setIsSavingPrompt(true);
    await updateSystemPrompt(quizPrompt);
    setIsSavingPrompt(false);
    toast.success("Prompt updated");
  }

  async function handleResetPrompt() {
    if (!confirm("Reset?")) return;
    await resetSystemPrompt();
    const def = await getDefaultPrompt();
    setQuizPrompt(def);
    toast.success("Default restored");
  }

  async function handleModelChange(model: string) {
    const res = await saveGeminiModel(model);
    if (res.success) {
      toast.success(`Model updated to ${model}`);
      loadData();
    } else {
      toast.error(res.error);
    }
  }

  async function handlePurgeCaches() {
    if (!confirm("This will clear all optimization metadata from the database. Actual Google caches will expire naturally. Proceed?")) return;
    setIsPurging(true);
    const res = await purgeAllCaches();
    setIsPurging(false);
    if (res.success) {
        toast.success("Local cache data cleared");
        setActiveCaches(null);
    }
  }

  async function handleInspectCaches() {
    setIsInspecting(true);
    const res = await getActiveCaches();
    setIsInspecting(false);
    if (Array.isArray(res)) {
        setActiveCaches(res);
        if (res.length === 0) toast.info("No active caches found on Google servers.");
    } else if (res && 'error' in res) {
        toast.error(res.error);
    }
  }

  function getTimeRemaining(expireTime: string) {
    const expire = new Date(expireTime);
    const now = new Date();
    const diff = expire.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  return (
    <>
      {!isAuthenticated ? (
        <div className="flex flex-col gap-4 p-4 max-w-sm mx-auto pt-24 text-slate-900 dark:text-slate-100 h-screen">
          <Card className="rounded-3xl shadow-lg border-slate-200/60 overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="text-primary" size={20} />
                Access Restricted
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Please enter the PIN to access settings.</p>
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (e.target.value === "1234") {
                    setIsAuthenticated(true);
                    toast.success("Settings unlocked!");
                  }
                }}
                className="h-12 rounded-2xl border-2"
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-8 p-4 max-w-2xl mx-auto pb-24 pt-6 text-slate-900 dark:text-slate-100">
          <header className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage secure keys and AI persona.</p>
          </header>

          <section className="grid gap-6">
            <Card className="rounded-3xl border-slate-200/60 bg-card/50 backdrop-blur-sm overflow-hidden text-sm shadow-sm">
              <CardHeader className="bg-slate-500/5 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-primary" size={20} />
                    <CardTitle className="text-lg">System Security</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-3 font-medium">
                 <div className="flex justify-between items-center opacity-80">
                    <span>Infrastructure (.env.local)</span>
                    {status?.hasSecret ? <ShieldCheck className="text-green-500" size={18} /> : <ShieldAlert className="text-destructive" size={18} />}
                 </div>
                 <div className="flex justify-between items-center opacity-80">
                    <span>Application Vault (.secrets.env)</span>
                    {status?.hasEncryptedKey ? <ShieldCheck className="text-green-500" size={18} /> : <ShieldAlert className="text-slate-300 dark:text-slate-700" size={18} />}
                 </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-lg border-slate-200/60 overflow-hidden">
              <CardHeader className="pb-2 border-b">
                 <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="text-primary" size={20} />
                    Gemini API Key
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <form onSubmit={handleSubmitKey} className="space-y-4">
                  <div className="relative">
                    <Input
                      name="apiKey"
                      type={showKey ? "text" : "password"}
                      placeholder="Paste secure key..."
                      className="pr-12 h-12 rounded-2xl border-2"
                      required
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button type="submit" className="w-full h-12 font-bold rounded-2xl shadow-md" disabled={isPending || !status?.hasSecret}>
                    {isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2" size={18} />}
                    Update Key
                  </Button>
                </form>

                <div className="pt-4 border-t space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Active Model</label>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
                            { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
                            { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" }
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => handleModelChange(m.id)}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${status?.selectedModel === m.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                            >
                                <span className="font-bold text-sm">{m.label}</span>
                                {status?.selectedModel === m.id && <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic mt-2">Note: Changes take effect immediately for all new study sets.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-lg border-primary/10 overflow-hidden">
              <CardHeader className="bg-primary/5 pb-4 border-b">
                 <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <Sparkles size={20} />
                    Session Optimization
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cache Duration (TTL)</label>
                        <span className="text-2xl font-black text-primary">{tempTtl || 3}m</span>
                    </div>
                    <input 
                        type="range" min="1" max="15" step="1"
                        value={tempTtl || 3}
                        onChange={(e) => setTempTtl(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Caches are refreshed automatically every time they are used during a session.</p>
                </div>

                <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Active Cloud Caches</label>
                        <Button variant="ghost" size="sm" onClick={handleInspectCaches} disabled={isInspecting} className="h-8 text-primary font-bold rounded-lg hover:bg-primary/5">
                            {isInspecting ? <Loader2 className="animate-spin mr-2" size={14} /> : <Search size={14} className="mr-2" />}
                            Inspect
                        </Button>
                    </div>

                    {activeCaches && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            {activeCaches.length === 0 ? (
                                <p className="text-center py-4 text-xs text-muted-foreground font-medium bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed">No active caches</p>
                            ) : (
                                activeCaches.map(cache => (
                                    <div key={cache.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-[11px] font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-slate-100">{cache.displayName}</span>
                                                 <span className="text-[9px] opacity-60 uppercase tracking-tighter">{(cache.usageMetadata?.totalTokenCount / 1000).toFixed(0)}k tokens • {cache.model ? cache.model.split('/').pop() : 'Unknown Model'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-primary font-black">{getTimeRemaining(cache.expireTime)}</p>
                                            <p className="text-[9px] opacity-40 uppercase font-black">Time Left</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                
                <Button variant="outline" onClick={handlePurgeCaches} disabled={isPurging} className="w-full h-11 rounded-2xl border-2 border-destructive/20 text-destructive hover:bg-destructive/5 font-bold">
                    {isPurging ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2" size={16} />}
                    Clear Optimization Data
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-lg border-slate-200/60 overflow-hidden">
              <CardHeader className="pb-2 border-b">
                 <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="text-primary" size={20} />
                    Global Categories
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-2">
                    <Input 
                        placeholder="New category name..." 
                        value={newCatName} 
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="h-11 rounded-xl"
                    />
                    <Button onClick={handleCreateCategory} size="icon" className="h-11 w-11 shrink-0 rounded-xl">
                        <Plus size={20} />
                    </Button>
                </div>

                <div className="space-y-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                            {editingCatId === cat.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input 
                                        value={editingName} 
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="h-9 rounded-lg"
                                        autoFocus
                                    />
                                    <Button onClick={() => handleUpdateCategory(cat.id)} size="sm" className="h-9 px-3 rounded-lg">Save</Button>
                                    <Button variant="ghost" onClick={() => setEditingCatId(null)} size="icon" className="h-9 w-9 rounded-lg">
                                        <X size={16} />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-bold text-sm px-2">{cat.name}</span>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-400 hover:text-primary"
                                            onClick={() => { setEditingCatId(cat.id); setEditingName(cat.name); }}
                                        >
                                            <Edit2 size={14} />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-400 hover:text-destructive"
                                            onClick={() => handleDeleteCategory(cat.id)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-lg border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
              <CardHeader className="bg-indigo-500/5 pb-4 border-b">
                 <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Sparkles size={20} />
                        Quiz Persona
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleResetPrompt} className="text-indigo-600 hover:text-indigo-700 rounded-xl">
                        <RotateCcw size={14} className="mr-1" /> Reset
                    </Button>
                 </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <textarea 
                   value={quizPrompt}
                   onChange={(e) => setQuizPrompt(e.target.value)}
                   className="w-full min-h-[300px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
                <Button onClick={handleSavePrompt} className="w-full h-12 font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg" disabled={isSavingPrompt}>
                  {isSavingPrompt ? <Loader2 className="animate-spin" /> : <Save className="mr-2" size={18} />}
                  Save Persona
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
