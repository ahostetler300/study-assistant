"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManagementActions } from "@/components/ManagementActions";

interface QuizCardProps {
    quiz: any;
    onRename: (id: string, newName: string) => Promise<any>;
    onDelete: (id: string) => Promise<any>;
}

export function QuizCard({ quiz, onRename, onDelete }: QuizCardProps) {
    return (
        <Link href={`/quizzes/attempts/${quiz.id}`} className="block group">
            <Card className="overflow-hidden rounded-3xl border-slate-200/60 dark:border-slate-800/60 bg-card shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all">
                <CardContent className="p-6 flex flex-col gap-5 text-slate-900 dark:text-slate-100">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <ClipboardCheck size={24} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-bold text-sm truncate uppercase tracking-tight">
                                    {quiz.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <Clock size={12} /> {new Date(quiz.createdAt).toLocaleDateString()} • {quiz._count.questions} Questions
                                </div>
                            </div>
                        </div>
                        
                        <div onClick={(e) => e.preventDefault()}>
                            <ManagementActions 
                                id={quiz.id} 
                                currentName={quiz.title} 
                                type="Quiz" 
                                onRename={onRename} 
                                onDelete={onDelete} 
                                warningText={`Are you sure you want to delete "${quiz.title}"? This will remove all associated results.`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {quiz.results?.[0] && (
                            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 flex justify-between items-center">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Latest Score</span>
                                <div className="text-right">
                                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                                        {quiz.results[0].score}/{quiz.results[0].completedCount}
                                    </span>
                                    <span className="text-[9px] font-bold text-muted-foreground ml-2">
                                        ({quiz.results[0].totalCount} Pool, {quiz.results[0].skippedCount} Skipped)
                                    </span>
                                </div>
                            </div>
                        )}
                        <div onClick={(e) => e.preventDefault()}>
                            <Link href={`/quizzes/${quiz.id}`} className="w-full">
                                <Button className="w-full rounded-2xl font-black h-12 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-none">
                                    <Play size={18} fill="currentColor" /> {quiz.results?.length > 0 ? "Retake Quiz" : "Start Quiz"}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
