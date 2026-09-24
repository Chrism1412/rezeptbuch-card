#!/usr/bin/env python3
"""
Rezeptbuch: Rezept per URL importieren.

Lädt eine vom Nutzer angegebene Rezept-Webseite serverseitig herunter (nur
serverseitig möglich, da der Browser CORS-Beschränkungen unterliegt) und
sucht darin nach eingebetteten schema.org/Recipe-Strukturdaten
(<script type="application/ld+json">). Diese Daten pflegen praktisch alle
großen Rezept-Webseiten selbst ein, weil Google sie für die Rezept-
Sternebewertungen in den Suchergebnissen ("Rich Snippets") voraussetzt -
sie sind deshalb i.d.R. zuverlässiger als das Parsen des sichtbaren Texts.

Findet sich KEIN schema.org/Recipe (oder eines ohne verwertbaren Inhalt),
wird als Fallback eine einfache HTML-zu-Text-Heuristik versucht (siehe
html_zu_text()/rezept_aus_text_heuristik_erkennen() unten): HTML grob in
Text umwandeln und über "Zutaten"/"Zubereitung"-Überschriften (deutsch oder
englisch) grob in Zutaten/Schritte aufteilen, Titel aus <title> lesen.
AUSDRÜCKLICH ungenauer als der JSON-LD-Pfad (u.a. keine Mengen-/Portionen-/
Kategorie-/Bild-Erkennung) - liefert aber meist mehr als nichts.

Gibt auf stdout GENAU EIN JSON-Objekt aus:
  Erfolg:  {"title": "...", "servings": 4, "category": "...",
            "ingredients": ["200 g Reis", ...], "steps": ["...", ...],
            "image": "https://..." oder null}
           (servings/category/image sind beim Text-Fallback immer null -
           die Karte übernimmt beim Einfügen ohnehin nur nicht-leere Felder)
  Fehler:  {"error": "Für Menschen lesbare Fehlermeldung"}

Kein Pyscript, keine externen Python-Pakete (nur Standardbibliothek) -
läuft als eigenständiges Skript über shell_command, exakt wie die übrigen
Rezeptbuch-Hilfsskripte in diesem Projekt. Es wird nichts an einen
Jinja-Template-Platzhalter zurückgegeben (Home Assistants 256-KB-Limit für
Template-Ausgaben) - der Rückgabeweg ist stattdessen shell_commands
"response_variable"-Mechanismus (stdout wird 1:1 als Service-Response
durchgereicht), der über {{ }} überhaupt nicht gerendert wird.
"""

import html
import ipaddress
import json
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
import zlib

MAX_BYTES = 5 * 1024 * 1024  # 5 MB Obergrenze für die geladene Seite
TIMEOUT_SEKUNDEN = 12

LD_JSON_MUSTER = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)

# ---------------------------------------------------------------------
# Fallback ohne strukturierte Daten (kein schema.org/Recipe gefunden):
# eine simple HTML-zu-Text-Heuristik + Überschriften-Suche, angelehnt an die
# JS-seitige rezeptAusTextErkennen()-Funktion, aber bewusst deutlich
# einfacher (keine Mengen-Erkennung/Unterüberschriften/Absatzgruppierung -
# das übernimmt beim Einfügen ins Formular ohnehin dieselbe JS-Funktion,
# sobald das Ergebnis dort als "Rezepttext" durchläuft). Dieser Fallback ist
# AUSDRÜCKLICH ungenauer als der JSON-LD-Pfad: er verlässt sich rein auf das
# Vorhandensein einer "Zutaten"/"Zubereitung"-Überschrift als Zeile im Text
# und auf simples HTML-Tag-Stripping, ohne die Seitenstruktur (Tabellen,
# CSS-Klassen usw.) zu verstehen. Er dient nur dazu, IRGENDETWAS Verwertbares
# zu liefern, wenn eine Seite gar keine schema.org-Daten einbettet - der
# Nutzer soll das Ergebnis danach im Formular prüfen, genau wie bei der
# JS-seitigen Text-Erkennung.
# ---------------------------------------------------------------------

