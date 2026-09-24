# Anleitung: Repo auf GitHub veröffentlichen

Diese Anleitung richtet sich an dich als Projekt-Verwalter (nicht an
Nutzer:innen der Karte) und beschreibt den einmaligen Weg von "Ordner mit
Git-Historie liegt lokal" zu "Repo ist auf GitHub, CI läuft, Badges zeigen
den echten Status".

Ausgangslage: das Projekt hat bereits eine vollständige lokale Git-Historie
(mehrere Commits), fertige GitHub-Actions-Workflows unter
`.github/workflows/` (`test.yml`, `hacs.yml`), eine `LICENSE`-Datei (MIT),
eine `hacs.json` für die spätere HACS-Einbindung und ein `.gitignore`, das
Geheimnisse und persönliche Backup-Dateien ausschließt. Es fehlt nur noch
der letzte Schritt: ein GitHub-Repo, das diese Historie als Remote aufnimmt.

## 1. Vor dem Push: `git status` prüfen

Bevor irgendetwas gepusht wird, einmal sicherstellen, dass keine
persönlichen Daten versehentlich mit eingecheckt wurden - besonders wenn du
im selben Ordner auch mit deiner echten Home-Assistant-Konfiguration
gearbeitet hast:

```bash
git status
```

Sollte "nothing to commit, working tree clean" zeigen (oder nur Dateien,
die du bewusst noch hinzufügen willst). Falls dort echte Rezepte, ein
Long-Lived-Access-Token oder deine echte `configuration.yaml` auftauchen:
NICHT committen, sondern per `.gitignore` ausschließen (Muster wie
`*_token.txt` und `Backup-Rezepte/` sind dort bereits vorbereitet).

## 2. Platzhalter im README ersetzen ✅ bereits erledigt

`README.md` enthielt in den Badge-URLs den Platzhalter `DEIN-NAME` - der
ist bereits durch deinen GitHub-Benutzernamen **Chrism1412** ersetzt:

```markdown
[![Tests](https://github.com/Chrism1412/rezeptbuch-card/actions/workflows/test.yml/badge.svg)](...)
[![HACS-Validierung](https://github.com/Chrism1412/rezeptbuch-card/actions/workflows/hacs.yml/badge.svg)](...)
```

Nichts weiter zu tun - nur relevant, falls du das Repo später unter
einem anderen GitHub-Namen oder Repo-Namen veröffentlichst.

## 3. Repo auf GitHub anlegen

Auf [github.com](https://github.com) → oben rechts **"+"** → **"New
repository"**:

- **Repository name:** `rezeptbuch-card` (oder ein anderer Name deiner
  Wahl - beeinflusst dann aber auch die Badge-URLs und ggf. die
  HACS-Einbindung)
- **Description:** optional, z.B. "Custom-Lovelace-Karte für Home
  Assistant - Rezeptverwaltung ohne Pyscript/Backend"
- **Public** oder **Private** - für eine spätere HACS-Custom-Repository-
  Einbindung muss es öffentlich (Public) sein
- **Wichtig:** KEIN README, KEINE `.gitignore`, KEINE Lizenz von GitHub
  erzeugen lassen (Häkchen bei "Add a README file" etc. leer lassen) -
  all das existiert lokal schon und würde sonst beim ersten Push zu
  Konflikten führen
- **"Create repository"** klicken

GitHub zeigt danach eine leere Repo-Seite mit den nötigen Befehlen an -
die folgenden Schritte sind im Kern dasselbe, nur mit den konkreten
Erklärungen dazu.

## 4. Remote setzen und pushen

Im lokalen Projektordner (bei dir im Terminal, nicht in dieser Sandbox):

```bash
git remote add origin https://github.com/Chrism1412/rezeptbuch-card.git
git branch -M main
git push -u origin main
```

Falls dabei nach Zugangsdaten gefragt wird: GitHub akzeptiert seit einiger
Zeit kein Passwort mehr direkt, sondern verlangt entweder einen
**Personal Access Token** (Einstellungen → Developer settings → Personal
access tokens) anstelle des Passworts, oder du richtest **SSH** ein
(`git remote add origin git@github.com:Chrism1412/rezeptbuch-card.git`
mit einem hinterlegten SSH-Key). Für ein einzelnes privates Projekt ist
ein Token meist der schnellere Weg.

## 5. Sauberen Start-Tag setzen

Der Stand, der jetzt veröffentlicht wird, ist bewusst als `1.0.0` markiert -
die während der Entwicklung intern verwendeten Versionsnummern (bis 1.9.1)
waren nie öffentlich und sind im CHANGELOG zu einer einzigen, übersichtlichen
Erstveröffentlichung zusammengefasst. Falls lokal noch alte Tags aus der
Entwicklungsphase existieren (z.B. `v1.2.0`, `v1.9.0`, `v1.9.1`), diese vor
dem ersten Push entfernen und stattdessen `v1.0.0` setzen:

```bash
git tag -d v1.2.0 v1.9.0 v1.9.1   # alte, nie veröffentlichte Tags lokal entfernen (falls vorhanden)
git tag v1.0.0                     # Startversion taggen
git push origin v1.0.0             # Tag mit hochladen
```

**Falls einer dieser Tags (z.B. `v1.9.0`) schon vorher auf GitHub gepusht
wurde:** dort zusätzlich per
```bash
git push origin :refs/tags/v1.9.0   # entfernt den Tag auch auf GitHub
```
löschen (für jeden betroffenen Tag einzeln), und falls dazu bereits ein
GitHub-"Release" erstellt wurde, dieses zusätzlich manuell unter dem Reiter
**"Releases"** löschen - das passiert nicht automatisch mit.

## 6. Nach dem Push: CI kontrollieren

Direkt nach dem ersten Push starten `test.yml` und `hacs.yml` automatisch
(sie sind auf `push`/`pull_request` getriggert). Unter dem Reiter
**"Actions"** im GitHub-Repo lässt sich der Lauf live verfolgen. Nach
wenigen Minuten sollten beide grün sein - dann zeigen auch die Badges im
README automatisch den richtigen Status, ganz ohne weiteres Zutun.

Falls einer der Workflows rot wird: meistens liegt es an fehlenden
Node-/Python-Abhängigkeiten in der CI-Umgebung selbst (nicht am Code) -
der Lauf-Log unter "Actions" zeigt die genaue Fehlermeldung.

## 7. Optional: spätere HACS-Einbindung

Die `hacs.json` ist bereits vorbereitet, damit das Repo später als
**HACS Custom Repository** eingebunden werden kann (Home Assistant
Community Store → Menü → Benutzerdefinierte Repositories → Repo-URL +
Kategorie "Lovelace"). Das ist unabhängig von den obigen Schritten und
kann jederzeit später gemacht werden, sobald das Repo öffentlich auf
GitHub liegt - keine weitere Vorbereitung nötig.

## Kurz-Checkliste

- [ ] `git status` sauber (keine echten Rezepte/Tokens dabei)
- [x] `DEIN-NAME` in `README.md` durch `Chrism1412` ersetzt
- [ ] Leeres Repo auf GitHub angelegt (ohne README/Lizenz/`.gitignore`)
- [ ] `git remote add origin ...` + `git push -u origin main`
- [ ] Alte Entwicklungs-Tags aufgeräumt, Start-Tag `v1.0.0` gepusht
- [ ] Unter "Actions" beide Workflows grün
