import { NextRequest, NextResponse } from 'next/server';
import { prisma1, prisma2, prisma3, prisma4, prisma9, prisma10, prisma11, prisma12, prisma13 } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const commune = await prisma1.commune.findUnique({
      where: { id },
      include: { pays: true, dispositif: true },
    });

    if (!commune) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!commune.dispositif) return NextResponse.json(commune);

    const dispositifId = commune.dispositif.id;

    // ReleveHeure: all 5 RH databases in parallel (DB1+2+3+4+13)
    const [rh1, rh2, rh3, rh4, rh13] = await Promise.all([
      prisma1.releveHeure.findMany({ where: { dispositifId }, orderBy: { timestamp: 'desc' }, take: 168 }),
      prisma2.releveHeure.findMany({ where: { dispositifId }, orderBy: { timestamp: 'desc' }, take: 168 }),
      prisma3.releveHeure.findMany({ where: { dispositifId }, orderBy: { timestamp: 'desc' }, take: 168 }),
      prisma4.releveHeure.findMany({ where: { dispositifId }, orderBy: { timestamp: 'desc' }, take: 168 }),
      prisma13.releveHeure.findMany({ where: { dispositifId }, orderBy: { timestamp: 'desc' }, take: 168 }),
    ]);
    const relevesHeure = [...rh1, ...rh2, ...rh3, ...rh4, ...rh13]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 168);

    // ReleveJour: all 6 RJ databases in parallel (DB3+9+10+11+12+13)
    const [rj3, rj9, rj10, rj11, rj12, rj13] = await Promise.all([
      prisma3.releveJour.findMany({ where: { dispositifId }, orderBy: { date: 'desc' }, take: 90 }),
      prisma9.releveJour.findMany({ where: { dispositifId }, orderBy: { date: 'desc' }, take: 90 }),
      prisma10.releveJour.findMany({ where: { dispositifId }, orderBy: { date: 'desc' }, take: 90 }),
      prisma11.releveJour.findMany({ where: { dispositifId }, orderBy: { date: 'desc' }, take: 90 }),
      prisma12.releveJour.findMany({ where: { dispositifId }, orderBy: { date: 'desc' }, take: 90 }),
      prisma13.releveJour.findMany({ where: { dispositifId }, orderBy: { date: 'desc' }, take: 90 }),
    ]);
    const relevesJour = [...rj3, ...rj9, ...rj10, ...rj11, ...rj12, ...rj13]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 90);

    return NextResponse.json({
      ...commune,
      dispositif: { ...commune.dispositif, relevesHeure, relevesJour },
    });
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
