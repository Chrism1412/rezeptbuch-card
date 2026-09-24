#!/usr/bin/env python3
"""
Tests für rezeptbuch_url_import.py - GEGEN SYNTHETISCHE, aus den
offiziellen schema.org/Recipe-Konventionen nachgebaute HTML/JSON-LD-Beispiele
(kein echter Netzwerk-Abruf, da in dieser Sandbox externe Seiten teils
blockiert sind; auf einem echten Home-Assistant-System ist der ausgehende
Netzwerkzugriff nicht eingeschränkt). Deckt die in der Praxis wichtigsten
Formvarianten ab: einfaches Recipe-Objekt, @graph-Verschachtelung (z.B.
Yoast-SEO-Plugin), HowToStep/HowToSection-Anleitungen, verschiedene
recipeYield/image-Formen, sowie Fehlerfälle (keine Daten, kaputtes JSON,
kein Recipe-Typ vorhanden).

Testet NUR die reinen Funktionen (kein Prozessaufruf nötig), durch
direkten Import des Skripts.
"""

import json
import os
import sys
import unittest

SKRIPT_ORDNER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SKRIPT_ORDNER)
import rezeptbuch_url_import as modul  # noqa: E402


def html_mit_ld_json(daten):
    return f"""<html><head>
    <script type="application/ld+json">{json.dumps(daten)}</script>
    </head><body>Rezeptinhalt hier</body></html>"""


class TestEinfachesRecipeObjekt(unittest.TestCase):
    def test_vollstaendiges_rezept(self):
        daten = {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Spaghetti Carbonara",
            "recipeYield": "4 Portionen",
            "recipeCategory": "Hauptgericht",
            "recipeIngredient": [
                "400 g Spaghetti",
                "200 g Pancetta",
                "4 Eigelb",
                "100 g Parmesan",
            ],
            "recipeInstructions": [
                {"@type": "HowToStep", "text": "Spaghetti in Salzwasser kochen."},
                {"@type": "HowToStep", "text": "Pancetta anbraten."},
                {"@type": "HowToStep", "text": "Alles vermengen und servieren."},
            ],
            "image": "https://example.com/carbonara.jpg",
        }
        html = html_mit_ld_json(daten)
        rezept = modul.rezept_aus_ld_json_extrahieren(html)
        self.assertIsNotNone(rezept)
        self.assertEqual(modul.als_text(rezept.get("name")), "Spaghetti Carbonara")
        self.assertEqual(modul.portionen_ermitteln(rezept.get("recipeYield")), 4)
        self.assertEqual(modul.kategorie_ermitteln(rezept.get("recipeCategory")), "Hauptgericht")
        zutaten = modul.zutaten_ermitteln(rezept.get("recipeIngredient"))
        self.assertEqual(len(zutaten), 4)
        self.assertIn("400 g Spaghetti", zutaten)
        schritte = modul.schritte_aus_instructions_ermitteln(rezept.get("recipeInstructions"))
        self.assertEqual(len(schritte), 3)
        self.assertEqual(schritte[0], "Spaghetti in Salzwasser kochen.")
        self.assertEqual(modul.bild_url_ermitteln(rezept.get("image")), "https://example.com/carbonara.jpg")


class TestGraphVerschachtelung(unittest.TestCase):
    def test_at_graph_mit_mehreren_knoten(self):
        # So liefern viele WordPress-SEO-Plugins (Yoast, Rank Math) ihre
        # Strukturdaten aus: ein einziges @graph-Array mit WebPage,
        # BreadcrumbList, Organization UND dem eigentlichen Recipe-Knoten.
        daten = {
            "@context": "https://schema.org",
            "@graph": [
                {"@type": "WebPage", "url": "https://example.com/rezept"},
                {"@type": "BreadcrumbList", "itemListElement": []},
                {
                    "@type": "Recipe",
                    "name": "Apfelkuchen",
                    "recipeYield": ["8"],
                    "recipeIngredient": ["500 g Äpfel", "300 g Mehl"],
                    "recipeInstructions": "Äpfel schälen.\nTeig kneten.\nBacken.",
                    "image": {"@type": "ImageObject", "url": "https://example.com/kuchen.jpg"},
                },
            ],
        }
        html = html_mit_ld_json(daten)
        rezept = modul.rezept_aus_ld_json_extrahieren(html)
        self.assertIsNotNone(rezept)
        self.assertEqual(modul.als_text(rezept.get("name")), "Apfelkuchen")
        self.assertEqual(modul.portionen_ermitteln(rezept.get("recipeYield")), 8)
        schritte = modul.schritte_aus_instructions_ermitteln(rezept.get("recipeInstructions"))
        self.assertEqual(schritte, ["Äpfel schälen.", "Teig kneten.", "Backen."])
        self.assertEqual(modul.bild_url_ermitteln(rezept.get("image")), "https://example.com/kuchen.jpg")


