import { NextResponse } from 'next/server';
import { prisma1, prisma2, prisma3, prisma4, prisma9, prisma10, prisma11, prisma12, prisma13 } from '@/lib/db';
import { dernierReleveJour } from '@/lib/reference';

export const revalidate = 30;

type DeviceMeta = {
  dispositif_id: number;
  code: string;
  commune_nom: string;
  pays_nom: string;
  pays_code: string;
  drapeau: string;
  lat: number;
  lng: number;
};

type ReleveRow = {
  dispositif_id: number;
  aqi: number;
  pm25: number;
  no2: number;
  timestamp: Date;
};

type HistoriqueRow = {
  date: string;
  nb_alertes: bigint;
};

const LATEST_RH_SQL = `
  SELECT DISTINCT ON ("dispositifId")
    "dispositifId" as dispositif_id, aqi, pm25, no2, timestamp
  FROM "ReleveHeure"
  ORDER BY "dispositifId", timestamp DESC
`;

// 29 jours précédant le dernier jour de données (ReleveJour)
const HISTORIQUE_RJ_SQL = `
  SELECT
    date::text AS date,
    COUNT(*) AS nb_alertes
  FROM "ReleveJour"
  WHERE date >= $1::date - INTERVAL '29 days'
    AND date < $1::date
    AND "aqiMax" > 150
  GROUP BY date
  ORDER BY date ASC
`;

// 30 jours se terminant au dernier jour de données ; le dernier jour = alertes en cours (ReleveHeure)
function buildHistorique(dateMap: Map<string, number>, todayCount: number, dernierJour: Date) {
  const todayDate = new Date(dernierJour);
  todayDate.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(todayDate.getTime() - (29 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const isToday = i === 29;
    return {
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      count: isToday ? todayCount : (dateMap.get(key) ?? 0),
      isToday,
    };
  });
}

export async function GET() {
  try {
    // Dernier relevé de chaque capteur (ReleveHeure) et historique 29 jours (ReleveJour) en parallèle
    const dernierJour = await dernierReleveJour();
    const [rhResults, rjResults] = await Promise.all([
      Promise.all([
        prisma1.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
        prisma2.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
        prisma3.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
        prisma4.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
        prisma13.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
      ]),
      Promise.all([
        prisma3.$queryRawUnsafe<HistoriqueRow[]>(HISTORIQUE_RJ_SQL, dernierJour),
        prisma9.$queryRawUnsafe<HistoriqueRow[]>(HISTORIQUE_RJ_SQL, dernierJour),
        prisma10.$queryRawUnsafe<HistoriqueRow[]>(HISTORIQUE_RJ_SQL, dernierJour),
        prisma11.$queryRawUnsafe<HistoriqueRow[]>(HISTORIQUE_RJ_SQL, dernierJour),
        prisma12.$queryRawUnsafe<HistoriqueRow[]>(HISTORIQUE_RJ_SQL, dernierJour),
        prisma13.$queryRawUnsafe<HistoriqueRow[]>(HISTORIQUE_RJ_SQL, dernierJour),
      ]),
    ]);

    // --- Alertes (ReleveHeure) ---
    const bestMap = new Map<number, ReleveRow>();
    for (const rows of rhResults) {
      for (const r of rows) {
        const prev = bestMap.get(r.dispositif_id);
        if (!prev || new Date(r.timestamp) > new Date(prev.timestamp)) {
          bestMap.set(r.dispositif_id, r);
        }
      }
    }
    const top = Array.from(bestMap.values())
      .filter((r) => r.aqi > 150)
      .sort((a, b) => b.aqi - a.aqi);

    // --- Historique (ReleveJour) ---
    const dateMap = new Map<string, number>();
    for (const rows of rjResults) {
      for (const r of rows) {
        const key = r.date.slice(0, 10);
        dateMap.set(key, (dateMap.get(key) ?? 0) + Number(r.nb_alertes));
      }
    }
    // Dernier jour = alertes en cours d'après le dernier relevé de chaque capteur
    const historique = buildHistorique(dateMap, top.length, dernierJour);

    if (top.length === 0) return NextResponse.json({ alertes: [], historique });

    // Métadonnées des capteurs en alerte
    const idsStr = top.map((r) => r.dispositif_id).join(',');
    const devices = await prisma1.$queryRawUnsafe<DeviceMeta[]>(`
      SELECT
        d.id as dispositif_id,
        d.code,
        c.nom as commune_nom,
        p.nom as pays_nom,
        p.code as pays_code,
        p.drapeau,
        c.lat,
        c.lng
      FROM "Dispositif" d
      JOIN "Commune" c ON c.id = d."communeId"
      JOIN "Pays" p ON p.id = c."paysId"
      WHERE d.id = ANY(ARRAY[${idsStr}]::int[])
    `);

    const metaMap = new Map<number, DeviceMeta>();
    for (const d of devices) metaMap.set(d.dispositif_id, d);

    const alertes = top
      .map((r) => {
        const meta = metaMap.get(r.dispositif_id);
        if (!meta) return null;
        return { ...meta, aqi: r.aqi, pm25: r.pm25, no2: r.no2, timestamp: r.timestamp };
      })
      .filter(Boolean);

    return NextResponse.json({ alertes, historique });
  } catch (err) {
    console.error('Erreur /api/alertes :', err);
    return NextResponse.json(
      { error: "Données d'alertes indisponibles : la base de données ne répond pas." },
      { status: 503 }
    );
  }
}
