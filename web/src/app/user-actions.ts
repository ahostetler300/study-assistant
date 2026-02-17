"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const focus = formData.get("focus") as string;

  if (!name) return { error: "Name is required" };

  try {
    const user = await prisma.user.create({
      data: { name, focus },
    });
    revalidatePath("/");
    return { success: true, user };
  } catch (error: unknown) {
    return { error: "Failed to create user" };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    return { error: "Failed to delete user" };
  }
}

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}
