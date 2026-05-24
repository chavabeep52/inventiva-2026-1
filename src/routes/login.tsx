import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/inicio", replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Sesión iniciada");
        navigate({ to: "/inicio", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/inicio`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Ya puedes iniciar sesión.");
        setMode("login");
      }
    } catch (err: any) {
      toast.error(err.message ?? "No fue posible procesar la solicitud");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Branding panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,var(--brand-sky),transparent_55%),radial-gradient(circle_at_80%_70%,var(--brand-purple),transparent_50%)]" />
        <div className="relative">
          <Logo variant="dark" size="lg" />
        </div>
        <div className="relative space-y-5 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Votaciones INVENTIVA EAFIT <span className="text-[var(--brand-yellow)]">2026-1</span>
          </h1>
          <p className="text-sidebar-foreground/80 text-base">
            Sistema interno de votación por mesa. Diseñado para operación simultánea
            de múltiples mesas durante los 3 días del evento.
          </p>
          <ul className="text-sm space-y-1.5 text-sidebar-foreground/70">
            <li>· Registro rápido de votos por operador</li>
            <li>· Resultados ponderados en tiempo real</li>
            <li>· Exportación de actas y reportes</li>
          </ul>
        </div>
        <div className="relative text-xs opacity-70">Universidad EAFIT · Feria de proyectos de ingeniería</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md border-border/60 shadow-[var(--shadow-elevated)]">
          <CardContent className="p-8">
            <div className="lg:hidden mb-6"><Logo size="md" /></div>
            <h2 className="font-display text-2xl font-bold">
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Acceso para operadores, organizadores y administradores."
                : "Las cuentas nuevas reciben el rol Operador. Un administrador puede elevar el rol."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Button>
            </form>

            <button type="button" onClick={() => setMode(m => m === "login" ? "signup" : "login")}
              className="block mt-4 text-sm text-primary hover:underline mx-auto">
              {mode === "login" ? "¿Operador nuevo? Crear cuenta" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
