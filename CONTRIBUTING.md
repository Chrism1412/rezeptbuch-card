# Mitmachen

Danke für dein Interesse an diesem Projekt! Es ist ein Einzelprojekt für den
privaten Gebrauch, Beiträge sind trotzdem willkommen - insbesondere
Rückmeldungen zu Rezeptseiten, bei denen die automatische Text- oder
URL-Erkennung nicht wie erwartet funktioniert.

## Fehler melden / Funktion vorschlagen

Bitte über [Issues](../../issues) melden, am besten mit der passenden
Vorlage (Fehlerbericht oder Funktionswunsch). Bei einem Fehler helfen
folgende Angaben besonders:

- Was genau ist passiert, was hättest du erwartet?
- Home-Assistant-Version, Browser (falls relevant für die Karte selbst)
- Bei einem Import-/Erkennungsproblem: die betroffene Rezept-URL bzw. der
  eingefügte Text (bitte prüfen, ob dabei private Daten enthalten sind)
- Relevante Ausschnitte aus dem Log (`/config/scripts/*.log` bei den
  Python-Skripten, Browser-Konsole bei der Karte selbst)

## Code beitragen

1. Repository forken, Änderung in einem eigenen Branch vornehmen.
2. **Tests lokal ausführen, bevor ein Pull Request erstellt wird:**
   ```bash
   npm install
   npm run lint
   npm test                                                # Karten-Testsuite (Playwright)
   python3 scripts/test_rezeptbuch_url_import.py           # Tests für den URL-Import
   python3 scripts/test_rezeptbuch_backup_bereinigen.py    # Tests für die Backup-Bereinigung
   ```
   Läuft zusätzlich automatisch über GitHub Actions bei jedem Pull Request
   (siehe Badges in der README) - ein PR mit fehlschlagenden Tests wird
   nicht gemergt.
3. **Für jede neue Funktion oder jeden Bugfix einen passenden
   Regressionstest ergänzen** (JS-Test in `test/rezeptbuch-card.test.js`
   bzw. Python-Test in `scripts/test_*.py`, je nachdem was betroffen ist).
   Das ist in diesem Projekt durchgängige Praxis - siehe die Testfälle für
   frühere Fixes (z. B. Attribut-Injection, Barrierefreiheit) als Vorbild.
4. `CHANGELOG.md` um einen Eintrag unter der jeweils passenden Kategorie
   ergänzen (Hinzugefügt / Behoben / Sicherheit) und bei Bedarf die Version
   in `package.json` anheben (Semantic Versioning: Patch für Fixes, Minor
   für neue, abwärtskompatible Funktionen).
5. Bei einer neuen Funktion, die eine Konfiguration oder Einrichtung
   erfordert: einen neuen Abschnitt in `docs/ANLEITUNG-Backup.md` sowie
   einen Stichpunkt in der README unter "Funktionen" ergänzen.

## Architektur-Grundsätze (bitte beibehalten)

Diese Entscheidungen sind bewusst getroffen - Änderungen daran bitte vorher
per Issue diskutieren:

- **Eine einzige JavaScript-Datei** (`rezeptbuch-card.js`) ohne Build-Schritt:
  Installation bleibt "Datei nach `/config/www/` kopieren, fertig" - kein
  `npm run build`, kein Bundler-Output, den man stattdessen kopieren müsste.
- **Kein Pyscript, kein separates Backend, keine Datenbank** - alle Daten
  stecken als JSON in der `description` einer normalen Home-Assistant-
  Lokalen-To-do-Liste. Die optionalen Python-Skripte unter `scripts/` sind
  eigenständig, laufen nur über `shell_command` und sind für den
  Grundbetrieb der Karte nicht erforderlich.
- **Jede Stelle, an der Nutzereingaben oder Daten von fremden Webseiten
  (URL-Import) in HTML eingefügt werden, muss über `_escape()` laufen** -
  siehe den Kommentar direkt an der Funktion für den Hintergrund
  (Attribut-Injection) - siehe CHANGELOG zum Hintergrund.
