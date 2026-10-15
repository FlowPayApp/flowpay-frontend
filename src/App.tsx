import { useEffect, type ReactNode } from "react";
import LoadingIndicator from "./components/LoadingIndicator";
import { bootstrapAuth, useAuthReady } from "./lib/auth";
import AppRouter from "./router/AppRouter";

function AuthGate({ children }: { children: ReactNode }) {
  const ready = useAuthReady();
  useEffect(() => {
    void bootstrapAuth();
  }, []);
  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <LoadingIndicator />
      </div>
    );
  }
  return children;
}

/** Compatibilidad con enlaces antiguos /invoices */

export default function App() {
  return (
    <AuthGate>
      <div>
        <AppRouter />
      </div>
    </AuthGate>
  );
}
