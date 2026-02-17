import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizCard } from "./QuizCard";
import { deleteQuiz, renameQuiz } from "./actions";

export default async function MyQuizzesPage({ searchParams }: { searchParams: { userId?: string } }) {
  if (!searchParams.userId) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-slate-900 dark:text-slate-100 font-sans">
            <div className="bg-primary/10 p-6 rounded-full text-primary mb-6">
                <ClipboardCheck size={48} />
            </div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">Profile Required</h1>
            <p className="text-muted-foreground mb-8 font-medium">Please select a profile to view your personal quizzes.</p>
            <Link href="/">
                <Button className="rounded-2xl h-14 px-10 font-black text-lg shadow-xl">Select Profile</Button>
            </Link>
        </div>
    );
  }

  const quizzes = await prisma.quiz.findMany({
    where: { userId: searchParams.userId },
    include: {
      _count: { select: { questions: true } },
      user: true,
      results: {
        orderBy: { completedAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 pb-24 p-4 max-w-4xl mx-auto pt-6 text-slate-900 dark:text-slate-100 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
        <div>
            <h1 className="text-3xl font-black tracking-tight">My Quizzes</h1>
            <p className="text-muted-foreground text-sm font-medium">Testing sessions tailored to your focus.</p>
        </div>
        <Link href="/quizzes/create">
            <Button className="rounded-2xl font-black h-12 px-6 shadow-lg gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                <PlusCircle size={20} />
                Build Quiz
            </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizzes.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 bg-muted/20 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center p-16 text-muted-foreground">
              <ClipboardCheck size={64} className="mb-4 opacity-10" />
              <p className="font-bold text-lg text-slate-600 dark:text-slate-400">No active quizzes</p>
              <p className="text-sm text-center">Combine shared Study Sets into a personal testing session.</p>
            </CardContent>
          </Card>
        ) : (
          quizzes.map((quiz) => (
            <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                onRename={renameQuiz} 
                onDelete={deleteQuiz} 
            />
          ))
        )}
      </div>
    </div>
  );
}
