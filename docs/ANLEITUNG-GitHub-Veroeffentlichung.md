# Anleitung: Repo auf GitHub veröffentlichen (sauberer 1.0.0-Start)

Diese Anleitung richtet sich an dich als Projekt-Verwalter (nicht an
Nutzer:innen der Karte). Sie beschreibt den Weg zu einem **komplett neuen**
GitHub-Repo mit einer einzigen, sauberen Startversion `1.0.0` - ohne jede
sichtbare Spur der internen Entwicklungshistorie (frühere interne
Versionen bis 1.9.1).

Ausgangslage: es gab bereits ein älteres GitHub-Repo mit der vollen
Entwicklungshistorie (Tags wie `v1.9.0`). Dieses Paket enthält stattdessen
eine **frisch zusammengefasste lokale Git-Historie mit genau einem einzigen
Commit** ("Initial commit: Version 1.0.0") und dem Tag `v1.0.0` - fertige
GitHub-Actions-Workflows (`.github/workflows/test.yml`, `hacs.yml`), eine
`LICENSE`-Datei (MIT), eine `hacs.json` und ein `.gitignore` sind
selbstverständlich mit dabei, nur eben ohne die alte Versionshistorie
drumherum.

## 1. Altes Repo aus dem Weg räumen

Da das neue Repo denselben Namen (`rezeptbuch-card`) tragen soll wie das
alte (damit die Badge-URLs im README weiter passen), muss das alte Repo
vorher entweder gelöscht oder umbenannt werden - GitHub erlaubt pro
Account nicht zweimal denselben Repo-Namen.

**Variante A - altes Repo löschen (empfohlen, wenn du es nicht mehr
brauchst):**
Auf `github.com/Chrism1412/rezeptbuch-card` → **Settings** → ganz nach
unten zur **"Danger Zone"** → **"Delete this repository"** → den
angezeigten Bestätigungstext (Repo-Namen) eintippen → löschen.
⚠️ Das entfernt auch alle bisherigen Issues, Stars und den CI-Verlauf
unwiderruflich.

**Variante B - altes Repo behalten, nur umbenennen:**
Dieselbe Settings-Seite, oben bei **"Repository name"** z.B. zu
`rezeptbuch-card-alt` ändern und speichern. Die alte Historie bleibt unter
diesem neuen Namen erhalten, der Name `rezeptbuch-card` wird wieder frei.

## 2. Vor dem Push: `git status` prüfen

Im entpackten Projektordner (nicht in dieser Sandbox):

```bash
git status
```

Sollte "nothing to commit, working tree clean" zeigen. Falls dort
plötzlich Dateien aus deiner echten Home-Assistant-Konfiguration auftauchen
(z. B. weil du im selben Ordner experimentiert hast): NICHT committen,
sondern per `.gitignore` ausschließen.

Ein kurzer Blick auf die Historie bestätigt den sauberen Start:

```bash
git log --oneline
```

Sollte **genau eine Zeile** zeigen: `... Initial commit: Version 1.0.0`.

## 3. Neues Repo auf GitHub anlegen

Auf [github.com](https://github.com) → oben rechts **"+"** → **"New
repository"**:

- **Repository name:** `rezeptbuch-card` (jetzt wieder frei, siehe Schritt 1)
- **Description:** optional, z. B. "Custom-Lovelace-Karte für Home
  Assistant - Rezeptverwaltung ohne Pyscript/Backend"
- **Public** - für eine spätere HACS-Custom-Repository-Einbindung muss es
  öffentlich sein (ein privates Repo liefert bei der HACS-Einbindung einen
  irreführenden 404-Fehler)
- **Wichtig:** KEIN README, KEINE `.gitignore`, KEINE Lizenz von GitHub
  erzeugen lassen (alle Häkchen leer lassen) - das existiert lokal schon
  und würde beim ersten Push sonst zu Konflikten führen
- **"Create repository"** klicken

## 4. Remote setzen und pushen

```bash
git remote add origin https://github.com/Chrism1412/rezeptbuch-card.git
git branch -M main
git push -u origin main
git push origin v1.0.0
```

Falls nach Zugangsdaten gefragt wird: GitHub verlangt statt eines
Passworts entweder einen **Personal Access Token** (Einstellungen →
Developer settings → Personal access tokens; ein **klassischer** Token mit
den Bereichen `repo` und `workflow` reicht) oder einen eingerichteten
**SSH-Key**. Ein Token gilt nur für dich persönlich - nie in einer
Nachricht oder einem Chat teilen; ein versehentlich geteilter Token gilt
sofort als kompromittiert und muss auf GitHub widerrufen werden.

## 5. Nach dem Push: CI kontrollieren

Direkt nach dem Push starten `test.yml` und `hacs.yml` automatisch. Unter
dem Reiter **"Actions"** lässt sich der Lauf live verfolgen. Nach wenigen
Minuten sollten beide grün sein - dann zeigen auch die Badges im README
automatisch den richtigen Status.

Falls ein Workflow rot wird: der Lauf-Log unter "Actions" (auf den
fehlgeschlagenen Schritt klicken, "Details") zeigt die genaue
Fehlermeldung - meistens hilfreich, die konkrete Zeile daraus zu
kopieren, falls du dabei Unterstützung brauchst.

## 6. Optional: HACS-Einbindung

Die `hacs.json` ist bereits vorbereitet. Sobald das Repo öffentlich auf
GitHub liegt: in Home Assistant → HACS → Menü (⋮) → **"Benutzerdefinierte
Repositories"** → Repo-URL `https://github.com/Chrism1412/rezeptbuch-card`
eintragen, Kategorie **"Lovelace"** wählen, hinzufügen.

## Kurz-Checkliste

- [ ] Altes Repo gelöscht oder umbenannt (Schritt 1)
- [ ] `git status` sauber, `git log --oneline` zeigt genau einen Commit
- [ ] Neues, leeres Repo `rezeptbuch-card` auf GitHub angelegt (ohne
      README/Lizenz/`.gitignore`)
- [ ] `git remote add origin ...` + `git push -u origin main`
- [ ] `git push origin v1.0.0`
- [ ] Unter "Actions" beide Workflows grün
- [ ] Optional: als HACS Custom Repository eingebunden
