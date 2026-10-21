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

    if (!commune?.dispositif) {
      return NextResponse.json({ error: `Aucun capteur trouvé pour « ${ville} ».` }, { status: 404 });
    }

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

    if (historique.length === 0) {
      return NextResponse.json({ error: `Aucun relevé horaire pour ${commune.nom}.` }, { status: 404 });
    }

    // Prévision heuristique (profil horaire) sur les 24 h qui suivent le dernier relevé disponible
    const dernier = historique[historique.length - 1];
    const lastAqi = dernier.aqi;
    const prediction = Array.from({ length: 24 }, (_, i) => {
      const t = new Date(dernier.timestamp.getTime() + (i + 1) * 3600000);
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
  } catch (err) {
    console.error('Erreur /api/ia/prediction :', err);
    return NextResponse.json(
      { error: 'Prédiction indisponible : la base de données ne répond pas.' },
      { status: 503 }
    );
  }
}
