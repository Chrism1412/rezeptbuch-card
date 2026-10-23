/*
  Rezeptbuch-Karte für Home Assistant
  (aktuelle Versionsnummer siehe CARD_VERSION weiter unten sowie
  package.json/CHANGELOG.md - hier bewusst NICHT redundant hartkodiert,
  damit dieser Kommentar nicht bei jedem Release erneut veraltet)

  Speichert Rezepte in einer "Lokalen To-do-Liste" (local_todo) - das ist
  serverseitiger Speicher, für jedes Gerät/jeden Nutzer gleich sichtbar.
  Die Karte selbst braucht dafür KEIN Pyscript und KEIN eigenes Backend -
  nur Home Assistants eingebaute, seit Jahren stabile To-do-Dienste.

  Optionale Zusatz-Skripte (siehe docs/ANLEITUNG-Backup.md), NICHT für den
  Grundbetrieb der Karte nötig, sondern für automatische Wartungsaufgaben,
  die absichtlich außerhalb der Karte laufen:
  - rezeptbuch_backup.py / rezeptbuch_restore.py: tägliches Backup + manuelles
    Wiederherstellen (shell_command, per REST-API, kein Pyscript).
  - rezeptbuch_bilder_verarbeiten.py: lagert Rezeptfotos aus dem JSON in
    echte Dateien unter /config/www/rezeptbuch-bilder/ aus (wird von der
    Karte nach jedem Foto-Upload automatisch angestoßen).
  - rezeptbuch_url_import.py: lädt eine vom Nutzer angegebene Rezept-URL
    serverseitig herunter und liest deren eingebettete schema.org/Recipe-
    Strukturdaten aus, damit die Karte das Formular automatisch befüllen
    kann ("Rezept-URL importieren"-Knopf im Formular).

  Voraussetzung:
  1. Einstellungen -> Geräte & Dienste -> Integrationen -> "+ Integration
     hinzufügen" -> "Lokale To-do" -> z.B. "Rezepte" anlegen
     (erzeugt direkt eine Entität wie todo.rezepte)

  Installation der Karte - ausführlich mit Screenshots siehe README.md
  ("Grundinstallation") bzw. docs/ANLEITUNG-Backup.md, hier nur die
  Kurzfassung:
  Empfohlen über HACS ("Benutzerdefinierte Repositories" -> dieses Repo
  als Kategorie "Dashboard" eintragen -> "Rezeptbuch-Karte" installieren);
  HACS legt die Datei automatisch ab und trägt die Dashboard-Ressource
  meist auch gleich selbst ein.
  Alternativ manuell, ganz ohne HACS:
  1. Diese Datei nach /config/www/rezeptbuch-card.js kopieren
  2. Einstellungen -> Dashboards -> Ressourcen -> Ressource hinzufügen
     URL: /local/rezeptbuch-card.js   Typ: JavaScript-Modul
  3. Karte hinzufügen mit:
     type: custom:rezeptbuch-card
     entity: todo.rezepte
     shopping_list_entity: todo.einkaufsliste   # optional, siehe unten

  Optional: shopping_list_entity zeigt auf eine ZWEITE Lokale To-do-Liste
  (eigene Integration, siehe docs/ANLEITUNG-Backup.md Abschnitt 18) - erst
  damit funktioniert der "Einkaufsliste erstellen"-Knopf (Zutaten mehrerer
  ausgewählter Rezepte bzw. des Wochenplans werden dort angehängt). Ohne
  diese Angabe funktioniert die Karte unverändert weiter, der Knopf zeigt
  dann nur einen erklärenden Hinweis statt eines Absturzes.

  ---------------------------------------------------------------------
  INHALTSVERZEICHNIS (grobe Zeilennummern, ändern sich mit jedem Release
  etwas - dient zur schnellen Orientierung, nicht als exakte Referenz):

    68    Übersetzungen (UEBERSETZUNGEN, alle 25 Sprachblöcke)
    7018  class RezeptbuchCard - Beginn
      7019   Konstruktor (Grundzustand aller internen Felder)
      7127   Sprache/Übersetzung (_sprache, _t)
      7318   hass-Setter (Einstiegspunkt bei jedem HA-Update)
      7347   Update-Hinweis über GitHub-Releases (_updatePruefen)
      7409   Ressourcen-Versions-Warnung (_ressourcenVersionPruefen)
      7478   Laden/Speichern: Rezepte, Wochenplan, Kochbücher,
             Kategorien, Einstellungen (die "versteckten Marker-Items")
      7750   Rezept-Hilfsfunktionen (Migration, Bearbeitungsrechte,
             Bewertungen/Sterne, Kommentare)
      7978   Einkaufsliste (_einkaufslisteAggregieren/-Erstellen)
      8053   Statistik ("Hast du zubereitet?"-Auswertung)
      8149   Kochmodus (inkl. Timer, Screen-Wake-Lock)
      8321   Rezept-Formular (Neu/Bearbeiten/Löschen, Bildkompression,
             Speichern)
      8531   Mengen-Skalierung nach Portionen, Sortierung, Filter
      8634   _render() - zentraler Render-Dispatcher (wählt je nach
             _ansicht die passende _render*-Methode unten)
      9124   _renderListe() - Rezeptübersicht (inkl. Kategorie-Chips,
             Update-/Ressourcen-Version-Banner)
      9823   PDF-Export (Einzel- und Sammel-PDF, jsPDF, Wasserzeichen,
             Deckblatt-Collage)
      10743  _renderDetail() - Detailansicht eines Rezepts
      11033  _renderWochenplan() - Wochenplan-Ansicht
      11128  _renderFormular() - Formular zum Anlegen/Bearbeiten
    11650 customElements.define(...) - Ende

  Bei größeren Änderungen gerne kurz mit "grep -n" die aktuellen
  Zeilennummern der betroffenen Methode(n) neu prüfen, statt sich blind
  auf diese Liste zu verlassen.
  ---------------------------------------------------------------------
*/

// ---------------------------------------------------------------------
// Übersetzungen (i18n): Deutsch ist die Standard-/Rückfallsprache dieses
// Projekts (siehe CONTRIBUTING.md) - jeder Text, den eine Nutzerin/ein
// Nutzer tatsächlich zu sehen bekommt (Knopfbeschriftungen, Platzhalter,
// Hinweis-/confirm()-Texte, aria-label/title-Attribute, Leerzustände,
// PDF-/HTML-Export-Überschriften usw.) lebt hier als Übersetzungs-
// Schlüssel, NICHT als hart codierter String im restlichen Code. Interne,
// nicht sichtbare Dinge (JSON-Datenschlüssel wie "title"/"category",
// CSS-Klassennamen, console.error-Meldungen, Code-Kommentare, der
// gespeicherte Kategorie-Wert "Sonstiges" als Vergleichswert) bleiben
// bewusst unangetastet - siehe die Methoden _sprache()/_t() auf der
// Klasse für die Auflösung/Anwendung. Um eine weitere Sprache zu
// ergänzen: siehe CONTRIBUTING.md, Abschnitt "Eine neue Sprache
// ergänzen".
//
// Seit Version 2.3.0 enthält diese Datei NUR NOCH Deutsch (Standard und
// Rückfall). Alle anderen Sprachen liegen als eigene Dateien
// "rezeptbuch-sprache-<code>.js" im selben Ordner wie diese Datei und
// werden nur dann nachgeladen, wenn die Home-Assistant-Sprache des
// jeweiligen Nutzers sie braucht (siehe _sprachdateiSicherstellen()) - die
// Hauptdatei ist dadurch deutlich kleiner und schneller. Fehlt eine
// Sprachdatei, zeigt die Karte schlicht Deutsch an.
const UEBERSETZUNGEN = {
  de: {
    // Allgemein/mehrfach verwendet
    allgemein_zurueck: "← Zurück",
    allgemein_ja: "Ja",
    allgemein_nein: "Nein",
    allgemein_an: "An",
    allgemein_aus: "Aus",
    allgemein_speichern: "Speichern",
    allgemein_speichert: "Speichert…",
    allgemein_abbrechen: "Abbrechen",
    allgemein_bearbeiten: "Bearbeiten",
    allgemein_loeschen: "Löschen",
    allgemein_oeffnen: "Öffnen",
    allgemein_unbekannt: "Unbekannt",
    allgemein_schliessen: "Schließen",

    // Kategorien (Anzeige-Bezeichnungen - der intern gespeicherte/verglichene
    // Wert bleibt unabhängig von der Sprache immer der deutsche String aus
    // KATEGORIEN, siehe _kategorieLabel()).
    kategorie_hauptgericht: "Hauptgericht",
    kategorie_vorspeise: "Vorspeise",
    kategorie_suppe: "Suppe",
    kategorie_salat: "Salat",
    kategorie_beilage: "Beilage",
    kategorie_dessert: "Dessert",
    kategorie_kuchen_gebaeck: "Kuchen & Gebäck",
    kategorie_fruehstueck: "Frühstück",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Getränk",
    kategorie_sonstiges: "Sonstiges",
    kategorie_filter_alle: "Alle",
    kategorie_neu_btn: "+ Neue Kategorie",
    kategorie_name_placeholder: "Name der Kategorie",
    fehler_kategorie_name_fehlt: "Bitte einen Namen für die Kategorie eingeben.",
    fehler_kategorie_existiert_bereits: "Diese Kategorie gibt es schon.",
    kategorie_loeschen_title: "Kategorie löschen",
    kategorie_loeschen_aria: "Kategorie {{name}} löschen",
    kategorie_bearbeiten_title: "Kategorie umbenennen",
    kategorie_bearbeiten_aria: "Kategorie {{name}} umbenennen",
    kategorie_umbenennen_titel: "Kategorie \"{{name}}\" umbenennen:",
    fehler_kategorie_wird_verwendet: "Diese Kategorie wird noch von {{anzahl}}x verwendet - bitte zuerst eine andere Kategorie zuweisen.",

    // Wochentage (Anzeige - der interne Schlüssel in WOCHENTAGE bleibt
    // sprachunabhängig "montag" usw., siehe _wochentagLabel()).
    wochentag_montag: "Montag",
    wochentag_dienstag: "Dienstag",
    wochentag_mittwoch: "Mittwoch",
    wochentag_donnerstag: "Donnerstag",
    wochentag_freitag: "Freitag",
    wochentag_samstag: "Samstag",
    wochentag_sonntag: "Sonntag",

    // Sortier-Optionen
    sortier_titel: "Alphabetisch (A-Z)",
    sortier_bewertung: "Beste Bewertung zuerst",
    sortier_kategorie: "Nach Kategorie",
    sortier_neu: "Neueste zuerst",
    sortieren_label: "Sortieren:",

    // Kopfbereich der Listenansicht
    kopf_titel_standard: "Rezeptbuch",
    kopf_sichern_btn: "💾 Sichern",
    kopf_wochenplan_btn: "📅 Wochenplan",
    kopf_zufallsrezept_btn: "🎲 Zufallsrezept",
    umrechnungstabelle_btn: "📐 Umrechnungstabelle",
    umrechnungstabelle_titel: "Umrechnungstabelle",
    umrechnungstabelle_hinweis: "Richtwerte in Gramm für häufige Küchenzutaten - abhängig von Marke und Konsistenz, deshalb nur zum Nachschlagen. Diese Werte werden NICHT automatisch auf deine Rezepte angewendet.",
    umrechnungstabelle_suche_placeholder: "Zutat suchen …",
    umrechnungstabelle_spalte_zutat: "Zutat",
    umrechnungstabelle_spalte_tasse: "1 Tasse",
    umrechnungstabelle_spalte_el: "1 EL",
    umrechnungstabelle_spalte_tl: "1 TL",
    umrechnungstabelle_gramm_wert: "{{wert}} g",
    umrechnungstabelle_keine_treffer: "Keine Zutat gefunden.",
    umrechnungstabelle_eigene_hinzufuegen_btn: "+ Eigene Zutat hinzufügen",
    umrechnungstabelle_eigene_name_platzhalter: "Name der Zutat",
    umrechnungstabelle_eigene_tasse_platzhalter: "g/Tasse",
    umrechnungstabelle_eigene_el_platzhalter: "g/EL",
    umrechnungstabelle_eigene_tl_platzhalter: "g/TL",
    umrechnungstabelle_eigene_loeschen_titel: "Eigene Zutat löschen",
    umrechnungstabelle_eigene_bearbeiten_titel: "Eigene Zutat bearbeiten",
    umrechnungstabelle_eigene_name_fehlt: "Bitte einen Namen eingeben.",
    umrechnungstabelle_eigene_hinweis: "Fehlt eine Zutat, deren Umrechnung du selbst kennst? Füge sie hier manuell hinzu - eine automatische Umrechnung zwischen Volumen und Gewicht bieten wir bewusst nicht an, da sie je nach Zutat, Marke und Dichte raten müsste.",
    einkaufsmodus_start_btn: "🛒 Einkaufsliste",
    einkaufsmodus_beenden_btn: "✕ Auswahl beenden",
    kopf_neu_btn: "+ Neu",
    suche_placeholder: "🔍 Rezept oder Zutaten (z.B. Mehl, Eier)…",

    // Kochbücher (gespeicherte Filter)
    kochbuch_loeschen_title: "Sammlung löschen",
    kochbuch_loeschen_aria: "Sammlung {{name}} löschen",
    kochbuch_speichern_btn: "+ Smarte Sammlung speichern",
    kochbuch_name_placeholder: "Name für diese Sammlung, z.B. Herbstrezepte",
    fehler_kochbuch_name_fehlt: "Bitte einen Namen für die Sammlung eingeben.",
    kochbuch_info_aria: "Erklärung zu smarten Sammlungen anzeigen",
    kochbuch_info_titel: "Was ist eine smarte Sammlung?",
    kochbuch_info_text:
      "Eine smarte Sammlung speichert keine feste Liste von Rezepten, " +
      "sondern eine Filter-Kombination aus Kategorie, Tags und " +
      "Suchbegriff, wie sie gerade eingestellt ist. Sie aktualisiert sich " +
      "danach von selbst: ein neues Rezept, das dazu passt, taucht " +
      "automatisch mit auf, und ein Rezept, dessen Kategorie oder Tags " +
      "sich ändern, kann genauso automatisch wieder verschwinden.",

    // Einkaufslisten-Auswahlmodus
    einkaufs_zaehler: "{{anzahl}} ausgewählt",
    einkaufsliste_erstellen_btn: "Einkaufsliste erstellen",
    fehler_einkaufsliste_keine_konfiguration:
      "Es wurde keine Einkaufsliste gefunden. Lege sie in den Einstellungen (⚙️) unter „Einrichtung & Wartung“ mit einem Klick an – oder gib 'shopping_list_entity' in der Kartenkonfiguration an.",
    fehler_einkaufsliste_keine_auswahl: "Bitte mindestens ein Rezept auswählen.",
    fehler_einkaufsliste_keine_auswahl_zutaten: "Bitte mindestens eine Zutat auswählen.",
    zutaten_fehlend_einkaufsliste_btn: "Ausgewählte zur Einkaufsliste hinzufügen",
    fehler_einkaufsliste_keine_zutaten: "Die ausgewählten Rezepte enthalten keine Zutaten.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen:
      "Konnte \"{{zeile}}\" nicht zur Einkaufsliste hinzufügen:\n{{fehler}}\n\nBereits hinzugefügte Zutaten bleiben in der Einkaufsliste stehen.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} Zutat(en) zu \"{{entity}}\" hinzugefügt.",

    // Rückgängig-Banner (nach Löschen)
    undo_geloescht: "\"{{titel}}\" gelöscht.",
    undo_rueckgaengig_btn: "Rückgängig",

    // Leerzustände / Fehleranzeige der Listenansicht
    leer_keine_rezepte: "Noch keine Rezepte – leg los mit \"+ Neu\"",
    leer_keine_treffer: "Keine Rezepte gefunden für \"{{begriff}}\"",
    fehler_liste_laden_titel: "Konnte \"{{entity}}\" nicht laden.",
    fehler_liste_laden_hinweis: "Existiert diese To-do-Liste? (Einstellungen → Geräte & Dienste → Helfer)",

    // Rezept-Kacheln
    kachel_aria_label_oeffnen: "Rezept {{titel}} öffnen",

    // Sterne-Bewertung
    sterne_aria_label_gruppe: "Eigene Bewertung",
    sterne_aria_label: "{{zahl}} von 5 Sternen",
    fehler_kein_benutzer_bewertung: "Konnte deinen Benutzer nicht ermitteln - Bewertung nicht möglich.",

    // Detailansicht
    detail_teilen_drucken_btn: "📤 Teilen / Drucken",
    detail_erstellt_von: "👤 Erstellt von {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} Bewertung)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} Bewertungen)",
    detail_keine_bewertungen: "Noch keine Bewertungen",
    detail_deine_bewertung: "Deine Bewertung:",
    detail_zubereitet_x: "🍳 {{anzahl}}x zubereitet",
    detail_portionen_suffix: "Portionen",
    abschnitt_titel_zutaten: "Zutaten",
    abschnitt_titel_zubereitung: "Zubereitung",
    keine_zutaten: "Keine Zutaten hinterlegt",
    detail_kommentare_titel: "Kommentare",
    detail_keine_kommentare: "Noch keine Kommentare",
    detail_kommentar_placeholder: "Ergänzung, Tipp oder Anmerkung…",
    detail_kommentar_hinzufuegen_btn: "Kommentar hinzufügen",
    detail_bearbeiten_hinweis: "Nur {{name}} (oder ein Admin) kann dieses Rezept bearbeiten oder löschen.",
    detail_ersteller_unbekannt: "der/die Ersteller:in",
    modal_zubereitet_frage: "Hast du \"{{titel}}\" zubereitet?",
    modal_drucken_bild_frage: "Rezeptbild mit ausgeben?",
    modal_drucken_ohne_bild_btn: "Ohne Bild",
    modal_drucken_mit_bild_btn: "Mit Bild",
    statistik_btn: "📊 Statistik",
    statistik_titel: "Koch-Statistik",
    statistik_info_aria: "Erklärung zur Statistik anzeigen",
    statistik_einstellungen_btn_title: "Zubereitungs-Erfassung",
    statistik_einstellungen_titel: "Zubereitungs-Erfassung",
    statistik_einstellungen_text: "Hier kannst du festlegen, ob nach dem Verlassen eines Rezepts gefragt wird, ob du es zubereitet hast, und ob die daraus entstehende Statistik in dieser Karte angezeigt wird.",
    statistik_einstellungen_schalter_label: "Abfrage & Statistik aktivieren",
    tags_einstellung_schalter_label: "Tag-Filter in der Übersicht anzeigen",
    zufallsrezept_einstellung_schalter_label: "Zufallsrezept-Knopf in der Übersicht anzeigen",
    umrechnungstabelle_kopf_einstellung_schalter_label: "Umrechnungstabelle-Knopf in der Übersicht anzeigen",
    umrechnungstabelle_kopf_einstellung_hinweis: "Bei der eingestellten Kategorie für amerikanische Rezepte erscheint die Umrechnungstabelle im Rezept und im Kochmodus weiterhin, auch wenn dieser Knopf hier ausgeschaltet ist.",
    farben_abschnitt_titel: "Farben",
    farben_hinweis: "Passe einzelne Farben der Karte an. Mit Alles zurücksetzen kehren alle Farben zum Standard zurück.",
    farben_akzent_label: "Hauptfarbe (Knöpfe, aktive Filter)",
    farben_akzent_text_label: "Akzentfarbe für Texte und Ränder",
    farben_loeschen_label: "Löschen / Warnung",
    farben_sterne_label: "Bewertungssterne",
    farben_titel_label: "Überschriften",
    farben_zuruecksetzen_btn: "Alles zurücksetzen",
    us_kategorie_einstellung_label: "Kategorie für amerikanische Rezepte",
    us_kategorie_einstellung_text: "Bei Rezepten mit dieser Kategorie erscheint zusätzlich im Rezept selbst und im Kochmodus ein Knopf für die Umrechnungstabelle.",
    us_kategorie_einstellung_keine: "— Keine —",
    statistik_info_titel: "Wie wird diese Statistik berechnet?",
    statistik_info_text:
      "Diese Auswertung zählt jede Bestätigung der Frage „Hast du zubereitet?“ - unabhängig von Portionsgröße oder Häufigkeit am selben Tag. Ist diese Frage über den Schalter in den Statistik-Einstellungen (⚙️) deaktiviert, wachsen die Zahlen nicht weiter, bereits erfasste Zubereitungen bleiben aber erhalten.",
    statistik_dieses_jahr: "Du hast in {{jahr}} {{anzahl}}x aus deinem Rezeptbuch gekocht",
    statistik_gesamt: "Du hast insgesamt {{anzahl}}x aus deinem Rezeptbuch gekocht",
    statistik_top_titel: "Meistgekocht",
    statistik_keine_daten: "Noch keine Zubereitungen erfasst.",
    modal_loeschen_frage: "\"{{titel}}\" wirklich löschen?",
    modal_loeschen_ja_btn: "Ja, löschen",
    modal_kommentar_loeschen_frage: "Diesen Kommentar wirklich löschen?",

    // Wochenplan
    wochenplan_titel: "Wochenplan",
    wochenplan_tab_diese: "Diese Woche",
    wochenplan_tab_folgewoche: "Folgewoche",
    wochenplan_hinweis_folgewoche:
      "Plane hier schon jetzt die kommende Woche - sie rückt automatisch zu \"Diese Woche\" nach, sobald die aktuelle Woche vorbei ist.",
    wochenplan_hinweis_diese:
      "Bereits vergangene Tage werden automatisch geleert (das Rezept selbst bleibt erhalten, nur die Zuweisung verschwindet).",
    wochenplan_hinweis_speicherung:
      "Wird geräteübergreifend gespeichert (als unsichtbarer Zusatzeintrag in derselben Rezeptliste, kein weiterer Helfer nötig).",
    wochenplan_leer: "Noch keine Rezepte vorhanden - erst welche anlegen.",
    wochenplan_kein_rezept_option: "– kein Rezept –",
    wochenplan_einkaufsliste_btn: "Einkaufsliste aus {{ziel}} erstellen",
    wochenplan_wort: "Wochenplan",
    wochenplan_folgewoche_wort: "Folgewoche",
    wochenplan_aktuelle_woche_wort: "aktuelle Woche",
    wochenplan_keine_zuweisung: "Die {{zeitraum}} enthält noch keine zugewiesenen Rezepte.",

    // Formular (neues/bearbeiten Rezept)
    formular_titel_neu: "Neues Rezept",
    formular_titel_bearbeiten: "Rezept bearbeiten",
    formular_url_import_btn: "🌐 Rezept-URL importieren",
    formular_url_label: "Link zur Rezept-Webseite",
    formular_url_placeholder: "https://www.beispiel-rezepte.de/mein-rezept",
    formular_url_hinweis:
      "Lädt die Seite und liest die dort ohnehin eingebauten " +
      "Rezept-Strukturdaten aus (dieselben Daten, mit denen z.B. " +
      "Google die Sternebewertungen in der Suche anzeigt) - meist " +
      "zuverlässiger als Text-Erkennung. Funktioniert nur bei Seiten, " +
      "die solche Daten bereitstellen, und die automatisierte Abrufe " +
      "nicht blockieren.",
    formular_url_importieren_btn: "Importieren",
    formular_url_laedt: "Lädt …",
    formular_text_einfuegen_btn: "🔍 Rezepttext einfügen (automatisch erkennen)",
    formular_text_label: "Rezepttext hier einfügen (z.B. von einer Rezept-Webseite kopiert)",
    formular_text_placeholder: "Titel, Zutaten, Zubereitung - einfach den ganzen Text reinkopieren",
    formular_text_hinweis:
      "Rein automatische Erkennung ohne KI - funktioniert am besten mit " +
      "\"Zutaten\"- und \"Zubereitung\"-Überschriften im Text. Bitte das " +
      "Ergebnis danach kurz prüfen, es kann unvollständig sein.",
    formular_text_erkennen_btn: "Erkennen",
    formular_json_einfuegen_btn: "📋 Von KI erzeugtes JSON einfügen",
    formular_json_info_aria: "Passenden Prompt für eine KI anzeigen",
    json_info_titel: "Prompt für eine KI",
    json_info_erklaerung:
      "Diesen Text kopieren, in eine KI deiner Wahl (z.B. ChatGPT oder " +
      "Claude) einfügen, deinen Rezepttext anhängen und die Antwort danach " +
      "oben bei \"JSON hier einfügen\" einfügen.",
    json_info_prompt:
      "Wandle den Rezepttext, den ich dir gleich sende, in EIN einziges " +
      "JSON-Objekt um - ohne Erklärung, ohne Text davor oder danach, nur " +
      "das JSON. Verwende genau dieses Format:\n\n" +
      "{\n" +
      '  "title": "Name des Rezepts",\n' +
      '  "servings": 4,\n' +
      '  "category": "eine von: {{kategorien}}",\n' +
      '  "ingredients": ["eine Zutat pro Eintrag, z.B. 200 g Mehl"],\n' +
      '  "steps": ["ein Zubereitungsschritt pro Eintrag"],\n' +
      '  "tags": ["optionale Stichworte, z.B. vegetarisch"]\n' +
      "}\n\n" +
      'Regeln: "category" muss GENAU einer der oben genannten Werte sein ' +
      "(unverändert übernehmen, auch wenn der Rezepttext in einer anderen " +
      'Sprache ist). "tags" ist optional, notfalls ein leeres Array. ' +
      "Erfinde keine Zutaten oder Schritte, die nicht im Text stehen. " +
      "Hier ist der Rezepttext:",
    json_info_kopieren_btn: "📋 Prompt kopieren",
    json_info_kopiert: "Kopiert!",
    formular_json_label: "JSON hier einfügen",
    formular_json_uebernehmen_btn: "Übernehmen",
    formular_label_titel: "Titel",
    formular_label_kategorie: "Kategorie",
    formular_label_tags: "Tags (mehrere möglich, z.B. \"vegetarisch\", \"schnell\")",
    formular_tag_placeholder: "Tag eingeben und hinzufügen",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Tag {{tag}} entfernen",
    formular_label_portionen: "Portionen (Basis)",
    formular_label_zutaten: "Zutaten",
    formular_zutat_hinzufuegen_btn: "+ Zutat",
    formular_zutat_menge_placeholder: "Menge",
    formular_zutat_einheit_placeholder: "Einheit",
    formular_zutat_name_placeholder: "Zutat",
    formular_zutat_entfernen_aria: "Zutat entfernen",
    formular_label_zubereitung: "Zubereitung (Schritte)",
    formular_schritt_hinzufuegen_btn: "+ Schritt",
    formular_schritt_placeholder_beispiel: "z.B. Gemüse waschen und schneiden",
    formular_schritt_placeholder_naechster: "nächster Schritt",
    formular_schritt_entfernen_aria: "Schritt entfernen",
    formular_schritt_hoch_aria: "Schritt nach oben verschieben",
    formular_schritt_runter_aria: "Schritt nach unten verschieben",
    formular_bild_verkleinern_text: "Bild wird verkleinert…",

    // Fehler-/Hinweismeldungen des Formulars
    fehler_url_ungueltig: "Bitte eine vollständige Adresse mit http:// oder https:// angeben.",
    fehler_url_apostroph: "Diese Adresse enthält ein Apostroph (') und kann leider nicht importiert werden.",
    fehler_url_keine_ausgabe:
      "Das Skript hat keine Ausgabe geliefert. Ist 'rezeptbuch_url_importieren' in configuration.yaml " +
      "eingerichtet und Home Assistant seitdem einmal komplett neu gestartet worden?",
    fehler_url_kein_json: "Die Antwort des Import-Skripts war kein gültiges JSON.",
    fehler_url_import_fehlgeschlagen: "URL-Import fehlgeschlagen: {{fehler}}",
    fehler_texterkennung_nichts_gefunden:
      "Konnte im eingefügten Text leider nichts erkennen. Bitte die Felder unten von Hand ausfüllen.",
    warnung_texterkennung_unvollstaendig:
      "Erkennung war unvollständig (Zutaten oder Schritte fehlen/sind ggf. falsch zugeordnet) - bitte im Formular prüfen und ergänzen.",
    fehler_json_ungueltig: "Das eingefügte JSON ist ungültig. Bitte prüfen und erneut versuchen.",
    fehler_json_titel_fehlt: "Im JSON fehlt mindestens das Feld 'title'.",
    fehler_titel_fehlt: "Bitte einen Titel eingeben.",
    fehler_unerwartet: "Unerwarteter Fehler:\n{{fehler}}",
    fehler_konflikt_geloescht:
      "\"{{titel}}\" wurde inzwischen von jemand anderem gelöscht. Deine Änderungen wurden nicht gespeichert.",
    fehler_konflikt_geaendert:
      "\"{{titel}}\" wurde inzwischen von jemand anderem geändert (z. B. Kommentar, Bewertung " +
      "oder eigene Bearbeitung).\n\nDamit dadurch nichts überschrieben wird, wurden deine Änderungen " +
      "NICHT gespeichert. Bitte öffne das Rezept erneut und trage deine Änderungen nochmal ein.",
    fehler_vorgang_fehlgeschlagen: "Vorgang fehlgeschlagen:\n{{fehler}}",
    fehler_teilen_drucken: "Unerwarteter Fehler beim Teilen/Drucken:\n{{fehler}}",
    fehler_bild_lesen: "Foto konnte nicht gelesen werden (Datei beschädigt oder nicht unterstützt).",
    fehler_bild_verarbeiten: "Foto konnte nicht als Bild verarbeitet werden (nicht unterstütztes Format?).",

    // Teilen (Text-Variante) / PDF-/HTML-Export
    teilen_ueberschrift_zutaten: "ZUTATEN",
    teilen_ueberschrift_zubereitung: "ZUBEREITUNG",
    seite_zurueck_btn: "← Zurück",
    seite_weiter_btn: "Weiter →",
    seite_anzeige: "Seite {{aktuell}} von {{gesamt}}",
    update_neue_version: "Neue Version verfügbar: {{version}}",
    update_ansehen_btn: "Ansehen",
    update_schliessen_aria: "Hinweis ausblenden",
    ressourcen_version_hinweis: "⚠️ Diese Karte wurde aktualisiert, aber die Ressourcen-URL wurde nicht geändert (weiterhin \"?v={{version}}\"). Andere Browser/Geräte laden dadurch evtl. weiterhin die alte, zwischengespeicherte Datei - erhöhe die Versionsnummer in der Ressourcen-URL (Einstellungen → Dashboards → Ressourcen).",
    detail_kochmodus_btn: "🍳 Kochmodus",
    kochmodus_schritt_anzeige: "Schritt {{aktuell}} von {{gesamt}}",
    kochmodus_schliessen_aria: "Kochmodus schließen",
    kochmodus_schritt_zurueck_aria: "Vorheriger Schritt",
    kochmodus_schritt_weiter_aria: "Nächster Schritt",
    kochmodus_zutaten_ein_aria: "Zutaten einblenden",
    kochmodus_zutaten_aus_aria: "Zutaten ausblenden",
    kochmodus_timer_ein_aria: "Timer einblenden",
    kochmodus_timer_aus_aria: "Timer ausblenden",
    kochmodus_timer_minuten_aria: "Minuten",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Abbrechen",
    kochmodus_timer_abgelaufen_text: "⏰ Timer abgelaufen!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "{{minuten}} Min. Timer starten",
    kopf_sammel_pdf_btn: "📚 Sammel-PDF",
    sammel_pdf_keine_rezepte: "Keine Rezepte zum Exportieren gefunden.",
    sammel_pdf_frage_toc: "Inhaltsverzeichnis der gewählten Rezepte erstellen?",
    sammel_pdf_ja_toc_btn: "Ja, Inhaltsverzeichnis erstellen",
    sammel_pdf_nein_toc_btn: "Nein, kein Inhaltsverzeichnis",
    sammel_pdf_name_placeholder: "Name des Kochbuchs",
    sammel_pdf_erstellen_btn: "PDF erstellen",
    abschnitt_titel_inhaltsverzeichnis: "Inhaltsverzeichnis",
    sammel_pdf_frage_umfang: "Welche Rezepte sollen ins Sammel-PDF?",
    sammel_pdf_alle_rezepte_btn: "Alle angezeigten Rezepte",
    sammel_pdf_auswahl_btn: "Bestimmte Rezepte auswählen",
    sammel_pdf_auswahl_titel: "Rezepte auswählen",
    sammel_pdf_alle_auswaehlen_link: "Alle auswählen",
    sammel_pdf_keine_auswaehlen_link: "Keine auswählen",
    sammel_pdf_weiter_btn: "Weiter",
    sammel_pdf_bilder_mitdrucken_label: "Bilder mit ins PDF aufnehmen",
    sammel_pdf_auswahl_keine_hinweis: "Bitte mindestens ein Rezept auswählen.",

    // Einrichtung & Wartung, Fotos, Sicherung (ab 2.3.0)
    setup_titel: "Willkommen im Rezeptbuch",
    setup_text: "Die To-do-Liste „{{entity}}“, in der die Rezepte gespeichert werden, gibt es noch nicht. Soll sie jetzt automatisch angelegt werden?",
    setup_btn: "Jetzt automatisch einrichten",
    setup_laeuft: "Wird eingerichtet …",
    setup_nur_admin: "Die Liste muss zuerst von einem Administrator angelegt werden – bitte einen Administrator, diese Karte einmal zu öffnen.",
    setup_fehler: "Einrichtung fehlgeschlagen: {{fehler}}",
    einrichtung_abschnitt_titel: "Einrichtung & Wartung",
    einrichtung_abschnitt_hinweis: "Hier siehst du, was das Rezeptbuch bereits selbst erledigt hat – und kannst Fehlendes mit einem Klick nachholen.",
    einrichtung_rezeptliste: "Rezeptliste: {{entity}}",
    einrichtung_einkaufsliste: "Einkaufsliste: {{entity}}",
    einrichtung_einkaufsliste_fehlt: "Keine Einkaufsliste gefunden",
    einrichtung_sicherung_vorhanden: "Tägliche Sicherung: zuletzt {{datum}} ({{anzahl}} gespeichert)",
    einrichtung_sicherung_noch_keine: "noch keine",
    einrichtung_sicherung_fehlt: "Tägliche Sicherung ist noch nicht eingerichtet",
    einrichtung_sicherung_jetzt_btn: "Jetzt sichern",
    einrichtung_sicherung_wiederherstellen_btn: "Wiederherstellen …",
    einrichtung_sicherung_auto_label: "Automatisch täglich sichern",
    einrichtung_sicherung_erstellt: "Die Sicherung wurde erstellt.",
    einrichtung_sicherung_fehlgeschlagen: "Die Sicherung konnte nicht erstellt werden.",
    einrichtung_einrichten_btn: "Einrichten",
    einrichtung_angelegt: "Die Liste „{{entity}}“ wurde angelegt.",
    einrichtung_fotos_ok: "Fotos: alles in Ordnung",
    einrichtung_fotos_offen: "{{anzahl}} Foto(s) stecken noch als Text im Rezept",
    einrichtung_fotos_auslagern_btn: "Jetzt auslagern",
    einrichtung_fotos_ausgelagert: "{{anzahl}} Foto(s) wurden ausgelagert.",
    einrichtung_fotos_nichts_ausgelagert: "Es konnte kein Foto ausgelagert werden.",
    einrichtung_url_import_ok: "URL-Import: eingerichtet",
    einrichtung_url_import_fehlt: "URL-Import: nicht eingerichtet (optional, siehe README)",
    einrichtung_nur_admin: "Dafür sind Administrator-Rechte nötig.",
    einrichtung_fehler: "Das hat nicht geklappt: {{fehler}}",
    einrichtung_fehler_unerwartet: "Home Assistant hat die Einrichtung nicht wie erwartet abgeschlossen.",
    einrichtung_fehler_entity_fehlt: "Die Liste wurde angelegt, die Entität „{{entity}}“ ist aber nicht aufgetaucht. Bitte in der Kartenkonfiguration den tatsächlichen Namen angeben.",
    sicherung_modal_titel: "Sicherung wiederherstellen",
    sicherung_modal_hinweis: "Fehlende Rezepte werden aus der gewählten Sicherung ergänzt. Bereits vorhandene Rezepte bleiben unverändert.",
    sicherung_modal_rezepte: "{{anzahl}} Rezepte",
    sicherung_modal_ergaenzen_btn: "Fehlende ergänzen",
    sicherung_modal_ergebnis: "{{anzahl}} Rezept(e) wurden ergänzt.",
    sicherung_modal_nichts_fehlt: "Es fehlt nichts – alle Rezepte aus dieser Sicherung sind vorhanden.",
    formular_label_fotos: "Fotos (bis zu {{max}}, das erste ist das Titelbild)",
    formular_fotos_hinweis: "Mehrere Fotos auf einmal wählbar. Mit ⭐ wird ein Foto zum Titelbild.",
    formular_foto_titelbild: "Titelbild",
    formular_foto_als_titelbild_title: "Als Titelbild verwenden",
    formular_foto_entfernen_aria: "Foto entfernen",
    formular_fotos_maximum: "Es sind höchstens {{max}} Fotos pro Rezept möglich.",
    detail_foto_aria: "Foto {{nummer}} von {{anzahl}} anzeigen",
  },
};

// Alle Sprachen, für die es eine Sprachdatei "rezeptbuch-sprache-<code>.js"
// gibt (siehe oben und _sprache()): die 24 offiziellen Amtssprachen der EU,
// Schwiizerdütsch sowie Russisch und Türkisch. Deutsch steckt direkt in
// UEBERSETZUNGEN oben.
// Alle sind LTR - keine RTL-Sprache ist darunter, daher gibt es keine
// Layout-Sonderfälle dafür. "gsw" (Schwiizerdütsch) ist absichtlich mit
// drin, obwohl es - anders als alle anderen Einträge hier - KEIN
// zweistelliger ISO-639-1-Code ist, sondern der dreistellige Code, den
// Home Assistant selbst dafür verwendet (siehe _sprache() unten für die
// nötige Sonderbehandlung).
const UNTERSTUETZTE_SPRACHEN = new Set([
  "de", "en", "bg", "hr", "cs", "da", "nl", "et", "fi", "fr", "el", "hu",
  "ga", "it", "lv", "lt", "mt", "pl", "pt", "ro", "sk", "sl", "es", "sv",
  "gsw", "ru", "tr",
]);

// ---------------------------------------------------------------------
// Nachladen der Sprachdateien (rezeptbuch-sprache-<code>.js)
//
// Jede Sprachdatei ist ein ganz normales Skript, das sich beim Ausführen
// selbst in window.__rezeptbuchSprachen[<code>] einträgt - bewusst KEIN
// JSON und KEIN ES-Modul: HACS lädt aus dem Repository-Stamm nur .js-Dateien
// herunter, und ein normales Skript funktioniert in jeder Umgebung (auch im
// Testaufbau). Gesucht wird in dieser Reihenfolge: im selben Ordner, aus dem
// diese Karte geladen wurde -> /hacsfiles/rezeptbuch-card/ (HACS) -> /local/
// (manuelle Installation). Ergebnis ist je Sprache nur ein Versuch pro
// Seitenaufruf (siehe SPRACH_LADEVERSUCHE), damit nicht bei jedem
// Home-Assistant-Update erneut gesucht wird.
// ---------------------------------------------------------------------
const SPRACH_LADEVERSUCHE = {};

function sprachtabelle(code) {
  const register = window.__rezeptbuchSprachen;
  return (register && register[code]) || null;
}

// Ordner, in dem diese Kartendatei liegt (mit abschließendem "/"), soweit
// sich das ermitteln lässt - sonst null. Zuerst über das eigene <script>-
// Element, ersatzweise über die Ressourcen-Liste des Browsers.
function kartenOrdnerErmitteln() {
  let url = "";
  try {
    const skript = document.querySelector('script[src*="rezeptbuch-card"]');
    if (skript && skript.src) url = skript.src;
  } catch (e) {
    url = "";
  }
  if (!url) {
    try {
      const eintrag = performance.getEntriesByType("resource").find((e) => /rezeptbuch-card[^/]*\.js(\?|#|$)/.test(e.name));
      if (eintrag) url = eintrag.name;
    } catch (e) {
      url = "";
    }
  }
  if (!url) return null;
  const ohneAnhang = url.split(/[?#]/)[0];
  return ohneAnhang.slice(0, ohneAnhang.lastIndexOf("/") + 1);
}

// Mögliche Ordner für Zusatzdateien (Sprachdateien, jsPDF), in
// Probier-Reihenfolge, ohne Doppelte.
function zusatzdateiOrdner() {
  const liste = [];
  if (typeof window.__rezeptbuchSprachBasis === "string") liste.push(window.__rezeptbuchSprachBasis);
  const eigener = kartenOrdnerErmitteln();
  if (eigener) liste.push(eigener);
  liste.push("/hacsfiles/rezeptbuch-card/", "/local/");
  return liste.filter((ordner, i) => liste.indexOf(ordner) === i);
}

// Lädt ein Skript; löst immer auf (true = geladen, false = Fehler/Timeout).
function skriptLaden(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const skript = document.createElement("script");
    let fertig = false;
    const beenden = (erfolg) => {
      if (fertig) return;
      fertig = true;
      clearTimeout(timer);
      if (!erfolg) skript.remove();
      resolve(erfolg);
    };
    const timer = setTimeout(() => beenden(false), timeoutMs);
    skript.onload = () => beenden(true);
    skript.onerror = () => beenden(false);
    skript.src = url;
    document.head.appendChild(skript);
  });
}

const KATEGORIEN = [
  "Hauptgericht", "Vorspeise", "Suppe", "Salat", "Beilage",
  "Dessert", "Kuchen & Gebäck", "Frühstück", "Snack", "Getränk", "Sonstiges",
];

// Ordnet jeden intern gespeicherten/verglichenen Kategorie-Wert (immer
// Deutsch, siehe KATEGORIEN) auf seinen Übersetzungs-Schlüssel ab - nur für
// die ANZEIGE verwendet (siehe RezeptbuchCard._kategorieLabel()), NIE für
// Vergleiche/Filterung/Speicherung, damit an gespeicherten Daten nichts
// wackelt, wenn später weitere Sprachen dazukommen.
const KATEGORIE_SCHLUESSEL = {
  "Hauptgericht": "kategorie_hauptgericht",
  "Vorspeise": "kategorie_vorspeise",
  "Suppe": "kategorie_suppe",
  "Salat": "kategorie_salat",
  "Beilage": "kategorie_beilage",
  "Dessert": "kategorie_dessert",
  "Kuchen & Gebäck": "kategorie_kuchen_gebaeck",
  "Frühstück": "kategorie_fruehstueck",
  "Snack": "kategorie_snack",
  "Getränk": "kategorie_getraenk",
  "Sonstiges": "kategorie_sonstiges",
};

// "labelSchluessel" statt eines festen deutschen Labels - siehe
// RezeptbuchCard._t() für die Auflösung zur Anzeigezeit.
const SORTIER_OPTIONEN = [
  { wert: "titel", labelSchluessel: "sortier_titel" },
  { wert: "bewertung", labelSchluessel: "sortier_bewertung" },
  { wert: "kategorie", labelSchluessel: "sortier_kategorie" },
  { wert: "neu", labelSchluessel: "sortier_neu" },
];

// Schema-Versionierung: Version des JSON-Formats, das im "description"-Feld
// jedes To-do-Items gespeichert wird. Wird bei jeder künftigen strukturellen
// Änderung am Format (neues Pflichtfeld, geändertes Format eines Felds usw.)
// erhöht. _migriereRezept() unten ist die zentrale Stelle, an der alte
// Datensätze beim Einlesen auf den aktuellen Stand gebracht werden - so
// bleiben auch sehr alte, nie neu gespeicherte Rezepte les- und bearbeitbar.
const SCHEMA_VERSION = 2;

// Höchstzahl Fotos pro Rezept (Titelbild + weitere).
const MAX_FOTOS = 6;

// Version der Karte selbst (nicht zu verwechseln mit SCHEMA_VERSION oben,
// die die Datenstruktur EINES Rezepts betrifft). Wird klein in der
// Rezeptübersicht angezeigt und für den Update-Hinweis (Vergleich mit der
// neuesten GitHub-Version) verwendet. Kein automatischer Build-Schritt in
// diesem Projekt - muss bei jedem Release manuell synchron zu
// package.json/CHANGELOG.md gepflegt werden.
const CARD_VERSION = "2.2.0";
// Für den Vergleich der GitHub-Version mit CARD_VERSION (siehe
// _updatePruefen) - GitHub-Releases/Tags in diesem Projekt heißen "v2.0.0".
const GITHUB_REPO = "Chrism1412/rezeptbuch-card";

// Wochenplan und gespeicherte Filter ("Kochbücher") brauchen KEINE eigene
// To-do-Liste (kein weiterer Helfer nötig) - sie werden als zwei besondere,
// versteckte Einträge in derselben "todo.rezepte"-Liste gespeichert, erkennbar
// an diesem festen "summary"-Wert. Überall dort, wo aus den geladenen Items
// die normale Rezeptliste gebildet wird, werden Items mit einem dieser
// Marker herausgefiltert, statt als (kaputtes) Rezept angezeigt zu werden.
const WOCHENPLAN_MARKER = "__rezeptbuch_wochenplan__";
const KOCHBUECHER_MARKER = "__rezeptbuch_kochbuecher__";
// Versteckt gespeicherte, selbst angelegte Kategorien (siehe KATEGORIEN
// oben) - analog zu WOCHENPLAN_MARKER/KOCHBUECHER_MARKER als eigenes,
// verstecktes Item in derselben To-do-Liste. Die fest eingebauten
// KATEGORIEN bleiben Deutsch+übersetzt (KATEGORIE_SCHLUESSEL); eigene
// Kategorien werden dagegen so gespeichert/angezeigt, wie der Nutzer sie
// eingetippt hat - ohne automatische Übersetzung in andere Sprachen.
const KATEGORIEN_MARKER = "__rezeptbuch_kategorien__";
// Versteckt gespeicherte Nutzer-Einstellungen, die sich per echtem
// Ein-/Ausschalter IN der Karte selbst umschalten lassen (siehe
// _erfassungAktiv/_einstellungenModal*) - bewusst als eigenes, verstecktes
// Item statt einer Kartenoption in der Dashboard-YAML, damit man dafür
// nie die YAML-Konfiguration bearbeiten muss.
const EINSTELLUNGEN_MARKER = "__rezeptbuch_einstellungen__";

// "schluessel" bleibt der interne, sprachunabhängige Speicherschlüssel
// (siehe _leereWochentage() usw.) - das Anzeige-Label kommt erst zur
// Render-Zeit über RezeptbuchCard._wochentagLabel()/_t() dazu.
const WOCHENTAGE = [
  { schluessel: "montag", labelSchluessel: "wochentag_montag" },
  { schluessel: "dienstag", labelSchluessel: "wochentag_dienstag" },
  { schluessel: "mittwoch", labelSchluessel: "wochentag_mittwoch" },
  { schluessel: "donnerstag", labelSchluessel: "wochentag_donnerstag" },
  { schluessel: "freitag", labelSchluessel: "wochentag_freitag" },
  { schluessel: "samstag", labelSchluessel: "wochentag_samstag" },
  { schluessel: "sonntag", labelSchluessel: "wochentag_sonntag" },
];

// ---------------------------------------------------------------------
// Wochenplan: automatisches Nachrücken der Folgewoche + Leeren vergangener
// Tage. Der Wochenplan speichert dafür zusätzlich zu den reinen Wochentags-
// Namen ("montag" usw., die für sich genommen kein Datum kennen) auch das
// Datum des Montags der aktuell laufenden Woche (weekStart) sowie eine
// zweite, unabhängig befüllbare Wochenstruktur für die Folgewoche
// (nextWeekDays) - reine Hilfsfunktionen auf Modulebene, kein "this" nötig.
// ---------------------------------------------------------------------

function _leereWochentage() {
  const days = {};
  WOCHENTAGE.forEach((t) => { days[t.schluessel] = null; });
  return days;
}

// Datum als lokales (NICHT UTC-verschobenes) "JJJJ-MM-TT" formatieren - mit
// toISOString() würde je nach Zeitzone der falsche Kalendertag herauskommen.
function _datumZuIso(datum) {
  const jahr = datum.getFullYear();
  const monat = String(datum.getMonth() + 1).padStart(2, "0");
  const tag = String(datum.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

function _isoDatumHeute() {
  return _datumZuIso(new Date());
}

function _isoPlusTage(iso, tage) {
  const [jahr, monat, tag] = iso.split("-").map(Number);
  const datum = new Date(jahr, monat - 1, tag);
  datum.setDate(datum.getDate() + tage);
  return _datumZuIso(datum);
}

// Montag der Woche, in der "heute" liegt, als "JJJJ-MM-TT". new Date().getDay()
// liefert 0=Sonntag...6=Samstag - deshalb der Sonderfall für Sonntag (dessen
// Montag 6 Tage VOR ihm liegt, nicht danach).
function _wochenplanHeutigerMontag() {
  const heute = new Date();
  const wochentagIndex = heute.getDay();
  const versatzZuMontag = wochentagIndex === 0 ? -6 : 1 - wochentagIndex;
  const montag = new Date(heute);
  montag.setDate(heute.getDate() + versatzZuMontag);
  return _datumZuIso(montag);
}

// Bringt einen gespeicherten Wochenplan auf den aktuellen Stand:
// 1. Ist seit dem letzten Öffnen der Karte eine komplette Woche (oder mehrere,
//    z.B. nach Urlaub) vergangen, rückt die bisherige Folgewoche automatisch
//    zur aktuellen Woche nach ("weiter geplant" geht dadurch nicht verloren),
//    die Folgewoche wird danach wieder leer.
// 2. INNERHALB der jetzt aktuellen Woche werden bereits vergangene Tage
//    automatisch geleert (z.B. an einem Mittwoch verschwindet die Zuweisung
//    für Montag/Dienstag, Mittwoch bis Sonntag bleiben unangetastet stehen) -
//    das Rezept selbst wird dabei NICHT gelöscht, nur die Tages-Zuweisung.
// Gibt { plan, veraendert } zurück - veraendert zeigt an, ob der Aufrufer das
// Ergebnis zurückspeichern muss (reine Lesezugriffe sollen keinen Schreib-
// vorgang auslösen, wenn ohnehin schon alles aktuell ist).
function _wochenplanAktualisieren(plan) {
  let weekStart = plan.weekStart;
  let days = { ..._leereWochentage(), ...(plan.days || {}) };
  let nextWeekDays = { ..._leereWochentage(), ...(plan.nextWeekDays || {}) };
  const heutigerMontag = _wochenplanHeutigerMontag();
  let veraendert = false;

  if (!weekStart) {
    // Allererste Nutzung bzw. altes Format (Version 1) ohne Datum - als
    // "diese Woche beginnt jetzt" annehmen, nichts nachrücken lassen.
    weekStart = heutigerMontag;
    veraendert = true;
  }

  // Ganze Wochen nachrücken lassen, bis weekStart der aktuellen Woche
  // entspricht - läuft nur so oft wie tatsächlich Wochen dazwischen liegen
  // (im Normalfall: gar nicht oder genau einmal).
  while (weekStart < heutigerMontag) {
    days = nextWeekDays;
    nextWeekDays = _leereWochentage();
    weekStart = _isoPlusTage(weekStart, 7);
    veraendert = true;
  }

  const heuteIso = _isoDatumHeute();
  WOCHENTAGE.forEach((t, index) => {
    const tagDatum = _isoPlusTage(weekStart, index);
    if (tagDatum < heuteIso && days[t.schluessel]) {
      days[t.schluessel] = null;
      veraendert = true;
    }
  });

  return { plan: { schemaVersion: 2, weekStart, days, nextWeekDays }, veraendert };
}

// ---------------------------------------------------------------------
// Automatische Text-Erkennung ("Rezepttext einfügen"): rein clientseitige
// Mustererkennung (Regex/Heuristik), OHNE externe KI/API - bewusst so
// gewählt (kein API-Key, keine Kosten, funktioniert offline), auf Kosten
// der Treffsicherheit bei sehr unstrukturiertem Text. Reine Hilfsfunktionen
// (kein "this" nötig), daher auf Modulebene statt als Klassen-Methoden.
// ---------------------------------------------------------------------

// Baustein für Mengenangaben, gemeinsam verwendet von ZUTAT_MUSTER und
// MENGE_NUR_MUSTER: deckt neben einfachen Ganz-/Kommazahlen ("2", "1,5")
// auch Unicode-Bruchzeichen ("½"), einfache Brüche ("1/2") und gemischte
// Zahlen ("1 1/2") sowie Mengenbereiche mit Bindestrich, Gedankenstrich
// oder "bis" ("400-500 g", "400–500 g", "400 bis 500 g") ab.
const BRUCH_ZEICHEN = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";
const ZUTAT_MENGE_BRUCHZEICHEN = `[${BRUCH_ZEICHEN}]`;
const ZUTAT_MENGE_EINFACHER_BRUCH = `\\d+\\s*\\/\\s*\\d+`;
// Reihenfolge wichtig: die spezifischeren Alternativen (gemischte Zahl wie
// "1 1/2", dann einfacher Bruch wie "1/2") MÜSSEN vor der generischen
// reinen Ganz-/Kommazahl stehen - sonst würde z.B. bei "1/2" schon die
// bloße "1" als vollständiger Treffer akzeptiert und der Rest ("/2")
// bliebe fälschlich im Namen hängen (Regex-Alternation probiert
// Alternativen der Reihe nach und nimmt die ERSTE, die passt, nicht die
// längste).
const ZUTAT_MENGE_EINZELWERT = `(?:\\d+\\s+(?:${ZUTAT_MENGE_EINFACHER_BRUCH}|${ZUTAT_MENGE_BRUCHZEICHEN})|${ZUTAT_MENGE_EINFACHER_BRUCH}|${ZUTAT_MENGE_BRUCHZEICHEN}|\\d+(?:[.,]\\d+)?)`;
const ZUTAT_MENGE_BEREICH = `(?:\\s*(?:-|–|—|bis)\\s*${ZUTAT_MENGE_EINZELWERT})?`;
const ZUTAT_MENGE_ZAHL = `${ZUTAT_MENGE_EINZELWERT}${ZUTAT_MENGE_BEREICH}`;
const ZUTAT_MENGE_WORT = "ein(?:e|en)?|ein paar|einige|etwas|wenig|mehrere";
// Reihenfolge wichtig: Regex-Alternativen nehmen die ERSTE passende Option,
// nicht die längste - kurze Abkürzungen ("g", "l"), die zugleich Präfix
// eines ausgeschriebenen Wortes sind ("gramm", "glas", "gläser", "liter"),
// müssen deshalb NACH diesen längeren Alternativen stehen. Sonst matcht
// z.B. bei "400 Gramm Mehl" nur das "g", und "ramm Mehl" landet im Namen.
// Amerikanische Maßeinheiten (cup, tbsp, oz usw.) - analog zu den
// deutschen/metrischen Einheiten NUR zur Erkennung + späterer
// Synonym-Normalisierung (siehe EINHEIT_SYNONYME), bewusst OHNE
// Umrechnung in metrische Einheiten (gleiche Begründung wie dort: keine
// Einheiten-UMRECHNUNG, nur Textgleichsetzung). Reihenfolge innerhalb
// dieses Blocks folgt derselben Regel wie beim Rest von ZUTAT_EINHEITEN:
// ausgeschriebene/längere Formen vor kurzen Abkürzungen, die sonst als
// Präfix vorzeitig zuschlagen würden (z.B. "gallon" vor "gal", sonst
// bliebe bei "gallon Milch" das "lon" fälschlich im Namen hängen).
const ZUTAT_EINHEITEN_US = "cups?|tablespoons?|tbsp\\.?s?|teaspoons?|tsp\\.?s?|fl\\.?\\s?oz\\.?|fluid\\s+ounces?|ounces?|oz\\.?|pounds?|lbs?\\.?|pints?|pt\\.?|quarts?|qt\\.?|gallons?|gal\\.?";

const ZUTAT_EINHEITEN = `${ZUTAT_EINHEITEN_US}|kg|mg|ml|cl|el|tl|msp|prisen?|stück|stk\\.?|stange(?:n)?|zehe(?:n)?|bund|bd\\.?|dose(?:n)?|glas|gläser|packung(?:en)?|pck\\.?|scheibe(?:n)?|becher|blatt|blätter|würfel|tasse(?:n)?|esslöffel|teelöffel|handvoll|knolle(?:n)?|kopf|köpfe|gramm|kilo(?:gramm)?|gr\\.?|g|milliliter|liter|l`;

// Kleine, bewusst auf die häufigsten Fälle beschränkte Synonym-Tabelle für
// die Einkaufslisten-Zusammenfassung: verschiedene Schreibweisen derselben
// Einheit ("g"/"gr"/"Gramm", "l"/"Liter" usw.) sollen dort als EINE Einheit
// gelten - sonst tauchen z.B. "50 g Salz" aus einem Rezept und "1 Gramm
// Salz" aus einem anderen als zwei getrennte Zeilen auf der Einkaufsliste
// auf. Bewusst KEINE Einheiten-UMRECHNUNG (z.B. g <-> kg, ml <-> l) - nur
// textuelle Gleichsetzung offensichtlicher Synonyme derselben Einheit, im
// selben minimalistischen Geist wie der Rest der Karte (kein Wörterbuch,
// keine Datenbank, nur eine feste kleine Tabelle im Code).
const EINHEIT_SYNONYME = {
  g: "g", gr: "g", gramm: "g",
  kg: "kg", kilo: "kg", kilogramm: "kg",
  ml: "ml", milliliter: "ml",
  l: "l", liter: "l",
  el: "EL", essloffel: "EL",
  tl: "TL", teeloffel: "TL",
  // Amerikanische Einheiten - gleiche Schreibvarianten-Gleichsetzung wie
  // oben, ebenfalls ohne Umrechnung zu metrischen Einheiten.
  cup: "cup", cups: "cup",
  tbsp: "tbsp", "tbsp.": "tbsp", tbsps: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  tsp: "tsp", "tsp.": "tsp", tsps: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  oz: "oz", "oz.": "oz", ounce: "oz", ounces: "oz",
  lb: "lb", "lb.": "lb", lbs: "lb", "lbs.": "lb", pound: "lb", pounds: "lb",
  pt: "pt", "pt.": "pt", pint: "pt", pints: "pt",
  qt: "qt", "qt.": "qt", quart: "qt", quarts: "qt",
  gal: "gal", "gal.": "gal", gallon: "gal", gallons: "gal",
  "fl oz": "fl oz", "fl. oz.": "fl oz", "fl oz.": "fl oz", "fl.oz.": "fl oz",
  "fluid ounce": "fl oz", "fluid ounces": "fl oz",
};

// Exakte (NICHT geschätzte) Umrechnungsfaktoren amerikanischer Maßeinheiten
// in metrische Einheiten - reine Mathematik (1 cup = 236.588 ml usw.), KEINE
// Zutaten-Dichte-Tabelle. Das ist bewusst beschränkt auf "gleichartige"
// Umrechnung (Volumen -> Volumen, Gewicht -> Gewicht): cup/tbsp/tsp/fl oz/
// pt/qt/gal sind Volumenangaben und werden zu ml/l; oz/lb sind
// Gewichtsangaben und werden zu g/kg. Eine Umrechnung Volumen -> Gewicht
// (z.B. "1 cup Mehl" -> Gramm) würde die Dichte der jeweiligen Zutat
// brauchen und wäre damit Raten - das macht diese Karte bewusst NICHT
// automatisch (siehe stattdessen die separate, rein informative
// Umrechnungstabelle im Hauptmenü).
const US_EINHEIT_IN_ML = { cup: 236.588, tbsp: 14.787, tsp: 4.929, "fl oz": 29.574, pt: 473.176, qt: 946.353, gal: 3785.41 };
const US_EINHEIT_IN_G = { oz: 28.3495, lb: 453.592 };

// Unicode-Bruchzeichen als Dezimalwert, fürs exakte Verrechnen bei der
// US-Einheiten-Umrechnung (siehe _usEinheitUmrechnen).
const BRUCH_ZEICHEN_WERT = {
  "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4,
  "⅕": 1 / 5, "⅖": 2 / 5, "⅗": 3 / 5, "⅘": 4 / 5,
  "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8,
};

// Parst EINEN einzelnen Mengen-Wert (ohne Bereich) als Dezimalzahl -
// Ganz-/Kommazahlen ("400", "1,5"), einfache Brüche ("1/2"), Unicode-
// Bruchzeichen ("½") und gemischte Zahlen ("1 1/2", "1 ½"). Anders als
// _mengeNumerischParsen (siehe dortiger Kommentar) werden Brüche hier
// bewusst unterstützt, weil es NICHT ums Aufsummieren mehrerer Zutaten
// geht, sondern nur um die Umrechnung EINER Zutatenzeile in eine andere
// Einheit - dafür muss "1/2 cup" exakt als 0,5 gelesen werden, sonst wäre
// die Umrechnung falsch (parseFloat("1/2") allein ergäbe fälschlich 1).
function _mengeWertParsen(wert) {
  const w = (wert || "").trim();
  if (!w) return null;

  let treffer = w.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/); // gemischt: "1 1/2"
  if (treffer) {
    const nenner = Number(treffer[3]);
    if (!nenner) return null;
    return Number(treffer[1]) + Number(treffer[2]) / nenner;
  }

  treffer = w.match(new RegExp(`^(\\d+)\\s+(${ZUTAT_MENGE_BRUCHZEICHEN})$`)); // gemischt: "1 ½"
  if (treffer) return Number(treffer[1]) + BRUCH_ZEICHEN_WERT[treffer[2]];

  treffer = w.match(/^(\d+)\s*\/\s*(\d+)$/); // einfacher Bruch: "1/2"
  if (treffer) {
    const nenner = Number(treffer[2]);
    if (!nenner) return null;
    return Number(treffer[1]) / nenner;
  }

  if (BRUCH_ZEICHEN_WERT[w] !== undefined) return BRUCH_ZEICHEN_WERT[w]; // "½"

  if (/^\d+(?:[.,]\d+)?$/.test(w)) return parseFloat(w.replace(",", ".")); // "400" / "1,5"

  return null;
}

// Parst eine komplette Mengenangabe, ggf. mit Bereich ("400-500",
// "1/2-3/4", "1 bis 2"), in ein Array aus einer oder zwei Dezimalzahlen.
// Gibt null zurück, wenn irgendein Teil nicht eindeutig lesbar ist - dann
// wird bei der US-Umrechnung bewusst NICHTS verändert, statt zu raten.
function _mengeBereichParsen(text) {
  const w = (text || "").trim();
  if (!w) return null;
  const teile = w.split(/\s*(?:-|–|—|bis)\s*/);
  if (teile.length > 2) return null;
  const werte = teile.map(_mengeWertParsen);
  if (werte.some((v) => v === null || Number.isNaN(v))) return null;
  return werte;
}

// Formatiert eine umgerechnete Zahl zur Anzeige: feste Nachkommastellen-
// Anzahl, überflüssige Nullen entfernt, Komma statt Punkt (wie der Rest der
// Karte Zahlen anzeigt).
function _umgerechneteZahlFormatieren(zahl, nachkommastellen) {
  const faktor = Math.pow(10, nachkommastellen);
  const gerundet = Math.round(zahl * faktor) / faktor;
  return String(gerundet).replace(".", ",");
}

// Rechnet eine erkannte amerikanische Maßeinheit EXAKT in die passende
// metrische Einheit um: Volumen (cup/tbsp/tsp/fl oz/pt/qt/gal) -> ml, ab
// 1000 ml -> l; Gewicht (oz/lb) -> g, ab 1000 g -> kg. Reine Mathematik mit
// festen Faktoren (siehe US_EINHEIT_IN_ML/US_EINHEIT_IN_G oben), KEINE
// Zutaten-Dichte-Tabelle. Lässt Menge/Einheit unverändert, wenn die Einheit
// keine erkannte amerikanische Einheit ist ODER die Menge nicht eindeutig
// als Zahl/Bruch/Bereich lesbar ist (siehe _mengeBereichParsen) - lieber
// nichts umrechnen als falsch raten.
function _usEinheitUmrechnen(amountRoh, unitRoh) {
  const einheitKanonisch = EINHEIT_SYNONYME[(unitRoh || "").trim().toLowerCase()] || "";
  const istVolumen = Object.prototype.hasOwnProperty.call(US_EINHEIT_IN_ML, einheitKanonisch);
  const istGewicht = !istVolumen && Object.prototype.hasOwnProperty.call(US_EINHEIT_IN_G, einheitKanonisch);
  if (!istVolumen && !istGewicht) return { amount: amountRoh, unit: unitRoh };

  const werte = _mengeBereichParsen(amountRoh);
  if (werte === null) return { amount: amountRoh, unit: unitRoh };

  const faktor = istVolumen ? US_EINHEIT_IN_ML[einheitKanonisch] : US_EINHEIT_IN_G[einheitKanonisch];
  const umgerechnet = werte.map((w) => w * faktor);
  const schwelle = 1000;
  const grosseEinheit = istVolumen ? "l" : "kg";
  const kleineEinheit = istVolumen ? "ml" : "g";
  // Einheitlich für den ganzen (ggf. Bereichs-)Wert: der GRÖSSERE Wert
  // entscheidet, damit z.B. "400-1200 g Mehl" nicht als "400 g - 1,2 kg"
  // mit zwei verschiedenen Einheiten im selben Bereich angezeigt wird.
  const nimmGrosseEinheit = Math.max(...umgerechnet) >= schwelle;
  const texte = umgerechnet.map((w) =>
    _umgerechneteZahlFormatieren(nimmGrosseEinheit ? w / schwelle : w, nimmGrosseEinheit ? 2 : 0)
  );
  return { amount: texte.join("-"), unit: nimmGrosseEinheit ? grosseEinheit : kleineEinheit };
}

// Erkennt "Menge Einheit Name" (z.B. "500 g Mehl", "1/2 TL Salz", "½ TL
// Salz", "1,5 EL Öl", "400-500 g Mehl", "eine Prise Salz") - Menge und
// Einheit sind beide optional, damit auch Zeilen ohne erkennbare Menge
// ("Salz nach Geschmack") als Zutat mit leerer Menge/Einheit durchgehen,
// statt komplett zu scheitern.
const ZUTAT_MUSTER = new RegExp(
  `^\\s*(${ZUTAT_MENGE_ZAHL}|${ZUTAT_MENGE_WORT})?` +
  `\\s*(${ZUTAT_EINHEITEN})?` +
  "\\.?\\s*(.+)$",
  "i"
);

// Erkennt eine Zeile, die NUR aus einer Menge (+ optionaler Einheit)
// besteht, OHNE Zutatennamen dahinter - genau das Format, in das z.B.
// Chefkoch Menge und Zutat beim Kopieren trennt (Menge und Name stehen dort
// in zwei Tabellenspalten, die beim Kopieren zu zwei separaten Zeilen
// werden statt "500 g Mehl" auf einer Zeile).
const MENGE_NUR_MUSTER = new RegExp(
  `^\\s*(${ZUTAT_MENGE_ZAHL}|${ZUTAT_MENGE_WORT}|n\\.?\\s*b\\.?|nach belieben|nach bedarf|nach geschmack)` +
  `\\s*(${ZUTAT_EINHEITEN})?\\s*$`,
  "i"
);

// Typische Fuß-/Werbe-/Navigationszeilen, die beim Kopieren von Rezept-
// Webseiten oft mit reinrutschen und keine echte Zutat/Schritt sind.
const FUSSZEILEN_MUSTER = /cookies|rezept drucken|rezept speichern|bewertung abgeben|kommentare\s*\(|ähnliche rezepte|nährwerte|werbung|anzeige|newsletter|abonnieren|pinterest|facebook teilen|^drucken\s*$|jetzt bewerten|zum rezept|inhaltsverzeichnis|springe zu/i;

// Zeilen, die komplett nur aus einem Rezept-Seiten-Metadaten-Label bestehen
// (Zeit-/Schwierigkeits-/Autor-Angaben, die z.B. bei Chefkoch separat von
// Menge/Name/Zubereitungstext mitkopiert werden) - exakte Ganzzeilen-
// Erkennung statt Substring-Treffer, damit z.B. "Schwierigkeit" nicht auch
// innerhalb eines längeren Satzes anschlägt.
const METADATEN_ZEILE_MUSTER = /^(gesamtzeit|arbeitszeit|koch-\/?backzeit|ruhezeit|wartezeit|garzeit|backzeit|zubereitungszeit|schwierigkeit|rezeptautor:?in|profil|difficulty_level|time)\s*:?\s*$/i;
const DAUER_WERT_MUSTER = /^\d+(?:[.,]\d+)?\s*(min\.?|minuten|std\.?|stunden|h)\.?\s*$/i;
const PORTIONSZEILE_MUSTER = /^für\s+\d+\s*(portionen|personen)/i;

// Unterüberschriften INNERHALB des Zutaten-Blocks, mit denen manche Seiten
// die Zutaten in Gruppen aufteilen (z.B. "Für den Teig:" / "Für die
// Füllung:"). Ganzzeilen-Erkennung wie bei METADATEN_ZEILE_MUSTER, damit
// eine echte Zutat wie "Sojasauce" nicht fälschlich anschlägt (nur "Sauce"
// GENAU als eigene Zeile zählt als Unterüberschrift, "Sojasauce" nicht).
const ZUTATEN_UNTERUEBERSCHRIFT_MUSTER = /^(für\s+(den|die|das)\s+[a-zäöüß\s]+|zum\s+[a-zäöüß\s]+|topping|deko(?:ration)?|garnitur|belag|guss|füllung|sauce|dressing|marinade)\s*:?\s*$/i;

// Beginnt mit "Zutaten"/"Ingredients" statt exakt nur diese eine Form zu
// verlangen, da manche Seiten (z.B. kochbar.de) "Zutaten für 6 Personen"
// als eine gemeinsame Überschriftzeile ausgeben statt Überschrift und
// Portionsangabe getrennt. Englische Varianten zusätzlich abgedeckt, falls
// mal ein Rezept von einer englischsprachigen Seite eingefügt wird.
const HEADER_ZUTATEN = /^\s*(zutaten|ingredients?)\b/i;
const HEADER_ZUBEREITUNG = /^\s*(zubereitung|anleitung|schritte|zubereitungsschritte|instructions?|directions?|method|steps)\s*:?\s*$/i;

const KATEGORIE_STICHWORTE = [
  ["Suppe", /suppe/i],
  ["Salat", /salat/i],
  ["Kuchen & Gebäck", /kuchen|torte|gebäck|plätzchen|kekse|muffin/i],
  ["Dessert", /dessert|nachtisch|pudding|mousse/i],
  ["Getränk", /getränk|cocktail|smoothie|milchshake/i],
  ["Frühstück", /frühstück|porridge|müsli/i],
  ["Vorspeise", /vorspeise/i],
  ["Beilage", /beilage/i],
  ["Snack", /\bsnack\b/i],
  ["Hauptgericht", /hauptgericht|hauptspeise|risotto|auflauf|eintopf|schnitzel|braten\b/i],
];

// Rein INFORMATIVE Nachschlagetabelle für den "Umrechnungstabelle"-Knopf im
// Hauptmenü: ungefähre Richtwerte in Gramm für Tasse/EL/TL bei ca. 50 in der
// Küche häufig vorkommenden Zutaten. Das ist bewusst von der automatischen,
// EXAKTEN Einheiten-Umrechnung (siehe _usEinheitUmrechnen) getrennt und wird
// NIE automatisch auf echte Rezeptdaten angewendet: diese Werte hängen von
// der Dichte der jeweiligen Zutat ab (wie fest Mehl im Messbecher sitzt,
// wie fein etwas gemahlen ist usw.) und sind deshalb nur Richtwerte zum
// manuellen Nachschlagen, keine verlässliche Grundlage für automatisches
// Rechnen. Fehlende Felder (z.B. keine "Tasse"-Angabe bei Gewürzen, die
// praktisch nur teelöffelweise vorkommen) werden in der Tabelle als "–"
// angezeigt statt mit einer unüblichen, aber rechnerisch ableitbaren Zahl
// aufgefüllt zu werden.
const UMRECHNUNGSTABELLE_ZUTATEN = [
  { schluessel: "mehl", cup: 120, tbsp: 8, tsp: 2.6 },
  { schluessel: "zucker", cup: 200, tbsp: 12.5, tsp: 4.2 },
  { schluessel: "puderzucker", cup: 120, tbsp: 7.5 },
  { schluessel: "brauner_zucker", cup: 220, tbsp: 13.8 },
  { schluessel: "butter", cup: 227, tbsp: 14.2, tsp: 4.7 },
  { schluessel: "honig", cup: 340, tbsp: 21 },
  { schluessel: "ahornsirup", cup: 315, tbsp: 20 },
  { schluessel: "pflanzenoel", cup: 218, tbsp: 13.6 },
  { schluessel: "olivenoel", cup: 216, tbsp: 13.5 },
  { schluessel: "milch", cup: 240, tbsp: 15 },
  { schluessel: "sahne", cup: 240, tbsp: 15 },
  { schluessel: "wasser", cup: 237, tbsp: 14.8, tsp: 4.9 },
  { schluessel: "joghurt", cup: 245, tbsp: 15.3 },
  { schluessel: "saure_sahne", cup: 230, tbsp: 14.4 },
  { schluessel: "frischkaese", cup: 232, tbsp: 14.5 },
  { schluessel: "reis", cup: 185 },
  { schluessel: "haferflocken", cup: 90 },
  { schluessel: "kakaopulver", cup: 85, tbsp: 5.3 },
  { schluessel: "backpulver", tbsp: 12, tsp: 4 },
  { schluessel: "natron", tbsp: 13.8, tsp: 4.6 },
  { schluessel: "salz", tbsp: 18, tsp: 6 },
  { schluessel: "hefe", tbsp: 9.3, tsp: 3.1 },
  { schluessel: "mandeln", cup: 96, tbsp: 6 },
  { schluessel: "walnuesse", cup: 100, tbsp: 6.3 },
  { schluessel: "haselnuesse", cup: 115, tbsp: 7.2 },
  { schluessel: "rosinen", cup: 150, tbsp: 9.4 },
  { schluessel: "schokostueckchen", cup: 170, tbsp: 10.6 },
  { schluessel: "semmelbroesel", cup: 108, tbsp: 6.8 },
  { schluessel: "parmesan", cup: 100, tbsp: 6.3 },
  { schluessel: "kaese_gerieben", cup: 110, tbsp: 6.9 },
  { schluessel: "quinoa", cup: 170 },
  { schluessel: "linsen", cup: 190 },
  { schluessel: "couscous", cup: 175 },
  { schluessel: "erdnussbutter", cup: 258, tbsp: 16.1 },
  { schluessel: "tomatenmark", cup: 262, tbsp: 16.4 },
  { schluessel: "essig", cup: 240, tbsp: 15 },
  { schluessel: "zitronensaft", cup: 245, tbsp: 15.3 },
  { schluessel: "vanilleextrakt", tbsp: 12.5, tsp: 4.2 },
  { schluessel: "zimt", tbsp: 7.8, tsp: 2.6 },
  { schluessel: "ingwer_gemahlen", tbsp: 5.4, tsp: 1.8 },
  { schluessel: "paprikapulver", tbsp: 6.9, tsp: 2.3 },
  { schluessel: "pfeffer", tbsp: 6.9, tsp: 2.3 },
  { schluessel: "knoblauchpulver", tbsp: 9.3, tsp: 3.1 },
  { schluessel: "kurkuma", tbsp: 9, tsp: 3 },
  { schluessel: "sesam", cup: 144, tbsp: 9 },
  { schluessel: "leinsamen", cup: 168, tbsp: 10.5 },
  { schluessel: "chiasamen", cup: 170, tbsp: 10.6 },
  { schluessel: "kokosflocken", cup: 80, tbsp: 5 },
  { schluessel: "kokosmilch", cup: 240, tbsp: 15 },
  { schluessel: "maisstaerke", cup: 120, tbsp: 7.5, tsp: 2.5 },
  { schluessel: "vollkornmehl", cup: 120, tbsp: 7.5 },
  { schluessel: "dinkelmehl", cup: 115, tbsp: 7 },
  { schluessel: "griess", cup: 180 },
  { schluessel: "senf", tbsp: 15, tsp: 5 },
  { schluessel: "sojasauce", cup: 255, tbsp: 16 },
  { schluessel: "ketchup", cup: 270, tbsp: 17 },
  { schluessel: "mayonnaise", cup: 220, tbsp: 13.8 },
  { schluessel: "buttermilch", cup: 245, tbsp: 15.3 },
  { schluessel: "kondensmilch", cup: 306, tbsp: 19 },
  { schluessel: "petersilie", cup: 60, tbsp: 3.8 },
  { schluessel: "basilikum", cup: 40, tbsp: 2.5 },
  { schluessel: "oregano", tbsp: 4.5, tsp: 1.5 },
  { schluessel: "thymian", tbsp: 4.2, tsp: 1.4 },
  { schluessel: "muskatnuss", tbsp: 6.6, tsp: 2.2 },
  { schluessel: "kreuzkuemmel", tbsp: 6.3, tsp: 2.1 },
  { schluessel: "cayennepfeffer", tbsp: 5.4, tsp: 1.8 },
  { schluessel: "pekannuesse", cup: 110, tbsp: 6.9 },
  { schluessel: "cashewkerne", cup: 120, tbsp: 7.5 },
  { schluessel: "pistazien", cup: 120, tbsp: 7.5 },
  { schluessel: "panko", cup: 60, tbsp: 3.8 },
];

// Deutsche Anzeigenamen für die Zutaten oben, in GENAU derselben Reihenfolge
// wie UMRECHNUNGSTABELLE_ZUTATEN (per Index zusammengeführt, siehe
// RezeptbuchCard._umrechnungstabelleNamen()). Die Namen aller anderen
// Sprachen stehen im Feld "zutaten" der jeweiligen Sprachdatei.
const UMRECHNUNGSTABELLE_NAMEN = {
  de: ["Mehl (Weizen, Type 405)", "Zucker (Kristallzucker)", "Puderzucker", "Brauner Zucker (fest gepackt)", "Butter", "Honig", "Ahornsirup", "Pflanzenöl", "Olivenöl", "Milch", "Sahne (Schlagsahne)", "Wasser", "Naturjoghurt", "Saure Sahne", "Frischkäse", "Reis, ungekocht (Langkorn)", "Haferflocken", "Kakaopulver", "Backpulver", "Natron", "Salz, fein", "Hefe, trocken", "Mandeln, gemahlen", "Walnüsse, gehackt", "Haselnüsse, gehackt", "Rosinen", "Schokoladenstückchen", "Semmelbrösel, trocken", "Parmesan, gerieben", "Käse, gerieben (z.B. Gouda, Cheddar)", "Quinoa, ungekocht", "Linsen, getrocknet", "Couscous, trocken", "Erdnussbutter", "Tomatenmark", "Essig", "Zitronensaft", "Vanilleextrakt", "Zimt, gemahlen", "Ingwer, gemahlen", "Paprikapulver", "Pfeffer, gemahlen", "Knoblauchpulver", "Kurkuma, gemahlen", "Sesam (Sesamsamen)", "Leinsamen", "Chiasamen", "Kokosflocken, ungesüßt", "Kokosmilch (Dose, flüssig)", "Maisstärke", "Vollkornmehl (Weizen)", "Dinkelmehl", "Grieß (Hartweizen)", "Senf (Dijon)", "Sojasauce", "Ketchup", "Mayonnaise", "Buttermilch", "Kondensmilch, gezuckert", "Petersilie, frisch, gehackt", "Basilikum, frisch, gehackt", "Oregano, getrocknet", "Thymian, getrocknet", "Muskatnuss, gemahlen", "Kreuzkümmel, gemahlen", "Cayennepfeffer", "Pekannüsse, gehackt", "Cashewkerne, gehackt", "Pistazien, gehackt", "Panko (grobe Semmelbrösel)"],
};

function _zutatZeileParsen(rohzeile) {
  // Führende Listenzeichen ("-", "*", "•") entfernen, wie sie beim Kopieren
  // von Webseiten/Chefkoch häufig vorkommen.
  const zeile = rohzeile.replace(/^\s*[-*•]\s*/, "");
  const treffer = zeile.match(ZUTAT_MUSTER);
  if (!treffer) return { amount: "", unit: "", name: zeile.trim() };
  const [, amount, unit, name] = treffer;
  // Amerikanische Einheiten werden bei der Erkennung automatisch exakt in
  // Metrik umgerechnet (siehe _usEinheitUmrechnen) - bewusst NUR gleichartig
  // (Volumen->Volumen, Gewicht->Gewicht), ohne Dichte-Schätzung.
  const umgerechnet = _usEinheitUmrechnen((amount || "").trim(), (unit || "").trim());
  return { amount: umgerechnet.amount, unit: umgerechnet.unit, name: name.trim() };
}

// Ermittelt, ob in einem Zutaten-Block die Menge VOR dem Namen steht
// (z.B. Chefkoch, einfachkochen.de: "400 g" -> "Risottoreis") oder NACH dem
// Namen (z.B. kochbar.de: "Rinderschulter" -> "1 kg") - je nachdem, in
// welcher Spalten-Reihenfolge die Tabelle beim Kopieren zu Zeilen wird.
// Beide Reihenfolgen kommen bei großen Rezeptseiten real vor.
function _zutatenReihenfolgeErmitteln(kandidaten) {
  for (let i = 0; i < kandidaten.length - 1; i++) {
    const aMenge = MENGE_NUR_MUSTER.test(kandidaten[i]);
    const bMenge = MENGE_NUR_MUSTER.test(kandidaten[i + 1]);
    if (aMenge && !bMenge) return "menge-zuerst";
    if (!aMenge && bMenge) return "name-zuerst";
  }
  return "menge-zuerst";
}

// Zutaten-Block parsen, wenn Menge und Name auf ZWEI getrennten Zeilen
// stehen, statt wie im einfachen Fall auf einer - in beiden vorkommenden
// Reihenfolgen (siehe _zutatenReihenfolgeErmitteln).
function _zutatenPaarweiseParsen(zeilen, reihenfolge) {
  const ergebnis = [];
  let i = 0;
  while (i < zeilen.length) {
    const zeile = (zeilen[i] || "").replace(/^\s*[-*•]\s*/, "").trim();
    i++;
    if (!zeile || PORTIONSZEILE_MUSTER.test(zeile) || FUSSZEILEN_MUSTER.test(zeile) || METADATEN_ZEILE_MUSTER.test(zeile) || ZUTATEN_UNTERUEBERSCHRIFT_MUSTER.test(zeile)) continue;

    const istMenge = MENGE_NUR_MUSTER.test(zeile);

    if (reihenfolge === "name-zuerst") {
      // Name kommt zuerst, die (optionale) Menge steht in der nächsten
      // nicht-leeren Zeile (kochbar.de-Stil).
      if (istMenge) continue; // Menge ohne vorausgehenden Namen - überspringen
      let amount = "", unit = "";
      let j = i;
      while (j < zeilen.length && !zeilen[j].trim()) j++;
      if (j < zeilen.length) {
        const naechste = zeilen[j].replace(/^\s*[-*•]\s*/, "").trim();
        const mengeTreffer = naechste.match(MENGE_NUR_MUSTER);
        if (mengeTreffer) {
          amount = (mengeTreffer[1] || "").trim();
          unit = (mengeTreffer[2] || "").trim();
          i = j + 1;
        }
      }
      const umgerechnet1 = _usEinheitUmrechnen(amount, unit);
      ergebnis.push({ amount: umgerechnet1.amount, unit: umgerechnet1.unit, name: zeile });
      continue;
    }

    // Standard: Menge kommt zuerst (Chefkoch-Stil).
    if (!istMenge) {
      // Keine vorausgehende Mengenzeile nötig - eigenständige Zutat ohne
      // Menge/Einheit (z.B. "Salz und Pfeffer").
      ergebnis.push({ amount: "", unit: "", name: zeile });
      continue;
    }

    const mengeTreffer = zeile.match(MENGE_NUR_MUSTER);
    const [, amount, unit] = mengeTreffer;
    let name = "";
    while (i < zeilen.length && !zeilen[i].trim()) i++;
    if (i < zeilen.length) {
      name = zeilen[i].replace(/^\s*[-*•]\s*/, "").trim();
      i++;
    }
    if (!name) continue;

    // Zusatzangaben wie "oder Gemüsebrühe" direkt anhängen statt als
    // eigene, sinnlose mengenlose Zutat zu werten.
    while (i < zeilen.length && /^oder\b/i.test(zeilen[i].trim())) {
      name += ` (${zeilen[i].trim()})`;
      i++;
    }

    const umgerechnet2 = _usEinheitUmrechnen((amount || "").trim(), (unit || "").trim());
    ergebnis.push({ amount: umgerechnet2.amount, unit: umgerechnet2.unit, name });
  }
  return ergebnis;
}

// Entscheidet automatisch zwischen "eine Zeile pro Zutat" (einfaches
// Format, von den meisten WordPress-Rezept-Plugins wie WP Recipe Maker
// verwendet) und "Menge/Name auf getrennten Zeilen" (großes Redaktions-
// portal-Format wie Chefkoch/kochbar.de): wenn ein großer Anteil der Zeilen
// NUR aus einer Menge besteht, ist es eindeutig das getrennte Format.
function _zutatenBlockParsen(zeilen) {
  const kandidaten = zeilen
    .map((z) => (z || "").replace(/^\s*[-*•]\s*/, "").trim())
    .filter((z) => z && !PORTIONSZEILE_MUSTER.test(z) && !FUSSZEILEN_MUSTER.test(z) && !METADATEN_ZEILE_MUSTER.test(z) && !ZUTATEN_UNTERUEBERSCHRIFT_MUSTER.test(z));

  const mengeNurAnzahl = kandidaten.filter((z) => MENGE_NUR_MUSTER.test(z)).length;
  const paarweise = kandidaten.length > 0 && mengeNurAnzahl / kandidaten.length >= 0.25;

  if (paarweise) {
    const reihenfolge = _zutatenReihenfolgeErmitteln(kandidaten);
    return _zutatenPaarweiseParsen(zeilen, reihenfolge).filter((z) => z.name);
  }
  return zeilen
    .map((z) => (z || "").trim())
    .filter((z) => z && !FUSSZEILEN_MUSTER.test(z) && !ZUTATEN_UNTERUEBERSCHRIFT_MUSTER.test(z.replace(/^\s*[-*•]\s*/, "")))
    .map(_zutatZeileParsen)
    .filter((z) => z.name);
}

// Zubereitungsschritte aus Zeilen ermitteln - unterstützt sowohl "1. Text"
// (Nummer + Text auf derselben Zeile) als auch "1" allein auf einer Zeile
// gefolgt vom Text auf der/den nächsten Zeile(n), wie es beim Kopieren von
// Chefkoch-Tabellenzellen entsteht, als auch Bindestrich-Aufzählungen.
// Metadaten-Zeilen (Zeiten, Schwierigkeit usw.) werden dabei herausgefiltert
// statt als Text mit reinzurutschen.
function _schritteAusZeilenErmitteln(zeilen) {
  const NUMMER_MIT_TEXT = /^\s*(\d+)\s*[.)]\s*(.*)$/;
  const NUMMER_ALLEIN = /^\s*\d+\s*$/;
  const AUFZAEHLUNGSZEICHEN = /^\s*[-*•]\s*/;

  // Manche Seiten trennen Zubereitungsschritte gar nicht durch Nummern
  // oder Aufzählungszeichen, sondern nur durch Leerzeilen zwischen
  // Absätzen. Ohne diese Erkennung würde jede einzelne (evtl. nur durch
  // Zeilenumbruch beim Kopieren entstandene) Textzeile fälschlich als
  // eigener, meist unvollständiger "Schritt" gewertet. Ist GAR KEINE
  // Nummerierung/Aufzählung im gesamten Block erkennbar, wird deshalb
  // stattdessen absatzweise gruppiert: jede Folge zusammenhängender,
  // nicht-leerer Zeilen wird zu einem Schritt zusammengefasst.
  const hatMarkierung = zeilen.some((z) => {
    const t = (z || "").trim();
    if (!t) return false;
    return NUMMER_MIT_TEXT.test(t) || NUMMER_ALLEIN.test(t) || AUFZAEHLUNGSZEICHEN.test(t);
  });

  if (!hatMarkierung) {
    const absatzSteps = [];
    let absatz = [];
    const absatzSchliessen = () => {
      if (absatz.length) absatzSteps.push(absatz.join(" ").trim());
      absatz = [];
    };
    for (const rohzeile of zeilen) {
      const zeile = (rohzeile || "").trim();
      if (!zeile) {
        absatzSchliessen();
        continue;
      }
      if (FUSSZEILEN_MUSTER.test(zeile) || METADATEN_ZEILE_MUSTER.test(zeile) || DAUER_WERT_MUSTER.test(zeile)) continue;
      absatz.push(zeile);
    }
    absatzSchliessen();
    return absatzSteps.filter(Boolean);
  }

  const steps = [];
  let puffer = null;

  const puffernSchliessen = () => {
    if (puffer !== null && puffer.trim()) steps.push(puffer.trim());
    puffer = null;
  };

  for (const rohzeile of zeilen) {
    const getrimmt = (rohzeile || "").trim();
    if (!getrimmt) continue;
    // Aufzählungszeichen entfernen (z.B. ichkoche.at nummeriert Schritte
    // nicht, sondern nutzt "- Text" pro Schritt), bevor auf Nummerierung
    // geprüft wird - sonst bliebe der Bindestrich im Schritt-Text stehen.
    const zeile = getrimmt.replace(/^[-*•]\s*/, "");
    if (!zeile) continue;
    if (FUSSZEILEN_MUSTER.test(zeile) || METADATEN_ZEILE_MUSTER.test(zeile) || DAUER_WERT_MUSTER.test(zeile)) continue;

    const mitText = zeile.match(NUMMER_MIT_TEXT);
    if (mitText) {
      puffernSchliessen();
      puffer = mitText[2] || "";
      continue;
    }
    if (NUMMER_ALLEIN.test(zeile)) {
      puffernSchliessen();
      puffer = "";
      continue;
    }

    if (puffer !== null) {
      puffer += (puffer ? " " : "") + zeile;
    } else {
      steps.push(zeile);
    }
  }
  puffernSchliessen();
  return steps;
}

function _rezeptTitelErmitteln(zeilen) {
  for (const zeile of zeilen) {
    const t = zeile.trim();
    if (!t) continue;
    if (t.length > 80) continue;
    if (HEADER_ZUTATEN.test(t) || HEADER_ZUBEREITUNG.test(t)) continue;
    if (FUSSZEILEN_MUSTER.test(t) || METADATEN_ZEILE_MUSTER.test(t)) continue;
    if ((t.match(/>/g) || []).length >= 2) continue; // Breadcrumb "Home > Rezepte > ..."
    return t;
  }
  return "";
}

function _rezeptPortionenErmitteln(text) {
  const treffer = text.match(/(\d+)\s*(portionen|personen|stück|servings)/i);
  return treffer ? Number(treffer[1]) : null;
}

function _rezeptKategorieErmitteln(title, volltext) {
  // Zuerst nur den Titel prüfen - zuverlässiger als der ganze Text, der oft
  // harmlose Erwähnungen enthält, die in die Irre führen (z.B. "Dazu passt
  // Blattsalat." am Ende - das macht aus einem Risotto keinen Salat).
  for (const [kategorie, muster] of KATEGORIE_STICHWORTE) {
    if (muster.test(title)) return kategorie;
  }
  // Serviervorschlags-Sätze ("Dazu passt/reicht ...") vor der Volltext-
  // Suche entfernen, da sie eine andere Beilage nennen, nicht das Gericht
  // selbst.
  const bereinigt = volltext.replace(/dazu (passt|reicht|schmeckt)[^.]*\.?/gi, "");
  for (const [kategorie, muster] of KATEGORIE_STICHWORTE) {
    if (muster.test(bereinigt)) return kategorie;
  }
  return "Sonstiges";
}

// Zentrale Erkennungsfunktion: nimmt beliebigen (z.B. von einer Rezept-
// Webseite kopierten) Text entgegen und versucht, Titel, Portionen,
// Kategorie, Zutaten und Zubereitungsschritte herauszulesen. Rein
// heuristisch - liefert bei unstrukturiertem Text ggf. unvollständige oder
// falsch zugeordnete Ergebnisse, die dann im Formular von Hand nachgebessert
// werden können (daher werden auch Teilergebnisse zurückgegeben, nicht
// alles-oder-nichts).
function rezeptAusTextErkennen(rohtext) {
  const zeilen = rohtext.split(/\r?\n/).map((z) => z.trim());
  const title = _rezeptTitelErmitteln(zeilen);
  const servings = _rezeptPortionenErmitteln(rohtext);
  const category = _rezeptKategorieErmitteln(title, rohtext);

  const zutatenStart = zeilen.findIndex((z) => HEADER_ZUTATEN.test(z));
  const zubereitungStart = zeilen.findIndex((z) => HEADER_ZUBEREITUNG.test(z));

  let ingredients = [];
  let steps = [];

  if (zutatenStart !== -1) {
    const ende = zubereitungStart !== -1 && zubereitungStart > zutatenStart ? zubereitungStart : zeilen.length;
    ingredients = _zutatenBlockParsen(zeilen.slice(zutatenStart + 1, ende));
  }

  if (zubereitungStart !== -1) {
    steps = _schritteAusZeilenErmitteln(zeilen.slice(zubereitungStart + 1));
  }

  // Fallback ohne erkennbare "Zutaten"/"Zubereitung"-Überschriften: erste
  // Reihe kurzer, listenartiger Zeilen als Zutaten werten, danach folgende
  // Zeilen als Zubereitungsschritte - besser als gar nichts zu erkennen.
  if (ingredients.length === 0 && steps.length === 0) {
    let inZutaten = true;
    for (const zeile of zeilen) {
      if (!zeile || FUSSZEILEN_MUSTER.test(zeile) || zeile === title) continue;
      const siehtNachZutatAus = zeile.length <= 60 && /^\s*(\d|ein|eine|einige|etwas|wenig|mehrere)/i.test(zeile);
      if (inZutaten && siehtNachZutatAus) {
        ingredients.push(_zutatZeileParsen(zeile));
      } else {
        inZutaten = false;
        steps.push(zeile.replace(/^\s*(\d+[.)]|schritt\s*\d+\s*:?|[-•*])\s*/i, "").trim());
      }
    }
  }

  return { title, servings, category, ingredients, steps };
}

// Anpassbare Farben (Einstellungen -> Farben). Jede Rolle ersetzt eine
// CSS-Variable der Karte; ohne gespeicherten Wert gilt die Standardfarbe.
// "standard" dient nur als Startwert des Farbwählers - gespeichert wird
// ausschließlich, was der Nutzer tatsächlich geändert hat.
const FARB_ROLLEN = [
  { schluessel: "akzent", standard: "#b25d2b", labelSchluessel: "farben_akzent_label" },
  { schluessel: "akzentText", standard: "#96481f", labelSchluessel: "farben_akzent_text_label" },
  { schluessel: "loeschen", standard: "#a8402a", labelSchluessel: "farben_loeschen_label" },
  { schluessel: "sterne", standard: "#d9a441", labelSchluessel: "farben_sterne_label" },
  { schluessel: "titel", standard: "#3a3a3a", labelSchluessel: "farben_titel_label" },
];

// Nur streng geprüfte #rrggbb-Werte dürfen ins CSS - schließt
// CSS-Injection über manipulierte Einstellungen aus.
function hexFarbeGueltig(wert) {
  return typeof wert === "string" && /^#[0-9a-fA-F]{6}$/.test(wert);
}

function hexZuRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Weiß oder fast Schwarz als Schriftfarbe, je nachdem was auf der Fläche
// besser lesbar ist (WCAG-Leuchtdichte).
function schriftfarbeAuf(hex) {
  const [r, g, b] = hexZuRgb(hex).map((k) => {
    const c = k / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const leuchtdichte = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return leuchtdichte > 0.4 ? "#1a1a1a" : "#ffffff";
}

class RezeptbuchCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rezepte = [];
    this._ansicht = "liste"; // liste | detail | formular
    this._aktivesRezept = null;
    this._portionen = null;
    this._geladen = false;
    this._suchbegriff = "";
    this._aktiveKategorie = "Alle";
    this._sortierung = "titel";
    this._einrichtungNoetig = false; // true = To-do-Liste fehlt, Einrichtungs-Ansicht zeigen
    this._hinweisText = null; // offene Meldung (Ersatz für alert()), siehe _hinweis()
    this._autoSicherungTag = null; // Tag der letzten automatischen Sicherung dieser Sitzung
    this._historyGeschoben = false;
    this._popstateHandler = null;
    this._programmatischerPop = false;
    this._letztePosition = 0;
    this._scrollContainer = null;
    this._bearbeitungsSnapshot = null;
    // Tag-Filter (feature 3): AND-verknüpft mit der Kategorie und dem
    // Suchbegriff - ein Rezept muss ALLE aktiven Tags tragen, um zu passen.
    this._aktiveTags = new Set();
    // Einkaufslisten-Auswahlmodus (feature 1): solange aktiv, wird jede
    // Rezept-Kachel mit einer Checkbox statt einem Öffnen-Klick angezeigt.
    this._einkaufslistenModus = false;
    this._ausgewaehlteRezepte = new Set();
    // Wochenplan + Kochbücher (features 2/3) leben als versteckte Items in
    // derselben To-do-Liste (siehe WOCHENPLAN_MARKER/KOCHBUECHER_MARKER) -
    // _rezepteLaden() befüllt diese beim Laden.
    this._wochenplanItem = null;
    this._wochenplan = null;
    // Welche der zwei Wochen (diese Woche / Folgewoche) die Wochenplan-
    // Ansicht gerade zeigt - wird beim Öffnen der Ansicht auf "diese"
    // zurückgesetzt (siehe _wochenplanAnzeigen).
    this._wochenplanAnsicht = "diese";
    this._kochbuecherItem = null;
    this._kochbuecher = [];
    // Selbst angelegte Kategorien (siehe KATEGORIEN_MARKER/_alleKategorien) -
    // reine Liste von Namen, on top of den fest eingebauten KATEGORIEN.
    this._kategorienItem = null;
    this._eigeneKategorien = [];
    // Gespeicherte Nutzer-Einstellungen (siehe EINSTELLUNGEN_MARKER) - aktuell
    // nur der Statistik-Ein-/Ausschalter, showStatistics: true ist der
    // Standard (Statistik sichtbar), solange nichts anderes gespeichert ist.
    this._einstellungenItem = null;
    this._einstellungen = { erfassungAktiv: true };
    this._einstellungenModalSichtbar = false;
    // ID der gerade im Umrechnungstabelle-Popup bearbeiteten eigenen Zutat
    // (siehe _umrechnungstabelleEigeneBearbeitenOeffnen) - null = das
    // Formular legt beim Speichern eine NEUE Zutat an statt eine
    // bestehende zu ersetzen.
    this._umrechnungstabelleBearbeiteId = null;
    // Paginierung der Rezeptübersicht (feature: viele Rezepte auf mehrere
    // Seiten aufteilen statt alle auf einmal zu zeigen) - 1-basiert, wird
    // bei jeder Filter-/Sortier-/Suchänderung auf 1 zurückgesetzt (siehe
    // _filterZuruecksetzen), damit man nicht z.B. auf Seite 3 landet, auf
    // der es nach dem neuen Filter gar keine Rezepte mehr gibt.
    this._aktuelleSeite = 1;
    // Update-Hinweis (siehe _updatePruefen): null solange nicht (fertig)
    // geprüft, sonst die auf GitHub gefundene neuere Versionsnummer (ohne
    // führendes "v") oder false, falls keine neuere Version existiert.
    this._updateHinweisVersion = null;
    this._updateHinweisAusgeblendet = false;
    // Ressourcen-Versions-Hinweis (siehe _ressourcenVersionPruefen): enthält
    // die aktuelle "?v="-Versionsnummer aus der eigenen Skript-URL, sobald
    // erkannt wurde, dass sich CARD_VERSION geändert hat, diese Nummer aber
    // nicht - sonst null.
    this._ressourcenVersionsHinweis = null;
    this._ressourcenVersionsHinweisAusgeblendet = false;

    // Kochmodus (Vollbild-Schritt-für-Schritt-Ansicht in der Detailansicht,
    // siehe _renderDetail/_kochmodus*) - _kochmodusSchrittIndex ist
    // 0-basiert, im Gegensatz zur 1-basierten Anzeige für den Nutzer.
    this._kochmodusAktiv = false;
    this._kochmodusSchrittIndex = 0;
    this._kochmodusZutatenSichtbar = false;

    // Kochmodus-Timer (siehe _kochmodusTimer*): läuft unabhängig vom
    // aktuellen Schritt weiter (z.B. "20 Min. im Ofen", während man schon
    // im Text weiterliest) - wird daher NICHT bei _kochmodusSchrittWechseln
    // zurückgesetzt, sondern nur beim Verlassen des Kochmodus/Rezepts.
    // _kochmodusTimerEndeZeitpunkt ist ein absoluter Date.now()-Zeitstempel
    // (nicht die verbleibende Dauer) - so bleibt die Anzeige auch dann
    // korrekt, wenn der Tab zwischenzeitlich gedrosselt/inaktiv war.
    this._kochmodusTimerPanelSichtbar = false;
    this._kochmodusTimerEndeZeitpunkt = null;
    this._kochmodusTimerAbgelaufen = false;
    this._kochmodusTimerIntervallId = null;

    // Screen Wake Lock (siehe _kochmodusWakeLock*): hält den Bildschirm
    // hell, solange der Kochmodus offen ist, damit man beim Kochen nicht
    // ständig neu entsperren muss. Das Wake-Lock-Objekt selbst (null,
    // solange keins gehalten wird) sowie der Handler für "sichtbar
    // geworden" (die Sperre wird vom Browser automatisch freigegeben,
    // sobald der Tab in den Hintergrund wechselt, und muss beim
    // Zurückkommen erneut angefordert werden).
    this._kochmodusWakeLock = null;
    this._kochmodusSichtbarkeitsHandler = null;

    // Sammel-PDF-Modal (siehe _sammelPdfModalOeffnen/_sammelPdf*): merkt
    // sich zwischen den Modal-Schritten die aktuell gefilterte Rezeptliste,
    // die vom Nutzer angehakten UIDs sowie ob "alle" oder eine "auswahl"
    // exportiert werden soll.
    this._sammelPdfGefilterteListe = [];
    this._sammelPdfAusgewaehlteUids = new Set();
    this._sammelPdfWahlModus = "alle";
  }

  // Ermittelt die aktive Anzeigesprache: Deutsch ist Standard/Rückfall
  // (siehe CONTRIBUTING.md) - das gilt sowohl, wenn hass.language fehlt
  // (z.B. im Test-Mock, siehe test/rezeptbuch-card.test.js, der .language
  // nie setzt) als auch, wenn es explizit "de" ist. Unterstützt werden alle
  // 24 offiziellen Amtssprachen der EU plus Schwiizerdütsch (siehe
  // UNTERSTUETZTE_SPRACHEN); jede andere Sprache (z.B. "tr", "ar") fällt
  // mangels eigener Übersetzung auf Englisch zurück.
  _sprache() {
    const roh = ((this._hass && this._hass.language) || "").toLowerCase();
    if (!roh) return "de";
    // Sonderfall Schwiizerdütsch: Home Assistant verwendet dafür den
    // DREIstelligen Code "gsw" (keine Variante von "de") - die sonst
    // übliche Kürzung auf die ersten zwei Buchstaben (siehe unten, für
    // Varianten wie "en-US"/"de-AT") würde daraus fälschlich "gs" machen
    // und die Sprache verfehlen. Deshalb wird "gsw"/"gsw-CH" o.ä. VOR
    // dieser Kürzung geprüft.
    if (roh === "gsw" || roh.startsWith("gsw-")) return "gsw";
    // Nur die ersten zwei Buchstaben auswerten, damit Varianten wie
    // "en-US" oder "de-AT" ebenfalls erkannt werden.
    const kurz = roh.slice(0, 2);
    if (kurz === "de") return "de";
    if (UNTERSTUETZTE_SPRACHEN.has(kurz)) return kurz;
    return "en";
  }

  // Zentrale Übersetzungs-Funktion: schlägt "schluessel" in der aktiven
  // Sprache nach, fällt (sollte eigentlich nie nötig sein, sofern die
  // Übersetzungstabelle vollständig gepflegt ist) auf Deutsch zurück und
  // ersetzt einfache "{{platzhalter}}"-Stellen aus "ersetzungen".
  _t(schluessel, ersetzungen) {
    const sprache = this._sprache();
    const nachgeladen = sprache === "de" ? null : sprachtabelle(sprache);
    const tabelle = (nachgeladen && nachgeladen.texte) || UEBERSETZUNGEN.de;
    let text = tabelle[schluessel];
    if (text === undefined) text = UEBERSETZUNGEN.de[schluessel];
    if (text === undefined) return schluessel; // sollte nie vorkommen, siehe oben
    if (ersetzungen) {
      Object.keys(ersetzungen).forEach((name) => {
        // Ersatz bewusst als Funktion statt als String: bei einem String
        // interpretiert replace() Sonderfolgen wie "$&" oder "$'" - ein
        // Rezepttitel wie "Pizza für $& Freunde" würde sonst verstümmelt.
        const wert = String(ersetzungen[name]);
        text = text.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), () => wert);
      });
    }
    return text;
  }

  // Übersetzte Anzeige-Bezeichnung einer Kategorie - der intern
  // gespeicherte/verglichene Wert (this._aktiveKategorie, r.category usw.)
  // bleibt davon unberührt immer der deutsche String aus KATEGORIEN (siehe
  // KATEGORIE_SCHLUESSEL). Für eine selbst angelegte Kategorie (nicht in
  // KATEGORIE_SCHLUESSEL enthalten) gibt es keine Übersetzung - dort wird
  // der Name unverändert angezeigt, so wie der Nutzer ihn eingetippt hat,
  // statt ihn fälschlich als "Sonstiges" zu beschriften.
  _kategorieLabel(kategorie) {
    const schluessel = KATEGORIE_SCHLUESSEL[kategorie];
    if (schluessel) return this._t(schluessel);
    return kategorie || this._t(KATEGORIE_SCHLUESSEL["Sonstiges"]);
  }

  // Übersetzte Anzeige-Bezeichnung eines Wochentags - siehe WOCHENTAGE.
  _wochentagLabel(wochentag) {
    return this._t(wochentag.labelSchluessel);
  }

  connectedCallback() {
    this._popstateHandler = () => {
      if (this._programmatischerPop) {
        // Dieser "Pop" kam von unserem eigenen history.back()-Aufruf
        // (z.B. nach Klick auf Zurück/Abbrechen/Speichern), nicht von
        // einem echten Tastendruck - jetzt tatsächlich zur Liste wechseln.
        this._programmatischerPop = false;
        if (this._ansicht !== "liste") {
          this._zurListe();
        }
        return;
      }

      // Ab hier: ein ECHTER Zurück-Tastendruck/-Wisch des Geräts.
      if (this._ansicht === "detail" && this._zubereitetAbfrageAktiv()) {
        // Bei einer offenen Rezept-Detailansicht zuerst fragen, ob
        // zubereitet wurde - dazu den soeben verbrauchten History-Eintrag
        // wiederherstellen, statt direkt zur Liste zu springen. Über den
        // Schalter in den Statistik-Einstellungen lässt sich diese
        // Abfrage komplett abschalten (siehe _zurueck-btn-Handler).
        history.pushState({ rezeptbuchOffen: true }, "", location.href);
        this._historyGeschoben = true;
        this._zubereitetModalAnzeigen();
        return;
      }

      if (this._ansicht !== "liste") {
        this._historyGeschoben = false;
        this._zurListe();
      }
    };
    window.addEventListener("popstate", this._popstateHandler);

    // Wake Lock wird vom Browser automatisch aufgehoben, sobald der Tab
    // in den Hintergrund wechselt (z.B. Bildschirm gesperrt, App-Wechsel)
    // - bei Rückkehr und weiterhin aktivem Kochmodus hier erneut anfordern.
    this._kochmodusSichtbarkeitsHandler = () => {
      if (document.visibilityState === "visible" && this._kochmodusAktiv) {
        this._kochmodusWakeLockAnfordern();
      }
    };
    document.addEventListener("visibilitychange", this._kochmodusSichtbarkeitsHandler);
  }

  disconnectedCallback() {
    if (this._popstateHandler) {
      window.removeEventListener("popstate", this._popstateHandler);
      this._popstateHandler = null;
    }
    if (this._kochmodusSichtbarkeitsHandler) {
      document.removeEventListener("visibilitychange", this._kochmodusSichtbarkeitsHandler);
      this._kochmodusSichtbarkeitsHandler = null;
    }
    this._kochmodusTimerIntervallStoppen();
    this._kochmodusWakeLockFreigeben();
  }

  _zubereitetModalAnzeigen() {
    const modal = this.shadowRoot.getElementById("zubereitet-modal");
    if (modal) modal.style.display = "flex";
  }

  _historyEintragSicherstellen() {
    if (!this._historyGeschoben) {
      history.pushState({ rezeptbuchOffen: true }, "", location.href);
      this._historyGeschoben = true;
    }
  }

  _historyZuruecksetzen() {
    if (this._historyGeschoben) {
      this._historyGeschoben = false;
      this._programmatischerPop = true;
      history.back();
    }
  }

  _scrollContainerFinden() {
    let el = this.parentElement;
    while (el) {
      const stil = getComputedStyle(el);
      if ((stil.overflowY === "auto" || stil.overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  _scrollPositionSpeichern() {
    const container = this._scrollContainerFinden();
    this._scrollContainer = container;
    const wurzelContainer = document.scrollingElement || document.documentElement;
    this._letztePosition = container === wurzelContainer ? window.scrollY : container.scrollTop;
  }

  _scrollPositionWiederherstellen() {
    const zielPosition = this._letztePosition || 0;
    requestAnimationFrame(() => {
      const container = this._scrollContainer || this._scrollContainerFinden();
      const wurzelContainer = document.scrollingElement || document.documentElement;
      if (container === wurzelContainer) {
        window.scrollTo(0, zielPosition);
      } else {
        container.scrollTop = zielPosition;
      }
    });
  }

  _navigationZurueck() {
    if (this._historyGeschoben) {
      // history.back() löst asynchron "popstate" aus, das dann tatsächlich
      // _zurListe() aufruft - so bleibt die Rückwärts-Logik an einer Stelle.
      // Das Flag markiert diesen Pop als "von uns selbst ausgelöst", damit
      // der popstate-Handler nicht fälschlich das Zubereitet-Popup zeigt.
      this._historyGeschoben = false;
      this._programmatischerPop = true;
      history.back();
    } else {
      this._zurListe();
    }
  }

  setConfig(config) {
    // "entity" ist seit 2.3.0 optional (Standard: todo.rezepte) - fehlt die
    // Liste, legt die Karte sie beim ersten Öffnen selbst an (siehe
    // _renderEinrichtung).
    this._config = { ...config, entity: (config && config.entity) || "todo.rezepte" };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._geladen) {
      this._geladen = true;
      // Erst laden, DANACH versuchen, eine zuvor offene Detailansicht aus
      // der URL wiederherzustellen (siehe _urlHashSetzen/_rezeptAusUrlWiederherstellen)
      // - die Rezeptliste muss dafür schon vorhanden sein.
      // Zuerst (falls nötig) die Sprachdatei laden, damit die erste Anzeige
      // gleich in der richtigen Sprache erscheint statt kurz auf Deutsch.
      this._sprachdateiSicherstellen()
        .then(() => this._rezepteLaden())
        .then(() => this._rezeptAusUrlWiederherstellen());
      // Bewusst NICHT abgewartet (fire-and-forget) - das Laden der Rezepte
      // darf nicht auf einen (u.U. langsamen oder fehlschlagenden)
      // Netzwerkzugriff auf GitHub warten. Rein informativ, siehe
      // _updatePruefen().
      this._updatePruefen();
      // Rein lokal, kein Netzwerkzugriff - kann daher synchron nebenbei
      // laufen (siehe _ressourcenVersionPruefen).
      this._ressourcenVersionPruefen();
    } else {
      // Stellt der Nutzer Home Assistant im laufenden Betrieb auf eine andere
      // Sprache um, wird deren Sprachdatei nachgeladen und die Liste neu
      // gezeichnet (nur in der Listenansicht - eine geöffnete Detailansicht
      // oder ein Formular wird dafür nicht unterbrochen).
      const sprache = this._sprache();
      if (sprache !== "de" && !sprachtabelle(sprache) && sprache !== this._spracheAngefordert) {
        this._spracheAngefordert = sprache;
        this._sprachdateiSicherstellen().then((geladen) => {
          if (geladen && this._ansicht === "liste") this._render();
        });
      }
    }
  }

  // Lädt die Sprachdatei der aktuellen Anzeigesprache nach (siehe
  // SPRACH_LADEVERSUCHE und rezeptbuch-sprache-<code>.js). Für Deutsch bzw.
  // eine bereits geladene Sprache passiert nichts. Löst IMMER auf (true =
  // Sprache steht jetzt zur Verfügung, false = nicht gefunden; die Karte
  // zeigt dann einfach Deutsch).
  _sprachdateiSicherstellen() {
    const sprache = this._sprache();
    if (sprache === "de") return Promise.resolve(false);
    if (sprachtabelle(sprache)) return Promise.resolve(true);
    if (!SPRACH_LADEVERSUCHE[sprache]) {
      SPRACH_LADEVERSUCHE[sprache] = (async () => {
        for (const ordner of zusatzdateiOrdner()) {
          const geladen = await skriptLaden(`${ordner}rezeptbuch-sprache-${sprache}.js?v=${CARD_VERSION}`);
          if (geladen && sprachtabelle(sprache)) return true;
        }
        console.warn(`Rezeptbuch: Sprachdatei "${sprache}" nicht gefunden - die Karte zeigt Deutsch an.`);
        return false;
      })();
    }
    return SPRACH_LADEVERSUCHE[sprache];
  }

  // Prüft einmal pro Kartenladen (nicht öfter als 1x/Tag pro Browser, siehe
  // Zwischenspeicher unten) über die öffentliche GitHub-API, ob eine neuere
  // Version dieser Karte veröffentlicht wurde, und zeigt bei Bedarf einen
  // dezenten, wegklickbaren Hinweis in der Übersicht (siehe _renderListe).
  // Ergänzt (nicht ersetzt) den Update-Hinweis, den HACS-Installationen
  // bereits automatisch bekommen - deckt zusätzlich manuell installierte
  // Karten ab und funktioniert unabhängig von den HACS-
  // Benachrichtigungseinstellungen. Rein informativ: schlägt der Abruf
  // fehl (kein Internetzugang, GitHub nicht erreichbar, API-Ratenlimit),
  // bleibt die Karte einfach ohne Hinweis - kein Fehler für den Nutzer.
  async _updatePruefen() {
    try {
      const CACHE_SCHLUESSEL = "rezeptbuch_update_check";
      const EIN_TAG_MS = 24 * 60 * 60 * 1000;
      let zwischengespeichert = null;
      try {
        zwischengespeichert = JSON.parse(localStorage.getItem(CACHE_SCHLUESSEL) || "null");
      } catch (e) {
        zwischengespeichert = null;
      }

      let neuesteVersion;
      if (zwischengespeichert && Date.now() - zwischengespeichert.zeitpunkt < EIN_TAG_MS) {
        neuesteVersion = zwischengespeichert.version;
      } else {
        const antwort = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
        if (!antwort.ok) return; // z.B. 404, falls noch kein Release existiert
        const daten = await antwort.json();
        neuesteVersion = (daten.tag_name || "").replace(/^v/, "").trim();
        if (!neuesteVersion) return;
        try {
          localStorage.setItem(CACHE_SCHLUESSEL, JSON.stringify({ version: neuesteVersion, zeitpunkt: Date.now() }));
        } catch (e) {
          // localStorage evtl. nicht verfügbar (z.B. privater Modus) - dann
          // wird beim nächsten Laden einfach erneut abgefragt, kein Blocker.
        }
      }

      if (!this._versionIstNeuer(neuesteVersion, CARD_VERSION)) return;

      let bereitsAusgeblendetFuer = null;
      try {
        bereitsAusgeblendetFuer = localStorage.getItem("rezeptbuch_update_ausgeblendet_version");
      } catch (e) {
        bereitsAusgeblendetFuer = null;
      }
      if (bereitsAusgeblendetFuer === neuesteVersion) return; // für genau diese Version schon weggeklickt

      this._updateHinweisVersion = neuesteVersion;
      this._updateHinweisAusgeblendet = false;
      if (this._ansicht === "liste") this._render();
    } catch (e) {
      console.warn("Rezeptbuch: Update-Prüfung fehlgeschlagen (kein Internetzugang o.ä.)", e);
    }
  }

  // Warnt davor, dass eine gerade neu geladene Kartenversion NICHT bei
  // allen Browsern/Geräten ankommen wird: Home Assistant/Browser cachen
  // /local/rezeptbuch-card.js sehr aggressiv unter ihrer jeweiligen URL -
  // nur eine geänderte "?v=..."-Versionsnummer in der Ressourcen-URL
  // (Einstellungen -> Dashboards -> Ressourcen) zwingt sie zuverlässig zu
  // einem Neuabruf. Erkennung: in localStorage wird bei jedem Laden
  // festgehalten, mit welcher CARD_VERSION und welcher "?v="-Nummer die
  // Karte zuletzt lief. Hat sich CARD_VERSION seitdem geändert (dieser
  // Browser hat also - z.B. durch einen harten Reload - tatsächlich eine
  // neue Datei bekommen), die "?v="-Nummer in der URL aber NICHT, ist das
  // ein starkes Indiz, dass andere Geräte unter derselben unveränderten
  // URL weiterhin die alte Datei aus ihrem eigenen Cache bekommen. Rein
  // lokal (kein Netzwerkzugriff, keine GitHub-Abfrage) und rein
  // informativ - schlägt irgendein Schritt fehl (z.B. kein <script>-Tag
  // mit src auffindbar, kein "?v="-Parameter verwendet, localStorage
  // nicht verfügbar), bleibt die Karte einfach ohne diesen Hinweis.
  _ressourcenVersionPruefen() {
    try {
      const eigenesSkript = Array.from(document.querySelectorAll("script[src]"))
        .find((s) => s.src.includes("rezeptbuch-card.js"));
      if (!eigenesSkript) return;

      let aktuelleRessourcenVersion;
      try {
        aktuelleRessourcenVersion = new URL(eigenesSkript.src).searchParams.get("v");
      } catch (e) {
        return;
      }
      if (!aktuelleRessourcenVersion) return; // keine "?v="-Nummer verwendet - nichts zu vergleichen

      const SPEICHER_SCHLUESSEL = "rezeptbuch_letzter_ladestand";
      let letzterStand = null;
      try {
        letzterStand = JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL) || "null");
      } catch (e) {
        letzterStand = null;
      }

      if (
        letzterStand &&
        letzterStand.cardVersion !== CARD_VERSION &&
        letzterStand.ressourcenVersion === aktuelleRessourcenVersion
      ) {
        this._ressourcenVersionsHinweis = aktuelleRessourcenVersion;
        this._ressourcenVersionsHinweisAusgeblendet = false;
        if (this._ansicht === "liste") this._render();
      }

      try {
        localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({
          cardVersion: CARD_VERSION,
          ressourcenVersion: aktuelleRessourcenVersion,
        }));
      } catch (e) {
        // localStorage evtl. nicht verfügbar (z.B. privater Modus) - dann
        // wird beim nächsten Laden einfach erneut verglichen, kein Blocker.
      }
    } catch (e) {
      // Rein informativ, siehe _updatePruefen - nie ein Fehler für den Nutzer.
    }
  }

  // Einfacher Semver-Vergleich (nur "x.y.z", ohne Suffixe wie "-beta") -
  // ausreichend für die eigenen Versionsnummern dieses Projekts.
  _versionIstNeuer(a, b) {
    const aTeile = String(a).split(".").map(Number);
    const bTeile = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(aTeile.length, bTeile.length); i++) {
      const x = aTeile[i] || 0;
      const y = bTeile[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  }

  // Home-Assistant-Begleit-Apps (iOS/Android) laden die Web-Ansicht nach
  // einer Weile im Hintergrund manchmal komplett neu (Speicher-Management
  // des Betriebssystems, kein Fehler dieser Karte) - dabei geht jeglicher
  // reiner JavaScript-Zustand verloren und die Karte startet wieder bei
  // ihrem Konstruktor, also in der Listenansicht. Um eine offene
  // Detailansicht trotzdem zu überleben, wird die UID des gerade
  // angezeigten Rezepts zusätzlich in der URL (Hash) vermerkt - die bleibt
  // auch bei einem echten Neuladen der Seite erhalten, weil sie Teil der
  // Adresse ist, die neu geladen wird.
  _urlHashSetzen(uid) {
    try {
      const basisUrl = location.href.split("#")[0];
      const neueUrl = uid ? `${basisUrl}#rezeptbuch-rezept=${encodeURIComponent(uid)}` : basisUrl;
      if (location.href !== neueUrl) {
        // replaceState statt pushState: das darf keinen eigenen
        // History-Eintrag erzeugen, sonst gerät die bestehende
        // Zurück-Tasten-Logik (siehe _historyEintragSicherstellen) durcheinander.
        history.replaceState(history.state, "", neueUrl);
      }
    } catch (e) {
      // location/history sind in manchen eingebetteten Vorschau-Umgebungen
      // eingeschränkt (z.B. Dashboard-Editor-Vorschau) - dann einfach ohne
      // Wiederherstellungs-Komfort weitermachen, statt die Karte abstürzen zu lassen.
      console.warn("Rezeptbuch: URL-Hash konnte nicht gesetzt werden", e);
    }
  }

  _rezeptAusUrlWiederherstellen() {
    const treffer = /rezeptbuch-rezept=([^&]+)/.exec(location.hash);
    if (!treffer) return;
    const uid = decodeURIComponent(treffer[1]);
    const rezept = this._rezepte.find((r) => r.uid === uid);
    if (rezept) {
      this._rezeptOeffnen(rezept);
    } else {
      // Rezept existiert nicht mehr (z.B. zwischenzeitlich gelöscht) oder
      // die UID war ungültig - verwaisten Hash entfernen statt ihn stehen
      // zu lassen.
      this._urlHashSetzen(null);
    }
  }

  async _rezepteLaden() {
    // Gibt es die To-do-Liste noch nicht, zeigt die Karte statt einer
    // Fehlermeldung die Einrichtungs-Ansicht (siehe _renderEinrichtung).
    if (this._entitaetVorhanden(this._config.entity) === false) {
      this._einrichtungNoetig = true;
      this._rezepte = [];
      this._ladeFehler = null;
      this._render();
      return;
    }
    this._einrichtungNoetig = false;
    let geladen = false;
    try {
      this._ladeFehler = null;
      const antwort = await this._hass.connection.sendMessagePromise({
        type: "todo/item/list",
        entity_id: this._config.entity,
      });
      const items = (antwort && antwort.items) || [];
      // Versteckte Wochenplan-/Kochbücher-/Kategorien-/Einstellungen-Items
      // herausfiltern, BEVOR aus dem Rest die normale Rezeptliste gebildet
      // wird - sie dürfen nirgends (Liste, Suche, Kategorie-/Tag-Filter,
      // Sortierung, Export) als (kaputtes) Rezept auftauchen.
      this._wochenplanItem = items.find((i) => i.summary === WOCHENPLAN_MARKER) || null;
      this._kochbuecherItem = items.find((i) => i.summary === KOCHBUECHER_MARKER) || null;
      this._kategorienItem = items.find((i) => i.summary === KATEGORIEN_MARKER) || null;
      this._einstellungenItem = items.find((i) => i.summary === EINSTELLUNGEN_MARKER) || null;
      this._wochenplan = this._wochenplanAusItem(this._wochenplanItem);
      this._kochbuecher = this._kochbuecherAusItem(this._kochbuecherItem);
      this._eigeneKategorien = this._eigeneKategorienAusItem(this._kategorienItem);
      this._einstellungen = this._einstellungenAusItem(this._einstellungenItem);
      this._rezepte = items
        .filter((item) => item.summary !== WOCHENPLAN_MARKER && item.summary !== KOCHBUECHER_MARKER && item.summary !== KATEGORIEN_MARKER && item.summary !== EINSTELLUNGEN_MARKER)
        .map((item) => this._itemZuRezept(item));
      geladen = true;
    } catch (fehler) {
      console.error("Rezeptbuch: Laden fehlgeschlagen", fehler);
      this._rezepte = [];
      this._ladeFehler = fehler.message || String(fehler);
    }
    this._render();
    // Tägliche Sicherung im Hintergrund (nicht abwarten, siehe
    // _autoSicherungPruefen).
    if (geladen) this._autoSicherungPruefen();
  }

  // Wochenplan aus dem versteckten Marker-Item parsen (siehe WOCHENPLAN_MARKER).
  // Liefert IMMER vollständige days-/nextWeekDays-Objekte mit allen 7
  // Wochentagen als Schlüssel zurück (fehlende Tage = null), damit der Rest
  // des Codes sich nicht zusätzlich um "Tag evtl. gar nicht im JSON
  // vorhanden" kümmern muss. Reines Parsen ohne Datums-Logik - das
  // automatische Nachrücken der Folgewoche/Leeren vergangener Tage
  // übernimmt erst _wochenplanAktualisieren(), aufgerufen beim tatsächlichen
  // Öffnen der Wochenplan-Ansicht (siehe _wochenplanAnzeigen), damit nicht
  // schon durch bloßes Laden der Rezeptliste ungefragt ein Schreibvorgang
  // ausgelöst wird.
  _wochenplanAusItem(item) {
    const leer = _leereWochentage();
    if (!item || !item.description) {
      return { schemaVersion: 2, weekStart: null, days: { ...leer }, nextWeekDays: { ...leer } };
    }
    try {
      const geparst = JSON.parse(item.description);
      return {
        schemaVersion: geparst.schemaVersion || 1,
        weekStart: geparst.weekStart || null,
        days: { ...leer, ...(geparst.days || {}) },
        nextWeekDays: { ...leer, ...(geparst.nextWeekDays || {}) },
      };
    } catch {
      // Kaputtes/fremdes JSON im Marker-Item - lieber mit leerem Wochenplan
      // weitermachen als abzustürzen (nächstes Speichern überschreibt es ohnehin).
      return { schemaVersion: 2, weekStart: null, days: { ...leer }, nextWeekDays: { ...leer } };
    }
  }

  // Gespeicherte Filter ("Kochbücher") aus dem versteckten Marker-Item
  // parsen (siehe KOCHBUECHER_MARKER).
  _kochbuecherAusItem(item) {
    if (!item || !item.description) return [];
    try {
      const geparst = JSON.parse(item.description);
      return Array.isArray(geparst.kochbuecher) ? geparst.kochbuecher : [];
    } catch {
      return [];
    }
  }

  // Schreibt den KOMPLETTEN Wochenplan (weekStart + beide Wochen) zurück in
  // sein Marker-Item - legt es beim allerersten Speichern einmalig an
  // (add_item liefert die neue UID nicht direkt zurück, daher danach einmal
  // neu laden, damit künftige Speicherungen update_item statt erneut
  // add_item verwenden).
  async _wochenplanSpeichern(neuerPlan) {
    const payload = {
      schemaVersion: 2,
      weekStart: neuerPlan.weekStart,
      days: neuerPlan.days,
      nextWeekDays: neuerPlan.nextWeekDays,
    };
    const beschreibung = JSON.stringify(payload);
    if (this._wochenplanItem) {
      const erfolg = await this._serviceAufrufen("update_item", { item: this._wochenplanItem.uid, description: beschreibung });
      if (erfolg) {
        this._wochenplanItem = { ...this._wochenplanItem, description: beschreibung };
        this._wochenplan = payload;
      }
      return erfolg;
    }
    const erfolg = await this._serviceAufrufen("add_item", { item: WOCHENPLAN_MARKER, description: beschreibung });
    if (erfolg) await this._rezepteLaden();
    return erfolg;
  }

  // Schreibt die Liste der Kochbücher zurück in ihr Marker-Item (analog zu
  // _wochenplanSpeichern).
  async _kochbuecherSpeichern(neueListe) {
    const beschreibung = JSON.stringify({ schemaVersion: 1, kochbuecher: neueListe });
    if (this._kochbuecherItem) {
      const erfolg = await this._serviceAufrufen("update_item", { item: this._kochbuecherItem.uid, description: beschreibung });
      if (erfolg) {
        this._kochbuecherItem = { ...this._kochbuecherItem, description: beschreibung };
        this._kochbuecher = neueListe;
      }
      return erfolg;
    }
    const erfolg = await this._serviceAufrufen("add_item", { item: KOCHBUECHER_MARKER, description: beschreibung });
    if (erfolg) await this._rezepteLaden();
    return erfolg;
  }

  // Selbst angelegte Kategorien aus dem versteckten Marker-Item parsen
  // (siehe KATEGORIEN_MARKER) - analog zu _kochbuecherAusItem.
  _eigeneKategorienAusItem(item) {
    if (!item || !item.description) return [];
    try {
      const geparst = JSON.parse(item.description);
      return Array.isArray(geparst.eigene) ? geparst.eigene : [];
    } catch {
      return [];
    }
  }

  // Schreibt die Liste eigener Kategorien zurück in ihr Marker-Item
  // (analog zu _kochbuecherSpeichern). Anders als dort wird beim allerersten
  // Anlegen (Marker-Item existiert noch nicht) bewusst NICHT der volle
  // _rezepteLaden() verwendet, der ungefragt ALLES neu lädt und dabei
  // this._render() auslöst - das würde z.B. ein gerade offenes, noch nicht
  // gespeichertes Rezept-Formular verwerfen, wenn die allererste eigene
  // Kategorie direkt aus dem Formular heraus angelegt wird. Stattdessen wird
  // gezielt nur nach dem neuen Marker-Item gesucht, ohne sonst etwas
  // anzufassen oder neu zu rendern - das überlässt der Aufrufer sich selbst.
  async _eigeneKategorienSpeichern(neueListe) {
    const beschreibung = JSON.stringify({ schemaVersion: 1, eigene: neueListe });
    if (this._kategorienItem) {
      const erfolg = await this._serviceAufrufen("update_item", { item: this._kategorienItem.uid, description: beschreibung });
      if (erfolg) {
        this._kategorienItem = { ...this._kategorienItem, description: beschreibung };
        this._eigeneKategorien = neueListe;
      }
      return erfolg;
    }
    const erfolg = await this._serviceAufrufen("add_item", { item: KATEGORIEN_MARKER, description: beschreibung });
    if (erfolg) {
      try {
        const antwort = await this._hass.connection.sendMessagePromise({
          type: "todo/item/list", entity_id: this._config.entity,
        });
        const items = (antwort && antwort.items) || [];
        this._kategorienItem = items.find((i) => i.summary === KATEGORIEN_MARKER) || null;
        this._eigeneKategorien = neueListe;
      } catch (fehler) {
        console.error("Rezeptbuch: Marker-Item für eigene Kategorien konnte nach dem Anlegen nicht nachgeladen werden", fehler);
      }
    }
    return erfolg;
  }

  // Alle wählbaren Kategorien: die fest eingebauten (ohne den letzten
  // Eintrag "Sonstiges") + eigene, selbst angelegte + "Sonstiges" ganz am
  // Ende als dauerhafter Auffangwert (siehe _rezeptSchemaMigrieren, das
  // jedem Rezept ohne Kategorie "Sonstiges" zuweist).
  _alleKategorien() {
    const fest = KATEGORIEN.slice(0, -1);
    const eigene = (this._eigeneKategorien || []).filter((k) => !KATEGORIEN.includes(k));
    return [...fest, ...eigene, "Sonstiges"];
  }

  // Gespeicherte Nutzer-Einstellungen aus dem versteckten Marker-Item
  // parsen (siehe EINSTELLUNGEN_MARKER) - analog zu _eigeneKategorienAusItem.
  // erfassungAktiv fehlt/ist kein Boolean -> Standard "aktiv" (true). Das
  // eine Feld steuert bewusst BEIDES zusammen: die "Hast du zubereitet?"-
  // Abfrage UND die daraus entstehende Statistik - ein echter Schalter
  // soll nicht zwei halb-unabhängige Dinge gleichzeitig regeln müssen.
  // (Fallback auf den alten Feldnamen "showStatistics" schadet nicht,
  // falls irgendwo noch ein Item aus einem früheren Zwischenstand liegt.)
  // amerikanischeKategorie: optional gewählte Kategorie (z.B. "Amerikanisch"),
  // bei der die Karte zusätzlich im Rezept selbst und im Kochmodus einen
  // "Umrechnungstabelle"-Knopf zeigt (siehe _istAmerikanischeKategorie).
  // Leerer String = nicht gesetzt (Standard, Knopf erscheint dann wie
  // bisher nur im Hauptmenü).
  // eigeneUmrechnungen: vom Nutzer selbst in der Umrechnungstabelle
  // hinzugefügte Zutaten (siehe _umrechnungstabelleModalHtml), jeweils
  // { name, cup, tbsp, tsp } - cup/tbsp/tsp als Zahl (Gramm) oder
  // weggelassen, falls für diese Zutat nicht angegeben. Bewusst OHNE
  // automatische Umrechnung/Übersetzung: der Nutzer kennt den Wert selbst
  // und trägt ihn in seiner eigenen Sprache ein, ein Raten (z.B. über
  // Dichte) widerspräche genau dem Grundsatz hinter der Umrechnungstabelle.
  _einstellungenAusItem(item) {
    const standard = {
      erfassungAktiv: true, amerikanischeKategorie: "", eigeneUmrechnungen: [], tagsAnzeigen: true,
      zufallsrezeptAnzeigen: true, umrechnungstabelleKopfAnzeigen: true, autoSicherung: true, farben: {},
    };
    if (!item || !item.description) return standard;
    try {
      const geparst = JSON.parse(item.description);
      const ergebnis = { ...standard, farben: {} };
      if (typeof geparst.erfassungAktiv === "boolean") ergebnis.erfassungAktiv = geparst.erfassungAktiv;
      else if (typeof geparst.showStatistics === "boolean") ergebnis.erfassungAktiv = geparst.showStatistics;
      if (typeof geparst.amerikanischeKategorie === "string") ergebnis.amerikanischeKategorie = geparst.amerikanischeKategorie;
      if (typeof geparst.tagsAnzeigen === "boolean") ergebnis.tagsAnzeigen = geparst.tagsAnzeigen;
      if (typeof geparst.zufallsrezeptAnzeigen === "boolean") ergebnis.zufallsrezeptAnzeigen = geparst.zufallsrezeptAnzeigen;
      if (typeof geparst.umrechnungstabelleKopfAnzeigen === "boolean") ergebnis.umrechnungstabelleKopfAnzeigen = geparst.umrechnungstabelleKopfAnzeigen;
      if (typeof geparst.autoSicherung === "boolean") ergebnis.autoSicherung = geparst.autoSicherung;
      if (geparst.farben && typeof geparst.farben === "object") {
        for (const rolle of FARB_ROLLEN) {
          const wert = geparst.farben[rolle.schluessel];
          if (hexFarbeGueltig(wert)) ergebnis.farben[rolle.schluessel] = wert.toLowerCase();
        }
      }
      if (Array.isArray(geparst.eigeneUmrechnungen)) {
        ergebnis.eigeneUmrechnungen = geparst.eigeneUmrechnungen.filter(
          (e) => e && typeof e.name === "string" && e.name.trim() !== ""
        );
      }
      return ergebnis;
    } catch {
      return standard;
    }
  }

  // Ob ein Rezept die in den Einstellungen gewählte "Kategorie für
  // amerikanische Rezepte" trägt - steuert, ob zusätzlich zum Hauptmenü
  // auch im Rezept selbst und im Kochmodus ein "Umrechnungstabelle"-Knopf
  // erscheint. Ohne gewählte Kategorie (Standard) immer false.
  _istAmerikanischeKategorie(kategorie) {
    const gewaehlt = this._einstellungen.amerikanischeKategorie;
    return !!gewaehlt && (kategorie || "Sonstiges") === gewaehlt;
  }

  // Schreibt die Nutzer-Einstellungen zurück in ihr Marker-Item - analog zu
  // _eigeneKategorienSpeichern, inklusive desselben Grundes, beim allerersten
  // Anlegen (Marker-Item existiert noch nicht) bewusst NICHT den vollen
  // _rezepteLaden() zu verwenden: der würde ungefragt this._render()
  // auslösen und z.B. ein gerade offenes Umrechnungstabelle-Popup
  // (_umrechnungstabelleEigeneSpeichern/-Loeschen) sofort wieder schließen.
  // Ruft ein Aufrufer danach selbst this._render() auf (z.B. die
  // Einstellungen-Schalter), passiert das weiterhin ganz normal dort.
  async _einstellungenSpeichern(neueEinstellungen) {
    const beschreibung = JSON.stringify({ schemaVersion: 1, ...neueEinstellungen });
    if (this._einstellungenItem) {
      const erfolg = await this._serviceAufrufen("update_item", { item: this._einstellungenItem.uid, description: beschreibung });
      if (erfolg) {
        this._einstellungenItem = { ...this._einstellungenItem, description: beschreibung };
        this._einstellungen = neueEinstellungen;
      }
      return erfolg;
    }
    const erfolg = await this._serviceAufrufen("add_item", { item: EINSTELLUNGEN_MARKER, description: beschreibung });
    if (erfolg) {
      try {
        const antwort = await this._hass.connection.sendMessagePromise({
          type: "todo/item/list", entity_id: this._config.entity,
        });
        const items = (antwort && antwort.items) || [];
        this._einstellungenItem = items.find((i) => i.summary === EINSTELLUNGEN_MARKER) || null;
        this._einstellungen = neueEinstellungen;
      } catch (fehler) {
        console.error("Rezeptbuch: Marker-Item für Einstellungen konnte nach dem Anlegen nicht nachgeladen werden", fehler);
      }
    }
    return erfolg;
  }

  // Ändert die Einstellungen konfliktsicher: lädt vor dem Schreiben den
  // GERADE AKTUELLEN Stand frisch vom Server (nicht den evtl. veralteten
  // lokalen Cache this._einstellungen), wendet "aenderungFn" darauf an und
  // speichert erst DAS. Ohne das würde z.B. folgendes Szenario eine
  // Änderung stillschweigend verschlucken: Handy A öffnet die Einstellungen
  // und schaltet "Hast du zubereitet?" aus; kurz danach fügt Tablet B (noch
  // auf dem alten Stand) eine eigene Umrechnungstabelle-Zutat hinzu und
  // speichert seinen kompletten (veralteten) Einstellungen-Stand zurück -
  // damit wäre A's Änderung wieder weg, obwohl B sie nie gesehen hat. Mit
  // dieser Methode sieht B vor dem Speichern den aktuellen Stand (inkl.
  // A's Änderung) und ändert daran gezielt nur sein eigenes Feld.
  // "aenderungFn" bekommt den frisch geladenen Stand und gibt den neuen
  // Stand zurück (z.B. (stand) => ({ ...stand, erfassungAktiv: false })).
  async _einstellungenAktualisieren(aenderungFn) {
    let aktuellerStand = this._einstellungen;
    try {
      const antwort = await this._hass.connection.sendMessagePromise({
        type: "todo/item/list", entity_id: this._config.entity,
      });
      const items = (antwort && antwort.items) || [];
      const frischesItem = items.find((i) => i.summary === EINSTELLUNGEN_MARKER) || null;
      if (frischesItem) {
        aktuellerStand = this._einstellungenAusItem(frischesItem);
        this._einstellungenItem = frischesItem;
      }
    } catch (fehler) {
      // Kein harter Fehler: ohne frischen Stand wird mit dem zuletzt
      // bekannten lokalen weitergemacht - besser als die Änderung ganz
      // zu verwerfen, auch wenn der Konfliktschutz dann für DIESEN
      // Speichervorgang nicht greift.
      console.error("Rezeptbuch: aktueller Stand der Einstellungen konnte vor dem Speichern nicht frisch geladen werden - verwende zuletzt bekannten Stand", fehler);
    }
    return await this._einstellungenSpeichern(aenderungFn(aktuellerStand));
  }

  // Erzeugt eine rein clientseitige, kurze eindeutige ID - für Dinge wie
  // eigene Umrechnungstabelle-Zutaten, die (anders als Rezepte) kein
  // eigenes To-do-Item mit server-vergebener uid haben, sondern nur als
  // Eintrag innerhalb der Einstellungen existieren. Muss nur innerhalb
  // dieser einen Liste eindeutig sein, keine kryptographischen Ansprüche.
  _zufallsId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Ob der Statistik-Knopf angezeigt UND die "Hast du zubereitet?"-Abfrage
  // gestellt wird: beides zusammen gesteuert durch genau einen echten
  // Ein-/Ausschalter in der Oberfläche (siehe _einstellungenModal* und den
  // ⚙️-Knopf in _renderListe) - keine YAML-Kartenoption mehr nötig.
  _statistikAktiv() {
    return this._einstellungen.erfassungAktiv !== false;
  }

  // Ob die "Hast du zubereitet?"-Abfrage beim Verlassen eines Rezepts
  // erscheint - derselbe Schalter wie bei der Statistik (_statistikAktiv),
  // damit ein einziger Schalter beides zusammen regelt.
  _zubereitetAbfrageAktiv() {
    return this._statistikAktiv();
  }

  // Zentrale Stelle für Schema-Migrationen: bringt ein aus dem JSON
  // geparstes Rezept-Objekt unabhängig von seiner gespeicherten
  // schemaVersion auf den aktuellen Stand. Datensätze ohne schemaVersion
  // (alle Rezepte, die vor Einführung dieses Felds gespeichert wurden)
  // gelten als Version 0. Künftige strukturelle Änderungen am Format
  // bekommen hier jeweils einen weiteren "if (version < N)"-Schritt, damit
  // auch sehr alte, nie neu gespeicherte Rezepte immer lesbar bleiben.
  _migriereRezept(daten) {
    let version = Number(daten.schemaVersion) || 0;
    let ergebnis = { ...daten };

    if (version < 1) {
      // Version 0 -> 1: schemaVersion selbst eingeführt. An den
      // bestehenden Feldern ändert sich dabei nichts - reine Kennzeichnung,
      // damit künftige Migrationsschritte wissen, worauf sie aufbauen.
      version = 1;
    }

    if (version < 2) {
      // Version 1 -> 2: "tags" (mehrere freie Schlagworte pro Rezept,
      // zusätzlich zur bisherigen einzelnen "category") eingeführt. Alte
      // Rezepte ohne tags-Feld bekommen ein leeres Array statt undefined -
      // so kann sich der restliche Code überall auf ein immer vorhandenes
      // Array verlassen, statt zusätzlich "existiert das Feld überhaupt" zu
      // prüfen. Die bestehende category bleibt unverändert (Rückwärts-
      // kompatibilität für die kategorie-basierte Anzeige/Filterung).
      ergebnis = { ...ergebnis, tags: Array.isArray(ergebnis.tags) ? ergebnis.tags : [] };
      version = 2;
    }

    return { ...ergebnis, schemaVersion: version };
  }

  _itemZuRezept(item) {
    let daten = { servings: 1, ingredients: [], steps: [], image: null, images: [], ratings: {}, comments: [], creator: null, creatorName: null, created: null, category: "Sonstiges", tags: [], cookLog: [], schemaVersion: SCHEMA_VERSION };
    if (item.description) {
      try {
        const geparst = this._migriereRezept(JSON.parse(item.description));
        daten = {
          servings: geparst.servings || 1,
          ingredients: geparst.ingredients || [],
          steps: geparst.steps || [],
          image: geparst.image || null,
          images: Array.isArray(geparst.images) ? geparst.images.filter(Boolean) : [],
          ratings: geparst.ratings || {},
          comments: geparst.comments || [],
          creator: geparst.creator || null,
          creatorName: geparst.creatorName || null,
          created: geparst.created || null,
          category: geparst.category || "Sonstiges",
          tags: Array.isArray(geparst.tags) ? geparst.tags : [],
          cookLog: geparst.cookLog || [],
          schemaVersion: geparst.schemaVersion,
        };
      } catch {
        // Beschreibung war kein gültiges JSON - Rezept ohne Zutaten/Schritte anzeigen
      }
    }
    return {
      uid: item.uid,
      title: item.summary,
      servings: daten.servings,
      ingredients: daten.ingredients,
      steps: daten.steps,
      image: daten.image,
      images: daten.images,
      ratings: daten.ratings,
      comments: daten.comments,
      creator: daten.creator,
      creatorName: daten.creatorName,
      created: daten.created,
      category: daten.category,
      tags: daten.tags,
      cookLog: daten.cookLog,
      schemaVersion: daten.schemaVersion,
    };
  }

  _rezeptPayload(r) {
    return {
      // Immer die aktuelle Version schreiben: sobald ein Rezept neu
      // gespeichert wird, ist es (nach _migriereRezept beim Einlesen)
      // ohnehin schon auf dem aktuellen Stand.
      schemaVersion: SCHEMA_VERSION,
      servings: r.servings,
      ingredients: r.ingredients,
      steps: r.steps,
      image: r.image,
      images: Array.isArray(r.images) ? r.images : [],
      ratings: r.ratings || {},
      comments: r.comments || [],
      creator: r.creator || null,
      creatorName: r.creatorName || null,
      created: r.created || null,
      category: r.category || "Sonstiges",
      tags: r.tags || [],
      cookLog: r.cookLog || [],
    };
  }

  // Konflikt-Schutz: lädt genau ein Rezept frisch vom Server (statt der
  // ggf. veralteten lokalen Kopie in this._rezepte/this._aktivesRezept).
  // Gibt null zurück, wenn das Rezept inzwischen gelöscht wurde.
  async _rezeptFrischLaden(uid) {
    try {
      const antwort = await this._hass.connection.sendMessagePromise({
        type: "todo/item/list",
        entity_id: this._config.entity,
      });
      const items = (antwort && antwort.items) || [];
      const item = items.find((i) => i.uid === uid);
      return item ? this._itemZuRezept(item) : null;
    } catch (fehler) {
      console.error("Rezeptbuch: Frisches Laden eines einzelnen Rezepts fehlgeschlagen", fehler);
      return null;
    }
  }

  _darfBearbeiten(rezept) {
    if (!rezept.creator) return true; // Altes Rezept ohne hinterlegten Ersteller - für alle offen
    if (!this._hass.user) return false;
    if (this._hass.user.id === rezept.creator) return true;
    if (this._hass.user.is_admin) return true;
    return false;
  }

  // Eigene Kategorien gehören (anders als ein Rezept) niemandem einzelnen -
  // es gibt keinen "Ersteller" einer Kategorie. Neu ANLEGEN bleibt deshalb
  // bewusst für jeden Nutzer offen (z.B. direkt im Rezept-Formular, ohne
  // dafür extra einen Admin suchen zu müssen). Löschen und Umbenennen
  // wirken sich aber auf ALLE Rezepte aus, die diese Kategorie verwenden -
  // dafür ist deshalb ein HA-Admin nötig.
  _darfKategorienVerwalten() {
    return !!(this._hass.user && this._hass.user.is_admin);
  }

  // Benennt eine selbst angelegte Kategorie um und schreibt den neuen Namen
  // automatisch in JEDES Rezept, das die alte Kategorie verwendet, zurück
  // (mit Konflikt-Schutz: pro Rezept vor dem Schreiben frisch vom Server
  // laden, analog zu _kommentarHinzufuegen) - so geht keine
  // Kategorie-Zuordnung durchs Umbenennen verloren.
  async _kategorieUmbenennen(alterName, neuerName) {
    if (!this._darfKategorienVerwalten()) return false;
    const betroffene = this._rezepte.filter((r) => (r.category || "Sonstiges") === alterName);
    for (const r of betroffene) {
      const frisch = (await this._rezeptFrischLaden(r.uid)) || r;
      const erfolg = await this._serviceAufrufen("update_item", {
        item: r.uid,
        description: JSON.stringify({ ...this._rezeptPayload(frisch), category: neuerName }),
      });
      if (erfolg) Object.assign(r, frisch, { category: neuerName });
    }

    const neueListe = (this._eigeneKategorien || []).map((k) => (k === alterName ? neuerName : k));
    const erfolg = await this._eigeneKategorienSpeichern(neueListe);
    if (erfolg && this._aktiveKategorie === alterName) this._aktiveKategorie = neuerName;
    this._kategorieBearbeitungsZiel = null;
    this._render();
    return erfolg;
  }

  _formatZeit(iso) {
    try {
      return new Date(iso).toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  async _kommentarHinzufuegen(text) {
    if (!text || !text.trim()) return;
    const r = this._aktivesRezept;
    // Konflikt-Schutz: erst frisch vom Server laden statt der ggf.
    // veralteten lokalen Kopie. Würden wir stattdessen this._rezeptPayload(r)
    // aus dem lokalen (alten) Stand zurückschreiben, könnten wir eine
    // zwischenzeitliche Änderung von jemand anderem (z.B. geänderte Zutaten,
    // ein weiterer Kommentar) versehentlich überschreiben.
    const frisch = (await this._rezeptFrischLaden(r.uid)) || r;
    const neueComments = [...(frisch.comments || []), {
      author: (this._hass.user && this._hass.user.name) || this._t("allgemein_unbekannt"),
      authorId: this._hass.user ? this._hass.user.id : null,
      text: text.trim(),
      zeit: new Date().toISOString(),
    }];
    const erfolg = await this._serviceAufrufen("update_item", {
      item: r.uid,
      description: JSON.stringify({ ...this._rezeptPayload(frisch), comments: neueComments }),
    });
    if (!erfolg) return;
    // Lokalen Zustand komplett mit dem jetzt gespeicherten (frischen) Stand
    // synchronisieren, nicht nur den Kommentar anhängen - so zeigt die
    // Ansicht auch inzwischen von anderen geänderte Felder korrekt an.
    Object.assign(r, frisch, { comments: neueComments });
    this._render();
  }

  // Gleiches Muster wie _darfBearbeiten für Rezepte: alte Kommentare ohne
  // hinterlegte authorId (vor diesem Feature geschrieben) sind für alle
  // offen, neue nur für den Verfasser selbst oder einen HA-Admin.
  _kommentarDarfBearbeiten(kommentar) {
    if (!kommentar.authorId) return true;
    if (!this._hass.user) return false;
    if (this._hass.user.id === kommentar.authorId) return true;
    if (this._hass.user.is_admin) return true;
    return false;
  }

  _kommentarBearbeiten(index) {
    this._kommentarBearbeitungIndex = index;
    this._render();
  }

  _kommentarBearbeitenAbbrechen() {
    this._kommentarBearbeitungIndex = null;
    this._render();
  }

  async _kommentarBearbeitenSpeichern(index, neuerText) {
    if (!neuerText || !neuerText.trim()) return;
    const r = this._aktivesRezept;
    const frisch = (await this._rezeptFrischLaden(r.uid)) || r;
    const alterKommentar = (r.comments || [])[index];
    if (!alterKommentar) return;
    // Nicht über den Index im frisch geladenen Stand zugreifen (der könnte
    // sich durch einen zwischenzeitlichen Kommentar von jemand anderem
    // verschoben haben) - stattdessen über author+zeit identifizieren, das
    // zusammen einen bestehenden Kommentar eindeutig genug kennzeichnet.
    const neueComments = (frisch.comments || []).map((k) =>
      k.author === alterKommentar.author && k.zeit === alterKommentar.zeit
        ? { ...k, text: neuerText.trim() }
        : k
    );
    const erfolg = await this._serviceAufrufen("update_item", {
      item: r.uid,
      description: JSON.stringify({ ...this._rezeptPayload(frisch), comments: neueComments }),
    });
    if (!erfolg) return;
    Object.assign(r, frisch, { comments: neueComments });
    this._kommentarBearbeitungIndex = null;
    this._render();
  }

  _kommentarLoeschen(index) {
    // Eigenes Modal statt window.confirm() - siehe Begründung bei
    // _rezeptLoeschen weiter oben (native Dialoge sind in der
    // Home-Assistant-Begleit-App/WebView unzuverlässig).
    this._kommentarZumLoeschenIndex = index;
    const modal = this.shadowRoot.getElementById("kommentar-loeschen-modal");
    if (modal) modal.style.display = "flex";
  }

  _kommentarLoeschenModalVerstecken() {
    const modal = this.shadowRoot.getElementById("kommentar-loeschen-modal");
    if (modal) modal.style.display = "none";
  }

  async _kommentarLoeschenBestaetigt() {
    const index = this._kommentarZumLoeschenIndex;
    this._kommentarLoeschenModalVerstecken();
    if (index == null) return;
    const r = this._aktivesRezept;
    const frisch = (await this._rezeptFrischLaden(r.uid)) || r;
    const alterKommentar = (r.comments || [])[index];
    if (!alterKommentar) return;
    const neueComments = (frisch.comments || []).filter(
      (k) => !(k.author === alterKommentar.author && k.zeit === alterKommentar.zeit)
    );
    const erfolg = await this._serviceAufrufen("update_item", {
      item: r.uid,
      description: JSON.stringify({ ...this._rezeptPayload(frisch), comments: neueComments }),
    });
    if (!erfolg) return;
    Object.assign(r, frisch, { comments: neueComments });
    this._kommentarZumLoeschenIndex = null;
    this._render();
  }

  _durchschnittsBewertung(ratings) {
    // explizit in Zahlen umwandeln - schützt gegen alte/importierte Daten,
    // in denen Bewertungen versehentlich als String ("5" statt 5) vorliegen
    // (sonst würde "+" Strings verketten statt zu addieren).
    const werte = Object.values(ratings || {}).map((w) => Number(w) || 0);
    if (werte.length === 0) return { durchschnitt: 0, anzahl: 0 };
    const summe = werte.reduce((a, b) => a + b, 0);
    return { durchschnitt: Math.round((summe / werte.length) * 10) / 10, anzahl: werte.length };
  }

  _sterneHtml(durchschnitt, groesse = "normal") {
    const klasse = groesse === "klein" ? "sterne sterne-klein" : "sterne";
    let html = `<span class="${klasse}">`;
    for (let i = 1; i <= 5; i++) {
      const gefuellt = durchschnitt >= i - 0.25;
      html += `<span class="${gefuellt ? "stern-voll" : "stern-leer"}">★</span>`;
    }
    html += `</span>`;
    return html;
  }

  // Barrierefreiheit: früher waren die einzelnen Sterne reine <span>-Elemente,
  // dadurch mit der Tastatur weder erreichbar noch auslösbar (kein natives
  // Tab-Stopp, kein Enter/Leertaste-Verhalten) und ohne jede Sprachausgabe-
  // Information, WAS ein Klick darauf bewirkt. <button>-Elemente sind von
  // Haus aus per Tastatur fokussier- und auslösbar; role="radiogroup"/"radio"
  // beschreibt zusätzlich das Auswahlverhalten (genau EIN Wert von 5 aktiv),
  // aria-checked spiegelt den aktuell gesetzten Wert wider.
  _sterneInteraktivHtml(eigeneBewertung) {
    let html = `<span class="sterne sterne-interaktiv" id="eigene-sterne" role="radiogroup" aria-label="${this._t("sterne_aria_label_gruppe")}">`;
    for (let i = 1; i <= 5; i++) {
      const gefuellt = eigeneBewertung >= i;
      html += `<button type="button" class="${gefuellt ? "stern-voll" : "stern-leer"}" data-wert="${i}" role="radio" aria-checked="${eigeneBewertung === i}" aria-label="${this._t("sterne_aria_label", { zahl: i })}">★</button>`;
    }
    html += `</span>`;
    return html;
  }

  async _bewertungSetzen(sterne) {
    if (!this._hass.user || !this._hass.user.id) {
      this._hinweis(this._t("fehler_kein_benutzer_bewertung"));
      return;
    }
    const r = this._aktivesRezept;
    // Konflikt-Schutz wie beim Kommentar: frisch laden, damit wir nicht
    // versehentlich eine zwischenzeitliche Änderung von jemand anderem
    // überschreiben, wenn wir den kompletten Payload zurückschreiben.
    const frisch = (await this._rezeptFrischLaden(r.uid)) || r;
    const neueRatings = { ...(frisch.ratings || {}), [this._hass.user.id]: sterne };

    const erfolg = await this._serviceAufrufen("update_item", {
      item: r.uid,
      description: JSON.stringify({ ...this._rezeptPayload(frisch), ratings: neueRatings }),
    });
    if (!erfolg) return;
    Object.assign(r, frisch, { ratings: neueRatings });
    this._render();
  }

  async _serviceAufrufen(service, daten) {
    try {
      await this._hass.callService("todo", service, { ...daten, entity_id: this._config.entity });
      return true;
    } catch (fehler) {
      console.error("Rezeptbuch: Service-Aufruf fehlgeschlagen", service, daten, fehler);
      this._hinweis(this._t("fehler_vorgang_fehlgeschlagen", { fehler: fehler.message || fehler }));
      return false;
    }
  }

  _uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Versucht, eine Mengenangabe als reine Zahl zu lesen - AUSSCHLIESSLICH
  // einfache Ganz-/Kommazahlen ("500", "1,5"). Bewusst NICHT die
  // umfangreichere Text-Erkennungs-Logik (Brüche/Bereiche/Wortmengen wie
  // "etwas") wiederverwendet: die dürfen zwar beim Einlesen aus Fließtext
  // erkannt werden, lassen sich aber nicht sinnvoll ADDIEREN (was wäre
  // "1/2" + "etwas"?). Alles, was hier nicht eindeutig eine reine Zahl ist,
  // bleibt deshalb bewusst unangetastet und wird in der Einkaufsliste als
  // eigene, nicht zusammengeführte Zeile aufgeführt statt falsch verrechnet.
  _mengeNumerischParsen(text) {
    const getrimmt = (text || "").trim();
    if (!getrimmt || !/^\d+([.,]\d+)?$/.test(getrimmt)) return null;
    return parseFloat(getrimmt.replace(",", "."));
  }

  // Fasst die Zutaten mehrerer Rezepte zu einer Einkaufsliste zusammen:
  // gleicher Name (klein geschrieben/getrimmt verglichen) UND gleiche
  // Einheit werden zu einer Zeile mit aufsummierter Menge zusammengefasst.
  // "Gleiche Einheit" schließt bekannte Synonyme ein (siehe EINHEIT_
  // SYNONYME oben) - "g"/"gr"/"Gramm" gelten hier also als eine Einheit,
  // nicht als drei verschiedene. Unterschiedliche (echte) Einheiten der
  // gleichen Zutat werden bewusst NICHT zusammengeführt (z.B. "200 g Mehl" +
  // "1 Päckchen Mehl" ergäben sonst eine sinnlose Summe) - die bleiben als
  // eigene Zeilen erhalten, genau wie Mengen, die sich nicht sauber addieren
  // lassen (siehe _mengeNumerischParsen).
  _einkaufslisteAggregieren(rezepteListe) {
    const gruppen = new Map();
    const einzelZeilen = [];

    for (const rezept of rezepteListe) {
      for (const zutat of rezept.ingredients || []) {
        const name = (zutat.name || "").trim();
        if (!name) continue;
        const einheitRoh = (zutat.unit || "").trim();
        const einheit = EINHEIT_SYNONYME[this._normalisieren(einheitRoh)] || einheitRoh;
        const numerisch = this._mengeNumerischParsen(zutat.amount);

        if (numerisch === null) {
          einzelZeilen.push([(zutat.amount || "").trim(), einheit, name].filter(Boolean).join(" "));
          continue;
        }

        const schluessel = `${this._normalisieren(name)}|${this._normalisieren(einheit)}`;
        if (!gruppen.has(schluessel)) {
          gruppen.set(schluessel, { name, unit: einheit, menge: 0 });
        }
        gruppen.get(schluessel).menge += numerisch;
      }
    }

    const zusammengefasst = Array.from(gruppen.values()).map((g) => {
      // Runden gegen Fließkomma-Ungenauigkeiten (0.1 + 0.2 usw.), Komma
      // statt Punkt für die deutsche Anzeige.
      const gerundet = Math.round(g.menge * 100) / 100;
      const mengeText = String(gerundet).replace(".", ",");
      return [mengeText, g.unit, g.name].filter(Boolean).join(" ");
    });

    return [...zusammengefasst, ...einzelZeilen];
  }

  // Legt die aggregierten Zutaten der übergebenen Rezepte als einzelne
  // Einträge in der (separat konfigurierten) Einkaufslisten-To-do-Liste an.
  // Bewusst additiv (append) statt die Liste vorher zu leeren - einfacher
  // und unüberraschender, siehe ANLEITUNG-Backup.md Abschnitt 18.
  async _einkaufslisteErstellen(rezepteListe) {
    if (!this._einkaufslisteEntity()) {
      this._hinweis(this._t("fehler_einkaufsliste_keine_konfiguration"));
      return;
    }
    if (!rezepteListe || rezepteListe.length === 0) {
      this._hinweis(this._t("fehler_einkaufsliste_keine_auswahl"));
      return;
    }
    const zeilen = this._einkaufslisteAggregieren(rezepteListe);
    if (zeilen.length === 0) {
      this._hinweis(this._t("fehler_einkaufsliste_keine_zutaten"));
      return;
    }
    await this._einkaufslisteZeilenAnlegen(zeilen);
  }

  // Legt beliebige, schon fertig formatierte Zutaten-Zeilen (z.B. "200 g
  // Mehl") als einzelne Einträge in der Einkaufsliste an - der eigentliche
  // Service-Aufruf-Teil von _einkaufslisteErstellen, ausgelagert, damit ihn
  // auch _zutatenFehlendZurEinkaufsliste (einzelne, im Rezept selbst
  // ausgewählte Zutaten statt ganzer aggregierter Rezepte) verwenden kann,
  // ohne den Code zu duplizieren. Die Konfigurations-/Auswahlprüfungen
  // bleiben bewusst bei den jeweiligen Aufrufern, weil die Fehlermeldung
  // ("kein Rezept" vs. "keine Zutat ausgewählt") je nach Kontext anders ist.
  async _einkaufslisteZeilenAnlegen(zeilen) {
    for (const zeile of zeilen) {
      try {
        // Bewusst hass.callService() direkt statt _serviceAufrufen(): letzteres
        // ruft den Dienst immer für this._config.entity (die Rezeptliste) auf -
        // hier soll er aber für die separat konfigurierte Einkaufsliste laufen.
        await this._hass.callService("todo", "add_item", { item: zeile, entity_id: this._einkaufslisteEntity() });
      } catch (fehler) {
        console.error("Rezeptbuch: Einkaufsliste - Eintrag konnte nicht angelegt werden", zeile, fehler);
        this._hinweis(this._t("fehler_einkaufsliste_eintrag_fehlgeschlagen", { zeile, fehler: fehler.message || fehler }));
        return;
      }
    }
    this._hinweis(this._t("einkaufsliste_hinzugefuegt", { anzahl: zeilen.length, entity: this._einkaufslisteEntity() }));
  }

  // Wertet die cookLog-Einträge (je ein ISO-Zeitstempel pro Bestätigung der
  // "Hast du zubereitet?"-Frage) über alle Rezepte hinweg aus: Anzahl im
  // laufenden Kalenderjahr, Anzahl insgesamt, sowie die 5 meistgekochten
  // Rezepte. Reine Client-seitige Auswertung vorhandener Daten - kein
  // separates Skript, keine Datenbank, kein automation-Trigger (siehe
  // _zubereitetModalAnzeigen/_statistikAktiv für die Datenerfassung selbst).
  _statistikBerechnen() {
    const aktuellesJahr = new Date().getFullYear();
    let gesamt = 0;
    let diesesJahr = 0;
    const proRezept = [];
    for (const r of this._rezepte) {
      const log = r.cookLog || [];
      if (log.length === 0) continue;
      gesamt += log.length;
      diesesJahr += log.filter((iso) => {
        const datum = new Date(iso);
        return !isNaN(datum) && datum.getFullYear() === aktuellesJahr;
      }).length;
      proRezept.push({ title: r.title, anzahl: log.length });
    }
    proRezept.sort((a, b) => b.anzahl - a.anzahl);
    return { gesamt, diesesJahr, jahr: aktuellesJahr, top: proRezept.slice(0, 5) };
  }

  // Baut das HTML für den Inhalt des Statistik-Modals aus _statistikBerechnen().
  // Eigene Methode statt Inline-Code in _render(), damit sie sich unabhängig
  // testen lässt und der Template-String in _render() übersichtlich bleibt.
  _statistikModalInhalt() {
    const { gesamt, diesesJahr, jahr, top } = this._statistikBerechnen();
    if (gesamt === 0) {
      return `<p style="text-align:left;">${this._t("statistik_keine_daten")}</p>`;
    }
    const topListe = top
      .map((r) => `<li>${this._escape(r.title)} - ${r.anzahl}x</li>`)
      .join("");
    return `
      <p style="text-align:left;">${this._t("statistik_dieses_jahr", { anzahl: diesesJahr, jahr })}</p>
      <p style="text-align:left;">${this._t("statistik_gesamt", { anzahl: gesamt })}</p>
      <p style="text-align:left;margin-bottom:4px;"><strong>${this._t("statistik_top_titel")}</strong></p>
      <ol style="text-align:left;margin-top:0;padding-left:22px;">${topListe}</ol>
    `;
  }

  // Vollständiges Backup als JSON-Datei zum Download - NICHT nur die
  // Rezepte (wie früher), sondern alles, was sonst verloren wäre, würde
  // das versteckte Marker-Item einer der anderen Listen (Einstellungen,
  // eigene Kategorien, Kochbücher, Wochenplan) beschädigt oder gelöscht:
  // all das liegt sonst nirgendwo sonst gesichert. "rezepte" bleibt bewusst
  // eine Liste einzelner Rezept-Objekte (wie im alten Format) - wer nur
  // EIN Rezept wiederherstellen will, kann z.B. "rezepte[3]" aus der Datei
  // entnehmen und unverändert in das normale "JSON einfügen"-Feld eines
  // Rezepts pasten (siehe zutatUebernehmen oben, das genau dieses Format
  // erwartet).
  // =====================================================================
  // Einrichtung & Wartung (seit 2.3.0)
  //
  // Alles, wofür früher Handarbeit in configuration.yaml bzw. eigene Skripte
  // nötig war, erledigt die Karte jetzt selbst - mit Hilfe der Dienste, die
  // Home Assistant ohnehin bereitstellt:
  //  - To-do-Listen (Rezepte, Sicherung, Einkaufsliste) legt die Karte über
  //    Home Assistants eigenen Einrichtungs-Dialog (Config Flow) an,
  //  - Fotos landen im eingebauten Bilderspeicher ("image_upload", Teil von
  //    default_config) statt als Text im Rezept, inklusive fertiger
  //    Vorschaubilder,
  //  - die tägliche Sicherung schreibt die Karte in eine zweite To-do-Liste.
  // Alles, was Home Assistant nur über YAML-Dateien erlaubt (shell_command,
  // Python-Skripte), kann eine Karte prinzipbedingt NICHT selbst einrichten -
  // das betrifft nur noch den optionalen URL-Import.
  // =====================================================================

  _istAdmin() {
    return !!(this._hass && this._hass.user && this._hass.user.is_admin);
  }

  // true/false = Entität gibt es / gibt es nicht; null = nicht feststellbar
  // (kein states-Objekt, z.B. im Testaufbau).
  _entitaetVorhanden(entityId) {
    const zustaende = this._hass && this._hass.states;
    if (!zustaende || !entityId) return null;
    return Object.prototype.hasOwnProperty.call(zustaende, entityId);
  }

  // Einkaufsliste: ausdrücklich konfigurierte Liste, sonst automatisch eine
  // vorhandene ("todo.einkaufsliste" bzw. Home Assistants eingebaute
  // "todo.shopping_list").
  _einkaufslisteEntity() {
    if (this._config.shopping_list_entity) return this._config.shopping_list_entity;
    for (const kandidat of ["todo.einkaufsliste", "todo.shopping_list"]) {
      if (this._entitaetVorhanden(kandidat) === true) return kandidat;
    }
    return null;
  }

  // To-do-Liste für die automatischen Sicherungen (Standard: Rezeptliste + "_backup").
  _sicherungsEntity() {
    return this._config.backup_entity || `${this._config.entity}_backup`;
  }

  _anzeigenameAusEntity(entityId) {
    const zustand = this._hass && this._hass.states && this._hass.states[entityId];
    const name = zustand && zustand.attributes && zustand.attributes.friendly_name;
    if (name) return name;
    const roh = String(entityId).split(".")[1].replace(/_/g, " ");
    return roh.charAt(0).toUpperCase() + roh.slice(1);
  }

  async _warteBis(bedingungFn, maxMs = 15000) {
    const ende = Date.now() + maxMs;
    while (Date.now() < ende) {
      if (bedingungFn()) return true;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return bedingungFn();
  }

  // Legt eine "Lokale To-do-Liste" an - dieselbe Einrichtung wie über
  // Einstellungen -> Geräte & Dienste -> Integration hinzufügen, nur eben
  // automatisch. Nur für Administratoren möglich (Home Assistant verlangt
  // das für das Anlegen von Integrationen). Wartet, bis die erwartete
  // Entität tatsächlich da ist, und wirft sonst einen Fehler.
  async _localTodoAnlegen(anzeigeName, erwarteteEntity) {
    if (!this._istAdmin()) throw new Error(this._t("einrichtung_nur_admin"));
    if (typeof this._hass.callApi !== "function") throw new Error("callApi nicht verfügbar");
    const flow = await this._hass.callApi("POST", "config/config_entries/flow", {
      handler: "local_todo",
      show_advanced_options: false,
    });
    if (flow && flow.type === "form") {
      const ergebnis = await this._hass.callApi("POST", `config/config_entries/flow/${flow.flow_id}`, {
        todo_list_name: anzeigeName,
      });
      if (!ergebnis || (ergebnis.type !== "create_entry" && ergebnis.type !== "abort")) {
        throw new Error(this._t("einrichtung_fehler_unerwartet"));
      }
    }
    const vorhanden = await this._warteBis(() => this._entitaetVorhanden(erwarteteEntity) === true);
    if (!vorhanden) throw new Error(this._t("einrichtung_fehler_entity_fehlt", { entity: erwarteteEntity }));
  }

  // Willkommens-/Einrichtungs-Ansicht: erscheint, wenn die Rezeptliste (die
  // To-do-Entität) noch nicht existiert.
  _renderEinrichtung(stil) {
    const admin = this._istAdmin();
    this.shadowRoot.innerHTML = `
      ${stil}
      <ha-card>
        <div style="text-align:center; padding:12px 6px;">
          <div style="font-size:2.4em;">📖</div>
          <h2 class="kopf-titel-einrichtung" style="margin:6px 0 10px; font-family:var(--kb-schrift-titel); color:var(--kb-titel);">${this._t("setup_titel")}</h2>
          <p style="margin:0 0 14px;">${this._t("setup_text", { entity: this._escape(this._config.entity) })}</p>
          ${admin
            ? `<button class="primaer" id="setup-start-btn">${this._t("setup_btn")}</button>
               <p class="hinweis" id="setup-status" style="margin-top:12px;"></p>`
            : `<p class="hinweis">${this._t("setup_nur_admin")}</p>`}
        </div>
      </ha-card>
    `;
    const startBtn = this.shadowRoot.getElementById("setup-start-btn");
    if (!startBtn) return;
    startBtn.addEventListener("click", async () => {
      const status = this.shadowRoot.getElementById("setup-status");
      startBtn.disabled = true;
      status.textContent = this._t("setup_laeuft");
      try {
        await this._localTodoAnlegen(this._anzeigenameAusEntity(this._config.entity), this._config.entity);
        // Die Sicherungsliste ist "nice to have" - scheitert sie, läuft das
        // Rezeptbuch trotzdem; in den Einstellungen lässt sie sich nachholen.
        try {
          const sicherung = this._sicherungsEntity();
          if (this._entitaetVorhanden(sicherung) !== true) {
            await this._localTodoAnlegen(`${this._anzeigenameAusEntity(this._config.entity)} Backup`, sicherung);
          }
        } catch (fehler) {
          console.warn("Rezeptbuch: Sicherungsliste konnte nicht automatisch angelegt werden", fehler);
        }
        this._einrichtungNoetig = false;
        await this._rezepteLaden();
      } catch (fehler) {
        console.error("Rezeptbuch: Einrichtung fehlgeschlagen", fehler);
        startBtn.disabled = false;
        status.textContent = this._t("setup_fehler", { fehler: fehler.message || fehler });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Hinweis-Fenster: ersetzt die nativen alert()-Dialoge, die in der Home-
  // Assistant-App unzuverlässig sind (teils gar nicht oder ohne Text
  // angezeigt). Der Text wird als Zustand gemerkt und bei JEDEM Neuzeichnen
  // wieder eingeblendet, bis er bestätigt wurde. Zusätzlich löst jede
  // Meldung ein "rezeptbuch-hinweis"-Ereignis aus (praktisch für Tests).
  // ---------------------------------------------------------------------
  _hinweis(text) {
    this._hinweisText = String(text);
    this.dispatchEvent(new CustomEvent("rezeptbuch-hinweis", { detail: { text: this._hinweisText }, bubbles: true, composed: true }));
    this._hinweisEinblenden();
  }

  _hinweisEinblenden() {
    const alt = this.shadowRoot.getElementById("hinweis-modal");
    if (alt) alt.remove();
    if (!this._hinweisText) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "hinweis-modal";
    overlay.style.display = "flex";
    overlay.style.zIndex = "10000";
    overlay.innerHTML = `
      <div class="modal-box modal-box-scroll" role="alertdialog" aria-modal="true">
        <p id="hinweis-modal-text" style="white-space:pre-wrap; text-align:left; margin-top:0;"></p>
        <div class="modal-aktionen">
          <button type="button" class="primaer" id="hinweis-modal-ok-btn">OK</button>
        </div>
      </div>`;
    // Text bewusst NICHT per innerHTML einsetzen (Meldungen können fremde
    // Texte wie Rezepttitel oder Fehlermeldungen enthalten).
    overlay.querySelector("#hinweis-modal-text").textContent = this._hinweisText;
    overlay.querySelector("#hinweis-modal-ok-btn").addEventListener("click", () => {
      this._hinweisText = null;
      overlay.remove();
    });
    this.shadowRoot.appendChild(overlay);
    overlay.querySelector("#hinweis-modal-ok-btn").focus();
  }

  // ---------------------------------------------------------------------
  // Fotos im Home-Assistant-Bilderspeicher
  // ---------------------------------------------------------------------
  _datenUrlZuBlob(datenUrl) {
    const teile = String(datenUrl).split(",");
    const mime = (teile[0].match(/^data:([^;,]+)/) || [])[1] || "image/jpeg";
    const binaer = atob(teile[1] || "");
    const bytes = new Uint8Array(binaer.length);
    for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  // Lädt ein Foto (Data-URL) in Home Assistants Bilderspeicher hoch und
  // liefert dessen Adresse zurück - oder null, wenn das nicht möglich war
  // (dann bleibt das Foto einfach als Text im Rezept, wie bisher).
  async _fotoHochladen(datenUrl) {
    try {
      if (!this._hass || typeof this._hass.fetchWithAuth !== "function") return null;
      const formular = new FormData();
      formular.append("file", this._datenUrlZuBlob(datenUrl), "rezeptfoto.jpg");
      const antwort = await this._hass.fetchWithAuth("/api/image/upload", { method: "POST", body: formular });
      if (!antwort || !antwort.ok) return null;
      const json = await antwort.json();
      // Die ID landet später in einer Bildadresse - nur das erwartete Format zulassen.
      if (!json || !/^[0-9a-f]{32}$/.test(String(json.id || ""))) return null;
      return `/api/image/serve/${json.id}/original`;
    } catch (fehler) {
      console.warn("Rezeptbuch: Foto-Upload in den HA-Bilderspeicher fehlgeschlagen", fehler);
      return null;
    }
  }

  // Passende Bildadresse in der gewünschten Größe: Fotos aus dem HA-
  // Bilderspeicher gibt es serverseitig verkleinert (256 bzw. 512 Pixel) -
  // für Kacheln und Vorschaustreifen reicht das völlig und spart Daten.
  _bildSrc(src, groesse) {
    if (!src) return "";
    const treffer = /^(\/api\/image\/serve\/[0-9a-f]{32})\/original$/.exec(src);
    if (treffer && groesse) return `${treffer[1]}/${groesse}x${groesse}`;
    return src;
  }

  // <img>-Attribute für eine Kachel/Vorschau: Verkleinerung + träges Laden.
  _bildAttribute(src, sizes) {
    const klein = this._bildSrc(src, 256);
    const gross = this._bildSrc(src, 512);
    const srcset = klein !== src && gross !== src ? ` srcset="${this._escape(klein)} 256w, ${this._escape(gross)} 512w" sizes="${sizes}"` : "";
    return `src="${this._escape(gross !== src ? klein : src)}"${srcset} loading="lazy" decoding="async"`;
  }

  // Alle Fotos eines Rezepts: Titelbild zuerst, dann die weiteren.
  _rezeptFotos(r) {
    return [r.image, ...(Array.isArray(r.images) ? r.images : [])].filter(Boolean);
  }

  _fotosZaehlenOffen() {
    let anzahl = 0;
    this._rezepte.forEach((r) => {
      anzahl += this._rezeptFotos(r).filter((f) => String(f).startsWith("data:")).length;
    });
    return anzahl;
  }

  // Lagert alle noch als Text im Rezept liegenden Fotos in den Bilderspeicher
  // aus (nur Administratoren, weil dabei auch Rezepte anderer Nutzer
  // angepasst werden). Gibt zurück, wie viele Fotos ausgelagert wurden.
  async _fotosAuslagern() {
    let ausgelagert = 0;
    for (const r of this._rezepte.slice()) {
      if (!this._rezeptFotos(r).some((f) => String(f).startsWith("data:"))) continue;
      const frisch = await this._rezeptFrischLaden(r.uid);
      if (!frisch) continue;
      const neu = [];
      let geaendert = false;
      for (const foto of this._rezeptFotos(frisch)) {
        if (String(foto).startsWith("data:")) {
          const url = await this._fotoHochladen(foto);
          if (url) {
            neu.push(url);
            geaendert = true;
            ausgelagert++;
            continue;
          }
        }
        neu.push(foto);
      }
      if (!geaendert) continue;
      const payload = { ...this._rezeptPayload(frisch), image: neu[0] || null, images: neu.slice(1) };
      await this._hass.callService("todo", "update_item", {
        entity_id: this._config.entity,
        item: frisch.uid,
        description: JSON.stringify(payload),
      });
    }
    return ausgelagert;
  }

  // ---------------------------------------------------------------------
  // Automatische Sicherung in eine zweite To-do-Liste
  // ---------------------------------------------------------------------
  // Sicherungs-Objekt wie beim manuellen Export. Mit entferneDatenFotos
  // werden noch als Text eingebettete Fotos weggelassen (sie würden die
  // Sicherung riesig machen) - die Anzahl steht im Ergebnis.
  _sicherungsObjekt(entferneDatenFotos) {
    let entfernt = 0;
    const bereinigen = (foto) => {
      if (entferneDatenFotos && foto && String(foto).startsWith("data:")) {
        entfernt++;
        return null;
      }
      return foto;
    };
    const rezepte = this._rezepte.map((r) => {
      const payload = this._rezeptPayload(r);
      const fotos = [payload.image, ...(payload.images || [])].map(bereinigen).filter(Boolean);
      return { title: r.title, ...payload, image: fotos[0] || null, images: fotos.slice(1) };
    });
    return {
      daten: {
        schemaVersion: 2,
        exportiertAm: new Date().toISOString(),
        rezepte,
        einstellungen: this._einstellungen,
        eigeneKategorien: this._eigeneKategorien,
        kochbuecher: this._kochbuecher,
        wochenplan: this._wochenplan,
      },
      entfernteFotos: entfernt,
    };
  }

  async _sicherungsItemsLaden() {
    const entity = this._sicherungsEntity();
    if (this._entitaetVorhanden(entity) !== true) return null;
    const antwort = await this._hass.connection.sendMessagePromise({ type: "todo/item/list", entity_id: entity });
    return ((antwort && antwort.items) || [])
      .filter((i) => /^sicherung-\d{4}-\d{2}-\d{2}$/.test(i.summary || ""))
      .sort((a, b) => a.summary.localeCompare(b.summary));
  }

  // Schreibt höchstens eine Sicherung pro Tag und behält die letzten 14.
  // Läuft still im Hintergrund nach dem Laden der Rezepte - bei jedem Nutzer,
  // der die Karte öffnet (To-do-Einträge anlegen dürfen alle).
  async _autoSicherungPruefen(erzwingen) {
    try {
      if (!erzwingen && this._einstellungen.autoSicherung === false) return false;
      if (!this._rezepte.length) return false;
      const heute = _isoDatumHeute();
      if (!erzwingen && this._autoSicherungTag === heute) return false;
      this._autoSicherungTag = heute;
      const items = await this._sicherungsItemsLaden();
      if (items === null) return false;
      const name = `sicherung-${heute}`;
      const heutige = items.find((i) => i.summary === name);
      const { daten } = this._sicherungsObjekt(true);
      const beschreibung = JSON.stringify(daten);
      const entity = this._sicherungsEntity();
      if (heutige) {
        if (!erzwingen) return false;
        await this._hass.callService("todo", "update_item", { entity_id: entity, item: heutige.uid, description: beschreibung });
      } else {
        await this._hass.callService("todo", "add_item", { entity_id: entity, item: name, description: beschreibung });
        const alle = items.slice();
        const ueberzaehlig = alle.length + 1 - 14;
        for (let i = 0; i < ueberzaehlig; i++) {
          await this._hass.callService("todo", "remove_item", { entity_id: entity, item: alle[i].uid });
        }
      }
      return true;
    } catch (fehler) {
      console.warn("Rezeptbuch: automatische Sicherung fehlgeschlagen", fehler);
      return false;
    }
  }

  // Ergänzt aus einer Sicherung alle Rezepte, die es aktuell nicht (mehr)
  // gibt (Vergleich über den Titel). Bestehende Rezepte werden NIE
  // verändert oder überschrieben. Gibt die Anzahl ergänzter Rezepte zurück.
  async _sicherungErgaenzen(item) {
    const daten = JSON.parse(item.description || "{}");
    const vorhanden = new Set(this._rezepte.map((r) => (r.title || "").trim().toLowerCase()));
    let ergaenzt = 0;
    for (const eintrag of Array.isArray(daten.rezepte) ? daten.rezepte : []) {
      if (!eintrag || !eintrag.title) continue;
      const schluessel = String(eintrag.title).trim().toLowerCase();
      if (vorhanden.has(schluessel)) continue;
      const { title, ...rest } = eintrag;
      const rezept = this._itemZuRezept({ uid: null, summary: title, description: JSON.stringify(rest) });
      await this._hass.callService("todo", "add_item", {
        entity_id: this._config.entity,
        item: title,
        description: JSON.stringify(this._rezeptPayload(rezept)),
      });
      vorhanden.add(schluessel);
      ergaenzt++;
    }
    return ergaenzt;
  }

  // ---------------------------------------------------------------------
  // Bereich "Einrichtung & Wartung" im Einstellungen-Fenster
  // ---------------------------------------------------------------------
  _urlImportVerfuegbar() {
    const dienste = this._hass && this._hass.services;
    // Ohne Dienste-Liste (Testaufbau) nicht ausblenden.
    if (!dienste) return true;
    return !!(dienste.shell_command && dienste.shell_command.rezeptbuch_url_importieren);
  }

  async _einrichtungBereichAktualisieren() {
    const bereich = this.shadowRoot.getElementById("einrichtung-bereich");
    if (!bereich) return;
    const admin = this._istAdmin();
    const zeile = (symbol, text, knoepfe) => `
      <div class="einrichtung-zeile" style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin:6px 0; text-align:left;">
        <span>${symbol} ${text}</span>
        ${knoepfe ? `<span style="display:flex; gap:6px; flex-wrap:wrap;">${knoepfe}</span>` : ""}
      </div>`;
    const knopf = (id, text) => `<button type="button" class="sekundaer klein" id="${id}">${text}</button>`;
    const e = (x) => this._escape(x);

    const einkauf = this._einkaufslisteEntity();
    let sicherungZeile;
    let items = null;
    try {
      items = await this._sicherungsItemsLaden();
    } catch (fehler) {
      items = null;
    }
    if (items !== null) {
      const letzte = items.length ? items[items.length - 1].summary.slice(10) : this._t("einrichtung_sicherung_noch_keine");
      const aktiv = this._einstellungen.autoSicherung !== false;
      sicherungZeile = zeile("✅", this._t("einrichtung_sicherung_vorhanden", { datum: e(letzte), anzahl: items.length }),
        knopf("einrichtung-sicherung-jetzt-btn", this._t("einrichtung_sicherung_jetzt_btn")) +
        (items.length && admin ? knopf("einrichtung-sicherung-wiederherstellen-btn", this._t("einrichtung_sicherung_wiederherstellen_btn")) : ""))
        + `<div class="schalter-zeile">
             <span class="schalter-label">${this._t("einrichtung_sicherung_auto_label")}</span>
             <label class="schalter-btn ${aktiv ? "schalter-btn-aktiv" : ""}">
               <input type="checkbox" id="einrichtung-auto-sicherung-schalter" ${aktiv ? "checked" : ""}>
               <span>${aktiv ? this._t("allgemein_an") : this._t("allgemein_aus")}</span>
             </label>
           </div>`;
    } else {
      sicherungZeile = zeile("⚠️", this._t("einrichtung_sicherung_fehlt"),
        admin ? knopf("einrichtung-sicherung-einrichten-btn", this._t("einrichtung_einrichten_btn")) : "");
    }

    const offeneFotos = this._fotosZaehlenOffen();
    const fotoZeile = offeneFotos
      ? zeile("⚠️", this._t("einrichtung_fotos_offen", { anzahl: offeneFotos }),
          admin ? knopf("einrichtung-fotos-auslagern-btn", this._t("einrichtung_fotos_auslagern_btn")) : "")
      : zeile("✅", this._t("einrichtung_fotos_ok"));

    bereich.innerHTML =
      zeile("✅", this._t("einrichtung_rezeptliste", { entity: e(this._config.entity) })) +
      (einkauf
        ? zeile("✅", this._t("einrichtung_einkaufsliste", { entity: e(einkauf) }))
        : zeile("⚠️", this._t("einrichtung_einkaufsliste_fehlt"), admin ? knopf("einrichtung-einkauf-btn", this._t("einrichtung_einrichten_btn")) : "")) +
      sicherungZeile +
      fotoZeile +
      (this._urlImportVerfuegbar()
        ? zeile("✅", this._t("einrichtung_url_import_ok"))
        : zeile("ℹ️", this._t("einrichtung_url_import_fehlt")));

    const verdrahten = (id, fn) => {
      const el = bereich.querySelector(`#${id}`);
      if (!el) return;
      el.addEventListener("click", async () => {
        el.disabled = true;
        try {
          await fn();
        } catch (fehler) {
          console.error("Rezeptbuch: Einrichtung/Wartung fehlgeschlagen", fehler);
          this._hinweis(this._t("einrichtung_fehler", { fehler: fehler.message || fehler }));
        }
        await this._einrichtungBereichAktualisieren();
      });
    };
    verdrahten("einrichtung-einkauf-btn", async () => {
      const name = "Einkaufsliste";
      await this._localTodoAnlegen(name, "todo.einkaufsliste");
      this._hinweis(this._t("einrichtung_angelegt", { entity: "todo.einkaufsliste" }));
    });
    verdrahten("einrichtung-sicherung-einrichten-btn", async () => {
      const entity = this._sicherungsEntity();
      await this._localTodoAnlegen(`${this._anzeigenameAusEntity(this._config.entity)} Backup`, entity);
      await this._autoSicherungPruefen(true);
      this._hinweis(this._t("einrichtung_angelegt", { entity }));
    });
    verdrahten("einrichtung-sicherung-jetzt-btn", async () => {
      const ok = await this._autoSicherungPruefen(true);
      this._hinweis(this._t(ok ? "einrichtung_sicherung_erstellt" : "einrichtung_sicherung_fehlgeschlagen"));
    });
    verdrahten("einrichtung-fotos-auslagern-btn", async () => {
      const anzahl = await this._fotosAuslagern();
      await this._rezepteLaden();
      this._hinweis(this._t(anzahl ? "einrichtung_fotos_ausgelagert" : "einrichtung_fotos_nichts_ausgelagert", { anzahl }));
    });
    verdrahten("einrichtung-sicherung-wiederherstellen-btn", async () => {
      this._sicherungWiederherstellenFensterZeigen(items || []);
    });
    const autoSchalter = bereich.querySelector("#einrichtung-auto-sicherung-schalter");
    if (autoSchalter) {
      autoSchalter.addEventListener("change", async (ev) => {
        const aktiv = ev.target.checked;
        await this._einstellungenAktualisieren((stand) => ({ ...stand, autoSicherung: aktiv }));
        await this._einrichtungBereichAktualisieren();
      });
    }
  }

  // Kleines Fenster mit den vorhandenen Sicherungen; "Fehlende Rezepte
  // ergänzen" fügt nur hinzu, was aktuell fehlt - nichts wird überschrieben.
  _sicherungWiederherstellenFensterZeigen(items) {
    const alt = this.shadowRoot.getElementById("sicherung-modal");
    if (alt) alt.remove();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "sicherung-modal";
    overlay.style.display = "flex";
    overlay.style.zIndex = "10000";
    const zeilen = items.slice().reverse().map((i) => {
      let anzahl = "?";
      try { anzahl = (JSON.parse(i.description || "{}").rezepte || []).length; } catch (fehler) { anzahl = "?"; }
      return `<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin:6px 0;">
        <span>${this._escape(i.summary.slice(10))} (${this._t("sicherung_modal_rezepte", { anzahl })})</span>
        <button type="button" class="sekundaer klein" data-sicherung-uid="${this._escape(i.uid)}">${this._t("sicherung_modal_ergaenzen_btn")}</button>
      </div>`;
    }).join("");
    overlay.innerHTML = `
      <div class="modal-box modal-box-breit modal-box-scroll">
        <h3 style="margin-top:0;">${this._t("sicherung_modal_titel")}</h3>
        <p class="hinweis" style="text-align:left;">${this._t("sicherung_modal_hinweis")}</p>
        ${zeilen}
        <div class="modal-aktionen" style="margin-top:14px;">
          <button type="button" class="primaer" id="sicherung-modal-schliessen-btn">${this._t("allgemein_schliessen")}</button>
        </div>
      </div>`;
    overlay.querySelector("#sicherung-modal-schliessen-btn").addEventListener("click", () => overlay.remove());
    overlay.querySelectorAll("[data-sicherung-uid]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          const item = items.find((i) => i.uid === btn.dataset.sicherungUid);
          const anzahl = await this._sicherungErgaenzen(item);
          overlay.remove();
          await this._rezepteLaden();
          this._hinweis(this._t(anzahl ? "sicherung_modal_ergebnis" : "sicherung_modal_nichts_fehlt", { anzahl }));
        } catch (fehler) {
          console.error("Rezeptbuch: Wiederherstellen fehlgeschlagen", fehler);
          btn.disabled = false;
          this._hinweis(this._t("einrichtung_fehler", { fehler: fehler.message || fehler }));
        }
      });
    });
    this.shadowRoot.appendChild(overlay);
  }

  _backupErstellen() {
    const daten = {
      schemaVersion: 2,
      exportiertAm: new Date().toISOString(),
      rezepte: this._rezepte.map((r) => ({
        title: r.title,
        ...this._rezeptPayload(r),
      })),
      einstellungen: this._einstellungen,
      eigeneKategorien: this._eigeneKategorien,
      kochbuecher: this._kochbuecher,
      wochenplan: this._wochenplan,
    };
    const text = JSON.stringify(daten, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const datum = new Date().toISOString().slice(0, 10);
    a.download = `rezeptbuch-sicherung-${datum}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _rezeptOeffnen(rezept) {
    this._scrollPositionSpeichern();
    this._aktivesRezept = rezept;
    this._portionen = rezept.servings || 1;
    this._ansicht = "detail";
    this._historyEintragSicherstellen();
    this._urlHashSetzen(rezept.uid);
    this._render();
  }

  // Wählt zufällig ein Rezept aus und öffnet dessen Detailansicht - bezieht
  // sich bewusst auf die GEFILTERTE Liste (_gefilterteRezepte), damit eine
  // aktive Kategorie/Tag-Auswahl oder Suche berücksichtigt wird ("Zufalls-
  // rezept" innerhalb der aktuell sichtbaren Auswahl, nicht aus dem
  // gesamten Rezeptbuch). Ist die gefilterte Liste leer (z. B. Suchbegriff
  // ohne Treffer), fällt es auf alle Rezepte zurück, damit der Knopf nie
  // folgenlos bleibt.
  _zufallsrezeptOeffnen() {
    const auswahl = this._gefilterteRezepte();
    const liste = auswahl.length ? auswahl : this._rezepte;
    if (!liste.length) return;
    const zufall = liste[Math.floor(Math.random() * liste.length)];
    this._rezeptOeffnen(zufall);
  }

  async _rezeptAlsZubereitetMarkieren(rezept) {
    // Konflikt-Schutz wie bei Kommentar/Bewertung: frisch laden, dann erst
    // senden, erst bei Erfolg lokal übernehmen - vorher wurde cookLog auch
    // bei einem fehlgeschlagenen Speichern schon lokal erhöht, was nach
    // einem Fehler wie eine erfolgreich gespeicherte Zubereitung aussah.
    const frisch = (await this._rezeptFrischLaden(rezept.uid)) || rezept;
    const neuesCookLog = [...(frisch.cookLog || []), new Date().toISOString()];
    const erfolg = await this._serviceAufrufen("update_item", {
      item: rezept.uid,
      description: JSON.stringify({ ...this._rezeptPayload(frisch), cookLog: neuesCookLog }),
    });
    if (erfolg) {
      Object.assign(rezept, frisch, { cookLog: neuesCookLog });
    }
    this._navigationZurueck();
  }

  async _zurListe() {
    this._ansicht = "liste";
    this._aktivesRezept = null;
    this._urlHashSetzen(null);
    this._kochmodusZuruecksetzen();
    await this._rezepteLaden();
    this._scrollPositionWiederherstellen();
  }

  // Setzt den Kochmodus-Zustand zurück (u.a. beim Verlassen der
  // Detailansicht) - inklusive eines eventuell noch laufenden Timers, denn
  // der gehört zu diesem Rezept/Kochvorgang und soll nicht in ein anderes
  // Rezept "mitlaufen".
  _kochmodusZuruecksetzen() {
    this._kochmodusAktiv = false;
    this._kochmodusSchrittIndex = 0;
    this._kochmodusZutatenSichtbar = false;
    this._kochmodusTimerPanelSichtbar = false;
    this._kochmodusTimerAbgelaufen = false;
    this._kochmodusTimerEndeZeitpunkt = null;
    this._kochmodusTimerIntervallStoppen();
    this._kochmodusWakeLockFreigeben();
  }

  _kochmodusOeffnen() {
    this._kochmodusAktiv = true;
    this._kochmodusSchrittIndex = 0;
    this._kochmodusWakeLockAnfordern();
    this._render();
  }

  // Schließt nur das Kochmodus-Overlay - ein evtl. laufender Timer läuft
  // bewusst im Hintergrund weiter (z.B. "20 Min. im Ofen"), damit er auch
  // dann noch klingelt, wenn man zwischendurch die Zutatenliste oder ein
  // anderes Rezept ansieht. Der Bildschirm darf dabei aber wieder normal
  // abdunkeln - die Wake Lock gehört nur zur eigentlichen Vollbildansicht.
  _kochmodusSchliessen() {
    this._kochmodusAktiv = false;
    this._kochmodusWakeLockFreigeben();
    this._render();
  }

  // Fordert eine Screen-Wake-Lock an, damit der Bildschirm im Kochmodus
  // nicht abdunkelt/sperrt - rein additiv: die `navigator.wakeLock`-API
  // fehlt in den Test-Fakes und in manchen (älteren/Desktop-)Browsern,
  // daher großzügig mit typeof/try-catch abgesichert, statt den Kochmodus
  // selbst davon abhängig zu machen.
  async _kochmodusWakeLockAnfordern() {
    try {
      if (typeof navigator !== "undefined" && navigator.wakeLock && typeof navigator.wakeLock.request === "function") {
        this._kochmodusWakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (fehler) {
      // Wake Lock ist reine Komfortfunktion - der Kochmodus funktioniert
      // auch ohne (z.B. wenn der Tab gerade nicht sichtbar ist oder der
      // Browser die Anfrage aus anderen Gründen ablehnt).
      this._kochmodusWakeLock = null;
    }
  }

  _kochmodusWakeLockFreigeben() {
    if (this._kochmodusWakeLock) {
      try {
        this._kochmodusWakeLock.release();
      } catch (fehler) {
        // Ignorieren - z.B. wenn die Sperre vom Browser bereits von selbst
        // aufgehoben wurde (siehe _kochmodusSichtbarkeitsHandler).
      }
      this._kochmodusWakeLock = null;
    }
  }

  // --- Kochmodus-Timer ---
  // Startet einen Countdown über `minuten` Minuten. Gespeichert wird der
  // absolute Ziel-Zeitpunkt (Date.now() + Dauer), nicht die verbleibende
  // Sekundenzahl - so zeigt der Timer auch nach einer gedrosselten/
  // inaktiven Browser-Tab-Phase weiterhin die korrekte Restzeit.
  _kochmodusTimerStarten(minuten) {
    const sekunden = Math.max(1, Math.round(Number(minuten) * 60));
    if (!Number.isFinite(sekunden) || sekunden <= 0) return;
    this._kochmodusTimerEndeZeitpunkt = Date.now() + sekunden * 1000;
    this._kochmodusTimerAbgelaufen = false;
    this._kochmodusTimerIntervallStarten();
    this._render();
  }

  _kochmodusTimerAbbrechen() {
    this._kochmodusTimerEndeZeitpunkt = null;
    this._kochmodusTimerAbgelaufen = false;
    this._kochmodusTimerIntervallStoppen();
    this._render();
  }

  // Blendet die "Timer abgelaufen"-Meldung wieder aus, ohne das Panel zu
  // schließen - danach kann direkt der nächste Timer gestartet werden.
  _kochmodusTimerBestaetigen() {
    this._kochmodusTimerAbgelaufen = false;
    this._render();
  }

  _kochmodusTimerIntervallStarten() {
    this._kochmodusTimerIntervallStoppen();
    this._kochmodusTimerIntervallId = setInterval(() => this._kochmodusTimerTick(), 1000);
  }

  _kochmodusTimerIntervallStoppen() {
    if (this._kochmodusTimerIntervallId) {
      clearInterval(this._kochmodusTimerIntervallId);
      this._kochmodusTimerIntervallId = null;
    }
  }

  _kochmodusTimerTick() {
    if (!this._kochmodusTimerEndeZeitpunkt) {
      this._kochmodusTimerIntervallStoppen();
      return;
    }
    if (Date.now() >= this._kochmodusTimerEndeZeitpunkt) {
      this._kochmodusTimerEndeZeitpunkt = null;
      this._kochmodusTimerAbgelaufen = true;
      this._kochmodusTimerIntervallStoppen();
      this._kochmodusTimerSignalGeben();
    }
    this._render();
  }

  // Akustisches/haptisches Signal, wenn der Timer abläuft - rein additiv:
  // AudioContext/vibrate fehlen in den Test-Fakes und in manchen Browsern,
  // daher großzügig mit typeof/try-catch abgesichert, statt die Anzeige
  // der "abgelaufen"-Meldung davon abhängig zu machen.
  _kochmodusTimerSignalGeben() {
    try {
      const AudioContextKlasse = window.AudioContext || window.webkitAudioContext;
      if (typeof AudioContextKlasse === "function") {
        const kontext = new AudioContextKlasse();
        const jetzt = kontext.currentTime;
        // Sechs kurze Pieptöne statt eines Dauertons - deutlich länger und
        // damit auch aus einem anderen Zimmer oder bei Küchenlärm noch gut
        // wahrnehmbar, aber nicht so unangenehm wie ein Daueralarm.
        [0, 0.4, 0.8, 1.2, 1.6, 2.0].forEach((versatz) => {
          const oszillator = kontext.createOscillator();
          const lautstaerke = kontext.createGain();
          oszillator.type = "sine";
          oszillator.frequency.value = 880;
          lautstaerke.gain.setValueAtTime(0.0001, jetzt + versatz);
          lautstaerke.gain.exponentialRampToValueAtTime(0.3, jetzt + versatz + 0.02);
          lautstaerke.gain.exponentialRampToValueAtTime(0.0001, jetzt + versatz + 0.3);
          oszillator.connect(lautstaerke);
          lautstaerke.connect(kontext.destination);
          oszillator.start(jetzt + versatz);
          oszillator.stop(jetzt + versatz + 0.35);
        });
        setTimeout(() => kontext.close().catch(() => {}), 2600);
      }
    } catch (fehler) {
      // Ton ist reine Zusatzfunktion - die visuelle Meldung reicht notfalls.
    }
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([250, 100, 250, 100, 250]);
      }
    } catch (fehler) {
      // Vibration ist optional (z.B. auf Desktop nicht verfügbar).
    }
  }

  // Restzeit als "MM:SS" für die Anzeige - rundet auf ganze Sekunden auf,
  // damit die Anzeige nicht bei "0:00" hängen bleibt, während der Tick
  // noch nicht gefeuert hat.
  _kochmodusTimerRestAnzeige() {
    if (!this._kochmodusTimerEndeZeitpunkt) return "0:00";
    const restSekunden = Math.max(0, Math.ceil((this._kochmodusTimerEndeZeitpunkt - Date.now()) / 1000));
    const minuten = Math.floor(restSekunden / 60);
    const sekunden = restSekunden % 60;
    return `${minuten}:${String(sekunden).padStart(2, "0")}`;
  }

  _kochmodusSchrittWechseln(richtung) {
    const schritte = (this._aktivesRezept.steps || []).filter((s) => s && s.trim());
    const neuerIndex = this._kochmodusSchrittIndex + richtung;
    if (neuerIndex < 0 || neuerIndex >= schritte.length) return;
    this._kochmodusSchrittIndex = neuerIndex;
    this._render();
  }

  _neuesRezeptFormular() {
    this._scrollPositionSpeichern();
    this._aktivesRezept = {
      uid: null,
      title: "",
      servings: 4,
      category: "Sonstiges",
      ingredients: [{ amount: "", unit: "", name: "" }],
      steps: [""],
      image: null,
      ratings: {},
      comments: [],
      creator: null,
      creatorName: null,
      created: null,
      tags: [],
    };
    // Kein Konflikt möglich bei einem neuen Rezept - kein Snapshot nötig.
    this._bearbeitungsSnapshot = null;
    this._ansicht = "formular";
    this._historyEintragSicherstellen();
    this._render();
  }

  _rezeptBearbeiten(rezept) {
    this._aktivesRezept = JSON.parse(JSON.stringify(rezept));
    // Konflikt-Schutz: Stand beim Öffnen des Formulars merken, um beim
    // Speichern zu erkennen, ob jemand anderes das Rezept inzwischen
    // geändert hat (siehe _formularSpeichern).
    this._bearbeitungsSnapshot = JSON.stringify(this._rezeptPayload(rezept));
    this._ansicht = "formular";
    this._historyEintragSicherstellen();
    this._render();
  }

  _rezeptLoeschen(rezept) {
    // Eigenes Modal statt window.confirm(): native Bestätigungsdialoge
    // verhalten sich in der Home-Assistant-Begleit-App (WebView) unzuverlässig
    // (ähnlich wie window.print()/window.open() vorher) - ein selbst
    // gerendertes Modal funktioniert überall gleich zuverlässig.
    this._rezeptZumLoeschen = rezept;
    this._loeschenModalAnzeigen();
  }

  _loeschenModalAnzeigen() {
    const modal = this.shadowRoot.getElementById("loeschen-modal");
    if (modal) modal.style.display = "flex";
  }

  _loeschenModalVerstecken() {
    const modal = this.shadowRoot.getElementById("loeschen-modal");
    if (modal) modal.style.display = "none";
  }

  async _rezeptLoeschenBestaetigt(rezept) {
    this._loeschenModalVerstecken();

    // Optimistisch aus der Ansicht entfernen, serverseitig aber noch NICHT
    // löschen - das passiert erst nach Ablauf des Rückgängig-Fensters.
    this._rezepte = this._rezepte.filter((r) => r.uid !== rezept.uid);
    this._geloeschtesRezept = rezept;
    this._ansicht = "liste";
    this._aktivesRezept = null;
    this._historyZuruecksetzen();
    this._render();
    this._scrollPositionWiederherstellen();

    if (this._loeschTimer) clearTimeout(this._loeschTimer);
    this._loeschTimer = setTimeout(async () => {
      this._loeschTimer = null;
      this._geloeschtesRezept = null;
      await this._serviceAufrufen("remove_item", { item: rezept.uid });
    }, 6000);
  }

  _loeschenRueckgaengig() {
    if (this._loeschTimer) {
      clearTimeout(this._loeschTimer);
      this._loeschTimer = null;
    }
    if (this._geloeschtesRezept) {
      this._rezepte.push(this._geloeschtesRezept);
      this._geloeschtesRezept = null;
    }
    this._render();
  }

  _bildKomprimieren(datei, maxBreiteHoehe = 640, qualitaet = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      // FileReader/Image liefern bei onerror ein rohes ProgressEvent statt
      // eines Error-Objekts - das würde als "[object ProgressEvent]" in
      // Fehlermeldungen landen. Hier stattdessen in ein lesbares Error
      // umwandeln, mit Kontext, an welcher Stelle es scheiterte.
      reader.onerror = () => reject(new Error(this._t("fehler_bild_lesen")));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error(this._t("fehler_bild_verarbeiten")));
        img.onload = () => {
          let breite = img.width;
          let hoehe = img.height;
          if (breite > hoehe && breite > maxBreiteHoehe) {
            hoehe = Math.round((hoehe * maxBreiteHoehe) / breite);
            breite = maxBreiteHoehe;
          } else if (hoehe > maxBreiteHoehe) {
            breite = Math.round((breite * maxBreiteHoehe) / hoehe);
            hoehe = maxBreiteHoehe;
          }
          const canvas = document.createElement("canvas");
          canvas.width = breite;
          canvas.height = hoehe;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, breite, hoehe);
          resolve(canvas.toDataURL("image/jpeg", qualitaet));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(datei);
    });
  }

  async _formularSpeichern(formDaten) {
    const rezept = this._aktivesRezept;
    const istNeuesRezept = !rezept.uid;

    if (!istNeuesRezept) {
      // Konflikt-Schutz: prüfen, ob sich das Rezept seit dem Öffnen des
      // Bearbeiten-Formulars serverseitig verändert hat (z.B. weil jemand
      // anderes gleichzeitig einen Kommentar/eine Bewertung hinzugefügt oder
      // das Rezept selbst geändert hat). Reine Kartenlogik - kein neues
      // Backend, kein extra Versionsfeld nötig: der aktuelle Server-Stand
      // wird einfach mit dem beim Öffnen des Formulars gemerkten Stand
      // verglichen.
      const frisch = await this._rezeptFrischLaden(rezept.uid);
      if (frisch === null) {
        this._hinweis(this._t("fehler_konflikt_geloescht", { titel: rezept.title }));
        this._navigationZurueck();
        return;
      }
      const aktuellerStand = JSON.stringify(this._rezeptPayload(frisch));
      if (this._bearbeitungsSnapshot !== null && aktuellerStand !== this._bearbeitungsSnapshot) {
        this._hinweis(this._t("fehler_konflikt_geaendert", { titel: rezept.title }));
        return;
      }
    }

    // Fotos: Titelbild + weitere. Noch als Text vorliegende (frisch
    // verkleinerte) Fotos wandern jetzt in den Home-Assistant-Bilderspeicher;
    // klappt das nicht, bleiben sie wie früher als Text im Rezept.
    const fotosRoh = Array.isArray(formDaten.fotos)
      ? formDaten.fotos
      : [formDaten.image, ...(Array.isArray(formDaten.images) ? formDaten.images : [])].filter(Boolean);
    const fotos = [];
    for (const foto of fotosRoh.slice(0, MAX_FOTOS)) {
      if (String(foto).startsWith("data:")) {
        fotos.push((await this._fotoHochladen(foto)) || foto);
      } else {
        fotos.push(foto);
      }
    }

    const titel = formDaten.title;
    const payload = {
      // schemaVersion wie bei jedem anderen Speichervorgang immer auf den
      // aktuellen Stand setzen (siehe _rezeptPayload/_migriereRezept).
      schemaVersion: SCHEMA_VERSION,
      servings: parseFloat(formDaten.servings) || 1,
      category: formDaten.category || "Sonstiges",
      tags: (formDaten.tags || []).map((t) => (t || "").trim()).filter(Boolean),
      ingredients: formDaten.ingredients.filter((z) => z.name),
      steps: formDaten.steps.filter((s) => s.trim()),
      image: fotos[0] || null,
      images: fotos.slice(1),
      ratings: rezept.ratings || {},
      comments: rezept.comments || [],
      // War hier zuvor NICHT enthalten - dadurch wurde die Zubereitungs-
      // Historie (cookLog) bei jeder Bearbeitung über das volle Formular
      // stillschweigend gelöscht, obwohl das Formular sie gar nicht anzeigt
      // oder verändert. Wie ratings/comments unverändert übernehmen.
      cookLog: rezept.cookLog || [],
      creator: istNeuesRezept
        ? (this._hass.user ? this._hass.user.id : null)
        : (rezept.creator || null),
      creatorName: istNeuesRezept
        ? (this._hass.user ? this._hass.user.name : null)
        : (rezept.creatorName || null),
      created: istNeuesRezept
        ? new Date().toISOString()
        : (rezept.created || null),
    };
    const beschreibung = JSON.stringify(payload);

    let erfolg;
    if (rezept.uid) {
      erfolg = await this._serviceAufrufen("update_item", {
        item: rezept.uid,
        rename: titel,
        description: beschreibung,
      });
    } else {
      erfolg = await this._serviceAufrufen("add_item", {
        item: titel,
        description: beschreibung,
      });
    }

    if (!erfolg) return;

    // Konnte ein Foto nicht in den Bilderspeicher hochgeladen werden, liegt es
    // noch als Base64-Text im JSON. Wer das ältere Bild-Skript eingerichtet
    // hat (shell_command), lässt es von dort auslagern - alle anderen können
    // das später in den Einstellungen nachholen. Schlägt es fehl, bleibt das
    // Foto einfach als Text im Rezept (funktioniert überall) - kein Grund,
    // das Speichern selbst scheitern zu lassen.
    if (fotos.some((f) => String(f).startsWith("data:"))) {
      const dienste = this._hass.services;
      const skriptDa = !dienste || (dienste.shell_command && dienste.shell_command.rezeptbuch_bilder_verarbeiten);
      if (skriptDa) {
        try {
          await this._hass.callService("shell_command", "rezeptbuch_bilder_verarbeiten", {});
        } catch (fehler) {
          console.warn("Rezeptbuch: Foto-Auslagerung fehlgeschlagen, Foto bleibt vorerst als Base64 gespeichert", fehler);
        }
      }
    }

    this._navigationZurueck();
  }

  _skaliereMenge(menge, basisPortionen, zielPortionen) {
    const zahl = parseFloat(String(menge).replace(",", "."));
    if (isNaN(zahl) || !basisPortionen) return menge;
    const ergebnis = (zahl / basisPortionen) * zielPortionen;
    return Math.round(ergebnis * 100) / 100;
  }

  _normalisieren(text) {
    return (text || "")
      .toLowerCase()
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ß/g, "ss");
  }

  // Übersetzte Zutatennamen für die Umrechnungstabelle in der aktuell
  // aktiven Sprache (siehe UMRECHNUNGSTABELLE_NAMEN) - fällt wie _t() auf
  // Deutsch zurück, falls eine Sprache (sollte nicht vorkommen) fehlt.
  _umrechnungstabelleNamen() {
    const sprache = this._sprache();
    const nachgeladen = sprache === "de" ? null : sprachtabelle(sprache);
    return (nachgeladen && nachgeladen.zutaten) || UMRECHNUNGSTABELLE_NAMEN.de;
  }

  // HTML für das Umrechnungstabelle-Popup selbst - als eigene Methode, weil
  // es sowohl in der Übersicht (_renderListe, Hauptmenü-Knopf) als auch in
  // der Detailansicht/im Kochmodus (_renderDetail, bei Rezepten mit der in
  // den Einstellungen gewählten "amerikanischen" Kategorie) eingebunden
  // wird - jede _render*-Methode ersetzt this.shadowRoot.innerHTML komplett,
  // das Popup-Markup müsste sonst doppelt gepflegt werden.
  _umrechnungstabelleModalHtml() {
    return `
        <div class="modal-overlay" id="umrechnungstabelle-modal" style="display:none;">
          <div class="modal-box modal-box-breit modal-box-hoch">
            <h3 style="margin-top:0;">${this._t("umrechnungstabelle_titel")}</h3>
            <p style="text-align:left;">${this._t("umrechnungstabelle_hinweis")}</p>
            <input type="text" id="umrechnungstabelle-suche-feld" placeholder="${this._t("umrechnungstabelle_suche_placeholder")}">
            <div class="umrechnungstabelle-liste" id="umrechnungstabelle-liste">
              <table class="umrechnungstabelle-tabelle">
                <thead>
                  <tr>
                    <th>${this._t("umrechnungstabelle_spalte_zutat")}</th>
                    <th>${this._t("umrechnungstabelle_spalte_tasse")}</th>
                    <th>${this._t("umrechnungstabelle_spalte_el")}</th>
                    <th>${this._t("umrechnungstabelle_spalte_tl")}</th>
                  </tr>
                </thead>
                <tbody>${this._umrechnungstabelleZeilenHtml()}</tbody>
              </table>
              <p class="umrechnungstabelle-keine-treffer" id="umrechnungstabelle-keine-treffer" style="display:none;">${this._t("umrechnungstabelle_keine_treffer")}</p>
            </div>
            <div class="umrechnungstabelle-eigene-bereich">
              <button type="button" class="sekundaer klein" id="umrechnungstabelle-eigene-oeffnen-btn">${this._t("umrechnungstabelle_eigene_hinzufuegen_btn")}</button>
              <div id="umrechnungstabelle-eigene-formular" style="display:none;">
                <p class="umrechnungstabelle-eigene-hinweis">${this._t("umrechnungstabelle_eigene_hinweis")}</p>
                <input type="text" id="umrechnungstabelle-eigene-name-feld" placeholder="${this._t("umrechnungstabelle_eigene_name_platzhalter")}">
                <div class="umrechnungstabelle-eigene-werte-zeile">
                  <input type="number" step="any" id="umrechnungstabelle-eigene-tasse-feld" placeholder="${this._t("umrechnungstabelle_eigene_tasse_platzhalter")}">
                  <input type="number" step="any" id="umrechnungstabelle-eigene-el-feld" placeholder="${this._t("umrechnungstabelle_eigene_el_platzhalter")}">
                  <input type="number" step="any" id="umrechnungstabelle-eigene-tl-feld" placeholder="${this._t("umrechnungstabelle_eigene_tl_platzhalter")}">
                </div>
                <p class="umrechnungstabelle-eigene-fehler" id="umrechnungstabelle-eigene-fehler" style="display:none;">${this._t("umrechnungstabelle_eigene_name_fehlt")}</p>
                <div class="modal-aktionen">
                  <button type="button" class="primaer" id="umrechnungstabelle-eigene-speichern-btn">${this._t("allgemein_speichern")}</button>
                  <button type="button" class="sekundaer" id="umrechnungstabelle-eigene-abbrechen-btn">${this._t("allgemein_abbrechen")}</button>
                </div>
              </div>
            </div>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="primaer" id="umrechnungstabelle-schliessen-btn">${this._t("allgemein_schliessen")}</button>
            </div>
          </div>
        </div>`;
  }

  // Baut die <tr>-Zeilen der Umrechnungstabelle (fest eingebaute Zutaten +
  // vom Nutzer selbst hinzugefügte, siehe eigeneUmrechnungen) - als eigene
  // Methode, damit sie sowohl beim ersten Öffnen (_umrechnungstabelleModalHtml)
  // als auch nach dem Hinzufügen/Löschen einer eigenen Zutat
  // (_umrechnungstabelleTabelleAktualisieren) identisch erzeugt werden.
  // Eigene Zutaten werden NICHT übersetzt (der Nutzer trägt den Namen in
  // seiner eigenen Sprache ein) und tragen einen Löschen-Knopf, fest
  // eingebaute Zutaten nicht.
  _umrechnungstabelleZeilenHtml() {
    const fest = UMRECHNUNGSTABELLE_ZUTATEN.map((z, i) => {
      const name = this._umrechnungstabelleNamen()[i] || z.schluessel;
      return `
                    <tr data-zutat-name="${this._escape(this._normalisieren(name))}">
                      <td>${this._escape(name)}</td>
                      <td>${z.cup !== undefined ? this._t("umrechnungstabelle_gramm_wert", { wert: String(z.cup).replace(".", ",") }) : "–"}</td>
                      <td>${z.tbsp !== undefined ? this._t("umrechnungstabelle_gramm_wert", { wert: String(z.tbsp).replace(".", ",") }) : "–"}</td>
                      <td>${z.tsp !== undefined ? this._t("umrechnungstabelle_gramm_wert", { wert: String(z.tsp).replace(".", ",") }) : "–"}</td>
                    </tr>`;
    }).join("");
    const eigene = (this._einstellungen.eigeneUmrechnungen || []).map((z) => `
                    <tr data-zutat-name="${this._escape(this._normalisieren(z.name))}" data-eigene-id="${this._escape(z.id)}">
                      <td>${this._escape(z.name)}
                        <button type="button" class="umrechnungstabelle-eigene-bearbeiten-btn" data-id="${this._escape(z.id)}" title="${this._t("umrechnungstabelle_eigene_bearbeiten_titel")}">✎</button>
                        <button type="button" class="umrechnungstabelle-eigene-loeschen-btn" data-id="${this._escape(z.id)}" title="${this._t("umrechnungstabelle_eigene_loeschen_titel")}">✕</button>
                      </td>
                      <td>${z.cup !== undefined ? this._t("umrechnungstabelle_gramm_wert", { wert: String(z.cup).replace(".", ",") }) : "–"}</td>
                      <td>${z.tbsp !== undefined ? this._t("umrechnungstabelle_gramm_wert", { wert: String(z.tbsp).replace(".", ",") }) : "–"}</td>
                      <td>${z.tsp !== undefined ? this._t("umrechnungstabelle_gramm_wert", { wert: String(z.tsp).replace(".", ",") }) : "–"}</td>
                    </tr>`).join("");
    return fest + eigene;
  }

  // Verdrahtet die Klick-/Such-Handler des Umrechnungstabelle-Popups -
  // gemeinsam für _renderListe und _renderDetail (siehe
  // _umrechnungstabelleModalHtml) aufgerufen, damit die Logik nicht an
  // zwei Stellen gepflegt werden muss. "oeffnenBtnIds" sind die IDs aller
  // Knöpfe, die auf dieser Seite das Popup öffnen können (Hauptmenü hat
  // genau einen, die Detailansicht kann zusätzlich/alternativ den
  // Kochmodus-Knopf haben).
  _umrechnungstabelleVerdrahten(oeffnenBtnIds) {
    for (const id of oeffnenBtnIds) {
      const btn = this.shadowRoot.getElementById(id);
      if (btn) {
        btn.addEventListener("click", () => {
          this.shadowRoot.getElementById("umrechnungstabelle-modal").style.display = "flex";
        });
      }
    }
    const schliessenBtn = this.shadowRoot.getElementById("umrechnungstabelle-schliessen-btn");
    if (schliessenBtn) {
      schliessenBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("umrechnungstabelle-modal").style.display = "none";
        const sucheFeld = this.shadowRoot.getElementById("umrechnungstabelle-suche-feld");
        if (sucheFeld) sucheFeld.value = "";
        this._umrechnungstabelleFiltern("");
      });
    }
    const sucheFeld = this.shadowRoot.getElementById("umrechnungstabelle-suche-feld");
    if (sucheFeld) {
      sucheFeld.addEventListener("input", () => {
        this._umrechnungstabelleFiltern(sucheFeld.value);
      });
    }
    const eigeneOeffnenBtn = this.shadowRoot.getElementById("umrechnungstabelle-eigene-oeffnen-btn");
    const eigeneFormular = this.shadowRoot.getElementById("umrechnungstabelle-eigene-formular");
    if (eigeneOeffnenBtn && eigeneFormular) {
      eigeneOeffnenBtn.addEventListener("click", () => {
        eigeneFormular.style.display = eigeneFormular.style.display === "none" ? "block" : "none";
      });
    }
    const eigeneAbbrechenBtn = this.shadowRoot.getElementById("umrechnungstabelle-eigene-abbrechen-btn");
    if (eigeneAbbrechenBtn) {
      eigeneAbbrechenBtn.addEventListener("click", () => {
        this._umrechnungstabelleEigeneFormularZuruecksetzen();
      });
    }
    const eigeneSpeichernBtn = this.shadowRoot.getElementById("umrechnungstabelle-eigene-speichern-btn");
    if (eigeneSpeichernBtn) {
      eigeneSpeichernBtn.addEventListener("click", async () => {
        await this._umrechnungstabelleEigeneSpeichern();
      });
    }
    // Löschen/Bearbeiten eigener Zutaten per Klick-Delegation auf die
    // Liste, nicht pro Zeile einzeln verdrahtet: nach jedem Hinzufügen/
    // Löschen wird nur der <tbody>-Inhalt neu aufgebaut (siehe
    // _umrechnungstabelleTabelleAktualisieren), einzeln verdrahtete Knöpfe
    // wären danach verwaist.
    const liste = this.shadowRoot.getElementById("umrechnungstabelle-liste");
    if (liste) {
      liste.addEventListener("click", async (ev) => {
        const loeschenBtn = ev.target.closest(".umrechnungstabelle-eigene-loeschen-btn");
        if (loeschenBtn) {
          await this._umrechnungstabelleEigeneLoeschen(loeschenBtn.dataset.id);
          return;
        }
        const bearbeitenBtn = ev.target.closest(".umrechnungstabelle-eigene-bearbeiten-btn");
        if (bearbeitenBtn) {
          this._umrechnungstabelleEigeneBearbeitenOeffnen(bearbeitenBtn.dataset.id);
        }
      });
    }
  }

  // Setzt das "Eigene Zutat hinzufügen/bearbeiten"-Formular zurück (Felder
  // leeren, Fehlerhinweis einklappen, Bearbeiten-Modus verlassen) - nach
  // erfolgreichem Speichern sowie beim Abbrechen.
  _umrechnungstabelleEigeneFormularZuruecksetzen() {
    const eigeneFormular = this.shadowRoot.getElementById("umrechnungstabelle-eigene-formular");
    if (eigeneFormular) eigeneFormular.style.display = "none";
    const fehlerHinweis = this.shadowRoot.getElementById("umrechnungstabelle-eigene-fehler");
    if (fehlerHinweis) fehlerHinweis.style.display = "none";
    ["umrechnungstabelle-eigene-name-feld", "umrechnungstabelle-eigene-tasse-feld", "umrechnungstabelle-eigene-el-feld", "umrechnungstabelle-eigene-tl-feld"].forEach((id) => {
      const feld = this.shadowRoot.getElementById(id);
      if (feld) feld.value = "";
    });
    this._umrechnungstabelleBearbeiteId = null;
  }

  // Öffnet das Formular im Bearbeiten-Modus, vorausgefüllt mit den Werten
  // der angeklickten eigenen Zutat (per ID, siehe _zufallsId) - merkt sich
  // die ID auf der Karteninstanz (this._umrechnungstabelleBearbeiteId),
  // damit _umrechnungstabelleEigeneSpeichern weiß, dass diese Zutat ERSETZT
  // statt eine neue angehängt werden soll.
  _umrechnungstabelleEigeneBearbeitenOeffnen(id) {
    const eintrag = (this._einstellungen.eigeneUmrechnungen || []).find((e) => e.id === id);
    if (!eintrag) return;
    this._umrechnungstabelleBearbeiteId = id;
    const eigeneFormular = this.shadowRoot.getElementById("umrechnungstabelle-eigene-formular");
    if (eigeneFormular) eigeneFormular.style.display = "block";
    const setzen = (feldId, wert) => {
      const feld = this.shadowRoot.getElementById(feldId);
      if (feld) feld.value = wert === undefined || wert === null ? "" : String(wert).replace(".", ",");
    };
    setzen("umrechnungstabelle-eigene-name-feld", eintrag.name);
    setzen("umrechnungstabelle-eigene-tasse-feld", eintrag.cup);
    setzen("umrechnungstabelle-eigene-el-feld", eintrag.tbsp);
    setzen("umrechnungstabelle-eigene-tl-feld", eintrag.tsp);
  }

  // Liest das "Eigene Zutat hinzufügen/bearbeiten"-Formular aus, validiert
  // (nur der Name ist Pflicht - cup/tbsp/tsp sind einzeln optional, man
  // kennt ja vielleicht nur einen der drei Werte) und speichert die Zutat
  // konfliktsicher in den (geteilten) Einstellungen (siehe
  // _einstellungenAktualisieren - verhindert, dass ein zwischenzeitlich
  // von einem anderen Gerät hinzugefügter Eintrag beim Speichern wieder
  // verschwindet). Ist this._umrechnungstabelleBearbeiteId gesetzt, wird
  // die bestehende Zutat mit dieser ID ersetzt statt eine neue anzuhängen.
  // Baut danach NUR den Tabelleninhalt neu auf (siehe
  // _umrechnungstabelleTabelleAktualisieren) statt this._render()
  // aufzurufen, das das offene Popup sofort wieder schließen würde.
  async _umrechnungstabelleEigeneSpeichern() {
    const nameFeld = this.shadowRoot.getElementById("umrechnungstabelle-eigene-name-feld");
    if (!nameFeld) return;
    const name = nameFeld.value.trim();
    const fehlerHinweis = this.shadowRoot.getElementById("umrechnungstabelle-eigene-fehler");
    if (!name) {
      if (fehlerHinweis) fehlerHinweis.style.display = "block";
      return;
    }
    if (fehlerHinweis) fehlerHinweis.style.display = "none";
    const wertParsen = (id) => {
      const feld = this.shadowRoot.getElementById(id);
      const roh = feld ? feld.value.trim() : "";
      if (!roh) return undefined;
      const zahl = parseFloat(roh.replace(",", "."));
      return Number.isFinite(zahl) ? zahl : undefined;
    };
    const bearbeiteId = this._umrechnungstabelleBearbeiteId;
    const eintrag = { id: bearbeiteId || this._zufallsId(), name };
    const cup = wertParsen("umrechnungstabelle-eigene-tasse-feld");
    const tbsp = wertParsen("umrechnungstabelle-eigene-el-feld");
    const tsp = wertParsen("umrechnungstabelle-eigene-tl-feld");
    if (cup !== undefined) eintrag.cup = cup;
    if (tbsp !== undefined) eintrag.tbsp = tbsp;
    if (tsp !== undefined) eintrag.tsp = tsp;
    const erfolg = await this._einstellungenAktualisieren((stand) => {
      const bisherige = stand.eigeneUmrechnungen || [];
      const neueListe = bearbeiteId
        ? bisherige.map((e) => (e.id === bearbeiteId ? eintrag : e))
        : [...bisherige, eintrag];
      return { ...stand, eigeneUmrechnungen: neueListe };
    });
    if (erfolg) {
      this._umrechnungstabelleEigeneFormularZuruecksetzen();
      this._umrechnungstabelleTabelleAktualisieren();
    }
  }

  // Entfernt eine eigene Zutat (per ID, siehe _zufallsId) wieder -
  // konfliktsicher über _einstellungenAktualisieren, ebenfalls ohne
  // this._render(), siehe _umrechnungstabelleEigeneSpeichern.
  async _umrechnungstabelleEigeneLoeschen(id) {
    if (!id) return;
    const erfolg = await this._einstellungenAktualisieren((stand) => ({
      ...stand,
      eigeneUmrechnungen: (stand.eigeneUmrechnungen || []).filter((e) => e.id !== id),
    }));
    if (erfolg) {
      // Falls gerade die bearbeitete Zutat gelöscht wurde, Formular auch
      // wieder in den "Hinzufügen"-Modus zurücksetzen.
      if (this._umrechnungstabelleBearbeiteId === id) this._umrechnungstabelleEigeneFormularZuruecksetzen();
      this._umrechnungstabelleTabelleAktualisieren();
    }
  }

  // Baut nach dem Hinzufügen/Löschen einer eigenen Zutat nur den
  // <tbody>-Inhalt der Umrechnungstabelle neu auf und wendet die aktuell
  // eingegebene Suche erneut an - bewusst kein this._render(), das würde
  // das offene Popup sofort wieder schließen (siehe _umrechnungstabelleFiltern).
  _umrechnungstabelleTabelleAktualisieren() {
    const liste = this.shadowRoot.getElementById("umrechnungstabelle-liste");
    if (!liste) return;
    const tbody = liste.querySelector("tbody");
    if (tbody) tbody.innerHTML = this._umrechnungstabelleZeilenHtml();
    const sucheFeld = this.shadowRoot.getElementById("umrechnungstabelle-suche-feld");
    this._umrechnungstabelleFiltern(sucheFeld ? sucheFeld.value : "");
  }

  // Filtert die Zeilen der Umrechnungstabelle-Modal rein im DOM nach
  // Zutatenname - bewusst OHNE this._render(), weil ein Re-Render das Modal
  // (dessen "offen"-Zustand nur per style.display, nicht über eine eigene
  // Daten-Property gesteuert wird - siehe Vorbild kochbuch-info-modal/
  // statistik-modal) sofort wieder schließen würde.
  _umrechnungstabelleFiltern(suchbegriff) {
    const liste = this.shadowRoot.getElementById("umrechnungstabelle-liste");
    if (!liste) return;
    const begriffNorm = this._normalisieren(suchbegriff);
    const zeilen = Array.from(liste.querySelectorAll("tbody tr"));
    let treffer = 0;
    for (const zeile of zeilen) {
      const passt = !begriffNorm || (zeile.dataset.zutatName || "").includes(begriffNorm);
      zeile.style.display = passt ? "" : "none";
      if (passt) treffer++;
    }
    const keineTrefferHinweis = this.shadowRoot.getElementById("umrechnungstabelle-keine-treffer");
    if (keineTrefferHinweis) keineTrefferHinweis.style.display = treffer === 0 ? "block" : "none";
  }

  _sortiereRezepte(liste) {
    const kopie = [...liste];
    if (this._sortierung === "titel") {
      kopie.sort((a, b) => (a.title || "").localeCompare(b.title || "", "de"));
    } else if (this._sortierung === "bewertung") {
      kopie.sort((a, b) => {
        const bewA = this._durchschnittsBewertung(a.ratings).durchschnitt;
        const bewB = this._durchschnittsBewertung(b.ratings).durchschnitt;
        if (bewB !== bewA) return bewB - bewA;
        return (a.title || "").localeCompare(b.title || "", "de");
      });
    } else if (this._sortierung === "kategorie") {
      kopie.sort((a, b) => {
        const kA = a.category || "Sonstiges";
        const kB = b.category || "Sonstiges";
        const vgl = kA.localeCompare(kB, "de");
        if (vgl !== 0) return vgl;
        return (a.title || "").localeCompare(b.title || "", "de");
      });
    } else if (this._sortierung === "neu") {
      kopie.sort((a, b) => (b.created || "").localeCompare(a.created || ""));
    }
    return kopie;
  }

  // Sortiert eine Rezeptliste nach Kategorie (NICHT nach Tag) - unabhängig
  // von der in der Übersicht aktuell eingestellten Sortierung. Wird für das
  // Sammel-PDF verwendet (siehe _sammelPdfErstellen), damit die Reihenfolge
  // im PDF (und im optionalen Inhaltsverzeichnis) immer nach Kategorie
  // gruppiert ist, gleich wie die Rezepte zuvor in der Übersicht sortiert
  // oder gefiltert waren.
  _sortiereNachKategorie(liste) {
    const kopie = [...liste];
    kopie.sort((a, b) => {
      const kA = a.category || "Sonstiges";
      const kB = b.category || "Sonstiges";
      const vgl = kA.localeCompare(kB, "de");
      if (vgl !== 0) return vgl;
      return (a.title || "").localeCompare(b.title || "", "de");
    });
    return kopie;
  }

  // Alle im aktuellen Rezeptbestand vorkommenden Tags, alphabetisch sortiert -
  // Grundlage für die Tag-Filterzeile in der Listenansicht.
  _alleTags() {
    const menge = new Set();
    this._rezepte.forEach((r) => (r.tags || []).forEach((t) => { if (t) menge.add(t); }));
    return Array.from(menge).sort((a, b) => a.localeCompare(b, "de"));
  }

  // Wie _alleTags(), aber ohne Einträge, die eigentlich ein Kategorie-Name
  // sind (fest eingebaut oder selbst angelegt, jeweils Schlüssel UND
  // übersetztes Anzeige-Label) - z.B. weil ein Rezept per JSON-Import
  // versehentlich die Kategorie zusätzlich als Tag übernommen hat. Nur für
  // die Tag-Vorschlagsliste im Formular gedacht: dort sollen ausschließlich
  // echte Tags vorgeschlagen werden, keine Kategorien (die hat man ja schon
  // über das Kategorie-Dropdown).
  _alleTagsOhneKategorien() {
    const kategorienNormalisiert = new Set(
      this._alleKategorien().flatMap((k) => [this._normalisieren(k), this._normalisieren(this._kategorieLabel(k))])
    );
    return this._alleTags().filter((t) => !kategorienNormalisiert.has(this._normalisieren(t)));
  }

  _gefilterteRezepte() {
    let liste = this._rezepte;

    if (this._aktiveKategorie && this._aktiveKategorie !== "Alle") {
      liste = liste.filter((r) => (r.category || "Sonstiges") === this._aktiveKategorie);
    }

    if (this._aktiveTags && this._aktiveTags.size > 0) {
      // AND-Verknüpfung: ein Rezept muss ALLE aktiven Tags tragen, nicht nur
      // irgendeinen - so lässt sich gezielt eingrenzen ("vegetarisch" UND
      // "schnell"), statt die Ergebnismenge bei mehreren aktiven Tags nur
      // aufzuweiten.
      const aktiveTagsNorm = Array.from(this._aktiveTags).map((t) => this._normalisieren(t));
      liste = liste.filter((r) => {
        const tagsNorm = (r.tags || []).map((t) => this._normalisieren(t));
        return aktiveTagsNorm.every((tag) => tagsNorm.includes(tag));
      });
    }

    const begriffe = this._suchbegriff
      .split(/[,\s]+/)
      .map((b) => this._normalisieren(b.trim()))
      .filter((b) => b.length > 0);

    if (begriffe.length === 0) return liste;

    return liste.filter((r) => {
      const titelNorm = this._normalisieren(r.title);
      const zutatenNorm = (r.ingredients || []).map((z) => this._normalisieren(z.name));
      return begriffe.some((begriff) => {
        if (titelNorm.includes(begriff)) return true;
        return zutatenNorm.some((z) => z.includes(begriff));
      });
    });
  }

  // Speichert eine Farbänderung und rendert neu. Die Scrollposition des
  // Einstellungen-Modals bleibt erhalten (der Neuaufbau würde sonst ganz nach
  // oben springen, obwohl die Farbfelder am Ende des Modals liegen).
  async _farbenAendern(aenderungFn) {
    const box = this.shadowRoot.querySelector("#statistik-einstellungen-modal .modal-box");
    const scrollTop = box ? box.scrollTop : 0;
    await this._einstellungenAktualisieren((stand) => ({ ...stand, farben: aenderungFn(stand.farben || {}) }));
    this._render();
    const neueBox = this.shadowRoot.querySelector("#statistik-einstellungen-modal .modal-box");
    if (neueBox) neueBox.scrollTop = scrollTop;
  }

  // CSS-Überschreibungen für die vom Nutzer geänderten Farben (leer, solange
  // nichts geändert wurde). Steht im Stil NACH dem :host-Standardblock und
  // gewinnt dadurch. Schriftfarbe auf Akzent-/Lösch-Flächen wird automatisch
  // hell oder dunkel gewählt, damit die Beschriftung lesbar bleibt.
  _farbenCss() {
    const f = (this._einstellungen && this._einstellungen.farben) || {};
    const regeln = [];
    if (hexFarbeGueltig(f.akzent)) {
      const [r, g, b] = hexZuRgb(f.akzent);
      regeln.push(
        `--kb-terrakotta: ${f.akzent}`,
        `--kb-terrakotta-hell: rgba(${r}, ${g}, ${b}, 0.12)`,
        `--kb-terrakotta-hell2: rgba(${r}, ${g}, ${b}, 0.06)`,
        `--kb-akzent-schatten: rgba(${r}, ${g}, ${b}, 0.35)`,
        `--kb-auf-akzent: ${schriftfarbeAuf(f.akzent)}`
      );
    }
    if (hexFarbeGueltig(f.akzentText)) regeln.push(`--kb-terrakotta-dunkel: ${f.akzentText}`);
    if (hexFarbeGueltig(f.loeschen)) {
      regeln.push(`--kb-loeschen: ${f.loeschen}`, `--kb-auf-loeschen: ${schriftfarbeAuf(f.loeschen)}`);
    }
    if (hexFarbeGueltig(f.sterne)) regeln.push(`--kb-sterne: ${f.sterne}`);
    if (hexFarbeGueltig(f.titel)) regeln.push(`--kb-titel: ${f.titel}`);
    return regeln.length ? `:host { ${regeln.join("; ")}; }` : "";
  }

  _render() {
    this._renderRumpf();
    this._hinweisEinblenden();
  }

  _renderRumpf() {
    if (!this.shadowRoot) return;
    const stil = `
      <style>
        :host {
          display: block;
          /* Barrierefreiheit/Kontrast: #c1652f (die ursprüngliche Farbe) kam auf
             weißem Grund nur auf einen Kontrast von 4.06:1 - WCAG AA verlangt für
             normal großen Text mindestens 4.5:1, betroffen wären u.a. die weiße
             Beschriftung der "primaer"-Knöpfe und der terrakottafarbene Text/Rand
             der "sekundaer"-Knöpfe. Dieser leicht dunklere Ton erreicht 4.67:1
             (in beide Richtungen, da der Kontrastwert symmetrisch ist) und besteht
             damit AA, bei kaum wahrnehmbarem optischem Unterschied. */
          --kb-terrakotta: #b25d2b;
          --kb-terrakotta-dunkel: #96481f;
          --kb-terrakotta-hell: rgba(178, 93, 43, 0.12);
          --kb-terrakotta-hell2: rgba(178, 93, 43, 0.06);
          --kb-auf-akzent: #fff;
          --kb-loeschen: #a8402a;
          --kb-auf-loeschen: #fff;
          --kb-sterne: #d9a441;
          --kb-titel: var(--primary-text-color);
          --kb-akzent-schatten: rgba(193,101,47,0.35);
          --kb-schrift-titel: Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif;
        }
        ${this._farbenCss()}
        ha-card { padding: 18px; }
        /* Detail-/Formular-Ansicht: bei sehr breiten Containern (z.B. Panel-Ansicht
           auf einem großen Monitor) nicht auf volle Breite strecken - lange
           Textzeilen/Formularfelder werden sonst schlecht lesbar. Die Kachel-
           Übersicht (.grid) ist davon bewusst ausgenommen, die soll die Breite nutzen. */
        .eng, .formular { max-width: 700px; margin: 0 auto; }
        .kopf { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:8px; flex-wrap:wrap; }
        .kopf h2 {
          margin:0; font-size:1.5em; font-family: var(--kb-schrift-titel); font-weight:700;
          color: var(--kb-titel);
        }
        .such-feld {
          width:100%; box-sizing:border-box; padding:11px 16px; margin-bottom:16px;
          border-radius:999px; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--primary-text-color);
          font-size:0.95em; outline:none;
        }
        .such-feld:focus { border-color: var(--kb-terrakotta); }
        /* Barrierefreiheit: der Standard-Fokusring des Browsers wurde oben mit
           outline:none entfernt (er passte optisch nicht zur runden Form) - ohne
           Ersatz wäre für Tastatur-Nutzer:innen dann NICHT mehr erkennbar, welches
           Element gerade den Fokus hat. :focus-visible (statt :focus) sorgt dafür,
           dass der Ring nur bei Tastatur-Navigation erscheint, nicht bei jedem
           Maus-Klick - so bleibt es für Maus-Nutzer:innen optisch unverändert. */
        .such-feld:focus-visible, button:focus-visible, select:focus-visible,
        input:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
          outline: 2.5px solid var(--kb-terrakotta-dunkel); outline-offset: 2px;
        }
        /* Auf schmalen Bildschirmen (Companion-App) reicht die Breite oft nicht
           für alle vier Knöpfe in einer Zeile. Ohne flex-wrap hier würde der
           Flexbox-Container die Knöpfe stattdessen einzeln zusammendrücken -
           der Button-Text bricht dann intern um ("+" / "Neu" auf zwei Zeilen),
           wodurch die runde Pillenform (border-radius:999px) zu einer
           verzerrten Ei-Form gestreckt wird. Mit flex-wrap auf dem Container
           UND white-space:nowrap auf den Knöpfen selbst (siehe unten) brechen
           stattdessen ganze Knöpfe in die nächste Zeile um, jeder Knopf bleibt
           dabei unverzerrt in seiner vorgesehenen Form. */
        .kopf-aktionen { display:flex; gap:8px; align-items:center; flex-wrap:wrap; width:100%; }
        @media (max-width: 480px) {
          .kopf-aktionen { justify-content:flex-start; }
          /* Das runde ⚙️-Symbol (.info-btn) bewusst ausnehmen - sonst zieht
             diese Regel es auf schmalen Bildschirmen zu einer breiten,
             ovalen Pille statt eines kleinen runden Knopfs. */
          .kopf-aktionen button:not(.info-btn) { flex:1 1 auto; }
        }
        .undo-banner {
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          background: var(--kb-terrakotta-hell); border-radius:10px; padding:10px 14px;
          margin-bottom:14px; font-size:0.9em; color: var(--kb-terrakotta-dunkel);
        }
        button.primaer {
          background: var(--kb-terrakotta); color: var(--kb-auf-akzent);
          border:none; border-radius:999px; padding:9px 18px; cursor:pointer; font-size:0.9em; font-weight:600;
          box-shadow: 0 2px 6px var(--kb-akzent-schatten); white-space:nowrap;
        }
        button.sekundaer {
          background: transparent; color: var(--kb-terrakotta); border:1.5px solid var(--kb-terrakotta);
          border-radius:999px; padding:8px 16px; cursor:pointer; font-size:0.9em; font-weight:600; white-space:nowrap;
        }
        button.klein { padding:5px 12px; font-size:0.8em; }
        button.gefahr {
          background: var(--kb-loeschen); color: var(--kb-auf-loeschen); border:none; border-radius:999px; padding:8px 16px; cursor:pointer; font-weight:600; white-space:nowrap;
        }
        .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(160px,240px)); gap:16px; justify-content: start; }
        .kachel {
          cursor:pointer; border-radius:18px; overflow:hidden; background: var(--card-background-color);
          box-shadow: 0 2px 10px rgba(0,0,0,0.10); transition: transform .18s, box-shadow .18s;
        }
        .kachel:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.16); }
        .kachel-bildbox { position:relative; width:100%; aspect-ratio: 4 / 3; overflow:hidden; background: var(--kb-terrakotta-hell2); }
        .kachel-bild { width:100%; height:100%; object-fit:cover; display:block; }
        .kachel .icon { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:2.4em; }
        .kachel .textbereich { padding:10px 12px 12px; }
        .kachel .titel {
          font-family: var(--kb-schrift-titel); font-size:1.05em; font-weight:700; line-height:1.25;
          color: var(--primary-text-color); margin-bottom:6px;
        }
        .kachel .info {
          display:inline-flex; align-items:center; gap:4px; font-size:0.72em; font-weight:600;
          color: var(--kb-terrakotta-dunkel); background: var(--kb-terrakotta-hell);
          border-radius:999px; padding:3px 9px;
        }
        .leer { text-align:center; color: var(--secondary-text-color); padding: 32px 0; font-size:0.95em; }
        .seiten-navigation { display:flex; justify-content:center; align-items:center; gap:14px; margin:20px 0; }
        .seiten-anzeige { color: var(--secondary-text-color); font-size:0.9em; }
        /* Dezenter Versions-Vermerk unten links auf der Rezeptübersicht -
           rein informativ (z.B. beim Melden eines Fehlers hilfreich), soll
           optisch nicht auffallen. */
        .versions-hinweis {
          text-align:left; margin-top:18px; font-size:0.7em; color: var(--secondary-text-color);
          opacity:0.55; user-select:none;
        }
        .update-banner {
          display:flex; align-items:center; gap:10px; flex-wrap:wrap;
          background: var(--kb-terrakotta-hell); border-radius:10px; padding:10px 14px; margin-bottom:16px;
          font-size:0.92em;
        }
        .update-banner .update-ansehen-link {
          color: var(--kb-terrakotta-dunkel); font-weight:600; text-decoration:none; white-space:nowrap;
        }
        .update-banner .update-ansehen-link:hover { text-decoration:underline; }
        .update-schliessen-btn {
          margin-left:auto; background:none; border:none; cursor:pointer; font-size:1em;
          color: var(--secondary-text-color); line-height:1; padding:2px 4px;
        }
        .fehler { text-align:center; color: var(--kb-loeschen); padding: 24px 0; font-size:0.9em; }

        /* max-height als Anteil der sichtbaren Bildschirm-HÖHE (nicht nur
           Breite): das Bild skaliert über aspect-ratio sonst rein mit der
           Container-Breite - auf einem Handy im Querformat (breit, aber
           wenig Bildschirmhöhe!) oder einem breiten PC-Monitor füllte es
           dadurch fast den ganzen sichtbaren Bereich, bevor man überhaupt
           zu Zutaten/Zubereitung scrollt. Ein Hochformat-Handy hat dagegen
           ohnehin genug Höhe, dort greift die Grenze praktisch nie.
           object-fit:cover (siehe .detail-bild) schneidet dafür etwas mehr
           vom Bildrand ab, statt das Bild zu stauchen. */
        .detail-bildbox { width:100%; aspect-ratio: 16 / 9; max-height: 42vh; border-radius:16px; overflow:hidden;
          box-shadow: 0 3px 14px rgba(0,0,0,0.14); margin-bottom:14px; }
        .detail-bild { width:100%; height:100%; object-fit:cover; display:block; }
        .foto-streifen { display:flex; gap:8px; flex-wrap:wrap; margin:-4px 0 14px; }
        .foto-streifen-btn { width:64px; height:64px; padding:0; border:2px solid transparent; border-radius:10px; overflow:hidden;
          cursor:pointer; background:var(--kb-terrakotta-hell2); opacity:0.85; }
        .foto-streifen-btn.aktiv { border-color:var(--kb-terrakotta); opacity:1; }
        .foto-streifen-btn img { width:100%; height:100%; object-fit:cover; display:block; }
        .fotos-liste { display:flex; gap:10px; flex-wrap:wrap; margin:6px 0 8px; }
        .foto-item { position:relative; width:96px; }
        .foto-item img { width:96px; height:96px; object-fit:cover; border-radius:10px; display:block; border:2px solid transparent; }
        .foto-item.titelbild img { border-color:var(--kb-terrakotta); }
        .foto-item-knoepfe { display:flex; gap:4px; margin-top:4px; }
        .foto-item-knoepfe button { flex:1; padding:3px 0; font-size:0.8em; border-radius:8px; border:1px solid var(--kb-terrakotta-hell);
          background:var(--card-background-color); color:var(--kb-terrakotta-dunkel); cursor:pointer; }
        .foto-badge { position:absolute; top:4px; left:4px; background:var(--kb-terrakotta); color:var(--kb-auf-akzent);
          font-size:0.7em; padding:1px 6px; border-radius:8px; }
        /* Standardmäßig (schmaler Bildschirm) eine einzige Spalte, genau wie
           bisher - Bild/Zutaten/Zubereitung stehen einfach untereinander.
           Auf ausreichend breiten Bildschirmen wird daraus eine Zwei-
           Spalten-Ansicht, siehe Media Query unten - dafür wird auch der
           sonst bewusst schmal gehaltene Container (.eng, siehe oben) für
           die Detailansicht etwas breiter. Die Grenze liegt bewusst bei
           700px statt z.B. 860px: normale Handys im HOCHFORMAT bleiben
           damit sicher einspaltig (deren Breite liegt so gut wie immer
           deutlich darunter), aber ein Handy im QUERFORMAT (typischerweise
           650-930px breit) profitiert schon OHNE eigens aktivierte
           "Desktopwebseite" von der Zwei-Spalten-Ansicht - genau dort war
           zuvor am wenigsten Bildschirmhöhe übrig (siehe .detail-bildbox
           weiter oben), die Zwei-Spalten-Ansicht federt das zusätzlich ab. */
        .detail-zwei-spalten { display:grid; grid-template-columns: 1fr; }
        .detail-spalte-links { margin-bottom: 8px; }
        @media (min-width: 700px) {
          .detail-breit { max-width: 1100px; }
          .detail-zwei-spalten { grid-template-columns: 1fr 1fr; gap: 0 40px; align-items: start; }
          .detail-spalte-links { margin-bottom: 0; }
        }
        .detail-titel {
          font-family: var(--kb-schrift-titel); font-size:1.7em; font-weight:700; margin:0 0 4px;
          color: var(--kb-titel);
        }
        .detail-trenner {
          border:none; height:2px; width:56px; background: var(--kb-terrakotta); border-radius:2px; margin:6px 0 14px;
        }
        /* In Modals als Abschnittstrenner verwendet (z. B. Einstellungen-Modal) -
           dort soll die Linie über die gesamte Breite des Fensters laufen statt
           wie unter dem Rezepttitel nur ein kurzer dekorativer Strich zu sein. */
        .detail-trenner.trenner-voll { width:100%; }

        .portionen-zeile {
          display:flex; align-items:center; gap:14px; margin:14px 0 18px;
          background: var(--kb-terrakotta-hell2); border-radius:999px; padding:8px 16px; width:fit-content;
        }
        .portionen-zeile button {
          width:32px; height:32px; border-radius:50%; border:none;
          background: var(--kb-terrakotta); color: var(--kb-auf-akzent); font-size:1.1em; cursor:pointer; line-height:1;
        }
        .portionen-zeile span { font-size:0.95em; color: var(--primary-text-color); }

        .abschnitt-titel {
          font-family: var(--kb-schrift-titel); margin:22px 0 10px; font-size:1.15em; font-weight:700;
          color: var(--primary-text-color);
        }

        ul.zutaten-liste { list-style:none; padding:0; margin:0 0 8px; }
        ul.zutaten-liste li {
          display:flex; align-items:center; gap:10px; padding:8px 4px;
          border-bottom:1px dashed var(--kb-terrakotta-hell); font-size:0.95em;
        }
        ul.zutaten-liste li:last-child { border-bottom:none; }
        .zutat-fehlt-label { display:flex; align-items:center; gap:10px; width:100%; cursor:pointer; }
        .zutat-fehlt-checkbox { flex:0 0 auto; }
        .zutat-menge-chip {
          flex:0 0 auto; background: var(--kb-terrakotta-hell); color: var(--kb-terrakotta-dunkel);
          font-weight:700; font-size:0.85em; border-radius:999px; padding:3px 11px; white-space:nowrap;
        }
        .zutat-name { color: var(--primary-text-color); }

        ol.schritte-liste { list-style:none; padding:0; margin:0; counter-reset: schritt; }
        ol.schritte-liste li {
          counter-increment: schritt; position:relative; padding:2px 0 18px 40px; line-height:1.5;
          border-left:2px dashed var(--kb-terrakotta-hell); margin-left:15px;
        }
        ol.schritte-liste li:last-child { border-left-color: transparent; padding-bottom:2px; }
        ol.schritte-liste li::before {
          content: counter(schritt); position:absolute; left:-16px; top:-2px;
          width:30px; height:30px; border-radius:50%; background: var(--kb-terrakotta); color: var(--kb-auf-akzent);
          font-weight:700; font-size:0.85em; display:flex; align-items:center; justify-content:center;
        }

        .aktionen { display:flex; gap:10px; margin-top:20px; flex-wrap:wrap; }
        .formular label { display:block; margin:10px 0 4px; font-size:0.85em; color: var(--secondary-text-color); }
        .formular input[type=text], .formular input[type=number] {
          width:100%; box-sizing:border-box; padding:9px 12px; border-radius:10px; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--primary-text-color);
        }
        .formular input[type=text]:focus, .formular input[type=number]:focus { outline:none; border-color: var(--kb-terrakotta); }
        /* Diese spezifischere Regel siegt gegenüber dem allgemeinen ":focus-visible"
           oben UND gegenüber "outline:none" direkt darüber (gleiche Spezifität,
           aber später in der Reihenfolge) - stellt den Tastatur-Fokusring also
           auch für Formularfelder wieder her. */
        .formular input[type=text]:focus-visible, .formular input[type=number]:focus-visible {
          outline: 2.5px solid var(--kb-terrakotta-dunkel); outline-offset: 2px;
        }
        .zutat-zeile { display:flex; gap:6px; margin-bottom:6px; }
        .zutat-zeile input { flex:1; }
        .zutat-zeile input.menge-feld { flex: 0 0 70px; }
        .zutat-zeile input.einheit-feld { flex: 0 0 70px; }
        .zutat-zeile button, .schritt-zeile button {
          flex:0 0 32px; border:none; border-radius:8px; background: var(--kb-loeschen); color: var(--kb-auf-loeschen); cursor:pointer;
        }
        .schritt-zeile button.schritt-verschieben {
          background: var(--kb-terrakotta-hell); color: var(--kb-terrakotta-dunkel); flex:0 0 28px;
        }
        .schritt-zeile button.schritt-verschieben:disabled { opacity:0.35; cursor:default; }
        .schritt-zeile { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
        .schritt-zeile .schritt-nummer {
          flex:0 0 24px; height:24px; border-radius:50%; background: var(--kb-terrakotta); color: var(--kb-auf-akzent);
          font-size:0.8em; font-weight:700; display:flex; align-items:center; justify-content:center;
        }
        .schritt-zeile input { flex:1; }
        .hinweis { font-size:0.8em; color: var(--secondary-text-color); margin-top:4px; }
        .json-textfeld {
          width:100%; box-sizing:border-box; min-height:120px; padding:9px 12px; border-radius:10px;
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color);
          color: var(--primary-text-color); font-family:monospace; font-size:0.8em;
        }

        .sterne { display:inline-flex; gap:2px; }
        .sterne-klein { font-size:0.7em; }
        .stern-voll { color: var(--kb-sterne); }
        .stern-leer { color: var(--divider-color); }
        /* Jetzt <button>- statt <span>-Elemente (Barrierefreiheit: Tastatur-
           bedienbar, siehe _sterneInteraktivHtml) - Browser-Standardstil für
           Buttons (Rahmen, Hintergrund, Innenabstand, Schriftart) zurücksetzen,
           damit sie optisch wie zuvor als reine Sterne-Zeichen erscheinen. */
        .sterne-interaktiv .stern-voll, .sterne-interaktiv .stern-leer {
          cursor:pointer; font-size:1.4em; border:none; background:transparent;
          padding:2px; font-family:inherit; line-height:1;
        }
        .bewertung-zeile { display:flex; align-items:center; gap:10px; margin:6px 0; flex-wrap:wrap; font-size:0.92em; color: var(--primary-text-color); }
        .ersteller-zeile { font-size:0.82em; color: var(--secondary-text-color); margin-bottom:6px; }
        .bearbeiten-hinweis { font-size:0.85em; color: var(--secondary-text-color); margin-top:18px; font-style:italic; }

        ul.kommentar-liste { list-style:none; padding:0; margin:0 0 14px; }
        ul.kommentar-liste li { padding:10px 0; border-bottom:1px dashed var(--kb-terrakotta-hell); }
        ul.kommentar-liste li:last-child { border-bottom:none; }
        .kommentar-autor { font-weight:700; font-size:0.85em; color: var(--kb-terrakotta-dunkel); }
        .kommentar-zeit { font-size:0.72em; color: var(--secondary-text-color); margin-left:8px; }
        .kommentar-text { margin-top:3px; font-size:0.92em; line-height:1.4; color: var(--primary-text-color); }
        .kommentar-formular textarea, .kommentar-bearbeiten-feld {
          width:100%; box-sizing:border-box; min-height:70px; padding:9px 12px; border-radius:10px;
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color);
          color: var(--primary-text-color); font-size:0.9em; margin-bottom:8px;
        }
        .kommentar-bearbeiten-feld { margin-top:3px; }
        .kommentar-aktionen { display:flex; gap:8px; margin-top:4px; }

        .sortier-zeile { display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:0.85em; color: var(--secondary-text-color); }
        .sortier-zeile select {
          padding:6px 10px; border-radius:999px; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--primary-text-color); font-size:0.9em;
        }

        .kategorie-filter, .tag-filter { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
        /* Kategorie- und Tag-Chips sehen (bewusst, siehe .chip) fast
           gleich aus - ohne optische Trennung wirken beide Zeilen wie EINE
           durchgehende Chip-Wolke, vor allem wenn die Kategorie-Zeile
           umbricht. Eine dünne Trennlinie oberhalb der Tag-Zeile grenzt
           beide klar voneinander ab (gleiches Motiv wie .detail-trenner,
           nur dezenter/breiter statt als kurzer Akzent-Strich). */
        .tag-filter { border-top:1.5px dashed var(--kb-terrakotta-hell); padding-top:14px; }
        .chip {
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color);
          color: var(--kb-terrakotta-dunkel); border-radius:999px; padding:5px 13px; font-size:0.8em;
          cursor:pointer; font-weight:600;
        }
        .chip-aktiv { background: var(--kb-terrakotta); color: var(--kb-auf-akzent); border-color: var(--kb-terrakotta); }
        /* "+ Neue Kategorie" soll zwischen den Kategorie-Chips nicht
           untergehen (gemeldet: zu unauffällig) - gestrichelter statt
           durchgezogener Rand als dezentes, aber klares "Aktion statt
           Filter"-Signal, ohne so laut wie chip-aktiv zu wirken. */
        .chip-neu { border-style:dashed; border-width:2px; font-weight:700; }
        .kategorie-eigen-chip { display:inline-flex; align-items:center; gap:2px; padding-right:6px; }
        .kategorie-loeschen, .kategorie-bearbeiten {
          border:none; background:transparent; color:inherit; cursor:pointer; font-size:0.9em;
          padding:0 2px; opacity:0.75; line-height:1;
        }
        .kategorie-loeschen:hover, .kategorie-bearbeiten:hover { opacity:1; }
        #kategorie-speichern-bereich input { width:100%; box-sizing:border-box; padding:8px 12px; border-radius:10px;
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color); color: var(--primary-text-color); }
        .schalter-zeile { display:flex; align-items:center; justify-content:space-between; gap:14px; text-align:left; margin-bottom:8px; }
        .feld-zeile { display:flex; flex-direction:column; gap:6px; text-align:left; margin-bottom:8px; }
        .feld-zeile label { color: var(--secondary-text-color); font-size:0.92em; }
        .feld-zeile select { width:100%; box-sizing:border-box; }
        .schalter-label { font-weight:600; }
        /* Der Schalter sieht bewusst wie die übrigen Knöpfe der Karte aus
           (gleiche Pillenform/Farbe wie button.primaer/button.sekundaer),
           statt wie ein systemtypischer iOS-Slider - "Aus" wie ein
           sekundaer-Knopf (nur Umriss), "An" wie ein primaer-Knopf
           (gefüllt terrakotta). */
        .schalter-btn {
          display:inline-flex; align-items:center; justify-content:center; gap:6px;
          border-radius:999px; padding:8px 18px; cursor:pointer; font-size:0.9em; font-weight:600;
          white-space:nowrap; user-select:none; flex-shrink:0;
          background: transparent; color: var(--kb-terrakotta); border:1.5px solid var(--kb-terrakotta);
        }
        .schalter-btn input { position:absolute; opacity:0; width:0; height:0; }
        .schalter-btn.schalter-btn-aktiv {
          background: var(--kb-terrakotta); color: var(--kb-auf-akzent); border-color: var(--kb-terrakotta);
          box-shadow: 0 2px 6px var(--kb-akzent-schatten);
        }
        .schalter-btn:focus-within { outline:2px solid var(--kb-terrakotta-dunkel); outline-offset:2px; }
        .kochbuecher-zeile { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:16px; }
        .kochbuch-chip { cursor:pointer; }
        .kochbuch-loeschen {
          border:none; background:transparent; color: var(--kb-loeschen); cursor:pointer; font-size:0.85em;
          margin-right:4px; padding:0 2px;
        }
        #kochbuch-speichern-bereich input { width:100%; box-sizing:border-box; padding:8px 12px; border-radius:10px;
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color); color: var(--primary-text-color); }
        #sammel-pdf-name-box input { width:100%; box-sizing:border-box; padding:8px 12px; border-radius:10px;
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color); color: var(--primary-text-color);
          margin-bottom:14px; font-size:1em; }
        #sammel-pdf-wahl-box .modal-aktionen { flex-direction:column; }
        .sammel-pdf-auswahl-links { display:flex; justify-content:flex-end; gap:14px; margin-bottom:8px; font-size:0.85em; }
        .sammel-pdf-auswahl-links a { color: var(--kb-terrakotta); cursor:pointer; text-decoration:underline; }
        .sammel-pdf-auswahl-liste { text-align:left; max-height:38vh; overflow-y:auto; border:1px solid var(--kb-terrakotta-hell);
          border-radius:10px; padding:6px 12px; margin-bottom:8px; }
        .sammel-pdf-auswahl-zeile { display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer; }
        .sammel-pdf-auswahl-zeile input { flex-shrink:0; }
        .sammel-pdf-auswahl-zeile span { color: var(--primary-text-color); }
        .sammel-pdf-bilder-checkbox { display:flex; align-items:center; gap:8px; justify-content:center;
          margin-top:12px; cursor:pointer; }
        .sammel-pdf-bilder-checkbox input { flex-shrink:0; }
        .sammel-pdf-bilder-checkbox span { color: var(--primary-text-color); }
        .tags-liste { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
        .tag-chip {
          display:inline-flex; align-items:center; gap:4px; background: var(--kb-terrakotta-hell);
          color: var(--kb-terrakotta-dunkel); border-radius:999px; padding:4px 6px 4px 12px; font-size:0.85em; font-weight:600;
        }
        .tag-chip button { border:none; background:transparent; color: var(--kb-terrakotta-dunkel); cursor:pointer; font-size:0.95em; padding:2px 6px; }
        .tag-eingabe-zeile { display:flex; gap:6px; margin-bottom:10px; }
        .tag-eingabe-zeile input { flex:1; }
        .einkaufs-aktionsleiste {
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          background: var(--kb-terrakotta-hell2); border-radius:10px; padding:10px 14px; margin-bottom:14px; font-size:0.9em;
        }
        .kachel-checkbox {
          position:absolute; top:8px; right:8px; width:26px; height:26px; border-radius:50%;
          background: rgba(255,255,255,0.92); border:2px solid var(--kb-terrakotta); display:flex;
          align-items:center; justify-content:center; font-weight:700; color: var(--kb-terrakotta); font-size:0.9em;
        }
        .kachel-checkbox.checkbox-aktiv { background: var(--kb-terrakotta); color: var(--kb-auf-akzent); }
        .wochentag-zeile { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px dashed var(--kb-terrakotta-hell); flex-wrap:wrap; }
        .wochentag-zeile:last-child { border-bottom:none; }
        .wochentag-label { flex:0 0 90px; font-weight:700; color: var(--primary-text-color); }
        .wochentag-auswahl {
          flex:1; min-width:140px; padding:8px 10px; border-radius:10px; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--primary-text-color); font-size:0.9em;
        }
        .kategorie-badge {
          display:inline-block; background: var(--kb-terrakotta-hell); color: var(--kb-terrakotta-dunkel);
          font-size:0.78em; font-weight:600; border-radius:999px; padding:4px 12px; margin-bottom:8px;
        }
        .info-kategorie { background: transparent; color: var(--secondary-text-color); padding:3px 0; }
        .formular select {
          width:100%; box-sizing:border-box; padding:9px 12px; border-radius:10px; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--primary-text-color); font-size:0.95em;
        }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display:flex; align-items:center; justify-content:center; z-index: 1100; padding:20px;
        }
        .modal-box {
          background: var(--card-background-color); border-radius:16px; padding:24px;
          max-width:340px; width:100%; text-align:center; box-shadow:0 8px 30px rgba(0,0,0,0.35);
        }
        .modal-box p { margin:0 0 18px; font-size:1.05em; color: var(--primary-text-color); }
        .modal-aktionen { display:flex; gap:10px; justify-content:center; }

        /* Kochmodus: Vollbild-Schritt-für-Schritt-Ansicht (siehe
           _renderDetail/_kochmodus*) - deckt die ganze Karte ab, damit
           während des Kochens nichts anderes versehentlich antippbar ist.
           Wichtig: z-index MUSS kleiner bleiben als .modal-overlay (oben),
           sonst öffnet sich z.B. die Umrechnungstabelle aus dem Kochmodus
           heraus zwar technisch (display:flex), landet aber unsichtbar
           HINTER diesem Overlay. */
        .kochmodus-overlay {
          position: fixed; inset: 0; background: var(--card-background-color);
          z-index: 1050; display:flex; flex-direction:column; box-sizing:border-box;
          padding:16px 20px; overflow:hidden;
        }
        .kochmodus-kopf { display:flex; align-items:center; gap:10px; }
        .kochmodus-titel {
          flex:1; margin:0; font-size:1.05em; font-weight:700; color: var(--primary-text-color);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .kochmodus-schliessen-btn {
          background:transparent; border:none; font-size:1.6em; line-height:1;
          color: var(--primary-text-color); cursor:pointer; padding:2px 8px; border-radius:8px;
        }
        .kochmodus-schliessen-btn:focus-visible { outline:2px solid var(--kb-terrakotta); outline-offset:2px; }
        .kochmodus-werkzeuge { display:flex; gap:8px; margin:10px 0; flex-wrap:wrap; }
        .kochmodus-werkzeuge button.aktiv { background: var(--kb-terrakotta); color: var(--kb-auf-akzent); }
        .kochmodus-zutaten-panel {
          background: var(--kb-terrakotta-hell); border-radius:12px; padding:12px 16px;
          margin-bottom:10px; max-height:32vh; overflow-y:auto; flex-shrink:0;
        }
        .kochmodus-zutaten-panel h4 { margin:0 0 6px; color: var(--kb-terrakotta-dunkel); }
        .kochmodus-zutaten-panel ul { margin:0; padding-left:20px; }
        .kochmodus-timer-badge { font-variant-numeric: tabular-nums; }
        .kochmodus-timer-panel {
          background: var(--kb-terrakotta-hell); border-radius:12px; padding:12px 16px;
          margin-bottom:10px; flex-shrink:0; display:flex; flex-direction:column; gap:10px;
        }
        .kochmodus-timer-presets { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .kochmodus-timer-presets button { padding:6px 12px; }
        .kochmodus-timer-eigene { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .kochmodus-timer-eigene input[type="number"] {
          width:64px; padding:6px 8px; border-radius:8px; border:1px solid var(--divider-color, #ccc);
          font-size:1em; background: var(--card-background-color, #fff); color: var(--primary-text-color);
        }
        .kochmodus-timer-laufend {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
        }
        .kochmodus-timer-rest {
          font-size:2em; font-weight:600; color: var(--kb-terrakotta-dunkel); font-variant-numeric: tabular-nums;
        }
        .kochmodus-timer-abgelaufen {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          font-size:1.15em; font-weight:600; color: var(--kb-terrakotta-dunkel);
          animation: kochmodus-timer-blinken 1s ease-in-out infinite;
        }
        @keyframes kochmodus-timer-blinken { 0%, 100% { opacity:1; } 50% { opacity:0.55; } }
        .kochmodus-body {
          flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          text-align:center; overflow-y:auto; padding:10px 4px; min-height:0;
        }
        .kochmodus-schritt-anzeige { color: var(--secondary-text-color); font-size:0.9em; margin-bottom:10px; }
        .kochmodus-schritt-text { font-size:1.4em; line-height:1.45; color: var(--primary-text-color); max-width:640px; }
        .kochmodus-fuss { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:12px; flex-shrink:0; }
        .kochmodus-nav-btn { font-size:1.2em; padding:14px 22px; border-radius:12px; flex:1; max-width:160px; }
        .kochmodus-nav-btn:disabled { opacity:0.35; }
        /* Breitere Variante für die Prompt-Anzeige (Abschnitt "JSON
           einfügen") - der normale .modal-box ist für kurze Ja/Nein-Fragen
           gedacht (340px, zentrierter Text), hier steht aber ein mehrere
           Zeilen langer Prompt-Text, der linksbündig und in einem größeren
           Kasten lesbarer ist. */
        .modal-box-breit { max-width:480px; text-align:left; }
        .modal-box-breit h3 { color: var(--primary-text-color); }
        /* Höhere Variante für die Umrechnungstabelle (~50 Zeilen) - die
           Zutatenliste selbst bekommt eine eigene Scroll-Fläche
           (.umrechnungstabelle-liste), damit Überschrift, Hinweistext,
           Suchfeld und die Schließen-Schaltfläche immer sichtbar bleiben. */
        .modal-box-hoch { display:flex; flex-direction:column; max-height:85vh; }
        /* Für Modals, deren Inhalt insgesamt (statt nur ein einzelner
           Teilbereich wie bei .modal-box-hoch) höher werden kann als der
           Bildschirm - z.B. das Einstellungen-Modal mit mehreren Schaltern.
           Ohne das war der "Schließen"-Knopf am Ende auf kleinen Bildschirmen
           nicht erreichbar, weil der Modal-Inhalt selbst nicht scrollte. */
        .modal-box-scroll { max-height:85vh; overflow-y:auto; }
        #umrechnungstabelle-suche-feld { width:100%; box-sizing:border-box; margin-bottom:10px; }
        .umrechnungstabelle-liste { overflow-y:auto; flex:1 1 auto; min-height:0; border:1px solid var(--divider-color, #ddd); border-radius:8px; }
        .umrechnungstabelle-tabelle { width:100%; border-collapse:collapse; font-size:0.92em; }
        .umrechnungstabelle-tabelle th, .umrechnungstabelle-tabelle td { padding:6px 8px; text-align:left; border-bottom:1px solid var(--divider-color, #eee); }
        .umrechnungstabelle-tabelle th { position:sticky; top:0; background: var(--card-background-color, #fff); color: var(--secondary-text-color); font-weight:600; }
        .umrechnungstabelle-tabelle td:not(:first-child), .umrechnungstabelle-tabelle th:not(:first-child) { text-align:right; white-space:nowrap; }
        .umrechnungstabelle-keine-treffer { text-align:center; color: var(--secondary-text-color); padding:14px 8px; margin:0; }
        .umrechnungstabelle-eigene-loeschen-btn, .umrechnungstabelle-eigene-bearbeiten-btn { background:none; border:none; color: var(--secondary-text-color); cursor:pointer; font-size:0.9em; padding:0 2px; }
        .umrechnungstabelle-eigene-bereich { margin-top:10px; text-align:left; }
        .umrechnungstabelle-eigene-bereich #umrechnungstabelle-eigene-formular { margin-top:10px; padding:10px; border:1px solid var(--divider-color, #ddd); border-radius:8px; }
        .umrechnungstabelle-eigene-bereich input[type="text"], .umrechnungstabelle-eigene-bereich input[type="number"] { width:100%; box-sizing:border-box; margin-bottom:8px; }
        .umrechnungstabelle-eigene-hinweis { font-size:0.88em; color: var(--secondary-text-color); margin-top:0; }
        .umrechnungstabelle-eigene-werte-zeile { display:flex; gap:8px; }
        .umrechnungstabelle-eigene-werte-zeile input { min-width:0; }
        .umrechnungstabelle-eigene-fehler { color: var(--error-color, #c62828); font-size:0.88em; margin:0 0 8px; }
        /* Kleiner runder "?"-Knopf neben "Von KI erzeugtes JSON einfügen" -
           öffnet den fertigen Prompt zum Kopieren (siehe json-info-modal). */
        .info-btn {
          width:26px; height:26px; min-width:26px; border-radius:50%; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--kb-terrakotta-dunkel); cursor:pointer;
          font-size:0.8em; font-weight:700; padding:0; line-height:1; display:flex; align-items:center; justify-content:center;
        }
      </style>
    `;

    if (this._einrichtungNoetig) {
      this._renderEinrichtung(stil);
      return;
    }

    if (this._ladeFehler) {
      this.shadowRoot.innerHTML = `
        ${stil}
        <ha-card>
          <div class="fehler">
            ${this._t("fehler_liste_laden_titel", { entity: this._escape(this._config.entity) })}<br>
            ${this._t("fehler_liste_laden_hinweis")}<br>
            <small>${this._escape(this._ladeFehler)}</small>
          </div>
        </ha-card>
      `;
      return;
    }

    if (this._ansicht === "detail" && this._aktivesRezept) {
      this._renderDetail(stil);
    } else if (this._ansicht === "formular" && this._aktivesRezept) {
      this._renderFormular(stil);
    } else if (this._ansicht === "wochenplan") {
      this._renderWochenplan(stil);
    } else {
      this._renderListe(stil);
    }
  }

  // Beim tatsächlichen Öffnen der Wochenplan-Ansicht (nicht schon bei jedem
  // bloßen Laden der Rezeptliste) wird geprüft, ob eine komplette Woche
  // nachrücken oder einzelne vergangene Tage geleert werden müssen (siehe
  // _wochenplanAktualisieren) - nur bei tatsächlicher Änderung wird
  // zurückgespeichert, damit ein bloßes Ansehen des ohnehin aktuellen Plans
  // keinen unnötigen Schreibvorgang auslöst.
  async _wochenplanAnzeigen() {
    this._scrollPositionSpeichern();
    const { plan, veraendert } = _wochenplanAktualisieren(this._wochenplan || {});
    this._wochenplan = plan;
    if (veraendert) await this._wochenplanSpeichern(plan);
    this._wochenplanAnsicht = "diese";
    this._ansicht = "wochenplan";
    this._historyEintragSicherstellen();
    this._render();
  }

  _renderListe(stil) {
    const titel = this._config.title || this._t("kopf_titel_standard");

    const eigeneKategorienSet = new Set(this._eigeneKategorien || []);
    // Umbenennen/Löschen einer Kategorie wirkt sich auf ALLE Rezepte aus,
    // die sie verwenden - deshalb nur für HA-Admins sichtbar (siehe
    // _darfKategorienVerwalten). Neu ANLEGEN bleibt bewusst für jeden
    // offen, dafür reicht der "+ Neue Kategorie"-Knopf unten.
    const darfKategorienVerwalten = this._darfKategorienVerwalten();
    const kategorieChips = this._rezepte.length
      ? `<div class="kategorie-filter" id="kategorie-filter">
          <button type="button" class="chip ${this._aktiveKategorie === "Alle" ? "chip-aktiv" : ""}" data-kategorie="Alle">${this._t("kategorie_filter_alle")}</button>
          ${this._alleKategorien().map((k) => eigeneKategorienSet.has(k)
            ? `<span class="chip kategorie-eigen-chip ${this._aktiveKategorie === k ? "chip-aktiv" : ""}" data-kategorie="${this._escape(k)}">${this._escape(this._kategorieLabel(k))}
                ${darfKategorienVerwalten ? `<button type="button" class="kategorie-bearbeiten" data-kategorie="${this._escape(k)}" title="${this._t("kategorie_bearbeiten_title")}" aria-label="${this._t("kategorie_bearbeiten_aria", { name: this._escape(k) })}">✎</button>` : ""}
                ${darfKategorienVerwalten ? `<button type="button" class="kategorie-loeschen" data-kategorie="${this._escape(k)}" title="${this._t("kategorie_loeschen_title")}" aria-label="${this._t("kategorie_loeschen_aria", { name: this._escape(k) })}">✕</button>` : ""}
              </span>`
            : `<button type="button" class="chip ${this._aktiveKategorie === k ? "chip-aktiv" : ""}" data-kategorie="${this._escape(k)}">${this._escape(this._kategorieLabel(k))}</button>`
          ).join("")}
          <button type="button" class="chip chip-neu" id="kategorie-neu-btn">${this._t("kategorie_neu_btn")}</button>
          <div id="kategorie-speichern-bereich" style="display:none; width:100%; margin-top:8px;">
            <div id="kategorie-speichern-titel" class="hinweis" style="margin-top:0;"></div>
            <input type="text" id="kategorie-name-feld" placeholder="${this._t("kategorie_name_placeholder")}">
            <button type="button" class="primaer klein" id="kategorie-speichern-bestaetigen-btn" style="margin-top:6px;">${this._t("allgemein_speichern")}</button>
          </div>
        </div>`
      : "";

    const alleTags = this._alleTags();
    const tagFilterZeile = alleTags.length && this._einstellungen.tagsAnzeigen !== false
      ? `<div class="tag-filter" id="tag-filter">
          ${alleTags.map((t) => `<button type="button" class="chip ${this._aktiveTags.has(t) ? "chip-aktiv" : ""}" data-tag="${this._escape(t)}">#${this._escape(t)}</button>`).join("")}
        </div>`
      : "";

    // Ein "Kochbuch" speichert eine ganze Filterkombination inkl. aktiver
    // Tags - ohne eingeblendeten Tag-Filter (tagsAnzeigen) ergibt das
    // Abspeichern/Anwenden solcher Kombinationen für den Nutzer keinen Sinn
    // mehr, deshalb blendet die Karte die gesamte Zeile dann aus. Bereits
    // gespeicherte Kochbücher gehen dabei NICHT verloren - sie erscheinen
    // einfach wieder, sobald der Tag-Filter erneut aktiviert wird.
    const kochbuecherZeile = this._einstellungen.tagsAnzeigen !== false && (this._rezepte.length || (this._kochbuecher || []).length)
      ? `<div class="kochbuecher-zeile" id="kochbuecher-zeile">
          ${(this._kochbuecher || []).map((kb, i) => `
            <span class="chip kochbuch-chip" data-index="${i}">📚 ${this._escape(kb.name)}</span>
            <button type="button" class="kochbuch-loeschen" data-index="${i}" title="${this._t("kochbuch_loeschen_title")}" aria-label="${this._t("kochbuch_loeschen_aria", { name: this._escape(kb.name) })}">✕</button>
          `).join("")}
          ${this._rezepte.length ? `
            <button type="button" class="sekundaer klein" id="kochbuch-speichern-btn">${this._t("kochbuch_speichern_btn")}</button>
            <button type="button" class="info-btn" id="kochbuch-info-btn" title="${this._t("kochbuch_info_aria")}" aria-label="${this._t("kochbuch_info_aria")}">?</button>
          ` : ""}
          <div id="kochbuch-speichern-bereich" style="display:none; width:100%; margin-top:8px;">
            <input type="text" id="kochbuch-name-feld" placeholder="${this._t("kochbuch_name_placeholder")}">
            <button type="button" class="primaer klein" id="kochbuch-speichern-bestaetigen-btn" style="margin-top:6px;">${this._t("allgemein_speichern")}</button>
          </div>
        </div>`
      : "";

    const einkaufsAktionsleiste = this._einkaufslistenModus
      ? `<div class="einkaufs-aktionsleiste" id="einkaufs-aktionsleiste">
          <span id="einkaufs-zaehler">${this._t("einkaufs_zaehler", { anzahl: this._ausgewaehlteRezepte.size })}</span>
          <button class="primaer klein" id="einkaufsliste-erstellen-btn" ${this._ausgewaehlteRezepte.size === 0 ? "disabled" : ""}>${this._t("einkaufsliste_erstellen_btn")}</button>
        </div>`
      : "";

    this.shadowRoot.innerHTML = `
      ${stil}
      <ha-card>
        <div class="kopf">
          <h2>${titel}</h2>
          <div class="kopf-aktionen">
            ${this._rezepte.length ? `<button class="sekundaer" id="sichern-btn">${this._t("kopf_sichern_btn")}</button>` : ""}
            ${this._rezepte.length ? `<button class="sekundaer" id="sammel-pdf-btn">${this._t("kopf_sammel_pdf_btn")}</button>` : ""}
            ${this._rezepte.length && this._einstellungen.zufallsrezeptAnzeigen !== false ? `<button class="sekundaer" id="zufallsrezept-btn">${this._t("kopf_zufallsrezept_btn")}</button>` : ""}
            <button class="sekundaer" id="wochenplan-btn">${this._t("kopf_wochenplan_btn")}</button>
            ${this._einstellungen.umrechnungstabelleKopfAnzeigen !== false ? `<button class="sekundaer" id="umrechnungstabelle-btn">${this._t("umrechnungstabelle_btn")}</button>` : ""}
            ${this._rezepte.length ? `<button class="sekundaer" id="einkaufsmodus-btn">${this._einkaufslistenModus ? this._t("einkaufsmodus_beenden_btn") : this._t("einkaufsmodus_start_btn")}</button>` : ""}
            ${this._rezepte.length && this._statistikAktiv() ? `<button class="sekundaer" id="statistik-btn">${this._t("statistik_btn")}</button>` : ""}
            <button class="primaer" id="neu-btn">${this._t("kopf_neu_btn")}</button>
            ${this._rezepte.length ? `<button class="info-btn" id="statistik-einstellungen-btn" title="${this._t("statistik_einstellungen_btn_title")}" aria-label="${this._t("statistik_einstellungen_btn_title")}">⚙️</button>` : ""}
          </div>
        </div>
        ${this._rezepte.length ? `
          <input type="text" class="such-feld" id="such-feld" placeholder="${this._t("suche_placeholder")}" value="${this._escape(this._suchbegriff)}">
        ` : ""}
        ${this._rezepte.length ? `
          <div class="sortier-zeile">
            <label for="sortier-feld">${this._t("sortieren_label")}</label>
            <select id="sortier-feld">
              ${SORTIER_OPTIONEN.map((o) => `<option value="${o.wert}" ${this._sortierung === o.wert ? "selected" : ""}>${this._t(o.labelSchluessel)}</option>`).join("")}
            </select>
          </div>
        ` : ""}
        ${kategorieChips}
        ${tagFilterZeile}
        ${kochbuecherZeile}
        ${einkaufsAktionsleiste}
        ${this._geloeschtesRezept ? `
          <div class="undo-banner" id="undo-banner">
            <span>${this._t("undo_geloescht", { titel: this._escape(this._geloeschtesRezept.title) })}</span>
            <button type="button" class="sekundaer klein" id="undo-btn">${this._t("undo_rueckgaengig_btn")}</button>
          </div>
        ` : ""}
        ${this._updateHinweisVersion && !this._updateHinweisAusgeblendet ? `
          <div class="update-banner" id="update-banner">
            <span>${this._t("update_neue_version", { version: this._escape(this._updateHinweisVersion) })}</span>
            <a href="https://github.com/${GITHUB_REPO}/releases/latest" target="_blank" rel="noopener noreferrer" class="update-ansehen-link">${this._t("update_ansehen_btn")}</a>
            <button type="button" class="update-schliessen-btn" id="update-banner-schliessen-btn" aria-label="${this._t("update_schliessen_aria")}">✕</button>
          </div>
        ` : ""}
        ${this._ressourcenVersionsHinweis && !this._ressourcenVersionsHinweisAusgeblendet ? `
          <div class="update-banner" id="ressourcen-version-banner">
            <span>${this._t("ressourcen_version_hinweis", { version: this._escape(this._ressourcenVersionsHinweis) })}</span>
            <button type="button" class="update-schliessen-btn" id="ressourcen-version-banner-schliessen-btn" aria-label="${this._t("update_schliessen_aria")}">✕</button>
          </div>
        ` : ""}
        <div id="ergebnis-bereich"></div>

        <div class="modal-overlay" id="kochbuch-info-modal" style="display:none;">
          <div class="modal-box modal-box-breit">
            <h3 style="margin-top:0;">${this._t("kochbuch_info_titel")}</h3>
            <p style="text-align:left;">${this._t("kochbuch_info_text")}</p>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="primaer" id="kochbuch-info-schliessen-btn">${this._t("allgemein_schliessen")}</button>
            </div>
          </div>
        </div>

        ${this._umrechnungstabelleModalHtml()}

        <div class="modal-overlay" id="statistik-modal" style="display:none;">
          <div class="modal-box modal-box-breit">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
              <h3 style="margin:0;">${this._t("statistik_titel")}</h3>
              <button type="button" class="info-btn" id="statistik-info-btn" title="${this._t("statistik_info_aria")}" aria-label="${this._t("statistik_info_aria")}">?</button>
            </div>
            ${this._statistikModalInhalt()}
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="primaer" id="statistik-schliessen-btn">${this._t("allgemein_schliessen")}</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="statistik-einstellungen-modal" style="display:${this._einstellungenModalSichtbar ? "flex" : "none"};">
          <div class="modal-box modal-box-breit modal-box-scroll">
            <h3 style="margin-top:0;">${this._t("statistik_einstellungen_titel")}</h3>
            <p style="text-align:left;">${this._t("statistik_einstellungen_text")}</p>
            <div class="schalter-zeile">
              <span class="schalter-label">${this._t("statistik_einstellungen_schalter_label")}</span>
              <label class="schalter-btn ${this._einstellungen.erfassungAktiv !== false ? "schalter-btn-aktiv" : ""}">
                <input type="checkbox" id="statistik-einstellungen-schalter" ${this._einstellungen.erfassungAktiv !== false ? "checked" : ""}>
                <span>${this._einstellungen.erfassungAktiv !== false ? this._t("allgemein_an") : this._t("allgemein_aus")}</span>
              </label>
            </div>
            <hr class="detail-trenner trenner-voll">
            <div class="schalter-zeile">
              <span class="schalter-label">${this._t("tags_einstellung_schalter_label")}</span>
              <label class="schalter-btn ${this._einstellungen.tagsAnzeigen !== false ? "schalter-btn-aktiv" : ""}">
                <input type="checkbox" id="tags-einstellungen-schalter" ${this._einstellungen.tagsAnzeigen !== false ? "checked" : ""}>
                <span>${this._einstellungen.tagsAnzeigen !== false ? this._t("allgemein_an") : this._t("allgemein_aus")}</span>
              </label>
            </div>
            <hr class="detail-trenner trenner-voll">
            <div class="schalter-zeile">
              <span class="schalter-label">${this._t("zufallsrezept_einstellung_schalter_label")}</span>
              <label class="schalter-btn ${this._einstellungen.zufallsrezeptAnzeigen !== false ? "schalter-btn-aktiv" : ""}">
                <input type="checkbox" id="zufallsrezept-einstellungen-schalter" ${this._einstellungen.zufallsrezeptAnzeigen !== false ? "checked" : ""}>
                <span>${this._einstellungen.zufallsrezeptAnzeigen !== false ? this._t("allgemein_an") : this._t("allgemein_aus")}</span>
              </label>
            </div>
            <hr class="detail-trenner trenner-voll">
            <div class="schalter-zeile">
              <span class="schalter-label">${this._t("umrechnungstabelle_kopf_einstellung_schalter_label")}</span>
              <label class="schalter-btn ${this._einstellungen.umrechnungstabelleKopfAnzeigen !== false ? "schalter-btn-aktiv" : ""}">
                <input type="checkbox" id="umrechnungstabelle-kopf-einstellungen-schalter" ${this._einstellungen.umrechnungstabelleKopfAnzeigen !== false ? "checked" : ""}>
                <span>${this._einstellungen.umrechnungstabelleKopfAnzeigen !== false ? this._t("allgemein_an") : this._t("allgemein_aus")}</span>
              </label>
            </div>
            <p class="hinweis" style="text-align:left; margin-top:0;">${this._t("umrechnungstabelle_kopf_einstellung_hinweis")}</p>
            <hr class="detail-trenner trenner-voll">
            <p style="text-align:left;">${this._t("us_kategorie_einstellung_text")}</p>
            <div class="feld-zeile">
              <label for="us-kategorie-feld">${this._t("us_kategorie_einstellung_label")}</label>
              <select id="us-kategorie-feld">
                <option value="">${this._t("us_kategorie_einstellung_keine")}</option>
                ${this._alleKategorien().map((k) => `<option value="${this._escape(k)}" ${this._einstellungen.amerikanischeKategorie === k ? "selected" : ""}>${this._escape(this._kategorieLabel(k))}</option>`).join("")}
              </select>
            </div>
            <hr class="detail-trenner trenner-voll">
            <h4 style="margin:0 0 6px; text-align:left;">${this._t("farben_abschnitt_titel")}</h4>
            <p class="hinweis" style="text-align:left; margin-top:0;">${this._t("farben_hinweis")}</p>
            ${FARB_ROLLEN.map((rolle) => `
              <div class="schalter-zeile">
                <span class="schalter-label">${this._t(rolle.labelSchluessel)}</span>
                <input type="color" class="farben-feld" data-farbe="${rolle.schluessel}" value="${(this._einstellungen.farben && this._einstellungen.farben[rolle.schluessel]) || rolle.standard}" aria-label="${this._t(rolle.labelSchluessel)}">
              </div>`).join("")}
            <div class="modal-aktionen" style="margin-top:10px; justify-content:flex-start;">
              <button type="button" class="sekundaer klein" id="farben-zuruecksetzen-btn" ${Object.keys(this._einstellungen.farben || {}).length ? "" : "disabled"}>${this._t("farben_zuruecksetzen_btn")}</button>
            </div>
            <hr class="detail-trenner trenner-voll">
            <h4 style="margin:0 0 6px; text-align:left;">${this._t("einrichtung_abschnitt_titel")}</h4>
            <p class="hinweis" style="text-align:left; margin-top:0;">${this._t("einrichtung_abschnitt_hinweis")}</p>
            <div id="einrichtung-bereich"></div>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="primaer" id="statistik-einstellungen-schliessen-btn">${this._t("allgemein_schliessen")}</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="statistik-info-modal" style="display:none;">
          <div class="modal-box modal-box-breit">
            <h3 style="margin-top:0;">${this._t("statistik_info_titel")}</h3>
            <p style="text-align:left;">${this._t("statistik_info_text")}</p>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="primaer" id="statistik-info-schliessen-btn">${this._t("allgemein_schliessen")}</button>
            </div>
          </div>
        </div>
        <div class="modal-overlay" id="sammel-pdf-modal" style="display:none;">
          <div class="modal-box" id="sammel-pdf-wahl-box">
            <p style="margin-top:0;">${this._t("sammel_pdf_frage_umfang")}</p>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="primaer" id="sammel-pdf-alle-btn">${this._t("sammel_pdf_alle_rezepte_btn")}</button>
              <button type="button" class="sekundaer" id="sammel-pdf-auswahl-btn">${this._t("sammel_pdf_auswahl_btn")}</button>
            </div>
            <div class="modal-aktionen" style="margin-top:10px;">
              <button type="button" class="sekundaer" id="sammel-pdf-wahl-abbrechen-btn">${this._t("allgemein_abbrechen")}</button>
            </div>
          </div>
          <div class="modal-box modal-box-breit" id="sammel-pdf-auswahl-box" style="display:none;">
            <h3 style="margin-top:0;">${this._t("sammel_pdf_auswahl_titel")}</h3>
            <div class="sammel-pdf-auswahl-links">
              <a id="sammel-pdf-auswahl-alle-link">${this._t("sammel_pdf_alle_auswaehlen_link")}</a>
              <a id="sammel-pdf-auswahl-keine-link">${this._t("sammel_pdf_keine_auswaehlen_link")}</a>
            </div>
            <div class="sammel-pdf-auswahl-liste" id="sammel-pdf-auswahl-liste"></div>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="sekundaer" id="sammel-pdf-auswahl-abbrechen-btn">${this._t("allgemein_abbrechen")}</button>
              <button type="button" class="primaer" id="sammel-pdf-auswahl-weiter-btn">${this._t("sammel_pdf_weiter_btn")}</button>
            </div>
          </div>
          <div class="modal-box" id="sammel-pdf-frage-box" style="display:none;">
            <p style="margin-top:0;">${this._t("sammel_pdf_frage_toc")}</p>
            <label class="sammel-pdf-bilder-checkbox">
              <input type="checkbox" id="sammel-pdf-bilder-checkbox" checked>
              <span>${this._t("sammel_pdf_bilder_mitdrucken_label")}</span>
            </label>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="sekundaer" id="sammel-pdf-nein-toc-btn">${this._t("sammel_pdf_nein_toc_btn")}</button>
              <button type="button" class="primaer" id="sammel-pdf-ja-toc-btn">${this._t("sammel_pdf_ja_toc_btn")}</button>
            </div>
          </div>
          <div class="modal-box" id="sammel-pdf-name-box" style="display:none;">
            <input type="text" id="sammel-pdf-name-feld" placeholder="${this._t("sammel_pdf_name_placeholder")}">
            <div class="modal-aktionen">
              <button type="button" class="sekundaer" id="sammel-pdf-abbrechen-btn">${this._t("allgemein_abbrechen")}</button>
              <button type="button" class="primaer" id="sammel-pdf-name-erstellen-btn">${this._t("sammel_pdf_erstellen_btn")}</button>
            </div>
          </div>
        </div>
        <div class="versions-hinweis">v${CARD_VERSION}</div>
      </ha-card>
    `;

    const updateBannerSchliessenBtn = this.shadowRoot.getElementById("update-banner-schliessen-btn");
    if (updateBannerSchliessenBtn) {
      updateBannerSchliessenBtn.addEventListener("click", () => {
        this._updateHinweisAusgeblendet = true;
        try {
          localStorage.setItem("rezeptbuch_update_ausgeblendet_version", this._updateHinweisVersion);
        } catch (e) {
          // localStorage evtl. nicht verfügbar - dann erscheint der Hinweis
          // nach einem Neuladen erneut, kein Blocker.
        }
        const banner = this.shadowRoot.getElementById("update-banner");
        if (banner) banner.remove();
      });
    }

    const ressourcenVersionBannerSchliessenBtn = this.shadowRoot.getElementById("ressourcen-version-banner-schliessen-btn");
    if (ressourcenVersionBannerSchliessenBtn) {
      ressourcenVersionBannerSchliessenBtn.addEventListener("click", () => {
        this._ressourcenVersionsHinweisAusgeblendet = true;
        const banner = this.shadowRoot.getElementById("ressourcen-version-banner");
        if (banner) banner.remove();
      });
    }

    this.shadowRoot.getElementById("neu-btn").addEventListener("click", () => this._neuesRezeptFormular());
    this.shadowRoot.getElementById("wochenplan-btn").addEventListener("click", () => this._wochenplanAnzeigen());

    const zufallsrezeptBtn = this.shadowRoot.getElementById("zufallsrezept-btn");
    if (zufallsrezeptBtn) {
      zufallsrezeptBtn.addEventListener("click", () => this._zufallsrezeptOeffnen());
    }

    const sichernBtn = this.shadowRoot.getElementById("sichern-btn");
    if (sichernBtn) {
      sichernBtn.addEventListener("click", () => this._backupErstellen());
    }

    const sammelPdfBtn = this.shadowRoot.getElementById("sammel-pdf-btn");
    if (sammelPdfBtn) {
      sammelPdfBtn.addEventListener("click", () => this._sammelPdfModalOeffnen());
    }

    const sammelPdfAlleBtn = this.shadowRoot.getElementById("sammel-pdf-alle-btn");
    if (sammelPdfAlleBtn) {
      sammelPdfAlleBtn.addEventListener("click", () => {
        this._sammelPdfWahlModus = "alle";
        this._sammelPdfSchrittZeigen("frage");
      });
    }

    const sammelPdfAuswahlBtn = this.shadowRoot.getElementById("sammel-pdf-auswahl-btn");
    if (sammelPdfAuswahlBtn) {
      sammelPdfAuswahlBtn.addEventListener("click", () => {
        this._sammelPdfAuswahlListeRendern();
        this._sammelPdfSchrittZeigen("auswahl");
      });
    }

    const sammelPdfWahlAbbrechenBtn = this.shadowRoot.getElementById("sammel-pdf-wahl-abbrechen-btn");
    if (sammelPdfWahlAbbrechenBtn) {
      sammelPdfWahlAbbrechenBtn.addEventListener("click", () => this._sammelPdfModalSchliessen());
    }

    const sammelPdfAuswahlAlleLink = this.shadowRoot.getElementById("sammel-pdf-auswahl-alle-link");
    if (sammelPdfAuswahlAlleLink) {
      sammelPdfAuswahlAlleLink.addEventListener("click", (ev) => {
        ev.preventDefault();
        (this._sammelPdfGefilterteListe || []).forEach((r) => this._sammelPdfAusgewaehlteUids.add(r.uid));
        this._sammelPdfAuswahlListeRendern();
      });
    }

    const sammelPdfAuswahlKeineLink = this.shadowRoot.getElementById("sammel-pdf-auswahl-keine-link");
    if (sammelPdfAuswahlKeineLink) {
      sammelPdfAuswahlKeineLink.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._sammelPdfAusgewaehlteUids.clear();
        this._sammelPdfAuswahlListeRendern();
      });
    }

    const sammelPdfAuswahlAbbrechenBtn = this.shadowRoot.getElementById("sammel-pdf-auswahl-abbrechen-btn");
    if (sammelPdfAuswahlAbbrechenBtn) {
      sammelPdfAuswahlAbbrechenBtn.addEventListener("click", () => this._sammelPdfModalSchliessen());
    }

    const sammelPdfAuswahlWeiterBtn = this.shadowRoot.getElementById("sammel-pdf-auswahl-weiter-btn");
    if (sammelPdfAuswahlWeiterBtn) {
      sammelPdfAuswahlWeiterBtn.addEventListener("click", () => {
        if (this._sammelPdfAusgewaehlteUids.size === 0) {
          this._hinweis(this._t("sammel_pdf_auswahl_keine_hinweis"));
          return;
        }
        this._sammelPdfWahlModus = "auswahl";
        this._sammelPdfSchrittZeigen("frage");
      });
    }

    const sammelPdfNeinTocBtn = this.shadowRoot.getElementById("sammel-pdf-nein-toc-btn");
    if (sammelPdfNeinTocBtn) {
      sammelPdfNeinTocBtn.addEventListener("click", () => {
        const rezepte = this._sammelPdfExportListeErmitteln();
        const bilderCheckbox = this.shadowRoot.getElementById("sammel-pdf-bilder-checkbox");
        const bilderMitdrucken = !bilderCheckbox || bilderCheckbox.checked;
        this._sammelPdfModalSchliessen();
        this._sammelPdfExport({ inhaltsverzeichnis: false, rezepte, bilderMitdrucken });
      });
    }

    const sammelPdfJaTocBtn = this.shadowRoot.getElementById("sammel-pdf-ja-toc-btn");
    if (sammelPdfJaTocBtn) {
      sammelPdfJaTocBtn.addEventListener("click", () => {
        this._sammelPdfSchrittZeigen("name");
        const nameFeld = this.shadowRoot.getElementById("sammel-pdf-name-feld");
        if (nameFeld) nameFeld.focus();
      });
    }

    const sammelPdfAbbrechenBtn = this.shadowRoot.getElementById("sammel-pdf-abbrechen-btn");
    if (sammelPdfAbbrechenBtn) {
      sammelPdfAbbrechenBtn.addEventListener("click", () => this._sammelPdfModalSchliessen());
    }

    const sammelPdfNameErstellenBtn = this.shadowRoot.getElementById("sammel-pdf-name-erstellen-btn");
    if (sammelPdfNameErstellenBtn) {
      sammelPdfNameErstellenBtn.addEventListener("click", () => {
        const nameFeld = this.shadowRoot.getElementById("sammel-pdf-name-feld");
        const titel = (nameFeld && nameFeld.value.trim()) || this._t("sammel_pdf_name_placeholder");
        const rezepte = this._sammelPdfExportListeErmitteln();
        const bilderCheckbox = this.shadowRoot.getElementById("sammel-pdf-bilder-checkbox");
        const bilderMitdrucken = !bilderCheckbox || bilderCheckbox.checked;
        this._sammelPdfModalSchliessen();
        this._sammelPdfExport({ inhaltsverzeichnis: true, titel, rezepte, bilderMitdrucken });
      });
    }

    const einkaufsmodusBtn = this.shadowRoot.getElementById("einkaufsmodus-btn");
    if (einkaufsmodusBtn) {
      einkaufsmodusBtn.addEventListener("click", () => {
        this._einkaufslistenModus = !this._einkaufslistenModus;
        if (!this._einkaufslistenModus) this._ausgewaehlteRezepte.clear();
        this._render();
      });
    }

    const einkaufsErstellenBtn = this.shadowRoot.getElementById("einkaufsliste-erstellen-btn");
    if (einkaufsErstellenBtn) {
      einkaufsErstellenBtn.addEventListener("click", async () => {
        einkaufsErstellenBtn.disabled = true;
        const ausgewaehlt = this._rezepte.filter((r) => this._ausgewaehlteRezepte.has(r.uid));
        await this._einkaufslisteErstellen(ausgewaehlt);
        einkaufsErstellenBtn.disabled = this._ausgewaehlteRezepte.size === 0;
      });
    }

    const undoBtn = this.shadowRoot.getElementById("undo-btn");
    if (undoBtn) {
      undoBtn.addEventListener("click", () => this._loeschenRueckgaengig());
    }

    const suchFeld = this.shadowRoot.getElementById("such-feld");
    if (suchFeld) {
      suchFeld.addEventListener("input", () => {
        this._suchbegriff = suchFeld.value;
        this._aktuelleSeite = 1; // neue Suche -> zurück auf die erste Seite
        this._ergebnisAktualisieren();
      });
    }

    const sortierFeld = this.shadowRoot.getElementById("sortier-feld");
    if (sortierFeld) {
      sortierFeld.addEventListener("change", () => {
        this._sortierung = sortierFeld.value;
        this._aktuelleSeite = 1;
        this._ergebnisAktualisieren();
      });
    }

    // Nur Elemente MIT data-kategorie sind echte Filter-Chips - schließt den
    // "+ Neue Kategorie"-Knopf (kein data-kategorie) automatisch aus, auch
    // wenn er dieselbe "chip"-Klasse für die Optik trägt.
    const chipButtons = this.shadowRoot.querySelectorAll(".kategorie-filter .chip[data-kategorie]");
    chipButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._aktiveKategorie = btn.dataset.kategorie;
        // "Alle" soll wirklich alles zeigen: ein noch aktiver Tag-Filter aus
        // einer anderen Kategorie bliebe sonst unsichtbar bestehen (die
        // Tag-Chips sind unabhängig von der Kategorie) und könnte dazu
        // führen, dass "Alle" fälschlich leer erscheint, obwohl Rezepte
        // vorhanden sind - bislang nur durch Neuladen der Karte behebbar.
        if (this._aktiveKategorie === "Alle" && this._aktiveTags.size > 0) {
          this._aktiveTags = new Set();
          this.shadowRoot.querySelectorAll(".tag-filter .chip").forEach((t) => t.classList.remove("chip-aktiv"));
        }
        chipButtons.forEach((b) => b.classList.toggle("chip-aktiv", b === btn));
        this._aktuelleSeite = 1;
        this._ergebnisAktualisieren();
      });
    });

    const kategorieNeuBtn = this.shadowRoot.getElementById("kategorie-neu-btn");
    if (kategorieNeuBtn) {
      kategorieNeuBtn.addEventListener("click", () => {
        const bereich = this.shadowRoot.getElementById("kategorie-speichern-bereich");
        // Erneuter Klick auf "+ Neue Kategorie" schließt das Formular wieder
        // zu, SOFERN es gerade für genau diesen Zweck (nicht fürs
        // Umbenennen) offen war - sonst (z.B. nach Klick auf ✎ bei einer
        // anderen Kategorie) wird es stattdessen auf "Neu anlegen"
        // umgeschaltet, statt einfach zuzuklappen.
        const warSchonOffenFuerNeu = bereich.style.display !== "none" && this._kategorieBearbeitungsZiel === null;
        this._kategorieBearbeitungsZiel = null;
        bereich.style.display = warSchonOffenFuerNeu ? "none" : "block";
        if (bereich.style.display === "block") {
          this.shadowRoot.getElementById("kategorie-name-feld").value = "";
          this.shadowRoot.getElementById("kategorie-speichern-titel").textContent = "";
          this.shadowRoot.getElementById("kategorie-name-feld").focus();
        }
      });
    }

    this.shadowRoot.querySelectorAll(".kategorie-bearbeiten").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this._darfKategorienVerwalten()) return; // nur Verteidigungslinie - der Knopf wird eh nur für Admins gerendert
        const kategorie = btn.dataset.kategorie;
        this._kategorieBearbeitungsZiel = kategorie;
        const bereich = this.shadowRoot.getElementById("kategorie-speichern-bereich");
        const nameFeld = this.shadowRoot.getElementById("kategorie-name-feld");
        nameFeld.value = this._kategorieLabel(kategorie);
        this.shadowRoot.getElementById("kategorie-speichern-titel").textContent =
          this._t("kategorie_umbenennen_titel", { name: this._kategorieLabel(kategorie) });
        bereich.style.display = "block";
        nameFeld.focus();
      });
    });

    const kategorieBestaetigenBtn = this.shadowRoot.getElementById("kategorie-speichern-bestaetigen-btn");
    if (kategorieBestaetigenBtn) {
      kategorieBestaetigenBtn.addEventListener("click", async () => {
        const nameFeld = this.shadowRoot.getElementById("kategorie-name-feld");
        const name = nameFeld.value.trim();
        if (!name) { this._hinweis(this._t("fehler_kategorie_name_fehlt")); return; }
        const umbenennenZiel = this._kategorieBearbeitungsZiel;
        // Groß-/Kleinschreibung ignorierend gegen ALLE wählbaren Kategorien
        // prüfen (fest eingebaute, übersetzt UND deutsch, sowie eigene) -
        // sonst könnte z.B. "hauptgericht" unbemerkt neben "Hauptgericht"
        // entstehen. Beim Umbenennen zählt die eigene (alte) Kategorie
        // selbst dabei nicht als Duplikat.
        const existiertBereits = this._alleKategorien().some((k) =>
          k !== umbenennenZiel &&
          (k.toLowerCase() === name.toLowerCase() || this._kategorieLabel(k).toLowerCase() === name.toLowerCase())
        );
        if (existiertBereits) { this._hinweis(this._t("fehler_kategorie_existiert_bereits")); return; }
        kategorieBestaetigenBtn.disabled = true;
        if (umbenennenZiel) {
          await this._kategorieUmbenennen(umbenennenZiel, name);
        } else {
          await this._eigeneKategorienSpeichern([...(this._eigeneKategorien || []), name]);
          this._render();
        }
      });
    }

    this.shadowRoot.querySelectorAll(".kategorie-loeschen").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!this._darfKategorienVerwalten()) return; // nur Verteidigungslinie - der Knopf wird eh nur für Admins gerendert
        const kategorie = btn.dataset.kategorie;
        // Eine Kategorie, die noch von mindestens einem Rezept verwendet
        // wird, lässt sich bewusst NICHT löschen (anders als ein
        // Kochbuch, das nur eine gespeicherte Filter-Kombination ist) -
        // sonst würden Rezepte unbemerkt ihre Kategorie verlieren. Erst
        // müssen die betroffenen Rezepte umkategorisiert werden.
        const anzahlVerwendet = this._rezepte.filter((r) => (r.category || "Sonstiges") === kategorie).length;
        if (anzahlVerwendet > 0) {
          this._hinweis(this._t("fehler_kategorie_wird_verwendet", { anzahl: anzahlVerwendet }));
          return;
        }
        btn.disabled = true;
        const neueListe = (this._eigeneKategorien || []).filter((k) => k !== kategorie);
        if (this._aktiveKategorie === kategorie) this._aktiveKategorie = "Alle";
        await this._eigeneKategorienSpeichern(neueListe);
        this._render();
      });
    });

    const tagButtons = this.shadowRoot.querySelectorAll(".tag-filter .chip");
    tagButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tag = btn.dataset.tag;
        if (this._aktiveTags.has(tag)) this._aktiveTags.delete(tag);
        else this._aktiveTags.add(tag);
        btn.classList.toggle("chip-aktiv");
        this._aktuelleSeite = 1;
        this._ergebnisAktualisieren();
      });
    });

    this.shadowRoot.querySelectorAll(".kochbuch-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const kb = this._kochbuecher[Number(chip.dataset.index)];
        if (!kb) return;
        this._aktiveKategorie = kb.category || "Alle";
        this._aktiveTags = new Set(kb.tags || []);
        this._aktuelleSeite = 1;
        this._suchbegriff = kb.suchbegriff || "";
        this._render();
      });
    });

    this.shadowRoot.querySelectorAll(".kochbuch-loeschen").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        // Bewusst OHNE Bestätigungs-Dialog: ein Kochbuch ist nur eine
        // gespeicherte Filter-Kombination (Kategorie+Tags+Suchbegriff), kein
        // Rezept - beim versehentlichen Löschen geht keine echte Dateneingabe
        // verloren, es lässt sich in Sekunden neu anlegen.
        const index = Number(btn.dataset.index);
        const neueListe = (this._kochbuecher || []).filter((_, i) => i !== index);
        btn.disabled = true;
        await this._kochbuecherSpeichern(neueListe);
        this._render();
      });
    });

    const kochbuchSpeichernBtn = this.shadowRoot.getElementById("kochbuch-speichern-btn");
    if (kochbuchSpeichernBtn) {
      kochbuchSpeichernBtn.addEventListener("click", () => {
        const bereich = this.shadowRoot.getElementById("kochbuch-speichern-bereich");
        bereich.style.display = bereich.style.display === "none" ? "block" : "none";
      });
    }

    const kochbuchBestaetigenBtn = this.shadowRoot.getElementById("kochbuch-speichern-bestaetigen-btn");
    if (kochbuchBestaetigenBtn) {
      kochbuchBestaetigenBtn.addEventListener("click", async () => {
        const nameFeld = this.shadowRoot.getElementById("kochbuch-name-feld");
        const name = nameFeld.value.trim();
        if (!name) { this._hinweis(this._t("fehler_kochbuch_name_fehlt")); return; }
        kochbuchBestaetigenBtn.disabled = true;
        const neuesKochbuch = {
          name,
          category: this._aktiveKategorie,
          tags: Array.from(this._aktiveTags),
          suchbegriff: this._suchbegriff,
        };
        await this._kochbuecherSpeichern([...(this._kochbuecher || []), neuesKochbuch]);
        this._render();
      });
    }

    const kochbuchInfoBtn = this.shadowRoot.getElementById("kochbuch-info-btn");
    if (kochbuchInfoBtn) {
      kochbuchInfoBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("kochbuch-info-modal").style.display = "flex";
      });
    }
    const kochbuchInfoSchliessenBtn = this.shadowRoot.getElementById("kochbuch-info-schliessen-btn");
    if (kochbuchInfoSchliessenBtn) {
      kochbuchInfoSchliessenBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("kochbuch-info-modal").style.display = "none";
      });
    }

    this._umrechnungstabelleVerdrahten(["umrechnungstabelle-btn"]);

    const statistikBtn = this.shadowRoot.getElementById("statistik-btn");
    if (statistikBtn) {
      statistikBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("statistik-modal").style.display = "flex";
      });
    }
    const statistikSchliessenBtn = this.shadowRoot.getElementById("statistik-schliessen-btn");
    if (statistikSchliessenBtn) {
      statistikSchliessenBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("statistik-modal").style.display = "none";
      });
    }
    const statistikInfoBtn = this.shadowRoot.getElementById("statistik-info-btn");
    if (statistikInfoBtn) {
      statistikInfoBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("statistik-info-modal").style.display = "flex";
      });
    }
    const statistikInfoSchliessenBtn = this.shadowRoot.getElementById("statistik-info-schliessen-btn");
    if (statistikInfoSchliessenBtn) {
      statistikInfoSchliessenBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("statistik-info-modal").style.display = "none";
      });
    }
    const statistikEinstellungenBtn = this.shadowRoot.getElementById("statistik-einstellungen-btn");
    if (statistikEinstellungenBtn) {
      statistikEinstellungenBtn.addEventListener("click", () => {
        this._einstellungenModalSichtbar = true;
        this.shadowRoot.getElementById("statistik-einstellungen-modal").style.display = "flex";
        this._einrichtungBereichAktualisieren();
      });
    }
    const statistikEinstellungenSchliessenBtn = this.shadowRoot.getElementById("statistik-einstellungen-schliessen-btn");
    if (statistikEinstellungenSchliessenBtn) {
      statistikEinstellungenSchliessenBtn.addEventListener("click", () => {
        this._einstellungenModalSichtbar = false;
        this.shadowRoot.getElementById("statistik-einstellungen-modal").style.display = "none";
      });
    }
    const statistikEinstellungenSchalter = this.shadowRoot.getElementById("statistik-einstellungen-schalter");
    if (statistikEinstellungenSchalter) {
      statistikEinstellungenSchalter.addEventListener("change", async (ev) => {
        const aktiv = ev.target.checked;
        await this._einstellungenAktualisieren((stand) => ({ ...stand, erfassungAktiv: aktiv }));
        this._render();
      });
    }
    const tagsEinstellungenSchalter = this.shadowRoot.getElementById("tags-einstellungen-schalter");
    if (tagsEinstellungenSchalter) {
      tagsEinstellungenSchalter.addEventListener("change", async (ev) => {
        const aktiv = ev.target.checked;
        // Beim Ausblenden auch einen eventuell noch aktiven Tag-Filter
        // zurücksetzen - sonst würde unsichtbar weitergefiltert (siehe
        // _gefilterteRezepte), ohne dass das für den Nutzer erkennbar wäre.
        if (!aktiv) this._aktiveTags = new Set();
        await this._einstellungenAktualisieren((stand) => ({ ...stand, tagsAnzeigen: aktiv }));
        this._render();
      });
    }
    const zufallsrezeptEinstellungenSchalter = this.shadowRoot.getElementById("zufallsrezept-einstellungen-schalter");
    if (zufallsrezeptEinstellungenSchalter) {
      zufallsrezeptEinstellungenSchalter.addEventListener("change", async (ev) => {
        const aktiv = ev.target.checked;
        await this._einstellungenAktualisieren((stand) => ({ ...stand, zufallsrezeptAnzeigen: aktiv }));
        this._render();
      });
    }
    const umrechnungstabelleKopfEinstellungenSchalter = this.shadowRoot.getElementById("umrechnungstabelle-kopf-einstellungen-schalter");
    if (umrechnungstabelleKopfEinstellungenSchalter) {
      umrechnungstabelleKopfEinstellungenSchalter.addEventListener("change", async (ev) => {
        const aktiv = ev.target.checked;
        // Betrifft bewusst NUR den Knopf im Kopf der Übersicht - der
        // Umrechnungstabellen-Knopf bei der eingestellten "Kategorie für
        // amerikanische Rezepte" (Detailansicht/Kochmodus) bleibt davon
        // unberührt und erscheint dort unabhängig von dieser Einstellung.
        await this._einstellungenAktualisieren((stand) => ({ ...stand, umrechnungstabelleKopfAnzeigen: aktiv }));
        this._render();
      });
    }
    this.shadowRoot.querySelectorAll(".farben-feld").forEach((feld) => {
      feld.addEventListener("change", async (ev) => {
        const schluessel = ev.target.dataset.farbe;
        const wert = ev.target.value;
        if (!FARB_ROLLEN.some((r) => r.schluessel === schluessel) || !hexFarbeGueltig(wert)) return;
        await this._farbenAendern((farben) => ({ ...farben, [schluessel]: wert.toLowerCase() }));
      });
    });
    const farbenZuruecksetzenBtn = this.shadowRoot.getElementById("farben-zuruecksetzen-btn");
    if (farbenZuruecksetzenBtn) {
      farbenZuruecksetzenBtn.addEventListener("click", () => this._farbenAendern(() => ({})));
    }
    const usKategorieFeld = this.shadowRoot.getElementById("us-kategorie-feld");
    if (usKategorieFeld) {
      usKategorieFeld.addEventListener("change", async (ev) => {
        const wert = ev.target.value;
        await this._einstellungenAktualisieren((stand) => ({ ...stand, amerikanischeKategorie: wert }));
        this._render();
      });
    }

    if (this._einstellungenModalSichtbar) this._einrichtungBereichAktualisieren();

    this._ergebnisAktualisieren();
  }

  _ergebnisAktualisieren() {
    const bereich = this.shadowRoot.getElementById("ergebnis-bereich");
    if (!bereich) return;

    const rezeptListe = this._sortiereRezepte(this._gefilterteRezepte());

    // Paginierung (feature: viele Rezepte auf mehrere Seiten statt alle auf
    // einmal) - über die Kartenoption "items_per_page" konfigurierbar,
    // Standard 20. this._aktuelleSeite wird hier auf den gültigen Bereich
    // begrenzt, statt an einer der Filter-Stellen selbst - so bleibt sie
    // z.B. auch nach dem Löschen eines Rezepts automatisch gültig, ohne
    // dass jede einzelne Änderungsstelle das explizit behandeln müsste.
    const proSeite = Number(this._config.items_per_page) > 0 ? Math.floor(Number(this._config.items_per_page)) : 20;
    const gesamtSeiten = Math.max(1, Math.ceil(rezeptListe.length / proSeite));
    if (this._aktuelleSeite > gesamtSeiten) this._aktuelleSeite = gesamtSeiten;
    if (this._aktuelleSeite < 1) this._aktuelleSeite = 1;
    const seitenListe = gesamtSeiten > 1
      ? rezeptListe.slice((this._aktuelleSeite - 1) * proSeite, this._aktuelleSeite * proSeite)
      : rezeptListe;

    const kacheln = seitenListe
      .map((r) => {
        const anzahlZutaten = (r.ingredients || []).length;
        // alt="" (statt ganz fehlendem alt-Attribut): das Foto steht direkt
        // neben dem Rezepttitel als Text (siehe .titel unten) und innerhalb
        // derselben klickbaren Kachel - ein zusätzlicher Bild-Alt-Text wie
        // "Foto von X" würde Screenreadern denselben Titel doppelt vorlesen.
        // alt="" markiert es korrekt als rein dekorativ/redundant, OHNE
        // (wie ganz ohne alt-Attribut) den Dateipfad vorzulesen.
        const bild = r.image
          ? `<img class="kachel-bild" ${this._bildAttribute(r.image, "(max-width: 600px) 50vw, 260px")} alt="">`
          : `<div class="icon">🍽️</div>`;
        const { durchschnitt, anzahl } = this._durchschnittsBewertung(r.ratings);
        const bewertungBadge = anzahl > 0
          ? `<span class="info info-sterne">${this._sterneHtml(durchschnitt, "klein")} ${durchschnitt}</span>`
          : "";
        const ausgewaehlt = this._ausgewaehlteRezepte.has(r.uid);
        const checkbox = this._einkaufslistenModus
          ? `<div class="kachel-checkbox ${ausgewaehlt ? "checkbox-aktiv" : ""}">${ausgewaehlt ? "✓" : ""}</div>`
          : "";
        // Barrierefreiheit: die Kachel war bisher ein reines <div> mit nur
        // einem click-Handler - per Tastatur weder erreichbar (kein
        // Tab-Stopp) noch auslösbar. tabindex="0" macht sie fokussierbar,
        // role/aria-checked bzw. aria-label geben ihr eine für Screenreader
        // sinnvolle Rolle je nach Modus (im Einkaufslisten-Auswahlmodus
        // verhält sie sich wie eine Checkbox, sonst wie ein Button zum
        // Öffnen des Rezepts). Der keydown-Handler unten deckt Enter/
        // Leertaste ab und ruft dieselbe Logik wie der Klick-Handler auf.
        const kachelRolle = this._einkaufslistenModus
          ? `role="checkbox" aria-checked="${ausgewaehlt}" aria-label="${this._escape(r.title)}"`
          : `role="button" aria-label="${this._t("kachel_aria_label_oeffnen", { titel: this._escape(r.title) })}"`;
        return `<div class="kachel" data-uid="${r.uid}" tabindex="0" ${kachelRolle}>
          <div class="kachel-bildbox">${bild}${checkbox}</div>
          <div class="textbereich">
            <div class="titel">${this._escape(r.title)}</div>
            <span class="info info-kategorie">${this._escape(this._kategorieLabel(r.category || "Sonstiges"))}</span>
            <span class="info">👥 ${r.servings} · 🥕 ${anzahlZutaten}</span>
            ${bewertungBadge}
          </div>
        </div>`;
      })
      .join("");

    if (this._rezepte.length === 0) {
      bereich.innerHTML = `<div class="leer">${this._t("leer_keine_rezepte")}</div>`;
      return;
    }
    if (rezeptListe.length === 0) {
      bereich.innerHTML = `<div class="leer">${this._t("leer_keine_treffer", { begriff: this._escape(this._suchbegriff) })}</div>`;
      return;
    }
    // Seitennavigation wird sowohl ÜBER als auch UNTER dem Kachel-Grid
    // angezeigt (zwei baugleiche Leisten mit unterschiedlichem ID-Suffix,
    // da IDs im DOM eindeutig sein müssen) - bei vielen Rezepten muss man
    // sonst immer erst nach unten scrollen, nur um die Seite zu wechseln.
    const seitenNavigationHtml = (suffix) => gesamtSeiten > 1
      ? `<div class="seiten-navigation">
          <button type="button" class="sekundaer klein" id="seite-zurueck-btn-${suffix}" ${this._aktuelleSeite <= 1 ? "disabled" : ""}>${this._t("seite_zurueck_btn")}</button>
          <span class="seiten-anzeige">${this._t("seite_anzeige", { aktuell: this._aktuelleSeite, gesamt: gesamtSeiten })}</span>
          <button type="button" class="sekundaer klein" id="seite-weiter-btn-${suffix}" ${this._aktuelleSeite >= gesamtSeiten ? "disabled" : ""}>${this._t("seite_weiter_btn")}</button>
        </div>`
      : "";
    bereich.innerHTML = `${seitenNavigationHtml("oben")}<div class="grid">${kacheln}</div>${seitenNavigationHtml("unten")}`;

    ["oben", "unten"].forEach((suffix) => {
      const seiteZurueckBtn = this.shadowRoot.getElementById(`seite-zurueck-btn-${suffix}`);
      if (seiteZurueckBtn) {
        seiteZurueckBtn.addEventListener("click", () => {
          this._aktuelleSeite = Math.max(1, this._aktuelleSeite - 1);
          this._ergebnisAktualisieren();
          // Beim Seitenwechsel nach oben scrollen - sonst bleibt der Blick
          // auf der Stelle stehen, an der vorher die letzte Kachel der
          // alten Seite war, was mitten in der neuen Seite landen kann.
          bereich.scrollIntoView({ block: "start" });
        });
      }
      const seiteWeiterBtn = this.shadowRoot.getElementById(`seite-weiter-btn-${suffix}`);
      if (seiteWeiterBtn) {
        seiteWeiterBtn.addEventListener("click", () => {
          this._aktuelleSeite = Math.min(gesamtSeiten, this._aktuelleSeite + 1);
          this._ergebnisAktualisieren();
          bereich.scrollIntoView({ block: "start" });
        });
      }
    });

    // Barrierefreiheit: die eigentliche Aktivierungslogik ist in eine
    // eigene Funktion ausgelagert, damit sie sowohl vom Maus-Klick als auch
    // von der Tastatur (Enter/Leertaste, siehe keydown unten) ausgelöst
    // werden kann, ohne den Code doppelt zu pflegen.
    const kachelAktivieren = (el) => {
      const rezept = this._rezepte.find((r) => r.uid === el.dataset.uid);
      if (this._einkaufslistenModus) {
        // Im Auswahlmodus öffnet eine Aktivierung der Kachel NICHT das
        // Rezept, sondern schaltet die Auswahl um. Nur das Grid neu
        // zeichnen (nicht die ganze Listenansicht) - Suchfeld/Scroll-
        // Position bleiben so unangetastet.
        if (this._ausgewaehlteRezepte.has(rezept.uid)) this._ausgewaehlteRezepte.delete(rezept.uid);
        else this._ausgewaehlteRezepte.add(rezept.uid);
        this._ergebnisAktualisieren();
        const zaehler = this.shadowRoot.getElementById("einkaufs-zaehler");
        if (zaehler) zaehler.textContent = this._t("einkaufs_zaehler", { anzahl: this._ausgewaehlteRezepte.size });
        const erstellenBtn = this.shadowRoot.getElementById("einkaufsliste-erstellen-btn");
        if (erstellenBtn) erstellenBtn.disabled = this._ausgewaehlteRezepte.size === 0;
        return;
      }
      this._rezeptOeffnen(rezept);
    };

    bereich.querySelectorAll(".kachel").forEach((el) => {
      el.addEventListener("click", () => kachelAktivieren(el));
      el.addEventListener("keydown", (ev) => {
        // Leertaste scrollt bei fokussierten, nicht-nativen Elementen
        // standardmäßig die Seite - das muss unterdrückt werden, damit sie
        // stattdessen (wie bei einem echten Button/einer Checkbox) die
        // Kachel aktiviert.
        if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
          ev.preventDefault();
          kachelAktivieren(el);
        }
      });
    });
  }

  // Bevorzugt lokal von Home Assistant selbst ausgeliefert (im selben Ordner
  // wie die Karte, ersatzweise unter /hacsfiles/ bzw. /local/), damit der
  // PDF-Export auch ohne Internetzugang und ohne Abhängigkeit von einem
  // externen CDN funktioniert. Ist die Datei nirgends vorhanden, fällt es
  // automatisch auf das CDN zurück.
  async _jsPdfLaden() {
    const vorhanden = () => window.jspdf && window.jspdf.jsPDF;
    if (vorhanden()) return window.jspdf.jsPDF;
    for (const ordner of zusatzdateiOrdner()) {
      if ((await skriptLaden(`${ordner}rezeptbuch-jspdf.min.js`)) && vorhanden()) return window.jspdf.jsPDF;
    }
    if ((await skriptLaden("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", 15000)) && vorhanden()) {
      return window.jspdf.jsPDF;
    }
    throw new Error("jsPDF konnte nicht geladen werden (weder lokal noch über CDN)");
  }

  // Seit Fotos als echte Dateien (/local/...) statt als eingebettete
  // Data-URLs gespeichert werden, reicht "src" allein nicht mehr für
  // jsPDF.addImage() oder eine eigenständig geteilte HTML-Datei: eine
  // Data-URL ist bereits fertige Bilddaten, eine "/local/..."-URL muss
  // Home Assistant erst nachladen. Diese Funktion liefert für beide Fälle
  // eine fertige Data-URL zurück (bei "/local/..." wird dafür einmalig über
  // ein Canvas neu kodiert), zusammen mit den Abmessungen - so bleiben
  // PDF- und geteilte HTML-Datei vollständig eigenständig (kein
  // Netzwerkzugriff auf die Home-Assistant-Instanz nötig, um das Bild
  // später anzuzeigen).
  _bildAlsDatenUrlLaden(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      if (src.startsWith("data:")) {
        const img = new Image();
        img.onload = () => resolve({ datenUrl: src, breite: img.naturalWidth, hoehe: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = src;
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve({ datenUrl: canvas.toDataURL("image/jpeg", 0.9), breite: img.naturalWidth, hoehe: img.naturalHeight });
        } catch (e) {
          console.error("Rezeptbuch: Bild konnte nicht für Export vorbereitet werden", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Schneidet ein Rezeptbild randabschneidend auf das Seitenverhältnis
  // einer Collage-Kachel zu (wie CSS "object-fit: cover") - für das
  // Sammel-PDF-Deckblatt (siehe _sammelPdfDeckblattZeichnen), damit dort
  // keine weißen Ränder/Streifen entstehen, wenn Bild- und Kachel-
  // Seitenverhältnis nicht zusammenpassen. `tileBreiteMm`/`tileHoeheMm`
  // sind die Zielmaße der Kachel in mm; das Ergebnis wird mit fester
  // Pixeldichte gerendert (genug für gestochen scharfen Druck, ohne die
  // Datei unnötig aufzublähen). Arbeitet wie _bildAlsDatenUrlLaden
  // clientseitig über ein <canvas> und braucht daher eine echte
  // Browser-Umgebung (in Tests wird diese Methode deshalb wie
  // _bildAlsDatenUrlLaden direkt überschrieben, statt echte Bilder zu
  // dekodieren).
  _bildFuerCollageZuschneiden(src, tileBreiteMm, tileHoeheMm) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = () => {
        try {
          const PX_PRO_MM = 6;
          const zielBreite = Math.max(1, Math.round(tileBreiteMm * PX_PRO_MM));
          const zielHoehe = Math.max(1, Math.round(tileHoeheMm * PX_PRO_MM));
          const canvas = document.createElement("canvas");
          canvas.width = zielBreite;
          canvas.height = zielHoehe;
          const ctx = canvas.getContext("2d");
          const skalierung = Math.max(zielBreite / img.naturalWidth, zielHoehe / img.naturalHeight);
          const zeichenBreite = img.naturalWidth * skalierung;
          const zeichenHoehe = img.naturalHeight * skalierung;
          const x = (zielBreite - zeichenBreite) / 2;
          const y = (zielHoehe - zeichenHoehe) / 2;
          ctx.drawImage(img, x, y, zeichenBreite, zeichenHoehe);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch (e) {
          console.error("Rezeptbuch: Bild konnte nicht für die Deckblatt-Collage zugeschnitten werden", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Ermittelt die Zeilen für den Deckblatt-Titel (siehe
  // _sammelPdfDeckblattZeichnen), begrenzt auf MAXIMAL 2 ZEILEN: passt
  // dafür die Schriftgröße schrittweise nach unten an (bis `minGroesse`),
  // solange der Titel bei `startGroesse` mehr als 2 Zeilen braucht. Passt
  // der Titel auch bei kleinster Schriftgröße nicht in 2 Zeilen, wird die
  // 2. Zeile hart gekürzt und mit "…" abgeschlossen - so werden garantiert
  // nie mehr als 2 Zeilen gezeichnet, auch bei einem sehr langen
  // Kochbuch-Namen. Gibt die fertigen Zeilen UND die tatsächlich genutzte
  // Schriftgröße zurück (für den Zeilenabstand beim Zeichnen).
  _sammelPdfDeckblattTitelZeilenErmitteln(doc, titel, maxBreite, startGroesse, minGroesse) {
    let groesse = startGroesse;
    let zeilen;
    for (;;) {
      doc.setFontSize(groesse);
      zeilen = doc.splitTextToSize(titel, maxBreite);
      if (zeilen.length <= 2 || groesse <= minGroesse) break;
      groesse -= 2;
    }

    if (zeilen.length > 2) {
      const breiteVon = typeof doc.getTextWidth === "function" ? (t) => doc.getTextWidth(t) : (t) => t.length * (groesse * 0.13);
      let rest = zeilen.slice(1).join(" ");
      while (rest.length > 1 && breiteVon(rest + "…") > maxBreite) {
        rest = rest.slice(0, -1).trimEnd();
      }
      zeilen = [zeilen[0], (rest || zeilen[1].slice(0, 1)) + "…"];
    }

    return { zeilen, groesse };
  }

  // Zeichnet ein eigenes Deckblatt (Seite 1, VOR der Inhaltsverzeichnis-
  // Seite, siehe _sammelPdfErstellen) für das Sammel-PDF: der individuelle
  // Kochbuch-Name groß, zentriert, schräg von links unten nach rechts oben
  // und auf maximal 2 Zeilen begrenzt (siehe
  // _sammelPdfDeckblattTitelZeilenErmitteln) oben auf der Seite, darunter
  // eine dezente Akzentlinie in der Terrakotta-Farbe der Karte, und darunter
  // eine
  // "Foto-Collage" aus bis zu 6 Rezeptbildern (die ersten Rezepte MIT Foto
  // aus der übergebenen - bereits nach Kategorie sortierten - Liste;
  // Rezepte ganz ohne Foto werden dabei übersprungen). Die Fotos werden wie
  // lose hingelegte Polaroids in unterschiedlichen Größen überlappend
  // angeordnet (siehe _sammelPdfDeckblattCollageZeichnen).
  // Gibt es kein einziges Foto, bleibt nur der Titel auf der Seite.
  async _sammelPdfDeckblattZeichnen(doc, titel, rezepte, margin, pageWidth, pageHeight, bilderMitdrucken = true) {
    const usableWidth = pageWidth - margin * 2;

    // Für den Kochbuch-Namen wird eine gerade, fette Times-Schrift genutzt.
    doc.setFont("times", "bold");
    doc.setTextColor(20);

    const titelSicherheitsrand = 16;
    const titelMaxBreite = Math.max(40, usableWidth - titelSicherheitsrand * 2);
    const { zeilen: titelZeilen, groesse: titelGroesse } = this._sammelPdfDeckblattTitelZeilenErmitteln(
      doc,
      titel,
      titelMaxBreite,
      32,
      18
    );
    const zeilenHoehe = titelGroesse * 0.42;

    let y = margin + 22;
    titelZeilen.forEach((zeile) => {
      doc.text(zeile, pageWidth / 2, y, { align: "center" });
      y += zeilenHoehe;
    });

    y += 6;
    doc.setDrawColor(178, 93, 43);
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - 25, y, pageWidth / 2 + 25, y);
    y += 14;

    const flaecheX = margin;
    const flaecheY = y;
    const flaecheBreite = usableWidth;
    const flaecheHoehe = pageHeight - margin - y;
    if (flaecheHoehe <= 0) return;

    const bildQuellen = bilderMitdrucken ? rezepte.map((r) => r.image).filter(Boolean).slice(0, 6) : [];
    if (!bildQuellen.length) return;

    const rand = Math.min(flaecheBreite, flaecheHoehe) * 0.04;
    const innenX = flaecheX + rand;
    const innenY = flaecheY + rand;
    const innenBreite = Math.max(10, flaecheBreite - rand * 2);
    const innenHoehe = Math.max(10, flaecheHoehe - rand * 2);

    await this._sammelPdfDeckblattCollageZeichnen(doc, bildQuellen, innenX, innenY, innenBreite, innenHoehe);
  }

  // Zeichnet die Rezeptfotos für das Deckblatt (siehe _sammelPdfDeckblattZeichnen)
  // nicht als schlichtes Raster, sondern als lose überlappende "Polaroids"
  // in unterschiedlichen Größen und Positionen - ähnlich einer von Hand
  // zusammengestellten Foto-Collage. `SLOTS` legt bis zu 6 feste Positionen
  // (als Anteil von Breite/Höhe der Collage-Fläche) und Größen fest; Slot 0
  // ist immer die mittlere, größte Kachel. Damit die wichtigste (mittlere)
  // Kachel optisch oben liegt, wird in umgekehrter Reihenfolge gezeichnet
  // (Hintergrund-Kacheln zuerst, die mittlere Kachel zuletzt).
  async _sammelPdfDeckblattCollageZeichnen(doc, bildQuellen, x, y, breite, hoehe) {
    const SLOTS = [
      { xFrac: 0.50, yFrac: 0.46, sizeFrac: 0.52 },
      { xFrac: 0.16, yFrac: 0.26, sizeFrac: 0.40 },
      { xFrac: 0.84, yFrac: 0.24, sizeFrac: 0.38 },
      { xFrac: 0.14, yFrac: 0.74, sizeFrac: 0.38 },
      { xFrac: 0.86, yFrac: 0.76, sizeFrac: 0.40 },
      { xFrac: 0.50, yFrac: 0.92, sizeFrac: 0.34 },
    ];
    const anzahl = Math.min(bildQuellen.length, SLOTS.length);
    const basis = Math.min(breite, hoehe);

    for (let i = anzahl - 1; i >= 0; i--) {
      const slot = SLOTS[i];
      const tileGroesse = basis * slot.sizeFrac;
      const bildGroesse = tileGroesse * 0.78;
      const centerX = x + slot.xFrac * breite;
      const centerY = y + slot.yFrac * hoehe;
      const bildX = centerX - bildGroesse / 2;
      const bildY = centerY - bildGroesse / 2;

      const zugeschnitten = await this._bildFuerCollageZuschneiden(bildQuellen[i], bildGroesse, bildGroesse);
      if (!zugeschnitten) continue;

      this._pdfPolaroidRahmenZeichnen(doc, bildX, bildY, bildGroesse, bildGroesse);
      doc.addImage(zugeschnitten, "JPEG", bildX, bildY, bildGroesse, bildGroesse);
    }
  }

  // Zeichnet einen schlichten weißen "Polaroid"-Rahmen (mit etwas mehr Rand
  // unten, wie bei einem echten Sofortbild) hinter ein Collage-Foto, plus
  // einen dezenten warmen Schatten dahinter für etwas Tiefe. `roundedRect`
  // ist nur bei der echten jsPDF-Bibliothek vorhanden (siehe
  // _pdfWasserzeichenZeichnen) - ohne sie wird ein eckiger Rahmen gezeichnet.
  // `setFillColor`/`rect` fehlen bei den ganz einfachen Fakes in manchen
  // Tests (die die Collage-Fotos ohnehin nur über addImage prüfen) - dann
  // wird der Rahmen einfach übersprungen und nur das Bild selbst gezeichnet.
  _pdfPolaroidRahmenZeichnen(doc, bildX, bildY, bildBreite, bildHoehe) {
    if (typeof doc.setFillColor !== "function" || typeof doc.rect !== "function") return;

    const rand = 3.5;
    const randUnten = 9;
    const rahmenX = bildX - rand;
    const rahmenY = bildY - rand;
    const rahmenBreite = bildBreite + rand * 2;
    const rahmenHoehe = bildHoehe + rand + randUnten;
    const kannAbgerundet = typeof doc.roundedRect === "function";

    doc.setFillColor(196, 184, 166);
    if (kannAbgerundet) {
      doc.roundedRect(rahmenX + 1.2, rahmenY + 1.2, rahmenBreite, rahmenHoehe, 1.5, 1.5, "F");
    } else {
      doc.rect(rahmenX + 1.2, rahmenY + 1.2, rahmenBreite, rahmenHoehe, "F");
    }

    doc.setFillColor(255, 255, 255);
    if (kannAbgerundet) {
      doc.roundedRect(rahmenX, rahmenY, rahmenBreite, rahmenHoehe, 1.5, 1.5, "F");
    } else {
      doc.rect(rahmenX, rahmenY, rahmenBreite, rahmenHoehe, "F");
    }
  }

  // Dezenter "Rezeptbuch-Card"-Schriftzug unten rechts im Bild - nur im
  // PDF-Export (Teilen/Drucken), nicht im normalen Bild in der App selbst.
  // Kleiner, halbtransparenter dunkler Streifen mit weißer Schrift, damit
  // er sowohl auf hellen als auch dunklen Fotos lesbar, aber unaufdringlich
  // bleibt. `setGState`/`GState` (Transparenz) ist nur bei der echten
  // jsPDF-Bibliothek vorhanden, nicht bei den einfachen Fakes in den Tests -
  // ohne diese Funktion wird der Streifen einfach undurchsichtig gezeichnet.
  _pdfWasserzeichenZeichnen(doc, bildX, bildY, bildBreite, bildHoehe) {
    if (bildBreite < 25 || bildHoehe < 10) return; // Bild zu klein für ein noch dezentes Wasserzeichen
    const text = "Rezeptbuch-Card";
    const kannTransparenz = typeof doc.setGState === "function" && typeof doc.GState === "function";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const innenAbstandX = 1.8;
    const boxHoehe = 4.2;
    const textBreite = typeof doc.getTextWidth === "function" ? doc.getTextWidth(text) : text.length * 1.5;
    const boxBreite = Math.min(textBreite + innenAbstandX * 2, bildBreite - 2);
    const boxX = bildX + bildBreite - boxBreite - 1.5;
    const boxY = bildY + bildHoehe - boxHoehe - 1.5;

    if (kannTransparenz) doc.setGState(new doc.GState({ opacity: 0.55 }));
    doc.setFillColor(20, 20, 20);
    if (typeof doc.roundedRect === "function") {
      doc.roundedRect(boxX, boxY, boxBreite, boxHoehe, 0.8, 0.8, "F");
    } else {
      doc.rect(boxX, boxY, boxBreite, boxHoehe, "F");
    }
    if (kannTransparenz) doc.setGState(new doc.GState({ opacity: 0.9 }));
    doc.setTextColor(255, 255, 255);
    doc.text(text, boxX + innenAbstandX, boxY + boxHoehe - 1.3);
    if (kannTransparenz) doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setTextColor(20); // Textfarbe für alles Nachfolgende zurücksetzen
  }

  // Zusätzlich zum Bild-Wasserzeichen oben: ein noch dezenterer
  // "Rezeptbuch-Card"-Schriftzug im Seitenfuß JEDER PDF-Seite (auch ohne
  // Bild bzw. auf Folgeseiten bei langen, mehrseitigen Rezepten), damit
  // wirklich jede erzeugte PDF-Seite den Hinweis trägt.
  _pdfSeitenfussWasserzeichenZeichnen(doc, pageWidth, pageHeight, margin) {
    const text = "Rezeptbuch-Card";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(190);
    const textBreite = typeof doc.getTextWidth === "function" ? doc.getTextWidth(text) : text.length * 1.5;
    doc.text(text, pageWidth - margin - textBreite, pageHeight - 8);
    doc.setTextColor(20);
  }

  // Zeichnet EIN Rezept auf die aktuelle Seite von "doc" (ab margin oben) -
  // ausgelagert aus _pdfErstellen, damit dieselbe Zeichenlogik sowohl für
  // den Einzel-Export (_pdfErstellen) als auch für den Sammel-PDF-Export
  // mehrerer Rezepte (_sammelPdfErstellen) verwendet werden kann. Legt
  // selbst keine neue Seite an - das entscheidet die aufrufende Stelle
  // (bei mehreren Rezepten also VOR jedem weiteren Aufruf doc.addPage()).
  // bilderMitdrucken (Standard: true) steuert, ob ein vorhandenes Rezeptbild
  // überhaupt geladen/gezeichnet wird - false lässt es komplett weg (siehe
  // _sammelPdfErstellen/_sammelPdfModalOeffnen: Sparvariante ohne Bilder,
  // analog zur Druckansicht vieler Rezept-Webseiten). Da ALLES weiter unten
  // nur noch über die lokale "bild"-Variable verzweigt, reicht dieser eine
  // Schalter ganz oben, ohne den Rest der Layout-Logik anzufassen.
  async _rezeptContentInPdfZeichnen(doc, r, bilderMitdrucken = true) {
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    const basisPortionen = r.servings || 1;
    const schritte = (r.steps || []).filter((s) => s && s.trim());
    const bild = (bilderMitdrucken && r.image) ? await this._bildAlsDatenUrlLaden(r.image) : null;

    // Kopfbereich (Titel + Portionen/Kategorie + Trennlinie) ist in beiden
    // Layouts unten identisch und rückt y immer um denselben, festen Betrag
    // vor - daher hier als Konstante statt Aufruf, um sie schon für die
    // Platzentscheidung unten zu kennen, bevor irgendetwas gezeichnet wird.
    const kopfZeichnen = () => {
      let yy = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(r.title, margin, yy);
      yy += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(130);
      doc.text(`${this._portionen} ${this._t("detail_portionen_suffix")}${r.category ? " · " + this._kategorieLabel(r.category) : ""}`, margin, yy);
      doc.setTextColor(20);
      yy += 8;
      doc.setDrawColor(193, 101, 47);
      doc.setLineWidth(1);
      doc.line(margin, yy, margin + 18, yy);
      yy += 9;
      return yy;
    };
    const yNachKopf = margin + 8 + 8 + 9;

    // Zweispaltiges Layout wie in der Detailansicht der Karte auf breiten
    // Bildschirmen (Bild+Zutaten links, Zubereitung rechts) - nur wenn
    // beides zusammen auf die verbleibende Seite passt. Dafür Zutaten-/
    // Schritt-Zeilen vorab auf Spaltenbreite umbrechen, um die benötigte
    // Höhe zu kennen, BEVOR irgendetwas gezeichnet wird.
    const spaltenAbstand = 10;
    const spaltenBreite = (usableWidth - spaltenAbstand) / 2;
    const linkeX = margin;
    const rechteX = margin + spaltenBreite + spaltenAbstand;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const zutatenZeilen = (r.ingredients || []).flatMap((z) => {
      const menge = this._skaliereMenge(z.amount, basisPortionen, this._portionen);
      const mengeText = [menge !== "" ? menge : "", z.unit || ""].filter(Boolean).join(" ");
      return doc.splitTextToSize(`•  ${mengeText ? mengeText + " " : ""}${z.name}`, spaltenBreite);
    });
    // "null" markiert den kleinen Zusatzabstand nach jedem einzelnen Schritt
    // (wie im einspaltigen Layout), damit die Höhenberechnung unten exakt
    // zur späteren Zeichnung passt.
    const schritteZeilen = [];
    schritte.forEach((s, i) => {
      doc.splitTextToSize(`${i + 1}. ${s}`, spaltenBreite).forEach((zeile) => schritteZeilen.push(zeile));
      schritteZeilen.push(null);
    });

    let bildBreiteSpalte = 0;
    let bildHoeheSpalte = 0;
    if (bild) {
      bildBreiteSpalte = spaltenBreite;
      bildHoeheSpalte = bildBreiteSpalte * (bild.hoehe / bild.breite);
      const maxBildHoeheSpalte = 60;
      if (bildHoeheSpalte > maxBildHoeheSpalte) {
        bildHoeheSpalte = maxBildHoeheSpalte;
        bildBreiteSpalte = bildHoeheSpalte * (bild.breite / bild.hoehe);
      }
    }

    const linkeHoehe = (bild ? bildHoeheSpalte + 8 : 0) + 8 + zutatenZeilen.length * 6;
    const rechteHoehe = schritte.length
      ? 8 + schritteZeilen.filter((z) => z !== null).length * 6 + schritteZeilen.filter((z) => z === null).length * 2
      : 0;
    const verfuegbareHoehe = pageHeight - margin - yNachKopf;

    if (Math.max(linkeHoehe, rechteHoehe) <= verfuegbareHoehe) {
      // -- Zweispaltig, passt auf eine Seite --
      const y0 = kopfZeichnen();
      let yLinks = y0;
      if (bild) {
        const bildX = linkeX + (spaltenBreite - bildBreiteSpalte) / 2;
        try {
          doc.addImage(bild.datenUrl, "JPEG", bildX, yLinks, bildBreiteSpalte, bildHoeheSpalte);
          this._pdfWasserzeichenZeichnen(doc, bildX, yLinks, bildBreiteSpalte, bildHoeheSpalte);
        } catch (e) {
          console.error("Rezeptbuch: Bild konnte nicht ins PDF eingefügt werden", e);
        }
        yLinks += bildHoeheSpalte + 8;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(this._t("abschnitt_titel_zutaten"), linkeX, yLinks);
      yLinks += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      zutatenZeilen.forEach((zeile) => {
        doc.text(zeile, linkeX, yLinks);
        yLinks += 6;
      });

      if (schritte.length) {
        let yRechts = y0;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(this._t("abschnitt_titel_zubereitung"), rechteX, yRechts);
        yRechts += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        schritteZeilen.forEach((zeile) => {
          if (zeile === null) {
            yRechts += 2;
            return;
          }
          doc.text(zeile, rechteX, yRechts);
          yRechts += 6;
        });
      }
    } else {
      // -- Fallback: einspaltig, mehrseitenfähig (für längere Rezepte, bei
      // denen die zweispaltige Darstellung nicht auf eine Seite passen
      // würde - lieber zuverlässig über mehrere Seiten als abgeschnitten) --
      let y = margin;
      const neueSeiteFallsNoetig = (benoetigterPlatz = 8) => {
        if (y + benoetigterPlatz > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      if (bild) {
        let bildBreite = usableWidth;
        let bildHoehe = bildBreite * (bild.hoehe / bild.breite);
        const maxBildHoehe = 70;
        if (bildHoehe > maxBildHoehe) {
          // Bei der Höhen-Obergrenze proportional auch die Breite
          // verkleinern (statt nur die Höhe zu kappen) - sonst würde das
          // Bild seitlich verzerrt/gestreckt dargestellt, besonders bei
          // breiten (querformatigen) Fotos.
          bildHoehe = maxBildHoehe;
          bildBreite = bildHoehe * (bild.breite / bild.hoehe);
        }
        const bildX = margin + (usableWidth - bildBreite) / 2;
        try {
          doc.addImage(bild.datenUrl, "JPEG", bildX, y, bildBreite, bildHoehe);
          this._pdfWasserzeichenZeichnen(doc, bildX, y, bildBreite, bildHoehe);
          y += bildHoehe + 8;
        } catch (e) {
          console.error("Rezeptbuch: Bild konnte nicht ins PDF eingefügt werden", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(r.title, margin, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(130);
      doc.text(`${this._portionen} ${this._t("detail_portionen_suffix")}${r.category ? " · " + this._kategorieLabel(r.category) : ""}`, margin, y);
      doc.setTextColor(20);
      y += 8;

      doc.setDrawColor(193, 101, 47);
      doc.setLineWidth(1);
      doc.line(margin, y, margin + 18, y);
      y += 9;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      neueSeiteFallsNoetig(10);
      doc.text(this._t("abschnitt_titel_zutaten"), margin, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      (r.ingredients || []).forEach((z) => {
        const menge = this._skaliereMenge(z.amount, basisPortionen, this._portionen);
        const mengeText = [menge !== "" ? menge : "", z.unit || ""].filter(Boolean).join(" ");
        const zeile = `${mengeText ? mengeText + " " : ""}${z.name}`;
        const zeilen = doc.splitTextToSize(`•  ${zeile}`, usableWidth);
        zeilen.forEach((teil) => {
          neueSeiteFallsNoetig(6);
          doc.text(teil, margin, y);
          y += 6;
        });
      });

      if (schritte.length) {
        y += 4;
        neueSeiteFallsNoetig(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(this._t("abschnitt_titel_zubereitung"), margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        schritte.forEach((s, i) => {
          const zeilen = doc.splitTextToSize(`${i + 1}. ${s}`, usableWidth);
          zeilen.forEach((teil) => {
            neueSeiteFallsNoetig(6);
            doc.text(teil, margin, y);
            y += 6;
          });
          y += 2;
        });
      }
    }

  }

  // Zeichnet das Seitenfuß-Wasserzeichen auf JEDER Seite von "doc" -
  // gemeinsam genutzt von _pdfErstellen (ein Rezept) und _sammelPdfErstellen
  // (mehrere Rezepte hintereinander). `setPage`/`getNumberOfPages` gibt es
  // nur bei der echten jsPDF-Bibliothek, nicht bei den einfachen Fakes in
  // den Tests - dann wird der Fuß einfach nur auf die aktuelle Seite
  // gezeichnet.
  _pdfAlleSeitenWasserzeichenZeichnen(doc, pageWidth, pageHeight, margin) {
    if (typeof doc.internal.getNumberOfPages === "function" && typeof doc.setPage === "function") {
      const seitenAnzahl = doc.internal.getNumberOfPages();
      for (let i = 1; i <= seitenAnzahl; i++) {
        doc.setPage(i);
        this._pdfSeitenfussWasserzeichenZeichnen(doc, pageWidth, pageHeight, margin);
      }
    } else {
      this._pdfSeitenfussWasserzeichenZeichnen(doc, pageWidth, pageHeight, margin);
    }
  }

  async _pdfErstellen(r, bilderMitdrucken = true) {
    const jsPDFKlasse = await this._jsPdfLaden();
    const doc = new jsPDFKlasse({ unit: "mm", format: "a4" });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await this._rezeptContentInPdfZeichnen(doc, r, bilderMitdrucken);
    this._pdfAlleSeitenWasserzeichenZeichnen(doc, pageWidth, pageHeight, margin);

    const dateiname = `${r.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "_")}.pdf`;
    return { blob: doc.output("blob"), dateiname, mimeType: "application/pdf" };
  }

  // Zeichnet die Inhaltsverzeichnis-Seite (Seite 2, NACH dem separaten
  // Deckblatt - siehe _sammelPdfDeckblattZeichnen/_sammelPdfErstellen) für
  // das Sammel-PDF: individueller Kochbuch-Name nochmal (kleiner) oben,
  // darunter die Überschrift "Inhaltsverzeichnis" und eine nummerierte
  // Liste der enthaltenen Rezepttitel. Erwartet, dass `doc` bereits auf der
  // Seite steht, auf der das Verzeichnis erscheinen soll (der Aufrufer legt
  // danach selbst eine neue Seite für das erste Rezept an).
  _sammelPdfInhaltsverzeichnisZeichnen(doc, titel, rezepte, margin, pageWidth) {
    const usableWidth = pageWidth - margin * 2;
    let y = margin + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.splitTextToSize(titel, usableWidth).forEach((zeile) => {
      doc.text(zeile, margin, y);
      y += 10;
    });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(this._t("abschnitt_titel_inhaltsverzeichnis"), margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    rezepte.forEach((r, i) => {
      const zeilen = doc.splitTextToSize(`${i + 1}. ${r.title}`, usableWidth);
      zeilen.forEach((zeile) => {
        doc.text(zeile, margin, y);
        y += 8;
      });
    });
  }

  // Sammel-PDF: exportiert mehrere Rezepte (z.B. die aktuell gefilterte
  // Liste aus der Übersicht) als EIN gemeinsames PDF, ein Rezept pro
  // (mindestens einer) Seite - nutzt dieselbe Zeichenlogik wie der
  // Einzel-Export. Die Portionenzahl wird dabei je Rezept auf dessen
  // Standardportionen zurückgesetzt (die Übersicht hat keine
  // rezeptspezifische Portionenwahl wie die Detailansicht) und danach
  // wiederhergestellt. `optionen.inhaltsverzeichnis` fügt optional zwei
  // Seiten vorne ein: zuerst ein Deckblatt (großer Titel + Bildercollage,
  // siehe _sammelPdfDeckblattZeichnen), danach die Inhaltsverzeichnis-Seite
  // mit der nummerierten Rezeptliste (siehe
  // _sammelPdfInhaltsverzeichnisZeichnen), mit `optionen.titel` als
  // individuellem Kochbuch-Namen auf beiden Seiten. Die Rezepte werden
  // dabei IMMER nach Kategorie (nicht Tag) sortiert, unabhängig von der
  // übergebenen Reihenfolge bzw. der aktuellen Sortierung der Übersicht -
  // siehe _sortiereNachKategorie.
  async _sammelPdfErstellen(rezepte, dateinameBasis, optionen = {}) {
    const rezepteSortiert = this._sortiereNachKategorie(rezepte);
    const jsPDFKlasse = await this._jsPdfLaden();
    const doc = new jsPDFKlasse({ unit: "mm", format: "a4" });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    if (optionen.inhaltsverzeichnis) {
      await this._sammelPdfDeckblattZeichnen(doc, optionen.titel || dateinameBasis, rezepteSortiert, margin, pageWidth, pageHeight, optionen.bilderMitdrucken !== false);
      doc.addPage();
      this._sammelPdfInhaltsverzeichnisZeichnen(doc, optionen.titel || dateinameBasis, rezepteSortiert, margin, pageWidth);
    }

    const portionenVorher = this._portionen;
    try {
      for (let i = 0; i < rezepteSortiert.length; i++) {
        if (i > 0 || optionen.inhaltsverzeichnis) doc.addPage();
        this._portionen = rezepteSortiert[i].servings || 1;
        await this._rezeptContentInPdfZeichnen(doc, rezepteSortiert[i], optionen.bilderMitdrucken !== false);
      }
    } finally {
      this._portionen = portionenVorher;
    }

    this._pdfAlleSeitenWasserzeichenZeichnen(doc, pageWidth, pageHeight, margin);

    const dateiname = `${dateinameBasis.replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "_")}.pdf`;
    return { blob: doc.output("blob"), dateiname, mimeType: "application/pdf" };
  }

  async _htmlDateiErstellen(r, bilderMitdrucken = true) {
    const basisPortionen = r.servings || 1;
    const zeilenHtml = (r.ingredients || [])
      .map((z) => {
        const menge = this._skaliereMenge(z.amount, basisPortionen, this._portionen);
        const mengeText = [menge !== "" ? menge : "", z.unit || ""].filter(Boolean).join(" ");
        return `<li>${mengeText ? `<strong>${this._escape(mengeText)}</strong> ` : ""}${this._escape(z.name)}</li>`;
      })
      .join("");
    const schritteHtml = (r.steps || [])
      .filter((s) => s && s.trim())
      .map((s) => `<li>${this._escape(s)}</li>`)
      .join("");
    // Bilddaten als Data-URL einbetten statt nur den Pfad zu verlinken - die
    // erzeugte HTML-Datei wird eigenständig geteilt/heruntergeladen und hat
    // dann keinen Zugriff mehr auf die Home-Assistant-Instanz, um ein
    // "/local/..."-Bild nachzuladen.
    const bild = (bilderMitdrucken && r.image) ? await this._bildAlsDatenUrlLaden(r.image) : null;
    // Dezenter "Rezeptbuch-Card"-Schriftzug unten rechts im Bild - nur in
    // dieser eigenständig geteilten/gedruckten Datei, nicht im normalen
    // Bild in der App selbst.
    const bildHtml = bild
      ? `<div class="bild-wrapper"><img src="${bild.datenUrl}" alt=""><span class="wasserzeichen">Rezeptbuch-Card</span></div>`
      : "";

    const htmlDatei = `<!DOCTYPE html>
<html lang="${this._sprache()}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${this._escape(r.title)}</title>
<style>
  body {
    font-family: Georgia, "Times New Roman", serif; max-width: 700px; margin: 30px auto;
    padding: 0 20px; color: #2b2b2b; background: #fdfbf8;
  }
  .bild-wrapper { position: relative; margin-bottom: 20px; }
  .bild-wrapper img { width: 100%; max-height: 340px; object-fit: cover; border-radius: 12px; display: block; }
  .wasserzeichen {
    position: absolute; right: 10px; bottom: 10px; background: rgba(20, 20, 20, 0.55);
    color: rgba(255, 255, 255, 0.9); font-size: 11px; padding: 3px 8px; border-radius: 4px;
    font-family: Georgia, "Times New Roman", serif;
  }
  h1 { font-size: 1.9em; margin: 0 0 4px; }
  .meta { color: #8a8a8a; margin-bottom: 22px; font-size: 0.95em; }
  hr { border: none; height: 3px; width: 56px; background: #c1652f; border-radius: 2px; margin: 0 0 22px; }
  h2 { font-size: 1.25em; border-bottom: 2px solid #c1652f; padding-bottom: 5px; margin-top: 30px; color: #2b2b2b; }
  ul, ol { padding-left: 22px; }
  li { margin-bottom: 10px; line-height: 1.55; }
  ul li strong { color: #a8541f; }
  @media print { body { background: #fff; margin: 0; padding: 15px; } }
</style>
</head>
<body>
  ${bildHtml}
  <h1>${this._escape(r.title)}</h1>
  <div class="meta">${this._portionen} ${this._t("detail_portionen_suffix")}${r.category ? " · " + this._escape(this._kategorieLabel(r.category)) : ""}</div>
  <hr>
  <h2>${this._t("abschnitt_titel_zutaten")}</h2>
  <ul>${zeilenHtml || `<li>${this._t("keine_zutaten")}</li>`}</ul>
  ${schritteHtml ? `<h2>${this._t("abschnitt_titel_zubereitung")}</h2><ol>${schritteHtml}</ol>` : ""}
</body>
</html>`;

    const dateiname = `${r.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "_")}.html`;
    return { blob: new Blob([htmlDatei], { type: "text/html" }), dateiname, mimeType: "text/html" };
  }

  async _rezeptDrucken(r, bilderMitdrucken = true) {
    try {
      let ergebnis;
      try {
        ergebnis = await this._pdfErstellen(r, bilderMitdrucken);
      } catch (pdfFehler) {
        console.error("Rezeptbuch: PDF-Erstellung fehlgeschlagen, nutze HTML als Rückfallebene", pdfFehler);
        ergebnis = await this._htmlDateiErstellen(r, bilderMitdrucken);
      }
      const { blob, dateiname, mimeType } = ergebnis;

      // Bevorzugt: Datei direkt teilen
      if (navigator.canShare) {
        const datei = new File([blob], dateiname, { type: mimeType });
        if (navigator.canShare({ files: [datei] })) {
          try {
            await navigator.share({ title: r.title, files: [datei] });
            return;
          } catch (e) {
            if (e.name === "AbortError") return;
            console.error("Rezeptbuch: Datei-Teilen fehlgeschlagen, versuche Text-Teilen", e);
          }
        }
      }

      // Nächster Versuch: als reinen Text teilen (ohne Bild/Formatierung,
      // aber funktioniert auf mehr Geräten)
      if (navigator.share) {
        const basisPortionen = r.servings || 1;
        const zutatenText = (r.ingredients || [])
          .map((z) => {
            const menge = this._skaliereMenge(z.amount, basisPortionen, this._portionen);
            const mengeText = [menge !== "" ? menge : "", z.unit || ""].filter(Boolean).join(" ");
            return `- ${mengeText ? mengeText + " " : ""}${z.name}`;
          })
          .join("\n");
        const schritteText = (r.steps || [])
          .filter((s) => s && s.trim())
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n\n");
        const volltext = `${r.title}\n${this._portionen} ${this._t("detail_portionen_suffix")}\n\n${this._t("teilen_ueberschrift_zutaten")}\n${zutatenText}\n\n${this._t("teilen_ueberschrift_zubereitung")}\n${schritteText}`;
        try {
          await navigator.share({ title: r.title, text: volltext });
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
          console.error("Rezeptbuch: Text-Teilen fehlgeschlagen, nutze Download", e);
        }
      }

      // Letzte Rückfallebene: In eingebetteten WebViews ohne Web-Share-API
      // (z. B. der Home-Assistant-App) wird ein unsichtbarer <a download>-Link
      // oft stillschweigend ignoriert - es passiert dann scheinbar gar nichts.
      // window.open() mit target="_blank" wird von solchen Apps hingegen meist
      // an den System-Browser/-PDF-Betrachter weitergegeben, wo sich die Datei
      // normal öffnen, speichern, teilen oder drucken lässt. Nur falls das vom
      // Popup-Blocker verhindert wird (window.open liefert dann null/undefined),
      // greift als letzter Versuch der klassische Download-Link.
      const url = URL.createObjectURL(blob);
      const neuesFenster = window.open(url, "_blank");
      if (!neuesFenster) {
        const a = document.createElement("a");
        a.href = url;
        a.download = dateiname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      // Verzögert freigeben statt sofort - das neue Fenster/Tab braucht die
      // Blob-URL noch, um die Datei tatsächlich zu laden.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (fehler) {
      console.error("Rezeptbuch: Teilen/Drucken fehlgeschlagen", fehler);
      this._hinweis(this._t("fehler_teilen_drucken", { fehler: fehler.message || fehler }));
    }
  }

  // Öffnet das Sammel-PDF-Modal. Ablauf in bis zu vier Schritten:
  // 1. "wahl"    - Alle aktuell gefilterten Rezepte oder eine Auswahl?
  // 2. "auswahl" - (nur bei "Auswahl") Checkliste der gefilterten Rezepte.
  // 3. "frage"   - Inhaltsverzeichnis-Seite ja/nein?
  // 4. "name"    - (nur bei "Ja") individueller Kochbuch-Name.
  // Nur wenn es überhaupt Rezepte zu exportieren gibt; sonst wie beim
  // direkten Export der Hinweis "keine Rezepte" statt eines leeren Modals.
  _sammelPdfModalOeffnen() {
    const liste = this._sortiereRezepte(this._gefilterteRezepte());
    if (!liste.length) {
      this._hinweis(this._t("sammel_pdf_keine_rezepte"));
      return;
    }
    this._sammelPdfGefilterteListe = liste;
    this._sammelPdfAusgewaehlteUids = new Set();
    this._sammelPdfWahlModus = "alle";
    const nameFeld = this.shadowRoot.getElementById("sammel-pdf-name-feld");
    if (nameFeld) nameFeld.value = "";
    // Bild-Checkbox bei jedem Öffnen frisch auf "an" zurücksetzen, damit eine
    // frühere Abwahl nicht unbemerkt für den nächsten Export übernommen wird.
    const bilderCheckbox = this.shadowRoot.getElementById("sammel-pdf-bilder-checkbox");
    if (bilderCheckbox) bilderCheckbox.checked = true;
    this._sammelPdfSchrittZeigen("wahl");
    const modal = this.shadowRoot.getElementById("sammel-pdf-modal");
    if (modal) modal.style.display = "flex";
  }

  // Blendet innerhalb des offenen Sammel-PDF-Modals genau den angegebenen
  // Schritt ein und alle anderen aus (siehe _sammelPdfModalOeffnen).
  _sammelPdfSchrittZeigen(schritt) {
    const boxenProSchritt = {
      wahl: "sammel-pdf-wahl-box",
      auswahl: "sammel-pdf-auswahl-box",
      frage: "sammel-pdf-frage-box",
      name: "sammel-pdf-name-box",
    };
    Object.entries(boxenProSchritt).forEach(([key, id]) => {
      const box = this.shadowRoot.getElementById(id);
      if (box) box.style.display = key === schritt ? "block" : "none";
    });
  }

  _sammelPdfModalSchliessen() {
    const modal = this.shadowRoot.getElementById("sammel-pdf-modal");
    if (modal) modal.style.display = "none";
  }

  // Zeichnet die Checkliste der aktuell gefilterten Rezepte im
  // "auswahl"-Schritt neu (z.B. nach "Alle auswählen"/"Keine auswählen"
  // oder beim ersten Öffnen dieses Schritts).
  _sammelPdfAuswahlListeRendern() {
    const container = this.shadowRoot.getElementById("sammel-pdf-auswahl-liste");
    if (!container) return;
    container.innerHTML = (this._sammelPdfGefilterteListe || [])
      .map((r) => `
        <label class="sammel-pdf-auswahl-zeile">
          <input type="checkbox" data-uid="${r.uid}" ${this._sammelPdfAusgewaehlteUids.has(r.uid) ? "checked" : ""}>
          <span>${this._escape(r.title)}</span>
        </label>
      `)
      .join("");
    container.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) this._sammelPdfAusgewaehlteUids.add(checkbox.dataset.uid);
        else this._sammelPdfAusgewaehlteUids.delete(checkbox.dataset.uid);
      });
    });
  }

  // Ermittelt anhand von _sammelPdfWahlModus, welche Rezepte tatsächlich
  // exportiert werden sollen: bei "alle" die gesamte gefilterte Liste, bei
  // "auswahl" nur die vom Nutzer angehakten Rezepte (in derselben
  // Reihenfolge wie in der gefilterten Liste).
  _sammelPdfExportListeErmitteln() {
    if (this._sammelPdfWahlModus === "auswahl") {
      return (this._sammelPdfGefilterteListe || []).filter((r) => this._sammelPdfAusgewaehlteUids.has(r.uid));
    }
    return this._sammelPdfGefilterteListe || [];
  }

  // Sammel-PDF: exportiert alle AKTUELL GEFILTERTEN Rezepte (Suche/
  // Kategorie/Tags/Kochbuch aus der Übersicht, aber unabhängig von der
  // Seiten-Paginierung) als ein einziges PDF - z.B. für einen Ausdruck
  // mehrerer Rezepte auf einmal. Dieselbe window.open()-Zustellung wie
  // beim Teilen/Drucken eines einzelnen Rezepts (siehe dort für die
  // Begründung: zuverlässiger als ein unsichtbarer Download-Link,
  // besonders in eingebetteten WebViews wie der Home-Assistant-App).
  // `optionen.inhaltsverzeichnis`/`optionen.titel` steuern die optionale
  // Deckblatt-/Inhaltsverzeichnis-Seite (siehe _sammelPdfModalOeffnen).
  // `optionen.rezepte` gibt optional die tatsächlich zu exportierende
  // Rezeptliste vor (z.B. eine vom Nutzer im Modal getroffene Auswahl aus
  // _sammelPdfExportListeErmitteln) - ohne das fällt die Methode wie bisher
  // auf alle aktuell gefilterten Rezepte zurück.
  async _sammelPdfExport(optionen = {}) {
    const liste = optionen.rezepte || this._sortiereRezepte(this._gefilterteRezepte());
    if (!liste.length) {
      this._hinweis(this._t("sammel_pdf_keine_rezepte"));
      return;
    }
    try {
      const datum = new Date().toISOString().slice(0, 10);
      const { blob, dateiname } = await this._sammelPdfErstellen(liste, `Rezeptbuch_${datum}`, optionen);
      const url = URL.createObjectURL(blob);
      const neuesFenster = window.open(url, "_blank");
      if (!neuesFenster) {
        const a = document.createElement("a");
        a.href = url;
        a.download = dateiname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (fehler) {
      console.error("Rezeptbuch: Sammel-PDF-Export fehlgeschlagen", fehler);
      this._hinweis(this._t("fehler_teilen_drucken", { fehler: fehler.message || fehler }));
    }
  }

  _renderDetail(stil) {
    const r = this._aktivesRezept;
    const basisPortionen = r.servings || 1;
    const fotos = this._rezeptFotos(r);
    // alt="": der Rezepttitel folgt direkt als <h1> unter dem Foto (siehe
    // unten) - ein beschreibender Alt-Text würde ihn nur doppelt vorlesen.
    // Mehrere Fotos: darunter ein Vorschaustreifen, ein Klick tauscht das
    // große Bild aus.
    const bild = fotos.length
      ? `<div class="detail-bildbox"><img class="detail-bild" id="detail-hauptbild" src="${this._escape(fotos[0])}" alt=""></div>` +
        (fotos.length > 1
          ? `<div class="foto-streifen">${fotos.map((f, i) => `<button type="button" class="foto-streifen-btn ${i === 0 ? "aktiv" : ""}" data-foto-index="${i}" aria-label="${this._t("detail_foto_aria", { nummer: i + 1, anzahl: fotos.length })}"><img ${this._bildAttribute(f, "64px")} alt=""></button>`).join("")}</div>`
          : "")
      : "";
    // "zutat-fehlt-checkbox" + data-index: erlaubt, einzelne fehlende
    // Zutaten auszuwählen und NUR diese (statt zwangsläufig das ganze
    // Rezept) in die Einkaufsliste zu übernehmen (siehe
    // "zutaten-fehlend-einkaufsliste-btn" weiter unten sowie
    // _einkaufslisteZeilenAnlegen). data-index verweist auf die Position
    // in r.ingredients - innerhalb dieses einen Render-Durchlaufs stabil.
    const zeilen = (r.ingredients || [])
      .map((z, i) => {
        const menge = this._skaliereMenge(z.amount, basisPortionen, this._portionen);
        const mengeText = [menge !== "" ? menge : "", z.unit || ""].filter(Boolean).join(" ");
        return `<li><label class="zutat-fehlt-label"><input type="checkbox" class="zutat-fehlt-checkbox" data-index="${i}">${mengeText ? `<span class="zutat-menge-chip">${this._escape(mengeText)}</span>` : ""}<span class="zutat-name">${this._escape(z.name)}</span></label></li>`;
      })
      .join("");

    const schritte = (r.steps || []).filter((s) => s && s.trim());
    const schritteListe = schritte.map((s) => `<li>${this._escape(s)}</li>`).join("");

    // Kochmodus-Zustand ist rezeptübergreifend auf der Karteninstanz
    // gespeichert (siehe Konstruktor/_kochmodusZuruecksetzen) - hier vor dem
    // Rendern auf den gültigen Bereich klemmen, falls sich die Schrittzahl
    // seit dem letzten Rendern verringert hat (z.B. nach einer Bearbeitung).
    if (this._kochmodusSchrittIndex >= schritte.length) {
      this._kochmodusSchrittIndex = Math.max(0, schritte.length - 1);
    }

    const { durchschnitt, anzahl } = this._durchschnittsBewertung(r.ratings);
    const eigeneId = this._hass.user ? this._hass.user.id : null;
    const eigeneBewertung = eigeneId && r.ratings ? (r.ratings[eigeneId] || 0) : 0;
    const darfBearbeiten = this._darfBearbeiten(r);

    const kommentarZeilen = (r.comments || [])
      .map((k, i) => {
        if (this._kommentarBearbeitungIndex === i) {
          // Bearbeiten-Modus: eigenes Textfeld statt der normalen Anzeige -
          // data-index verweist auf die Position in r.comments (innerhalb
          // dieses einen Render-Durchlaufs stabil, siehe Kommentar bei den
          // zugehörigen Event-Handlern weiter unten).
          return `<li>
              <span class="kommentar-autor">${this._escape(k.author)}</span><span class="kommentar-zeit">${this._formatZeit(k.zeit)}</span>
              <textarea class="kommentar-bearbeiten-feld" data-index="${i}">${this._escape(k.text)}</textarea>
              <div class="kommentar-aktionen">
                <button class="sekundaer klein kommentar-speichern-btn" data-index="${i}">${this._t("allgemein_speichern")}</button>
                <button class="sekundaer klein kommentar-abbrechen-btn" data-index="${i}">${this._t("allgemein_abbrechen")}</button>
              </div>
            </li>`;
        }
        const darfKommentarBearbeiten = this._kommentarDarfBearbeiten(k);
        return `<li>
            <span class="kommentar-autor">${this._escape(k.author)}</span><span class="kommentar-zeit">${this._formatZeit(k.zeit)}</span>
            <div class="kommentar-text">${this._escape(k.text)}</div>
            ${darfKommentarBearbeiten ? `
              <div class="kommentar-aktionen">
                <button class="sekundaer klein kommentar-bearbeiten-btn" data-index="${i}">${this._t("allgemein_bearbeiten")}</button>
                <button class="gefahr klein kommentar-loeschen-btn" data-index="${i}">${this._t("allgemein_loeschen")}</button>
              </div>
            ` : ""}
          </li>`;
      })
      .join("");

    this.shadowRoot.innerHTML = `
      ${stil}
      <ha-card>
       <div class="eng detail-breit">
        <div class="kopf">
          <button class="sekundaer" id="zurueck-btn">${this._t("allgemein_zurueck")}</button>
          <button class="sekundaer" id="drucken-btn">${this._t("detail_teilen_drucken_btn")}</button>
          ${schritte.length ? `<button class="sekundaer" id="kochmodus-btn">${this._t("detail_kochmodus_btn")}</button>` : ""}
          ${this._istAmerikanischeKategorie(r.category) ? `<button class="sekundaer" id="detail-umrechnungstabelle-btn">${this._t("umrechnungstabelle_btn")}</button>` : ""}
        </div>
        <h2 class="detail-titel">${this._escape(r.title)}</h2>
        <div class="kategorie-badge">🏷️ ${this._escape(this._kategorieLabel(r.category || "Sonstiges"))}</div>
        ${r.creatorName ? `<div class="ersteller-zeile">${this._t("detail_erstellt_von", { name: this._escape(r.creatorName) })}</div>` : ""}
        <hr class="detail-trenner">

        <div class="bewertung-zeile">
          ${this._sterneHtml(durchschnitt)}
          <span>${anzahl > 0 ? this._t(anzahl === 1 ? "detail_bewertung_singular" : "detail_bewertung_plural", { durchschnitt, anzahl }) : this._t("detail_keine_bewertungen")}</span>
        </div>
        <div class="bewertung-zeile">
          <span>${this._t("detail_deine_bewertung")}</span> ${this._sterneInteraktivHtml(eigeneBewertung)}
        </div>
        ${(r.cookLog || []).length > 0 ? `<div class="bewertung-zeile">${this._t("detail_zubereitet_x", { anzahl: r.cookLog.length })}</div>` : ""}

        <!-- Auf schmalen Bildschirmen (Handy) untereinander wie bisher, auf
             breiten Bildschirmen (z.B. Wandtablet im Querformat in der Küche)
             nebeneinander: links Bild+Zutaten, rechts die Zubereitung - siehe
             .detail-zwei-spalten weiter unten. Damit entfällt auf breiten
             Displays das lange Scrollen durch einen einzelnen schmalen
             "Schlauch". -->
        <div class="detail-zwei-spalten" id="detail-zwei-spalten">
          <div class="detail-spalte-links">
            ${bild}
            <div class="portionen-zeile">
              <button id="minus-btn">−</button>
              <span><strong>${this._portionen}</strong> ${this._t("detail_portionen_suffix")}</span>
              <button id="plus-btn">+</button>
            </div>
            <h3 class="abschnitt-titel">${this._t("abschnitt_titel_zutaten")}</h3>
            <ul class="zutaten-liste">${zeilen || `<li>${this._t("keine_zutaten")}</li>`}</ul>
            ${(r.ingredients || []).length ? `<button type="button" class="sekundaer klein" id="zutaten-fehlend-einkaufsliste-btn">${this._t("zutaten_fehlend_einkaufsliste_btn")}</button>` : ""}
          </div>
          ${schritteListe ? `
          <div class="detail-spalte-rechts">
            <h3 class="abschnitt-titel">${this._t("abschnitt_titel_zubereitung")}</h3>
            <ol class="schritte-liste">${schritteListe}</ol>
          </div>` : ""}
        </div>

        <h3 class="abschnitt-titel">${this._t("detail_kommentare_titel")}${(r.comments || []).length ? ` (${r.comments.length})` : ""}</h3>
        <ul class="kommentar-liste">
          ${kommentarZeilen || `<li style="border:none; color:var(--secondary-text-color);">${this._t("detail_keine_kommentare")}</li>`}
        </ul>
        <div class="kommentar-formular">
          <textarea id="kommentar-feld" placeholder="${this._t("detail_kommentar_placeholder")}"></textarea>
          <button class="sekundaer" id="kommentar-senden-btn">${this._t("detail_kommentar_hinzufuegen_btn")}</button>
        </div>

        ${darfBearbeiten ? `
          <div class="aktionen">
            <button class="sekundaer" id="bearbeiten-btn">${this._t("allgemein_bearbeiten")}</button>
            <button class="gefahr" id="loeschen-btn">${this._t("allgemein_loeschen")}</button>
          </div>
        ` : `<div class="bearbeiten-hinweis">${this._t("detail_bearbeiten_hinweis", { name: r.creatorName ? this._escape(r.creatorName) : this._t("detail_ersteller_unbekannt") })}</div>`}
       </div>

        <div class="modal-overlay" id="drucken-bilder-modal" style="display:none;">
          <div class="modal-box">
            <p>${this._t("modal_drucken_bild_frage")}</p>
            <div class="modal-aktionen">
              <button class="sekundaer" id="drucken-bilder-nein-btn">${this._t("modal_drucken_ohne_bild_btn")}</button>
              <button class="primaer" id="drucken-bilder-ja-btn">${this._t("modal_drucken_mit_bild_btn")}</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="zubereitet-modal" style="display:none;">
          <div class="modal-box">
            <p>${this._t("modal_zubereitet_frage", { titel: this._escape(r.title) })}</p>
            <div class="modal-aktionen">
              <button class="sekundaer" id="modal-nein-btn">${this._t("allgemein_nein")}</button>
              <button class="primaer" id="modal-ja-btn">${this._t("allgemein_ja")}</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="loeschen-modal" style="display:none;">
          <div class="modal-box">
            <p>${this._t("modal_loeschen_frage", { titel: this._escape(r.title) })}</p>
            <div class="modal-aktionen">
              <button class="sekundaer" id="loeschen-modal-nein-btn">${this._t("allgemein_nein")}</button>
              <button class="gefahr" id="loeschen-modal-ja-btn">${this._t("modal_loeschen_ja_btn")}</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="kommentar-loeschen-modal" style="display:none;">
          <div class="modal-box">
            <p>${this._t("modal_kommentar_loeschen_frage")}</p>
            <div class="modal-aktionen">
              <button class="sekundaer" id="kommentar-loeschen-modal-nein-btn">${this._t("allgemein_nein")}</button>
              <button class="gefahr" id="kommentar-loeschen-modal-ja-btn">${this._t("modal_loeschen_ja_btn")}</button>
            </div>
          </div>
        </div>

        ${schritte.length ? `
        <div class="kochmodus-overlay" id="kochmodus-overlay" style="display:${this._kochmodusAktiv ? "flex" : "none"};">
          <div class="kochmodus-kopf">
            <h3 class="kochmodus-titel">${this._escape(r.title)}</h3>
            <button class="kochmodus-schliessen-btn" id="kochmodus-schliessen-btn" aria-label="${this._t("kochmodus_schliessen_aria")}">✕</button>
          </div>
          <div class="kochmodus-werkzeuge">
            <button class="sekundaer klein${this._kochmodusZutatenSichtbar ? " aktiv" : ""}" id="kochmodus-zutaten-btn" aria-label="${this._t(this._kochmodusZutatenSichtbar ? "kochmodus_zutaten_aus_aria" : "kochmodus_zutaten_ein_aria")}">🥕 ${this._t("abschnitt_titel_zutaten")}</button>
            <button class="sekundaer klein${this._kochmodusTimerPanelSichtbar ? " aktiv" : ""}" id="kochmodus-timer-btn" aria-label="${this._t(this._kochmodusTimerPanelSichtbar ? "kochmodus_timer_aus_aria" : "kochmodus_timer_ein_aria")}">⏱${this._kochmodusTimerEndeZeitpunkt ? ` <span class="kochmodus-timer-badge">${this._kochmodusTimerRestAnzeige()}</span>` : this._kochmodusTimerAbgelaufen ? " ⏰" : ""}</button>
            ${this._istAmerikanischeKategorie(r.category) ? `<button class="sekundaer klein" id="kochmodus-umrechnungstabelle-btn">${this._t("umrechnungstabelle_btn")}</button>` : ""}
          </div>
          ${this._kochmodusZutatenSichtbar ? `
            <div class="kochmodus-zutaten-panel">
              <h4>${this._t("abschnitt_titel_zutaten")}</h4>
              <ul>${zeilen || `<li>${this._t("keine_zutaten")}</li>`}</ul>
            </div>
          ` : ""}
          ${this._kochmodusTimerPanelSichtbar ? `
            <div class="kochmodus-timer-panel">
              ${this._kochmodusTimerAbgelaufen ? `
                <div class="kochmodus-timer-abgelaufen">
                  <span>${this._t("kochmodus_timer_abgelaufen_text")}</span>
                  <button class="primaer klein" id="kochmodus-timer-ok-btn">${this._t("kochmodus_timer_ok_btn")}</button>
                </div>
              ` : this._kochmodusTimerEndeZeitpunkt ? `
                <div class="kochmodus-timer-laufend">
                  <span class="kochmodus-timer-rest" aria-live="polite">${this._kochmodusTimerRestAnzeige()}</span>
                  <button class="sekundaer klein" id="kochmodus-timer-abbrechen-btn">${this._t("kochmodus_timer_abbrechen_btn")}</button>
                </div>
              ` : `
                <div class="kochmodus-timer-presets">
                  ${[1, 5, 10, 15, 20].map((m) => `<button class="sekundaer klein kochmodus-timer-preset-btn" data-minuten="${m}" aria-label="${this._t("kochmodus_timer_preset_aria", { minuten: m })}">${m} min</button>`).join("")}
                </div>
                <div class="kochmodus-timer-eigene">
                  <input type="number" id="kochmodus-timer-minuten-input" min="1" step="1" value="5" aria-label="${this._t("kochmodus_timer_minuten_aria")}">
                  <button class="primaer klein" id="kochmodus-timer-start-btn">${this._t("kochmodus_timer_start_btn")}</button>
                </div>
              `}
            </div>
          ` : ""}
          <div class="kochmodus-body">
            <div class="kochmodus-schritt-anzeige">${this._t("kochmodus_schritt_anzeige", { aktuell: this._kochmodusSchrittIndex + 1, gesamt: schritte.length })}</div>
            <div class="kochmodus-schritt-text">${this._escape(schritte[this._kochmodusSchrittIndex] || "")}</div>
          </div>
          <div class="kochmodus-fuss">
            <button class="sekundaer kochmodus-nav-btn" id="kochmodus-zurueck-btn" aria-label="${this._t("kochmodus_schritt_zurueck_aria")}" ${this._kochmodusSchrittIndex === 0 ? "disabled" : ""}>‹</button>
            <button class="primaer kochmodus-nav-btn" id="kochmodus-weiter-btn" aria-label="${this._t("kochmodus_schritt_weiter_aria")}" ${this._kochmodusSchrittIndex >= schritte.length - 1 ? "disabled" : ""}>›</button>
          </div>
        </div>
        ` : ""}
        ${this._istAmerikanischeKategorie(r.category) ? this._umrechnungstabelleModalHtml() : ""}
      </ha-card>
    `;

    if (this._istAmerikanischeKategorie(r.category)) {
      this._umrechnungstabelleVerdrahten(["detail-umrechnungstabelle-btn", "kochmodus-umrechnungstabelle-btn"]);
    }

    this.shadowRoot.querySelectorAll(".foto-streifen-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hauptbild = this.shadowRoot.getElementById("detail-hauptbild");
        const foto = fotos[parseInt(btn.dataset.fotoIndex, 10)];
        if (!hauptbild || !foto) return;
        hauptbild.src = foto;
        this.shadowRoot.querySelectorAll(".foto-streifen-btn").forEach((b) => b.classList.toggle("aktiv", b === btn));
      });
    });

    this.shadowRoot.getElementById("zurueck-btn").addEventListener("click", () => {
      if (this._zubereitetAbfrageAktiv()) {
        this._zubereitetModalAnzeigen();
      } else {
        this._navigationZurueck();
      }
    });
    this.shadowRoot.getElementById("drucken-btn").addEventListener("click", () => {
      // Die Nachfrage lohnt sich nur, wenn überhaupt ein Bild vorhanden ist -
      // ohne Bild sofort wie bisher direkt teilen/drucken, ohne unnötigen
      // Zwischenschritt.
      if (!r.image) {
        this._rezeptDrucken(r);
        return;
      }
      this.shadowRoot.getElementById("drucken-bilder-modal").style.display = "flex";
    });
    const druckenBilderJaBtn = this.shadowRoot.getElementById("drucken-bilder-ja-btn");
    if (druckenBilderJaBtn) {
      druckenBilderJaBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("drucken-bilder-modal").style.display = "none";
        this._rezeptDrucken(r, true);
      });
    }
    const druckenBilderNeinBtn = this.shadowRoot.getElementById("drucken-bilder-nein-btn");
    if (druckenBilderNeinBtn) {
      druckenBilderNeinBtn.addEventListener("click", () => {
        this.shadowRoot.getElementById("drucken-bilder-modal").style.display = "none";
        this._rezeptDrucken(r, false);
      });
    }
    const kochmodusBtn = this.shadowRoot.getElementById("kochmodus-btn");
    if (kochmodusBtn) {
      kochmodusBtn.addEventListener("click", () => this._kochmodusOeffnen());
    }
    const kochmodusSchliessenBtn = this.shadowRoot.getElementById("kochmodus-schliessen-btn");
    if (kochmodusSchliessenBtn) {
      kochmodusSchliessenBtn.addEventListener("click", () => this._kochmodusSchliessen());
    }
    const kochmodusZutatenBtn = this.shadowRoot.getElementById("kochmodus-zutaten-btn");
    if (kochmodusZutatenBtn) {
      kochmodusZutatenBtn.addEventListener("click", () => {
        this._kochmodusZutatenSichtbar = !this._kochmodusZutatenSichtbar;
        this._render();
      });
    }
    const kochmodusTimerBtn = this.shadowRoot.getElementById("kochmodus-timer-btn");
    if (kochmodusTimerBtn) {
      kochmodusTimerBtn.addEventListener("click", () => {
        this._kochmodusTimerPanelSichtbar = !this._kochmodusTimerPanelSichtbar;
        this._render();
      });
    }
    const kochmodusTimerStartBtn = this.shadowRoot.getElementById("kochmodus-timer-start-btn");
    if (kochmodusTimerStartBtn) {
      kochmodusTimerStartBtn.addEventListener("click", () => {
        const eingabe = this.shadowRoot.getElementById("kochmodus-timer-minuten-input");
        this._kochmodusTimerStarten(eingabe ? eingabe.value : 5);
      });
    }
    this.shadowRoot.querySelectorAll(".kochmodus-timer-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._kochmodusTimerStarten(btn.dataset.minuten));
    });
    const kochmodusTimerAbbrechenBtn = this.shadowRoot.getElementById("kochmodus-timer-abbrechen-btn");
    if (kochmodusTimerAbbrechenBtn) {
      kochmodusTimerAbbrechenBtn.addEventListener("click", () => this._kochmodusTimerAbbrechen());
    }
    const kochmodusTimerOkBtn = this.shadowRoot.getElementById("kochmodus-timer-ok-btn");
    if (kochmodusTimerOkBtn) {
      kochmodusTimerOkBtn.addEventListener("click", () => this._kochmodusTimerBestaetigen());
    }
    const kochmodusZurueckBtn = this.shadowRoot.getElementById("kochmodus-zurueck-btn");
    if (kochmodusZurueckBtn) {
      kochmodusZurueckBtn.addEventListener("click", () => this._kochmodusSchrittWechseln(-1));
    }
    const kochmodusWeiterBtn = this.shadowRoot.getElementById("kochmodus-weiter-btn");
    if (kochmodusWeiterBtn) {
      kochmodusWeiterBtn.addEventListener("click", () => this._kochmodusSchrittWechseln(1));
    }
    this.shadowRoot.getElementById("modal-nein-btn").addEventListener("click", () => this._navigationZurueck());
    this.shadowRoot.getElementById("modal-ja-btn").addEventListener("click", (e) => {
      e.target.disabled = true;
      this._rezeptAlsZubereitetMarkieren(r);
    });
    this.shadowRoot.getElementById("minus-btn").addEventListener("click", () => {
      this._portionen = Math.max(1, this._portionen - 1);
      this._render();
    });
    this.shadowRoot.getElementById("plus-btn").addEventListener("click", () => {
      this._portionen = this._portionen + 1;
      this._render();
    });

    // Fehlende Zutaten direkt aus dem Rezept heraus in die Einkaufsliste:
    // nur die per Checkbox ausgewählten Zeilen, nicht automatisch das
    // ganze Rezept (siehe _einkaufslisteErstellen für "alle Zutaten eines
    // Rezepts"). Verwendet die aktuell eingestellte Portionenzahl, nicht
    // die Grundmenge - wer z.B. auf 2 Portionen hochgerechnet hat, soll
    // auch genau diese Menge einkaufen.
    const zutatenFehlendBtn = this.shadowRoot.getElementById("zutaten-fehlend-einkaufsliste-btn");
    if (zutatenFehlendBtn) {
      zutatenFehlendBtn.addEventListener("click", async () => {
        const ausgewaehlteIndices = Array.from(this.shadowRoot.querySelectorAll(".zutat-fehlt-checkbox:checked"))
          .map((cb) => parseInt(cb.dataset.index, 10));
        if (ausgewaehlteIndices.length === 0) {
          this._hinweis(this._t("fehler_einkaufsliste_keine_auswahl_zutaten"));
          return;
        }
        if (!this._einkaufslisteEntity()) {
          this._hinweis(this._t("fehler_einkaufsliste_keine_konfiguration"));
          return;
        }
        const zeilen = ausgewaehlteIndices
          .map((i) => r.ingredients[i])
          .filter(Boolean)
          .map((z) => {
            const menge = this._skaliereMenge(z.amount, basisPortionen, this._portionen);
            return [menge !== "" ? menge : "", z.unit || "", z.name].filter(Boolean).join(" ");
          });
        await this._einkaufslisteZeilenAnlegen(zeilen);
      });
    }

    // "button" statt "span" (siehe _sterneInteraktivHtml) - click deckt dabei
    // automatisch auch die per Tastatur (Enter/Leertaste) ausgelöste
    // Aktivierung eines fokussierten <button> mit ab, kein separater
    // keydown-Handler nötig.
    const eigeneSterneEl = this.shadowRoot.getElementById("eigene-sterne");
    if (eigeneSterneEl) {
      eigeneSterneEl.querySelectorAll("button[data-wert]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wert = parseInt(btn.dataset.wert, 10);
          this._bewertungSetzen(wert);
        });
      });
    }

    const kommentarBtn = this.shadowRoot.getElementById("kommentar-senden-btn");
    kommentarBtn.addEventListener("click", () => {
      const feld = this.shadowRoot.getElementById("kommentar-feld");
      if (!feld.value.trim()) return;
      kommentarBtn.disabled = true;
      this._kommentarHinzufuegen(feld.value).finally(() => {
        kommentarBtn.disabled = false;
      });
    });

    this.shadowRoot.querySelectorAll(".kommentar-bearbeiten-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._kommentarBearbeiten(parseInt(btn.dataset.index, 10)));
    });
    this.shadowRoot.querySelectorAll(".kommentar-loeschen-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._kommentarLoeschen(parseInt(btn.dataset.index, 10)));
    });
    this.shadowRoot.querySelectorAll(".kommentar-abbrechen-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._kommentarBearbeitenAbbrechen());
    });
    this.shadowRoot.querySelectorAll(".kommentar-speichern-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index, 10);
        const feld = this.shadowRoot.querySelector(`.kommentar-bearbeiten-feld[data-index="${index}"]`);
        if (!feld || !feld.value.trim()) return;
        btn.disabled = true;
        this._kommentarBearbeitenSpeichern(index, feld.value).finally(() => {
          btn.disabled = false;
        });
      });
    });
    const kommentarLoeschenModalNein = this.shadowRoot.getElementById("kommentar-loeschen-modal-nein-btn");
    if (kommentarLoeschenModalNein) {
      kommentarLoeschenModalNein.addEventListener("click", () => {
        this._kommentarZumLoeschenIndex = null;
        this._kommentarLoeschenModalVerstecken();
      });
    }
    const kommentarLoeschenModalJa = this.shadowRoot.getElementById("kommentar-loeschen-modal-ja-btn");
    if (kommentarLoeschenModalJa) {
      kommentarLoeschenModalJa.addEventListener("click", (e) => {
        e.target.disabled = true;
        this._kommentarLoeschenBestaetigt();
      });
    }

    const bearbeitenBtn = this.shadowRoot.getElementById("bearbeiten-btn");
    if (bearbeitenBtn) bearbeitenBtn.addEventListener("click", () => this._rezeptBearbeiten(r));
    const loeschenBtn = this.shadowRoot.getElementById("loeschen-btn");
    if (loeschenBtn) loeschenBtn.addEventListener("click", () => this._rezeptLoeschen(r));
    this.shadowRoot.getElementById("loeschen-modal-nein-btn").addEventListener("click", () => {
      this._rezeptZumLoeschen = null;
      this._loeschenModalVerstecken();
    });
    this.shadowRoot.getElementById("loeschen-modal-ja-btn").addEventListener("click", (e) => {
      e.target.disabled = true;
      this._rezeptLoeschenBestaetigt(this._rezeptZumLoeschen);
    });
  }

  // Zeigt entweder "diese Woche" (this._wochenplan.days) oder die
  // "Folgewoche" (this._wochenplan.nextWeekDays) an, je nach aktivem Tab
  // (this._wochenplanAnsicht). Für die aktuelle Woche werden automatisch
  // bereits vergangene Tage geleert angezeigt (siehe _wochenplanAnzeigen/
  // _wochenplanAktualisieren) - die Folgewoche lässt sich unabhängig davon
  // schon jetzt komplett im Voraus befüllen und rückt automatisch nach,
  // sobald die aktuelle Woche vorbei ist.
  _renderWochenplan(stil) {
    const zeigtFolgewoche = this._wochenplanAnsicht === "folgewoche";
    const feld = zeigtFolgewoche ? "nextWeekDays" : "days";
    const days = (this._wochenplan && this._wochenplan[feld]) || {};

    const tageHtml = WOCHENTAGE.map((t) => {
      const uid = days[t.schluessel] || "";
      const rezept = uid ? this._rezepte.find((r) => r.uid === uid) : null;
      const optionen = this._rezepte
        .map((r) => `<option value="${r.uid}" ${uid === r.uid ? "selected" : ""}>${this._escape(r.title)}</option>`)
        .join("");
      return `
        <div class="wochentag-zeile">
          <div class="wochentag-label">${this._wochentagLabel(t)}</div>
          <select class="wochentag-auswahl" data-tag="${t.schluessel}">
            <option value="">${this._t("wochenplan_kein_rezept_option")}</option>
            ${optionen}
          </select>
          ${rezept ? `<button type="button" class="sekundaer klein wochentag-oeffnen" data-uid="${rezept.uid}">${this._t("allgemein_oeffnen")}</button>` : ""}
        </div>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      ${stil}
      <ha-card>
        <div class="kopf">
          <button class="sekundaer" id="zurueck-wochenplan-btn">${this._t("allgemein_zurueck")}</button>
          <h2>${this._t("wochenplan_titel")}</h2>
        </div>
        <div class="kategorie-filter">
          <button type="button" class="chip ${!zeigtFolgewoche ? "chip-aktiv" : ""}" id="tab-diese-woche-btn">${this._t("wochenplan_tab_diese")}</button>
          <button type="button" class="chip ${zeigtFolgewoche ? "chip-aktiv" : ""}" id="tab-folgewoche-btn">${this._t("wochenplan_tab_folgewoche")}</button>
        </div>
        <div class="hinweis" style="margin-bottom:14px;">
          ${zeigtFolgewoche ? this._t("wochenplan_hinweis_folgewoche") : this._t("wochenplan_hinweis_diese")}
          ${this._t("wochenplan_hinweis_speicherung")}
        </div>
        ${this._rezepte.length === 0 ? `<div class="leer">${this._t("wochenplan_leer")}</div>` : `
          <div class="wochenplan-liste">${tageHtml}</div>
          <div class="aktionen">
            <button class="primaer" id="wochenplan-einkaufsliste-btn">${this._t("wochenplan_einkaufsliste_btn", { ziel: zeigtFolgewoche ? this._t("wochenplan_folgewoche_wort") : this._t("wochenplan_wort") })}</button>
          </div>
        `}
      </ha-card>
    `;

    this.shadowRoot.getElementById("zurueck-wochenplan-btn").addEventListener("click", () => this._navigationZurueck());

    this.shadowRoot.getElementById("tab-diese-woche-btn").addEventListener("click", () => {
      this._wochenplanAnsicht = "diese";
      this._render();
    });
    this.shadowRoot.getElementById("tab-folgewoche-btn").addEventListener("click", () => {
      this._wochenplanAnsicht = "folgewoche";
      this._render();
    });

    this.shadowRoot.querySelectorAll(".wochentag-auswahl").forEach((sel) => {
      sel.addEventListener("change", async () => {
        sel.disabled = true;
        const aktuellerPlan = this._wochenplan || {};
        const neuerPlan = {
          weekStart: aktuellerPlan.weekStart,
          days: { ...(aktuellerPlan.days || {}) },
          nextWeekDays: { ...(aktuellerPlan.nextWeekDays || {}) },
        };
        neuerPlan[feld][sel.dataset.tag] = sel.value || null;
        await this._wochenplanSpeichern(neuerPlan);
        this._render();
      });
    });

    this.shadowRoot.querySelectorAll(".wochentag-oeffnen").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rezept = this._rezepte.find((r) => r.uid === btn.dataset.uid);
        if (rezept) this._rezeptOeffnen(rezept);
      });
    });

    const einkaufslisteBtn = this.shadowRoot.getElementById("wochenplan-einkaufsliste-btn");
    if (einkaufslisteBtn) {
      einkaufslisteBtn.addEventListener("click", async () => {
        einkaufslisteBtn.disabled = true;
        const uids = Object.values(days).filter(Boolean);
        const rezepte = uids.map((uid) => this._rezepte.find((r) => r.uid === uid)).filter(Boolean);
        if (rezepte.length === 0) {
          this._hinweis(this._t("wochenplan_keine_zuweisung", { zeitraum: zeigtFolgewoche ? this._t("wochenplan_folgewoche_wort") : this._t("wochenplan_aktuelle_woche_wort") }));
        } else {
          await this._einkaufslisteErstellen(rezepte);
        }
        einkaufslisteBtn.disabled = false;
      });
    }
  }

  _renderFormular(stil) {
    const r = this._aktivesRezept;
    const istNeu = !r.uid;
    const zutatenZeilen = (r.ingredients.length ? r.ingredients : [{ amount: "", unit: "", name: "" }])
      .map(
        (z) => `
        <div class="zutat-zeile">
          <input class="menge-feld" type="text" placeholder="${this._t("formular_zutat_menge_placeholder")}" value="${this._escape(z.amount ?? "")}" data-feld="amount">
          <input class="einheit-feld" type="text" placeholder="${this._t("formular_zutat_einheit_placeholder")}" value="${this._escape(z.unit ?? "")}" data-feld="unit">
          <input type="text" placeholder="${this._t("formular_zutat_name_placeholder")}" value="${this._escape(z.name ?? "")}" data-feld="name">
          <button type="button" class="zutat-entfernen" aria-label="${this._t("formular_zutat_entfernen_aria")}">✕</button>
        </div>`
      )
      .join("");

    const schritteZeilen = (r.steps && r.steps.length ? r.steps : [""])
      .map(
        (s, i) => `
        <div class="schritt-zeile">
          <span class="schritt-nummer">${i + 1}.</span>
          <input type="text" placeholder="${this._t("formular_schritt_placeholder_beispiel")}" value="${this._escape(s ?? "")}" data-schritt-feld>
          <button type="button" class="schritt-verschieben schritt-hoch" aria-label="${this._t("formular_schritt_hoch_aria")}">▲</button>
          <button type="button" class="schritt-verschieben schritt-runter" aria-label="${this._t("formular_schritt_runter_aria")}">▼</button>
          <button type="button" class="schritt-entfernen" aria-label="${this._t("formular_schritt_entfernen_aria")}">✕</button>
        </div>`
      )
      .join("");

    this.shadowRoot.innerHTML = `
      ${stil}
      <ha-card>
       <div class="eng">
        <div class="kopf">
          <h2>${istNeu ? this._t("formular_titel_neu") : this._t("formular_titel_bearbeiten")}</h2>
        </div>
        <div class="formular">
          <!-- Der URL-Import braucht ein Skript auf dem Home-Assistant-Rechner
               (eine Karte kann fremde Webseiten nicht selbst abrufen) - ist es
               nicht eingerichtet, bleibt der Knopf unsichtbar. -->
          <button type="button" class="sekundaer" id="url-einfuegen-btn" style="margin-bottom:12px;${this._urlImportVerfuegbar() ? "" : " display:none;"}">${this._t("formular_url_import_btn")}</button>
          <div id="url-bereich" style="display:none; margin-bottom:16px;">
            <label>${this._t("formular_url_label")}</label>
            <input type="text" id="url-feld" placeholder="${this._t("formular_url_placeholder")}">
            <div class="hinweis">
              ${this._t("formular_url_hinweis")}
            </div>
            <button type="button" class="primaer" id="url-importieren-btn" style="margin-top:8px;">${this._t("formular_url_importieren_btn")}</button>
          </div>

          <button type="button" class="sekundaer" id="text-einfuegen-btn" style="margin-bottom:12px;">${this._t("formular_text_einfuegen_btn")}</button>
          <div id="text-bereich" style="display:none; margin-bottom:16px;">
            <label>${this._t("formular_text_label")}</label>
            <textarea id="text-feld" class="json-textfeld" placeholder="${this._t("formular_text_placeholder")}"></textarea>
            <div class="hinweis">
              ${this._t("formular_text_hinweis")}
            </div>
            <button type="button" class="primaer" id="text-erkennen-btn" style="margin-top:8px;">${this._t("formular_text_erkennen_btn")}</button>
          </div>

          <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
            <button type="button" class="sekundaer" id="json-einfuegen-btn" style="margin:0;">${this._t("formular_json_einfuegen_btn")}</button>
            <button type="button" class="info-btn" id="json-info-btn" title="${this._t("formular_json_info_aria")}" aria-label="${this._t("formular_json_info_aria")}">?</button>
          </div>
          <div id="json-bereich" style="display:none; margin-bottom:16px;">
            <label>${this._t("formular_json_label")}</label>
            <textarea id="json-feld" class="json-textfeld" placeholder='[{"title": "...", "servings": 4, "ingredients": [...], "steps": [...]}]'></textarea>
            <button type="button" class="primaer" id="json-uebernehmen-btn" style="margin-top:8px;">${this._t("formular_json_uebernehmen_btn")}</button>
          </div>

          <label>${this._t("formular_label_titel")}</label>
          <input type="text" id="titel-feld" value="${this._escape(r.title)}">

          <label>${this._t("formular_label_kategorie")}</label>
          <select id="kategorie-feld">
            ${this._alleKategorien().map((k) => `<option value="${this._escape(k)}" ${((r.category || "Sonstiges") === k) ? "selected" : ""}>${this._escape(this._kategorieLabel(k))}</option>`).join("")}
            <option value="__neu__">${this._t("kategorie_neu_btn")}</option>
          </select>
          <!-- Fehlt die passende Kategorie, muss man das Formular nicht erst
               abbrechen (und alle bisherigen Eingaben verlieren) - die
               Auswahl "+ Neue Kategorie" blendet direkt hier ein eigenes
               Eingabefeld ein. Nach dem Anlegen wird gezielt nur die neue
               <option> ergänzt, NICHT das ganze Formular neu gerendert -
               das würde sonst Zutaten/Schritte verwerfen, die noch nicht in
               this._aktivesRezept zurückgeschrieben sind (das passiert erst
               beim Speichern). -->
          <div id="formular-kategorie-neu-bereich" style="display:none; margin-top:8px;">
            <input type="text" id="formular-kategorie-name-feld" placeholder="${this._t("kategorie_name_placeholder")}">
            <button type="button" class="sekundaer klein" id="formular-kategorie-speichern-btn" style="margin-top:6px;">${this._t("allgemein_speichern")}</button>
          </div>

          <label>${this._t("formular_label_tags")}</label>
          <div id="tags-liste" class="tags-liste"></div>
          <div class="tag-eingabe-zeile">
            <input type="text" id="neuer-tag-feld" list="vorhandene-tags-liste" placeholder="${this._t("formular_tag_placeholder")}">
            <button type="button" class="sekundaer klein" id="tag-hinzufuegen">${this._t("formular_tag_hinzufuegen_btn")}</button>
          </div>
          <!-- Native Browser-Vorschlagsliste (datalist) statt einer
               selbstgebauten Dropdown-Komponente - zeigt beim Tippen
               bereits an anderen Rezepten vergebene Tags zur Auswahl an,
               ohne zusätzlichen JS-Code/Build-Schritt. -->
          <datalist id="vorhandene-tags-liste">
            ${this._alleTagsOhneKategorien().map((t) => `<option value="${this._escape(t)}"></option>`).join("")}
          </datalist>

          <label>${this._t("formular_label_portionen")}</label>
          <input type="number" id="portionen-feld" min="1" step="1" value="${r.servings}">

          <label>${this._t("formular_label_zutaten")}</label>
          <div id="zutaten-liste">${zutatenZeilen}</div>
          <button type="button" class="sekundaer" id="zutat-hinzufuegen">${this._t("formular_zutat_hinzufuegen_btn")}</button>

          <label>${this._t("formular_label_zubereitung")}</label>
          <div id="schritte-liste">${schritteZeilen}</div>
          <button type="button" class="sekundaer" id="schritt-hinzufuegen">${this._t("formular_schritt_hinzufuegen_btn")}</button>

          <label>${this._t("formular_label_fotos", { max: MAX_FOTOS })}</label>
          <div id="fotos-liste" class="fotos-liste"></div>
          <input type="file" id="bild-feld" accept="image/*" multiple>
          <div class="hinweis" id="fotos-hinweis">${this._t("formular_fotos_hinweis")}</div>

          <div class="aktionen">
            <button class="primaer" id="speichern-btn">${this._t("allgemein_speichern")}</button>
            <button class="sekundaer" id="abbrechen-btn">${this._t("allgemein_abbrechen")}</button>
          </div>
        </div>

        <div class="modal-overlay" id="json-info-modal" style="display:none;">
          <div class="modal-box modal-box-breit">
            <h3 style="margin-top:0;">${this._t("json_info_titel")}</h3>
            <p style="text-align:left;">${this._t("json_info_erklaerung")}</p>
            <textarea id="json-info-prompt-text" class="json-textfeld" style="min-height:220px;" readonly></textarea>
            <div class="modal-aktionen" style="margin-top:14px;">
              <button type="button" class="sekundaer" id="json-info-schliessen-btn">${this._t("allgemein_schliessen")}</button>
              <button type="button" class="primaer" id="json-info-kopieren-btn">${this._t("json_info_kopieren_btn")}</button>
            </div>
          </div>
        </div>
       </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById("url-einfuegen-btn").addEventListener("click", () => {
      const bereich = this.shadowRoot.getElementById("url-bereich");
      bereich.style.display = bereich.style.display === "none" ? "block" : "none";
    });

    this.shadowRoot.getElementById("url-importieren-btn").addEventListener("click", async () => {
      const feld = this.shadowRoot.getElementById("url-feld");
      const url = feld.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        this._hinweis(this._t("fehler_url_ungueltig"));
        return;
      }
      if (url.includes("'")) {
        // Die URL wird serverseitig in einfache Anführungszeichen
        // eingebettet (siehe shell_command in configuration.yaml) - ein
        // Apostroph darin würde den Shell-Befehl kaputt machen.
        this._hinweis(this._t("fehler_url_apostroph"));
        return;
      }

      const knopf = this.shadowRoot.getElementById("url-importieren-btn");
      const urspruenglicherText = knopf.textContent;
      knopf.disabled = true;
      knopf.textContent = this._t("formular_url_laedt");

      try {
        const antwort = await this._hass.connection.sendMessagePromise({
          type: "call_service",
          domain: "shell_command",
          service: "rezeptbuch_url_importieren",
          service_data: { url },
          return_response: true,
        });

        // Je nach Home-Assistant-Version liegt die Service-Response mal
        // unter "response", mal (ältere/andere Aufrufwege) unter
        // "service_response" - beides abdecken.
        const antwortDaten = (antwort && (antwort.response || antwort.service_response)) || {};
        const stdout = (antwortDaten.stdout || "").trim();
        if (!stdout) {
          throw new Error(this._t("fehler_url_keine_ausgabe"));
        }

        let geparst;
        try {
          geparst = JSON.parse(stdout);
        } catch {
          throw new Error(this._t("fehler_url_kein_json"));
        }

        if (geparst.error) {
          throw new Error(geparst.error);
        }

        // Wie beim Text-Einfügen: nur tatsächlich Gefundenes übernehmen,
        // damit ein leeres Feld ein beim Bearbeiten schon ausgefülltes
        // Feld nicht versehentlich überschreibt.
        if (geparst.title) this._aktivesRezept.title = geparst.title;
        if (geparst.servings) this._aktivesRezept.servings = geparst.servings;
        if (geparst.category) this._aktivesRezept.category = geparst.category;
        if (Array.isArray(geparst.ingredients) && geparst.ingredients.length) {
          // Die Zutaten kommen vom Skript als fertig kombinierte Strings
          // (z.B. "200 g Reis", so wie schema.org sie liefert) - dieselbe
          // Zeilen-Parse-Funktion wie bei der Text-Erkennung zerlegt sie in
          // Menge/Einheit/Name.
          this._aktivesRezept.ingredients = _zutatenBlockParsen(geparst.ingredients);
        }
        if (Array.isArray(geparst.steps) && geparst.steps.length) {
          this._aktivesRezept.steps = geparst.steps;
        }
        if (geparst.image) {
          this._aktivesRezept.image = geparst.image;
          this._aktivesRezept.fotoListe = [geparst.image, ...(this._aktivesRezept.fotoListe || []).filter((f) => f !== geparst.image)].slice(0, MAX_FOTOS);
        }
        if (!this._aktivesRezept.uid && !this._aktivesRezept.created) {
          this._aktivesRezept.created = new Date().toISOString();
        }

        feld.value = "";
        this._render();
      } catch (fehler) {
        console.error("Rezeptbuch: URL-Import fehlgeschlagen", fehler);
        this._hinweis(this._t("fehler_url_import_fehlgeschlagen", { fehler: fehler.message || fehler }));
        knopf.disabled = false;
        knopf.textContent = urspruenglicherText;
      }
    });

    this.shadowRoot.getElementById("text-einfuegen-btn").addEventListener("click", () => {
      const bereich = this.shadowRoot.getElementById("text-bereich");
      bereich.style.display = bereich.style.display === "none" ? "block" : "none";
    });

    this.shadowRoot.getElementById("text-erkennen-btn").addEventListener("click", () => {
      const text = this.shadowRoot.getElementById("text-feld").value;
      if (!text || !text.trim()) return;
      const erkannt = rezeptAusTextErkennen(text);

      if (!erkannt.title && erkannt.ingredients.length === 0 && erkannt.steps.length === 0) {
        this._hinweis(this._t("fehler_texterkennung_nichts_gefunden"));
        return;
      }

      // Nur tatsächlich Erkanntes übernehmen - ein leeres Ergebnis in einem
      // Feld soll nicht ein bereits vorhandenes (z.B. beim Bearbeiten schon
      // ausgefülltes) Feld überschreiben.
      if (erkannt.title) this._aktivesRezept.title = erkannt.title;
      if (erkannt.servings) this._aktivesRezept.servings = erkannt.servings;
      if (erkannt.category) this._aktivesRezept.category = erkannt.category;
      if (erkannt.ingredients.length) this._aktivesRezept.ingredients = erkannt.ingredients;
      if (erkannt.steps.length) this._aktivesRezept.steps = erkannt.steps;
      if (!this._aktivesRezept.uid && !this._aktivesRezept.created) {
        this._aktivesRezept.created = new Date().toISOString();
      }

      const unvollstaendig = erkannt.ingredients.length === 0 || erkannt.steps.length === 0;
      this._render();
      if (unvollstaendig) {
        // Erst NACH dem Neuzeichnen warnen, damit das (Teil-)Ergebnis schon
        // sichtbar ist und der alert() nicht den Eindruck erweckt, gar
        // nichts sei übernommen worden.
        this._hinweis(this._t("warnung_texterkennung_unvollstaendig"));
      }
    });

    this.shadowRoot.getElementById("json-einfuegen-btn").addEventListener("click", () => {
      const bereich = this.shadowRoot.getElementById("json-bereich");
      bereich.style.display = bereich.style.display === "none" ? "block" : "none";
    });

    this.shadowRoot.getElementById("json-uebernehmen-btn").addEventListener("click", () => {
      const text = this.shadowRoot.getElementById("json-feld").value.trim();
      if (!text) return;
      let geparst;
      try {
        geparst = JSON.parse(text);
      } catch {
        this._hinweis(this._t("fehler_json_ungueltig"));
        return;
      }
      const daten = Array.isArray(geparst) ? geparst[0] : geparst;
      if (!daten || !daten.title) {
        this._hinweis(this._t("fehler_json_titel_fehlt"));
        return;
      }
      this._aktivesRezept.title = daten.title || "";
      // "> 0" statt "||", damit eine explizite 0 nicht versehentlich zu 4 wird
      // (0 Portionen ergibt zwar auch keinen Sinn, aber || würde jede
      // falsy-Zahl inkl. 0 überschreiben statt nur "nicht angegeben").
      this._aktivesRezept.servings = (Number(daten.servings) > 0) ? Number(daten.servings) : 4;
      // Der KI-Prompt (json_info_prompt oben) lässt "ingredients" bewusst als
      // einfache Textzeilen ausgeben (z.B. "200 g Mehl"), weil das für eine
      // KI zuverlässiger zu erzeugen ist als von Anfang an strukturierte
      // {amount, unit, name}-Objekte. Intern erwartet die Karte aber genau
      // diese Objektform (siehe z.B. der ".filter((z) => z.name)" beim
      // Speichern) - ein reiner String hat kein ".name" und würde sonst
      // beim Speichern lautlos als "leer" herausgefiltert, obwohl er im
      // eingefügten JSON sichtbar war. Deshalb hier jede Zutat, die noch ein
      // String ist, mit demselben Parser aufteilen, der auch bei der
      // automatischen Texterkennung verwendet wird; ist sie schon ein
      // Objekt (z.B. aus einem Backup-/Restore-JSON), unverändert übernehmen.
      const zutatUebernehmen = (eintrag) => {
        if (typeof eintrag === "string") return _zutatZeileParsen(eintrag);
        if (eintrag && typeof eintrag === "object") {
          return {
            amount: eintrag.amount !== undefined && eintrag.amount !== null ? String(eintrag.amount) : "",
            unit: eintrag.unit || "",
            name: eintrag.name || "",
          };
        }
        return { amount: "", unit: "", name: "" };
      };
      this._aktivesRezept.ingredients = (daten.ingredients && daten.ingredients.length)
        ? daten.ingredients.map(zutatUebernehmen)
        : [{ amount: "", unit: "", name: "" }];
      this._aktivesRezept.steps = (daten.steps && daten.steps.length) ? daten.steps : [""];
      // Zuvor gingen diese Felder beim Einfügen verloren, falls das JSON sie
      // enthielt (z.B. Kategorie aus einer KI-Konvertierung, oder Foto/
      // Bewertungen/Kommentare aus einem Backup-Datensatz).
      if (daten.category) this._aktivesRezept.category = daten.category;
      if (Array.isArray(daten.tags)) this._aktivesRezept.tags = daten.tags;
      if (daten.image) {
        this._aktivesRezept.image = daten.image;
        this._aktivesRezept.fotoListe = [daten.image, ...(this._aktivesRezept.fotoListe || []).filter((f) => f !== daten.image)].slice(0, MAX_FOTOS);
      }
      if (Array.isArray(daten.images) && daten.images.length) {
        this._aktivesRezept.images = daten.images.filter(Boolean);
        const bisher = this._aktivesRezept.fotoListe || [];
        this._aktivesRezept.fotoListe = [...bisher, ...this._aktivesRezept.images.filter((f) => !bisher.includes(f))].slice(0, MAX_FOTOS);
      }
      if (daten.ratings) this._aktivesRezept.ratings = daten.ratings;
      if (daten.comments) this._aktivesRezept.comments = daten.comments;
      if (daten.cookLog) this._aktivesRezept.cookLog = daten.cookLog;
      // "Neueste"-Sortierung braucht ein created-Datum - ohne dieses Feld im
      // JSON sonst würde das Rezept dort immer ganz hinten landen. Bei einem
      // neuen Rezept (noch keine uid) jetzt setzen, bei einer Bearbeitung
      // ein vorhandenes Datum aus dem JSON übernehmen, falls angegeben.
      if (daten.created) {
        this._aktivesRezept.created = daten.created;
      } else if (!this._aktivesRezept.uid && !this._aktivesRezept.created) {
        this._aktivesRezept.created = new Date().toISOString();
      }
      this._render();
    });

    // Prompt-Hilfe zum "JSON einfügen"-Bereich: zeigt einen fertigen,
    // vorformulierten Text zum Kopieren in eine beliebige externe KI (siehe
    // json_info_prompt oben). Der Kategorie-Platzhalter wird IMMER mit den
    // intern gespeicherten Werten befüllt (fest eingebaute KATEGORIEN auf
    // Deutsch + eigene, selbst angelegte Kategorien unverändert, siehe
    // _alleKategorien) - nicht den übersetzten Anzeige-Namen -, weil genau
    // diese Werte im "category"-Feld des JSON erwartet werden - unabhängig
    // von der UI-Sprache, siehe _kategorieLabel().
    // Den Prompt-Text bewusst HIER (einmal pro _render()-Durchlauf) statt
    // erst im Klick-Handler befüllen: this._t() liest _hass.language IMMER
    // live, unabhängig davon, wann zuletzt neu gezeichnet wurde. Bliebe die
    // Karte (wie üblich) offen, während im Home-Assistant-Profil die
    // Sprache umgestellt wird, käme im Klick-Handler sonst eine ANDERE
    // Sprache heraus als in der restlichen, schon gezeichneten Umgebung
    // (Titel/Erklärung/Knöpfe des Modals, die restliche Seite) - sichtbar
    // gewordener Sprach-Mix innerhalb eines einzigen Fensters. So bleibt
    // alles, was zu ein und demselben _render()-Aufruf gehört, konsistent
    // in derselben Sprache; eine neue Sprache wird vollständig erst beim
    // nächsten tatsächlichen Neuzeichnen sichtbar (z.B. Formular schließen
    // und neu öffnen) - kein Teil-Update, das mit dem Rest nicht zusammenpasst.
    this.shadowRoot.getElementById("json-info-prompt-text").value = this._t("json_info_prompt", {
      kategorien: this._alleKategorien().join(", "),
    });
    this.shadowRoot.getElementById("json-info-btn").addEventListener("click", () => {
      this.shadowRoot.getElementById("json-info-modal").style.display = "flex";
    });
    this.shadowRoot.getElementById("json-info-schliessen-btn").addEventListener("click", () => {
      this.shadowRoot.getElementById("json-info-modal").style.display = "none";
    });
    this.shadowRoot.getElementById("json-info-kopieren-btn").addEventListener("click", async () => {
      const feld = this.shadowRoot.getElementById("json-info-prompt-text");
      const knopf = this.shadowRoot.getElementById("json-info-kopieren-btn");
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(feld.value);
        } else {
          // Fallback für Kontexte ohne Clipboard-API (z.B. unsicherer
          // Kontext oder ältere WebView der Begleit-App): Text markieren
          // und über den älteren execCommand-Weg kopieren.
          feld.removeAttribute("readonly");
          feld.select();
          document.execCommand("copy");
          feld.setAttribute("readonly", "");
        }
        const alterText = knopf.textContent;
        knopf.textContent = this._t("json_info_kopiert");
        setTimeout(() => {
          knopf.textContent = alterText;
        }, 1500);
      } catch (e) {
        console.error("Rezeptbuch: Prompt konnte nicht kopiert werden", e);
      }
    });

    // Neue Kategorie direkt aus dem Formular heraus anlegen (siehe
    // Kommentar bei der "+ Neue Kategorie"-<option> oben). Bewusst OHNE
    // this._render() danach - sonst gingen alle noch nicht gespeicherten
    // Formular-Eingaben verloren.
    const kategorieFeld = this.shadowRoot.getElementById("kategorie-feld");
    const formularKategorieNeuBereich = this.shadowRoot.getElementById("formular-kategorie-neu-bereich");
    kategorieFeld.addEventListener("change", () => {
      if (kategorieFeld.value === "__neu__") {
        formularKategorieNeuBereich.style.display = "block";
        this.shadowRoot.getElementById("formular-kategorie-name-feld").focus();
      } else {
        formularKategorieNeuBereich.style.display = "none";
      }
    });
    this.shadowRoot.getElementById("formular-kategorie-speichern-btn").addEventListener("click", async () => {
      const nameFeld = this.shadowRoot.getElementById("formular-kategorie-name-feld");
      const name = nameFeld.value.trim();
      if (!name) { this._hinweis(this._t("fehler_kategorie_name_fehlt")); return; }
      const existiertBereits = this._alleKategorien().some((k) =>
        k.toLowerCase() === name.toLowerCase() || this._kategorieLabel(k).toLowerCase() === name.toLowerCase()
      );
      if (existiertBereits) { this._hinweis(this._t("fehler_kategorie_existiert_bereits")); return; }
      const speichernBtn = this.shadowRoot.getElementById("formular-kategorie-speichern-btn");
      speichernBtn.disabled = true;
      const erfolg = await this._eigeneKategorienSpeichern([...(this._eigeneKategorien || []), name]);
      speichernBtn.disabled = false;
      if (!erfolg) return;
      // Gezielt nur die neue <option> ergänzen und auswählen, statt das
      // ganze Formular neu zu rendern (siehe Kommentar weiter oben).
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      kategorieFeld.insertBefore(option, kategorieFeld.querySelector('option[value="__neu__"]'));
      kategorieFeld.value = name;
      formularKategorieNeuBereich.style.display = "none";
      nameFeld.value = "";
    });

    // Tags: analog zum Zutaten-/Schritte-Muster wird this._aktivesRezept
    // direkt als "Source of Truth" gepflegt (keine eigene DOM-Liste von
    // Eingabefeldern nötig) und der Chip-Bereich bei jeder Änderung neu
    // gezeichnet.
    const tagsAktualisieren = () => {
      if (!Array.isArray(this._aktivesRezept.tags)) this._aktivesRezept.tags = [];
      const liste = this.shadowRoot.getElementById("tags-liste");
      liste.innerHTML = this._aktivesRezept.tags
        .map((tag, i) => `<span class="tag-chip">${this._escape(tag)} <button type="button" class="tag-entfernen" data-index="${i}" aria-label="${this._t("formular_tag_entfernen_aria", { tag: this._escape(tag) })}">✕</button></span>`)
        .join("");
      liste.querySelectorAll(".tag-entfernen").forEach((btn) => {
        btn.addEventListener("click", () => {
          this._aktivesRezept.tags.splice(Number(btn.dataset.index), 1);
          tagsAktualisieren();
        });
      });
    };
    tagsAktualisieren();

    const neuerTagHinzufuegen = () => {
      const feld = this.shadowRoot.getElementById("neuer-tag-feld");
      const wert = feld.value.trim();
      if (!wert) return;
      if (!Array.isArray(this._aktivesRezept.tags)) this._aktivesRezept.tags = [];
      // Duplikate (unabhängig von Groß-/Kleinschreibung und Umlaut-Schreibweise)
      // nicht doppelt aufnehmen, sonst könnte derselbe Tag mehrfach als Chip
      // erscheinen.
      if (!this._aktivesRezept.tags.some((t) => this._normalisieren(t) === this._normalisieren(wert))) {
        this._aktivesRezept.tags.push(wert);
      }
      feld.value = "";
      tagsAktualisieren();
    };
    this.shadowRoot.getElementById("tag-hinzufuegen").addEventListener("click", neuerTagHinzufuegen);
    this.shadowRoot.getElementById("neuer-tag-feld").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        neuerTagHinzufuegen();
      }
    });

    this.shadowRoot.getElementById("abbrechen-btn").addEventListener("click", () => this._navigationZurueck());

    this.shadowRoot.getElementById("zutat-hinzufuegen").addEventListener("click", () => {
      const liste = this.shadowRoot.getElementById("zutaten-liste");
      const div = document.createElement("div");
      div.className = "zutat-zeile";
      div.innerHTML = `
        <input class="menge-feld" type="text" placeholder="${this._t("formular_zutat_menge_placeholder")}" data-feld="amount">
        <input class="einheit-feld" type="text" placeholder="${this._t("formular_zutat_einheit_placeholder")}" data-feld="unit">
        <input type="text" placeholder="${this._t("formular_zutat_name_placeholder")}" data-feld="name">
        <button type="button" class="zutat-entfernen" aria-label="${this._t("formular_zutat_entfernen_aria")}">✕</button>`;
      liste.appendChild(div);
      div.querySelector(".zutat-entfernen").addEventListener("click", () => div.remove());
    });

    this.shadowRoot.querySelectorAll(".zutat-entfernen").forEach((btn) => {
      btn.addEventListener("click", (e) => e.target.closest(".zutat-zeile").remove());
    });

    // Zubereitungsschritte lassen sich per ▲/▼ verschieben statt nur zu
    // löschen oder in der Zeile zu bearbeiten (gemeldeter Wunsch). Bewusst
    // Auf/Ab-Knöpfe statt Drag&Drop: Drag&Drop ist auf Touch-Geräten (vor
    // allem in der Home-Assistant-Begleit-App/WebView) erfahrungsgemäß
    // unzuverlässig - siehe die Begründung gegen window.confirm() weiter
    // oben für dieselbe Art von Problem. Die Reihenfolge beim Speichern
    // ergibt sich einfach aus der DOM-Reihenfolge der Eingabefelder
    // ("[data-schritt-feld]"), verschieben im DOM reicht also aus.
    const schritteListeEl = this.shadowRoot.getElementById("schritte-liste");
    const schritteAktualisieren = () => {
      const zeilen = schritteListeEl.querySelectorAll(".schritt-zeile");
      zeilen.forEach((zeile, i) => {
        zeile.querySelector(".schritt-nummer").textContent = `${i + 1}.`;
        zeile.querySelector(".schritt-hoch").disabled = i === 0;
        zeile.querySelector(".schritt-runter").disabled = i === zeilen.length - 1;
      });
    };

    const schrittZeileVerdrahten = (zeile) => {
      zeile.querySelector(".schritt-entfernen").addEventListener("click", () => {
        zeile.remove();
        schritteAktualisieren();
      });
      zeile.querySelector(".schritt-hoch").addEventListener("click", () => {
        const vorherige = zeile.previousElementSibling;
        if (vorherige) {
          schritteListeEl.insertBefore(zeile, vorherige);
          schritteAktualisieren();
        }
      });
      zeile.querySelector(".schritt-runter").addEventListener("click", () => {
        const naechste = zeile.nextElementSibling;
        if (naechste) {
          schritteListeEl.insertBefore(naechste, zeile);
          schritteAktualisieren();
        }
      });
    };

    this.shadowRoot.getElementById("schritt-hinzufuegen").addEventListener("click", () => {
      const div = document.createElement("div");
      div.className = "schritt-zeile";
      div.innerHTML = `
        <span class="schritt-nummer">${schritteListeEl.children.length + 1}.</span>
        <input type="text" placeholder="${this._t("formular_schritt_placeholder_naechster")}" data-schritt-feld>
        <button type="button" class="schritt-verschieben schritt-hoch" aria-label="${this._t("formular_schritt_hoch_aria")}">▲</button>
        <button type="button" class="schritt-verschieben schritt-runter" aria-label="${this._t("formular_schritt_runter_aria")}">▼</button>
        <button type="button" class="schritt-entfernen" aria-label="${this._t("formular_schritt_entfernen_aria")}">✕</button>`;
      schritteListeEl.appendChild(div);
      schrittZeileVerdrahten(div);
      schritteAktualisieren();
    });

    schritteListeEl.querySelectorAll(".schritt-zeile").forEach((zeile) => schrittZeileVerdrahten(zeile));
    schritteAktualisieren();

    // Fotos: Titelbild + weitere. Die Arbeitsliste lebt in
    // this._aktivesRezept.fotoListe (Adressen oder frisch verkleinerte
    // Data-URLs); hochgeladen wird erst beim Speichern (_formularSpeichern).
    if (!Array.isArray(this._aktivesRezept.fotoListe)) {
      this._aktivesRezept.fotoListe = this._rezeptFotos(this._aktivesRezept);
    }
    const fotosListeEl = this.shadowRoot.getElementById("fotos-liste");
    const fotosListeRendern = () => {
      const fotos = this._aktivesRezept.fotoListe;
      fotosListeEl.innerHTML = fotos.map((f, i) => `
        <div class="foto-item ${i === 0 ? "titelbild" : ""}">
          <img ${this._bildAttribute(f, "96px")} alt="">
          ${i === 0 ? `<span class="foto-badge">${this._t("formular_foto_titelbild")}</span>` : ""}
          <div class="foto-item-knoepfe">
            ${i > 0 ? `<button type="button" data-foto-aktion="titel" data-foto-index="${i}" title="${this._t("formular_foto_als_titelbild_title")}" aria-label="${this._t("formular_foto_als_titelbild_title")}">⭐</button>` : ""}
            <button type="button" data-foto-aktion="weg" data-foto-index="${i}" title="${this._t("formular_foto_entfernen_aria")}" aria-label="${this._t("formular_foto_entfernen_aria")}">✕</button>
          </div>
        </div>`).join("");
      fotosListeEl.querySelectorAll("[data-foto-aktion]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = parseInt(btn.dataset.fotoIndex, 10);
          const liste = this._aktivesRezept.fotoListe;
          if (btn.dataset.fotoAktion === "weg") {
            liste.splice(i, 1);
          } else {
            const [foto] = liste.splice(i, 1);
            liste.unshift(foto);
          }
          fotosListeRendern();
        });
      });
    };
    fotosListeRendern();
    const bildFeld = this.shadowRoot.getElementById("bild-feld");
    bildFeld.addEventListener("change", async () => {
      const dateien = Array.from(bildFeld.files || []);
      const hinweisEl = this.shadowRoot.getElementById("fotos-hinweis");
      const urspruenglich = hinweisEl.textContent;
      hinweisEl.textContent = this._t("formular_bild_verkleinern_text");
      try {
        for (const datei of dateien) {
          if (this._aktivesRezept.fotoListe.length >= MAX_FOTOS) {
            this._hinweis(this._t("formular_fotos_maximum", { max: MAX_FOTOS }));
            break;
          }
          this._aktivesRezept.fotoListe.push(await this._bildKomprimieren(datei));
        }
      } catch (fehler) {
        console.error("Rezeptbuch: Foto konnte nicht verarbeitet werden", fehler);
        this._hinweis(fehler.message || String(fehler));
      } finally {
        bildFeld.value = "";
        hinweisEl.textContent = urspruenglich;
        fotosListeRendern();
      }
    });

    const speichernBtn = this.shadowRoot.getElementById("speichern-btn");
    speichernBtn.addEventListener("click", async () => {
      if (speichernBtn.disabled) return;
      speichernBtn.disabled = true;
      const urspruenglicherText = speichernBtn.textContent;
      speichernBtn.textContent = this._t("allgemein_speichert");

      try {
        const titel = this.shadowRoot.getElementById("titel-feld").value.trim();
        if (!titel) {
          this._hinweis(this._t("fehler_titel_fehlt"));
          return;
        }
        const zeilen = Array.from(this.shadowRoot.querySelectorAll(".zutat-zeile")).map((zeile) => ({
          amount: zeile.querySelector('[data-feld="amount"]').value,
          unit: zeile.querySelector('[data-feld="unit"]').value,
          name: zeile.querySelector('[data-feld="name"]').value,
        }));
        const schritte = Array.from(this.shadowRoot.querySelectorAll("[data-schritt-feld]")).map((feld) => feld.value);

        await this._formularSpeichern({
          title: titel,
          servings: this.shadowRoot.getElementById("portionen-feld").value,
          category: this.shadowRoot.getElementById("kategorie-feld").value,
          tags: this._aktivesRezept.tags || [],
          ingredients: zeilen,
          steps: schritte,
          fotos: (this._aktivesRezept.fotoListe || []).slice(),
        });
      } catch (fehler) {
        console.error("Rezeptbuch: Unerwarteter Fehler beim Speichern", fehler);
        this._hinweis(this._t("fehler_unerwartet", { fehler: fehler.message || fehler }));
      } finally {
        speichernBtn.disabled = false;
        speichernBtn.textContent = urspruenglicherText;
      }
    });
  }

  _escape(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    // textContent -> innerHTML escapt zuverlässig &, < und > für reinen
    // Text-Inhalt - das reicht aber NICHT, weil _escape() im gesamten
    // Formular auch für Attributwerte verwendet wird (z.B.
    // value="${this._escape(...)}"). Ein nicht escapetes Anführungszeichen
    // im Wert könnte dort aus dem Attribut ausbrechen und ein beliebiges
    // weiteres Attribut einschleusen (z.B. einen Event-Handler wie
    // onmouseover=...) - klassische Attribut-Injection/XSS. Das ist seit
    // dem URL-Import (Abschnitt 14) kein rein theoretisches Risiko mehr,
    // weil Titel/Zutaten/Schritte dabei automatisiert aus einer fremden,
    // nicht selbst geprüften Webseite übernommen werden können. Deshalb
    // zusätzlich escapen.
    return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("rezeptbuch-card", RezeptbuchCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "rezeptbuch-card",
  name: "Rezeptbuch",
  description: "Rezeptbuch mit Mengenumrechner - speichert in einer lokalen To-do-Liste (geräteübergreifend)",
});
