"""Interaktive CLI fuer das CRM-System."""

from __future__ import annotations

from database import Database, PARTNER_STATUSES, STUDENT_STATUSES


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

    def run(self) -> None:
        while True:
            self._print_header("CRM Studiengangsleitung")
            print("1. Partnerunternehmen")
            print("2. Dozenten")
            print("3. Studierende/Alumni")
            print("4. CSV-Export")
            print("0. Beenden")
            choice = input("> ").strip()

            if choice == "1":
                self.partner_menu()
            elif choice == "2":
                self.lecturer_menu()
            elif choice == "3":
                self.student_menu()
            elif choice == "4":
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
            print("0. Zurueck")
            choice = input("> ").strip()

            if choice == "1":
                self.create_lecturer()
            elif choice == "2":
                self.search_lecturers()
            elif choice == "3":
                self.show_lecturers(self.db.list_lecturers())
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
        expertise = input("Fachgebiete (kommagetrennt): ").strip()
        can_lecture = self._read_bool("Kann Vorlesungen halten")
        can_supervise = self._read_bool("Kann Abschlussarbeiten betreuen")
        lectures_held = input("Bereits gehaltene Vorlesungen: ").strip()
        focus_topics = input("Themen-Schwerpunkte: ").strip()

        lecturer_id = self.db.create_lecturer(
            name,
            contact,
            expertise,
            can_lecture,
            can_supervise,
            lectures_held,
            focus_topics,
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
            print(
                f"[{row['id']}] {row['name']} | Kontakt: {row['contact']} | Fachgebiete: {row['expertise']} | "
                f"Vorlesung: {'Ja' if row['can_lecture'] else 'Nein'} | Betreuung: {'Ja' if row['can_supervise'] else 'Nein'} | "
                f"Vorlesungen: {row['lectures_held']} | Schwerpunkte: {row['focus_topics']}"
            )

    def create_student(self) -> None:
        self._print_header("Neue Studierende/Alumni")
        name = input("Name: ").strip()
        cohort = input("Jahrgang: ").strip()
        company = input("Unternehmen: ").strip()
        status = self._pick_status(STUDENT_STATUSES, "Status")
        lecturer_potential = self._read_bool("Potenzial als Dozent")
        notes = input("Notizen: ").strip()

        student_id = self.db.create_student(
            name,
            cohort,
            company,
            status,
            lecturer_potential,
            notes,
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
