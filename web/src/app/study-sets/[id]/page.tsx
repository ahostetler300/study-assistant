import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SetEditor } from "../[id]/edit/SetEditor"; // Import SetEditor from the correct path

export default async function StudySetDetailsPage({ params }: { params: { id: string } }) {
  const studySet = await prisma.studySet.findUnique({
    where: { id: params.id },
    include: {
      questions: true,
      category: true,
      files: true, // Include files for display
    },
  });

  if (!studySet) notFound();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <SetEditor 
      studySet={{
        ...studySet,
        instructions: studySet.instructions || "",
        difficultyLevel: studySet.difficultyLevel || "Medium",
        specificChaptersSections: studySet.specificChaptersSections || "",
        geminiInputTokens: studySet.geminiInputTokens || null,
        geminiOutputTokens: studySet.geminiOutputTokens || null,
        geminiCached: studySet.geminiCached || false,
        geminiCacheHit: studySet.geminiCacheHit || false,
        geminiCachedTokens: studySet.geminiCachedTokens || null, // Pass geminiCachedTokens
      }} 
      categories={categories}
      isEditing={false} // Pass isEditing as false for the detail view
    />
  );
}
