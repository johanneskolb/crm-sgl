#!/usr/bin/env node

/**
 * Import ALL semester plan sheets from Drive
 * (HD21A21, HD22A21, HD23A23, HD24B21, HD25A23)
 * 
 * Strategy:
 * 1. Search Drive for all sheets matching HD2[1-5]
 * 2. For each sheet: get data via `sheets get SHEET_ID 'A1:Z200'`
 * 3. Parse rows, find lecturer + course columns
 * 4. Insert into lecturer_courses table
 */

const { execSync } = require('child_process');
const fs = require('fs');

// OAuth account
const GOG_ACCOUNT = 'kolb.hannes@gmail.com';

// Keyring password
process.env.GOG_KEYRING_PASSWORD = fs.readFileSync(
  '/home/clawdy/.config/gogcli/.keyring_pass',
  'utf8'
).trim();

console.log('=== Import Semester Plans - Final Version ===\n');

let totalSheets = 0;
let totalImported = 0;
let totalSkipped = 0;
const conflicts = [];
const errors = [];

// Helper: Run gog command
function gog(cmd, silent = false) {
  try {
    const output = execSync(`gog --account ${GOG_ACCOUNT} ${cmd}`, { 
      encoding: 'utf8', 
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GOG_KEYRING_PASSWORD: process.env.GOG_KEYRING_PASSWORD }
    });
    return output;
  } catch (err) {
    if (!silent) {
      console.error(`❌ gog command failed: ${cmd}`);
      if (err.stderr) console.error(err.stderr);
    }
    return null;
  }
}

// Helper: Search for all HD semester sheets
function findAllSheets() {
  console.log('🔍 Searching Drive for all semester sheets...\n');
  
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
          if (cohort && ['HD21A21', 'HD22A21', 'HD23A23', 'HD24B21', 'HD25A23'].includes(cohort)) {
            allSheets.push({ id: s.id, name: s.name, cohort });
          }
        });
      }
    } catch (err) {
      console.error(`❌ Failed to parse search results for ${pattern}`);
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

// Helper: Get sheet data
function getSheetData(sheetId) {
  const output = gog(`sheets get ${sheetId} 'A1:Z200' --json`, true);
  if (!output) return null;
  
  try {
    const data = JSON.parse(output);
    return data.values || [];
  } catch (err) {
    return null;
  }
}

// Helper: Find column indices
function findColumns(header) {
  const h = header.map(cell => (cell || '').toLowerCase());
  
  const lecturerCol = h.findIndex(cell => 
    cell.includes('dozent') || 
    cell.includes('lehrbeauftragte') || 
    cell.includes('lecturer') ||
    cell.includes('prof')
  );
  
  const courseCol = h.findIndex(cell => 
    cell.includes('veranstaltung') || 
    cell.includes('kurs') || 
    cell.includes('vorlesung') || 
    cell.includes('course') ||
    cell.includes('modul')
  );
  
  return { lecturerCol, courseCol };
}

// Helper: Import from sheet
function importFromSheet(sheetId, cohort, sheetName) {
  console.log(`\n📋 ${sheetName}`);
  
  const rows = getSheetData(sheetId);
  if (!rows || rows.length < 2) {
    console.log(`  ⏭️  Skipped (no data)`);
    totalSkipped++;
    errors.push(`No data: ${sheetName}`);
    return;
  }
  
  // Find header row (first row with "Dozent" or "Veranstaltung")
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i].map(c => (c || '').toLowerCase());
    if (row.some(c => c.includes('dozent') || c.includes('veranstaltung'))) {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow === -1) {
    console.log(`  ⏭️  Skipped (no header row)`);
    totalSkipped++;
    errors.push(`No header: ${sheetName}`);
    return;
  }
  
  const header = rows[headerRow];
  const { lecturerCol, courseCol } = findColumns(header);
  
  if (lecturerCol === -1 || courseCol === -1) {
    console.log(`  ⏭️  Skipped (columns not found: lecturer=${lecturerCol}, course=${courseCol})`);
    totalSkipped++;
    errors.push(`Missing columns: ${sheetName}`);
    return;
  }
  
  console.log(`  📊 Header at row ${headerRow + 1}, lecturer col ${lecturerCol + 1}, course col ${courseCol + 1}`);
  
  // Process data rows
  let imported = 0;
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const lecturer = row[lecturerCol];
    const courseName = row[courseCol];
    
    // Skip empty rows or rows without both values
    if (!lecturer || !courseName) continue;
    
    // Skip if course name looks like a section header
    if (courseName.length < 3 || courseName.match(/^(Modul|Semester|Prüfung)/i)) continue;
    
    const result = insertLecturerCourse(lecturer, courseName, cohort, sheetName);
    if (result.success) {
      imported++;
    } else if (result.conflict) {
      conflicts.push(result.conflict);
    }
  }
  
  console.log(`  ✅ ${imported} courses imported`);
  totalImported += imported;
  totalSheets++;
}

