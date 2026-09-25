# Rezeptbuch – Backup, Wiederherstellung & weitere Verbesserungen

Legt jeden Tag um **23:59 Uhr** eine datierte JSON-Sicherung aller Rezepte im Ordner
`/config/Backup-Rezepte/` ab. Backups, die **älter als 30 Tage** sind, werden dabei
automatisch gelöscht. Diese Anleitung deckt außerdem die Wiederherstellung
(Abschnitt 8), das Auslagern von Rezeptfotos in echte Dateien (Abschnitt 9),
Konflikt-Schutz beim gleichzeitigen Bearbeiten (Abschnitt 10), den
CDN-unabhängigen PDF-Export (Abschnitt 11) und die automatisierte Testsuite
(Abschnitt 12) ab.

## Warum v2? (wichtig, falls du die erste Version schon eingerichtet hattest)

Die erste Version übergab alle Rezeptdaten (inkl. Base64-kodierter Fotos) über eine
Jinja-Vorlage an das Skript. Home Assistant begrenzt die Ausgabe einer einzelnen
Vorlage aber hart auf **256 KB** – bei mehreren Rezepten mit Fotos wird das JSON
schnell größer, wodurch die Automatisierung mit
`Template output exceeded maximum size of 262144 characters` abgebrochen ist.

**Diese Version umgeht das Problem vollständig:** Das Skript ruft sich die
Rezeptdaten selbst direkt über die Home-Assistant-REST-API ab. Dadurch läuft
überhaupt keine große Datenmenge mehr durch eine Jinja-Vorlage – die Automatisierung
selbst enthält gar keine Vorlage mehr, nur noch den Zeit-Trigger und einen einzigen
Aufruf des Skripts, ganz ohne Argumente.

## 1. Long-Lived-Access-Token erstellen

Das Skript braucht einen Zugangs-Token, um sich selbst bei Home Assistant
"anzumelden":

1. Klicke unten links auf deinen Benutzernamen (Profil).
2. Ganz nach unten scrollen zu **"Langlebige Zugangs-Token"**.
3. **"Token erstellen"** klicken, z. B. Name `Rezeptbuch Backup` vergeben.
4. Den angezeigten Token **sofort kopieren** (er wird danach nie wieder angezeigt).

## 2. Token-Datei anlegen

Erstelle die Datei

```
/config/scripts/rezeptbuch_backup_token.txt
```

und füge **nur den Token** hinein (keine Anführungszeichen, keine weiteren Zeilen).
Diese Datei ist quasi ein Passwort – behandle sie entsprechend (z. B. nicht in ein
öffentliches Backup/Git-Repository packen).

## 3. Skript hochladen

Lade `rezeptbuch_backup.py` nach

```
/config/scripts/rezeptbuch_backup.py
```

Der Zielordner `/config/Backup-Rezepte/` wird beim ersten Lauf automatisch vom
Skript selbst angelegt.

## 4. `shell_command` in der `configuration.yaml` eintragen

Falls du die erste Version schon eingerichtet hattest: Ersetze in deinem
bestehenden `shell_command:`-Block die alte Zeile

```yaml
rezeptbuch_backup_schreiben: "python3 /config/scripts/rezeptbuch_backup.py {{ daten_b64 }}"
```

durch die neue, argumentlose Version:

```yaml
rezeptbuch_backup_schreiben: "python3 /config/scripts/rezeptbuch_backup.py"
```

Falls du sie noch nicht hattest, füge deinem `shell_command:`-Block einfach diese
Zeile hinzu. Die beiliegende komplette `configuration.yaml` hat das bereits fertig
eingetragen.

Danach Home Assistant **komplett neu starten** (nicht nur YAML neu laden), damit
der `shell_command` als Service verfügbar wird.

## 5. Automatisierung aktualisieren

Öffne deine bestehende Automatisierung "Rezeptbuch: Tägliches Backup" im
YAML-Editor und ersetze den kompletten Inhalt durch den von
`rezeptbuch_backup_automatisierung.yaml`. Sie ist jetzt viel einfacher: nur noch
ein Zeit-Trigger und ein einziger Aufruf des `shell_command`, keine
`todo.get_items`/`variables`-Schritte mehr nötig.

## 6. Fehlersuche / Log

Das Skript schreibt bei jedem Lauf eine Zeile in

```
/config/scripts/rezeptbuch_backup.log
```

Mögliche Fehlerursachen dort:
- **Token-Datei nicht gefunden** → Schritt 2 wiederholen.
- **HTTP 401** → Token falsch/abgelaufen, neuen Token erstellen (Schritt 1).
- **HTTP 400** → `return_response` fehlt in der URL oder `todo.rezepte` existiert
  nicht (Entity-ID prüfen).

## 7. Test

Automatisierung über die drei Punkte → "Ausführen" manuell testen, ohne auf
23:59 Uhr zu warten. Danach im Dateimanager prüfen, ob unter
`/config/Backup-Rezepte/` eine neue Datei `rezepte-backup-<heutiges-Datum>.json`
aufgetaucht ist, und bei Problemen das Log kontrollieren.

---

**Getestet:** Der REST-Abruf wurde gegen einen simulierten lokalen Server geprüft
(korrekter Auth-Header, korrektes Parsen der `service_response`), und die
Lösch-Logik wurde erneut mit simulierten Dateien im Alter von 48, 34, 30.5, 24, 8
und 0 Tagen bestätigt – nur die drei Dateien älter als 30 Tage wurden entfernt.

## 8. Backup wiederherstellen

Falls du versehentlich Rezepte gelöscht hast oder ein altes Backup zurückholen
willst, gibt es jetzt ein eigenes Wiederherstellen-Skript.

**Wichtig – bewusst konservatives Verhalten:** Restore fügt nur Rezepte hinzu,
deren Titel aktuell NICHT in deiner Liste vorhanden ist. Bereits vorhandene
Rezepte werden nie überschrieben oder verändert – auch nicht, wenn sich Zutaten,
Bewertungen oder Kommentare seit dem Backup geändert haben. Es kann also nichts
kaputtgehen, wenn du es einfach ausprobierst; es holt nur zurück, was fehlt.

### Installation

1. `rezeptbuch_restore.py` nach `/config/scripts/` hochladen (nutzt denselben
   Token wie das Backup-Skript, siehe Schritt 1–2 oben).
2. Den Inhalt von `rezeptbuch_restore_skript.yaml` in deine `scripts.yaml`
   einfügen (oder ein neues Skript im UI anlegen und im YAML-Editor ersetzen).
3. Die beiliegende komplette `configuration.yaml` verwenden – der `shell_command`-
   Eintrag `rezeptbuch_backup_wiederherstellen` ist bereits enthalten.
4. Home Assistant neu starten.

### Verwendung

Unter **Einstellungen → Automatisierungen & Szenen → Skripte** das Skript
"Rezeptbuch: Backup wiederherstellen" ausführen. Es fragt nach einem
Backup-Datum:

- `neuestes` (Standard) → stellt das zuletzt erstellte Backup wieder her.
- `2026-09-18` (z. B.) → stellt genau dieses Datum wieder her, falls die Datei
  `rezepte-backup-2026-09-18.json` in `/config/Backup-Rezepte/` existiert.

