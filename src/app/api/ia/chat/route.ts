﻿﻿import { NextRequest } from 'next/server';
import { prisma1, prisma2, prisma3, prisma4, prisma13 } from '@/lib/db';

export const dynamic = 'force-dynamic';

type AqiStats    = { aqi_moyen: number; nb_alertes: bigint };
type CityRow     = { commune: string; pays: string; aqi_moyen: number };
type CityDetail  = { commune: string; pays: string; aqi: number; pm25: number; no2: number; nb_capteurs: bigint };

// ── AQI global (tous les DB) ──────────────────────────────────────────────
const AQI_STATS_SQL = `
  SELECT
    ROUND(AVG(sub.aqi))::int AS aqi_moyen,
    COUNT(*) FILTER (WHERE sub.aqi > 150) AS nb_alertes
  FROM (
    SELECT DISTINCT ON ("dispositifId") aqi
    FROM "ReleveHeure"
    WHERE timestamp >= NOW() - INTERVAL '2 hours'
    ORDER BY "dispositifId", timestamp DESC
  ) sub
`;

// ── Top 5 villes par pays — une seule requête avec window function ─────────
const TOP_PAR_PAYS_SQL = `
  WITH derniers AS (
    SELECT DISTINCT ON ("dispositifId") "dispositifId", aqi
    FROM "ReleveHeure"
    WHERE timestamp >= NOW() - INTERVAL '2 hours'
    ORDER BY "dispositifId", timestamp DESC
  ),
  par_commune AS (
    SELECT
      c.nom   AS commune,
      p.nom   AS pays,
      ROUND(AVG(d2.aqi))::int AS aqi_moyen,
      COUNT(*) AS nb
    FROM derniers d2
    JOIN "Dispositif" dev ON dev.id = d2."dispositifId"
    JOIN "Commune"    c   ON c.id   = dev."communeId"
    JOIN "Pays"       p   ON p.id   = c."paysId"
    GROUP BY c.nom, p.nom
    HAVING COUNT(*) >= 2
  ),
  ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY pays ORDER BY aqi_moyen DESC) AS rn
    FROM par_commune
  )
  SELECT commune, pays, aqi_moyen
  FROM ranked
  WHERE rn <= 5
  ORDER BY pays, aqi_moyen DESC
`;

// ── Top/bottom 3 global ───────────────────────────────────────────────────
const TOP_POLLUEES_SQL = `
  SELECT c.nom AS commune, p.nom AS pays, ROUND(AVG(rh.aqi))::int AS aqi_moyen
  FROM (
    SELECT DISTINCT ON ("dispositifId") "dispositifId", aqi
    FROM "ReleveHeure"
    WHERE timestamp >= NOW() - INTERVAL '2 hours'
    ORDER BY "dispositifId", timestamp DESC
  ) rh
  JOIN "Dispositif" d ON d.id = rh."dispositifId"
  JOIN "Commune" c ON c.id = d."communeId"
  JOIN "Pays" p ON p.id = c."paysId"
  GROUP BY c.nom, p.nom HAVING COUNT(*) >= 2
  ORDER BY aqi_moyen DESC LIMIT 3
`;

const TOP_PROPRES_SQL = `
  SELECT c.nom AS commune, p.nom AS pays, ROUND(AVG(rh.aqi))::int AS aqi_moyen
  FROM (
    SELECT DISTINCT ON ("dispositifId") "dispositifId", aqi
    FROM "ReleveHeure"
    WHERE timestamp >= NOW() - INTERVAL '2 hours'
    ORDER BY "dispositifId", timestamp DESC
  ) rh
  JOIN "Dispositif" d ON d.id = rh."dispositifId"
  JOIN "Commune" c ON c.id = d."communeId"
  JOIN "Pays" p ON p.id = c."paysId"
  GROUP BY c.nom, p.nom HAVING COUNT(*) >= 2
  ORDER BY aqi_moyen ASC LIMIT 3
`;