// Helper: Insert into DB
function insertLecturerCourse(lecturerName, courseName, cohort, source) {
  // Clean lecturer name
  const cleanName = lecturerName
    .replace(/Prof\.\s*(Dr\.)?\s*/gi, '')
    .replace(/Dr\.\s*/gi, '')
    .trim();
  
  if (cleanName.length < 2) return { success: false };
  
  // Find lecturer by last name
  const lastName = cleanName.split(' ').pop();
  const lecturerQuery = `
    SELECT id, name FROM lecturers 
    WHERE LOWER(name) LIKE LOWER('%${lastName.replace(/'/g, "''")}%')
    LIMIT 1
  `;
  
  let lecturerId;
  try {
    const result = execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/crm.db "${lecturerQuery}"`,
      { encoding: 'utf8' }
    ).trim();
    
    if (!result) {
      // Silent skip - too many false positives
      return { success: false };
    }
    
    lecturerId = result.split('|')[0];
  } catch (err) {
    return { success: false };
  }
  
  // Check if exists
  const existsQuery = `
    SELECT id FROM lecturer_courses 
    WHERE lecturer_id = ${lecturerId} 
    AND semester = '${cohort}' 
    AND course_name = '${courseName.replace(/'/g, "''")}'
  `;
  
  try {
    const exists = execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/crm.db "${existsQuery}"`,
      { encoding: 'utf8' }
    ).trim();
    
    if (exists) {
      return { 
        success: false, 
        conflict: `${cleanName} → ${courseName} (${cohort})`
      };
    }
  } catch (err) {
    return { success: false };
  }
  
  // Insert
  const insertQuery = `
    INSERT INTO lecturer_courses (lecturer_id, semester, course_name, subject, source)
    VALUES (${lecturerId}, '${cohort}', '${courseName.replace(/'/g, "''")}', NULL, '${source.replace(/'/g, "''")}')
  `;
  
  try {
    execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/backend/data/crm.db "${insertQuery}"`,
      { encoding: 'utf8' }
    );
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

// Main
const sheets = findAllSheets();

console.log(`✅ Found ${sheets.length} relevant sheets:\n`);
sheets.forEach(s => console.log(`  - ${s.name} (${s.cohort})`));

console.log('\n📊 Processing sheets...\n');

for (const sheet of sheets) {
  importFromSheet(sheet.id, sheet.cohort, sheet.name);
}

// Summary
console.log('\n\n=== Summary ===');
console.log(`Sheets found: ${sheets.length}`);
console.log(`Sheets processed: ${totalSheets}`);
console.log(`Courses imported: ${totalImported}`);
console.log(`Skipped: ${totalSkipped}`);
console.log(`Conflicts: ${conflicts.length}`);
console.log(`Errors: ${errors.length}`);

if (totalImported > 0) {
  console.log('\n✅ Import successful!');
}

if (conflicts.length > 0 && conflicts.length <= 20) {
  console.log('\n⚠️  Conflicts (already existed):');
  conflicts.slice(0, 20).forEach(c => console.log(`  - ${c}`));
} else if (conflicts.length > 20) {
  console.log(`\n⚠️  ${conflicts.length} conflicts (showing first 20):`);
  conflicts.slice(0, 20).forEach(c => console.log(`  - ${c}`));
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(e => console.log(`  - ${e}`));
}
h(e => console.log(`  - ${e}`));
}
