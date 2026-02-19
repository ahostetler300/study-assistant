import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Calendar, Trophy, ChevronLeft, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

export default async function QuizAttemptsPage({ params }: { params: { id: string } }) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      results: {
        orderBy: { completedAt: "desc" },
      },
    },
  });

  if (!quiz) notFound();

  return (
    <div className="flex flex-col gap-6 pb-24 p-4 max-w-4xl mx-auto pt-6 text-slate-900 dark:text-slate-100 font-sans">
      <header className="flex flex-col gap-4 py-2">
        <Link href={`/quizzes?userId=${quiz.userId}`}>
            <Button variant="ghost" size="sm" className="w-fit rounded-xl font-bold gap-2 -ml-2">
                <ChevronLeft size={16} /> Back to My Quizzes
            </Button>
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h1 className="text-3xl font-black tracking-tight">{quiz.title}</h1>
              <p className="text-muted-foreground text-sm font-medium">History of all mastery attempts for this quiz.</p>
          </div>
          <Link href={`/quizzes/${quiz.id}`}>
              <Button className="rounded-2xl font-black h-12 px-8 shadow-lg gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                  <RotateCcw size={20} />
                  Retake Quiz
              </Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-4">
        {quiz.results.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center p-16 text-muted-foreground">
              <ClipboardCheck size={64} className="mb-4 opacity-10" />
              <p className="font-bold text-lg text-slate-600 dark:text-slate-400">No attempts yet</p>
              <p className="text-sm">Complete the quiz to see your progress tracked here.</p>
              <Link href={`/quizzes/${quiz.id}`} className="mt-6">
                <Button className="rounded-2xl font-bold h-12 px-8">Start First Attempt</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          quiz.results.map((result, idx) => (
            <Card key={result.id} className="overflow-hidden rounded-3xl border-slate-200/60 dark:border-slate-800/60 bg-card shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${idx === 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Trophy size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-xl text-primary">{result.score}/{result.completedCount}</span>
                            {idx === 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Latest</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(result.completedAt).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(result.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Pool Depth</p>
                    <p className="text-sm font-bold">{result.totalCount} Questions</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 italic">{result.skippedCount} Skipped</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