- **Jeder `shell_command`-Parameter, der letztlich von außen beeinflussbar
  ist** (Rezepttitel, importierte URL, Backup-Datum), muss vor der
  Verwendung geprüft werden (Apostroph-Sperre oder Positivliste) - siehe
  CHANGELOG zum Hintergrund (Shell-Injection).
- **Jeder Text, den eine Nutzerin/ein Nutzer tatsächlich sieht** (Knopf-
  beschriftungen, Platzhalter, `alert()`/`confirm()`-Texte, aria-label/
  title-Attribute, Leerzustände usw.) muss über `_t()` und die
  `UEBERSETZUNGEN`-Tabelle laufen statt als hart codierter String im
  restlichen Code zu stehen.

## Eine neue Sprache ergänzen

Die Karte übersetzt bereits alle 24 offiziellen Amtssprachen der EU sowie
Schwiizerdütsch (Bulgarisch, Kroatisch, Tschechisch, Dänisch, Niederländisch,
Englisch, Estnisch, Finnisch, Französisch, Deutsch, Griechisch, Ungarisch,
Irisch, Italienisch, Lettisch, Litauisch, Maltesisch, Polnisch,
Portugiesisch, Rumänisch, Schwiizerdütsch, Slowakisch, Slowenisch, Spanisch,
Schwedisch) - Deutsch ist dabei bewusst Standard und Rückfall (siehe oben,
"Eine einzige JavaScript-Datei"). Für jede dieser Sprachen fehlt also nichts
mehr zu tun. Wichtiger Hinweis zur Qualität: Alle Übersetzungen außer
Deutsch und Englisch wurden KI-generiert und noch nicht von
Muttersprachler:innen gegengelesen - Korrekturen per Issue oder Pull Request
sind ausdrücklich willkommen.

Für eine 25. Sprache (z.B. eine Nicht-EU-Sprache, oder eine RTL-Sprache wie
Arabisch oder Hebräisch) braucht es dafür KEINE neue Datei und KEINEN
Build-Schritt, nur Ergänzungen in `rezeptbuch-card.js` selbst - nach exakt
demselben Muster wie die bestehenden 24 Sprachen:

1. In der `UEBERSETZUNGEN`-Tabelle nahe des Dateianfangs einen neuen
   Sprachschlüssel (z.B. `tr` für Türkisch) mit demselben Aufbau wie
   `de`/`en` ergänzen - JEDER Schlüssel aus `de` muss dort eine Übersetzung
   bekommen, sonst greift beim Rendern automatisch der deutsche Rückfall aus
   `RezeptbuchCard._t()` (kein Fehler, aber eine unvollständig übersetzte
   Oberfläche). Ein kurzes Node-Skript, das `Object.keys()` aller
   Sprachblöcke vergleicht, hilft beim Prüfen auf Vollständigkeit (154
   Schlüssel je Sprache, Stand 1.6.0).
2. Den neuen Sprachcode in `UNTERSTUETZTE_SPRACHEN` (direkt unterhalb von
   `UEBERSETZUNGEN`) ergänzen, damit `RezeptbuchCard._sprache()` die neue
   Sprache auch tatsächlich ERKENNT: aktuell fällt dort jede nicht in
   `UNTERSTUETZTE_SPRACHEN` enthaltene Sprache automatisch auf "en" zurück
   (mangels weiterer Übersetzungen).
3. Neuen Regressionstest in `test/rezeptbuch-card.test.js` ergänzen (analog
   zu `testInternationalisierung`/`testWeitereEuSprachen`):
   `window.__karte._hass.language` auf den neuen Sprachcode setzen, neu
   rendern (`window.__karte._render()` bzw. `await window.__karte._zurListe()`),
   ein paar repräsentative Texte prüfen. Bei einer RTL-Sprache zusätzlich
   prüfen, ob am Wurzelelement ein passendes `dir="rtl"` gesetzt werden muss
   (aktuell nicht der Fall, da alle 24 eingebauten Sprachen LTR sind).

## Verhaltenskodex

Es gibt (noch) keinen gesonderten Verhaltenskodex - ein respektvoller,
sachlicher Umgangston in Issues und Pull Requests wird als selbstverständlich
vorausgesetzt.