SCRIPT_STYLE_MUSTER = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
# Block-Elemente, die inhaltlich für einen Zeilenumbruch stehen, werden VOR
# dem generischen Tag-Strip durch "\n" ersetzt - sonst würden z.B. mehrere
# <li>-Einträge einer Zutatenliste beim reinen Tag-Entfernen zu einer
# einzigen, unbrauchbaren Textzeile verschmelzen.
BLOCK_UMBRUCH_MUSTER = re.compile(
    r"</?(li|p|br|h[1-6]|tr|div|ul|ol)\b[^>]*>", re.IGNORECASE
)
BELIEBIGES_TAG_MUSTER = re.compile(r"<[^>]+>")
MEHRFACHE_LEERZEILEN_MUSTER = re.compile(r"\n\s*\n+")
TITLE_TAG_MUSTER = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)

HEADER_ZUTATEN_MUSTER = re.compile(r"^\s*(zutaten|ingredients?)\b", re.IGNORECASE)
HEADER_ZUBEREITUNG_MUSTER = re.compile(
    r"^\s*(zubereitung|anleitung|schritte|zubereitungsschritte|instructions?|directions?|method|steps)\s*:?\s*$",
    re.IGNORECASE,
)
NUMMER_PRAEFIX_MUSTER = re.compile(r"^\s*(\d+[.)]|[-*•])\s*")


def html_zu_text(html_text):
    """Reduziert eine HTML-Seite auf eine grobe Text-Näherung: Skripte/Styles
    entfernen, Block-Elemente als Zeilenumbruch werten, restliche Tags
    entfernen, HTML-Entities dekodieren, überflüssige Leerzeilen zusammenfassen."""
    ohne_script = SCRIPT_STYLE_MUSTER.sub(" ", html_text)
    mit_umbruechen = BLOCK_UMBRUCH_MUSTER.sub("\n", ohne_script)
    ohne_tags = BELIEBIGES_TAG_MUSTER.sub("", mit_umbruechen)
    entschluesselt = html.unescape(ohne_tags)
    zeilen = [zeile.strip() for zeile in entschluesselt.splitlines()]
    text = "\n".join(zeilen)
    return MEHRFACHE_LEERZEILEN_MUSTER.sub("\n", text).strip()


def titel_aus_html_ermitteln(html_text):
    treffer = TITLE_TAG_MUSTER.search(html_text)
    if not treffer:
        return None
    titel = html.unescape(re.sub(r"\s+", " ", treffer.group(1))).strip()
    return titel or None


def rezept_aus_text_heuristik_erkennen(text):
    """Simplerer Python-Gegenpart zur JS-Funktion rezeptAusTextErkennen():
    sucht eine "Zutaten"- und eine "Zubereitung"-Überschriftzeile (case-
    insensitiv, auch englisch) und wertet die Zeilen dazwischen als Zutaten,
    die danach als Zubereitungsschritte. OHNE Mengen-Erkennung, OHNE
    Unterüberschriften-Filterung - das übernimmt die Karte selbst, sobald
    dieses (Teil-)Ergebnis im Formular über "Rezepttext einfügen" nochmal
    durch rezeptAusTextErkennen() läuft. Hier reicht eine einfachere,
    robustere Heuristik, die nur die groben Blöcke trennt."""
    zeilen = text.split("\n")
    zutaten_start = None
    zubereitung_start = None
    for i, zeile in enumerate(zeilen):
        if zutaten_start is None and HEADER_ZUTATEN_MUSTER.search(zeile):
            zutaten_start = i
        elif zubereitung_start is None and HEADER_ZUBEREITUNG_MUSTER.search(zeile):
            zubereitung_start = i

    ingredients = []
    if zutaten_start is not None:
        ende = zubereitung_start if (zubereitung_start is not None and zubereitung_start > zutaten_start) else len(zeilen)
        for zeile in zeilen[zutaten_start + 1 : ende]:
            zeile = zeile.strip()
            if zeile:
                ingredients.append(zeile)

    steps = []
    if zubereitung_start is not None:
        for zeile in zeilen[zubereitung_start + 1 :]:
            zeile = zeile.strip()
            if zeile:
                steps.append(NUMMER_PRAEFIX_MUSTER.sub("", zeile).strip())

    return {"ingredients": ingredients, "steps": steps}


def fehler_ausgeben(nachricht):
    print(json.dumps({"error": nachricht}, ensure_ascii=False))
    sys.exit(0)


class UnsicheresZielError(ValueError):
    """Die URL zeigt (direkt oder über DNS aufgelöst) auf eine
    lokale/private/interne Adresse statt auf eine öffentliche Webseite."""


