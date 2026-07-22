"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  title: string;
  role: string;
};

// Simple singleton-like cache of users to share across the app
// using a basic module-level cache and a hook.
let cached: User[] | null = null;
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((l) => l());
}

async function loadUsers(): Promise<User[]> {
  if (cached) return cached;
  try {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    cached = data.users || [];
    emit();
    return cached!;
  } catch {
    return [];
  }
}

export function useUsers(): User[] {
  const [users, setUsers] = useState<User[]>(cached || []);
  useEffect(() => {
    let mounted = true;
    const listener = () => {
      if (mounted && cached) setUsers([...cached]);
    };
    listeners.push(listener);
    loadUsers();
    return () => {
      mounted = false;
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);
  return users;
}

export function refreshUsers() {
  cached = null;
  loadUsers();
}
