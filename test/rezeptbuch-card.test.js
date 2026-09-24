#!/usr/bin/env node
/*
  Automatisierte Testsuite für rezeptbuch-card.js.

  Lädt die ECHTE Karten-Datei in einem echten (headless) Chromium-Browser
  via Playwright - keine nachgebaute Kopie der Logik. Home Assistants
  "hass"-Objekt wird durch einen einfachen In-Memory-Speicher simuliert, der
  sich wie eine echte "Lokale To-do-Liste" verhält (todo.add_item /
  todo.update_item / todo.remove_item, sowie das "todo/item/list"-Websocket-
  Kommando, das die Karte zum Laden verwendet).

  Aufruf:  node rezeptbuch-card.test.js
  Exit-Code 0 bei Erfolg, 1 falls mindestens ein Test fehlschlägt.

  Getestet wird bewusst nicht "jede Zeile", sondern die Stellen, an denen in
  der Vergangenheit tatsächlich Fehler aufgetreten sind bzw. die für dieses
  Projekt sicherheitsrelevant sind: Konflikt-Schutz bei gleichzeitigem
  Bearbeiten (Task 2), Schema-Versionierung (Task 5), robuste
  Bewertungs-Berechnung und der JSON-Import. Wird neuer Code ergänzt, sollte
  hier ein passender Test dazukommen statt die Prüfung nur manuell zu
  wiederholen.
*/
const path = require("path");
const { chromium } = require("playwright");

const KARTEN_DATEI = path.join(__dirname, "..", "rezeptbuch-card.js");

let bestanden = 0;
let fehlgeschlagen = 0;
const fehlgeschlageneNamen = [];

function assert(bedingung, name) {
  if (bedingung) {
    bestanden++;
    console.log(`  OK     ${name}`);
  } else {
    fehlgeschlagen++;
    fehlgeschlageneNamen.push(name);
    console.log(`  FEHLER ${name}`);
  }
}

// Erzeugt eine frische Seite mit der echten Karte + simuliertem hass-Objekt.
// Jeder Test bekommt seine eigene Seite (eigener, leerer Speicher), damit
// sich Tests nicht gegenseitig beeinflussen.
async function neueTestUmgebung(browser) {
  const page = await browser.newPage();

  // console.error/warn aus der Karte sichtbar machen, falls ein Test
  // unerwartet einen Fehler wirft (hilft bei der Fehlersuche).
  page.on("pageerror", (fehler) => console.error("  [Browser-Fehler]", fehler));

  await page.addScriptTag({ path: KARTEN_DATEI });

  await page.evaluate(() => {
    // Simulierte "Lokale To-do-Liste": ein einfaches Array, wie es die
    // echte todo.rezepte-Entität serverseitig auch verwaltet.
    window.__speicher = [];
    window.__naechsteUid = 1;
    window.__alertAufrufe = [];
    // Protokolliert JEDEN add_item-Aufruf mit seiner entity_id - Grundlage für
    // die Einkaufslisten-Tests (feature 1/2): die Karte ruft add_item für die
    // separat konfigurierte shopping_list_entity auf, ohne dass diese Liste
    // hier eine eigene __speicher-Instanz braucht (die Karte liest die
    // Einkaufsliste selbst nie wieder ein).
    window.__addItemAufrufe = [];

    // alert() in Tests abfangen statt einen echten Dialog zu blockieren -
    // wir wollen nur wissen, OB und WORÜBER gewarnt wurde.
    window.alert = (text) => window.__alertAufrufe.push(text);

    function findeItem(item) {
      return window.__speicher.find((i) => i.uid === item || i.summary === item);
    }

    window.__fakeHass = {
      user: { id: "user-1", name: "Erika", is_admin: true },
      callService: async (domain, service, daten) => {
        if (domain === "shell_command") {
          // Die Karte ruft nach einem Foto-Upload optional das Bild-
          // Auslagerungsskript auf und fängt einen Fehlschlag selbst ab -
          // in Tests gibt es dieses Skript nicht, das ist erwartet.
          throw new Error("shell_command in Tests nicht simuliert");
        }
        if (domain !== "todo") {
          throw new Error("Unbekannte Service-Domain in Tests: " + domain);
        }
        if (service === "add_item") {
          window.__addItemAufrufe.push({ item: daten.item, entity_id: daten.entity_id });
          // Nur Einträge für die "eigentliche" Rezeptliste landen im
          // simulierten __speicher - Einträge für eine andere entity_id
          // (z.B. die separat konfigurierte Einkaufsliste) werden bewusst
          // NICHT dort abgelegt, weil die Karte diese Liste nie zurückliest.
          if (daten.entity_id === "todo.rezepte") {
            const uid = "uid-" + window.__naechsteUid++;
            window.__speicher.push({
              uid,
              summary: daten.item,
              description: daten.description || "",
              status: "needs_action",
            });
          }
          return;
        }
        if (service === "update_item") {
          const eintrag = findeItem(daten.item);
          if (!eintrag) throw new Error("Item nicht gefunden: " + daten.item);
          if (daten.rename) eintrag.summary = daten.rename;
          if (daten.description !== undefined) eintrag.description = daten.description;
          return;
        }
        if (service === "remove_item") {
          window.__speicher = window.__speicher.filter((i) => i.uid !== daten.item);
          return;
        }
        throw new Error("Unbekannter Service in Tests: " + service);
      },
      connection: {
        sendMessagePromise: async ({ type, domain, service, service_data }) => {
          if (type === "todo/item/list") {
            return { items: window.__speicher.map((i) => ({ ...i })) };
          }
          if (type === "call_service" && domain === "shell_command" && service === "rezeptbuch_url_importieren") {
            // Simuliert den Python-URL-Import: window.__urlImportAntwort wird
            // von den jeweiligen Tests VOR dem Klick auf "Importieren"
            // gesetzt und steht hier für das, was das echte Skript auf
            // stdout ausgegeben hätte (bereits als String, wie es real via
            // shell_command zurückkäme).
            window.__letzteUrlImportUrl = service_data && service_data.url;
            if (window.__urlImportSchlaegtFehl) {
              throw new Error("shell_command fehlgeschlagen (simuliert)");
            }
            return { response: { stdout: window.__urlImportAntwort || "", stderr: "", returncode: 0 } };
          }
          throw new Error("Unbekannter Message-Typ in Tests: " + type);
        },
      },
    };

    const karte = document.createElement("rezeptbuch-card");
    karte.setConfig({ entity: "todo.rezepte" });
    document.body.appendChild(karte);
    karte.hass = window.__fakeHass; // löst _rezepteLaden() aus
    window.__karte = karte;
  });

  await page.waitForFunction(() => window.__karte._geladen === true && Array.isArray(window.__karte._rezepte));
  return page;
}

// Legt direkt im simulierten Speicher ein Rezept an (schneller als über die
// UI) und lädt anschließend die Kartenliste neu, damit this._rezepte den
// neuen Stand kennt. Gibt das erzeugte Speicher-Item zurück.
async function rezeptDirektAnlegen(page, { title, payload }) {
  return page.evaluate(async ({ title, payload }) => {
    const uid = "uid-" + window.__naechsteUid++;
    window.__speicher.push({
      uid,
      summary: title,
      description: JSON.stringify(payload),
      status: "needs_action",
    });
    await window.__karte._rezepteLaden();
    return uid;
  }, { title, payload });
}

function leererPayload(zusatz = {}) {
  return {
    schemaVersion: 1, servings: 4, category: "Sonstiges", ingredients: [{ amount: "1", unit: "kg", name: "Mehl" }],
    steps: ["Mischen"], image: null, ratings: {}, comments: [], creator: null, creatorName: null,
    created: "2026-01-01T00:00:00.000Z", cookLog: [],
    ...zusatz,
  };
}

