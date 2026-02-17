"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2, Loader2, AlertTriangle, Tag } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
    id: string;
    name: string;
}

interface ManagementActionsProps {
    id: string;
    currentName: string;
    type: "Source" | "StudySet" | "Quiz";
    onRename: (id: string, newName: string, categoryId?: string | null) => Promise<{ success?: boolean; error?: string }>;
    onDelete: (id: string) => Promise<{ success?: boolean; error?: string }>;
    warningText?: string;
    editHref?: string;
    categories?: Category[];
    currentCategoryId?: string | null;
}

export function ManagementActions({ id, currentName, type, onRename, onDelete, warningText, editHref, categories, currentCategoryId }: ManagementActionsProps) {
    const router = useRouter();
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newName, setNewName] = useState(currentName);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(currentCategoryId || "none");
    const [isPending, setIsPending] = useState(false);

    async function handleRename() {
        if (!newName) return;
        setIsPending(true);
        const res = await onRename(id, newName, selectedCategoryId === "none" ? null : selectedCategoryId);
        setIsPending(false);
        if (res.success) {
            toast.success(`${type} updated`);
            setIsRenaming(false);
        } else {
            toast.error(res.error || "Update failed");
        }
    }

    async function handleDelete() {
        setIsPending(true);
        const res = await onDelete(id);
        setIsPending(false);
        if (res.success) {
            toast.success(`${type} deleted`);
            setIsDeleting(false);
        } else {
            toast.error(res.error || "Delete failed");
        }
    }

    return (
        <div className="flex gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                onClick={() => { 
                    if (editHref) {
                        router.push(editHref);
                    } else {
                        setNewName(currentName); 
                        setIsRenaming(true); 
                    }
                }}
            >
                <Edit2 size={16} />
            </Button>

            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsDeleting(true)}
            >
                <Trash2 size={16} />
            </Button>

            {/* Rename Dialog */}
            {isRenaming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-card border rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="space-y-1 text-slate-900 dark:text-slate-100">
                            <h3 className="text-lg font-bold">Rename {type}</h3>
                            <p className="text-xs text-muted-foreground">Enter a new name for this asset.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Name</label>
                                <Input 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    className="h-11 rounded-xl"
                                    autoFocus
                                />
                            </div>

                            {type === "Source" && categories && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</label>
                                    <Select value={selectedCategoryId || "none"} onValueChange={setSelectedCategoryId}>
                                        <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">General (No Category)</SelectItem>
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button className="flex-1 rounded-xl font-bold" onClick={handleRename} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
                            </Button>
                            <Button variant="ghost" className="rounded-xl text-slate-900 dark:text-slate-100" onClick={() => setIsRenaming(false)} disabled={isPending}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Dialog */}
            {isDeleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-card border border-destructive/20 rounded-3xl p-6 shadow-2xl space-y-6">
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className="bg-destructive/10 p-3 rounded-full text-destructive">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Confirm Deletion</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {warningText || `Are you sure you want to delete "${currentName}"? This action cannot be undone.`}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button variant="destructive" className="h-12 rounded-xl font-bold shadow-lg" onClick={handleDelete} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : `Delete ${type}`}
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-xl font-medium text-slate-900 dark:text-slate-100" onClick={() => setIsDeleting(false)} disabled={isPending}>
                                Keep It
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
