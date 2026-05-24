import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/inicio" : "/login", replace: true });
  }, [user, loading, navigate]);
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-muted-foreground text-sm">Cargando…</div>
    </div>
  );
}
