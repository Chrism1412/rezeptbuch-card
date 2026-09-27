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
    kochmodus_timer_ein_aria: "Timer iblände",
    kochmodus_timer_aus_aria: "Timer usblände",
    kochmodus_timer_minuten_aria: "Minute",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Abbräche",
    kochmodus_timer_abgelaufen_text: "⏰ Timer isch fertig!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "{{minuten}} Min.-Timer starte",
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
    kochmodus_timer_ein_aria: "Show timer",
    kochmodus_timer_aus_aria: "Hide timer",
    kochmodus_timer_minuten_aria: "Minutes",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Cancel",
    kochmodus_timer_abgelaufen_text: "⏰ Timer finished!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Start {{minuten}} min timer",
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
    kochmodus_timer_ein_aria: "Покажи таймер",
    kochmodus_timer_aus_aria: "Скрий таймер",
    kochmodus_timer_minuten_aria: "Минути",
    kochmodus_timer_start_btn: "Старт",
    kochmodus_timer_abbrechen_btn: "Отказ",
    kochmodus_timer_abgelaufen_text: "⏰ Таймерът изтече!",
    kochmodus_timer_ok_btn: "ОК",
    kochmodus_timer_preset_aria: "Стартирай таймер за {{minuten}} мин",
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
    kochmodus_timer_ein_aria: "Prikaži mjerač vremena",
    kochmodus_timer_aus_aria: "Sakrij mjerač vremena",
    kochmodus_timer_minuten_aria: "Minute",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Odustani",
    kochmodus_timer_abgelaufen_text: "⏰ Vrijeme je isteklo!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Pokreni mjerač za {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Zobrazit časovač",
    kochmodus_timer_aus_aria: "Skrýt časovač",
    kochmodus_timer_minuten_aria: "Minuty",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Zrušit",
    kochmodus_timer_abgelaufen_text: "⏰ Čas vypršel!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Spustit časovač na {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Vis timer",
    kochmodus_timer_aus_aria: "Skjul timer",
    kochmodus_timer_minuten_aria: "Minutter",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Annuller",
    kochmodus_timer_abgelaufen_text: "⏰ Timeren er færdig!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Start {{minuten}} min. timer",
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
    kochmodus_timer_ein_aria: "Timer tonen",
    kochmodus_timer_aus_aria: "Timer verbergen",
    kochmodus_timer_minuten_aria: "Minuten",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Annuleren",
    kochmodus_timer_abgelaufen_text: "⏰ Timer afgelopen!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Timer van {{minuten}} min. starten",
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
    kochmodus_timer_ein_aria: "Näita taimerit",
    kochmodus_timer_aus_aria: "Peida taimer",
    kochmodus_timer_minuten_aria: "Minutit",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Tühista",
    kochmodus_timer_abgelaufen_text: "⏰ Taimer lõppes!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Käivita {{minuten}} min taimer",
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
    kochmodus_timer_ein_aria: "Näytä ajastin",
    kochmodus_timer_aus_aria: "Piilota ajastin",
    kochmodus_timer_minuten_aria: "Minuuttia",
    kochmodus_timer_start_btn: "Käynnistä",
    kochmodus_timer_abbrechen_btn: "Peruuta",
    kochmodus_timer_abgelaufen_text: "⏰ Ajastin päättyi!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Käynnistä {{minuten}} min ajastin",
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
    kochmodus_timer_ein_aria: "Afficher le minuteur",
    kochmodus_timer_aus_aria: "Masquer le minuteur",
    kochmodus_timer_minuten_aria: "Minutes",
    kochmodus_timer_start_btn: "Démarrer",
    kochmodus_timer_abbrechen_btn: "Annuler",
    kochmodus_timer_abgelaufen_text: "⏰ Le minuteur est terminé !",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Démarrer un minuteur de {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Εμφάνιση χρονομέτρου",
    kochmodus_timer_aus_aria: "Απόκρυψη χρονομέτρου",
    kochmodus_timer_minuten_aria: "Λεπτά",
    kochmodus_timer_start_btn: "Έναρξη",
    kochmodus_timer_abbrechen_btn: "Ακύρωση",
    kochmodus_timer_abgelaufen_text: "⏰ Ο χρόνος έληξε!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Έναρξη χρονομέτρου {{minuten}} λεπτών",
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
    kochmodus_timer_ein_aria: "Időzítő megjelenítése",
    kochmodus_timer_aus_aria: "Időzítő elrejtése",
    kochmodus_timer_minuten_aria: "Perc",
    kochmodus_timer_start_btn: "Indítás",
    kochmodus_timer_abbrechen_btn: "Mégse",
    kochmodus_timer_abgelaufen_text: "⏰ Lejárt az idő!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "{{minuten}} perces időzítő indítása",
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
    kochmodus_timer_ein_aria: "Taispeáin an t-amadóir",
    kochmodus_timer_aus_aria: "Folaigh an t-amadóir",
    kochmodus_timer_minuten_aria: "Nóiméad",
    kochmodus_timer_start_btn: "Tosaigh",
    kochmodus_timer_abbrechen_btn: "Cealaigh",
    kochmodus_timer_abgelaufen_text: "⏰ Tá an t-am istigh!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Tosaigh amadóir {{minuten}} nóiméad",
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
    kochmodus_timer_ein_aria: "Mostra timer",
    kochmodus_timer_aus_aria: "Nascondi timer",
    kochmodus_timer_minuten_aria: "Minuti",
    kochmodus_timer_start_btn: "Avvia",
    kochmodus_timer_abbrechen_btn: "Annulla",
    kochmodus_timer_abgelaufen_text: "⏰ Timer scaduto!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Avvia timer di {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Rādīt taimeri",
    kochmodus_timer_aus_aria: "Slēpt taimeri",
    kochmodus_timer_minuten_aria: "Minūtes",
    kochmodus_timer_start_btn: "Sākt",
    kochmodus_timer_abbrechen_btn: "Atcelt",
    kochmodus_timer_abgelaufen_text: "⏰ Laiks beidzies!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Sākt {{minuten}} min taimeri",
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
    kochmodus_timer_ein_aria: "Rodyti laikmatį",
    kochmodus_timer_aus_aria: "Slėpti laikmatį",
    kochmodus_timer_minuten_aria: "Minutės",
    kochmodus_timer_start_btn: "Pradėti",
    kochmodus_timer_abbrechen_btn: "Atšaukti",
    kochmodus_timer_abgelaufen_text: "⏰ Laikas baigėsi!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Paleisti {{minuten}} min. laikmatį",
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
    kochmodus_timer_ein_aria: "Uri l-timer",
    kochmodus_timer_aus_aria: "Aħbi t-timer",
    kochmodus_timer_minuten_aria: "Minuti",
    kochmodus_timer_start_btn: "Ibda",
    kochmodus_timer_abbrechen_btn: "Ikkanċella",
    kochmodus_timer_abgelaufen_text: "⏰ Il-ħin spiċċa!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Ibda timer ta' {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Pokaż minutnik",
    kochmodus_timer_aus_aria: "Ukryj minutnik",
    kochmodus_timer_minuten_aria: "Minuty",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Anuluj",
    kochmodus_timer_abgelaufen_text: "⏰ Czas minął!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Uruchom minutnik na {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Mostrar temporizador",
    kochmodus_timer_aus_aria: "Ocultar temporizador",
    kochmodus_timer_minuten_aria: "Minutos",
    kochmodus_timer_start_btn: "Iniciar",
    kochmodus_timer_abbrechen_btn: "Cancelar",
    kochmodus_timer_abgelaufen_text: "⏰ Tempo esgotado!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Iniciar temporizador de {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Afișează cronometrul",
    kochmodus_timer_aus_aria: "Ascunde cronometrul",
    kochmodus_timer_minuten_aria: "Minute",
    kochmodus_timer_start_btn: "Start",
    kochmodus_timer_abbrechen_btn: "Anulează",
    kochmodus_timer_abgelaufen_text: "⏰ Timpul a expirat!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Pornește un cronometru de {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Zobraziť časovač",
    kochmodus_timer_aus_aria: "Skryť časovač",
    kochmodus_timer_minuten_aria: "Minúty",
    kochmodus_timer_start_btn: "Štart",
    kochmodus_timer_abbrechen_btn: "Zrušiť",
    kochmodus_timer_abgelaufen_text: "⏰ Čas vypršal!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Spustiť časovač na {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Prikaži časovnik",
    kochmodus_timer_aus_aria: "Skrij časovnik",
    kochmodus_timer_minuten_aria: "Minute",
    kochmodus_timer_start_btn: "Začni",
    kochmodus_timer_abbrechen_btn: "Prekliči",
    kochmodus_timer_abgelaufen_text: "⏰ Čas je potekel!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Zaženi {{minuten}} min. časovnik",
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
    kochmodus_timer_ein_aria: "Mostrar temporizador",
    kochmodus_timer_aus_aria: "Ocultar temporizador",
    kochmodus_timer_minuten_aria: "Minutos",
    kochmodus_timer_start_btn: "Iniciar",
    kochmodus_timer_abbrechen_btn: "Cancelar",
    kochmodus_timer_abgelaufen_text: "⏰ ¡Tiempo terminado!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Iniciar temporizador de {{minuten}} min",
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
    kochmodus_timer_ein_aria: "Visa timer",
    kochmodus_timer_aus_aria: "Dölj timer",
    kochmodus_timer_minuten_aria: "Minuter",
    kochmodus_timer_start_btn: "Starta",
    kochmodus_timer_abbrechen_btn: "Avbryt",
    kochmodus_timer_abgelaufen_text: "⏰ Timern är slut!",
    kochmodus_timer_ok_btn: "OK",
    kochmodus_timer_preset_aria: "Starta {{minuten}} min timer",
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
    this._kochmodusTimerIntervallStoppen();
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
  }

  _kochmodusOeffnen() {
    this._kochmodusAktiv = true;
    this._kochmodusSchrittIndex = 0;
    this._render();
  }

  // Schließt nur das Kochmodus-Overlay - ein evtl. laufender Timer läuft
  // bewusst im Hintergrund weiter (z.B. "20 Min. im Ofen"), damit er auch
  // dann noch klingelt, wenn man zwischendurch die Zutatenliste oder ein
  // anderes Rezept ansieht.
  _kochmodusSchliessen() {
    this._kochmodusAktiv = false;
    this._render();
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
        // Drei kurze Pieptöne statt eines Dauertons - deutlich hörbar,
        // aber nicht so unangenehm wie ein Alarm.
        [0, 0.35, 0.7].forEach((versatz) => {
          const oszillator = kontext.createOscillator();
          const lautstaerke = kontext.createGain();
          oszillator.type = "sine";
          oszillator.frequency.value = 880;
          lautstaerke.gain.setValueAtTime(0.0001, jetzt + versatz);
          lautstaerke.gain.exponentialRampToValueAtTime(0.3, jetzt + versatz + 0.02);
          lautstaerke.gain.exponentialRampToValueAtTime(0.0001, jetzt + versatz + 0.25);
          oszillator.connect(lautstaerke);
          lautstaerke.connect(kontext.destination);
          oszillator.start(jetzt + versatz);
          oszillator.stop(jetzt + versatz + 0.3);
        });
        setTimeout(() => kontext.close().catch(() => {}), 1200);
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
  // Die vier Positionen sind rechnerisch aus den Foto-Slots in
  // _sammelPdfDeckblattCollageZeichnen abgeleitet (nicht mehr am äußeren
  // Rand): jeweils genau der Mittelpunkt zwischen den zwei benachbarten
  // Fotos (oben: Slot 1+2, unten: Slot 3+4, links: Slot 1+3, rechts:
  // Slot 2+4) - sowohl in der Breite als auch in der Höhe. (Eine frühere
  // Version hat zusätzlich noch Richtung der mittleren Kachel verschoben -
  // das saß dann zu weit innen/verdeckt; ohne diese Verschiebung sitzen
  // die Icons sichtbar in der Lücke zwischen den Fotos, ohne von der
  // mittleren Kachel überdeckt zu werden.)
  _sammelPdfDeckblattDekorationZeichnen(doc, x, y, breite, hoehe) {
    const groesse = Math.min(24, Math.max(14, Math.min(breite, hoehe) * 0.16));
    const icon = (datenUrl, cx, cy) => {
      doc.addImage(datenUrl, "PNG", cx - groesse / 2, cy - groesse / 2, groesse, groesse);
    };
    icon(DEKO_ICON_TOMATE_BASE64, x + breite * 0.5, y + hoehe * 0.25);
    icon(DEKO_ICON_KAROTTEN_BASE64, x + breite * 0.15, y + hoehe * 0.50);
    icon(DEKO_ICON_KOCHLOEFFEL_BASE64, x + breite * 0.85, y + hoehe * 0.50);
    icon(DEKO_ICON_RUEHRBESEN_BASE64, x + breite * 0.5, y + hoehe * 0.71);
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
            <button class="sekundaer klein${this._kochmodusTimerPanelSichtbar ? " aktiv" : ""}" id="kochmodus-timer-btn" aria-label="${this._t(this._kochmodusTimerPanelSichtbar ? "kochmodus_timer_aus_aria" : "kochmodus_timer_ein_aria")}">⏱${this._kochmodusTimerEndeZeitpunkt ? ` <span class="kochmodus-timer-badge">${this._kochmodusTimerRestAnzeige()}</span>` : this._kochmodusTimerAbgelaufen ? " ⏰" : ""}</button>
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
