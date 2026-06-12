import { NextRequest, NextResponse } from 'next/server';
import { prisma1, prisma2 } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { ville } = await req.json();

  try {
    // Commune + Dispositif depuis prisma1
    const commune = await prisma1.commune.findFirst({
      where: { nom: { contains: ville, mode: 'insensitive' } },
      include: { pays: true, dispositif: true },
    });

    if (!commune?.dispositif) throw new Error('Not found');

    const dispositifId = commune.dispositif.id;

    // ReleveHeure (48h) → fusionner prisma1 + prisma2, garder les 48 plus récents
    const [rh1, rh2] = await Promise.all([
      prisma1.releveHeure.findMany({
        where: { dispositifId },
        orderBy: { timestamp: 'desc' },
        take: 48,
      }),
      prisma2.releveHeure.findMany({
        where: { dispositifId },
        orderBy: { timestamp: 'desc' },
        take: 48,
      }),
    ]);
    const relevesHeure = [...rh1, ...rh2]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 48);

    const historique = relevesHeure.reverse().map((r) => ({
      timestamp: r.timestamp,
      aqi: r.aqi,
    }));

    const lastAqi = historique[historique.length - 1]?.aqi ?? 50;
    const prediction = Array.from({ length: 24 }, (_, i) => {
      const t = new Date(Date.now() + (i + 1) * 3600000);
      const hour = t.getHours();
      const peak = hour === 8 || hour === 18 ? 1.2 : hour >= 1 && hour <= 5 ? 0.7 : 1.0;
      const noise = (Math.random() - 0.5) * 8;
      return {
        timestamp: t.toISOString(),
        aqi: Math.max(5, Math.round(lastAqi * peak + noise)),
        predicted: true,
      };
    });

    return NextResponse.json({
      commune: commune.nom,
      pays: commune.pays.nom,
      historique,
      prediction,
    });
  } catch {
    const lastAqi = 45 + Math.random() * 30;
    const historique = Array.from({ length: 48 }, (_, i) => {
      const t = new Date(Date.now() - (48 - i) * 3600000);
      const hour = t.getHours();
      const peak = hour === 8 || hour === 18 ? 1.3 : hour <= 4 ? 0.65 : 1.0;
      return {
        timestamp: t.toISOString(),
        aqi: Math.max(5, Math.round(lastAqi * peak + (Math.random() - 0.5) * 10)),
        predicted: false,
      };
    });
    const prediction = Array.from({ length: 24 }, (_, i) => {
      const t = new Date(Date.now() + (i + 1) * 3600000);
      const hour = t.getHours();
      const peak = hour === 8 || hour === 18 ? 1.2 : hour <= 4 ? 0.7 : 1.0;
      return {
        timestamp: t.toISOString(),
        aqi: Math.max(5, Math.round(lastAqi * peak + (Math.random() - 0.5) * 8)),
        predicted: true,
      };
    });

    return NextResponse.json({
      commune: ville || 'Simulation',
      pays: 'Europe',
      historique,
      prediction,
    });
  }
}