class TestHowToSection(unittest.TestCase):
    def test_verschachtelte_abschnitte(self):
        # WP Recipe Maker & ähnliche Plugins gruppieren Schritte manchmal in
        # HowToSection-Blöcke (z.B. "Teig" / "Füllung").
        instructions = [
            {
                "@type": "HowToSection",
                "name": "Teig",
                "itemListElement": [
                    {"@type": "HowToStep", "text": "Mehl und Butter verkneten."},
                    {"@type": "HowToStep", "text": "30 Minuten kühlen."},
                ],
            },
            {
                "@type": "HowToSection",
                "name": "Füllung",
                "itemListElement": [
                    {"@type": "HowToStep", "text": "Äpfel schneiden."},
                ],
            },
        ]
        schritte = modul.schritte_aus_instructions_ermitteln(instructions)
        self.assertEqual(
            schritte,
            ["Mehl und Butter verkneten.", "30 Minuten kühlen.", "Äpfel schneiden."],
        )


class TestBildVarianten(unittest.TestCase):
    def test_bild_als_liste_von_strings(self):
        self.assertEqual(
            modul.bild_url_ermitteln(["https://a.test/1.jpg", "https://a.test/2.jpg"]),
            "https://a.test/1.jpg",
        )

    def test_bild_als_liste_von_objekten(self):
        self.assertEqual(
            modul.bild_url_ermitteln([{"@type": "ImageObject", "url": "https://a.test/x.jpg"}]),
            "https://a.test/x.jpg",
        )

    def test_kein_bild(self):
        self.assertIsNone(modul.bild_url_ermitteln(None))


class TestPortionenVarianten(unittest.TestCase):
    def test_portionen_als_zahl(self):
        self.assertEqual(modul.portionen_ermitteln(6), 6)

    def test_portionen_als_bereich_liste(self):
        self.assertEqual(modul.portionen_ermitteln(["4", "6 Portionen"]), 4)

    def test_portionen_fehlt(self):
        self.assertIsNone(modul.portionen_ermitteln(None))


class TestFehlerfaelle(unittest.TestCase):
    def test_keine_ld_json_bloecke(self):
        html = "<html><body>Kein JSON-LD hier.</body></html>"
        self.assertIsNone(modul.rezept_aus_ld_json_extrahieren(html))

    def test_ld_json_ohne_recipe_typ(self):
        daten = {"@type": "Organization", "name": "Beispiel GmbH"}
        html = html_mit_ld_json(daten)
        self.assertIsNone(modul.rezept_aus_ld_json_extrahieren(html))

    def test_kaputtes_json_wird_uebersprungen(self):
        html = """<html><head>
        <script type="application/ld+json">{ das ist kein json }</script>
        <script type="application/ld+json">{"@type": "Recipe", "name": "Rettung"}</script>
        </head></html>"""
        rezept = modul.rezept_aus_ld_json_extrahieren(html)
        self.assertIsNotNone(rezept)
        self.assertEqual(rezept.get("name"), "Rettung")

    def test_typ_als_liste(self):
        daten = {"@type": ["Recipe", "NewsArticle"], "name": "Mehrfachtyp"}
        html = html_mit_ld_json(daten)
        rezept = modul.rezept_aus_ld_json_extrahieren(html)
        self.assertIsNotNone(rezept)
        self.assertEqual(rezept.get("name"), "Mehrfachtyp")


