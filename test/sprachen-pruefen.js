// Prüft, dass alle Sprachdateien (rezeptbuch-sprache-<code>.js) genau die
// Schlüssel der deutschen Texte in rezeptbuch-card.js haben, dass die
// {{Platzhalter}} übereinstimmen und dass alle in der Karte benutzten
// _t("...")-Schlüssel existieren. Aufruf: node test/sprachen-pruefen.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const wurzel = path.join(__dirname, "..");
const karte = fs.readFileSync(path.join(wurzel, "rezeptbuch-card.js"), "utf8");
const zeilen = karte.split("\n");
const start = zeilen.findIndex((z) => z.startsWith("const UEBERSETZUNGEN = {"));
let ende = start;
while (ende < zeilen.length && zeilen[ende] !== "};") ende++;
const ctx = {};
vm.createContext(ctx);
vm.runInContext(zeilen.slice(start, ende + 1).join("\n") + "\nthis.U = UEBERSETZUNGEN;", ctx);
const de = ctx.U.de;
const platzhalter = (s) => (String(s).match(/\{\{\w+\}\}/g) || []).sort().join(",");
let fehler = 0;
const melde = (text) => { console.log("FEHLER " + text); fehler++; };

const dateien = fs.readdirSync(wurzel).filter((f) => /^rezeptbuch-sprache-.+\.js$/.test(f)).sort();
for (const datei of dateien) {
  const code = datei.slice("rezeptbuch-sprache-".length, -3);
  const fenster = {};
  vm.createContext({ window: fenster });
  vm.runInContext(fs.readFileSync(path.join(wurzel, datei), "utf8"), vm.createContext({ window: fenster }));
  const sprache = fenster.__rezeptbuchSprachen && fenster.__rezeptbuchSprachen[code];
  if (!sprache) { melde(`${datei}: registriert sich nicht als "${code}"`); continue; }
  for (const k of Object.keys(de)) {
    if (!(k in sprache.texte)) melde(`${code}: Schlüssel fehlt: ${k}`);
    else if (platzhalter(sprache.texte[k]) !== platzhalter(de[k])) melde(`${code}: Platzhalter weichen ab bei ${k}`);
    else if (!String(sprache.texte[k]).trim()) melde(`${code}: leerer Text bei ${k}`);
  }
  for (const k of Object.keys(sprache.texte)) if (!(k in de)) melde(`${code}: überflüssiger Schlüssel: ${k}`);
  if (!Array.isArray(sprache.zutaten) || sprache.zutaten.length !== 70) melde(`${code}: "zutaten" muss 70 Einträge haben`);
}

const benutzt = new Set();
for (const m of karte.matchAll(/\b_t\(\s*["'`]([a-z0-9_]+)["'`]/g)) benutzt.add(m[1]);
for (const k of benutzt) if (!(k in de)) melde(`im Code benutzter Schlüssel fehlt in de: ${k}`);

console.log(`${dateien.length} Sprachdateien, ${Object.keys(de).length} Schlüssel, ${benutzt.size} im Code benutzt - ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