Ergebnis (Anzahl wiederhergestellt/übersprungen/fehlgeschlagen) steht in

```
/config/scripts/rezeptbuch_restore.log
```

**Getestet:** Simulierter Ablauf mit zwei Rezepten im Backup, von denen eines
bereits in der aktuellen Liste vorhanden war – korrekt wurde nur das fehlende
Rezept per `todo.add_item` (inkl. `description`-Feld) wiederhergestellt, das
vorhandene wurde übersprungen, `neuestes` löste korrekt auf das Backup mit dem
spätesten Datum auf.

## 9. Rezeptfotos als echte Dateien speichern

Rezeptfotos wurden bisher als Base64-Text direkt im `description`-Feld
gespeichert. Das funktioniert, hat aber zwei Nachteile: Base64 ist ca. 33 %
größer als die Originaldatei, und jedes Foto wird bei jedem Laden der
Rezeptliste mit heruntergeladen – auch wenn nur die Übersicht angezeigt wird.

Ein neues Skript lagert Fotos stattdessen in echte Dateien unter
`/config/www/rezeptbuch-bilder/` aus (von Home Assistant automatisch unter
`/local/rezeptbuch-bilder/...` erreichbar). Die Karte selbst zeigt Fotos in
beiden Formen an – nichts geht dabei kaputt, falls das Skript einmal nicht
läuft.

### Installation

1. `rezeptbuch_bilder_verarbeiten.py` nach `/config/scripts/` hochladen (nutzt
   denselben Token wie Backup/Restore, siehe Schritt 1–2 oben).
2. Den Inhalt von `rezeptbuch_bilder_skript.yaml` in deine `scripts.yaml`
   einfügen.
3. Die beiliegende komplette `configuration.yaml` verwenden – der
   `shell_command`-Eintrag `rezeptbuch_bilder_verarbeiten` ist bereits
   enthalten.
4. Die aktualisierte `rezeptbuch-card.js` nach `/config/www/` hochladen
   (ersetzt die bisherige Datei).
5. Home Assistant neu starten.

### Verwendung

- **Laufender Betrieb:** Nach jedem neuen Foto-Upload über die Karte stößt
  diese das Skript automatisch selbst an – keine weitere Aktion nötig.
- **Einmalige Migration bereits vorhandener Fotos:** Unter
  **Einstellungen → Automatisierungen & Szenen → Skripte** das Skript
  "Rezeptbuch: Fotos in Dateien auslagern" einmal manuell ausführen. Das lagert
  alle bestehenden Base64-Fotos in Dateien aus. Das Skript ist gefahrlos
  mehrfach ausführbar (bereits ausgelagerte Fotos werden übersprungen,
  verwaiste Bilddateien – z. B. von gelöschten Rezepten – werden dabei
  aufgeräumt).

Log-Datei bei Problemen: `/config/scripts/rezeptbuch_bilder.log`

**Getestet:** Simulierter Ablauf gegen einen Fake-REST-Server mit drei
Szenarien – erste Migration mehrerer Fotos, ein zweiter (idempotenter)
Durchlauf ohne erneute Änderungen, sowie Aufräumen einer verwaisten Bilddatei
nach simuliertem Löschen des zugehörigen Rezepts.

## 10. Konflikt-Schutz bei gleichzeitigem Bearbeiten

Wenn zwei Personen (z. B. auf Handy und Tablet gleichzeitig) dasselbe Rezept
bearbeiten, kann es passieren, dass eine Änderung die andere überschreibt. Die
Karte erkennt das jetzt und warnt, statt stillschweigend etwas zu verlieren:

- **Kommentare, Bewertungen, "Als zubereitet markieren":** Die Karte lädt vor
  dem Speichern immer den aktuellen Stand vom Server nach und ergänzt darauf
  deine Änderung – eine zwischenzeitliche fremde Änderung (z. B. andere
  Zutaten) geht dabei nicht verloren.
- **Volles Bearbeiten-Formular:** Wurde das Rezept seit dem Öffnen des
  Formulars von jemand anderem geändert (oder inzwischen gelöscht), erscheint
  beim Speichern eine Warnung, und deine Änderungen werden NICHT gespeichert.
  Einfach das Rezept erneut öffnen und die Änderungen nochmal eintragen.

Reine Kartenlogik, kein zusätzliches Backend nötig.

## 11. PDF-Export ohne Internetzugang

Der PDF-Export nutzt die Bibliothek jsPDF. Diese wird jetzt zuerst lokal von
Home Assistant selbst geladen (`/local/rezeptbuch-jspdf.min.js`) und fällt nur
noch als Rückfallebene auf ein externes CDN zurück, falls die Datei fehlt.

### Installation

`rezeptbuch-jspdf.min.js` nach `/config/www/` hochladen (gleicher Ordner wie
die Karte selbst). Ohne diesen Schritt funktioniert der PDF-Export weiterhin
wie bisher über das CDN – dieser Schritt ist optional, macht den Export aber
unabhängig vom Internetzugang.

## 12. Automatisierte Tests

`rezeptbuch-card.test.js` ist eine Testsuite, die die echte Karten-Datei in
einem echten (headless) Browser lädt und automatisch durchspielt – u. a. den
Konflikt-Schutz, die Schema-Migration alter Rezepte, den JSON-Import und das
Löschen mit Bestätigung/Rückgängig. Sie läuft nicht auf dem Home-Assistant-
System, sondern ist ein Entwicklungswerkzeug: bei künftigen Änderungen an
`rezeptbuch-card.js` einmal ausführen, um Regressionen früh zu erkennen.

Voraussetzung: Node.js mit `npm install playwright` (bzw. bereits vorhandene
Chromium-Installation für Playwright).

```
node rezeptbuch-card.test.js
```

Gibt bei Erfolg `0 fehlgeschlagen` aus (Exit-Code 0), bei einem
fehlgeschlagenen Test eine Liste der betroffenen Prüfungen (Exit-Code 1).

## 13. Rezepttext automatisch erkennen (ohne KI)

Im Formular gibt es jetzt zusätzlich zum "JSON einfügen"-Button einen Button
**"🔍 Rezepttext einfügen (automatisch erkennen)"**. Dort kannst du einen
kompletten Rezepttext (z. B. von einer Rezept-Webseite kopiert) einfügen -
die Karte versucht dann automatisch, Titel, Portionen, Kategorie, Zutaten und
Zubereitungsschritte herauszulesen und ins Formular zu übernehmen.

**Wichtig:** Das ist reine Mustererkennung (Regex-Heuristik) direkt im
Browser - bewusst OHNE externe KI-API, also kostenlos und ohne API-Key, aber
dadurch auch nicht ganz so treffsicher wie eine echte KI bei sehr
unstrukturiertem Text. Am zuverlässigsten funktioniert es, wenn der Text
"Zutaten"- und "Zubereitung"-Überschriften enthält (wie bei den meisten
Rezept-Webseiten und Chefkoch üblich). Fehlen diese, versucht die Karte es
über eine einfachere Reihenfolge-Heuristik (erst listenartige Zeilen als
Zutaten, danach der Rest als Schritte).

