/*
 * Erzeugt die Screenshots für die README (docs/screenshots/*.png).
 *
 * Lädt die ECHTE Karte in einem Headless-Chromium (wie die Testsuite) mit
 * ausschließlich ERFUNDENEN Demo-Rezepten und selbst erzeugten Grafiken als
 * Rezeptfotos - es kommen keine echten Rezepte, Namen oder Fotos vor.
 *
 * Aufruf (im Projektordner, nach `npm install`):
 *   node scripts/screenshots_erzeugen.js
 */
const path = require("path");
const { chromium } = require("playwright");

const KARTEN_DATEI = path.join(__dirname, "..", "rezeptbuch-card.js");
const AUSGABE = path.join(__dirname, "..", "docs", "screenshots");

// Einfache, selbst erzeugte Rezeptfoto-Platzhalter (SVG als Data-URL).
function foto(farbeA, farbeB, teller) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${farbeA}"/><stop offset="1" stop-color="${farbeB}"/></linearGradient></defs>
    <rect width="640" height="480" fill="url(#g)"/>
    <circle cx="320" cy="250" r="165" fill="#fdfaf5"/><circle cx="320" cy="250" r="135" fill="${teller}"/>
    <circle cx="275" cy="215" r="26" fill="rgba(255,255,255,.35)"/><circle cx="360" cy="285" r="34" fill="rgba(0,0,0,.12)"/>
    <circle cx="335" cy="205" r="14" fill="rgba(255,255,255,.3)"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const REZEPTE = [
  { t: "Kürbissuppe mit Ingwer", k: "Suppe", tags: ["vegetarisch", "herbst"], f: foto("#f4a259", "#bc4b51", "#e8883a"), p: 4, bew: [5, 5, 4], zutaten: [["800", "g", "Hokkaido-Kürbis"], ["1", "", "Zwiebel"], ["20", "g", "Ingwer"], ["700", "ml", "Gemüsebrühe"], ["150", "ml", "Kokosmilch"]], schritte: ["Kürbis würfeln, Zwiebel und Ingwer fein hacken.", "Alles in etwas Öl 5 Minuten anbraten.", "Mit Brühe aufgießen und 20 Minuten köcheln lassen.", "Kokosmilch zugeben, pürieren und abschmecken."] },
  { t: "Gemüsecurry", k: "Hauptgericht", tags: ["vegetarisch", "schnell"], f: foto("#8cb369", "#5b8e7d", "#e9c46a"), p: 4, bew: [4, 5], zutaten: [["400", "g", "Kichererbsen"], ["300", "g", "Blumenkohl"], ["2", "EL", "Currypaste"], ["400", "ml", "Kokosmilch"]], schritte: ["Gemüse in Stücke schneiden.", "Currypaste anrösten, Kokosmilch zugeben.", "Gemüse 15 Minuten garen."] },
  { t: "Apfelkuchen vom Blech", k: "Backen", tags: ["süß"], f: foto("#e5989b", "#b5838d", "#d9a05b"), p: 12, bew: [5], zutaten: [["500", "g", "Mehl"], ["250", "g", "Butter"], ["6", "", "Äpfel"], ["150", "g", "Zucker"]], schritte: ["Mürbeteig kneten und ausrollen.", "Äpfel schneiden und verteilen.", "Bei 180 °C 40 Minuten backen."] },
  { t: "Spaghetti Pomodoro", k: "Hauptgericht", tags: ["vegetarisch", "schnell"], f: foto("#ee6c4d", "#9d0208", "#f6bd60"), p: 2, bew: [4, 4], zutaten: [["250", "g", "Spaghetti"], ["400", "g", "Tomaten (Dose)"], ["2", "", "Knoblauchzehen"]], schritte: ["Nudeln kochen.", "Sauce 10 Minuten einkochen.", "Alles vermengen."] },
  { t: "Griechischer Bauernsalat", k: "Salat", tags: ["vegetarisch", "sommer"], f: foto("#90be6d", "#43aa8b", "#f94144"), p: 2, bew: [5, 4], zutaten: [["3", "", "Tomaten"], ["1", "", "Gurke"], ["150", "g", "Feta"]], schritte: ["Gemüse schneiden.", "Mit Feta und Öl anrichten."] },
  { t: "Linsendal", k: "Hauptgericht", tags: ["vegan", "herbst"], f: foto("#f9c74f", "#f3722c", "#c77d3a"), p: 4, bew: [4], zutaten: [["250", "g", "rote Linsen"], ["1", "", "Zwiebel"], ["1", "TL", "Kurkuma"]], schritte: ["Linsen waschen.", "Mit Gewürzen 20 Minuten kochen."] },
  { t: "Pfannkuchen", k: "Frühstück", tags: ["süß", "schnell"], f: foto("#ffd6a5", "#fdffb6", "#e0a458"), p: 4, bew: [5, 5, 5], zutaten: [["250", "g", "Mehl"], ["500", "ml", "Milch"], ["3", "", "Eier"]], schritte: ["Teig anrühren und 10 Minuten quellen lassen.", "In der Pfanne goldgelb ausbacken."] },
  { t: "Tomatensuppe", k: "Suppe", tags: ["vegetarisch"], f: foto("#e76f51", "#f4a261", "#d62828"), p: 4, bew: [4], zutaten: [["1", "kg", "Tomaten"], ["1", "", "Zwiebel"]], schritte: ["Tomaten kochen.", "Pürieren und würzen."] },
].map((r, i) => ({
  title: r.t,
  payload: {
    schemaVersion: 1, servings: r.p, category: r.k, tags: r.tags, image: r.f,
    ingredients: r.zutaten.map(([amount, unit, name]) => ({ amount, unit, name })),
    steps: r.schritte,
    ratings: Object.fromEntries(r.bew.map((w, j) => ["demo-" + j, w])),
    comments: i === 0 ? [{ author: "Alex", text: "Sehr lecker, mit etwas mehr Ingwer noch besser!", zeit: "2026-09-20T18:00:00.000Z" }] : [],
    creator: null, creatorName: null, created: "2026-09-0" + (i + 1) + "T10:00:00.000Z",
    cookLog: i < 4 ? ["2026-09-2" + i + "T19:00:00.000Z"] : [],
  },
}));

