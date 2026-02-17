import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import QuizView from "./QuizView";

export default async function QuizPage(props: { 
  params: { id: string } 
}) {
  const { id } = props.params;
  const quizSet = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: true,
    },
  });

  if (!quizSet) notFound();

  // Randomize questions each time the quiz is loaded/retaken
  const shuffledQuestions = [...quizSet.questions].sort(() => 0.5 - Math.random());

  return (
    <QuizView 
        quizId={quizSet.id}
        title={quizSet.title || "Study Quiz"}
        questions={shuffledQuestions}
    />
  );
}