Nach der Erkennung erscheint bei unvollständigem Ergebnis (z. B. keine
Zutaten oder keine Schritte gefunden) ein Hinweis, das Formular im Anschluss
kurz zu prüfen - übernommen wird trotzdem, was gefunden wurde, damit nicht
alles von Hand nachgetippt werden muss. Kein Backend, kein Internetzugang,
keine zusätzliche Installation nötig - reine Kartenlogik, direkt in
`rezeptbuch-card.js` enthalten.

**Recherche-Grundlage:** Statt 500 Einzelseiten zu prüfen (nicht praktikabel),
wurde eine repräsentative Auswahl der meistgenutzten deutschsprachigen
Rezeptseiten untersucht (u. a. Chefkoch, kochbar.de, LECKER, essen&trinken,
EatSmarter, ichkoche.at, einfachkochen.de sowie WordPress-Rezept-Blogs mit
dem verbreiteten "WP Recipe Maker"-Plugin). Nach tatsächlichen Zugriffszahlen
ist Chefkoch in Deutschland mit weitem Abstand die Nr. 1, gefolgt von reinen
WordPress-Blogs - beide Fälle sind jetzt gut abgedeckt.

**Unterstützte Formate:**
- Zutaten als "Menge Einheit Name" auf einer Zeile ("500 g Mehl") - Standard
  bei den meisten Blog-Plugins (z. B. WP Recipe Maker) und Seiten wie LECKER,
  essen&trinken, EatSmarter, ichkoche.at.
- Menge und Name auf zwei getrennten Zeilen, Menge zuerst (Chefkoch,
  einfachkochen.de) - z. B. "400 g" dann "Risottoreis".
- Menge und Name auf zwei getrennten Zeilen, Name zuerst (kochbar.de) - z. B.
  "Rinderschulter" dann "1 kg". Die Reihenfolge wird automatisch erkannt.
- Zubereitungsschritte als "1. Text" (eine Zeile), als Zahl allein auf einer
  Zeile gefolgt vom Text (Chefkoch), oder als Bindestrich-Liste ohne
  Nummerierung (ichkoche.at).
- Typische Seiten-Metadaten dazwischen (Gesamtzeit, Arbeitszeit,
  Schwierigkeit, Rezeptautor:in usw.) werden automatisch herausgefiltert.

Alle diese Formate sind mit echten (bzw. an echten Beispielen nachgebauten)
Texten in `rezeptbuch-card.test.js` fest verankert - taucht eine Rezeptseite
mit einem bisher nicht abgedeckten Format auf, gerne den kopierten Text
schicken, dann wird ein neuer Testfall + die passende Erweiterung ergänzt.
Eine Garantie für alle denkbaren Seiten gibt es bei reiner Mustererkennung
naturgemäß nicht - dafür bleibt die Grundregel: unvollständige Erkennung wird
angezeigt, nie unbemerkt falsch übernommen, und das Formular ist danach immer
noch von Hand korrigierbar.

Für Fälle, in denen weder diese Erkennung noch der URL-Import (Abschnitt 14)
weiterhelfen - z. B. ein Foto eines handgeschriebenen Rezepts oder eine
WhatsApp-Nachricht -, gibt es zusätzlich eine dritte Möglichkeit: einen
fertigen Prompt für eine externe KI, siehe Abschnitt 26.

## 14. Rezept per URL importieren (zuverlässiger als Text-Erkennung)

Zusätzlich zum Text-Einfügen gibt es im Formular jetzt einen Button
**"🌐 Rezept-URL importieren"**. Statt den Rezepttext von Hand zu kopieren,
reicht hier ein Link zur Rezeptseite - die Karte lädt die Seite serverseitig
herunter und liest die dort ohnehin eingebauten **schema.org/Recipe-
Strukturdaten** aus. Das sind dieselben Daten, mit denen z. B. Google die
Sternebewertungen und Kochzeiten direkt in den Suchergebnissen anzeigt -
praktisch jede größere Rezeptseite pflegt sie, weil sie sonst auf diese
Google-Darstellung verzichten müsste. Da es sich um bereits fertig
strukturierte Daten handelt (statt frei formatiertem Text), ist dieser Weg in
der Regel **deutlich zuverlässiger** als die Text-Erkennung aus Abschnitt 13.

**Warum ein zusätzliches Skript nötig ist:** Browser dürfen aus
Sicherheitsgründen (CORS) nicht einfach beliebige fremde Webseiten laden -
das muss serverseitig passieren, genau wie bei den übrigen Rezeptbuch-
Hilfsskripten in dieser Anleitung.

### Installation

1. Neue Datei `rezeptbuch_url_import.py` nach `/config/scripts/` hochladen
   (z. B. per Studio Code Server / Datei-Editor-Add-on, oder per Samba/SFTP).
2. In der `configuration.yaml` im bestehenden `shell_command:`-Block folgende
   Zeile ergänzen (falls du Abschnitt 4 dieser Anleitung schon eingerichtet
   hast, ist der Block bereits vorhanden - hier kommt nur eine weitere Zeile
   dazu):
   ```yaml
   shell_command:
     # ... bereits vorhandene Zeilen unverändert lassen ...
     rezeptbuch_url_importieren: "python3 /config/scripts/rezeptbuch_url_import.py '{{ url }}'"
   ```
3. Home Assistant **komplett neu starten** (nicht nur "YAML neu laden" -
   `shell_command` registriert neue Einträge nur bei einem vollständigen
   Neustart, das gilt hier genauso wie bei den bisherigen Skripten).
4. Die aktualisierte `rezeptbuch-card.js` (mit dem neuen "URL importieren"-
   Button) wie gewohnt nach `/config/www/rezeptbuch-card.js` hochladen und den
   Browser-Cache der Dashboard-Ansicht einmal neu laden (Strg+Shift+R).

### Benutzung

Im Formular auf "🌐 Rezept-URL importieren" klicken, den Link zur Rezeptseite
einfügen (z. B. `https://www.chefkoch.de/rezepte/...`) und auf "Importieren"
klicken. Bei Erfolg werden Titel, Portionen, Kategorie, Zutaten,
Zubereitungsschritte und - falls vorhanden - ein Bild automatisch übernommen
(auch hier gilt: wie bei der Text-Erkennung nur tatsächlich Gefundenes, ein
schon ausgefülltes Feld wird nicht überschrieben). Das Bild wird dabei NICHT
heruntergeladen und gespeichert, sondern nur seine externe Adresse
übernommen - die bereits vorhandene, generische Bildlade-Logik der Karte
lädt es beim Speichern automatisch nach (genau wie sie es auch bei jedem
anderen Bildlink tut).

### Wann es nicht funktioniert

- **Nicht jede Seite stellt diese Strukturdaten bereit.** Fehlen sie, meldet
  der Import einen klaren Fehler ("keine Rezeptdaten gefunden") statt etwas
  zu raten - dann hilft stattdessen die Text-Erkennung aus Abschnitt 13.
- **Manche Seiten blockieren automatisierte Abrufe** (Bot-Schutz). Auch das
  wird als Fehlermeldung angezeigt statt die Karte hängen zu lassen.
- Ein Apostroph in der URL wird von der Karte selbst abgelehnt (bevor
  überhaupt ein Aufruf stattfindet), da er sonst den Shell-Befehl in der
  `configuration.yaml` durcheinanderbringen würde - kommt bei normalen
  Rezept-Links praktisch nie vor.
