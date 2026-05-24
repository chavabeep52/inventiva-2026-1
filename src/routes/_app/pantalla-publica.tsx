import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { computeScores, type VotoLite } from "@/lib/scoring";
import { Trophy, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_app/pantalla-publica")({ component: PantallaPublica });

function PantallaPublica() {
  const [votos, setVotos] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [pregrados, setPregrados] = useState<{ id: string; nombre: string }[]>([]);
  const [days, setDays] = useState<{ id: string; nombre: string; orden: number }[]>([]);
  const [cfg, setCfg] = useState<any>(null);
  const [filterDay, setFilterDay] = useState<string>("all");
  const [updated, setUpdated] = useState(new Date());

  const load = async () => {
    const [v, p, pr, ds, c] = await Promise.all([
      supabase.from("votos").select("*"),
      supabase.from("proyectos").select("*"),
      supabase.from("pregrados").select("id,nombre").order("nombre"),
      supabase.from("event_days").select("id,nombre,orden").order("orden"),
      supabase.from("configuracion").select("*").limit(1).maybeSingle(),
    ]);
    setVotos(v.data ?? []); setProyectos(p.data ?? []); setPregrados(pr.data ?? []);
    setDays(ds.data ?? []); setCfg(c.data); setUpdated(new Date());
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("pub-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "votos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "configuracion" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const dayId = filterDay === "all" ? null : filterDay;

  const scoresAll = useMemo(() =>
    computeScores(
      votos as VotoLite[],
      proyectos.map(p => ({ id: p.id, pregrado_id: p.pregrado_id, event_day_id: p.event_day_id })),
      { dayId }
    ), [votos, proyectos, dayId]);

  const totalVotos = votos.filter(v => v.estado === "valido" && (!dayId || v.event_day_id === dayId)).length;
  const projName = (id: string) => proyectos.find(p => p.id === id)?.nombre ?? "";
  const pregName = (id: string) => pregrados.find(p => p.id === id)?.nombre ?? "";

  // Podiums grouped by pregrado
  const grouped = useMemo(() => {
    const map = new Map<string, typeof scoresAll>();
    for (const s of scoresAll) {
      if (!map.has(s.pregrado_id)) map.set(s.pregrado_id, []);
      map.get(s.pregrado_id)!.push(s);
    }
    return Array.from(map.entries()).map(([pregId, arr]) => ({
      pregId, arr: arr.sort((a, b) => b.puntaje_final - a.puntaje_final).slice(0, 3),
    }));
  }, [scoresAll]);

  const overallTop = [...scoresAll].sort((a, b) => b.puntaje_final - a.puntaje_final).slice(0, 10);

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <Logo size="lg" />
        <div className="flex items-center gap-3">
          {cfg && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${cfg.votacion_abierta ? "bg-[oklch(0.95_0.06_155)] text-[oklch(0.35_0.13_155)] border-[oklch(0.78_0.13_155)]" : "bg-[oklch(0.95_0.06_27)] text-[oklch(0.40_0.18_27)] border-[oklch(0.80_0.15_27)]"}`}>
              {cfg.votacion_abierta ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {cfg.votacion_abierta ? "Abierta" : "Cerrada"}
            </div>
          )}
          <Select value={filterDay} onValueChange={setFilterDay}>
            <SelectTrigger className="min-w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los días</SelectItem>
              {days.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="text-center py-6 bg-gradient-to-br from-[var(--brand-royal)] to-[var(--brand-purple)] text-[color:var(--background)] rounded-2xl shadow-[var(--shadow-elevated)]">
        <h1 className="font-display text-4xl sm:text-5xl font-bold">Resultados en vivo INVENTIVA EAFIT 2026-1</h1>
        <div className="mt-3 text-lg opacity-90">Total de votos: <strong>{totalVotos}</strong></div>
        <div className="text-xs opacity-70 mt-2">Actualizado {updated.toLocaleTimeString("es-CO")}</div>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        {grouped.map(({ pregId, arr }) => (
          <Card key={pregId} className="shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-[var(--brand-yellow)]" />
                <h3 className="font-display text-lg font-bold">{pregName(pregId)}</h3>
              </div>
              <ol className="space-y-2">
                {arr.map((s, i) => (
                  <li key={s.proyecto_id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${i === 0 ? "bg-[var(--brand-yellow)]/30" : "bg-muted"}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-xl text-primary w-6">{i + 1}°</span>
                      <span className="font-medium">{projName(s.proyecto_id)}</span>
                    </div>
                    <span className="font-bold text-primary">{s.puntaje_final.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-display text-lg font-bold mb-3">Ranking general</h3>
          <ol className="space-y-1.5">
            {overallTop.map((s, i) => (
              <li key={s.proyecto_id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-none">
                <span><strong className="text-primary mr-3">{i + 1}.</strong> {projName(s.proyecto_id)} <span className="text-xs text-muted-foreground ml-2">{pregName(s.pregrado_id)}</span></span>
                <strong>{s.puntaje_final.toFixed(2)}</strong>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
