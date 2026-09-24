#!/usr/bin/env python3
"""
Rezeptbuch – tägliches Backup-Skript (v2).

Speicherort auf dem Home-Assistant-System: /config/scripts/rezeptbuch_backup.py

Wird von der Automatisierung "Rezeptbuch: Tägliches Backup" täglich um 23:59 Uhr
über shell_command aufgerufen - OHNE Argumente. Das Skript holt sich die
Rezeptdaten selbst direkt über die Home-Assistant-REST-API (todo.get_items mit
return_response) und schreibt sie als datierte Backup-Datei nach
/config/Backup-Rezepte/. Backups, die älter als 30 Tage sind, werden dabei
automatisch gelöscht.

WICHTIG - warum kein Datentransport mehr über die Automatisierungs-YAML:
Frühere Version übergab die Rezepte (inkl. Base64-kodierter Fotos) als
base64-Text über eine Jinja-Vorlage an shell_command. Home Assistant begrenzt
die Ausgabe einer einzelnen Jinja-Vorlage aber hart auf 262144 Zeichen (256 KB)
- bei mehreren Rezepten mit Fotos wird das JSON schnell größer, die
Automatisierung brach dann mit "Template output exceeded maximum size" ab.
Diese Version umgeht das Problem komplett, indem sie gar keine große
Datenmenge mehr durch eine Vorlage schickt: Das Skript ruft die Daten direkt
per HTTP von Home Assistant selbst ab.

Voraussetzung: Eine Long-Lived-Access-Token-Datei unter
/config/scripts/rezeptbuch_backup_token.txt (nur der Token, keine Anführungs-
zeichen, siehe Installationsanleitung).

Bewusst als normales Python-3-Skript geschrieben (kein Pyscript) und bewusst
nur mit der Python-Standardbibliothek (kein "requests"), damit es ohne
zusätzliche pip-Installation auf dem Home-Assistant-System läuft.
"""
import glob
import json
import os
import urllib.error
import urllib.request
from datetime import datetime

BACKUP_ORDNER = "/config/Backup-Rezepte"
AUFBEWAHRUNG_TAGE = 30
TOKEN_DATEI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rezeptbuch_backup_token.txt")
HA_BASIS_URL = "http://localhost:8123"
ENTITY_ID = "todo.rezepte"


def _log(log, text):
    log.write(f"{datetime.now()}: {text}\n")


def _token_lesen():
    with open(TOKEN_DATEI, "r", encoding="utf-8") as f:
        token = f.read().strip()
    if not token:
        raise ValueError("Token-Datei ist leer")
    return token


def _rezepte_abrufen(token):
    url = f"{HA_BASIS_URL}/api/services/todo/get_items?return_response"
    body = json.dumps({"entity_id": ENTITY_ID}).encode("utf-8")
    anfrage = urllib.request.Request(url, data=body, method="POST")
    anfrage.add_header("Authorization", f"Bearer {token}")
    anfrage.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(anfrage, timeout=30) as antwort:
        daten = json.loads(antwort.read().decode("utf-8"))
    return daten["service_response"][ENTITY_ID]["items"]


def main():
    log_pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rezeptbuch_backup.log")

    with open(log_pfad, "a", encoding="utf-8") as log:
        try:
            token = _token_lesen()
            rezepte = _rezepte_abrufen(token)

            os.makedirs(BACKUP_ORDNER, exist_ok=True)

            heute = datetime.now().strftime("%Y-%m-%d")
            dateipfad = os.path.join(BACKUP_ORDNER, f"rezepte-backup-{heute}.json")
            with open(dateipfad, "w", encoding="utf-8") as f:
                json.dump(rezepte, f, ensure_ascii=False, indent=2)

            _log(log, f"Backup geschrieben ({len(rezepte)} Rezepte) -> {dateipfad}")

            # Alte Backups aufräumen (älter als 30 Tage, nach Änderungsdatum)
            jetzt = datetime.now().timestamp()
            for datei in glob.glob(os.path.join(BACKUP_ORDNER, "rezepte-backup-*.json")):
                alter_tage = (jetzt - os.path.getmtime(datei)) / 86400
                if alter_tage > AUFBEWAHRUNG_TAGE:
                    os.remove(datei)
                    _log(log, f"Altes Backup gelöscht ({alter_tage:.1f} Tage alt) -> {datei}")

        except FileNotFoundError:
            _log(log, f"FEHLER: Token-Datei nicht gefunden ({TOKEN_DATEI}). "
                       f"Long-Lived-Access-Token dort als reinen Text hinterlegen.")
            raise
        except urllib.error.HTTPError as fehler:
            fehlertext = fehler.read().decode("utf-8", "ignore")
            _log(log, f"FEHLER: HTTP {fehler.code} beim Abrufen der Rezepte: {fehlertext}")
            raise
        except Exception as fehler:
            _log(log, f"FEHLER: {fehler}")
            raise


if __name__ == "__main__":
    main()