- Der Import lädt ausschließlich die von dir eingegebene Adresse und
  extrahiert daraus nur die oben genannten Rezeptfelder - inhaltlich
  entspricht das dem, was du sonst auch von Hand kopieren würdest, nur
  automatisiert.

**Hinweis zur Testabdeckung:** `rezeptbuch_url_import.py` wurde gegen
mehrere selbst gebaute, an den offiziellen schema.org/Recipe-Konventionen
orientierte Beispiel-Datensätze getestet (`test_rezeptbuch_url_import.py`,
im Sandbox-Testlauf ohne echten Internetzugriff, da externe Seiten von dort
teils blockiert werden). Auf einem echten Home-Assistant-System ist der
ausgehende Netzwerkzugriff nicht eingeschränkt - falls eine reale Seite
trotzdem unerwartet scheitert oder falsch geparst wird, gerne die
Fehlermeldung bzw. den betroffenen Link schicken, dann wird das Skript
entsprechend nachgebessert (genau wie bei der Text-Erkennung in Abschnitt
13 üblich).

## 15. Geöffnetes Rezept übersteht jetzt einen App-Reload

**Das Problem:** Die Home-Assistant-Begleit-App (iOS/Android) lädt ihre
Web-Ansicht nach einer Weile im Hintergrund (z. B. wenn man kurz in die
Einstellungen wechselt und nach ~1 Minute zurückkommt) manchmal komplett
neu - das ist normales Speicher-Management des Betriebssystems, kein Fehler
der Karte. Dabei geht jeglicher reiner JavaScript-Zustand verloren, die
Karte startet wieder von vorne und landet deshalb in der Gesamtübersicht,
selbst wenn vorher ein einzelnes Rezept geöffnet war.

**Die Lösung:** Die Karte vermerkt jetzt zusätzlich, welches Rezept gerade
in der Detailansicht offen ist, direkt in der Browser-Adresse (als
sogenannter "Hash", z. B. `...#rezeptbuch-rezept=<uid>`). Das übersteht
einen Reload, weil es Teil der Adresse ist, die neu geladen wird - nicht
Teil des verlorengegangenen JavaScript-Zustands. Lädt die App neu, prüft
die Karte beim Start diese Adresse und öffnet automatisch wieder dasselbe
Rezept, statt in der Übersicht zu landen. Existiert das Rezept nicht mehr
(z. B. zwischenzeitlich gelöscht), fällt die Karte sauber auf die
Übersicht zurück, statt einen Fehler zu zeigen.

**Wichtig - was das NICHT abdeckt:** Ist gerade das Formular zum Anlegen
oder Bearbeiten eines Rezepts geöffnet (Eingabefelder mit ggf. noch nicht
gespeicherten Änderungen) und die App lädt in diesem Moment neu, gehen
diese ungespeicherten Änderungen weiterhin verloren - das lässt sich ohne
ein automatisches Zwischenspeichern von Entwürfen nicht sinnvoll lösen und
war auch nicht das gemeldete Problem. Beim reinen Ansehen eines Rezepts
(Detailansicht) funktioniert die Wiederherstellung aber zuverlässig.

Kein Konfigurationsschritt nötig - einfach die aktualisierte
`rezeptbuch-card.js` wie gewohnt nach `/config/www/rezeptbuch-card.js`
hochladen und den Browser-/App-Cache wie in den vorherigen Abschnitten
beschrieben leeren.

## 16. Sicherheits-Fix: Attribut-Injection über Titel/Bild-URL

**Was gefunden wurde:** Die interne Escape-Funktion der Karte (`_escape()`)
hat bisher zwar `&`, `<` und `>` sicher maskiert (ausreichend für reinen
Text-Inhalt), aber KEINE Anführungszeichen. An den Stellen, wo ihr Ergebnis
in ein HTML-Attribut eingesetzt wird (z. B. `value="..."` für das
Titel-Eingabefeld, `src="..."` für das Rezeptbild), konnte ein Wert mit
einem eingebetteten `"` aus dem Attribut ausbrechen und ein zusätzliches,
beliebiges Attribut einschleusen - z. B. einen Event-Handler wie
`onerror="..."`, der dann echten JavaScript-Code im Kontext deiner
Home-Assistant-Oberfläche ausführt.

**Warum das jetzt relevanter ist:** Vor der Text-/URL-Erkennung (Abschnitt
13/14) wurden Titel und Bild-Adresse praktisch immer von dir selbst
eingetippt oder aus einem JSON kopiert, das du selbst geprüft hast. Der
URL-Import übernimmt diese Felder jetzt aber automatisiert direkt von einer
fremden Webseite, ohne dass jemand den Text vorher liest - eine
kompromittierte oder böswillig präparierte Rezeptseite könnte diese Lücke
also theoretisch ausnutzen, um Code in deiner Home-Assistant-Oberfläche
auszuführen.

**Der Fix:** `_escape()` maskiert jetzt zusätzlich `"` und `'`, und die
beiden Stellen, an denen die Bild-Adresse ungeprüft direkt in ein
`src="..."`-Attribut eingesetzt wurde, nutzen jetzt ebenfalls `_escape()`.
Ein extra Regressionstest (`testAttributInjectionWirdVerhindert`) baut
genau so einen Angriffsversuch nach und prüft, dass kein eingeschleusetes
Attribut mehr entsteht und kein Code ausgeführt wird - der Test wurde vor
dem Fix nachweislich rot, danach grün.

**Handlungsbedarf:** Einfach die aktualisierte `rezeptbuch-card.js`
hochladen (wie immer: Cache leeren). Kein Konfigurationsschritt nötig.
Falls du bereits Rezepte per URL-Import oder JSON-Einfügen von einer
Quelle übernommen hast, der du nicht vollständig vertraust, ist es eine
gute Idee, deren Titel/Zutaten/Schritte einmal kurz durchzusehen.

## 17. Text-Erkennung: vier weitere Verbesserungen

Zusätzlich zu den in Abschnitt 13 beschriebenen Formaten erkennt die
automatische Rezepttext-Erkennung jetzt auch:

- **Bruch-/Komma-Mengen und Bereiche:** Unicode-Bruchzeichen ("½ TL Salz"),
  einfache Brüche ("1/2 TL Zimt"), gemischte Zahlen ("1 1/2 Tassen Mehl"),
  Komma-Dezimalzahlen ("1,5 EL Zucker") sowie Mengenbereiche mit
  Bindestrich, Gedankenstrich oder "bis" ("400-500 g", "400–500 ml",
  "2 bis 3 Eier").
- **Zutaten-Unterüberschriften:** Gliedert eine Seite ihre Zutaten in
  Gruppen ("Für den Teig:", "Für die Füllung:", "Topping:", "Deko:",
  "Belag:", "Guss:", "Sauce:" usw.), wird das jetzt als Gliederung erkannt
  und nicht mehr fälschlich als eigene, sinnlose Zutat übernommen.
