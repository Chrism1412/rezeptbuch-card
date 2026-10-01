# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [2.1.0] - 2026-10-01

Vier über die GitHub-Issue-Vorlage eingereichte Verbesserungsvorschläge
umgesetzt (eine fünfte Anfrage - eigene Hauptkategorien - gab es bereits
seit [2.0.0]).

### Hinzugefügt
- **Kommentare bearbeiten/löschen**: eigene Kommentare zu einem Rezept
  lassen sich jetzt nachträglich bearbeiten und löschen; ein
  Home-Assistant-Admin darf das zusätzlich bei JEDEM Kommentar (nicht nur
  den eigenen). Alte, vor diesem Update verfasste Kommentare bleiben wie
  gewohnt für alle offen (keine hinterlegte Nutzer-Zuordnung). Löschen
  läuft über ein eigenes Bestätigungs-Modal, nicht über den nativen
  Browser-Dialog (der verhält sich in der Home-Assistant-Begleit-App
  unzuverlässig).
- **Amerikanische Maßeinheiten**: `cup`, `tbsp`/`tablespoon`,
  `tsp`/`teaspoon`, `oz`/`ounce`, `lb`/`pound`, `pt`/`pint`, `qt`/`quart`,
  `gal`/`gallon` und `fl oz`/`fluid ounce` werden bei der
  Zutaten-Texterkennung jetzt korrekt als Einheit erkannt (z.B. bei per KI
  erzeugtem JSON aus einem amerikanischen Rezept) statt versehentlich Teil
  des Zutatennamens zu werden.
- **Automatische Umrechnung amerikanischer Maßeinheiten**: Volumenangaben
  (`cup`, `tbsp`, `tsp`, `fl oz`, `pt`, `qt`, `gal`) werden bei der
  Zutaten-Erkennung jetzt automatisch EXAKT in Milliliter bzw. Liter
  umgerechnet, Gewichtsangaben (`oz`, `lb`) in Gramm bzw. Kilogramm -
  inklusive Brüchen ("1/2 cup"), Unicode-Bruchzeichen ("½ TL"), gemischten
  Zahlen ("1 1/2 cups") und Mengenbereichen ("1-2 cups"). Es handelt sich
  bewusst NUR um gleichartige Umrechnung (Volumen → Volumen, Gewicht →
  Gewicht) mit festen mathematischen Faktoren - keine Umrechnung zwischen
  Volumen und Gewicht (z.B. "1 cup Mehl" → Gramm), da das die Dichte der
  jeweiligen Zutat kennen müsste und damit Raten wäre. Für genau diesen
  Fall gibt es stattdessen die neue, rein informative Umrechnungstabelle
  (siehe unten).
- **Umrechnungstabelle (Hauptmenü)**: neuer Knopf "📐 Umrechnungstabelle"
  öffnet ein Nachschlage-Popup mit Richtwerten in Gramm für 70 in der
  Küche häufig verwendete Zutaten (je 1 Tasse/EL/TL, soweit praktisch
  üblich), mit Suchfeld zum schnellen Filtern - inklusive der Zutatennamen
  selbst in allen 25 unterstützten Sprachen. Bewusst komplett unabhängig
  von echten Rezeptdaten - die Werte dienen nur zum manuellen Nachschlagen
  und werden NIE automatisch auf ein Rezept angewendet, da sie je nach
  Marke/Konsistenz der Zutat variieren können.
- **Einstellung "Kategorie für amerikanische Rezepte"**: im
  Einstellungen-Popup (⚙️) lässt sich jetzt eine Kategorie auswählen
  (z.B. eine selbst angelegte Kategorie "Amerikanisch"). Bei Rezepten mit
  genau dieser Kategorie erscheint der "Umrechnungstabelle"-Knopf
  zusätzlich zum Hauptmenü auch direkt im Rezept selbst und im Kochmodus -
  praktisch, um beim Nachkochen eines amerikanischen Rezepts schnell
  nachzuschlagen, ohne zurück zur Übersicht zu müssen. Standardmäßig ist
  keine Kategorie ausgewählt, der Knopf bleibt dann wie bisher nur im
  Hauptmenü.
- **Vorhandene Tags als Vorschlag**: beim Anlegen/Bearbeiten eines
  Rezepts zeigt das Tag-Eingabefeld jetzt (über eine native
  Browser-Vorschlagsliste) bereits an anderen Rezepten vergebene Tags an
  - vermeidet, dass derselbe Tag versehentlich in leicht abweichender
  Schreibweise doppelt angelegt wird.
