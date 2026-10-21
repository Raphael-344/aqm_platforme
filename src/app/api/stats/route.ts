import { NextResponse } from 'next/server';
import { prisma1, prisma2, prisma3, prisma4, prisma13 } from '@/lib/db';
import { dernierReleveHeure } from '@/lib/reference';

export const revalidate = 60;

export async function GET() {
  try {
    // Alertes = relevés AQI > 150 dans la dernière heure de données (jeu simulé figé)
    const dernierReleve = await dernierReleveHeure();
    const cutoff = new Date(dernierReleve.getTime() - 3600_000);

    const [
      totalDispositifs,
      actifsCount,
      totalPays,
      alerts1,
      alerts2,
      alerts3,
      alerts4,
      alerts13,
    ] = await Promise.all([
      prisma1.dispositif.count(),
      prisma1.dispositif.count({ where: { actif: true } }),
      prisma1.pays.count(),
      prisma1.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma2.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma3.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma4.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma13.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
    ]);

    const alertesCount = alerts1 + alerts2 + alerts3 + alerts4 + alerts13;

    return NextResponse.json({
      totalDispositifs,
      actifsCount,
      totalPays,
      alertesCount,
      relevesParheure: actifsCount,
      dernierReleve,
    });
  } catch (err) {
    console.error('Erreur /api/stats :', err);
    return NextResponse.json(
      { error: 'Statistiques indisponibles : la base de données ne répond pas.' },
      { status: 503 }
    );
  }
}
