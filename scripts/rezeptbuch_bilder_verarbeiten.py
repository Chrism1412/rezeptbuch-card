#!/usr/bin/env python3
"""
Rezeptbuch – Fotos aus dem JSON in echte Dateien auslagern.

Speicherort auf dem Home-Assistant-System: /config/scripts/rezeptbuch_bilder_verarbeiten.py

Bisher wurden Rezeptfotos als Base64-Text direkt im "description"-Feld jedes
To-do-Items gespeichert. Das funktioniert, hat aber zwei Nachteile:
  - Base64 ist ca. 33% größer als die Originaldatei.
  - JEDES Foto wird bei JEDEM Laden der Rezeptliste mit heruntergeladen,
    auch wenn nur die Übersicht (nicht das Detail) angezeigt wird.

Dieses Skript verschiebt vorhandene Base64-Fotos in echte Dateien unter
/config/www/rezeptbuch-bilder/ (von Home Assistant automatisch unter
/local/rezeptbuch-bilder/... erreichbar) und ersetzt das "image"-Feld im
Rezept-JSON durch den Dateipfad statt der eingebetteten Bilddaten.

WICHTIG - warum kein Jinja/shell_command-Argument für die Bilddaten:
Genau wie beim ursprünglichen Backup-Problem (Home Assistants 256-KB-Limit
für Jinja-Vorlagen-Ausgaben) würden Bilddaten, die durch eine Automatisierungs-
Vorlage geschickt werden, früher oder später an dieses Limit stoßen. Dieses
Skript umgeht das komplett: Es ruft sich ALLE Daten selbst per REST-API ab
(wie rezeptbuch_backup.py) und wird ohne jegliche Argumente aufgerufen -
es läuft also nie eine große Datenmenge durch eine Vorlage.

Das Skript ist idempotent (mehrfacher Aufruf ist ungefährlich):
  - Rezepte mit bereits ausgelagertem Foto (Pfad statt Base64) werden übersprungen.
  - Rezepte ohne Foto werden übersprungen.
  - Verwaiste Bilddateien (kein Rezept verweist mehr darauf, z.B. weil das
    Rezept gelöscht oder das Foto entfernt/ersetzt wurde) werden aufgeräumt.

Aufruf: python3 rezeptbuch_bilder_verarbeiten.py
  - Ohne Argumente: verarbeitet alle Rezepte (Migration bestehender Fotos UND
    laufender Betrieb nach jedem neuen Foto-Upload - beides derselbe Vorgang).
"""
import base64
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime

BILD_ORDNER = "/config/www/rezeptbuch-bilder"
TOKEN_DATEI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rezeptbuch_backup_token.txt")
LOG_DATEI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rezeptbuch_bilder.log")
HA_BASIS_URL = "http://localhost:8123"
ENTITY_ID = "todo.rezepte"

DATA_URI_MUSTER = re.compile(r"^data:image/([a-zA-Z0-9.+-]+);base64,(.*)$", re.DOTALL)

# Home Assistant serviert /config/www/ automatisch unter /local/ - kein
# eigener Webserver oder eine zusätzliche Konfiguration nötig.
LOKALER_PFAD_PRAEFIX = "/local/rezeptbuch-bilder/"


def _log(log, text):
    log.write(f"{datetime.now()}: {text}\n")


def _token_lesen():
    with open(TOKEN_DATEI, "r", encoding="utf-8") as f:
        token = f.read().strip()
    if not token:
        raise ValueError("Token-Datei ist leer")
    return token


def _ha_service_aufrufen(token, domain, service, daten, return_response=False):
    url = f"{HA_BASIS_URL}/api/services/{domain}/{service}"
    if return_response:
        url += "?return_response"
    body = json.dumps(daten).encode("utf-8")
    anfrage = urllib.request.Request(url, data=body, method="POST")
    anfrage.add_header("Authorization", f"Bearer {token}")
    anfrage.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(anfrage, timeout=30) as antwort:
        rohtext = antwort.read().decode("utf-8")
    return json.loads(rohtext) if rohtext else {}


