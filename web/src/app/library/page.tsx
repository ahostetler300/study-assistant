import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { FileIcon, FileText, PlusCircle, Tag, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ManagementActions } from "@/components/ManagementActions";
import { deleteFile, updateFile, checkFileExistenceAction } from "./actions";

export default async function LibraryPage({ searchParams }: { searchParams: { categoryId?: string } }) {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  
  const files = await prisma.file.findMany({
    where: searchParams.categoryId ? { categoryId: searchParams.categoryId } : {},
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  // Check file existence
  const filesWithStatus = await Promise.all(files.map(async (file) => {
    let status: 'verified' | 'missing' | 'unreadable' = 'verified';
    if (file.localPath) { // Only check if localPath exists
      const result = await checkFileExistenceAction(file.id);
      status = result.status;
    }
    return { ...file, status };
  }));

  return (
    <div className="flex flex-col gap-6 pb-24 p-4 max-w-4xl mx-auto pt-6 text-slate-900 dark:text-slate-100 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Source Library</h1>
            <p className="text-muted-foreground text-sm font-medium">Shared knowledge pool for all users.</p>
        </div>
        <Link href="/library/add">
            <Button className="rounded-2xl font-bold h-12 px-6 shadow-lg gap-2">
                <PlusCircle size={20} />
                Add Source
            </Button>
        </Link>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <Link href="/library">
            <Button variant={!searchParams.categoryId ? "default" : "outline"} size="sm" className="rounded-xl font-bold whitespace-nowrap">
                All Sources
            </Button>
        </Link>
        {categories.map(cat => (
            <Link key={cat.id} href={`/library?categoryId=${cat.id}`}>
                <Button variant={searchParams.categoryId === cat.id ? "default" : "outline"} size="sm" className="rounded-xl font-bold whitespace-nowrap">
                    {cat.name}
                </Button>
            </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filesWithStatus.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 bg-muted/20 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center p-16 text-muted-foreground">
              <FileIcon size={64} className="mb-4 opacity-10" />
              <p className="font-bold text-lg text-slate-600 dark:text-slate-400">No sources found</p>
              <p className="text-sm">Upload a textbook or URL to start building study sets.</p>
            </CardContent>
          </Card>
        ) : (
          filesWithStatus.map((file) => (
            <Card key={file.id} className="overflow-hidden rounded-3xl border-slate-200/60 dark:border-slate-800/60 bg-card shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="bg-primary/10 p-3 rounded-2xl text-primary shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-bold text-sm truncate pr-2">
                      {file.displayName || file.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        {file.category && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                <Tag size={8} /> {file.category.name}
                            </span>
                        )}
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        {file.status !== 'verified' && (
                            <span className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle size={8} /> {file.status === 'missing' ? 'Missing' : 'Unreadable'}
                            </span>
                        )}
                    </div>
                  </div>
                </div>
                
                <ManagementActions 
                    id={file.id} 
                    currentName={file.displayName || file.name} 
                    type="Source" 
                    onRename={updateFile} 
                    onDelete={deleteFile}
                    categories={categories}
                    currentCategoryId={file.categoryId}
                    warningText="Deleting this Data Source will remove its embeddings. Any associated Study Sets and Quizzes will also be deleted."
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
