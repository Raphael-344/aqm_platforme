import { NextResponse } from 'next/server';
import { prisma1, prisma2, prisma3, prisma4, prisma13 } from '@/lib/db';

export const dynamic = 'force-dynamic';

type DeviceMeta = {
  dispositif_id: number;
  code: string;
  commune_nom: string;
  pays_code: string;
  pays_nom: string;
  drapeau: string;
  lat: number;
  lng: number;
};

type ReleveRow = {
  dispositif_id: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  timestamp: Date;
};

const LATEST_RH_SQL = `
  SELECT DISTINCT ON ("dispositifId")
    "dispositifId" as dispositif_id, aqi, pm25, pm10, no2, timestamp
  FROM "ReleveHeure"
  ORDER BY "dispositifId", timestamp DESC
`;

export async function GET() {
  try {
    // Fetch device metadata and all RH databases in parallel
    const [devices, rh1, rh2, rh3, rh4, rh13] = await Promise.all([
      prisma1.$queryRaw<DeviceMeta[]>`
        SELECT
          d.id   AS dispositif_id,
          d.code,
          c.nom  AS commune_nom,
          p.code AS pays_code,
          p.nom  AS pays_nom,
          p.drapeau,
          c.lat,
          c.lng
        FROM "Dispositif" d
        JOIN "Commune" c ON c.id = d."communeId"
        JOIN "Pays"    p ON p.id = c."paysId"
        WHERE d.actif = true
      `,
      prisma1.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
      prisma2.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
      prisma3.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
      prisma4.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
      prisma13.$queryRawUnsafe<ReleveRow[]>(LATEST_RH_SQL),
    ]);

    // Merge all RH sources: keep the most recent reading per device
    const bestRH = new Map<number, ReleveRow>();
    for (const rows of [rh1, rh2, rh3, rh4, rh13]) {
      for (const r of rows) {
        const prev = bestRH.get(r.dispositif_id);
        if (!prev || new Date(r.timestamp) > new Date(prev.timestamp)) {
          bestRH.set(r.dispositif_id, r);
        }
      }
    }

    // Join metadata with best reading; skip devices with no reading at all
    const points = devices
      .map((d) => {
        const rh = bestRH.get(d.dispositif_id);
        if (!rh) return null;
        return { ...d, aqi: rh.aqi, pm25: rh.pm25, pm10: rh.pm10, no2: rh.no2, timestamp: rh.timestamp };
      })
      .filter(Boolean);

    return NextResponse.json({ points });
  } catch {
    const points = Array.from({ length: 500 }, (_, i) => ({
      dispositif_id: i + 1,
      code: `AQM-SIM-${String(i + 1).padStart(5, '0')}`,
      commune_nom: `Ville ${i + 1}`,
      pays_code: ['FR', 'DE', 'IT', 'ES', 'PL', 'BE', 'NL', 'PT'][i % 8],
      pays_nom: ['France', 'Allemagne', 'Italie', 'Espagne', 'Pologne', 'Belgique', 'Pays-Bas', 'Portugal'][i % 8],
      drapeau: ['🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇵🇱', '🇧🇪', '🇳🇱', '🇵🇹'][i % 8],
      lat: 40 + Math.random() * 20,
      lng: -10 + Math.random() * 35,
      aqi: Math.floor(20 + Math.random() * 200),
      pm25: Math.random() * 50,
      pm10: Math.random() * 80,
      no2: Math.random() * 100,
      timestamp: new Date().toISOString(),
    }));
    return NextResponse.json({ points });
  }
}
