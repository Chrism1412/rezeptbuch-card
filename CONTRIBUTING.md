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
   anheben (Semantic Versioning: Patch für Fixes, Minor für neue,
   abwärtskompatible Funktionen, Major für größere/mehrere neue
   Kernfunktionen auf einmal oder Breaking Changes) - **an zwei Stellen
   synchron**: `package.json` (`"version"`) UND `rezeptbuch-card.js`
   (`const CARD_VERSION = "..."`, wird für den Versionshinweis in der
   Karte und den GitHub-Update-Check verwendet). Den eigentlichen
   Release-Vorgang (Tag setzen, GitHub-Release erstellen) beschreibt
   [`docs/ANLEITUNG-Release-veroeffentlichen.md`](docs/ANLEITUNG-Release-veroeffentlichen.md).
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

Seit Version 2.3.0 stehen Russisch (`ru`) und Türkisch (`tr`) ebenfalls zur
Verfügung. Für eine weitere Sprache (z.B. eine andere Nicht-EU-Sprache oder
eine RTL-Sprache wie Arabisch oder Hebräisch) wird **eine neue kleine Datei**
angelegt - `rezeptbuch-card.js` selbst enthält nur Deutsch und bleibt dabei
unangetastet:

1. Eine bestehende Sprachdatei (z.B. `rezeptbuch-sprache-pl.js`) nach
   `rezeptbuch-sprache-<code>.js` kopieren (`<code>` = Sprachcode von Home
   Assistant, z.B. `ar`; die Datei liegt im Hauptordner des Repos, weil HACS
   nur dort liegende `.js`-Dateien mit ausliefert) und ALLE Texte
   übersetzen. Aufbau: `texte` (jeder Schlüssel aus `UEBERSETZUNGEN.de`,
   mit denselben `{{Platzhaltern}}`) und `zutaten` (die 70 Namen der
   Umrechnungstabelle in derselben Reihenfolge wie `UMRECHNUNGSTABELLE_NAMEN.de`).
   Die Datei registriert sich selbst über
   `(window.__rezeptbuchSprachen = window.__rezeptbuchSprachen || {}).<code> = {...}`
   und ist bewusst ein normales Skript (kein JSON, kein ES-Modul).
2. Den Sprachcode in `UNTERSTUETZTE_SPRACHEN` (in `rezeptbuch-card.js`)
   ergänzen, damit `RezeptbuchCard._sprache()` die Sprache erkennt: jede dort
   nicht enthaltene Sprache fällt auf "en" zurück.
3. `node test/sprachen-pruefen.js` ausführen: prüft, dass jede Sprachdatei
   genau dieselben Schlüssel wie `de` hat (aktuell 312), dass die
   Platzhalter übereinstimmen und alle im Code benutzten Schlüssel
   existieren.
4. Die Datei in `eslint.config.js` ist bereits über das Muster
   `rezeptbuch-sprache-*.js` abgedeckt; bei einer RTL-Sprache zusätzlich
   prüfen, ob am Wurzelelement ein `dir="rtl"` nötig ist (aktuell nicht der
   Fall, alle eingebauten Sprachen sind LTR).
5. Beim Veröffentlichen die neue Datei als Release-Datei mit anhängen (siehe
   `docs/ANLEITUNG-Release-veroeffentlichen.md`).

## Verhaltenskodex

Es gibt (noch) keinen gesonderten Verhaltenskodex - ein respektvoller,
sachlicher Umgangston in Issues und Pull Requests wird als selbstverständlich
vorausgesetzt.