// ---------------------------------------------------------------------
// Test 1: Grundfunktion - neues Rezept über _formularSpeichern anlegen.
// ---------------------------------------------------------------------
async function testGrundfunktionNeuesRezept(browser) {
  console.log("\nTest: Neues Rezept speichern");
  const page = await neueTestUmgebung(browser);
  try {
    await page.evaluate(async () => {
      window.__karte._neuesRezeptFormular();
      await window.__karte._formularSpeichern({
        title: "Spätzle", servings: "4", category: "Hauptgericht",
        ingredients: [{ amount: "500", unit: "g", name: "Mehl" }],
        steps: ["Teig kneten", "Spätzle schaben"],
        image: null,
      });
    });
    const speicher = await page.evaluate(() => window.__speicher);
    assert(speicher.length === 1, "Rezept wurde im simulierten Speicher angelegt");
    const beschreibung = JSON.parse(speicher[0].description);
    assert(beschreibung.schemaVersion === 2, "Neues Rezept bekommt die aktuelle schemaVersion");
    assert(beschreibung.creator === "user-1", "Ersteller wird beim Anlegen gesetzt");
    assert(!!beschreibung.created, "created-Datum wird beim Anlegen gesetzt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 2: Konflikt-Schutz bei additiven Aktionen (Kommentar).
// Simuliert: Nutzer A hat das Rezept offen, während Nutzer B in der
// Zwischenzeit die Zutaten ändert. Nutzer A fügt danach einen Kommentar
// hinzu - Nutzer Bs Zutaten-Änderung darf dabei NICHT verloren gehen.
// ---------------------------------------------------------------------
async function testKonfliktSchutzKommentar(browser) {
  console.log("\nTest: Konflikt-Schutz bei Kommentaren (additive Aktion)");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, {
      title: "Gulasch",
      payload: leererPayload({ comments: [{ author: "Alt", text: "Erster Kommentar", zeit: "2026-01-01T00:00:00.000Z" }] }),
    });

    await page.evaluate((uid) => {
      window.__karte._rezeptOeffnen(window.__karte._rezepte.find((r) => r.uid === uid));
    }, uid);

    // Nutzer B ändert "gleichzeitig" (während Nutzer A die Detailansicht
    // offen hat) die Zutaten direkt serverseitig - ohne dass Nutzer As
    // Karte davon lokal etwas mitbekommt.
    await page.evaluate((uid) => {
      const eintrag = window.__speicher.find((i) => i.uid === uid);
      const beschreibung = JSON.parse(eintrag.description);
      beschreibung.ingredients = [{ amount: "1", unit: "kg", name: "Rindfleisch (von Nutzer B geändert)" }];
      eintrag.description = JSON.stringify(beschreibung);
    }, uid);

    await page.evaluate(async () => {
      await window.__karte._kommentarHinzufuegen("Sehr lecker!");
    });

    const eintrag = await page.evaluate((uid) => window.__speicher.find((i) => i.uid === uid), uid);
    const beschreibung = JSON.parse(eintrag.description);

    assert(beschreibung.comments.length === 2, "Neuer Kommentar wurde zum bestehenden hinzugefügt (nicht ersetzt)");
    assert(
      beschreibung.ingredients[0].name.includes("Nutzer B"),
      "Gleichzeitige Zutaten-Änderung von Nutzer B bleibt erhalten (wird nicht überschrieben)"
    );
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 3: Konflikt-Schutz beim vollständigen Bearbeiten-Formular.
// Fall A: kein Konflikt -> Speichern funktioniert normal.
// Fall B: Konflikt (jemand anderes hat währenddessen geändert) -> Warnung,
//         NICHT speichern, Server-Stand bleibt unangetastet.
// Fall C: Rezept wurde währenddessen gelöscht -> Warnung, kein Absturz.
// ---------------------------------------------------------------------
async function testKonfliktSchutzFormular(browser) {
  console.log("\nTest: Konflikt-Schutz beim Bearbeiten-Formular");
  const page = await neueTestUmgebung(browser);
  try {
    // Fall A: kein Konflikt.
    const uidA = await rezeptDirektAnlegen(page, { title: "Rezept A", payload: leererPayload() });
    await page.evaluate((uid) => {
      window.__karte._rezeptBearbeiten(window.__karte._rezepte.find((r) => r.uid === uid));
    }, uidA);
    await page.evaluate(async () => {
      await window.__karte._formularSpeichern({
        title: "Rezept A (bearbeitet)", servings: "2", category: "Sonstiges",
        ingredients: [{ amount: "2", unit: "Stk", name: "Eier" }], steps: ["Kochen"], image: null,
      });
    });
    let eintragA = await page.evaluate((uid) => window.__speicher.find((i) => i.uid === uid), uidA);
    let alertsA = await page.evaluate(() => window.__alertAufrufe);
    assert(eintragA.summary === "Rezept A (bearbeitet)", "Ohne Konflikt wird normal gespeichert");
    assert(alertsA.length === 0, "Ohne Konflikt erscheint keine Warnung");

    // Fall B: Konflikt durch gleichzeitige fremde Änderung.
    const uidB = await rezeptDirektAnlegen(page, { title: "Rezept B", payload: leererPayload() });
    await page.evaluate((uid) => {
      window.__karte._rezeptBearbeiten(window.__karte._rezepte.find((r) => r.uid === uid));
    }, uidB);
    await page.evaluate((uid) => {
      const eintrag = window.__speicher.find((i) => i.uid === uid);
      const beschreibung = JSON.parse(eintrag.description);
      beschreibung.comments = [{ author: "Jemand", text: "Zwischendurch kommentiert", zeit: "2026-01-01T00:00:00.000Z" }];
      eintrag.description = JSON.stringify(beschreibung);
    }, uidB);
    await page.evaluate(async () => {
      await window.__karte._formularSpeichern({
        title: "Rezept B (mein Versuch)", servings: "3", category: "Sonstiges",
        ingredients: [{ amount: "1", unit: "Stk", name: "Zwiebel" }], steps: ["Schneiden"], image: null,
      });
    });
    let eintragB = await page.evaluate((uid) => window.__speicher.find((i) => i.uid === uid), uidB);
    let alertsB = await page.evaluate(() => window.__alertAufrufe);
    let beschreibungB = JSON.parse(eintragB.description);
    assert(eintragB.summary === "Rezept B", "Bei einem Konflikt wird NICHT gespeichert (Titel bleibt unverändert)");
    assert(beschreibungB.comments.length === 1, "Die fremde Änderung (Kommentar) bleibt beim Konflikt erhalten");
    assert(alertsB.some((t) => t.includes("geändert")), "Bei einem Konflikt erscheint eine erklärende Warnung");

    // Fall C: Rezept wurde währenddessen gelöscht.
    const uidC = await rezeptDirektAnlegen(page, { title: "Rezept C", payload: leererPayload() });
    await page.evaluate((uid) => {
      window.__karte._rezeptBearbeiten(window.__karte._rezepte.find((r) => r.uid === uid));
    }, uidC);
    await page.evaluate((uid) => {
      window.__speicher = window.__speicher.filter((i) => i.uid !== uid);
    }, uidC);
    let kamOhneAbsturzDurch = true;
    await page.evaluate(async () => {
      await window.__karte._formularSpeichern({
        title: "Rezept C (mein Versuch)", servings: "1", category: "Sonstiges",
        ingredients: [{ amount: "1", unit: "Stk", name: "Test" }], steps: ["Test"], image: null,
      });
    }).catch(() => { kamOhneAbsturzDurch = false; });
    let alertsC = await page.evaluate(() => window.__alertAufrufe);
    assert(kamOhneAbsturzDurch, "Speichern nach zwischenzeitlichem Löschen wirft keinen unbehandelten Fehler");
    assert(alertsC.some((t) => t.includes("gelöscht")), "Bei zwischenzeitlicher Löschung erscheint eine erklärende Warnung");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 4: Schema-Versionierung / Migration alter Datensätze.
// ---------------------------------------------------------------------
async function testSchemaVersionierung(browser) {
  console.log("\nTest: Schema-Versionierung");
  const page = await neueTestUmgebung(browser);
  try {
    const ergebnis = await page.evaluate(() => {
      // Simuliert ein Rezept, das VOR Einführung von schemaVersion
      // gespeichert wurde (kein entsprechendes Feld im JSON) - muss beim
      // Einlesen über BEIDE Migrationsschritte (0->1->2) laufen.
      const altesItem = {
        uid: "alt-1", summary: "Omas Rezept",
        description: JSON.stringify({ servings: 2, ingredients: [], steps: [], category: "Sonstiges" }),
      };
      return window.__karte._itemZuRezept(altesItem);
    });
    assert(ergebnis.schemaVersion === 2, "Alte Datensätze ohne schemaVersion werden beim Einlesen migriert (auf die aktuelle Version 2)");
    assert(Array.isArray(ergebnis.tags) && ergebnis.tags.length === 0, "Alte Datensätze ohne tags-Feld bekommen ein leeres tags-Array (Migration 1->2)");

    // Datensatz, der schon schemaVersion 1 hatte (tags noch nicht
    // eingeführt) - muss nur den EINEN fehlenden Schritt (1->2) durchlaufen.
    const ergebnisV1 = await page.evaluate(() => {
      const itemV1 = {
        uid: "alt-2", summary: "Rezept aus v1.2.0",
        description: JSON.stringify({ schemaVersion: 1, servings: 3, ingredients: [], steps: [], category: "Suppe" }),
      };
      return window.__karte._itemZuRezept(itemV1);
    });
    assert(ergebnisV1.schemaVersion === 2, "Datensatz mit schemaVersion 1 wird auf 2 migriert");
    assert(Array.isArray(ergebnisV1.tags) && ergebnisV1.tags.length === 0, "Migration von v1 nach v2 ergänzt ein leeres tags-Array");
    assert(ergebnisV1.category === "Suppe", "Die bestehende category bleibt bei der Migration unverändert erhalten");

    const neuGespeichert = await page.evaluate(() => window.__karte._rezeptPayload({ servings: 1, ingredients: [], steps: [] }));
    assert(neuGespeichert.schemaVersion === 2, "Beim Speichern wird immer die aktuelle schemaVersion geschrieben");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 5: Durchschnittsbewertung ist robust gegen String-Werte (alte/
// importierte Daten, in denen Sterne z.B. als "5" statt 5 vorliegen).
// ---------------------------------------------------------------------
async function testDurchschnittsBewertungStringSicher(browser) {
  console.log("\nTest: Durchschnittsbewertung mit String-Werten");
  const page = await neueTestUmgebung(browser);
  try {
    const ergebnis = await page.evaluate(() => {
      return window.__karte._durchschnittsBewertung({ a: "5", b: "3" });
    });
    assert(ergebnis.durchschnitt === 4, "Strings werden als Zahlen addiert, nicht als Text verkettet (\"5\"+\"3\" wäre 4, nicht 53)");
    assert(ergebnis.anzahl === 2, "Anzahl der Bewertungen wird korrekt gezählt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 6: JSON-Import im Formular übernimmt alle Felder (nicht nur
// title/servings/ingredients/steps), inklusive der 0-Portionen-Falle.
// Über die echte UI getrieben (Klick + Textarea), nicht direkt per Methode.
// ---------------------------------------------------------------------
async function testJsonImportUebernimmtAlleFelder(browser) {
  console.log("\nTest: JSON-Import übernimmt Kategorie/Bild/Bewertungen/Kommentare");
  const page = await neueTestUmgebung(browser);
  try {
    await page.evaluate(() => window.__karte._neuesRezeptFormular());

    const importierteJson = JSON.stringify({
      title: "Importiertes Rezept",
      servings: 0, // bewusst 0, um die "0 wird zu 4"-Regression zu prüfen
      category: "Dessert",
      image: "data:image/jpeg;base64,AAAA",
      ingredients: [{ amount: "200", unit: "g", name: "Zucker" }],
      steps: ["Mischen"],
      ratings: { "user-9": 5 },
      comments: [{ author: "Import", text: "aus Backup", zeit: "2026-01-01T00:00:00.000Z" }],
    });

    await page.evaluate((json) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("json-einfuegen-btn").click();
      root.getElementById("json-feld").value = json;
      root.getElementById("json-uebernehmen-btn").click();
    }, importierteJson);

    const aktiv = await page.evaluate(() => window.__karte._aktivesRezept);

    assert(aktiv.category === "Dessert", "Kategorie wird aus dem JSON übernommen");
    assert(aktiv.image === "data:image/jpeg;base64,AAAA", "Bild wird aus dem JSON übernommen");
    assert(JSON.stringify(aktiv.ratings) === JSON.stringify({ "user-9": 5 }), "Bewertungen werden aus dem JSON übernommen");
    assert(aktiv.comments.length === 1, "Kommentare werden aus dem JSON übernommen");
    assert(aktiv.servings === 4, "servings: 0 im JSON fällt auf den Standardwert 4 zurück (0 Portionen ergibt keinen Sinn)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 6b: JSON-Import mit Zutaten als reine Textzeilen (genau das Format,
// das der json_info_prompt-Text eine externe KI ausgeben lässt, z.B.
// "200 g Mehl" statt {amount, unit, name}) - Regressionstest für einen vom
// Nutzer gemeldeten Bug: solche Zutaten wurden zuvor unverändert
// übernommen, hatten dann aber kein ".name"-Feld und verschwanden beim
// Speichern lautlos aus dem Rezept, obwohl sie im eingefügten JSON sichtbar
// waren.
// ---------------------------------------------------------------------
async function testJsonImportZutatenAlsText(browser) {
  console.log("\nTest: JSON-Import mit Zutaten als reine Textzeilen (KI-Prompt-Format)");
  const page = await neueTestUmgebung(browser);
  try {
    await page.evaluate(() => window.__karte._neuesRezeptFormular());

    const importierteJson = JSON.stringify({
      title: "Pfannkuchen",
      servings: 4,
      ingredients: ["200 g Mehl", "250 ml Milch", "Prise Salz"],
      steps: ["Alles verrühren", "Backen"],
    });

    await page.evaluate((json) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("json-einfuegen-btn").click();
      root.getElementById("json-feld").value = json;
      root.getElementById("json-uebernehmen-btn").click();
    }, importierteJson);

    const aktiv = await page.evaluate(() => window.__karte._aktivesRezept);

    assert(aktiv.ingredients.length === 3, "Alle drei Zutaten-Textzeilen werden übernommen (nicht herausgefiltert)");
    assert(aktiv.ingredients[0].name === "Mehl", "Zutatname wird aus der Textzeile herausgelöst");
    assert(aktiv.ingredients[0].amount === "200" && aktiv.ingredients[0].unit === "g", "Menge und Einheit werden aus der Textzeile herausgelöst");
    // "Prise" steht in der Einheiten-Liste des Parsers (wie schon bei der
    // Texterkennung, z.B. "eine Prise Salz") - wird hier also korrekt als
    // Einheit statt als Teil des Namens erkannt, keine verlorene Zutat.
    assert(aktiv.ingredients[2].unit === "Prise" && aktiv.ingredients[2].name === "Salz", "Eine Zutat mit Mengenwort ohne Zahl (\"Prise\") wird als Einheit erkannt, nicht als Fließtext verworfen");

    // Speichern und wieder öffnen: die Zutaten müssen auch nach dem
    // vollständigen Speicherzyklus sichtbar bleiben (das war der eigentlich
    // gemeldete Effekt - im JSON sichtbar, im fertigen Rezept nicht mehr).
    // Der Speichern-Klick löst einen asynchronen Handler aus (u.a. wegen
    // der optionalen Bildkomprimierung) - deshalb erst nach einer kurzen
    // Wartezeit auf das Ergebnis prüfen, statt direkt im selben Tick.
    await page.evaluate(() => window.__karte.shadowRoot.getElementById("speichern-btn").click());
    await page.waitForTimeout(150);
    const nachSpeichern = await page.evaluate(() => {
      const gespeichert = window.__karte._rezepte.find((r) => r.title === "Pfannkuchen");
      return gespeichert ? gespeichert.ingredients : null;
    });
    assert(nachSpeichern && nachSpeichern.length === 3, "Zutaten bleiben auch nach dem Speichern erhalten, nicht nur im Formular");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 7: Löschen erfordert die Bestätigung im eigenen Modal (kein
// window.confirm()) und kann per Rückgängig-Fenster abgebrochen werden.
// ---------------------------------------------------------------------
async function testLoeschenMitBestaetigungUndUndo(browser) {
  console.log("\nTest: Löschen mit Bestätigungs-Modal und Rückgängig");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Zu löschendes Rezept", payload: leererPayload() });
    await page.evaluate((uid) => {
      window.__karte._rezeptLoeschen(window.__karte._rezepte.find((r) => r.uid === uid));
    }, uid);

    let nochImSpeicher = await page.evaluate(() => window.__speicher.length);
    assert(nochImSpeicher === 1, "Vor der Bestätigung wird noch nichts serverseitig gelöscht");

    // Bestätigen -> optimistisch aus der lokalen Liste entfernt, aber
    // serverseitig erst nach Ablauf des Rückgängig-Fensters (Timer).
    await page.evaluate((uid) => {
      window.__karte._rezeptLoeschenBestaetigt(window.__karte._rezepte.find((r) => r.uid === uid) || { uid, title: "Zu löschendes Rezept" });
    }, uid);
    let lokalNachBestaetigung = await page.evaluate(() => window.__karte._rezepte.length);
    let serverNachBestaetigung = await page.evaluate(() => window.__speicher.length);
    assert(lokalNachBestaetigung === 0, "Direkt nach Bestätigung aus der lokalen Ansicht entfernt");
    assert(serverNachBestaetigung === 1, "Serverseitig noch nicht gelöscht (Rückgängig-Fenster läuft noch)");

    // Rückgängig machen, bevor der Timer abläuft.
    await page.evaluate(() => window.__karte._loeschenRueckgaengig());
    let lokalNachUndo = await page.evaluate(() => window.__karte._rezepte.length);
    assert(lokalNachUndo === 1, "Rückgängig stellt das Rezept lokal wieder her");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 8: Regressionstest - das volle Bearbeiten-Formular darf cookLog
// (Zubereitungs-Historie) nicht stillschweigend löschen, obwohl das
// Formular dieses Feld gar nicht anzeigt oder bearbeitet.
// ---------------------------------------------------------------------
async function testFormularBearbeitenBehaeltCookLog(browser) {
  console.log("\nTest: Bearbeiten-Formular behält die Zubereitungs-Historie (cookLog)");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, {
      title: "Oft gekochtes Rezept",
      payload: leererPayload({ cookLog: ["2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z"] }),
    });
    await page.evaluate((uid) => {
      window.__karte._rezeptBearbeiten(window.__karte._rezepte.find((r) => r.uid === uid));
    }, uid);
    await page.evaluate(async () => {
      await window.__karte._formularSpeichern({
        title: "Oft gekochtes Rezept (Titel angepasst)", servings: "4", category: "Sonstiges",
        ingredients: [{ amount: "1", unit: "Stk", name: "Test" }], steps: ["Test"], image: null,
      });
    });
    const eintrag = await page.evaluate((uid) => window.__speicher.find((i) => i.uid === uid), uid);
    const beschreibung = JSON.parse(eintrag.description);
    assert(
      Array.isArray(beschreibung.cookLog) && beschreibung.cookLog.length === 2,
      "cookLog bleibt nach dem Bearbeiten über das volle Formular erhalten"
    );
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 9: automatische Rezepttext-Erkennung (Mustererkennung ohne KI).
// Über die echte UI getrieben (Klick + Textarea), nicht direkt per
// Funktionsaufruf, damit auch das Verdrahten des Buttons mitgeprüft wird.
// ---------------------------------------------------------------------
async function testTextErkennungUeberUi(browser) {
  console.log("\nTest: Automatische Rezepttext-Erkennung");
  const page = await neueTestUmgebung(browser);
  try {
    await page.evaluate(() => window.__karte._neuesRezeptFormular());

    const rezeptText = [
      "Spätzle mit Röstzwiebeln",
      "Für 4 Portionen",
      "",
      "Zutaten",
      "500 g Mehl",
      "5 Eier",
      "1 TL Salz",
      "",
      "Zubereitung",
      "1. Mehl, Eier und Salz zu einem Teig verarbeiten.",
      "2. Spätzle in kochendes Salzwasser schaben und garen.",
      "",
      "Nährwerte pro Portion: 450 kcal",
    ].join("\n");

    const aktiv = await page.evaluate((text) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = text;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, rezeptText);

    assert(aktiv.title === "Spätzle mit Röstzwiebeln", "Titel wird aus dem Rezepttext erkannt");
    assert(aktiv.servings === 4, "Portionen werden aus dem Rezepttext erkannt");
    assert(aktiv.ingredients.length === 3, "Zutaten werden aus dem Rezepttext erkannt");
    assert(
      aktiv.ingredients[0].amount === "500" && aktiv.ingredients[0].unit.toLowerCase() === "g" && aktiv.ingredients[0].name === "Mehl",
      "Menge/Einheit/Name einer Zutat werden korrekt aufgeteilt"
    );
    assert(aktiv.steps.length === 2, "Zubereitungsschritte werden aus dem Rezepttext erkannt");
    assert(!aktiv.steps[0].match(/^\d/), "Nummerierung wird aus den Schritten entfernt");
    assert(!aktiv.steps.some((s) => s.includes("kcal")), "Nährwerte-Fußzeile wird nicht als Schritt übernommen");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 10: Rezepttext-Erkennung ohne jeglichen erkennbaren Inhalt warnt,
// statt das Formular unbemerkt leer zu lassen.
// ---------------------------------------------------------------------
async function testTextErkennungWarntBeiLeeremErgebnis(browser) {
  console.log("\nTest: Rezepttext-Erkennung warnt bei nicht erkennbarem Text");
  const page = await neueTestUmgebung(browser);
  try {
    const alertsVorher = await page.evaluate(() => window.__alertAufrufe.length);
    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    await page.evaluate(() => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = "12345 !!! ???";
      root.getElementById("text-erkennen-btn").click();
    });
    const alertsNachher = await page.evaluate(() => window.__alertAufrufe);
    assert(alertsNachher.length > alertsVorher, "Bei nicht erkennbarem Text erscheint eine Warnung statt stillem Nichtstun");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 11: Regressionstest mit einem ECHTEN, vom Nutzer von chefkoch.de
// (Druckansicht) kopierten Text. Chefkoch trennt Menge und Zutatenname in
// zwei separate Zeilen (Tabellenspalten -> Zeilen beim Kopieren) und
// nummeriert Zubereitungsschritte mit der Zahl allein auf einer eigenen
// Zeile, dazwischen jede Menge Metadaten ("Gesamtzeit", "Rezeptautor:in"
// usw.) - ein grundlegend anderes Format als eine einfache "500 g Mehl"-
// Zeile pro Zutat. Dieser Test sichert genau das ab, was beim ersten
// Praxistest fehlgeschlagen ist.
// ---------------------------------------------------------------------
async function testTextErkennungChefkochDruckansicht(browser) {
  console.log("\nTest: Rezepttext-Erkennung mit echtem Chefkoch-Druckansicht-Text");
  const page = await neueTestUmgebung(browser);
  try {
    const chefkochText = [
      "Pilzrisotto mit Zucchini", "mit oder ohne Speck möglich", "",
      "time", "20 Min.", "Arbeitszeit", "difficulty_level", "Normal", "Schwierigkeit",
      "profil", "bienemaya", "Rezeptautor:in",
      "Zutaten", "Für 4 Portionen", "",
      "400 g", "Risottoreis", " etwas", "Öl", "100 g", "Speckwürfel", "1", "Zwiebel(n)",
      "100 ml", "Weißwein", "1 Liter", "Fleischbrühe", "oder Gemüsebrühe", "300 g", "Champignons",
      "1", "Zucchini", "100 ml", "Sahne", "50 g", "Parmesan", "Salz und Pfeffer",
      "0.5 Bund", "Petersilie", " n. B.", "Bacon",
      "Zubereitung", "",
      "45 Min.", "Gesamtzeit", "", "20 Min.", "Arbeitszeit", "", "25 Min.", "Koch-/Backzeit",
      "1",
      "Zwiebel fein würfeln. Champignons putzen und in Scheiben schneiden. Zucchini waschen, halbieren und in Scheiben schneiden. Petersilie waschen und fein hacken.",
      "",
      "2",
      "1 EL Öl in einem großen Topf erhitzen. Den gewürfelten Speck anbraten. Die Zwiebelwürfel dazugeben und andünsten. Den Risottoreis hinzufügen, anschwitzen und mit Weißwein ablöschen. Immer nur so viel Brühe dazugeben, dass der Reis bedeckt ist und umrühren. Wenn die Flüssigkeit fast verdampft ist, wieder mit Brühe aufgießen und umrühren.",
      "",
      "3",
      "Die Pilze zuerst ohne, evtl. später mit etwas Fett in einer Pfanne anbraten. Nach Belieben mit Salz und Pfeffer würzen. Die Pilze aus der Pfanne nehmen und auf die Seite stellen. Etwas Öl in die Pfanne geben und die Zucchinischeiben darin anbraten. Mit Salz und Pfeffer würzen und auf die Seite stellen.",
      "",
      "4",
      "Wenn der Risottoreis gar und die Brühe fast verdampft ist, die Pilze und die Zucchini unterheben. Die Sahne sowie den geriebenen Parmesan einrühren und mit etwas Pfeffer und evtl. Wein abschmecken. Die Petersilie unterrühren.",
      "",
      "5",
      "Wer mag, kann Baconscheiben in einer Pfanne anbraten und auf das Risotto geben.",
      "",
      "Dazu passt Blattsalat.",
    ].join("\n");

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const aktiv = await page.evaluate((text) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = text;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, chefkochText);

    assert(aktiv.title === "Pilzrisotto mit Zucchini", "Titel korrekt erkannt (nicht der Untertitel)");
    assert(aktiv.servings === 4, "Portionen korrekt erkannt");
    assert(aktiv.category === "Hauptgericht", "Kategorie nicht durch 'Dazu passt Blattsalat' verfälscht");
    assert(aktiv.ingredients.length === 13, "Alle 13 Zutaten erkannt (Menge/Name über zwei Zeilen verteilt)");
    const risottoreis = aktiv.ingredients.find((z) => z.name === "Risottoreis");
    assert(!!risottoreis && risottoreis.amount === "400" && risottoreis.unit.toLowerCase() === "g", "Menge+Einheit korrekt einer über zwei Zeilen verteilten Zutat zugeordnet");
    const oel = aktiv.ingredients.find((z) => z.name === "Öl");
    assert(!!oel && oel.amount.toLowerCase() === "etwas", "Reine Wort-Menge ('etwas') ohne Einheit korrekt erkannt");
    assert(aktiv.ingredients.some((z) => z.name.includes("Fleischbrühe") && z.name.includes("Gemüsebrühe")), "'oder'-Zusatzangabe wird an die vorherige Zutat angehängt statt eigene Zutat zu werden");
    assert(aktiv.ingredients.some((z) => z.name === "Salz und Pfeffer" && z.amount === ""), "Zutat ohne separate Mengenzeile wird trotzdem übernommen (ohne Menge)");
    assert(
      !aktiv.ingredients.some((z) => /gesamtzeit|arbeitszeit|schwierigkeit|rezeptautor|profil|^normal$|bienemaya/i.test(z.name)),
      "Seiten-Metadaten (Zeiten, Schwierigkeit, Autor) landen nicht als Zutat"
    );
    assert(aktiv.steps.length === 5, "Alle 5 nummerierten Zubereitungsschritte erkannt (Nummer stand allein auf eigener Zeile)");
    assert(aktiv.steps[0].startsWith("Zwiebel fein würfeln"), "Erster Schritt korrekt der Nummer '1' zugeordnet");
    assert(aktiv.steps[1].startsWith("1 EL Öl"), "Schritt, der mit einer Zahl beginnt ('1 EL Öl...'), wird nicht mit einer Nummerierung verwechselt");
    assert(
      !aktiv.steps.some((s) => /gesamtzeit|arbeitszeit|koch-\/?backzeit|^\d+\s*min\.?$/i.test(s)),
      "Zeitangaben zwischen den Schritten landen nicht als eigener Schritt"
    );
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 12: kochbar.de-Format - Zutatenname steht VOR der Menge (umgekehrte
// Reihenfolge zu Chefkoch), weil dort die Tabellenspalten "Zutat" und
// "Menge" andersherum angeordnet sind. Recherche-Grundlage: WebFetch-Abruf
// von kochbar.de am 19.09.2026.
// ---------------------------------------------------------------------
async function testTextErkennungKochbarNameZuerst(browser) {
  console.log("\nTest: Rezepttext-Erkennung mit kochbar.de-Format (Name vor Menge)");
  const page = await neueTestUmgebung(browser);
  try {
    const kochbarText = [
      "Paprikagulasch", "Zutaten für 6 Personen", "",
      "Rinderschulter", "1 kg", "Zwiebeln", "2", "Knoblauchzehen", "2", "Paprika", "2",
      "Majoran", "0.5 Bund", "Öl", "2 EL", "Tomatenmark", "80 Gramm",
      "Salz, Pfeffer, Paprikapulver", "Rotwein", "600 Milliliter", "Rinderbrühe", "600 Milliliter",
      "Saure Sahne", "200 Gramm", "",
      "Zubereitung",
      "1. Fleisch waschen und würfeln.",
      "2. Öl in einem großen Topf erhitzen und Fleisch anbraten.",
      "3. Gulasch mit Salz, Pfeffer und Paprikapulver abschmecken.",
    ].join("\n");

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const aktiv = await page.evaluate((text) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = text;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, kochbarText);

    assert(aktiv.ingredients.length === 11, "Alle 11 Zutaten erkannt (Name-vor-Menge-Format)");
    const rind = aktiv.ingredients.find((z) => z.name === "Rinderschulter");
    assert(!!rind && rind.amount === "1" && rind.unit.toLowerCase() === "kg", "Menge wird trotz umgekehrter Reihenfolge der richtigen Zutat zugeordnet");
    assert(aktiv.ingredients.some((z) => z.name.includes("Salz, Pfeffer") && z.amount === ""), "Zutat ohne folgende Mengenzeile bleibt ohne Menge, wird aber übernommen");
    assert(aktiv.steps.length === 3, "3 Zubereitungsschritte erkannt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 13: ichkoche.at-Format - Zutaten einzeilig wie gewohnt, aber
// Zubereitungsschritte als Bindestrich-Liste statt nummeriert.
// ---------------------------------------------------------------------
async function testTextErkennungBindestrichSchritte(browser) {
  console.log("\nTest: Rezepttext-Erkennung mit Bindestrich-Zubereitungsschritten");
  const page = await neueTestUmgebung(browser);
  try {
    const text = [
      "Spaghetti Bolognese", "Zutaten", "",
      "500 g gemischtes Hackfleisch - halb Rind und halb Schwein",
      "1 Zwiebel", "2 Knoblauchzehen", "400 g stückige Tomaten", "2 EL Tomatenmark", "",
      "Zubereitung",
      "- Zwiebel und Knoblauch fein würfeln.",
      "- Hackfleisch in einem Topf anbraten und die Zwiebeln dazugeben.",
      "- Tomaten und Tomatenmark hinzufügen und 20 Minuten köcheln lassen.",
    ].join("\n");

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const aktiv = await page.evaluate((t) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = t;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, text);

    assert(aktiv.ingredients.length === 5, "5 Zutaten erkannt (einzeiliges Format bleibt unterstützt)");
    assert(aktiv.ingredients[0].name.includes("gemischtes Hackfleisch"), "Zusatzbeschreibung nach Bindestrich bleibt Teil des Namens");
    assert(aktiv.steps.length === 3, "3 Zubereitungsschritte trotz Bindestrich-Aufzählung statt Nummerierung erkannt");
    assert(!aktiv.steps.some((s) => s.startsWith("-")), "Führender Bindestrich wird aus dem Schritt-Text entfernt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 14: URL-Import - Erfolgsfall. Simuliert die Service-Response, die
// das echte Python-Skript (rezeptbuch_url_import.py) auf stdout liefern
// würde, und prüft, dass die Karte daraus korrekt Zutaten (per
// _zutatenBlockParsen aus den kombinierten Strings) und Schritte übernimmt
// sowie die richtige URL an den Service übergibt.
// ---------------------------------------------------------------------
async function testUrlImportErfolg(browser) {
  console.log("\nTest: URL-Import - Erfolgsfall");
  const page = await neueTestUmgebung(browser);
  try {
    const skriptAntwort = JSON.stringify({
      title: "Apfelkuchen",
      servings: 8,
      category: "Kuchen",
      ingredients: ["500 g Äpfel", "300 g Mehl", "2 Eier"],
      steps: ["Äpfel schälen und schneiden.", "Teig kneten.", "45 Minuten backen."],
      image: "https://beispiel.test/apfelkuchen.jpg",
    });

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const { aktiv, uebergebeneUrl, alerts } = await page.evaluate(async (antwortText) => {
      window.__urlImportAntwort = antwortText;
      window.__urlImportSchlaegtFehl = false;
      const root = window.__karte.shadowRoot;
      root.getElementById("url-einfuegen-btn").click();
      root.getElementById("url-feld").value = "https://beispiel.test/apfelkuchen";
      root.getElementById("url-importieren-btn").click();
      // Auf den asynchronen Klick-Handler warten (Formular wird danach neu gerendert).
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        aktiv: window.__karte._aktivesRezept,
        uebergebeneUrl: window.__letzteUrlImportUrl,
        alerts: window.__alertAufrufe.slice(),
      };
    }, skriptAntwort);

    assert(uebergebeneUrl === "https://beispiel.test/apfelkuchen", "Die eingegebene URL wird unverändert an den Service übergeben");
    assert(aktiv.title === "Apfelkuchen", "Titel aus der Service-Response übernommen");
    assert(aktiv.servings === 8, "Portionen aus der Service-Response übernommen");
    assert(aktiv.category === "Kuchen", "Kategorie aus der Service-Response übernommen");
    assert(aktiv.ingredients.length === 3, "3 Zutaten aus den kombinierten Strings erkannt");
    const mehl = aktiv.ingredients.find((z) => z.name === "Mehl");
    assert(!!mehl && mehl.amount === "300" && mehl.unit.toLowerCase() === "g", "Kombinierter Zutaten-String korrekt in Menge/Einheit/Name zerlegt");
    assert(aktiv.steps.length === 3 && aktiv.steps[2] === "45 Minuten backen.", "Zubereitungsschritte unverändert übernommen");
    assert(aktiv.image === "https://beispiel.test/apfelkuchen.jpg", "Bild-URL übernommen (wird beim Speichern generisch geladen)");
    assert(alerts.length === 0, "Kein alert() im Erfolgsfall");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 15: URL-Import - das Skript liefert eine Fehlermeldung (z.B. keine
// schema.org-Daten gefunden). Die Karte muss das per alert() melden und
// darf das Formular NICHT mit leeren/kaputten Daten überschreiben.
// ---------------------------------------------------------------------
async function testUrlImportSkriptFehler(browser) {
  console.log("\nTest: URL-Import - Skript meldet Fehler");
  const page = await neueTestUmgebung(browser);
  try {
    const skriptAntwort = JSON.stringify({ error: "Keine Rezeptdaten gefunden." });

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const { aktiv, alerts } = await page.evaluate(async (antwortText) => {
      window.__urlImportAntwort = antwortText;
      window.__urlImportSchlaegtFehl = false;
      const root = window.__karte.shadowRoot;
      root.getElementById("url-einfuegen-btn").click();
      root.getElementById("url-feld").value = "https://beispiel.test/kein-rezept";
      root.getElementById("url-importieren-btn").click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { aktiv: window.__karte._aktivesRezept, alerts: window.__alertAufrufe.slice() };
    }, skriptAntwort);

    assert(alerts.length === 1 && alerts[0].includes("Keine Rezeptdaten gefunden"), "Fehlermeldung des Skripts wird per alert() angezeigt");
    assert(aktiv.title === "", "Formular bleibt bei einem Fehler unverändert (kein Titel übernommen)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 16: URL-Import - Eingabe-Validierung im Browser, BEVOR überhaupt ein
// Service-Aufruf versucht wird (Apostroph würde den Shell-Befehl in
// configuration.yaml sprengen; eine URL ohne http(s) ergibt keinen Sinn).
// ---------------------------------------------------------------------
async function testUrlImportValidierung(browser) {
  console.log("\nTest: URL-Import - Eingabe-Validierung");
  const page = await neueTestUmgebung(browser);
  try {
    await page.evaluate(() => window.__karte._neuesRezeptFormular());

    const apostrophErgebnis = await page.evaluate(async () => {
      window.__letzteUrlImportUrl = undefined;
      const root = window.__karte.shadowRoot;
      root.getElementById("url-einfuegen-btn").click();
      root.getElementById("url-feld").value = "https://beispiel.test/rezept'mit-apostroph";
      root.getElementById("url-importieren-btn").click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { alerts: window.__alertAufrufe.slice(), aufgerufen: window.__letzteUrlImportUrl };
    });
    assert(apostrophErgebnis.alerts.some((a) => a.includes("Apostroph")), "Apostroph in der URL wird abgelehnt, bevor der Service gerufen wird");
    assert(apostrophErgebnis.aufgerufen === undefined, "Bei ungültiger URL wird der shell_command-Service gar nicht erst aufgerufen");

    const ohneProtokollErgebnis = await page.evaluate(async () => {
      window.__alertAufrufe = [];
      window.__letzteUrlImportUrl = undefined;
      const root = window.__karte.shadowRoot;
      root.getElementById("url-feld").value = "www.beispiel.test/rezept";
      root.getElementById("url-importieren-btn").click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { alerts: window.__alertAufrufe.slice(), aufgerufen: window.__letzteUrlImportUrl };
    });
    assert(ohneProtokollErgebnis.alerts.length === 1, "URL ohne http(s):// wird abgelehnt");
    assert(ohneProtokollErgebnis.aufgerufen === undefined, "Bei fehlendem Protokoll wird der shell_command-Service gar nicht erst aufgerufen");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 17: URL-Hash wird beim Öffnen einer Detailansicht gesetzt und beim
// Zurückgehen zur Liste wieder entfernt. Grundlage für Test 18 (Home-
// Assistant-Begleit-Apps laden die Web-Ansicht nach einer Weile im
// Hintergrund manchmal komplett neu - dabei geht der reine JS-Zustand der
// Karte verloren, die URL aber nicht, siehe _urlHashSetzen).
// ---------------------------------------------------------------------
async function testUrlHashBeimOeffnenUndSchliessen(browser) {
  console.log("\nTest: URL-Hash spiegelt die offene Detailansicht");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Gulasch", payload: leererPayload() });

    const hashNachOeffnen = await page.evaluate((uid) => {
      const rezept = window.__karte._rezepte.find((r) => r.uid === uid);
      window.__karte._rezeptOeffnen(rezept);
      return location.hash;
    }, uid);
    assert(hashNachOeffnen === `#rezeptbuch-rezept=${uid}`, "Hash enthält die UID des geöffneten Rezepts");

    const hashNachSchliessen = await page.evaluate(async () => {
      await window.__karte._zurListe();
      return location.hash;
    });
    assert(hashNachSchliessen === "", "Hash wird beim Zurückgehen zur Liste wieder entfernt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 18: Die eigentliche Reparatur - simuliert, dass die Begleit-App die
// Web-Ansicht komplett neu lädt, während ein Rezept in der Detailansicht
// offen war (neue Karten-Instanz = neuer Konstruktor-Aufruf = _ansicht
// startet wieder bei "liste", GENAU wie nach einem echten Reload). Die
// Ziel-URL (mit Hash) bleibt dabei erhalten, weil sie Teil der Adresse ist,
// die neu geladen wird - nicht Teil des verlorenen JS-Zustands.
// ---------------------------------------------------------------------
async function testWiederherstellungNachSimuliertemReload(browser) {
  console.log("\nTest: Detailansicht übersteht simulierten App-Reload");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Linsensuppe", payload: leererPayload() });
    await page.evaluate((uid) => {
      const rezept = window.__karte._rezepte.find((r) => r.uid === uid);
      window.__karte._rezeptOeffnen(rezept);
    }, uid);

    // Simuliert den Reload: alte Karte entfernen, neue (frische) Instanz an
    // ihrer Stelle erzeugen und mit demselben simulierten hass-Objekt
    // verbinden - wie es bei einem echten Reload passieren würde, nur ohne
    // tatsächlich page.reload() aufzurufen (das würde auch das injizierte
    // Test-Setup selbst wegwerfen, nicht nur den Karten-Zustand).
    await page.evaluate(() => {
      window.__karte.remove();
      const frischeKarte = document.createElement("rezeptbuch-card");
      frischeKarte.setConfig({ entity: "todo.rezepte" });
      document.body.appendChild(frischeKarte);
      window.__karte = frischeKarte;
      frischeKarte.hass = window.__fakeHass;
    });
    await page.waitForFunction(() => window.__karte._geladen === true && window.__karte._ansicht === "detail");

    const zustand = await page.evaluate(() => ({
      ansicht: window.__karte._ansicht,
      titel: window.__karte._aktivesRezept && window.__karte._aktivesRezept.title,
    }));
    assert(zustand.ansicht === "detail", "Nach simuliertem Reload landet die frische Karten-Instanz wieder in der Detailansicht");
    assert(zustand.titel === "Linsensuppe", "Die Detailansicht zeigt nach der Wiederherstellung wieder das richtige Rezept");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 19: Verwaister Hash (Rezept wurde zwischenzeitlich gelöscht, oder
// die UID ist aus einem anderen Grund ungültig) darf nicht zu einem Fehler
// führen - die Karte muss sauber auf die Liste zurückfallen und den
// ungültigen Hash entfernen statt ihn stehen zu lassen.
// ---------------------------------------------------------------------
async function testVerwaisterUrlHashFaelltAufListeZurueck(browser) {
  console.log("\nTest: Verwaister URL-Hash (gelöschtes Rezept) führt zur Liste statt zu einem Fehler");
  const page = await neueTestUmgebung(browser);
  try {
    const zustand = await page.evaluate(async () => {
      window.__karte.remove();
      history.replaceState(null, "", location.href.split("#")[0] + "#rezeptbuch-rezept=uid-existiert-nicht");
      const frischeKarte = document.createElement("rezeptbuch-card");
      frischeKarte.setConfig({ entity: "todo.rezepte" });
      document.body.appendChild(frischeKarte);
      window.__karte = frischeKarte;
      frischeKarte.hass = window.__fakeHass;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { ansicht: frischeKarte._ansicht, hash: location.hash };
    });
    assert(zustand.ansicht === "liste", "Bei unbekannter UID im Hash bleibt/landet die Karte in der Listenansicht");
    assert(zustand.hash === "", "Der ungültige Hash wird bereinigt statt stehen zu bleiben");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 20: Attribut-Injection über Titel/Bild-URL wird verhindert.
//
// Hintergrund: _escape() escapte bisher nur &, < und > (ausreichend für
// reinen Text-Inhalt), nicht aber Anführungszeichen. An Stellen, wo
// _escape() das Ergebnis aber in ein HTML-ATTRIBUT einsetzt (z.B.
// value="${this._escape(r.title)}", oder src="${this._escape(r.image)}"),
// konnte ein Wert mit einem eingebetteten " aus dem Attribut ausbrechen und
// ein beliebiges weiteres Attribut einschleusen (z.B. einen
// Event-Handler wie onerror=...) - klassische Attribut-Injection/XSS.
// Seit dem URL-Import (Abschnitt 14) ist das kein rein theoretisches
// Risiko mehr, weil Titel/Bild dabei automatisiert aus einer fremden,
// nicht selbst geprüften Webseite übernommen werden können, ohne dass
// jemand den Text vorher liest.
// ---------------------------------------------------------------------
async function testAttributInjectionWirdVerhindert(browser) {
  console.log("\nTest: Attribut-Injection über Titel/Bild-URL wird verhindert");
  const page = await neueTestUmgebung(browser);
  try {
    const boesarterTitel = 'Böser Titel" onmouseover="window.__xssTitel=true';
    const boesesBild = 'x" onerror="window.__xssBild=true';
    const uid = await rezeptDirektAnlegen(page, {
      title: boesarterTitel,
      payload: leererPayload({ image: boesesBild }),
    });

    const ergebnis = await page.evaluate((uid) => {
      // Listenansicht rendert das Bild jeder Kachel (Zeile mit "kachel-bild").
      window.__karte._render();
      const kachelBild = window.__karte.shadowRoot.querySelector("img.kachel-bild");

      const rezept = window.__karte._rezepte.find((r) => r.uid === uid);
      window.__karte._rezeptOeffnen(rezept); // Detailansicht rendert r.image ebenfalls als <img src=...>
      const detailBild = window.__karte.shadowRoot.querySelector("img.detail-bild");

      window.__karte._rezeptBearbeiten(rezept); // Formular rendert den Titel als value="..."
      const titelFeld = window.__karte.shadowRoot.getElementById("titel-feld");

      return {
        xssTitelAusgefuehrt: window.__xssTitel === true,
        xssBildAusgefuehrt: window.__xssBild === true,
        // class + src + alt (alt="" wurde für Barrierefreiheit ergänzt, siehe CHANGELOG)
        kachelHatNurSrcAttribut: kachelBild ? kachelBild.getAttributeNames().length === 3 : null,
        detailHatNurSrcAttribut: detailBild ? detailBild.getAttributeNames().length === 3 : null,
        titelWertKorrektAusgelesen: titelFeld ? titelFeld.value : null,
      };
    }, uid);

    assert(ergebnis.xssTitelAusgefuehrt === false, "Eingeschleuster onmouseover-Handler über den Titel wird NICHT ausgeführt");
    assert(ergebnis.xssBildAusgefuehrt === false, "Eingeschleuster onerror-Handler über die Bild-URL wird NICHT ausgeführt");
    assert(ergebnis.kachelHatNurSrcAttribut === true, "Kachel-Bild bekommt kein zusätzlich eingeschleustes Attribut (nur class+src)");
    assert(ergebnis.detailHatNurSrcAttribut === true, "Detail-Bild bekommt kein zusätzlich eingeschleustes Attribut (nur class+src)");
    assert(ergebnis.titelWertKorrektAusgelesen === boesarterTitel, "Titel-Eingabefeld liest den ursprünglichen Titel korrekt zurück (kein Ausbruch, keine Doppel-Kodierung)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 21: Bruch-/Komma-Mengen und Mengenbereiche werden jetzt erkannt
// (Unicode-Bruchzeichen, "1/2", Komma-Dezimalzahlen, Bereiche mit "-",
// Gedankenstrich "–" oder "bis").
// ---------------------------------------------------------------------
async function testBruchUndBereichsMengenWerdenErkannt(browser) {
  console.log("\nTest: Bruch-/Komma-Mengen und Mengenbereiche werden erkannt");
  const page = await neueTestUmgebung(browser);
  try {
    const text = [
      "Pfannkuchen", "Zutaten",
      "½ TL Salz",
      "1,5 EL Zucker",
      "1/2 TL Zimt",
      "1 1/2 Tassen Mehl",
      "400-500 g Kartoffeln",
      "400–500 ml Milch",
      "2 bis 3 Eier",
      "Zubereitung",
      "1. Alles vermengen.",
    ].join("\n");

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const aktiv = await page.evaluate((t) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = t;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, text);

    assert(aktiv.ingredients.length === 7, "Alle 7 Zutaten mit Sonderformaten werden erkannt");
    const salz = aktiv.ingredients.find((z) => z.name === "Salz");
    assert(!!salz && salz.amount === "½", "Unicode-Bruchzeichen (½) wird als Menge erkannt");
    const zucker = aktiv.ingredients.find((z) => z.name === "Zucker");
    assert(!!zucker && zucker.amount === "1,5", "Komma-Dezimalzahl (1,5) wird als Menge erkannt");
    const zimt = aktiv.ingredients.find((z) => z.name === "Zimt");
    assert(!!zimt && zimt.amount === "1/2", "Einfacher Bruch (1/2) wird als Menge erkannt");
    const mehl = aktiv.ingredients.find((z) => z.name === "Mehl");
    assert(!!mehl && mehl.amount === "1 1/2", "Gemischte Zahl (1 1/2) wird als Menge erkannt");
    const kartoffeln = aktiv.ingredients.find((z) => z.name === "Kartoffeln");
    assert(!!kartoffeln && kartoffeln.amount === "400-500", "Bereich mit Bindestrich (400-500) wird als Menge erkannt");
    const milch = aktiv.ingredients.find((z) => z.name === "Milch");
    assert(!!milch && milch.amount === "400–500", "Bereich mit Gedankenstrich (400–500) wird als Menge erkannt");
    const eier = aktiv.ingredients.find((z) => z.name === "Eier");
    assert(!!eier && eier.amount === "2 bis 3", "Bereich mit 'bis' (2 bis 3) wird als Menge erkannt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 22: Unterüberschriften innerhalb der Zutaten (z.B. "Für den Teig:")
// werden als Gliederung erkannt und NICHT als eigene, sinnlose Zutat mit
// aufgenommen (und im Name-zuerst-Format auch nicht fälschlich mit der
// nächsten Menge verknüpft).
// ---------------------------------------------------------------------
async function testZutatenUnterueberschriftenWerdenIgnoriert(browser) {
  console.log("\nTest: Zutaten-Unterüberschriften werden ignoriert");
  const page = await neueTestUmgebung(browser);
  try {
    const text = [
      "Käsekuchen", "Zutaten",
      "Für den Teig:",
      "200 g Mehl",
      "100 g Butter",
      "Für die Füllung:",
      "500 g Quark",
      "3 Eier",
      "Zubereitung",
      "1. Teig kneten und Füllung verrühren.",
    ].join("\n");

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const aktiv = await page.evaluate((t) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = t;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, text);

    assert(aktiv.ingredients.length === 4, "Nur die 4 echten Zutaten werden übernommen, die 2 Unterüberschriften nicht");
    assert(!aktiv.ingredients.some((z) => /für den teig|für die füllung/i.test(z.name)), "Keine Unterüberschrift landet als Zutatenname");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 23: Zubereitungsschritte, die NUR durch Leerzeilen getrennt sind
// (kein "1.", keine Bindestriche), werden absatzweise zu je einem Schritt
// zusammengefasst statt jede einzelne (evtl. nur weich umgebrochene) Zeile
// als eigenen, unvollständigen Schritt zu werten.
// ---------------------------------------------------------------------
async function testAbsatzSchritteOhneNummerierung(browser) {
  console.log("\nTest: Absatz-Schritte ohne Nummerierung werden korrekt gruppiert");
  const page = await neueTestUmgebung(browser);
  try {
    const text = [
      "Omelett", "Zutaten", "3 Eier", "Zubereitung",
      "Eier in einer Schüssel verquirlen",
      "und mit Salz und Pfeffer würzen.",
      "",
      "Butter in einer Pfanne erhitzen und die",
      "Eiermasse hineingeben.",
      "",
      "Von beiden Seiten goldbraun braten und servieren.",
    ].join("\n");

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const aktiv = await page.evaluate((t) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = t;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, text);

    assert(aktiv.steps.length === 3, "3 durch Leerzeilen getrennte Absätze werden zu 3 Schritten (nicht 5 Einzelzeilen)");
    assert(aktiv.steps[0] === "Eier in einer Schüssel verquirlen und mit Salz und Pfeffer würzen.", "Weich umgebrochene Zeilen innerhalb eines Absatzes werden zu einem Schritt zusammengefügt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 24: Englische Überschriften ("Ingredients"/"Instructions") werden
// zusätzlich zu den deutschen erkannt.
// ---------------------------------------------------------------------
async function testEnglischeUeberschriftenWerdenErkannt(browser) {
  console.log("\nTest: Englische Überschriften werden erkannt");
  const page = await neueTestUmgebung(browser);
  try {
    const text = [
      "Pancakes", "Ingredients",
      "200 g flour",
      "2 eggs",
      "Instructions",
      "1. Mix everything together.",
      "2. Fry in a pan.",
    ].join("\n");

    await page.evaluate(() => window.__karte._neuesRezeptFormular());
    const aktiv = await page.evaluate((t) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("text-einfuegen-btn").click();
      root.getElementById("text-feld").value = t;
      root.getElementById("text-erkennen-btn").click();
      return window.__karte._aktivesRezept;
    }, text);

    assert(aktiv.ingredients.length === 2, "Zutaten unter 'Ingredients' werden erkannt");
    assert(aktiv.steps.length === 2, "Schritte unter 'Instructions' werden erkannt");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 25: Einkaufsliste - Aggregation gleicher Zutaten über mehrere Rezepte
// hinweg (feature 1). Gleicher Name+Einheit wird summiert, unterschiedliche
// Einheiten NICHT zusammengeführt, nicht-numerische Mengen bleiben als
// eigene Zeile erhalten statt falsch verrechnet zu werden.
// ---------------------------------------------------------------------
async function testEinkaufslisteAggregation(browser) {
  console.log("\nTest: Einkaufsliste - Zutaten-Aggregation");
  const page = await neueTestUmgebung(browser);
  try {
    const ergebnis = await page.evaluate(() => {
      const rezepte = [
        { ingredients: [{ amount: "200", unit: "g", name: "Mehl" }, { amount: "2", unit: "Stk", name: "Eier" }] },
        { ingredients: [{ amount: "300", unit: "g", name: "mehl" }, { amount: "1", unit: "Päckchen", name: "Mehl" }] },
        { ingredients: [{ amount: "etwas", unit: "", name: "Salz" }] },
      ];
      return window.__karte._einkaufslisteAggregieren(rezepte);
    });
    assert(ergebnis.some((z) => z === "500 g Mehl"), "Gleicher Name+Einheit (Groß-/Kleinschreibung egal) wird zu einer Zeile mit Summe zusammengefasst (200+300=500 g Mehl)");
    assert(ergebnis.some((z) => z.includes("Päckchen Mehl")), "Andere Einheit derselben Zutat bleibt eine EIGENE Zeile (wird nicht mit 'g' verrechnet)");
    assert(ergebnis.some((z) => z === "2 Stk Eier"), "Zutat, die nur in einem Rezept vorkommt, bleibt unverändert erhalten");
    assert(ergebnis.some((z) => z.toLowerCase().includes("etwas") && z.includes("Salz")), "Nicht-numerische Menge ('etwas') wird nicht verrechnet, sondern als eigene Zeile übernommen");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 26: Einkaufsliste - ohne konfigurierte shopping_list_entity erscheint
// eine erklärende Warnung statt eines Absturzes, und es wird KEIN add_item
// aufgerufen.
// ---------------------------------------------------------------------
async function testEinkaufslisteOhneKonfiguration(browser) {
  console.log("\nTest: Einkaufsliste ohne konfigurierte shopping_list_entity");
  const page = await neueTestUmgebung(browser);
  try {
    await rezeptDirektAnlegen(page, { title: "Testrezept", payload: leererPayload() });
    const { alerts, aufrufe } = await page.evaluate(async () => {
      await window.__karte._einkaufslisteErstellen(window.__karte._rezepte);
      return { alerts: window.__alertAufrufe.slice(), aufrufe: window.__addItemAufrufe.slice() };
    });
    assert(alerts.some((a) => a.includes("shopping_list_entity")), "Ohne shopping_list_entity erscheint eine erklärende Warnung statt eines Absturzes");
    assert(aufrufe.length === 0, "Ohne konfigurierte shopping_list_entity wird kein add_item aufgerufen");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 27: Einkaufsliste - Erfolgsfall über die echte UI (Auswahlmodus
// aktivieren, zwei Rezepte per Klick auswählen, "Einkaufsliste erstellen"
// klicken) - mit konfigurierter shopping_list_entity.
// ---------------------------------------------------------------------
async function testEinkaufslisteUeberUi(browser) {
  console.log("\nTest: Einkaufsliste erstellen über die echte UI");
  const page = await neueTestUmgebung(browser);
  try {
    await page.evaluate(() => {
      window.__karte._config.shopping_list_entity = "todo.einkaufsliste";
    });
    const uid1 = await rezeptDirektAnlegen(page, {
      title: "Pfannkuchen",
      payload: leererPayload({ ingredients: [{ amount: "200", unit: "g", name: "Mehl" }] }),
    });
    const uid2 = await rezeptDirektAnlegen(page, {
      title: "Waffeln",
      payload: leererPayload({ ingredients: [{ amount: "300", unit: "g", name: "Mehl" }] }),
    });

    const aufrufe = await page.evaluate(async ({ uid1, uid2 }) => {
      const root = window.__karte.shadowRoot;
      root.getElementById("einkaufsmodus-btn").click();
      root.querySelector(`.kachel[data-uid="${uid1}"]`).click();
      root.querySelector(`.kachel[data-uid="${uid2}"]`).click();
      await window.__karte.shadowRoot.getElementById("einkaufsliste-erstellen-btn").click();
      // Der Klick-Handler ist async - kurz auf ihn warten.
      await new Promise((resolve) => setTimeout(resolve, 50));
      return window.__addItemAufrufe.slice();
    }, { uid1, uid2 });

    assert(aufrufe.length === 1, "Die zusammengeführte Mehl-Zutat wird als EIN Eintrag angelegt (200+300=500 g Mehl)");
    assert(aufrufe[0].item === "500 g Mehl", "Der Einkaufslisten-Eintrag hat das Format 'Menge Einheit Name'");
    assert(aufrufe[0].entity_id === "todo.einkaufsliste", "Der Eintrag wird für die konfigurierte shopping_list_entity angelegt (nicht für die Rezeptliste)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 28: Wochenplan - einem Wochentag ein Rezept zuweisen wird
// geräteübergreifend gespeichert (als verstecktes Marker-Item in derselben
// Liste) UND taucht dabei NICHT als eigenes Rezept in this._rezepte auf.
// ---------------------------------------------------------------------
async function testWochenplanZuweisenUndPersistenz(browser) {
  console.log("\nTest: Wochenplan - Zuweisung wird gespeichert und bleibt versteckt");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Linsensuppe", payload: leererPayload() });

    await page.evaluate(async (uid) => {
      await window.__karte._wochenplanSpeichern({
        weekStart: "2026-09-14",
        days: { montag: uid, dienstag: null, mittwoch: null, donnerstag: null, freitag: null, samstag: null, sonntag: null },
        nextWeekDays: { montag: null, dienstag: null, mittwoch: null, donnerstag: null, freitag: null, samstag: null, sonntag: null },
      });
    }, uid);

    const nachErstemSpeichern = await page.evaluate(() => ({
      versteckt: window.__speicher.some((i) => i.summary === "__rezeptbuch_wochenplan__"),
      rezepteEnthaeltMarker: window.__karte._rezepte.some((r) => r.title === "__rezeptbuch_wochenplan__"),
      montag: window.__karte._wochenplan.days.montag,
    }), uid);
    assert(nachErstemSpeichern.versteckt, "Der Wochenplan wird als verstecktes Item in derselben To-do-Liste gespeichert");
    assert(!nachErstemSpeichern.rezepteEnthaeltMarker, "Das versteckte Wochenplan-Item taucht NICHT in this._rezepte auf");
    assert(nachErstemSpeichern.montag === uid, "Die Zuweisung (Montag -> Rezept) wird korrekt übernommen");

    // Frisch laden (neue Karten-Instanz, wie nach einem echten Neustart) und
    // prüfen, dass die Zuweisung erhalten bleibt.
    await page.evaluate(() => window.__karte._rezepteLaden());
    const nachNeuLaden = await page.evaluate(() => window.__karte._wochenplan.days.montag);
    assert(nachNeuLaden === uid, "Die Wochenplan-Zuweisung übersteht ein erneutes Laden");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 29: "Einkaufsliste aus Wochenplan erstellen" sammelt genau die im
// Wochenplan zugewiesenen Rezepte ein (feature 2, nutzt dieselbe
// Aggregations-Logik wie feature 1).
// ---------------------------------------------------------------------
async function testWochenplanEinkaufsliste(browser) {
  console.log("\nTest: Einkaufsliste aus dem Wochenplan erstellen");
  const page = await neueTestUmgebung(browser);
  try {
    // "Heute" fest auf denselben Montag legen wie der unten gespeicherte
    // weekStart ("2026-09-14") - sonst würde _wochenplanAnzeigen() (siehe
    // unten) je nachdem, an welchem echten Kalendertag dieser Test gerade
    // läuft, ggf. eine komplette Wochen-Nachrück-Runde auslösen (siehe
    // _wochenplanAktualisieren) und dabei die hier extra in die FOLGEWOCHE
    // gespeicherten Zuweisungen in "diese Woche" verschieben, statt sie
    // (wie vom Test beabsichtigt) unverändert in der Folgewoche zu belassen.
    await festesDatumSetzen(page, "2026-09-14T10:00:00");
    await page.evaluate(() => { window.__karte._config.shopping_list_entity = "todo.einkaufsliste"; });
    const uid1 = await rezeptDirektAnlegen(page, {
      title: "Omelett", payload: leererPayload({ ingredients: [{ amount: "3", unit: "Stk", name: "Eier" }] }),
    });
    const uid2 = await rezeptDirektAnlegen(page, {
      title: "Rührei", payload: leererPayload({ ingredients: [{ amount: "2", unit: "Stk", name: "Eier" }] }),
    });
    // Bewusst in die FOLGEWOCHE (nextWeekDays) statt "diese Woche" speichern:
    // Tage der aktuellen Woche, die vor dem heutigen Wochentag liegen, werden
    // beim Öffnen der Ansicht automatisch geleert (siehe testWochenplan-
    // VergangeneTageWerdenAutomatischGeleert) - das würde diesen Test je nach
    // Wochentag, an dem er zufällig läuft, unvorhersehbar machen. Die
    // Folgewoche ist davon nicht betroffen und eignet sich daher hier
    // zuverlässig unabhängig vom aktuellen Wochentag.
    await page.evaluate(async ({ uid1, uid2 }) => {
      await window.__karte._wochenplanSpeichern({
        weekStart: "2026-09-14",
        days: { montag: null, dienstag: null, mittwoch: null, donnerstag: null, freitag: null, samstag: null, sonntag: null },
        nextWeekDays: { montag: uid1, dienstag: uid2, mittwoch: null, donnerstag: null, freitag: null, samstag: null, sonntag: null },
      });
    }, { uid1, uid2 });

    const aufrufe = await page.evaluate(async () => {
      // Bewusst erst hier zurücksetzen: _wochenplanSpeichern() legt beim
      // allerersten Speichern selbst ein add_item für das Wochenplan-Marker-
      // Item an (entity_id "todo.rezepte") - das soll die Zählung der
      // Einkaufslisten-Einträge (entity_id "todo.einkaufsliste") nicht verfälschen.
      window.__addItemAufrufe = [];
      await window.__karte._wochenplanAnzeigen();
      window.__karte.shadowRoot.getElementById("tab-folgewoche-btn").click();
      window.__karte.shadowRoot.getElementById("wochenplan-einkaufsliste-btn").click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return window.__addItemAufrufe.slice();
    });

    assert(aufrufe.length === 1, "Die Eier aus beiden zugewiesenen Rezepten werden zu EINEM Eintrag zusammengefasst");
    assert(aufrufe[0].item === "5 Stk Eier", "3+2 Eier ergeben korrekt 5 Stk Eier");
  } finally {
    await page.close();
  }
}

// Überschreibt window.Date im Browser-Kontext der Seite mit einem festen
// Zeitpunkt, damit die datumsabhängige Wochenplan-Logik (vergangene Tage
// leeren, Folgewoche nachrücken lassen) deterministisch statt vom
// tatsächlichen Testlauf-Datum abhängig getestet werden kann. Die Karte
// selbst nutzt intern nur die globale "Date"-Kennung, daher wirkt das
// Überschreiben auch nachträglich (nach dem Laden der Karten-Datei).
async function festesDatumSetzen(page, isoZeitpunkt) {
  await page.evaluate((isoZeitpunkt) => {
    const ECHTES_DATUM = Date;
    class FestesDatum extends ECHTES_DATUM {
      constructor(...args) {
        if (args.length === 0) return new ECHTES_DATUM(isoZeitpunkt);
        return new ECHTES_DATUM(...args);
      }
      static now() { return new ECHTES_DATUM(isoZeitpunkt).getTime(); }
    }
    window.Date = FestesDatum;
  }, isoZeitpunkt);
}

// ---------------------------------------------------------------------
// Test 30: Wochenplan - vergangene Tage werden beim Öffnen der Ansicht
// automatisch geleert, kommende Tage bleiben unangetastet (feature 2,
// Erweiterung auf expliziten Wunsch: "wenn Montag vorbei ist, soll der
// Eintrag automatisch herausgenommen werden").
// ---------------------------------------------------------------------
async function testWochenplanVergangeneTageWerdenAutomatischGeleert(browser) {
  console.log("\nTest: Wochenplan - vergangene Tage werden beim Öffnen automatisch geleert");
  const page = await neueTestUmgebung(browser);
  try {
    const uidMo = await rezeptDirektAnlegen(page, { title: "Montagsgericht", payload: leererPayload() });
    const uidDi = await rezeptDirektAnlegen(page, { title: "Dienstagsgericht", payload: leererPayload() });
    const uidMi = await rezeptDirektAnlegen(page, { title: "Mittwochsgericht", payload: leererPayload() });
    const uidDo = await rezeptDirektAnlegen(page, { title: "Donnerstagsgericht", payload: leererPayload() });

    await page.evaluate(async ({ uidMo, uidDi, uidMi, uidDo }) => {
      await window.__karte._wochenplanSpeichern({
        weekStart: "2026-09-14", // ein Montag
        days: { montag: uidMo, dienstag: uidDi, mittwoch: uidMi, donnerstag: uidDo, freitag: null, samstag: null, sonntag: null },
        nextWeekDays: { montag: null, dienstag: null, mittwoch: null, donnerstag: null, freitag: null, samstag: null, sonntag: null },
      });
    }, { uidMo, uidDi, uidMi, uidDo });

    // "Heute" auf Mittwoch, 2026-09-16 festlegen: Montag/Dienstag sind damit
    // vergangen, Mittwoch (heute) und Donnerstag (Zukunft) nicht.
    await festesDatumSetzen(page, "2026-09-16T10:00:00");

    const ergebnis = await page.evaluate(async () => {
      await window.__karte._wochenplanAnzeigen();
      return window.__karte._wochenplan.days;
    });

    assert(ergebnis.montag === null, "Montag (vergangen) wurde automatisch geleert");
    assert(ergebnis.dienstag === null, "Dienstag (vergangen) wurde automatisch geleert");
    assert(ergebnis.mittwoch === uidMi, "Mittwoch (heute) bleibt bestehen");
    assert(ergebnis.donnerstag === uidDo, "Donnerstag (Zukunft) bleibt bestehen");

    // Übersteht auch ein erneutes Laden - wurde also tatsächlich zurückgespeichert,
    // nicht nur im Arbeitsspeicher der aktuellen Karten-Instanz geändert.
    const nachNeuLaden = await page.evaluate(async () => {
      await window.__karte._rezepteLaden();
      return window.__karte._wochenplan.days;
    });
    assert(nachNeuLaden.montag === null, "Bleibt auch nach erneutem Laden geleert (wurde persistiert)");
    assert(nachNeuLaden.mittwoch === uidMi, "Mittwoch bleibt auch nach erneutem Laden erhalten");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 31: Wochenplan - ist die aktuelle Woche komplett vorbei, rückt die
// bisherige Folgewoche automatisch zur neuen aktuellen Woche nach (explizit
// nachgefragtes Feature: "Folgewoche auch möglich zu integrieren").
// ---------------------------------------------------------------------
async function testWochenplanFolgewocheRuecktNach(browser) {
  console.log("\nTest: Wochenplan - Folgewoche rückt automatisch nach, wenn die aktuelle Woche vorbei ist");
  const page = await neueTestUmgebung(browser);
  try {
    const uidAlt = await rezeptDirektAnlegen(page, { title: "Altes Wochengericht", payload: leererPayload() });
    const uidNeu = await rezeptDirektAnlegen(page, { title: "Vorausgeplantes Gericht", payload: leererPayload() });

    await page.evaluate(async ({ uidAlt, uidNeu }) => {
      await window.__karte._wochenplanSpeichern({
        weekStart: "2026-09-14", // Montag der "alten" Woche
        days: { montag: uidAlt, dienstag: null, mittwoch: null, donnerstag: null, freitag: null, samstag: null, sonntag: null },
        nextWeekDays: { montag: uidNeu, dienstag: null, mittwoch: null, donnerstag: null, freitag: null, samstag: null, sonntag: null },
      });
    }, { uidAlt, uidNeu });

    // "Heute" auf den Montag der FOLGEWOCHE setzen - die alte Woche ist
    // damit komplett vorbei (2026-09-14 + 7 Tage = 2026-09-21).
    await festesDatumSetzen(page, "2026-09-21T09:00:00");

    const ergebnis = await page.evaluate(async () => {
      await window.__karte._wochenplanAnzeigen();
      return window.__karte._wochenplan;
    });

    assert(ergebnis.weekStart === "2026-09-21", "weekStart rückt auf den neuen, aktuellen Montag nach");
    assert(ergebnis.days.montag === uidNeu, "Die bisherige Folgewoche wird zur neuen aktuellen Woche");
    assert(ergebnis.nextWeekDays.montag === null, "Die Folgewoche ist danach wieder leer");

    const nachNeuLaden = await page.evaluate(async () => {
      await window.__karte._rezepteLaden();
      return window.__karte._wochenplan;
    });
    assert(nachNeuLaden.days.montag === uidNeu, "Das Nachrücken wurde persistiert (übersteht erneutes Laden)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 32: Wochenplan-UI - der "Folgewoche"-Tab speichert eine Zuweisung
// tatsächlich in nextWeekDays statt in days (und umgekehrt), getestet über
// die echte Bedienoberfläche statt direkt gegen die Datenstruktur.
// ---------------------------------------------------------------------
async function testWochenplanTabWechselSpeichertRichtigesFeld(browser) {
  console.log("\nTest: Wochenplan - Tab-Wechsel speichert Zuweisung ins richtige Feld");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Curry", payload: leererPayload() });

    await page.evaluate(async () => {
      await window.__karte._wochenplanAnzeigen();
      window.__karte.shadowRoot.getElementById("tab-folgewoche-btn").click();
    });

    await page.evaluate(async (uid) => {
      const auswahl = window.__karte.shadowRoot.querySelector('.wochentag-auswahl[data-tag="montag"]');
      auswahl.value = uid;
      auswahl.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 50));
    }, uid);

    const plan = await page.evaluate(() => window.__karte._wochenplan);
    assert(plan.nextWeekDays.montag === uid, "Zuweisung im Folgewoche-Tab landet in nextWeekDays");
    assert(!plan.days.montag, "'Diese Woche' bleibt dabei unverändert (kein Rezept für Montag)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 33: Mehrere Tags pro Rezept - über das Formular hinzufügen/entfernen,
// gespeichert, danach in der Liste per UND-Verknüpfung filterbar.
// ---------------------------------------------------------------------
async function testTagsHinzufuegenSpeichernUndFiltern(browser) {
  console.log("\nTest: Tags hinzufügen, speichern und per UND-Filter einschränken");
  const page = await neueTestUmgebung(browser);
  try {
    const uidA = await rezeptDirektAnlegen(page, {
      title: "Gemüsecurry", payload: leererPayload({ tags: ["vegetarisch", "schnell"] }),
    });
    const uidB = await rezeptDirektAnlegen(page, {
      title: "Linsensuppe", payload: leererPayload({ tags: ["vegetarisch"] }),
    });
    await rezeptDirektAnlegen(page, { title: "Braten", payload: leererPayload({ tags: [] }) });

    // Tags über die echte UI beim Bearbeiten hinzufügen/entfernen.
    await page.evaluate((uid) => {
      window.__karte._rezeptBearbeiten(window.__karte._rezepte.find((r) => r.uid === uid));
      const root = window.__karte.shadowRoot;
      root.getElementById("neuer-tag-feld").value = "herbst";
      root.getElementById("tag-hinzufuegen").click();
    }, uidA);
    const tagsNachHinzufuegen = await page.evaluate(() => window.__karte._aktivesRezept.tags.slice());
    assert(tagsNachHinzufuegen.includes("herbst") && tagsNachHinzufuegen.length === 3, "Neuer Tag wird über das Formular zu den bestehenden hinzugefügt");

    await page.evaluate(() => {
      const root = window.__karte.shadowRoot;
      root.querySelector('.tag-entfernen[data-index="2"]').click();
    });
    const tagsNachEntfernen = await page.evaluate(() => window.__karte._aktivesRezept.tags.slice());
    assert(!tagsNachEntfernen.includes("herbst"), "Tag lässt sich über das ✕ wieder entfernen (analog zu Zutaten/Schritten)");

    await page.evaluate(async () => {
      await window.__karte._formularSpeichern({
        title: "Gemüsecurry", servings: "4", category: "Hauptgericht",
        ingredients: [{ amount: "1", unit: "Stk", name: "Zwiebel" }], steps: ["Kochen"], image: null,
        tags: window.__karte._aktivesRezept.tags,
      });
    });
    const gespeichertesRezept = await page.evaluate((uid) => JSON.parse(window.__speicher.find((i) => i.uid === uid).description), uidA);
    assert(JSON.stringify(gespeichertesRezept.tags.sort()) === JSON.stringify(["schnell", "vegetarisch"]), "Die aktualisierten Tags werden im JSON gespeichert");

    // UND-Filter: nur "vegetarisch" -> 2 Treffer (A hat jetzt kein "schnell"
    // mehr aus Sicht des Servers, aber this._rezepte lokal noch nicht neu
    // geladen - daher frisch laden, um den gespeicherten Stand zu prüfen).
    await page.evaluate(() => window.__karte._rezepteLaden());
    await page.evaluate(() => { window.__karte._aktiveTags = new Set(["vegetarisch"]); });
    const nurVegetarisch = await page.evaluate(() => window.__karte._gefilterteRezepte().map((r) => r.title));
    assert(nurVegetarisch.length === 2 && nurVegetarisch.includes("Gemüsecurry") && nurVegetarisch.includes("Linsensuppe"), "Filter nach einem Tag liefert alle Rezepte mit diesem Tag");

    await page.evaluate(() => { window.__karte._aktiveTags = new Set(["vegetarisch", "schnell"]); });
    const beideTags = await page.evaluate(() => window.__karte._gefilterteRezepte().map((r) => r.title));
    assert(
      beideTags.length === 1 && beideTags[0] === "Gemüsecurry",
      "UND-Verknüpfung mehrerer Tags: nur das Rezept mit BEIDEN Tags ('vegetarisch' UND 'schnell') passt, Linsensuppe (nur 'vegetarisch') fällt raus"
    );

    assert(uidB, "Zweites Test-Rezept wurde angelegt (Kontrollwert für obige Zählungen)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 31: alte Rezepte ohne tags-Feld (schemaVersion 1) werden migriert und
// erscheinen korrekt mit leerem tags-Array - kein Absturz beim Filtern.
// ---------------------------------------------------------------------
async function testAlteRezepteOhneTagsWerdenMigriert(browser) {
  console.log("\nTest: Alte Rezepte ohne tags-Feld werden migriert (Rückwärtskompatibilität)");
  const page = await neueTestUmgebung(browser);
  try {
    await page.evaluate(() => {
      window.__speicher.push({
        uid: "alt-tag-1", summary: "Omas Braten",
        description: JSON.stringify({ schemaVersion: 1, servings: 4, ingredients: [], steps: [], category: "Hauptgericht" }),
        status: "needs_action",
      });
    });
    await page.evaluate(() => window.__karte._rezepteLaden());
    const rezept = await page.evaluate(() => window.__karte._rezepte.find((r) => r.uid === "alt-tag-1"));
    assert(Array.isArray(rezept.tags) && rezept.tags.length === 0, "Altes Rezept ohne tags-Feld bekommt ein leeres tags-Array statt undefined");
    assert(rezept.category === "Hauptgericht", "Die bestehende Kategorie bleibt bei der Migration unverändert");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 32: Kochbücher (gespeicherte Filter) - Speichern, als Quick-Filter
// anwenden und wieder löschen, inklusive Persistenz als verstecktes Item.
// ---------------------------------------------------------------------
async function testKochbuecherSpeichernAnwendenLoeschen(browser) {
  console.log("\nTest: Kochbücher speichern, anwenden und löschen");
  const page = await neueTestUmgebung(browser);
  try {
    await rezeptDirektAnlegen(page, { title: "Kürbissuppe", payload: leererPayload({ category: "Suppe", tags: ["herbst"] }) });

    await page.evaluate(() => {
      window.__karte._aktiveKategorie = "Suppe";
      window.__karte._aktiveTags = new Set(["herbst"]);
      window.__karte._suchbegriff = "kürbis";
    });
    await page.evaluate(async () => {
      await window.__karte._kochbuecherSpeichern([{ name: "Herbstsuppen", category: "Suppe", tags: ["herbst"], suchbegriff: "kürbis" }]);
    });

    const nachSpeichern = await page.evaluate(() => ({
      versteckt: window.__speicher.some((i) => i.summary === "__rezeptbuch_kochbuecher__"),
      rezepteEnthaeltMarker: window.__karte._rezepte.some((r) => r.title === "__rezeptbuch_kochbuecher__"),
      anzahl: window.__karte._kochbuecher.length,
    }));
    assert(nachSpeichern.versteckt, "Kochbücher werden als verstecktes Item in derselben To-do-Liste gespeichert");
    assert(!nachSpeichern.rezepteEnthaeltMarker, "Das versteckte Kochbücher-Item taucht NICHT in this._rezepte auf");
    assert(nachSpeichern.anzahl === 1, "Das gespeicherte Kochbuch ist danach in this._kochbuecher verfügbar");

    // Filter zurücksetzen, dann per Klick auf den Kochbuch-Chip wiederherstellen.
    await page.evaluate(() => {
      window.__karte._aktiveKategorie = "Alle";
      window.__karte._aktiveTags = new Set();
      window.__karte._suchbegriff = "";
      window.__karte._render();
    });
    await page.evaluate(() => {
      window.__karte.shadowRoot.querySelector(".kochbuch-chip").click();
    });
    const nachAnwenden = await page.evaluate(() => ({
      kategorie: window.__karte._aktiveKategorie,
      tags: Array.from(window.__karte._aktiveTags),
      suchbegriff: window.__karte._suchbegriff,
    }));
    assert(nachAnwenden.kategorie === "Suppe", "Klick auf den Kochbuch-Chip stellt die gespeicherte Kategorie wieder her");
    assert(nachAnwenden.tags.length === 1 && nachAnwenden.tags[0] === "herbst", "Klick auf den Kochbuch-Chip stellt die gespeicherten Tags wieder her");
    assert(nachAnwenden.suchbegriff === "kürbis", "Klick auf den Kochbuch-Chip stellt den gespeicherten Suchbegriff wieder her");

    // Löschen.
    await page.evaluate(async () => {
      window.__karte.shadowRoot.querySelector(".kochbuch-loeschen").click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const nachLoeschen = await page.evaluate(() => window.__karte._kochbuecher.length);
    assert(nachLoeschen === 0, "Kochbuch lässt sich über die ✕-Schaltfläche wieder löschen");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 33: Barrierefreiheit - Sterne-Bewertung ist per Tastatur bedienbar
// (echte <button>-Elemente mit ARIA-Radiogroup/-Radio-Semantik statt
// reiner <span>s) und die Rezept-Kacheln sind per Tab erreichbar und per
// Enter/Leertaste auslösbar (statt nur per Maus-Klick).
// ---------------------------------------------------------------------
async function testBarrierefreiheitVerbesserungen(browser) {
  console.log("\nTest: Barrierefreiheit - Tastaturbedienbarkeit von Sternen und Kacheln");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Kartoffelsuppe", payload: leererPayload({ image: "/local/suppe.jpg" }) });

    const sterneInfo = await page.evaluate((uid) => {
      const rezept = window.__karte._rezepte.find((r) => r.uid === uid);
      window.__karte._rezeptOeffnen(rezept);
      const gruppe = window.__karte.shadowRoot.getElementById("eigene-sterne");
      const buttons = Array.from(gruppe.querySelectorAll("button[data-wert]"));
      return {
        gruppenRolle: gruppe.getAttribute("role"),
        gruppenLabel: gruppe.getAttribute("aria-label"),
        anzahlButtons: buttons.length,
        alleSindButtons: buttons.every((b) => b.tagName === "BUTTON"),
        ersterHatRadioRolle: buttons[0].getAttribute("role") === "radio",
        ersterHatLabel: buttons[0].getAttribute("aria-label") === "1 von 5 Sternen",
        ersterHatAriaChecked: buttons[0].hasAttribute("aria-checked"),
      };
    }, uid);
    assert(sterneInfo.gruppenRolle === "radiogroup", "Die Sterne-Gruppe hat role='radiogroup'");
    assert(sterneInfo.gruppenLabel === "Eigene Bewertung", "Die Sterne-Gruppe hat ein aria-label");
    assert(sterneInfo.anzahlButtons === 5, "Es gibt 5 Sterne-Elemente");
    assert(sterneInfo.alleSindButtons, "Die Sterne sind echte <button>-Elemente (per Tastatur fokussierbar), keine <span>s");
    assert(sterneInfo.ersterHatRadioRolle, "Jeder Stern hat role='radio'");
    assert(sterneInfo.ersterHatLabel, "Jeder Stern hat ein sprechendes aria-label ('1 von 5 Sternen' usw.)");
    assert(sterneInfo.ersterHatAriaChecked, "Jeder Stern spiegelt seinen Zustand über aria-checked wider");

    // Klick auf einen Sterne-Button setzt weiterhin korrekt die Bewertung
    // (stellt sicher, dass die Umstellung von span auf button die
    // bestehende Funktionalität nicht kaputt gemacht hat).
    await page.evaluate(async () => {
      window.__karte.shadowRoot.getElementById("eigene-sterne").querySelector('button[data-wert="4"]').click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const bewertungNachKlick = await page.evaluate((uid) => {
      const rezept = window.__karte._rezepte.find((r) => r.uid === uid);
      return rezept.ratings[window.__karte._hass.user.id];
    }, uid);
    assert(bewertungNachKlick === 4, "Klick auf den 4. Sterne-Button setzt weiterhin korrekt eine Bewertung von 4");

    // Rezept-Kacheln: per Tab erreichbar und per Tastatur auslösbar.
    await page.evaluate(async () => {
      await window.__karte._zurListe();
      window.__karte._render();
    });
    const kachelInfo = await page.evaluate((uid) => {
      const kachel = window.__karte.shadowRoot.querySelector(`.kachel[data-uid="${uid}"]`);
      return {
        tabindex: kachel.getAttribute("tabindex"),
        rolle: kachel.getAttribute("role"),
        hatLabel: !!kachel.getAttribute("aria-label"),
      };
    }, uid);
    assert(kachelInfo.tabindex === "0", "Die Rezept-Kachel ist per Tab erreichbar (tabindex='0')");
    assert(kachelInfo.rolle === "button", "Die Rezept-Kachel hat im Normalmodus role='button'");
    assert(kachelInfo.hatLabel, "Die Rezept-Kachel hat ein aria-label");

    // Enter auf der fokussierten Kachel öffnet das Rezept, genau wie ein Klick.
    const oeffnetPerEnter = await page.evaluate((uid) => {
      const kachel = window.__karte.shadowRoot.querySelector(`.kachel[data-uid="${uid}"]`);
      kachel.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      return window.__karte._aktivesRezept && window.__karte._aktivesRezept.uid === uid;
    }, uid);
    assert(oeffnetPerEnter, "Enter-Taste auf der fokussierten Kachel öffnet das Rezept (genau wie ein Klick)");

    // Im Einkaufslisten-Auswahlmodus verhält sich die Kachel wie eine
    // Checkbox und Leertaste schaltet die Auswahl um.
    await page.evaluate(async () => {
      await window.__karte._zurListe();
      window.__karte._einkaufslistenModus = true;
      window.__karte._render();
    });
    const checkboxRolleVorher = await page.evaluate((uid) => {
      const kachel = window.__karte.shadowRoot.querySelector(`.kachel[data-uid="${uid}"]`);
      return { rolle: kachel.getAttribute("role"), checked: kachel.getAttribute("aria-checked") };
    }, uid);
    assert(checkboxRolleVorher.rolle === "checkbox", "Im Auswahlmodus hat die Kachel role='checkbox'");
    assert(checkboxRolleVorher.checked === "false", "Die Checkbox-Kachel ist anfangs nicht ausgewählt (aria-checked='false')");

    const nachLeertaste = await page.evaluate((uid) => {
      const kachel = window.__karte.shadowRoot.querySelector(`.kachel[data-uid="${uid}"]`);
      kachel.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      return window.__karte._ausgewaehlteRezepte.has(uid);
    }, uid);
    assert(nachLeertaste, "Leertaste auf der fokussierten Kachel schaltet die Auswahl im Einkaufslisten-Modus um (wie ein Klick)");
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// Test 35: Internationalisierung (i18n) - Deutsch bleibt Standard/Rückfall
// (siehe test/rezeptbuch-card.test.js: der Mock-hass setzt .language nie,
// das deckt bereits implizit den "hass.language fehlt -> Deutsch"-Fall
// über ALLE anderen Tests ab), "en" zeigt Englisch, und eine nicht
// unterstützte Sprache (z.B. "fr") fällt mangels eigener Übersetzung
// ebenfalls auf Englisch zurück (siehe RezeptbuchCard._sprache()).
// ---------------------------------------------------------------------
async function testInternationalisierung(browser) {
  console.log("\nTest: Internationalisierung (Deutsch/Englisch, Sprach-Rückfall)");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Kartoffelsuppe", payload: leererPayload() });

    // Deutsch (Standard, hass.language ist im Mock nie gesetzt) - stichprobenartig
    // dieselben Texte prüfen, die unten auch für Englisch geprüft werden.
    const deutschListe = await page.evaluate(() => {
      const root = window.__karte.shadowRoot;
      return {
        neuBtnText: root.getElementById("neu-btn").textContent.trim(),
        suchPlaceholder: root.getElementById("such-feld").getAttribute("placeholder"),
      };
    });
    assert(deutschListe.neuBtnText === "+ Neu", "Deutsch (Standard): Knopf '+ Neu' zeigt den deutschen Text");
    assert(deutschListe.suchPlaceholder.includes("Zutaten"), "Deutsch (Standard): Such-Platzhalter ist deutsch");

    // Englisch: hass.language umschalten und neu zeichnen.
    await page.evaluate(() => {
      window.__karte._hass = { ...window.__karte._hass, language: "en" };
      window.__karte._render();
    });
    const englischListe = await page.evaluate((uid) => {
      const root = window.__karte.shadowRoot;
      const ergebnis = {
        neuBtnText: root.getElementById("neu-btn").textContent.trim(),
        suchPlaceholder: root.getElementById("such-feld").getAttribute("placeholder"),
      };
      window.__karte._rezeptOeffnen(window.__karte._rezepte.find((r) => r.uid === uid));
      const sterneGruppe = window.__karte.shadowRoot.getElementById("eigene-sterne");
      ergebnis.sterneGruppenLabel = sterneGruppe.getAttribute("aria-label");
      ergebnis.ersterSternLabel = sterneGruppe.querySelector('button[data-wert="1"]').getAttribute("aria-label");
      ergebnis.zurueckBtnText = window.__karte.shadowRoot.getElementById("zurueck-btn").textContent.trim();
      return ergebnis;
    }, uid);
    assert(englischListe.neuBtnText === "+ New", "Englisch: Knopf '+ Neu' zeigt '+ New'");
    assert(englischListe.suchPlaceholder.includes("ingredients"), "Englisch: Such-Platzhalter ist englisch");
    assert(englischListe.sterneGruppenLabel === "Your rating", "Englisch: aria-label der Sterne-Gruppe ist englisch");
    assert(englischListe.ersterSternLabel === "1 of 5 stars", "Englisch: aria-label eines einzelnen Sterns ist englisch ('1 of 5 stars')");
    assert(englischListe.zurueckBtnText === "← Back", "Englisch: Zurück-Knopf zeigt '← Back'");

    // Eine NICHT unterstützte Sprache (z.B. Türkisch) fällt mangels eigener
    // Übersetzung auf Englisch zurück (siehe _sprache()). Seit v1.6.0 sind
    // alle 24 offiziellen EU-Sprachen abgedeckt, Türkisch gehört nicht dazu.
    await page.evaluate(async () => {
      window.__karte._hass = { ...window.__karte._hass, language: "tr" };
      await window.__karte._zurListe();
    });
    const tuerkischFaelltAufEnglischZurueck = await page.evaluate(() => {
      const root = window.__karte.shadowRoot;
      return root.getElementById("neu-btn").textContent.trim();
    });
    assert(
      tuerkischFaelltAufEnglischZurueck === "+ New",
      "Nicht unterstützte Sprache ('tr') fällt auf Englisch zurück (keine eigene Übersetzung vorhanden)"
    );
  } finally {
    await page.close();
  }
}

// Stichprobenartige Prüfung einiger der 22 in v1.6.0 neu hinzugefügten
// EU-Sprachen (nicht alle 24, um die Testsuite nicht unnötig zu verlangsamen -
// die eigentliche Vollständigkeit aller 154 Schlüssel je Sprache wird separat
// per Skript geprüft, siehe CONTRIBUTING.md).
async function testWeitereEuSprachen(browser) {
  console.log("\nTest: Weitere EU-Sprachen (Stichprobe: Französisch, Spanisch, Polnisch, Niederländisch)");
  const page = await neueTestUmgebung(browser);
  try {
    await rezeptDirektAnlegen(page, { title: "Kartoffelsuppe", payload: leererPayload() });

    const faelle = [
      { sprache: "fr", neuBtn: "+ Nouveau", suchStichwort: "ingrédients" },
      { sprache: "es", neuBtn: "+ Nueva", suchStichwort: "ingredientes" },
      { sprache: "pl", neuBtn: "+ Nowy", suchStichwort: "składniki" },
      { sprache: "nl", neuBtn: "+ Nieuw", suchStichwort: "ingrediënten" },
    ];

    for (const fall of faelle) {
      await page.evaluate(async (sprache) => {
        window.__karte._hass = { ...window.__karte._hass, language: sprache };
        await window.__karte._zurListe();
      }, fall.sprache);
      const ergebnis = await page.evaluate(() => {
        const root = window.__karte.shadowRoot;
        return {
          neuBtnText: root.getElementById("neu-btn").textContent.trim(),
          suchPlaceholder: root.getElementById("such-feld").getAttribute("placeholder"),
        };
      });
      assert(
        ergebnis.neuBtnText === fall.neuBtn,
        `${fall.sprache}: Knopf '+ Neu' zeigt '${fall.neuBtn}' (tatsächlich: '${ergebnis.neuBtnText}')`
      );
      assert(
        ergebnis.suchPlaceholder.toLowerCase().includes(fall.suchStichwort.toLowerCase()),
        `${fall.sprache}: Such-Platzhalter enthält '${fall.suchStichwort}'`
      );
    }
  } finally {
    await page.close();
  }
}

async function testJsonInfoPrompt(browser) {
  console.log("\nTest: Prompt-Hilfe im 'JSON einfügen'-Bereich (Info-Knopf)");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Kartoffelsuppe", payload: leererPayload() });

    // navigator.clipboard.writeText durch einen Mock ersetzen: die echte
    // Zwischenablage ist in einer headless-Sandbox nicht zuverlässig
    // nutzbar (Berechtigungen), daher wird hier nur geprüft, DASS und MIT
    // WELCHEM Text die Karte den Kopier-Aufruf tatsächlich macht.
    await page.evaluate(() => {
      window.__kopierteTexte = [];
      Object.defineProperty(window.navigator, "clipboard", {
        value: { writeText: (text) => { window.__kopierteTexte.push(text); return Promise.resolve(); } },
        configurable: true,
      });
    });

    const ergebnis = await page.evaluate((uid) => {
      const karte = window.__karte;
      karte._rezeptBearbeiten(karte._rezepte.find((r) => r.uid === uid));
      const root = karte.shadowRoot;
      const vorher = { modalSichtbar: root.getElementById("json-info-modal").style.display };
      root.getElementById("json-info-btn").click();
      const promptText = root.getElementById("json-info-prompt-text").value;
      const modalNachOeffnen = root.getElementById("json-info-modal").style.display;
      root.getElementById("json-info-kopieren-btn").click();
      return { vorher, promptText, modalNachOeffnen };
    }, uid);

    assert(ergebnis.vorher.modalSichtbar === "none", "Prompt-Modal ist anfangs unsichtbar");
    assert(ergebnis.modalNachOeffnen === "flex", "Klick auf den Info-Knopf zeigt das Prompt-Modal");
    assert(ergebnis.promptText.includes('"title"'), "Prompt enthält das JSON-Feld 'title'");
    assert(ergebnis.promptText.includes('"category"'), "Prompt enthält das JSON-Feld 'category'");
    assert(
      ergebnis.promptText.includes("Hauptgericht") && ergebnis.promptText.includes("Sonstiges"),
      "Prompt listet die internen (deutschen) Kategorie-Werte auf, unabhängig von der UI-Sprache"
    );

    // Kopieren: die Karte muss ihren "clipboard.writeText"-Mock mit EXAKT
    // demselben Text aufgerufen haben, der auch im Textfeld steht.
    await page.waitForTimeout(50);
    const kopiert = await page.evaluate(() => window.__kopierteTexte);
    assert(kopiert.length === 1 && kopiert[0] === ergebnis.promptText, "Kopieren überträgt den vollständigen, unveränderten Prompt-Text");

    const knopfTextNachKlick = await page.evaluate(() => window.__karte.shadowRoot.getElementById("json-info-kopieren-btn").textContent);
    assert(knopfTextNachKlick.includes("Kopiert"), "Kopier-Knopf zeigt kurz eine Bestätigung an");

    const modalNachSchliessen = await page.evaluate(() => {
      const root = window.__karte.shadowRoot;
      root.getElementById("json-info-schliessen-btn").click();
      return root.getElementById("json-info-modal").style.display;
    });
    assert(modalNachSchliessen === "none", "Schließen-Knopf versteckt das Prompt-Modal wieder");

    // Auf Englisch umschalten: der Prompt-TEXT ändert sich, die Kategorie-
    // WERTE im JSON-Beispiel bleiben trotzdem deutsch (intern gespeicherter
    // Wert, siehe _kategorieLabel()/KATEGORIEN).
    const englischerPrompt = await page.evaluate((uid) => {
      const karte = window.__karte;
      karte._hass = { ...karte._hass, language: "en" };
      karte._rezeptBearbeiten(karte._rezepte.find((r) => r.uid === uid));
      const root = karte.shadowRoot;
      root.getElementById("json-info-btn").click();
      return root.getElementById("json-info-prompt-text").value;
    }, uid);
    assert(englischerPrompt.includes("recipe name"), "Prompt auf Englisch verwendet den englischen Text");
    assert(englischerPrompt.includes("Hauptgericht"), "Auch auf Englisch bleiben die Kategorie-Werte im JSON-Beispiel deutsch");
  } finally {
    await page.close();
  }
}

async function testSammlungInfoPopup(browser) {
  console.log("\nTest: 'Smarte Sammlung speichern' - Umbenennung + Info-Popup zur Erklärung");
  const page = await neueTestUmgebung(browser);
  try {
    await rezeptDirektAnlegen(page, { title: "Kartoffelsuppe", payload: leererPayload() });

    const ergebnis = await page.evaluate(() => {
      const root = window.__karte.shadowRoot;
      const speichernBtnText = root.getElementById("kochbuch-speichern-btn").textContent.trim();
      const vorherSichtbar = root.getElementById("kochbuch-info-modal").style.display;
      root.getElementById("kochbuch-info-btn").click();
      const titelText = root.querySelector("#kochbuch-info-modal h3").textContent;
      const erklaerungsText = root.querySelector("#kochbuch-info-modal p").textContent;
      const modalSichtbarNachKlick = root.getElementById("kochbuch-info-modal").style.display;
      root.getElementById("kochbuch-info-schliessen-btn").click();
      const modalNachSchliessen = root.getElementById("kochbuch-info-modal").style.display;
      return { speichernBtnText, vorherSichtbar, titelText, erklaerungsText, modalSichtbarNachKlick, modalNachSchliessen };
    });

    assert(ergebnis.speichernBtnText === "+ Smarte Sammlung speichern", `Knopf heißt jetzt 'Smarte Sammlung speichern' (tatsächlich: '${ergebnis.speichernBtnText}')`);
    assert(ergebnis.vorherSichtbar === "none", "Info-Popup ist anfangs unsichtbar");
    assert(ergebnis.modalSichtbarNachKlick === "flex", "Klick auf '?' zeigt das Info-Popup");
    assert(ergebnis.titelText === "Was ist eine smarte Sammlung?", "Popup-Titel erklärt das Konzept");
    assert(
      ergebnis.erklaerungsText.includes("aktualisiert sich") && ergebnis.erklaerungsText.includes("automatisch"),
      "Popup-Text erklärt die automatische/dynamische Natur (keine feste Liste)"
    );
    assert(ergebnis.modalNachSchliessen === "none", "Schließen-Knopf versteckt das Popup wieder");
  } finally {
    await page.close();
  }
}

async function testSchwiizerduetsch(browser) {
  console.log("\nTest: Schwiizerdütsch (gsw) - dreistelliger Sprachcode, Sonderfall in _sprache()");
  const page = await neueTestUmgebung(browser);
  try {
    await rezeptDirektAnlegen(page, { title: "Kartoffelsuppe", payload: leererPayload() });

    // "gsw" ohne Regionscode (wie es Home Assistant meist liefert).
    const ergebnisGsw = await page.evaluate(async () => {
      window.__karte._hass = { ...window.__karte._hass, language: "gsw" };
      await window.__karte._zurListe();
      const root = window.__karte.shadowRoot;
      return {
        neuBtnText: root.getElementById("neu-btn").textContent.trim(),
        suchPlaceholder: root.getElementById("such-feld").getAttribute("placeholder"),
      };
    });
    assert(ergebnisGsw.neuBtnText === "+ Nöis", `gsw: Knopf '+ Neu' zeigt Schwiizerdütsch (tatsächlich: '${ergebnisGsw.neuBtnText}')`);
    assert(
      ergebnisGsw.suchPlaceholder.toLowerCase().includes("zuetate"),
      "gsw: Such-Platzhalter ist auf Schwiizerdütsch"
    );

    // "gsw-CH" (mit Regionscode) muss genauso erkannt werden wie "gsw" allein.
    const neuBtnMitRegion = await page.evaluate(async () => {
      window.__karte._hass = { ...window.__karte._hass, language: "gsw-CH" };
      await window.__karte._zurListe();
      return window.__karte.shadowRoot.getElementById("neu-btn").textContent.trim();
    });
    assert(neuBtnMitRegion === "+ Nöis", "gsw-CH (mit Regionscode) wird genauso wie 'gsw' erkannt");

    // Gegenprobe: "gs" (zwei Buchstaben, KEIN echter Sprachcode) darf NICHT
    // fälschlich als Schwiizerdütsch erkannt werden - das wäre ein Zeichen,
    // dass die Sonderbehandlung zu großzügig prüft (z.B. nur startsWith("gs")).
    const neuBtnZweiBuchstaben = await page.evaluate(async () => {
      window.__karte._hass = { ...window.__karte._hass, language: "gs" };
      await window.__karte._zurListe();
      return window.__karte.shadowRoot.getElementById("neu-btn").textContent.trim();
    });
    assert(
      neuBtnZweiBuchstaben === "+ New",
      `Der ungültige Code 'gs' fällt korrekt auf Englisch zurück, nicht auf Schwiizerdütsch (tatsächlich: '${neuBtnZweiBuchstaben}')`
    );
  } finally {
    await page.close();
  }
}

async function testSpracheWechseltOhneNeuzeichnen(browser) {
  console.log("\nTest: Prompt-Modal bleibt sprachlich konsistent, wenn hass.language sich ändert, ohne dass neu gezeichnet wird");
  const page = await neueTestUmgebung(browser);
  try {
    const uid = await rezeptDirektAnlegen(page, { title: "Kartoffelsuppe", payload: leererPayload() });

    const ergebnis = await page.evaluate((uid) => {
      const karte = window.__karte;
      // Formular auf Deutsch öffnen (Standard-hass.language im Mock).
      karte._rezeptBearbeiten(karte._rezepte.find((r) => r.uid === uid));
      const root = karte.shadowRoot;
      const titelDeutschVorher = root.querySelector(".modal-box-breit h3").textContent;

      // Sprache "im Hintergrund" ändern, wie es passiert, wenn Home
      // Assistant die neue hass.language pusht, OHNE dass diese Karte
      // deswegen neu zeichnet (set hass() lädt nur beim allerersten Mal
      // neu, siehe rezeptbuch-card.js) - genau das vom Nutzer beobachtete
      // Szenario: Profilsprache mitten in einer offenen Karte umgestellt.
      karte._hass = { ...karte._hass, language: "cs" };

      // Modal öffnen, OHNE dass zwischendurch _render() lief.
      root.getElementById("json-info-btn").click();
      return {
        titelDeutschVorher,
        titelNachher: root.querySelector(".modal-box-breit h3").textContent,
        schliessenBtnNachher: root.getElementById("json-info-schliessen-btn").textContent,
        promptNachher: root.getElementById("json-info-prompt-text").value,
      };
    }, uid);

    assert(ergebnis.titelDeutschVorher === "Prompt für eine KI", "Modal-Titel ist beim Öffnen des Formulars deutsch");
    assert(
      ergebnis.titelNachher === "Prompt für eine KI",
      "Modal-Titel bleibt deutsch, auch nachdem sich hass.language im Hintergrund geändert hat (kein Teil-Update)"
    );
    assert(
      ergebnis.schliessenBtnNachher === "Schließen",
      "Schließen-Knopf bleibt ebenfalls deutsch - keine gemischte Sprache innerhalb desselben Fensters"
    );
    assert(
      ergebnis.promptNachher.startsWith("Wandle den Rezepttext"),
      "Der Prompt-Text selbst ist ebenfalls noch deutsch, NICHT tschechisch (sonst: Sprach-Mix wie ursprünglich gemeldet)"
    );
  } finally {
    await page.close();
  }
}

async function testPlatzhalterMitDollarZeichen(browser) {
  console.log("\nTest: Platzhalter mit $-Sonderfolgen ($&, $') werden wörtlich übernommen");
  const page = await neueTestUmgebung(browser);
  try {
    const titel = "Pizza für $& Freunde $' 5$";
    await rezeptDirektAnlegen(page, { title: titel, payload: leererPayload() });

    const direkt = await page.evaluate(
      (t) => window.__karte._t("undo_geloescht", { titel: t }),
      titel
    );
    assert(
      direkt === `"${titel}" gelöscht.`,
      `_t() übernimmt den Titel wörtlich (tatsächlich: ${JSON.stringify(direkt)})`
    );

    const ariaLabel = await page.evaluate(() => {
      const kachel = window.__karte.shadowRoot.querySelector(".kachel");
      return kachel ? kachel.getAttribute("aria-label") : null;
    });
    assert(
      ariaLabel === `Rezept ${titel} öffnen`,
      `aria-label der Kachel enthält den Titel unverändert (tatsächlich: ${JSON.stringify(ariaLabel)})`
    );
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  try {
    await testGrundfunktionNeuesRezept(browser);
    await testKonfliktSchutzKommentar(browser);
    await testKonfliktSchutzFormular(browser);
    await testSchemaVersionierung(browser);
    await testDurchschnittsBewertungStringSicher(browser);
    await testJsonImportUebernimmtAlleFelder(browser);
    await testJsonImportZutatenAlsText(browser);
    await testLoeschenMitBestaetigungUndUndo(browser);
    await testFormularBearbeitenBehaeltCookLog(browser);
    await testTextErkennungUeberUi(browser);
    await testTextErkennungWarntBeiLeeremErgebnis(browser);
    await testTextErkennungChefkochDruckansicht(browser);
    await testTextErkennungKochbarNameZuerst(browser);
    await testTextErkennungBindestrichSchritte(browser);
    await testUrlImportErfolg(browser);
    await testUrlImportSkriptFehler(browser);
    await testUrlImportValidierung(browser);
    await testUrlHashBeimOeffnenUndSchliessen(browser);
    await testWiederherstellungNachSimuliertemReload(browser);
    await testVerwaisterUrlHashFaelltAufListeZurueck(browser);
    await testAttributInjectionWirdVerhindert(browser);
    await testBruchUndBereichsMengenWerdenErkannt(browser);
    await testZutatenUnterueberschriftenWerdenIgnoriert(browser);
    await testAbsatzSchritteOhneNummerierung(browser);
    await testEnglischeUeberschriftenWerdenErkannt(browser);
    await testEinkaufslisteAggregation(browser);
    await testEinkaufslisteOhneKonfiguration(browser);
    await testEinkaufslisteUeberUi(browser);
    await testWochenplanZuweisenUndPersistenz(browser);
    await testWochenplanEinkaufsliste(browser);
    await testWochenplanVergangeneTageWerdenAutomatischGeleert(browser);
    await testWochenplanFolgewocheRuecktNach(browser);
    await testWochenplanTabWechselSpeichertRichtigesFeld(browser);
    await testTagsHinzufuegenSpeichernUndFiltern(browser);
    await testAlteRezepteOhneTagsWerdenMigriert(browser);
    await testKochbuecherSpeichernAnwendenLoeschen(browser);
    await testBarrierefreiheitVerbesserungen(browser);
    await testInternationalisierung(browser);
    await testWeitereEuSprachen(browser);
    await testJsonInfoPrompt(browser);
    await testSammlungInfoPopup(browser);
    await testSchwiizerduetsch(browser);
    await testSpracheWechseltOhneNeuzeichnen(browser);
    await testPlatzhalterMitDollarZeichen(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
  if (fehlgeschlagen > 0) {
    console.log("Fehlgeschlagene Tests: " + fehlgeschlageneNamen.join(", "));
    process.exit(1);
  }
  process.exit(0);
})();
