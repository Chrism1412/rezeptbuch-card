#!/usr/bin/env python3
"""
Rezeptbuch – ein Rezept dauerhaft aus ALLEN Backup-Dateien entfernen.

Speicherort auf dem Home-Assistant-System:
/config/scripts/rezeptbuch_backup_bereinigen.py

Hintergrund: Löscht man ein Rezept nur über die Karte, verschwindet es aus
todo.rezepte - es steckt aber weiterhin in allen BEREITS VORHANDENEN
Backup-Dateien unter /config/Backup-Rezepte/. Spielt man später eines dieser
alten Backups wieder ein (rezeptbuch_restore.py), sieht dessen Abgleich
"Titel fehlt aktuell" und fügt das eigentlich gelöschte Rezept ungewollt
wieder hinzu. Dieses Skript entfernt einen Rezepttitel gezielt aus JEDER
vorhandenen Backup-Datei, damit er auch bei einem künftigen Restore nicht
mehr zurückkehren kann.

Aufruf: python3 rezeptbuch_backup_bereinigen.py "<Rezepttitel>"
  z. B. python3 rezeptbuch_backup_bereinigen.py "24h Pizzateig"

WICHTIG - Abgleich wie bei rezeptbuch_restore.py:
Es wird exakt nach dem Titel (dem "summary"-Feld) verglichen, GROSS-/
Kleinschreibung wird dabei unterschieden - der Titel muss exakt so
eingegeben werden, wie er in Home Assistant/den Backups steht. Ein Objekt
pro Treffer wird aus dem jeweiligen Backup-Array entfernt; existieren
zufällig mehrere Rezepte mit demselben Titel in einer Datei (kommt in der
Praxis kaum vor, ist aber möglich, falls zwei Rezepte gleich benannt
wurden), werden ALLE Treffer entfernt - bewusst so, weil ein verwaister
gleichnamiger Backup-Eintrag ohnehin nicht mehr sinnvoll unterscheidbar wäre.

Backup-Dateien, in denen der Titel gar nicht vorkam, bleiben unangetastet
(keine unnötigen Schreibvorgänge). Eine Backup-Datei wird nach dem Entfernen
NICHT komplett gelöscht, auch wenn sie danach leer ist ("[]") - sie bleibt
als (dann leerer) Tagesschnappschuss bestehen, bis sie regulär nach 30 Tagen
automatisch aufgeräumt wird (siehe rezeptbuch_backup.py).

Verwendet wie die anderen Rezeptbuch-Skripte nur die Python-Standard-
bibliothek, kein Zugriff auf Home Assistant selbst nötig (reine
Dateisystem-Operation auf dem Backup-Ordner).
"""
import glob
import json
import os
import sys
from datetime import datetime

BACKUP_ORDNER = "/config/Backup-Rezepte"
LOG_DATEI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rezeptbuch_backup_bereinigen.log")


def _log(log, text):
    log.write(f"{datetime.now()}: {text}\n")


def _titel_aus_allen_backups_entfernen(titel, backup_ordner=BACKUP_ORDNER):
    """Entfernt alle Einträge mit passendem Titel aus jeder Backup-Datei im
    angegebenen Ordner. Gibt (bearbeitete_dateien, entfernte_eintraege) zurück -
    reine Hilfsfunktion ohne Logging/IO-Nebenwirkungen außer dem eigentlichen
    Dateischreiben, damit sie sich in Tests einfach mit einem temporären
    Ordner aufrufen lässt."""
    bearbeitete_dateien = 0
    entfernte_eintraege = 0

    for pfad in sorted(glob.glob(os.path.join(backup_ordner, "rezepte-backup-*.json"))):
        with open(pfad, "r", encoding="utf-8") as f:
            rezepte = json.load(f)

        gefiltert = [r for r in rezepte if r.get("summary", "") != titel]
        anzahl_entfernt = len(rezepte) - len(gefiltert)

        if anzahl_entfernt == 0:
            continue

        with open(pfad, "w", encoding="utf-8") as f:
            json.dump(gefiltert, f, ensure_ascii=False, indent=2)

        bearbeitete_dateien += 1
        entfernte_eintraege += anzahl_entfernt

    return bearbeitete_dateien, entfernte_eintraege


def main():
    with open(LOG_DATEI, "a", encoding="utf-8") as log:
        try:
            if len(sys.argv) < 2 or not sys.argv[1].strip():
                raise ValueError("Kein Rezepttitel angegeben")
            titel = sys.argv[1].strip()

            if not os.path.isdir(BACKUP_ORDNER):
                _log(log, f"Backup-Ordner {BACKUP_ORDNER} existiert nicht - nichts zu tun")
                return

            bearbeitete_dateien, entfernte_eintraege = _titel_aus_allen_backups_entfernen(titel)

            if entfernte_eintraege == 0:
                _log(log, f"'{titel}' wurde in keiner Backup-Datei gefunden - nichts entfernt")
            else:
                _log(
                    log,
                    f"'{titel}' entfernt: {entfernte_eintraege} Eintrag/Einträge in "
                    f"{bearbeitete_dateien} Backup-Datei(en) bereinigt",
                )

        except Exception as fehler:
            _log(log, f"FEHLER: {fehler}")
            raise


if __name__ == "__main__":
    main()
