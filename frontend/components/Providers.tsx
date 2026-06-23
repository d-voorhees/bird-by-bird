"use client";

import { ApolloProvider } from "@apollo/client/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ThemeProvider } from "@/components/ThemeProvider";
import { getApolloClient, REQUEST_TIMEOUT_MS } from "@/lib/apollo-client";
import { ME_QUERY, SIGN_OUT_MUTATION } from "@/lib/graphql/operations";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getApolloClient(), []);

  return (
    <ApolloProvider client={client}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getApolloClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const result = await Promise.race([
        client.query<{ me: User | null }>({
          query: ME_QUERY,
          fetchPolicy: "network-only",
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Auth request timed out")), REQUEST_TIMEOUT_MS);
        }),
      ]);
      setUser(result.data?.me ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    // Hydrate quickly from Apollo cache when available, then verify in background.
    try {
      const cached = client.readQuery<{ me: User | null }>({ query: ME_QUERY });
      if (cached) {
        setUser(cached.me ?? null);
        setLoading(false);
      }
    } catch {
      // Cache miss is expected on first load.
    }
    void refreshUser();
  }, [client, refreshUser]);

  const signOut = useCallback(async () => {
    await client.mutate({ mutation: SIGN_OUT_MUTATION });
    setUser(null);
  }, [client]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, signOut }),
    [user, loading, refreshUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within Providers");
  }
  return context;
}
