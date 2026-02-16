"use client";

import { AuthProvider } from "@/components/providers/auth-provider";

export default function Template({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
