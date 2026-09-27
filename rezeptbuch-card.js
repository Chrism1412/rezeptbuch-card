/*
  Rezeptbuch-Karte (Version 4) für Home Assistant
  Speichert Rezepte in einer "Lokalen To-do-Liste" (local_todo) - das ist
  serverseitiger Speicher, für jedes Gerät/jeden Nutzer gleich sichtbar.
  Die Karte selbst braucht dafür KEIN Pyscript und KEIN eigenes Backend -
  nur Home Assistants eingebaute, seit Jahren stabile To-do-Dienste.

  Optionale Zusatz-Skripte (siehe ANLEITUNG-Backup.md), NICHT für den
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

  Installation der Karte:
  1. Diese Datei nach /config/www/rezeptbuch-card.js kopieren
  2. Einstellungen -> Dashboards -> Ressourcen -> Ressource hinzufügen
     URL: /local/rezeptbuch-card.js   Typ: JavaScript-Modul
  3. Karte hinzufügen mit:
     type: custom:rezeptbuch-card
     entity: todo.rezepte
     shopping_list_entity: todo.einkaufsliste   # optional, siehe Abschnitt 18

  Optional: shopping_list_entity zeigt auf eine ZWEITE Lokale To-do-Liste
  (eigene Integration, siehe ANLEITUNG-Backup.md Abschnitt 18) - erst damit
  funktioniert der "Einkaufsliste erstellen"-Knopf (Zutaten mehrerer
  ausgewählter Rezepte bzw. des Wochenplans werden dort angehängt). Ohne
  diese Angabe funktioniert die Karte unverändert weiter, der Knopf zeigt
  dann nur einen erklärenden Hinweis statt eines Absturzes.
*/

// ---------------------------------------------------------------------
// Übersetzungen (i18n): Deutsch ist die Standard-/Rückfallsprache dieses
// Projekts (siehe CONTRIBUTING.md) - jeder Text, den eine Nutzerin/ein
// Nutzer tatsächlich zu sehen bekommt (Knopfbeschriftungen, Platzhalter,
// alert()/confirm()-Texte, aria-label/title-Attribute, Leerzustände,
// PDF-/HTML-Export-Überschriften usw.) lebt hier als Übersetzungs-
// Schlüssel, NICHT als hart codierter String im restlichen Code. Interne,
// nicht sichtbare Dinge (JSON-Datenschlüssel wie "title"/"category",
// CSS-Klassennamen, console.error-Meldungen, Code-Kommentare, der
// gespeicherte Kategorie-Wert "Sonstiges" als Vergleichswert) bleiben
// bewusst unangetastet - siehe die Methoden _sprache()/_t() auf der
// Klasse für die Auflösung/Anwendung. Um eine weitere Sprache zu
// ergänzen: siehe CONTRIBUTING.md, Abschnitt "Eine neue Sprache
// ergänzen".
const UEBERSETZUNGEN = {
  de: {
    // Allgemein/mehrfach verwendet
    allgemein_zurueck: "← Zurück",
    allgemein_ja: "Ja",
    allgemein_nein: "Nein",
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
      "Für die Einkaufsliste fehlt noch die Konfiguration: bitte 'shopping_list_entity' " +
      "in der Kartenkonfiguration angeben (z.B. shopping_list_entity: todo.einkaufsliste) - " +
      "dafür wird eine ZWEITE Lokale To-do-Liste als Helfer benötigt. Siehe ANLEITUNG-Backup.md, Abschnitt 18.",
    fehler_einkaufsliste_keine_auswahl: "Bitte mindestens ein Rezept auswählen.",
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
    statistik_btn: "📊 Statistik",
    statistik_titel: "Koch-Statistik",
    statistik_info_aria: "Erklärung zur Statistik anzeigen",
    statistik_info_titel: "Wie wird diese Statistik berechnet?",
    statistik_info_text:
      "Diese Auswertung zählt jede Bestätigung der Frage „Hast du zubereitet?“ - unabhängig von Portionsgröße oder Häufigkeit am selben Tag. Ist diese Frage über die Kartenoption ask_cooked: false deaktiviert, wachsen die Zahlen nicht weiter, bereits erfasste Zubereitungen bleiben aber erhalten.",
    statistik_dieses_jahr: "Du hast in {{jahr}} {{anzahl}}x aus deinem Rezeptbuch gekocht",
    statistik_gesamt: "Du hast insgesamt {{anzahl}}x aus deinem Rezeptbuch gekocht",
    statistik_top_titel: "Meistgekocht",
    statistik_keine_daten: "Noch keine Zubereitungen erfasst.",
    modal_loeschen_frage: "\"{{titel}}\" wirklich löschen?",
    modal_loeschen_ja_btn: "Ja, löschen",

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
    formular_label_bild: "Bild",
    formular_bild_vorhanden_hinweis: "(vorhanden – neue Datei ersetzt es)",
    formular_bild_hinweis: "Aktuelles Bild bleibt erhalten, falls du keine neue Datei wählst.",
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
    fehler_config_entity_fehlt: "Bitte 'entity' in der Kartenkonfiguration angeben, z.B. entity: todo.rezepte",
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
    detail_kochmodus_btn: "🍳 Kochmodus",
    kochmodus_schritt_anzeige: "Schritt {{aktuell}} von {{gesamt}}",
    kochmodus_schliessen_aria: "Kochmodus schließen",
    kochmodus_schritt_zurueck_aria: "Vorheriger Schritt",
    kochmodus_schritt_weiter_aria: "Nächster Schritt",
    kochmodus_zutaten_ein_aria: "Zutaten einblenden",
    kochmodus_zutaten_aus_aria: "Zutaten ausblenden",
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
    sammel_pdf_auswahl_keine_hinweis: "Bitte mindestens ein Rezept auswählen.",
  },

  // Schwiizerdütsch (gsw) - es git kei einheitlichi amtlichi Schriibwiis
  // für Schwiizerdütsch (jedi Region schriibt anders). Da wird e einzigi,
  // in sich konsistenti, alltagstauglichi Schriibwiis verwendet (wie
  // WhatsApp-Schwiizerdütsch), keni wüsseschaftlichi Transkription.
  gsw: {
    // Allgemein/mehrfach verwendet
    allgemein_zurueck: "← Zrugg",
    allgemein_ja: "Ja",
    allgemein_nein: "Nei",
    allgemein_speichern: "Speichere",
    allgemein_speichert: "Speicheret…",
    allgemein_abbrechen: "Abbräche",
    allgemein_bearbeiten: "Bearbeite",
    allgemein_loeschen: "Lösche",
    allgemein_oeffnen: "Öffne",
    allgemein_unbekannt: "Unbekannt",
    allgemein_schliessen: "Schliesse",

    // Kategorien (Anzeige-Bezeichnungen - der intern gespeicherte/verglichene
    // Wert bleibt unabhängig von der Sprache immer der deutsche String aus
    // KATEGORIEN, siehe _kategorieLabel()).
    kategorie_hauptgericht: "Hauptgricht",
    kategorie_vorspeise: "Vorspys",
    kategorie_suppe: "Suppe",
    kategorie_salat: "Salat",
    kategorie_beilage: "Byylag",
    kategorie_dessert: "Dessert",
    kategorie_kuchen_gebaeck: "Chueche & Gebäck",
    kategorie_fruehstueck: "Zmorge",
    kategorie_snack: "Znüni/Zvieri",
    kategorie_getraenk: "Getränk",
    kategorie_sonstiges: "Anders",
    kategorie_filter_alle: "Alli",

    // Wochentage (Anzeige - der interne Schlüssel in WOCHENTAGE bleibt
    // sprachunabhängig "montag" usw., siehe _wochentagLabel()).
    wochentag_montag: "Määntig",
    wochentag_dienstag: "Zischtig",
    wochentag_mittwoch: "Mittwuch",
    wochentag_donnerstag: "Donnschtig",
    wochentag_freitag: "Fritig",
    wochentag_samstag: "Samschtig",
    wochentag_sonntag: "Sunntig",

    // Sortier-Optionen
    sortier_titel: "Alphabetisch (A-Z)",
    sortier_bewertung: "Beschti Bewertig zerscht",
    sortier_kategorie: "Nach Kategorie",
    sortier_neu: "Nöischt zerscht",
    sortieren_label: "Sortiere:",

    // Kopfbereich der Listenansicht
    kopf_titel_standard: "Rezäptbuech",
    kopf_sichern_btn: "💾 Sichere",
    kopf_wochenplan_btn: "📅 Wuchepla",
    einkaufsmodus_start_btn: "🛒 Yychaufsliste",
    einkaufsmodus_beenden_btn: "✕ Uswahl beende",
    kopf_neu_btn: "+ Nöis",
    suche_placeholder: "🔍 Rezäpt oder Zuetate (z.B. Mehl, Eier)…",

    // Kochbücher (gespeicherte Filter)
    kochbuch_loeschen_title: "Sammlig lösche",
    kochbuch_loeschen_aria: "Sammlig {{name}} lösche",
    kochbuch_speichern_btn: "+ Schlau Sammlig spichere",
    kochbuch_name_placeholder: "Name für die Sammlig, z.B. Herbschtrezäpt",
    fehler_kochbuch_name_fehlt: "Bitte en Name für die Sammlig yyge.",
    kochbuch_info_aria: "Erklärig zu schlaue Sammlige zeige",
    kochbuch_info_titel: "Was isch e schlaui Sammlig?",
    kochbuch_info_text:
      "E schlaui Sammlig spicheret kei feschti Liste vo Rezäpt, sondern " +
      "e Kombination us Kategorie, Tags und Suechbegriff, genau so wie " +
      "si grad iigstellt isch. Si aktualisiert sich danach vo elei: es " +
      "nöis Rezäpt, wo passt, taucht automatisch mit uuf, und es Rezäpt, " +
      "wo Kategorie oder Tags sich änderet, cha genauso automatisch " +
      "wieder verschwinde.",

    // Einkaufslisten-Auswahlmodus
    einkaufs_zaehler: "{{anzahl}} usgwählt",
    einkaufsliste_erstellen_btn: "Yychaufsliste erstelle",
    fehler_einkaufsliste_keine_konfiguration:
      "Für d Yychaufsliste fehlt no d Konfiguration: bitte 'shopping_list_entity' " +
      "i de Charte-Konfiguration aagäh (z.B. shopping_list_entity: todo.einkaufsliste) - " +
      "dafür bruucht's e ZWEITI Lokali To-do-Liste als Hälfer. Lueg i ANLEITUNG-Backup.md, Abschnitt 18.",
    fehler_einkaufsliste_keine_auswahl: "Bitte mindeschtens es Rezäpt uswähle.",
    fehler_einkaufsliste_keine_zutaten: "D usgwählte Rezäpt händ kei Zuetate.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen:
      "Konnt \"{{zeile}}\" nöd zur Yychaufsliste hinzuefüege:\n{{fehler}}\n\nScho hinzuegfüegti Zuetate bliibed i de Yychaufsliste.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} Zuetat(e) zu \"{{entity}}\" hinzuegfüegt.",

    // Rückgängig-Banner (nach Löschen)
    undo_geloescht: "\"{{titel}}\" glöscht.",
    undo_rueckgaengig_btn: "Rückgängig",

    // Leerzustände / Fehleranzeige der Listenansicht
    leer_keine_rezepte: "No kei Rezäpt – leg los mit \"+ Neu\"",
    leer_keine_treffer: "Kei Rezäpt gfunde für \"{{begriff}}\"",
    fehler_liste_laden_titel: "Konnt \"{{entity}}\" nöd lade.",
    fehler_liste_laden_hinweis: "Git's die To-do-Liste überhaupt? (Yystellige → Geräte & Dienscht → Hälfer)",

    // Rezept-Kacheln
    kachel_aria_label_oeffnen: "Rezäpt {{titel}} öffne",

    // Sterne-Bewertung
    sterne_aria_label_gruppe: "Eigeti Bewertig",
    sterne_aria_label: "{{zahl}} vo 5 Stärne",
    fehler_kein_benutzer_bewertung: "Konnt dyy Benutzer nöd ermittle - Bewertig nöd möglich.",

    // Detailansicht
    detail_teilen_drucken_btn: "📤 Teile / Drucke",
    detail_erstellt_von: "👤 Erstellt vo {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} Bewertig)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} Bewertige)",
    detail_keine_bewertungen: "No kei Bewertige",
    detail_deine_bewertung: "Dyy Bewertig:",
    detail_zubereitet_x: "🍳 {{anzahl}}x zubereitet",
    detail_portionen_suffix: "Portione",
    abschnitt_titel_zutaten: "Zuetate",
    abschnitt_titel_zubereitung: "Zuebereitig",
    keine_zutaten: "Kei Zuetate hinterlegt",
    detail_kommentare_titel: "Kommentar",
    detail_keine_kommentare: "No kei Kommentar",
    detail_kommentar_placeholder: "Ergänzig, Tipp oder Aamerkig…",
    detail_kommentar_hinzufuegen_btn: "Kommentar hinzuefüege",
    detail_bearbeiten_hinweis: "Nur {{name}} (oder en Admin) cha das Rezäpt bearbeite oder lösche.",
    detail_ersteller_unbekannt: "de/die Ersteller:in",
    modal_zubereitet_frage: "Hesch \"{{titel}}\" zubereitet?",
    statistik_btn: "📊 Statistik",
    statistik_titel: "Koch-Statistik",
    statistik_info_aria: "Erklärig zur Statistik zeige",
    statistik_info_titel: "Wie wird die Statistik berechnet?",
    statistik_info_text:
      "Die Uswärtig zellt jedi Bestätigung vo de Frag „Hesch zubereitet?“ - unabhängig vo de Portionegrössi oder wie oft am gliiche Tag. Isch die Frag über d'Charte-Option ask_cooked: false deaktiviert, wachsed d'Zahle nüm wiiter, scho erfasti Zubereitige bliebed aber erhalte.",
    statistik_dieses_jahr: "Du hesch im {{jahr}} {{anzahl}}x us dim Rezeptbuech kocht",
    statistik_gesamt: "Du hesch insgesamt {{anzahl}}x us dim Rezeptbuech kocht",
    statistik_top_titel: "Am meischte gkocht",
    statistik_keine_daten: "No kei Zubereitige erfasst.",
    modal_loeschen_frage: "\"{{titel}}\" wirklich lösche?",
    modal_loeschen_ja_btn: "Ja, lösche",

    // Wochenplan
    wochenplan_titel: "Wuchepla",
    wochenplan_tab_diese: "Die Wuche",
    wochenplan_tab_folgewoche: "Nächschti Wuche",
    wochenplan_hinweis_folgewoche:
      "Plaan hie scho jetzt d chuu Wuche - sie rutscht automatisch zu \"Die Wuche\" nache, sobald d aktuelli Wuche verbii isch.",
    wochenplan_hinweis_diese:
      "Scho vergangeni Täg werded automatisch gleert (s Rezäpt sälber bliibt erhalte, nur d Zueordnig verschwindet).",
    wochenplan_hinweis_speicherung:
      "Wird geräteübergryfend gspeichert (als unsichtbare Zuesatzyytrag i derselbe Rezäptliste, kein wyterer Hälfer nötig).",
    wochenplan_leer: "No kei Rezäpt vorhande - zerscht welchi aalege.",
    wochenplan_kein_rezept_option: "– kes Rezäpt –",
    wochenplan_einkaufsliste_btn: "Yychaufsliste us {{ziel}} erstelle",
    wochenplan_wort: "Wuchepla",
    wochenplan_folgewoche_wort: "Nächschti Wuche",
    wochenplan_aktuelle_woche_wort: "aktuelli Wuche",
    wochenplan_keine_zuweisung: "D {{zeitraum}} het no kei zuegwiesni Rezäpt.",

    // Formular (neues/bearbeiten Rezept)
    formular_titel_neu: "Nöis Rezäpt",
    formular_titel_bearbeiten: "Rezäpt bearbeite",
    formular_url_import_btn: "🌐 Rezäpt-URL importiere",
    formular_url_label: "Link zur Rezäpt-Website",
    formular_url_placeholder: "https://www.byspiil-rezäpt.de/mys-rezäpt",
    formular_url_hinweis:
      "Lädt d Syte und liist die dört sowieso yygbauete " +
      "Rezäpt-Strukturdate us (die gliiche Date, mit dene z.B. " +
      "Google d Sterne-Bewertige i de Suechi aazeigt) - meischtens " +
      "zueverlässiger als Text-Erkennig. Funktioniert nur bi Syte, " +
      "die sonig Date parat händ, und die automatisierti Aafroge " +
      "nöd blockiered.",
    formular_url_importieren_btn: "Importiere",
    formular_url_laedt: "Lädt …",
    formular_text_einfuegen_btn: "🔍 Rezäpttext yyfüege (automatisch erkenne)",
    formular_text_label: "Rezäpttext da yyfüege (z.B. vo re Rezäpt-Website kopiert)",
    formular_text_placeholder: "Titel, Zuetate, Zuebereitig - eifach de ganz Text da yynecopiere",
    formular_text_hinweis:
      "Rein automatischi Erkennig ohni KI - funktioniert am beschte mit " +
      "\"Zuetate\"- und \"Zuebereitig\"-Überschrifte im Text. Bitte s " +
      "Ergäbnis nachher churz prüefe, es cha unvollständig sy.",
    formular_text_erkennen_btn: "Erkenne",
    formular_json_einfuegen_btn: "📋 Vo re KI erzügts JSON yyfüege",
    formular_json_info_aria: "Passende Prompt für e KI aazeige",
    json_info_titel: "Prompt für e KI",
    json_info_erklaerung:
      "Da Text kopiere, i e KI vo dyner Wahl (z.B. ChatGPT oder " +
      "Claude) yyfüege, dyy Rezäpttext aahänge und d Antwort nachher " +
      "obe bi \"JSON da yyfüege\" yyfüege.",
    json_info_prompt:
      "Wandle de Rezäpttext, wo ich dir gliich schicke, i EIS einzigs " +
      "JSON-Objekt um - ohni Erklärig, ohni Text davor oder danach, nur " +
      "s JSON. Bruuch genau das Format:\n\n" +
      "{\n" +
      '  "title": "Name vom Rezäpt",\n' +
      '  "servings": 4,\n' +
      '  "category": "eini vo: {{kategorien}}",\n' +
      '  "ingredients": ["ei Zuetat pro Yytrag, z.B. 200 g Mehl"],\n' +
      '  "steps": ["ei Zuebereitigsschritt pro Yytrag"],\n' +
      '  "tags": ["optionali Stichwort, z.B. vegetarisch"]\n' +
      "}\n\n" +
      'Räägle: "category" mues GENAU eine vo de obe gnennte Wärt sy ' +
      "(unverändert übernäh, au wenn de Rezäpttext i re anderi " +
      'Sprach isch). "tags" isch optional, notfalls es leers Array. ' +
      "Erfind kei Zuetate oder Schritt, wo nöd im Text stönd. " +
      "Da isch de Rezäpttext:",
    json_info_kopieren_btn: "📋 Prompt kopiere",
    json_info_kopiert: "Kopiert!",
    formular_json_label: "JSON da yyfüege",
    formular_json_uebernehmen_btn: "Übernäh",
    formular_label_titel: "Titel",
    formular_label_kategorie: "Kategorie",
    formular_label_tags: "Tags (mehreri möglich, z.B. \"vegetarisch\", \"schnäll\")",
    formular_tag_placeholder: "Tag yygäh und hinzuefüege",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Tag {{tag}} entferne",
    formular_label_portionen: "Portione (Basis)",
    formular_label_zutaten: "Zuetate",
    formular_zutat_hinzufuegen_btn: "+ Zuetat",
    formular_zutat_menge_placeholder: "Mängi",
    formular_zutat_einheit_placeholder: "Einheit",
    formular_zutat_name_placeholder: "Zuetat",
    formular_zutat_entfernen_aria: "Zuetat entferne",
    formular_label_zubereitung: "Zuebereitig (Schritt)",
    formular_schritt_hinzufuegen_btn: "+ Schritt",
    formular_schritt_placeholder_beispiel: "z.B. Gmües wäsche und schniide",
    formular_schritt_placeholder_naechster: "nächschte Schritt",
    formular_schritt_entfernen_aria: "Schritt entferne",
    formular_label_bild: "Bild",
    formular_bild_vorhanden_hinweis: "(vorhande – nöis File ersetzt s)",
    formular_bild_hinweis: "S aktuälle Bild bliibt erhalte, falls kes nöis File usgwählt wird.",
    formular_bild_verkleinern_text: "Bild wird verchlyneret…",

    // Fehler-/Hinweismeldungen des Formulars
    fehler_url_ungueltig: "Bitte e vollständigi Adrässe mit http:// oder https:// aagäh.",
    fehler_url_apostroph: "Die Adrässe het en Apostroph (') und cha leider nöd importiert wärde.",
    fehler_url_keine_ausgabe:
      "S Skript het kei Usgab gliifered. Isch 'rezeptbuch_url_importieren' in configuration.yaml " +
      "yygrichtet und Home Assistant syt dem einisch komplett neu gstartet worde?",
    fehler_url_kein_json: "D Antwort vom Import-Skript isch kes gültigs JSON gsi.",
    fehler_url_import_fehlgeschlagen: "URL-Import fehlgschlage: {{fehler}}",
    fehler_texterkennung_nichts_gefunden:
      "Konnt im yyfüegte Text leider nüt erkenne. Bitte d Fälder unte vo Hand usfülle.",
    warnung_texterkennung_unvollstaendig:
      "Erkennig isch unvollständig gsi (Zuetate oder Schritt fehled/sind evtl. falsch zuegordnet) - bitte im Formular prüefe und ergänze.",
    fehler_json_ungueltig: "S yyfüegte JSON isch ungültig. Bitte prüefe und nomal versueche.",
    fehler_json_titel_fehlt: "Im JSON fehlt mindeschtens s Fäld 'title'.",
    fehler_titel_fehlt: "Bitte en Titel yygäh.",
    fehler_unerwartet: "Unerwarteter Fehler:\n{{fehler}}",
    fehler_konflikt_geloescht:
      "\"{{titel}}\" isch mittlerwyle vo öpper anderem glöscht worde. Dyyni Änderige sind nöd gspichert worde.",
    fehler_konflikt_geaendert:
      "\"{{titel}}\" isch mittlerwyle vo öpper anderem gänderet worde (z. B. Kommentar, Bewertig " +
      "oder eigeni Bearbeitig).\n\nDamit drum nüt überschriibe wird, sind dyyni Änderige " +
      "NÖD gspichert worde. Bitte öffne s Rezäpt nomal und träg dyyni Änderige nomal y.",
    fehler_vorgang_fehlgeschlagen: "Vorgang fehlgschlage:\n{{fehler}}",
    fehler_teilen_drucken: "Unerwarteter Fehler bim Teile/Drucke:\n{{fehler}}",
    fehler_config_entity_fehlt: "Bitte 'entity' i de Charte-Konfiguration aagäh, z.B. entity: todo.rezepte",
    fehler_bild_lesen: "Foti het nöd gläse wärde chöne (File beschädiget oder nöd unterstützt).",
    fehler_bild_verarbeiten: "Foti het nöd als Bild verarbeitet wärde chöne (nöd unterstützts Format?).",

    // Teilen (Text-Variante) / PDF-/HTML-Export
    teilen_ueberschrift_zutaten: "ZUETATE",
    teilen_ueberschrift_zubereitung: "ZUEBEREITIG",
    seite_zurueck_btn: "← Zrugg",
    seite_weiter_btn: "Wieter →",
    seite_anzeige: "Siite {{aktuell}} vo {{gesamt}}",
    update_neue_version: "Neui Version verfüegbar: {{version}}",
    update_ansehen_btn: "Aluege",
    update_schliessen_aria: "Hiwiis usblände",
    detail_kochmodus_btn: "🍳 Kochmodus",
    kochmodus_schritt_anzeige: "Schritt {{aktuell}} vo {{gesamt}}",
    kochmodus_schliessen_aria: "Kochmodus schliesse",
    kochmodus_schritt_zurueck_aria: "Vorherige Schritt",
    kochmodus_schritt_weiter_aria: "Nächschte Schritt",
    kochmodus_zutaten_ein_aria: "Zuetate iblände",
    kochmodus_zutaten_aus_aria: "Zuetate usblände",
    kopf_sammel_pdf_btn: "📚 Sammel-PDF",
    sammel_pdf_keine_rezepte: "Kei Rezept zum Exportiere gfunde.",
    sammel_pdf_frage_toc: "Sölled mer es Inhaltsverzeichnis vo de usgwählte Rezept erstelle?",
    sammel_pdf_ja_toc_btn: "Ja, Inhaltsverzeichnis erstelle",
    sammel_pdf_nein_toc_btn: "Nei, kes Inhaltsverzeichnis",
    sammel_pdf_name_placeholder: "Name vom Kochbuech",
    sammel_pdf_erstellen_btn: "PDF erstelle",
    abschnitt_titel_inhaltsverzeichnis: "Inhaltsverzeichnis",
    sammel_pdf_frage_umfang: "Weli Rezept sölled ins Sammel-PDF?",
    sammel_pdf_alle_rezepte_btn: "Alli aazeigte Rezept",
    sammel_pdf_auswahl_btn: "Bstimmti Rezept uswähle",
    sammel_pdf_auswahl_titel: "Rezept uswähle",
    sammel_pdf_alle_auswaehlen_link: "Alli uswähle",
    sammel_pdf_keine_auswaehlen_link: "Kes uswähle",
    sammel_pdf_weiter_btn: "Wiiter",
    sammel_pdf_auswahl_keine_hinweis: "Bitte mindischtens ei Rezept uswähle.",
  },
  en: {
    allgemein_zurueck: "← Back",
    allgemein_ja: "Yes",
    allgemein_nein: "No",
    allgemein_speichern: "Save",
    allgemein_speichert: "Saving…",
    allgemein_abbrechen: "Cancel",
    allgemein_bearbeiten: "Edit",
    allgemein_loeschen: "Delete",
    allgemein_oeffnen: "Open",
    allgemein_unbekannt: "Unknown",
    allgemein_schliessen: "Close",

    kategorie_hauptgericht: "Main course",
    kategorie_vorspeise: "Starter",
    kategorie_suppe: "Soup",
    kategorie_salat: "Salad",
    kategorie_beilage: "Side dish",
    kategorie_dessert: "Dessert",
    kategorie_kuchen_gebaeck: "Cakes & baking",
    kategorie_fruehstueck: "Breakfast",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Drink",
    kategorie_sonstiges: "Other",
    kategorie_filter_alle: "All",

    wochentag_montag: "Monday",
    wochentag_dienstag: "Tuesday",
    wochentag_mittwoch: "Wednesday",
    wochentag_donnerstag: "Thursday",
    wochentag_freitag: "Friday",
    wochentag_samstag: "Saturday",
    wochentag_sonntag: "Sunday",

    sortier_titel: "Alphabetical (A-Z)",
    sortier_bewertung: "Best rating first",
    sortier_kategorie: "By category",
    sortier_neu: "Newest first",
    sortieren_label: "Sort by:",

    kopf_titel_standard: "Recipe Book",
    kopf_sichern_btn: "💾 Backup",
    kopf_wochenplan_btn: "📅 Meal plan",
    einkaufsmodus_start_btn: "🛒 Shopping list",
    einkaufsmodus_beenden_btn: "✕ Cancel selection",
    kopf_neu_btn: "+ New",
    suche_placeholder: "🔍 Recipe or ingredients (e.g. flour, eggs)…",

    kochbuch_loeschen_title: "Delete collection",
    kochbuch_loeschen_aria: "Delete collection {{name}}",
    kochbuch_speichern_btn: "+ Save as smart collection",
    kochbuch_name_placeholder: "Name for this collection, e.g. Autumn recipes",
    fehler_kochbuch_name_fehlt: "Please enter a name for the collection.",
    kochbuch_info_aria: "Show explanation of smart collections",
    kochbuch_info_titel: "What is a smart collection?",
    kochbuch_info_text:
      "A smart collection doesn't store a fixed list of recipes - it " +
      "stores a combination of category, tags and search term, exactly " +
      "as they're set when you save it. It then updates itself " +
      "automatically: a new recipe that matches shows up on its own, and " +
      "a recipe whose category or tags change can just as automatically " +
      "disappear again.",

    einkaufs_zaehler: "{{anzahl}} selected",
    einkaufsliste_erstellen_btn: "Create shopping list",
    fehler_einkaufsliste_keine_konfiguration:
      "The shopping list still needs to be configured: please set 'shopping_list_entity' " +
      "in the card configuration (e.g. shopping_list_entity: todo.shopping_list) - " +
      "this requires a SECOND Local To-do List helper. See ANLEITUNG-Backup.md, section 18.",
    fehler_einkaufsliste_keine_auswahl: "Please select at least one recipe.",
    fehler_einkaufsliste_keine_zutaten: "The selected recipes don't contain any ingredients.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen:
      "Could not add \"{{zeile}}\" to the shopping list:\n{{fehler}}\n\nIngredients already added remain on the shopping list.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingredient(s) added to \"{{entity}}\".",

    undo_geloescht: "\"{{titel}}\" deleted.",
    undo_rueckgaengig_btn: "Undo",

    leer_keine_rezepte: "No recipes yet – get started with \"+ New\"",
    leer_keine_treffer: "No recipes found for \"{{begriff}}\"",
    fehler_liste_laden_titel: "Could not load \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Does this to-do list exist? (Settings → Devices & Services → Helpers)",

    kachel_aria_label_oeffnen: "Open recipe {{titel}}",

    sterne_aria_label_gruppe: "Your rating",
    sterne_aria_label: "{{zahl}} of 5 stars",
    fehler_kein_benutzer_bewertung: "Could not determine your user - rating not possible.",

    detail_teilen_drucken_btn: "📤 Share / Print",
    detail_erstellt_von: "👤 Created by {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} rating)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} ratings)",
    detail_keine_bewertungen: "No ratings yet",
    detail_deine_bewertung: "Your rating:",
    detail_zubereitet_x: "🍳 cooked {{anzahl}}x",
    detail_portionen_suffix: "servings",
    abschnitt_titel_zutaten: "Ingredients",
    abschnitt_titel_zubereitung: "Instructions",
    keine_zutaten: "No ingredients listed",
    detail_kommentare_titel: "Comments",
    detail_keine_kommentare: "No comments yet",
    detail_kommentar_placeholder: "Add a note, tip or comment…",
    detail_kommentar_hinzufuegen_btn: "Add comment",
    detail_bearbeiten_hinweis: "Only {{name}} (or an admin) can edit or delete this recipe.",
    detail_ersteller_unbekannt: "the creator",
    modal_zubereitet_frage: "Did you cook \"{{titel}}\"?",
    statistik_btn: "📊 Statistics",
    statistik_titel: "Cooking statistics",
    statistik_info_aria: "Show explanation of the statistics",
    statistik_info_titel: "How is this statistic calculated?",
    statistik_info_text:
      "This evaluation counts every confirmed \"Did you cook this?\" answer - regardless of serving size or how often it happened on the same day. If that question is disabled via the ask_cooked: false card option, the numbers stop growing, but already recorded preparations are kept.",
    statistik_dieses_jahr: "You've cooked {{anzahl}}x from your recipe book in {{jahr}}",
    statistik_gesamt: "You've cooked {{anzahl}}x from your recipe book in total",
    statistik_top_titel: "Most cooked",
    statistik_keine_daten: "No preparations recorded yet.",
    modal_loeschen_frage: "Really delete \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Yes, delete",

    wochenplan_titel: "Meal plan",
    wochenplan_tab_diese: "This week",
    wochenplan_tab_folgewoche: "Next week",
    wochenplan_hinweis_folgewoche:
      "Plan the coming week here already - it will automatically move to \"This week\" once the current week is over.",
    wochenplan_hinweis_diese:
      "Past days are automatically cleared (the recipe itself is kept, only the day assignment disappears).",
    wochenplan_hinweis_speicherung:
      "Saved across devices (as a hidden extra entry in the same recipe list, no additional helper needed).",
    wochenplan_leer: "No recipes yet - create some first.",
    wochenplan_kein_rezept_option: "– no recipe –",
    wochenplan_einkaufsliste_btn: "Create shopping list from {{ziel}}",
    wochenplan_wort: "meal plan",
    wochenplan_folgewoche_wort: "next week",
    wochenplan_aktuelle_woche_wort: "current week",
    wochenplan_keine_zuweisung: "The {{zeitraum}} doesn't have any recipes assigned yet.",

    formular_titel_neu: "New recipe",
    formular_titel_bearbeiten: "Edit recipe",
    formular_url_import_btn: "🌐 Import recipe URL",
    formular_url_label: "Link to the recipe website",
    formular_url_placeholder: "https://www.example-recipes.com/my-recipe",
    formular_url_hinweis:
      "Loads the page and reads the recipe structured data already embedded in it " +
      "(the same data e.g. Google uses to show star ratings in search results) - " +
      "usually more reliable than text recognition. Only works on sites that " +
      "provide such data and don't block automated requests.",
    formular_url_importieren_btn: "Import",
    formular_url_laedt: "Loading …",
    formular_text_einfuegen_btn: "🔍 Paste recipe text (auto-detect)",
    formular_text_label: "Paste recipe text here (e.g. copied from a recipe website)",
    formular_text_placeholder: "Title, ingredients, instructions - just paste the whole text",
    formular_text_hinweis:
      "Purely automatic recognition without AI - works best with " +
      "\"Ingredients\" and \"Instructions\" headings in the text. Please " +
      "briefly check the result afterwards, it may be incomplete.",
    formular_text_erkennen_btn: "Detect",
    formular_json_einfuegen_btn: "📋 Paste AI-generated JSON",
    formular_json_info_aria: "Show a ready-made prompt for an AI",
    json_info_titel: "Prompt for an AI",
    json_info_erklaerung:
      "Copy this text, paste it into an AI of your choice (e.g. ChatGPT " +
      "or Claude), attach your recipe text, and paste the answer above " +
      'under "Paste AI-generated JSON".',
    json_info_prompt:
      "Convert the recipe text I'm about to send you into ONE single " +
      "JSON object - no explanation, no text before or after, just the " +
      "JSON. Use exactly this format:\n\n" +
      "{\n" +
      '  "title": "recipe name",\n' +
      '  "servings": 4,\n' +
      '  "category": "one of: {{kategorien}}",\n' +
      '  "ingredients": ["one ingredient per entry, e.g. 200g flour"],\n' +
      '  "steps": ["one instruction step per entry"],\n' +
      '  "tags": ["optional keywords, e.g. vegetarian"]\n' +
      "}\n\n" +
      'Rules: "category" must be EXACTLY one of the values listed above ' +
      "(copy it unchanged, even if the recipe text is in another " +
      'language - these are fixed internal values). "tags" is optional, ' +
      "an empty array is fine. Don't invent ingredients or steps that " +
      "aren't in the text. Here is the recipe text:",
    json_info_kopieren_btn: "📋 Copy prompt",
    json_info_kopiert: "Copied!",
    formular_json_label: "Paste JSON here",
    formular_json_uebernehmen_btn: "Apply",
    formular_label_titel: "Title",
    formular_label_kategorie: "Category",
    formular_label_tags: "Tags (multiple possible, e.g. \"vegetarian\", \"quick\")",
    formular_tag_placeholder: "Enter and add a tag",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Remove tag {{tag}}",
    formular_label_portionen: "Servings (base)",
    formular_label_zutaten: "Ingredients",
    formular_zutat_hinzufuegen_btn: "+ Ingredient",
    formular_zutat_menge_placeholder: "Amount",
    formular_zutat_einheit_placeholder: "Unit",
    formular_zutat_name_placeholder: "Ingredient",
    formular_zutat_entfernen_aria: "Remove ingredient",
    formular_label_zubereitung: "Instructions (steps)",
    formular_schritt_hinzufuegen_btn: "+ Step",
    formular_schritt_placeholder_beispiel: "e.g. wash and chop vegetables",
    formular_schritt_placeholder_naechster: "next step",
    formular_schritt_entfernen_aria: "Remove step",
    formular_label_bild: "Photo",
    formular_bild_vorhanden_hinweis: "(present – a new file will replace it)",
    formular_bild_hinweis: "The current photo is kept if you don't choose a new file.",
    formular_bild_verkleinern_text: "Resizing photo…",

    fehler_url_ungueltig: "Please enter a full address starting with http:// or https://.",
    fehler_url_apostroph: "This address contains an apostrophe (') and unfortunately can't be imported.",
    fehler_url_keine_ausgabe:
      "The script didn't return any output. Is 'rezeptbuch_url_importieren' set up in configuration.yaml, " +
      "and has Home Assistant been fully restarted since then?",
    fehler_url_kein_json: "The import script's response wasn't valid JSON.",
    fehler_url_import_fehlgeschlagen: "URL import failed: {{fehler}}",
    fehler_texterkennung_nichts_gefunden:
      "Couldn't detect anything in the pasted text. Please fill in the fields below by hand.",
    warnung_texterkennung_unvollstaendig:
      "Detection was incomplete (ingredients or steps are missing or may be assigned incorrectly) - please check and complete the form.",
    fehler_json_ungueltig: "The pasted JSON is invalid. Please check and try again.",
    fehler_json_titel_fehlt: "The JSON is missing at least the 'title' field.",
    fehler_titel_fehlt: "Please enter a title.",
    fehler_unerwartet: "Unexpected error:\n{{fehler}}",
    fehler_konflikt_geloescht:
      "\"{{titel}}\" has since been deleted by someone else. Your changes were not saved.",
    fehler_konflikt_geaendert:
      "\"{{titel}}\" has since been changed by someone else (e.g. a comment, rating " +
      "or their own edit).\n\nTo avoid overwriting that, your changes were NOT saved. " +
      "Please open the recipe again and re-enter your changes.",
    fehler_vorgang_fehlgeschlagen: "Action failed:\n{{fehler}}",
    fehler_teilen_drucken: "Unexpected error while sharing/printing:\n{{fehler}}",
    fehler_config_entity_fehlt: "Please specify 'entity' in the card configuration, e.g. entity: todo.rezepte",
    fehler_bild_lesen: "Couldn't read the photo (file corrupted or unsupported).",
    fehler_bild_verarbeiten: "Couldn't process the photo as an image (unsupported format?).",

    teilen_ueberschrift_zutaten: "INGREDIENTS",
    teilen_ueberschrift_zubereitung: "INSTRUCTIONS",
    seite_zurueck_btn: "← Back",
    seite_weiter_btn: "Next →",
    seite_anzeige: "Page {{aktuell}} of {{gesamt}}",
    update_neue_version: "New version available: {{version}}",
    update_ansehen_btn: "View",
    update_schliessen_aria: "Dismiss notice",
    detail_kochmodus_btn: "🍳 Cook Mode",
    kochmodus_schritt_anzeige: "Step {{aktuell}} of {{gesamt}}",
    kochmodus_schliessen_aria: "Close cook mode",
    kochmodus_schritt_zurueck_aria: "Previous step",
    kochmodus_schritt_weiter_aria: "Next step",
    kochmodus_zutaten_ein_aria: "Show ingredients",
    kochmodus_zutaten_aus_aria: "Hide ingredients",
    kopf_sammel_pdf_btn: "📚 Collected PDF",
    sammel_pdf_keine_rezepte: "No recipes found to export.",
    sammel_pdf_frage_toc: "Create a table of contents for the selected recipes?",
    sammel_pdf_ja_toc_btn: "Yes, create a table of contents",
    sammel_pdf_nein_toc_btn: "No, no table of contents",
    sammel_pdf_name_placeholder: "Cookbook name",
    sammel_pdf_erstellen_btn: "Create PDF",
    abschnitt_titel_inhaltsverzeichnis: "Table of Contents",
    sammel_pdf_frage_umfang: "Which recipes should go into the combined PDF?",
    sammel_pdf_alle_rezepte_btn: "All shown recipes",
    sammel_pdf_auswahl_btn: "Select specific recipes",
    sammel_pdf_auswahl_titel: "Select recipes",
    sammel_pdf_alle_auswaehlen_link: "Select all",
    sammel_pdf_keine_auswaehlen_link: "Select none",
    sammel_pdf_weiter_btn: "Next",
    sammel_pdf_auswahl_keine_hinweis: "Please select at least one recipe.",
  },
  bg: {
    allgemein_zurueck: "← Назад",
    allgemein_ja: "Да",
    allgemein_nein: "Не",
    allgemein_speichern: "Запази",
    allgemein_speichert: "Запазва се…",
    allgemein_abbrechen: "Отказ",
    allgemein_bearbeiten: "Редактирай",
    allgemein_loeschen: "Изтрий",
    allgemein_oeffnen: "Отвори",
    allgemein_unbekannt: "Неизвестно",
    allgemein_schliessen: "Затвори",
    kategorie_hauptgericht: "Основно ястие",
    kategorie_vorspeise: "Предястие",
    kategorie_suppe: "Супа",
    kategorie_salat: "Салата",
    kategorie_beilage: "Гарнитура",
    kategorie_dessert: "Десерт",
    kategorie_kuchen_gebaeck: "Торти и сладкиши",
    kategorie_fruehstueck: "Закуска",
    kategorie_snack: "Снак",
    kategorie_getraenk: "Напитка",
    kategorie_sonstiges: "Друго",
    kategorie_filter_alle: "Всички",
    wochentag_montag: "Понеделник",
    wochentag_dienstag: "Вторник",
    wochentag_mittwoch: "Сряда",
    wochentag_donnerstag: "Четвъртък",
    wochentag_freitag: "Петък",
    wochentag_samstag: "Събота",
    wochentag_sonntag: "Неделя",
    sortier_titel: "По азбучен ред (А-Я)",
    sortier_bewertung: "Първо най-високо оценени",
    sortier_kategorie: "По категория",
    sortier_neu: "Първо най-новите",
    sortieren_label: "Подреди по:",
    kopf_titel_standard: "Готварска книга",
    kopf_sichern_btn: "💾 Резервно копие",
    kopf_wochenplan_btn: "📅 Седмичен план",
    einkaufsmodus_start_btn: "🛒 Списък за пазаруване",
    einkaufsmodus_beenden_btn: "✕ Прекрати избора",
    kopf_neu_btn: "+ Ново",
    suche_placeholder: "🔍 Рецепта или съставки (напр. брашно, яйца)…",
    kochbuch_loeschen_title: "Изтриване на колекция",
    kochbuch_loeschen_aria: "Изтриване на колекция {{name}}",
    kochbuch_speichern_btn: "+ Запази като умна колекция",
    kochbuch_name_placeholder: "Име за тази колекция, напр. Есенни рецепти",
    fehler_kochbuch_name_fehlt: "Моля, въведете име за колекцията.",
    kochbuch_info_aria: "Показване на обяснение за умни колекции",
    kochbuch_info_titel: "Какво е умна колекция?",
    kochbuch_info_text:
      "Умната колекция не съхранява фиксиран списък с рецепти, а " +
      "комбинация от категория, етикети и търсен термин, точно както " +
      "са зададени в момента на запазването. След това тя се " +
      "актуализира сама: нова рецепта, която отговаря на условията, " +
      "се появява автоматично, а рецепта, чиято категория или етикети " +
      "се променят, може също толкова автоматично да изчезне отново.",
    einkaufs_zaehler: "{{anzahl}} избрани",
    einkaufsliste_erstellen_btn: "Създай списък за пазаруване",
    fehler_einkaufsliste_keine_konfiguration: "За списъка за пазаруване все още липсва конфигурация: моля, задайте 'shopping_list_entity' в конфигурацията на картата (напр. shopping_list_entity: todo.einkaufsliste) - за това е необходим ВТОРИ помощник \"Локален списък със задачи\". Вижте ANLEITUNG-Backup.md, раздел 18.",
    fehler_einkaufsliste_keine_auswahl: "Моля, изберете поне една рецепта.",
    fehler_einkaufsliste_keine_zutaten: "Избраните рецепти не съдържат съставки.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Не можа да се добави \"{{zeile}}\" към списъка за пазаруване:\n{{fehler}}\n\nВече добавените съставки остават в списъка.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} съставка(и) добавени към \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" изтрита.",
    undo_rueckgaengig_btn: "Отмени",
    leer_keine_rezepte: "Все още няма рецепти – започни с \"+ Ново\"",
    leer_keine_treffer: "Няма намерени рецепти за \"{{begriff}}\"",
    fehler_liste_laden_titel: "Не можа да се зареди \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Съществува ли този списък със задачи? (Настройки → Устройства и услуги → Помощници)",
    kachel_aria_label_oeffnen: "Отвори рецепта {{titel}}",
    sterne_aria_label_gruppe: "Собствена оценка",
    sterne_aria_label: "{{zahl}} от 5 звезди",
    fehler_kein_benutzer_bewertung: "Не можа да се определи потребителят ти - оценяването не е възможно.",
    detail_teilen_drucken_btn: "📤 Сподели / Разпечатай",
    detail_erstellt_von: "👤 Създадено от {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} оценка)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} оценки)",
    detail_keine_bewertungen: "Все още няма оценки",
    detail_deine_bewertung: "Твоята оценка:",
    detail_zubereitet_x: "🍳 приготвено {{anzahl}} пъти",
    detail_portionen_suffix: "порции",
    abschnitt_titel_zutaten: "Съставки",
    abschnitt_titel_zubereitung: "Приготвяне",
    keine_zutaten: "Няма въведени съставки",
    detail_kommentare_titel: "Коментари",
    detail_keine_kommentare: "Все още няма коментари",
    detail_kommentar_placeholder: "Допълнение, съвет или бележка…",
    detail_kommentar_hinzufuegen_btn: "Добави коментар",
    detail_bearbeiten_hinweis: "Само {{name}} (или администратор) може да редактира или изтрие тази рецепта.",
    detail_ersteller_unbekannt: "създателя/създателката",
    modal_zubereitet_frage: "Приготви ли \"{{titel}}\"?",
    statistik_btn: "📊 Статистика",
    statistik_titel: "Статистика за готвене",
    statistik_info_aria: "Показване на обяснение за статистиката",
    statistik_info_titel: "Как се изчислява тази статистика?",
    statistik_info_text:
      "Тази статистика брои всяко потвърждение на въпроса „Приготви ли го?“ - независимо от размера на порцията или колко пъти в един и същи ден. Ако този въпрос е деактивиран чрез опцията ask_cooked: false, числата спират да растат, но вече записаните приготвяния се запазват.",
    statistik_dieses_jahr: "Готвил(а) си {{anzahl}}x от готварската си книга през {{jahr}}",
    statistik_gesamt: "Готвил(а) си общо {{anzahl}}x от готварската си книга",
    statistik_top_titel: "Най-често готвено",
    statistik_keine_daten: "Все още няма записани приготвяния.",
    modal_loeschen_frage: "Наистина ли да изтрия \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Да, изтрий",
    wochenplan_titel: "Седмичен план",
    wochenplan_tab_diese: "Тази седмица",
    wochenplan_tab_folgewoche: "Следваща седмица",
    wochenplan_hinweis_folgewoche: "Планирай тук вече и предстоящата седмица - тя автоматично се премества в \"Тази седмица\", щом текущата седмица приключи.",
    wochenplan_hinweis_diese: "Изминалите дни се изчистват автоматично (самата рецепта се запазва, изчезва само присвояването).",
    wochenplan_hinweis_speicherung: "Запазва се на всички устройства (като невидим допълнителен запис в същия списък с рецепти, не е нужен друг помощник).",
    wochenplan_leer: "Все още няма рецепти - първо създай няколко.",
    wochenplan_kein_rezept_option: "– няма рецепта –",
    wochenplan_einkaufsliste_btn: "Създай списък за пазаруване от {{ziel}}",
    wochenplan_wort: "седмичен план",
    wochenplan_folgewoche_wort: "следваща седмица",
    wochenplan_aktuelle_woche_wort: "текущата седмица",
    wochenplan_keine_zuweisung: "{{zeitraum}} все още не съдържа присвоени рецепти.",
    formular_titel_neu: "Нова рецепта",
    formular_titel_bearbeiten: "Редактирай рецепта",
    formular_url_import_btn: "🌐 Импортирай URL адрес на рецепта",
    formular_url_label: "Връзка към уебсайта с рецептата",
    formular_url_placeholder: "https://www.primer-recepti.bg/moyata-recepta",
    formular_url_hinweis: "Зарежда страницата и чете структурираните данни за рецептата, вградени в нея (същите данни, с които напр. Google показва звездни оценки в търсенето) - обикновено по-надеждно от разпознаване на текст. Работи само при страници, които предоставят такива данни и не блокират автоматизирани заявки.",
    formular_url_importieren_btn: "Импортирай",
    formular_url_laedt: "Зарежда се …",
    formular_text_einfuegen_btn: "🔍 Постави текст на рецепта (автоматично разпознаване)",
    formular_text_label: "Постави тук текста на рецептата (напр. копиран от уебсайт с рецепти)",
    formular_text_placeholder: "Заглавие, съставки, приготвяне - просто постави целия текст",
    formular_text_hinweis: "Чисто автоматично разпознаване без ИИ - работи най-добре със заглавия \"Съставки\" и \"Приготвяне\" в текста. Моля, провери резултата след това, може да е непълен.",
    formular_text_erkennen_btn: "Разпознай",
    formular_json_einfuegen_btn: "📋 Постави JSON, генериран от ИИ",
    formular_json_info_aria: "Показване на готов промпт за ИИ",
    json_info_titel: "Промпт за ИИ",
    json_info_erklaerung:
      "Копирай този текст, постави го в ИИ по твой избор (напр. ChatGPT или Claude), добави текста на рецептата и постави отговора после горе в „Постави JSON тук“.",
    json_info_prompt:
      "Преобразувай текста на рецептата, който ще ти изпратя веднага, в ЕДИН единствен JSON обект - без обяснение, без текст преди или след него, само JSON. Използвай точно този формат:\n\n" +
      "{\n" +
      '  "title": "име на рецептата",\n' +
      '  "servings": 4,\n' +
      '  "category": "едно от: {{kategorien}}",\n' +
      '  "ingredients": ["по една съставка на запис, напр. 200 г брашно"],\n' +
      '  "steps": ["една стъпка на запис"],\n' +
      '  "tags": ["незадължителни етикети, напр. вегетарианско"]\n' +
      "}\n\n" +
      "Правила: „category“ трябва да е ТОЧНО една от изброените по-горе стойности (копирай я непроменена, дори ако текстът на рецептата е на друг език - това са фиксирани вътрешни стойности). " +
      "„tags“ е незадължително поле, при нужда - празен масив. " +
      "Не измисляй съставки или стъпки, които не са в текста. " +
      "Ето текста на рецептата:",
    json_info_kopieren_btn: "📋 Копирай промпта",
    json_info_kopiert: "Копирано!",
    formular_json_label: "Постави JSON тук",
    formular_json_uebernehmen_btn: "Приложи",
    formular_label_titel: "Заглавие",
    formular_label_kategorie: "Категория",
    formular_label_tags: "Тагове (възможни са няколко, напр. \"вегетарианско\", \"бързо\")",
    formular_tag_placeholder: "Въведи и добави таг",
    formular_tag_hinzufuegen_btn: "+ Таг",
    formular_tag_entfernen_aria: "Премахни тага {{tag}}",
    formular_label_portionen: "Порции (базово количество)",
    formular_label_zutaten: "Съставки",
    formular_zutat_hinzufuegen_btn: "+ Съставка",
    formular_zutat_menge_placeholder: "Количество",
    formular_zutat_einheit_placeholder: "Мярка",
    formular_zutat_name_placeholder: "Съставка",
    formular_zutat_entfernen_aria: "Премахни съставката",
    formular_label_zubereitung: "Приготвяне (стъпки)",
    formular_schritt_hinzufuegen_btn: "+ Стъпка",
    formular_schritt_placeholder_beispiel: "напр. измий и нарежи зеленчуците",
    formular_schritt_placeholder_naechster: "следваща стъпка",
    formular_schritt_entfernen_aria: "Премахни стъпката",
    formular_label_bild: "Снимка",
    formular_bild_vorhanden_hinweis: "(налична – нов файл ще я замени)",
    formular_bild_hinweis: "Текущата снимка се запазва, ако не избереш нов файл.",
    formular_bild_verkleinern_text: "Снимката се намалява…",
    fehler_url_ungueltig: "Моля, въведи пълен адрес, започващ с http:// или https://.",
    fehler_url_apostroph: "Този адрес съдържа апостроф (') и за съжаление не може да бъде импортиран.",
    fehler_url_keine_ausgabe: "Скриптът не върна изход. Настроен ли е 'rezeptbuch_url_importieren' в configuration.yaml и рестартиран ли е Home Assistant напълно оттогава?",
    fehler_url_kein_json: "Отговорът на скрипта за импортиране не беше валиден JSON.",
    fehler_url_import_fehlgeschlagen: "Импортирането на URL адреса неуспешно: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "За съжаление в поставения текст не можа да бъде разпознато нищо. Моля, попълни полетата по-долу ръчно.",
    warnung_texterkennung_unvollstaendig: "Разпознаването беше непълно (липсват съставки или стъпки, или са присвоени неправилно) - моля, провери и допълни във формуляра.",
    fehler_json_ungueltig: "Поставеният JSON е невалиден. Моля, провери и опитай отново.",
    fehler_json_titel_fehlt: "В JSON липсва поне полето 'title'.",
    fehler_titel_fehlt: "Моля, въведи заглавие.",
    fehler_unerwartet: "Неочаквана грешка:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" вече е изтрита от някой друг междувременно. Промените ти не бяха запазени.",
    fehler_konflikt_geaendert: "\"{{titel}}\" вече е променена от някой друг междувременно (напр. коментар, оценка или собствена редакция).\n\nЗа да не бъде нещо презаписано, промените ти НЕ бяха запазени. Моля, отвори рецептата отново и въведи промените си пак.",
    fehler_vorgang_fehlgeschlagen: "Действието неуспешно:\n{{fehler}}",
    fehler_teilen_drucken: "Неочаквана грешка при споделяне/печат:\n{{fehler}}",
    fehler_config_entity_fehlt: "Моля, въведи 'entity' в конфигурацията на картата, напр. entity: todo.rezepte",
    fehler_bild_lesen: "Снимката не можа да бъде прочетена (файлът е повреден или неподдържан).",
    fehler_bild_verarbeiten: "Снимката не можа да бъде обработена като изображение (неподдържан формат?).",
    teilen_ueberschrift_zutaten: "СЪСТАВКИ",
    teilen_ueberschrift_zubereitung: "ПРИГОТВЯНЕ",
    seite_zurueck_btn: "← Назад",
    seite_weiter_btn: "Напред →",
    seite_anzeige: "Страница {{aktuell}} от {{gesamt}}",
    update_neue_version: "Налична е нова версия: {{version}}",
    update_ansehen_btn: "Преглед",
    update_schliessen_aria: "Скриване на съобщението",
    detail_kochmodus_btn: "🍳 Режим готвене",
    kochmodus_schritt_anzeige: "Стъпка {{aktuell}} от {{gesamt}}",
    kochmodus_schliessen_aria: "Затвори режим готвене",
    kochmodus_schritt_zurueck_aria: "Предишна стъпка",
    kochmodus_schritt_weiter_aria: "Следваща стъпка",
    kochmodus_zutaten_ein_aria: "Покажи съставките",
    kochmodus_zutaten_aus_aria: "Скрий съставките",
    kopf_sammel_pdf_btn: "📚 Общ PDF",
    sammel_pdf_keine_rezepte: "Няма намерени рецепти за експортиране.",
    sammel_pdf_frage_toc: "Да се създаде ли съдържание на избраните рецепти?",
    sammel_pdf_ja_toc_btn: "Да, създай съдържание",
    sammel_pdf_nein_toc_btn: "Не, без съдържание",
    sammel_pdf_name_placeholder: "Име на готварската книга",
    sammel_pdf_erstellen_btn: "Създай PDF",
    abschnitt_titel_inhaltsverzeichnis: "Съдържание",
    sammel_pdf_frage_umfang: "Кои рецепти да влязат в общия PDF?",
    sammel_pdf_alle_rezepte_btn: "Всички показани рецепти",
    sammel_pdf_auswahl_btn: "Избор на определени рецепти",
    sammel_pdf_auswahl_titel: "Избор на рецепти",
    sammel_pdf_alle_auswaehlen_link: "Избери всички",
    sammel_pdf_keine_auswaehlen_link: "Изчисти избора",
    sammel_pdf_weiter_btn: "Напред",
    sammel_pdf_auswahl_keine_hinweis: "Моля, изберете поне една рецепта.",
  },
  hr: {
    allgemein_zurueck: "← Natrag",
    allgemein_ja: "Da",
    allgemein_nein: "Ne",
    allgemein_speichern: "Spremi",
    allgemein_speichert: "Spremanje…",
    allgemein_abbrechen: "Odustani",
    allgemein_bearbeiten: "Uredi",
    allgemein_loeschen: "Izbriši",
    allgemein_oeffnen: "Otvori",
    allgemein_unbekannt: "Nepoznato",
    allgemein_schliessen: "Zatvori",
    kategorie_hauptgericht: "Glavno jelo",
    kategorie_vorspeise: "Predjelo",
    kategorie_suppe: "Juha",
    kategorie_salat: "Salata",
    kategorie_beilage: "Prilog",
    kategorie_dessert: "Desert",
    kategorie_kuchen_gebaeck: "Kolači i pecivo",
    kategorie_fruehstueck: "Doručak",
    kategorie_snack: "Užina",
    kategorie_getraenk: "Piće",
    kategorie_sonstiges: "Ostalo",
    kategorie_filter_alle: "Sve",
    wochentag_montag: "Ponedjeljak",
    wochentag_dienstag: "Utorak",
    wochentag_mittwoch: "Srijeda",
    wochentag_donnerstag: "Četvrtak",
    wochentag_freitag: "Petak",
    wochentag_samstag: "Subota",
    wochentag_sonntag: "Nedjelja",
    sortier_titel: "Abecedno (A-Ž)",
    sortier_bewertung: "Najbolje ocijenjeno prvo",
    sortier_kategorie: "Prema kategoriji",
    sortier_neu: "Najnovije prvo",
    sortieren_label: "Poredaj:",
    kopf_titel_standard: "Kuharica",
    kopf_sichern_btn: "💾 Sigurnosna kopija",
    kopf_wochenplan_btn: "📅 Tjedni plan",
    einkaufsmodus_start_btn: "🛒 Popis za kupovinu",
    einkaufsmodus_beenden_btn: "✕ Prekini odabir",
    kopf_neu_btn: "+ Novo",
    suche_placeholder: "🔍 Recept ili sastojci (npr. brašno, jaja)…",
    kochbuch_loeschen_title: "Izbriši zbirku",
    kochbuch_loeschen_aria: "Izbriši zbirku {{name}}",
    kochbuch_speichern_btn: "+ Spremi kao pametnu zbirku",
    kochbuch_name_placeholder: "Naziv za ovu zbirku, npr. Jesenski recepti",
    fehler_kochbuch_name_fehlt: "Unesi naziv za zbirku.",
    kochbuch_info_aria: "Prikaži objašnjenje pametnih zbirki",
    kochbuch_info_titel: "Što je pametna zbirka?",
    kochbuch_info_text:
      "Pametna zbirka ne sprema fiksni popis recepata, već kombinaciju " +
      "kategorije, oznaka i pojma za pretraživanje, onako kako su " +
      "postavljeni u trenutku spremanja. Nakon toga se sama ažurira: " +
      "novi recept koji odgovara automatski se pojavljuje, a recept " +
      "čija se kategorija ili oznake promijene može isto tako " +
      "automatski ponovno nestati.",
    einkaufs_zaehler: "{{anzahl}} odabrano",
    einkaufsliste_erstellen_btn: "Izradi popis za kupovinu",
    fehler_einkaufsliste_keine_konfiguration: "Za popis za kupovinu još nedostaje konfiguracija: unesi 'shopping_list_entity' u konfiguraciji kartice (npr. shopping_list_entity: todo.einkaufsliste) - za to je potreban DRUGI pomoćnik \"Lokalni popis obaveza\". Pogledaj ANLEITUNG-Backup.md, odjeljak 18.",
    fehler_einkaufsliste_keine_auswahl: "Odaberi barem jedan recept.",
    fehler_einkaufsliste_keine_zutaten: "Odabrani recepti ne sadrže sastojke.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Nije moguće dodati \"{{zeile}}\" na popis za kupovinu:\n{{fehler}}\n\nVeć dodani sastojci ostaju na popisu.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} sastojak(a) dodano na \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" izbrisano.",
    undo_rueckgaengig_btn: "Poništi",
    leer_keine_rezepte: "Još nema recepata – započni s \"+ Novo\"",
    leer_keine_treffer: "Nema recepata za \"{{begriff}}\"",
    fehler_liste_laden_titel: "Nije moguće učitati \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Postoji li ovaj popis obaveza? (Postavke → Uređaji i usluge → Pomoćnici)",
    kachel_aria_label_oeffnen: "Otvori recept {{titel}}",
    sterne_aria_label_gruppe: "Tvoja ocjena",
    sterne_aria_label: "{{zahl}} od 5 zvjezdica",
    fehler_kein_benutzer_bewertung: "Nije moguće utvrditi tvog korisnika - ocjenjivanje nije moguće.",
    detail_teilen_drucken_btn: "📤 Podijeli / Ispiši",
    detail_erstellt_von: "👤 Izradio/la {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} ocjena)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} ocjena)",
    detail_keine_bewertungen: "Još nema ocjena",
    detail_deine_bewertung: "Tvoja ocjena:",
    detail_zubereitet_x: "🍳 pripremljeno {{anzahl}}x",
    detail_portionen_suffix: "porcije",
    abschnitt_titel_zutaten: "Sastojci",
    abschnitt_titel_zubereitung: "Priprema",
    keine_zutaten: "Nema unesenih sastojaka",
    detail_kommentare_titel: "Komentari",
    detail_keine_kommentare: "Još nema komentara",
    detail_kommentar_placeholder: "Dodatak, savjet ili napomena…",
    detail_kommentar_hinzufuegen_btn: "Dodaj komentar",
    detail_bearbeiten_hinweis: "Samo {{name}} (ili administrator) može uređivati ili izbrisati ovaj recept.",
    detail_ersteller_unbekannt: "tvorac/tvorka recepta",
    modal_zubereitet_frage: "Jesi li pripremio/la \"{{titel}}\"?",
    statistik_btn: "📊 Statistika",
    statistik_titel: "Statistika kuhanja",
    statistik_info_aria: "Prikaži objašnjenje statistike",
    statistik_info_titel: "Kako se izračunava ova statistika?",
    statistik_info_text:
      "Ova statistika broji svaku potvrdu pitanja „Jesi li pripremio/la?“ - bez obzira na veličinu porcije ili koliko puta istog dana. Ako je to pitanje onemogućeno putem opcije kartice ask_cooked: false, brojevi prestaju rasti, ali već zabilježene pripreme ostaju sačuvane.",
    statistik_dieses_jahr: "Kuhao/la si {{anzahl}}x iz svoje kuharice u {{jahr}}",
    statistik_gesamt: "Ukupno si kuhao/la {{anzahl}}x iz svoje kuharice",
    statistik_top_titel: "Najčešće pripremano",
    statistik_keine_daten: "Još nema zabilježenih priprema.",
    modal_loeschen_frage: "Stvarno izbrisati \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Da, izbriši",
    wochenplan_titel: "Tjedni plan",
    wochenplan_tab_diese: "Ovaj tjedan",
    wochenplan_tab_folgewoche: "Sljedeći tjedan",
    wochenplan_hinweis_folgewoche: "Ovdje već sada planiraj nadolazeći tjedan - automatski će se pomaknuti na \"Ovaj tjedan\" čim trenutni tjedan završi.",
    wochenplan_hinweis_diese: "Prošli dani se automatski brišu (recept ostaje sačuvan, nestaje samo dodjela).",
    wochenplan_hinweis_speicherung: "Sprema se na svim uređajima (kao skriveni dodatni unos u istom popisu recepata, nije potreban dodatni pomoćnik).",
    wochenplan_leer: "Još nema recepata - prvo ih izradi.",
    wochenplan_kein_rezept_option: "– nema recepta –",
    wochenplan_einkaufsliste_btn: "Izradi popis za kupovinu iz {{ziel}}",
    wochenplan_wort: "tjedni plan",
    wochenplan_folgewoche_wort: "sljedeći tjedan",
    wochenplan_aktuelle_woche_wort: "trenutni tjedan",
    wochenplan_keine_zuweisung: "{{zeitraum}} još ne sadrži dodijeljene recepte.",
    formular_titel_neu: "Novi recept",
    formular_titel_bearbeiten: "Uredi recept",
    formular_url_import_btn: "🌐 Uvezi URL recepta",
    formular_url_label: "Poveznica na web stranicu recepta",
    formular_url_placeholder: "https://www.primjer-recepti.hr/moj-recept",
    formular_url_hinweis: "Učitava stranicu i čita podatke o receptu koji su već ugrađeni u nju (isti podaci kojima npr. Google prikazuje ocjene zvjezdicama u pretraživanju) - obično pouzdanije od prepoznavanja teksta. Radi samo na stranicama koje pružaju takve podatke i ne blokiraju automatizirane zahtjeve.",
    formular_url_importieren_btn: "Uvezi",
    formular_url_laedt: "Učitavanje …",
    formular_text_einfuegen_btn: "🔍 Zalijepi tekst recepta (automatsko prepoznavanje)",
    formular_text_label: "Zalijepi ovdje tekst recepta (npr. kopiran s web stranice recepta)",
    formular_text_placeholder: "Naslov, sastojci, priprema - jednostavno zalijepi cijeli tekst",
    formular_text_hinweis: "Čisto automatsko prepoznavanje bez UI - najbolje radi s naslovima \"Sastojci\" i \"Priprema\" u tekstu. Nakon toga ukratko provjeri rezultat, može biti nepotpun.",
    formular_text_erkennen_btn: "Prepoznaj",
    formular_json_einfuegen_btn: "📋 Zalijepi JSON generiran od strane UI-a",
    formular_json_info_aria: "Prikaži gotov prompt za UI",
    json_info_titel: "Prompt za UI",
    json_info_erklaerung:
      "Kopiraj ovaj tekst, zalijepi ga u UI po izboru (npr. ChatGPT ili Claude), dodaj svoj tekst recepta i zatim zalijepi odgovor gore pod „Zalijepi JSON ovdje“.",
    json_info_prompt:
      "Pretvori tekst recepta koji ću ti sada poslati u JEDAN jedini JSON objekt - bez objašnjenja, bez teksta prije ili poslije, samo JSON. Koristi točno ovaj format:\n\n" +
      "{\n" +
      '  "title": "naziv recepta",\n' +
      '  "servings": 4,\n' +
      '  "category": "jedno od: {{kategorien}}",\n' +
      '  "ingredients": ["jedan sastojak po unosu, npr. 200 g brašna"],\n' +
      '  "steps": ["jedan korak pripreme po unosu"],\n' +
      '  "tags": ["neobavezne oznake, npr. vegetarijansko"]\n' +
      "}\n\n" +
      "Pravila: „category“ mora biti TOČNO jedna od gore navedenih vrijednosti (prenesi je nepromijenjenu, čak i ako je tekst recepta na drugom jeziku - to su fiksne interne vrijednosti). " +
      "„tags“ je neobavezno, po potrebi prazan niz. " +
      "Ne izmišljaj sastojke ili korake kojih nema u tekstu. " +
      "Evo teksta recepta:",
    json_info_kopieren_btn: "📋 Kopiraj prompt",
    json_info_kopiert: "Kopirano!",
    formular_json_label: "Zalijepi JSON ovdje",
    formular_json_uebernehmen_btn: "Primijeni",
    formular_label_titel: "Naslov",
    formular_label_kategorie: "Kategorija",
    formular_label_tags: "Oznake (moguće je više, npr. \"vegetarijansko\", \"brzo\")",
    formular_tag_placeholder: "Unesi i dodaj oznaku",
    formular_tag_hinzufuegen_btn: "+ Oznaka",
    formular_tag_entfernen_aria: "Ukloni oznaku {{tag}}",
    formular_label_portionen: "Porcije (osnovno)",
    formular_label_zutaten: "Sastojci",
    formular_zutat_hinzufuegen_btn: "+ Sastojak",
    formular_zutat_menge_placeholder: "Količina",
    formular_zutat_einheit_placeholder: "Jedinica",
    formular_zutat_name_placeholder: "Sastojak",
    formular_zutat_entfernen_aria: "Ukloni sastojak",
    formular_label_zubereitung: "Priprema (koraci)",
    formular_schritt_hinzufuegen_btn: "+ Korak",
    formular_schritt_placeholder_beispiel: "npr. operi i nareži povrće",
    formular_schritt_placeholder_naechster: "sljedeći korak",
    formular_schritt_entfernen_aria: "Ukloni korak",
    formular_label_bild: "Slika",
    formular_bild_vorhanden_hinweis: "(postoji – nova datoteka će je zamijeniti)",
    formular_bild_hinweis: "Trenutna slika ostaje sačuvana ako ne odabereš novu datoteku.",
    formular_bild_verkleinern_text: "Smanjivanje slike…",
    fehler_url_ungueltig: "Unesi potpunu adresu koja počinje s http:// ili https://.",
    fehler_url_apostroph: "Ova adresa sadrži apostrof (') i nažalost se ne može uvesti.",
    fehler_url_keine_ausgabe: "Skripta nije vratila izlaz. Je li 'rezeptbuch_url_importieren' postavljen u configuration.yaml i je li Home Assistant otad u potpunosti ponovno pokrenut?",
    fehler_url_kein_json: "Odgovor uvozne skripte nije bio valjani JSON.",
    fehler_url_import_fehlgeschlagen: "Uvoz URL-a nije uspio: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Nažalost, u zalijepljenom tekstu nije moguće ništa prepoznati. Ispuni polja ispod ručno.",
    warnung_texterkennung_unvollstaendig: "Prepoznavanje je nepotpuno (nedostaju sastojci ili koraci, možda su pogrešno dodijeljeni) - provjeri i dopuni u obrascu.",
    fehler_json_ungueltig: "Zalijepljeni JSON nije valjan. Provjeri i pokušaj ponovno.",
    fehler_json_titel_fehlt: "U JSON-u nedostaje barem polje 'title'.",
    fehler_titel_fehlt: "Unesi naslov.",
    fehler_unerwartet: "Neočekivana pogreška:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" je u međuvremenu izbrisao netko drugi. Tvoje promjene nisu spremljene.",
    fehler_konflikt_geaendert: "\"{{titel}}\" je u međuvremenu promijenio netko drugi (npr. komentar, ocjena ili vlastita izmjena).\n\nKako se ništa ne bi prepisalo, tvoje promjene NISU spremljene. Ponovno otvori recept i unesi svoje promjene još jednom.",
    fehler_vorgang_fehlgeschlagen: "Radnja nije uspjela:\n{{fehler}}",
    fehler_teilen_drucken: "Neočekivana pogreška pri dijeljenju/ispisu:\n{{fehler}}",
    fehler_config_entity_fehlt: "Unesi 'entity' u konfiguraciji kartice, npr. entity: todo.rezepte",
    fehler_bild_lesen: "Fotografiju nije moguće pročitati (datoteka oštećena ili nepodržana).",
    fehler_bild_verarbeiten: "Fotografiju nije moguće obraditi kao sliku (nepodržani format?).",
    teilen_ueberschrift_zutaten: "SASTOJCI",
    teilen_ueberschrift_zubereitung: "PRIPREMA",
    seite_zurueck_btn: "← Natrag",
    seite_weiter_btn: "Dalje →",
    seite_anzeige: "Stranica {{aktuell}} od {{gesamt}}",
    update_neue_version: "Dostupna je nova verzija: {{version}}",
    update_ansehen_btn: "Pogledaj",
    update_schliessen_aria: "Sakrij obavijest",
    detail_kochmodus_btn: "🍳 Način kuhanja",
    kochmodus_schritt_anzeige: "Korak {{aktuell}} od {{gesamt}}",
    kochmodus_schliessen_aria: "Zatvori način kuhanja",
    kochmodus_schritt_zurueck_aria: "Prethodni korak",
    kochmodus_schritt_weiter_aria: "Sljedeći korak",
    kochmodus_zutaten_ein_aria: "Prikaži sastojke",
    kochmodus_zutaten_aus_aria: "Sakrij sastojke",
    kopf_sammel_pdf_btn: "📚 Zbirni PDF",
    sammel_pdf_keine_rezepte: "Nema recepata za izvoz.",
    sammel_pdf_frage_toc: "Želite li izraditi sadržaj odabranih recepata?",
    sammel_pdf_ja_toc_btn: "Da, izradi sadržaj",
    sammel_pdf_nein_toc_btn: "Ne, bez sadržaja",
    sammel_pdf_name_placeholder: "Naziv kuharice",
    sammel_pdf_erstellen_btn: "Izradi PDF",
    abschnitt_titel_inhaltsverzeichnis: "Sadržaj",
    sammel_pdf_frage_umfang: "Koji recepti trebaju u zbirni PDF?",
    sammel_pdf_alle_rezepte_btn: "Svi prikazani recepti",
    sammel_pdf_auswahl_btn: "Odabir određenih recepata",
    sammel_pdf_auswahl_titel: "Odaberite recepte",
    sammel_pdf_alle_auswaehlen_link: "Odaberi sve",
    sammel_pdf_keine_auswaehlen_link: "Ukloni odabir",
    sammel_pdf_weiter_btn: "Dalje",
    sammel_pdf_auswahl_keine_hinweis: "Odaberite bar jedan recept.",
  },
  cs: {
    allgemein_zurueck: "← Zpět",
    allgemein_ja: "Ano",
    allgemein_nein: "Ne",
    allgemein_speichern: "Uložit",
    allgemein_speichert: "Ukládá se…",
    allgemein_abbrechen: "Zrušit",
    allgemein_bearbeiten: "Upravit",
    allgemein_loeschen: "Smazat",
    allgemein_oeffnen: "Otevřít",
    allgemein_unbekannt: "Neznámé",
    allgemein_schliessen: "Zavřít",
    kategorie_hauptgericht: "Hlavní jídlo",
    kategorie_vorspeise: "Předkrm",
    kategorie_suppe: "Polévka",
    kategorie_salat: "Salát",
    kategorie_beilage: "Příloha",
    kategorie_dessert: "Dezert",
    kategorie_kuchen_gebaeck: "Koláče a pečivo",
    kategorie_fruehstueck: "Snídaně",
    kategorie_snack: "Svačina",
    kategorie_getraenk: "Nápoj",
    kategorie_sonstiges: "Ostatní",
    kategorie_filter_alle: "Vše",
    wochentag_montag: "Pondělí",
    wochentag_dienstag: "Úterý",
    wochentag_mittwoch: "Středa",
    wochentag_donnerstag: "Čtvrtek",
    wochentag_freitag: "Pátek",
    wochentag_samstag: "Sobota",
    wochentag_sonntag: "Neděle",
    sortier_titel: "Abecedně (A-Z)",
    sortier_bewertung: "Nejlépe hodnocené první",
    sortier_kategorie: "Podle kategorie",
    sortier_neu: "Nejnovější první",
    sortieren_label: "Řadit podle:",
    kopf_titel_standard: "Kuchařka",
    kopf_sichern_btn: "💾 Záloha",
    kopf_wochenplan_btn: "📅 Týdenní plán",
    einkaufsmodus_start_btn: "🛒 Nákupní seznam",
    einkaufsmodus_beenden_btn: "✕ Ukončit výběr",
    kopf_neu_btn: "+ Nový",
    suche_placeholder: "🔍 Recept nebo suroviny (např. mouka, vejce)…",
    kochbuch_loeschen_title: "Smazat kolekci",
    kochbuch_loeschen_aria: "Smazat kolekci {{name}}",
    kochbuch_speichern_btn: "+ Uložit jako chytrou kolekci",
    kochbuch_name_placeholder: "Název pro tuto kolekci, např. Podzimní recepty",
    fehler_kochbuch_name_fehlt: "Zadejte prosím název kolekce.",
    kochbuch_info_aria: "Zobrazit vysvětlení chytrých kolekcí",
    kochbuch_info_titel: "Co je chytrá kolekce?",
    kochbuch_info_text:
      "Chytrá kolekce neukládá pevný seznam receptů, ale kombinaci " +
      "kategorie, štítků a hledaného výrazu, přesně tak, jak jsou " +
      "nastaveny v okamžiku uložení. Poté se sama aktualizuje: nový " +
      "recept, který odpovídá, se automaticky objeví, a recept, jehož " +
      "kategorie nebo štítky se změní, může stejně automaticky zase " +
      "zmizet.",
    einkaufs_zaehler: "{{anzahl}} vybráno",
    einkaufsliste_erstellen_btn: "Vytvořit nákupní seznam",
    fehler_einkaufsliste_keine_konfiguration: "Pro nákupní seznam ještě chybí konfigurace: zadejte prosím 'shopping_list_entity' v konfiguraci karty (např. shopping_list_entity: todo.einkaufsliste) - k tomu je potřeba DRUHÝ pomocník Místní seznam úkolů. Viz ANLEITUNG-Backup.md, oddíl 18.",
    fehler_einkaufsliste_keine_auswahl: "Vyberte prosím alespoň jeden recept.",
    fehler_einkaufsliste_keine_zutaten: "Vybrané recepty neobsahují žádné suroviny.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Nepodařilo se přidat \"{{zeile}}\" do nákupního seznamu:\n{{fehler}}\n\nJiž přidané suroviny zůstávají v seznamu.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} surovin(y) přidáno do \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" smazáno.",
    undo_rueckgaengig_btn: "Zpět",
    leer_keine_rezepte: "Zatím žádné recepty – začněte pomocí \"+ Nový\"",
    leer_keine_treffer: "Nenalezeny žádné recepty pro \"{{begriff}}\"",
    fehler_liste_laden_titel: "Nepodařilo se načíst \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Existuje tento seznam úkolů? (Nastavení → Zařízení a služby → Pomocníci)",
    kachel_aria_label_oeffnen: "Otevřít recept {{titel}}",
    sterne_aria_label_gruppe: "Vaše hodnocení",
    sterne_aria_label: "{{zahl}} z 5 hvězdiček",
    fehler_kein_benutzer_bewertung: "Nepodařilo se zjistit vašeho uživatele - hodnocení není možné.",
    detail_teilen_drucken_btn: "📤 Sdílet / Tisknout",
    detail_erstellt_von: "👤 Vytvořil(a) {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} hodnocení)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} hodnocení)",
    detail_keine_bewertungen: "Zatím žádná hodnocení",
    detail_deine_bewertung: "Vaše hodnocení:",
    detail_zubereitet_x: "🍳 připraveno {{anzahl}}x",
    detail_portionen_suffix: "porcí",
    abschnitt_titel_zutaten: "Suroviny",
    abschnitt_titel_zubereitung: "Postup",
    keine_zutaten: "Žádné suroviny nejsou uvedeny",
    detail_kommentare_titel: "Komentáře",
    detail_keine_kommentare: "Zatím žádné komentáře",
    detail_kommentar_placeholder: "Doplnění, tip nebo poznámka…",
    detail_kommentar_hinzufuegen_btn: "Přidat komentář",
    detail_bearbeiten_hinweis: "Tento recept může upravit nebo smazat pouze {{name}} (nebo administrátor).",
    detail_ersteller_unbekannt: "tvůrce/tvůrkyně",
    modal_zubereitet_frage: "Připravil(a) jste \"{{titel}}\"?",
    statistik_btn: "📊 Statistika",
    statistik_titel: "Statistika vaření",
    statistik_info_aria: "Zobrazit vysvětlení statistiky",
    statistik_info_titel: "Jak se tato statistika počítá?",
    statistik_info_text:
      "Toto vyhodnocení počítá každé potvrzení otázky „Připravil(a) jste?“ - bez ohledu na velikost porce nebo počet za stejný den. Pokud je tato otázka vypnuta pomocí volby karty ask_cooked: false, čísla dál nerostou, ale již zaznamenané přípravy zůstávají zachovány.",
    statistik_dieses_jahr: "V roce {{jahr}} jsi ze své kuchařky vařil(a) {{anzahl}}x",
    statistik_gesamt: "Celkem jsi ze své kuchařky vařil(a) {{anzahl}}x",
    statistik_top_titel: "Nejčastěji připravováno",
    statistik_keine_daten: "Zatím nejsou zaznamenány žádné přípravy.",
    modal_loeschen_frage: "Opravdu smazat \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Ano, smazat",
    wochenplan_titel: "Týdenní plán",
    wochenplan_tab_diese: "Tento týden",
    wochenplan_tab_folgewoche: "Příští týden",
    wochenplan_hinweis_folgewoche: "Naplánujte si zde už teď nadcházející týden - jakmile aktuální týden skončí, automaticky se přesune do \"Tento týden\".",
    wochenplan_hinweis_diese: "Uplynulé dny se automaticky vyprázdní (samotný recept zůstává zachován, zmizí pouze přiřazení).",
    wochenplan_hinweis_speicherung: "Ukládá se napříč zařízeními (jako skrytý doplňkový záznam ve stejném seznamu receptů, není potřeba žádný další pomocník).",
    wochenplan_leer: "Zatím žádné recepty - nejprve nějaké vytvořte.",
    wochenplan_kein_rezept_option: "– žádný recept –",
    wochenplan_einkaufsliste_btn: "Vytvořit nákupní seznam z {{ziel}}",
    wochenplan_wort: "týdenní plán",
    wochenplan_folgewoche_wort: "příští týden",
    wochenplan_aktuelle_woche_wort: "aktuální týden",
    wochenplan_keine_zuweisung: "{{zeitraum}} zatím neobsahuje žádné přiřazené recepty.",
    formular_titel_neu: "Nový recept",
    formular_titel_bearbeiten: "Upravit recept",
    formular_url_import_btn: "🌐 Importovat URL receptu",
    formular_url_label: "Odkaz na webovou stránku receptu",
    formular_url_placeholder: "https://www.priklad-recepty.cz/muj-recept",
    formular_url_hinweis: "Načte stránku a přečte strukturovaná data receptu, která jsou do ní již vložena (stejná data, kterými např. Google zobrazuje hvězdičková hodnocení ve vyhledávání) - obvykle spolehlivější než rozpoznávání textu. Funguje pouze na stránkách, které taková data poskytují a neblokují automatizované požadavky.",
    formular_url_importieren_btn: "Importovat",
    formular_url_laedt: "Načítá se …",
    formular_text_einfuegen_btn: "🔍 Vložit text receptu (automatické rozpoznání)",
    formular_text_label: "Vložte zde text receptu (např. zkopírovaný z webové stránky receptu)",
    formular_text_placeholder: "Název, suroviny, postup - jednoduše vložte celý text",
    formular_text_hinweis: "Čistě automatické rozpoznávání bez AI - funguje nejlépe s nadpisy \"Suroviny\" a \"Postup\" v textu. Výsledek si prosím poté krátce zkontrolujte, může být neúplný.",
    formular_text_erkennen_btn: "Rozpoznat",
    formular_json_einfuegen_btn: "📋 Vložit JSON vygenerovaný AI",
    formular_json_info_aria: "Zobrazit hotový prompt pro AI",
    json_info_titel: "Prompt pro AI",
    json_info_erklaerung:
      "Zkopíruj tento text, vlož ho do AI dle výběru (např. ChatGPT nebo Claude), připoj svůj text receptu a odpověď pak vlož nahoře do „Vložte JSON zde“.",
    json_info_prompt:
      "Převeď text receptu, který ti hned pošlu, na JEDEN jediný JSON objekt - bez vysvětlení, bez textu před ani po, jen JSON. Použij přesně tento formát:\n\n" +
      "{\n" +
      '  "title": "název receptu",\n' +
      '  "servings": 4,\n' +
      '  "category": "jedna z: {{kategorien}}",\n' +
      '  "ingredients": ["jedna surovina na položku, např. 200 g mouky"],\n' +
      '  "steps": ["jeden krok přípravy na položku"],\n' +
      '  "tags": ["volitelné štítky, např. vegetariánské"]\n' +
      "}\n\n" +
      "Pravidla: „category“ musí být PŘESNĚ jedna z výše uvedených hodnot (převezmi ji beze změny, i když je text receptu v jiném jazyce - jde o pevné interní hodnoty). " +
      "„tags“ je volitelné, klidně prázdné pole. " +
      "Nevymýšlej suroviny ani kroky, které v textu nejsou. " +
      "Zde je text receptu:",
    json_info_kopieren_btn: "📋 Kopírovat prompt",
    json_info_kopiert: "Zkopírováno!",
    formular_json_label: "Vložte JSON zde",
    formular_json_uebernehmen_btn: "Použít",
    formular_label_titel: "Název",
    formular_label_kategorie: "Kategorie",
    formular_label_tags: "Štítky (možné je více, např. \"vegetariánské\", \"rychlé\")",
    formular_tag_placeholder: "Zadejte a přidejte štítek",
    formular_tag_hinzufuegen_btn: "+ Štítek",
    formular_tag_entfernen_aria: "Odebrat štítek {{tag}}",
    formular_label_portionen: "Porce (základ)",
    formular_label_zutaten: "Suroviny",
    formular_zutat_hinzufuegen_btn: "+ Surovina",
    formular_zutat_menge_placeholder: "Množství",
    formular_zutat_einheit_placeholder: "Jednotka",
    formular_zutat_name_placeholder: "Surovina",
    formular_zutat_entfernen_aria: "Odebrat surovinu",
    formular_label_zubereitung: "Postup (kroky)",
    formular_schritt_hinzufuegen_btn: "+ Krok",
    formular_schritt_placeholder_beispiel: "např. umýt a nakrájet zeleninu",
    formular_schritt_placeholder_naechster: "další krok",
    formular_schritt_entfernen_aria: "Odebrat krok",
    formular_label_bild: "Fotka",
    formular_bild_vorhanden_hinweis: "(existuje – nový soubor ji nahradí)",
    formular_bild_hinweis: "Aktuální fotka zůstane zachována, pokud nevyberete nový soubor.",
    formular_bild_verkleinern_text: "Fotka se zmenšuje…",
    fehler_url_ungueltig: "Zadejte prosím úplnou adresu začínající na http:// nebo https://.",
    fehler_url_apostroph: "Tato adresa obsahuje apostrof (') a bohužel ji nelze importovat.",
    fehler_url_keine_ausgabe: "Skript nevrátil žádný výstup. Je 'rezeptbuch_url_importieren' nastaven v configuration.yaml a byl od té doby Home Assistant kompletně restartován?",
    fehler_url_kein_json: "Odpověď importovacího skriptu nebyla platný JSON.",
    fehler_url_import_fehlgeschlagen: "Import URL se nezdařil: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Ve vloženém textu se bohužel nepodařilo nic rozpoznat. Vyplňte prosím pole níže ručně.",
    warnung_texterkennung_unvollstaendig: "Rozpoznání bylo neúplné (chybí suroviny nebo kroky, případně jsou přiřazeny nesprávně) - zkontrolujte prosím a doplňte ve formuláři.",
    fehler_json_ungueltig: "Vložený JSON je neplatný. Zkontrolujte jej prosím a zkuste to znovu.",
    fehler_json_titel_fehlt: "V JSON chybí alespoň pole 'title'.",
    fehler_titel_fehlt: "Zadejte prosím název.",
    fehler_unerwartet: "Neočekávaná chyba:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" mezitím smazal někdo jiný. Vaše změny nebyly uloženy.",
    fehler_konflikt_geaendert: "\"{{titel}}\" mezitím změnil někdo jiný (např. komentář, hodnocení nebo vlastní úprava).\n\nAby nedošlo k přepsání, vaše změny NEBYLY uloženy. Otevřete prosím recept znovu a zadejte změny znovu.",
    fehler_vorgang_fehlgeschlagen: "Akce se nezdařila:\n{{fehler}}",
    fehler_teilen_drucken: "Neočekávaná chyba při sdílení/tisku:\n{{fehler}}",
    fehler_config_entity_fehlt: "Zadejte prosím 'entity' v konfiguraci karty, např. entity: todo.rezepte",
    fehler_bild_lesen: "Fotku se nepodařilo přečíst (soubor je poškozený nebo nepodporovaný).",
    fehler_bild_verarbeiten: "Fotku se nepodařilo zpracovat jako obrázek (nepodporovaný formát?).",
    teilen_ueberschrift_zutaten: "SUROVINY",
    teilen_ueberschrift_zubereitung: "POSTUP",
    seite_zurueck_btn: "← Zpět",
    seite_weiter_btn: "Další →",
    seite_anzeige: "Strana {{aktuell}} z {{gesamt}}",
    update_neue_version: "Je dostupná nová verze: {{version}}",
    update_ansehen_btn: "Zobrazit",
    update_schliessen_aria: "Skrýt upozornění",
    detail_kochmodus_btn: "🍳 Režim vaření",
    kochmodus_schritt_anzeige: "Krok {{aktuell}} z {{gesamt}}",
    kochmodus_schliessen_aria: "Zavřít režim vaření",
    kochmodus_schritt_zurueck_aria: "Předchozí krok",
    kochmodus_schritt_weiter_aria: "Další krok",
    kochmodus_zutaten_ein_aria: "Zobrazit suroviny",
    kochmodus_zutaten_aus_aria: "Skrýt suroviny",
    kopf_sammel_pdf_btn: "📚 Souhrnné PDF",
    sammel_pdf_keine_rezepte: "Nebyly nalezeny žádné recepty k exportu.",
    sammel_pdf_frage_toc: "Vytvořit obsah vybraných receptů?",
    sammel_pdf_ja_toc_btn: "Ano, vytvořit obsah",
    sammel_pdf_nein_toc_btn: "Ne, bez obsahu",
    sammel_pdf_name_placeholder: "Název kuchařky",
    sammel_pdf_erstellen_btn: "Vytvořit PDF",
    abschnitt_titel_inhaltsverzeichnis: "Obsah",
    sammel_pdf_frage_umfang: "Které recepty mají být ve společném PDF?",
    sammel_pdf_alle_rezepte_btn: "Všechny zobrazené recepty",
    sammel_pdf_auswahl_btn: "Vybrat konkrétní recepty",
    sammel_pdf_auswahl_titel: "Vybrat recepty",
    sammel_pdf_alle_auswaehlen_link: "Vybrat vše",
    sammel_pdf_keine_auswaehlen_link: "Zrušit výběr",
    sammel_pdf_weiter_btn: "Další",
    sammel_pdf_auswahl_keine_hinweis: "Vyberte prosím alespoň jeden recept.",
  },
  da: {
    allgemein_zurueck: "← Tilbage",
    allgemein_ja: "Ja",
    allgemein_nein: "Nej",
    allgemein_speichern: "Gem",
    allgemein_speichert: "Gemmer…",
    allgemein_abbrechen: "Annuller",
    allgemein_bearbeiten: "Rediger",
    allgemein_loeschen: "Slet",
    allgemein_oeffnen: "Åbn",
    allgemein_unbekannt: "Ukendt",
    allgemein_schliessen: "Luk",
    kategorie_hauptgericht: "Hovedret",
    kategorie_vorspeise: "Forret",
    kategorie_suppe: "Suppe",
    kategorie_salat: "Salat",
    kategorie_beilage: "Tilbehør",
    kategorie_dessert: "Dessert",
    kategorie_kuchen_gebaeck: "Kager og bagværk",
    kategorie_fruehstueck: "Morgenmad",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Drikkevare",
    kategorie_sonstiges: "Andet",
    kategorie_filter_alle: "Alle",
    wochentag_montag: "Mandag",
    wochentag_dienstag: "Tirsdag",
    wochentag_mittwoch: "Onsdag",
    wochentag_donnerstag: "Torsdag",
    wochentag_freitag: "Fredag",
    wochentag_samstag: "Lørdag",
    wochentag_sonntag: "Søndag",
    sortier_titel: "Alfabetisk (A-Å)",
    sortier_bewertung: "Bedst bedømte først",
    sortier_kategorie: "Efter kategori",
    sortier_neu: "Nyeste først",
    sortieren_label: "Sortér efter:",
    kopf_titel_standard: "Kogebog",
    kopf_sichern_btn: "💾 Sikkerhedskopi",
    kopf_wochenplan_btn: "📅 Ugeplan",
    einkaufsmodus_start_btn: "🛒 Indkøbsliste",
    einkaufsmodus_beenden_btn: "✕ Afslut valg",
    kopf_neu_btn: "+ Ny",
    suche_placeholder: "🔍 Opskrift eller ingredienser (f.eks. mel, æg)…",
    kochbuch_loeschen_title: "Slet samling",
    kochbuch_loeschen_aria: "Slet samling {{name}}",
    kochbuch_speichern_btn: "+ Gem som smart samling",
    kochbuch_name_placeholder: "Navn til denne samling, f.eks. Efterårsopskrifter",
    fehler_kochbuch_name_fehlt: "Angiv venligst et navn til samlingen.",
    kochbuch_info_aria: "Vis forklaring af smarte samlinger",
    kochbuch_info_titel: "Hvad er en smart samling?",
    kochbuch_info_text:
      "En smart samling gemmer ikke en fast liste over opskrifter, " +
      "men en kombination af kategori, tags og søgeord, præcis som de " +
      "er indstillet, når du gemmer den. Den opdaterer sig derefter " +
      "selv: en ny opskrift, der passer, dukker automatisk op, og en " +
      "opskrift, hvis kategori eller tags ændres, kan lige så " +
      "automatisk forsvinde igen.",
    einkaufs_zaehler: "{{anzahl}} valgt",
    einkaufsliste_erstellen_btn: "Opret indkøbsliste",
    fehler_einkaufsliste_keine_konfiguration: "Indkøbslisten mangler stadig konfiguration: angiv venligst 'shopping_list_entity' i kortkonfigurationen (f.eks. shopping_list_entity: todo.einkaufsliste) - dette kræver en ANDEN Lokal to-do-liste-hjælper. Se ANLEITUNG-Backup.md, afsnit 18.",
    fehler_einkaufsliste_keine_auswahl: "Vælg venligst mindst én opskrift.",
    fehler_einkaufsliste_keine_zutaten: "De valgte opskrifter indeholder ingen ingredienser.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Kunne ikke tilføje \"{{zeile}}\" til indkøbslisten:\n{{fehler}}\n\nAllerede tilføjede ingredienser forbliver på indkøbslisten.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingrediens(er) tilføjet til \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" slettet.",
    undo_rueckgaengig_btn: "Fortryd",
    leer_keine_rezepte: "Ingen opskrifter endnu – kom i gang med \"+ Ny\"",
    leer_keine_treffer: "Ingen opskrifter fundet for \"{{begriff}}\"",
    fehler_liste_laden_titel: "Kunne ikke indlæse \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Findes denne to-do-liste? (Indstillinger → Enheder og tjenester → Hjælpere)",
    kachel_aria_label_oeffnen: "Åbn opskrift {{titel}}",
    sterne_aria_label_gruppe: "Din bedømmelse",
    sterne_aria_label: "{{zahl}} af 5 stjerner",
    fehler_kein_benutzer_bewertung: "Kunne ikke bestemme din bruger - bedømmelse ikke mulig.",
    detail_teilen_drucken_btn: "📤 Del / Udskriv",
    detail_erstellt_von: "👤 Oprettet af {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} bedømmelse)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} bedømmelser)",
    detail_keine_bewertungen: "Ingen bedømmelser endnu",
    detail_deine_bewertung: "Din bedømmelse:",
    detail_zubereitet_x: "🍳 tilberedt {{anzahl}} gange",
    detail_portionen_suffix: "portioner",
    abschnitt_titel_zutaten: "Ingredienser",
    abschnitt_titel_zubereitung: "Fremgangsmåde",
    keine_zutaten: "Ingen ingredienser angivet",
    detail_kommentare_titel: "Kommentarer",
    detail_keine_kommentare: "Ingen kommentarer endnu",
    detail_kommentar_placeholder: "Tilføjelse, tip eller bemærkning…",
    detail_kommentar_hinzufuegen_btn: "Tilføj kommentar",
    detail_bearbeiten_hinweis: "Kun {{name}} (eller en administrator) kan redigere eller slette denne opskrift.",
    detail_ersteller_unbekannt: "den/dem der oprettede opskriften",
    modal_zubereitet_frage: "Tilberedte du \"{{titel}}\"?",
    statistik_btn: "📊 Statistik",
    statistik_titel: "Madlavningsstatistik",
    statistik_info_aria: "Vis forklaring af statistikken",
    statistik_info_titel: "Hvordan beregnes denne statistik?",
    statistik_info_text:
      "Denne opgørelse tæller hver bekræftelse af spørgsmålet „Tilberedte du den?“ - uanset portionsstørrelse eller hvor mange gange samme dag. Hvis spørgsmålet er deaktiveret via kortindstillingen ask_cooked: false, holder tallene op med at stige, men allerede registrerede tilberedninger bevares.",
    statistik_dieses_jahr: "Du har lavet mad {{anzahl}}x fra din opskriftsbog i {{jahr}}",
    statistik_gesamt: "Du har i alt lavet mad {{anzahl}}x fra din opskriftsbog",
    statistik_top_titel: "Mest tilberedt",
    statistik_keine_daten: "Endnu ingen tilberedninger registreret.",
    modal_loeschen_frage: "Vil du virkelig slette \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Ja, slet",
    wochenplan_titel: "Ugeplan",
    wochenplan_tab_diese: "Denne uge",
    wochenplan_tab_folgewoche: "Næste uge",
    wochenplan_hinweis_folgewoche: "Planlæg allerede nu den kommende uge her - den rykker automatisk til \"Denne uge\", når den aktuelle uge er slut.",
    wochenplan_hinweis_diese: "Tidligere dage tømmes automatisk (selve opskriften bevares, kun tildelingen forsvinder).",
    wochenplan_hinweis_speicherung: "Gemmes på tværs af enheder (som en skjult ekstra post i samme opskriftsliste, ingen yderligere hjælper nødvendig).",
    wochenplan_leer: "Ingen opskrifter endnu - opret nogle først.",
    wochenplan_kein_rezept_option: "– ingen opskrift –",
    wochenplan_einkaufsliste_btn: "Opret indkøbsliste fra {{ziel}}",
    wochenplan_wort: "ugeplan",
    wochenplan_folgewoche_wort: "næste uge",
    wochenplan_aktuelle_woche_wort: "aktuelle uge",
    wochenplan_keine_zuweisung: "{{zeitraum}} indeholder endnu ingen tildelte opskrifter.",
    formular_titel_neu: "Ny opskrift",
    formular_titel_bearbeiten: "Rediger opskrift",
    formular_url_import_btn: "🌐 Importér opskrifts-URL",
    formular_url_label: "Link til opskriftswebsiden",
    formular_url_placeholder: "https://www.eksempel-opskrifter.dk/min-opskrift",
    formular_url_hinweis: "Indlæser siden og læser opskriftens strukturerede data, der allerede er indlejret i den (samme data som f.eks. Google bruger til at vise stjernebedømmelser i søgeresultater) - som regel mere pålideligt end tekstgenkendelse. Virker kun på sider, der leverer sådanne data og ikke blokerer automatiske forespørgsler.",
    formular_url_importieren_btn: "Importér",
    formular_url_laedt: "Indlæser …",
    formular_text_einfuegen_btn: "🔍 Indsæt opskriftstekst (automatisk genkendelse)",
    formular_text_label: "Indsæt opskriftsteksten her (f.eks. kopieret fra en opskriftswebside)",
    formular_text_placeholder: "Titel, ingredienser, fremgangsmåde - indsæt bare hele teksten",
    formular_text_hinweis: "Ren automatisk genkendelse uden AI - fungerer bedst med overskrifterne \"Ingredienser\" og \"Fremgangsmåde\" i teksten. Tjek venligst resultatet bagefter, det kan være ufuldstændigt.",
    formular_text_erkennen_btn: "Genkend",
    formular_json_einfuegen_btn: "📋 Indsæt AI-genereret JSON",
    formular_json_info_aria: "Vis en færdig prompt til en AI",
    json_info_titel: "Prompt til en AI",
    json_info_erklaerung:
      "Kopiér denne tekst, indsæt den i en AI efter eget valg (f.eks. ChatGPT eller Claude), vedhæft din opskriftstekst, og indsæt derefter svaret ovenfor under „Indsæt JSON her“.",
    json_info_prompt:
      "Omdan opskriftsteksten, jeg sender lige om lidt, til ÉT enkelt JSON-objekt - uden forklaring, uden tekst før eller efter, kun JSON'en. Brug præcis dette format:\n\n" +
      "{\n" +
      '  "title": "opskriftens navn",\n' +
      '  "servings": 4,\n' +
      '  "category": "en af: {{kategorien}}",\n' +
      '  "ingredients": ["én ingrediens pr. post, f.eks. 200 g mel"],\n' +
      '  "steps": ["ét tilberedningstrin pr. post"],\n' +
      '  "tags": ["valgfrie stikord, f.eks. vegetarisk"]\n' +
      "}\n\n" +
      "Regler: „category“ skal være PRÆCIS en af værdierne nævnt ovenfor (overføres uændret, også selvom opskriftsteksten er på et andet sprog - det er faste interne værdier). " +
      "„tags“ er valgfrit, et tomt array er fint. " +
      "Find ikke på ingredienser eller trin, der ikke står i teksten. " +
      "Her er opskriftsteksten:",
    json_info_kopieren_btn: "📋 Kopiér prompt",
    json_info_kopiert: "Kopieret!",
    formular_json_label: "Indsæt JSON her",
    formular_json_uebernehmen_btn: "Anvend",
    formular_label_titel: "Titel",
    formular_label_kategorie: "Kategori",
    formular_label_tags: "Tags (flere mulige, f.eks. \"vegetarisk\", \"hurtig\")",
    formular_tag_placeholder: "Indtast og tilføj et tag",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Fjern tag {{tag}}",
    formular_label_portionen: "Portioner (basis)",
    formular_label_zutaten: "Ingredienser",
    formular_zutat_hinzufuegen_btn: "+ Ingrediens",
    formular_zutat_menge_placeholder: "Mængde",
    formular_zutat_einheit_placeholder: "Enhed",
    formular_zutat_name_placeholder: "Ingrediens",
    formular_zutat_entfernen_aria: "Fjern ingrediens",
    formular_label_zubereitung: "Fremgangsmåde (trin)",
    formular_schritt_hinzufuegen_btn: "+ Trin",
    formular_schritt_placeholder_beispiel: "f.eks. vask og skær grøntsager",
    formular_schritt_placeholder_naechster: "næste trin",
    formular_schritt_entfernen_aria: "Fjern trin",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(findes – ny fil erstatter det)",
    formular_bild_hinweis: "Det nuværende foto bevares, hvis du ikke vælger en ny fil.",
    formular_bild_verkleinern_text: "Foto formindskes…",
    fehler_url_ungueltig: "Angiv venligst en fuldstændig adresse med http:// eller https://.",
    fehler_url_apostroph: "Denne adresse indeholder en apostrof (') og kan desværre ikke importeres.",
    fehler_url_keine_ausgabe: "Scriptet returnerede intet output. Er 'rezeptbuch_url_importieren' konfigureret i configuration.yaml, og er Home Assistant blevet fuldstændig genstartet siden da?",
    fehler_url_kein_json: "Importscriptets svar var ikke gyldig JSON.",
    fehler_url_import_fehlgeschlagen: "URL-import mislykkedes: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Kunne desværre ikke genkende noget i den indsatte tekst. Udfyld venligst felterne nedenfor manuelt.",
    warnung_texterkennung_unvollstaendig: "Genkendelsen var ufuldstændig (ingredienser eller trin mangler/er muligvis forkert tildelt) - tjek og suppler venligst i formularen.",
    fehler_json_ungueltig: "Den indsatte JSON er ugyldig. Tjek den venligst og prøv igen.",
    fehler_json_titel_fehlt: "JSON'en mangler mindst feltet 'title'.",
    fehler_titel_fehlt: "Angiv venligst en titel.",
    fehler_unerwartet: "Uventet fejl:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" er i mellemtiden blevet slettet af en anden. Dine ændringer blev ikke gemt.",
    fehler_konflikt_geaendert: "\"{{titel}}\" er i mellemtiden blevet ændret af en anden (f.eks. en kommentar, bedømmelse eller egen redigering).\n\nFor at undgå at noget bliver overskrevet, blev dine ændringer IKKE gemt. Åbn venligst opskriften igen, og indtast dine ændringer igen.",
    fehler_vorgang_fehlgeschlagen: "Handlingen mislykkedes:\n{{fehler}}",
    fehler_teilen_drucken: "Uventet fejl ved deling/udskrivning:\n{{fehler}}",
    fehler_config_entity_fehlt: "Angiv venligst 'entity' i kortkonfigurationen, f.eks. entity: todo.rezepte",
    fehler_bild_lesen: "Fotoet kunne ikke læses (filen er beskadiget eller understøttes ikke).",
    fehler_bild_verarbeiten: "Fotoet kunne ikke behandles som et billede (ikke understøttet format?).",
    teilen_ueberschrift_zutaten: "INGREDIENSER",
    teilen_ueberschrift_zubereitung: "FREMGANGSMÅDE",
    seite_zurueck_btn: "← Tilbage",
    seite_weiter_btn: "Næste →",
    seite_anzeige: "Side {{aktuell}} af {{gesamt}}",
    update_neue_version: "Ny version tilgængelig: {{version}}",
    update_ansehen_btn: "Vis",
    update_schliessen_aria: "Skjul meddelelse",
    detail_kochmodus_btn: "🍳 Tilberedningstilstand",
    kochmodus_schritt_anzeige: "Trin {{aktuell}} af {{gesamt}}",
    kochmodus_schliessen_aria: "Luk tilberedningstilstand",
    kochmodus_schritt_zurueck_aria: "Forrige trin",
    kochmodus_schritt_weiter_aria: "Næste trin",
    kochmodus_zutaten_ein_aria: "Vis ingredienser",
    kochmodus_zutaten_aus_aria: "Skjul ingredienser",
    kopf_sammel_pdf_btn: "📚 Samlet PDF",
    sammel_pdf_keine_rezepte: "Ingen opskrifter fundet til eksport.",
    sammel_pdf_frage_toc: "Vil du oprette en indholdsfortegnelse for de valgte opskrifter?",
    sammel_pdf_ja_toc_btn: "Ja, opret indholdsfortegnelse",
    sammel_pdf_nein_toc_btn: "Nej, ingen indholdsfortegnelse",
    sammel_pdf_name_placeholder: "Navn på kogebogen",
    sammel_pdf_erstellen_btn: "Opret PDF",
    abschnitt_titel_inhaltsverzeichnis: "Indholdsfortegnelse",
    sammel_pdf_frage_umfang: "Hvilke opskrifter skal med i den samlede PDF?",
    sammel_pdf_alle_rezepte_btn: "Alle viste opskrifter",
    sammel_pdf_auswahl_btn: "Vælg bestemte opskrifter",
    sammel_pdf_auswahl_titel: "Vælg opskrifter",
    sammel_pdf_alle_auswaehlen_link: "Vælg alle",
    sammel_pdf_keine_auswaehlen_link: "Fravælg alle",
    sammel_pdf_weiter_btn: "Næste",
    sammel_pdf_auswahl_keine_hinweis: "Vælg mindst én opskrift.",
  },
  nl: {
    allgemein_zurueck: "← Terug",
    allgemein_ja: "Ja",
    allgemein_nein: "Nee",
    allgemein_speichern: "Opslaan",
    allgemein_speichert: "Bezig met opslaan…",
    allgemein_abbrechen: "Annuleren",
    allgemein_bearbeiten: "Bewerken",
    allgemein_loeschen: "Verwijderen",
    allgemein_oeffnen: "Openen",
    allgemein_unbekannt: "Onbekend",
    allgemein_schliessen: "Sluiten",
    kategorie_hauptgericht: "Hoofdgerecht",
    kategorie_vorspeise: "Voorgerecht",
    kategorie_suppe: "Soep",
    kategorie_salat: "Salade",
    kategorie_beilage: "Bijgerecht",
    kategorie_dessert: "Dessert",
    kategorie_kuchen_gebaeck: "Taarten & gebak",
    kategorie_fruehstueck: "Ontbijt",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Drankje",
    kategorie_sonstiges: "Overig",
    kategorie_filter_alle: "Alle",
    wochentag_montag: "Maandag",
    wochentag_dienstag: "Dinsdag",
    wochentag_mittwoch: "Woensdag",
    wochentag_donnerstag: "Donderdag",
    wochentag_freitag: "Vrijdag",
    wochentag_samstag: "Zaterdag",
    wochentag_sonntag: "Zondag",
    sortier_titel: "Alfabetisch (A-Z)",
    sortier_bewertung: "Beste beoordeling eerst",
    sortier_kategorie: "Op categorie",
    sortier_neu: "Nieuwste eerst",
    sortieren_label: "Sorteren:",
    kopf_titel_standard: "Kookboek",
    kopf_sichern_btn: "💾 Back-up",
    kopf_wochenplan_btn: "📅 Weekmenu",
    einkaufsmodus_start_btn: "🛒 Boodschappenlijst",
    einkaufsmodus_beenden_btn: "✕ Selectie beëindigen",
    kopf_neu_btn: "+ Nieuw",
    suche_placeholder: "🔍 Recept of ingrediënten (bijv. bloem, eieren)…",
    kochbuch_loeschen_title: "Verzameling verwijderen",
    kochbuch_loeschen_aria: "Verzameling {{name}} verwijderen",
    kochbuch_speichern_btn: "+ Opslaan als slimme verzameling",
    kochbuch_name_placeholder: "Naam voor deze verzameling, bijv. Herfstrecepten",
    fehler_kochbuch_name_fehlt: "Vul een naam in voor de verzameling.",
    kochbuch_info_aria: "Uitleg over slimme verzamelingen tonen",
    kochbuch_info_titel: "Wat is een slimme verzameling?",
    kochbuch_info_text:
      "Een slimme verzameling slaat geen vaste lijst met recepten op, " +
      "maar een combinatie van categorie, tags en zoekterm, precies " +
      "zoals die is ingesteld op het moment van opslaan. Daarna werkt " +
      "hij zichzelf automatisch bij: een nieuw recept dat past, " +
      "verschijnt vanzelf, en een recept waarvan de categorie of tags " +
      "veranderen, kan net zo automatisch weer verdwijnen.",
    einkaufs_zaehler: "{{anzahl}} geselecteerd",
    einkaufsliste_erstellen_btn: "Boodschappenlijst maken",
    fehler_einkaufsliste_keine_konfiguration: "Voor de boodschappenlijst ontbreekt nog de configuratie: geef 'shopping_list_entity' op in de kaartconfiguratie (bijv. shopping_list_entity: todo.einkaufsliste) - hiervoor is een TWEEDE Lokale to-do-lijst-helper nodig. Zie ANLEITUNG-Backup.md, sectie 18.",
    fehler_einkaufsliste_keine_auswahl: "Selecteer minstens één recept.",
    fehler_einkaufsliste_keine_zutaten: "De geselecteerde recepten bevatten geen ingrediënten.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Kon \"{{zeile}}\" niet toevoegen aan de boodschappenlijst:\n{{fehler}}\n\nReeds toegevoegde ingrediënten blijven op de lijst staan.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingrediënt(en) toegevoegd aan \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" verwijderd.",
    undo_rueckgaengig_btn: "Ongedaan maken",
    leer_keine_rezepte: "Nog geen recepten – begin met \"+ Nieuw\"",
    leer_keine_treffer: "Geen recepten gevonden voor \"{{begriff}}\"",
    fehler_liste_laden_titel: "Kon \"{{entity}}\" niet laden.",
    fehler_liste_laden_hinweis: "Bestaat deze to-do-lijst? (Instellingen → Apparaten & diensten → Hulpmiddelen)",
    kachel_aria_label_oeffnen: "Recept {{titel}} openen",
    sterne_aria_label_gruppe: "Jouw beoordeling",
    sterne_aria_label: "{{zahl}} van 5 sterren",
    fehler_kein_benutzer_bewertung: "Kon je gebruiker niet bepalen - beoordelen niet mogelijk.",
    detail_teilen_drucken_btn: "📤 Delen / Afdrukken",
    detail_erstellt_von: "👤 Aangemaakt door {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} beoordeling)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} beoordelingen)",
    detail_keine_bewertungen: "Nog geen beoordelingen",
    detail_deine_bewertung: "Jouw beoordeling:",
    detail_zubereitet_x: "🍳 {{anzahl}}x bereid",
    detail_portionen_suffix: "porties",
    abschnitt_titel_zutaten: "Ingrediënten",
    abschnitt_titel_zubereitung: "Bereiding",
    keine_zutaten: "Geen ingrediënten opgegeven",
    detail_kommentare_titel: "Reacties",
    detail_keine_kommentare: "Nog geen reacties",
    detail_kommentar_placeholder: "Aanvulling, tip of opmerking…",
    detail_kommentar_hinzufuegen_btn: "Reactie toevoegen",
    detail_bearbeiten_hinweis: "Alleen {{name}} (of een beheerder) kan dit recept bewerken of verwijderen.",
    detail_ersteller_unbekannt: "de maker",
    modal_zubereitet_frage: "Heb je \"{{titel}}\" bereid?",
    statistik_btn: "📊 Statistiek",
    statistik_titel: "Kookstatistiek",
    statistik_info_aria: "Uitleg over de statistiek tonen",
    statistik_info_titel: "Hoe wordt deze statistiek berekend?",
    statistik_info_text:
      "Deze weergave telt elke bevestiging van de vraag „Heb je het bereid?“ - ongeacht portiegrootte of hoe vaak op dezelfde dag. Als deze vraag is uitgeschakeld via de kaartoptie ask_cooked: false, groeien de aantallen niet meer, maar al geregistreerde bereidingen blijven behouden.",
    statistik_dieses_jahr: "Je hebt {{anzahl}}x uit je receptenboek gekookt in {{jahr}}",
    statistik_gesamt: "Je hebt in totaal {{anzahl}}x uit je receptenboek gekookt",
    statistik_top_titel: "Meest bereid",
    statistik_keine_daten: "Nog geen bereidingen geregistreerd.",
    modal_loeschen_frage: "\"{{titel}}\" echt verwijderen?",
    modal_loeschen_ja_btn: "Ja, verwijderen",
    wochenplan_titel: "Weekmenu",
    wochenplan_tab_diese: "Deze week",
    wochenplan_tab_folgewoche: "Volgende week",
    wochenplan_hinweis_folgewoche: "Plan hier alvast de komende week - deze schuift automatisch door naar \"Deze week\" zodra de huidige week voorbij is.",
    wochenplan_hinweis_diese: "Verstreken dagen worden automatisch geleegd (het recept zelf blijft behouden, alleen de toewijzing verdwijnt).",
    wochenplan_hinweis_speicherung: "Wordt op alle apparaten opgeslagen (als onzichtbare extra invoer in dezelfde receptenlijst, geen extra helper nodig).",
    wochenplan_leer: "Nog geen recepten - maak er eerst een paar aan.",
    wochenplan_kein_rezept_option: "– geen recept –",
    wochenplan_einkaufsliste_btn: "Boodschappenlijst maken van {{ziel}}",
    wochenplan_wort: "weekmenu",
    wochenplan_folgewoche_wort: "volgende week",
    wochenplan_aktuelle_woche_wort: "huidige week",
    wochenplan_keine_zuweisung: "{{zeitraum}} bevat nog geen toegewezen recepten.",
    formular_titel_neu: "Nieuw recept",
    formular_titel_bearbeiten: "Recept bewerken",
    formular_url_import_btn: "🌐 Recept-URL importeren",
    formular_url_label: "Link naar de receptwebsite",
    formular_url_placeholder: "https://www.voorbeeld-recepten.nl/mijn-recept",
    formular_url_hinweis: "Laadt de pagina en leest de receptstructuurdata die er al in zijn ingebouwd (dezelfde data waarmee bijv. Google sterbeoordelingen in de zoekresultaten toont) - meestal betrouwbaarder dan tekstherkenning. Werkt alleen op pagina's die dergelijke data aanbieden en geautomatiseerde verzoeken niet blokkeren.",
    formular_url_importieren_btn: "Importeren",
    formular_url_laedt: "Laden …",
    formular_text_einfuegen_btn: "🔍 Recepttekst plakken (automatisch herkennen)",
    formular_text_label: "Plak hier de recepttekst (bijv. gekopieerd van een receptwebsite)",
    formular_text_placeholder: "Titel, ingrediënten, bereiding - plak gewoon de hele tekst",
    formular_text_hinweis: "Puur automatische herkenning zonder AI - werkt het beste met de koppen \"Ingrediënten\" en \"Bereiding\" in de tekst. Controleer het resultaat daarna kort, het kan onvolledig zijn.",
    formular_text_erkennen_btn: "Herkennen",
    formular_json_einfuegen_btn: "📋 Door AI gegenereerde JSON plakken",
    formular_json_info_aria: "Kant-en-klare prompt voor een AI tonen",
    json_info_titel: "Prompt voor een AI",
    json_info_erklaerung:
      "Kopieer deze tekst, plak hem in een AI naar keuze (bijv. ChatGPT of Claude), voeg je recepttekst toe en plak het antwoord daarna hierboven bij „Plak hier de JSON“.",
    json_info_prompt:
      "Zet de recepttekst die ik zo naar je stuur om in ÉÉN enkel JSON-object - zonder uitleg, zonder tekst ervoor of erna, alleen de JSON. Gebruik precies dit formaat:\n\n" +
      "{\n" +
      '  "title": "naam van het recept",\n' +
      '  "servings": 4,\n' +
      '  "category": "één van: {{kategorien}}",\n' +
      '  "ingredients": ["één ingrediënt per item, bijv. 200 g bloem"],\n' +
      '  "steps": ["één bereidingsstap per item"],\n' +
      '  "tags": ["optionele trefwoorden, bijv. vegetarisch"]\n' +
      "}\n\n" +
      "Regels: „category“ moet PRECIES een van de hierboven genoemde waarden zijn (ongewijzigd overnemen, ook als de recepttekst in een andere taal is - dit zijn vaste interne waarden). " +
      "„tags“ is optioneel, een lege array mag ook. " +
      "Verzin geen ingrediënten of stappen die niet in de tekst staan. " +
      "Hier is de recepttekst:",
    json_info_kopieren_btn: "📋 Prompt kopiëren",
    json_info_kopiert: "Gekopieerd!",
    formular_json_label: "Plak hier de JSON",
    formular_json_uebernehmen_btn: "Overnemen",
    formular_label_titel: "Titel",
    formular_label_kategorie: "Categorie",
    formular_label_tags: "Tags (meerdere mogelijk, bijv. \"vegetarisch\", \"snel\")",
    formular_tag_placeholder: "Tag invoeren en toevoegen",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Tag {{tag}} verwijderen",
    formular_label_portionen: "Porties (basis)",
    formular_label_zutaten: "Ingrediënten",
    formular_zutat_hinzufuegen_btn: "+ Ingrediënt",
    formular_zutat_menge_placeholder: "Hoeveelheid",
    formular_zutat_einheit_placeholder: "Eenheid",
    formular_zutat_name_placeholder: "Ingrediënt",
    formular_zutat_entfernen_aria: "Ingrediënt verwijderen",
    formular_label_zubereitung: "Bereiding (stappen)",
    formular_schritt_hinzufuegen_btn: "+ Stap",
    formular_schritt_placeholder_beispiel: "bijv. groenten wassen en snijden",
    formular_schritt_placeholder_naechster: "volgende stap",
    formular_schritt_entfernen_aria: "Stap verwijderen",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(aanwezig – nieuw bestand vervangt deze)",
    formular_bild_hinweis: "De huidige foto blijft behouden als je geen nieuw bestand kiest.",
    formular_bild_verkleinern_text: "Foto wordt verkleind…",
    fehler_url_ungueltig: "Vul een volledig adres in dat begint met http:// of https://.",
    fehler_url_apostroph: "Dit adres bevat een apostrof (') en kan helaas niet worden geïmporteerd.",
    fehler_url_keine_ausgabe: "Het script heeft geen uitvoer geleverd. Is 'rezeptbuch_url_importieren' ingesteld in configuration.yaml en is Home Assistant sindsdien volledig opnieuw opgestart?",
    fehler_url_kein_json: "Het antwoord van het importscript was geen geldige JSON.",
    fehler_url_import_fehlgeschlagen: "URL-import mislukt: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Kon helaas niets herkennen in de geplakte tekst. Vul de velden hieronder handmatig in.",
    warnung_texterkennung_unvollstaendig: "De herkenning was onvolledig (ingrediënten of stappen ontbreken/zijn mogelijk verkeerd toegewezen) - controleer en vul aan in het formulier.",
    fehler_json_ungueltig: "De geplakte JSON is ongeldig. Controleer deze en probeer het opnieuw.",
    fehler_json_titel_fehlt: "In de JSON ontbreekt minstens het veld 'title'.",
    fehler_titel_fehlt: "Vul een titel in.",
    fehler_unerwartet: "Onverwachte fout:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" is inmiddels door iemand anders verwijderd. Je wijzigingen zijn niet opgeslagen.",
    fehler_konflikt_geaendert: "\"{{titel}}\" is inmiddels door iemand anders gewijzigd (bijv. een reactie, beoordeling of eigen bewerking).\n\nOm te voorkomen dat er iets wordt overschreven, zijn je wijzigingen NIET opgeslagen. Open het recept opnieuw en voer je wijzigingen opnieuw in.",
    fehler_vorgang_fehlgeschlagen: "Actie mislukt:\n{{fehler}}",
    fehler_teilen_drucken: "Onverwachte fout bij delen/afdrukken:\n{{fehler}}",
    fehler_config_entity_fehlt: "Geef 'entity' op in de kaartconfiguratie, bijv. entity: todo.rezepte",
    fehler_bild_lesen: "De foto kon niet worden gelezen (bestand beschadigd of niet ondersteund).",
    fehler_bild_verarbeiten: "De foto kon niet als afbeelding worden verwerkt (niet-ondersteund formaat?).",
    teilen_ueberschrift_zutaten: "INGREDIËNTEN",
    teilen_ueberschrift_zubereitung: "BEREIDING",
    seite_zurueck_btn: "← Terug",
    seite_weiter_btn: "Volgende →",
    seite_anzeige: "Pagina {{aktuell}} van {{gesamt}}",
    update_neue_version: "Nieuwe versie beschikbaar: {{version}}",
    update_ansehen_btn: "Bekijken",
    update_schliessen_aria: "Melding verbergen",
    detail_kochmodus_btn: "🍳 Kookmodus",
    kochmodus_schritt_anzeige: "Stap {{aktuell}} van {{gesamt}}",
    kochmodus_schliessen_aria: "Kookmodus sluiten",
    kochmodus_schritt_zurueck_aria: "Vorige stap",
    kochmodus_schritt_weiter_aria: "Volgende stap",
    kochmodus_zutaten_ein_aria: "Ingrediënten tonen",
    kochmodus_zutaten_aus_aria: "Ingrediënten verbergen",
    kopf_sammel_pdf_btn: "📚 Verzamel-PDF",
    sammel_pdf_keine_rezepte: "Geen recepten gevonden om te exporteren.",
    sammel_pdf_frage_toc: "Inhoudsopgave maken voor de geselecteerde recepten?",
    sammel_pdf_ja_toc_btn: "Ja, inhoudsopgave maken",
    sammel_pdf_nein_toc_btn: "Nee, geen inhoudsopgave",
    sammel_pdf_name_placeholder: "Naam van het kookboek",
    sammel_pdf_erstellen_btn: "PDF maken",
    abschnitt_titel_inhaltsverzeichnis: "Inhoudsopgave",
    sammel_pdf_frage_umfang: "Welke recepten moeten in de verzamel-PDF?",
    sammel_pdf_alle_rezepte_btn: "Alle getoonde recepten",
    sammel_pdf_auswahl_btn: "Bepaalde recepten selecteren",
    sammel_pdf_auswahl_titel: "Recepten selecteren",
    sammel_pdf_alle_auswaehlen_link: "Alles selecteren",
    sammel_pdf_keine_auswaehlen_link: "Niets selecteren",
    sammel_pdf_weiter_btn: "Verder",
    sammel_pdf_auswahl_keine_hinweis: "Selecteer minstens één recept.",
  },
  et: {
    allgemein_zurueck: "← Tagasi",
    allgemein_ja: "Jah",
    allgemein_nein: "Ei",
    allgemein_speichern: "Salvesta",
    allgemein_speichert: "Salvestamine…",
    allgemein_abbrechen: "Loobu",
    allgemein_bearbeiten: "Muuda",
    allgemein_loeschen: "Kustuta",
    allgemein_oeffnen: "Ava",
    allgemein_unbekannt: "Teadmata",
    allgemein_schliessen: "Sulge",
    kategorie_hauptgericht: "Pearoog",
    kategorie_vorspeise: "Eelroog",
    kategorie_suppe: "Supp",
    kategorie_salat: "Salat",
    kategorie_beilage: "Lisand",
    kategorie_dessert: "Magustoit",
    kategorie_kuchen_gebaeck: "Koogid ja küpsetised",
    kategorie_fruehstueck: "Hommikusöök",
    kategorie_snack: "Suupiste",
    kategorie_getraenk: "Jook",
    kategorie_sonstiges: "Muu",
    kategorie_filter_alle: "Kõik",
    wochentag_montag: "Esmaspäev",
    wochentag_dienstag: "Teisipäev",
    wochentag_mittwoch: "Kolmapäev",
    wochentag_donnerstag: "Neljapäev",
    wochentag_freitag: "Reede",
    wochentag_samstag: "Laupäev",
    wochentag_sonntag: "Pühapäev",
    sortier_titel: "Tähestikuline (A-Ü)",
    sortier_bewertung: "Parima hinnanguga eespool",
    sortier_kategorie: "Kategooria järgi",
    sortier_neu: "Uusim eespool",
    sortieren_label: "Sordi:",
    kopf_titel_standard: "Retseptiraamat",
    kopf_sichern_btn: "💾 Varukoopia",
    kopf_wochenplan_btn: "📅 Nädalaplaan",
    einkaufsmodus_start_btn: "🛒 Ostunimekiri",
    einkaufsmodus_beenden_btn: "✕ Lõpeta valimine",
    kopf_neu_btn: "+ Uus",
    suche_placeholder: "🔍 Retsept või koostisosad (nt jahu, munad)…",
    kochbuch_loeschen_title: "Kustuta kogumik",
    kochbuch_loeschen_aria: "Kustuta kogumik {{name}}",
    kochbuch_speichern_btn: "+ Salvesta targa kogumikuna",
    kochbuch_name_placeholder: "Selle kogumiku nimi, nt Sügisretseptid",
    fehler_kochbuch_name_fehlt: "Sisesta kogumikule nimi.",
    kochbuch_info_aria: "Näita targa kogumiku selgitust",
    kochbuch_info_titel: "Mis on tark kogumik?",
    kochbuch_info_text:
      "Tark kogumik ei salvesta kindlat retseptide loendit, vaid " +
      "kategooria, siltide ja otsingusõna kombinatsiooni täpselt " +
      "sellisena, nagu see on salvestamise hetkel seatud. Seejärel " +
      "uueneb see iseenesest: uus sobiv retsept ilmub automaatselt ja " +
      "retsept, mille kategooria või sildid muutuvad, võib samamoodi " +
      "automaatselt uuesti kaduda.",
    einkaufs_zaehler: "{{anzahl}} valitud",
    einkaufsliste_erstellen_btn: "Loo ostunimekiri",
    fehler_einkaufsliste_keine_konfiguration: "Ostunimekirja jaoks puudub veel seadistus: sisesta kaardi seadistuses 'shopping_list_entity' (nt shopping_list_entity: todo.einkaufsliste) - selleks on vaja TEIST Kohaliku ülesannete nimekirja abistajat. Vaata ANLEITUNG-Backup.md, jaotis 18.",
    fehler_einkaufsliste_keine_auswahl: "Vali vähemalt üks retsept.",
    fehler_einkaufsliste_keine_zutaten: "Valitud retseptidel pole koostisosi.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "\"{{zeile}}\" lisamine ostunimekirja ebaõnnestus:\n{{fehler}}\n\nJuba lisatud koostisosad jäävad nimekirja alles.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} koostisosa lisatud nimekirja \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" kustutatud.",
    undo_rueckgaengig_btn: "Tühista",
    leer_keine_rezepte: "Retsepte pole veel – alusta nupuga \"+ Uus\"",
    leer_keine_treffer: "Retsepte otsingule \"{{begriff}}\" ei leitud",
    fehler_liste_laden_titel: "\"{{entity}}\" laadimine ebaõnnestus.",
    fehler_liste_laden_hinweis: "Kas see ülesannete nimekiri on olemas? (Seaded → Seadmed ja teenused → Abistajad)",
    kachel_aria_label_oeffnen: "Ava retsept {{titel}}",
    sterne_aria_label_gruppe: "Sinu hinnang",
    sterne_aria_label: "{{zahl}} 5-st tärnist",
    fehler_kein_benutzer_bewertung: "Sinu kasutajat ei õnnestunud tuvastada - hindamine pole võimalik.",
    detail_teilen_drucken_btn: "📤 Jaga / Prindi",
    detail_erstellt_von: "👤 Lisanud {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} hinnang)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} hinnangut)",
    detail_keine_bewertungen: "Hinnanguid pole veel",
    detail_deine_bewertung: "Sinu hinnang:",
    detail_zubereitet_x: "🍳 valmistatud {{anzahl}} korda",
    detail_portionen_suffix: "portsjonit",
    abschnitt_titel_zutaten: "Koostisosad",
    abschnitt_titel_zubereitung: "Valmistamine",
    keine_zutaten: "Koostisosi pole lisatud",
    detail_kommentare_titel: "Kommentaarid",
    detail_keine_kommentare: "Kommentaare pole veel",
    detail_kommentar_placeholder: "Täiendus, näpunäide või märkus…",
    detail_kommentar_hinzufuegen_btn: "Lisa kommentaar",
    detail_bearbeiten_hinweis: "Ainult {{name}} (või administraator) saab seda retsepti muuta või kustutada.",
    detail_ersteller_unbekannt: "looja",
    modal_zubereitet_frage: "Kas valmistasid \"{{titel}}\"?",
    statistik_btn: "📊 Statistika",
    statistik_titel: "Toiduvalmistamise statistika",
    statistik_info_aria: "Näita statistika selgitust",
    statistik_info_titel: "Kuidas seda statistikat arvutatakse?",
    statistik_info_text:
      "See ülevaade loeb kokku iga kinnituse küsimusele „Kas valmistasid?“ - sõltumata portsjoni suurusest või sellest, mitu korda samal päeval. Kui see küsimus on kaardi valikuga ask_cooked: false välja lülitatud, arvud enam ei kasva, kuid juba salvestatud valmistamised säilivad.",
    statistik_dieses_jahr: "Sa oled {{jahr}} aastal oma retseptiraamatust valmistanud toitu {{anzahl}} korda",
    statistik_gesamt: "Kokku oled oma retseptiraamatust valmistanud toitu {{anzahl}} korda",
    statistik_top_titel: "Enim valmistatud",
    statistik_keine_daten: "Valmistamisi pole veel salvestatud.",
    modal_loeschen_frage: "Kas tõesti kustutada \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Jah, kustuta",
    wochenplan_titel: "Nädalaplaan",
    wochenplan_tab_diese: "See nädal",
    wochenplan_tab_folgewoche: "Järgmine nädal",
    wochenplan_hinweis_folgewoche: "Planeeri siin juba nüüd tulevat nädalat - see nihkub automaatselt kirjeks \"See nädal\" niipea, kui praegune nädal on läbi.",
    wochenplan_hinweis_diese: "Möödunud päevad tühjendatakse automaatselt (retsept ise säilib, ainult määramine kaob).",
    wochenplan_hinweis_speicherung: "Salvestatakse kõikides seadmetes (peidetud lisakirjena samas retseptinimekirjas, täiendavat abistajat pole vaja).",
    wochenplan_leer: "Retsepte pole veel - loo esmalt mõni.",
    wochenplan_kein_rezept_option: "– retsepti pole –",
    wochenplan_einkaufsliste_btn: "Loo ostunimekiri allikast {{ziel}}",
    wochenplan_wort: "nädalaplaan",
    wochenplan_folgewoche_wort: "järgmine nädal",
    wochenplan_aktuelle_woche_wort: "praegune nädal",
    wochenplan_keine_zuweisung: "{{zeitraum}} ei sisalda veel määratud retsepte.",
    formular_titel_neu: "Uus retsept",
    formular_titel_bearbeiten: "Muuda retsepti",
    formular_url_import_btn: "🌐 Impordi retsepti URL",
    formular_url_label: "Link retsepti veebilehele",
    formular_url_placeholder: "https://www.naide-retseptid.ee/minu-retsept",
    formular_url_hinweis: "Laadib lehe ja loeb sellel juba olemasolevaid struktureeritud retseptiandmeid (samu andmeid, mille abil nt Google kuvab otsingus tärnihinnanguid) - tavaliselt usaldusväärsem kui tekstituvastus. Toimib ainult lehtedel, mis sellised andmed pakuvad ega blokeeri automaatseid päringuid.",
    formular_url_importieren_btn: "Impordi",
    formular_url_laedt: "Laadimine …",
    formular_text_einfuegen_btn: "🔍 Kleebi retseptitekst (automaatne tuvastus)",
    formular_text_label: "Kleebi siia retseptitekst (nt retsepti veebilehelt kopeeritud)",
    formular_text_placeholder: "Pealkiri, koostisosad, valmistamine - kleebi lihtsalt kogu tekst",
    formular_text_hinweis: "Puhtalt automaatne tuvastus ilma tehisintellektita - toimib kõige paremini, kui tekstis on pealkirjad \"Koostisosad\" ja \"Valmistamine\". Palun kontrolli tulemust pärast lühidalt, see võib olla puudulik.",
    formular_text_erkennen_btn: "Tuvasta",
    formular_json_einfuegen_btn: "📋 Kleebi tehisintellekti loodud JSON",
    formular_json_info_aria: "Näita valmis prompti tehisintellektile",
    json_info_titel: "Prompt tehisintellektile",
    json_info_erklaerung:
      "Kopeeri see tekst, kleebi see enda valitud tehisintellekti (nt ChatGPT või Claude), lisa oma retsepti tekst ning kleebi vastus seejärel üleval väljale „Kleebi JSON siia“.",
    json_info_prompt:
      "Teisenda retseptitekst, mille ma kohe saadan, ÜHEKS ainsaks JSON-objektiks - ilma selgituseta, ilma tekstita enne või pärast, ainult JSON. Kasuta täpselt seda vormingut:\n\n" +
      "{\n" +
      '  "title": "retsepti nimi",\n' +
      '  "servings": 4,\n' +
      '  "category": "üks järgmistest: {{kategorien}}",\n' +
      '  "ingredients": ["üks koostisosa kirje kohta, nt 200 g jahu"],\n' +
      '  "steps": ["üks valmistusetapp kirje kohta"],\n' +
      '  "tags": ["valikulised märksõnad, nt taimetoit"]\n' +
      "}\n\n" +
      "Reeglid: „category“ peab olema TÄPSELT üks ülal nimetatud väärtustest (kopeeri muutmata kujul, isegi kui retseptitekst on mõnes muus keeles - need on fikseeritud sisemised väärtused). " +
      "„tags“ on valikuline, vajadusel sobib tühi massiiv. " +
      "Ära mõtle välja koostisosi ega samme, mida tekstis pole. " +
      "Siin on retseptitekst:",
    json_info_kopieren_btn: "📋 Kopeeri prompt",
    json_info_kopiert: "Kopeeritud!",
    formular_json_label: "Kleebi JSON siia",
    formular_json_uebernehmen_btn: "Rakenda",
    formular_label_titel: "Pealkiri",
    formular_label_kategorie: "Kategooria",
    formular_label_tags: "Sildid (mitu võimalik, nt \"vegetaarne\", \"kiire\")",
    formular_tag_placeholder: "Sisesta ja lisa silt",
    formular_tag_hinzufuegen_btn: "+ Silt",
    formular_tag_entfernen_aria: "Eemalda silt {{tag}}",
    formular_label_portionen: "Portsjonid (baas)",
    formular_label_zutaten: "Koostisosad",
    formular_zutat_hinzufuegen_btn: "+ Koostisosa",
    formular_zutat_menge_placeholder: "Kogus",
    formular_zutat_einheit_placeholder: "Ühik",
    formular_zutat_name_placeholder: "Koostisosa",
    formular_zutat_entfernen_aria: "Eemalda koostisosa",
    formular_label_zubereitung: "Valmistamine (sammud)",
    formular_schritt_hinzufuegen_btn: "+ Samm",
    formular_schritt_placeholder_beispiel: "nt pese ja tükelda köögiviljad",
    formular_schritt_placeholder_naechster: "järgmine samm",
    formular_schritt_entfernen_aria: "Eemalda samm",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(olemas – uus fail asendab selle)",
    formular_bild_hinweis: "Praegune foto säilib, kui sa uut faili ei vali.",
    formular_bild_verkleinern_text: "Foto vähendamine…",
    fehler_url_ungueltig: "Sisesta täielik aadress, mis algab http:// või https://.",
    fehler_url_apostroph: "See aadress sisaldab ülakoma (') ja seda kahjuks ei saa importida.",
    fehler_url_keine_ausgabe: "Skript ei tagastanud väljundit. Kas 'rezeptbuch_url_importieren' on seadistatud failis configuration.yaml ja kas Home Assistant on seejärel täielikult taaskäivitatud?",
    fehler_url_kein_json: "Impordiskripti vastus polnud kehtiv JSON.",
    fehler_url_import_fehlgeschlagen: "URL-i import ebaõnnestus: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Kahjuks ei õnnestunud kleebitud tekstist midagi tuvastada. Palun täida allolevad väljad käsitsi.",
    warnung_texterkennung_unvollstaendig: "Tuvastus oli puudulik (koostisosad või sammud puuduvad või on valesti määratud) - palun kontrolli ja täienda vormil.",
    fehler_json_ungueltig: "Kleebitud JSON on kehtetu. Palun kontrolli ja proovi uuesti.",
    fehler_json_titel_fehlt: "JSON-ist puudub vähemalt väli 'title'.",
    fehler_titel_fehlt: "Sisesta pealkiri.",
    fehler_unerwartet: "Ootamatu viga:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" on vahepeal kellegi teise poolt kustutatud. Sinu muudatusi ei salvestatud.",
    fehler_konflikt_geaendert: "\"{{titel}}\" on vahepeal kellegi teise poolt muudetud (nt kommentaar, hinnang või oma muudatus).\n\nSelleks et miski üle ei kirjutataks, sinu muudatusi EI salvestatud. Palun ava retsept uuesti ja sisesta oma muudatused uuesti.",
    fehler_vorgang_fehlgeschlagen: "Toiming ebaõnnestus:\n{{fehler}}",
    fehler_teilen_drucken: "Ootamatu viga jagamisel/printimisel:\n{{fehler}}",
    fehler_config_entity_fehlt: "Sisesta kaardi seadistuses 'entity', nt entity: todo.rezepte",
    fehler_bild_lesen: "Fotot ei õnnestunud lugeda (fail on rikutud või ei toetata seda).",
    fehler_bild_verarbeiten: "Fotot ei õnnestunud pildina töödelda (toetamata vorming?).",
    teilen_ueberschrift_zutaten: "KOOSTISOSAD",
    teilen_ueberschrift_zubereitung: "VALMISTAMINE",
    seite_zurueck_btn: "← Tagasi",
    seite_weiter_btn: "Edasi →",
    seite_anzeige: "Lehekülg {{aktuell}} / {{gesamt}}",
    update_neue_version: "Uus versioon saadaval: {{version}}",
    update_ansehen_btn: "Vaata",
    update_schliessen_aria: "Peida teavitus",
    detail_kochmodus_btn: "🍳 Küpsetusrežiim",
    kochmodus_schritt_anzeige: "Samm {{aktuell}} / {{gesamt}}",
    kochmodus_schliessen_aria: "Sulge küpsetusrežiim",
    kochmodus_schritt_zurueck_aria: "Eelmine samm",
    kochmodus_schritt_weiter_aria: "Järgmine samm",
    kochmodus_zutaten_ein_aria: "Näita koostisosi",
    kochmodus_zutaten_aus_aria: "Peida koostisosad",
    kopf_sammel_pdf_btn: "📚 Koond-PDF",
    sammel_pdf_keine_rezepte: "Eksportimiseks retsepte ei leitud.",
    sammel_pdf_frage_toc: "Kas luua valitud retseptide sisukord?",
    sammel_pdf_ja_toc_btn: "Jah, loo sisukord",
    sammel_pdf_nein_toc_btn: "Ei, ilma sisukorrata",
    sammel_pdf_name_placeholder: "Kokaraamatu nimi",
    sammel_pdf_erstellen_btn: "Loo PDF",
    abschnitt_titel_inhaltsverzeichnis: "Sisukord",
    sammel_pdf_frage_umfang: "Millised retseptid peaksid koond-PDF-i minema?",
    sammel_pdf_alle_rezepte_btn: "Kõik kuvatud retseptid",
    sammel_pdf_auswahl_btn: "Vali konkreetsed retseptid",
    sammel_pdf_auswahl_titel: "Vali retseptid",
    sammel_pdf_alle_auswaehlen_link: "Vali kõik",
    sammel_pdf_keine_auswaehlen_link: "Tühista valik",
    sammel_pdf_weiter_btn: "Edasi",
    sammel_pdf_auswahl_keine_hinweis: "Palun vali vähemalt üks retsept.",
  },
  fi: {
    allgemein_zurueck: "← Takaisin",
    allgemein_ja: "Kyllä",
    allgemein_nein: "Ei",
    allgemein_speichern: "Tallenna",
    allgemein_speichert: "Tallennetaan…",
    allgemein_abbrechen: "Peruuta",
    allgemein_bearbeiten: "Muokkaa",
    allgemein_loeschen: "Poista",
    allgemein_oeffnen: "Avaa",
    allgemein_unbekannt: "Tuntematon",
    allgemein_schliessen: "Sulje",
    kategorie_hauptgericht: "Pääruoka",
    kategorie_vorspeise: "Alkuruoka",
    kategorie_suppe: "Keitto",
    kategorie_salat: "Salaatti",
    kategorie_beilage: "Lisuke",
    kategorie_dessert: "Jälkiruoka",
    kategorie_kuchen_gebaeck: "Kakut ja leivonnaiset",
    kategorie_fruehstueck: "Aamiainen",
    kategorie_snack: "Välipala",
    kategorie_getraenk: "Juoma",
    kategorie_sonstiges: "Muu",
    kategorie_filter_alle: "Kaikki",
    wochentag_montag: "Maanantai",
    wochentag_dienstag: "Tiistai",
    wochentag_mittwoch: "Keskiviikko",
    wochentag_donnerstag: "Torstai",
    wochentag_freitag: "Perjantai",
    wochentag_samstag: "Lauantai",
    wochentag_sonntag: "Sunnuntai",
    sortier_titel: "Aakkosjärjestys (A-Ö)",
    sortier_bewertung: "Parhaiten arvioidut ensin",
    sortier_kategorie: "Kategorian mukaan",
    sortier_neu: "Uusimmat ensin",
    sortieren_label: "Järjestä:",
    kopf_titel_standard: "Reseptikirja",
    kopf_sichern_btn: "💾 Varmuuskopio",
    kopf_wochenplan_btn: "📅 Viikkosuunnitelma",
    einkaufsmodus_start_btn: "🛒 Ostoslista",
    einkaufsmodus_beenden_btn: "✕ Lopeta valinta",
    kopf_neu_btn: "+ Uusi",
    suche_placeholder: "🔍 Resepti tai ainekset (esim. jauho, kananmunat)…",
    kochbuch_loeschen_title: "Poista kokoelma",
    kochbuch_loeschen_aria: "Poista kokoelma {{name}}",
    kochbuch_speichern_btn: "+ Tallenna älykkäänä kokoelmana",
    kochbuch_name_placeholder: "Tämän kokoelman nimi, esim. Syksyn reseptit",
    fehler_kochbuch_name_fehlt: "Anna kokoelmalle nimi.",
    kochbuch_info_aria: "Näytä selitys älykkäistä kokoelmista",
    kochbuch_info_titel: "Mikä on älykäs kokoelma?",
    kochbuch_info_text:
      "Älykäs kokoelma ei tallenna kiinteää reseptiluetteloa, vaan " +
      "kategorian, tunnisteiden ja hakusanan yhdistelmän juuri " +
      "sellaisena kuin se on asetettu tallennushetkellä. Sen jälkeen " +
      "se päivittyy itsestään: uusi sopiva resepti ilmestyy " +
      "automaattisesti, ja resepti, jonka kategoria tai tunnisteet " +
      "muuttuvat, voi yhtä automaattisesti kadota jälleen.",
    einkaufs_zaehler: "{{anzahl}} valittu",
    einkaufsliste_erstellen_btn: "Luo ostoslista",
    fehler_einkaufsliste_keine_konfiguration: "Ostoslistan määrityksiä puuttuu vielä: määritä 'shopping_list_entity' kortin asetuksissa (esim. shopping_list_entity: todo.einkaufsliste) - tähän tarvitaan TOINEN Paikallinen tehtävälista -apuri. Katso ANLEITUNG-Backup.md, osio 18.",
    fehler_einkaufsliste_keine_auswahl: "Valitse vähintään yksi resepti.",
    fehler_einkaufsliste_keine_zutaten: "Valituissa resepteissä ei ole aineksia.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Kohteen \"{{zeile}}\" lisääminen ostoslistalle epäonnistui:\n{{fehler}}\n\nJo lisätyt ainekset jäävät ostoslistalle.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ainesosaa lisätty listaan \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" poistettu.",
    undo_rueckgaengig_btn: "Kumoa",
    leer_keine_rezepte: "Ei vielä reseptejä – aloita painamalla \"+ Uusi\"",
    leer_keine_treffer: "Reseptejä ei löytynyt haulla \"{{begriff}}\"",
    fehler_liste_laden_titel: "Kohteen \"{{entity}}\" lataaminen epäonnistui.",
    fehler_liste_laden_hinweis: "Onko tämä tehtävälista olemassa? (Asetukset → Laitteet ja palvelut → Apuohjelmat)",
    kachel_aria_label_oeffnen: "Avaa resepti {{titel}}",
    sterne_aria_label_gruppe: "Oma arviosi",
    sterne_aria_label: "{{zahl}} / 5 tähteä",
    fehler_kein_benutzer_bewertung: "Käyttäjääsi ei voitu tunnistaa - arvostelu ei ole mahdollinen.",
    detail_teilen_drucken_btn: "📤 Jaa / Tulosta",
    detail_erstellt_von: "👤 Luonut {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} arvio)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} arviota)",
    detail_keine_bewertungen: "Ei vielä arvioita",
    detail_deine_bewertung: "Oma arviosi:",
    detail_zubereitet_x: "🍳 valmistettu {{anzahl}} kertaa",
    detail_portionen_suffix: "annosta",
    abschnitt_titel_zutaten: "Ainekset",
    abschnitt_titel_zubereitung: "Valmistus",
    keine_zutaten: "Aineksia ei ole lisätty",
    detail_kommentare_titel: "Kommentit",
    detail_keine_kommentare: "Ei vielä kommentteja",
    detail_kommentar_placeholder: "Lisäys, vinkki tai huomautus…",
    detail_kommentar_hinzufuegen_btn: "Lisää kommentti",
    detail_bearbeiten_hinweis: "Vain {{name}} (tai ylläpitäjä) voi muokata tai poistaa tämän reseptin.",
    detail_ersteller_unbekannt: "tekijä",
    modal_zubereitet_frage: "Valmistitko reseptin \"{{titel}}\"?",
    statistik_btn: "📊 Tilastot",
    statistik_titel: "Ruoanlaittotilastot",
    statistik_info_aria: "Näytä selitys tilastoista",
    statistik_info_titel: "Miten tämä tilasto lasketaan?",
    statistik_info_text:
      "Tämä yhteenveto laskee jokaisen vahvistuksen kysymykseen „Valmistitko sen?“ - annoskoosta tai saman päivän toistokerroista riippumatta. Jos tämä kysymys on poistettu käytöstä kortin asetuksella ask_cooked: false, luvut eivät enää kasva, mutta jo tallennetut valmistuskerrat säilyvät.",
    statistik_dieses_jahr: "Olet kokannut {{anzahl}}x reseptikirjastasi vuonna {{jahr}}",
    statistik_gesamt: "Olet kokannut yhteensä {{anzahl}}x reseptikirjastasi",
    statistik_top_titel: "Eniten valmistetut",
    statistik_keine_daten: "Valmistuskertoja ei ole vielä tallennettu.",
    modal_loeschen_frage: "Poistetaanko \"{{titel}}\" varmasti?",
    modal_loeschen_ja_btn: "Kyllä, poista",
    wochenplan_titel: "Viikkosuunnitelma",
    wochenplan_tab_diese: "Tämä viikko",
    wochenplan_tab_folgewoche: "Seuraava viikko",
    wochenplan_hinweis_folgewoche: "Suunnittele täällä jo tuleva viikko - se siirtyy automaattisesti kohtaan \"Tämä viikko\", kun nykyinen viikko on ohi.",
    wochenplan_hinweis_diese: "Menneet päivät tyhjennetään automaattisesti (resepti itse säilyy, vain kohdistus katoaa).",
    wochenplan_hinweis_speicherung: "Tallennetaan laitteiden välillä (piilotettuna lisämerkintänä samassa reseptilistassa, ei tarvita lisäapuria).",
    wochenplan_leer: "Ei vielä reseptejä - luo ensin joitain.",
    wochenplan_kein_rezept_option: "– ei reseptiä –",
    wochenplan_einkaufsliste_btn: "Luo ostoslista kohteesta {{ziel}}",
    wochenplan_wort: "viikkosuunnitelma",
    wochenplan_folgewoche_wort: "seuraava viikko",
    wochenplan_aktuelle_woche_wort: "nykyinen viikko",
    wochenplan_keine_zuweisung: "{{zeitraum}} ei sisällä vielä kohdistettuja reseptejä.",
    formular_titel_neu: "Uusi resepti",
    formular_titel_bearbeiten: "Muokkaa reseptiä",
    formular_url_import_btn: "🌐 Tuo reseptin URL-osoite",
    formular_url_label: "Linkki reseptisivustoon",
    formular_url_placeholder: "https://www.esimerkki-reseptit.fi/oma-resepti",
    formular_url_hinweis: "Lataa sivun ja lukee siihen jo sisällytetyt reseptin rakenteiset tiedot (samat tiedot, joilla esim. Google näyttää tähtiarviot hakutuloksissa) - yleensä luotettavampi kuin tekstintunnistus. Toimii vain sivustoilla, jotka tarjoavat tällaisia tietoja eivätkä estä automaattisia pyyntöjä.",
    formular_url_importieren_btn: "Tuo",
    formular_url_laedt: "Ladataan …",
    formular_text_einfuegen_btn: "🔍 Liitä reseptiteksti (automaattinen tunnistus)",
    formular_text_label: "Liitä reseptiteksti tähän (esim. kopioitu reseptisivustolta)",
    formular_text_placeholder: "Otsikko, ainekset, valmistus - liitä vain koko teksti",
    formular_text_hinweis: "Täysin automaattinen tunnistus ilman tekoälyä - toimii parhaiten, kun tekstissä on otsikot \"Ainekset\" ja \"Valmistus\". Tarkista tulos vielä lyhyesti jälkikäteen, se voi olla puutteellinen.",
    formular_text_erkennen_btn: "Tunnista",
    formular_json_einfuegen_btn: "📋 Liitä tekoälyn luoma JSON",
    formular_json_info_aria: "Näytä valmis prompti tekoälylle",
    json_info_titel: "Prompti tekoälylle",
    json_info_erklaerung:
      "Kopioi tämä teksti, liitä se valitsemaasi tekoälyyn (esim. ChatGPT tai Claude), liitä perään oma reseptitekstisi ja liitä vastaus sen jälkeen yllä olevaan kohtaan „Liitä JSON tähän“.",
    json_info_prompt:
      "Muunna reseptiteksti, jonka lähetän kohta, YHDEKSI ainoaksi JSON-objektiksi - ilman selitystä, ilman tekstiä ennen tai jälkeen, pelkkä JSON. Käytä täsmälleen tätä muotoa:\n\n" +
      "{\n" +
      '  "title": "reseptin nimi",\n' +
      '  "servings": 4,\n' +
      '  "category": "yksi seuraavista: {{kategorien}}",\n' +
      '  "ingredients": ["yksi ainesosa per rivi, esim. 200 g jauhoja"],\n' +
      '  "steps": ["yksi valmistusvaihe per rivi"],\n' +
      '  "tags": ["valinnaiset avainsanat, esim. kasvisruoka"]\n' +
      "}\n\n" +
      "Säännöt: „category“-arvon on oltava TÄSMÄLLEEN yksi yllä luetelluista arvoista (kopioi se muuttamattomana, vaikka reseptiteksti olisikin toisella kielellä - nämä ovat kiinteitä sisäisiä arvoja). " +
      "„tags“ on valinnainen, tyhjä taulukko käy myös. " +
      "Älä keksi ainesosia tai vaiheita, joita tekstissä ei ole. " +
      "Tässä on reseptiteksti:",
    json_info_kopieren_btn: "📋 Kopioi prompti",
    json_info_kopiert: "Kopioitu!",
    formular_json_label: "Liitä JSON tähän",
    formular_json_uebernehmen_btn: "Käytä",
    formular_label_titel: "Otsikko",
    formular_label_kategorie: "Kategoria",
    formular_label_tags: "Tunnisteet (useita mahdollisia, esim. \"kasvis\", \"nopea\")",
    formular_tag_placeholder: "Kirjoita ja lisää tunniste",
    formular_tag_hinzufuegen_btn: "+ Tunniste",
    formular_tag_entfernen_aria: "Poista tunniste {{tag}}",
    formular_label_portionen: "Annokset (perusmäärä)",
    formular_label_zutaten: "Ainekset",
    formular_zutat_hinzufuegen_btn: "+ Aines",
    formular_zutat_menge_placeholder: "Määrä",
    formular_zutat_einheit_placeholder: "Yksikkö",
    formular_zutat_name_placeholder: "Aines",
    formular_zutat_entfernen_aria: "Poista aines",
    formular_label_zubereitung: "Valmistus (vaiheet)",
    formular_schritt_hinzufuegen_btn: "+ Vaihe",
    formular_schritt_placeholder_beispiel: "esim. pese ja pilko vihannekset",
    formular_schritt_placeholder_naechster: "seuraava vaihe",
    formular_schritt_entfernen_aria: "Poista vaihe",
    formular_label_bild: "Kuva",
    formular_bild_vorhanden_hinweis: "(olemassa – uusi tiedosto korvaa sen)",
    formular_bild_hinweis: "Nykyinen kuva säilyy, jos et valitse uutta tiedostoa.",
    formular_bild_verkleinern_text: "Kuvaa pienennetään…",
    fehler_url_ungueltig: "Anna täydellinen osoite, joka alkaa http:// tai https://.",
    fehler_url_apostroph: "Tämä osoite sisältää heittomerkin (') eikä sitä valitettavasti voida tuoda.",
    fehler_url_keine_ausgabe: "Skripti ei palauttanut tulostetta. Onko 'rezeptbuch_url_importieren' määritetty tiedostossa configuration.yaml ja onko Home Assistant käynnistetty sen jälkeen kokonaan uudelleen?",
    fehler_url_kein_json: "Tuontiskriptin vastaus ei ollut kelvollinen JSON.",
    fehler_url_import_fehlgeschlagen: "URL-tuonti epäonnistui: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Liitetystä tekstistä ei valitettavasti tunnistettu mitään. Täytä kentät alla käsin.",
    warnung_texterkennung_unvollstaendig: "Tunnistus oli puutteellinen (aineksia tai vaiheita puuttuu / ne on ehkä kohdistettu väärin) - tarkista ja täydennä lomakkeessa.",
    fehler_json_ungueltig: "Liitetty JSON on virheellinen. Tarkista se ja yritä uudelleen.",
    fehler_json_titel_fehlt: "JSON-tiedostosta puuttuu ainakin kenttä 'title'.",
    fehler_titel_fehlt: "Anna otsikko.",
    fehler_unerwartet: "Odottamaton virhe:\n{{fehler}}",
    fehler_konflikt_geloescht: "Jonkun toisen käyttäjä on sillä välin poistanut kohteen \"{{titel}}\". Muutoksiasi ei tallennettu.",
    fehler_konflikt_geaendert: "Jonkun toisen käyttäjä on sillä välin muuttanut kohdetta \"{{titel}}\" (esim. kommentti, arvio tai oma muokkaus).\n\nJotta mitään ei kirjoiteta yli, muutoksiasi EI tallennettu. Avaa resepti uudelleen ja syötä muutoksesi uudelleen.",
    fehler_vorgang_fehlgeschlagen: "Toiminto epäonnistui:\n{{fehler}}",
    fehler_teilen_drucken: "Odottamaton virhe jaettaessa/tulostettaessa:\n{{fehler}}",
    fehler_config_entity_fehlt: "Määritä 'entity' kortin asetuksissa, esim. entity: todo.rezepte",
    fehler_bild_lesen: "Kuvaa ei voitu lukea (tiedosto vioittunut tai ei tuettu).",
    fehler_bild_verarbeiten: "Kuvaa ei voitu käsitellä kuvana (tukematon muoto?).",
    teilen_ueberschrift_zutaten: "AINEKSET",
    teilen_ueberschrift_zubereitung: "VALMISTUS",
    seite_zurueck_btn: "← Edellinen",
    seite_weiter_btn: "Seuraava →",
    seite_anzeige: "Sivu {{aktuell}}/{{gesamt}}",
    update_neue_version: "Uusi versio saatavilla: {{version}}",
    update_ansehen_btn: "Katso",
    update_schliessen_aria: "Piilota ilmoitus",
    detail_kochmodus_btn: "🍳 Kokkaustila",
    kochmodus_schritt_anzeige: "Vaihe {{aktuell}}/{{gesamt}}",
    kochmodus_schliessen_aria: "Sulje kokkaustila",
    kochmodus_schritt_zurueck_aria: "Edellinen vaihe",
    kochmodus_schritt_weiter_aria: "Seuraava vaihe",
    kochmodus_zutaten_ein_aria: "Näytä ainekset",
    kochmodus_zutaten_aus_aria: "Piilota ainekset",
    kopf_sammel_pdf_btn: "📚 Kokoelma-PDF",
    sammel_pdf_keine_rezepte: "Vietäviä reseptejä ei löytynyt.",
    sammel_pdf_frage_toc: "Luodaanko sisällysluettelo valituille resepteille?",
    sammel_pdf_ja_toc_btn: "Kyllä, luo sisällysluettelo",
    sammel_pdf_nein_toc_btn: "Ei, ilman sisällysluetteloa",
    sammel_pdf_name_placeholder: "Keittokirjan nimi",
    sammel_pdf_erstellen_btn: "Luo PDF",
    abschnitt_titel_inhaltsverzeichnis: "Sisällysluettelo",
    sammel_pdf_frage_umfang: "Mitkä reseptit kokoomapdf:ään?",
    sammel_pdf_alle_rezepte_btn: "Kaikki näytetyt reseptit",
    sammel_pdf_auswahl_btn: "Valitse tietyt reseptit",
    sammel_pdf_auswahl_titel: "Valitse reseptit",
    sammel_pdf_alle_auswaehlen_link: "Valitse kaikki",
    sammel_pdf_keine_auswaehlen_link: "Poista valinnat",
    sammel_pdf_weiter_btn: "Seuraava",
    sammel_pdf_auswahl_keine_hinweis: "Valitse vähintään yksi resepti.",
  },
  fr: {
    allgemein_zurueck: "← Retour",
    allgemein_ja: "Oui",
    allgemein_nein: "Non",
    allgemein_speichern: "Enregistrer",
    allgemein_speichert: "Enregistrement…",
    allgemein_abbrechen: "Annuler",
    allgemein_bearbeiten: "Modifier",
    allgemein_loeschen: "Supprimer",
    allgemein_oeffnen: "Ouvrir",
    allgemein_unbekannt: "Inconnu",
    allgemein_schliessen: "Fermer",
    kategorie_hauptgericht: "Plat principal",
    kategorie_vorspeise: "Entrée",
    kategorie_suppe: "Soupe",
    kategorie_salat: "Salade",
    kategorie_beilage: "Accompagnement",
    kategorie_dessert: "Dessert",
    kategorie_kuchen_gebaeck: "Gâteaux & pâtisserie",
    kategorie_fruehstueck: "Petit-déjeuner",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Boisson",
    kategorie_sonstiges: "Autre",
    kategorie_filter_alle: "Tous",
    wochentag_montag: "Lundi",
    wochentag_dienstag: "Mardi",
    wochentag_mittwoch: "Mercredi",
    wochentag_donnerstag: "Jeudi",
    wochentag_freitag: "Vendredi",
    wochentag_samstag: "Samedi",
    wochentag_sonntag: "Dimanche",
    sortier_titel: "Alphabétique (A-Z)",
    sortier_bewertung: "Meilleure note en premier",
    sortier_kategorie: "Par catégorie",
    sortier_neu: "Plus récent en premier",
    sortieren_label: "Trier par :",
    kopf_titel_standard: "Livre de recettes",
    kopf_sichern_btn: "💾 Sauvegarde",
    kopf_wochenplan_btn: "📅 Planning de la semaine",
    einkaufsmodus_start_btn: "🛒 Liste de courses",
    einkaufsmodus_beenden_btn: "✕ Terminer la sélection",
    kopf_neu_btn: "+ Nouveau",
    suche_placeholder: "🔍 Recette ou ingrédients (p. ex. farine, œufs)…",
    kochbuch_loeschen_title: "Supprimer la collection",
    kochbuch_loeschen_aria: "Supprimer la collection {{name}}",
    kochbuch_speichern_btn: "+ Enregistrer comme collection intelligente",
    kochbuch_name_placeholder: "Nom de cette collection, p. ex. Recettes d'automne",
    fehler_kochbuch_name_fehlt: "Merci d'indiquer un nom pour la collection.",
    kochbuch_info_aria: "Afficher l'explication des collections intelligentes",
    kochbuch_info_titel: "Qu'est-ce qu'une collection intelligente ?",
    kochbuch_info_text:
      "Une collection intelligente ne stocke pas une liste fixe de " +
      "recettes, mais une combinaison de catégorie, de tags et de " +
      "terme de recherche, telle qu'elle est réglée au moment de " +
      "l'enregistrement. Elle se met ensuite à jour d'elle-même : une " +
      "nouvelle recette qui correspond apparaît automatiquement, et " +
      "une recette dont la catégorie ou les tags changent peut tout " +
      "aussi automatiquement disparaître à nouveau.",
    einkaufs_zaehler: "{{anzahl}} sélectionné(s)",
    einkaufsliste_erstellen_btn: "Créer la liste de courses",
    fehler_einkaufsliste_keine_konfiguration: "La configuration de la liste de courses est encore manquante : merci d'indiquer 'shopping_list_entity' dans la configuration de la carte (p. ex. shopping_list_entity: todo.einkaufsliste) - cela nécessite un DEUXIÈME assistant Liste de tâches locale. Voir ANLEITUNG-Backup.md, section 18.",
    fehler_einkaufsliste_keine_auswahl: "Merci de sélectionner au moins une recette.",
    fehler_einkaufsliste_keine_zutaten: "Les recettes sélectionnées ne contiennent aucun ingrédient.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Impossible d'ajouter \"{{zeile}}\" à la liste de courses :\n{{fehler}}\n\nLes ingrédients déjà ajoutés restent dans la liste.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingrédient(s) ajouté(s) à \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" supprimée.",
    undo_rueckgaengig_btn: "Annuler",
    leer_keine_rezepte: "Pas encore de recettes – commencez avec \"+ Nouveau\"",
    leer_keine_treffer: "Aucune recette trouvée pour \"{{begriff}}\"",
    fehler_liste_laden_titel: "Impossible de charger \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Cette liste de tâches existe-t-elle ? (Paramètres → Appareils et services → Assistants)",
    kachel_aria_label_oeffnen: "Ouvrir la recette {{titel}}",
    sterne_aria_label_gruppe: "Votre note",
    sterne_aria_label: "{{zahl}} sur 5 étoiles",
    fehler_kein_benutzer_bewertung: "Impossible de déterminer votre utilisateur - notation impossible.",
    detail_teilen_drucken_btn: "📤 Partager / Imprimer",
    detail_erstellt_von: "👤 Créée par {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} avis)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} avis)",
    detail_keine_bewertungen: "Pas encore d'avis",
    detail_deine_bewertung: "Votre avis :",
    detail_zubereitet_x: "🍳 préparée {{anzahl}} fois",
    detail_portionen_suffix: "portions",
    abschnitt_titel_zutaten: "Ingrédients",
    abschnitt_titel_zubereitung: "Préparation",
    keine_zutaten: "Aucun ingrédient renseigné",
    detail_kommentare_titel: "Commentaires",
    detail_keine_kommentare: "Pas encore de commentaires",
    detail_kommentar_placeholder: "Complément, astuce ou remarque…",
    detail_kommentar_hinzufuegen_btn: "Ajouter un commentaire",
    detail_bearbeiten_hinweis: "Seul(e) {{name}} (ou un administrateur) peut modifier ou supprimer cette recette.",
    detail_ersteller_unbekannt: "l'auteur/autrice",
    modal_zubereitet_frage: "As-tu préparé \"{{titel}}\" ?",
    statistik_btn: "📊 Statistiques",
    statistik_titel: "Statistiques de cuisine",
    statistik_info_aria: "Afficher l'explication des statistiques",
    statistik_info_titel: "Comment cette statistique est-elle calculée ?",
    statistik_info_text:
      "Ce bilan comptabilise chaque confirmation de la question « As-tu préparé ? » - quelle que soit la taille des portions ou le nombre de fois le même jour. Si cette question est désactivée via l'option de carte ask_cooked: false, les chiffres cessent d'augmenter, mais les préparations déjà enregistrées sont conservées.",
    statistik_dieses_jahr: "Tu as cuisiné {{anzahl}}x depuis ton livre de recettes en {{jahr}}",
    statistik_gesamt: "Tu as cuisiné {{anzahl}}x depuis ton livre de recettes au total",
    statistik_top_titel: "Les plus préparées",
    statistik_keine_daten: "Aucune préparation enregistrée pour l'instant.",
    modal_loeschen_frage: "Vraiment supprimer \"{{titel}}\" ?",
    modal_loeschen_ja_btn: "Oui, supprimer",
    wochenplan_titel: "Planning de la semaine",
    wochenplan_tab_diese: "Cette semaine",
    wochenplan_tab_folgewoche: "Semaine suivante",
    wochenplan_hinweis_folgewoche: "Planifiez déjà ici la semaine à venir - elle basculera automatiquement vers \"Cette semaine\" une fois la semaine en cours terminée.",
    wochenplan_hinweis_diese: "Les jours passés sont vidés automatiquement (la recette elle-même reste conservée, seule l'affectation disparaît).",
    wochenplan_hinweis_speicherung: "Enregistré sur tous les appareils (comme entrée supplémentaire invisible dans la même liste de recettes, aucun autre assistant requis).",
    wochenplan_leer: "Pas encore de recettes - créez-en d'abord quelques-unes.",
    wochenplan_kein_rezept_option: "– aucune recette –",
    wochenplan_einkaufsliste_btn: "Créer une liste de courses à partir de {{ziel}}",
    wochenplan_wort: "planning de la semaine",
    wochenplan_folgewoche_wort: "semaine suivante",
    wochenplan_aktuelle_woche_wort: "semaine en cours",
    wochenplan_keine_zuweisung: "{{zeitraum}} ne contient encore aucune recette affectée.",
    formular_titel_neu: "Nouvelle recette",
    formular_titel_bearbeiten: "Modifier la recette",
    formular_url_import_btn: "🌐 Importer l'URL d'une recette",
    formular_url_label: "Lien vers le site web de la recette",
    formular_url_placeholder: "https://www.exemple-recettes.fr/ma-recette",
    formular_url_hinweis: "Charge la page et lit les données structurées de la recette déjà intégrées (les mêmes données que, par exemple, Google utilise pour afficher les notes en étoiles dans les résultats de recherche) - généralement plus fiable que la reconnaissance de texte. Fonctionne uniquement sur les sites qui fournissent ces données et ne bloquent pas les requêtes automatisées.",
    formular_url_importieren_btn: "Importer",
    formular_url_laedt: "Chargement …",
    formular_text_einfuegen_btn: "🔍 Coller le texte de la recette (détection automatique)",
    formular_text_label: "Colle ici le texte de la recette (p. ex. copié depuis un site de recettes)",
    formular_text_placeholder: "Titre, ingrédients, préparation - colle simplement tout le texte",
    formular_text_hinweis: "Reconnaissance purement automatique sans IA - fonctionne mieux avec les titres \"Ingrédients\" et \"Préparation\" dans le texte. Merci de vérifier brièvement le résultat ensuite, il peut être incomplet.",
    formular_text_erkennen_btn: "Détecter",
    formular_json_einfuegen_btn: "📋 Coller un JSON généré par IA",
    formular_json_info_aria: "Afficher un prompt prêt à l'emploi pour une IA",
    json_info_titel: "Prompt pour une IA",
    json_info_erklaerung:
      "Copie ce texte, colle-le dans une IA de ton choix (par ex. ChatGPT ou Claude), ajoute le texte de ta recette, puis colle la réponse ci-dessus dans « Coller le JSON ici ».",
    json_info_prompt:
      "Transforme le texte de recette que je vais t'envoyer en UN seul objet JSON - sans explication, sans texte avant ni après, juste le JSON. Utilise exactement ce format :\n\n" +
      "{\n" +
      '  "title": "nom de la recette",\n' +
      '  "servings": 4,\n' +
      '  "category": "une valeur parmi : {{kategorien}}",\n' +
      '  "ingredients": ["un ingrédient par entrée, par ex. 200 g de farine"],\n' +
      '  "steps": ["une étape de préparation par entrée"],\n' +
      '  "tags": ["mots-clés facultatifs, par ex. végétarien"]\n' +
      "}\n\n" +
      "Règles : « category » doit être EXACTEMENT l'une des valeurs listées ci-dessus (à reprendre telle quelle, même si le texte de la recette est dans une autre langue - ce sont des valeurs internes fixes). " +
      "« tags » est facultatif, un tableau vide convient aussi. " +
      "N'invente pas d'ingrédients ou d'étapes qui ne figurent pas dans le texte. " +
      "Voici le texte de la recette :",
    json_info_kopieren_btn: "📋 Copier le prompt",
    json_info_kopiert: "Copié !",
    formular_json_label: "Coller le JSON ici",
    formular_json_uebernehmen_btn: "Appliquer",
    formular_label_titel: "Titre",
    formular_label_kategorie: "Catégorie",
    formular_label_tags: "Tags (plusieurs possibles, p. ex. \"végétarien\", \"rapide\")",
    formular_tag_placeholder: "Saisir et ajouter un tag",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Supprimer le tag {{tag}}",
    formular_label_portionen: "Portions (base)",
    formular_label_zutaten: "Ingrédients",
    formular_zutat_hinzufuegen_btn: "+ Ingrédient",
    formular_zutat_menge_placeholder: "Quantité",
    formular_zutat_einheit_placeholder: "Unité",
    formular_zutat_name_placeholder: "Ingrédient",
    formular_zutat_entfernen_aria: "Supprimer l'ingrédient",
    formular_label_zubereitung: "Préparation (étapes)",
    formular_schritt_hinzufuegen_btn: "+ Étape",
    formular_schritt_placeholder_beispiel: "p. ex. laver et couper les légumes",
    formular_schritt_placeholder_naechster: "étape suivante",
    formular_schritt_entfernen_aria: "Supprimer l'étape",
    formular_label_bild: "Photo",
    formular_bild_vorhanden_hinweis: "(présente – un nouveau fichier la remplacera)",
    formular_bild_hinweis: "La photo actuelle est conservée si tu ne choisis pas de nouveau fichier.",
    formular_bild_verkleinern_text: "Réduction de la photo…",
    fehler_url_ungueltig: "Merci d'indiquer une adresse complète commençant par http:// ou https://.",
    fehler_url_apostroph: "Cette adresse contient une apostrophe (') et ne peut malheureusement pas être importée.",
    fehler_url_keine_ausgabe: "Le script n'a fourni aucune sortie. 'rezeptbuch_url_importieren' est-il configuré dans configuration.yaml et Home Assistant a-t-il été entièrement redémarré depuis ?",
    fehler_url_kein_json: "La réponse du script d'import n'était pas un JSON valide.",
    fehler_url_import_fehlgeschlagen: "Échec de l'import de l'URL : {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Malheureusement, rien n'a pu être détecté dans le texte collé. Merci de remplir les champs ci-dessous manuellement.",
    warnung_texterkennung_unvollstaendig: "La détection était incomplète (ingrédients ou étapes manquants ou éventuellement mal affectés) - merci de vérifier et de compléter dans le formulaire.",
    fehler_json_ungueltig: "Le JSON collé est invalide. Merci de le vérifier et de réessayer.",
    fehler_json_titel_fehlt: "Il manque au moins le champ 'title' dans le JSON.",
    fehler_titel_fehlt: "Merci de saisir un titre.",
    fehler_unerwartet: "Erreur inattendue :\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" a entre-temps été supprimée par quelqu'un d'autre. Tes modifications n'ont pas été enregistrées.",
    fehler_konflikt_geaendert: "\"{{titel}}\" a entre-temps été modifiée par quelqu'un d'autre (p. ex. un commentaire, une note ou une modification personnelle).\n\nAfin d'éviter d'écraser quoi que ce soit, tes modifications N'ONT PAS été enregistrées. Merci d'ouvrir à nouveau la recette et de ressaisir tes modifications.",
    fehler_vorgang_fehlgeschlagen: "Échec de l'opération :\n{{fehler}}",
    fehler_teilen_drucken: "Erreur inattendue lors du partage/de l'impression :\n{{fehler}}",
    fehler_config_entity_fehlt: "Merci d'indiquer 'entity' dans la configuration de la carte, p. ex. entity: todo.rezepte",
    fehler_bild_lesen: "Impossible de lire la photo (fichier corrompu ou non pris en charge).",
    fehler_bild_verarbeiten: "Impossible de traiter la photo comme une image (format non pris en charge ?).",
    teilen_ueberschrift_zutaten: "INGRÉDIENTS",
    teilen_ueberschrift_zubereitung: "PRÉPARATION",
    seite_zurueck_btn: "← Précédent",
    seite_weiter_btn: "Suivant →",
    seite_anzeige: "Page {{aktuell}} sur {{gesamt}}",
    update_neue_version: "Nouvelle version disponible : {{version}}",
    update_ansehen_btn: "Voir",
    update_schliessen_aria: "Masquer la notification",
    detail_kochmodus_btn: "🍳 Mode cuisine",
    kochmodus_schritt_anzeige: "Étape {{aktuell}} sur {{gesamt}}",
    kochmodus_schliessen_aria: "Fermer le mode cuisine",
    kochmodus_schritt_zurueck_aria: "Étape précédente",
    kochmodus_schritt_weiter_aria: "Étape suivante",
    kochmodus_zutaten_ein_aria: "Afficher les ingrédients",
    kochmodus_zutaten_aus_aria: "Masquer les ingrédients",
    kopf_sammel_pdf_btn: "📚 PDF groupé",
    sammel_pdf_keine_rezepte: "Aucune recette trouvée à exporter.",
    sammel_pdf_frage_toc: "Créer une table des matières pour les recettes sélectionnées ?",
    sammel_pdf_ja_toc_btn: "Oui, créer une table des matières",
    sammel_pdf_nein_toc_btn: "Non, sans table des matières",
    sammel_pdf_name_placeholder: "Nom du livre de cuisine",
    sammel_pdf_erstellen_btn: "Créer le PDF",
    abschnitt_titel_inhaltsverzeichnis: "Table des matières",
    sammel_pdf_frage_umfang: "Quelles recettes inclure dans le PDF groupé ?",
    sammel_pdf_alle_rezepte_btn: "Toutes les recettes affichées",
    sammel_pdf_auswahl_btn: "Choisir des recettes précises",
    sammel_pdf_auswahl_titel: "Choisir les recettes",
    sammel_pdf_alle_auswaehlen_link: "Tout sélectionner",
    sammel_pdf_keine_auswaehlen_link: "Tout désélectionner",
    sammel_pdf_weiter_btn: "Suivant",
    sammel_pdf_auswahl_keine_hinweis: "Veuillez sélectionner au moins une recette.",
  },
  el: {
    allgemein_zurueck: "← Πίσω",
    allgemein_ja: "Ναι",
    allgemein_nein: "Όχι",
    allgemein_speichern: "Αποθήκευση",
    allgemein_speichert: "Αποθήκευση…",
    allgemein_abbrechen: "Ακύρωση",
    allgemein_bearbeiten: "Επεξεργασία",
    allgemein_loeschen: "Διαγραφή",
    allgemein_oeffnen: "Άνοιγμα",
    allgemein_unbekannt: "Άγνωστο",
    allgemein_schliessen: "Κλείσιμο",
    kategorie_hauptgericht: "Κυρίως πιάτο",
    kategorie_vorspeise: "Ορεκτικό",
    kategorie_suppe: "Σούπα",
    kategorie_salat: "Σαλάτα",
    kategorie_beilage: "Συνοδευτικό",
    kategorie_dessert: "Επιδόρπιο",
    kategorie_kuchen_gebaeck: "Κέικ & γλυκά",
    kategorie_fruehstueck: "Πρωινό",
    kategorie_snack: "Σνακ",
    kategorie_getraenk: "Ρόφημα",
    kategorie_sonstiges: "Άλλο",
    kategorie_filter_alle: "Όλα",
    wochentag_montag: "Δευτέρα",
    wochentag_dienstag: "Τρίτη",
    wochentag_mittwoch: "Τετάρτη",
    wochentag_donnerstag: "Πέμπτη",
    wochentag_freitag: "Παρασκευή",
    wochentag_samstag: "Σάββατο",
    wochentag_sonntag: "Κυριακή",
    sortier_titel: "Αλφαβητικά (Α-Ω)",
    sortier_bewertung: "Καλύτερη βαθμολογία πρώτα",
    sortier_kategorie: "Κατά κατηγορία",
    sortier_neu: "Νεότερα πρώτα",
    sortieren_label: "Ταξινόμηση:",
    kopf_titel_standard: "Βιβλίο συνταγών",
    kopf_sichern_btn: "💾 Αντίγραφο ασφαλείας",
    kopf_wochenplan_btn: "📅 Εβδομαδιαίος προγραμματισμός",
    einkaufsmodus_start_btn: "🛒 Λίστα αγορών",
    einkaufsmodus_beenden_btn: "✕ Τερματισμός επιλογής",
    kopf_neu_btn: "+ Νέα",
    suche_placeholder: "🔍 Συνταγή ή υλικά (π.χ. αλεύρι, αυγά)…",
    kochbuch_loeschen_title: "Διαγραφή συλλογής",
    kochbuch_loeschen_aria: "Διαγραφή συλλογής {{name}}",
    kochbuch_speichern_btn: "+ Αποθήκευση ως έξυπνη συλλογή",
    kochbuch_name_placeholder: "Όνομα για αυτή τη συλλογή, π.χ. Φθινοπωρινές συνταγές",
    fehler_kochbuch_name_fehlt: "Δώσε ένα όνομα για τη συλλογή.",
    kochbuch_info_aria: "Εμφάνιση επεξήγησης έξυπνων συλλογών",
    kochbuch_info_titel: "Τι είναι μια έξυπνη συλλογή;",
    kochbuch_info_text:
      "Μια έξυπνη συλλογή δεν αποθηκεύει μια σταθερή λίστα συνταγών, " +
      "αλλά έναν συνδυασμό κατηγορίας, ετικετών και όρου αναζήτησης, " +
      "ακριβώς όπως έχουν οριστεί τη στιγμή της αποθήκευσης. Στη " +
      "συνέχεια ενημερώνεται μόνη της: μια νέα συνταγή που ταιριάζει " +
      "εμφανίζεται αυτόματα, και μια συνταγή της οποίας η κατηγορία ή " +
      "οι ετικέτες αλλάζουν μπορεί εξίσου αυτόματα να εξαφανιστεί " +
      "ξανά.",
    einkaufs_zaehler: "{{anzahl}} επιλεγμένα",
    einkaufsliste_erstellen_btn: "Δημιουργία λίστας αγορών",
    fehler_einkaufsliste_keine_konfiguration: "Λείπει ακόμη η διαμόρφωση για τη λίστα αγορών: όρισε 'shopping_list_entity' στη διαμόρφωση της κάρτας (π.χ. shopping_list_entity: todo.einkaufsliste) - για αυτό χρειάζεται μια ΔΕΥΤΕΡΗ βοηθητική «Τοπική λίστα εργασιών». Δες το ANLEITUNG-Backup.md, ενότητα 18.",
    fehler_einkaufsliste_keine_auswahl: "Επίλεξε τουλάχιστον μία συνταγή.",
    fehler_einkaufsliste_keine_zutaten: "Οι επιλεγμένες συνταγές δεν περιέχουν υλικά.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Δεν ήταν δυνατή η προσθήκη του \"{{zeile}}\" στη λίστα αγορών:\n{{fehler}}\n\nΤα ήδη προστιθέμενα υλικά παραμένουν στη λίστα.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} υλικό/ά προστέθηκαν στο \"{{entity}}\".",
    undo_geloescht: "Το \"{{titel}}\" διαγράφηκε.",
    undo_rueckgaengig_btn: "Αναίρεση",
    leer_keine_rezepte: "Δεν υπάρχουν ακόμη συνταγές – ξεκίνα με \"+ Νέα\"",
    leer_keine_treffer: "Δεν βρέθηκαν συνταγές για \"{{begriff}}\"",
    fehler_liste_laden_titel: "Δεν ήταν δυνατή η φόρτωση του \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Υπάρχει αυτή η λίστα εργασιών; (Ρυθμίσεις → Συσκευές & υπηρεσίες → Βοηθοί)",
    kachel_aria_label_oeffnen: "Άνοιγμα συνταγής {{titel}}",
    sterne_aria_label_gruppe: "Η δική σου βαθμολογία",
    sterne_aria_label: "{{zahl}} από 5 αστέρια",
    fehler_kein_benutzer_bewertung: "Δεν ήταν δυνατός ο προσδιορισμός του χρήστη σου - η βαθμολόγηση δεν είναι δυνατή.",
    detail_teilen_drucken_btn: "📤 Κοινοποίηση / Εκτύπωση",
    detail_erstellt_von: "👤 Δημιουργήθηκε από τον/την {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} αξιολόγηση)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} αξιολογήσεις)",
    detail_keine_bewertungen: "Δεν υπάρχουν ακόμη αξιολογήσεις",
    detail_deine_bewertung: "Η βαθμολογία σου:",
    detail_zubereitet_x: "🍳 παρασκευάστηκε {{anzahl}} φορές",
    detail_portionen_suffix: "μερίδες",
    abschnitt_titel_zutaten: "Υλικά",
    abschnitt_titel_zubereitung: "Εκτέλεση",
    keine_zutaten: "Δεν έχουν καταχωριστεί υλικά",
    detail_kommentare_titel: "Σχόλια",
    detail_keine_kommentare: "Δεν υπάρχουν ακόμη σχόλια",
    detail_kommentar_placeholder: "Προσθήκη, συμβουλή ή σημείωση…",
    detail_kommentar_hinzufuegen_btn: "Προσθήκη σχολίου",
    detail_bearbeiten_hinweis: "Μόνο ο/η {{name}} (ή διαχειριστής) μπορεί να επεξεργαστεί ή να διαγράψει αυτή τη συνταγή.",
    detail_ersteller_unbekannt: "ο/η δημιουργός",
    modal_zubereitet_frage: "Παρασκεύασες το \"{{titel}}\";",
    statistik_btn: "📊 Στατιστικά",
    statistik_titel: "Στατιστικά μαγειρικής",
    statistik_info_aria: "Εμφάνιση επεξήγησης των στατιστικών",
    statistik_info_titel: "Πώς υπολογίζεται αυτή η στατιστική;",
    statistik_info_text:
      "Αυτή η αξιολόγηση μετρά κάθε επιβεβαίωση της ερώτησης «Το παρασκεύασες;» - ανεξάρτητα από το μέγεθος της μερίδας ή το πόσες φορές την ίδια ημέρα. Αν αυτή η ερώτηση είναι απενεργοποιημένη μέσω της επιλογής κάρτας ask_cooked: false, οι αριθμοί σταματούν να αυξάνονται, αλλά οι ήδη καταγεγραμμένες παρασκευές διατηρούνται.",
    statistik_dieses_jahr: "Μαγείρεψες {{anzahl}}x από το βιβλίο συνταγών σου το {{jahr}}",
    statistik_gesamt: "Μαγείρεψες συνολικά {{anzahl}}x από το βιβλίο συνταγών σου",
    statistik_top_titel: "Πιο συχνά παρασκευασμένα",
    statistik_keine_daten: "Δεν έχουν καταγραφεί ακόμη παρασκευές.",
    modal_loeschen_frage: "Να διαγραφεί πραγματικά το \"{{titel}}\";",
    modal_loeschen_ja_btn: "Ναι, διαγραφή",
    wochenplan_titel: "Εβδομαδιαίος προγραμματισμός",
    wochenplan_tab_diese: "Αυτή την εβδομάδα",
    wochenplan_tab_folgewoche: "Επόμενη εβδομάδα",
    wochenplan_hinweis_folgewoche: "Προγραμμάτισε εδώ ήδη την επόμενη εβδομάδα - μετακινείται αυτόματα στο \"Αυτή την εβδομάδα\" μόλις τελειώσει η τρέχουσα εβδομάδα.",
    wochenplan_hinweis_diese: "Οι ημέρες που έχουν περάσει αδειάζουν αυτόματα (η ίδια η συνταγή παραμένει, εξαφανίζεται μόνο η ανάθεση).",
    wochenplan_hinweis_speicherung: "Αποθηκεύεται σε όλες τις συσκευές (ως κρυφή επιπλέον καταχώριση στην ίδια λίστα συνταγών, δεν χρειάζεται επιπλέον βοηθός).",
    wochenplan_leer: "Δεν υπάρχουν ακόμη συνταγές - δημιούργησε πρώτα μερικές.",
    wochenplan_kein_rezept_option: "– καμία συνταγή –",
    wochenplan_einkaufsliste_btn: "Δημιουργία λίστας αγορών από {{ziel}}",
    wochenplan_wort: "εβδομαδιαίος προγραμματισμός",
    wochenplan_folgewoche_wort: "επόμενη εβδομάδα",
    wochenplan_aktuelle_woche_wort: "τρέχουσα εβδομάδα",
    wochenplan_keine_zuweisung: "{{zeitraum}} δεν περιέχει ακόμη ανατεθειμένες συνταγές.",
    formular_titel_neu: "Νέα συνταγή",
    formular_titel_bearbeiten: "Επεξεργασία συνταγής",
    formular_url_import_btn: "🌐 Εισαγωγή URL συνταγής",
    formular_url_label: "Σύνδεσμος προς την ιστοσελίδα της συνταγής",
    formular_url_placeholder: "https://www.paradeigma-syntages.gr/i-syntagi-mou",
    formular_url_hinweis: "Φορτώνει τη σελίδα και διαβάζει τα δομημένα δεδομένα της συνταγής που είναι ήδη ενσωματωμένα σε αυτήν (τα ίδια δεδομένα με τα οποία π.χ. η Google εμφανίζει βαθμολογίες με αστέρια στην αναζήτηση) - συνήθως πιο αξιόπιστο από την αναγνώριση κειμένου. Λειτουργεί μόνο σε σελίδες που παρέχουν τέτοια δεδομένα και δεν αποκλείουν αυτοματοποιημένα αιτήματα.",
    formular_url_importieren_btn: "Εισαγωγή",
    formular_url_laedt: "Φόρτωση …",
    formular_text_einfuegen_btn: "🔍 Επικόλληση κειμένου συνταγής (αυτόματη αναγνώριση)",
    formular_text_label: "Επικόλλησε εδώ το κείμενο της συνταγής (π.χ. αντιγραμμένο από ιστοσελίδα συνταγών)",
    formular_text_placeholder: "Τίτλος, υλικά, εκτέλεση - απλώς επικόλλησε όλο το κείμενο",
    formular_text_hinweis: "Καθαρά αυτόματη αναγνώριση χωρίς ΤΝ - λειτουργεί καλύτερα με τους τίτλους \"Υλικά\" και \"Εκτέλεση\" στο κείμενο. Έλεγξε σύντομα το αποτέλεσμα στη συνέχεια, μπορεί να είναι ελλιπές.",
    formular_text_erkennen_btn: "Αναγνώριση",
    formular_json_einfuegen_btn: "📋 Επικόλληση JSON που δημιουργήθηκε από ΤΝ",
    formular_json_info_aria: "Εμφάνιση έτοιμης εντολής (prompt) για ΤΝ",
    json_info_titel: "Prompt για ΤΝ",
    json_info_erklaerung:
      "Αντέγραψε αυτό το κείμενο, επικόλλησέ το σε μια ΤΝ της επιλογής σου (π.χ. ChatGPT ή Claude), πρόσθεσε το κείμενο της συνταγής σου και μετά επικόλλησε την απάντηση παραπάνω στο «Επικόλλησε το JSON εδώ».",
    json_info_prompt:
      "Μετέτρεψε το κείμενο της συνταγής που θα σου στείλω αμέσως σε ΕΝΑ μοναδικό αντικείμενο JSON - χωρίς εξήγηση, χωρίς κείμενο πριν ή μετά, μόνο το JSON. Χρησιμοποίησε ακριβώς αυτή τη μορφή:\n\n" +
      "{\n" +
      '  "title": "όνομα συνταγής",\n' +
      '  "servings": 4,\n' +
      '  "category": "μία από: {{kategorien}}",\n' +
      '  "ingredients": ["ένα υλικό ανά καταχώριση, π.χ. 200 γρ. αλεύρι"],\n' +
      '  "steps": ["ένα βήμα παρασκευής ανά καταχώριση"],\n' +
      '  "tags": ["προαιρετικές ετικέτες, π.χ. χορτοφαγικό"]\n' +
      "}\n\n" +
      "Κανόνες: το «category» πρέπει να είναι ΑΚΡΙΒΩΣ μία από τις παραπάνω τιμές (αντέγραψέ την αναλλοίωτη, ακόμη κι αν το κείμενο της συνταγής είναι σε άλλη γλώσσα - πρόκειται για σταθερές εσωτερικές τιμές). " +
      "Το «tags» είναι προαιρετικό, ένας κενός πίνακας είναι εντάξει. " +
      "Μην επινοείς υλικά ή βήματα που δεν υπάρχουν στο κείμενο. " +
      "Ορίστε το κείμενο της συνταγής:",
    json_info_kopieren_btn: "📋 Αντιγραφή prompt",
    json_info_kopiert: "Αντιγράφηκε!",
    formular_json_label: "Επικόλλησε το JSON εδώ",
    formular_json_uebernehmen_btn: "Εφαρμογή",
    formular_label_titel: "Τίτλος",
    formular_label_kategorie: "Κατηγορία",
    formular_label_tags: "Ετικέτες (πολλαπλές δυνατές, π.χ. \"χορτοφαγικό\", \"γρήγορο\")",
    formular_tag_placeholder: "Πληκτρολόγησε και πρόσθεσε μια ετικέτα",
    formular_tag_hinzufuegen_btn: "+ Ετικέτα",
    formular_tag_entfernen_aria: "Αφαίρεση ετικέτας {{tag}}",
    formular_label_portionen: "Μερίδες (βάση)",
    formular_label_zutaten: "Υλικά",
    formular_zutat_hinzufuegen_btn: "+ Υλικό",
    formular_zutat_menge_placeholder: "Ποσότητα",
    formular_zutat_einheit_placeholder: "Μονάδα",
    formular_zutat_name_placeholder: "Υλικό",
    formular_zutat_entfernen_aria: "Αφαίρεση υλικού",
    formular_label_zubereitung: "Εκτέλεση (βήματα)",
    formular_schritt_hinzufuegen_btn: "+ Βήμα",
    formular_schritt_placeholder_beispiel: "π.χ. πλύνε και κόψε τα λαχανικά",
    formular_schritt_placeholder_naechster: "επόμενο βήμα",
    formular_schritt_entfernen_aria: "Αφαίρεση βήματος",
    formular_label_bild: "Φωτογραφία",
    formular_bild_vorhanden_hinweis: "(υπάρχει – ένα νέο αρχείο θα την αντικαταστήσει)",
    formular_bild_hinweis: "Η τρέχουσα φωτογραφία διατηρείται αν δεν επιλέξεις νέο αρχείο.",
    formular_bild_verkleinern_text: "Σμίκρυνση φωτογραφίας…",
    fehler_url_ungueltig: "Δώσε μια πλήρη διεύθυνση που να ξεκινά με http:// ή https://.",
    fehler_url_apostroph: "Αυτή η διεύθυνση περιέχει απόστροφο (') και δυστυχώς δεν μπορεί να εισαχθεί.",
    fehler_url_keine_ausgabe: "Το σενάριο δεν επέστρεψε καμία έξοδο. Έχει ρυθμιστεί το 'rezeptbuch_url_importieren' στο configuration.yaml και έχει γίνει πλήρης επανεκκίνηση του Home Assistant έκτοτε;",
    fehler_url_kein_json: "Η απάντηση του σεναρίου εισαγωγής δεν ήταν έγκυρο JSON.",
    fehler_url_import_fehlgeschlagen: "Η εισαγωγή URL απέτυχε: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Δυστυχώς δεν αναγνωρίστηκε τίποτα στο επικολλημένο κείμενο. Συμπλήρωσε τα παρακάτω πεδία χειροκίνητα.",
    warnung_texterkennung_unvollstaendig: "Η αναγνώριση ήταν ελλιπής (λείπουν υλικά ή βήματα ή μπορεί να έχουν αντιστοιχιστεί λανθασμένα) - έλεγξε και συμπλήρωσε στη φόρμα.",
    fehler_json_ungueltig: "Το επικολλημένο JSON δεν είναι έγκυρο. Έλεγξέ το και προσπάθησε ξανά.",
    fehler_json_titel_fehlt: "Στο JSON λείπει τουλάχιστον το πεδίο 'title'.",
    fehler_titel_fehlt: "Δώσε έναν τίτλο.",
    fehler_unerwartet: "Απρόσμενο σφάλμα:\n{{fehler}}",
    fehler_konflikt_geloescht: "Το \"{{titel}}\" έχει διαγραφεί εν τω μεταξύ από κάποιον άλλον. Οι αλλαγές σου δεν αποθηκεύτηκαν.",
    fehler_konflikt_geaendert: "Το \"{{titel}}\" έχει τροποποιηθεί εν τω μεταξύ από κάποιον άλλον (π.χ. σχόλιο, βαθμολογία ή δική του επεξεργασία).\n\nΓια να μην αντικατασταθεί κάτι, οι αλλαγές σου ΔΕΝ αποθηκεύτηκαν. Άνοιξε ξανά τη συνταγή και εισήγαγε ξανά τις αλλαγές σου.",
    fehler_vorgang_fehlgeschlagen: "Η ενέργεια απέτυχε:\n{{fehler}}",
    fehler_teilen_drucken: "Απρόσμενο σφάλμα κατά την κοινοποίηση/εκτύπωση:\n{{fehler}}",
    fehler_config_entity_fehlt: "Όρισε 'entity' στη διαμόρφωση της κάρτας, π.χ. entity: todo.rezepte",
    fehler_bild_lesen: "Δεν ήταν δυνατή η ανάγνωση της φωτογραφίας (κατεστραμμένο ή μη υποστηριζόμενο αρχείο).",
    fehler_bild_verarbeiten: "Δεν ήταν δυνατή η επεξεργασία της φωτογραφίας ως εικόνα (μη υποστηριζόμενη μορφή;).",
    teilen_ueberschrift_zutaten: "ΥΛΙΚΑ",
    teilen_ueberschrift_zubereitung: "ΕΚΤΕΛΕΣΗ",
    seite_zurueck_btn: "← Πίσω",
    seite_weiter_btn: "Επόμενο →",
    seite_anzeige: "Σελίδα {{aktuell}} από {{gesamt}}",
    update_neue_version: "Διατίθεται νέα έκδοση: {{version}}",
    update_ansehen_btn: "Προβολή",
    update_schliessen_aria: "Απόκρυψη ειδοποίησης",
    detail_kochmodus_btn: "🍳 Λειτουργία μαγειρέματος",
    kochmodus_schritt_anzeige: "Βήμα {{aktuell}} από {{gesamt}}",
    kochmodus_schliessen_aria: "Κλείσιμο λειτουργίας μαγειρέματος",
    kochmodus_schritt_zurueck_aria: "Προηγούμενο βήμα",
    kochmodus_schritt_weiter_aria: "Επόμενο βήμα",
    kochmodus_zutaten_ein_aria: "Εμφάνιση υλικών",
    kochmodus_zutaten_aus_aria: "Απόκρυψη υλικών",
    kopf_sammel_pdf_btn: "📚 Συγκεντρωτικό PDF",
    sammel_pdf_keine_rezepte: "Δεν βρέθηκαν συνταγές για εξαγωγή.",
    sammel_pdf_frage_toc: "Δημιουργία πίνακα περιεχομένων για τις επιλεγμένες συνταγές;",
    sammel_pdf_ja_toc_btn: "Ναι, δημιουργία πίνακα περιεχομένων",
    sammel_pdf_nein_toc_btn: "Όχι, χωρίς πίνακα περιεχομένων",
    sammel_pdf_name_placeholder: "Όνομα βιβλίου μαγειρικής",
    sammel_pdf_erstellen_btn: "Δημιουργία PDF",
    abschnitt_titel_inhaltsverzeichnis: "Πίνακας περιεχομένων",
    sammel_pdf_frage_umfang: "Ποιες συνταγές να μπουν στο συνολικό PDF;",
    sammel_pdf_alle_rezepte_btn: "Όλες οι εμφανιζόμενες συνταγές",
    sammel_pdf_auswahl_btn: "Επιλογή συγκεκριμένων συνταγών",
    sammel_pdf_auswahl_titel: "Επιλογή συνταγών",
    sammel_pdf_alle_auswaehlen_link: "Επιλογή όλων",
    sammel_pdf_keine_auswaehlen_link: "Καμία επιλογή",
    sammel_pdf_weiter_btn: "Επόμενο",
    sammel_pdf_auswahl_keine_hinweis: "Επιλέξτε τουλάχιστον μία συνταγή.",
  },
  hu: {
    allgemein_zurueck: "← Vissza",
    allgemein_ja: "Igen",
    allgemein_nein: "Nem",
    allgemein_speichern: "Mentés",
    allgemein_speichert: "Mentés…",
    allgemein_abbrechen: "Mégse",
    allgemein_bearbeiten: "Szerkesztés",
    allgemein_loeschen: "Törlés",
    allgemein_oeffnen: "Megnyitás",
    allgemein_unbekannt: "Ismeretlen",
    allgemein_schliessen: "Bezárás",
    kategorie_hauptgericht: "Főétel",
    kategorie_vorspeise: "Előétel",
    kategorie_suppe: "Leves",
    kategorie_salat: "Saláta",
    kategorie_beilage: "Köret",
    kategorie_dessert: "Desszert",
    kategorie_kuchen_gebaeck: "Sütemények és péksütemények",
    kategorie_fruehstueck: "Reggeli",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Ital",
    kategorie_sonstiges: "Egyéb",
    kategorie_filter_alle: "Összes",
    wochentag_montag: "Hétfő",
    wochentag_dienstag: "Kedd",
    wochentag_mittwoch: "Szerda",
    wochentag_donnerstag: "Csütörtök",
    wochentag_freitag: "Péntek",
    wochentag_samstag: "Szombat",
    wochentag_sonntag: "Vasárnap",
    sortier_titel: "Betűrend (A-Z)",
    sortier_bewertung: "Legjobb értékelés elöl",
    sortier_kategorie: "Kategória szerint",
    sortier_neu: "Legújabb elöl",
    sortieren_label: "Rendezés:",
    kopf_titel_standard: "Szakácskönyv",
    kopf_sichern_btn: "💾 Biztonsági mentés",
    kopf_wochenplan_btn: "📅 Heti étrend",
    einkaufsmodus_start_btn: "🛒 Bevásárlólista",
    einkaufsmodus_beenden_btn: "✕ Kiválasztás befejezése",
    kopf_neu_btn: "+ Új",
    suche_placeholder: "🔍 Recept vagy hozzávalók (pl. liszt, tojás)…",
    kochbuch_loeschen_title: "Gyűjtemény törlése",
    kochbuch_loeschen_aria: "{{name}} gyűjtemény törlése",
    kochbuch_speichern_btn: "+ Mentés intelligens gyűjteményként",
    kochbuch_name_placeholder: "Ennek a gyűjteménynek a neve, pl. Őszi receptek",
    fehler_kochbuch_name_fehlt: "Adj meg egy nevet a gyűjteménynek.",
    kochbuch_info_aria: "Intelligens gyűjtemények magyarázatának megjelenítése",
    kochbuch_info_titel: "Mi az az intelligens gyűjtemény?",
    kochbuch_info_text:
      "Az intelligens gyűjtemény nem egy rögzített receptlistát tárol, " +
      "hanem a kategória, a címkék és a keresési kifejezés " +
      "kombinációját, pontosan úgy, ahogy azok a mentés pillanatában " +
      "be vannak állítva. Ezt követően magától frissül: egy új, " +
      "illeszkedő recept automatikusan megjelenik, egy olyan recept " +
      "pedig, amelynek kategóriája vagy címkéi megváltoznak, " +
      "ugyanolyan automatikusan el is tűnhet.",
    einkaufs_zaehler: "{{anzahl}} kiválasztva",
    einkaufsliste_erstellen_btn: "Bevásárlólista létrehozása",
    fehler_einkaufsliste_keine_konfiguration: "A bevásárlólistához még hiányzik a konfiguráció: add meg a 'shopping_list_entity' beállítást a kártya konfigurációjában (pl. shopping_list_entity: todo.einkaufsliste) - ehhez egy MÁSODIK „Helyi teendőlista” segéd szükséges. Lásd az ANLEITUNG-Backup.md fájl 18. szakaszát.",
    fehler_einkaufsliste_keine_auswahl: "Válassz ki legalább egy receptet.",
    fehler_einkaufsliste_keine_zutaten: "A kiválasztott receptek nem tartalmaznak hozzávalókat.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Nem sikerült hozzáadni a(z) \"{{zeile}}\" tételt a bevásárlólistához:\n{{fehler}}\n\nA már hozzáadott hozzávalók a listán maradnak.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} hozzávaló hozzáadva a(z) \"{{entity}}\" listához.",
    undo_geloescht: "\"{{titel}}\" törölve.",
    undo_rueckgaengig_btn: "Visszavonás",
    leer_keine_rezepte: "Még nincsenek receptek – kezdd a \"+ Új\" gombbal",
    leer_keine_treffer: "Nem található recept erre: \"{{begriff}}\"",
    fehler_liste_laden_titel: "Nem sikerült betölteni: \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Létezik ez a teendőlista? (Beállítások → Eszközök és szolgáltatások → Segédeszközök)",
    kachel_aria_label_oeffnen: "{{titel}} recept megnyitása",
    sterne_aria_label_gruppe: "Saját értékelésed",
    sterne_aria_label: "{{zahl}} / 5 csillag",
    fehler_kein_benutzer_bewertung: "Nem sikerült megállapítani a felhasználódat - az értékelés nem lehetséges.",
    detail_teilen_drucken_btn: "📤 Megosztás / Nyomtatás",
    detail_erstellt_von: "👤 Létrehozta: {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} értékelés)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} értékelés)",
    detail_keine_bewertungen: "Még nincsenek értékelések",
    detail_deine_bewertung: "Az értékelésed:",
    detail_zubereitet_x: "🍳 {{anzahl}}x elkészítve",
    detail_portionen_suffix: "adag",
    abschnitt_titel_zutaten: "Hozzávalók",
    abschnitt_titel_zubereitung: "Elkészítés",
    keine_zutaten: "Nincsenek megadva hozzávalók",
    detail_kommentare_titel: "Hozzászólások",
    detail_keine_kommentare: "Még nincsenek hozzászólások",
    detail_kommentar_placeholder: "Kiegészítés, tipp vagy megjegyzés…",
    detail_kommentar_hinzufuegen_btn: "Hozzászólás hozzáadása",
    detail_bearbeiten_hinweis: "Csak {{name}} (vagy egy adminisztrátor) szerkesztheti vagy törölheti ezt a receptet.",
    detail_ersteller_unbekannt: "a létrehozó",
    modal_zubereitet_frage: "Elkészítetted a(z) \"{{titel}}\" receptet?",
    statistik_btn: "📊 Statisztika",
    statistik_titel: "Főzési statisztika",
    statistik_info_aria: "A statisztika magyarázatának megjelenítése",
    statistik_info_titel: "Hogyan számítjuk ki ezt a statisztikát?",
    statistik_info_text:
      "Ez a kiértékelés minden megerősítést számol az „Elkészítetted?“ kérdésre - függetlenül az adag méretétől vagy attól, hányszor ugyanazon a napon. Ha ez a kérdés ki van kapcsolva az ask_cooked: false kártyabeállítással, a számok nem nőnek tovább, de a már rögzített elkészítések megmaradnak.",
    statistik_dieses_jahr: "{{jahr}}-ban {{anzahl}}x főztél a receptkönyvedből",
    statistik_gesamt: "Összesen {{anzahl}}x főztél a receptkönyvedből",
    statistik_top_titel: "Leggyakrabban elkészítve",
    statistik_keine_daten: "Még nincs rögzített elkészítés.",
    modal_loeschen_frage: "Biztosan törlöd a(z) \"{{titel}}\" receptet?",
    modal_loeschen_ja_btn: "Igen, törlés",
    wochenplan_titel: "Heti étrend",
    wochenplan_tab_diese: "Ezen a héten",
    wochenplan_tab_folgewoche: "Következő hét",
    wochenplan_hinweis_folgewoche: "Tervezd itt már most a következő hetet - amint véget ér az aktuális hét, automatikusan átkerül az \"Ezen a héten\" nézetbe.",
    wochenplan_hinweis_diese: "Az elmúlt napok automatikusan törlődnek (maga a recept megmarad, csak a hozzárendelés tűnik el).",
    wochenplan_hinweis_speicherung: "Eszközök között szinkronizálva mentődik (rejtett további bejegyzésként ugyanabban a receptlistában, nincs szükség további segédre).",
    wochenplan_leer: "Még nincsenek receptek - hozz létre először néhányat.",
    wochenplan_kein_rezept_option: "– nincs recept –",
    wochenplan_einkaufsliste_btn: "Bevásárlólista létrehozása innen: {{ziel}}",
    wochenplan_wort: "heti étrend",
    wochenplan_folgewoche_wort: "következő hét",
    wochenplan_aktuelle_woche_wort: "aktuális hét",
    wochenplan_keine_zuweisung: "A(z) {{zeitraum}} még nem tartalmaz hozzárendelt receptet.",
    formular_titel_neu: "Új recept",
    formular_titel_bearbeiten: "Recept szerkesztése",
    formular_url_import_btn: "🌐 Recept URL importálása",
    formular_url_label: "Link a recept weboldalára",
    formular_url_placeholder: "https://www.pelda-receptek.hu/receptem",
    formular_url_hinweis: "Betölti az oldalt, és beolvassa a benne már eleve beépített, strukturált receptadatokat (ugyanazokat az adatokat, amelyekkel pl. a Google csillagos értékeléseket jelenít meg a keresésben) - általában megbízhatóbb, mint a szövegfelismerés. Csak olyan oldalakon működik, amelyek ilyen adatokat biztosítanak, és nem blokkolják az automatizált lekéréseket.",
    formular_url_importieren_btn: "Importálás",
    formular_url_laedt: "Betöltés …",
    formular_text_einfuegen_btn: "🔍 Recept szövegének beillesztése (automatikus felismerés)",
    formular_text_label: "Illeszd be ide a recept szövegét (pl. egy recept weboldalról másolva)",
    formular_text_placeholder: "Cím, hozzávalók, elkészítés - egyszerűen illeszd be az egész szöveget",
    formular_text_hinweis: "Tisztán automatikus, AI nélküli felismerés - a szövegben szereplő \"Hozzávalók\" és \"Elkészítés\" címsorokkal működik a legjobban. Kérjük, utána röviden ellenőrizd az eredményt, lehet, hogy hiányos.",
    formular_text_erkennen_btn: "Felismerés",
    formular_json_einfuegen_btn: "📋 AI által generált JSON beillesztése",
    formular_json_info_aria: "Kész prompt megjelenítése MI-hez",
    json_info_titel: "Prompt MI-hez",
    json_info_erklaerung:
      "Másold ki ezt a szöveget, illeszd be egy tetszőleges MI-be (pl. ChatGPT vagy Claude), csatold hozzá a recept szövegét, majd a választ illeszd be fent az „Illeszd be ide a JSON-t” mezőbe.",
    json_info_prompt:
      "Alakítsd át a recept szövegét, amit mindjárt elküldök, EGYETLEN JSON objektummá - magyarázat nélkül, előtte vagy utána szöveg nélkül, csak a JSON-t. Pontosan ezt a formátumot használd:\n\n" +
      "{\n" +
      '  "title": "recept neve",\n' +
      '  "servings": 4,\n' +
      '  "category": "az alábbiak egyike: {{kategorien}}",\n' +
      '  "ingredients": ["soronként egy hozzávaló, pl. 200 g liszt"],\n' +
      '  "steps": ["soronként egy elkészítési lépés"],\n' +
      '  "tags": ["opcionális címkék, pl. vegetáriánus"]\n' +
      "}\n\n" +
      "Szabályok: a „category” PONTOSAN az egyik fent felsorolt érték legyen (változatlanul vedd át, még akkor is, ha a recept szövege más nyelven van - ezek rögzített belső értékek). " +
      "A „tags” opcionális, üres tömb is megfelel. " +
      "Ne találj ki olyan hozzávalókat vagy lépéseket, amelyek nincsenek a szövegben. " +
      "Íme a recept szövege:",
    json_info_kopieren_btn: "📋 Prompt másolása",
    json_info_kopiert: "Másolva!",
    formular_json_label: "Illeszd be ide a JSON-t",
    formular_json_uebernehmen_btn: "Alkalmaz",
    formular_label_titel: "Cím",
    formular_label_kategorie: "Kategória",
    formular_label_tags: "Címkék (több is lehet, pl. \"vegetáriánus\", \"gyors\")",
    formular_tag_placeholder: "Írj be és adj hozzá egy címkét",
    formular_tag_hinzufuegen_btn: "+ Címke",
    formular_tag_entfernen_aria: "{{tag}} címke eltávolítása",
    formular_label_portionen: "Adagok (alap)",
    formular_label_zutaten: "Hozzávalók",
    formular_zutat_hinzufuegen_btn: "+ Hozzávaló",
    formular_zutat_menge_placeholder: "Mennyiség",
    formular_zutat_einheit_placeholder: "Mértékegység",
    formular_zutat_name_placeholder: "Hozzávaló",
    formular_zutat_entfernen_aria: "Hozzávaló eltávolítása",
    formular_label_zubereitung: "Elkészítés (lépések)",
    formular_schritt_hinzufuegen_btn: "+ Lépés",
    formular_schritt_placeholder_beispiel: "pl. mosd meg és vágd fel a zöldségeket",
    formular_schritt_placeholder_naechster: "következő lépés",
    formular_schritt_entfernen_aria: "Lépés eltávolítása",
    formular_label_bild: "Kép",
    formular_bild_vorhanden_hinweis: "(van – egy új fájl le fogja cserélni)",
    formular_bild_hinweis: "Az aktuális kép megmarad, ha nem választasz új fájlt.",
    formular_bild_verkleinern_text: "A kép kicsinyítése folyamatban…",
    fehler_url_ungueltig: "Adj meg egy teljes címet, amely http://-vel vagy https://-vel kezdődik.",
    fehler_url_apostroph: "Ez a cím aposztrófot (') tartalmaz, ezért sajnos nem importálható.",
    fehler_url_keine_ausgabe: "A szkript nem adott vissza kimenetet. Be van állítva a 'rezeptbuch_url_importieren' a configuration.yaml fájlban, és azóta teljesen újraindították a Home Assistantot?",
    fehler_url_kein_json: "Az importáló szkript válasza nem volt érvényes JSON.",
    fehler_url_import_fehlgeschlagen: "Az URL importálása sikertelen: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Sajnos semmit sem sikerült felismerni a beillesztett szövegben. Töltsd ki kézzel az alábbi mezőket.",
    warnung_texterkennung_unvollstaendig: "A felismerés hiányos volt (hiányoznak a hozzávalók vagy lépések, esetleg hibásan lettek hozzárendelve) - ellenőrizd és egészítsd ki az űrlapon.",
    fehler_json_ungueltig: "A beillesztett JSON érvénytelen. Ellenőrizd, és próbáld újra.",
    fehler_json_titel_fehlt: "A JSON-ból legalább a 'title' mező hiányzik.",
    fehler_titel_fehlt: "Adj meg egy címet.",
    fehler_unerwartet: "Váratlan hiba:\n{{fehler}}",
    fehler_konflikt_geloescht: "A(z) \"{{titel}}\" receptet időközben valaki más törölte. A módosításaid nem mentődtek el.",
    fehler_konflikt_geaendert: "A(z) \"{{titel}}\" receptet időközben valaki más módosította (pl. hozzászólás, értékelés vagy saját szerkesztés).\n\nHogy semmi ne íródjon felül, a módosításaid NEM mentődtek el. Nyisd meg újra a receptet, és add meg újra a módosításaidat.",
    fehler_vorgang_fehlgeschlagen: "A művelet sikertelen:\n{{fehler}}",
    fehler_teilen_drucken: "Váratlan hiba a megosztás/nyomtatás során:\n{{fehler}}",
    fehler_config_entity_fehlt: "Add meg az 'entity' beállítást a kártya konfigurációjában, pl. entity: todo.rezepte",
    fehler_bild_lesen: "A fotót nem sikerült beolvasni (a fájl sérült vagy nem támogatott).",
    fehler_bild_verarbeiten: "A fotót nem sikerült képként feldolgozni (nem támogatott formátum?).",
    teilen_ueberschrift_zutaten: "HOZZÁVALÓK",
    teilen_ueberschrift_zubereitung: "ELKÉSZÍTÉS",
    seite_zurueck_btn: "← Vissza",
    seite_weiter_btn: "Tovább →",
    seite_anzeige: "{{aktuell}}. oldal / {{gesamt}}",
    update_neue_version: "Új verzió érhető el: {{version}}",
    update_ansehen_btn: "Megnézem",
    update_schliessen_aria: "Értesítés elrejtése",
    detail_kochmodus_btn: "🍳 Főzési mód",
    kochmodus_schritt_anzeige: "{{aktuell}}. lépés / {{gesamt}}",
    kochmodus_schliessen_aria: "Főzési mód bezárása",
    kochmodus_schritt_zurueck_aria: "Előző lépés",
    kochmodus_schritt_weiter_aria: "Következő lépés",
    kochmodus_zutaten_ein_aria: "Hozzávalók megjelenítése",
    kochmodus_zutaten_aus_aria: "Hozzávalók elrejtése",
    kopf_sammel_pdf_btn: "📚 Gyűjtő PDF",
    sammel_pdf_keine_rezepte: "Nem található exportálható recept.",
    sammel_pdf_frage_toc: "Létrehozzunk tartalomjegyzéket a kiválasztott receptekhez?",
    sammel_pdf_ja_toc_btn: "Igen, tartalomjegyzék létrehozása",
    sammel_pdf_nein_toc_btn: "Nem, tartalomjegyzék nélkül",
    sammel_pdf_name_placeholder: "A szakácskönyv neve",
    sammel_pdf_erstellen_btn: "PDF létrehozása",
    abschnitt_titel_inhaltsverzeichnis: "Tartalomjegyzék",
    sammel_pdf_frage_umfang: "Mely receptek kerüljenek a gyűjtő PDF-be?",
    sammel_pdf_alle_rezepte_btn: "Az összes megjelenített recept",
    sammel_pdf_auswahl_btn: "Bizonyos receptek kiválasztása",
    sammel_pdf_auswahl_titel: "Receptek kiválasztása",
    sammel_pdf_alle_auswaehlen_link: "Összes kijelölése",
    sammel_pdf_keine_auswaehlen_link: "Kijelölés törlése",
    sammel_pdf_weiter_btn: "Tovább",
    sammel_pdf_auswahl_keine_hinweis: "Válassz ki legalább egy receptet.",
  },
  ga: {
    allgemein_zurueck: "← Siar",
    allgemein_ja: "Tá",
    allgemein_nein: "Níl",
    allgemein_speichern: "Sábháil",
    allgemein_speichert: "Ag sábháil…",
    allgemein_abbrechen: "Cealaigh",
    allgemein_bearbeiten: "Cuir in eagar",
    allgemein_loeschen: "Scrios",
    allgemein_oeffnen: "Oscail",
    allgemein_unbekannt: "Anaithnid",
    allgemein_schliessen: "Dún",
    kategorie_hauptgericht: "Príomhchúrsa",
    kategorie_vorspeise: "Réamhchúrsa",
    kategorie_suppe: "Anraith",
    kategorie_salat: "Sailéad",
    kategorie_beilage: "Taobhrud",
    kategorie_dessert: "Milseog",
    kategorie_kuchen_gebaeck: "Cácaí agus bácáil",
    kategorie_fruehstueck: "Bricfeasta",
    kategorie_snack: "Sneaic",
    kategorie_getraenk: "Deoch",
    kategorie_sonstiges: "Eile",
    kategorie_filter_alle: "Uile",
    wochentag_montag: "Dé Luain",
    wochentag_dienstag: "Dé Máirt",
    wochentag_mittwoch: "Dé Céadaoin",
    wochentag_donnerstag: "Déardaoin",
    wochentag_freitag: "Dé hAoine",
    wochentag_samstag: "Dé Sathairn",
    wochentag_sonntag: "Dé Domhnaigh",
    sortier_titel: "In ord aibítre (A-Z)",
    sortier_bewertung: "An rátáil is fearr ar dtús",
    sortier_kategorie: "De réir catagóire",
    sortier_neu: "An ceann is nuaí ar dtús",
    sortieren_label: "Sórtáil de réir:",
    kopf_titel_standard: "Leabhar Cócaireachta",
    kopf_sichern_btn: "💾 Cúltaca",
    kopf_wochenplan_btn: "📅 Plean seachtainiúil",
    einkaufsmodus_start_btn: "🛒 Liosta siopadóireachta",
    einkaufsmodus_beenden_btn: "✕ Stop an roghnú",
    kopf_neu_btn: "+ Nua",
    suche_placeholder: "🔍 Oideas nó comhábhair (m.sh. plúr, uibheacha)…",
    kochbuch_loeschen_title: "Scrios bailiúchán",
    kochbuch_loeschen_aria: "Scrios bailiúchán {{name}}",
    kochbuch_speichern_btn: "+ Sábháil mar bhailiúchán cliste",
    kochbuch_name_placeholder: "Ainm don bhailiúchán seo, m.sh. Oidis fómhair",
    fehler_kochbuch_name_fehlt: "Cuir isteach ainm don bhailiúchán, le do thoil.",
    kochbuch_info_aria: "Taispeáin míniú ar bhailiúcháin chliste",
    kochbuch_info_titel: "Cad is bailiúchán cliste ann?",
    kochbuch_info_text:
      "Ní stórálann bailiúchán cliste liosta seasta oidis, ach " +
      "teaglaim de chatagóir, clibeanna agus téarma cuardaigh, díreach " +
      "mar atá siad socraithe nuair a shábhálann tú é. Ina dhiaidh " +
      "sin, déanann sé é féin a nuashonrú go huathoibríoch: nochtann " +
      "oideas nua a oireann go huathoibríoch, agus is féidir le " +
      "hoideas a n-athraíonn a chatagóir nó a chlibeanna imeacht as " +
      "radharc go huathoibríoch freisin.",
    einkaufs_zaehler: "{{anzahl}} roghnaithe",
    einkaufsliste_erstellen_btn: "Cruthaigh liosta siopadóireachta",
    fehler_einkaufsliste_keine_konfiguration: "Tá an chumraíocht don liosta siopadóireachta ar iarraidh fós: cuir isteach 'shopping_list_entity' i gcumraíocht an chárta le do thoil (m.sh. shopping_list_entity: todo.einkaufsliste) - teastaíonn DARA cuidí \"Liosta Le Déanamh Áitiúil\" chuige seo. Féach ANLEITUNG-Backup.md, alt 18.",
    fehler_einkaufsliste_keine_auswahl: "Roghnaigh oideas amháin ar a laghad, le do thoil.",
    fehler_einkaufsliste_keine_zutaten: "Níl aon chomhábhair sna hoidis roghnaithe.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Níorbh fhéidir \"{{zeile}}\" a chur leis an liosta siopadóireachta:\n{{fehler}}\n\nFanann na comhábhair atá curtha leis cheana féin ar an liosta.",
    einkaufsliste_hinzugefuegt: "Cuireadh {{anzahl}} chomhábhar/chomhábhair leis an liosta \"{{entity}}\".",
    undo_geloescht: "Scriosadh \"{{titel}}\".",
    undo_rueckgaengig_btn: "Cealaigh",
    leer_keine_rezepte: "Níl aon oidis ann fós – tosaigh le \"+ Nua\"",
    leer_keine_treffer: "Níor aimsíodh aon oideas do \"{{begriff}}\"",
    fehler_liste_laden_titel: "Níorbh fhéidir \"{{entity}}\" a lódáil.",
    fehler_liste_laden_hinweis: "An bhfuil an liosta le déanamh seo ann? (Socruithe → Feistí agus Seirbhísí → Cuidithe)",
    kachel_aria_label_oeffnen: "Oscail oideas {{titel}}",
    sterne_aria_label_gruppe: "Do rátáil féin",
    sterne_aria_label: "{{zahl}} as 5 réalta",
    fehler_kein_benutzer_bewertung: "Níorbh fhéidir d'úsáideoir a aimsiú - níl rátáil indéanta.",
    detail_teilen_drucken_btn: "📤 Comhroinn / Priontáil",
    detail_erstellt_von: "👤 Cruthaithe ag {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} rátáil)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} rátáil)",
    detail_keine_bewertungen: "Níl aon rátálacha ann fós",
    detail_deine_bewertung: "Do rátáil:",
    detail_zubereitet_x: "🍳 ullmhaithe {{anzahl}}x",
    detail_portionen_suffix: "cuid",
    abschnitt_titel_zutaten: "Comhábhair",
    abschnitt_titel_zubereitung: "Ullmhúchán",
    keine_zutaten: "Níor liostáladh aon chomhábhair",
    detail_kommentare_titel: "Tuairimí",
    detail_keine_kommentare: "Níl aon tuairimí ann fós",
    detail_kommentar_placeholder: "Tuilleadh eolais, leid nó nóta…",
    detail_kommentar_hinzufuegen_btn: "Cuir tuairim leis",
    detail_bearbeiten_hinweis: "Ní féidir ach le {{name}} (nó riarthóir) an t-oideas seo a chur in eagar nó a scriosadh.",
    detail_ersteller_unbekannt: "an cruthaitheoir",
    modal_zubereitet_frage: "Ar ullmhaigh tú \"{{titel}}\"?",
    statistik_btn: "📊 Staitisticí",
    statistik_titel: "Staitisticí cócaireachta",
    statistik_info_aria: "Taispeáin míniú na staitisticí",
    statistik_info_titel: "Conas a ríomhtar an staitistic seo?",
    statistik_info_text:
      "Áirítear sa mheasúnú seo gach deimhniú ar an gceist „Ar ullmhaigh tú é?“ - beag beann ar mhéid an fhreastail nó cé mhéad uair an lá céanna. Má tá an cheist seo díchumasaithe tríd an rogha cárta ask_cooked: false, ní fhásfaidh na huimhreacha a thuilleadh, ach coinneofar na hullmhúcháin atá taifeadta cheana.",
    statistik_dieses_jahr: "Rinne tú cócaireacht {{anzahl}}x ó do leabhar oideas in {{jahr}}",
    statistik_gesamt: "Rinne tú cócaireacht {{anzahl}}x ó do leabhar oideas san iomlán",
    statistik_top_titel: "Is mó a ullmhaíodh",
    statistik_keine_daten: "Níl aon ullmhúcháin taifeadta fós.",
    modal_loeschen_frage: "An bhfuil tú cinnte gur mian leat \"{{titel}}\" a scriosadh?",
    modal_loeschen_ja_btn: "Tá, scrios",
    wochenplan_titel: "Plean seachtainiúil",
    wochenplan_tab_diese: "An tseachtain seo",
    wochenplan_tab_folgewoche: "An tseachtain seo chugainn",
    wochenplan_hinweis_folgewoche: "Pleanáil an tseachtain atá le teacht anseo cheana féin - aistreoidh sé go huathoibríoch go \"An tseachtain seo\" a luaithe a bheidh an tseachtain reatha thart.",
    wochenplan_hinweis_diese: "Glantar laethanta atá thart go huathoibríoch (fanann an t-oideas féin ann, ní chailltear ach an sannadh).",
    wochenplan_hinweis_speicherung: "Sábháiltear é ar fud gléasanna (mar iontráil bhreise fholaithe sa liosta oidis céanna, ní gá cuidí eile).",
    wochenplan_leer: "Níl aon oidis ann fós - cruthaigh cúpla ceann ar dtús.",
    wochenplan_kein_rezept_option: "– gan oideas –",
    wochenplan_einkaufsliste_btn: "Cruthaigh liosta siopadóireachta ó {{ziel}}",
    wochenplan_wort: "plean seachtainiúil",
    wochenplan_folgewoche_wort: "an tseachtain seo chugainn",
    wochenplan_aktuelle_woche_wort: "an tseachtain reatha",
    wochenplan_keine_zuweisung: "Níl aon oidis sannta san {{zeitraum}} fós.",
    formular_titel_neu: "Oideas nua",
    formular_titel_bearbeiten: "Cuir oideas in eagar",
    formular_url_import_btn: "🌐 Iompórtáil URL oidis",
    formular_url_label: "Nasc chuig suíomh gréasáin an oidis",
    formular_url_placeholder: "https://www.samplaoidis.ie/moideas",
    formular_url_hinweis: "Lódálann sé an leathanach agus léann sé na sonraí struchtúrtha oidis atá leabaithe ann cheana féin (na sonraí céanna a úsáideann Google, mar shampla, chun rátálacha réaltaí a thaispeáint sa chuardach) - de ghnáth níos iontaofa ná aithint téacs. Ní oibríonn sé ach ar shuíomhanna a sholáthraíonn sonraí den sórt sin agus nach gcuireann bac ar iarratais uathoibrithe.",
    formular_url_importieren_btn: "Iompórtáil",
    formular_url_laedt: "Ag lódáil …",
    formular_text_einfuegen_btn: "🔍 Greamaigh téacs an oidis (aithint uathoibríoch)",
    formular_text_label: "Greamaigh téacs an oidis anseo (m.sh. cóipeáilte ó shuíomh gréasáin oidis)",
    formular_text_placeholder: "Teideal, comhábhair, ullmhúchán - greamaigh an téacs iomlán díreach",
    formular_text_hinweis: "Aithint uathoibríoch amháin gan AI - is fearr a oibríonn sé le ceannteidil \"Comhábhair\" agus \"Ullmhúchán\" sa téacs. Seiceáil an toradh go gairid ina dhiaidh sin, le do thoil, d'fhéadfadh sé a bheith neamhiomlán.",
    formular_text_erkennen_btn: "Aithin",
    formular_json_einfuegen_btn: "📋 Greamaigh JSON a ghin AI",
    formular_json_info_aria: "Taispeáin leid réamhdhéanta le haghaidh IS",
    json_info_titel: "Leid le haghaidh IS",
    json_info_erklaerung:
      "Cóipeáil an téacs seo, greamaigh é in IS de do rogha féin (m.sh. ChatGPT nó Claude), ceangail téacs d'oideas leis, agus greamaigh an freagra ansin thuas faoi „Greamaigh JSON anseo“.",
    json_info_prompt:
      "Athraigh téacs an oidis a sheolfaidh mé chugat ar ball ina AON réad JSON amháin - gan míniú, gan téacs roimhe ná ina dhiaidh, an JSON amháin. Bain úsáid as an bhformáid seo go beacht:\n\n" +
      "{\n" +
      '  "title": "ainm an oidis",\n' +
      '  "servings": 4,\n' +
      '  "category": "ceann de: {{kategorien}}",\n' +
      '  "ingredients": ["comhábhar amháin in aghaidh na hiontrála, m.sh. 200 g plúir"],\n' +
      '  "steps": ["céim ullmhúcháin amháin in aghaidh na hiontrála"],\n' +
      '  "tags": ["clibeanna roghnacha, m.sh. veigeatóireach"]\n' +
      "}\n\n" +
      "Rialacha: ní mór go mbeadh „category“ CINNTE ar cheann de na luachanna atá liostaithe thuas (cóipeáil gan athrú é, fiú má tá téacs an oidis i dteanga eile - is luachanna seasta inmheánacha iad seo). " +
      "Tá „tags“ roghnach, is leor eagar folamh más gá. " +
      "Ná cum comhábhair ná céimeanna nach bhfuil sa téacs. " +
      "Seo téacs an oidis:",
    json_info_kopieren_btn: "📋 Cóipeáil an leid",
    json_info_kopiert: "Cóipeáilte!",
    formular_json_label: "Greamaigh JSON anseo",
    formular_json_uebernehmen_btn: "Cuir i bhfeidhm",
    formular_label_titel: "Teideal",
    formular_label_kategorie: "Catagóir",
    formular_label_tags: "Clibeanna (is féidir níos mó ná ceann amháin, m.sh. \"veigeatórach\", \"gasta\")",
    formular_tag_placeholder: "Cuir isteach agus cuir clib leis",
    formular_tag_hinzufuegen_btn: "+ Clib",
    formular_tag_entfernen_aria: "Bain clib {{tag}}",
    formular_label_portionen: "Cuid (bonn)",
    formular_label_zutaten: "Comhábhair",
    formular_zutat_hinzufuegen_btn: "+ Comhábhar",
    formular_zutat_menge_placeholder: "Méid",
    formular_zutat_einheit_placeholder: "Aonad",
    formular_zutat_name_placeholder: "Comhábhar",
    formular_zutat_entfernen_aria: "Bain comhábhar",
    formular_label_zubereitung: "Ullmhúchán (céimeanna)",
    formular_schritt_hinzufuegen_btn: "+ Céim",
    formular_schritt_placeholder_beispiel: "m.sh. nigh agus gearr na glasraí",
    formular_schritt_placeholder_naechster: "an chéad chéim eile",
    formular_schritt_entfernen_aria: "Bain céim",
    formular_label_bild: "Grianghraf",
    formular_bild_vorhanden_hinweis: "(ann – cuirfidh comhad nua ina ionad)",
    formular_bild_hinweis: "Fanann an grianghraf reatha ann mura roghnaíonn tú comhad nua.",
    formular_bild_verkleinern_text: "Grianghraf á laghdú…",
    fehler_url_ungueltig: "Cuir isteach seoladh iomlán a thosaíonn le http:// nó https://, le do thoil.",
    fehler_url_apostroph: "Tá uaschamóg (') sa seoladh seo agus ní féidir é a iompórtáil ar an drochuair.",
    fehler_url_keine_ausgabe: "Níor thug an script aon aschur ar ais. An bhfuil 'rezeptbuch_url_importieren' socraithe i configuration.yaml agus ar atosaíodh Home Assistant go hiomlán ó shin?",
    fehler_url_kein_json: "Ní raibh freagra na scripte iompórtála ina JSON bailí.",
    fehler_url_import_fehlgeschlagen: "Theip ar iompórtáil an URL: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Ar an drochuair, níorbh fhéidir aon rud a aithint sa téacs greamaithe. Líon na réimsí thíos de láimh, le do thoil.",
    warnung_texterkennung_unvollstaendig: "Bhí an aithint neamhiomlán (comhábhair nó céimeanna in easnamh/sannta go mícheart b'fhéidir) - seiceáil agus comhlánaigh san fhoirm, le do thoil.",
    fehler_json_ungueltig: "Tá an JSON greamaithe neamhbhailí. Seiceáil é agus bain triail eile as, le do thoil.",
    fehler_json_titel_fehlt: "Tá an réimse 'title' ar a laghad in easnamh sa JSON.",
    fehler_titel_fehlt: "Cuir isteach teideal, le do thoil.",
    fehler_unerwartet: "Earráid gan choinne:\n{{fehler}}",
    fehler_konflikt_geloescht: "Scrios duine eile \"{{titel}}\" idir an dá linn. Níor sábháladh do chuid athruithe.",
    fehler_konflikt_geaendert: "D'athraigh duine eile \"{{titel}}\" idir an dá linn (m.sh. tuairim, rátáil nó eagarthóireacht féin).\n\nDe chun rud ar bith a fhorscríobh, NÍOR sábháladh do chuid athruithe. Oscail an t-oideas arís, le do thoil, agus cuir isteach do chuid athruithe arís.",
    fehler_vorgang_fehlgeschlagen: "Theip ar an ngníomh:\n{{fehler}}",
    fehler_teilen_drucken: "Earráid gan choinne agus é á chomhroinnt/á phriontáil:\n{{fehler}}",
    fehler_config_entity_fehlt: "Cuir isteach 'entity' i gcumraíocht an chárta, le do thoil, m.sh. entity: todo.rezepte",
    fehler_bild_lesen: "Níorbh fhéidir an grianghraf a léamh (comhad truaillithe nó gan tacaíocht).",
    fehler_bild_verarbeiten: "Níorbh fhéidir an grianghraf a phróiseáil mar íomhá (formáid gan tacaíocht?).",
    teilen_ueberschrift_zutaten: "COMHÁBHAIR",
    teilen_ueberschrift_zubereitung: "ULLMHÚCHÁN",
    seite_zurueck_btn: "← Siar",
    seite_weiter_btn: "Ar Aghaidh →",
    seite_anzeige: "Leathanach {{aktuell}} de {{gesamt}}",
    update_neue_version: "Leagan nua ar fáil: {{version}}",
    update_ansehen_btn: "Amharc",
    update_schliessen_aria: "Cuir an fógra i bhfolach",
    detail_kochmodus_btn: "🍳 Mód Cócaireachta",
    kochmodus_schritt_anzeige: "Céim {{aktuell}} de {{gesamt}}",
    kochmodus_schliessen_aria: "Dún an mód cócaireachta",
    kochmodus_schritt_zurueck_aria: "An chéim roimhe seo",
    kochmodus_schritt_weiter_aria: "An chéad chéim eile",
    kochmodus_zutaten_ein_aria: "Taispeáin comhábhair",
    kochmodus_zutaten_aus_aria: "Folaigh comhábhair",
    kopf_sammel_pdf_btn: "📚 PDF Bailithe",
    sammel_pdf_keine_rezepte: "Níor aimsíodh aon oideas le heaspórtáil.",
    sammel_pdf_frage_toc: "Ar mhaith leat clár ábhair a chruthú do na hoidis roghnaithe?",
    sammel_pdf_ja_toc_btn: "Tá, cruthaigh clár ábhair",
    sammel_pdf_nein_toc_btn: "Níl, gan clár ábhair",
    sammel_pdf_name_placeholder: "Ainm an leabhair chócaireachta",
    sammel_pdf_erstellen_btn: "Cruthaigh PDF",
    abschnitt_titel_inhaltsverzeichnis: "Clár Ábhair",
    sammel_pdf_frage_umfang: "Cé na oidis ba chóir a bheith san PDF comhcheangailte?",
    sammel_pdf_alle_rezepte_btn: "Gach oide a thaispeántar",
    sammel_pdf_auswahl_btn: "Roghnaigh oidis áirithe",
    sammel_pdf_auswahl_titel: "Roghnaigh oidis",
    sammel_pdf_alle_auswaehlen_link: "Roghnaigh gach ceann",
    sammel_pdf_keine_auswaehlen_link: "Bain gach rogha",
    sammel_pdf_weiter_btn: "Ar aghaidh",
    sammel_pdf_auswahl_keine_hinweis: "Roghnaigh ceann amháin oide ar a laghad.",
  },
  it: {
    allgemein_zurueck: "← Indietro",
    allgemein_ja: "Sì",
    allgemein_nein: "No",
    allgemein_speichern: "Salva",
    allgemein_speichert: "Salvataggio…",
    allgemein_abbrechen: "Annulla",
    allgemein_bearbeiten: "Modifica",
    allgemein_loeschen: "Elimina",
    allgemein_oeffnen: "Apri",
    allgemein_unbekannt: "Sconosciuto",
    allgemein_schliessen: "Chiudi",
    kategorie_hauptgericht: "Piatto principale",
    kategorie_vorspeise: "Antipasto",
    kategorie_suppe: "Zuppa",
    kategorie_salat: "Insalata",
    kategorie_beilage: "Contorno",
    kategorie_dessert: "Dessert",
    kategorie_kuchen_gebaeck: "Torte e dolci",
    kategorie_fruehstueck: "Colazione",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Bevanda",
    kategorie_sonstiges: "Altro",
    kategorie_filter_alle: "Tutti",
    wochentag_montag: "Lunedì",
    wochentag_dienstag: "Martedì",
    wochentag_mittwoch: "Mercoledì",
    wochentag_donnerstag: "Giovedì",
    wochentag_freitag: "Venerdì",
    wochentag_samstag: "Sabato",
    wochentag_sonntag: "Domenica",
    sortier_titel: "Alfabetico (A-Z)",
    sortier_bewertung: "Miglior voto per primo",
    sortier_kategorie: "Per categoria",
    sortier_neu: "Più recenti per primi",
    sortieren_label: "Ordina per:",
    kopf_titel_standard: "Ricettario",
    kopf_sichern_btn: "💾 Backup",
    kopf_wochenplan_btn: "📅 Piano settimanale",
    einkaufsmodus_start_btn: "🛒 Lista della spesa",
    einkaufsmodus_beenden_btn: "✕ Termina selezione",
    kopf_neu_btn: "+ Nuova",
    suche_placeholder: "🔍 Ricetta o ingredienti (es. farina, uova)…",
    kochbuch_loeschen_title: "Elimina raccolta",
    kochbuch_loeschen_aria: "Elimina raccolta {{name}}",
    kochbuch_speichern_btn: "+ Salva come raccolta smart",
    kochbuch_name_placeholder: "Nome per questa raccolta, es. Ricette autunnali",
    fehler_kochbuch_name_fehlt: "Inserisci un nome per la raccolta.",
    kochbuch_info_aria: "Mostra spiegazione delle raccolte smart",
    kochbuch_info_titel: "Cos'è una raccolta smart?",
    kochbuch_info_text:
      "Una raccolta smart non memorizza un elenco fisso di ricette, " +
      "ma una combinazione di categoria, tag e termine di ricerca, " +
      "così come sono impostati al momento del salvataggio. In " +
      "seguito si aggiorna da sola: una nuova ricetta che corrisponde " +
      "compare automaticamente, e una ricetta la cui categoria o i " +
      "cui tag cambiano può altrettanto automaticamente scomparire di " +
      "nuovo.",
    einkaufs_zaehler: "{{anzahl}} selezionate",
    einkaufsliste_erstellen_btn: "Crea lista della spesa",
    fehler_einkaufsliste_keine_konfiguration: "Manca ancora la configurazione per la lista della spesa: indica 'shopping_list_entity' nella configurazione della card (es. shopping_list_entity: todo.einkaufsliste) - a tale scopo serve un SECONDO helper Lista di cose da fare locale. Vedi ANLEITUNG-Backup.md, sezione 18.",
    fehler_einkaufsliste_keine_auswahl: "Seleziona almeno una ricetta.",
    fehler_einkaufsliste_keine_zutaten: "Le ricette selezionate non contengono ingredienti.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Impossibile aggiungere \"{{zeile}}\" alla lista della spesa:\n{{fehler}}\n\nGli ingredienti già aggiunti restano nella lista.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingrediente/i aggiunto/i a \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" eliminata.",
    undo_rueckgaengig_btn: "Annulla",
    leer_keine_rezepte: "Ancora nessuna ricetta – inizia con \"+ Nuova\"",
    leer_keine_treffer: "Nessuna ricetta trovata per \"{{begriff}}\"",
    fehler_liste_laden_titel: "Impossibile caricare \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Questa lista di cose da fare esiste? (Impostazioni → Dispositivi e servizi → Helper)",
    kachel_aria_label_oeffnen: "Apri ricetta {{titel}}",
    sterne_aria_label_gruppe: "La tua valutazione",
    sterne_aria_label: "{{zahl}} su 5 stelle",
    fehler_kein_benutzer_bewertung: "Impossibile determinare il tuo utente - valutazione non possibile.",
    detail_teilen_drucken_btn: "📤 Condividi / Stampa",
    detail_erstellt_von: "👤 Creata da {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} valutazione)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} valutazioni)",
    detail_keine_bewertungen: "Ancora nessuna valutazione",
    detail_deine_bewertung: "La tua valutazione:",
    detail_zubereitet_x: "🍳 preparata {{anzahl}} volte",
    detail_portionen_suffix: "porzioni",
    abschnitt_titel_zutaten: "Ingredienti",
    abschnitt_titel_zubereitung: "Preparazione",
    keine_zutaten: "Nessun ingrediente indicato",
    detail_kommentare_titel: "Commenti",
    detail_keine_kommentare: "Ancora nessun commento",
    detail_kommentar_placeholder: "Aggiunta, consiglio o nota…",
    detail_kommentar_hinzufuegen_btn: "Aggiungi commento",
    detail_bearbeiten_hinweis: "Solo {{name}} (o un amministratore) può modificare o eliminare questa ricetta.",
    detail_ersteller_unbekannt: "chi l'ha creata",
    modal_zubereitet_frage: "Hai preparato \"{{titel}}\"?",
    statistik_btn: "📊 Statistiche",
    statistik_titel: "Statistiche di cucina",
    statistik_info_aria: "Mostra la spiegazione delle statistiche",
    statistik_info_titel: "Come viene calcolata questa statistica?",
    statistik_info_text:
      "Questo riepilogo conta ogni conferma alla domanda «Hai preparato?» - indipendentemente dalla dimensione delle porzioni o da quante volte nello stesso giorno. Se questa domanda è disattivata tramite l'opzione della scheda ask_cooked: false, i numeri smettono di crescere, ma le preparazioni già registrate vengono mantenute.",
    statistik_dieses_jahr: "Hai cucinato {{anzahl}}x dal tuo ricettario nel {{jahr}}",
    statistik_gesamt: "Hai cucinato {{anzahl}}x dal tuo ricettario in totale",
    statistik_top_titel: "Più preparate",
    statistik_keine_daten: "Nessuna preparazione registrata finora.",
    modal_loeschen_frage: "Eliminare davvero \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Sì, elimina",
    wochenplan_titel: "Piano settimanale",
    wochenplan_tab_diese: "Questa settimana",
    wochenplan_tab_folgewoche: "Settimana prossima",
    wochenplan_hinweis_folgewoche: "Pianifica già qui la settimana successiva - passerà automaticamente a \"Questa settimana\" non appena la settimana corrente sarà finita.",
    wochenplan_hinweis_diese: "I giorni trascorsi vengono svuotati automaticamente (la ricetta stessa resta conservata, scompare solo l'assegnazione).",
    wochenplan_hinweis_speicherung: "Viene salvato su tutti i dispositivi (come voce aggiuntiva nascosta nella stessa lista di ricette, non serve nessun altro helper).",
    wochenplan_leer: "Ancora nessuna ricetta - creane prima qualcuna.",
    wochenplan_kein_rezept_option: "– nessuna ricetta –",
    wochenplan_einkaufsliste_btn: "Crea lista della spesa da {{ziel}}",
    wochenplan_wort: "piano settimanale",
    wochenplan_folgewoche_wort: "settimana prossima",
    wochenplan_aktuelle_woche_wort: "settimana corrente",
    wochenplan_keine_zuweisung: "{{zeitraum}} non contiene ancora ricette assegnate.",
    formular_titel_neu: "Nuova ricetta",
    formular_titel_bearbeiten: "Modifica ricetta",
    formular_url_import_btn: "🌐 Importa URL ricetta",
    formular_url_label: "Link al sito web della ricetta",
    formular_url_placeholder: "https://www.esempio-ricette.it/la-mia-ricetta",
    formular_url_hinweis: "Carica la pagina e legge i dati strutturati della ricetta già integrati in essa (gli stessi dati con cui, ad esempio, Google mostra le valutazioni a stelle nella ricerca) - di solito più affidabile del riconoscimento del testo. Funziona solo su siti che forniscono tali dati e non bloccano le richieste automatizzate.",
    formular_url_importieren_btn: "Importa",
    formular_url_laedt: "Caricamento …",
    formular_text_einfuegen_btn: "🔍 Incolla testo della ricetta (riconoscimento automatico)",
    formular_text_label: "Incolla qui il testo della ricetta (es. copiato da un sito di ricette)",
    formular_text_placeholder: "Titolo, ingredienti, preparazione - incolla semplicemente tutto il testo",
    formular_text_hinweis: "Riconoscimento puramente automatico senza IA - funziona meglio con i titoli \"Ingredienti\" e \"Preparazione\" nel testo. Controlla brevemente il risultato in seguito, potrebbe essere incompleto.",
    formular_text_erkennen_btn: "Riconosci",
    formular_json_einfuegen_btn: "📋 Incolla JSON generato dall'IA",
    formular_json_info_aria: "Mostra un prompt pronto per un'IA",
    json_info_titel: "Prompt per un'IA",
    json_info_erklaerung:
      "Copia questo testo, incollalo in un'IA a tua scelta (es. ChatGPT o Claude), allega il testo della tua ricetta e poi incolla la risposta sopra in «Incolla qui il JSON».",
    json_info_prompt:
      "Trasforma il testo della ricetta che ti invierò tra poco in UN unico oggetto JSON - senza spiegazioni, senza testo prima o dopo, solo il JSON. Usa esattamente questo formato:\n\n" +
      "{\n" +
      '  "title": "nome della ricetta",\n' +
      '  "servings": 4,\n' +
      '  "category": "uno tra: {{kategorien}}",\n' +
      '  "ingredients": ["un ingrediente per voce, es. 200 g di farina"],\n' +
      '  "steps": ["un passaggio di preparazione per voce"],\n' +
      '  "tags": ["tag opzionali, es. vegetariano"]\n' +
      "}\n\n" +
      "Regole: «category» deve essere ESATTAMENTE uno dei valori sopra elencati (riportalo invariato, anche se il testo della ricetta è in un'altra lingua - sono valori interni fissi). " +
      "«tags» è facoltativo, va bene anche un array vuoto. " +
      "Non inventare ingredienti o passaggi che non compaiono nel testo. " +
      "Ecco il testo della ricetta:",
    json_info_kopieren_btn: "📋 Copia prompt",
    json_info_kopiert: "Copiato!",
    formular_json_label: "Incolla qui il JSON",
    formular_json_uebernehmen_btn: "Applica",
    formular_label_titel: "Titolo",
    formular_label_kategorie: "Categoria",
    formular_label_tags: "Tag (più possibili, es. \"vegetariano\", \"veloce\")",
    formular_tag_placeholder: "Inserisci e aggiungi un tag",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Rimuovi tag {{tag}}",
    formular_label_portionen: "Porzioni (base)",
    formular_label_zutaten: "Ingredienti",
    formular_zutat_hinzufuegen_btn: "+ Ingrediente",
    formular_zutat_menge_placeholder: "Quantità",
    formular_zutat_einheit_placeholder: "Unità",
    formular_zutat_name_placeholder: "Ingrediente",
    formular_zutat_entfernen_aria: "Rimuovi ingrediente",
    formular_label_zubereitung: "Preparazione (passaggi)",
    formular_schritt_hinzufuegen_btn: "+ Passaggio",
    formular_schritt_placeholder_beispiel: "es. lavare e tagliare le verdure",
    formular_schritt_placeholder_naechster: "passaggio successivo",
    formular_schritt_entfernen_aria: "Rimuovi passaggio",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(presente – un nuovo file la sostituirà)",
    formular_bild_hinweis: "La foto attuale viene mantenuta se non scegli un nuovo file.",
    formular_bild_verkleinern_text: "Riduzione della foto in corso…",
    fehler_url_ungueltig: "Inserisci un indirizzo completo che inizi con http:// o https://.",
    fehler_url_apostroph: "Questo indirizzo contiene un apostrofo (') e purtroppo non può essere importato.",
    fehler_url_keine_ausgabe: "Lo script non ha restituito alcun output. 'rezeptbuch_url_importieren' è configurato in configuration.yaml e Home Assistant è stato riavviato completamente da allora?",
    fehler_url_kein_json: "La risposta dello script di importazione non era un JSON valido.",
    fehler_url_import_fehlgeschlagen: "Importazione URL non riuscita: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Purtroppo non è stato possibile riconoscere nulla nel testo incollato. Compila i campi sottostanti manualmente.",
    warnung_texterkennung_unvollstaendig: "Il riconoscimento è stato incompleto (mancano ingredienti o passaggi, oppure potrebbero essere assegnati in modo errato) - controlla e completa nel modulo.",
    fehler_json_ungueltig: "Il JSON incollato non è valido. Controllalo e riprova.",
    fehler_json_titel_fehlt: "Nel JSON manca almeno il campo 'title'.",
    fehler_titel_fehlt: "Inserisci un titolo.",
    fehler_unerwartet: "Errore imprevisto:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" è stata nel frattempo eliminata da qualcun altro. Le tue modifiche non sono state salvate.",
    fehler_konflikt_geaendert: "\"{{titel}}\" è stata nel frattempo modificata da qualcun altro (es. un commento, una valutazione o una modifica propria).\n\nPer evitare che qualcosa venga sovrascritto, le tue modifiche NON sono state salvate. Apri di nuovo la ricetta e inserisci nuovamente le tue modifiche.",
    fehler_vorgang_fehlgeschlagen: "Operazione non riuscita:\n{{fehler}}",
    fehler_teilen_drucken: "Errore imprevisto durante la condivisione/stampa:\n{{fehler}}",
    fehler_config_entity_fehlt: "Indica 'entity' nella configurazione della card, es. entity: todo.rezepte",
    fehler_bild_lesen: "Impossibile leggere la foto (file danneggiato o non supportato).",
    fehler_bild_verarbeiten: "Impossibile elaborare la foto come immagine (formato non supportato?).",
    teilen_ueberschrift_zutaten: "INGREDIENTI",
    teilen_ueberschrift_zubereitung: "PREPARAZIONE",
    seite_zurueck_btn: "← Indietro",
    seite_weiter_btn: "Avanti →",
    seite_anzeige: "Pagina {{aktuell}} di {{gesamt}}",
    update_neue_version: "Nuova versione disponibile: {{version}}",
    update_ansehen_btn: "Visualizza",
    update_schliessen_aria: "Nascondi avviso",
    detail_kochmodus_btn: "🍳 Modalità cucina",
    kochmodus_schritt_anzeige: "Passo {{aktuell}} di {{gesamt}}",
    kochmodus_schliessen_aria: "Chiudi modalità cucina",
    kochmodus_schritt_zurueck_aria: "Passo precedente",
    kochmodus_schritt_weiter_aria: "Passo successivo",
    kochmodus_zutaten_ein_aria: "Mostra ingredienti",
    kochmodus_zutaten_aus_aria: "Nascondi ingredienti",
    kopf_sammel_pdf_btn: "📚 PDF raccolta",
    sammel_pdf_keine_rezepte: "Nessuna ricetta trovata da esportare.",
    sammel_pdf_frage_toc: "Creare un indice per le ricette selezionate?",
    sammel_pdf_ja_toc_btn: "Sì, crea indice",
    sammel_pdf_nein_toc_btn: "No, senza indice",
    sammel_pdf_name_placeholder: "Nome del ricettario",
    sammel_pdf_erstellen_btn: "Crea PDF",
    abschnitt_titel_inhaltsverzeichnis: "Indice",
    sammel_pdf_frage_umfang: "Quali ricette devono finire nel PDF combinato?",
    sammel_pdf_alle_rezepte_btn: "Tutte le ricette mostrate",
    sammel_pdf_auswahl_btn: "Seleziona ricette specifiche",
    sammel_pdf_auswahl_titel: "Seleziona le ricette",
    sammel_pdf_alle_auswaehlen_link: "Seleziona tutto",
    sammel_pdf_keine_auswaehlen_link: "Deseleziona tutto",
    sammel_pdf_weiter_btn: "Avanti",
    sammel_pdf_auswahl_keine_hinweis: "Seleziona almeno una ricetta.",
  },
  lv: {
    allgemein_zurueck: "← Atpakaļ",
    allgemein_ja: "Jā",
    allgemein_nein: "Nē",
    allgemein_speichern: "Saglabāt",
    allgemein_speichert: "Saglabā…",
    allgemein_abbrechen: "Atcelt",
    allgemein_bearbeiten: "Rediģēt",
    allgemein_loeschen: "Dzēst",
    allgemein_oeffnen: "Atvērt",
    allgemein_unbekannt: "Nezināms",
    allgemein_schliessen: "Aizvērt",
    kategorie_hauptgericht: "Galvenais ēdiens",
    kategorie_vorspeise: "Priekšēdiens",
    kategorie_suppe: "Zupa",
    kategorie_salat: "Salāti",
    kategorie_beilage: "Piedeva",
    kategorie_dessert: "Deserts",
    kategorie_kuchen_gebaeck: "Kūkas un cepumi",
    kategorie_fruehstueck: "Brokastis",
    kategorie_snack: "Uzkoda",
    kategorie_getraenk: "Dzēriens",
    kategorie_sonstiges: "Cits",
    kategorie_filter_alle: "Visi",
    wochentag_montag: "Pirmdiena",
    wochentag_dienstag: "Otrdiena",
    wochentag_mittwoch: "Trešdiena",
    wochentag_donnerstag: "Ceturtdiena",
    wochentag_freitag: "Piektdiena",
    wochentag_samstag: "Sestdiena",
    wochentag_sonntag: "Svētdiena",
    sortier_titel: "Alfabētiskā secībā (A-Z)",
    sortier_bewertung: "Vispirms labākais vērtējums",
    sortier_kategorie: "Pēc kategorijas",
    sortier_neu: "Vispirms jaunākie",
    sortieren_label: "Kārtot pēc:",
    kopf_titel_standard: "Pavārgrāmata",
    kopf_sichern_btn: "💾 Rezerves kopija",
    kopf_wochenplan_btn: "📅 Nedēļas plāns",
    einkaufsmodus_start_btn: "🛒 Iepirkumu saraksts",
    einkaufsmodus_beenden_btn: "✕ Pārtraukt atlasi",
    kopf_neu_btn: "+ Jauns",
    suche_placeholder: "🔍 Recepte vai sastāvdaļas (piem., milti, olas)…",
    kochbuch_loeschen_title: "Dzēst kolekciju",
    kochbuch_loeschen_aria: "Dzēst kolekciju {{name}}",
    kochbuch_speichern_btn: "+ Saglabāt kā gudru kolekciju",
    kochbuch_name_placeholder: "Šīs kolekcijas nosaukums, piem., Rudens receptes",
    fehler_kochbuch_name_fehlt: "Lūdzu, ievadi kolekcijas nosaukumu.",
    kochbuch_info_aria: "Rādīt skaidrojumu par gudrām kolekcijām",
    kochbuch_info_titel: "Kas ir gudra kolekcija?",
    kochbuch_info_text:
      "Gudra kolekcija nesaglabā fiksētu recepšu sarakstu, bet gan " +
      "kategorijas, birku un meklēšanas termina kombināciju tieši " +
      "tādu, kāda tā ir iestatīta saglabāšanas brīdī. Pēc tam tā pati " +
      "atjauninās: jauna recepte, kas atbilst, parādās automātiski, " +
      "un recepte, kuras kategorija vai birkas mainās, var tikpat " +
      "automātiski atkal pazust.",
    einkaufs_zaehler: "{{anzahl}} atlasīti",
    einkaufsliste_erstellen_btn: "Izveidot iepirkumu sarakstu",
    fehler_einkaufsliste_keine_konfiguration: "Iepirkumu sarakstam vēl trūkst konfigurācijas: lūdzu, norādi 'shopping_list_entity' kartītes konfigurācijā (piem., shopping_list_entity: todo.einkaufsliste) - tam nepieciešams OTRS \"Lokālā darāmo darbu saraksta\" palīgs. Skatīt ANLEITUNG-Backup.md, 18. sadaļu.",
    fehler_einkaufsliste_keine_auswahl: "Lūdzu, izvēlies vismaz vienu recepti.",
    fehler_einkaufsliste_keine_zutaten: "Izvēlētajās receptēs nav sastāvdaļu.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Neizdevās pievienot \"{{zeile}}\" iepirkumu sarakstam:\n{{fehler}}\n\nJau pievienotās sastāvdaļas paliek sarakstā.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} sastāvdaļa(s) pievienota(s) sarakstam \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" dzēsta.",
    undo_rueckgaengig_btn: "Atsaukt",
    leer_keine_rezepte: "Vēl nav recepšu – sāc ar \"+ Jauns\"",
    leer_keine_treffer: "Netika atrasta neviena recepte \"{{begriff}}\"",
    fehler_liste_laden_titel: "Neizdevās ielādēt \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Vai šis darāmo darbu saraksts eksistē? (Iestatījumi → Ierīces un pakalpojumi → Palīgi)",
    kachel_aria_label_oeffnen: "Atvērt recepti {{titel}}",
    sterne_aria_label_gruppe: "Tavs vērtējums",
    sterne_aria_label: "{{zahl}} no 5 zvaigznēm",
    fehler_kein_benutzer_bewertung: "Neizdevās noteikt tavu lietotāju - vērtēšana nav iespējama.",
    detail_teilen_drucken_btn: "📤 Kopīgot / Drukāt",
    detail_erstellt_von: "👤 Izveidoja {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} vērtējums)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} vērtējumi)",
    detail_keine_bewertungen: "Vēl nav vērtējumu",
    detail_deine_bewertung: "Tavs vērtējums:",
    detail_zubereitet_x: "🍳 pagatavota {{anzahl}} reizes",
    detail_portionen_suffix: "porcijas",
    abschnitt_titel_zutaten: "Sastāvdaļas",
    abschnitt_titel_zubereitung: "Pagatavošana",
    keine_zutaten: "Sastāvdaļas nav norādītas",
    detail_kommentare_titel: "Komentāri",
    detail_keine_kommentare: "Vēl nav komentāru",
    detail_kommentar_placeholder: "Papildinājums, padoms vai piezīme…",
    detail_kommentar_hinzufuegen_btn: "Pievienot komentāru",
    detail_bearbeiten_hinweis: "Šo recepti drīkst rediģēt vai dzēst tikai {{name}} (vai administrators).",
    detail_ersteller_unbekannt: "autors/autore",
    modal_zubereitet_frage: "Vai pagatavoji \"{{titel}}\"?",
    statistik_btn: "📊 Statistika",
    statistik_titel: "Gatavošanas statistika",
    statistik_info_aria: "Rādīt statistikas skaidrojumu",
    statistik_info_titel: "Kā tiek aprēķināta šī statistika?",
    statistik_info_text:
      "Šis apkopojums saskaita katru apstiprinājumu jautājumam „Vai pagatavoji?“ - neatkarīgi no porcijas lieluma vai reižu skaita tajā pašā dienā. Ja šis jautājums ir atspējots ar kartītes opciju ask_cooked: false, skaitļi vairs nepieaug, bet jau reģistrētās gatavošanas reizes saglabājas.",
    statistik_dieses_jahr: "Tu esi gatavojis/gatavojusi {{anzahl}}x no savas recepšu grāmatas {{jahr}} gadā",
    statistik_gesamt: "Kopā tu esi gatavojis/gatavojusi {{anzahl}}x no savas recepšu grāmatas",
    statistik_top_titel: "Visbiežāk gatavots",
    statistik_keine_daten: "Vēl nav reģistrēta neviena gatavošana.",
    modal_loeschen_frage: "Vai tiešām dzēst \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Jā, dzēst",
    wochenplan_titel: "Nedēļas plāns",
    wochenplan_tab_diese: "Šī nedēļa",
    wochenplan_tab_folgewoche: "Nākamā nedēļa",
    wochenplan_hinweis_folgewoche: "Plāno šeit jau tagad nākamo nedēļu - tā automātiski pārvietosies uz \"Šī nedēļa\", tiklīdz pašreizējā nedēļa būs beigusies.",
    wochenplan_hinweis_diese: "Pagājušās dienas tiek automātiski iztukšotas (pati recepte saglabājas, izzūd tikai piešķīrums).",
    wochenplan_hinweis_speicherung: "Tiek saglabāts visās ierīcēs (kā slēpts papildu ieraksts tajā pašā recepšu sarakstā, papildu palīgs nav nepieciešams).",
    wochenplan_leer: "Vēl nav recepšu - vispirms izveido dažas.",
    wochenplan_kein_rezept_option: "– nav receptes –",
    wochenplan_einkaufsliste_btn: "Izveidot iepirkumu sarakstu no {{ziel}}",
    wochenplan_wort: "nedēļas plāns",
    wochenplan_folgewoche_wort: "nākamā nedēļa",
    wochenplan_aktuelle_woche_wort: "pašreizējā nedēļa",
    wochenplan_keine_zuweisung: "{{zeitraum}} vēl nesatur piešķirtas receptes.",
    formular_titel_neu: "Jauna recepte",
    formular_titel_bearbeiten: "Rediģēt recepti",
    formular_url_import_btn: "🌐 Importēt receptes URL",
    formular_url_label: "Saite uz receptes tīmekļa vietni",
    formular_url_placeholder: "https://www.piemera-receptes.lv/mana-recepte",
    formular_url_hinweis: "Ielādē lapu un nolasa tajā jau iebūvētos receptes strukturētos datus (tos pašus datus, ar kuriem, piem., Google meklēšanā rāda zvaigžņu vērtējumus) - parasti uzticamāk nekā teksta atpazīšana. Darbojas tikai vietnēs, kas sniedz šādus datus un nebloķē automatizētus pieprasījumus.",
    formular_url_importieren_btn: "Importēt",
    formular_url_laedt: "Ielādē …",
    formular_text_einfuegen_btn: "🔍 Ielīmēt receptes tekstu (automātiska atpazīšana)",
    formular_text_label: "Ielīmē šeit receptes tekstu (piem., nokopētu no receptes tīmekļa vietnes)",
    formular_text_placeholder: "Nosaukums, sastāvdaļas, pagatavošana - vienkārši ielīmē visu tekstu",
    formular_text_hinweis: "Tīri automātiska atpazīšana bez MI - vislabāk darbojas ar virsrakstiem \"Sastāvdaļas\" un \"Pagatavošana\" tekstā. Lūdzu, pēc tam īsi pārbaudi rezultātu, tas var būt nepilnīgs.",
    formular_text_erkennen_btn: "Atpazīt",
    formular_json_einfuegen_btn: "📋 Ielīmēt MI izveidotu JSON",
    formular_json_info_aria: "Rādīt gatavu uzvedni MI",
    json_info_titel: "Uzvedne MI",
    json_info_erklaerung:
      "Nokopē šo tekstu, ielīmē to izvēlētā MI (piem., ChatGPT vai Claude), pievieno sava receptes tekstu un tad atbildi ielīmē augstāk laukā „Ielīmē JSON šeit“.",
    json_info_prompt:
      "Pārveido receptes tekstu, ko tūlīt nosūtīšu, par VIENU vienīgu JSON objektu - bez paskaidrojuma, bez teksta pirms vai pēc, tikai JSON. Izmanto tieši šo formātu:\n\n" +
      "{\n" +
      '  "title": "receptes nosaukums",\n' +
      '  "servings": 4,\n' +
      '  "category": "viena no: {{kategorien}}",\n' +
      '  "ingredients": ["viena sastāvdaļa katrā ierakstā, piem., 200 g miltu"],\n' +
      '  "steps": ["viens gatavošanas solis katrā ierakstā"],\n' +
      '  "tags": ["neobligātas atslēgvārdi, piem., veģetārs"]\n' +
      "}\n\n" +
      "Noteikumi: „category“ jābūt TIEŠI vienai no augstāk minētajām vērtībām (pārkopē to nemainītu, pat ja receptes teksts ir citā valodā - tās ir fiksētas iekšējās vērtības). " +
      "„tags“ nav obligāts, der arī tukšs masīvs. " +
      "Neizdomā sastāvdaļas vai soļus, kuru nav tekstā. " +
      "Šeit ir receptes teksts:",
    json_info_kopieren_btn: "📋 Kopēt uzvedni",
    json_info_kopiert: "Nokopēts!",
    formular_json_label: "Ielīmē JSON šeit",
    formular_json_uebernehmen_btn: "Piemērot",
    formular_label_titel: "Nosaukums",
    formular_label_kategorie: "Kategorija",
    formular_label_tags: "Birkas (iespējamas vairākas, piem., \"veģetārs\", \"ātrs\")",
    formular_tag_placeholder: "Ievadi un pievieno birku",
    formular_tag_hinzufuegen_btn: "+ Birka",
    formular_tag_entfernen_aria: "Noņemt birku {{tag}}",
    formular_label_portionen: "Porcijas (bāze)",
    formular_label_zutaten: "Sastāvdaļas",
    formular_zutat_hinzufuegen_btn: "+ Sastāvdaļa",
    formular_zutat_menge_placeholder: "Daudzums",
    formular_zutat_einheit_placeholder: "Mērvienība",
    formular_zutat_name_placeholder: "Sastāvdaļa",
    formular_zutat_entfernen_aria: "Noņemt sastāvdaļu",
    formular_label_zubereitung: "Pagatavošana (soļi)",
    formular_schritt_hinzufuegen_btn: "+ Solis",
    formular_schritt_placeholder_beispiel: "piem., nomazgā un sagriez dārzeņus",
    formular_schritt_placeholder_naechster: "nākamais solis",
    formular_schritt_entfernen_aria: "Noņemt soli",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(ir – jauns fails to aizstās)",
    formular_bild_hinweis: "Pašreizējais foto saglabājas, ja neizvēlies jaunu failu.",
    formular_bild_verkleinern_text: "Foto tiek samazināts…",
    fehler_url_ungueltig: "Lūdzu, ievadi pilnu adresi, kas sākas ar http:// vai https://.",
    fehler_url_apostroph: "Šī adrese satur apostrofu (') un diemžēl to nevar importēt.",
    fehler_url_keine_ausgabe: "Skripts neatgrieza nekādu izvadi. Vai 'rezeptbuch_url_importieren' ir iestatīts failā configuration.yaml un vai Home Assistant kopš tā laika ir pilnībā pārstartēts?",
    fehler_url_kein_json: "Importēšanas skripta atbilde nebija derīgs JSON.",
    fehler_url_import_fehlgeschlagen: "URL importēšana neizdevās: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Diemžēl ielīmētajā tekstā neko neizdevās atpazīt. Lūdzu, aizpildi zemāk esošos laukus manuāli.",
    warnung_texterkennung_unvollstaendig: "Atpazīšana bija nepilnīga (trūkst sastāvdaļu vai soļu, iespējams, tie ir nepareizi piešķirti) - lūdzu, pārbaudi un papildini veidlapā.",
    fehler_json_ungueltig: "Ielīmētais JSON nav derīgs. Lūdzu, pārbaudi to un mēģini vēlreiz.",
    fehler_json_titel_fehlt: "JSON trūkst vismaz lauka 'title'.",
    fehler_titel_fehlt: "Lūdzu, ievadi nosaukumu.",
    fehler_unerwartet: "Negaidīta kļūda:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" jau ir izdzēsusi kāda cita persona. Tavas izmaiņas netika saglabātas.",
    fehler_konflikt_geaendert: "\"{{titel}}\" jau ir mainījusi kāda cita persona (piem., komentārs, vērtējums vai sava rediģēšana).\n\nLai nekas netiktu pārrakstīts, tavas izmaiņas NETIKA saglabātas. Lūdzu, atver recepti vēlreiz un ievadi savas izmaiņas no jauna.",
    fehler_vorgang_fehlgeschlagen: "Darbība neizdevās:\n{{fehler}}",
    fehler_teilen_drucken: "Negaidīta kļūda, kopīgojot/drukājot:\n{{fehler}}",
    fehler_config_entity_fehlt: "Lūdzu, norādi 'entity' kartītes konfigurācijā, piem., entity: todo.rezepte",
    fehler_bild_lesen: "Neizdevās nolasīt foto (fails bojāts vai neatbalstīts).",
    fehler_bild_verarbeiten: "Neizdevās apstrādāt foto kā attēlu (neatbalstīts formāts?).",
    teilen_ueberschrift_zutaten: "SASTĀVDAĻAS",
    teilen_ueberschrift_zubereitung: "PAGATAVOŠANA",
    seite_zurueck_btn: "← Atpakaļ",
    seite_weiter_btn: "Tālāk →",
    seite_anzeige: "{{aktuell}}. lappuse no {{gesamt}}",
    update_neue_version: "Pieejama jauna versija: {{version}}",
    update_ansehen_btn: "Skatīt",
    update_schliessen_aria: "Slēpt paziņojumu",
    detail_kochmodus_btn: "🍳 Gatavošanas režīms",
    kochmodus_schritt_anzeige: "{{aktuell}}. solis no {{gesamt}}",
    kochmodus_schliessen_aria: "Aizvērt gatavošanas režīmu",
    kochmodus_schritt_zurueck_aria: "Iepriekšējais solis",
    kochmodus_schritt_weiter_aria: "Nākamais solis",
    kochmodus_zutaten_ein_aria: "Rādīt sastāvdaļas",
    kochmodus_zutaten_aus_aria: "Slēpt sastāvdaļas",
    kopf_sammel_pdf_btn: "📚 Kopīgais PDF",
    sammel_pdf_keine_rezepte: "Netika atrasta neviena recepte eksportēšanai.",
    sammel_pdf_frage_toc: "Vai izveidot izvēlēto recepšu satura rādītāju?",
    sammel_pdf_ja_toc_btn: "Jā, izveidot satura rādītāju",
    sammel_pdf_nein_toc_btn: "Nē, bez satura rādītāja",
    sammel_pdf_name_placeholder: "Pavārgrāmatas nosaukums",
    sammel_pdf_erstellen_btn: "Izveidot PDF",
    abschnitt_titel_inhaltsverzeichnis: "Satura rādītājs",
    sammel_pdf_frage_umfang: "Kuras receptes iekļaut kopējā PDF?",
    sammel_pdf_alle_rezepte_btn: "Visas parādītās receptes",
    sammel_pdf_auswahl_btn: "Izvēlēties konkrētas receptes",
    sammel_pdf_auswahl_titel: "Izvēlēties receptes",
    sammel_pdf_alle_auswaehlen_link: "Izvēlēties visas",
    sammel_pdf_keine_auswaehlen_link: "Noņemt visas",
    sammel_pdf_weiter_btn: "Tālāk",
    sammel_pdf_auswahl_keine_hinweis: "Lūdzu, izvēlieties vismaz vienu recepti.",
  },
  lt: {
    allgemein_zurueck: "← Atgal",
    allgemein_ja: "Taip",
    allgemein_nein: "Ne",
    allgemein_speichern: "Išsaugoti",
    allgemein_speichert: "Išsaugoma…",
    allgemein_abbrechen: "Atšaukti",
    allgemein_bearbeiten: "Redaguoti",
    allgemein_loeschen: "Ištrinti",
    allgemein_oeffnen: "Atverti",
    allgemein_unbekannt: "Nežinoma",
    allgemein_schliessen: "Uždaryti",
    kategorie_hauptgericht: "Pagrindinis patiekalas",
    kategorie_vorspeise: "Priešpatiekalis",
    kategorie_suppe: "Sriuba",
    kategorie_salat: "Salotos",
    kategorie_beilage: "Garnyras",
    kategorie_dessert: "Desertas",
    kategorie_kuchen_gebaeck: "Pyragai ir kepiniai",
    kategorie_fruehstueck: "Pusryčiai",
    kategorie_snack: "Užkandis",
    kategorie_getraenk: "Gėrimas",
    kategorie_sonstiges: "Kita",
    kategorie_filter_alle: "Visi",
    wochentag_montag: "Pirmadienis",
    wochentag_dienstag: "Antradienis",
    wochentag_mittwoch: "Trečiadienis",
    wochentag_donnerstag: "Ketvirtadienis",
    wochentag_freitag: "Penktadienis",
    wochentag_samstag: "Šeštadienis",
    wochentag_sonntag: "Sekmadienis",
    sortier_titel: "Abėcėlės tvarka (A-Ž)",
    sortier_bewertung: "Geriausiai įvertinti pirmi",
    sortier_kategorie: "Pagal kategoriją",
    sortier_neu: "Naujausi pirmi",
    sortieren_label: "Rikiuoti pagal:",
    kopf_titel_standard: "Receptų knyga",
    kopf_sichern_btn: "💾 Atsarginė kopija",
    kopf_wochenplan_btn: "📅 Savaitės planas",
    einkaufsmodus_start_btn: "🛒 Pirkinių sąrašas",
    einkaufsmodus_beenden_btn: "✕ Baigti pasirinkimą",
    kopf_neu_btn: "+ Naujas",
    suche_placeholder: "🔍 Receptas ar ingredientai (pvz., miltai, kiaušiniai)…",
    kochbuch_loeschen_title: "Ištrinti rinkinį",
    kochbuch_loeschen_aria: "Ištrinti rinkinį {{name}}",
    kochbuch_speichern_btn: "+ Išsaugoti kaip išmanųjį rinkinį",
    kochbuch_name_placeholder: "Šio rinkinio pavadinimas, pvz., Rudens receptai",
    fehler_kochbuch_name_fehlt: "Įvesk rinkinio pavadinimą.",
    kochbuch_info_aria: "Rodyti išmaniųjų rinkinių paaiškinimą",
    kochbuch_info_titel: "Kas yra išmanusis rinkinys?",
    kochbuch_info_text:
      "Išmanusis rinkinys nesaugo fiksuoto receptų sąrašo, o " +
      "kategorijos, žymų ir paieškos termino derinį – tiksliai tokį, " +
      "koks jis nustatytas išsaugojimo metu. Vėliau jis atsinaujina " +
      "pats: naujas tinkantis receptas atsiranda automatiškai, o " +
      "receptas, kurio kategorija ar žymos pasikeičia, gali taip pat " +
      "automatiškai vėl išnykti.",
    einkaufs_zaehler: "Pasirinkta: {{anzahl}}",
    einkaufsliste_erstellen_btn: "Sukurti pirkinių sąrašą",
    fehler_einkaufsliste_keine_konfiguration: "Pirkinių sąrašui dar trūksta konfigūracijos: nurodyk 'shopping_list_entity' kortelės konfigūracijoje (pvz., shopping_list_entity: todo.einkaufsliste) - tam reikalingas ANTRAS \"Vietinio užduočių sąrašo\" pagalbininkas. Žr. ANLEITUNG-Backup.md, 18 skyrių.",
    fehler_einkaufsliste_keine_auswahl: "Pasirink bent vieną receptą.",
    fehler_einkaufsliste_keine_zutaten: "Pasirinktuose receptuose nėra ingredientų.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Nepavyko pridėti \"{{zeile}}\" į pirkinių sąrašą:\n{{fehler}}\n\nJau pridėti ingredientai lieka sąraše.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingredientas(-ai) pridėta(-i) į \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" ištrinta.",
    undo_rueckgaengig_btn: "Anuliuoti",
    leer_keine_rezepte: "Receptų dar nėra – pradėk nuo \"+ Naujas\"",
    leer_keine_treffer: "Receptų pagal \"{{begriff}}\" nerasta",
    fehler_liste_laden_titel: "Nepavyko įkelti \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Ar šis užduočių sąrašas egzistuoja? (Nustatymai → Įrenginiai ir paslaugos → Pagalbininkai)",
    kachel_aria_label_oeffnen: "Atverti receptą {{titel}}",
    sterne_aria_label_gruppe: "Tavo įvertinimas",
    sterne_aria_label: "{{zahl}} iš 5 žvaigždučių",
    fehler_kein_benutzer_bewertung: "Nepavyko nustatyti tavo vartotojo - įvertinti negalima.",
    detail_teilen_drucken_btn: "📤 Bendrinti / Spausdinti",
    detail_erstellt_von: "👤 Sukūrė {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} įvertinimas)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} įvertinimai)",
    detail_keine_bewertungen: "Įvertinimų dar nėra",
    detail_deine_bewertung: "Tavo įvertinimas:",
    detail_zubereitet_x: "🍳 pagaminta {{anzahl}} kartus",
    detail_portionen_suffix: "porcijos",
    abschnitt_titel_zutaten: "Ingredientai",
    abschnitt_titel_zubereitung: "Gaminimas",
    keine_zutaten: "Ingredientų nenurodyta",
    detail_kommentare_titel: "Komentarai",
    detail_keine_kommentare: "Komentarų dar nėra",
    detail_kommentar_placeholder: "Papildymas, patarimas ar pastaba…",
    detail_kommentar_hinzufuegen_btn: "Pridėti komentarą",
    detail_bearbeiten_hinweis: "Šį receptą redaguoti ar ištrinti gali tik {{name}} (arba administratorius).",
    detail_ersteller_unbekannt: "autorius (-ė)",
    modal_zubereitet_frage: "Ar pagaminai \"{{titel}}\"?",
    statistik_btn: "📊 Statistika",
    statistik_titel: "Gaminimo statistika",
    statistik_info_aria: "Rodyti statistikos paaiškinimą",
    statistik_info_titel: "Kaip skaičiuojama ši statistika?",
    statistik_info_text:
      "Šioje apžvalgoje skaičiuojamas kiekvienas patvirtinimas į klausimą „Ar paruošei?“ - nepriklausomai nuo porcijos dydžio ar kartų skaičiaus tą pačią dieną. Jei šis klausimas išjungtas naudojant kortelės parinktį ask_cooked: false, skaičiai nebeauga, tačiau jau užfiksuoti gaminimai išlieka.",
    statistik_dieses_jahr: "{{jahr}} m. gaminai {{anzahl}}x iš savo receptų knygos",
    statistik_gesamt: "Iš viso gaminai {{anzahl}}x iš savo receptų knygos",
    statistik_top_titel: "Dažniausiai gaminami",
    statistik_keine_daten: "Kol kas neužfiksuota jokių gaminimų.",
    modal_loeschen_frage: "Tikrai ištrinti \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Taip, ištrinti",
    wochenplan_titel: "Savaitės planas",
    wochenplan_tab_diese: "Ši savaitė",
    wochenplan_tab_folgewoche: "Kita savaitė",
    wochenplan_hinweis_folgewoche: "Suplanuok čia jau dabar ateinančią savaitę - ji automatiškai persikels į \"Ši savaitė\", vos tik pasibaigs dabartinė savaitė.",
    wochenplan_hinweis_diese: "Praėjusios dienos automatiškai išvalomos (pats receptas išlieka, dingsta tik priskyrimas).",
    wochenplan_hinweis_speicherung: "Išsaugoma visuose įrenginiuose (kaip paslėptas papildomas įrašas tame pačiame receptų sąraše, papildomas pagalbininkas nereikalingas).",
    wochenplan_leer: "Receptų dar nėra - pirmiausia sukurk keletą.",
    wochenplan_kein_rezept_option: "– nėra recepto –",
    wochenplan_einkaufsliste_btn: "Sukurti pirkinių sąrašą iš {{ziel}}",
    wochenplan_wort: "savaitės planas",
    wochenplan_folgewoche_wort: "kita savaitė",
    wochenplan_aktuelle_woche_wort: "dabartinė savaitė",
    wochenplan_keine_zuweisung: "{{zeitraum}} dar neturi priskirtų receptų.",
    formular_titel_neu: "Naujas receptas",
    formular_titel_bearbeiten: "Redaguoti receptą",
    formular_url_import_btn: "🌐 Importuoti recepto URL",
    formular_url_label: "Nuoroda į recepto svetainę",
    formular_url_placeholder: "https://www.pavyzdys-receptai.lt/mano-receptas",
    formular_url_hinweis: "Įkelia puslapį ir nuskaito jame jau įtaisytus struktūrizuotus recepto duomenis (tuos pačius duomenis, kuriais, pvz., \"Google\" rodo žvaigždučių įvertinimus paieškoje) - paprastai patikimiau nei teksto atpažinimas. Veikia tik svetainėse, kurios pateikia tokius duomenis ir neblokuoja automatizuotų užklausų.",
    formular_url_importieren_btn: "Importuoti",
    formular_url_laedt: "Įkeliama …",
    formular_text_einfuegen_btn: "🔍 Įklijuoti recepto tekstą (automatinis atpažinimas)",
    formular_text_label: "Įklijuok čia recepto tekstą (pvz., nukopijuotą iš recepto svetainės)",
    formular_text_placeholder: "Pavadinimas, ingredientai, gaminimas - tiesiog įklijuok visą tekstą",
    formular_text_hinweis: "Grynai automatinis atpažinimas be DI - geriausiai veikia su antraštėmis \"Ingredientai\" ir \"Gaminimas\" tekste. Vėliau trumpai patikrink rezultatą, jis gali būti neišsamus.",
    formular_text_erkennen_btn: "Atpažinti",
    formular_json_einfuegen_btn: "📋 Įklijuoti DI sugeneruotą JSON",
    formular_json_info_aria: "Rodyti paruoštą užklausą DI",
    json_info_titel: "Užklausa DI",
    json_info_erklaerung:
      "Nukopijuok šį tekstą, įklijuok jį į pasirinktą DI (pvz., ChatGPT arba Claude), pridėk savo recepto tekstą, o gautą atsakymą tada įklijuok aukščiau, lauke „Įklijuok JSON čia“.",
    json_info_prompt:
      "Paverstk recepto tekstą, kurį tuoj atsiųsiu, į VIENĄ vienintelį JSON objektą - be paaiškinimų, be teksto prieš ar po jo, tik JSON. Naudok būtent tokį formatą:\n\n" +
      "{\n" +
      '  "title": "recepto pavadinimas",\n' +
      '  "servings": 4,\n' +
      '  "category": "vieną iš: {{kategorien}}",\n' +
      '  "ingredients": ["vienas ingredientas viename įraše, pvz., 200 g miltų"],\n' +
      '  "steps": ["vienas gaminimo žingsnis viename įraše"],\n' +
      '  "tags": ["neprivalomos žymos, pvz., vegetariška"]\n' +
      "}\n\n" +
      "Taisyklės: „category“ turi būti LYGIAI viena iš aukščiau išvardytų reikšmių (perkelk nepakeistą, net jei recepto tekstas yra kita kalba - tai fiksuotos vidinės reikšmės). " +
      "„tags“ nebūtina, tinka ir tuščias masyvas. " +
      "Neišgalvok ingredientų ar žingsnių, kurių nėra tekste. " +
      "Štai recepto tekstas:",
    json_info_kopieren_btn: "📋 Kopijuoti užklausą",
    json_info_kopiert: "Nukopijuota!",
    formular_json_label: "Įklijuok JSON čia",
    formular_json_uebernehmen_btn: "Taikyti",
    formular_label_titel: "Pavadinimas",
    formular_label_kategorie: "Kategorija",
    formular_label_tags: "Žymos (galimos kelios, pvz., \"vegetariška\", \"greita\")",
    formular_tag_placeholder: "Įvesk ir pridėk žymą",
    formular_tag_hinzufuegen_btn: "+ Žyma",
    formular_tag_entfernen_aria: "Pašalinti žymą {{tag}}",
    formular_label_portionen: "Porcijos (bazinis kiekis)",
    formular_label_zutaten: "Ingredientai",
    formular_zutat_hinzufuegen_btn: "+ Ingredientas",
    formular_zutat_menge_placeholder: "Kiekis",
    formular_zutat_einheit_placeholder: "Matavimo vienetas",
    formular_zutat_name_placeholder: "Ingredientas",
    formular_zutat_entfernen_aria: "Pašalinti ingredientą",
    formular_label_zubereitung: "Gaminimas (žingsniai)",
    formular_schritt_hinzufuegen_btn: "+ Žingsnis",
    formular_schritt_placeholder_beispiel: "pvz., nuplauk ir supjaustyk daržoves",
    formular_schritt_placeholder_naechster: "kitas žingsnis",
    formular_schritt_entfernen_aria: "Pašalinti žingsnį",
    formular_label_bild: "Nuotrauka",
    formular_bild_vorhanden_hinweis: "(yra – naujas failas ją pakeis)",
    formular_bild_hinweis: "Dabartinė nuotrauka išlieka, jei nepasirenki naujo failo.",
    formular_bild_verkleinern_text: "Nuotrauka mažinama…",
    fehler_url_ungueltig: "Įvesk pilną adresą, prasidedantį http:// arba https://.",
    fehler_url_apostroph: "Šiame adrese yra apostrofas (') ir, deja, jo importuoti negalima.",
    fehler_url_keine_ausgabe: "Skriptas negrąžino jokios išvesties. Ar 'rezeptbuch_url_importieren' sukonfigūruotas faile configuration.yaml ir ar nuo tada Home Assistant buvo visiškai perkrautas?",
    fehler_url_kein_json: "Importavimo skripto atsakymas nebuvo tinkamas JSON.",
    fehler_url_import_fehlgeschlagen: "Nepavyko importuoti URL: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Deja, įklijuotame tekste nepavyko nieko atpažinti. Užpildyk laukus žemiau ranka.",
    warnung_texterkennung_unvollstaendig: "Atpažinimas buvo neišsamus (trūksta ingredientų ar žingsnių, galbūt jie priskirti neteisingai) - patikrink ir papildyk formoje.",
    fehler_json_ungueltig: "Įklijuotas JSON netinkamas. Patikrink jį ir bandyk dar kartą.",
    fehler_json_titel_fehlt: "JSON trūksta bent lauko 'title'.",
    fehler_titel_fehlt: "Įvesk pavadinimą.",
    fehler_unerwartet: "Netikėta klaida:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" tuo tarpu ištrynė kažkas kitas. Tavo pakeitimai neišsaugoti.",
    fehler_konflikt_geaendert: "\"{{titel}}\" tuo tarpu pakeitė kažkas kitas (pvz., komentaras, įvertinimas ar savas redagavimas).\n\nKad nieko neperrašytų, tavo pakeitimai NEBUVO išsaugoti. Atverk receptą iš naujo ir įvesk savo pakeitimus dar kartą.",
    fehler_vorgang_fehlgeschlagen: "Veiksmas nepavyko:\n{{fehler}}",
    fehler_teilen_drucken: "Netikėta klaida bendrinant / spausdinant:\n{{fehler}}",
    fehler_config_entity_fehlt: "Nurodyk 'entity' kortelės konfigūracijoje, pvz., entity: todo.rezepte",
    fehler_bild_lesen: "Nepavyko perskaityti nuotraukos (failas sugadintas arba nepalaikomas).",
    fehler_bild_verarbeiten: "Nepavyko apdoroti nuotraukos kaip paveikslėlio (nepalaikomas formatas?).",
    teilen_ueberschrift_zutaten: "INGREDIENTAI",
    teilen_ueberschrift_zubereitung: "GAMINIMAS",
    seite_zurueck_btn: "← Atgal",
    seite_weiter_btn: "Kitas →",
    seite_anzeige: "{{aktuell}} psl. iš {{gesamt}}",
    update_neue_version: "Yra nauja versija: {{version}}",
    update_ansehen_btn: "Žiūrėti",
    update_schliessen_aria: "Slėpti pranešimą",
    detail_kochmodus_btn: "🍳 Gaminimo režimas",
    kochmodus_schritt_anzeige: "{{aktuell}} veiksmas iš {{gesamt}}",
    kochmodus_schliessen_aria: "Uždaryti gaminimo režimą",
    kochmodus_schritt_zurueck_aria: "Ankstesnis veiksmas",
    kochmodus_schritt_weiter_aria: "Kitas veiksmas",
    kochmodus_zutaten_ein_aria: "Rodyti ingredientus",
    kochmodus_zutaten_aus_aria: "Slėpti ingredientus",
    kopf_sammel_pdf_btn: "📚 Bendras PDF",
    sammel_pdf_keine_rezepte: "Nerasta receptų eksportavimui.",
    sammel_pdf_frage_toc: "Ar sukurti pasirinktų receptų turinį?",
    sammel_pdf_ja_toc_btn: "Taip, sukurti turinį",
    sammel_pdf_nein_toc_btn: "Ne, be turinio",
    sammel_pdf_name_placeholder: "Receptų knygos pavadinimas",
    sammel_pdf_erstellen_btn: "Sukurti PDF",
    abschnitt_titel_inhaltsverzeichnis: "Turinys",
    sammel_pdf_frage_umfang: "Kurie receptai turėtų atsidurti bendrame PDF?",
    sammel_pdf_alle_rezepte_btn: "Visi rodomi receptai",
    sammel_pdf_auswahl_btn: "Pasirinkti konkrečius receptus",
    sammel_pdf_auswahl_titel: "Pasirinkti receptus",
    sammel_pdf_alle_auswaehlen_link: "Pasirinkti visus",
    sammel_pdf_keine_auswaehlen_link: "Atžymėti visus",
    sammel_pdf_weiter_btn: "Toliau",
    sammel_pdf_auswahl_keine_hinweis: "Pasirinkite bent vieną receptą.",
  },
  mt: {
    allgemein_zurueck: "← Lura",
    allgemein_ja: "Iva",
    allgemein_nein: "Le",
    allgemein_speichern: "Issejvja",
    allgemein_speichert: "Qed jissejvja…",
    allgemein_abbrechen: "Ikkanċella",
    allgemein_bearbeiten: "Editja",
    allgemein_loeschen: "Ħassar",
    allgemein_oeffnen: "Iftaħ",
    allgemein_unbekannt: "Mhux Magħruf",
    allgemein_schliessen: "Agħlaq",
    kategorie_hauptgericht: "Platt Prinċipali",
    kategorie_vorspeise: "Dixx tal-bidu",
    kategorie_suppe: "Soppa",
    kategorie_salat: "Insalata",
    kategorie_beilage: "Kontorn",
    kategorie_dessert: "Ħelu",
    kategorie_kuchen_gebaeck: "Kejkijiet u Ħami",
    kategorie_fruehstueck: "Kolazzjon",
    kategorie_snack: "Ikel ħafif",
    kategorie_getraenk: "Xarba",
    kategorie_sonstiges: "Oħrajn",
    kategorie_filter_alle: "Kollha",
    wochentag_montag: "It-Tnejn",
    wochentag_dienstag: "It-Tlieta",
    wochentag_mittwoch: "L-Erbgħa",
    wochentag_donnerstag: "Il-Ħamis",
    wochentag_freitag: "Il-Ġimgħa",
    wochentag_samstag: "Is-Sibt",
    wochentag_sonntag: "Il-Ħadd",
    sortier_titel: "Alfabetiku (A-Ż)",
    sortier_bewertung: "L-aħjar rating l-ewwel",
    sortier_kategorie: "Skont il-kategorija",
    sortier_neu: "L-aktar riċenti l-ewwel",
    sortieren_label: "Issortja skont:",
    kopf_titel_standard: "Ktieb tar-Riċetti",
    kopf_sichern_btn: "💾 Kopja ta' Sigurtà",
    kopf_wochenplan_btn: "📅 Pjan tal-Ġimgħa",
    einkaufsmodus_start_btn: "🛒 Lista tax-Xiri",
    einkaufsmodus_beenden_btn: "✕ Waqqaf l-għażla",
    kopf_neu_btn: "+ Ġdid",
    suche_placeholder: "🔍 Riċetta jew ingredjenti (eż. dqiq, bajd)…",
    kochbuch_loeschen_title: "Ħassar il-ġabra",
    kochbuch_loeschen_aria: "Ħassar il-ġabra {{name}}",
    kochbuch_speichern_btn: "+ Issejvja bħala ġabra intelliġenti",
    kochbuch_name_placeholder: "Isem għal din il-ġabra, eż. Riċetti tal-Ħarifa",
    fehler_kochbuch_name_fehlt: "Jekk jogħġbok daħħal isem għall-ġabra.",
    kochbuch_info_aria: "Uri spjegazzjoni tal-ġabriet intelliġenti",
    kochbuch_info_titel: "X'inhi ġabra intelliġenti?",
    kochbuch_info_text:
      "Ġabra intelliġenti ma taħżinx lista fissa ta' riċetti, iżda " +
      "taħżen taħlita ta' kategorija, tikketti u terminu ta' " +
      "tfittxija, eżatt kif huma stabbiliti fil-mument tas-salvataġġ. " +
      "Wara dan tinbidel waħedha: riċetta ġdida li taqbel tidher " +
      "awtomatikament, u riċetta li l-kategorija jew it-tikketti " +
      "tagħha jinbidlu tista' bl-istess mod tisparixxi awtomatikament " +
      "mill-ġdid.",
    einkaufs_zaehler: "{{anzahl}} magħżula",
    einkaufsliste_erstellen_btn: "Oħloq lista tax-xiri",
    fehler_einkaufsliste_keine_konfiguration: "Il-konfigurazzjoni għal-lista tax-xiri għadha nieqsa: jekk jogħġbok speċifika 'shopping_list_entity' fil-konfigurazzjoni tal-kard (eż. shopping_list_entity: todo.einkaufsliste) - għal dan hemm bżonn TIENI għajnuna \"Lista ta' xogħol lokali\". Ara ANLEITUNG-Backup.md, taqsima 18.",
    fehler_einkaufsliste_keine_auswahl: "Jekk jogħġbok agħżel mill-inqas riċetta waħda.",
    fehler_einkaufsliste_keine_zutaten: "Ir-riċetti magħżula ma fihom l-ebda ingredjent.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Ma setax jiżdied \"{{zeile}}\" mal-lista tax-xiri:\n{{fehler}}\n\nL-ingredjenti li diġà ġew miżjuda jibqgħu fil-lista.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingredjent(i) miżjuda ma' \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" tħassret.",
    undo_rueckgaengig_btn: "Ħassar l-azzjoni",
    leer_keine_rezepte: "Għadu m'hemm l-ebda riċetta – ibda b'\"+ Ġdid\"",
    leer_keine_treffer: "Ma nstabet l-ebda riċetta għal \"{{begriff}}\"",
    fehler_liste_laden_titel: "Ma setax jitgħabba \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Din il-lista ta' xogħol teżisti? (Settings → Devices & Services → Helpers)",
    kachel_aria_label_oeffnen: "Iftaħ ir-riċetta {{titel}}",
    sterne_aria_label_gruppe: "Ir-rating tiegħek",
    sterne_aria_label: "{{zahl}} minn 5 stilel",
    fehler_kein_benutzer_bewertung: "Ma setax jiġi stabbilit l-utent tiegħek - ir-rating mhux possibbli.",
    detail_teilen_drucken_btn: "📤 Aqsam / Ipprintja",
    detail_erstellt_von: "👤 Maħluqa minn {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} rating)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} ratings)",
    detail_keine_bewertungen: "Għad m'hemm l-ebda rating",
    detail_deine_bewertung: "Ir-rating tiegħek:",
    detail_zubereitet_x: "🍳 imħejjija {{anzahl}} darba/darbiet",
    detail_portionen_suffix: "porzjonijiet",
    abschnitt_titel_zutaten: "Ingredjenti",
    abschnitt_titel_zubereitung: "Preparazzjoni",
    keine_zutaten: "L-ebda ingredjent mniżżel",
    detail_kommentare_titel: "Kummenti",
    detail_keine_kommentare: "Għad m'hemm l-ebda kumment",
    detail_kommentar_placeholder: "Żieda, parir jew nota…",
    detail_kommentar_hinzufuegen_btn: "Żid kumment",
    detail_bearbeiten_hinweis: "Din ir-riċetta tista' tiġi editjata jew imħassra biss minn {{name}} (jew amministratur).",
    detail_ersteller_unbekannt: "min ħolqot/ħalaq ir-riċetta",
    modal_zubereitet_frage: "Ħejjejt \"{{titel}}\"?",
    statistik_btn: "📊 Statistika",
    statistik_titel: "Statistika tat-tisjir",
    statistik_info_aria: "Uri spjegazzjoni tal-istatistika",
    statistik_info_titel: "Kif tiġi kkalkulata din l-istatistika?",
    statistik_info_text:
      "Din il-valutazzjoni tgħodd kull konferma tal-mistoqsija „Ħejjejtu?“ - irrispettivament mid-daqs tal-porzjon jew kemm-il darba fl-istess jum. Jekk din il-mistoqsija tkun diżattivata permezz tal-għażla tal-karta ask_cooked: false, in-numri jieqfu jikbru, iżda t-tħejjijiet diġà rreġistrati jibqgħu.",
    statistik_dieses_jahr: "Sajjart {{anzahl}}x mill-ktieb tar-riċetti tiegħek fis-sena {{jahr}}",
    statistik_gesamt: "Sajjart {{anzahl}}x mill-ktieb tar-riċetti tiegħek b'kollox",
    statistik_top_titel: "L-aktar imħejji",
    statistik_keine_daten: "Għadha ma ġiet irreġistrata l-ebda tħejjija.",
    modal_loeschen_frage: "Tassew tħassar \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Iva, ħassar",
    wochenplan_titel: "Pjan tal-Ġimgħa",
    wochenplan_tab_diese: "Din il-ġimgħa",
    wochenplan_tab_folgewoche: "Il-ġimgħa d-dieħla",
    wochenplan_hinweis_folgewoche: "Ippjana hawn diġà l-ġimgħa li ġejja - din tiċċaqlaq awtomatikament għal \"Din il-ġimgħa\" hekk kif tispiċċa l-ġimgħa attwali.",
    wochenplan_hinweis_diese: "Il-ġranet li għaddew jitbattlu awtomatikament (ir-riċetta nnifisha tibqa' tinżamm, jgħib biss l-assenjament).",
    wochenplan_hinweis_speicherung: "Jinżamm salvat fuq id-diversi apparati (bħala entrata addizzjonali moħbija fl-istess lista tar-riċetti, ma hemmx bżonn ta' għajnuna oħra).",
    wochenplan_leer: "Għadu m'hemm l-ebda riċetta - l-ewwel oħloq xi wħud.",
    wochenplan_kein_rezept_option: "– l-ebda riċetta –",
    wochenplan_einkaufsliste_btn: "Oħloq lista tax-xiri minn {{ziel}}",
    wochenplan_wort: "pjan tal-ġimgħa",
    wochenplan_folgewoche_wort: "il-ġimgħa d-dieħla",
    wochenplan_aktuelle_woche_wort: "il-ġimgħa attwali",
    wochenplan_keine_zuweisung: "{{zeitraum}} għadu ma fihx riċetti assenjati.",
    formular_titel_neu: "Riċetta ġdida",
    formular_titel_bearbeiten: "Editja r-riċetta",
    formular_url_import_btn: "🌐 Importa URL tar-riċetta",
    formular_url_label: "Link għas-sit web tar-riċetta",
    formular_url_placeholder: "https://www.ricetti-ezempju.mt/ir-ricetta-tieghi",
    formular_url_hinweis: "Itella' l-paġna u jaqra d-dejta strutturata tar-riċetta li diġà tinsab imwaħħla fiha (l-istess dejta li, pereżempju, Google juża biex juri r-ratings bil-kwiekeb fit-tiftix) - ġeneralment aktar affidabbli mir-rikonoxximent tat-test. Jaħdem biss fuq siti li jipprovdu dejta bħal din u ma jimblukkawx talbiet awtomatizzati.",
    formular_url_importieren_btn: "Importa",
    formular_url_laedt: "Qed itella' …",
    formular_text_einfuegen_btn: "🔍 Waħħal it-test tar-riċetta (rikonoxximent awtomatiku)",
    formular_text_label: "Waħħal hawn it-test tar-riċetta (eż. ikkupjat minn sit web ta' riċetti)",
    formular_text_placeholder: "Titlu, ingredjenti, preparazzjoni - sempliċiment waħħal it-test kollu",
    formular_text_hinweis: "Rikonoxximent purament awtomatiku mingħajr AI - jaħdem l-aħjar bl-intestaturi \"Ingredjenti\" u \"Preparazzjoni\" fit-test. Jekk jogħġbok iċċekkja fil-qosor ir-riżultat wara, jista' jkun mhux komplut.",
    formular_text_erkennen_btn: "Agħraf",
    formular_json_einfuegen_btn: "📋 Waħħal JSON iġġenerat mill-AI",
    formular_json_info_aria: "Uri prompt lest għal AI",
    json_info_titel: "Prompt għal AI",
    json_info_erklaerung:
      "Ikkopja dan it-test, waħħlu f'AI tal-għażla tiegħek (eż. ChatGPT jew Claude), żid it-test tar-riċetta tiegħek u mbagħad waħħal it-tweġiba fuq f'„Waħħal il-JSON hawn“.",
    json_info_prompt:
      "Ibdel it-test tar-riċetta li ser nibgħatlek issa f'objett JSON WIEĦED biss - mingħajr spjegazzjoni, mingħajr test qabel jew wara, il-JSON biss. Uża eżatt dan il-format:\n\n" +
      "{\n" +
      '  "title": "isem ir-riċetta",\n' +
      '  "servings": 4,\n' +
      '  "category": "waħda minn: {{kategorien}}",\n' +
      '  "ingredients": ["ingredjent wieħed kull entrata, eż. 200 g dqiq"],\n' +
      '  "steps": ["pass wieħed tal-preparazzjoni kull entrata"],\n' +
      '  "tags": ["tikketti fakultattivi, eż. veġetarjan"]\n' +
      "}\n\n" +
      "Regoli: „category“ trid tkun EŻATT waħda mill-valuri elenkati hawn fuq (ikkopjaha bla tibdil, anke jekk it-test tar-riċetta jkun b'lingwa oħra - dawn huma valuri interni fissi). " +
      "„tags“ mhix obbligatorja, arrejj vojt tajjeb ukoll. " +
      "Tivvintax ingredjenti jew passi li mhumiex fit-test. " +
      "Hawn hu t-test tar-riċetta:",
    json_info_kopieren_btn: "📋 Ikkopja l-prompt",
    json_info_kopiert: "Ikkopjat!",
    formular_json_label: "Waħħal il-JSON hawn",
    formular_json_uebernehmen_btn: "Applika",
    formular_label_titel: "Titlu",
    formular_label_kategorie: "Kategorija",
    formular_label_tags: "Tags (jistgħu jintużaw aktar minn wieħed, eż. \"veġetarjan\", \"malajr\")",
    formular_tag_placeholder: "Daħħal u żid tag",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Neħħi t-tag {{tag}}",
    formular_label_portionen: "Porzjonijiet (bażi)",
    formular_label_zutaten: "Ingredjenti",
    formular_zutat_hinzufuegen_btn: "+ Ingredjent",
    formular_zutat_menge_placeholder: "Kwantità",
    formular_zutat_einheit_placeholder: "Unità",
    formular_zutat_name_placeholder: "Ingredjent",
    formular_zutat_entfernen_aria: "Neħħi l-ingredjent",
    formular_label_zubereitung: "Preparazzjoni (passi)",
    formular_schritt_hinzufuegen_btn: "+ Pass",
    formular_schritt_placeholder_beispiel: "eż. aħsel u aqta' l-ħaxix",
    formular_schritt_placeholder_naechster: "pass li jmiss",
    formular_schritt_entfernen_aria: "Neħħi l-pass",
    formular_label_bild: "Ritratt",
    formular_bild_vorhanden_hinweis: "(jeżisti – fajl ġdid se jissostitwih)",
    formular_bild_hinweis: "Ir-ritratt attwali jibqa' jekk ma tagħżilx fajl ġdid.",
    formular_bild_verkleinern_text: "Ir-ritratt qed jiġi mnaqqas…",
    fehler_url_ungueltig: "Jekk jogħġbok daħħal indirizz sħiħ li jibda b'http:// jew https://.",
    fehler_url_apostroph: "Dan l-indirizz fih apostrofu (') u sfortunatament ma jistax jiġi importat.",
    fehler_url_keine_ausgabe: "L-iskript ma tax l-ebda output. 'rezeptbuch_url_importieren' hu kkonfigurat f'configuration.yaml u minn dakinhar Home Assistant ġie irriavvjat kompletament?",
    fehler_url_kein_json: "It-tweġiba tal-iskript tal-importazzjoni ma kinitx JSON validu.",
    fehler_url_import_fehlgeschlagen: "L-importazzjoni tal-URL falliet: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Sfortunatament ma setax jiġi rikonoxxut xejn fit-test imwaħħal. Jekk jogħġbok imla l-oqsma hawn taħt bl-idejn.",
    warnung_texterkennung_unvollstaendig: "Ir-rikonoxximent kien mhux komplut (l-ingredjenti jew il-passi neqsin/jistgħu jkunu assenjati ħażin) - jekk jogħġbok iċċekkja u kkompleta fil-formola.",
    fehler_json_ungueltig: "Il-JSON imwaħħal mhux validu. Jekk jogħġbok iċċekkjah u erġa' pprova.",
    fehler_json_titel_fehlt: "Fil-JSON tal-inqas nieqes il-qasam 'title'.",
    fehler_titel_fehlt: "Jekk jogħġbok daħħal titlu.",
    fehler_unerwartet: "Żball mhux mistenni:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" sadanittant tħassret minn xi ħadd ieħor. Il-bidliet tiegħek ma ġewx salvati.",
    fehler_konflikt_geaendert: "\"{{titel}}\" sadanittant inbidlet minn xi ħadd ieħor (eż. kumment, rating jew editjar tiegħu stess).\n\nBiex xejn ma jiġi miktub fuqu, il-bidliet tiegħek MA ġewx salvati. Jekk jogħġbok erġa' iftaħ ir-riċetta u daħħal il-bidliet tiegħek mill-ġdid.",
    fehler_vorgang_fehlgeschlagen: "L-azzjoni falliet:\n{{fehler}}",
    fehler_teilen_drucken: "Żball mhux mistenni waqt il-qsim/l-istampar:\n{{fehler}}",
    fehler_config_entity_fehlt: "Jekk jogħġbok speċifika 'entity' fil-konfigurazzjoni tal-kard, eż. entity: todo.rezepte",
    fehler_bild_lesen: "Ir-ritratt ma setax jinqara (fajl korrott jew mhux appoġġat).",
    fehler_bild_verarbeiten: "Ir-ritratt ma setax jiġi pproċessat bħala immaġni (format mhux appoġġat?).",
    teilen_ueberschrift_zutaten: "INGREDJENTI",
    teilen_ueberschrift_zubereitung: "PREPARAZZJONI",
    seite_zurueck_btn: "← Lura",
    seite_weiter_btn: "Li jmiss →",
    seite_anzeige: "Paġna {{aktuell}} minn {{gesamt}}",
    update_neue_version: "Verżjoni ġdida disponibbli: {{version}}",
    update_ansehen_btn: "Ara",
    update_schliessen_aria: "Aħbi n-notifika",
    detail_kochmodus_btn: "🍳 Modalità tat-Tisjir",
    kochmodus_schritt_anzeige: "Pass {{aktuell}} minn {{gesamt}}",
    kochmodus_schliessen_aria: "Agħlaq il-modalità tat-tisjir",
    kochmodus_schritt_zurueck_aria: "Pass ta' qabel",
    kochmodus_schritt_weiter_aria: "Pass li jmiss",
    kochmodus_zutaten_ein_aria: "Uri l-ingredjenti",
    kochmodus_zutaten_aus_aria: "Aħbi l-ingredjenti",
    kopf_sammel_pdf_btn: "📚 PDF Miġbura",
    sammel_pdf_keine_rezepte: "Ma nstab l-ebda riċetta biex tiġi esportata.",
    sammel_pdf_frage_toc: "Toħloq werrej għar-riċetti magħżula?",
    sammel_pdf_ja_toc_btn: "Iva, oħloq werrej",
    sammel_pdf_nein_toc_btn: "Le, mingħajr werrej",
    sammel_pdf_name_placeholder: "Isem tal-ktieb tat-tisjir",
    sammel_pdf_erstellen_btn: "Oħloq PDF",
    abschnitt_titel_inhaltsverzeichnis: "Werrej",
    sammel_pdf_frage_umfang: "Liema riċetti għandhom jidħlu fil-PDF ġenerali?",
    sammel_pdf_alle_rezepte_btn: "Ir-riċetti kollha murija",
    sammel_pdf_auswahl_btn: "Agħżel riċetti speċifiċi",
    sammel_pdf_auswahl_titel: "Agħżel ir-riċetti",
    sammel_pdf_alle_auswaehlen_link: "Agħżel kollox",
    sammel_pdf_keine_auswaehlen_link: "Neħħi l-għażla",
    sammel_pdf_weiter_btn: "Li jmiss",
    sammel_pdf_auswahl_keine_hinweis: "Jekk jogħġbok agħżel mill-inqas riċetta waħda.",
  },
  pl: {
    allgemein_zurueck: "← Wstecz",
    allgemein_ja: "Tak",
    allgemein_nein: "Nie",
    allgemein_speichern: "Zapisz",
    allgemein_speichert: "Zapisywanie…",
    allgemein_abbrechen: "Anuluj",
    allgemein_bearbeiten: "Edytuj",
    allgemein_loeschen: "Usuń",
    allgemein_oeffnen: "Otwórz",
    allgemein_unbekannt: "Nieznane",
    allgemein_schliessen: "Zamknij",
    kategorie_hauptgericht: "Danie główne",
    kategorie_vorspeise: "Przystawka",
    kategorie_suppe: "Zupa",
    kategorie_salat: "Sałatka",
    kategorie_beilage: "Dodatek",
    kategorie_dessert: "Deser",
    kategorie_kuchen_gebaeck: "Ciasta i wypieki",
    kategorie_fruehstueck: "Śniadanie",
    kategorie_snack: "Przekąska",
    kategorie_getraenk: "Napój",
    kategorie_sonstiges: "Inne",
    kategorie_filter_alle: "Wszystkie",
    wochentag_montag: "Poniedziałek",
    wochentag_dienstag: "Wtorek",
    wochentag_mittwoch: "Środa",
    wochentag_donnerstag: "Czwartek",
    wochentag_freitag: "Piątek",
    wochentag_samstag: "Sobota",
    wochentag_sonntag: "Niedziela",
    sortier_titel: "Alfabetycznie (A-Z)",
    sortier_bewertung: "Najlepiej oceniane najpierw",
    sortier_kategorie: "Według kategorii",
    sortier_neu: "Najnowsze najpierw",
    sortieren_label: "Sortuj według:",
    kopf_titel_standard: "Książka kucharska",
    kopf_sichern_btn: "💾 Kopia zapasowa",
    kopf_wochenplan_btn: "📅 Plan tygodnia",
    einkaufsmodus_start_btn: "🛒 Lista zakupów",
    einkaufsmodus_beenden_btn: "✕ Zakończ wybór",
    kopf_neu_btn: "+ Nowy",
    suche_placeholder: "🔍 Przepis lub składniki (np. mąka, jajka)…",
    kochbuch_loeschen_title: "Usuń kolekcję",
    kochbuch_loeschen_aria: "Usuń kolekcję {{name}}",
    kochbuch_speichern_btn: "+ Zapisz jako inteligentną kolekcję",
    kochbuch_name_placeholder: "Nazwa tej kolekcji, np. Przepisy jesienne",
    fehler_kochbuch_name_fehlt: "Podaj nazwę kolekcji.",
    kochbuch_info_aria: "Pokaż wyjaśnienie inteligentnych kolekcji",
    kochbuch_info_titel: "Czym jest inteligentna kolekcja?",
    kochbuch_info_text:
      "Inteligentna kolekcja nie zapisuje stałej listy przepisów, " +
      "lecz kombinację kategorii, tagów i wyszukiwanego hasła, " +
      "dokładnie tak, jak są ustawione w momencie zapisu. Następnie " +
      "aktualizuje się sama: nowy pasujący przepis pojawia się " +
      "automatycznie, a przepis, którego kategoria lub tagi się " +
      "zmienią, może równie automatycznie ponownie zniknąć.",
    einkaufs_zaehler: "Wybrano: {{anzahl}}",
    einkaufsliste_erstellen_btn: "Utwórz listę zakupów",
    fehler_einkaufsliste_keine_konfiguration: "Brakuje jeszcze konfiguracji listy zakupów: podaj 'shopping_list_entity' w konfiguracji karty (np. shopping_list_entity: todo.einkaufsliste) - do tego potrzebny jest DRUGI pomocnik Lokalna lista zadań. Zobacz ANLEITUNG-Backup.md, sekcja 18.",
    fehler_einkaufsliste_keine_auswahl: "Wybierz co najmniej jeden przepis.",
    fehler_einkaufsliste_keine_zutaten: "Wybrane przepisy nie zawierają żadnych składników.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Nie udało się dodać \"{{zeile}}\" do listy zakupów:\n{{fehler}}\n\nJuż dodane składniki pozostają na liście.",
    einkaufsliste_hinzugefuegt: "Dodano {{anzahl}} składnik(ów) do \"{{entity}}\".",
    undo_geloescht: "Usunięto \"{{titel}}\".",
    undo_rueckgaengig_btn: "Cofnij",
    leer_keine_rezepte: "Brak przepisów – zacznij od \"+ Nowy\"",
    leer_keine_treffer: "Nie znaleziono przepisów dla \"{{begriff}}\"",
    fehler_liste_laden_titel: "Nie udało się załadować \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Czy ta lista zadań istnieje? (Ustawienia → Urządzenia i usługi → Pomocnicy)",
    kachel_aria_label_oeffnen: "Otwórz przepis {{titel}}",
    sterne_aria_label_gruppe: "Twoja ocena",
    sterne_aria_label: "{{zahl}} z 5 gwiazdek",
    fehler_kein_benutzer_bewertung: "Nie udało się ustalić Twojego użytkownika - ocenianie niemożliwe.",
    detail_teilen_drucken_btn: "📤 Udostępnij / Drukuj",
    detail_erstellt_von: "👤 Utworzone przez {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} ocena)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} ocen)",
    detail_keine_bewertungen: "Brak ocen",
    detail_deine_bewertung: "Twoja ocena:",
    detail_zubereitet_x: "🍳 przygotowano {{anzahl}}x",
    detail_portionen_suffix: "porcje",
    abschnitt_titel_zutaten: "Składniki",
    abschnitt_titel_zubereitung: "Przygotowanie",
    keine_zutaten: "Brak podanych składników",
    detail_kommentare_titel: "Komentarze",
    detail_keine_kommentare: "Brak komentarzy",
    detail_kommentar_placeholder: "Uzupełnienie, wskazówka lub uwaga…",
    detail_kommentar_hinzufuegen_btn: "Dodaj komentarz",
    detail_bearbeiten_hinweis: "Tylko {{name}} (lub administrator) może edytować lub usunąć ten przepis.",
    detail_ersteller_unbekannt: "autor(ka)",
    modal_zubereitet_frage: "Czy przygotowałeś/aś \"{{titel}}\"?",
    statistik_btn: "📊 Statystyki",
    statistik_titel: "Statystyki gotowania",
    statistik_info_aria: "Pokaż wyjaśnienie statystyk",
    statistik_info_titel: "Jak obliczana jest ta statystyka?",
    statistik_info_text:
      "To zestawienie liczy każde potwierdzenie pytania „Czy przygotowałeś/aś?“ - niezależnie od wielkości porcji czy liczby powtórzeń tego samego dnia. Jeśli to pytanie jest wyłączone opcją karty ask_cooked: false, liczby przestają rosnąć, ale już zapisane przygotowania pozostają zachowane.",
    statistik_dieses_jahr: "W {{jahr}} roku gotowałeś/aś {{anzahl}}x z własnej książki kucharskiej",
    statistik_gesamt: "Łącznie gotowałeś/aś {{anzahl}}x z własnej książki kucharskiej",
    statistik_top_titel: "Najczęściej przygotowywane",
    statistik_keine_daten: "Nie zapisano jeszcze żadnych przygotowań.",
    modal_loeschen_frage: "Czy na pewno usunąć \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Tak, usuń",
    wochenplan_titel: "Plan tygodnia",
    wochenplan_tab_diese: "Ten tydzień",
    wochenplan_tab_folgewoche: "Następny tydzień",
    wochenplan_hinweis_folgewoche: "Zaplanuj tutaj już teraz nadchodzący tydzień - automatycznie przejdzie do \"Ten tydzień\", gdy tylko bieżący tydzień się zakończy.",
    wochenplan_hinweis_diese: "Miniony dni są automatycznie czyszczone (sam przepis pozostaje zachowany, znika tylko przypisanie).",
    wochenplan_hinweis_speicherung: "Zapisywane na wszystkich urządzeniach (jako ukryty dodatkowy wpis na tej samej liście przepisów, nie jest potrzebny żaden dodatkowy pomocnik).",
    wochenplan_leer: "Brak przepisów - najpierw utwórz kilka.",
    wochenplan_kein_rezept_option: "– brak przepisu –",
    wochenplan_einkaufsliste_btn: "Utwórz listę zakupów z {{ziel}}",
    wochenplan_wort: "plan tygodnia",
    wochenplan_folgewoche_wort: "następny tydzień",
    wochenplan_aktuelle_woche_wort: "bieżący tydzień",
    wochenplan_keine_zuweisung: "{{zeitraum}} nie zawiera jeszcze przypisanych przepisów.",
    formular_titel_neu: "Nowy przepis",
    formular_titel_bearbeiten: "Edytuj przepis",
    formular_url_import_btn: "🌐 Importuj URL przepisu",
    formular_url_label: "Link do strony internetowej przepisu",
    formular_url_placeholder: "https://www.przyklad-przepisy.pl/moj-przepis",
    formular_url_hinweis: "Wczytuje stronę i odczytuje osadzone już w niej ustrukturyzowane dane przepisu (te same dane, dzięki którym np. Google wyświetla oceny w gwiazdkach w wynikach wyszukiwania) - zwykle bardziej niezawodne niż rozpoznawanie tekstu. Działa tylko na stronach, które udostępniają takie dane i nie blokują zautomatyzowanych żądań.",
    formular_url_importieren_btn: "Importuj",
    formular_url_laedt: "Wczytywanie …",
    formular_text_einfuegen_btn: "🔍 Wklej tekst przepisu (automatyczne rozpoznawanie)",
    formular_text_label: "Wklej tutaj tekst przepisu (np. skopiowany ze strony z przepisami)",
    formular_text_placeholder: "Tytuł, składniki, przygotowanie - po prostu wklej cały tekst",
    formular_text_hinweis: "Czysto automatyczne rozpoznawanie bez AI - działa najlepiej z nagłówkami \"Składniki\" i \"Przygotowanie\" w tekście. Sprawdź potem krótko wynik, może być niekompletny.",
    formular_text_erkennen_btn: "Rozpoznaj",
    formular_json_einfuegen_btn: "📋 Wklej JSON wygenerowany przez AI",
    formular_json_info_aria: "Pokaż gotowy prompt dla AI",
    json_info_titel: "Prompt dla AI",
    json_info_erklaerung:
      "Skopiuj ten tekst, wklej go do wybranej AI (np. ChatGPT lub Claude), dodaj tekst swojego przepisu, a następnie wklej odpowiedź powyżej w polu „Wklej tutaj JSON“.",
    json_info_prompt:
      "Przekształć tekst przepisu, który zaraz wyślę, w JEDEN pojedynczy obiekt JSON - bez wyjaśnień, bez tekstu przed ani po, tylko JSON. Użyj dokładnie tego formatu:\n\n" +
      "{\n" +
      '  "title": "nazwa przepisu",\n' +
      '  "servings": 4,\n' +
      '  "category": "jedna z: {{kategorien}}",\n' +
      '  "ingredients": ["jeden składnik na wpis, np. 200 g mąki"],\n' +
      '  "steps": ["jeden krok przygotowania na wpis"],\n' +
      '  "tags": ["opcjonalne tagi, np. wegetariańskie"]\n' +
      "}\n\n" +
      "Zasady: „category“ musi być DOKŁADNIE jedną z wymienionych powyżej wartości (przepisz ją bez zmian, nawet jeśli tekst przepisu jest w innym języku - to stałe wartości wewnętrzne). " +
      "„tags“ jest opcjonalne, pusta tablica też jest w porządku. " +
      "Nie wymyślaj składników ani kroków, których nie ma w tekście. " +
      "Oto tekst przepisu:",
    json_info_kopieren_btn: "📋 Kopiuj prompt",
    json_info_kopiert: "Skopiowano!",
    formular_json_label: "Wklej tutaj JSON",
    formular_json_uebernehmen_btn: "Zastosuj",
    formular_label_titel: "Tytuł",
    formular_label_kategorie: "Kategoria",
    formular_label_tags: "Tagi (możliwych jest kilka, np. \"wegetariańskie\", \"szybkie\")",
    formular_tag_placeholder: "Wpisz i dodaj tag",
    formular_tag_hinzufuegen_btn: "+ Tag",
    formular_tag_entfernen_aria: "Usuń tag {{tag}}",
    formular_label_portionen: "Porcje (podstawa)",
    formular_label_zutaten: "Składniki",
    formular_zutat_hinzufuegen_btn: "+ Składnik",
    formular_zutat_menge_placeholder: "Ilość",
    formular_zutat_einheit_placeholder: "Jednostka",
    formular_zutat_name_placeholder: "Składnik",
    formular_zutat_entfernen_aria: "Usuń składnik",
    formular_label_zubereitung: "Przygotowanie (kroki)",
    formular_schritt_hinzufuegen_btn: "+ Krok",
    formular_schritt_placeholder_beispiel: "np. umyj i pokrój warzywa",
    formular_schritt_placeholder_naechster: "następny krok",
    formular_schritt_entfernen_aria: "Usuń krok",
    formular_label_bild: "Zdjęcie",
    formular_bild_vorhanden_hinweis: "(istnieje – nowy plik je zastąpi)",
    formular_bild_hinweis: "Aktualne zdjęcie zostaje zachowane, jeśli nie wybierzesz nowego pliku.",
    formular_bild_verkleinern_text: "Zmniejszanie zdjęcia…",
    fehler_url_ungueltig: "Podaj pełny adres zaczynający się od http:// lub https://.",
    fehler_url_apostroph: "Ten adres zawiera apostrof (') i niestety nie można go zaimportować.",
    fehler_url_keine_ausgabe: "Skrypt nie zwrócił żadnych danych wyjściowych. Czy 'rezeptbuch_url_importieren' jest skonfigurowany w configuration.yaml i czy Home Assistant został od tego czasu w pełni zrestartowany?",
    fehler_url_kein_json: "Odpowiedź skryptu importu nie była prawidłowym JSON-em.",
    fehler_url_import_fehlgeschlagen: "Import adresu URL nie powiódł się: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Niestety nie udało się nic rozpoznać we wklejonym tekście. Wypełnij poniższe pola ręcznie.",
    warnung_texterkennung_unvollstaendig: "Rozpoznawanie było niekompletne (brakuje składników lub kroków albo są przypisane niepoprawnie) - sprawdź i uzupełnij w formularzu.",
    fehler_json_ungueltig: "Wklejony JSON jest nieprawidłowy. Sprawdź go i spróbuj ponownie.",
    fehler_json_titel_fehlt: "W JSON-ie brakuje co najmniej pola 'title'.",
    fehler_titel_fehlt: "Podaj tytuł.",
    fehler_unerwartet: "Nieoczekiwany błąd:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" został w międzyczasie usunięty przez kogoś innego. Twoje zmiany nie zostały zapisane.",
    fehler_konflikt_geaendert: "\"{{titel}}\" został w międzyczasie zmieniony przez kogoś innego (np. komentarz, ocena lub własna edycja).\n\nAby nic nie zostało nadpisane, Twoje zmiany NIE zostały zapisane. Otwórz przepis ponownie i wprowadź swoje zmiany jeszcze raz.",
    fehler_vorgang_fehlgeschlagen: "Operacja nie powiodła się:\n{{fehler}}",
    fehler_teilen_drucken: "Nieoczekiwany błąd podczas udostępniania/drukowania:\n{{fehler}}",
    fehler_config_entity_fehlt: "Podaj 'entity' w konfiguracji karty, np. entity: todo.rezepte",
    fehler_bild_lesen: "Nie udało się odczytać zdjęcia (plik uszkodzony lub nieobsługiwany).",
    fehler_bild_verarbeiten: "Nie udało się przetworzyć zdjęcia jako obrazu (nieobsługiwany format?).",
    teilen_ueberschrift_zutaten: "SKŁADNIKI",
    teilen_ueberschrift_zubereitung: "PRZYGOTOWANIE",
    seite_zurueck_btn: "← Wstecz",
    seite_weiter_btn: "Dalej →",
    seite_anzeige: "Strona {{aktuell}} z {{gesamt}}",
    update_neue_version: "Dostępna nowa wersja: {{version}}",
    update_ansehen_btn: "Zobacz",
    update_schliessen_aria: "Ukryj powiadomienie",
    detail_kochmodus_btn: "🍳 Tryb gotowania",
    kochmodus_schritt_anzeige: "Krok {{aktuell}} z {{gesamt}}",
    kochmodus_schliessen_aria: "Zamknij tryb gotowania",
    kochmodus_schritt_zurueck_aria: "Poprzedni krok",
    kochmodus_schritt_weiter_aria: "Następny krok",
    kochmodus_zutaten_ein_aria: "Pokaż składniki",
    kochmodus_zutaten_aus_aria: "Ukryj składniki",
    kopf_sammel_pdf_btn: "📚 Zbiorczy PDF",
    sammel_pdf_keine_rezepte: "Nie znaleziono przepisów do eksportu.",
    sammel_pdf_frage_toc: "Utworzyć spis treści dla wybranych przepisów?",
    sammel_pdf_ja_toc_btn: "Tak, utwórz spis treści",
    sammel_pdf_nein_toc_btn: "Nie, bez spisu treści",
    sammel_pdf_name_placeholder: "Nazwa książki kucharskiej",
    sammel_pdf_erstellen_btn: "Utwórz PDF",
    abschnitt_titel_inhaltsverzeichnis: "Spis treści",
    sammel_pdf_frage_umfang: "Które przepisy powinny znaleźć się we wspólnym PDF?",
    sammel_pdf_alle_rezepte_btn: "Wszystkie wyświetlone przepisy",
    sammel_pdf_auswahl_btn: "Wybierz konkretne przepisy",
    sammel_pdf_auswahl_titel: "Wybierz przepisy",
    sammel_pdf_alle_auswaehlen_link: "Wybierz wszystkie",
    sammel_pdf_keine_auswaehlen_link: "Odznacz wszystkie",
    sammel_pdf_weiter_btn: "Dalej",
    sammel_pdf_auswahl_keine_hinweis: "Wybierz przynajmniej jeden przepis.",
  },
  pt: {
    allgemein_zurueck: "← Voltar",
    allgemein_ja: "Sim",
    allgemein_nein: "Não",
    allgemein_speichern: "Guardar",
    allgemein_speichert: "A guardar…",
    allgemein_abbrechen: "Cancelar",
    allgemein_bearbeiten: "Editar",
    allgemein_loeschen: "Eliminar",
    allgemein_oeffnen: "Abrir",
    allgemein_unbekannt: "Desconhecido",
    allgemein_schliessen: "Fechar",
    kategorie_hauptgericht: "Prato principal",
    kategorie_vorspeise: "Entrada",
    kategorie_suppe: "Sopa",
    kategorie_salat: "Salada",
    kategorie_beilage: "Acompanhamento",
    kategorie_dessert: "Sobremesa",
    kategorie_kuchen_gebaeck: "Bolos e pastelaria",
    kategorie_fruehstueck: "Pequeno-almoço",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Bebida",
    kategorie_sonstiges: "Outro",
    kategorie_filter_alle: "Todas",
    wochentag_montag: "Segunda-feira",
    wochentag_dienstag: "Terça-feira",
    wochentag_mittwoch: "Quarta-feira",
    wochentag_donnerstag: "Quinta-feira",
    wochentag_freitag: "Sexta-feira",
    wochentag_samstag: "Sábado",
    wochentag_sonntag: "Domingo",
    sortier_titel: "Alfabética (A-Z)",
    sortier_bewertung: "Melhor avaliação primeiro",
    sortier_kategorie: "Por categoria",
    sortier_neu: "Mais recentes primeiro",
    sortieren_label: "Ordenar por:",
    kopf_titel_standard: "Livro de Receitas",
    kopf_sichern_btn: "💾 Cópia de segurança",
    kopf_wochenplan_btn: "📅 Plano semanal",
    einkaufsmodus_start_btn: "🛒 Lista de compras",
    einkaufsmodus_beenden_btn: "✕ Terminar seleção",
    kopf_neu_btn: "+ Nova",
    suche_placeholder: "🔍 Receita ou ingredientes (p. ex. farinha, ovos)…",
    kochbuch_loeschen_title: "Eliminar coleção",
    kochbuch_loeschen_aria: "Eliminar coleção {{name}}",
    kochbuch_speichern_btn: "+ Guardar como coleção inteligente",
    kochbuch_name_placeholder: "Nome para esta coleção, p. ex. Receitas de outono",
    fehler_kochbuch_name_fehlt: "Indica um nome para a coleção.",
    kochbuch_info_aria: "Mostrar explicação sobre coleções inteligentes",
    kochbuch_info_titel: "O que é uma coleção inteligente?",
    kochbuch_info_text:
      "Uma coleção inteligente não guarda uma lista fixa de receitas, " +
      "mas sim uma combinação de categoria, etiquetas e termo de " +
      "pesquisa, exatamente como estão definidos no momento em que é " +
      "guardada. Depois disso, atualiza-se sozinha: uma nova receita " +
      "que corresponda aparece automaticamente, e uma receita cuja " +
      "categoria ou etiquetas mudem pode desaparecer igualmente de " +
      "forma automática.",
    einkaufs_zaehler: "{{anzahl}} selecionada(s)",
    einkaufsliste_erstellen_btn: "Criar lista de compras",
    fehler_einkaufsliste_keine_konfiguration: "Falta ainda a configuração da lista de compras: indica 'shopping_list_entity' na configuração do cartão (p. ex. shopping_list_entity: todo.einkaufsliste) - para isso é necessário um SEGUNDO assistente Lista de tarefas local. Ver ANLEITUNG-Backup.md, secção 18.",
    fehler_einkaufsliste_keine_auswahl: "Seleciona pelo menos uma receita.",
    fehler_einkaufsliste_keine_zutaten: "As receitas selecionadas não contêm ingredientes.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Não foi possível adicionar \"{{zeile}}\" à lista de compras:\n{{fehler}}\n\nOs ingredientes já adicionados permanecem na lista.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingrediente(s) adicionado(s) a \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" eliminada.",
    undo_rueckgaengig_btn: "Anular",
    leer_keine_rezepte: "Ainda não há receitas – começa com \"+ Nova\"",
    leer_keine_treffer: "Nenhuma receita encontrada para \"{{begriff}}\"",
    fehler_liste_laden_titel: "Não foi possível carregar \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Esta lista de tarefas existe? (Definições → Dispositivos e serviços → Assistentes)",
    kachel_aria_label_oeffnen: "Abrir receita {{titel}}",
    sterne_aria_label_gruppe: "A tua avaliação",
    sterne_aria_label: "{{zahl}} de 5 estrelas",
    fehler_kein_benutzer_bewertung: "Não foi possível determinar o teu utilizador - avaliação não é possível.",
    detail_teilen_drucken_btn: "📤 Partilhar / Imprimir",
    detail_erstellt_von: "👤 Criada por {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} avaliação)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} avaliações)",
    detail_keine_bewertungen: "Ainda não há avaliações",
    detail_deine_bewertung: "A tua avaliação:",
    detail_zubereitet_x: "🍳 preparada {{anzahl}}x",
    detail_portionen_suffix: "doses",
    abschnitt_titel_zutaten: "Ingredientes",
    abschnitt_titel_zubereitung: "Preparação",
    keine_zutaten: "Nenhum ingrediente indicado",
    detail_kommentare_titel: "Comentários",
    detail_keine_kommentare: "Ainda não há comentários",
    detail_kommentar_placeholder: "Complemento, dica ou observação…",
    detail_kommentar_hinzufuegen_btn: "Adicionar comentário",
    detail_bearbeiten_hinweis: "Apenas {{name}} (ou um administrador) pode editar ou eliminar esta receita.",
    detail_ersteller_unbekannt: "quem criou a receita",
    modal_zubereitet_frage: "Preparaste a receita \"{{titel}}\"?",
    statistik_btn: "📊 Estatísticas",
    statistik_titel: "Estatísticas de cozinha",
    statistik_info_aria: "Mostrar explicação das estatísticas",
    statistik_info_titel: "Como é calculada esta estatística?",
    statistik_info_text:
      "Esta avaliação conta cada confirmação da pergunta «Preparaste?» - independentemente do tamanho da porção ou de quantas vezes no mesmo dia. Se esta pergunta estiver desativada através da opção do cartão ask_cooked: false, os números deixam de aumentar, mas as preparações já registadas são mantidas.",
    statistik_dieses_jahr: "Cozinhaste {{anzahl}}x do teu livro de receitas em {{jahr}}",
    statistik_gesamt: "Cozinhaste {{anzahl}}x do teu livro de receitas no total",
    statistik_top_titel: "Mais preparado",
    statistik_keine_daten: "Ainda não há preparações registadas.",
    modal_loeschen_frage: "Eliminar mesmo \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Sim, eliminar",
    wochenplan_titel: "Plano semanal",
    wochenplan_tab_diese: "Esta semana",
    wochenplan_tab_folgewoche: "Próxima semana",
    wochenplan_hinweis_folgewoche: "Planeia aqui já a próxima semana - ela passa automaticamente para \"Esta semana\" assim que a semana atual terminar.",
    wochenplan_hinweis_diese: "Os dias já passados são limpos automaticamente (a receita em si permanece, só a atribuição desaparece).",
    wochenplan_hinweis_speicherung: "É guardado entre dispositivos (como entrada adicional oculta na mesma lista de receitas, não é necessário mais nenhum assistente).",
    wochenplan_leer: "Ainda não há receitas - cria primeiro algumas.",
    wochenplan_kein_rezept_option: "– nenhuma receita –",
    wochenplan_einkaufsliste_btn: "Criar lista de compras a partir de {{ziel}}",
    wochenplan_wort: "plano semanal",
    wochenplan_folgewoche_wort: "próxima semana",
    wochenplan_aktuelle_woche_wort: "semana atual",
    wochenplan_keine_zuweisung: "A {{zeitraum}} ainda não contém receitas atribuídas.",
    formular_titel_neu: "Nova receita",
    formular_titel_bearbeiten: "Editar receita",
    formular_url_import_btn: "🌐 Importar URL de receita",
    formular_url_label: "Ligação para o site da receita",
    formular_url_placeholder: "https://www.exemplo-receitas.pt/a-minha-receita",
    formular_url_hinweis: "Carrega a página e lê os dados estruturados da receita já incorporados nela (os mesmos dados com que, por exemplo, o Google apresenta avaliações em estrelas na pesquisa) - geralmente mais fiável do que o reconhecimento de texto. Só funciona em sites que fornecem esses dados e não bloqueiam pedidos automatizados.",
    formular_url_importieren_btn: "Importar",
    formular_url_laedt: "A carregar …",
    formular_text_einfuegen_btn: "🔍 Colar texto da receita (reconhecimento automático)",
    formular_text_label: "Cola aqui o texto da receita (p. ex. copiado de um site de receitas)",
    formular_text_placeholder: "Título, ingredientes, preparação - basta colar todo o texto",
    formular_text_hinweis: "Reconhecimento puramente automático sem IA - funciona melhor com os títulos \"Ingredientes\" e \"Preparação\" no texto. Verifica depois brevemente o resultado, pode estar incompleto.",
    formular_text_erkennen_btn: "Reconhecer",
    formular_json_einfuegen_btn: "📋 Colar JSON gerado por IA",
    formular_json_info_aria: "Mostrar um prompt pronto para uma IA",
    json_info_titel: "Prompt para uma IA",
    json_info_erklaerung:
      "Copia este texto, cola-o numa IA à tua escolha (p. ex. ChatGPT ou Claude), junta o texto da tua receita e depois cola a resposta acima em «Cola aqui o JSON».",
    json_info_prompt:
      "Converte o texto da receita que vou enviar a seguir num ÚNICO objeto JSON - sem explicações, sem texto antes ou depois, só o JSON. Usa exatamente este formato:\n\n" +
      "{\n" +
      '  "title": "nome da receita",\n' +
      '  "servings": 4,\n' +
      '  "category": "uma de: {{kategorien}}",\n' +
      '  "ingredients": ["um ingrediente por entrada, p. ex. 200 g de farinha"],\n' +
      '  "steps": ["um passo de preparação por entrada"],\n' +
      '  "tags": ["etiquetas opcionais, p. ex. vegetariano"]\n' +
      "}\n\n" +
      "Regras: «category» tem de ser EXATAMENTE um dos valores indicados acima (copia-o sem alterações, mesmo que o texto da receita esteja noutra língua - são valores internos fixos). " +
      "«tags» é opcional, um array vazio também serve. " +
      "Não inventes ingredientes ou passos que não estejam no texto. " +
      "Aqui está o texto da receita:",
    json_info_kopieren_btn: "📋 Copiar prompt",
    json_info_kopiert: "Copiado!",
    formular_json_label: "Cola aqui o JSON",
    formular_json_uebernehmen_btn: "Aplicar",
    formular_label_titel: "Título",
    formular_label_kategorie: "Categoria",
    formular_label_tags: "Etiquetas (várias possíveis, p. ex. \"vegetariano\", \"rápido\")",
    formular_tag_placeholder: "Escreve e adiciona uma etiqueta",
    formular_tag_hinzufuegen_btn: "+ Etiqueta",
    formular_tag_entfernen_aria: "Remover etiqueta {{tag}}",
    formular_label_portionen: "Doses (base)",
    formular_label_zutaten: "Ingredientes",
    formular_zutat_hinzufuegen_btn: "+ Ingrediente",
    formular_zutat_menge_placeholder: "Quantidade",
    formular_zutat_einheit_placeholder: "Unidade",
    formular_zutat_name_placeholder: "Ingrediente",
    formular_zutat_entfernen_aria: "Remover ingrediente",
    formular_label_zubereitung: "Preparação (passos)",
    formular_schritt_hinzufuegen_btn: "+ Passo",
    formular_schritt_placeholder_beispiel: "p. ex. lavar e cortar os legumes",
    formular_schritt_placeholder_naechster: "passo seguinte",
    formular_schritt_entfernen_aria: "Remover passo",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(existente – um novo ficheiro irá substituí-la)",
    formular_bild_hinweis: "A foto atual é mantida se não escolheres um novo ficheiro.",
    formular_bild_verkleinern_text: "A reduzir a foto…",
    fehler_url_ungueltig: "Indica um endereço completo que comece com http:// ou https://.",
    fehler_url_apostroph: "Este endereço contém um apóstrofo (') e infelizmente não pode ser importado.",
    fehler_url_keine_ausgabe: "O script não devolveu qualquer resultado. O 'rezeptbuch_url_importieren' está configurado no configuration.yaml e o Home Assistant foi totalmente reiniciado desde então?",
    fehler_url_kein_json: "A resposta do script de importação não era um JSON válido.",
    fehler_url_import_fehlgeschlagen: "A importação do URL falhou: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Infelizmente não foi possível reconhecer nada no texto colado. Preenche os campos abaixo manualmente.",
    warnung_texterkennung_unvollstaendig: "O reconhecimento ficou incompleto (faltam ingredientes ou passos, ou podem estar atribuídos incorretamente) - verifica e completa no formulário.",
    fehler_json_ungueltig: "O JSON colado é inválido. Verifica-o e tenta novamente.",
    fehler_json_titel_fehlt: "No JSON falta pelo menos o campo 'title'.",
    fehler_titel_fehlt: "Indica um título.",
    fehler_unerwartet: "Erro inesperado:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" foi entretanto eliminada por outra pessoa. As tuas alterações não foram guardadas.",
    fehler_konflikt_geaendert: "\"{{titel}}\" foi entretanto alterada por outra pessoa (p. ex. um comentário, avaliação ou edição própria).\n\nPara evitar que algo seja substituído, as tuas alterações NÃO foram guardadas. Abre novamente a receita e insere as tuas alterações outra vez.",
    fehler_vorgang_fehlgeschlagen: "A operação falhou:\n{{fehler}}",
    fehler_teilen_drucken: "Erro inesperado ao partilhar/imprimir:\n{{fehler}}",
    fehler_config_entity_fehlt: "Indica 'entity' na configuração do cartão, p. ex. entity: todo.rezepte",
    fehler_bild_lesen: "Não foi possível ler a foto (ficheiro corrompido ou não suportado).",
    fehler_bild_verarbeiten: "Não foi possível processar a foto como imagem (formato não suportado?).",
    teilen_ueberschrift_zutaten: "INGREDIENTES",
    teilen_ueberschrift_zubereitung: "PREPARAÇÃO",
    seite_zurueck_btn: "← Anterior",
    seite_weiter_btn: "Seguinte →",
    seite_anzeige: "Página {{aktuell}} de {{gesamt}}",
    update_neue_version: "Nova versão disponível: {{version}}",
    update_ansehen_btn: "Ver",
    update_schliessen_aria: "Ocultar aviso",
    detail_kochmodus_btn: "🍳 Modo de cozinha",
    kochmodus_schritt_anzeige: "Passo {{aktuell}} de {{gesamt}}",
    kochmodus_schliessen_aria: "Fechar modo de cozinha",
    kochmodus_schritt_zurueck_aria: "Passo anterior",
    kochmodus_schritt_weiter_aria: "Próximo passo",
    kochmodus_zutaten_ein_aria: "Mostrar ingredientes",
    kochmodus_zutaten_aus_aria: "Ocultar ingredientes",
    kopf_sammel_pdf_btn: "📚 PDF coletivo",
    sammel_pdf_keine_rezepte: "Nenhuma receita encontrada para exportar.",
    sammel_pdf_frage_toc: "Criar um índice para as receitas selecionadas?",
    sammel_pdf_ja_toc_btn: "Sim, criar índice",
    sammel_pdf_nein_toc_btn: "Não, sem índice",
    sammel_pdf_name_placeholder: "Nome do livro de receitas",
    sammel_pdf_erstellen_btn: "Criar PDF",
    abschnitt_titel_inhaltsverzeichnis: "Índice",
    sammel_pdf_frage_umfang: "Quais receitas devem entrar no PDF conjunto?",
    sammel_pdf_alle_rezepte_btn: "Todas as receitas exibidas",
    sammel_pdf_auswahl_btn: "Selecionar receitas específicas",
    sammel_pdf_auswahl_titel: "Selecionar receitas",
    sammel_pdf_alle_auswaehlen_link: "Selecionar tudo",
    sammel_pdf_keine_auswaehlen_link: "Desmarcar tudo",
    sammel_pdf_weiter_btn: "Seguinte",
    sammel_pdf_auswahl_keine_hinweis: "Selecione pelo menos uma receita.",
  },
  ro: {
    allgemein_zurueck: "← Înapoi",
    allgemein_ja: "Da",
    allgemein_nein: "Nu",
    allgemein_speichern: "Salvează",
    allgemein_speichert: "Se salvează…",
    allgemein_abbrechen: "Anulează",
    allgemein_bearbeiten: "Editează",
    allgemein_loeschen: "Șterge",
    allgemein_oeffnen: "Deschide",
    allgemein_unbekannt: "Necunoscut",
    allgemein_schliessen: "Închide",
    kategorie_hauptgericht: "Fel principal",
    kategorie_vorspeise: "Aperitiv",
    kategorie_suppe: "Supă",
    kategorie_salat: "Salată",
    kategorie_beilage: "Garnitură",
    kategorie_dessert: "Desert",
    kategorie_kuchen_gebaeck: "Prăjituri și copturi",
    kategorie_fruehstueck: "Mic dejun",
    kategorie_snack: "Gustare",
    kategorie_getraenk: "Băutură",
    kategorie_sonstiges: "Altele",
    kategorie_filter_alle: "Toate",
    wochentag_montag: "Luni",
    wochentag_dienstag: "Marți",
    wochentag_mittwoch: "Miercuri",
    wochentag_donnerstag: "Joi",
    wochentag_freitag: "Vineri",
    wochentag_samstag: "Sâmbătă",
    wochentag_sonntag: "Duminică",
    sortier_titel: "Alfabetic (A-Z)",
    sortier_bewertung: "Cea mai bună evaluare primul",
    sortier_kategorie: "După categorie",
    sortier_neu: "Cele mai noi primul",
    sortieren_label: "Sortează după:",
    kopf_titel_standard: "Carte de rețete",
    kopf_sichern_btn: "💾 Copie de rezervă",
    kopf_wochenplan_btn: "📅 Plan săptămânal",
    einkaufsmodus_start_btn: "🛒 Listă de cumpărături",
    einkaufsmodus_beenden_btn: "✕ Încheie selecția",
    kopf_neu_btn: "+ Nou",
    suche_placeholder: "🔍 Rețetă sau ingrediente (de ex. făină, ouă)…",
    kochbuch_loeschen_title: "Șterge colecția",
    kochbuch_loeschen_aria: "Șterge colecția {{name}}",
    kochbuch_speichern_btn: "+ Salvează ca și colecție inteligentă",
    kochbuch_name_placeholder: "Nume pentru această colecție, de ex. Rețete de toamnă",
    fehler_kochbuch_name_fehlt: "Introdu un nume pentru colecție.",
    kochbuch_info_aria: "Arată explicația colecțiilor inteligente",
    kochbuch_info_titel: "Ce este o colecție inteligentă?",
    kochbuch_info_text:
      "O colecție inteligentă nu stochează o listă fixă de rețete, " +
      "ci o combinație de categorie, etichete și termen de căutare, " +
      "exact așa cum sunt setate în momentul salvării. După aceea se " +
      "actualizează singură: o rețetă nouă care se potrivește apare " +
      "automat, iar o rețetă a cărei categorie sau etichete se " +
      "schimbă poate la fel de automat să dispară din nou.",
    einkaufs_zaehler: "{{anzahl}} selectate",
    einkaufsliste_erstellen_btn: "Creează lista de cumpărături",
    fehler_einkaufsliste_keine_konfiguration: "Configurația pentru lista de cumpărături lipsește încă: te rugăm să specifici 'shopping_list_entity' în configurația cardului (de ex. shopping_list_entity: todo.einkaufsliste) - pentru aceasta este necesar un AL DOILEA ajutor Listă de sarcini locală. Vezi ANLEITUNG-Backup.md, secțiunea 18.",
    fehler_einkaufsliste_keine_auswahl: "Selectează cel puțin o rețetă.",
    fehler_einkaufsliste_keine_zutaten: "Rețetele selectate nu conțin ingrediente.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Nu s-a putut adăuga \"{{zeile}}\" la lista de cumpărături:\n{{fehler}}\n\nIngredientele deja adăugate rămân pe listă.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingredient(e) adăugat(e) la \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" a fost ștearsă.",
    undo_rueckgaengig_btn: "Anulează",
    leer_keine_rezepte: "Nicio rețetă încă – începe cu \"+ Nou\"",
    leer_keine_treffer: "Nu s-au găsit rețete pentru \"{{begriff}}\"",
    fehler_liste_laden_titel: "Nu s-a putut încărca \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Această listă de sarcini există? (Setări → Dispozitive și servicii → Asistenți)",
    kachel_aria_label_oeffnen: "Deschide rețeta {{titel}}",
    sterne_aria_label_gruppe: "Evaluarea ta",
    sterne_aria_label: "{{zahl}} din 5 stele",
    fehler_kein_benutzer_bewertung: "Nu s-a putut determina utilizatorul tău - evaluarea nu este posibilă.",
    detail_teilen_drucken_btn: "📤 Distribuie / Printează",
    detail_erstellt_von: "👤 Creat de {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} evaluare)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} evaluări)",
    detail_keine_bewertungen: "Nicio evaluare încă",
    detail_deine_bewertung: "Evaluarea ta:",
    detail_zubereitet_x: "🍳 preparată de {{anzahl}} ori",
    detail_portionen_suffix: "porții",
    abschnitt_titel_zutaten: "Ingrediente",
    abschnitt_titel_zubereitung: "Preparare",
    keine_zutaten: "Niciun ingredient adăugat",
    detail_kommentare_titel: "Comentarii",
    detail_keine_kommentare: "Niciun comentariu încă",
    detail_kommentar_placeholder: "Completare, sfat sau observație…",
    detail_kommentar_hinzufuegen_btn: "Adaugă comentariu",
    detail_bearbeiten_hinweis: "Doar {{name}} (sau un administrator) poate edita sau șterge această rețetă.",
    detail_ersteller_unbekannt: "autorul/autoarea",
    modal_zubereitet_frage: "Ai preparat \"{{titel}}\"?",
    statistik_btn: "📊 Statistici",
    statistik_titel: "Statistici de gătit",
    statistik_info_aria: "Afișează explicația statisticii",
    statistik_info_titel: "Cum se calculează această statistică?",
    statistik_info_text:
      "Această evaluare numără fiecare confirmare a întrebării „Ai preparat?“ - indiferent de dimensiunea porției sau de câte ori în aceeași zi. Dacă această întrebare este dezactivată prin opțiunea de card ask_cooked: false, numerele nu mai cresc, dar preparările deja înregistrate rămân păstrate.",
    statistik_dieses_jahr: "Ai gătit de {{anzahl}}x din cartea ta de rețete în {{jahr}}",
    statistik_gesamt: "Ai gătit de {{anzahl}}x din cartea ta de rețete în total",
    statistik_top_titel: "Cel mai des preparat",
    statistik_keine_daten: "Încă nu sunt înregistrate preparări.",
    modal_loeschen_frage: "Chiar vrei să ștergi \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Da, șterge",
    wochenplan_titel: "Plan săptămânal",
    wochenplan_tab_diese: "Săptămâna aceasta",
    wochenplan_tab_folgewoche: "Săptămâna viitoare",
    wochenplan_hinweis_folgewoche: "Planifică aici deja săptămâna următoare - aceasta se va muta automat la \"Săptămâna aceasta\" imediat ce se încheie săptămâna curentă.",
    wochenplan_hinweis_diese: "Zilele trecute sunt golite automat (rețeta în sine rămâne păstrată, dispare doar atribuirea).",
    wochenplan_hinweis_speicherung: "Se salvează pe toate dispozitivele (ca intrare suplimentară ascunsă în aceeași listă de rețete, nu este nevoie de niciun alt ajutor).",
    wochenplan_leer: "Nicio rețetă încă - creează mai întâi câteva.",
    wochenplan_kein_rezept_option: "– nicio rețetă –",
    wochenplan_einkaufsliste_btn: "Creează listă de cumpărături din {{ziel}}",
    wochenplan_wort: "plan săptămânal",
    wochenplan_folgewoche_wort: "săptămâna viitoare",
    wochenplan_aktuelle_woche_wort: "săptămâna curentă",
    wochenplan_keine_zuweisung: "{{zeitraum}} nu conține încă nicio rețetă atribuită.",
    formular_titel_neu: "Rețetă nouă",
    formular_titel_bearbeiten: "Editează rețeta",
    formular_url_import_btn: "🌐 Importă URL rețetă",
    formular_url_label: "Link către site-ul web al rețetei",
    formular_url_placeholder: "https://www.exemplu-retete.ro/reteta-mea",
    formular_url_hinweis: "Încarcă pagina și citește datele structurate ale rețetei deja integrate în ea (aceleași date cu care, de ex., Google afișează evaluări cu stele în căutare) - de obicei mai fiabil decât recunoașterea textului. Funcționează doar pe site-uri care furnizează astfel de date și nu blochează solicitările automate.",
    formular_url_importieren_btn: "Importă",
    formular_url_laedt: "Se încarcă …",
    formular_text_einfuegen_btn: "🔍 Lipește textul rețetei (recunoaștere automată)",
    formular_text_label: "Lipește aici textul rețetei (de ex. copiat de pe un site de rețete)",
    formular_text_placeholder: "Titlu, ingrediente, preparare - lipește pur și simplu tot textul",
    formular_text_hinweis: "Recunoaștere pur automată, fără IA - funcționează cel mai bine cu titlurile \"Ingrediente\" și \"Preparare\" în text. Te rugăm să verifici pe scurt rezultatul după aceea, poate fi incomplet.",
    formular_text_erkennen_btn: "Recunoaște",
    formular_json_einfuegen_btn: "📋 Lipește JSON generat de IA",
    formular_json_info_aria: "Afișează un prompt gata făcut pentru un AI",
    json_info_titel: "Prompt pentru un AI",
    json_info_erklaerung:
      "Copiază acest text, inserează-l într-un AI la alegere (de ex. ChatGPT sau Claude), adaugă textul rețetei tale și apoi lipește răspunsul mai sus la „Lipește JSON aici“.",
    json_info_prompt:
      "Transformă textul rețetei pe care ți-l trimit imediat într-UN singur obiect JSON - fără explicații, fără text înainte sau după, doar JSON-ul. Folosește exact acest format:\n\n" +
      "{\n" +
      '  "title": "numele rețetei",\n' +
      '  "servings": 4,\n' +
      '  "category": "una dintre: {{kategorien}}",\n' +
      '  "ingredients": ["un ingredient pe linie, de ex. 200 g făină"],\n' +
      '  "steps": ["un pas de preparare pe linie"],\n' +
      '  "tags": ["etichete opționale, de ex. vegetarian"]\n' +
      "}\n\n" +
      "Reguli: „category“ trebuie să fie EXACT una dintre valorile enumerate mai sus (preia-o neschimbată, chiar dacă textul rețetei este în altă limbă - acestea sunt valori interne fixe). " +
      "„tags“ este opțional, un array gol este în regulă. " +
      "Nu inventa ingrediente sau pași care nu apar în text. " +
      "Iată textul rețetei:",
    json_info_kopieren_btn: "📋 Copiază promptul",
    json_info_kopiert: "Copiat!",
    formular_json_label: "Lipește JSON aici",
    formular_json_uebernehmen_btn: "Aplică",
    formular_label_titel: "Titlu",
    formular_label_kategorie: "Categorie",
    formular_label_tags: "Etichete (mai multe posibile, de ex. \"vegetarian\", \"rapid\")",
    formular_tag_placeholder: "Introdu și adaugă o etichetă",
    formular_tag_hinzufuegen_btn: "+ Etichetă",
    formular_tag_entfernen_aria: "Elimină eticheta {{tag}}",
    formular_label_portionen: "Porții (de bază)",
    formular_label_zutaten: "Ingrediente",
    formular_zutat_hinzufuegen_btn: "+ Ingredient",
    formular_zutat_menge_placeholder: "Cantitate",
    formular_zutat_einheit_placeholder: "Unitate",
    formular_zutat_name_placeholder: "Ingredient",
    formular_zutat_entfernen_aria: "Elimină ingredientul",
    formular_label_zubereitung: "Preparare (pași)",
    formular_schritt_hinzufuegen_btn: "+ Pas",
    formular_schritt_placeholder_beispiel: "de ex. spală și taie legumele",
    formular_schritt_placeholder_naechster: "pasul următor",
    formular_schritt_entfernen_aria: "Elimină pasul",
    formular_label_bild: "Fotografie",
    formular_bild_vorhanden_hinweis: "(există – un fișier nou o va înlocui)",
    formular_bild_hinweis: "Fotografia actuală rămâne păstrată dacă nu alegi un fișier nou.",
    formular_bild_verkleinern_text: "Se micșorează fotografia…",
    fehler_url_ungueltig: "Introdu o adresă completă care începe cu http:// sau https://.",
    fehler_url_apostroph: "Această adresă conține un apostrof (') și, din păcate, nu poate fi importată.",
    fehler_url_keine_ausgabe: "Scriptul nu a returnat nicio ieșire. Este 'rezeptbuch_url_importieren' configurat în configuration.yaml și a fost Home Assistant repornit complet de atunci?",
    fehler_url_kein_json: "Răspunsul scriptului de import nu a fost JSON valid.",
    fehler_url_import_fehlgeschlagen: "Importul URL-ului a eșuat: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Din păcate, nu s-a putut recunoaște nimic în textul lipit. Te rugăm să completezi manual câmpurile de mai jos.",
    warnung_texterkennung_unvollstaendig: "Recunoașterea a fost incompletă (lipsesc ingrediente sau pași, sau pot fi atribuite greșit) - te rugăm să verifici și să completezi în formular.",
    fehler_json_ungueltig: "JSON-ul lipit este nevalid. Te rugăm să-l verifici și să încerci din nou.",
    fehler_json_titel_fehlt: "În JSON lipsește cel puțin câmpul 'title'.",
    fehler_titel_fehlt: "Introdu un titlu.",
    fehler_unerwartet: "Eroare neașteptată:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" a fost între timp ștearsă de altcineva. Modificările tale nu au fost salvate.",
    fehler_konflikt_geaendert: "\"{{titel}}\" a fost între timp modificată de altcineva (de ex. un comentariu, o evaluare sau o editare proprie).\n\nPentru a evita ca ceva să fie suprascris, modificările tale NU au fost salvate. Deschide din nou rețeta și introdu din nou modificările tale.",
    fehler_vorgang_fehlgeschlagen: "Acțiunea a eșuat:\n{{fehler}}",
    fehler_teilen_drucken: "Eroare neașteptată la distribuire/printare:\n{{fehler}}",
    fehler_config_entity_fehlt: "Specifică 'entity' în configurația cardului, de ex. entity: todo.rezepte",
    fehler_bild_lesen: "Fotografia nu a putut fi citită (fișier deteriorat sau neacceptat).",
    fehler_bild_verarbeiten: "Fotografia nu a putut fi procesată ca imagine (format neacceptat?).",
    teilen_ueberschrift_zutaten: "INGREDIENTE",
    teilen_ueberschrift_zubereitung: "PREPARARE",
    seite_zurueck_btn: "← Înapoi",
    seite_weiter_btn: "Înainte →",
    seite_anzeige: "Pagina {{aktuell}} din {{gesamt}}",
    update_neue_version: "Este disponibilă o versiune nouă: {{version}}",
    update_ansehen_btn: "Vezi",
    update_schliessen_aria: "Ascunde notificarea",
    detail_kochmodus_btn: "🍳 Mod de gătit",
    kochmodus_schritt_anzeige: "Pasul {{aktuell}} din {{gesamt}}",
    kochmodus_schliessen_aria: "Închide modul de gătit",
    kochmodus_schritt_zurueck_aria: "Pasul anterior",
    kochmodus_schritt_weiter_aria: "Pasul următor",
    kochmodus_zutaten_ein_aria: "Afișează ingredientele",
    kochmodus_zutaten_aus_aria: "Ascunde ingredientele",
    kopf_sammel_pdf_btn: "📚 PDF colectiv",
    sammel_pdf_keine_rezepte: "Nu s-a găsit nicio rețetă de exportat.",
    sammel_pdf_frage_toc: "Se creează un cuprins pentru rețetele selectate?",
    sammel_pdf_ja_toc_btn: "Da, creează cuprins",
    sammel_pdf_nein_toc_btn: "Nu, fără cuprins",
    sammel_pdf_name_placeholder: "Numele cărții de bucate",
    sammel_pdf_erstellen_btn: "Creează PDF",
    abschnitt_titel_inhaltsverzeichnis: "Cuprins",
    sammel_pdf_frage_umfang: "Care rețete ar trebui incluse în PDF-ul comun?",
    sammel_pdf_alle_rezepte_btn: "Toate rețetele afișate",
    sammel_pdf_auswahl_btn: "Selectează rețete specifice",
    sammel_pdf_auswahl_titel: "Selectează rețetele",
    sammel_pdf_alle_auswaehlen_link: "Selectează tot",
    sammel_pdf_keine_auswaehlen_link: "Deselectează tot",
    sammel_pdf_weiter_btn: "Continuă",
    sammel_pdf_auswahl_keine_hinweis: "Selectează cel puțin o rețetă.",
  },
  sk: {
    allgemein_zurueck: "← Späť",
    allgemein_ja: "Áno",
    allgemein_nein: "Nie",
    allgemein_speichern: "Uložiť",
    allgemein_speichert: "Ukladá sa…",
    allgemein_abbrechen: "Zrušiť",
    allgemein_bearbeiten: "Upraviť",
    allgemein_loeschen: "Vymazať",
    allgemein_oeffnen: "Otvoriť",
    allgemein_unbekannt: "Neznáme",
    allgemein_schliessen: "Zavrieť",
    kategorie_hauptgericht: "Hlavné jedlo",
    kategorie_vorspeise: "Predjedlo",
    kategorie_suppe: "Polievka",
    kategorie_salat: "Šalát",
    kategorie_beilage: "Príloha",
    kategorie_dessert: "Dezert",
    kategorie_kuchen_gebaeck: "Koláče a pečivo",
    kategorie_fruehstueck: "Raňajky",
    kategorie_snack: "Desiata",
    kategorie_getraenk: "Nápoj",
    kategorie_sonstiges: "Ostatné",
    kategorie_filter_alle: "Všetky",
    wochentag_montag: "Pondelok",
    wochentag_dienstag: "Utorok",
    wochentag_mittwoch: "Streda",
    wochentag_donnerstag: "Štvrtok",
    wochentag_freitag: "Piatok",
    wochentag_samstag: "Sobota",
    wochentag_sonntag: "Nedeľa",
    sortier_titel: "Abecedne (A-Z)",
    sortier_bewertung: "Najlepšie hodnotené prvé",
    sortier_kategorie: "Podľa kategórie",
    sortier_neu: "Najnovšie prvé",
    sortieren_label: "Zoradiť podľa:",
    kopf_titel_standard: "Kuchárska kniha",
    kopf_sichern_btn: "💾 Záloha",
    kopf_wochenplan_btn: "📅 Týždenný plán",
    einkaufsmodus_start_btn: "🛒 Nákupný zoznam",
    einkaufsmodus_beenden_btn: "✕ Ukončiť výber",
    kopf_neu_btn: "+ Nový",
    suche_placeholder: "🔍 Recept alebo suroviny (napr. múka, vajcia)…",
    kochbuch_loeschen_title: "Vymazať kolekciu",
    kochbuch_loeschen_aria: "Vymazať kolekciu {{name}}",
    kochbuch_speichern_btn: "+ Uložiť ako inteligentnú kolekciu",
    kochbuch_name_placeholder: "Názov pre túto kolekciu, napr. Jesenné recepty",
    fehler_kochbuch_name_fehlt: "Zadajte prosím názov kolekcie.",
    kochbuch_info_aria: "Zobraziť vysvetlenie inteligentných kolekcií",
    kochbuch_info_titel: "Čo je inteligentná kolekcia?",
    kochbuch_info_text:
      "Inteligentná kolekcia neukladá pevný zoznam receptov, ale " +
      "kombináciu kategórie, štítkov a hľadaného výrazu presne tak, " +
      "ako sú nastavené v okamihu uloženia. Následne sa sama " +
      "aktualizuje: nový recept, ktorý zodpovedá, sa automaticky " +
      "zobrazí, a recept, ktorého kategória alebo štítky sa zmenia, " +
      "môže rovnako automaticky znova zmiznúť.",
    einkaufs_zaehler: "{{anzahl}} vybraných",
    einkaufsliste_erstellen_btn: "Vytvoriť nákupný zoznam",
    fehler_einkaufsliste_keine_konfiguration: "Pre nákupný zoznam ešte chýba konfigurácia: zadajte prosím 'shopping_list_entity' v konfigurácii karty (napr. shopping_list_entity: todo.einkaufsliste) - na to je potrebný DRUHÝ pomocník Lokálny zoznam úloh. Pozri ANLEITUNG-Backup.md, oddiel 18.",
    fehler_einkaufsliste_keine_auswahl: "Vyberte prosím aspoň jeden recept.",
    fehler_einkaufsliste_keine_zutaten: "Vybrané recepty neobsahujú žiadne suroviny.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Nepodarilo sa pridať \"{{zeile}}\" do nákupného zoznamu:\n{{fehler}}\n\nUž pridané suroviny zostávajú v zozname.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} surovina/y pridané do \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" vymazané.",
    undo_rueckgaengig_btn: "Späť",
    leer_keine_rezepte: "Zatiaľ žiadne recepty – začnite pomocou \"+ Nový\"",
    leer_keine_treffer: "Nenašli sa žiadne recepty pre \"{{begriff}}\"",
    fehler_liste_laden_titel: "Nepodarilo sa načítať \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Existuje tento zoznam úloh? (Nastavenia → Zariadenia a služby → Pomocníci)",
    kachel_aria_label_oeffnen: "Otvoriť recept {{titel}}",
    sterne_aria_label_gruppe: "Vaše hodnotenie",
    sterne_aria_label: "{{zahl}} z 5 hviezdičiek",
    fehler_kein_benutzer_bewertung: "Nepodarilo sa zistiť vášho používateľa - hodnotenie nie je možné.",
    detail_teilen_drucken_btn: "📤 Zdieľať / Tlačiť",
    detail_erstellt_von: "👤 Vytvoril(a) {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} hodnotenie)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} hodnotení)",
    detail_keine_bewertungen: "Zatiaľ žiadne hodnotenia",
    detail_deine_bewertung: "Vaše hodnotenie:",
    detail_zubereitet_x: "🍳 pripravené {{anzahl}}x",
    detail_portionen_suffix: "porcií",
    abschnitt_titel_zutaten: "Suroviny",
    abschnitt_titel_zubereitung: "Postup",
    keine_zutaten: "Žiadne suroviny nie sú uvedené",
    detail_kommentare_titel: "Komentáre",
    detail_keine_kommentare: "Zatiaľ žiadne komentáre",
    detail_kommentar_placeholder: "Doplnenie, tip alebo poznámka…",
    detail_kommentar_hinzufuegen_btn: "Pridať komentár",
    detail_bearbeiten_hinweis: "Tento recept môže upraviť alebo vymazať iba {{name}} (alebo administrátor).",
    detail_ersteller_unbekannt: "tvorca/tvorkyňa",
    modal_zubereitet_frage: "Pripravili ste \"{{titel}}\"?",
    statistik_btn: "📊 Štatistika",
    statistik_titel: "Štatistika varenia",
    statistik_info_aria: "Zobraziť vysvetlenie štatistiky",
    statistik_info_titel: "Ako sa táto štatistika počíta?",
    statistik_info_text:
      "Toto vyhodnotenie počíta každé potvrdenie otázky „Pripravil(a) si?“ - bez ohľadu na veľkosť porcie alebo počet za rovnaký deň. Ak je táto otázka vypnutá pomocou voľby karty ask_cooked: false, čísla ďalej nerastú, ale už zaznamenané prípravy zostávajú zachované.",
    statistik_dieses_jahr: "V roku {{jahr}} si z vlastnej kuchárky varil(a) {{anzahl}}x",
    statistik_gesamt: "Celkovo si z vlastnej kuchárky varil(a) {{anzahl}}x",
    statistik_top_titel: "Najčastejšie pripravované",
    statistik_keine_daten: "Zatiaľ nie sú zaznamenané žiadne prípravy.",
    modal_loeschen_frage: "Naozaj vymazať \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Áno, vymazať",
    wochenplan_titel: "Týždenný plán",
    wochenplan_tab_diese: "Tento týždeň",
    wochenplan_tab_folgewoche: "Budúci týždeň",
    wochenplan_hinweis_folgewoche: "Naplánujte si tu už teraz nadchádzajúci týždeň - akonáhle sa aktuálny týždeň skončí, automaticky sa presunie do \"Tento týždeň\".",
    wochenplan_hinweis_diese: "Uplynulé dni sa automaticky vyprázdnia (samotný recept zostáva zachovaný, zmizne iba priradenie).",
    wochenplan_hinweis_speicherung: "Ukladá sa naprieč zariadeniami (ako skrytý doplnkový záznam v rovnakom zozname receptov, nie je potrebný žiadny ďalší pomocník).",
    wochenplan_leer: "Zatiaľ žiadne recepty - najprv nejaké vytvorte.",
    wochenplan_kein_rezept_option: "– žiadny recept –",
    wochenplan_einkaufsliste_btn: "Vytvoriť nákupný zoznam z {{ziel}}",
    wochenplan_wort: "týždenný plán",
    wochenplan_folgewoche_wort: "budúci týždeň",
    wochenplan_aktuelle_woche_wort: "aktuálny týždeň",
    wochenplan_keine_zuweisung: "{{zeitraum}} zatiaľ neobsahuje žiadne priradené recepty.",
    formular_titel_neu: "Nový recept",
    formular_titel_bearbeiten: "Upraviť recept",
    formular_url_import_btn: "🌐 Importovať URL receptu",
    formular_url_label: "Odkaz na webovú stránku receptu",
    formular_url_placeholder: "https://www.priklad-recepty.sk/moj-recept",
    formular_url_hinweis: "Načíta stránku a prečíta štruktúrované údaje receptu, ktoré sú do nej už vložené (rovnaké údaje, ktorými napr. Google zobrazuje hviezdičkové hodnotenia vo vyhľadávaní) - zvyčajne spoľahlivejšie ako rozpoznávanie textu. Funguje iba na stránkach, ktoré takéto údaje poskytujú a neblokujú automatizované požiadavky.",
    formular_url_importieren_btn: "Importovať",
    formular_url_laedt: "Načítava sa …",
    formular_text_einfuegen_btn: "🔍 Vložiť text receptu (automatické rozpoznávanie)",
    formular_text_label: "Vložte sem text receptu (napr. skopírovaný z webovej stránky receptu)",
    formular_text_placeholder: "Názov, suroviny, postup - jednoducho vložte celý text",
    formular_text_hinweis: "Čisto automatické rozpoznávanie bez AI - funguje najlepšie s nadpismi \"Suroviny\" a \"Postup\" v texte. Výsledok si prosím potom krátko skontrolujte, môže byť neúplný.",
    formular_text_erkennen_btn: "Rozpoznať",
    formular_json_einfuegen_btn: "📋 Vložiť JSON vygenerovaný AI",
    formular_json_info_aria: "Zobraziť hotový prompt pre AI",
    json_info_titel: "Prompt pre AI",
    json_info_erklaerung:
      "Skopíruj tento text, vlož ho do AI podľa výberu (napr. ChatGPT alebo Claude), pripoj text svojho receptu a odpoveď potom vlož vyššie do „Vložte JSON sem“.",
    json_info_prompt:
      "Premeň text receptu, ktorý ti hneď pošlem, na JEDEN jediný JSON objekt - bez vysvetlenia, bez textu pred alebo po, len JSON. Použi presne tento formát:\n\n" +
      "{\n" +
      '  "title": "názov receptu",\n' +
      '  "servings": 4,\n' +
      '  "category": "jedna z: {{kategorien}}",\n' +
      '  "ingredients": ["jedna surovina na položku, napr. 200 g múky"],\n' +
      '  "steps": ["jeden krok prípravy na položku"],\n' +
      '  "tags": ["voliteľné štítky, napr. vegetariánske"]\n' +
      "}\n\n" +
      "Pravidlá: „category“ musí byť PRESNE jedna z vyššie uvedených hodnôt (prevezmi ju nezmenenú, aj keď je text receptu v inom jazyku - ide o pevné interné hodnoty). " +
      "„tags“ je voliteľné, prázdne pole je v poriadku. " +
      "Nevymýšľaj suroviny ani kroky, ktoré v texte nie sú. " +
      "Tu je text receptu:",
    json_info_kopieren_btn: "📋 Kopírovať prompt",
    json_info_kopiert: "Skopírované!",
    formular_json_label: "Vložte JSON sem",
    formular_json_uebernehmen_btn: "Použiť",
    formular_label_titel: "Názov",
    formular_label_kategorie: "Kategória",
    formular_label_tags: "Štítky (možné je viac, napr. \"vegetariánske\", \"rýchle\")",
    formular_tag_placeholder: "Zadajte a pridajte štítok",
    formular_tag_hinzufuegen_btn: "+ Štítok",
    formular_tag_entfernen_aria: "Odstrániť štítok {{tag}}",
    formular_label_portionen: "Porcie (základ)",
    formular_label_zutaten: "Suroviny",
    formular_zutat_hinzufuegen_btn: "+ Surovina",
    formular_zutat_menge_placeholder: "Množstvo",
    formular_zutat_einheit_placeholder: "Jednotka",
    formular_zutat_name_placeholder: "Surovina",
    formular_zutat_entfernen_aria: "Odstrániť surovinu",
    formular_label_zubereitung: "Postup (kroky)",
    formular_schritt_hinzufuegen_btn: "+ Krok",
    formular_schritt_placeholder_beispiel: "napr. umyte a nakrájajte zeleninu",
    formular_schritt_placeholder_naechster: "ďalší krok",
    formular_schritt_entfernen_aria: "Odstrániť krok",
    formular_label_bild: "Fotka",
    formular_bild_vorhanden_hinweis: "(existuje – nový súbor ju nahradí)",
    formular_bild_hinweis: "Aktuálna fotka zostane zachovaná, ak nevyberiete nový súbor.",
    formular_bild_verkleinern_text: "Fotka sa zmenšuje…",
    fehler_url_ungueltig: "Zadajte prosím úplnú adresu začínajúcu na http:// alebo https://.",
    fehler_url_apostroph: "Táto adresa obsahuje apostrof (') a bohužiaľ ju nemožno importovať.",
    fehler_url_keine_ausgabe: "Skript nevrátil žiadny výstup. Je 'rezeptbuch_url_importieren' nastavený v configuration.yaml a bol odvtedy Home Assistant úplne reštartovaný?",
    fehler_url_kein_json: "Odpoveď importovacieho skriptu nebola platný JSON.",
    fehler_url_import_fehlgeschlagen: "Import URL zlyhal: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Vo vloženom texte sa bohužiaľ nepodarilo nič rozpoznať. Vyplňte prosím polia nižšie ručne.",
    warnung_texterkennung_unvollstaendig: "Rozpoznávanie bolo neúplné (chýbajú suroviny alebo kroky, prípadne sú priradené nesprávne) - skontrolujte prosím a doplňte vo formulári.",
    fehler_json_ungueltig: "Vložený JSON je neplatný. Skontrolujte ho prosím a skúste to znova.",
    fehler_json_titel_fehlt: "V JSON chýba aspoň pole 'title'.",
    fehler_titel_fehlt: "Zadajte prosím názov.",
    fehler_unerwartet: "Neočakávaná chyba:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" medzitým vymazal niekto iný. Vaše zmeny neboli uložené.",
    fehler_konflikt_geaendert: "\"{{titel}}\" medzitým zmenil niekto iný (napr. komentár, hodnotenie alebo vlastná úprava).\n\nAby nedošlo k prepísaniu, vaše zmeny NEBOLI uložené. Otvorte prosím recept znova a zadajte zmeny znova.",
    fehler_vorgang_fehlgeschlagen: "Akcia zlyhala:\n{{fehler}}",
    fehler_teilen_drucken: "Neočakávaná chyba pri zdieľaní/tlači:\n{{fehler}}",
    fehler_config_entity_fehlt: "Zadajte prosím 'entity' v konfigurácii karty, napr. entity: todo.rezepte",
    fehler_bild_lesen: "Fotku sa nepodarilo prečítať (súbor je poškodený alebo nepodporovaný).",
    fehler_bild_verarbeiten: "Fotku sa nepodarilo spracovať ako obrázok (nepodporovaný formát?).",
    teilen_ueberschrift_zutaten: "SUROVINY",
    teilen_ueberschrift_zubereitung: "POSTUP",
    seite_zurueck_btn: "← Späť",
    seite_weiter_btn: "Ďalej →",
    seite_anzeige: "Strana {{aktuell}} z {{gesamt}}",
    update_neue_version: "K dispozícii je nová verzia: {{version}}",
    update_ansehen_btn: "Zobraziť",
    update_schliessen_aria: "Skryť upozornenie",
    detail_kochmodus_btn: "🍳 Režim varenia",
    kochmodus_schritt_anzeige: "Krok {{aktuell}} z {{gesamt}}",
    kochmodus_schliessen_aria: "Zavrieť režim varenia",
    kochmodus_schritt_zurueck_aria: "Predchádzajúci krok",
    kochmodus_schritt_weiter_aria: "Ďalší krok",
    kochmodus_zutaten_ein_aria: "Zobraziť suroviny",
    kochmodus_zutaten_aus_aria: "Skryť suroviny",
    kopf_sammel_pdf_btn: "📚 Súhrnné PDF",
    sammel_pdf_keine_rezepte: "Nenašli sa žiadne recepty na export.",
    sammel_pdf_frage_toc: "Vytvoriť obsah pre vybrané recepty?",
    sammel_pdf_ja_toc_btn: "Áno, vytvoriť obsah",
    sammel_pdf_nein_toc_btn: "Nie, bez obsahu",
    sammel_pdf_name_placeholder: "Názov kuchárskej knihy",
    sammel_pdf_erstellen_btn: "Vytvoriť PDF",
    abschnitt_titel_inhaltsverzeichnis: "Obsah",
    sammel_pdf_frage_umfang: "Ktoré recepty majú byť v spoločnom PDF?",
    sammel_pdf_alle_rezepte_btn: "Všetky zobrazené recepty",
    sammel_pdf_auswahl_btn: "Vybrať konkrétne recepty",
    sammel_pdf_auswahl_titel: "Vybrať recepty",
    sammel_pdf_alle_auswaehlen_link: "Vybrať všetko",
    sammel_pdf_keine_auswaehlen_link: "Zrušiť výber",
    sammel_pdf_weiter_btn: "Ďalej",
    sammel_pdf_auswahl_keine_hinweis: "Vyberte aspoň jeden recept.",
  },
  sl: {
    allgemein_zurueck: "← Nazaj",
    allgemein_ja: "Da",
    allgemein_nein: "Ne",
    allgemein_speichern: "Shrani",
    allgemein_speichert: "Shranjevanje…",
    allgemein_abbrechen: "Prekliči",
    allgemein_bearbeiten: "Uredi",
    allgemein_loeschen: "Izbriši",
    allgemein_oeffnen: "Odpri",
    allgemein_unbekannt: "Neznano",
    allgemein_schliessen: "Zapri",
    kategorie_hauptgericht: "Glavna jed",
    kategorie_vorspeise: "Predjed",
    kategorie_suppe: "Juha",
    kategorie_salat: "Solata",
    kategorie_beilage: "Priloga",
    kategorie_dessert: "Sladica",
    kategorie_kuchen_gebaeck: "Torte in pecivo",
    kategorie_fruehstueck: "Zajtrk",
    kategorie_snack: "Prigrizek",
    kategorie_getraenk: "Pijača",
    kategorie_sonstiges: "Drugo",
    kategorie_filter_alle: "Vse",
    wochentag_montag: "Ponedeljek",
    wochentag_dienstag: "Torek",
    wochentag_mittwoch: "Sreda",
    wochentag_donnerstag: "Četrtek",
    wochentag_freitag: "Petek",
    wochentag_samstag: "Sobota",
    wochentag_sonntag: "Nedelja",
    sortier_titel: "Po abecedi (A-Ž)",
    sortier_bewertung: "Najboljša ocena najprej",
    sortier_kategorie: "Po kategoriji",
    sortier_neu: "Najnovejše najprej",
    sortieren_label: "Razvrsti po:",
    kopf_titel_standard: "Kuharska knjiga",
    kopf_sichern_btn: "💾 Varnostna kopija",
    kopf_wochenplan_btn: "📅 Tedenski načrt",
    einkaufsmodus_start_btn: "🛒 Nakupovalni seznam",
    einkaufsmodus_beenden_btn: "✕ Končaj izbiranje",
    kopf_neu_btn: "+ Nov",
    suche_placeholder: "🔍 Recept ali sestavine (npr. moka, jajca)…",
    kochbuch_loeschen_title: "Izbriši zbirko",
    kochbuch_loeschen_aria: "Izbriši zbirko {{name}}",
    kochbuch_speichern_btn: "+ Shrani kot pametno zbirko",
    kochbuch_name_placeholder: "Ime za to zbirko, npr. Jesenski recepti",
    fehler_kochbuch_name_fehlt: "Vnesi ime za zbirko.",
    kochbuch_info_aria: "Prikaži razlago pametnih zbirk",
    kochbuch_info_titel: "Kaj je pametna zbirka?",
    kochbuch_info_text:
      "Pametna zbirka ne shranjuje fiksnega seznama receptov, temveč " +
      "kombinacijo kategorije, oznak in iskalnega izraza, natanko " +
      "tako, kot so nastavljeni v trenutku shranjevanja. Nato se " +
      "samodejno posodablja: nov recept, ki ustreza, se samodejno " +
      "prikaže, recept, čigar kategorija ali oznake se spremenijo, pa " +
      "lahko prav tako samodejno spet izgine.",
    einkaufs_zaehler: "{{anzahl}} izbranih",
    einkaufsliste_erstellen_btn: "Ustvari nakupovalni seznam",
    fehler_einkaufsliste_keine_konfiguration: "Za nakupovalni seznam še manjka konfiguracija: prosimo, navedi 'shopping_list_entity' v konfiguraciji kartice (npr. shopping_list_entity: todo.einkaufsliste) - za to je potreben DRUGI pomočnik Lokalni seznam opravil. Glej ANLEITUNG-Backup.md, razdelek 18.",
    fehler_einkaufsliste_keine_auswahl: "Izberi vsaj en recept.",
    fehler_einkaufsliste_keine_zutaten: "Izbrani recepti ne vsebujejo sestavin.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Ni bilo mogoče dodati \"{{zeile}}\" na nakupovalni seznam:\n{{fehler}}\n\nŽe dodane sestavine ostanejo na seznamu.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} sestavin(a) dodanih na seznam \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" izbrisano.",
    undo_rueckgaengig_btn: "Razveljavi",
    leer_keine_rezepte: "Še ni receptov – začni z \"+ Nov\"",
    leer_keine_treffer: "Ni najdenih receptov za \"{{begriff}}\"",
    fehler_liste_laden_titel: "Ni bilo mogoče naložiti \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Ali ta seznam opravil obstaja? (Nastavitve → Naprave in storitve → Pomočniki)",
    kachel_aria_label_oeffnen: "Odpri recept {{titel}}",
    sterne_aria_label_gruppe: "Tvoja ocena",
    sterne_aria_label: "{{zahl}} od 5 zvezdic",
    fehler_kein_benutzer_bewertung: "Ni bilo mogoče ugotoviti tvojega uporabnika - ocenjevanje ni mogoče.",
    detail_teilen_drucken_btn: "📤 Deli / Natisni",
    detail_erstellt_von: "👤 Ustvaril(a) {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} ocena)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} ocen)",
    detail_keine_bewertungen: "Še ni ocen",
    detail_deine_bewertung: "Tvoja ocena:",
    detail_zubereitet_x: "🍳 pripravljeno {{anzahl}}x",
    detail_portionen_suffix: "porcij",
    abschnitt_titel_zutaten: "Sestavine",
    abschnitt_titel_zubereitung: "Priprava",
    keine_zutaten: "Ni navedenih sestavin",
    detail_kommentare_titel: "Komentarji",
    detail_keine_kommentare: "Še ni komentarjev",
    detail_kommentar_placeholder: "Dopolnitev, nasvet ali opomba…",
    detail_kommentar_hinzufuegen_btn: "Dodaj komentar",
    detail_bearbeiten_hinweis: "Samo {{name}} (ali skrbnik) lahko ureja ali izbriše ta recept.",
    detail_ersteller_unbekannt: "avtor(ica)",
    modal_zubereitet_frage: "Si pripravil(a) \"{{titel}}\"?",
    statistik_btn: "📊 Statistika",
    statistik_titel: "Statistika kuhanja",
    statistik_info_aria: "Prikaži razlago statistike",
    statistik_info_titel: "Kako se izračuna ta statistika?",
    statistik_info_text:
      "Ta pregled šteje vsako potrditev vprašanja „Si pripravil/a?“ - ne glede na velikost porcije ali kolikokrat isti dan. Če je to vprašanje onemogočeno z možnostjo kartice ask_cooked: false, se števila ne povečujejo več, že zabeležene priprave pa ostanejo ohranjene.",
    statistik_dieses_jahr: "V letu {{jahr}} si kuhal/a {{anzahl}}x iz svoje kuharske knjige",
    statistik_gesamt: "Skupaj si kuhal/a {{anzahl}}x iz svoje kuharske knjige",
    statistik_top_titel: "Največkrat pripravljeno",
    statistik_keine_daten: "Še ni zabeleženih priprav.",
    modal_loeschen_frage: "Res izbrisati \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Da, izbriši",
    wochenplan_titel: "Tedenski načrt",
    wochenplan_tab_diese: "Ta teden",
    wochenplan_tab_folgewoche: "Naslednji teden",
    wochenplan_hinweis_folgewoche: "Tukaj že zdaj načrtuj prihajajoči teden - samodejno se bo premaknil na \"Ta teden\", ko se trenutni teden konča.",
    wochenplan_hinweis_diese: "Pretekli dnevi se samodejno počistijo (sam recept ostane ohranjen, izgine le dodelitev).",
    wochenplan_hinweis_speicherung: "Shranjeno na vseh napravah (kot skrit dodatni vnos v istem seznamu receptov, dodaten pomočnik ni potreben).",
    wochenplan_leer: "Še ni receptov - najprej ustvari nekaj.",
    wochenplan_kein_rezept_option: "– ni recepta –",
    wochenplan_einkaufsliste_btn: "Ustvari nakupovalni seznam iz {{ziel}}",
    wochenplan_wort: "tedenski načrt",
    wochenplan_folgewoche_wort: "naslednji teden",
    wochenplan_aktuelle_woche_wort: "trenutni teden",
    wochenplan_keine_zuweisung: "{{zeitraum}} še ne vsebuje dodeljenih receptov.",
    formular_titel_neu: "Nov recept",
    formular_titel_bearbeiten: "Uredi recept",
    formular_url_import_btn: "🌐 Uvozi URL recepta",
    formular_url_label: "Povezava do spletne strani recepta",
    formular_url_placeholder: "https://www.primer-recepti.si/moj-recept",
    formular_url_hinweis: "Naloži stran in prebere strukturirane podatke recepta, ki so že vgrajeni vanjo (isti podatki, s katerimi npr. Google v iskanju prikazuje ocene z zvezdicami) - običajno zanesljivejše kot prepoznavanje besedila. Deluje samo na straneh, ki take podatke zagotavljajo in ne blokirajo avtomatiziranih zahtev.",
    formular_url_importieren_btn: "Uvozi",
    formular_url_laedt: "Nalaganje …",
    formular_text_einfuegen_btn: "🔍 Prilepi besedilo recepta (samodejno prepoznavanje)",
    formular_text_label: "Prilepi sem besedilo recepta (npr. kopirano s spletne strani recepta)",
    formular_text_placeholder: "Naslov, sestavine, priprava - preprosto prilepi celotno besedilo",
    formular_text_hinweis: "Povsem samodejno prepoznavanje brez UI - najbolje deluje z naslovi \"Sestavine\" in \"Priprava\" v besedilu. Nato na kratko preveri rezultat, lahko je nepopoln.",
    formular_text_erkennen_btn: "Prepoznaj",
    formular_json_einfuegen_btn: "📋 Prilepi JSON, ki ga je ustvaril UI",
    formular_json_info_aria: "Prikaži pripravljen poziv za UI",
    json_info_titel: "Poziv za UI",
    json_info_erklaerung:
      "Kopiraj to besedilo, prilepi ga v UI po izbiri (npr. ChatGPT ali Claude), dodaj besedilo svojega recepta in nato odgovor prilepi zgoraj pod „Prilepi JSON tukaj“.",
    json_info_prompt:
      "Pretvori besedilo recepta, ki ti ga bom takoj poslal, v EN sam JSON objekt - brez razlage, brez besedila pred ali za njim, samo JSON. Uporabi točno ta format:\n\n" +
      "{\n" +
      '  "title": "ime recepta",\n' +
      '  "servings": 4,\n' +
      '  "category": "ena izmed: {{kategorien}}",\n' +
      '  "ingredients": ["ena sestavina na vnos, npr. 200 g moke"],\n' +
      '  "steps": ["en korak priprave na vnos"],\n' +
      '  "tags": ["neobvezne oznake, npr. vegetarijansko"]\n' +
      "}\n\n" +
      "Pravila: „category“ mora biti NATANČNO ena od zgoraj navedenih vrednosti (prenesi jo nespremenjeno, tudi če je besedilo recepta v drugem jeziku - gre za fiksne notranje vrednosti). " +
      "„tags“ ni obvezen, prazno polje je v redu. " +
      "Ne izmišljuj si sestavin ali korakov, ki jih ni v besedilu. " +
      "Tukaj je besedilo recepta:",
    json_info_kopieren_btn: "📋 Kopiraj poziv",
    json_info_kopiert: "Kopirano!",
    formular_json_label: "Prilepi JSON tukaj",
    formular_json_uebernehmen_btn: "Uporabi",
    formular_label_titel: "Naslov",
    formular_label_kategorie: "Kategorija",
    formular_label_tags: "Oznake (mogoče je več, npr. \"vegetarijansko\", \"hitro\")",
    formular_tag_placeholder: "Vnesi in dodaj oznako",
    formular_tag_hinzufuegen_btn: "+ Oznaka",
    formular_tag_entfernen_aria: "Odstrani oznako {{tag}}",
    formular_label_portionen: "Porcije (osnova)",
    formular_label_zutaten: "Sestavine",
    formular_zutat_hinzufuegen_btn: "+ Sestavina",
    formular_zutat_menge_placeholder: "Količina",
    formular_zutat_einheit_placeholder: "Enota",
    formular_zutat_name_placeholder: "Sestavina",
    formular_zutat_entfernen_aria: "Odstrani sestavino",
    formular_label_zubereitung: "Priprava (koraki)",
    formular_schritt_hinzufuegen_btn: "+ Korak",
    formular_schritt_placeholder_beispiel: "npr. umij in nareži zelenjavo",
    formular_schritt_placeholder_naechster: "naslednji korak",
    formular_schritt_entfernen_aria: "Odstrani korak",
    formular_label_bild: "Slika",
    formular_bild_vorhanden_hinweis: "(obstaja – nova datoteka jo bo nadomestila)",
    formular_bild_hinweis: "Trenutna slika ostane ohranjena, če ne izbereš nove datoteke.",
    formular_bild_verkleinern_text: "Slika se pomanjšuje…",
    fehler_url_ungueltig: "Vnesi popoln naslov, ki se začne s http:// ali https://.",
    fehler_url_apostroph: "Ta naslov vsebuje apostrof (') in ga na žalost ni mogoče uvoziti.",
    fehler_url_keine_ausgabe: "Skript ni vrnil nobenega izpisa. Je 'rezeptbuch_url_importieren' nastavljen v configuration.yaml in je bil Home Assistant od takrat v celoti ponovno zagnan?",
    fehler_url_kein_json: "Odgovor uvoznega skripta ni bil veljaven JSON.",
    fehler_url_import_fehlgeschlagen: "Uvoz URL ni uspel: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "V prilepljenem besedilu na žalost ni bilo mogoče ničesar prepoznati. Prosimo, izpolni spodnja polja ročno.",
    warnung_texterkennung_unvollstaendig: "Prepoznavanje je bilo nepopolno (sestavine ali koraki manjkajo/morda so napačno dodeljeni) - preveri in dopolni v obrazcu.",
    fehler_json_ungueltig: "Prilepljen JSON ni veljaven. Preveri ga in poskusi znova.",
    fehler_json_titel_fehlt: "V JSON manjka vsaj polje 'title'.",
    fehler_titel_fehlt: "Vnesi naslov.",
    fehler_unerwartet: "Nepričakovana napaka:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" je medtem izbrisal nekdo drug. Tvoje spremembe niso bile shranjene.",
    fehler_konflikt_geaendert: "\"{{titel}}\" je medtem spremenil nekdo drug (npr. komentar, ocena ali lastno urejanje).\n\nDa se nič ne prepiše, tvoje spremembe NISO bile shranjene. Ponovno odpri recept in znova vnesi svoje spremembe.",
    fehler_vorgang_fehlgeschlagen: "Dejanje ni uspelo:\n{{fehler}}",
    fehler_teilen_drucken: "Nepričakovana napaka pri deljenju/tiskanju:\n{{fehler}}",
    fehler_config_entity_fehlt: "Navedi 'entity' v konfiguraciji kartice, npr. entity: todo.rezepte",
    fehler_bild_lesen: "Slike ni bilo mogoče prebrati (datoteka je poškodovana ali ni podprta).",
    fehler_bild_verarbeiten: "Slike ni bilo mogoče obdelati kot sliko (nepodprta oblika?).",
    teilen_ueberschrift_zutaten: "SESTAVINE",
    teilen_ueberschrift_zubereitung: "PRIPRAVA",
    seite_zurueck_btn: "← Nazaj",
    seite_weiter_btn: "Naprej →",
    seite_anzeige: "Stran {{aktuell}} od {{gesamt}}",
    update_neue_version: "Na voljo je nova različica: {{version}}",
    update_ansehen_btn: "Ogled",
    update_schliessen_aria: "Skrij obvestilo",
    detail_kochmodus_btn: "🍳 Način kuhanja",
    kochmodus_schritt_anzeige: "Korak {{aktuell}} od {{gesamt}}",
    kochmodus_schliessen_aria: "Zapri način kuhanja",
    kochmodus_schritt_zurueck_aria: "Prejšnji korak",
    kochmodus_schritt_weiter_aria: "Naslednji korak",
    kochmodus_zutaten_ein_aria: "Prikaži sestavine",
    kochmodus_zutaten_aus_aria: "Skrij sestavine",
    kopf_sammel_pdf_btn: "📚 Zbirni PDF",
    sammel_pdf_keine_rezepte: "Ni najdenih receptov za izvoz.",
    sammel_pdf_frage_toc: "Želite ustvariti kazalo za izbrane recepte?",
    sammel_pdf_ja_toc_btn: "Da, ustvari kazalo",
    sammel_pdf_nein_toc_btn: "Ne, brez kazala",
    sammel_pdf_name_placeholder: "Ime kuharske knjige",
    sammel_pdf_erstellen_btn: "Ustvari PDF",
    abschnitt_titel_inhaltsverzeichnis: "Kazalo",
    sammel_pdf_frage_umfang: "Kateri recepti naj gredo v skupni PDF?",
    sammel_pdf_alle_rezepte_btn: "Vsi prikazani recepti",
    sammel_pdf_auswahl_btn: "Izberi določene recepte",
    sammel_pdf_auswahl_titel: "Izberi recepte",
    sammel_pdf_alle_auswaehlen_link: "Izberi vse",
    sammel_pdf_keine_auswaehlen_link: "Počisti izbor",
    sammel_pdf_weiter_btn: "Naprej",
    sammel_pdf_auswahl_keine_hinweis: "Izberite vsaj en recept.",
  },
  es: {
    allgemein_zurueck: "← Volver",
    allgemein_ja: "Sí",
    allgemein_nein: "No",
    allgemein_speichern: "Guardar",
    allgemein_speichert: "Guardando…",
    allgemein_abbrechen: "Cancelar",
    allgemein_bearbeiten: "Editar",
    allgemein_loeschen: "Eliminar",
    allgemein_oeffnen: "Abrir",
    allgemein_unbekannt: "Desconocido",
    allgemein_schliessen: "Cerrar",
    kategorie_hauptgericht: "Plato principal",
    kategorie_vorspeise: "Entrante",
    kategorie_suppe: "Sopa",
    kategorie_salat: "Ensalada",
    kategorie_beilage: "Guarnición",
    kategorie_dessert: "Postre",
    kategorie_kuchen_gebaeck: "Pasteles y repostería",
    kategorie_fruehstueck: "Desayuno",
    kategorie_snack: "Snack",
    kategorie_getraenk: "Bebida",
    kategorie_sonstiges: "Otro",
    kategorie_filter_alle: "Todas",
    wochentag_montag: "Lunes",
    wochentag_dienstag: "Martes",
    wochentag_mittwoch: "Miércoles",
    wochentag_donnerstag: "Jueves",
    wochentag_freitag: "Viernes",
    wochentag_samstag: "Sábado",
    wochentag_sonntag: "Domingo",
    sortier_titel: "Alfabético (A-Z)",
    sortier_bewertung: "Mejor valoración primero",
    sortier_kategorie: "Por categoría",
    sortier_neu: "Más reciente primero",
    sortieren_label: "Ordenar por:",
    kopf_titel_standard: "Libro de recetas",
    kopf_sichern_btn: "💾 Copia de seguridad",
    kopf_wochenplan_btn: "📅 Plan semanal",
    einkaufsmodus_start_btn: "🛒 Lista de la compra",
    einkaufsmodus_beenden_btn: "✕ Finalizar selección",
    kopf_neu_btn: "+ Nueva",
    suche_placeholder: "🔍 Receta o ingredientes (p. ej. harina, huevos)…",
    kochbuch_loeschen_title: "Eliminar colección",
    kochbuch_loeschen_aria: "Eliminar colección {{name}}",
    kochbuch_speichern_btn: "+ Guardar como colección inteligente",
    kochbuch_name_placeholder: "Nombre para esta colección, p. ej. Recetas de otoño",
    fehler_kochbuch_name_fehlt: "Introduce un nombre para la colección.",
    kochbuch_info_aria: "Mostrar explicación de las colecciones inteligentes",
    kochbuch_info_titel: "¿Qué es una colección inteligente?",
    kochbuch_info_text:
      "Una colección inteligente no guarda una lista fija de recetas, " +
      "sino una combinación de categoría, etiquetas y término de " +
      "búsqueda, tal como están configurados en el momento de " +
      "guardarla. Después se actualiza sola: una nueva receta que " +
      "encaje aparece automáticamente, y una receta cuya categoría o " +
      "etiquetas cambien puede desaparecer igual de automáticamente.",
    einkaufs_zaehler: "{{anzahl}} seleccionadas",
    einkaufsliste_erstellen_btn: "Crear lista de la compra",
    fehler_einkaufsliste_keine_konfiguration: "Aún falta la configuración para la lista de la compra: indica 'shopping_list_entity' en la configuración de la tarjeta (p. ej. shopping_list_entity: todo.einkaufsliste) - para ello se necesita un SEGUNDO asistente de Lista de tareas local. Consulta ANLEITUNG-Backup.md, sección 18.",
    fehler_einkaufsliste_keine_auswahl: "Selecciona al menos una receta.",
    fehler_einkaufsliste_keine_zutaten: "Las recetas seleccionadas no contienen ingredientes.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "No se pudo añadir \"{{zeile}}\" a la lista de la compra:\n{{fehler}}\n\nLos ingredientes ya añadidos permanecen en la lista.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingrediente(s) añadido(s) a \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" eliminada.",
    undo_rueckgaengig_btn: "Deshacer",
    leer_keine_rezepte: "Aún no hay recetas – empieza con \"+ Nueva\"",
    leer_keine_treffer: "No se encontraron recetas para \"{{begriff}}\"",
    fehler_liste_laden_titel: "No se pudo cargar \"{{entity}}\".",
    fehler_liste_laden_hinweis: "¿Existe esta lista de tareas? (Ajustes → Dispositivos y servicios → Asistentes)",
    kachel_aria_label_oeffnen: "Abrir receta {{titel}}",
    sterne_aria_label_gruppe: "Tu valoración",
    sterne_aria_label: "{{zahl}} de 5 estrellas",
    fehler_kein_benutzer_bewertung: "No se pudo determinar tu usuario - no es posible valorar.",
    detail_teilen_drucken_btn: "📤 Compartir / Imprimir",
    detail_erstellt_von: "👤 Creada por {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} valoración)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} valoraciones)",
    detail_keine_bewertungen: "Aún no hay valoraciones",
    detail_deine_bewertung: "Tu valoración:",
    detail_zubereitet_x: "🍳 preparada {{anzahl}} veces",
    detail_portionen_suffix: "raciones",
    abschnitt_titel_zutaten: "Ingredientes",
    abschnitt_titel_zubereitung: "Preparación",
    keine_zutaten: "No hay ingredientes indicados",
    detail_kommentare_titel: "Comentarios",
    detail_keine_kommentare: "Aún no hay comentarios",
    detail_kommentar_placeholder: "Añadido, consejo o nota…",
    detail_kommentar_hinzufuegen_btn: "Añadir comentario",
    detail_bearbeiten_hinweis: "Solo {{name}} (o un administrador) puede editar o eliminar esta receta.",
    detail_ersteller_unbekannt: "quien la creó",
    modal_zubereitet_frage: "¿Preparaste \"{{titel}}\"?",
    statistik_btn: "📊 Estadísticas",
    statistik_titel: "Estadísticas de cocina",
    statistik_info_aria: "Mostrar explicación de las estadísticas",
    statistik_info_titel: "¿Cómo se calcula esta estadística?",
    statistik_info_text:
      "Este resumen cuenta cada confirmación de la pregunta «¿Lo preparaste?» - independientemente del tamaño de la porción o de cuántas veces el mismo día. Si esta pregunta está desactivada mediante la opción de tarjeta ask_cooked: false, los números dejan de aumentar, pero las preparaciones ya registradas se conservan.",
    statistik_dieses_jahr: "Has cocinado {{anzahl}}x de tu recetario en {{jahr}}",
    statistik_gesamt: "Has cocinado {{anzahl}}x de tu recetario en total",
    statistik_top_titel: "Más preparado",
    statistik_keine_daten: "Todavía no hay preparaciones registradas.",
    modal_loeschen_frage: "¿Eliminar realmente \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Sí, eliminar",
    wochenplan_titel: "Plan semanal",
    wochenplan_tab_diese: "Esta semana",
    wochenplan_tab_folgewoche: "Próxima semana",
    wochenplan_hinweis_folgewoche: "Planifica aquí ya la próxima semana - pasará automáticamente a \"Esta semana\" en cuanto termine la semana actual.",
    wochenplan_hinweis_diese: "Los días pasados se vacían automáticamente (la receta en sí se conserva, solo desaparece la asignación).",
    wochenplan_hinweis_speicherung: "Se guarda en todos los dispositivos (como entrada adicional oculta en la misma lista de recetas, no se necesita ningún otro asistente).",
    wochenplan_leer: "Aún no hay recetas - crea primero algunas.",
    wochenplan_kein_rezept_option: "– sin receta –",
    wochenplan_einkaufsliste_btn: "Crear lista de la compra a partir de {{ziel}}",
    wochenplan_wort: "plan semanal",
    wochenplan_folgewoche_wort: "próxima semana",
    wochenplan_aktuelle_woche_wort: "semana actual",
    wochenplan_keine_zuweisung: "{{zeitraum}} aún no contiene recetas asignadas.",
    formular_titel_neu: "Nueva receta",
    formular_titel_bearbeiten: "Editar receta",
    formular_url_import_btn: "🌐 Importar URL de receta",
    formular_url_label: "Enlace al sitio web de la receta",
    formular_url_placeholder: "https://www.recetas-ejemplo.es/mi-receta",
    formular_url_hinweis: "Carga la página y lee los datos estructurados de la receta ya incorporados en ella (los mismos datos con los que, p. ej., Google muestra valoraciones con estrellas en la búsqueda) - normalmente más fiable que el reconocimiento de texto. Solo funciona en sitios que proporcionan esos datos y no bloquean solicitudes automatizadas.",
    formular_url_importieren_btn: "Importar",
    formular_url_laedt: "Cargando …",
    formular_text_einfuegen_btn: "🔍 Pegar texto de la receta (detección automática)",
    formular_text_label: "Pega aquí el texto de la receta (p. ej. copiado de un sitio de recetas)",
    formular_text_placeholder: "Título, ingredientes, preparación - simplemente pega todo el texto",
    formular_text_hinweis: "Reconocimiento puramente automático sin IA - funciona mejor con los títulos \"Ingredientes\" y \"Preparación\" en el texto. Comprueba brevemente el resultado después, puede estar incompleto.",
    formular_text_erkennen_btn: "Detectar",
    formular_json_einfuegen_btn: "📋 Pegar JSON generado por IA",
    formular_json_info_aria: "Mostrar un prompt listo para una IA",
    json_info_titel: "Prompt para una IA",
    json_info_erklaerung:
      "Copia este texto, pégalo en una IA de tu elección (p. ej. ChatGPT o Claude), añade el texto de tu receta y luego pega la respuesta arriba en «Pega el JSON aquí».",
    json_info_prompt:
      "Convierte el texto de la receta que te voy a enviar a continuación en UN único objeto JSON - sin explicaciones, sin texto antes ni después, solo el JSON. Usa exactamente este formato:\n\n" +
      "{\n" +
      '  "title": "nombre de la receta",\n' +
      '  "servings": 4,\n' +
      '  "category": "una de: {{kategorien}}",\n' +
      '  "ingredients": ["un ingrediente por entrada, p. ej. 200 g de harina"],\n' +
      '  "steps": ["un paso de preparación por entrada"],\n' +
      '  "tags": ["etiquetas opcionales, p. ej. vegetariano"]\n' +
      "}\n\n" +
      "Reglas: «category» debe ser EXACTAMENTE uno de los valores indicados arriba (cópialo sin modificar, aunque el texto de la receta esté en otro idioma - son valores internos fijos). " +
      "«tags» es opcional, un array vacío también sirve. " +
      "No inventes ingredientes ni pasos que no estén en el texto. " +
      "Aquí está el texto de la receta:",
    json_info_kopieren_btn: "📋 Copiar prompt",
    json_info_kopiert: "¡Copiado!",
    formular_json_label: "Pega el JSON aquí",
    formular_json_uebernehmen_btn: "Aplicar",
    formular_label_titel: "Título",
    formular_label_kategorie: "Categoría",
    formular_label_tags: "Etiquetas (varias posibles, p. ej. \"vegetariano\", \"rápido\")",
    formular_tag_placeholder: "Escribe y añade una etiqueta",
    formular_tag_hinzufuegen_btn: "+ Etiqueta",
    formular_tag_entfernen_aria: "Eliminar etiqueta {{tag}}",
    formular_label_portionen: "Raciones (base)",
    formular_label_zutaten: "Ingredientes",
    formular_zutat_hinzufuegen_btn: "+ Ingrediente",
    formular_zutat_menge_placeholder: "Cantidad",
    formular_zutat_einheit_placeholder: "Unidad",
    formular_zutat_name_placeholder: "Ingrediente",
    formular_zutat_entfernen_aria: "Eliminar ingrediente",
    formular_label_zubereitung: "Preparación (pasos)",
    formular_schritt_hinzufuegen_btn: "+ Paso",
    formular_schritt_placeholder_beispiel: "p. ej. lavar y cortar las verduras",
    formular_schritt_placeholder_naechster: "siguiente paso",
    formular_schritt_entfernen_aria: "Eliminar paso",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(existe – un nuevo archivo la sustituirá)",
    formular_bild_hinweis: "La foto actual se conserva si no eliges un nuevo archivo.",
    formular_bild_verkleinern_text: "Reduciendo la foto…",
    fehler_url_ungueltig: "Introduce una dirección completa que empiece por http:// o https://.",
    fehler_url_apostroph: "Esta dirección contiene un apóstrofo (') y lamentablemente no se puede importar.",
    fehler_url_keine_ausgabe: "El script no devolvió ninguna salida. ¿Está configurado 'rezeptbuch_url_importieren' en configuration.yaml y se ha reiniciado Home Assistant por completo desde entonces?",
    fehler_url_kein_json: "La respuesta del script de importación no era un JSON válido.",
    fehler_url_import_fehlgeschlagen: "Error al importar la URL: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Lamentablemente no se pudo reconocer nada en el texto pegado. Rellena los campos siguientes manualmente.",
    warnung_texterkennung_unvollstaendig: "El reconocimiento fue incompleto (faltan ingredientes o pasos, o pueden estar asignados incorrectamente) - comprueba y completa en el formulario.",
    fehler_json_ungueltig: "El JSON pegado no es válido. Compruébalo e inténtalo de nuevo.",
    fehler_json_titel_fehlt: "En el JSON falta al menos el campo 'title'.",
    fehler_titel_fehlt: "Introduce un título.",
    fehler_unerwartet: "Error inesperado:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" ha sido eliminada mientras tanto por otra persona. Tus cambios no se guardaron.",
    fehler_konflikt_geaendert: "\"{{titel}}\" ha sido modificada mientras tanto por otra persona (p. ej. un comentario, valoración o edición propia).\n\nPara evitar que algo se sobrescriba, tus cambios NO se guardaron. Abre la receta de nuevo e introduce tus cambios otra vez.",
    fehler_vorgang_fehlgeschlagen: "La operación falló:\n{{fehler}}",
    fehler_teilen_drucken: "Error inesperado al compartir/imprimir:\n{{fehler}}",
    fehler_config_entity_fehlt: "Indica 'entity' en la configuración de la tarjeta, p. ej. entity: todo.rezepte",
    fehler_bild_lesen: "No se pudo leer la foto (archivo dañado o no compatible).",
    fehler_bild_verarbeiten: "No se pudo procesar la foto como imagen (¿formato no compatible?).",
    teilen_ueberschrift_zutaten: "INGREDIENTES",
    teilen_ueberschrift_zubereitung: "PREPARACIÓN",
    seite_zurueck_btn: "← Atrás",
    seite_weiter_btn: "Siguiente →",
    seite_anzeige: "Página {{aktuell}} de {{gesamt}}",
    update_neue_version: "Nueva versión disponible: {{version}}",
    update_ansehen_btn: "Ver",
    update_schliessen_aria: "Ocultar aviso",
    detail_kochmodus_btn: "🍳 Modo cocina",
    kochmodus_schritt_anzeige: "Paso {{aktuell}} de {{gesamt}}",
    kochmodus_schliessen_aria: "Cerrar modo cocina",
    kochmodus_schritt_zurueck_aria: "Paso anterior",
    kochmodus_schritt_weiter_aria: "Paso siguiente",
    kochmodus_zutaten_ein_aria: "Mostrar ingredientes",
    kochmodus_zutaten_aus_aria: "Ocultar ingredientes",
    kopf_sammel_pdf_btn: "📚 PDF conjunto",
    sammel_pdf_keine_rezepte: "No se encontraron recetas para exportar.",
    sammel_pdf_frage_toc: "¿Crear un índice para las recetas seleccionadas?",
    sammel_pdf_ja_toc_btn: "Sí, crear índice",
    sammel_pdf_nein_toc_btn: "No, sin índice",
    sammel_pdf_name_placeholder: "Nombre del recetario",
    sammel_pdf_erstellen_btn: "Crear PDF",
    abschnitt_titel_inhaltsverzeichnis: "Índice",
    sammel_pdf_frage_umfang: "¿Qué recetas deben incluirse en el PDF conjunto?",
    sammel_pdf_alle_rezepte_btn: "Todas las recetas mostradas",
    sammel_pdf_auswahl_btn: "Seleccionar recetas concretas",
    sammel_pdf_auswahl_titel: "Seleccionar recetas",
    sammel_pdf_alle_auswaehlen_link: "Seleccionar todas",
    sammel_pdf_keine_auswaehlen_link: "Deseleccionar todas",
    sammel_pdf_weiter_btn: "Siguiente",
    sammel_pdf_auswahl_keine_hinweis: "Selecciona al menos una receta.",
  },
  sv: {
    allgemein_zurueck: "← Tillbaka",
    allgemein_ja: "Ja",
    allgemein_nein: "Nej",
    allgemein_speichern: "Spara",
    allgemein_speichert: "Sparar…",
    allgemein_abbrechen: "Avbryt",
    allgemein_bearbeiten: "Redigera",
    allgemein_loeschen: "Ta bort",
    allgemein_oeffnen: "Öppna",
    allgemein_unbekannt: "Okänd",
    allgemein_schliessen: "Stäng",
    kategorie_hauptgericht: "Huvudrätt",
    kategorie_vorspeise: "Förrätt",
    kategorie_suppe: "Soppa",
    kategorie_salat: "Sallad",
    kategorie_beilage: "Tillbehör",
    kategorie_dessert: "Efterrätt",
    kategorie_kuchen_gebaeck: "Bakverk och tårtor",
    kategorie_fruehstueck: "Frukost",
    kategorie_snack: "Mellanmål",
    kategorie_getraenk: "Dryck",
    kategorie_sonstiges: "Övrigt",
    kategorie_filter_alle: "Alla",
    wochentag_montag: "Måndag",
    wochentag_dienstag: "Tisdag",
    wochentag_mittwoch: "Onsdag",
    wochentag_donnerstag: "Torsdag",
    wochentag_freitag: "Fredag",
    wochentag_samstag: "Lördag",
    wochentag_sonntag: "Söndag",
    sortier_titel: "Alfabetiskt (A-Ö)",
    sortier_bewertung: "Bäst betyg först",
    sortier_kategorie: "Efter kategori",
    sortier_neu: "Senaste först",
    sortieren_label: "Sortera efter:",
    kopf_titel_standard: "Kokbok",
    kopf_sichern_btn: "💾 Säkerhetskopia",
    kopf_wochenplan_btn: "📅 Veckoplan",
    einkaufsmodus_start_btn: "🛒 Inköpslista",
    einkaufsmodus_beenden_btn: "✕ Avsluta val",
    kopf_neu_btn: "+ Ny",
    suche_placeholder: "🔍 Recept eller ingredienser (t.ex. mjöl, ägg)…",
    kochbuch_loeschen_title: "Ta bort samling",
    kochbuch_loeschen_aria: "Ta bort samling {{name}}",
    kochbuch_speichern_btn: "+ Spara som smart samling",
    kochbuch_name_placeholder: "Namn på denna samling, t.ex. Höstrecept",
    fehler_kochbuch_name_fehlt: "Ange ett namn för samlingen.",
    kochbuch_info_aria: "Visa förklaring av smarta samlingar",
    kochbuch_info_titel: "Vad är en smart samling?",
    kochbuch_info_text:
      "En smart samling sparar inte en fast lista med recept, utan " +
      "en kombination av kategori, taggar och sökterm, exakt som de " +
      "är inställda när du sparar den. Den uppdaterar sig sedan " +
      "själv: ett nytt recept som matchar dyker automatiskt upp, och " +
      "ett recept vars kategori eller taggar ändras kan lika " +
      "automatiskt försvinna igen.",
    einkaufs_zaehler: "{{anzahl}} valda",
    einkaufsliste_erstellen_btn: "Skapa inköpslista",
    fehler_einkaufsliste_keine_konfiguration: "Konfigurationen för inköpslistan saknas fortfarande: ange 'shopping_list_entity' i kortets konfiguration (t.ex. shopping_list_entity: todo.einkaufsliste) - för detta krävs en ANDRA hjälpare Lokal att-göra-lista. Se ANLEITUNG-Backup.md, avsnitt 18.",
    fehler_einkaufsliste_keine_auswahl: "Välj minst ett recept.",
    fehler_einkaufsliste_keine_zutaten: "De valda recepten innehåller inga ingredienser.",
    fehler_einkaufsliste_eintrag_fehlgeschlagen: "Det gick inte att lägga till \"{{zeile}}\" i inköpslistan:\n{{fehler}}\n\nRedan tillagda ingredienser finns kvar i listan.",
    einkaufsliste_hinzugefuegt: "{{anzahl}} ingrediens(er) tillagda i \"{{entity}}\".",
    undo_geloescht: "\"{{titel}}\" borttaget.",
    undo_rueckgaengig_btn: "Ångra",
    leer_keine_rezepte: "Inga recept än – kom igång med \"+ Ny\"",
    leer_keine_treffer: "Inga recept hittades för \"{{begriff}}\"",
    fehler_liste_laden_titel: "Det gick inte att läsa in \"{{entity}}\".",
    fehler_liste_laden_hinweis: "Finns denna att-göra-lista? (Inställningar → Enheter och tjänster → Hjälpare)",
    kachel_aria_label_oeffnen: "Öppna recept {{titel}}",
    sterne_aria_label_gruppe: "Ditt betyg",
    sterne_aria_label: "{{zahl}} av 5 stjärnor",
    fehler_kein_benutzer_bewertung: "Det gick inte att fastställa din användare - betygsättning inte möjlig.",
    detail_teilen_drucken_btn: "📤 Dela / Skriv ut",
    detail_erstellt_von: "👤 Skapat av {{name}}",
    detail_bewertung_singular: "{{durchschnitt}} ({{anzahl}} betyg)",
    detail_bewertung_plural: "{{durchschnitt}} ({{anzahl}} betyg)",
    detail_keine_bewertungen: "Inga betyg än",
    detail_deine_bewertung: "Ditt betyg:",
    detail_zubereitet_x: "🍳 tillagat {{anzahl}} gånger",
    detail_portionen_suffix: "portioner",
    abschnitt_titel_zutaten: "Ingredienser",
    abschnitt_titel_zubereitung: "Tillagning",
    keine_zutaten: "Inga ingredienser angivna",
    detail_kommentare_titel: "Kommentarer",
    detail_keine_kommentare: "Inga kommentarer än",
    detail_kommentar_placeholder: "Tillägg, tips eller anmärkning…",
    detail_kommentar_hinzufuegen_btn: "Lägg till kommentar",
    detail_bearbeiten_hinweis: "Endast {{name}} (eller en administratör) kan redigera eller ta bort detta recept.",
    detail_ersteller_unbekannt: "den som skapade det",
    modal_zubereitet_frage: "Lagade du \"{{titel}}\"?",
    statistik_btn: "📊 Statistik",
    statistik_titel: "Matlagningsstatistik",
    statistik_info_aria: "Visa förklaring av statistiken",
    statistik_info_titel: "Hur beräknas denna statistik?",
    statistik_info_text:
      "Den här sammanställningen räknar varje bekräftelse av frågan „Lagade du den?“ - oavsett portionsstorlek eller hur många gånger samma dag. Om frågan är inaktiverad via kortalternativet ask_cooked: false slutar siffrorna att öka, men redan registrerade tillagningar behålls.",
    statistik_dieses_jahr: "Du har lagat mat {{anzahl}}x från din receptbok under {{jahr}}",
    statistik_gesamt: "Du har lagat mat {{anzahl}}x från din receptbok totalt",
    statistik_top_titel: "Mest tillagad",
    statistik_keine_daten: "Inga tillagningar registrerade ännu.",
    modal_loeschen_frage: "Verkligen ta bort \"{{titel}}\"?",
    modal_loeschen_ja_btn: "Ja, ta bort",
    wochenplan_titel: "Veckoplan",
    wochenplan_tab_diese: "Denna vecka",
    wochenplan_tab_folgewoche: "Nästa vecka",
    wochenplan_hinweis_folgewoche: "Planera redan nu kommande vecka här - den flyttas automatiskt till \"Denna vecka\" så snart aktuell vecka är slut.",
    wochenplan_hinweis_diese: "Passerade dagar töms automatiskt (själva receptet finns kvar, bara tilldelningen försvinner).",
    wochenplan_hinweis_speicherung: "Sparas mellan enheter (som en dold extra post i samma receptlista, ingen ytterligare hjälpare behövs).",
    wochenplan_leer: "Inga recept än - skapa några först.",
    wochenplan_kein_rezept_option: "– inget recept –",
    wochenplan_einkaufsliste_btn: "Skapa inköpslista från {{ziel}}",
    wochenplan_wort: "veckoplan",
    wochenplan_folgewoche_wort: "nästa vecka",
    wochenplan_aktuelle_woche_wort: "aktuell vecka",
    wochenplan_keine_zuweisung: "{{zeitraum}} innehåller ännu inga tilldelade recept.",
    formular_titel_neu: "Nytt recept",
    formular_titel_bearbeiten: "Redigera recept",
    formular_url_import_btn: "🌐 Importera recept-URL",
    formular_url_label: "Länk till receptets webbsida",
    formular_url_placeholder: "https://www.exempel-recept.se/mitt-recept",
    formular_url_hinweis: "Läser in sidan och läser receptets strukturerade data som redan finns inbäddade i den (samma data som t.ex. Google använder för att visa stjärnbetyg i sökresultat) - vanligtvis mer tillförlitligt än textigenkänning. Fungerar bara på sidor som tillhandahåller sådan data och inte blockerar automatiserade förfrågningar.",
    formular_url_importieren_btn: "Importera",
    formular_url_laedt: "Läser in …",
    formular_text_einfuegen_btn: "🔍 Klistra in recepttext (automatisk igenkänning)",
    formular_text_label: "Klistra in recepttexten här (t.ex. kopierad från en receptwebbsida)",
    formular_text_placeholder: "Titel, ingredienser, tillagning - klistra bara in hela texten",
    formular_text_hinweis: "Rent automatisk igenkänning utan AI - fungerar bäst med rubrikerna \"Ingredienser\" och \"Tillagning\" i texten. Kontrollera resultatet kort efteråt, det kan vara ofullständigt.",
    formular_text_erkennen_btn: "Känn igen",
    formular_json_einfuegen_btn: "📋 Klistra in AI-genererad JSON",
    formular_json_info_aria: "Visa en färdig prompt för en AI",
    json_info_titel: "Prompt för en AI",
    json_info_erklaerung:
      "Kopiera den här texten, klistra in den i en AI du väljer (t.ex. ChatGPT eller Claude), lägg till din receptext och klistra sedan in svaret ovan under „Klistra in JSON här“.",
    json_info_prompt:
      "Gör om receptexten som jag strax skickar till EXAKT ETT JSON-objekt - utan förklaring, utan text före eller efter, bara JSON. Använd exakt det här formatet:\n\n" +
      "{\n" +
      '  "title": "receptets namn",\n' +
      '  "servings": 4,\n' +
      '  "category": "en av: {{kategorien}}",\n' +
      '  "ingredients": ["en ingrediens per rad, t.ex. 200 g mjöl"],\n' +
      '  "steps": ["ett tillagningssteg per rad"],\n' +
      '  "tags": ["valfria nyckelord, t.ex. vegetariskt"]\n' +
      "}\n\n" +
      "Regler: „category“ måste vara EXAKT ett av värdena som listas ovan (kopiera det oförändrat, även om receptexten är på ett annat språk - det är fasta interna värden). " +
      "„tags“ är valfritt, en tom array funkar också. " +
      "Hitta inte på ingredienser eller steg som inte finns i texten. " +
      "Här är receptexten:",
    json_info_kopieren_btn: "📋 Kopiera prompt",
    json_info_kopiert: "Kopierad!",
    formular_json_label: "Klistra in JSON här",
    formular_json_uebernehmen_btn: "Använd",
    formular_label_titel: "Titel",
    formular_label_kategorie: "Kategori",
    formular_label_tags: "Taggar (flera möjliga, t.ex. \"vegetariskt\", \"snabbt\")",
    formular_tag_placeholder: "Skriv in och lägg till en tagg",
    formular_tag_hinzufuegen_btn: "+ Tagg",
    formular_tag_entfernen_aria: "Ta bort tagg {{tag}}",
    formular_label_portionen: "Portioner (bas)",
    formular_label_zutaten: "Ingredienser",
    formular_zutat_hinzufuegen_btn: "+ Ingrediens",
    formular_zutat_menge_placeholder: "Mängd",
    formular_zutat_einheit_placeholder: "Enhet",
    formular_zutat_name_placeholder: "Ingrediens",
    formular_zutat_entfernen_aria: "Ta bort ingrediens",
    formular_label_zubereitung: "Tillagning (steg)",
    formular_schritt_hinzufuegen_btn: "+ Steg",
    formular_schritt_placeholder_beispiel: "t.ex. tvätta och skär grönsakerna",
    formular_schritt_placeholder_naechster: "nästa steg",
    formular_schritt_entfernen_aria: "Ta bort steg",
    formular_label_bild: "Foto",
    formular_bild_vorhanden_hinweis: "(finns – en ny fil ersätter det)",
    formular_bild_hinweis: "Nuvarande foto behålls om du inte väljer en ny fil.",
    formular_bild_verkleinern_text: "Fotot förminskas…",
    fehler_url_ungueltig: "Ange en fullständig adress som börjar med http:// eller https://.",
    fehler_url_apostroph: "Denna adress innehåller en apostrof (') och kan tyvärr inte importeras.",
    fehler_url_keine_ausgabe: "Skriptet returnerade ingen utdata. Är 'rezeptbuch_url_importieren' konfigurerat i configuration.yaml och har Home Assistant startats om helt sedan dess?",
    fehler_url_kein_json: "Importskriptets svar var inte giltig JSON.",
    fehler_url_import_fehlgeschlagen: "URL-import misslyckades: {{fehler}}",
    fehler_texterkennung_nichts_gefunden: "Tyvärr gick det inte att känna igen något i den inklistrade texten. Fyll i fälten nedan manuellt.",
    warnung_texterkennung_unvollstaendig: "Igenkänningen var ofullständig (ingredienser eller steg saknas/kan vara felaktigt tilldelade) - kontrollera och komplettera i formuläret.",
    fehler_json_ungueltig: "Den inklistrade JSON:en är ogiltig. Kontrollera den och försök igen.",
    fehler_json_titel_fehlt: "I JSON:en saknas åtminstone fältet 'title'.",
    fehler_titel_fehlt: "Ange en titel.",
    fehler_unerwartet: "Oväntat fel:\n{{fehler}}",
    fehler_konflikt_geloescht: "\"{{titel}}\" har under tiden tagits bort av någon annan. Dina ändringar sparades inte.",
    fehler_konflikt_geaendert: "\"{{titel}}\" har under tiden ändrats av någon annan (t.ex. en kommentar, ett betyg eller en egen redigering).\n\nFör att inget ska skrivas över sparades dina ändringar INTE. Öppna receptet igen och ange dina ändringar på nytt.",
    fehler_vorgang_fehlgeschlagen: "Åtgärden misslyckades:\n{{fehler}}",
    fehler_teilen_drucken: "Oväntat fel vid delning/utskrift:\n{{fehler}}",
    fehler_config_entity_fehlt: "Ange 'entity' i kortets konfiguration, t.ex. entity: todo.rezepte",
    fehler_bild_lesen: "Fotot kunde inte läsas (filen är skadad eller stöds inte).",
    fehler_bild_verarbeiten: "Fotot kunde inte behandlas som en bild (format som inte stöds?).",
    teilen_ueberschrift_zutaten: "INGREDIENSER",
    teilen_ueberschrift_zubereitung: "TILLAGNING",
    seite_zurueck_btn: "← Tillbaka",
    seite_weiter_btn: "Nästa →",
    seite_anzeige: "Sida {{aktuell}} av {{gesamt}}",
    update_neue_version: "Ny version tillgänglig: {{version}}",
    update_ansehen_btn: "Visa",
    update_schliessen_aria: "Dölj meddelande",
    detail_kochmodus_btn: "🍳 Matlagningsläge",
    kochmodus_schritt_anzeige: "Steg {{aktuell}} av {{gesamt}}",
    kochmodus_schliessen_aria: "Stäng matlagningsläge",
    kochmodus_schritt_zurueck_aria: "Föregående steg",
    kochmodus_schritt_weiter_aria: "Nästa steg",
    kochmodus_zutaten_ein_aria: "Visa ingredienser",
    kochmodus_zutaten_aus_aria: "Dölj ingredienser",
    kopf_sammel_pdf_btn: "📚 Samlings-PDF",
    sammel_pdf_keine_rezepte: "Inga recept hittades att exportera.",
    sammel_pdf_frage_toc: "Vill du skapa en innehållsförteckning för de valda recepten?",
    sammel_pdf_ja_toc_btn: "Ja, skapa innehållsförteckning",
    sammel_pdf_nein_toc_btn: "Nej, ingen innehållsförteckning",
    sammel_pdf_name_placeholder: "Namn på kokboken",
    sammel_pdf_erstellen_btn: "Skapa PDF",
    abschnitt_titel_inhaltsverzeichnis: "Innehållsförteckning",
    sammel_pdf_frage_umfang: "Vilka recept ska ingå i den samlade PDF-filen?",
    sammel_pdf_alle_rezepte_btn: "Alla visade recept",
    sammel_pdf_auswahl_btn: "Välj specifika recept",
    sammel_pdf_auswahl_titel: "Välj recept",
    sammel_pdf_alle_auswaehlen_link: "Markera alla",
    sammel_pdf_keine_auswaehlen_link: "Avmarkera alla",
    sammel_pdf_weiter_btn: "Nästa",
    sammel_pdf_auswahl_keine_hinweis: "Välj minst ett recept.",
  },
};

// Die 24 offiziellen Amtssprachen der EU plus Schwiizerdütsch, für die
// UEBERSETZUNGEN oben einen eigenen Eintrag enthält (siehe _sprache()).
// Alle sind LTR - keine RTL-Sprache ist darunter, daher gibt es keine
// Layout-Sonderfälle dafür. "gsw" (Schwiizerdütsch) ist absichtlich mit
// drin, obwohl es - anders als alle anderen Einträge hier - KEIN
// zweistelliger ISO-639-1-Code ist, sondern der dreistellige Code, den
// Home Assistant selbst dafür verwendet (siehe _sprache() unten für die
// nötige Sonderbehandlung).
const UNTERSTUETZTE_SPRACHEN = new Set([
  "de", "en", "bg", "hr", "cs", "da", "nl", "et", "fi", "fr", "el", "hu",
  "ga", "it", "lv", "lt", "mt", "pl", "pt", "ro", "sk", "sl", "es", "sv",
  "gsw",
]);

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

// Version der Karte selbst (nicht zu verwechseln mit SCHEMA_VERSION oben,
// die die Datenstruktur EINES Rezepts betrifft). Wird klein in der
// Rezeptübersicht angezeigt und für den Update-Hinweis (Vergleich mit der
// neuesten GitHub-Version) verwendet. Kein automatischer Build-Schritt in
// diesem Projekt - muss bei jedem Release manuell synchron zu
// package.json/CHANGELOG.md gepflegt werden.
const CARD_VERSION = "1.0.5";
// Für den Vergleich der GitHub-Version mit CARD_VERSION (siehe
// _updatePruefen) - GitHub-Releases/Tags in diesem Projekt heißen "v1.0.4".
const GITHUB_REPO = "Chrism1412/rezeptbuch-card";

// Handschrift-Schriftart ("Great Vibes", SIL Open Font License) fuer den
// Kochbuch-Namen auf dem Sammel-PDF-Deckblatt (siehe
// _sammelPdfDeckblattSchriftEinbetten) - als Base64-Daten direkt in dieser
// Datei eingebettet, damit keine weitere Datei manuell installiert werden
// muss und der Titel auch ohne Internetzugang wie echte Handschrift
// aussieht (jsPDF selbst bringt nur Helvetica/Times/Courier mit).
const GREAT_VIBES_FONT_BASE64 = "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ggQEAAAPABn/QQJWAugDIQN1A+MEHQRwBIkEqAS5BMMEygTPBNIE1ATXBNkAAAEyNzIWHwMzFxUWFx4BMxUeAjMUFxQzHgEXHgEXFhUfAhQHIxUiHQEXFRYdASMVFCMXIxUGFRQWBxQmHQEzFTMVBhUjBgcVIxQGHQEGIwYdAQYrAQ8BLgEnMzQnIzciJzQ3NCciNzI9ATM0JzQ7ATU0NzQzFzU3NTM1Jj0BIzUjNCYrATUjNSM1IzUjNSI1BgcjNCcyNQcnIzUjJicjNCYHIhUGIxUjFRQmIzUjNCcjNSM1IzUjNDcyNSY1IyYHNSIHIgYzIxQHBicVIy4BBzUjBgcUBxUiJxUiBgcVIxUjBhUiFQYWDwEGBzQnIg8BIjUGIic0IwcUBh8BNDsBFBYHIxUXFRcWMzYzNDY9ATYnNxUzFRQ7ARUzFwYXFgciFSMVIxUUNzIVMxQ3NTYyHwEzFhcWBicHFAcUKwEGBxUjNSM0JzUmNSM0KwE0JyInIyY9ASMmNicjNCcjBiYjBgcGFBcWFTMWFzIHBiIHIwYfARYVFhczFzI3Mx4BNhc3MzUzPgE3NTI3FDYzFgcVMxczNzMVMxUzFTMVMxczNxUzFTMVBhcHJgcjByIHBgcjFSYGIxUUHwEzFRQjIiYVBxUjNCcjNSMVDgEdARYVMxcVBisBIicmIxUHIxUHFAcmIxUjFRQHFAcXFSMUFxYVMwYWOwE2MxYVBh0BMhcWNxUXFDYXFTMyFjYXFTMXFTMXMxQXNiczFRYXFhczNjU0NxYVMhUHMhUiBwYVIgciBiMWFCsBFAYHIxUUBxUjFSMVIiYHFAYVIxQHBiMUMwYVIgcUFw4BByMVIxUjFSM1NzUmNSYjBiM1IzUmJzUjNS8BNSMmJzQnJj0BJzU2NzY/ATU0LwE1Jj0BMzUjNScmFQcjNTM0NjUzFjcyFxUzNjMWMzU2FzUzNTI3JjQ3JgcmJyM1MzQ/ATYnIjUjFSM1MhUzMDYnMzUzNTM1IzUuASM1IzUjNCciJzUmKwE1NDYvASY9ATQ2NzU3NDc1NDc1NzUzFjM3Mj8BNDsBNjU/ATQWNzU0NjU3NjM1NDM0NzY3NDc1Mz8BPgEzMhcWMzI3MhM2MzUyJjczNTcXFTMXMxcWNjMUFjcVMxUzMhcVBhYHFCMGFzIHBiMGIxQHIgcVByMVBhUjFxQrASciNSInNCsBNSI2JzYvATYmNTI9ATI2JjUzNxcnIzUjFCsBFAcfARYVIxUnBhcHBhUHJiMGIzQnJgciJyMiNSMiFTUjNSM1IzUjNSYrASczMjYfATM2FjM1MzQ3NSM0JzUnNTI2FRYXFh0BMhYXFhQzFDczMhcVMxYVFxQzFxQzFDIVMxcUBxQPARYHMxUWFQcVIxUjFAc0BwYjFSYHIgcuASciNSIVJjUjJic1Ijc1NjMUOwE0OwEyNBczFTM3MzcyPwE0NzQXFh0BBhYHIxUGByIPAQYHBiMGFAcVBiYHBhUWFRYGFSMVIwcGJyI1NiczNTM1MzI+ATcnNDsBNTI1MjUmNRY2PQEzNTM0Mj0BMzUzNjc0JRQWFAcjNCYnIzQ3IzQvATM1MxYVMhUzFS8BIjU2NSM0NyM1IzUzFTMVMxUeAQczFBYVJhUyBxUFBiMGKwEmJzUzFjYXNTMWFCUiByYnNTIfATMnNRYXMhUHFxUjIjUFNhcnFRczBhMjAVwCHQwIBwkEBR4aCAoPAwECCAcBAQMCDgEEAQIGBwcEAgIFCwkHAgEFAwUCAgIEBgUFAQMCAQECAgIFAgIBAgEBAQUFBgEHAgIEAgYCAgIFAQEEAgIEAgQBBgICBQIEAQUKBwEBAw4EAgkGBwYEAwIHGgsCBAINAgUCAwcCBAEaCwIFAgMCAwITAQEBCAUEBgUCBwgHBh8EAgQEBwMCAwIEAQIFCAgCAwkCAgkCAgYEAgIJAQwBBgIJAggEAQEFBgUCAwgDBgIBAREBBVURBQcDChAOAgMCDysKARQGAQEFAg8CAQEDAgQCAgIUCA4FAggFBAQCAwYCBAwDBAwBAgQEBAIFBAQJBwIEBg0dBgUGBQYDCgEBBAMFAQIDFQUICQUGBAUeFAICAwECAgEBAQkEAQMGCgcKBAcCAgQHAiMIBxEBBgcYBAIFDBIEChUDAwMEAQgGAgUFBQIDAgEBBAkCBQQCAwECAhAGBQgDCAsCBQIEAicFAgEBAwMCAxgEBAUCBAICBgUDAgMEAwEBBQICBQEBBAECBAICDQQJAQEHBgIBAwEGBgNZAgIEDQgMBAMMAggIGgICBQITAgECBwcDCAQCAgYHAgUHAgUCAQECAgEDAgMDAQIFAgEBAgECAgICAQQCBAMRDwIBBQEIBAUFAgIGBQQCAwIEAwgDAQkEBwQEBQgUBAQBAgUDBQEGBgsNAgUGAgYBAgMHBQ0uBQgEFwYKEAYEDgQGQgwDAgICDQsFDwYHAgYKBAYCBwICAgMCAwIEAwMCBQYFEQEBAgUCCAcBAQ0FBAQCAhsCAgIHBQgCAgICBAICBWgEBA4EAgcCAQIFAgMBBAEBAwUCAwUCBAYDAQEFBA0HCA0BAQcCBAQCBQIHBgkHFwUFBgQCBgkCBwMEAgICAgEBAgEBBwIFCAcjAQERugcCAggBCRAEAQMFBgECBgMIAgIHAgwCAwQBBAoFCgEHAgcFDwIJAQEBngsIAgIBAQQBBAQCCgYEAwMCAgUDAwQCAgIHCQQCBwIHBQcCAgIBDAMFAgMCAgIBAwIFBAYJAwL+PwgBCQYFAgIGAQIDBgUCBAQEAwsGAgcCCQQCAgMBAwIECg8BUgcUAgYHAwMEAgEEIAb+zAcEAgMEAgMHCQEDAwUPBgIBJQEE4YIBATEBAtwJAQUIBAQNAwUCAgQNBQMDBAIEAgUEAwcGBgcNCwsJARIEFgsCDi0VDwECBgIFAxMCAwIDQQkCBwYIBg8GAgUEAQIBBwIEAwEBAwEBBgMEAgECBAQEBgECfQ4FAQEGAwYhAgQLBAEEAgQHCwYHAwIFBgIBBgIBDgEEAwEBAgIFAwQDAQUCBgIEAwYHAwEFBwYBBAMFBgMCAQUBBAQCBQUHBgUCAgYBBAgDBAMBAwIEAQUFBQIDBQMCAwkCAwYCFgQGBgMEAgECBgoCAQYQAgsVAgUGBgMCHQIBBQEBAQUCBAULEhIECQYDCAgBAgICAQIBAQIBAgECAgMCAgQDDQUCCQEDDAIBBAICDgQBBBQPCgICBwICBgUKAQICBgcFAQEDAwULEwICAgIFAgQEBAINAgEEAgEBAgMGBAMFBwMBBQEDAQEBAQILAgIBAgEQCQQCBAICFgMCBgYCAwQEAgIBAQUEMAQCAQQBAQIHBAQGDAMFAgIOAwUCBAIFAwIBAQUBBQMBBAEDBAEBAwIBBQIGAgUCAwQGAgEEAgIEAwEBAgIHBAQCAQUHDQICAQEGBAECAgECAgsEEAYCBwQCBBIHCAQDBgcCBgIEAwQDBg0nAwYMCgsVFA0cEAwDFggLAgMDAg8FAgQDAgEGAgIIAwEFBgUDDQECAQMDDQIDEgYEBAUJAQQBAwYaAgUCBgsDAgIEAh0FBQcfDxMYCQkI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ZXRpdEBhdHQubmV0KSwNd2l0aCBSZXNlcnZlZCBGb250IE5hbWUgIkdyZWF0IFZpYmVzIgAARwByAGUAYQB0ACAAVgBpAGIAZQBzAABHcmVhdCBWaWJlcwAAUgBlAGcAdQBsAGEAcgAAUmVndWxhcgAAUgBvAGIAZQByAHQARQAuAEwAZQB1AHMAYwBoAGsAZQA6ACAARwByAGUAYQB0ACAAVgBpAGIAZQBzADoAIAAyADAAMQAyAABSb2JlcnRFLkxldXNjaGtlOiBHcmVhdCBWaWJlczogMjAxMgAARwByAGUAYQB0ACAAVgBpAGIAZQBzAABHcmVhdCBWaWJlcwAAVgBlAHIAcwBpAG8AbgAgADEALgAwADAAMQAAVmVyc2lvbiAxLjAwMQAARwByAGUAYQB0AFYAaQBiAGUAcwAtAFIAZQBnAHUAbABhAHIAAEdyZWF0VmliZXMtUmVndWxhcgAARwByAGUAcgBhAHQAIABWAGkAYgBlAHMAIABpAHMAIABhACAAdAByAGEAZABlAG0AYQByAGsAIABvAGYAIABSAG8AYgBlAHIAdAAgAEUALgAgAEwAZQB1AHMAYwBoAGsAZQAuAABHcmVyYXQgVmliZXMgaXMgYSB0cmFkZW1hcmsgb2YgUm9iZXJ0IEUuIExldXNjaGtlLgAAUgBvAGIAZQByAHQAIABFAC4AIABMAGUAdQBzAGMAaABrAGUAAFJvYmVydCBFLiBMZXVzY2hrZQAAUgBvAGIAZQByAHQAIABFAC4AIABMAGUAdQBzAGMAaABrAGUAAFJvYmVydCBFLiBMZXVzY2hrZQAAdwB3AHcALgB0AHkAcABlAHMAZQB0AGkAdAAuAGMAbwBtAAB3d3cudHlwZXNldGl0LmNvbQAAVABoAGkAcwAgAEYAbwBuAHQAIABTAG8AZgB0AHcAYQByAGUAIABpAHMAIABsAGkAYwBlAG4AcwBlAGQAIAB1AG4AZABlAHIAIAB0AGgAZQAgAFMASQBMACAATwBwAGUAbgAgAEYAbwBuAHQAIABMAGkAYwBlAG4AcwBlACwAIABWAGUAcgBzAGkAbwBuACAAMQAuADEALgAgAFQAaABpAHMAIABsAGkAYwBlAG4AcwBlACAAaQBzACAAYQB2AGEAaQBsAGEAYgBsAGUAIAB3AGkAdABoACAAYQAgAEYAQQBRACAAYQB0ADoAIABoAHQAdABwADoALwAvAHMAYwByAGkAcAB0AHMALgBzAGkAbAAuAG8AcgBnAC8ATwBGAEwALgAAVGhpcyBGb250IFNvZnR3YXJlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBTSUwgT3BlbiBGb250IExpY2Vuc2UsIFZlcnNpb24gMS4xLiBUaGlzIGxpY2Vuc2UgaXMgYXZhaWxhYmxlIHdpdGggYSBGQVEgYXQ6IGh0dHA6Ly9zY3JpcHRzLnNpbC5vcmcvT0ZMLgAAaAB0AHQAcAA6AC8ALwBzAGMAcgBpAHAAdABzAC4AcwBpAGwALgBvAHIAZwAvAE8ARgBMAABodHRwOi8vc2NyaXB0cy5zaWwub3JnL09GTAAAAgAAAAAAAP+rAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAHBAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAvADAAMQAyADMANAA1ADYANwA4ADkAOgA7ADwAPQA+AD8AQABBAEIAQwBEAEUARgBHAEgASQBKAEsATABNAE4ATwBQAFEAUgBTAFQAVQBWAFcAWABZAFoAWwBcAF0AXgBfAGAAYQECAKMAhACFAL0AlgDoAIYAjgCLAJ0AqQCkAQMAigDaAIMAkwDyAPMAjQCXAIgAwwDeAPEAngCqAPUA9AD2AKIArQDJAMcArgBiAGMAkABkAMsAZQDIAMoAzwDMAM0AzgDpAGYA0wDQANEArwBnAPAAkQDWANQA1QBoAOsA7QCJAGoAaQBrAG0AbABuAKAAbwBxAHAAcgBzAHUAdAB2AHcA6gB4AHoAeQB7AH0AfAC4AKEAfwB+AIAAgQDsAO4AugEEAQUBBgEHAQgBCQD9AP4BCgELAQwBDQD/AQABDgEPARABAQERARIBEwEUARUBFgEXARgBGQEaAPgA+QEbARwBHQEeAR8BIAEhASIBIwEkASUBJgEnASgA+gDXASkBKgErASwBLQEuAS8BMAExATIBMwE0AOIA4wE1ATYBNwE4ATkBOgE7ATwBPQE+AT8BQACwALEBQQFCAUMBRAFFAUYBRwFIAUkBSgD7APwA5ADlAUsBTAFNAU4BTwFQAVEBUgFTAVQBVQFWAVcBWAFZAVoBWwFcAV0BXgFfAWAAuwFhAWIBYwFkAOYA5wCmAWUBZgFnAWgA2ADhANsA3ADdAOAA2QDfAJsBaQFqAWsBbAFtAW4BbwFwAXEBcgFzAXQBdQF2AXcBeAF5AXoBewF8AX0BfgCyALMBfwC2ALcAxAC0ALUAxQCCAMIAhwCrAMYAvgC/ALwBgAGBAYIBgwGEAYUBhgGHAYgBiQGKAYsBjAGNAY4BjwGQAZEAjACfAZIBkwCYAKgAmgCZAO8ApQCSAJwApwCPAJQAlQC5ANIAwADBAZQBlQGWAZcBmAGZAZoBmwGcAZ0BngGfAaABoQGiAaMBpAGlAaYBpwGoAakBqgGrAawBrQGuAa8BsAGxAbIBswG0AbUBtgG3AbgBuQG6AbsBvAG9Ab4BvwHAAcEBwgduYnNwYWNlB3VuaTAwQUQHQW1hY3JvbgdhbWFjcm9uBkFicmV2ZQZhYnJldmUHQW9nb25lawdhb2dvbmVrC0NjaXJjdW1mbGV4C2NjaXJjdW1mbGV4CkNkb3RhY2NlbnQKY2RvdGFjY2VudAZEY2Fyb24GZGNhcm9uBkRjcm9hdAdFbWFjcm9uB2VtYWNyb24KRWRvdGFjY2VudAplZG90YWNjZW50B0VvZ29uZWsHZW9nb25lawZFY2Fyb24GZWNhcm9uC0djaXJjdW1mbGV4C2djaXJjdW1mbGV4Ckdkb3RhY2NlbnQKZ2RvdGFjY2VudAxHY29tbWFhY2NlbnQMZ2NvbW1hYWNjZW50C0hjaXJjdW1mbGV4C2hjaXJjdW1mbGV4BEhiYXIEaGJhcgZJdGlsZGUGaXRpbGRlB0ltYWNyb24HaW1hY3JvbgdJb2dvbmVrB2lvZ29uZWsLSmNpcmN1bWZsZXgLamNpcmN1bWZsZXgMS2NvbW1hYWNjZW50DGtjb21tYWFjY2VudAxrZ3JlZW5sYW5kaWMGTGFjdXRlBmxhY3V0ZQxMY29tbWFhY2NlbnQMbGNvbW1hYWNjZW50BkxjYXJvbgZsY2Fyb24KTGRvdGFjY2VudAZOYWN1dGUGbmFjdXRlDE5jb21tYWFjY2VudAxuY29tbWFhY2NlbnQGTmNhcm9uBm5jYXJvbgNFbmcDZW5nB09tYWNyb24Hb21hY3Jvbg1PaHVuZ2FydW1sYXV0DW9odW5nYXJ1bWxhdXQGUmFjdXRlBnJhY3V0ZQxSY29tbWFhY2NlbnQMcmNvbW1hYWNjZW50BlJjYXJvbgZyY2Fyb24GU2FjdXRlBnNhY3V0ZQtTY2lyY3VtZmxleAtzY2lyY3VtZmxleAxUY29tbWFhY2NlbnQMdGNvbW1hYWNjZW50BlRjYXJvbgZ0Y2Fyb24EVGJhcgR0YmFyBlV0aWxkZQZ1dGlsZGUHVW1hY3Jvbgd1bWFjcm9uBlVicmV2ZQZ1YnJldmUFVXJpbmcFdXJpbmcNVWh1bmdhcnVtbGF1dA11aHVuZ2FydW1sYXV0B1VvZ29uZWsHdW9nb25lawtXY2lyY3VtZmxleAt3Y2lyY3VtZmxleAtZY2lyY3VtZmxleAt5Y2lyY3VtZmxleAZaYWN1dGUGemFjdXRlClpkb3RhY2NlbnQKemRvdGFjY2VudAxTY29tbWFhY2NlbnQMc2NvbW1hYWNjZW50CGRvdGxlc3NqCmFwb3N0cm9waGUHdW5pMUUwMgd1bmkxRTAzB3VuaTFFMEEHdW5pMUUwQgd1bmkxRTFFB3VuaTFFMUYHdW5pMUU0MAd1bmkxRTQxB3VuaTFFNTYHdW5pMUU1Nwd1bmkxRTYwB3VuaTFFNjEHdW5pMUU2QQd1bmkxRTZCBldncmF2ZQZ3Z3JhdmUGV2FjdXRlBndhY3V0ZQlXZGllcmVzaXMJd2RpZXJlc2lzBllncmF2ZQZ5Z3JhdmUJYWZpaTAwMjA4DXplcm8uc3VwZXJpb3INZm91ci5zdXBlcmlvcg1maXZlLnN1cGVyaW9yDHNpeC5zdXBlcmlvcg5zZXZlbi5zdXBlcmlvcg5laWdodC5zdXBlcmlvcg1uaW5lLnN1cGVyaW9yDXplcm8uaW5mZXJpb3IMb25lLmluZmVyaW9yDHR3by5pbmZlcmlvcg50aHJlZS5pbmZlcmlvcg1mb3VyLmluZmVyaW9yDWZpdmUuaW5mZXJpb3IMc2l4LmluZmVyaW9yDnNldmVuLmluZmVyaW9yDmVpZ2h0LmluZmVyaW9yDW5pbmUuaW5mZXJpb3IERXVybwl0d290aGlyZHMMdGhyZWVlaWdodGhzA2ZmaQNmZmwIWi5zdHJva2UFei5hbHQIei5zdHJva2ULei5hbHQuY2Fyb24Gcm9iYmllC3ouYWx0LmFjdXRlD3ouYWx0X2RvdGFjY2VudAVyLjAwMQVyLjAwMgdQX3IuMDAxA3RfdAViLmFsdAVkLmFsdAVlLjAwMQVmLmFsdAVoLmFsdAVoLjAwMQVrLjAwMQVrLmFsdAVsLjAwMQVwLjAwMQVzLmFsdAV0LjAwMQVDLmFsdAN0X2gDZV9uA2VfbQ56LnN0cm9rZS5hY3V0ZQ56LnN0cm9rZS5jYXJvbhJ6LnN0cm9rZV9kb3RhY2NlbnQOWi5zdHJva2VfYWN1dGUOWi5zdHJva2VfY2Fyb24SWi5zdHJva2VfZG90YWNjZW50A1RfaAN6X3oJemVyby5vbnVtCG9uZS5vbnVtCHR3by5vbnVtCnRocmVlLm9udW0JZm91ci5vbnVtCWZpdmUub251bQhzaXgub251bQpzZXZlbi5vbnVtCmVpZ2h0Lm9udW0JbmluZS5vbnVtAAAAAAEAAf//AA8AAAABAAAAAMmJbzEAAAAAy5c3qgAAAADLl55RAAEAAAAOAAAAGAAAAAAAAgABAAMBwAABAAQAAAACAAAAAQAAAAoAMAA+AAJERkxUAA5sYXRuABoABAAAAAD//wABAAAABAAAAAD//wABAAAAAWtlcm4ACAAAAAEAAAABAAQAAgAAAAEACAABAJIABAAAAAoAHgAkAEoAVABaAHAAdgB8AIIAjAABAEwASwAJAET/ygBI/8oATAAqAE8AFQBS/8MAVQAcAFb/3gBY/8MAXP/KAAIAOADNAEwASwABAFb//wAFAbn/yAG6/8IBvP+jAb7/7gHA/7UAAQG7/+cAAQG9AD8AAQG+ADgAAgG//84BwP/BAAEBwP/UAAEACgApADMANwBYAbgBugG7AbwBvgG/AAEAAAAKACwALgACREZMVAAObGF0bgAYAAQAAAAA//8AAAAEAAAAAP//AAAAAAAAAAAAAQAAAAA=";

// Vier fertig gerenderte, mit weichen Farbverläufen, Schlagschatten und
// Glanzlichtern illustrierte Küchen-Deko-Icons (Tomate, Karotten-Bund,
// Kochlöffel, Rührbesen) fuer das Sammel-PDF-Deckblatt (siehe
// _sammelPdfDeckblattDekorationZeichnen) - als PNG-Bilddaten (Base64) direkt
// in dieser Datei eingebettet, damit keine weiteren Dateien installiert
// werden muessen. jsPDF kann selbst nur einfache Grundformen (Linien,
// Ellipsen, Dreiecke) zeichnen, keine derart plastisch schattierten
// Illustrationen - deshalb werden diese Icons als fertige Bilder erzeugt
// und per addImage() platziert statt live mit jsPDF-Grundformen gezeichnet.
const DEKO_ICON_TOMATE_BASE64 = "data:image/png;base64,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";
const DEKO_ICON_KAROTTEN_BASE64 = "data:image/png;base64,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";
const DEKO_ICON_KOCHLOEFFEL_BASE64 = "data:image/png;base64,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";
const DEKO_ICON_RUEHRBESEN_BASE64 = "data:image/png;base64,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";

// Wochenplan und gespeicherte Filter ("Kochbücher") brauchen KEINE eigene
// To-do-Liste (kein weiterer Helfer nötig) - sie werden als zwei besondere,
// versteckte Einträge in derselben "todo.rezepte"-Liste gespeichert, erkennbar
// an diesem festen "summary"-Wert. Überall dort, wo aus den geladenen Items
// die normale Rezeptliste gebildet wird, werden Items mit einem dieser
// Marker herausgefiltert, statt als (kaputtes) Rezept angezeigt zu werden.
const WOCHENPLAN_MARKER = "__rezeptbuch_wochenplan__";
const KOCHBUECHER_MARKER = "__rezeptbuch_kochbuecher__";

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
const ZUTAT_EINHEITEN = "kg|mg|ml|cl|el|tl|msp|prisen?|stück|stk\\.?|stange(?:n)?|zehe(?:n)?|bund|bd\\.?|dose(?:n)?|glas|gläser|packung(?:en)?|pck\\.?|scheibe(?:n)?|becher|blatt|blätter|würfel|tasse(?:n)?|esslöffel|teelöffel|handvoll|knolle(?:n)?|kopf|köpfe|gramm|kilo(?:gramm)?|gr\\.?|g|milliliter|liter|l";

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
};

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

function _zutatZeileParsen(rohzeile) {
  // Führende Listenzeichen ("-", "*", "•") entfernen, wie sie beim Kopieren
  // von Webseiten/Chefkoch häufig vorkommen.
  const zeile = rohzeile.replace(/^\s*[-*•]\s*/, "");
  const treffer = zeile.match(ZUTAT_MUSTER);
  if (!treffer) return { amount: "", unit: "", name: zeile.trim() };
  const [, amount, unit, name] = treffer;
  return { amount: (amount || "").trim(), unit: (unit || "").trim(), name: name.trim() };
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
      ergebnis.push({ amount, unit, name: zeile });
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

    ergebnis.push({ amount: (amount || "").trim(), unit: (unit || "").trim(), name });
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

    // Kochmodus (Vollbild-Schritt-für-Schritt-Ansicht in der Detailansicht,
    // siehe _renderDetail/_kochmodus*) - _kochmodusSchrittIndex ist
    // 0-basiert, im Gegensatz zur 1-basierten Anzeige für den Nutzer.
    this._kochmodusAktiv = false;
    this._kochmodusSchrittIndex = 0;
    this._kochmodusZutatenSichtbar = false;

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
    const tabelle = UEBERSETZUNGEN[sprache] || UEBERSETZUNGEN.de;
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
  // KATEGORIE_SCHLUESSEL).
  _kategorieLabel(kategorie) {
    const schluessel = KATEGORIE_SCHLUESSEL[kategorie] || KATEGORIE_SCHLUESSEL["Sonstiges"];
    return this._t(schluessel);
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
      if (this._ansicht === "detail" && this._config.ask_cooked !== false) {
        // Bei einer offenen Rezept-Detailansicht zuerst fragen, ob
        // zubereitet wurde - dazu den soeben verbrauchten History-Eintrag
        // wiederherstellen, statt direkt zur Liste zu springen. Per
        // Kartenoption "ask_cooked: false" lässt sich diese Abfrage
        // komplett abschalten (siehe _zurueck-btn-Handler und README).
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
  }

  disconnectedCallback() {
    if (this._popstateHandler) {
      window.removeEventListener("popstate", this._popstateHandler);
      this._popstateHandler = null;
    }
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
    if (!config.entity) {
      // Übersetzt trotz "this._hass" noch nicht gesetzt sein könnte
      // (setConfig() läuft üblicherweise VOR dem ersten hass-Update) -
      // _sprache()/_t() fallen in dem Fall einfach auf Deutsch zurück.
      throw new Error(this._t("fehler_config_entity_fehlt"));
    }
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._geladen) {
      this._geladen = true;
      // Erst laden, DANACH versuchen, eine zuvor offene Detailansicht aus
      // der URL wiederherzustellen (siehe _urlHashSetzen/_rezeptAusUrlWiederherstellen)
      // - die Rezeptliste muss dafür schon vorhanden sein.
      this._rezepteLaden().then(() => this._rezeptAusUrlWiederherstellen());
      // Bewusst NICHT abgewartet (fire-and-forget) - das Laden der Rezepte
      // darf nicht auf einen (u.U. langsamen oder fehlschlagenden)
      // Netzwerkzugriff auf GitHub warten. Rein informativ, siehe
      // _updatePruefen().
      this._updatePruefen();
    }
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
    try {
      const antwort = await this._hass.connection.sendMessagePromise({
        type: "todo/item/list",
        entity_id: this._config.entity,
      });
      const items = (antwort && antwort.items) || [];
      // Versteckte Wochenplan-/Kochbücher-Items herausfiltern, BEVOR aus dem
      // Rest die normale Rezeptliste gebildet wird - sie dürfen nirgends
      // (Liste, Suche, Kategorie-/Tag-Filter, Sortierung, Export) als
      // (kaputtes) Rezept auftauchen.
      this._wochenplanItem = items.find((i) => i.summary === WOCHENPLAN_MARKER) || null;
      this._kochbuecherItem = items.find((i) => i.summary === KOCHBUECHER_MARKER) || null;
      this._wochenplan = this._wochenplanAusItem(this._wochenplanItem);
      this._kochbuecher = this._kochbuecherAusItem(this._kochbuecherItem);
      this._rezepte = items
        .filter((item) => item.summary !== WOCHENPLAN_MARKER && item.summary !== KOCHBUECHER_MARKER)
        .map((item) => this._itemZuRezept(item));
    } catch (fehler) {
      console.error("Rezeptbuch: Laden fehlgeschlagen", fehler);
      this._rezepte = [];
      this._ladeFehler = fehler.message || String(fehler);
    }
    this._render();
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
    let daten = { servings: 1, ingredients: [], steps: [], image: null, ratings: {}, comments: [], creator: null, creatorName: null, created: null, category: "Sonstiges", tags: [], cookLog: [], schemaVersion: SCHEMA_VERSION };
    if (item.description) {
      try {
        const geparst = this._migriereRezept(JSON.parse(item.description));
        daten = {
          servings: geparst.servings || 1,
          ingredients: geparst.ingredients || [],
          steps: geparst.steps || [],
          image: geparst.image || null,
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
      alert(this._t("fehler_kein_benutzer_bewertung"));
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
      alert(this._t("fehler_vorgang_fehlgeschlagen", { fehler: fehler.message || fehler }));
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
    if (!this._config.shopping_list_entity) {
      alert(this._t("fehler_einkaufsliste_keine_konfiguration"));
      return;
    }
    if (!rezepteListe || rezepteListe.length === 0) {
      alert(this._t("fehler_einkaufsliste_keine_auswahl"));
      return;
    }
    const zeilen = this._einkaufslisteAggregieren(rezepteListe);
    if (zeilen.length === 0) {
      alert(this._t("fehler_einkaufsliste_keine_zutaten"));
      return;
    }
    for (const zeile of zeilen) {
      try {
        // Bewusst hass.callService() direkt statt _serviceAufrufen(): letzteres
        // ruft den Dienst immer für this._config.entity (die Rezeptliste) auf -
        // hier soll er aber für die separat konfigurierte Einkaufsliste laufen.
        await this._hass.callService("todo", "add_item", { item: zeile, entity_id: this._config.shopping_list_entity });
      } catch (fehler) {
        console.error("Rezeptbuch: Einkaufsliste - Eintrag konnte nicht angelegt werden", zeile, fehler);
        alert(this._t("fehler_einkaufsliste_eintrag_fehlgeschlagen", { zeile, fehler: fehler.message || fehler }));
        return;
      }
    }
    alert(this._t("einkaufsliste_hinzugefuegt", { anzahl: zeilen.length, entity: this._config.shopping_list_entity }));
  }

  // Wertet die cookLog-Einträge (je ein ISO-Zeitstempel pro Bestätigung der
  // "Hast du zubereitet?"-Frage) über alle Rezepte hinweg aus: Anzahl im
  // laufenden Kalenderjahr, Anzahl insgesamt, sowie die 5 meistgekochten
  // Rezepte. Reine Client-seitige Auswertung vorhandener Daten - kein
  // separates Skript, keine Datenbank, kein automation-Trigger (siehe
  // _zubereitetModalAnzeigen/ask_cooked für die Datenerfassung selbst).
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

  _rezepteExportieren() {
    const daten = this._rezepte.map((r) => ({
      title: r.title,
      ...this._rezeptPayload(r),
    }));
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
  // Detailansicht).
  _kochmodusZuruecksetzen() {
    this._kochmodusAktiv = false;
    this._kochmodusSchrittIndex = 0;
    this._kochmodusZutatenSichtbar = false;
  }

  _kochmodusOeffnen() {
    this._kochmodusAktiv = true;
    this._kochmodusSchrittIndex = 0;
    this._render();
  }

  _kochmodusSchliessen() {
    this._kochmodusAktiv = false;
    this._render();
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
        alert(this._t("fehler_konflikt_geloescht", { titel: rezept.title }));
        this._navigationZurueck();
        return;
      }
      const aktuellerStand = JSON.stringify(this._rezeptPayload(frisch));
      if (this._bearbeitungsSnapshot !== null && aktuellerStand !== this._bearbeitungsSnapshot) {
        alert(this._t("fehler_konflikt_geaendert", { titel: rezept.title }));
        return;
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
      image: formDaten.image,
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

    // Ein neu hochgeladenes (oder noch nicht migriertes) Foto liegt hier noch
    // als Base64-Data-URL im JSON. Das Bild-Skript lagert es in eine echte
    // Datei unter /config/www/rezeptbuch-bilder/ aus - warten wir kurz darauf,
    // damit die Liste danach schon den optimierten Zustand zeigt. Schlägt es
    // fehl, bleibt das Foto einfach als Base64 im JSON (funktioniert weiterhin
    // überall, ist nur nicht ausgelagert) - kein Grund, das Speichern selbst
    // scheitern zu lassen.
    if (payload.image && payload.image.startsWith("data:")) {
      try {
        await this._hass.callService("shell_command", "rezeptbuch_bilder_verarbeiten", {});
      } catch (fehler) {
        console.warn("Rezeptbuch: Foto-Auslagerung fehlgeschlagen, Foto bleibt vorerst als Base64 gespeichert", fehler);
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

  _render() {
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
          --kb-schrift-titel: Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif;
        }
        ha-card { padding: 18px; }
        /* Detail-/Formular-Ansicht: bei sehr breiten Containern (z.B. Panel-Ansicht
           auf einem großen Monitor) nicht auf volle Breite strecken - lange
           Textzeilen/Formularfelder werden sonst schlecht lesbar. Die Kachel-
           Übersicht (.grid) ist davon bewusst ausgenommen, die soll die Breite nutzen. */
        .eng, .formular { max-width: 700px; margin: 0 auto; }
        .kopf { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:8px; flex-wrap:wrap; }
        .kopf h2 {
          margin:0; font-size:1.5em; font-family: var(--kb-schrift-titel); font-weight:700;
          color: var(--primary-text-color);
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
          .kopf-aktionen button { flex:1 1 auto; }
        }
        .undo-banner {
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          background: var(--kb-terrakotta-hell); border-radius:10px; padding:10px 14px;
          margin-bottom:14px; font-size:0.9em; color: var(--kb-terrakotta-dunkel);
        }
        button.primaer {
          background: var(--kb-terrakotta); color:#fff;
          border:none; border-radius:999px; padding:9px 18px; cursor:pointer; font-size:0.9em; font-weight:600;
          box-shadow: 0 2px 6px rgba(193,101,47,0.35); white-space:nowrap;
        }
        button.sekundaer {
          background: transparent; color: var(--kb-terrakotta); border:1.5px solid var(--kb-terrakotta);
          border-radius:999px; padding:8px 16px; cursor:pointer; font-size:0.9em; font-weight:600; white-space:nowrap;
        }
        button.klein { padding:5px 12px; font-size:0.8em; }
        button.gefahr {
          background:#a8402a; color:#fff; border:none; border-radius:999px; padding:8px 16px; cursor:pointer; font-weight:600; white-space:nowrap;
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
        .fehler { text-align:center; color:#a8402a; padding: 24px 0; font-size:0.9em; }

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
          color: var(--primary-text-color);
        }
        .detail-trenner {
          border:none; height:2px; width:56px; background: var(--kb-terrakotta); border-radius:2px; margin:6px 0 14px;
        }

        .portionen-zeile {
          display:flex; align-items:center; gap:14px; margin:14px 0 18px;
          background: var(--kb-terrakotta-hell2); border-radius:999px; padding:8px 16px; width:fit-content;
        }
        .portionen-zeile button {
          width:32px; height:32px; border-radius:50%; border:none;
          background: var(--kb-terrakotta); color:#fff; font-size:1.1em; cursor:pointer; line-height:1;
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
          width:30px; height:30px; border-radius:50%; background: var(--kb-terrakotta); color:#fff;
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
          flex:0 0 32px; border:none; border-radius:8px; background:#a8402a; color:#fff; cursor:pointer;
        }
        .schritt-zeile { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
        .schritt-zeile .schritt-nummer {
          flex:0 0 24px; height:24px; border-radius:50%; background: var(--kb-terrakotta); color:#fff;
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
        .stern-voll { color:#d9a441; }
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
        .kommentar-formular textarea {
          width:100%; box-sizing:border-box; min-height:70px; padding:9px 12px; border-radius:10px;
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color);
          color: var(--primary-text-color); font-size:0.9em; margin-bottom:8px;
        }

        .sortier-zeile { display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:0.85em; color: var(--secondary-text-color); }
        .sortier-zeile select {
          padding:6px 10px; border-radius:999px; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--primary-text-color); font-size:0.9em;
        }

        .kategorie-filter, .tag-filter { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
        .chip {
          border:1.5px solid var(--kb-terrakotta-hell); background: var(--card-background-color);
          color: var(--kb-terrakotta-dunkel); border-radius:999px; padding:5px 13px; font-size:0.8em;
          cursor:pointer; font-weight:600;
        }
        .chip-aktiv { background: var(--kb-terrakotta); color:#fff; border-color: var(--kb-terrakotta); }
        .kochbuecher-zeile { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:16px; }
        .kochbuch-chip { cursor:pointer; }
        .kochbuch-loeschen {
          border:none; background:transparent; color:#a8402a; cursor:pointer; font-size:0.85em;
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
        .kachel-checkbox.checkbox-aktiv { background: var(--kb-terrakotta); color:#fff; }
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
          display:flex; align-items:center; justify-content:center; z-index: 1000; padding:20px;
        }
        .modal-box {
          background: var(--card-background-color); border-radius:16px; padding:24px;
          max-width:340px; width:100%; text-align:center; box-shadow:0 8px 30px rgba(0,0,0,0.35);
        }
        .modal-box p { margin:0 0 18px; font-size:1.05em; color: var(--primary-text-color); }
        .modal-aktionen { display:flex; gap:10px; justify-content:center; }

        /* Kochmodus: Vollbild-Schritt-für-Schritt-Ansicht (siehe
           _renderDetail/_kochmodus*) - deckt die ganze Karte ab, damit
           während des Kochens nichts anderes versehentlich antippbar ist. */
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
        .kochmodus-werkzeuge button.aktiv { background: var(--kb-terrakotta); color:#fff; }
        .kochmodus-zutaten-panel {
          background: var(--kb-terrakotta-hell); border-radius:12px; padding:12px 16px;
          margin-bottom:10px; max-height:32vh; overflow-y:auto; flex-shrink:0;
        }
        .kochmodus-zutaten-panel h4 { margin:0 0 6px; color: var(--kb-terrakotta-dunkel); }
        .kochmodus-zutaten-panel ul { margin:0; padding-left:20px; }
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
        /* Kleiner runder "?"-Knopf neben "Von KI erzeugtes JSON einfügen" -
           öffnet den fertigen Prompt zum Kopieren (siehe json-info-modal). */
        .info-btn {
          width:26px; height:26px; min-width:26px; border-radius:50%; border:1.5px solid var(--kb-terrakotta-hell);
          background: var(--card-background-color); color: var(--kb-terrakotta-dunkel); cursor:pointer;
          font-size:0.8em; font-weight:700; padding:0; line-height:1; display:flex; align-items:center; justify-content:center;
        }
      </style>
    `;

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

    const kategorieChips = this._rezepte.length
      ? `<div class="kategorie-filter" id="kategorie-filter">
          <button type="button" class="chip ${this._aktiveKategorie === "Alle" ? "chip-aktiv" : ""}" data-kategorie="Alle">${this._t("kategorie_filter_alle")}</button>
          ${KATEGORIEN.map((k) => `<button type="button" class="chip ${this._aktiveKategorie === k ? "chip-aktiv" : ""}" data-kategorie="${this._escape(k)}">${this._escape(this._kategorieLabel(k))}</button>`).join("")}
        </div>`
      : "";

    const alleTags = this._alleTags();
    const tagFilterZeile = alleTags.length
      ? `<div class="tag-filter" id="tag-filter">
          ${alleTags.map((t) => `<button type="button" class="chip ${this._aktiveTags.has(t) ? "chip-aktiv" : ""}" data-tag="${this._escape(t)}">#${this._escape(t)}</button>`).join("")}
        </div>`
      : "";

    const kochbuecherZeile = (this._rezepte.length || (this._kochbuecher || []).length)
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
            <button class="sekundaer" id="wochenplan-btn">${this._t("kopf_wochenplan_btn")}</button>
            ${this._rezepte.length ? `<button class="sekundaer" id="einkaufsmodus-btn">${this._einkaufslistenModus ? this._t("einkaufsmodus_beenden_btn") : this._t("einkaufsmodus_start_btn")}</button>` : ""}
            ${this._rezepte.length && this._config.ask_cooked !== false ? `<button class="sekundaer" id="statistik-btn">${this._t("statistik_btn")}</button>` : ""}
            <button class="primaer" id="neu-btn">${this._t("kopf_neu_btn")}</button>
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

    this.shadowRoot.getElementById("neu-btn").addEventListener("click", () => this._neuesRezeptFormular());
    this.shadowRoot.getElementById("wochenplan-btn").addEventListener("click", () => this._wochenplanAnzeigen());

    const sichernBtn = this.shadowRoot.getElementById("sichern-btn");
    if (sichernBtn) {
      sichernBtn.addEventListener("click", () => this._rezepteExportieren());
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
          alert(this._t("sammel_pdf_auswahl_keine_hinweis"));
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
        this._sammelPdfModalSchliessen();
        this._sammelPdfExport({ inhaltsverzeichnis: false, rezepte });
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
        this._sammelPdfModalSchliessen();
        this._sammelPdfExport({ inhaltsverzeichnis: true, titel, rezepte });
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

    const chipButtons = this.shadowRoot.querySelectorAll(".kategorie-filter .chip");
    chipButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._aktiveKategorie = btn.dataset.kategorie;
        chipButtons.forEach((b) => b.classList.toggle("chip-aktiv", b === btn));
        this._aktuelleSeite = 1;
        this._ergebnisAktualisieren();
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
        if (!name) { alert(this._t("fehler_kochbuch_name_fehlt")); return; }
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
          ? `<img class="kachel-bild" src="${this._escape(r.image)}" alt="">`
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

  _jsPdfLaden() {
    return new Promise((resolve, reject) => {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
        return;
      }
      const vorhandenesScript = document.getElementById("rezeptbuch-jspdf-script");
      if (vorhandenesScript) {
        vorhandenesScript.addEventListener("load", () => resolve(window.jspdf.jsPDF));
        vorhandenesScript.addEventListener("error", () => reject(new Error("jsPDF konnte nicht geladen werden")));
        return;
      }
      // Bevorzugt lokal von Home Assistant selbst ausgeliefert (/config/www/
      // -> /local/), damit der PDF-Export auch ohne Internetzugang und ohne
      // Abhängigkeit von einem externen CDN funktioniert. Ist die Datei
      // (noch) nicht hochgeladen, fällt es automatisch auf das CDN zurück -
      // bestehende Installationen ohne die lokale Datei funktionieren also
      // unverändert weiter.
      const script = document.createElement("script");
      script.id = "rezeptbuch-jspdf-script";
      script.src = "/local/rezeptbuch-jspdf.min.js";
      script.onload = () => resolve(window.jspdf.jsPDF);
      script.onerror = () => {
        script.remove();
        const cdnScript = document.createElement("script");
        cdnScript.id = "rezeptbuch-jspdf-script";
        cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        cdnScript.onload = () => resolve(window.jspdf.jsPDF);
        cdnScript.onerror = () => reject(new Error("jsPDF konnte nicht geladen werden (weder lokal noch über CDN)"));
        document.head.appendChild(cdnScript);
      };
      document.head.appendChild(script);
    });
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

  // Bettet die Handschrift-Schriftart "Great Vibes" (siehe
  // GREAT_VIBES_FONT_BASE64) in das übergebene jsPDF-Dokument ein, damit
  // der Kochbuch-Name auf dem Deckblatt (siehe _sammelPdfDeckblattZeichnen)
  // wie echte Handschrift aussieht statt nur schräggestellt zu sein.
  // `addFileToVFS`/`addFont` sind nur bei der echten jsPDF-Bibliothek
  // vorhanden, nicht bei den einfachen Fakes in den Tests - dort (und falls
  // das Einbetten aus irgendeinem Grund fehlschlägt) wird stattdessen auf
  // eine schräggestellte Times-kursiv-Schrift zurückgefallen. Gibt zurück,
  // ob die Handschrift-Schriftart erfolgreich eingebettet wurde.
  _sammelPdfDeckblattSchriftEinbetten(doc) {
    if (typeof doc.addFileToVFS !== "function" || typeof doc.addFont !== "function") return false;
    try {
      doc.addFileToVFS("GreatVibes-Regular.ttf", GREAT_VIBES_FONT_BASE64);
      doc.addFont("GreatVibes-Regular.ttf", "GreatVibes", "normal");
      return true;
    } catch (e) {
      console.error("Rezeptbuch: Handschrift-Schriftart für das Deckblatt konnte nicht eingebettet werden", e);
      return false;
    }
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
  // angeordnet (siehe _sammelPdfDeckblattCollageZeichnen), umrahmt von
  // vier illustrierten Küchen-Symbolen in den Lücken rund um die Fotos
  // (Tomate, Karotten-Bund, Kochlöffel, Rührbesen - siehe
  // _sammelPdfDeckblattDekorationZeichnen).
  // Gibt es kein einziges Foto, bleiben nur die Deko-Symbole und der Titel
  // auf der Seite.
  async _sammelPdfDeckblattZeichnen(doc, titel, rezepte, margin, pageWidth, pageHeight) {
    const usableWidth = pageWidth - margin * 2;

    // Für den Kochbuch-Namen wird die eingebettete Handschrift-Schriftart
    // "Great Vibes" genutzt (siehe _sammelPdfDeckblattSchriftEinbetten) -
    // echte jsPDF-Instanzen unterstützen das Einbetten von Schriftarten,
    // die einfachen Fakes in den Tests nicht; dort wird automatisch auf
    // Times kursiv-fett zurückgefallen. Handschrift-Schriften wirken bei
    // gleicher Punktgröße optisch deutlich zierlicher als serifenlose/
    // Serifen-Schriften, daher die größere Schriftgröße dafür.
    const schriftEingebettet = this._sammelPdfDeckblattSchriftEinbetten(doc);
    if (schriftEingebettet) doc.setFont("GreatVibes", "normal");
    else doc.setFont("times", "bolditalic");
    doc.setTextColor(20);

    // Durch die Schrägstellung (siehe `titelWinkel` unten) ragt eine Zeile
    // etwas weiter nach links/rechts hinaus als bei waagerechtem Text -
    // deshalb wird beim Umbrechen mit einer schmaleren Breite gerechnet als
    // tatsächlich zur Verfügung steht, damit ausreichend Abstand zu den
    // Seitenrändern bleibt.
    const titelSicherheitsrand = 16;
    const titelMaxBreite = Math.max(40, usableWidth - titelSicherheitsrand * 2);
    const { zeilen: titelZeilen, groesse: titelGroesse } = this._sammelPdfDeckblattTitelZeilenErmitteln(
      doc,
      titel,
      titelMaxBreite,
      schriftEingebettet ? 44 : 32,
      schriftEingebettet ? 24 : 18
    );
    const zeilenHoehe = titelGroesse * 0.42;

    // Schräg von links unten nach rechts oben (positiver Winkel).
    const titelWinkel = 4;
    let y = margin + 22;
    titelZeilen.forEach((zeile) => {
      doc.text(zeile, pageWidth / 2, y, { align: "center", angle: titelWinkel });
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

    // Die Deko-Symbole werden VOR den Fotos gezeichnet, liegen also
    // optisch dahinter: sie sitzen in den Lücken zwischen und rund um die
    // Collage-Kacheln (siehe _sammelPdfDeckblattDekorationZeichnen) und
    // werden dort, wo sich ein Foto darüberlegt, einfach überdeckt - wie
    // Deko, die zwischen echten, lose hingelegten Fotos hervorschaut.
    this._sammelPdfDeckblattDekorationZeichnen(doc, flaecheX, flaecheY, flaecheBreite, flaecheHoehe);

    const bildQuellen = rezepte.map((r) => r.image).filter(Boolean).slice(0, 6);
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

  // Platziert vier fertig illustrierte Küchen-Symbole (Tomate, Karotten-
  // Bund, Kochlöffel, Rührbesen - siehe DEKO_ICON_*_BASE64) in den LÜCKEN
  // rund um die Foto-Collage (oben/unten/links/rechts der Mitte, nicht in
  // den reinen Ecken) - als Deko, die zwischen den lose hingelegten Fotos
  // hervorschaut. Wird VOR den Fotos gezeichnet (siehe
  // _sammelPdfDeckblattZeichnen), sodass eine später darüberliegende Foto-
  // Kachel die Deko an dieser Stelle einfach überdeckt. Die Icons sind
  // fertige, mit weichen Farbverläufen/Schatten/Glanzlichtern gerenderte
  // PNG-Bilder (siehe DEKO_ICON_*_BASE64 oben in der Datei) statt live mit
  // jsPDF-Grundformen gezeichnet - jsPDF selbst kann nur einfache
  // Ellipsen/Dreiecke/Linien, keine derart plastischen Illustrationen.
  _sammelPdfDeckblattDekorationZeichnen(doc, x, y, breite, hoehe) {
    const groesse = Math.min(24, Math.max(14, Math.min(breite, hoehe) * 0.16));
    const icon = (datenUrl, cx, cy) => {
      doc.addImage(datenUrl, "PNG", cx - groesse / 2, cy - groesse / 2, groesse, groesse);
    };
    icon(DEKO_ICON_TOMATE_BASE64, x + breite * 0.5, y + hoehe * 0.07);
    icon(DEKO_ICON_KAROTTEN_BASE64, x + breite * 0.04, y + hoehe * 0.52);
    icon(DEKO_ICON_KOCHLOEFFEL_BASE64, x + breite * 0.96, y + hoehe * 0.5);
    icon(DEKO_ICON_RUEHRBESEN_BASE64, x + breite * 0.5, y + hoehe * 0.95);
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
  async _rezeptContentInPdfZeichnen(doc, r) {
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    const basisPortionen = r.servings || 1;
    const schritte = (r.steps || []).filter((s) => s && s.trim());
    const bild = r.image ? await this._bildAlsDatenUrlLaden(r.image) : null;

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

  async _pdfErstellen(r) {
    const jsPDFKlasse = await this._jsPdfLaden();
    const doc = new jsPDFKlasse({ unit: "mm", format: "a4" });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await this._rezeptContentInPdfZeichnen(doc, r);
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
      await this._sammelPdfDeckblattZeichnen(doc, optionen.titel || dateinameBasis, rezepteSortiert, margin, pageWidth, pageHeight);
      doc.addPage();
      this._sammelPdfInhaltsverzeichnisZeichnen(doc, optionen.titel || dateinameBasis, rezepteSortiert, margin, pageWidth);
    }

    const portionenVorher = this._portionen;
    try {
      for (let i = 0; i < rezepteSortiert.length; i++) {
        if (i > 0 || optionen.inhaltsverzeichnis) doc.addPage();
        this._portionen = rezepteSortiert[i].servings || 1;
        await this._rezeptContentInPdfZeichnen(doc, rezepteSortiert[i]);
      }
    } finally {
      this._portionen = portionenVorher;
    }

    this._pdfAlleSeitenWasserzeichenZeichnen(doc, pageWidth, pageHeight, margin);

    const dateiname = `${dateinameBasis.replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "_")}.pdf`;
    return { blob: doc.output("blob"), dateiname, mimeType: "application/pdf" };
  }

  async _htmlDateiErstellen(r) {
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
    const bild = r.image ? await this._bildAlsDatenUrlLaden(r.image) : null;
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

  async _rezeptDrucken(r) {
    try {
      let ergebnis;
      try {
        ergebnis = await this._pdfErstellen(r);
      } catch (pdfFehler) {
        console.error("Rezeptbuch: PDF-Erstellung fehlgeschlagen, nutze HTML als Rückfallebene", pdfFehler);
        ergebnis = await this._htmlDateiErstellen(r);
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
      alert(this._t("fehler_teilen_drucken", { fehler: fehler.message || fehler }));
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
      alert(this._t("sammel_pdf_keine_rezepte"));
      return;
    }
    this._sammelPdfGefilterteListe = liste;
    this._sammelPdfAusgewaehlteUids = new Set();
    this._sammelPdfWahlModus = "alle";
    const nameFeld = this.shadowRoot.getElementById("sammel-pdf-name-feld");
    if (nameFeld) nameFeld.value = "";
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
      alert(this._t("sammel_pdf_keine_rezepte"));
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
      alert(this._t("fehler_teilen_drucken", { fehler: fehler.message || fehler }));
    }
  }

  _renderDetail(stil) {
    const r = this._aktivesRezept;
    const basisPortionen = r.servings || 1;
    const bild = r.image
      // alt="": der Rezepttitel folgt direkt als <h1> unter dem Foto (siehe
      // unten) - ein beschreibender Alt-Text würde ihn nur doppelt vorlesen.
      ? `<div class="detail-bildbox"><img class="detail-bild" src="${this._escape(r.image)}" alt=""></div>`
      : "";
    const zeilen = (r.ingredients || [])
      .map((z) => {
        const menge = this._skaliereMenge(z.amount, basisPortionen, this._portionen);
        const mengeText = [menge !== "" ? menge : "", z.unit || ""].filter(Boolean).join(" ");
        return `<li>${mengeText ? `<span class="zutat-menge-chip">${this._escape(mengeText)}</span>` : ""}<span class="zutat-name">${this._escape(z.name)}</span></li>`;
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
      .map((k) => `<li>
          <span class="kommentar-autor">${this._escape(k.author)}</span><span class="kommentar-zeit">${this._formatZeit(k.zeit)}</span>
          <div class="kommentar-text">${this._escape(k.text)}</div>
        </li>`)
      .join("");

    this.shadowRoot.innerHTML = `
      ${stil}
      <ha-card>
       <div class="eng detail-breit">
        <div class="kopf">
          <button class="sekundaer" id="zurueck-btn">${this._t("allgemein_zurueck")}</button>
          <button class="sekundaer" id="drucken-btn">${this._t("detail_teilen_drucken_btn")}</button>
          ${schritte.length ? `<button class="sekundaer" id="kochmodus-btn">${this._t("detail_kochmodus_btn")}</button>` : ""}
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

        ${schritte.length ? `
        <div class="kochmodus-overlay" id="kochmodus-overlay" style="display:${this._kochmodusAktiv ? "flex" : "none"};">
          <div class="kochmodus-kopf">
            <h3 class="kochmodus-titel">${this._escape(r.title)}</h3>
            <button class="kochmodus-schliessen-btn" id="kochmodus-schliessen-btn" aria-label="${this._t("kochmodus_schliessen_aria")}">✕</button>
          </div>
          <div class="kochmodus-werkzeuge">
            <button class="sekundaer klein${this._kochmodusZutatenSichtbar ? " aktiv" : ""}" id="kochmodus-zutaten-btn" aria-label="${this._t(this._kochmodusZutatenSichtbar ? "kochmodus_zutaten_aus_aria" : "kochmodus_zutaten_ein_aria")}">🥕 ${this._t("abschnitt_titel_zutaten")}</button>
          </div>
          ${this._kochmodusZutatenSichtbar ? `
            <div class="kochmodus-zutaten-panel">
              <h4>${this._t("abschnitt_titel_zutaten")}</h4>
              <ul>${zeilen || `<li>${this._t("keine_zutaten")}</li>`}</ul>
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
      </ha-card>
    `;

    this.shadowRoot.getElementById("zurueck-btn").addEventListener("click", () => {
      if (this._config.ask_cooked === false) {
        this._navigationZurueck();
      } else {
        this._zubereitetModalAnzeigen();
      }
    });
    this.shadowRoot.getElementById("drucken-btn").addEventListener("click", () => this._rezeptDrucken(r));
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
          alert(this._t("wochenplan_keine_zuweisung", { zeitraum: zeigtFolgewoche ? this._t("wochenplan_folgewoche_wort") : this._t("wochenplan_aktuelle_woche_wort") }));
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
          <button type="button" class="sekundaer" id="url-einfuegen-btn" style="margin-bottom:12px;">${this._t("formular_url_import_btn")}</button>
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
            ${KATEGORIEN.map((k) => `<option value="${this._escape(k)}" ${((r.category || "Sonstiges") === k) ? "selected" : ""}>${this._escape(this._kategorieLabel(k))}</option>`).join("")}
          </select>

          <label>${this._t("formular_label_tags")}</label>
          <div id="tags-liste" class="tags-liste"></div>
          <div class="tag-eingabe-zeile">
            <input type="text" id="neuer-tag-feld" placeholder="${this._t("formular_tag_placeholder")}">
            <button type="button" class="sekundaer klein" id="tag-hinzufuegen">${this._t("formular_tag_hinzufuegen_btn")}</button>
          </div>

          <label>${this._t("formular_label_portionen")}</label>
          <input type="number" id="portionen-feld" min="1" step="1" value="${r.servings}">

          <label>${this._t("formular_label_zutaten")}</label>
          <div id="zutaten-liste">${zutatenZeilen}</div>
          <button type="button" class="sekundaer" id="zutat-hinzufuegen">${this._t("formular_zutat_hinzufuegen_btn")}</button>

          <label>${this._t("formular_label_zubereitung")}</label>
          <div id="schritte-liste">${schritteZeilen}</div>
          <button type="button" class="sekundaer" id="schritt-hinzufuegen">${this._t("formular_schritt_hinzufuegen_btn")}</button>

          <label>${this._t("formular_label_bild")} ${r.image ? this._t("formular_bild_vorhanden_hinweis") : ""}</label>
          <input type="file" id="bild-feld" accept="image/*">
          ${r.image ? `<div class="hinweis">${this._t("formular_bild_hinweis")}</div>` : ""}

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
        alert(this._t("fehler_url_ungueltig"));
        return;
      }
      if (url.includes("'")) {
        // Die URL wird serverseitig in einfache Anführungszeichen
        // eingebettet (siehe shell_command in configuration.yaml) - ein
        // Apostroph darin würde den Shell-Befehl kaputt machen.
        alert(this._t("fehler_url_apostroph"));
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
        if (geparst.image) this._aktivesRezept.image = geparst.image;
        if (!this._aktivesRezept.uid && !this._aktivesRezept.created) {
          this._aktivesRezept.created = new Date().toISOString();
        }

        feld.value = "";
        this._render();
      } catch (fehler) {
        console.error("Rezeptbuch: URL-Import fehlgeschlagen", fehler);
        alert(this._t("fehler_url_import_fehlgeschlagen", { fehler: fehler.message || fehler }));
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
        alert(this._t("fehler_texterkennung_nichts_gefunden"));
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
        alert(this._t("warnung_texterkennung_unvollstaendig"));
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
        alert(this._t("fehler_json_ungueltig"));
        return;
      }
      const daten = Array.isArray(geparst) ? geparst[0] : geparst;
      if (!daten || !daten.title) {
        alert(this._t("fehler_json_titel_fehlt"));
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
      if (daten.image) this._aktivesRezept.image = daten.image;
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
    // deutschen internen KATEGORIEN-Werten befüllt (nicht den übersetzten
    // Anzeige-Namen), weil genau diese Werte im "category"-Feld des JSON
    // erwartet werden - unabhängig von der UI-Sprache, siehe _kategorieLabel().
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
      kategorien: KATEGORIEN.join(", "),
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

    const schritteNummerierungAktualisieren = () => {
      const liste = this.shadowRoot.getElementById("schritte-liste");
      liste.querySelectorAll(".schritt-zeile").forEach((zeile, i) => {
        zeile.querySelector(".schritt-nummer").textContent = `${i + 1}.`;
      });
    };

    this.shadowRoot.getElementById("schritt-hinzufuegen").addEventListener("click", () => {
      const liste = this.shadowRoot.getElementById("schritte-liste");
      const div = document.createElement("div");
      div.className = "schritt-zeile";
      div.innerHTML = `
        <span class="schritt-nummer">${liste.children.length + 1}.</span>
        <input type="text" placeholder="${this._t("formular_schritt_placeholder_naechster")}" data-schritt-feld>
        <button type="button" class="schritt-entfernen" aria-label="${this._t("formular_schritt_entfernen_aria")}">✕</button>`;
      liste.appendChild(div);
      div.querySelector(".schritt-entfernen").addEventListener("click", () => {
        div.remove();
        schritteNummerierungAktualisieren();
      });
    });

    this.shadowRoot.querySelectorAll(".schritt-entfernen").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.target.closest(".schritt-zeile").remove();
        schritteNummerierungAktualisieren();
      });
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
          alert(this._t("fehler_titel_fehlt"));
          return;
        }
        const zeilen = Array.from(this.shadowRoot.querySelectorAll(".zutat-zeile")).map((zeile) => ({
          amount: zeile.querySelector('[data-feld="amount"]').value,
          unit: zeile.querySelector('[data-feld="unit"]').value,
          name: zeile.querySelector('[data-feld="name"]').value,
        }));
        const schritte = Array.from(this.shadowRoot.querySelectorAll("[data-schritt-feld]")).map((feld) => feld.value);

        const bildDatei = this.shadowRoot.getElementById("bild-feld").files[0] || null;
        let bildDaten = this._aktivesRezept.image || null;
        if (bildDatei) {
          speichernBtn.textContent = this._t("formular_bild_verkleinern_text");
          bildDaten = await this._bildKomprimieren(bildDatei);
          speichernBtn.textContent = this._t("allgemein_speichert");
        }

        await this._formularSpeichern({
          title: titel,
          servings: this.shadowRoot.getElementById("portionen-feld").value,
          category: this.shadowRoot.getElementById("kategorie-feld").value,
          tags: this._aktivesRezept.tags || [],
          ingredients: zeilen,
          steps: schritte,
          image: bildDaten,
        });
      } catch (fehler) {
        console.error("Rezeptbuch: Unerwarteter Fehler beim Speichern", fehler);
        alert(this._t("fehler_unerwartet", { fehler: fehler.message || fehler }));
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
