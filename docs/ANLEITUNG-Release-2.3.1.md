# Release 2.3.1 veröffentlichen

1. **Projekt aktualisieren:** `rezeptbuch-card-2.3.1.zip` entpacken und alle Dateien im Projektordner ersetzen. Den Ordner `.git` nicht löschen.

2. **Git Bash im Projektordner** (Rechtsklick → „Git Bash here"):

```bash
git pull --no-rebase origin main
git status
git push origin main
git tag -a v2.3.1 -m "Version 2.3.1"
git push origin v2.3.1
```

Öffnet sich beim Pull ein Editor, speichern und schließen (vim: `:wq`, nano: Strg+X).

3. **Actions prüfen:** Auf GitHub im Reiter „Actions" sollten `test.yml` und `hacs.yml` grün sein.

4. **Release erstellen:** `github.com/Chrism1412/rezeptbuch-card/releases` → „Draft a new release".
   - Tag: `v2.3.1`
   - Titel: `Version 2.3.1`
   - Beschreibung: Inhalt von `docs/RELEASE-BESCHREIBUNG-2.3.1.md`
   - Dateien: alle 28 Dateien aus `rezeptbuch-release-dateien-2.3.1.zip` entpacken und unter „Attach binaries" hineinziehen (Karte, 26 Sprachdateien, jsPDF)
   - „Set as the latest release" angehakt lassen → „Publish release"

5. **Aktualisieren:** HACS → „Rezeptbuch Card" → Neu laden → Aktualisieren. Danach `?v=...` bei der Ressource erhöhen und die App neu starten.

6. **Danach:** Facebook-Post veröffentlichen und auf Issue #13 antworten.
