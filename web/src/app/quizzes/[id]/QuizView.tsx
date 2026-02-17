"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ChevronRight, Trophy, LogOut, Sparkles } from "lucide-react";
import { useUser } from "@/components/UserContext";
import { saveResultAction } from "../actions";

interface Question {
  id: string;
  text: string;
  options: string; 
  correctAnswer: number;
  explanation: string | null;
}

interface QuizProps {
  quizId: string;
  title: string;
  questions: Question[];
}

export default function QuizView({ quizId, title, questions }: QuizProps) {
  const router = useRouter();
  const { user } = useUser();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [attemptedCount, setAttemptedCount] = useState(0);

  const currentQuestion = questions[currentIdx];
  const options = JSON.parse(currentQuestion.options) as string[];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  function handleSelect(idx: number) {
    if (isAnswered) return;
    setSelectedIdx(idx);
  }

  function handleSubmit() {
    if (selectedIdx === null) return;
    setIsAnswered(true);
    setAttemptedCount(prev => prev + 1);
    if (selectedIdx === currentQuestion.correctAnswer) {
      setScore(s => s + 1);
    }
  }

  async function finishQuiz(isEarly = false) {
    const finalAttempted = isEarly ? attemptedCount : questions.length;
    
    await saveResultAction({
        userId: user?.id || "",
        quizId,
        score,
        attempted: finalAttempted,
        total: questions.length
    });
    setIsFinished(true);
  }

  async function handleNext() {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
    } else {
      await finishQuiz();
    }
  }

  if (isFinished) {
    const total = questions.length;
    const skipped = total - attemptedCount;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-4 text-slate-900 dark:text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-primary/10 p-8 rounded-full border-4 border-primary/20">
          <Trophy className="text-primary" size={80} />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight">Session Complete</h2>
          <p className="text-xl font-black text-primary">
            {score}/{attemptedCount}
          </p>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            ({total} Pool, {skipped} Skipped)
          </p>
        </div>
        <Button onClick={() => router.push(`/quizzes?userId=${user?.id}`)} className="w-full max-w-xs rounded-3xl h-16 text-xl font-black shadow-2xl border-none">
          Back to My Quizzes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto pb-32 h-full pt-6 text-slate-900 dark:text-slate-100 font-sans">
      <header className="space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-black truncate text-primary uppercase tracking-widest">{title}</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">Focusing on {attemptedCount} of {questions.length} questions</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => finishQuiz(true)} className="rounded-xl font-bold text-destructive hover:bg-destructive/10 gap-2 h-9 px-4">
            <LogOut size={16} /> End Early
          </Button>
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </header>

      <Card className="flex-1 flex flex-col border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl leading-snug font-bold">
            {currentQuestion.text}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 space-y-3 pt-4">
          {options.map((option, idx) => {
            let state = "default";
            if (isAnswered) {
              if (idx === currentQuestion.correctAnswer) state = "correct";
              else if (idx === selectedIdx) state = "incorrect";
              else state = "muted";
            } else if (idx === selectedIdx) {
              state = "selected";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex justify-between items-center ${
                  state === "correct" ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100 font-bold shadow-md" :
                  state === "incorrect" ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100 font-bold" :
                  state === "selected" ? "border-primary bg-primary/5 shadow-md scale-[1.01]" :
                  state === "muted" ? "opacity-30 grayscale-[0.5]" :
                  "border-slate-100 dark:border-slate-800 hover:border-primary/50 bg-card/30"
                }`}
              >
                <div className="flex gap-4 items-start">
                    <span className="font-black opacity-30">{String.fromCharCode(65 + idx)}.</span>
                    <span className="font-semibold text-sm">{option}</span>
                </div>
                {state === "correct" && <CheckCircle2 size={20} className="text-green-600" />}
                {state === "incorrect" && <XCircle size={20} className="text-red-600" />}
              </button>
            );
          })}
        </CardContent>

        <CardFooter className="px-0 mt-auto pt-8 flex flex-col gap-4">
          {isAnswered && (
            <div className="bg-primary/5 p-6 rounded-2xl w-full text-sm leading-relaxed animate-in slide-in-from-bottom-2 border border-primary/10">
              <p className="font-black text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                  <Sparkles size={14} /> Explanation
              </p>
              <div className="text-slate-700 dark:text-slate-300 font-medium italic">
                {currentQuestion.explanation}
              </div>
            </div>
          )}

          {!isAnswered ? (
            <Button 
              className="w-full h-16 text-xl font-black rounded-3xl shadow-xl bg-primary text-primary-foreground" 
              onClick={handleSubmit} 
              disabled={selectedIdx === null}
            >
              Confirm Answer
            </Button>
          ) : (
            <Button className="w-full h-16 text-xl font-black rounded-3xl shadow-xl bg-primary text-primary-foreground" onClick={handleNext}>
              {currentIdx + 1 < questions.length ? "Next Question" : "Final Grade"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
