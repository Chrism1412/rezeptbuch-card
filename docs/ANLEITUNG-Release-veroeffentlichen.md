# Anleitung: ein neues Release veröffentlichen (laufender Betrieb)

Diese Anleitung richtet sich an dich als Projekt-Verwalter (nicht an
Nutzer:innen der Karte) und beschreibt den **normalen, wiederkehrenden**
Ablauf, um Änderungen auf GitHub zu veröffentlichen - im Unterschied zur
[`ANLEITUNG-GitHub-Veroeffentlichung.md`](ANLEITUNG-GitHub-Veroeffentlichung.md),
die nur den einmaligen Frischstart des Repos mit `v1.0.0` beschreibt und
danach nicht mehr gebraucht wird.

Es gibt zwei unterschiedliche Dinge, die du auf GitHub tust, und die
leicht durcheinandergehen:

- **Push**: deine lokalen Commits landen im Repo (`git push`). Das
  passiert bei jeder Änderung, unabhängig davon, ob sich die
  Versionsnummer ändert.
- **Release**: ein Tag (z. B. `v2.0.0`) plus eine dazugehörige
  GitHub-**Release**-Seite mit Versionshinweis-Text. Das machst du nur,
  wenn du eine neue Version "offiziell" markieren willst - HACS und der
  eigene Update-Hinweis in der Karte selbst richten sich danach (siehe
  unten, Abschnitt "Warum ein *Release* und nicht nur ein Tag nötig ist").

Ein einfacher Push ohne neues Release ist völlig in Ordnung für kleine
Zwischenstände; ein Release lohnt sich, wenn genug zusammengekommen ist
(z. B. wie jetzt bei diesem Wechsel vom zuletzt veröffentlichten `v1.0.4`
auf `v2.0.0`).

## 1. Vor dem Release: Stand prüfen

Im entpackten Projektordner (nicht in dieser Sandbox hier):

```bash
git status
git log --oneline -20
```

`git status` sollte "nothing to commit, working tree clean" zeigen -
falls nicht, erst noch offene Änderungen committen. Prüfe außerdem, dass
die Versionsnummer an allen drei Stellen übereinstimmt:

- `rezeptbuch-card.js` - Zeile mit `const CARD_VERSION = "2.0.0";`
- `package.json` - Feld `"version": "2.0.0"`
- `CHANGELOG.md` - oberster Abschnitt `## [2.0.0] - ...`

(Für dieses konkrete Release wurden alle drei bereits von Claude auf
`2.0.0` gesetzt - falls du das Projekt selbst weiterentwickelst, ist das
künftig dein eigener erster Schritt vor jedem Release.)

Die Tests sollten grün sein, bevor irgendetwas auf GitHub landet:

```bash
npm test
```

## 2. Push zum `main`-Branch

```bash
git push origin main
```

Das allein löst schon die beiden CI-Workflows aus (`test.yml`,
`hacs.yml`) - unter dem Reiter **"Actions"** auf GitHub lässt sich das
live verfolgen. Für ein Release (Schritt 3-5) sollten diese idealerweise
schon grün sein, bevor du taggst - ein rotes CI direkt nach dem Release
sieht nicht gut aus, auch wenn es sich notfalls nachträglich reparieren
lässt.

## 3. Tag setzen und pushen

```bash
git tag -a v2.0.0 -m "Version 2.0.0"
git push origin v2.0.0
```

Der Tag-Name folgt immer dem Muster `vX.Y.Z` (mit führendem `v`) - das
erwartet sowohl HACS als auch der eigene Update-Hinweis in der Karte
(`GITHUB_REPO`/`_versionIstNeuer` in `rezeptbuch-card.js`).

## 4. GitHub-Release aus dem Tag erstellen

**Wichtig:** ein reiner Tag reicht NICHT aus, damit HACS oder der eigene
Update-Hinweis der Karte die neue Version erkennen - siehe dazu den
Abschnitt "Warum ein *Release* und nicht nur ein Tag nötig ist" unten.
Es muss zusätzlich eine echte GitHub-**Release**-Seite dazu geben:

Auf `github.com/Chrism1412/rezeptbuch-card` → Reiter **"Releases"**
(rechte Seitenleiste oder `/releases`) → **"Draft a new release"**:

