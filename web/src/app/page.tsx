import prisma from "@/lib/prisma";
import ProfileClient from "./ProfileClient";

export default async function ProfileSelectPage() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <ProfileClient initialUsers={users} />
  );
}