- **Absatz-Schritte ohne Nummerierung:** Trennt eine Seite ihre
  Zubereitungsschritte nur durch Leerzeilen zwischen Absätzen (ganz ohne
  "1.", ohne Bindestriche), wird jetzt jeder zusammenhängende Absatz zu
  einem Schritt zusammengefasst - vorher wäre jede einzelne (oft nur weich
  umgebrochene) Textzeile als eigener, unvollständiger "Schritt" gewertet
  worden.
- **Englische Überschriften:** "Ingredients" und "Instructions"/
  "Directions"/"Method"/"Steps" werden zusätzlich zu den deutschen
  Überschriften erkannt, falls doch mal ein englischsprachiges Rezept
  eingefügt wird.

Alle vier Verbesserungen sind mit eigenen Testfällen in
`test/rezeptbuch-card.test.js` dauerhaft abgesichert. Kein
Konfigurationsschritt nötig - nur die aktualisierte `rezeptbuch-card.js`
hochladen und Cache leeren.

## 18. Automatische Einkaufsliste aus Rezepten

Ab jetzt lässt sich aus einem oder mehreren Rezepten automatisch eine
Einkaufsliste erstellen, statt Zutaten von Hand abzutippen.

**Einrichtung (einmalig):**

1. Eine ZWEITE Lokale To-do-Liste anlegen: Einstellungen → Geräte &
   Dienste → **Integrationen** → unten rechts "+ Integration hinzufügen" →
   "Lokale To-do" auswählen → z.B. Name "Einkaufsliste" (erzeugt z.B.
   `todo.einkaufsliste`, kein separater Helfer-Schritt nötig). Das ist eine
   ganz normale To-do-Liste - sie lässt sich auch unabhängig von der Karte
   als eigene Lovelace-Karte (`type: todo-list`) anzeigen.
2. In der Kartenkonfiguration die neue Entität eintragen:
   ```yaml
   type: custom:rezeptbuch-card
   entity: todo.rezepte
   shopping_list_entity: todo.einkaufsliste
   ```
   Ohne `shopping_list_entity` funktioniert die Karte unverändert weiter -
   der "Einkaufsliste erstellen"-Knopf zeigt dann nur einen erklärenden
   Hinweis statt eines Absturzes.

**Nutzung:**

1. In der Rezeptliste auf "🛒 Einkaufsliste" klicken - jede Rezept-Kachel
   bekommt daraufhin eine Checkbox oben rechts.
2. Die gewünschten Rezepte anklicken (das öffnet in diesem Modus NICHT das
   Rezept, sondern schaltet die Auswahl um).
3. Auf "Einkaufsliste erstellen" klicken.

