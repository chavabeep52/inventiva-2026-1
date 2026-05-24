import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Vote, FolderPlus, BarChart3, Settings, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/inicio")({ component: InicioPage });

interface Stats {
  proyectos: number;
  votos: number;
  popular: number;
  profesor: number;
  jurado: number;
  d1: number; d2: number; d3: number;
  abierta: boolean;
  diaActivo?: string | null;
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("mt-2 font-display text-3xl font-bold", accent ?? "text-foreground")}>{value}</div>
      </CardContent>
    </Card>
  );
}

function InicioPage() {
  const { isAdmin, isOrganizer } = useAuth();
  const [s, setS] = useState<Stats>({
    proyectos: 0, votos: 0, popular: 0, profesor: 0, jurado: 0, d1: 0, d2: 0, d3: 0, abierta: true,
  });

  const load = async () => {
    const [{ count: pc }, { data: votos }, { data: cfg }, { data: days }] = await Promise.all([
      supabase.from("proyectos_publicos").select("id", { count: "exact", head: true }),
      supabase.from("votos_publicos").select("tipo_votante,event_day_id,estado").eq("estado", "valido"),
      supabase.from("configuracion").select("*").limit(1).maybeSingle(),
      supabase.from("event_days").select("id,orden").order("orden"),
    ]);
    const v = votos ?? [];
    const dayOf = (orden: number) => days?.find(d => d.orden === orden)?.id;
    setS({
      proyectos: pc ?? 0,
      votos: v.length,
      popular: v.filter(x => x.tipo_votante === "popular").length,
      profesor: v.filter(x => x.tipo_votante === "profesor").length,
      jurado: v.filter(x => x.tipo_votante === "jurado").length,
      d1: v.filter(x => x.event_day_id === dayOf(1)).length,
      d2: v.filter(x => x.event_day_id === dayOf(2)).length,
      d3: v.filter(x => x.event_day_id === dayOf(3)).length,
      abierta: cfg?.votacion_abierta ?? true,
      diaActivo: cfg?.dia_activo_id ?? null,
    });
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("inicio-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "proyectos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "configuracion" }, load)
      .subscribe();
    const interval = setInterval(load, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Panel principal</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
            Votaciones INVENTIVA EAFIT <span className="text-primary">2026-1</span>
          </h1>
          <p className="text-muted-foreground mt-1">Sistema de votación por mesa.</p>
        </div>
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border",
          s.abierta
            ? "bg-[oklch(0.95_0.06_155)] text-[oklch(0.35_0.13_155)] border-[oklch(0.78_0.13_155)]"
            : "bg-[oklch(0.95_0.06_27)] text-[oklch(0.40_0.18_27)] border-[oklch(0.80_0.15_27)]"
        )}>
          {s.abierta ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          Votación {s.abierta ? "abierta" : "cerrada"}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Proyectos inscritos" value={s.proyectos} accent="text-primary" />
        <StatCard label="Total de votos" value={s.votos} />
        <StatCard label="Votos populares" value={s.popular} />
        <StatCard label="Votos profesores" value={s.profesor} />
        <StatCard label="Votos empresas/jurado" value={s.jurado} />
        <StatCard label="Votos Día 1 · 27 may" value={s.d1} />
        <StatCard label="Votos Día 2 · 28 may" value={s.d2} />
        <StatCard label="Votos Día 3 · 29 may" value={s.d3} />
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild size="lg" className="h-auto py-5 justify-start">
            <Link to="/registrar-voto"><Vote className="h-5 w-5 mr-2" /> Registrar voto</Link>
          </Button>
          {isOrganizer && (
            <Button asChild size="lg" variant="secondary" className="h-auto py-5 justify-start">
              <Link to="/proyectos"><FolderPlus className="h-5 w-5 mr-2" /> Registrar proyecto</Link>
            </Button>
          )}
          <Button asChild size="lg" variant="secondary" className="h-auto py-5 justify-start">
            <Link to="/resultados"><BarChart3 className="h-5 w-5 mr-2" /> Ver resultados</Link>
          </Button>
          {isAdmin && (
            <Button asChild size="lg" variant="outline" className="h-auto py-5 justify-start">
              <Link to="/administracion"><Settings className="h-5 w-5 mr-2" /> Administración</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
