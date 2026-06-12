import { NextRequest, NextResponse } from 'next/server';
import { prisma1, prisma2, prisma3, prisma4, prisma9, prisma10, prisma11, prisma12, prisma13 } from '@/lib/db';

export const revalidate = 300;

const ALL_PAYS = ['FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'FI', 'IE', 'GR', 'LU', 'SI', 'CY', 'MT', 'SK', 'EE', 'LV', 'LT', 'HR', 'BG'] as const;
const PAYS_SET = new Set<string>(ALL_PAYS);
const RJ_CLIENTS = [prisma3, prisma9, prisma10, prisma11, prisma12, prisma13];
const RH_CLIENTS = [prisma1, prisma2, prisma3, prisma4, prisma13];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'pays';

  // ── Évolution 90j : 21 pays, données ReleveJour uniquement ─────────────
  if (type === 'pays') {
    try {
      const paysIn = ALL_PAYS.map(p => `'${p}'`).join(',');

      const deviceRows = await prisma1.$queryRawUnsafe<Array<{ dispositif_id: number; pays_code: string }>>(
        `SELECT d.id as dispositif_id, p.code as pays_code
         FROM "Dispositif" d
         JOIN "Commune" c ON c.id = d."communeId"
         JOIN "Pays" p ON p.id = c."paysId"
         WHERE p.code IN (${paysIn})`
      );
      if (deviceRows.length === 0) return NextResponse.json({ data: [] });

      const deviceToPays = new Map<number, string>();
      for (const { dispositif_id, pays_code } of deviceRows) {
        deviceToPays.set(dispositif_id, pays_code);
      }
      const allIdsStr = deviceRows.map(r => r.dispositif_id).join(',');
      const since = new Date(Date.now() - 90 * 86400_000);

      // 6 requêtes parallèles (une par DB RJ)
      const results = await Promise.all(
        RJ_CLIENTS.map(client =>
          client.$queryRawUnsafe<Array<{ date: string; dispositif_id: number; sum_aqi: unknown; cnt: unknown }>>(
            `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date,
                    "dispositifId" as dispositif_id,
                    SUM("aqiMoy") as sum_aqi,
                    COUNT(*) as cnt
             FROM "ReleveJour"
             WHERE date >= $1
               AND "dispositifId" = ANY(ARRAY[${allIdsStr}]::int[])
             GROUP BY date, "dispositifId"`,
            since
          )
        )
      );

      const aggregated = new Map<string, { sum: number; cnt: number }>();
      for (const rows of results) {
        for (const row of rows) {
          const pays_code = deviceToPays.get(Number(row.dispositif_id));
          if (!pays_code) continue;
          const key = `${row.date}|${pays_code}`;
          const prev = aggregated.get(key) ?? { sum: 0, cnt: 0 };
          aggregated.set(key, {
            sum: prev.sum + Number(row.sum_aqi),
            cnt: prev.cnt + Number(row.cnt),
          });
        }
      }

      const data = Array.from(aggregated.entries())
        .map(([key, { sum, cnt }]) => {
          const [date, pays_code] = key.split('|');
          return { date, aqi_moy: Math.round((sum / cnt) * 10) / 10, pays_code };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ data: [] });
    }
  }

  // ── Comparaison ville : 30j de ReleveJour pour un dispositif ───────────
  if (type === 'ville') {
    const dispositifId = parseInt(searchParams.get('dispositif_id') ?? '0', 10);
    if (!dispositifId || dispositifId <= 0) return NextResponse.json({ data: [] });

    try {
      const since = new Date(Date.now() - 30 * 86400_000);

      // Le dispositif est dans exactement une des 6 DB RJ — on interroge toutes
      const results = await Promise.all(
        RJ_CLIENTS.map(client =>
          client.$queryRawUnsafe<Array<{ date: string; aqi_moy: unknown }>>(
            `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date,
                    AVG("aqiMoy") as aqi_moy
             FROM "ReleveJour"
             WHERE date >= $1
               AND "dispositifId" = $2
             GROUP BY date
             ORDER BY date ASC`,
            since,
            dispositifId
          )
        )
      );

      const byDate = new Map<string, number>();
      for (const rows of results) {
        for (const r of rows) {
          byDate.set(r.date.slice(0, 10), Math.round(Number(r.aqi_moy)));
        }
      }

      const data = Array.from(byDate.entries())
        .map(([date, aqi_moy]) => ({ date, aqi_moy }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ data: [] });
    }
  }

  // ── Heatmap 7j × 24h : données ReleveHeure réelles ────────────────────
  if (type === 'heatmap') {
    const rawPays = searchParams.get('pays') ?? 'FR';
    const pays = PAYS_SET.has(rawPays) ? rawPays : 'FR';

    try {
      const deviceRows = await prisma1.$queryRawUnsafe<Array<{ dispositif_id: number }>>(
        `SELECT d.id as dispositif_id
         FROM "Dispositif" d
         JOIN "Commune" c ON c.id = d."communeId"
         JOIN "Pays" p ON p.id = c."paysId"
         WHERE p.code = '${pays}'`
      );
      if (deviceRows.length === 0) return NextResponse.json({ data: [] });
      const idsStr = deviceRows.map(r => r.dispositif_id).join(',');

      // SUM + COUNT pour permettre la fusion correcte des 5 DB RH
      const results = await Promise.all(
        RH_CLIENTS.map(client =>
          client.$queryRawUnsafe<Array<{ date: string; hour: number; sum_aqi: unknown; cnt: unknown }>>(
            `SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
                    EXTRACT(HOUR FROM timestamp)::int as hour,
                    SUM(aqi)::bigint as sum_aqi,
                    COUNT(*) as cnt
             FROM "ReleveHeure"
             WHERE timestamp >= NOW() - INTERVAL '7 days'
               AND "dispositifId" = ANY(ARRAY[${idsStr}]::int[])
             GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD'), EXTRACT(HOUR FROM timestamp)::int
             ORDER BY 1, 2`
          )
        )
      );

      const merged = new Map<string, { sum: number; cnt: number }>();
      for (const rows of results) {
        for (const r of rows) {
          const key = `${r.date}|${r.hour}`;
          const prev = merged.get(key) ?? { sum: 0, cnt: 0 };
          merged.set(key, {
            sum: prev.sum + Number(r.sum_aqi),
            cnt: prev.cnt + Number(r.cnt),
          });
        }
      }

      const data = Array.from(merged.entries())
        .map(([key, { sum, cnt }]) => {
          const [date, hourStr] = key.split('|');
          return { date, hour: parseInt(hourStr, 10), aqi_moy: Math.round(sum / cnt) };
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);

      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ data: [] });
    }
  }

  return NextResponse.json({ data: [] });
}
