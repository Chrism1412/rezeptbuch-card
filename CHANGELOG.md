# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.0.4] - 2026-09-26

### Hinzugefügt
- **Seitenweise Rezeptübersicht**: bei vielen Rezepten lässt sich die
  Übersicht jetzt über die neue Kartenoption `items_per_page` in Seiten
  aufteilen (Standard, wenn nicht gesetzt: 20 pro Seite), mit
  Vor-/Zurück-Navigation und Seitenanzeige. Ein Wechsel von Suche,
  Sortierung, Kategorie-, Tag- oder Kochbuch-Filter setzt die Ansicht
  automatisch wieder auf Seite 1 zurück.
- **Versionshinweis in der Rezeptübersicht**: zeigt unten dezent die
  aktuell installierte Kartenversion (`vX.Y.Z`) an.
- **Eigener Update-Hinweis**: die Karte prüft beim Laden zusätzlich zur
  automatischen Update-Erkennung von HACS selbst über die öffentliche
  GitHub-API, ob eine neuere Version veröffentlicht wurde, und zeigt bei
  Bedarf einen wegklickbaren Hinweis mit Link zur Release-Seite an - rein
  informativ, ohne Internetzugang bleibt die Karte einfach ohne Hinweis.
  Einmal weggeklickt, erscheint der Hinweis für dieselbe Version nicht
  erneut.

### Behoben
- **"Teilen / Drucken" tat in der Home-Assistant-App (bzw. anderen
  eingebetteten WebViews ohne Web-Share-API) scheinbar gar nichts**: die
  letzte Rückfallebene (ein unsichtbarer Download-Link) wird von solchen
  Apps oft stillschweigend ignoriert. Die Karte öffnet die erzeugte PDF-
  bzw. HTML-Datei jetzt stattdessen über `window.open()` in einem neuen
  Tab - das wird von der App an den System-Browser/-Betrachter
  weitergegeben, wo sich die Datei normal öffnen, speichern, teilen oder
  drucken lässt. Nur falls das (z. B. durch einen Popup-Blocker) verhindert
  wird, greift weiterhin der klassische Download-Link als letzter Versuch.
- **Rezeptbild im PDF-Export war verzerrt/seitlich gestreckt**: Die
  70mm-Höhenbegrenzung für das Bild kappte bisher nur die Höhe, ließ die
  Breite aber auf voller Seitenbreite stehen - dadurch wurde jedes Bild,
  das diese Grenze erreichte (z. B. breite/querformatige Fotos), optisch
  in die Breite gezogen. Die Breite wird jetzt proportional mit
  verkleinert und das (dann schmalere) Bild horizontal zentriert.

### Geändert
- **PDF-Export zeigt jetzt, wenn es auf eine Seite passt, dieselbe
  zweispaltige Aufteilung wie die Detailansicht der Karte auf breiten
  Bildschirmen**: Bild und Zutaten links, Zubereitung rechts. Ist ein
  Rezept dafür zu lang (würde nicht zweispaltig auf eine Seite passen),
  nutzt der Export automatisch weiterhin die bisherige einspaltige, über
  mehrere Seiten laufende Darstellung, damit nichts abgeschnitten wird.

## [1.0.2] - 2026-09-25

### Hinzugefügt
- **Neue Kartenoption `ask_cooked: false`**: schaltet die "Hast du
  zubereitet?"-Abfrage beim Verlassen eines geöffneten Rezepts komplett
  ab, für alle, die diese Nachfrage nicht möchten. Bereits erfasste
  Zubereitungen (`cookLog`) bleiben dabei erhalten, es kommen nur keine
  neuen mehr hinzu.
- **Neue Statistik-Auswertung**: ein "Statistik"-Knopf im Kopfbereich der
  Rezeptliste (nur sichtbar, solange die Abfrage oben nicht per
  `ask_cooked: false` abgeschaltet ist) zeigt "Du hast in 2026 Xx aus
  deinem Rezeptbuch gekocht" sowie "insgesamt", dazu die 5 meistgekochten
  Rezepte - ein "?"-Knopf daneben erklärt kurz, was gezählt wird. Reine
  Client-seitige Auswertung der bereits vorhandenen `cookLog`-Daten,
  kein zusätzliches Skript, keine Datenbank, keine Automation nötig.
- **Zweispaltige Detailansicht auf breiten Bildschirmen**: ab ca. 700px
  Breite zeigt die Rezept-Detailansicht Bild+Zutaten links und die
  Zubereitung rechts nebeneinander an, statt wie bisher alles in einer
  einzigen, auf schmalen Bildschirmen absichtlich schmal gehaltenen Spalte
  untereinander - dort musste bislang lange gescrollt werden, um zwischen
  Zutaten und Anleitung hin- und herzuspringen. Das greift dank der
  bewusst niedrig angesetzten Grenze auch auf einem normalen Handy im
  **Querformat** (typischerweise 650-930px breit), ganz ohne eigens
  aktivierte "Desktopwebseite" im mobilen Browser. Auf einem Handy im
  Hochformat bleibt die einspaltige Ansicht unverändert erhalten.

