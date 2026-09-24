## Was ändert dieser Pull Request?

<!-- Kurze Beschreibung: was wurde geändert und warum? -->

## Checkliste

- [ ] `npm run lint` und `npm test` laufen lokal durch
- [ ] `python3 scripts/test_rezeptbuch_url_import.py` läuft durch (falls betroffen)
- [ ] `python3 scripts/test_rezeptbuch_backup_bereinigen.py` läuft durch (falls betroffen)
- [ ] Neue/geänderte Funktionalität hat einen passenden Regressionstest
- [ ] `CHANGELOG.md` wurde ergänzt (Hinzugefügt / Behoben / Sicherheit)
- [ ] `package.json`-Version wurde bei Bedarf angehoben (Semantic Versioning)
- [ ] Doku aktualisiert, falls die Änderung eine neue Einrichtung erfordert (`docs/ANLEITUNG-Backup.md`, README "Funktionen")
- [ ] Jede neu eingefügte Nutzereingabe (Rezepttitel, Zutaten, URL-Import-Ergebnis, ...) läuft beim Rendern durch `_escape()`
- [ ] Falls ein neuer `shell_command`-Parameter hinzukommt: Eingabe wird vor der Verwendung geprüft (Apostroph-Sperre oder Positivliste, siehe CONTRIBUTING.md)

## Selbst-Review

<!--
Dieses Projekt hat aktuell keinen zweiten Maintainer für ein Code-Review.
Bitte den Diff einmal bewusst aus der Perspektive einer fremden Person
durchgehen, bevor der PR gemergt wird - insbesondere:
-->

- [ ] Ich habe den vollständigen Diff noch einmal selbst durchgesehen (nicht nur die eigenen neuen Zeilen)
- [ ] Ich habe mir überlegt, wie sich die Änderung mit bösartigen/fehlerhaften Eingaben verhält (leerer String, sehr langer Text, Sonderzeichen, `null`/`undefined`)