- **Zubereitungsschritte verschieben**: Schritte im Formular lassen sich
  jetzt per ▲/▼-Knopf nach oben/unten verschieben, statt nur gelöscht oder
  in der Zeile bearbeitet werden zu können. Bewusst Auf/Ab-Knöpfe statt
  Drag&Drop (auf Touch-Geräten/in der Begleit-App erfahrungsgemäß
  unzuverlässig).
- **Neue Kategorie direkt im Rezept-Formular anlegen**: fehlt beim
  Anlegen/Bearbeiten eines Rezepts die passende Kategorie, muss man das
  Formular nicht mehr verlassen (und alle bisherigen Eingaben verwerfen) -
  im Kategorie-Dropdown gibt es dafür jetzt "+ Neue Kategorie", die
  restlichen Formular-Felder bleiben dabei unangetastet erhalten.
- **Kategorie umbenennen**: eine selbst angelegte Kategorie lässt sich
  jetzt per ✎-Knopf umbenennen - alle Rezepte, die sie verwenden, werden
  dabei automatisch auf den neuen Namen aktualisiert.

### Geändert
- **Kategorien verwalten nur noch für Admins**: eine eigene Kategorie
  umzubenennen oder zu löschen geht jetzt nur noch für HA-Admins (wirkt
  sich schließlich auf ALLE Rezepte mit dieser Kategorie aus). Neue
  Kategorien anlegen bleibt bewusst für jeden Nutzer offen.
- Der "+ Neue Kategorie"-Knopf in der Übersicht hebt sich jetzt per
  gestricheltem Rand von den normalen Kategorie-Filter-Chips ab, damit er
  zwischen vielen Kategorien nicht mehr so leicht übersehen wird.

## [2.0.0] - 2026-09-28

Erstes veröffentlichtes Update seit `v1.0.4` - fasst alle seitdem
angesammelten, aber nie einzeln veröffentlichten Änderungen (intern
zwischenzeitlich als 1.0.5 geführt) in einer Version zusammen. Der
Sprung auf eine neue Hauptversion (statt z.B. `1.1.0`) spiegelt den
Umfang wider: Kochmodus (inkl. Timer) und Sammel-PDF-Export sind
komplett neue Kernfunktionen.

### Hinzugefügt
- **Kochmodus**: neue Vollbild-Schritt-für-Schritt-Ansicht in der
  Detailansicht (Knopf "Kochmodus", nur sichtbar wenn Zubereitungsschritte
  vorhanden sind) - zeigt jeweils einen Schritt groß und gut lesbar an, mit
  Vor-/Zurück-Navigation, einer optional einblendbaren Zutatenliste sowie
  einem eingebauten Timer (Minuten-Schnellauswahl oder eigene Minutenzahl,
  Restzeit-Anzeige auch direkt am Timer-Knopf, akustisches Signal plus
  Vibration bei Ablauf). Der Timer läuft dabei bewusst auch weiter, wenn
  man das Kochmodus-Overlay zwischendurch schließt (z.B. um kurz die
  Zutatenliste zu prüfen) - erst beim Verlassen des Rezepts wird er
  zurückgesetzt. Praktisch am Tablet in der Küche, ohne beim Kochen lange
  scrollen zu müssen. Zusätzlich hält die Karte über die Screen-Wake-Lock-
  API des Browsers den Bildschirm wach, solange der Kochmodus offen ist -
  kein ständiges Neu-Entsperren mehr beim Kochen (Browser ohne
  Unterstützung dieser API: der Kochmodus funktioniert unverändert, nur
  ohne diesen Zusatzkomfort).
