// web/src/lib/getFilePath.ts
import prisma from './prisma.js';

async function getFilePath() {
  const fileName = "Book of Greek Myths";
  try {
    const file = await prisma.file.findFirst({
      where: {
        OR: [
          { name: { contains: fileName } },
          { displayName: { contains: fileName } },
        ],
      },
      select: {
        localPath: true,
      },
    });

    if (file && file.localPath) {
      console.log(`Local Path for "${fileName}": ${file.localPath}`);
    } else {
      console.log(`File "${fileName}" not found or localPath is null.`);
    }
  } catch (error) {
    console.error("Error fetching file path:", error);
  } finally {
    await prisma.$disconnect();
  }
}

getFilePath();