Die Zutaten aller ausgewählten Rezepte werden zusammengeführt: dieselbe
Zutat mit derselben Einheit (Groß-/Kleinschreibung egal) wird zu EINER
Zeile mit aufsummierter Menge zusammengefasst (z.B. "200 g Mehl" aus Rezept
A + "300 g Mehl" aus Rezept B ergibt "500 g Mehl"). Unterschiedliche
Einheiten derselben Zutat werden NICHT zusammengeführt (z.B. "1 Päckchen
Mehl" bleibt eine eigene Zeile). Mengen, die sich nicht sauber addieren
lassen (Brüche, Bereiche, Wortmengen wie "etwas" oder "eine Prise"), werden
ebenfalls nicht verrechnet, sondern unverändert als eigene Zeile
übernommen - besser eine unpraktische Extra-Zeile als eine falsche Summe.

Jede Zutat wird als eigener Eintrag im Format "Menge Einheit Name" (z.B.
"500 g Mehl") an die Einkaufsliste ANGEHÄNGT (append) - bereits vorhandene
Einträge werden nicht gelöscht oder verändert. Möchtest du vor dem
Erstellen eine leere Liste, hake einfach die alten Einträge in der
Einkaufslisten-Karte selbst ab bzw. lösche sie dort.

## 19. Wochenplan / Meal-Planer

Über den Knopf "📅 Wochenplan" in der Rezeptliste öffnet sich eine neue
Ansicht mit den 7 Wochentagen (Montag bis Sonntag). Jedem Tag lässt sich
über ein Auswahlfeld optional ein Rezept aus dem bestehenden Rezeptbuch
zuordnen, oder die Zuordnung wieder auf "– kein Rezept –" zurücksetzen. Ist
einem Tag ein Rezept zugeordnet, öffnet ein Klick auf "Öffnen" direkt
dessen Detailansicht.

**Kein weiterer Helfer nötig:** der Wochenplan wird als unsichtbarer
Zusatzeintrag in DERSELBEN Rezept-To-do-Liste gespeichert (erkennbar an
einem internen, technischen Titel) und taucht deshalb nirgends als eigenes
"Rezept" in der Liste, der Suche oder dem PDF-/Sicherungs-Export auf. Die
Zuordnung ist wie alle anderen Rezeptbuch-Daten geräteübergreifend (jedes
Gerät sieht denselben Wochenplan).

Über "Einkaufsliste aus Wochenplan erstellen" lässt sich aus allen aktuell
zugewiesenen Rezepten in einem Schritt eine Einkaufsliste erstellen - dafür
gilt dieselbe Konfiguration und Zusammenführungs-Logik wie in Abschnitt 18
beschrieben (also ebenfalls `shopping_list_entity` erforderlich).

### 19.1 Vergangene Tage werden automatisch geleert

Jedes Mal, wenn die Wochenplan-Ansicht geöffnet wird, prüft die Karte
automatisch, ob einzelne Tage der aktuell laufenden Woche bereits in der
Vergangenheit liegen (z.B. ist heute Mittwoch, dann liegen Montag und
Dienstag schon zurück). Für solche Tage wird die Rezept-Zuordnung
automatisch entfernt - Mittwoch bis Sonntag bleiben dabei unangetastet
stehen. **Wichtig:** Es wird dabei NUR die Zuordnung "Tag -> Rezept"
entfernt, niemals das Rezept selbst - das bleibt ganz normal im
Rezeptbuch erhalten.

Dafür merkt sich der Wochenplan zusätzlich intern das Datum des Montags der
aktuell laufenden Woche (ebenfalls unsichtbar, im selben Zusatzeintrag).
Alte, vor dieser Erweiterung gespeicherte Wochenpläne ohne dieses Datum
werden beim ersten Öffnen automatisch migriert (die "aktuell laufende
Woche" beginnt dann einfach mit dem Öffnungszeitpunkt).

### 19.2 Folgewoche im Voraus planen

Über die zwei Reiter **"Diese Woche"** und **"Folgewoche"** oben in der
Wochenplan-Ansicht lässt sich schon jetzt die kommende Woche komplett
befüllen, unabhängig davon, wie weit die aktuelle Woche schon fortgeschritten
ist. Die Folgewoche wird von der automatischen Leerung (19.1) NICHT
angefasst, egal welcher Wochentag gerade ist.

Ist die aktuelle Woche komplett vorbei (Sonntag um), rückt beim nächsten
Öffnen der Ansicht automatisch das nach, was unter "Folgewoche" stand - es
wird zur neuen "Diese Woche". "Folgewoche" ist danach wieder leer und
wartet auf die übernächste Woche. Im Voraus geplante Rezepte gehen beim
Wochenwechsel also nicht verloren, sondern rutschen automatisch nach; ein
manuelles Umkopieren ist nicht nötig.

"Einkaufsliste aus Wochenplan erstellen" bezieht sich jeweils auf den
gerade angezeigten Reiter - im Folgewoche-Tab erzeugt der Knopf also eine
Einkaufsliste aus den für die kommende Woche geplanten Rezepten.

## 20. Mehrere Tags pro Rezept + gespeicherte Filter ("Smarte Sammlung")

Zusätzlich zur bisherigen EINEN Kategorie pro Rezept (z.B. "Hauptgericht")
lassen sich jetzt beliebig viele freie Tags vergeben (z.B. "vegetarisch",
"schnell", "herbst"). Im Bearbeiten-Formular dafür im Feld "Tags" einen
Begriff eingeben und auf "+ Tag" klicken (oder Enter drücken) - der Tag
erscheint als entfernbarer Chip, genau wie bei Zutaten/Schritten über das
✕ wieder löschbar.

In der Rezeptliste erscheint darunter eine Tag-Filterzeile mit allen im
Rezeptbestand vorkommenden Tags (mit "#" vorangestellt). Mehrere Tags
lassen sich gleichzeitig aktivieren - dabei werden sie UND-verknüpft: nur
Rezepte, die ALLE aktiven Tags tragen, werden angezeigt (nicht "irgendeins
davon"). Der bestehende Kategorie-Filter bleibt unverändert bestehen und
lässt sich zusätzlich mit dem Tag-Filter kombinieren.

**Smarte Sammlung (gespeicherte Filter):** die aktuelle Kombination aus
Kategorie + aktiven Tags + Suchbegriff lässt sich über "+ Smarte Sammlung
speichern" unter einem selbst gewählten Namen sichern (z.B. "Herbstrezepte"
für Kategorie "Suppe" + Tag "herbst"). Wichtig zu wissen: gespeichert wird
dabei NICHT eine feste Liste von Rezepten, sondern nur die Filter-Kombination
selbst - deshalb "smart". Die Sammlung aktualisiert sich danach von selbst:
ein neues Rezept, das zur Kategorie/den Tags passt, taucht automatisch mit
auf, und ein Rezept, dessen Kategorie oder Tags sich ändern, kann genauso
automatisch wieder aus der Sammlung verschwinden. Ein Klick auf das "?"
direkt neben "+ Smarte Sammlung speichern" öffnet dazu jederzeit ein kurzes
Erklär-Fenster in der Karte selbst.

Gespeicherte Sammlungen erscheinen als Schnellzugriff-Chips ("📚 Name")
über der Rezeptliste - ein Klick darauf stellt die komplette
Filter-Kombination sofort wieder her. Über das ✕ neben einem
Sammlung-Chip lässt sie sich wieder löschen (ohne Rückfrage-Dialog, da
dabei keine Rezeptdaten verloren gehen - nur eine in Sekunden neu
anlegbare Filter-Kombination).

Auch Smarte Sammlungen werden, wie der Wochenplan (Abschnitt 19), als
unsichtbarer Zusatzeintrag in derselben To-do-Liste gespeichert - kein
weiterer Helfer nötig, geräteübergreifend verfügbar. (Intern - also in
Element-IDs, CSS-Klassen und im gespeicherten Datenformat - heißt es
weiterhin "kochbuch"/"Kochbuch"; das ist reine Implementierungsdetails
und für die Nutzung ohne Bedeutung.)

**Rückwärtskompatibilität:** bestehende Rezepte ohne `tags`-Feld werden
beim Laden automatisch mit einem leeren Tag-Array migriert (Schema-Version
1 -> 2). Die bestehende `category` bleibt davon unberührt.

## 21. Breiterer URL-Import: Fallback ohne strukturierte Daten

Der URL-Import (Abschnitt 14) versucht weiterhin zuerst, eingebettete
schema.org/Recipe-Strukturdaten (JSON-LD) auszulesen - das bleibt der
zuverlässigste Weg. NEU: findet das Skript auf einer Seite KEINE (oder kein
verwertbares) schema.org/Recipe, versucht es jetzt automatisch einen
zweiten, einfacheren Weg, statt sofort mit einer Fehlermeldung aufzugeben.

Dieser Fallback wandelt die HTML-Seite grob in Text um (Skripte/Styles
entfernen, Listen-/Absatz-/Zeilenumbruch-Elemente als Zeilenumbrüche
werten, restliche HTML-Tags entfernen, HTML-Entities wie `&amp;` dekodieren)
und sucht darin nach einer "Zutaten"/"Ingredients"- und einer
"Zubereitung"/"Instructions"-Überschriftzeile - die Zeilen dazwischen
werden als Zutaten übernommen, die danach als Zubereitungsschritte. Der
Titel wird aus dem `<title>`-Tag der Seite gelesen.

**Wichtig, dieser Fallback ist AUSDRÜCKLICH ungenauer** als der
JSON-LD-Weg: Portionen, Kategorie und Bild werden dabei NICHT ermittelt
(bleiben leer/null) und die Zutaten werden nicht in Menge/Einheit/Name
zerlegt (das übernimmt beim Einfügen ins Formular wie gewohnt dieselbe
Text-Erkennung wie bei "Rezepttext einfügen", Abschnitt 13). Er dient nur
dazu, bei Seiten ganz ohne Strukturdaten mehr zu liefern als gar nichts -
das Ergebnis danach im Formular unbedingt prüfen und ergänzen, genau wie
bei der normalen Text-Erkennung.

Kein Konfigurationsschritt nötig - die aktualisierte
`rezeptbuch_url_import.py` nach `/config/scripts/` hochladen (Home
Assistant muss danach NICHT neu gestartet werden, da `shell_command` das
Skript bei jedem Aufruf neu ausführt).

## 22. Rezept dauerhaft aus allen Backups entfernen

**Problem:** Löscht man ein Rezept nur über die Karte, verschwindet es aus
`todo.rezepte` - es steckt aber weiterhin in JEDER bereits vorhandenen
Backup-Datei unter `/config/Backup-Rezepte/`. Spielt man später eines
dieser alten Backups wieder ein (Abschnitt 8), gleicht `rezeptbuch_restore.py`
nur gegen den AKTUELLEN Bestand ab - der Titel fehlt dort ja jetzt - und
fügt das eigentlich gelöschte Rezept dadurch ungewollt wieder hinzu.

**Lösung:** Das Skript `rezeptbuch_backup_bereinigen.py` entfernt einen
Rezepttitel gezielt aus JEDER vorhandenen Backup-Datei, damit er auch bei
einem künftigen Restore nicht mehr zurückkehren kann.

### Einrichtung

1. `rezeptbuch_backup_bereinigen.py` nach `/config/scripts/` hochladen.
2. In den bestehenden `shell_command:`-Block (siehe Abschnitt 4) diese
   Zeile ergänzen:
   ```yaml
   rezeptbuch_backup_bereinigen: "python3 /config/scripts/rezeptbuch_backup_bereinigen.py '{{ titel }}'"
   ```
3. Home Assistant **komplett neu starten** (wie bei jeder neuen
   `shell_command`-Zeile).
4. Optional, aber empfohlen: das Skript aus
   `rezeptbuch_backup_bereinigen_skript.yaml` unter **Einstellungen →
   Automatisierungen → Skripte → Skript hinzufügen → Im YAML-Editor
   bearbeiten** einfügen - dann lässt sich der Rezepttitel bequem über ein
   Textfeld eingeben, statt den `shell_command` direkt mit Rohdaten
   aufzurufen.

### Nutzung

1. Rezept zuerst ganz normal über die Karte löschen (wie gewohnt).
2. Danach **Entwicklerwerkzeuge → Aktionen →
   `script.rezeptbuch_backup_bereinigen`** aufrufen und den exakten
   Rezepttitel eingeben (Groß-/Kleinschreibung wird unterschieden - der
   Titel muss genauso geschrieben sein wie ursprünglich im Rezept).
3. Das Skript geht alle Backup-Dateien durch und entfernt jeden Eintrag mit
   diesem Titel. Ergebnis steht im Log unter
   `/config/scripts/rezeptbuch_backup_bereinigen.log` (wie viele Dateien
   bearbeitet, wie viele Einträge entfernt).

**Wichtig:**
- Eine Backup-Datei wird dabei NICHT komplett gelöscht, auch wenn sie
  danach leer ist - sie bleibt als (dann leerer) Tagesschnappschuss
  bestehen, bis sie nach 30 Tagen automatisch aufgeräumt wird.
- Das Entfernen aus den Backup-Dateien geschieht sofort und ohne eigenes
  Rückgängig-Fenster (anders als das Löschen eines Rezepts über die Karte)
  - vor dem Ausführen den Titel also genau prüfen.
- Ohne diesen Schritt löst sich das Problem nach 30 Tagen ohnehin von
  selbst (weil dann alle Backups, die den Titel noch enthielten, automatisch
  gelöscht sind) - das Skript ist nur dafür da, das sofort statt erst nach
  30 Tagen sicherzustellen.

## 23. Barrierefreiheit (Accessibility)

**Was das bedeutet:** Die Karte lässt sich jetzt auch ohne Maus und mit
Bildschirmleseprogrammen ("Screenreadern") vollständig bedienen. Betroffen
sind vier Bereiche:

- **Tastaturbedienbarkeit:** Alle Rezept-Kacheln und die Sterne-Bewertung
  lassen sich per **Tab** anspringen und mit **Enter**/**Leertaste**
  auslösen - vorher ging das nur per Mausklick.
- **Screenreader-Ansagen:** Icon-Buttons (z. B. die "✕"-Schaltflächen zum
  Entfernen einer Zutat, eines Zubereitungsschritts, eines Tags oder einer
  Smarten Sammlung) haben jetzt eine sprechende Beschreibung
  (`aria-label`), die vorgelesen wird. Die Sterne-Bewertung ist als
  "Radiogruppe" ausgezeichnet, sodass ein Screenreader ansagt, der
  wievielte von fünf Sternen gerade fokussiert bzw. ausgewählt ist.
- **Farbkontrast:** Der Terrakotta-Farbton wurde geringfügig abgedunkelt
  (`#c1652f` → `#b25d2b`), damit weißer Text auf terrakottafarbenem
  Hintergrund (z. B. die Beschriftung der "Speichern"-Buttons) den von
  WCAG AA geforderten Mindestkontrast von 4,5:1 erreicht. Der optische
  Unterschied ist minimal.
- **Sichtbarer Tastatur-Fokus:** Wer mit der Tastatur navigiert, sieht jetzt
  wieder einen deutlichen Rahmen um das gerade fokussierte Element (Suchfeld,
  Buttons, Formularfelder, Rezept-Kacheln) - vorher war das an mehreren
  Stellen unsichtbar gemacht worden, ohne Ersatz.

**Was zu tun ist:** Nichts - es handelt sich um reine
Verhaltens-/Darstellungsänderungen innerhalb der Karte selbst. Es genügt,
`rezeptbuch-card.js` wie gewohnt zu ersetzen (Abschnitt 1). Keine neuen
Helfer, keine geänderte Konfiguration.

## 24. Sicherheits-Fixes: Shell-Injection-Schutz & SSRF-Schutz beim URL-Import

**Problem 1 (Shell-Injection über Rezepttitel/Backup-Datum):** Home Assistant
führt jeden `shell_command`-Eintrag über eine echte Shell aus. Die Skripte
`rezeptbuch_backup_bereinigen` (Abschnitt 22) und
`rezeptbuch_backup_wiederherstellen` (Abschnitt 8) betten ihren jeweiligen
Parameter (Rezepttitel bzw. Backup-Datum) in `configuration.yaml` zwischen
einfache Anführungszeichen ein. Ein Apostroph in diesem Wert bricht dieses
Anführungszeichen-Quoting auf – harmlos bei einem zufällig apostroph-haltigen
Rezepttitel (z. B. "Mama's Kuchen": der Befehl schlägt dann nur fehl), aber
gefährlich bei einem gezielt präparierten Titel. Da Rezepttitel über den
URL-Import (Abschnitt 14) automatisiert von einer fremden, nicht selbst
geprüften Webseite übernommen werden können, war das kein rein theoretisches
Risiko: eine präparierte Rezeptseite hätte über einen entsprechend
gestalteten Rezeptnamen beliebige Shell-Befehle mit den Rechten von Home
Assistant einschleusen können, sobald `rezeptbuch_backup_bereinigen` später
mit diesem Titel aufgerufen wird.

**Lösung:** Beide Skript-Dateien (`rezeptbuch_backup_bereinigen_skript.yaml`,
`rezeptbuch_restore_skript.yaml`) prüfen den jeweiligen Eingabewert jetzt VOR
dem Aufruf des `shell_command` und brechen mit einer verständlichen
Fehlermeldung ab, statt den riskanten Wert überhaupt an die Shell
weiterzugeben (beim Rezepttitel: kein Apostroph erlaubt; beim Backup-Datum:
nur noch exakt `neuestes` oder das Format `JJJJ-MM-TT`). Der URL-Import hatte
eine gleichwertige Prüfung für sein eigenes `url`-Feld bereits vorher
(clientseitig in der Karte selbst).

**Was zu tun ist:** Falls du `rezeptbuch_backup_bereinigen_skript.yaml`
und/oder `rezeptbuch_restore_skript.yaml` bereits in deine `scripts.yaml`
übernommen hast, den jeweiligen Abschnitt einmal durch die aktuelle Version
aus diesem Paket ersetzen (keine weiteren Schritte nötig, kein Neustart
erforderlich – Skripte werden von Home Assistant automatisch neu geladen,
sobald du sie im UI speicherst, oder nach **Entwicklerwerkzeuge → YAML neu
laden → Skripte**).

**Problem 2 (SSRF beim URL-Import):** `rezeptbuch_url_import.py` prüfte
bisher nur, dass die eingegebene Adresse mit `http://`/`https://` beginnt,
nicht aber, wohin sie tatsächlich zeigt. Da der Abruf serverseitig auf dem
Home-Assistant-Host selbst passiert (nicht im Browser), hätte eine Adresse
wie `http://localhost:8123/...` oder `http://192.168.1.1/...` dazu
missbraucht werden können, andere im selben (Heim-)Netzwerk erreichbare
Dienste abzufragen und deren Antwort über das Rezeptformular auszulesen.

**Lösung:** Das Skript löst den Hostnamen jetzt selbst auf und lehnt jede
Adresse ab, die (direkt oder über DNS) auf eine lokale/private/interne
IP-Adresse zeigt (Loopback, private Netzbereiche, Link-Local, etc.), bevor
überhaupt ein Abruf versucht wird.

**Was zu tun ist:** `rezeptbuch_url_import.py` einmal durch die aktuelle
Version aus diesem Paket ersetzen. Kein Neustart nötig (siehe Abschnitt 22).

## 25. Sicherheits-Nachbesserung URL-Import

**Problem 1 (Weiterleitungen umgingen den SSRF-Schutz aus Abschnitt 24):**
Python folgt HTTP-Weiterleitungen automatisch. Geprüft wurde aber nur die
ursprünglich eingegebene Adresse – eine öffentliche Seite hätte per
Weiterleitung auf z. B. `http://192.168.1.1/` umlenken können, und das
Skript hätte die interne Seite trotzdem abgerufen.

**Problem 2 (andere Protokolle):** Außer `http://`/`https://` wurden auch
Adressen wie `ftp://...` angenommen. Für einen Rezept-Import gibt es dafür
keinen Grund.

**Problem 3 („Zip-Bombe“):** Die 5-MB-Obergrenze galt nur für die
komprimiert übertragenen Daten. Eine präparierte Seite hätte wenige MB
gzip-Daten schicken können, die entpackt mehrere GB groß werden – genug, um
z. B. einen Raspberry Pi mit 4 GB Arbeitsspeicher zum Absturz zu bringen.

**Lösung:** Jedes Weiterleitungsziel wird jetzt genauso geprüft wie die
eingegebene Adresse, nur noch `http`/`https` ist erlaubt, und auch die
entpackte Größe ist auf 5 MB begrenzt.

**Was zu tun ist:** `rezeptbuch_url_import.py` einmal durch die aktuelle
Version aus diesem Paket ersetzen. Kein Neustart nötig.

**Bekannte Restgrenze:** Gegen sogenanntes „DNS-Rebinding“ (ein Angreifer
kontrolliert den DNS-Server einer Domain und lässt sie bei der Prüfung auf
eine öffentliche, beim eigentlichen Abruf Sekundenbruchteile später auf eine
interne IP zeigen) schützt die Prüfung nicht vollständig. Das erfordert
deutlich mehr Aufwand vom Angreifer, und die abgerufene Antwort landet
ohnehin nur in deinem eigenen Rezeptformular – für den privaten Einsatz ist
das Restrisiko gering.

## 26. Prompt-Hilfe für eine externe KI beim JSON-Import

Im Formular gibt es neben dem Button **"📋 Von KI erzeugtes JSON einfügen"**
jetzt einen kleinen **"?"-Knopf**. Ein Klick öffnet ein Fenster mit einem
fertig formulierten Text zum Kopieren.

**So funktioniert's:**
1. Auf "?" klicken, den angezeigten Text über "📋 Prompt kopieren" kopieren.
2. Den Text in eine beliebige KI einfügen (z. B. ChatGPT, Claude, Gemini -
   egal welche, die Karte selbst spricht mit keiner KI).
3. Direkt danach deinen eigenen Rezepttext anhängen (abtippen, aus einem
   Foto per KI erkennen lassen, aus einer Nachricht kopieren - was auch
   immer als Ausgangsmaterial vorliegt) und an die KI senden.
4. Die Antwort der KI (ein JSON-Objekt) zurückkopieren und oben bei "JSON
   hier einfügen" einfügen, dann auf "Übernehmen" klicken.

**Wofür das gut ist:** Die automatische Text-Erkennung (Abschnitt 13) und
der URL-Import (Abschnitt 14) brauchen entweder einen Rezepttext mit
erkennbarer Struktur oder eine Webseite mit Strukturdaten. Bei einem Foto
eines handgeschriebenen Rezepts, einer diktierten Notiz oder einem völlig
frei formulierten Text ist eine externe KI oft zuverlässiger - der Prompt
sorgt nur dafür, dass ihre Antwort exakt in dem Format kommt, das die Karte
versteht.

**Wichtig zur Kategorie:** Der Prompt weist die KI an, das Feld "category"
exakt auf einen von elf festen, immer deutschen Werten zu setzen (z. B.
"Hauptgericht", "Dessert"), unabhängig von der Sprache des Rezepttexts oder
der in Home Assistant eingestellten Sprache. Das ist kein Fehler: intern
speichert die Karte Kategorien immer auf Deutsch (siehe Abschnitt zur
Mehrsprachigkeit im README) und übersetzt nur für die Anzeige. Ein falscher
oder fehlender Kategorie-Wert führt zu keinem Fehler, das Rezept landet dann
einfach unter "Sonstiges" und lässt sich im Formular jederzeit ändern.

**Kein Backend, keine KI-Anbindung durch die Karte:** Wie beim JSON-Einfügen
selbst schon bisher - die Karte schickt nichts an eine KI, ruft keine API
auf und braucht keinen API-Key. Der Nutzer kopiert Text manuell in eine KI
seiner Wahl und das Ergebnis manuell zurück, genau wie er es vermutlich
schon vorher getan hat, nur jetzt mit einer fertigen Formatvorgabe statt
diese jedes Mal selbst zu formulieren.

**Hinweis zur Sprache:** Wird die Home-Assistant-Profilsprache umgestellt,
während ein Formular schon offen ist, übernimmt die Karte die neue Sprache
nicht sofort mitten im offenen Fenster (das könnte sonst unsichtbar bereits
eingegebenen Formulartext verwerfen) - innerhalb eines geöffneten Fensters
bleibt immer alles in derselben Sprache konsistent, auch der Prompt-Text
selbst. Um eine neue Sprache vollständig zu sehen: einmal navigieren (z. B.
zurück zur Liste und wieder rein) oder die Seite neu laden.

## 27. Schwiizerdütsch als Sprache

Home Assistant bietet Schwiizerdütsch selbst als Spracheinstellung an
(Profilbild → Sprache → "Schwiizerdütsch"). Die Karte erkennt das jetzt
automatisch, genau wie die 24 EU-Sprachen aus Abschnitt zur
Mehrsprachigkeit im README - nichts weiter einzurichten, einfach die
aktuelle `rezeptbuch-card.js` verwenden.

**Technischer Hintergrund, falls es dich interessiert:** Home Assistant
verwendet für Schwiizerdütsch den Code `gsw` - anders als alle anderen
unterstützten Sprachen ein DREIstelliger statt zweistelliger Code. Die
Karte musste dafür eine kleine Sonderprüfung bekommen, sonst wäre "gsw"
fälschlich als "gs" behandelt worden (nicht erkannt, Rückfall auf
Englisch).

**Zur Übersetzung selbst:** Schwiizerdütsch hat keine einheitliche
amtliche Schreibweise - jede Region schreibt etwas anders. Die Karte
verwendet eine neutrale, im Alltag online gebräuchliche Schreibweise. Wie
bei den anderen nicht-deutschen/englischen Sprachen ist das eine
KI-Übersetzung, hier ohne einheitlichen Standard, an dem man sie
überhaupt messen könnte - Korrekturvorschläge sind besonders willkommen.