### Behoben
- **Rezeptbild füllte auf Handys im Querformat (ohne "Desktopwebseite")
  fast den kompletten Bildschirm, teils sogar über den sichtbaren Bereich
  hinaus**: das Bild skalierte bisher rein über sein Seitenverhältnis
  (16:9) mit der Container-BREITE - bei wenig Bildschirm-HÖHE (typisch für
  Querformat auf dem Handy, aber auch auf breiten PC-Monitoren) wurde es
  dadurch unverhältnismäßig hoch. Eine zusätzliche Begrenzung relativ zur
  sichtbaren Bildschirmhöhe (42vh) sorgt jetzt dafür, dass darunter immer
  noch etwas vom restlichen Inhalt sichtbar bleibt. Auf Hochformat-Handys
  (wo ohnehin genug Höhe vorhanden ist) ändert sich dadurch nichts.

## [1.0.1] - 2026-09-25

### Behoben
- **Ausgeschriebene Einheiten wie "Gramm", "Liter", "Glas"/"Gläser" wurden
  bei der automatischen Text-/JSON-Erkennung falsch erkannt**: da die
  interne Einheiten-Erkennung nur bis zur ersten passenden (kürzeren)
  Abkürzung suchte, wurde z. B. bei "400 Gramm Mehl" nur "g" als Einheit
  erkannt und "ramm Mehl" fälschlich Teil des Zutatennamens. Betraf auch
  "Liter" (nur "l" erkannt) sowie "Glas"/"Gläser" (nur "g" erkannt).
- **Einkaufsliste führte Zutaten mit unterschiedlich geschriebener, aber
  gleicher Einheit nicht zusammen** (z. B. "1 g Salz" aus einem Rezept und
  "1 Gramm Salz" aus einem anderen landeten als zwei getrennte Zeilen auf
  der Einkaufsliste): eine kleine Synonym-Tabelle für die gängigsten Fälle
  ("g"/"gr"/"Gramm", "kg"/"Kilo"/"Kilogramm", "ml"/"Milliliter",
  "l"/"Liter", "EL"/"Esslöffel", "TL"/"Teelöffel") sorgt jetzt dafür, dass
  diese bei der Aggregation als eine Einheit gelten. Bewusst weiterhin ohne
  Einheiten-Umrechnung (z. B. g <-> kg) - nur textuelle Gleichsetzung
  offensichtlicher Synonyme derselben Einheit. Zusätzlich erkennt die
  Text-/JSON-Erkennung jetzt auch die Abkürzung "gr" für Gramm.
- **Veraltete Einrichtungs-Anleitung für die Lokale To-do-Liste**: die
  Dokumentation (README, ANLEITUNG-Backup.md, Kartenkommentar,
  Beispiel-YAML) verwies noch auf Einstellungen → Helfer → "+ Helfer
  hinzufügen", was in aktuellen Home-Assistant-Versionen nicht mehr zum
  Ziel führt - die Lokale To-do-Liste wird dort inzwischen direkt über
  Einstellungen → Geräte & Dienste → Integrationen → "+ Integration
  hinzufügen" → "Lokale To-do" angelegt.

### Hinzugefügt
- **Tipp zur Panel-Ansicht in der README**: Hinweis samt fertigem YAML-
  Beispiel, wie sich die Karte über eine eigene Home-Assistant-**Panel**-
  Ansicht (statt der schmaleren Standard-Sections-Ansicht) auf die volle
  Bildschirmbreite bringen lässt - reine Dokumentation, keine Code-Änderung
  an der Karte selbst.
- **Neuer README-Abschnitt "Aktualisieren"**: Hinweis, dass nach einem
  Update der `rezeptbuch-card.js` oft ein Versions-Parameter an der
  Ressourcen-URL (z. B. `/local/rezeptbuch-card.js?v=2`) nötig ist, damit
  Home Assistant die neue Version auch wirklich lädt statt eine
  zwischengespeicherte alte Version weiterzuverwenden.

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
- Umfangreiche automatisierte Testsuite: 222 Tests für die Karte selbst
  (Playwright, echter Browser) sowie 36 + 7 Python-Tests für die optionalen
  Backup-/Import-Skripte - läuft bei jedem Push/Pull-Request automatisch
  über GitHub Actions, inklusive ESLint und HACS-Struktur-Validierung.
