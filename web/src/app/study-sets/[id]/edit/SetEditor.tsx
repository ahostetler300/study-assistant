"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Save, ChevronLeft, CheckCircle2, AlertTriangle, Edit2, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateQuestionAction, deleteQuestionAction, updateSetMetadata } from "../../actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Question {
    id: string;
    text: string;
    options: string;
    correctAnswer: number;
    explanation: string | null;
}

interface SetEditorProps {
    studySet: {
        id: string;
        title: string;
        categoryId: string | null;
        questions: Question[];
    };
    categories: { id: string; name: string }[];
}

export function SetEditor({ studySet, categories }: SetEditorProps) {
    const router = useRouter();
    const [title, setTitle] = useState(studySet.title);
    const [categoryId, setCategoryId] = useState(studySet.categoryId || "none");
    const [questions, setQuestions] = useState(studySet.questions);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSavingMetadata, setIsSavingMetadata] = useState(false);

    // Metadata saving (Atomic-ish)
    async function handleSaveMetadata() {
        setIsSavingMetadata(true);
        const res = await updateSetMetadata(studySet.id, { 
            title, 
            categoryId: categoryId === "none" ? null : categoryId 
        });
        setIsSavingMetadata(false);
        if (res.success) toast.success("Set details updated");
        else toast.error(res.error);
    }

    return (
        <div className="flex flex-col gap-8 pb-32 p-4 max-w-4xl mx-auto pt-6 text-slate-900 dark:text-slate-100 font-sans">
            <header className="flex flex-col gap-4">
                <Button variant="ghost" onClick={() => router.push("/study-sets")} className="w-fit -ml-2 rounded-xl font-bold gap-2">
                    <ChevronLeft size={16} /> Back to Study Sets
                </Button>
                
                <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Study Set Title</label>
                            <Input 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                className="h-12 rounded-2xl border-2 font-bold" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="h-12 rounded-2xl border-2 font-bold">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">General (No Category)</SelectItem>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleSaveMetadata} disabled={isSavingMetadata} className="w-full h-12 rounded-2xl font-black shadow-lg">
                        {isSavingMetadata ? "Saving..." : "Update Set Details"}
                    </Button>
                </div>
            </header>

            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black tracking-tight">Manage Questions ({questions.length})</h2>
                </div>

                <div className="grid gap-4">
                    {questions.map((q, index) => (
                        <QuestionCard 
                            key={q.id} 
                            question={q} 
                            index={index} 
                            isEditing={editingId === q.id}
                            onEditToggle={() => setEditingId(editingId === q.id ? null : q.id)}
                            onDelete={async () => {
                                if (confirm("Remove this question permanently?")) {
                                    const res = await deleteQuestionAction(q.id, studySet.id);
                                    if (res.success) {
                                        setQuestions(questions.filter(item => item.id !== q.id));
                                        toast.success("Question removed");
                                    }
                                }
                            }}
                            onUpdate={(updatedQ) => {
                                setQuestions(questions.map(item => item.id === q.id ? updatedQ : item));
                                setEditingId(null);
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function QuestionCard({ question, index, isEditing, onEditToggle, onDelete, onUpdate }: { 
    question: Question, 
    index: number, 
    isEditing: boolean, 
    onEditToggle: () => void, 
    onDelete: () => void, 
    onUpdate: (q: Question) => void 
}) {
    const [text, setText] = useState(question.text);
    const [explanation, setExplanation] = useState(question.explanation || "");
    const [options, setOptions] = useState<string[]>(JSON.parse(question.options));
    const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        setIsSaving(true);
        const res = await updateQuestionAction(question.id, {
            text,
            explanation,
            correctAnswer,
            options: JSON.stringify(options)
        });
        setIsSaving(false);
        if (res.success) {
            toast.success("Question saved");
            onUpdate({ ...question, text, explanation, correctAnswer, options: JSON.stringify(options) });
        } else {
            toast.error(res.error);
        }
    }

    if (!isEditing) {
        return (
            <Card className="rounded-3xl border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-start gap-3">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                    {index + 1}
                                </span>
                                <p className="font-bold leading-snug">{question.text}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
                                {JSON.parse(question.options).map((opt: string, i: number) => (
                                    <div key={i} className={`text-xs p-2 rounded-xl border ${i === question.correctAnswer ? 'bg-green-50 dark:bg-green-950/20 border-green-500/50 text-green-700 dark:text-green-300 font-bold' : 'bg-slate-50/50 dark:bg-slate-900/50 border-transparent text-muted-foreground'}`}>
                                        <span className="opacity-40 mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                                    </div>
                                ))}
                            </div>

                            {question.explanation && (
                                <div className="pl-9 pt-2 border-t mt-4">
                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Explanation</p>
                                    <p className="text-xs text-muted-foreground italic leading-relaxed">{question.explanation}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={onEditToggle} className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary">
                                <Edit2 size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 rounded-xl text-slate-400 hover:text-destructive">
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-3xl border-primary bg-primary/5 shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <CardHeader className="bg-primary/10 border-b flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary" size={18} />
                    <span className="font-black text-xs uppercase tracking-widest text-primary">Editing Question {index + 1}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={onEditToggle} className="h-8 w-8 rounded-lg">
                    <X size={16} />
                </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Question Text</label>
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)}
                        className="w-full min-h-[100px] p-4 rounded-2xl bg-background border-2 font-medium focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Multiple Choice Options</label>
                    <div className="grid gap-3">
                        {options.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setCorrectAnswer(i)}
                                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all ${correctAnswer === i ? 'bg-green-500 border-green-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400'}`}
                                >
                                    {String.fromCharCode(65 + i)}
                                </button>
                                <Input 
                                    value={opt} 
                                    onChange={(e) => {
                                        const newOpts = [...options];
                                        newOpts[i] = e.target.value;
                                        setOptions(newOpts);
                                    }}
                                    className="h-11 rounded-xl border-2 flex-1"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Explanation</label>
                    <textarea 
                        value={explanation} 
                        onChange={(e) => setExplanation(e.target.value)}
                        className="w-full min-h-[120px] p-4 rounded-2xl bg-background border-2 text-sm leading-relaxed focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-12 rounded-2xl font-black gap-2 shadow-lg">
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </Button>
                    <Button variant="ghost" onClick={onEditToggle} className="h-12 px-6 rounded-2xl font-bold">
                        Cancel
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