def _aktuelle_rezepte_abrufen(token):
    daten = _ha_service_aufrufen(token, "todo", "get_items", {"entity_id": ENTITY_ID}, return_response=True)
    return daten["service_response"][ENTITY_ID]["items"]


def main():
    with open(LOG_DATEI, "a", encoding="utf-8") as log:
        try:
            os.makedirs(BILD_ORDNER, exist_ok=True)
            token = _token_lesen()
            rezepte = _aktuelle_rezepte_abrufen(token)

            ausgelagert = 0
            bereits_migriert = 0
            ohne_bild = 0
            fehlgeschlagen = 0
            referenzierte_dateinamen = set()

            for item in rezepte:
                titel = item.get("summary", "")
                uid = item.get("uid")
                try:
                    beschreibung = json.loads(item.get("description") or "{}")
                except (json.JSONDecodeError, TypeError):
                    beschreibung = {}

                bild = beschreibung.get("image")

                if not bild:
                    ohne_bild += 1
                    continue

                if bild.startswith(LOKALER_PFAD_PRAEFIX):
                    # Bereits ausgelagert - Dateiname für die Aufräum-Prüfung merken.
                    referenzierte_dateinamen.add(os.path.basename(bild))
                    bereits_migriert += 1
                    continue

                treffer = DATA_URI_MUSTER.match(bild)
                if not treffer:
                    # Weder Datei-Pfad noch erkennbare Data-URI - unverändert lassen,
                    # aber als Fehler loggen, damit es auffällt.
                    fehlgeschlagen += 1
                    _log(log, f"WARNUNG: Unbekanntes Bildformat bei '{titel}' - übersprungen")
                    continue

                dateiendung, base64_daten = treffer.groups()
                dateiendung = "jpg" if dateiendung in ("jpeg", "jpg") else dateiendung
                dateiname = f"{uid}.{dateiendung}"
                dateipfad = os.path.join(BILD_ORDNER, dateiname)

                try:
                    rohbild = base64.b64decode(base64_daten)
                    with open(dateipfad, "wb") as bilddatei:
                        bilddatei.write(rohbild)

                    neuer_pfad = f"{LOKALER_PFAD_PRAEFIX}{dateiname}"
                    beschreibung["image"] = neuer_pfad
                    _ha_service_aufrufen(token, "todo", "update_item", {
                        "entity_id": ENTITY_ID,
                        "item": uid,
                        "description": json.dumps(beschreibung, ensure_ascii=False),
                    })

                    referenzierte_dateinamen.add(dateiname)
                    ausgelagert += 1
                    _log(log, f"Foto ausgelagert für '{titel}' -> {neuer_pfad}")
                except Exception as fehler:
                    fehlgeschlagen += 1
                    _log(log, f"FEHLER beim Auslagern des Fotos für '{titel}': {fehler}")

            # Verwaiste Dateien aufräumen (Rezept gelöscht oder Foto entfernt/ersetzt).
            aufgeraeumt = 0
            if os.path.isdir(BILD_ORDNER):
                for datei in os.listdir(BILD_ORDNER):
                    if datei not in referenzierte_dateinamen:
                        try:
                            os.remove(os.path.join(BILD_ORDNER, datei))
                            aufgeraeumt += 1
                            _log(log, f"Verwaiste Bilddatei gelöscht (kein Rezept verweist mehr darauf): {datei}")
                        except OSError as fehler:
                            _log(log, f"FEHLER beim Löschen der verwaisten Datei {datei}: {fehler}")

            _log(
                log,
                f"Durchlauf abgeschlossen: {ausgelagert} ausgelagert, {bereits_migriert} bereits vorher migriert, "
                f"{ohne_bild} ohne Foto, {fehlgeschlagen} fehlgeschlagen, {aufgeraeumt} verwaiste Datei(en) aufgeräumt",
            )

        except Exception as fehler:
            _log(log, f"FEHLER: {fehler}")
            raise


if __name__ == "__main__":
    main()
