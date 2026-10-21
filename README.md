# AQM Platform — Air Quality Monitoring

Plateforme de monitoring de la qualité de l'air à l'échelle européenne, sur **données simulées**, réalisée dans le cadre de ma formation à CESI : visualisation cartographique, alertes, graphiques historiques et assistant IA sur un réseau simulé de ~127 000 capteurs répartis dans 21 pays.

🌐 **Démo en ligne** : [aqm-platforme-v2.vercel.app](https://aqm-platforme-v2.vercel.app)

> **À propos des données** — les ~20 millions de relevés sont **simulés** et ont été importés une fois ; ils ne sont pas alimentés en continu. Le dernier relevé date du 27/05/2026. Toutes les vues « 7 / 30 / 90 derniers jours » et les alertes sont donc calculées par rapport au **dernier relevé présent en base**, et non par rapport à la date du jour.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend web | Next.js 14.2 (App Router), TypeScript, Tailwind CSS |
| Base de données | PostgreSQL (Neon.tech) — architecture multi-bases |
| ORM | Prisma 5 |
| IA | Groq API, modèle `openai/gpt-oss-120b` (chatbot) + prévision AQI heuristique (profil horaire) |
| Déploiement | Vercel |
| Cartographie | Deck.gl, Leaflet |
| Visualisation | Recharts, D3.js |

---

## Fonctionnalités

- **Carte interactive** — ~127 000 capteurs simulés sur carte Europe, colorisés selon leur AQI au dernier relevé
- **Alertes** — dépassements de seuil (AQI > 150) au dernier relevé, avec historique sur les 30 derniers jours de données
- **Graphiques** — évolution par pays sur les 90 derniers jours de données, comparaison de villes, heatmap horaire
- **Dashboard** — KPIs réseau, suivi de production, statistiques globales
- **Chatbot IA** — assistant conversationnel (Groq) qui reçoit en contexte les indicateurs calculés sur la base
- **Recherche** — recherche de communes et de capteurs

---

## Chiffres clés

| Indicateur | Valeur |
|---|---|
| Capteurs simulés | ~127 000 |
| Pays couverts | 21 (zone euro) |
| Enregistrements en base | ~20 millions |
| Fréquence de mesure | Toutes les heures |
| Polluants mesurés | AQI, PM2.5, PM10, NO2 |

---

## Installation locale

### Prérequis

- Node.js 18+
- Comptes [Neon.tech](https://neon.tech) pour les bases PostgreSQL

### 1. Cloner le dépôt

```bash
git clone https://github.com/Raphael-344/aqm_platforme.git
cd aqm_platforme
```

### 2. Installer les dépendances

```bash
npm ci
```

### 3. Configurer les variables d'environnement

Copier `.env.example` en `.env.local` à la racine du projet et le compléter :

```env
# Architecture distribuée — 9 bases PostgreSQL indépendantes
# (les ~20M d'enregistrements sont répartis sur plusieurs bases,
#  chacune limitée à 512 MB sur le plan gratuit Neon)
DATABASE_URL=postgresql://...       # DB1 — Pays, Commune, Dispositif, ReleveHeure 001-063
DATABASE_URL_2=postgresql://...     # DB2 — ReleveHeure 064-125
DATABASE_URL_3=postgresql://...     # DB3 — ReleveHeure 144-184 + ReleveJour 001-021
DATABASE_URL_4=postgresql://...     # DB4 — ReleveHeure 126-130
DATABASE_URL_9=postgresql://...     # DB9 — ReleveJour 022-083
DATABASE_URL_10=postgresql://...    # DB10 — ReleveJour 113-163
DATABASE_URL_11=postgresql://...    # DB11 — ReleveJour 164-214
DATABASE_URL_12=postgresql://...    # DB12 — ReleveJour 215-230
DATABASE_URL_13=postgresql://...    # DB13 — ReleveHeure 131-143 + ReleveJour 084-112

# IA
GROQ_API_KEY=...

# URL publique
NEXT_PUBLIC_SITE_URL=https://aqm-platforme-v2.vercel.app
```

#### Fond de carte (clé CARTO)

Depuis septembre 2026, les fonds de carte [CARTO Basemaps](https://carto.com/basemaps/apikey) exigent une clé d'API (gratuite jusqu'à 5 M de requêtes par mois en usage non commercial). Renseigner `NEXT_PUBLIC_CARTO_API_KEY` dans `.env.local` (et dans les variables d'environnement Vercel). Sans clé, le site fonctionne mais les tuiles affichent un filigrane « API KEY REQUIRED ».

### 4. Lancer en développement

```bash
npm run dev
# → http://localhost:3000
```

### 5. Build de production

```bash
npm run build
# Génère le client Prisma puis compile Next.js (prisma generate && next build)
```

Le build fonctionne aussi sans variables de base de données : les pages s'affichent et les routes API renvoient une erreur `503` explicite tant que les bases ne sont pas configurées. L'application n'affiche jamais de données de remplacement inventées.

---

## Structure du projet

```
aqm_platforme/
├── src/
│   ├── app/
│   │   ├── api/            # Routes API : /carte, /alertes, /graphiques,
│   │   │                   #              /stats, /dashboard, /recherche,
│   │   │                   #              /ia/chat, /ia/prediction, /commune/[id]
│   │   ├── carte/
│   │   ├── alertes/
│   │   ├── graphiques/
│   │   ├── dashboard/
│   │   ├── ia/
│   │   └── recherche/
│   └── lib/
│       ├── db.ts           # Clients Prisma multi-bases
│       └── reference.ts    # Date du dernier relevé (référence des fenêtres temporelles)
└── prisma/
    └── schema.prisma       # Schéma : Pays, Commune, Dispositif, ReleveHeure, ReleveJour
```

---

## Tester en 2 minutes

Sur la démo en ligne :

1. **Accueil** — le nombre de capteurs s'affiche.
2. **Carte** — les capteurs apparaissent ; cliquer sur un point affiche ses mesures et la date du dernier relevé.
3. **Alertes** — la liste et l'historique sur 30 jours sont remplis.
4. **Graphiques** — la courbe par pays (90 jours) et la heatmap s'affichent.
5. **IA** — poser une question au chatbot (ex. « Quelles sont les villes les plus polluées ? »), puis lancer une prévision pour Paris.

---

## Contribution

Projet réalisé dans le cadre de ma formation à CESI.

**Contribution technique principale** : conception et développement de l'architecture backend complète (schéma Prisma multi-bases, 9 API routes Next.js, pipeline de données sur ~20M d'enregistrements), intégration du chatbot IA et déploiement Vercel.
