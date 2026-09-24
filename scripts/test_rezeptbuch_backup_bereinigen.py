#!/usr/bin/env python3
"""
Tests für rezeptbuch_backup_bereinigen.py.

Arbeitet auf einem temporären Ordner statt auf dem echten
/config/Backup-Rezepte/, damit die Tests überall (auch außerhalb von Home
Assistant) gefahrlos laufen. Nur Python-Standardbibliothek, wie das
getestete Skript selbst.
"""
import json
import os
import shutil
import sys
import tempfile
import unittest

SKRIPT_ORDNER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SKRIPT_ORDNER)

from rezeptbuch_backup_bereinigen import _titel_aus_allen_backups_entfernen  # noqa: E402


class TestBackupBereinigen(unittest.TestCase):
    def setUp(self):
        self.ordner = tempfile.mkdtemp(prefix="rezeptbuch-backup-test-")

    def tearDown(self):
        shutil.rmtree(self.ordner, ignore_errors=True)

    def _backup_schreiben(self, dateiname, rezepte):
        pfad = os.path.join(self.ordner, dateiname)
        with open(pfad, "w", encoding="utf-8") as f:
            json.dump(rezepte, f)
        return pfad

    def _backup_lesen(self, dateiname):
        with open(os.path.join(self.ordner, dateiname), "r", encoding="utf-8") as f:
            return json.load(f)

    def test_entfernt_treffer_aus_einer_datei(self):
        self._backup_schreiben("rezepte-backup-2026-09-01.json", [
            {"summary": "Pizzateig", "description": "{}"},
            {"summary": "Lasagne", "description": "{}"},
        ])
        bearbeitet, entfernt = _titel_aus_allen_backups_entfernen("Pizzateig", self.ordner)
        self.assertEqual(bearbeitet, 1)
        self.assertEqual(entfernt, 1)
        verbleibend = self._backup_lesen("rezepte-backup-2026-09-01.json")
        self.assertEqual([r["summary"] for r in verbleibend], ["Lasagne"])

    def test_entfernt_treffer_aus_mehreren_dateien(self):
        self._backup_schreiben("rezepte-backup-2026-09-01.json", [
            {"summary": "Pizzateig", "description": "{}"},
            {"summary": "Lasagne", "description": "{}"},
        ])
        self._backup_schreiben("rezepte-backup-2026-09-02.json", [
            {"summary": "Pizzateig", "description": "{}"},
            {"summary": "Salat", "description": "{}"},
        ])
        self._backup_schreiben("rezepte-backup-2026-09-03.json", [
            {"summary": "Lasagne", "description": "{}"},
        ])
        bearbeitet, entfernt = _titel_aus_allen_backups_entfernen("Pizzateig", self.ordner)
        self.assertEqual(bearbeitet, 2)  # nur die zwei Dateien, die den Titel enthielten
        self.assertEqual(entfernt, 2)
        self.assertEqual(
            [r["summary"] for r in self._backup_lesen("rezepte-backup-2026-09-01.json")],
            ["Lasagne"],
        )
        self.assertEqual(
            [r["summary"] for r in self._backup_lesen("rezepte-backup-2026-09-02.json")],
            ["Salat"],
        )
        # Datei ohne Treffer bleibt unverändert
        self.assertEqual(
            [r["summary"] for r in self._backup_lesen("rezepte-backup-2026-09-03.json")],
            ["Lasagne"],
        )

    def test_titel_nicht_gefunden_aendert_nichts(self):
        self._backup_schreiben("rezepte-backup-2026-09-01.json", [
            {"summary": "Lasagne", "description": "{}"},
        ])
        bearbeitet, entfernt = _titel_aus_allen_backups_entfernen("Nicht vorhanden", self.ordner)
        self.assertEqual(bearbeitet, 0)
        self.assertEqual(entfernt, 0)
        self.assertEqual(
            [r["summary"] for r in self._backup_lesen("rezepte-backup-2026-09-01.json")],
            ["Lasagne"],
        )

    def test_grossKleinschreibung_wird_unterschieden(self):
        self._backup_schreiben("rezepte-backup-2026-09-01.json", [
            {"summary": "Pizzateig", "description": "{}"},
        ])
        bearbeitet, entfernt = _titel_aus_allen_backups_entfernen("pizzateig", self.ordner)
        self.assertEqual(bearbeitet, 0)
        self.assertEqual(entfernt, 0)

    def test_mehrfache_treffer_in_derselben_datei_werden_alle_entfernt(self):
        self._backup_schreiben("rezepte-backup-2026-09-01.json", [
            {"summary": "Pizzateig", "description": "{}"},
            {"summary": "Pizzateig", "description": "{}"},
            {"summary": "Lasagne", "description": "{}"},
        ])
        bearbeitet, entfernt = _titel_aus_allen_backups_entfernen("Pizzateig", self.ordner)
        self.assertEqual(bearbeitet, 1)
        self.assertEqual(entfernt, 2)
        self.assertEqual(
            [r["summary"] for r in self._backup_lesen("rezepte-backup-2026-09-01.json")],
            ["Lasagne"],
        )

    def test_leerer_ordner_ohne_backups(self):
        bearbeitet, entfernt = _titel_aus_allen_backups_entfernen("Pizzateig", self.ordner)
        self.assertEqual(bearbeitet, 0)
        self.assertEqual(entfernt, 0)

    def test_datei_bleibt_bei_vollstaendiger_leerung_bestehen(self):
        # Bewusstes Verhalten: die Backup-Datei selbst wird NICHT gelöscht,
        # auch wenn nach dem Entfernen kein Eintrag mehr übrig ist - sie
        # bleibt als (dann leerer) Tagesschnappschuss bestehen.
        self._backup_schreiben("rezepte-backup-2026-09-01.json", [
            {"summary": "Pizzateig", "description": "{}"},
        ])
        _titel_aus_allen_backups_entfernen("Pizzateig", self.ordner)
        self.assertTrue(os.path.isfile(os.path.join(self.ordner, "rezepte-backup-2026-09-01.json")))
        self.assertEqual(self._backup_lesen("rezepte-backup-2026-09-01.json"), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
