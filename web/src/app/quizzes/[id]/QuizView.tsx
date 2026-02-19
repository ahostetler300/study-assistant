"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ChevronRight, Trophy, LogOut, Sparkles, HelpCircle, Loader2 } from "lucide-react";
import { useUser } from "@/components/UserContext";
import { saveResultAction, getAIExplanationAction } from "../actions";

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

function GeminiLogo({ size = 16 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="animate-pulse"
    >
      <path 
        d="M12 2C12 2 12.5 9.5 20 12C12.5 14.5 12 22 12 22C12 22 11.5 14.5 4 12C11.5 9.5 12 2 12 2Z" 
        fill="url(#gemini-gradient)"
      />
      <defs>
        <linearGradient id="gemini-gradient" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.33" stopColor="#EA4335" />
          <stop offset="0.66" stopColor="#FBBC05" />
          <stop offset="1" stopColor="#34A853" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function formatMarkdown(text: string) {
    // Robust markdown-lite formatter
    const html = text
        .replace(/^### (.*$)/gim, '<h3 class="font-black text-primary mt-6 mb-2 border-b border-primary/10 pb-1">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="font-black text-primary mt-8 mb-4 border-b-2 border-primary/20 pb-2">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-primary">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic opacity-80">$1</em>')
        .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-2 flex gap-2"><span class="text-primary opacity-50">•</span><span>$1</span></li>')
        .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-2 flex gap-2"><span class="text-primary opacity-50">•</span><span>$1</span></li>')
        .replace(/^---$/gm, '<hr class="my-6 border-t border-primary/20" />')
        .replace(/\n\n/g, '<div class="h-4"></div>')
        .replace(/\n/g, '<br />');
    
    return { __html: `<div class="space-y-1">${html}</div>` };
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
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIdx];
  const options = JSON.parse(currentQuestion.options) as string[];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  // 1. Persistence: Load Session
  useEffect(() => {
    if (!user?.id || isLoaded) return;
    
    const key = `study_session_${user.id}_${quizId}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            setCurrentIdx(data.currentIdx || 0);
            setScore(data.score || 0);
            setAttemptedCount(data.attemptedCount || 0);
            setAiExplanations(data.aiExplanations || {});
            // If they were in the middle of an answer, we reset it for safety
            setIsAnswered(false);
            setSelectedIdx(null);
        } catch (e) {
            console.error("Failed to restore session", e);
        }
    }
    setIsLoaded(true);
  }, [user?.id, quizId, isLoaded]);

  // 2. Persistence: Save Session
  useEffect(() => {
    if (!isLoaded || !user?.id || isFinished) return;
    
    const key = `study_session_${user.id}_${quizId}`;
    const state = {
        currentIdx,
        score,
        attemptedCount,
        aiExplanations,
        updatedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(state));
  }, [currentIdx, score, attemptedCount, aiExplanations, isLoaded, user?.id, quizId, isFinished]);

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
    if (isSubmitting) return;
    setIsSubmitting(true);

    const finalAttempted = isEarly ? attemptedCount : questions.length;
    
    // Optimistic UI: Show trophy screen immediately
    setIsFinished(true);

    // Clear local persistence immediately
    if (user?.id) {
        localStorage.removeItem(`study_session_${user.id}_${quizId}`);
    }
    
    try {
        await saveResultAction({
            userId: user?.id || "",
            quizId,
            score,
            attempted: finalAttempted,
            total: questions.length
        });
    } catch (err) {
        console.error("Background sync failed:", err);
        // In a real production app, we would queue this for retry
    }
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

  async function fetchAIHelp() {
    if (aiExplanations[currentQuestion.id]) return;
    
    setIsAiLoading(true);
    try {
      const res = await getAIExplanationAction({
        questionText: currentQuestion.text,
        options,
        correctAnswer: currentQuestion.correctAnswer,
        userExplanation: currentQuestion.explanation
      });
      
      if (res.text) {
        setAiExplanations(prev => ({
          ...prev,
          [currentQuestion.id]: res.text
        }));
      }
    } catch (err) {
      console.error("AI Help Error:", err);
    } finally {
      setIsAiLoading(false);
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
    <div className="flex flex-col gap-5 sm:gap-6 p-4 max-w-2xl mx-auto pb-32 h-full pt-6 text-slate-900 dark:text-slate-100 font-sans">
      <header className="space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-black truncate text-primary uppercase tracking-widest">{title}</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">Focusing on {attemptedCount} of {questions.length} questions</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => finishQuiz(true)} 
            disabled={isSubmitting}
            className="rounded-xl font-bold text-destructive hover:bg-destructive/10 gap-2 h-9 px-4"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} End Early
          </Button>
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </header>

      <Card className="flex-1 flex flex-col border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl sm:text-2xl leading-snug font-bold">
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
                className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all flex justify-between items-center ${
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
            <>
              <div className="bg-primary/5 p-5 sm:p-6 rounded-2xl w-full text-sm leading-relaxed animate-in slide-in-from-bottom-2 border border-primary/10 relative">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                      <Sparkles size={14} /> Explanation
                  </p>
                  
                  <Button 
                    onClick={fetchAIHelp}
                    disabled={isAiLoading || !!aiExplanations[currentQuestion.id]}
                    className="h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-110 active:scale-95 border-none p-0 flex items-center justify-center"
                    title="Get Detailed AI Explanation"
                  >
                    {isAiLoading ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <span className="text-2xl font-black">?</span>
                    )}
                  </Button>
                </div>
                
                <div className="text-slate-700 dark:text-slate-300 font-medium italic mb-4">
                  {currentQuestion.explanation}
                </div>

                {aiExplanations[currentQuestion.id] && (
                  <div className="mt-4 pt-4 border-t border-primary/10 text-slate-800 dark:text-slate-200 prose prose-slate dark:prose-invert max-w-none">
                    <p className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                        <GeminiLogo size={14} />
                        AI Insights
                    </p>
                    <div 
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={formatMarkdown(aiExplanations[currentQuestion.id])}
                    />
                  </div>
                )}
              </div>
            </>
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
            <Button 
                className="w-full h-16 text-xl font-black rounded-3xl shadow-xl bg-primary text-primary-foreground" 
                onClick={handleNext}
                disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <>
                    {currentIdx + 1 < questions.length ? "Next Question" : "Final Grade"}
                    <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