class TestHtmlZuTextFallback(unittest.TestCase):
    """Tests für den Fallback OHNE strukturierte Daten (feature 4): einfache
    HTML-zu-Text-Heuristik + Überschriften-Suche, synthetische HTML-
    Schnipsel OHNE jegliches JSON-LD."""

    def test_zutaten_als_ul_li_und_schritte_als_p(self):
        seite = """<html><head><title>Möhrensuppe mit Ingwer</title></head>
        <body>
        <h1>Möhrensuppe mit Ingwer</h1>
        <h2>Zutaten</h2>
        <ul>
          <li>500 g Möhren</li>
          <li>1 Stück Ingwer</li>
          <li>400 ml Gemüsebrühe</li>
        </ul>
        <h2>Zubereitung</h2>
        <p>Möhren schälen und in Stücke schneiden.</p>
        <p>Ingwer fein reiben und mit den Möhren andünsten.</p>
        <p>Mit Brühe auffüllen und 20 Minuten köcheln lassen.</p>
        </body></html>"""

        self.assertIsNone(modul.rezept_aus_ld_json_extrahieren(seite))
        text = modul.html_zu_text(seite)
        heuristik = modul.rezept_aus_text_heuristik_erkennen(text)
        self.assertEqual(len(heuristik["ingredients"]), 3)
        self.assertIn("500 g Möhren", heuristik["ingredients"])
        self.assertEqual(len(heuristik["steps"]), 3)
        self.assertTrue(heuristik["steps"][0].startswith("Möhren schälen"))
        self.assertEqual(modul.titel_aus_html_ermitteln(seite), "Möhrensuppe mit Ingwer")

    def test_zubereitung_als_nummerierte_ol(self):
        seite = """<html><head><title>Pancakes</title></head>
        <body>
        <h2>Ingredients</h2>
        <ul>
          <li>200 g flour</li>
          <li>2 eggs</li>
        </ul>
        <h2>Instructions</h2>
        <ol>
          <li>1. Mix everything together.</li>
          <li>2. Fry in a pan until golden.</li>
        </ol>
        </body></html>"""

        text = modul.html_zu_text(seite)
        heuristik = modul.rezept_aus_text_heuristik_erkennen(text)
        self.assertEqual(len(heuristik["ingredients"]), 2)
        self.assertEqual(len(heuristik["steps"]), 2)
        # Führende Nummerierung ("1.", "2.") wird entfernt, analog zur
        # JS-seitigen Text-Erkennung.
        self.assertFalse(heuristik["steps"][0][0].isdigit())
        self.assertTrue(heuristik["steps"][0].startswith("Mix everything"))

    def test_html_entities_werden_dekodiert(self):
        seite = "<p>Salz &amp; Pfeffer nach Geschmack &ndash; fertig.</p>"
        text = modul.html_zu_text(seite)
        self.assertIn("Salz & Pfeffer nach Geschmack", text)
        self.assertNotIn("&amp;", text)

    def test_script_und_style_werden_entfernt(self):
        seite = """<html><head><style>body { color: red; }</style>
        <script>console.log("sollte nicht im Text landen");</script></head>
        <body><h2>Zutaten</h2><ul><li>1 Ei</li></ul><h2>Zubereitung</h2><p>Kochen.</p></body></html>"""
        text = modul.html_zu_text(seite)
        self.assertNotIn("console.log", text)
        self.assertNotIn("color: red", text)
        heuristik = modul.rezept_aus_text_heuristik_erkennen(text)
        self.assertEqual(heuristik["ingredients"], ["1 Ei"])

    def test_ohne_erkennbare_ueberschriften_bleibt_leer(self):
        seite = "<html><head><title>Irgendeine Seite</title></head><body><p>Kein Rezept hier.</p></body></html>"
        text = modul.html_zu_text(seite)
        heuristik = modul.rezept_aus_text_heuristik_erkennen(text)
        self.assertEqual(heuristik["ingredients"], [])
        self.assertEqual(heuristik["steps"], [])

    def test_titel_ohne_title_tag_ist_none(self):
        self.assertIsNone(modul.titel_aus_html_ermitteln("<html><body>Kein Titel</body></html>"))


