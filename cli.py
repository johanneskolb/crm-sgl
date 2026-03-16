"""Interaktive CLI fuer das CRM-System."""

from __future__ import annotations

from database import (
    Database,
    LECTURER_AFFILIATIONS,
    LECTURER_QUALITY_EVALUATIONS,
    PARTNER_STATUSES,
    STUDENT_STATUSES,
)


class CRMCLI:
    """Einfache menuebasierte Benutzeroberflaeche."""

    def __init__(self, db: Database) -> None:
        self.db = db

    @staticmethod
    def _print_header(title: str) -> None:
        print(f"\n=== {title} ===")

    @staticmethod
    def _read_bool(prompt: str) -> bool:
        while True:
            value = input(f"{prompt} (j/n): ").strip().lower()
            if value in {"j", "ja", "y", "yes"}:
                return True
            if value in {"n", "nein", "no"}:
                return False
            print("Bitte j oder n eingeben.")

    @staticmethod
    def _read_int(prompt: str) -> int:
        while True:
            value = input(prompt).strip()
            if value.isdigit():
                return int(value)
            print("Bitte eine gueltige Zahl eingeben.")

    @staticmethod
    def _pick_status(statuses: tuple[str, ...], label: str) -> str:
        while True:
            print(f"{label} auswaehlen:")
            for idx, item in enumerate(statuses, start=1):
                print(f"{idx}. {item}")
            choice = input("> ").strip()
            if choice.isdigit() and 1 <= int(choice) <= len(statuses):
                return statuses[int(choice) - 1]
            print("Ungueltige Auswahl.")

    @staticmethod
    def _pick_optional(statuses: tuple[str, ...], label: str, default: str | None = None) -> str:
        while True:
            print(f"{label} auswaehlen (0 = ueberspringen):")
            for idx, item in enumerate(statuses, start=1):
                print(f"{idx}. {item}")
            choice = input("> ").strip()
            if choice == "" and default is not None:
                return default
            if choice == "0":
                return ""
            if choice.isdigit() and 1 <= int(choice) <= len(statuses):
                return statuses[int(choice) - 1]
            print("Ungueltige Auswahl.")

    def run(self) -> None:
        while True:
            self._print_header("CRM Studiengangsleitung")
            print("1. Partnerunternehmen")
            print("2. Dozenten")
            print("3. Studierende/Alumni")
            print("4. Notes & Ideen")
            print("5. CSV-Export")
            print("0. Beenden")
            choice = input("> ").strip()

            if choice == "1":
                self.partner_menu()
            elif choice == "2":
                self.lecturer_menu()
            elif choice == "3":
                self.student_menu()
            elif choice == "4":
                self.notes_menu()
            elif choice == "5":
                self.export_menu()
            elif choice == "0":
                print("Programm beendet.")
                break
            else:
                print("Ungueltige Auswahl.")

    def partner_menu(self) -> None:
        while True:
            self._print_header("Partnerunternehmen")
            print("1. Neu anlegen")
            print("2. Suchen")
            print("3. Alle anzeigen")
            print("4. Kontakt erfassen")
            print("5. Kontakt-Historie anzeigen")
            print("6. Status aendern")
            print("7. Status-Historie anzeigen")
            print("0. Zurueck")
            choice = input("> ").strip()

            if choice == "1":
                self.create_partner()
            elif choice == "2":
                self.search_partners()
            elif choice == "3":
                self.show_partners(self.db.list_partners())
            elif choice == "4":
                self.add_partner_contact()
            elif choice == "5":
                self.show_partner_contacts()
            elif choice == "6":
                self.change_partner_status()
            elif choice == "7":
                self.show_status_history("partner")
            elif choice == "0":
                return
            else:
                print("Ungueltige Auswahl.")

    def lecturer_menu(self) -> None:
        while True:
            self._print_header("Dozenten")
            print("1. Neu anlegen")
            print("2. Suchen")
            print("3. Alle anzeigen")
            print("4. Bearbeiten")
            print("0. Zurueck")
            choice = input("> ").strip()

            if choice == "1":
                self.create_lecturer()
            elif choice == "2":
                self.search_lecturers()
            elif choice == "3":
                self.show_lecturers(self.db.list_lecturers())
            elif choice == "4":
                self.update_lecturer()
            elif choice == "0":
                return
            else:
                print("Ungueltige Auswahl.")

    def student_menu(self) -> None:
        while True:
            self._print_header("Studierende/Alumni")
            print("1. Neu anlegen")
            print("2. Suchen")
            print("3. Alle anzeigen")
            print("4. Status aendern")
            print("5. Status-Historie anzeigen")
            print("0. Zurueck")
            choice = input("> ").strip()

            if choice == "1":
                self.create_student()
            elif choice == "2":
                self.search_students()
            elif choice == "3":
                self.show_students(self.db.list_students())
            elif choice == "4":
                self.change_student_status()
            elif choice == "5":
                self.show_status_history("student")
            elif choice == "0":
                return
            else:
                print("Ungueltige Auswahl.")

    def notes_menu(self) -> None:
        while True:
            self._print_header("Notes & Ideen")
            print("1. Neue Notiz")
            print("2. Suchen")
            print("3. Alle anzeigen")
            print("4. Notiz bearbeiten")
            print("5. Notiz loeschen")
            print("0. Zurueck")
            choice = input("> ").strip()

            if choice == "1":
                self.create_note()
            elif choice == "2":
                self.search_notes()
            elif choice == "3":
                self.show_notes(self.db.list_notes())
            elif choice == "4":
                self.update_note()
            elif choice == "5":
                self.delete_note()
            elif choice == "0":
                return
            else:
                print("Ungueltige Auswahl.")

    def export_menu(self) -> None:
        self._print_header("CSV-Export")
        output_dir = input("Export-Ordner (Default: exports): ").strip() or "exports"
        files = self.db.export_csv(output_dir)
        print("Export abgeschlossen:")
        for file_path in files:
            print(f"- {file_path}")

    def create_partner(self) -> None:
        self._print_header("Neues Partnerunternehmen")
        name = input("Name: ").strip()
        industry = input("Branche: ").strip()
        location = input("Standort: ").strip()
        contact_person = input("Kontaktperson: ").strip()
        topics = input("Themenfelder (kommagetrennt): ").strip()
        status = self._pick_status(PARTNER_STATUSES, "Status")
        partner_id = self.db.create_partner(name, industry, location, contact_person, status, topics)
        print(f"Partnerunternehmen angelegt (ID: {partner_id}).")

    def search_partners(self) -> None:
        query = input("Suchbegriff: ").strip()
        self.show_partners(self.db.search_partners(query))

    @staticmethod
    def show_partners(partners: list[dict]) -> None:
        if not partners:
            print("Keine Treffer.")
            return
        for row in partners:
            print(
                f"[{row['id']}] {row['name']} | {row['status']} | {row['industry']} | "
                f"{row['location']} | Kontakt: {row['contact_person']} | Themen: {row['topics']}"
            )

    def add_partner_contact(self) -> None:
        partner_id = self._read_int("Partner-ID: ")
        channel = input("Kanal (z.B. E-Mail/Telefon/Meeting): ").strip()
        summary = input("Zusammenfassung: ").strip()
        contact_id = self.db.add_partner_contact(partner_id, channel, summary)
        print(f"Kontakt gespeichert (ID: {contact_id}).")

    def show_partner_contacts(self) -> None:
        partner_id = self._read_int("Partner-ID: ")
        contacts = self.db.get_partner_contacts(partner_id)
        if not contacts:
            print("Keine Kontakte gefunden.")
            return
        for row in contacts:
            print(f"[{row['id']}] {row['contact_date']} | {row['channel']} | {row['summary']}")

    def change_partner_status(self) -> None:
        partner_id = self._read_int("Partner-ID: ")
        new_status = self._pick_status(PARTNER_STATUSES, "Neuer Status")
        note = input("Notiz zur Aenderung (optional): ").strip()
        self.db.update_partner_status(partner_id, new_status, note)
        print("Status aktualisiert.")

    def create_lecturer(self) -> None:
        self._print_header("Neuen Dozenten anlegen")
        name = input("Name: ").strip()
        contact = input("Kontakt: ").strip()
        nationality = input("Nationalitaet: ").strip()
        affiliation = self._pick_optional(LECTURER_AFFILIATIONS, "Zugehoerigkeit")
        professional_experience = input("Berufserfahrung (statt Expertise): ").strip()
        remarks = input("Bemerkungen: ").strip()
        quality_evaluation = self._pick_optional(
            LECTURER_QUALITY_EVALUATIONS, "Qualitaetseinschaetzung", default="not_evaluated"
        )
        contact_from = input("Kontaktquelle: ").strip()
        can_lecture = self._read_bool("Kann Vorlesungen halten")
        can_supervise = self._read_bool("Kann Abschlussarbeiten betreuen")
        lectures_held = input("Bereits gehaltene Vorlesungen: ").strip()
        focus_topics = input("Themen-Schwerpunkte: ").strip()
        did_not_lecture_yet_but_interested = self._read_bool(
            "Noch nicht vorgetragen, aber interessiert"
        )
        did_not_supervise_yet_but_interested = self._read_bool(
            "Noch nicht betreut, aber interessiert"
        )
        teaches_german = self._read_bool("Unterrichtet auf Deutsch")
        teaches_english = self._read_bool("Unterrichtet auf Englisch")
        can_guest_lecture_only = self._read_bool("Nur Gastvortraege moeglich")
        is_alumni_student = self._read_bool("Ist Alumni-Student")
        alumni_student_id = None
        if is_alumni_student:
            alumni_student_id = self._read_int("Alumni-Studenten-ID (optional, 0 = leer): ")
            if alumni_student_id == 0:
                alumni_student_id = None

        lecturer_id = self.db.create_lecturer(
            name=name,
            contact=contact,
            nationality=nationality,
            affiliation=affiliation,
            professional_experience=professional_experience,
            remarks=remarks,
            quality_evaluation=quality_evaluation or "not_evaluated",
            contact_from=contact_from,
            can_lecture=can_lecture,
            can_supervise=can_supervise,
            lectures_held=lectures_held,
            focus_topics=focus_topics,
            did_not_lecture_yet_but_interested=did_not_lecture_yet_but_interested,
            did_not_supervise_yet_but_interested=did_not_supervise_yet_but_interested,
            teaches_german=teaches_german,
            teaches_english=teaches_english,
            can_guest_lecture_only=can_guest_lecture_only,
            is_alumni_student=is_alumni_student,
            alumni_student_id=alumni_student_id,
        )
        print(f"Dozent angelegt (ID: {lecturer_id}).")

    def search_lecturers(self) -> None:
        query = input("Suchbegriff: ").strip()
        self.show_lecturers(self.db.search_lecturers(query))

    @staticmethod
    def show_lecturers(lecturers: list[dict]) -> None:
        if not lecturers:
            print("Keine Treffer.")
            return
        for row in lecturers:
            professional_experience = row.get("professional_experience") or row.get("expertise", "")
            quality = row.get("quality_evaluation", "not_evaluated")
            print(
                f"[{row['id']}] {row['name']} | Kontakt: {row['contact']} | "
                f"Nationalitaet: {row.get('nationality', '')} | "
                f"Zugehoerigkeit: {row.get('affiliation', '')} | "
                f"Berufserfahrung: {professional_experience} | "
                f"Qualitaet: {quality} | "
                f"Kontaktquelle: {row.get('contact_from', '')} | "
                f"Vorlesung: {'Ja' if row['can_lecture'] else 'Nein'} | "
                f"Betreuung: {'Ja' if row['can_supervise'] else 'Nein'} | "
                f"Vorlesungen: {row['lectures_held']} | Schwerpunkte: {row['focus_topics']} | "
                f"Noch nicht vorgetragen: {'Ja' if row.get('did_not_lecture_yet_but_interested') else 'Nein'} | "
                f"Noch nicht betreut: {'Ja' if row.get('did_not_supervise_yet_but_interested') else 'Nein'} | "
                f"Deutsch: {'Ja' if row.get('teaches_german') else 'Nein'} | "
                f"Englisch: {'Ja' if row.get('teaches_english') else 'Nein'} | "
                f"Nur Gast: {'Ja' if row.get('can_guest_lecture_only') else 'Nein'} | "
                f"Alumni: {'Ja' if row.get('is_alumni_student') else 'Nein'} | "
                f"Alumni-ID: {row.get('alumni_student_id') or ''} | "
                f"Bemerkungen: {row.get('remarks', '')}"
            )

    def create_student(self) -> None:
        self._print_header("Neue Studierende/Alumni")
        name = input("Name: ").strip()
        cohort = input("Jahrgang: ").strip()
        company = input("Unternehmen: ").strip()
        status = self._pick_status(STUDENT_STATUSES, "Status")
        lecturer_potential = self._read_bool("Potenzial als Dozent")
        became_lecturer = self._read_bool("Wurde bereits Dozent")
        notes = input("Notizen: ").strip()

        lecturer_payload = None
        if became_lecturer:
            self._print_header("Daten fuer Dozentenprofil (optional)")
            lecturer_payload = {
                "contact": input("Kontakt: ").strip(),
                "nationality": input("Nationalitaet: ").strip(),
                "affiliation": self._pick_optional(LECTURER_AFFILIATIONS, "Zugehoerigkeit"),
                "professional_experience": input("Berufserfahrung: ").strip(),
                "remarks": input("Bemerkungen: ").strip(),
                "quality_evaluation": self._pick_optional(
                    LECTURER_QUALITY_EVALUATIONS, "Qualitaetseinschaetzung", default="not_evaluated"
                )
                or "not_evaluated",
                "contact_from": input("Kontaktquelle: ").strip(),
                "can_lecture": self._read_bool("Kann Vorlesungen halten"),
                "can_supervise": self._read_bool("Kann Abschlussarbeiten betreuen"),
                "lectures_held": input("Bereits gehaltene Vorlesungen: ").strip(),
                "focus_topics": input("Themen-Schwerpunkte: ").strip(),
                "did_not_lecture_yet_but_interested": self._read_bool(
                    "Noch nicht vorgetragen, aber interessiert"
                ),
                "did_not_supervise_yet_but_interested": self._read_bool(
                    "Noch nicht betreut, aber interessiert"
                ),
                "teaches_german": self._read_bool("Unterrichtet auf Deutsch"),
                "teaches_english": self._read_bool("Unterrichtet auf Englisch"),
                "can_guest_lecture_only": self._read_bool("Nur Gastvortraege moeglich"),
            }

        student_id = self.db.create_student(
            name=name,
            cohort=cohort,
            company=company,
            status=status,
            lecturer_potential=lecturer_potential,
            became_lecturer=became_lecturer,
            notes=notes,
            lecturer_payload=lecturer_payload,
        )
        print(f"Eintrag angelegt (ID: {student_id}).")

    def search_students(self) -> None:
        query = input("Suchbegriff: ").strip()
        self.show_students(self.db.search_students(query))

    @staticmethod
    def show_students(students: list[dict]) -> None:
        if not students:
            print("Keine Treffer.")
            return
        for row in students:
            print(
                f"[{row['id']}] {row['name']} | Jahrgang: {row['cohort']} | Unternehmen: {row['company']} | "
                f"Status: {row['status']} | Dozentenpotenzial: {'Ja' if row['lecturer_potential'] else 'Nein'} | "
                f"Wurde Dozent: {'Ja' if row.get('became_lecturer') else 'Nein'} | "
                f"Notizen: {row['notes']}"
            )

    def change_student_status(self) -> None:
        student_id = self._read_int("Student/Alumni-ID: ")
        new_status = self._pick_status(STUDENT_STATUSES, "Neuer Status")
        note = input("Notiz zur Aenderung (optional): ").strip()
        self.db.update_student_status(student_id, new_status, note)
        print("Status aktualisiert.")

    def show_status_history(self, entity_type: str) -> None:
        entity_id = self._read_int("ID: ")
        rows = self.db.get_status_history(entity_type, entity_id)
        if not rows:
            print("Keine Status-Historie gefunden.")
            return
        for row in rows:
            print(
                f"[{row['id']}] {row['changed_at']} | {row['old_status']} -> {row['new_status']} | Notiz: {row['note']}"
            )

    def create_note(self) -> None:
        self._print_header("Neue Notiz")
        title = input("Titel: ").strip()
        content = input("Inhalt: ").strip()
        note_date = input("Datum (YYYY-MM-DD, default: heute): ").strip()
        if not note_date:
            note_date = self.db._now()[:10]
        tags = input("Tags (kommagetrennt): ").strip()
        note_id = self.db.create_note(title, content, note_date, tags)
        print(f"Notiz angelegt (ID: {note_id}).")

    def search_notes(self) -> None:
        query = input("Suchbegriff: ").strip()
        self.show_notes(self.db.search_notes(query))

    @staticmethod
    def show_notes(notes: list[dict]) -> None:
        if not notes:
            print("Keine Notizen gefunden.")
            return
        for row in notes:
            print(
                f"[{row['id']}] {row['note_date']} | {row['title']} | Tags: {row['tags']} | {row['content']}"
            )

    def update_note(self) -> None:
        note_id = self._read_int("Notiz-ID: ")
        title = input("Neuer Titel: ").strip()
        content = input("Neuer Inhalt: ").strip()
        note_date = input("Neues Datum (YYYY-MM-DD): ").strip()
        tags = input("Neue Tags: ").strip()
        self.db.update_note(note_id, title, content, note_date, tags)
        print("Notiz aktualisiert.")

    def delete_note(self) -> None:
        note_id = self._read_int("Notiz-ID: ")
        confirm = self._read_bool("Wirklich loeschen")
        if not confirm:
            print("Abgebrochen.")
            return
        self.db.delete_note(note_id)

    def update_lecturer(self) -> None:
        """Bestehenden Dozenten bearbeiten."""
        self._print_header("Dozent bearbeiten")
        
        lecturer_id = input("ID des Dozenten: ").strip()
        if not lecturer_id.isdigit():
            print("Ungueltige ID.")
            return
        
        lecturer = self.db.get_lecturer(int(lecturer_id))
        if not lecturer:
            print("Dozent nicht gefunden.")
            return
        
        print(f"\nAktuelle Daten fuer {lecturer['name']}:")
        print(f"  Kontakt: {lecturer.get('contact', 'keine')}")
        print(f"  Nationalitaet: {lecturer.get('nationality', 'keine')}")
        print(f"  Affiliation: {lecturer.get('affiliation', 'keine')}")
        print("\nNeue Werte eingeben (Enter = unveraendert):")
        
        updates = {}
        
        name = input(f"Name [{lecturer['name']}]: ").strip()
        if name:
            updates['name'] = name
        
        contact = input(f"Kontakt [{lecturer.get('contact', '')}]: ").strip()
        if contact:
            updates['contact'] = contact
        
        nationality = input(f"Nationalitaet [{lecturer.get('nationality', '')}]: ").strip()
        if nationality:
            updates['nationality'] = nationality
        
        print(f"\nAktuelle Affiliation: {lecturer.get('affiliation', 'keine')}")
        print("Optionen: company, university")
        affiliation = input("Neue Affiliation: ").strip()
        if affiliation in ['company', 'university']:
            updates['affiliation'] = affiliation
        
        professional_exp = input(f"Berufserfahrung [{lecturer.get('professional_experience', '')}]: ").strip()
        if professional_exp:
            updates['professional_experience'] = professional_exp
        
        remarks = input(f"Anmerkungen [{lecturer.get('remarks', '')}]: ").strip()
        if remarks:
            updates['remarks'] = remarks
        
        print(f"\nAktuelle Qualitaet: {lecturer.get('quality_evaluation', 'not_evaluated')}")
        print("Optionen: excellent, good, average, poor, not_evaluated")
        quality = input("Neue Qualitaet: ").strip()
        if quality:
            updates['quality_evaluation'] = quality
        
        contact_from = input(f"Kontakt ueber [{lecturer.get('contact_from', '')}]: ").strip()
        if contact_from:
            updates['contact_from'] = contact_from
        
        # Boolean fields
        print("\nCheckboxen (j/n/Enter=unveraendert):")
        
        teaches_german = lecturer.get('teaches_german', False)
        tg_input = input(f"Unterrichtet Deutsch? ({'j' if teaches_german else 'n'}): ").strip().lower()
        if tg_input == 'j':
            updates['teaches_german'] = True
        elif tg_input == 'n':
            updates['teaches_german'] = False
        
        teaches_english = lecturer.get('teaches_english', False)
        te_input = input(f"Unterrichtet Englisch? ({'j' if teaches_english else 'n'}): ").strip().lower()
        if te_input == 'j':
            updates['teaches_english'] = True
        elif te_input == 'n':
            updates['teaches_english'] = False
        
        if self.db.update_lecturer(int(lecturer_id), **updates):
            print("\n✅ Dozent erfolgreich aktualisiert!")
        else:
            print("\n❌ Fehler beim Aktualisieren.")
        input("\nEnter zum Fortfahren...")

    def update_student(self) -> None:
        """Bestehenden Studenten bearbeiten."""
        self._print_header("Student/Alumni bearbeiten")
        
        student_id = input("ID des Studenten: ").strip()
        if not student_id.isdigit():
            print("Ungueltige ID.")
            return
        
        student = self.db.get_student(int(student_id))
        if not student:
            print("Student nicht gefunden.")
            return
        
        print(f"\nAktuelle Daten fuer {student['name']}:")
        print(f"  Jahrgang: {student.get('cohort', 'keine')}")
        print(f"  Unternehmen: {student.get('company', 'keine')}")
        print(f"  Status: {student.get('status', 'keine')}")
        print("\nNeue Werte eingeben (Enter = unveraendert):")
        
        updates = {}
        
        name = input(f"Name [{student['name']}]: ").strip()
        if name:
            updates['name'] = name
        
        cohort = input(f"Jahrgang [{student.get('cohort', '')}]: ").strip()
        if cohort:
            updates['cohort'] = cohort
        
        company = input(f"Unternehmen [{student.get('company', '')}]: ").strip()
        if company:
            updates['company'] = company
        
        print(f"\nAktueller Status: {student.get('status', 'Aktiv')}")
        print("Optionen: Aktiv, Alumni")
        status = input("Neuer Status: ").strip()
        if status:
            updates['status'] = status
        
        lecturer_potential = student.get('lecturer_potential', False)
        lp_input = input(f"Dozenten-Potenzial? ({'j' if lecturer_potential else 'n'}): ").strip().lower()
        if lp_input == 'j':
            updates['lecturer_potential'] = True
        elif lp_input == 'n':
            updates['lecturer_potential'] = False
        
        became_lecturer = student.get('became_lecturer', False)
        bl_input = input(f"Wurde Dozent? ({'j' if became_lecturer else 'n'}): ").strip().lower()
        if bl_input == 'j' and not became_lecturer:
            updates['became_lecturer'] = True
            # Auto-copy to lecturer
            self.db.create_lecturer_from_student(int(student_id))
            print("  → Automatisch in Dozenten-Tabelle kopiert!")
        elif bl_input == 'n':
            updates['became_lecturer'] = False
        
        notes = input(f"Notizen [{student.get('notes', '')}]: ").strip()
        if notes:
            updates['notes'] = notes
        
        if self.db.update_student(int(student_id), **updates):
            print("\n✅ Student erfolgreich aktualisiert!")
        else:
            print("\n❌ Fehler beim Aktualisieren.")
        input("\nEnter zum Fortfahren...")

    def create_lecturer_from_student(self) -> None:
        """Verbesserte UX: Student als Dozent kopieren."""
        self._print_header("Student als Dozent kopieren")
        
        student_id = input("ID des Studenten: ").strip()
        if not student_id.isdigit():
            print("Ungueltige ID.")
            return
        
        student = self.db.get_student(int(student_id))
        if not student:
            print("Student nicht gefunden.")
            return
        
        # UX-Verbesserung: Vorschau zeigen
        print(f"\n📋 Vorschau der Kopie:")
        print(f"  Name: {student['name']}")
        print(f"  Kontakt: {student.get('contact', 'keine')}")
        print(f"  Nationalitaet: {student.get('nationality', 'keine')}")
        print(f"  Quelle: Student-ID {student_id}")
        print(f"\n  ⚠️  Als Dozent markiert: ✓")
        print(f"  🔗 Verknuepfung zum Original: ✓")
        
        confirm = input("\nDaten korrekt? Kopieren? (j/n): ").strip().lower()
        if confirm != 'j':
            print("Abgebrochen.")
            return
        
        lecturer_id = self.db.create_lecturer_from_student(int(student_id))
        
        if lecturer_id:
            print(f"\n✅ Erfolgreich als Dozent angelegt!")
            print(f"   Dozent-ID: {lecturer_id}")
            print(f"   Verknuepfung: Alumni-Student-ID {student_id}")
            print(f"\n📝 Naechste Schritte:")
            print(f"   1. Bearbeiten Sie den Dozenten (Menue 4) um fehlende Details zu ergaenzen")
            print(f"   2. Markieren Sie Qualifikationen (Vorlesung, Betreuung)")
            
            # Student auch als became_lecturer markieren
            self.db.update_student(int(student_id), became_lecturer=True)
        else:
            print("\n❌ Fehler beim Kopieren.")
        input("\nEnter zum Fortfahren...")
