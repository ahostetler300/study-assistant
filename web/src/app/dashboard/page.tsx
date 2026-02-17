import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle, TrendingUp, Sparkles, Layers, ChevronRight, ClipboardCheck } from "lucide-react";

export default async function DashboardPage({ searchParams }: { searchParams: { userId?: string } }) {
  if (!searchParams.userId) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-slate-900 dark:text-slate-100 font-sans">
            <div className="bg-primary/10 p-6 rounded-full text-primary mb-6">
                <TrendingUp size={48} />
            </div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">Profile Required</h1>
            <p className="text-muted-foreground mb-8 font-medium">Please select a profile to view your progress.</p>
            <Link href="/">
                <Button className="rounded-2xl h-14 px-10 font-black text-lg shadow-xl">Select Profile</Button>
            </Link>
        </div>
    );
  }

  const fileCount = await prisma.file.count();
  const setCount = await prisma.studySet.count();
  
  const recentResults = await prisma.result.findMany({
    where: { userId: searchParams.userId },
    take: 4,
    orderBy: { completedAt: "desc" },
    include: { quiz: true, user: true }
  });

  return (
    <div className="flex flex-col gap-8 p-4 max-w-4xl mx-auto pb-24 pt-6 text-slate-900 dark:text-slate-100 font-sans">
      <header className="space-y-1">
        <h1 className="text-4xl font-black tracking-tight">Mastery Dashboard</h1>
        <p className="text-muted-foreground font-medium">A place for learning</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/library" className="block group">
          <Card className="bg-primary/5 border-primary/10 hover:border-primary/30 transition-all rounded-3xl overflow-hidden shadow-sm h-full">
            <CardContent className="p-8 flex flex-col items-center justify-center gap-4 text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileText size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black">{fileCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sources</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/study-sets" className="block group">
          <Card className="bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/30 transition-all rounded-3xl overflow-hidden shadow-sm h-full">
            <CardContent className="p-8 flex flex-col items-center justify-center gap-4 text-center">
              <div className="bg-indigo-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Layers size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black">{setCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Study Sets</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/quizzes?userId=${searchParams.userId}`} className="block group">
          <Card className="bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30 transition-all rounded-3xl overflow-hidden shadow-sm h-full">
            <CardContent className="p-8 flex flex-col items-center justify-center gap-4 text-center text-slate-900 dark:text-slate-100 no-underline">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ClipboardCheck size={32} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">My Personal Quizzes</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-500" /> Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button asChild size="lg" className="h-20 justify-start gap-5 text-xl font-black shadow-xl rounded-3xl group bg-indigo-600 hover:bg-indigo-700 text-white border-none">
            <Link href="/study-sets/create">
              <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <PlusCircle size={28} />
              </div>
              Generate Study Set
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-20 justify-start gap-5 text-xl font-black shadow-lg rounded-3xl group border-2 border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
            <Link href={`/quizzes/create?userId=${searchParams.userId}`}>
              <div className="bg-emerald-500/10 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <ClipboardCheck size={28} />
              </div>
              Build Quiz
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp size={18} className="text-green-500" /> Recent Activity
        </h2>
        <div className="grid gap-3">
          {recentResults.length === 0 ? (
            <p className="text-sm text-muted-foreground p-12 bg-muted/30 rounded-3xl border-2 border-dashed text-center italic">
              No recent attempts. Start a quiz to see your mastery growth!
            </p>
          ) : (
            recentResults.map((result) => (
              <Link key={result.id} href={`/quizzes/attempts/${result.quiz.id}`}>
                <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden hover:border-primary/30 transition-all group">
                  <CardContent className="p-4 flex items-center justify-between text-slate-900 dark:text-slate-100 font-medium">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 dark:bg-slate-800 h-10 w-10 flex items-center justify-center rounded-xl text-xs font-black uppercase text-slate-400 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                         {result.user.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[160px] sm:max-w-xs">{result.quiz.title}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                          {result.user.name} • {new Date(result.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                          <p className="text-xl font-black text-primary leading-none">
                              {result.score}/{result.completedCount}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground tracking-widest mt-1">
                              ({result.totalCount} Pool, {result.skippedCount} Skipped)
                          </p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
