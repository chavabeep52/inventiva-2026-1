// Weighted scoring for INVENTIVA 2026-1
// popular: 45%, profesor: 15%, jurado: 40%

export const WEIGHTS = { popular: 0.45, profesor: 0.15, jurado: 0.40 } as const;

export type TipoVotante = "popular" | "profesor" | "jurado";

export interface VotoLite {
  proyecto_id: string;
  pregrado_id: string;
  event_day_id: string;
  tipo_votante: TipoVotante;
  estado: "valido" | "anulado";
}

export interface ProyectoScore {
  proyecto_id: string;
  pregrado_id: string;
  event_day_id: string;
  votos_popular: number;
  votos_profesor: number;
  votos_jurado: number;
  total_votos: number;
  pct_popular: number;
  pct_profesor: number;
  pct_jurado: number;
  puntaje_popular: number;
  puntaje_profesor: number;
  puntaje_jurado: number;
  puntaje_final: number;
}

interface ComputeOpts {
  // optional filters
  dayId?: string | null;
  pregradoId?: string | null;
  tipo?: TipoVotante | null;
}

/**
 * Compute weighted scores per project, scoped by (pregrado, day).
 * Percentages are computed against the total votes of that voter type WITHIN
 * the same pregrado + day group.
 */
export function computeScores(
  votos: VotoLite[],
  proyectos: { id: string; pregrado_id: string; event_day_id: string }[],
  opts: ComputeOpts = {}
): ProyectoScore[] {
  const validVotes = votos.filter(v => v.estado === "valido");

  const filtered = validVotes.filter(v => {
    if (opts.dayId && v.event_day_id !== opts.dayId) return false;
    if (opts.pregradoId && v.pregrado_id !== opts.pregradoId) return false;
    return true;
  });

  // group totals per (pregrado_id, event_day_id, tipo)
  const groupTotals = new Map<string, { popular: number; profesor: number; jurado: number }>();
  const key = (preg: string, day: string) => `${preg}::${day}`;
  for (const v of filtered) {
    const k = key(v.pregrado_id, v.event_day_id);
    if (!groupTotals.has(k)) groupTotals.set(k, { popular: 0, profesor: 0, jurado: 0 });
    groupTotals.get(k)![v.tipo_votante]++;
  }

  // per-project counts
  const perProj = new Map<string, { popular: number; profesor: number; jurado: number }>();
  for (const v of filtered) {
    if (!perProj.has(v.proyecto_id)) perProj.set(v.proyecto_id, { popular: 0, profesor: 0, jurado: 0 });
    perProj.get(v.proyecto_id)![v.tipo_votante]++;
  }

  const results: ProyectoScore[] = [];
  for (const p of proyectos) {
    if (opts.dayId && p.event_day_id !== opts.dayId) continue;
    if (opts.pregradoId && p.pregrado_id !== opts.pregradoId) continue;
    const counts = perProj.get(p.id) ?? { popular: 0, profesor: 0, jurado: 0 };
    const totals = groupTotals.get(key(p.pregrado_id, p.event_day_id)) ?? { popular: 0, profesor: 0, jurado: 0 };

    const pct = (n: number, t: number) => (t > 0 ? (n / t) * 100 : 0);
    const pct_popular = pct(counts.popular, totals.popular);
    const pct_profesor = pct(counts.profesor, totals.profesor);
    const pct_jurado = pct(counts.jurado, totals.jurado);

    const puntaje_popular = pct_popular * WEIGHTS.popular;
    const puntaje_profesor = pct_profesor * WEIGHTS.profesor;
    const puntaje_jurado = pct_jurado * WEIGHTS.jurado;
    const puntaje_final = puntaje_popular + puntaje_profesor + puntaje_jurado;

    results.push({
      proyecto_id: p.id,
      pregrado_id: p.pregrado_id,
      event_day_id: p.event_day_id,
      votos_popular: counts.popular,
      votos_profesor: counts.profesor,
      votos_jurado: counts.jurado,
      total_votos: counts.popular + counts.profesor + counts.jurado,
      pct_popular, pct_profesor, pct_jurado,
      puntaje_popular, puntaje_profesor, puntaje_jurado,
      puntaje_final,
    });
  }
  return results;
}

export const TIPO_LABEL: Record<TipoVotante, string> = {
  popular: "Estudiante / familiar / visitante",
  profesor: "Profesor",
  jurado: "Empresa / jurado",
};
