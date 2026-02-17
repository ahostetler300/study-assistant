import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SetEditor } from "./SetEditor";

export default async function EditStudySetPage({ params }: { params: { id: string } }) {
  const studySet = await prisma.studySet.findUnique({
    where: { id: params.id },
    include: {
      questions: true,
      category: true,
    },
  });

  if (!studySet) notFound();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <SetEditor 
      studySet={studySet} 
      categories={categories} 
    />
  );
}
