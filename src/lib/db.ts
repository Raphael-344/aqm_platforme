import { PrismaClient } from '@prisma/client';

type MultiPrismaGlobal = {
  prisma1: PrismaClient;
  prisma2: PrismaClient;
  prisma3: PrismaClient;
  prisma4: PrismaClient;
  prisma9: PrismaClient;
  prisma10: PrismaClient;
  prisma11: PrismaClient;
  prisma12: PrismaClient;
  prisma13: PrismaClient;
};

const g = globalThis as unknown as Partial<MultiPrismaGlobal>;
const dev = process.env.NODE_ENV !== 'production';
const logLevel = dev ? (['error'] as const) : ([] as const);

function withConnectionLimit(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('connection_limit')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=1&connection_timeout=60&pool_timeout=60&connect_timeout=60`;
}

// Sans URL, Prisma refuse d'instancier le client, ce qui casse `next build` hors Vercel.
// Une URL injoignable explicite permet de builder sans base : les requêtes échouent
// alors à l'exécution (les routes API renvoient une erreur 503) au lieu de bloquer le build.
function urlOuManquante(envUrl: string | undefined, nomVariable: string): string {
  return envUrl ?? `postgresql://variable-manquante@127.0.0.1:1/${nomVariable}`;
}

function makeClient(envUrl: string | undefined, nomVariable: string) {
  return new PrismaClient({
    datasources: { db: { url: withConnectionLimit(urlOuManquante(envUrl, nomVariable)) } },
    log: [...logLevel],
  });
}

// DB1: Pays + Commune + Dispositif + ReleveHeure 001-063
export const prisma1 = g.prisma1 ?? makeClient(process.env.DATABASE_URL, 'DATABASE_URL');
// DB2: ReleveHeure 064-125  (DB2 at ~512 MB after 62 files)
export const prisma2 = g.prisma2 ?? makeClient(process.env.DATABASE_URL_2, 'DATABASE_URL_2');
// DB3: ReleveHeure 144-184 + ReleveJour 001-021  (saturé ~512 MB)
export const prisma3 = g.prisma3 ?? makeClient(process.env.DATABASE_URL_3, 'DATABASE_URL_3');
// DB4: ReleveHeure 126-130
export const prisma4 = g.prisma4 ?? makeClient(process.env.DATABASE_URL_4, 'DATABASE_URL_4');
// DB9: ReleveJour 022-083  (overflow DB3; saturé 512 MB après 62 fichiers)
export const prisma9 = g.prisma9 ?? makeClient(process.env.DATABASE_URL_9, 'DATABASE_URL_9');
// DB10: ReleveJour 113-163
export const prisma10 = g.prisma10 ?? makeClient(process.env.DATABASE_URL_10, 'DATABASE_URL_10');
// DB11: ReleveJour 164-214
export const prisma11 = g.prisma11 ?? makeClient(process.env.DATABASE_URL_11, 'DATABASE_URL_11');
// DB12: ReleveJour 215-230
export const prisma12 = g.prisma12 ?? makeClient(process.env.DATABASE_URL_12, 'DATABASE_URL_12');
// DB13: ReleveHeure 131-143 + ReleveJour 084-112 (overflow DB9)
export const prisma13 = g.prisma13 ?? makeClient(process.env.DATABASE_URL_13, 'DATABASE_URL_13');

if (dev) {
  g.prisma1 = prisma1;
  g.prisma2 = prisma2;
  g.prisma3 = prisma3;
  g.prisma4 = prisma4;
  g.prisma9 = prisma9;
  g.prisma10 = prisma10;
  g.prisma11 = prisma11;
  g.prisma12 = prisma12;
  g.prisma13 = prisma13;
}

// RH: DB1(001-063) + DB2(064-125) + DB4(126-130) + DB13(131-143) + DB3(144-184)
export const rhClients = [prisma1, prisma2, prisma3, prisma4, prisma13] as const;

// RJ: DB3(001-021) + DB9(022-083) + DB13(084-112) + DB10(113-163) + DB11(164-214) + DB12(215-230)
export const rjClients = [prisma3, prisma9, prisma10, prisma11, prisma12, prisma13] as const;

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  const code = (err as { code?: string }).code;
  return (
    msg.includes('ConnectionReset') ||
    msg.includes('Connection reset') ||
    msg.includes('socket closed') ||
    msg.includes('Connection refused') ||
    msg.includes('ECONNRESET') ||
    code === 'P1001' ||
    code === 'P1017'
  );
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isConnectionError(err) || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}