class TestHauptprogrammFallbackEndeZuEnde(unittest.TestCase):
    """End-to-End-Test von hauptprogramm() selbst (nicht nur der einzelnen
    Bausteine): seite_laden() wird gemockt (kein echter Netzwerk-Abruf
    nötig/möglich in dieser Sandbox), sys.argv gesetzt und die tatsächliche
    stdout-Ausgabe geparst - prüft, dass die Verdrahtung von JSON-LD-Fehlschlag
    -> Text-Fallback in hauptprogramm() wirklich greift."""

    def _hauptprogramm_ausfuehren(self, html_seite, url="https://beispiel.test/rezept"):
        import contextlib
        import io
        import unittest.mock as mock

        ausgabe = io.StringIO()
        with mock.patch.object(modul, "seite_laden", return_value=html_seite), \
             mock.patch.object(sys, "argv", ["rezeptbuch_url_import.py", url]), \
             contextlib.redirect_stdout(ausgabe):
            try:
                modul.hauptprogramm()
            except SystemExit:
                # fehler_ausgeben() beendet den Prozess regulär mit exit(0),
                # NACHDEM es sein Fehler-JSON bereits ausgegeben hat.
                pass
        return json.loads(ausgabe.getvalue())

    def test_seite_ohne_json_ld_nutzt_text_fallback(self):
        seite = """<html><head><title>Möhrensuppe</title></head><body>
        <h2>Zutaten</h2><ul><li>500 g Möhren</li><li>1 Zwiebel</li></ul>
        <h2>Zubereitung</h2><p>Möhren schälen.</p><p>Alles köcheln lassen.</p>
        </body></html>"""
        ergebnis = self._hauptprogramm_ausfuehren(seite)
        self.assertNotIn("error", ergebnis)
        self.assertEqual(ergebnis["title"], "Möhrensuppe")
        self.assertEqual(len(ergebnis["ingredients"]), 2)
        self.assertEqual(len(ergebnis["steps"]), 2)
        self.assertIsNone(ergebnis["servings"])
        self.assertIsNone(ergebnis["category"])
        self.assertIsNone(ergebnis["image"])

    def test_leeres_recipe_objekt_faellt_ebenfalls_auf_text_fallback_zurueck(self):
        # Ein gefundener Recipe-KNOTEN ohne jeglichen verwertbaren Inhalt darf
        # nicht einfach mit leeren Feldern durchgereicht werden, sondern soll
        # denselben Fallback-Pfad wie "gar kein JSON-LD gefunden" nehmen.
        seite = """<html><head><title>Testseite</title>
        <script type="application/ld+json">{"@type": "Recipe"}</script>
        </head><body>
        <h2>Zutaten</h2><ul><li>1 Prise Salz</li></ul>
        <h2>Zubereitung</h2><p>Würzen.</p>
        </body></html>"""
        ergebnis = self._hauptprogramm_ausfuehren(seite)
        self.assertNotIn("error", ergebnis)
        self.assertEqual(ergebnis["title"], "Testseite")
        self.assertEqual(ergebnis["ingredients"], ["1 Prise Salz"])
        self.assertEqual(ergebnis["steps"], ["Würzen."])

    def test_weder_json_ld_noch_ueberschriften_noch_titel_gibt_fehler(self):
        seite = "<html><head></head><body><p>Hier steht kein Rezept.</p></body></html>"
        ergebnis = self._hauptprogramm_ausfuehren(seite)
        self.assertIn("error", ergebnis)


class TestSsrfSchutz(unittest.TestCase):
    """_ziel_ist_sicher() verhindert, dass der (serverseitig auf dem
    Home-Assistant-Host laufende) URL-Import missbraucht wird, um andere im
    selben Netzwerk erreichbare Dienste abzufragen (SSRF)."""

    def test_localhost_wird_abgelehnt(self):
        with self.assertRaises(modul.UnsicheresZielError):
            modul._ziel_ist_sicher("http://localhost:8123/")

    def test_loopback_ip_wird_abgelehnt(self):
        with self.assertRaises(modul.UnsicheresZielError):
            modul._ziel_ist_sicher("http://127.0.0.1/admin")

    def test_privates_netz_wird_abgelehnt(self):
        with self.assertRaises(modul.UnsicheresZielError):
            modul._ziel_ist_sicher("http://192.168.1.1/")

    def test_link_local_wird_abgelehnt(self):
        with self.assertRaises(modul.UnsicheresZielError):
            modul._ziel_ist_sicher("http://169.254.169.254/")

    def test_oeffentliche_ip_wird_akzeptiert(self):
        # 93.184.216.34 = example.com - stellvertretend für eine echte
        # öffentliche Adresse, kein tatsächlicher Netzwerk-Abruf hier.
        self.assertTrue(modul._ziel_ist_sicher("http://93.184.216.34/rezept"))

    def test_ungueltiger_hostname_gibt_sprechenden_fehler(self):
        with self.assertRaises(modul.UnsicheresZielError):
            modul._ziel_ist_sicher("http://diese-domain-sollte-nicht-existieren.invalid/")

    def test_url_ohne_host_wird_abgelehnt(self):
        with self.assertRaises(modul.UnsicheresZielError):
            modul._ziel_ist_sicher("http:///pfad-ohne-host")


