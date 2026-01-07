// frontend/components/Providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/context/AuthContext";
import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Clear React Query cache on auth user changes to prevent stale cross-user data */}
      <AuthProvider>
        {children}
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      {/* Subscribe to auth and clear cache when user changes or logs out */}
      <AuthCacheBoundary queryClient={queryClient} />
    </QueryClientProvider>
  );
}

function AuthCacheBoundary({ queryClient }: { queryClient: QueryClient }) {
  const [previousUid, setPreviousUid] = useState<string | null>(null);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const currentUid = user?.uid ?? null;
      
      // Clear cache only when user changes (not on initial load)
      if (previousUid !== currentUid && previousUid !== null) {
        console.log("[AuthCache] User changed, clearing cache", { from: previousUid, to: currentUid });
        queryClient.clear();
      }
      
      setPreviousUid(currentUid);
    });
    return () => unsub();
  }, [queryClient, previousUid]);
  
  return null;
}