// ── Normalisation accent/tiret (JS) ──────────────────────────────────────
function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques (accents)
    .replace(/[-‘’`]/g, ' ') // tirets/apostrophes → espace
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// ── Recherche d'une ville précise ─────────────────────────────────────────
// translate() normalise le nom en DB : accents → ascii, tirets → espace
// On compare avec le terme déjà normalisé côté JS
function buildCitySQL(nom: string) {
  const normalized = normalizeSearch(nom);
  const safe = normalized.replace(/[^a-z0-9 ]/g, '').slice(0, 60);
  return `
    SELECT
      c.nom  AS commune,
      p.nom  AS pays,
      ROUND(AVG(rh.aqi))::int          AS aqi,
      ROUND(AVG(rh.pm25)::numeric, 1)  AS pm25,
      ROUND(AVG(rh.no2)::numeric,  1)  AS no2,
      COUNT(*)::bigint                  AS nb_capteurs
    FROM (
      SELECT DISTINCT ON ("dispositifId") "dispositifId", aqi, pm25, no2
      FROM "ReleveHeure"
      WHERE timestamp >= NOW() - INTERVAL '3 hours'
      ORDER BY "dispositifId", timestamp DESC
    ) rh
    JOIN "Dispositif" d ON d.id = rh."dispositifId"
    JOIN "Commune"    c ON c.id = d."communeId"
    JOIN "Pays"       p ON p.id = c."paysId"
    WHERE translate(
      LOWER(c.nom),
      'àâäéèêëîïôùûüç-',
      'aaaeeeeiioouuc '
    ) LIKE '%${safe}%'
    GROUP BY c.nom, p.nom
    ORDER BY nb_capteurs DESC
    LIMIT 5
  `;
}

// ── Détection de ville dans le message utilisateur ────────────────────────
function detectCity(message: string): string | null {
  const m = message.match(
    /(?:à|dans|de|pour|pollution\s+(?:à|de|dans)|qualité\s+(?:de\s+l[''']?air\s+)?(?:à|de|dans)|taux\s+(?:de\s+pollution\s+)?(?:à|dans|de)|AQI\s+(?:de|à|dans))\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-]{1,50}?)(?:\s*[?!.,]|$)/i
  );
  if (m?.[1] && m[1].trim().length > 2) return m[1].trim();
  return null;
}

// ── Contexte DB ───────────────────────────────────────────────────────────
async function getDbContext(cityHint: string | null) {
  try {
    const queries: Promise<unknown>[] = [
      prisma1.$queryRawUnsafe<AqiStats[]>(AQI_STATS_SQL),
      prisma2.$queryRawUnsafe<AqiStats[]>(AQI_STATS_SQL),
      prisma3.$queryRawUnsafe<AqiStats[]>(AQI_STATS_SQL),
      prisma4.$queryRawUnsafe<AqiStats[]>(AQI_STATS_SQL),
      prisma13.$queryRawUnsafe<AqiStats[]>(AQI_STATS_SQL),
      prisma1.$queryRawUnsafe<CityRow[]>(TOP_PAR_PAYS_SQL),
      prisma1.$queryRawUnsafe<CityRow[]>(TOP_POLLUEES_SQL),
      prisma1.$queryRawUnsafe<CityRow[]>(TOP_PROPRES_SQL),
    ];

    if (cityHint) {
      queries.push(prisma1.$queryRawUnsafe<CityDetail[]>(buildCitySQL(cityHint)));
    }

    const results = await Promise.all(queries);

    const [s1, s2, s3, s4, s13] = results.slice(0, 5) as AqiStats[][];
    const parPays   = results[5] as CityRow[];
    const polluees  = results[6] as CityRow[];
    const propres   = results[7] as CityRow[];
    const cityData  = cityHint ? (results[8] as CityDetail[]) : [];

    // AQI global
    const allStats  = [s1[0], s2[0], s3[0], s4[0], s13[0]].filter(Boolean);
    const validAqis = allStats.map(s => s.aqi_moyen).filter(v => v > 0);
    const aqiMoyen  = validAqis.length > 0
      ? Math.round(validAqis.reduce((a, b) => a + b, 0) / validAqis.length)
      : 'N/A';
    const nbAlertes = allStats.reduce((sum, s) => sum + Number(s.nb_alertes), 0);

    // Top/bottom global
    const fmt = (rows: CityRow[], fallback: string) =>
      rows.length > 0 ? rows.map(c => `${c.commune} (${c.pays}, AQI ${c.aqi_moyen})`).join(', ') : fallback;
    const topPollueesList = fmt(polluees, 'Sofia (Bulgarie), Zagreb (Croatie), Milan (Italie)');
    const topPropresList  = fmt(propres,  'Helsinki (Finlande), Tallinn (Estonie), Riga (Lettonie)');

    // Classement par pays
    const byPays = new Map<string, CityRow[]>();
    for (const r of parPays) {
      if (!byPays.has(r.pays)) byPays.set(r.pays, []);
      byPays.get(r.pays)!.push(r);
    }

    const PAYS_ORDRE = [
      'France', 'Allemagne', 'Espagne', 'Italie', 'Pologne',
      'Portugal', 'Belgique', 'Pays-Bas', 'Luxembourg', 'Autriche',
      'Suisse', 'Danemark', 'Suède', 'Finlande', 'Estonie',
      'Lettonie', 'Lituanie', 'Slovaquie', 'Slovénie', 'Croatie', 'Bulgarie',
    ];

    const classementParPays = PAYS_ORDRE.map(pays => {
      const villes = byPays.get(pays);
      if (!villes || villes.length === 0) return `${pays} : données insuffisantes`;
      return `${pays} : ${villes.map((v, i) => `${i + 1}. ${v.commune} (AQI ${v.aqi_moyen})`).join(', ')}`;
    }).join('\n');

    // Données ville spécifique
    let donneesVille = '';
    if (cityHint && cityData.length > 0) {
      const v = cityData[0];
      donneesVille = `\nDONNÉES TEMPS RÉEL POUR "${cityHint.toUpperCase()}" :
- Commune trouvée : ${v.commune} (${v.pays})
- AQI actuel : ${v.aqi}
- PM2.5 : ${v.pm25} µg/m³
- NO₂ : ${v.no2} µg/m³
- Nombre de capteurs actifs : ${Number(v.nb_capteurs)}`;
      if (cityData.length > 1) {
        donneesVille += `\n- Autres correspondances : ${cityData.slice(1).map(c => `${c.commune} (${c.pays}, AQI ${c.aqi})`).join(', ')}`;
      }
    } else if (cityHint) {
      donneesVille = `\nDONNÉES POUR "${cityHint}" : aucun capteur trouvé dans la zone couverte (peut-être hors zone euro ou orthographe différente).`;
    }

    return { aqiMoyen, nbAlertes, topPollueesList, topPropresList, classementParPays, donneesVille };
  } catch (err) {
    console.error('DB context error:', err);
    return {
      aqiMoyen: 'N/A', nbAlertes: 'N/A',
      topPollueesList: 'données temporairement indisponibles',
      topPropresList:  'données temporairement indisponibles',
      classementParPays: 'données temporairement indisponibles',
      donneesVille: '',
    };
  }
}

// ── Route POST ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: '⚠️ Clé GROQ_API_KEY manquante. Créez un compte gratuit sur console.groq.com et ajoutez la clé dans .env.local' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { message, history = [] } = await req.json();

  const cityHint = detectCity(message);
  const ctx = await getDbContext(cityHint);

  const donneesDB = `- AQI moyen global : ${ctx.aqiMoyen}
- Alertes actives (AQI > 150) : ${ctx.nbAlertes}
- Top 3 villes les plus polluées (zone euro) : ${ctx.topPollueesList}
- Top 3 villes les moins polluées (zone euro) : ${ctx.topPropresList}

CLASSEMENT PAR PAYS — top 5 villes les plus polluées actuellement :
${ctx.classementParPays}${ctx.donneesVille}`;

  const systemPrompt = `Tu es AQM Assistant, l'IA experte de la plateforme SMART_IO × NOSE.

=== CONNAISSANCE COMPLÈTE DU PROJET ===

PROJET :
- Startup NOSE a développé le capteur MAKESENSE© (détection particules fines, brevet en cours)
- SMART_IO conçoit et fabrique le dispositif AQM (Air Quality Monitoring)
- Déploiement : 127 383 capteurs sur toutes les communes de la zone euro (21 pays)
- Transmission SIGFOX toutes les heures, autonomie 12 mois, étanchéité IP66
- Arduino MKRFox 1200 comme carte DAQ

BOÎTIER AQM :
- Dimensions : 220×100×45 mm
- Matériau : ABS (Acrylonitrile Butadiène Styrène)
- CSUP (coque supérieure) + CINF (coque inférieure)
- Composants : DAQ, CHA, PAN, BAT, ANT, PRI, INT, MKS, câbles C1-C7, VIS, JNT, EMB
- Étanchéité : joint torique + emboîtement à recouvrement + colle pare-brise
- Panneau solaire intégré dans le couvercle

INDUSTRIALISATION (L2.1) :
- 10 000 unités à produire en 57 jours (sept→déc), 8h/jour, ligne A3
- Takt Time = 57×8×3600/10000 = 164 secondes
- Temps cycle total = 340 secondes
- 3 postes d'assemblage :
  * Poste 1 (130s) : sous-ensemble alimentation (BAT+CHA+PRI+ANT+câbles)
  * Poste 2 (105s) : sous-ensemble capteur (PAN+DAQ+MKS)
  * Poste 3 (105s) : fermeture boîtier + emballage
- Cadence goulot : 130s (poste 1)
- 1 opérateur par poste à 20€/h
- Coût MO = 1.89€/produit
- Stock sécurité : 50 unités, stock max : 1500 unités
- Quantité fabriquée : 10 050 unités, livrées : 10 000
- Heures planifiées : 373h

CAPABILITÉ (L2.2) :
- Fournisseur INJECTPLAST, 2 presses MCH1 et MCH2, 2 lots ABS
- Cote nominale : 50mm, tolérance [49.9 ; 50.1], IT = 0.2mm
- 75 pièces mesurées par combinaison
- Formule Cp = IT/(6σ), Cpk = min((USL-μ)/3σ, (μ-LSL)/3σ)
- Seuil requis : Cpk ≥ 1.33
- Résultats :
  * MCH1 LOT1 : Cp L1=0.562, Cpk L1=0.504, Cp L2=0.514, Cpk L2=0.452 → NON CAPABLE
  * MCH2 LOT1 : Cp L1=1.562, Cpk L1=1.460, Cp L2=1.814, Cpk L2=1.491 → CAPABLE ✅
  * MCH1 LOT2 : Cp L1=0.095, Cpk L1=0.033, Cp L2=0.105, Cpk L2=0.078 → NON CAPABLE (77.9% rebut)
  * MCH2 LOT2 : Cp L1=1.757, Cpk L1=1.460, Cp L2=1.927, Cpk L2=1.775 → CAPABLE ✅
- Conclusion : MCH1 défaillante (problème machine, pas matière), MCH2 validée
- Droite de Henry : vérifie la normalité d'une distribution. Si points alignés sur y=x → loi normale. MCH2 alignée ✅, MCH1 dispersée ❌

FINANCES (L2.3) :
- Coût achat composants unitaire : 24.97€
  * CSUP: 3.50€, CINF: 3.50€, DAQ: 7.43€, CHA: 1.45€, PAN: 2.15€
  * BAT: 4.91€, ANT: 0.91€, PRI: 0.22€, INT: 0.25€, câbles: 0.30€
- Coût MO : 1.89€/unité
- Coût structure ligne A3 : 141 833€ total → 14.12€/unité
- Coût de revient unitaire : 39.92€
- Prix de vente HT : 49.90€ (marge 25%)
- Marge brute unitaire : 9.98€
- CA total : 499 000€
- Marge brute totale : 99 800€
- Coûts de structure totaux : 1 365 000€

PLATEFORME WEB :
- Stack : Next.js 14, TypeScript, Tailwind CSS, Leaflet.js, Recharts, Framer Motion, Prisma
- 9 bases PostgreSQL Neon (512MB chacune), ~20.8M lignes total
- Pages : Accueil, Carte (127 383 points), Alertes, Recherche, Graphiques, Dashboard CEO, Capabilité, IA, À propos
- AQI calculé selon échelle US EPA : 0-50 Bon, 51-100 Modéré, 101-150 Mauvais pour groupes sensibles, 151-200 Mauvais, 201-300 Très mauvais, 301+ Dangereux
- Données : ReleveHeure (horaire) + ReleveJour (journalier 90j)

ANALYSE FONCTIONNELLE :
- Bête à cornes : Utilisateur → Dispositif AQM → Qualité de l'air
- FP : Acquérir, traiter et transmettre les données de qualité de l'air
- FC1: maintenance technicien, FC2: normes/réglementation, FC3: résistance climatique
- FC4: étanchéité IP66, FC5: utilisation, FC6: corps étrangers, FC7: SIGFOX, FC8: autonomie 12 mois
- Diagramme FAST : FC7→antenne SIGFOX, FC8→batterie+panneau solaire, FC4→joints toriques
- Matrice priorisation : FP=30.3%, FC7=24.2%, FC8=9.1%

GROUPE 7 :
- MOSBAH Ilian, RIVES Pierre-Elyan, TROSZCZYNSKI Loris, KNIEFELD-LOINTIER Grégoire, GASPARIN Raphael
- CPI (Cycle Préparatoire Ingénieur) CESI

=== DONNÉES TEMPS RÉEL (injectées dynamiquement) ===
${donneesDB}

=== COMPORTEMENT ===
- Réponds en français, de façon concise et professionnelle
- Pour les questions techniques (Cp, droite de Henry, Takt Time...) explique clairement
- Pour les questions sur les données, utilise les données temps réel ci-dessus
- Pour les questions générales sur la qualité de l'air ou l'environnement, réponds avec tes connaissances
- Ne dis JAMAIS "je ne dispose pas de données" si la réponse est dans ce system prompt
- Si une donnée n'est vraiment pas disponible, propose une alternative utile`;

  const messages = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: `Erreur API Groq (${groqRes.status}): ${errText}` }),
      { status: groqRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(new TextEncoder().encode(text));
            } catch { /* skip malformed lines */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