- **Choose a tag:** `v2.0.0` auswählen (existiert bereits aus Schritt 3)
- **Release title:** z. B. `v2.0.0` oder `Version 2.0.0`
- **Beschreibung:** am einfachsten der passende Abschnitt aus
  `CHANGELOG.md` (Abschnitt `## [2.0.0] - ...` ohne die
  Versions-/Datumszeile selbst, der Rest lässt sich direkt
  hineinkopieren - GitHub rendert das Markdown genauso)
- **"Set as the latest release"** angehakt lassen (Standard) - genau
  dieses Flag ist es, was die von der Karte abgefragte
  `/releases/latest`-API liefert
- **"Publish release"** klicken

## 5. Nach dem Release: kontrollieren

- Unter **"Actions"**: beide Workflows (`test.yml`, `hacs.yml`) sollten
  grün sein - dann zeigen auch die Badges im README automatisch den
  richtigen Status.
- Kurzer Funktionstest des Update-Hinweises: in einer echten
  Home-Assistant-Installation mit einer älteren Kartenversion (oder
  testweise `CARD_VERSION` lokal auf z. B. `"1.9.0"` heruntersetzen, ohne
  das zu committen) die Rezeptübersicht öffnen - der Hinweis "Neue
  Version verfügbar: 2.0.0" mit Link zur Release-Seite sollte erscheinen.
  Der Hinweis wird bis zu 24h lokal zwischengespeichert (`localStorage`),
  bei Bedarf also die Browser-Konsole mit `localStorage.clear()` leeren,
  um sofort neu zu prüfen.
- Falls die Karte über HACS als Custom Repository eingebunden ist, sollte
  dort jetzt ebenfalls ein Update auf `2.0.0` angeboten werden (HACS
  prüft in eigenem Rhythmus, ein manueller "Neu laden" in HACS
  beschleunigt das).

## Warum ein *Release* und nicht nur ein Tag nötig ist

Die Karte fragt beim Laden `https://api.github.com/repos/<repo>/releases/latest`
ab (siehe `_updatePruefen` in `rezeptbuch-card.js`). Dieser API-Endpunkt
liefert **ausschließlich veröffentlichte Releases**, keine bloßen
Git-Tags ohne zugehörige Release-Seite - ein Tag allein (Schritt 3 ohne
Schritt 4) würde von der Karte also schlicht nicht gefunden und der
Update-Hinweis bliebe dauerhaft aus, obwohl der Code längst neuer ist.
HACS selbst verhält sich hier ähnlich (richtet sich ebenfalls nach
GitHub-Releases, nicht nach reinen Tags).

## Künftige Releases: Kurz-Checkliste

- [ ] `git status` sauber, Tests grün (`npm test`)
- [ ] Version an allen drei Stellen synchron: `rezeptbuch-card.js`
      (`CARD_VERSION`), `package.json`, `CHANGELOG.md` (neuer Abschnitt
      ganz oben, mit heutigem Datum)
- [ ] `git push origin main`
- [ ] `git tag -a vX.Y.Z -m "Version X.Y.Z"` + `git push origin vX.Y.Z`
- [ ] Auf GitHub unter "Releases" eine echte Release-Seite aus dem Tag
      erstellen (nicht nur den Tag pushen!), Beschreibung aus
      `CHANGELOG.md` übernehmen, "Set as the latest release" angehakt
- [ ] "Actions" prüfen: beide Workflows grün
- [ ] Optional: Update-Hinweis in der Karte und/oder HACS-Update
      stichprobenartig testen

## Wahl der Versionsnummer (Semantic Versioning)

Kurz zur Erinnerung, nach welchem Muster die Nummer `X.Y.Z` sich ändert
(ausführlicher auch in `CONTRIBUTING.md`):

- **Z (Patch)** - reine Fehlerbehebungen, keine neuen Funktionen
- **Y (Minor)** - neue Funktionen, die nichts Bestehendes kaputt machen
- **X (Major)** - große/mehrere neue Kernfunktionen auf einmal (wie hier
  bei `2.0.0`: Kochmodus, Sammel-PDF, Statistik) oder ein Bruch mit der
  Abwärtskompatibilität (z. B. eine Kartenoption ändert ihr Verhalten)