const HA_STIL = (dunkel) => `
  body { margin:0; padding:24px; font-family: Roboto, "Segoe UI", Arial, sans-serif;
    --card-background-color:${dunkel ? "#1c1c1c" : "#ffffff"}; --primary-text-color:${dunkel ? "#e1e1e1" : "#212121"};
    --secondary-text-color:${dunkel ? "#9b9b9b" : "#727272"}; --divider-color:${dunkel ? "#3a3a3a" : "#e0e0e0"};
    --error-color:#db4437; background:${dunkel ? "#111" : "#f2f2f2"}; }
  rezeptbuch-card { display:block; max-width:1000px; margin:0 auto; }
`;

async function neueSeite(browser, { breite = 1100, hoehe = 820, dunkel = false, farben = null } = {}) {
  const page = await browser.newPage({ viewport: { width: breite, height: hoehe } });
  await page.addStyleTag({ content: HA_STIL(dunkel) });
  await page.addScriptTag({ path: KARTEN_DATEI });
  await page.evaluate(({ rezepte, farben }) => {
    // Nachbau von <ha-card> (in Home Assistant ein eigenes Element mit Karten-Optik).
    if (!customElements.get("ha-card")) {
      customElements.define("ha-card", class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: "open" }).innerHTML =
            "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
            "box-shadow:0 2px 6px rgba(0,0,0,.15);color:var(--primary-text-color);box-sizing:border-box}</style><slot></slot>";
        }
      });
    }
    window.fetch = () => Promise.reject(new Error("offline"));
    const speicher = [];
    let nr = 1;
    for (const r of rezepte) speicher.push({ uid: "u" + nr++, summary: r.title, description: JSON.stringify(r.payload), status: "needs_action" });
    if (farben) speicher.push({ uid: "u" + nr++, summary: "__rezeptbuch_einstellungen__", description: JSON.stringify({ schemaVersion: 1, farben }), status: "needs_action" });
    window.__speicher = speicher;
    const hass = {
      language: "de", user: { id: "demo-user", name: "Demo", is_admin: true },
      callService: async (domain, service, d) => {
        if (domain !== "todo") throw new Error("nicht simuliert");
        if (service === "update_item") { const e = speicher.find((i) => i.uid === d.item || i.summary === d.item); if (e && d.description !== undefined) e.description = d.description; }
        if (service === "add_item") speicher.push({ uid: "u" + nr++, summary: d.item, description: d.description || "", status: "needs_action" });
      },
      connection: { sendMessagePromise: async ({ type }) => (type === "todo/item/list" ? { items: speicher.map((i) => ({ ...i })) } : {}) },
    };
    const karte = document.createElement("rezeptbuch-card");
    karte.setConfig({ entity: "todo.rezepte", title: "Rezeptbuch" });
    document.body.appendChild(karte);
    karte.hass = hass;
    window.__karte = karte;
  }, { rezepte: REZEPTE, farben });
  await page.waitForFunction(() => window.__karte._geladen === true);
  await page.waitForTimeout(300);
  return page;
}