class TestHauptprogrammFehlerausgabe(unittest.TestCase):
    def test_ungueltige_url_gibt_fehler_json_zurueck(self):
        import subprocess

        ergebnis = subprocess.run(
            [sys.executable, os.path.join(SKRIPT_ORDNER, "rezeptbuch_url_import.py"), "keine-url"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        geparst = json.loads(ergebnis.stdout)
        self.assertIn("error", geparst)

    def test_fehlende_url_gibt_fehler_json_zurueck(self):
        import subprocess

        ergebnis = subprocess.run(
            [sys.executable, os.path.join(SKRIPT_ORDNER, "rezeptbuch_url_import.py")],
            capture_output=True,
            text=True,
            timeout=10,
        )
        geparst = json.loads(ergebnis.stdout)
        self.assertIn("error", geparst)

    def test_lokale_adresse_gibt_fehler_json_statt_abruf_zurueck(self):
        import subprocess

        ergebnis = subprocess.run(
            [sys.executable, os.path.join(SKRIPT_ORDNER, "rezeptbuch_url_import.py"), "http://127.0.0.1/geheim"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        geparst = json.loads(ergebnis.stdout)
        self.assertIn("error", geparst)


class TestSsrfWeiterleitungUndSchema(unittest.TestCase):
    """Ergänzungen zum SSRF-Schutz (1.6.1): Weiterleitungen werden bei jedem
    Schritt erneut geprüft, und nur http/https ist erlaubt."""

    def test_nicht_http_schemata_werden_abgelehnt(self):
        for url in ("ftp://example.com/rezept", "file:///etc/passwd", "gopher://example.com/"):
            with self.subTest(url=url), self.assertRaises(modul.UnsicheresZielError):
                modul._ziel_ist_sicher(url)

    def test_weiterleitung_auf_interne_adresse_wird_abgelehnt(self):
        """Ein lokaler Testserver spielt die "öffentliche" Seite, die per 302
        auf eine interne Adresse umleitet. Die erste Prüfung wird dafür
        gezielt durchgelassen (so wie sie es bei einer echten öffentlichen
        Seite täte) - die Prüfung des Weiterleitungsziels muss dann greifen,
        die interne Seite darf NICHT abgerufen werden."""
        import http.server
        import threading
        import unittest.mock as mock

        abgerufen = []

        class Server(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == "/weiter":
                    self.send_response(302)
                    self.send_header("Location", f"http://127.0.0.1:{port}/intern")
                    self.end_headers()
                else:
                    abgerufen.append(self.path)
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b"INTERN")

            def log_message(self, *args):
                pass

        server = http.server.HTTPServer(("127.0.0.1", 0), Server)
        port = server.server_port
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)

        echte_pruefung = modul._ziel_ist_sicher
        aufrufe = []

        def erste_url_gilt_als_oeffentlich(url):
            aufrufe.append(url)
            if len(aufrufe) == 1:
                return True
            return echte_pruefung(url)

        with mock.patch.object(modul, "_ziel_ist_sicher", side_effect=erste_url_gilt_als_oeffentlich):
            with self.assertRaises(modul.UnsicheresZielError):
                modul.seite_laden(f"http://127.0.0.1:{port}/weiter")
        self.assertEqual(len(aufrufe), 2, "Das Weiterleitungsziel muss erneut geprüft werden")
        self.assertEqual(abgerufen, [], "Die interne Seite darf nicht abgerufen worden sein")


class TestGzipBegrenzung(unittest.TestCase):
    def test_normale_gzip_seite_wird_entpackt(self):
        import gzip
        daten = gzip.compress("<html>Käsespätzle</html>".encode("utf-8"))
        self.assertEqual(
            modul._gzip_begrenzt_entpacken(daten, 1000).decode("utf-8"),
            "<html>Käsespätzle</html>",
        )

    def test_gzip_bombe_wird_abgebrochen(self):
        import gzip
        bombe = gzip.compress(b"0" * 20_000_000)  # ~20 KB komprimiert -> 20 MB entpackt
        self.assertLess(len(bombe), 100_000)
        with self.assertRaises(ValueError):
            modul._gzip_begrenzt_entpacken(bombe, 5 * 1024 * 1024)


if __name__ == "__main__":
    unittest.main(verbosity=2)
