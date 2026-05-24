import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({ component: ProtectedLayout });

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return <AppLayout />;
}
