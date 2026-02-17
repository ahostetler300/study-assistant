"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "./UserContext";

/**
 * Robustly syncs the user context with the URL search parameters.
 * This ensures that if a user clicks a profile link before JS is fully hydrated,
 * the session is still captured once the dashboard loads.
 */
export function UserSync() {
  const searchParams = useSearchParams();
  const { user, setUser } = useUser();
  const userId = searchParams.get("userId");

  useEffect(() => {
    if (userId && (!user || user.id !== userId)) {
      // Fetch user details and sync context
      fetch(`/api/users`)
        .then(res => res.json())
        .then(users => {
          const found = users.find((u: any) => u.id === userId);
          if (found) {
            setUser(found);
          }
        })
        .catch(() => {});
    }
  }, [userId, user, setUser]);

  return null;
}