async function kartenShot(page, datei) {
  await page.locator("rezeptbuch-card").screenshot({ path: path.join(AUSGABE, datei) });
  console.log("  " + datei);
}
async function seitenShot(page, datei) {
  await page.screenshot({ path: path.join(AUSGABE, datei) });
  console.log("  " + datei);
}

(async () => {
  const browser = await chromium.launch();
  try {
    let page = await neueSeite(browser);
    await kartenShot(page, "uebersicht.png");

    await page.evaluate(() => window.__karte._rezeptOeffnen(window.__karte._rezepte.find((r) => r.title.startsWith("Kürbissuppe"))));
    await page.waitForTimeout(200);
    await kartenShot(page, "rezept-detail.png");

    await page.setViewportSize({ width: 900, height: 520 });
    await page.evaluate(() => {
      const r = window.__karte.shadowRoot;
      r.getElementById("kochmodus-btn").click();
      r.getElementById("kochmodus-weiter-btn").click();
      r.getElementById("kochmodus-zutaten-btn").click();
    });
    await page.waitForTimeout(300);
    await seitenShot(page, "kochmodus.png");
    await page.close();

    page = await neueSeite(browser);
    await page.evaluate(() => window.__karte.shadowRoot.getElementById("umrechnungstabelle-btn").click());
    await page.waitForTimeout(200);
    await seitenShot(page, "umrechnungstabelle.png");
    await page.close();

    page = await neueSeite(browser, { hoehe: 900 });
    await page.evaluate(() => {
      window.__karte.shadowRoot.getElementById("statistik-einstellungen-btn").click();
      const box = window.__karte.shadowRoot.querySelector("#statistik-einstellungen-modal .modal-box");
      box.scrollTop = box.scrollHeight;
    });
    await page.waitForTimeout(200);
    await seitenShot(page, "einstellungen-farben.png");
    await page.close();

    page = await neueSeite(browser, { farben: { akzent: "#2b7cb2", akzentText: "#1d5a85", sterne: "#e63946" } });
    await kartenShot(page, "uebersicht-eigene-farben.png");
    await page.close();

    page = await neueSeite(browser, { dunkel: true });
    await kartenShot(page, "uebersicht-dunkel.png");
    await page.close();

    page = await neueSeite(browser, { breite: 400, hoehe: 800 });
    await page.evaluate(() => (document.body.style.padding = "8px"));
    await page.waitForTimeout(200);
    // Nur den oberen Teil zeigen (die volle Handy-Liste wäre mehrere tausend Pixel hoch).
    await page.screenshot({ path: path.join(AUSGABE, "uebersicht-mobil.png"), clip: { x: 0, y: 0, width: 400, height: 780 } });
    console.log("  uebersicht-mobil.png");
    await page.close();
  } finally {
    await browser.close();
  }
})().catch((fehler) => { console.error(fehler); process.exit(1); });
