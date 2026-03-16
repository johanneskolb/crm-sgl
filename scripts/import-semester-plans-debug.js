#!/usr/bin/env node

/**
 * DEBUG VERSION - Import semester plans with detailed logging
 */

const { execSync } = require('child_process');
const fs = require('fs');

const GOG_ACCOUNT = 'kolb.hannes@gmail.com';

process.env.GOG_KEYRING_PASSWORD = fs.readFileSync(
  '/home/clawdy/.config/gogcli/.keyring_pass',
  'utf8'
).trim();

// Test with single sheet first
const TEST_SHEET = {
  id: '1YZ1B9Vr6vczXVXjnSasMmg7fvhjvrkQVXChzYqpKOwU',
  name: 'HD22A21 - 3. Semester 23/24',
  cohort: 'HD22A21'
};

function gog(cmd) {
  try {
    const output = execSync(`gog --account ${GOG_ACCOUNT} ${cmd}`, { 
      encoding: 'utf8', 
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GOG_KEYRING_PASSWORD: process.env.GOG_KEYRING_PASSWORD }
    });
    return output;
  } catch (err) {
    console.error(`❌ gog failed: ${cmd}`);
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
  // Try multiple strategies
  const cleanName = lecturerName
    .replace(/Prof\.\s*(Dr\.)?\s*/gi, '')
    .replace(/Dr\.\s*/gi, '')
    .trim();
  
  console.log(`    🔍 Searching for: "${lecturerName}" → cleaned: "${cleanName}"`);
  
  // Strategy 1: Last name only
  const lastName = cleanName.split(' ').pop();
  let query = `
    SELECT id, name FROM lecturers 
    WHERE LOWER(name) LIKE LOWER('%${lastName}%')
    LIMIT 5
  `;
  
  try {
    const result = execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/backend/data/crm.db "${query}"`,
      { encoding: 'utf8' }
    ).trim();
    
    console.log(`    📊 Query result: ${result || '(empty)'}`);
    
    if (result) {
      const lines = result.split('\n');
      // Return first match
      return lines[0].split('|')[0];
    }
  } catch (err) {
    console.error(`    ❌ Query failed: ${err.message}`);
  }
  
  return null;
}

function insertLecturerCourse(lecturer, course, cohort, source) {
  console.log(`  📝 Processing: ${lecturer} → ${course}`);
  
  const lecturerId = findLecturerId(lecturer);
  if (!lecturerId) {
    console.log(`    ❌ Lecturer not found in DB`);
    return { success: false };
  }
  
  console.log(`    ✅ Found lecturer ID: ${lecturerId}`);
  
  // Check exists
  const existsQuery = `
    SELECT id FROM lecturer_courses 
    WHERE lecturer_id = ${lecturerId} 
    AND semester = '${cohort}' 
    AND course_name = '${course.replace(/'/g, "''")}'
  `;
  
  try {
    const exists = execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/backend/data/crm.db "${existsQuery}"`,
      { encoding: 'utf8' }
    ).trim();
    
    if (exists) {
      console.log(`    ⚠️  Already exists (ID: ${exists})`);
      return { success: false, conflict: true };
    }
  } catch (err) {
    console.error(`    ❌ Exists check failed: ${err.message}`);
    return { success: false };
  }
  
  // Insert (without source column)
  const insertQuery = `
    INSERT INTO lecturer_courses (lecturer_id, semester, course_name, subject)
    VALUES (${lecturerId}, '${cohort}', '${course.replace(/'/g, "''")}', NULL)
  `;
  
  try {
    execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/backend/data/crm.db "${insertQuery}"`,
      { encoding: 'utf8' }
    );
    console.log(`    ✅ Inserted successfully`);
    return { success: true };
  } catch (err) {
    console.error(`    ❌ Insert failed: ${err.message}`);
    return { success: false };
  }
}

console.log(`=== DEBUG: Import from single sheet ===\n`);
console.log(`Sheet: ${TEST_SHEET.name}`);
console.log(`Cohort: ${TEST_SHEET.cohort}\n`);

const rows = getSheetData(TEST_SHEET.id);
if (!rows) {
  console.log('❌ Failed to get sheet data');
  process.exit(1);
}

console.log(`✅ Got ${rows.length} rows\n`);

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
  console.log('❌ No header found');
  process.exit(1);
}

console.log(`✅ Header found at row ${headerRow + 1}\n`);
console.log(`Header: ${rows[headerRow].join(' | ')}\n`);

const header = rows[headerRow].map(h => (h || '').toLowerCase());
const lecturerCol = header.findIndex(h => h.includes('dozent'));
const courseCol = header.findIndex(h => h.includes('veranstaltung'));

console.log(`Lecturer column: ${lecturerCol + 1} (${header[lecturerCol]})`);
console.log(`Course column: ${courseCol + 1} (${header[courseCol]})\n`);

// Process rows
let imported = 0;
let skipped = 0;
let conflicts = 0;

for (let i = headerRow + 1; i < rows.length; i++) {
  const row = rows[i];
  const lecturer = row[lecturerCol];
  const course = row[courseCol];
  
  if (!lecturer || !course || course.length < 3) {
    skipped++;
    continue;
  }
  
  const result = insertLecturerCourse(lecturer, course, TEST_SHEET.cohort, TEST_SHEET.name);
  if (result.success) {
    imported++;
  } else if (result.conflict) {
    conflicts++;
  } else {
    skipped++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Imported: ${imported}`);
console.log(`Conflicts: ${conflicts}`);
console.log(`Skipped: ${skipped}`);
