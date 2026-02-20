// web/src/lib/checkCategory.ts
import prisma from './prisma';

async function checkCategory() {
  const categoryId = "cmlr4zqk5006ni04io5w9wtcx";
  try {
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (category) {
      console.log(`Category with ID "${categoryId}" exists: ${category.name}`);
    } else {
      console.log(`Category with ID "${categoryId}" DOES NOT EXIST.`);
    }
  } catch (error) {
    console.error("Error checking category:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategory();