# Rezeptbuch-Karte für Home Assistant

<p align="center">
  <img src="https://raw.githubusercontent.com/Chrism1412/rezeptbuch-card/main/docs/logo/logo-wortmarke.png" alt="Rezeptbuch-Karte Logo: aufgeschlagenes Buch, davor überkreuz Kochlöffel und Schneebesen" width="480">
</p>

[![Tests](https://github.com/Chrism1412/rezeptbuch-card/actions/workflows/test.yml/badge.svg)](https://github.com/Chrism1412/rezeptbuch-card/actions/workflows/test.yml)
[![HACS-Validierung](https://github.com/Chrism1412/rezeptbuch-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/Chrism1412/rezeptbuch-card/actions/workflows/hacs.yml)
[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](LICENSE)

Eine Custom-Lovelace-Karte für [Home Assistant](https://www.home-assistant.io/),
die ein komplettes Rezeptbuch verwaltet - Zutaten, Zubereitungsschritte,
Fotos, Bewertungen, Kommentare, Koch-Historie und PDF-Export inklusive.

**Bewusst minimalistischer Ansatz:** Die Karte speichert alle Rezepte als
JSON in der `description` eines Eintrags einer ganz normalen Home-Assistant-
**Lokalen To-do-Liste** (`local_todo`). Kein Pyscript, kein eigenes Backend,
keine Datenbank, keine externe Cloud - nur Home Assistants eingebaute,
seit Jahren stabile To-do-Dienste. Ein paar optionale Python-Skripte (siehe
unten) ergänzen Backup, Fotoverwaltung und automatischen Rezept-Import,
sind für den Grundbetrieb der Karte aber nicht erforderlich.

## Funktionen

- Rezepte anlegen, bearbeiten, löschen, nach Kategorie/Suchbegriff filtern
- Portionen-Rechner (Zutatenmengen skalieren automatisch)
- Bewertungen, Kommentare, Koch-Historie ("zubereitet am ...")
- Rezeptfotos (werden automatisch als echte Dateien statt Base64-Text
  gespeichert, um die To-do-Liste schlank zu halten)
- PDF-Export eines Rezepts, auch ganz ohne Internetzugang
- **Automatische Rezepterkennung** aus eingefügtem Text (reine
  Offline-Mustererkennung, keine KI-API, kein API-Key nötig)
- **JSON-Import mit Prompt-Hilfe**: ein Klick auf "?" neben "Von KI erzeugtes
  JSON einfügen" liefert einen fertigen, kopierbaren Text für eine externe KI
  (ChatGPT, Claude usw.) - praktisch für unstrukturierte Rezepte (Foto,
  handschriftliche Notiz), bei denen die automatische Erkennung an ihre
  Grenzen stößt. Auch dafür keine KI-Anbindung durch die Karte selbst.
- **Rezept-Import per URL**: liest die bei den meisten Rezeptseiten
  ohnehin eingebauten schema.org/Recipe-Strukturdaten aus (siehe
  [Rechtliches](#rechtliches) unten)
- Konflikt-Schutz, falls zwei Geräte gleichzeitig dasselbe Rezept bearbeiten
- **Automatische Einkaufsliste**: mehrere Rezepte auswählen und ihre
  Zutaten (gleicher Name+Einheit summiert) in eine zweite To-do-Liste
  übertragen
- **Wochenplan**: jedem Wochentag ein Rezept zuordnen, direkt daraus eine
  Einkaufsliste erstellen - kein weiterer Helfer nötig; vergangene Tage
  werden automatisch geleert, eine zusätzlich planbare Folgewoche rückt
  automatisch nach, sobald die aktuelle Woche vorbei ist
- **Mehrere Tags pro Rezept** zusätzlich zur Kategorie, UND-verknüpfter
  Tag-Filter sowie als "Smarte Sammlung" speicherbare Filter-Kombinationen
  (aktualisiert sich automatisch, sobald passende Rezepte hinzukommen oder
  wegfallen - ein "?" daneben erklärt das im Detail)
- **Breiterer URL-Import**: findet eine Seite kein schema.org/Recipe, greift
  automatisch ein einfacherer Text-Heuristik-Fallback
- **Rezept dauerhaft aus allen Backups entfernen**: verhindert, dass ein
  gelöschtes Rezept beim Wiederherstellen eines alten Backups ungewollt
  zurückkehrt
- **Barrierefreiheit**: Rezept-Kacheln und Sterne-Bewertung sind per
  Tastatur bedienbar (Tab/Enter/Leertaste), Icon-Buttons haben sprechende
  Beschreibungen für Screenreader, Farben erfüllen WCAG-AA-Kontrast, und
  ein sichtbarer Fokusring zeigt Tastatur-Nutzer:innen jederzeit, welches
  Element gerade aktiv ist
- Automatisierte Testsuite (Playwright, echter Browser, keine Mock-Kopie
  der Kartenlogik) und Schema-Versionierung für künftige Formatänderungen
- **Mehrsprachige Oberfläche (alle 24 offiziellen EU-Sprachen + Schwiizerdütsch)**:
  die Kartensprache wird automatisch anhand der in Home Assistant
  eingestellten Sprache erkannt - bei Deutsch (und wenn die Sprache nicht
  ermittelt werden kann) bleibt alles wie gewohnt Deutsch, jede andere
  EU-Amtssprache (Bulgarisch, Kroatisch, Tschechisch, Dänisch,
  Niederländisch, Englisch, Estnisch, Finnisch, Französisch, Griechisch,
  Ungarisch, Irisch, Italienisch, Lettisch, Litauisch, Maltesisch,
  Polnisch, Portugiesisch, Rumänisch, Slowakisch, Slowenisch, Spanisch,
  Schwedisch) sowie Schwiizerdütsch wird direkt in ihrer eigenen Sprache
  angezeigt, jede sonstige Sprache zeigt Englisch als Rückfall

## Installation

Ausführliche Schritt-für-Schritt-Anleitung: **[docs/ANLEITUNG-Backup.md](docs/ANLEITUNG-Backup.md)**
(auf Deutsch, deckt jede Funktion einzeln ab, inkl. Fehlersuche).

### Grundinstallation (Pflicht)

Reicht für den vollen Funktionsumfang der Karte selbst - kein Python, kein
`shell_command`, keine `scripts.yaml` nötig.

1. `rezeptbuch-card.js` und (für den Offline-PDF-Export)
   `rezeptbuch-jspdf.min.js` nach `/config/www/` kopieren.
2. In Home Assistant eine **Lokale To-do-Liste** anlegen: Einstellungen →
   Geräte & Dienste → **Integrationen** → unten rechts "+ Integration
   hinzufügen" → "Lokale To-do" auswählen → z. B. Name "Rezepte" (erzeugt
   direkt die Entity `todo.rezepte`, kein separater Helfer-Schritt nötig).
3. Dashboard-Ressource hinzufügen: Einstellungen → Dashboards → oben rechts
   die drei Punkte → Ressourcen → "+ Ressource hinzufügen" → URL
   `/local/rezeptbuch-card.js`, Typ **JavaScript-Modul**.
4. Karte einbinden, z. B. im YAML-Modus eines Dashboards:

   ```yaml
   type: custom:rezeptbuch-card
   entity: todo.rezepte
   ```

### Optionale Python-Skripte

Jede der folgenden Funktionen ist unabhängig von den anderen - nur
einrichten, was tatsächlich gebraucht wird. Gemeinsame Basis für alle:
das jeweilige Skript aus `scripts/` nach `/config/scripts/` kopieren, den
passenden `shell_command:`-Eintrag in die eigene `configuration.yaml`
übernehmen und Home Assistant danach **komplett neu starten** (nicht nur
YAML neu laden), damit der `shell_command` als Service verfügbar wird. Wer
lieber alles auf einmal einträgt, findet die komplette Vorlage in
[`examples/configuration.snippet.yaml`](examples/configuration.snippet.yaml).

**Tägliches Backup + Wiederherstellen** ([Details: Anleitung Abschnitt 1-8](docs/ANLEITUNG-Backup.md)):

```yaml
# configuration.yaml
shell_command:
  rezeptbuch_backup_schreiben: "python3 /config/scripts/rezeptbuch_backup.py"
  rezeptbuch_backup_wiederherstellen: "python3 /config/scripts/rezeptbuch_restore.py '{{ backup_datum }}'"
```

Zusätzlich einen Long-Lived-Access-Token erstellen (Profil → ganz unten
"Langlebige Zugangs-Token") und **nur den Token** (keine Anführungszeichen)
in eine neue Datei `/config/scripts/rezeptbuch_backup_token.txt` legen -
das Skript meldet sich damit selbst bei der Home-Assistant-REST-API an.

Für das Wiederherstellen zusätzlich den Inhalt von
[`examples/rezeptbuch_restore_skript.yaml`](examples/rezeptbuch_restore_skript.yaml)
in die eigene **`scripts.yaml`** einfügen (oder im UI unter Einstellungen →
Automatisierungen & Szenen → Skripte ein neues Skript anlegen und im
YAML-Editor ersetzen):

```yaml
# scripts.yaml
rezeptbuch_backup_wiederherstellen:
  alias: "Rezeptbuch: Backup wiederherstellen"
  fields:
    backup_datum:
      name: "Backup-Datum"
      description: "Datum JJJJ-MM-TT oder 'neuestes'"
      default: "neuestes"
      selector:
        text:
  sequence:
    - if:
        - condition: template
          value_template: "{{ not (backup_datum | default('neuestes') | regex_match('^(neuestes|[0-9]{4}-[0-9]{2}-[0-9]{2})$')) }}"
      then:
        - stop: "Ungültiges Format - bitte 'neuestes' oder ein Datum als JJJJ-MM-TT angeben."
    - action: shell_command.rezeptbuch_backup_wiederherstellen
      data:
        backup_datum: "{{ backup_datum | default('neuestes') }}"
  mode: single
```

Das Backup selbst läuft über eine Automatisierung, deren fertiges YAML in
[`examples/rezeptbuch_backup_automatisierung.yaml`](examples/rezeptbuch_backup_automatisierung.yaml)
liegt (Zeit-Trigger auf 23:59 Uhr + einziger Aufruf des `shell_command`).

**Rezeptfotos in echte Dateien auslagern** (statt Base64 im JSON):

```yaml
# configuration.yaml
shell_command:
  rezeptbuch_bilder_verarbeiten: "python3 /config/scripts/rezeptbuch_bilder_verarbeiten.py"
```

```yaml
# scripts.yaml
rezeptbuch_fotos_auslagern:
  alias: "Rezeptbuch: Fotos in Dateien auslagern"
  sequence:
    - action: shell_command.rezeptbuch_bilder_verarbeiten
  mode: single
```

**Rezept-Import per URL:**

```yaml
# configuration.yaml
shell_command:
  rezeptbuch_url_importieren: "python3 /config/scripts/rezeptbuch_url_import.py '{{ url }}'"
```

Kein zusätzlicher `scripts.yaml`-Eintrag nötig - der Import-Knopf in der
Karte ruft den `shell_command` direkt auf.

**Rezept dauerhaft aus allen Backups entfernen** (verhindert ein
ungewolltes Wiederauftauchen bei einem künftigen Restore):

```yaml
# configuration.yaml
shell_command:
  rezeptbuch_backup_bereinigen: "python3 /config/scripts/rezeptbuch_backup_bereinigen.py '{{ titel }}'"
```

```yaml
# scripts.yaml
rezeptbuch_backup_bereinigen:
  alias: "Rezeptbuch: Rezept dauerhaft aus allen Backups entfernen"
  fields:
    titel:
      name: "Rezepttitel"
      description: "Exakter Titel, wie in Home Assistant gespeichert"
      selector:
        text:
  sequence:
    - if:
        - condition: template
          value_template: "{{ \"'\" in titel }}"
      then:
        - stop: "Der Rezepttitel darf kein Apostroph (') enthalten."
    - action: shell_command.rezeptbuch_backup_bereinigen
      data:
        titel: "{{ titel }}"
  mode: single
```

**Einkaufsliste + Wochenplan** brauchen dagegen **keinen** `shell_command`
und **keine** `scripts.yaml` - nur eine zweite Lokale To-do-Liste (über
Integrationen angelegt, z. B. `todo.einkaufsliste`) sowie das zusätzliche
Kartenfeld
`shopping_list_entity:`:

```yaml
type: custom:rezeptbuch-card
entity: todo.rezepte
shopping_list_entity: todo.einkaufsliste
```

## Projektstruktur

```
rezeptbuch-card.js          Die Karte selbst (einzige Pflicht-Datei)
rezeptbuch-jspdf.min.js     Lokal gehostetes jsPDF für Offline-PDF-Export (optional)
scripts/                    Optionale Python-Hilfsskripte (Backup, Restore,
                             Fotoauslagerung, URL-Import) - alle ohne
                             Drittanbieter-Abhängigkeiten, nur Standardbibliothek
examples/                   Beispiel-YAML zum Einbinden in die eigene HA-Konfiguration
docs/                       Ausführliche Installations-/Nutzungsanleitung
test/                       Playwright-Testsuite für die Karte (echter Browser)
```

## Testen

```bash
npm install
npm run lint                                            # ESLint
npm test                                                # Karten-Testsuite (Playwright)
python3 scripts/test_rezeptbuch_url_import.py           # Tests für den URL-Import
python3 scripts/test_rezeptbuch_backup_bereinigen.py    # Tests für die Backup-Bereinigung
```

Läuft bei jedem Push/Pull-Request automatisch über GitHub Actions (siehe
Badges oben), zusammen mit einer automatisierten HACS-Struktur-Validierung.

## Changelog

Siehe [`CHANGELOG.md`](CHANGELOG.md) für die Versionshistorie.

## Rechtliches

Das hier ist keine Rechtsberatung, nur eine kurze Einordnung - im
Zweifel einen Anwalt fragen, insbesondere für eine gewerbliche Nutzung.

- **Lizenz dieses Projekts:** MIT (siehe [`LICENSE`](LICENSE)) - freie
  Nutzung, Veränderung und Weiterverbreitung, auch kommerziell, ohne
  Gewährleistung.
- **Enthaltene Drittanbieter-Bibliothek:** [jsPDF](https://github.com/parallax/jsPDF)
  (ebenfalls MIT-lizenziert) wird unverändert mitgeliefert, siehe
  [`NOTICE.md`](NOTICE.md). Der Lizenzkopf in `rezeptbuch-jspdf.min.js`
  darf bei Weiterverbreitung nicht entfernt werden.
- **URL-Import (`scripts/rezeptbuch_url_import.py`):** liest ausschließlich
  öffentlich zugängliche, von der jeweiligen Seite selbst eingebettete
  schema.org/Recipe-Strukturdaten aus (dieselben Daten, die z. B. Google für
  Rezept-Rich-Snippets nutzt) - vergleichbar mit dem manuellen Kopieren
  eines Rezepttexts für den Eigenbedarf, nur automatisiert. Es werden keine
  Inhalte dauerhaft gespeichert/weiterverbreitet, sondern nur einzelne
  Felder (Titel, Zutaten, Schritte, Bild-Link) in die eigene, private
  Rezeptsammlung übernommen. Trotzdem gilt: die Nutzungsbedingungen
  mancher Seiten untersagen automatisierte Abrufe unabhängig vom Zweck -
  das liegt in der Verantwortung der Nutzerin/des Nutzers, nicht des
  Skripts selbst. Für eine öffentliche/gewerbliche Weiterverbreitung
  importierter Rezeptinhalte gelten ggf. andere (strengere) Maßstäbe als
  für die rein private Nutzung, für die dieses Skript gedacht ist.
- **Keine echten Nutzerdaten in diesem Repository:** enthalten sind nur
  Karte, Skripte und eine Beispiel-Konfiguration - keine echten Rezepte,
  Zugangsdaten oder persönlichen Home-Assistant-Einstellungen. Falls du
  eigene Backups, deine echte `configuration.yaml` oder eine
  Long-Lived-Access-Token-Datei in diesem Ordner ablegst: `.gitignore`
  schließt gängige Fälle (`*_token.txt`, `Backup-Rezepte/`) bereits aus,
  vor dem ersten Push aber sicherheitshalber trotzdem selbst `git status`
  prüfen.

## Mitmachen

Issues und Pull Requests sind willkommen - insbesondere Rückmeldungen zu
Rezeptseiten, bei denen die automatische Text- oder URL-Erkennung
(Abschnitte 13/14 der Anleitung) nicht wie erwartet funktioniert. Details zu
Testpflicht, Architektur-Grundsätzen und dem Ablauf für Pull Requests siehe
[`CONTRIBUTING.md`](CONTRIBUTING.md).