def _ziel_ist_sicher(url):
    """Sicherheitscheck gegen SSRF (Server-Side Request Forgery): der URL-
    Import läuft serverseitig auf dem Home-Assistant-Host selbst, nicht im
    Browser. Ohne diese Prüfung könnte eine eingegebene Adresse wie
    "http://localhost:8123/..." oder "http://192.168.1.1/..." dazu
    missbraucht werden, andere im selben (Heim-)Netzwerk erreichbare Dienste
    abzufragen und deren Antwort über das Rezeptformular auszulesen. Geprüft
    wird sowohl der Hostname selbst (falls direkt eine IP angegeben wurde)
    als auch JEDE Adresse, auf die er per DNS auflöst (verhindert simples
    Umgehen über z.B. "http://127.0.0.1.nip.io/...")."""
    geparst = urllib.parse.urlsplit(url)
    # Nur echte Webseiten: urllib beherrscht auch file://, ftp:// usw. -
    # für einen Rezept-Import gibt es dafür keinen legitimen Grund.
    if geparst.scheme.lower() not in ("http", "https"):
        raise UnsicheresZielError("Nur http:// und https://-Adressen werden unterstützt.")
    host = geparst.hostname
    if not host:
        raise UnsicheresZielError("Die Adresse enthält keinen gültigen Hostnamen.")

    try:
        adress_infos = socket.getaddrinfo(host, None)
    except socket.gaierror as fehler:
        raise UnsicheresZielError(f"Der Hostname konnte nicht aufgelöst werden ({fehler}).") from fehler

    for info in adress_infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise UnsicheresZielError(
                "Diese Adresse zeigt auf ein lokales/internes Ziel und wird aus "
                "Sicherheitsgründen nicht abgerufen."
            )
    return True


