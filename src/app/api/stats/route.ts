import { NextResponse } from 'next/server';
import { prisma1, prisma2, prisma3, prisma4, prisma13 } from '@/lib/db';

export const revalidate = 60;

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - 3600_000);

    const [
      totalDispositifs,
      actifsCount,
      totalPays,
      alerts1,
      alerts2,
      alerts3,
      alerts4,
      alerts13,
      last1,
      last2,
      last3,
      last4,
      last13,
    ] = await Promise.all([
      prisma1.dispositif.count(),
      prisma1.dispositif.count({ where: { actif: true } }),
      prisma1.pays.count(),
      prisma1.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma2.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma3.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma4.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma13.releveHeure.count({ where: { aqi: { gt: 150 }, timestamp: { gte: cutoff } } }),
      prisma1.releveHeure.findFirst({ orderBy: { timestamp: 'desc' } }),
      prisma2.releveHeure.findFirst({ orderBy: { timestamp: 'desc' } }),
      prisma3.releveHeure.findFirst({ orderBy: { timestamp: 'desc' } }),
      prisma4.releveHeure.findFirst({ orderBy: { timestamp: 'desc' } }),
      prisma13.releveHeure.findFirst({ orderBy: { timestamp: 'desc' } }),
    ]);

    const alertesCount = alerts1 + alerts2 + alerts3 + alerts4 + alerts13;

    const candidates = [last1, last2, last3, last4, last13].filter(Boolean);
    const dernierReleve = candidates.reduce<(typeof last1) | null>((best, cur) => {
      if (!best) return cur;
      if (!cur) return best;
      return cur.timestamp >= best.timestamp ? cur : best;
    }, null);

    const now = new Date();
    const startHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const elapsed = (now.getTime() - startHour.getTime()) / 1000;
    const sigfoxCount = Math.floor(elapsed * (actifsCount / 3600));

    return NextResponse.json({
      totalDispositifs,
      actifsCount,
      totalPays,
      alertesCount,
      sigfoxCount,
      relevesParheure: actifsCount,
      dernierReleve: dernierReleve?.timestamp ?? null,
    });
  } catch {
    return NextResponse.json({
      totalDispositifs: 0,
      actifsCount: 0,
      totalPays: 0,
      alertesCount: 0,
      sigfoxCount: 0,
      relevesParheure: 0,
      dernierReleve: null,
    });
  }
}
