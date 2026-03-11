"use client";

import { SWRConfig } from "swr";
import { AuthProvider } from "@/components/providers/auth-provider";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </SWRConfig>
  );
}