class _SichereWeiterleitung(urllib.request.HTTPRedirectHandler):
    """urllib folgt HTTP-Weiterleitungen (301/302/303/307/308) automatisch.
    Ohne diese Klasse würde _ziel_ist_sicher() nur die ursprünglich
    eingegebene URL prüfen - eine öffentliche Seite könnte dann einfach per
    Weiterleitung auf z.B. http://192.168.1.1/ umlenken und den SSRF-Schutz
    komplett umgehen. Hier wird deshalb JEDES Weiterleitungsziel erneut
    geprüft, bevor ihm gefolgt wird."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _ziel_ist_sicher(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_OPENER = urllib.request.build_opener(_SichereWeiterleitung)


def _gzip_begrenzt_entpacken(daten, max_bytes):
    """Wie gzip.decompress(), bricht aber ab, sobald die ENTPACKTE Größe
    max_bytes überschreitet. Schutz vor "Zip-Bomben": wenige MB komprimierte
    Daten können sonst auf mehrere GB anwachsen und den Arbeitsspeicher
    z.B. eines Raspberry Pi komplett füllen."""
    entpacker = zlib.decompressobj(16 + zlib.MAX_WBITS)  # 16+ = gzip-Header erwarten
    ergebnis = entpacker.decompress(daten, max_bytes + 1)
    if len(ergebnis) > max_bytes or entpacker.unconsumed_tail:
        raise ValueError("Entpackte Seite ist unerwartet groß - Abbruch zur Sicherheit.")
    return ergebnis


def seite_laden(url):
    _ziel_ist_sicher(url)
    request = urllib.request.Request(
        url,
        headers={
            # Ein realistischer Browser-User-Agent, da manche Seiten
            # Anfragen ohne einen solchen (z.B. von Skripten) blockieren.
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
    )
    with _OPENER.open(request, timeout=TIMEOUT_SEKUNDEN) as antwort:
        rohdaten = antwort.read(MAX_BYTES + 1)
        if len(rohdaten) > MAX_BYTES:
            raise ValueError("Seite ist unerwartet groß - Abbruch zur Sicherheit.")
        if antwort.info().get("Content-Encoding") == "gzip":
            rohdaten = _gzip_begrenzt_entpacken(rohdaten, MAX_BYTES)
        kodierung = antwort.headers.get_content_charset() or "utf-8"
        try:
            return rohdaten.decode(kodierung, errors="replace")
        except LookupError:
            return rohdaten.decode("utf-8", errors="replace")


def _ist_liste_oder_dict(wert):
    return isinstance(wert, (list, dict))


def rezept_objekt_suchen(knoten):
    """Durchsucht rekursiv ein geparstes JSON-LD-Objekt nach einem Knoten
    mit "@type" == "Recipe" (auch als Liste, z.B. ["Recipe", "NewsArticle"]),
    inklusive @graph-Verschachtelung, wie sie viele WordPress-Rezept-Plugins
    (z.B. WP Recipe Maker) erzeugen."""
    if isinstance(knoten, list):
        for eintrag in knoten:
            treffer = rezept_objekt_suchen(eintrag)
            if treffer:
                return treffer
        return None

    if isinstance(knoten, dict):
        typ = knoten.get("@type")
        if typ == "Recipe" or (isinstance(typ, list) and "Recipe" in typ):
            return knoten
        if "@graph" in knoten:
            treffer = rezept_objekt_suchen(knoten["@graph"])
            if treffer:
                return treffer
        # Manche Seiten verschachteln das Rezept noch eine Ebene tiefer
        # (z.B. unter "mainEntity" bei manchen Blog-Templates).
        if "mainEntity" in knoten:
            treffer = rezept_objekt_suchen(knoten["mainEntity"])
            if treffer:
                return treffer
    return None


def als_text(wert):
    if wert is None:
        return ""
    if isinstance(wert, str):
        return wert.strip()
    if isinstance(wert, (int, float)):
        return str(wert)
    return ""


def portionen_ermitteln(recipe_yield):
    # recipeYield ist laut schema.org mal eine Zahl, mal ein String
    # ("4 Portionen"), mal eine Liste solcher Strings (Bereich wie
    # ["4", "6"]) - wir nehmen den ersten gefundenen Zahlenwert.
    if isinstance(recipe_yield, list):
        for eintrag in recipe_yield:
            zahl = portionen_ermitteln(eintrag)
            if zahl:
                return zahl
        return None
    text = als_text(recipe_yield)
    treffer = re.search(r"\d+", text)
    return int(treffer.group()) if treffer else None


def kategorie_ermitteln(recipe_category):
    if isinstance(recipe_category, list):
        for eintrag in recipe_category:
            text = als_text(eintrag)
            if text:
                return text
        return None
    text = als_text(recipe_category)
    return text or None


def bild_url_ermitteln(image_feld):
    # image kann laut schema.org ein String, eine Liste von Strings, ein
    # ImageObject ({"@type": "ImageObject", "url": "..."}) oder eine Liste
    # solcher Objekte sein. Nur die URL wird übernommen - das Bild selbst
    # wird NICHT heruntergeladen (das übernimmt beim Speichern automatisch
    # die bereits vorhandene, generische Bildlade-Logik der Karte, die
    # jede externe URL und jede Datei gleich behandelt).
    if isinstance(image_feld, list):
        for eintrag in image_feld:
            url = bild_url_ermitteln(eintrag)
            if url:
                return url
        return None
    if isinstance(image_feld, dict):
        return als_text(image_feld.get("url")) or None
    text = als_text(image_feld)
    return text or None


def zutaten_ermitteln(recipe_ingredient):
    if not isinstance(recipe_ingredient, list):
        return []
    ergebnis = []
    for eintrag in recipe_ingredient:
        text = als_text(eintrag)
        if text:
            ergebnis.append(text)
    return ergebnis


def schritte_aus_instructions_ermitteln(instructions):
    """recipeInstructions ist laut schema.org eines von:
    - ein einzelner String (ggf. mit Zeilenumbrüchen/Nummerierung)
    - eine Liste von Strings
    - eine Liste von HowToStep-Objekten ({"@type": "HowToStep", "text": "..."})
    - eine Liste von HowToSection-Objekten, die selbst wieder
      "itemListElement" (eine Liste von HowToStep) enthalten
    Wird hier vollständig rekursiv zu einer flachen Liste von Schritt-Texten
    aufgelöst."""
    ergebnis = []

    def verarbeiten(wert):
        if wert is None:
            return
        if isinstance(wert, str):
            text = wert.strip()
            if text:
                # Ein einzelner String kann bereits mehrere, durch
                # Zeilenumbruch getrennte Schritte enthalten.
                for zeile in text.splitlines():
                    zeile = zeile.strip()
                    if zeile:
                        ergebnis.append(zeile)
            return
        if isinstance(wert, list):
            for eintrag in wert:
                verarbeiten(eintrag)
            return
        if isinstance(wert, dict):
            typ = wert.get("@type")
            if typ == "HowToSection" or "itemListElement" in wert:
                verarbeiten(wert.get("itemListElement"))
                return
            # HowToStep (oder ein unbekannter, aber "text"-tragender Typ)
            text = als_text(wert.get("text"))
            if text:
                ergebnis.append(text)
            return

    verarbeiten(instructions)
    return ergebnis


def rezept_aus_ld_json_extrahieren(html):
    bloecke = LD_JSON_MUSTER.findall(html)
    if not bloecke:
        return None

    for roh in bloecke:
        roh = roh.strip()
        if not roh:
            continue
        try:
            geparst = json.loads(roh)
        except json.JSONDecodeError:
            # Manche Seiten betten mehrere, durch Kommas getrennte
            # JSON-Objekte in einem einzigen Script-Tag ein (kein valides
            # JSON für sich genommen) - als Array-Versuch nachholen.
            try:
                geparst = json.loads(f"[{roh}]")
            except json.JSONDecodeError:
                continue

        rezept = rezept_objekt_suchen(geparst)
        if rezept:
            return rezept

    return None


def hauptprogramm():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        fehler_ausgeben("Keine URL angegeben.")

    url = sys.argv[1].strip()
    if not re.match(r"^https?://", url, re.IGNORECASE):
        fehler_ausgeben("Das ist keine gültige http(s)-URL.")

    try:
        html = seite_laden(url)
    except UnsicheresZielError as e:
        fehler_ausgeben(str(e))
    except urllib.error.HTTPError as e:
        fehler_ausgeben(f"Die Seite hat einen Fehler gemeldet (HTTP {e.code}).")
    except urllib.error.URLError as e:
        fehler_ausgeben(f"Die Seite konnte nicht erreicht werden ({e.reason}).")
    except Exception as e:  # noqa: BLE001 - bewusst breit, siehe Docstring
        fehler_ausgeben(f"Unerwarteter Fehler beim Laden der Seite: {e}")

    try:
        rezept = rezept_aus_ld_json_extrahieren(html)
    except Exception as e:  # noqa: BLE001
        fehler_ausgeben(f"Unerwarteter Fehler beim Auswerten der Seite: {e}")

    if rezept:
        ergebnis = {
            "title": als_text(rezept.get("name")) or None,
            "servings": portionen_ermitteln(rezept.get("recipeYield")),
            "category": kategorie_ermitteln(rezept.get("recipeCategory")),
            "ingredients": zutaten_ermitteln(rezept.get("recipeIngredient")),
            "steps": schritte_aus_instructions_ermitteln(rezept.get("recipeInstructions")),
            "image": bild_url_ermitteln(rezept.get("image")),
        }
        if ergebnis["title"] or ergebnis["ingredients"] or ergebnis["steps"]:
            print(json.dumps(ergebnis, ensure_ascii=False))
            return
        # Rezept-Knoten gefunden, aber ohne verwertbaren Inhalt (leeres
        # Recipe-Objekt) - wie bei "kein Recipe-Knoten gefunden" auf den
        # Text-Fallback unten ausweichen, statt sofort aufzugeben.

    # Fallback: KEIN (verwertbares) schema.org/Recipe gefunden - stattdessen
    # eine einfache HTML-zu-Text-Heuristik versuchen (siehe html_zu_text()/
    # rezept_aus_text_heuristik_erkennen() oben). Deutlich ungenauer als der
    # JSON-LD-Pfad (keine Mengen-Trennung, keine verlässliche Portionen-/
    # Kategorie-/Bild-Erkennung), aber besser als komplett leer auszugeben,
    # wenn eine Seite keine Strukturdaten einbettet.
    try:
        text = html_zu_text(html)
        heuristik = rezept_aus_text_heuristik_erkennen(text)
        titel = titel_aus_html_ermitteln(html)
    except Exception as e:  # noqa: BLE001
        fehler_ausgeben(f"Unerwarteter Fehler beim Auswerten der Seite: {e}")

    ergebnis = {
        "title": titel,
        "servings": None,
        "category": None,
        "ingredients": heuristik["ingredients"],
        "steps": heuristik["steps"],
        "image": None,
    }

    if not ergebnis["title"] and not ergebnis["ingredients"] and not ergebnis["steps"]:
        fehler_ausgeben(
            "Auf dieser Seite wurden weder strukturierte Rezeptdaten "
            "(schema.org/Recipe) noch über die einfache Text-Heuristik "
            "verwertbare Zutaten/Schritte gefunden. Manche Seiten blockieren "
            "automatisierte Abrufe. Bitte stattdessen den Rezepttext von Hand "
            "kopieren und über 'Rezepttext einfügen' verwenden."
        )

    print(json.dumps(ergebnis, ensure_ascii=False))


if __name__ == "__main__":
    hauptprogramm()
