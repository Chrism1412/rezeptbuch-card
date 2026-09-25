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
    statistik_dieses_jahr: "Du hast in {{jahr}} {{anzahl}}x gekocht",
    statistik_gesamt: "Du hast insgesamt {{anzahl}}x gekocht",
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
    statistik_dieses_jahr: "Du hesch im {{jahr}} {{anzahl}}x kocht",
    statistik_gesamt: "Du hesch insgesamt {{anzahl}}x kocht",
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
    statistik_dieses_jahr: "You've cooked {{anzahl}}x in {{jahr}}",
    statistik_gesamt: "You've cooked {{anzahl}}x in total",
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
    statistik_dieses_jahr: "Готвил(а) си {{anzahl}}x през {{jahr}}",
    statistik_gesamt: "Готвил(а) си общо {{anzahl}}x",
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
    statistik_dieses_jahr: "Kuhao/la si {{anzahl}}x u {{jahr}}",
    statistik_gesamt: "Ukupno si kuhao/la {{anzahl}}x",
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
    statistik_dieses_jahr: "V roce {{jahr}} jsi vařil(a) {{anzahl}}x",
    statistik_gesamt: "Celkem jsi vařil(a) {{anzahl}}x",
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
    statistik_dieses_jahr: "Du har lavet mad {{anzahl}}x i {{jahr}}",
    statistik_gesamt: "Du har i alt lavet mad {{anzahl}}x",
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
    statistik_dieses_jahr: "Je hebt {{anzahl}}x gekookt in {{jahr}}",
    statistik_gesamt: "Je hebt in totaal {{anzahl}}x gekookt",
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
    statistik_dieses_jahr: "Sa oled {{jahr}} aastal valmistanud toitu {{anzahl}} korda",
    statistik_gesamt: "Kokku oled valmistanud toitu {{anzahl}} korda",
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
    statistik_dieses_jahr: "Olet kokannut {{anzahl}}x vuonna {{jahr}}",
    statistik_gesamt: "Olet kokannut yhteensä {{anzahl}}x",
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
    statistik_dieses_jahr: "Tu as cuisiné {{anzahl}}x en {{jahr}}",
    statistik_gesamt: "Tu as cuisiné {{anzahl}}x au total",
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
    statistik_dieses_jahr: "Μαγείρεψες {{anzahl}}x το {{jahr}}",
    statistik_gesamt: "Μαγείρεψες συνολικά {{anzahl}}x",
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
    statistik_dieses_jahr: "{{jahr}}-ban {{anzahl}}x főztél",
    statistik_gesamt: "Összesen {{anzahl}}x főztél",
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
    statistik_dieses_jahr: "Rinne tú cócaireacht {{anzahl}}x in {{jahr}}",
    statistik_gesamt: "Rinne tú cócaireacht {{anzahl}}x san iomlán",
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
    statistik_dieses_jahr: "Hai cucinato {{anzahl}}x nel {{jahr}}",
    statistik_gesamt: "Hai cucinato {{anzahl}}x in totale",
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
    statistik_dieses_jahr: "Tu esi gatavojis/gatavojusi {{anzahl}}x {{jahr}} gadā",
    statistik_gesamt: "Kopā tu esi gatavojis/gatavojusi {{anzahl}}x",
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
    statistik_dieses_jahr: "{{jahr}} m. gaminai {{anzahl}}x",
    statistik_gesamt: "Iš viso gaminai {{anzahl}}x",
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
    statistik_dieses_jahr: "Sajjart {{anzahl}}x fis-sena {{jahr}}",
    statistik_gesamt: "Sajjart {{anzahl}}x b'kollox",
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
    statistik_dieses_jahr: "W {{jahr}} roku gotowałeś/aś {{anzahl}}x",
    statistik_gesamt: "Łącznie gotowałeś/aś {{anzahl}}x",
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
    statistik_dieses_jahr: "Cozinhaste {{anzahl}}x em {{jahr}}",
    statistik_gesamt: "Cozinhaste {{anzahl}}x no total",
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
    statistik_dieses_jahr: "Ai gătit de {{anzahl}}x în {{jahr}}",
    statistik_gesamt: "Ai gătit de {{anzahl}}x în total",
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
    statistik_dieses_jahr: "V roku {{jahr}} si varil(a) {{anzahl}}x",
    statistik_gesamt: "Celkovo si varil(a) {{anzahl}}x",
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
    statistik_dieses_jahr: "V letu {{jahr}} si kuhal/a {{anzahl}}x",
    statistik_gesamt: "Skupaj si kuhal/a {{anzahl}}x",
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
    statistik_dieses_jahr: "Has cocinado {{anzahl}}x en {{jahr}}",
    statistik_gesamt: "Has cocinado {{anzahl}}x en total",
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
    statistik_dieses_jahr: "Du har lagat mat {{anzahl}}x under {{jahr}}",
    statistik_gesamt: "Du har lagat mat {{anzahl}}x totalt",
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
    }
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
    await this._rezepteLaden();
    this._scrollPositionWiederherstellen();
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
      </ha-card>
    `;

    this.shadowRoot.getElementById("neu-btn").addEventListener("click", () => this._neuesRezeptFormular());
    this.shadowRoot.getElementById("wochenplan-btn").addEventListener("click", () => this._wochenplanAnzeigen());

    const sichernBtn = this.shadowRoot.getElementById("sichern-btn");
    if (sichernBtn) {
      sichernBtn.addEventListener("click", () => this._rezepteExportieren());
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
        this._ergebnisAktualisieren();
      });
    }

    const sortierFeld = this.shadowRoot.getElementById("sortier-feld");
    if (sortierFeld) {
      sortierFeld.addEventListener("change", () => {
        this._sortierung = sortierFeld.value;
        this._ergebnisAktualisieren();
      });
    }

    const chipButtons = this.shadowRoot.querySelectorAll(".kategorie-filter .chip");
    chipButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._aktiveKategorie = btn.dataset.kategorie;
        chipButtons.forEach((b) => b.classList.toggle("chip-aktiv", b === btn));
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
        this._ergebnisAktualisieren();
      });
    });

    this.shadowRoot.querySelectorAll(".kochbuch-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const kb = this._kochbuecher[Number(chip.dataset.index)];
        if (!kb) return;
        this._aktiveKategorie = kb.category || "Alle";
        this._aktiveTags = new Set(kb.tags || []);
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
    const kacheln = rezeptListe
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
    bereich.innerHTML = `<div class="grid">${kacheln}</div>`;

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

  async _pdfErstellen(r) {
    const jsPDFKlasse = await this._jsPdfLaden();
    const doc = new jsPDFKlasse({ unit: "mm", format: "a4" });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    let y = margin;

    const neueSeiteFallsNoetig = (benoetigterPlatz = 8) => {
      if (y + benoetigterPlatz > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    if (r.image) {
      const bild = await this._bildAlsDatenUrlLaden(r.image);
      if (bild) {
        let bildHoehe = usableWidth * (bild.hoehe / bild.breite);
        if (bildHoehe > 70) bildHoehe = 70;
        try {
          doc.addImage(bild.datenUrl, "JPEG", margin, y, usableWidth, bildHoehe);
          y += bildHoehe + 8;
        } catch (e) {
          console.error("Rezeptbuch: Bild konnte nicht ins PDF eingefügt werden", e);
        }
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

    const basisPortionen = r.servings || 1;

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

    const schritte = (r.steps || []).filter((s) => s && s.trim());
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

    const dateiname = `${r.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "_")}.pdf`;
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
    const bildHtml = bild ? `<img src="${bild.datenUrl}" alt="">` : "";

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
  img { width: 100%; max-height: 340px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; }
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

      // Letzte Rückfallebene: Datei herunterladen
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = dateiname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (fehler) {
      console.error("Rezeptbuch: Teilen/Drucken fehlgeschlagen", fehler);
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

    const schritteListe = (r.steps || [])
      .filter((s) => s && s.trim())
      .map((s) => `<li>${this._escape(s)}</li>`)
      .join("");

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
