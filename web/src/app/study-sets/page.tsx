import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, PlusCircle, Tag, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ManagementActions } from "@/components/ManagementActions";
import { deleteStudySet, renameStudySet } from "./actions";

export default async function StudySetsPage({ searchParams }: { searchParams: { categoryId?: string } }) {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  
  const studySets = await prisma.studySet.findMany({
    where: searchParams.categoryId ? { categoryId: searchParams.categoryId } : {},
    include: { category: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 pb-24 p-4 max-w-4xl mx-auto pt-6 text-slate-900 dark:text-slate-100 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
        <div>
            <h1 className="text-3xl font-black tracking-tight">Study Sets</h1>
            <p className="text-muted-foreground text-sm font-medium">Shared collections of AI-generated questions.</p>
        </div>
        <Link href="/study-sets/create">
            <Button className="rounded-2xl font-bold h-12 px-6 shadow-lg gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                <PlusCircle size={20} />
                Generate New Set
            </Button>
        </Link>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <Link href="/study-sets">
            <Button variant={!searchParams.categoryId ? "default" : "outline"} size="sm" className="rounded-xl font-bold whitespace-nowrap">
                All Sets
            </Button>
        </Link>
        {categories.map(cat => (
            <Link key={cat.id} href={`/study-sets?categoryId=${cat.id}`}>
                <Button variant={searchParams.categoryId === cat.id ? "default" : "outline"} size="sm" className="rounded-xl font-bold whitespace-nowrap">
                    {cat.name}
                </Button>
            </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {studySets.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 bg-muted/20 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center p-16 text-muted-foreground">
              <Layers size={64} className="mb-4 opacity-10" />
              <p className="font-bold text-lg text-slate-600 dark:text-slate-400">No study sets yet</p>
              <p className="text-sm">Synthesize your first question bank from the library.</p>
            </CardContent>
          </Card>
        ) : (
          studySets.map((set) => (
            <Link key={set.id} href={`/study-sets/${set.id}`}>
              <Card className="overflow-hidden rounded-3xl border-slate-200/60 dark:border-slate-800/60 bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <HelpCircle size={24} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-bold text-sm truncate pr-2">
                        {set.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                          {set.category && (
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Tag size={8} /> {set.category.name}
                              </span>
                          )}
                          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                              {set._count.questions} Questions
                          </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
