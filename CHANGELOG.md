# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.0.1] - 2026-09-25

### Behoben
- **Ausgeschriebene Einheiten wie "Gramm", "Liter", "Glas"/"Gläser" wurden
  bei der automatischen Text-/JSON-Erkennung falsch erkannt**: da die
  interne Einheiten-Erkennung nur bis zur ersten passenden (kürzeren)
  Abkürzung suchte, wurde z. B. bei "400 Gramm Mehl" nur "g" als Einheit
  erkannt und "ramm Mehl" fälschlich Teil des Zutatennamens. Betraf auch
  "Liter" (nur "l" erkannt) sowie "Glas"/"Gläser" (nur "g" erkannt).
- **Veraltete Einrichtungs-Anleitung für die Lokale To-do-Liste**: die
  Dokumentation (README, ANLEITUNG-Backup.md, Kartenkommentar,
  Beispiel-YAML) verwies noch auf Einstellungen → Helfer → "+ Helfer
  hinzufügen", was in aktuellen Home-Assistant-Versionen nicht mehr zum
  Ziel führt - die Lokale To-do-Liste wird dort inzwischen direkt über
  Einstellungen → Geräte & Dienste → Integrationen → "+ Integration
  hinzufügen" → "Lokale To-do" angelegt.

## [1.0.0] - 2026-09-24

Erste öffentliche Version.

### Hinzugefügt
- **Grundfunktion**: Rezepte anlegen/bearbeiten/löschen in einer normalen
  Home-Assistant-Lokalen-To-do-Liste (kein Pyscript, kein separates Backend,
  keine Datenbank), mit Kategorien, Suche und Portionen-Rechner.
- **Bewertungen, Kommentare, Koch-Historie** je Rezept.
- **Rezeptfotos** als echte Dateien statt Base64-Text im JSON.
- **Konflikt-Schutz** bei gleichzeitigem Bearbeiten desselben Rezepts von
  zwei Geräten.
- **PDF-Export**, auch ohne Internetzugang (lokal gehostetes jsPDF).
- **Automatische Rezepterkennung aus eingefügtem Text** (reine
  Offline-Heuristik, keine KI-API): erkennt Bruch-/Komma-Mengen und
  Mengenbereiche ("½ TL", "1,5 EL", "400-500 g"), Zutaten-Unterüberschriften
  ("Für den Teig:"), rein absatzbasierte Zubereitungsschritte sowie deutsche
  und englische Abschnittsüberschriften ("Zutaten"/"Ingredients" usw.).
- **Rezept-Import per URL**: liest schema.org/Recipe-Strukturdaten von der
  Original-Rezeptseite aus (deutlich zuverlässiger als reine Text-Erkennung),
  mit einer einfacheren HTML-Text-Heuristik als Fallback, falls eine Seite
  keine Strukturdaten anbietet.
- **Fertiger Prompt für eine externe KI** beim "JSON einfügen": ein
  "?"-Knopf liefert einen kopierbaren Text, der einer beliebigen externen KI
  (ChatGPT, Claude, Gemini, ...) das von der Karte erwartete JSON-Format
  erklärt - für Fälle, in denen weder Text-Erkennung noch URL-Import
  weiterhelfen (z. B. ein Foto eines handgeschriebenen Rezepts). Kein
  API-Key, keine Kosten, keine Anbindung an einen KI-Dienst durch die Karte
  selbst.
- **Mehrere Tags pro Rezept** zusätzlich zur Kategorie, mit UND-verknüpftem
  Tag-Filter in der Rezeptliste.
- **Automatische Einkaufsliste**: Auswahlmodus in der Rezeptliste fasst die
  Zutaten mehrerer ausgewählter Rezepte zusammen (gleicher Name+Einheit
  summiert) und legt sie in einer zweiten, konfigurierbaren To-do-Liste an.
- **Wochenplan/Meal-Planer**: die 7 Wochentage, je Tag optional ein Rezept
  zuordnen, direkt daraus eine Einkaufsliste erstellen; vergangene Tage
  leeren sich beim Öffnen automatisch, über eine "Folgewoche" lässt sich die
  kommende Woche schon vorplanen.
