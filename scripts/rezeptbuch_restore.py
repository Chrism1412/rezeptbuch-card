#!/usr/bin/env python3
"""
Rezeptbuch – Backup wiederherstellen.

Speicherort auf dem Home-Assistant-System: /config/scripts/rezeptbuch_restore.py

Wird über das Skript "Rezeptbuch: Backup wiederherstellen" (scripts.yaml)
aufgerufen und liest eine Backup-Datei aus /config/Backup-Rezepte/, die zuvor
von rezeptbuch_backup.py geschrieben wurde.

Aufruf: python3 rezeptbuch_restore.py <Datum oder "neuestes">
  z. B. python3 rezeptbuch_restore.py 2026-09-18
  oder  python3 rezeptbuch_restore.py neuestes

WICHTIG - Sicherheitsverhalten (bewusst konservativ):
Es werden NUR Rezepte hinzugefügt, deren Titel (summary) aktuell NICHT in
todo.rezepte vorhanden ist. Bereits vorhandene Rezepte werden NIE überschrieben
oder verändert - Restore kann also nur ergänzen, niemals aktuelle Bearbeitungen,
Bewertungen oder Kommentare kaputt machen. Das ist gedacht, um versehentlich
gelöschte Rezepte wiederherzustellen, nicht um auf einen alten Stand
"zurückzuspulen".

Verwendet wie rezeptbuch_backup.py nur die Python-Standardbibliothek und die
Home-Assistant-REST-API mit demselben Long-Lived-Access-Token
(/config/scripts/rezeptbuch_backup_token.txt).
"""
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime

BACKUP_ORDNER = "/config/Backup-Rezepte"
TOKEN_DATEI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rezeptbuch_backup_token.txt")
LOG_DATEI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rezeptbuch_restore.log")
HA_BASIS_URL = "http://localhost:8123"
ENTITY_ID = "todo.rezepte"

DATUM_MUSTER = re.compile(r"^\d{4}-\d{2}-\d{2}$")


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


def _backup_datei_ermitteln(datums_argument):
    if datums_argument == "neuestes":
        dateien = sorted(glob.glob(os.path.join(BACKUP_ORDNER, "rezepte-backup-*.json")))
        if not dateien:
            raise FileNotFoundError(f"Kein Backup in {BACKUP_ORDNER} gefunden")
        return dateien[-1]

    if not DATUM_MUSTER.match(datums_argument):
        raise ValueError(
            f"Ungültiges Datumsformat: {datums_argument!r} (erwartet JJJJ-MM-TT oder 'neuestes')"
        )
    pfad = os.path.join(BACKUP_ORDNER, f"rezepte-backup-{datums_argument}.json")
    if not os.path.isfile(pfad):
        raise FileNotFoundError(f"Backup-Datei nicht gefunden: {pfad}")
    return pfad


def main():
    with open(LOG_DATEI, "a", encoding="utf-8") as log:
        try:
            datums_argument = sys.argv[1].strip() if len(sys.argv) > 1 else "neuestes"

            backup_pfad = _backup_datei_ermitteln(datums_argument)
            with open(backup_pfad, "r", encoding="utf-8") as f:
                backup_rezepte = json.load(f)

            token = _token_lesen()
            aktuelle_rezepte = _aktuelle_rezepte_abrufen(token)
            vorhandene_titel = {r.get("summary", "") for r in aktuelle_rezepte}

            wiederhergestellt = 0
            uebersprungen = 0
            fehlgeschlagen = 0

            for rezept in backup_rezepte:
                titel = rezept.get("summary", "")
                if not titel:
                    fehlgeschlagen += 1
                    _log(log, "FEHLER: Eintrag ohne Titel übersprungen")
                    continue

                if titel in vorhandene_titel:
                    uebersprungen += 1
                    continue

                daten = {"entity_id": ENTITY_ID, "item": titel}
                beschreibung = rezept.get("description")
                if beschreibung:
                    daten["description"] = beschreibung

                try:
                    _ha_service_aufrufen(token, "todo", "add_item", daten)
                    wiederhergestellt += 1
                    vorhandene_titel.add(titel)
                except urllib.error.HTTPError as fehler:
                    fehlgeschlagen += 1
                    fehlertext = fehler.read().decode("utf-8", "ignore")
                    _log(log, f"FEHLER beim Wiederherstellen von '{titel}': HTTP {fehler.code} {fehlertext}")

            _log(
                log,
                f"Wiederherstellung aus {backup_pfad} abgeschlossen: "
                f"{wiederhergestellt} wiederhergestellt, {uebersprungen} bereits vorhanden (übersprungen), "
                f"{fehlgeschlagen} fehlgeschlagen",
            )

        except Exception as fehler:
            _log(log, f"FEHLER: {fehler}")
            raise


if __name__ == "__main__":
    main()
