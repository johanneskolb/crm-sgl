# Semester Plans Import Report

**Date:** 2026-03-16  
**Task:** Import all semester plan sheets from Drive folders (HD21A21, HD22A21, HD23A23, HD24B21, HD25A23)

## Summary

✅ **Import successful!**

- **75 new course assignments** imported
- **32 conflicts** (already existed in DB)
- **Total sheets processed:** 14
  - 12 found via Drive search
  - 2 HD21A21 sheets added manually
- **Skipped:** 2 sheets (no valid headers)

## Per-Cohort Breakdown

| Cohort   | Sheets | New Courses | Conflicts |
|----------|--------|-------------|-----------|
| HD21A21  | 2      | 16          | 2         |
| HD22A21  | 3      | 10          | 8         |
| HD23A23  | 4      | 29          | 21        |
| HD24B21  | 2      | 6           | 1         |
| HD25A23  | 2      | 14          | 0         |
| **Total**| **13** | **75**      | **32**    |

## Database Stats (After Import)

```sql
-- Per semester
SELECT semester, COUNT(*) FROM lecturer_courses GROUP BY semester;

-- Results:
-- HD21A21: 18 courses
-- HD22A21: 18 courses
-- HD23A23: 50 courses
-- HD24B21: 7 courses
-- HD25A23: 14 courses

-- Total courses: 107
-- Lecturers with courses: 40+
```

## Sheets Processed

### Successfully Imported

1. **HD21A21 - 6. Semester 23/24**: 9 new
2. **HD21A21 - 5. Semester 23/24**: 7 new, 2 conflicts
3. **HD22A21 - 3. Semester 23/24**: 0 new, 8 conflicts (all existed)
4. **HD22A21 - 4. Semester 23/24**: 0 new, 0 conflicts (empty)
5. **HD22A21 - 2. Semester 22/23**: 10 new
6. **HD23A23 - 6. Semester 25/26**: 9 new, 4 conflicts
7. **HD23A23 - 2. Semester 23/24**: 0 new, 14 conflicts (all existed)
8. **HD23A23 - 1. Semester 23/24**: 12 new, 1 conflict
9. **HD23A23 - 3. Semester 24/25**: 8 new, 2 conflicts
10. **HD24B21 - 3. Semester 25/26**: 4 new
11. **HD24B21 - 4. Semester 25/26 - Rhön im 5. Semester planen**: 2 new, 1 conflict
12. **HD25A23 - 2. Semester 25/26**: 14 new
13. **HD25A23 - → T:eams Trends**: Skipped (no header)
14. **HD22A21 - Abfrage Bachelorprüfung (Antworten)**: Skipped (no header)

## Technical Details

### Import Strategy

1. **Drive Search:** Used `gog drive search` with patterns HD21, HD22, HD23, HD24, HD25
2. **Sheet Data:** Fetched via `gog sheets get <ID> 'A1:Z200'`
3. **Column Detection:** Auto-detect "Dozent" and "Veranstaltung" columns
4. **Lecturer Matching:** Fuzzy match by last name (handles Prof. Dr. titles)
5. **Duplicate Detection:** Skip if (lecturer_id, semester, course_name) exists

### Challenges & Solutions

- **Missing HD21A21 sheets:** Not found in initial search → added manually by ID
- **DB column mismatch:** `lecturer_courses` has no `source` column → removed from INSERT
- **Title variations:** Lecturers stored as "Bodo Kluxen" but sheets have "Prof. Dr. Bodo Kluxen" → clean + fuzzy match
- **Empty rows:** Many sheets have module headers without dozent → skip rows without both values

## Scripts

- `import-all-semester-plans.js`: Main import (found 12 sheets)
- `import-missing-hd21a21.js`: Manually added 2 HD21A21 sheets
- `import-semester-plans-debug.js`: Debug/testing version with verbose logging

## Next Steps

✅ All semester plans imported  
✅ Course assignments visible in CRM frontend  
✅ Lecturer filters working correctly

No further action required unless new semester sheets are added to Drive.

---

**Report generated:** 2026-03-16 09:45 UTC