- **Smarte Sammlungen**: die aktuelle Kombination aus Kategorie + Tags +
  Suchbegriff unter einem Namen speichern und per Klick wieder anwenden -
  aktualisiert sich danach von selbst, wenn passende Rezepte hinzukommen
  oder wegfallen (Erklärungs-Popup "?" direkt daneben).
- **Barrierefreiheit**: Rezept-Kacheln und Sterne-Bewertung sind per
  Tastatur bedienbar (Tab/Enter/Leertaste), die Sterne-Bewertung ist als
  ARIA-Radiogruppe ausgezeichnet, Icon-Buttons ohne sichtbaren Text haben ein
  sprechendes `aria-label`, Farbkontraste erfüllen WCAG-AA, ein sichtbarer
  Fokusring erscheint bei Tastatur-Navigation.
- **Internationalisierung**: alle 24 offiziellen Amtssprachen der EU sowie
  Schwiizerdütsch (25 Sprachen insgesamt) - die Karte folgt automatisch der
  in Home Assistant eingestellten Profilsprache, mit Deutsch als bewusstem
  Standard/Rückfall.
- **HACS-Unterstützung**: Installation als benutzerdefiniertes HACS-Custom-
  Repository.
- **Schema-Versionierung** für künftige Formatänderungen samt automatischer
  Migration bestehender Rezepte.
- **Projekt-Governance**: CONTRIBUTING.md, Issue-Vorlagen, PR-Vorlage mit
  Selbst-Review-Checkliste, Dependabot für automatische Update-Hinweise.
- **CI**: automatisierte Tests (JavaScript + Python) und ESLint laufen bei
  jedem Push/Pull-Request über GitHub Actions, dazu eine automatisierte
  HACS-Struktur-Validierung.

### Sicherheit
- **Escaping gegen Attribut-Injection**: Rezepttitel oder Bild-Adressen mit
  eingebettetem `"` können nicht aus einem HTML-Attribut ausbrechen und
  z. B. einen Event-Handler einschleusen - wichtig, da Titel/Bilder auch
  automatisiert per URL-Import von einer fremden Webseite übernommen werden
  können.
- **Schutz vor Shell-Injection** in den optionalen Backup-Skripten: ein
  Apostroph in einem Rezepttitel oder Backup-Datum kann das Shell-Quoting in
  `shell_command` nicht mehr aufbrechen.
- **SSRF-Schutz beim URL-Import**: Adressen, die (direkt oder per DNS
  aufgelöst) auf lokale/private/interne IP-Adressen zeigen, werden
  abgelehnt - inklusive jedes Weiterleitungsziels, nicht nur der
  ursprünglich eingegebenen Adresse. Nur noch `http`/`https` wird akzeptiert.
- **Schutz vor Zip-Bomben** beim URL-Import: die Größengrenze gilt auch für
  die entpackte Größe gzip-komprimierter Seiten, nicht nur für die
  übertragenen Daten.
- **Korrektes Escaping von `$`-Zeichen** in übersetzten, mit Nutzerdaten
  befüllten Texten (z. B. Rezepttiteln), damit Sonderzeichen wie `$&` nicht
  als Platzhalter-Syntax fehlinterpretiert werden.

### Bekannte Einschränkungen
- Die Übersetzungen für alle Sprachen außer Deutsch und Englisch sind
  KI-generiert und noch nicht von Muttersprachler:innen gegengelesen -
  Korrekturen per Issue oder Pull Request sind ausdrücklich willkommen.
- Eine Sprachumstellung im Home-Assistant-Profil wird von einer schon
  offenen Karte nicht sofort automatisch übernommen - dafür einmal
  navigieren (z. B. ein Rezept öffnen und zurück) oder die Seite neu laden.
- Gegen sogenanntes "DNS-Rebinding" beim URL-Import schützt die SSRF-Prüfung
  nicht vollständig; das erfordert deutlich mehr Aufwand vom Angreifer, und
  für den privaten Einsatz ist das Restrisiko gering.

### Tests
- Umfangreiche automatisierte Testsuite: 208 Tests für die Karte selbst
  (Playwright, echter Browser) sowie 36 + 7 Python-Tests für die optionalen
  Backup-/Import-Skripte - läuft bei jedem Push/Pull-Request automatisch
  über GitHub Actions, inklusive ESLint und HACS-Struktur-Validierung.
