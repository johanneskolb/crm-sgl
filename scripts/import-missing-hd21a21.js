#!/usr/bin/env node
/**
 * Import missing HD21A21 sheets (found separately)
 */

const { execSync } = require('child_process');
const fs = require('fs');

const GOG_ACCOUNT = 'kolb.hannes@gmail.com';
const DB_PATH = '~/.openclaw/workspace/crm_sgl/backend/data/crm.db';

const MISSING_SHEETS = [
  { id: '1DPLGh3HbRmAhwc1H-LgQP0OgGF7KLIxDN7YhZ0aUWx8', name: 'HD21A21 - 6. Semester 23/24', cohort: 'HD21A21' },
  { id: '15yXW0syz1KFTNMRp-ZOlktdYU3ma1MRZLsKnzQzR808', name: 'HD21A21 - 5. Semester 23/24', cohort: 'HD21A21' }
];

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

console.log('=== Import Missing HD21A21 Sheets ===\n');

let totalImported = 0;
let totalConflicts = 0;

for (const sheet of MISSING_SHEETS) {
  console.log(`📋 ${sheet.name}`);
  
  const rows = getSheetData(sheet.id);
  if (!rows) {
    console.log('  ❌ Failed to get data');
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
    continue;
  }
  
  const header = rows[headerRow].map(h => (h || '').toLowerCase());
  const lecturerCol = header.findIndex(h => h.includes('dozent'));
  const courseCol = header.findIndex(h => h.includes('veranstaltung'));
  
  if (lecturerCol === -1 || courseCol === -1) {
    console.log('  ⚠️  Missing columns');
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
}

console.log('\n=== Summary ===');
console.log(`Total imported: ${totalImported}`);
console.log(`Total conflicts: ${totalConflicts}`);
console.log('\n✅ Done!');
