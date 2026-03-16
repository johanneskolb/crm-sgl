#!/usr/bin/env node
/**
 * Import ALL semester plan sheets (HD21A21, HD22A21, HD23A23, HD24B21, HD25A23)
 * Final production version
 */

const { execSync } = require('child_process');
const fs = require('fs');

const GOG_ACCOUNT = 'kolb.hannes@gmail.com';
const TARGET_COHORTS = ['HD21A21', 'HD22A21', 'HD23A23', 'HD24B21', 'HD25A23'];
const DB_PATH = '~/.openclaw/workspace/crm_sgl/backend/data/crm.db';

process.env.GOG_KEYRING_PASSWORD = fs.readFileSync(
  '/home/clawdy/.config/gogcli/.keyring_pass',
  'utf8'
).trim();

function gog(cmd) {
  try {
    const output = execSync(`gog --account ${GOG_ACCOUNT} ${cmd}`, { 
      encoding: 'utf8', 
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GOG_KEYRING_PASSWORD: process.env.GOG_KEYRING_PASSWORD }
    });
    return output;
  } catch (err) {
    return null;
  }
}

function getSheetData(sheetId) {
  const output = gog(`sheets get ${sheetId} 'A1:Z200' --json`);
  if (!output) return null;
  
  try {
    const data = JSON.parse(output);
    return data.values || [];
  } catch (err) {
    return null;
  }
}

function findLecturerId(lecturerName) {
  const cleanName = lecturerName
    .replace(/Prof\.\s*(Dr\.)?\s*/gi, '')
    .replace(/Dr\.\s*/gi, '')
    .trim();
  
  const lastName = cleanName.split(' ').pop();
  const query = `SELECT id, name FROM lecturers WHERE LOWER(name) LIKE LOWER('%${lastName}%') LIMIT 1`;
  
  try {
    const result = execSync(`sqlite3 ${DB_PATH} "${query}"`, { encoding: 'utf8' }).trim();
    if (result) {
      return result.split('|')[0];
    }
  } catch (err) {
    // Silent fail
  }
  
  return null;
}

function insertLecturerCourse(lecturer, course, cohort) {
  const lecturerId = findLecturerId(lecturer);
  if (!lecturerId) return { success: false };
  
  // Check exists
  const existsQuery = `SELECT id FROM lecturer_courses WHERE lecturer_id = ${lecturerId} AND semester = '${cohort}' AND course_name = '${course.replace(/'/g, "''")}'`;
  
  try {
    const exists = execSync(`sqlite3 ${DB_PATH} "${existsQuery}"`, { encoding: 'utf8' }).trim();
    if (exists) return { success: false, conflict: true };
  } catch (err) {
    return { success: false };
  }
  
  // Insert
  const insertQuery = `INSERT INTO lecturer_courses (lecturer_id, semester, course_name, subject) VALUES (${lecturerId}, '${cohort}', '${course.replace(/'/g, "''")}', NULL)`;
  
  try {
    execSync(`sqlite3 ${DB_PATH} "${insertQuery}"`, { encoding: 'utf8' });
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

function findAllSheets() {
  const allSheets = [];
  const patterns = ['HD21', 'HD22', 'HD23', 'HD24', 'HD25'];
  
  for (const pattern of patterns) {
    const output = gog(`drive search "${pattern}" --json --max=50`);
    if (!output) continue;
    
    try {
      const data = JSON.parse(output);
      if (data.files) {
        const sheets = data.files.filter(f => 
          f.mimeType === 'application/vnd.google-apps.spreadsheet' &&
          f.name.match(/HD(21|22|23|24|25)[AB]\d{2}/)
        );
        
        sheets.forEach(s => {
          const cohort = s.name.match(/HD\d{2}[AB]\d{2}/)?.[0];
          if (cohort && TARGET_COHORTS.includes(cohort)) {
            allSheets.push({ id: s.id, name: s.name, cohort });
          }
        });
      }
    } catch (err) {
      // Silent fail
    }
  }
  
  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (const sheet of allSheets) {
    if (!seen.has(sheet.id)) {
      seen.add(sheet.id);
      unique.push(sheet);
    }
  }
  
  return unique;
}

console.log('=== Import All Semester Plans ===\n');

const sheets = findAllSheets();
console.log(`✅ Found ${sheets.length} relevant sheets\n`);

let totalImported = 0;
let totalConflicts = 0;
let totalSkipped = 0;
const sheetDetails = [];

for (const sheet of sheets) {
  console.log(`📋 ${sheet.name}`);
  
  const rows = getSheetData(sheet.id);
  if (!rows) {
    console.log('  ❌ Failed to get data');
    totalSkipped++;
    continue;
  }
  
  // Find header
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i].map(c => (c || '').toLowerCase());
    if (row.some(c => c.includes('dozent') || c.includes('veranstaltung'))) {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow === -1) {
    console.log('  ⚠️  No header found');
    totalSkipped++;
    continue;
  }
  
  const header = rows[headerRow].map(h => (h || '').toLowerCase());
  const lecturerCol = header.findIndex(h => h.includes('dozent'));
  const courseCol = header.findIndex(h => h.includes('veranstaltung'));
  
  if (lecturerCol === -1 || courseCol === -1) {
    console.log('  ⚠️  Missing columns');
    totalSkipped++;
    continue;
  }
  
  // Process rows
  let imported = 0;
  let conflicts = 0;
  
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const lecturer = row[lecturerCol];
    const course = row[courseCol];
    
    if (!lecturer || !course || course.length < 3) continue;
    
    const result = insertLecturerCourse(lecturer, course, sheet.cohort);
    if (result.success) {
      imported++;
    } else if (result.conflict) {
      conflicts++;
    }
  }
  
  console.log(`  ✅ Imported ${imported}, conflicts ${conflicts}`);
  totalImported += imported;
  totalConflicts += conflicts;
  
  sheetDetails.push({
    name: sheet.name,
    cohort: sheet.cohort,
    imported,
    conflicts
  });
}

console.log('\n\n=== FINAL SUMMARY ===');
console.log(`Sheets processed: ${sheets.length}`);
console.log(`Total imported: ${totalImported}`);
console.log(`Total conflicts: ${totalConflicts}`);
console.log(`Skipped sheets: ${totalSkipped}`);

console.log('\n📊 Per-sheet breakdown:');
sheetDetails.forEach(s => {
  if (s.imported > 0 || s.conflicts > 0) {
    console.log(`  ${s.cohort} - ${s.name}: ${s.imported} new, ${s.conflicts} existing`);
  }
});

console.log('\n✅ Import complete!');