- **Sammel-PDF**: neuer Knopf "Sammel-PDF" in der Rezeptübersicht
  exportiert Rezepte als ein einziges PDF, ein Rezept pro (mindestens
  einer) Seite - z.B. praktisch für einen Sammelausdruck. Beim Erstellen
  lässt sich wählen, ob alle aktuell gefilterten/gesuchten Rezepte
  (unabhängig von der Seiten-Paginierung) oder nur einzeln angehakte
  Rezepte aus einer Checkliste ins PDF sollen. Danach wird optional
  gefragt, ob zusätzlich zwei Seiten mit einem selbst gewählten
  Kochbuch-Namen vorangestellt werden sollen: zuerst ein Deckblatt (Name
  groß, in einer eleganten, fetten Schrift und zentriert, darunter
  eine Foto-Collage aus bis zu 6 Fotos
  der enthaltenen Rezepte, wie locker hingelegte Polaroids in
  unterschiedlichen Größen überlappend angeordnet), danach eine
  Inhaltsverzeichnis-Seite mit der nummerierten Rezeptliste. Die Rezepte
  im PDF (und im Inhaltsverzeichnis) sind dabei immer nach Kategorie
  sortiert, unabhängig von Tags oder der aktuellen Sortierung der
  Übersicht.
- **Eigene Kategorien**: über einen neuen "+ Neue Kategorie"-Knopf im
  Filterbereich der Übersicht lassen sich zusätzlich zu den elf fest
  eingebauten Kategorien beliebig eigene anlegen - sie erscheinen sofort
  als Filter-Chip und als Option im Formular-Dropdown. Eine eigene
  Kategorie lässt sich per "✕" am Chip wieder löschen, aber erst, wenn
  kein Rezept sie mehr verwendet (sonst erscheint ein Hinweis mit der
  Anzahl der betroffenen Rezepte) - so geht beim Löschen nie unbemerkt
  die Kategorie-Zuordnung eines Rezepts verloren. Gespeichert werden die
  eigenen Kategorien analog zu Wochenplan/Kochbüchern als verstecktes
  Item in derselben To-do-Liste.
- **Abfrage & Statistik per Schalter direkt in der Karte ein-/ausschalten**:
  ganz rechts im Kopfbereich (nach allen anderen Knöpfen) sitzt jetzt ein
  ⚙️-Symbol. Ein Klick darauf öffnet ein Fenster mit einem echten
  Ein-/Ausschalter - kein Bearbeiten der Dashboard-Konfiguration mehr
  nötig. Der Schalter regelt bewusst BEIDES zusammen: die "Hast du
  zubereitet?"-Abfrage UND den Statistik-Knopf. Die Einstellung wird
  analog zu Wochenplan/Kochbüchern/Kategorien als verstecktes Item in
  derselben To-do-Liste gespeichert und bleibt damit dauerhaft erhalten.
- **Warnt vor vergessener Ressourcen-Versionsnummer**: erkennt die Karte,
  dass sie selbst gerade mit einer neuen `CARD_VERSION` läuft, die
  `?v=...`-Versionsnummer in der eigenen Ressourcen-URL sich seit dem
  letzten Laden in diesem Browser aber nicht geändert hat, zeigt sie einen
  wegklickbaren Warnhinweis. Browser cachen `/local/rezeptbuch-card.js`
  hartnäckig unter ihrer jeweiligen URL - ohne geänderte Versionsnummer
  bekommen andere Geräte sonst unbemerkt weiter die alte Datei. Rein
  lokal, kein Netzwerkzugriff.

### Geändert
- **Seitennavigation der Rezeptübersicht**: erscheint jetzt zusätzlich
  oberhalb der Kacheln (bisher nur unterhalb) - bei vielen Rezepten muss
  man dadurch nicht mehr erst nach unten scrollen, nur um die Seite zu
  wechseln.

### Entfernt
- **Die Kartenoptionen `ask_cooked: false` (seit v1.0.2) und
  `show_statistics`**: beide sind durch den neuen ⚙️-Schalter direkt in
  der Karte ersetzt worden (siehe oben) - ein einziger echter
  Ein-/Ausschalter statt zweier YAML-Felder, die man von Hand editieren
  musste. Wer eines der beiden Felder noch in seiner Dashboard-YAML
  stehen hat, kann es einfach entfernen (es wird nun folgenlos
  ignoriert) und stattdessen den ⚙️-Schalter verwenden - bereits
  erfasste Zubereitungen bleiben davon unberührt.

### Behoben
- **⚙️-Symbol im Kopfbereich wurde auf schmalen Bildschirmen (Handy) zu
  einer breiten, ovalen Pille statt eines kleinen runden Knopfs**: eine
  bestehende Regel zog dort alle Knöpfe im Kopfbereich gleichmäßig in die
  Breite - das runde ⚙️-Symbol war davon nicht ausgenommen. Betraf nur die
  Optik auf schmalen Bildschirmen, keine Funktion.

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
