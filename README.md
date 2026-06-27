# AQM Platform — Air Quality Monitoring

Plateforme de monitoring de la qualité de l'air en temps réel à l'échelle européenne, développée pour le projet **NOSE × SMART_IO** : visualisation cartographique, alertes, graphiques historiques et assistant IA sur un réseau simulé de ~127 000 capteurs répartis dans 21 pays.

🌐 **Démo en ligne** : [aqm-platforme-v2.vercel.app](https://aqm-platforme-v2.vercel.app)

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend web | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Mobile | Flutter 3.x |
| Base de données | PostgreSQL (Neon.tech) — architecture multi-bases |
| ORM | Prisma 5 |
| IA | Groq API (chatbot) + prédiction AQI |
| Déploiement | Vercel |
| Cartographie | Deck.gl, Leaflet |
| Visualisation | Recharts, D3.js |

---

## Fonctionnalités

- **Carte interactive temps réel** — ~127 000 capteurs sur carte Europe, colorisée par niveau AQI
- **Alertes** — détection des dépassements de seuil (AQI > 150) avec historique 30 jours
- **Graphiques** — évolution par pays et par polluant (PM2.5, PM10, NO2) sur 90 jours
- **Dashboard** — KPIs réseau, suivi de production, statistiques globales
- **Chatbot IA** — assistant conversationnel pour interroger et analyser les données
- **Recherche** — recherche de communes et capteurs en temps réel
- **Application mobile** — app Flutter avec thème sombre cyan/vert néon

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
- Flutter 3.x (pour l'app mobile)
- Comptes [Neon.tech](https://neon.tech) pour les bases PostgreSQL

### 1. Cloner le dépôt

```bash
git clone https://github.com/Raphael-344/aqm_platforme.git
cd aqm_platforme
```

### 2. Installer les dépendances

```bash
cd aqm-site
npm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env.local` dans `aqm-site/` :

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

---

## Structure du projet

```
aqm-platform/
├── aqm-site/                   # Application Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/            # Routes API : /carte, /alertes, /graphiques,
│   │   │   │                   #              /stats, /dashboard, /recherche,
│   │   │   │                   #              /ia/chat, /ia/prediction, /commune/[id]
│   │   │   ├── carte/
│   │   │   ├── alertes/
│   │   │   ├── graphiques/
│   │   │   ├── dashboard/
│   │   │   ├── ia/
│   │   │   └── recherche/
│   │   └── lib/
│   │       └── db.ts           # Clients Prisma multi-bases
│   └── prisma/
│       └── schema.prisma       # Schéma : Pays, Commune, Dispositif, ReleveHeure, ReleveJour
└── aqm-app/                    # Application Flutter mobile
    └── lib/
        ├── screens/
        └── services/
```

---

## Équipe & contribution

Projet réalisé en équipe dans le cadre du partenariat **NOSE × SMART_IO**.

**Ma contribution technique principale** : conception et développement de l'architecture backend complète (schéma Prisma multi-bases, 9 API routes Next.js, pipeline de données sur ~20M d'enregistrements), intégration du chatbot IA, déploiement Vercel, et application mobile Flutter.
