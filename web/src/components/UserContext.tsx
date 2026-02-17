"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

interface User {
  id: string;
  name: string;
  focus: string | null;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("study-user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const value = useMemo(() => ({
    user,
    setUser: (u: User | null) => {
      setUser(u);
      if (u) localStorage.setItem("study-user", JSON.stringify(u));
      else localStorage.removeItem("study-user");
    },
  }), [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

const fallbackUserContext: UserContextType = { user: null, setUser: () => {} };

export function useUser() {
  const context = useContext(UserContext);
  if (context === null) {
    return fallbackUserContext;
  }
  return context;
}
