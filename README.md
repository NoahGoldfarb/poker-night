# 🃏 Poker Night — Multiplayer Texas Hold'em

Ein echtes Echtzeit-Multiplayer-Poker-Spiel, das mit Next.js, Upstash Redis und Vercel gehostet wird. Bis zu 8 Spieler können mit einem 6-stelligen Zugangscode zusammenspielen.

## Features

- 🎮 **Texas Hold'em** — vollständige Spiellogik (Preflop, Flop, Turn, River, Showdown)
- ⚡ **Echtzeit** — Polling alle 1,5 Sekunden via Upstash Redis
- 👥 **Bis zu 8 Spieler** — mit Zugangscode beitreten
- 💬 **In-Game Chat** — Nachrichten während des Spiels
- 🃏 **Hand-Evaluierung** — Royal Flush bis High Card
- 💰 **Pot & Blinds** — Small/Big Blinds, Raise, All-In
- 🏆 **Gewinner-Ermittlung** — automatisch nach River/Showdown

---

## Schritt-für-Schritt Deployment

### 1. Upstash Redis einrichten (kostenlos)

1. Gehe zu [console.upstash.com](https://console.upstash.com)
2. **Sign up** (kostenlos, kein Kreditkarte nötig)
3. Klicke **Create Database**
4. Wähle:
   - Name: `poker-game`
   - Region: `EU-West-1` (Frankfurt) 
   - Plan: **Free**
5. Nach Erstellung: Klicke auf die Datenbank → **REST API**
6. Kopiere:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. GitHub Repository erstellen

```bash
cd poker-multiplayer
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/poker-night.git
git push -u origin main
```

### 3. Auf Vercel deployen

1. Gehe zu [vercel.com](https://vercel.com) → **New Project**
2. GitHub Repository importieren
3. Framework: **Next.js** (wird automatisch erkannt)
4. Unter **Environment Variables** hinzufügen:
   ```
   UPSTASH_REDIS_REST_URL = https://dein-endpoint.upstash.io
   UPSTASH_REDIS_REST_TOKEN = dein-token
   ```
5. Klicke **Deploy** → fertig! 🎉

### Alternativ: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
# Variablen setzen:
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel --prod
```

---

## Lokale Entwicklung

```bash
cp .env.example .env.local
# Trage deine Upstash-Credentials ein

npm install
npm run dev
# → http://localhost:3000
```

---

## Architektur

```
pages/
  index.tsx          → Startseite (Spiel erstellen/beitreten)
  game/[gameId].tsx  → Spieltisch

pages/api/game/
  create.ts          → Neues Spiel erstellen
  join.ts            → Spiel beitreten
  state.ts           → Spielstand abrufen (Polling)
  action.ts          → Spieleraktion (fold/check/call/raise/allin)
  start.ts           → Runde starten
  chat.ts            → Chatnachricht senden

lib/
  poker.ts           → Vollständige Spiellogik + Hand-Evaluierung
  redis.ts           → Upstash Redis Client
```

### Wie es funktioniert

- **State** wird als JSON-Objekt in Upstash Redis gespeichert (TTL: 6 Stunden)
- **Polling** alle 1,5 Sekunden — kein WebSocket-Server nötig!
- **Zugangscode** = 6 Zeichen alphanumerisch, unique per Spiel
- **Karten** anderer Spieler werden serverseitig versteckt (nur beim Showdown sichtbar)

---

## Spielregeln

- Jeder Spieler startet mit **$1.000 Chips**
- **Blinds**: Small Blind $25, Big Blind $50
- Aktionen: **Fold, Check, Call, Raise, All-In**
- Gewinner wird nach **River** oder wenn alle außer einem gefoldet haben ermittelt
- **Host** (erster Spieler) startet jede Runde

---

## Kosten

- **Vercel Free Tier**: 100GB Bandwidth, 100h Serverless Functions/Monat — für eine private Pokerrunde mehr als genug
- **Upstash Free Tier**: 10.000 Requests/Tag, 256MB Speicher — reicht locker

**Kosten: $0** 🎉
