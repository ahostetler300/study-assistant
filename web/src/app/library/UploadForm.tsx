"use client";

import { Upload, Link as LinkIcon, Loader2, X, Globe, Save } from "lucide-react";
import { uploadFile, uploadFromUrl } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function UploadForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState<"file" | "url" | "naming">("file");
  const [url, setUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tempFile, setTempFile] = useState<File | null>(null);

  async function startFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTempFile(file);
    setDisplayName(file.name.replace(/\.[^/.]+$/, ""));
    setMode("naming");
  }

  async function handleFinalUpload() {
    if (!tempFile) return;
    const formData = new FormData();
    formData.append("file", tempFile);
    formData.append("displayName", displayName);

    setIsPending(true);
    const toastId = toast.loading("Ingesting source...");

    try {
      const result = await uploadFile(formData);
      if (result.success) {
        toast.success("Source added", { id: toastId });
        reset();
        router.refresh();
      } else {
        toast.error(result.error || "Upload failed", { id: toastId });
      }
    } catch (error: unknown) {
      toast.error("Error during upload", { id: toastId });
    } finally {
      setIsPending(false);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.startsWith("http")) {
      toast.error("Enter a valid URL");
      return;
    }
    setMode("naming");
    setDisplayName(url.split("/").pop() || "Web Source");
  }

  async function handleFinalUrlUpload() {
    setIsPending(true);
    const toastId = toast.loading("Processing URL...");

    try {
      const result = await uploadFromUrl(url, displayName);
      if (result.success) {
        toast.success("Content ingested", { id: toastId });
        reset();
        router.refresh();
      } else {
        toast.error(result.error || "URL failed", { id: toastId });
      }
    } catch (error: unknown) {
      toast.error("Error during ingestion", { id: toastId });
    } finally {
      setIsPending(false);
    }
  }

  function reset() {
    setMode("file");
    setUrl("");
    setDisplayName("");
    setTempFile(null);
  }

  if (mode === "naming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
        <Card className="w-full max-w-md shadow-2xl rounded-3xl border-slate-200/60 animate-in zoom-in-95 duration-200">
            <CardHeader>
            <CardTitle className="text-lg">Name this Source</CardTitle>
            <CardDescription className="text-xs text-slate-500">Give your source a descriptive name.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <Input 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12 rounded-xl"
                autoFocus
            />
            <div className="flex gap-2">
                <Button 
                    onClick={tempFile ? handleFinalUpload : handleFinalUrlUpload} 
                    className="flex-1 rounded-xl h-11 font-bold" 
                    disabled={isPending}
                >
                    {isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2" size={18} />}
                    Import
                </Button>
                <Button variant="ghost" onClick={reset} className="rounded-xl h-11" disabled={isPending}>Cancel</Button>
            </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "url") {
    return (
      <form onSubmit={handleUrlSubmit} className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="relative flex-1 min-w-[200px]">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Web URL..."
            className="pl-9 h-10 rounded-xl"
            disabled={isPending}
            autoFocus
          />
        </div>
        <Button type="submit" size="sm" className="rounded-xl h-10 px-4" disabled={isPending || !url}>
          {isPending ? <Loader2 className="animate-spin" size={18} /> : "Add"}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl h-10 w-10" onClick={() => setMode("file")} disabled={isPending}>
          <X size={18} />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="cursor-pointer relative">
        <div className={`flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-2xl hover:bg-primary/90 transition-all shadow-md active:scale-95 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
          {isPending ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
            {isPending ? "Processing..." : "Add File"}
          </span>
        </div>
        <input 
          type="file" name="file" className="hidden" onChange={startFileUpload}
          disabled={isPending} accept=".pdf,.epub,.docx,.pptx,.xlsx,.html,.txt,.md,.png,.jpg,.jpeg"
        />
      </label>
      <Button variant="outline" size="icon" className="rounded-2xl h-10 w-10 border-2" onClick={() => setMode("url")} disabled={isPending}>
        <LinkIcon size={18} />
      </Button>
    </div>
  );
}
