import { prisma1, prisma2, prisma3, prisma4, prisma9, prisma10, prisma11, prisma12, prisma13 } from '@/lib/db';

// Le jeu de données est simulé et importé une fois : il ne progresse pas avec l'horloge.
// Les fenêtres temporelles (7 j, 30 j, 90 j…) sont donc calculées à partir du dernier
// relevé présent en base, et non de la date du jour.

const RH_CLIENTS = [prisma1, prisma2, prisma3, prisma4, prisma13];
const RJ_CLIENTS = [prisma3, prisma9, prisma10, prisma11, prisma12, prisma13];
const CACHE_MS = 10 * 60_000;

let cacheHeure: { valeur: Date; expire: number } | null = null;
let cacheJour: { valeur: Date; expire: number } | null = null;

function plusRecente(dates: (Date | null | undefined)[]): Date | null {
  return dates.reduce<Date | null>((best, d) => (d && (!best || d > best) ? d : best), null);
}

/** Horodatage du dernier relevé horaire (ReleveHeure), toutes bases confondues. */
export async function dernierReleveHeure(): Promise<Date> {
  if (cacheHeure && cacheHeure.expire > Date.now()) return cacheHeure.valeur;
  const derniers = await Promise.all(
    RH_CLIENTS.map(c => c.releveHeure.findFirst({ orderBy: { timestamp: 'desc' }, select: { timestamp: true } }))
  );
  const valeur = plusRecente(derniers.map(d => d?.timestamp));
  if (!valeur) throw new Error('Aucun relevé horaire en base');
  cacheHeure = { valeur, expire: Date.now() + CACHE_MS };
  return valeur;
}

/** Date du dernier relevé journalier (ReleveJour), toutes bases confondues. */
export async function dernierReleveJour(): Promise<Date> {
  if (cacheJour && cacheJour.expire > Date.now()) return cacheJour.valeur;
  const derniers = await Promise.all(
    RJ_CLIENTS.map(c => c.releveJour.findFirst({ orderBy: { date: 'desc' }, select: { date: true } }))
  );
  const valeur = plusRecente(derniers.map(d => d?.date));
  if (!valeur) throw new Error('Aucun relevé journalier en base');
  cacheJour = { valeur, expire: Date.now() + CACHE_MS };
  return valeur;
}

export const JOUR_MS = 86_400_000;
