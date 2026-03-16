#!/usr/bin/env node

/**
 * Import all semester plan sheets from Drive folders
 * HD21A21, HD22A21, HD23A23, HD24B21, HD25A23
 * Treats ALL plans as relevant and imports lecturer_courses
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Drive Folder IDs (from previous imports)
const FOLDERS = {
  'HD21A21': '1ufLLyL1yHlHRMyww47-OzrDDyYRF9d9b',
  'HD22A21': '1N2r8_jJI8cR-R6NrfDdGDW2CZ6iwfcfb',
  'HD23A23': '1-2Pjz8YTGQ8k-ybkroPHcyEIBQpqN-qv',
  'HD24B21': '1HH_bwuQl2FGcFnYP2P4KBd-N1U7pNR-o',
  'HD25A23': '1gRjyA8cHQDSFLR0Q4oJlk9JI6Q85Dn6j'
};

// OAuth account to use
const GOG_ACCOUNT = 'kolb.hannes@gmail.com';

// Keyring password
process.env.GOG_KEYRING_PASSWORD = fs.readFileSync(
  '/home/clawdy/.config/gogcli/.keyring_pass',
  'utf8'
).trim();

console.log('=== Import Semester Plans - All Sheets ===\n');

let totalSheets = 0;
let totalImported = 0;
let totalSkipped = 0;
const conflicts = [];

// Helper: Run gog command
function gog(cmd) {
  try {
    const output = execSync(`gog ${cmd}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return output;
  } catch (err) {
    console.error(`❌ gog command failed: ${cmd}`);
    console.error(err.message);
    return null;
  }
}

// Helper: Get Sheet ID from Drive file
function getSheetId(fileId) {
  const output = gog(`drive files get ${fileId} --account ${GOG_ACCOUNT}`);
  if (!output) return null;
  
  // Parse JSON output
  try {
    const data = JSON.parse(output);
    return data.id || fileId;
  } catch {
    return fileId; // fallback
  }
}

// Helper: Import courses from sheet
function importFromSheet(sheetId, cohort, sheetName) {
  console.log(`\n📋 Processing: ${sheetName} (${cohort})`);
  
  // Download sheet data
  const output = gog(`sheets read ${sheetId} --account ${GOG_ACCOUNT} --format json`);
  if (!output) {
    console.log(`  ⏭️  Skipped (read failed)`);
    totalSkipped++;
    return;
  }
  
  let data;
  try {
    data = JSON.parse(output);
  } catch (err) {
    console.log(`  ⏭️  Skipped (parse failed)`);
    totalSkipped++;
    return;
  }
  
  // Process all sheets/tabs
  const sheets = Array.isArray(data) ? data : [data];
  let imported = 0;
  
  for (const sheet of sheets) {
    const tabName = sheet.title || sheet.name || 'Unknown';
    const rows = sheet.data || sheet.values || [];
    
    if (rows.length < 2) {
      console.log(`  ⏭️  Tab "${tabName}": No data`);
      continue;
    }
    
    // Find lecturer column (contains "Dozent" or "Lehrbeauftragte")
    const header = rows[0];
    const lecturerCol = header.findIndex(h => 
      h && h.toLowerCase().includes('dozent') || h.toLowerCase().includes('lehrbeauftragte')
    );
    
    if (lecturerCol === -1) {
      console.log(`  ⏭️  Tab "${tabName}": No lecturer column found`);
      continue;
    }
    
    // Find course name column (usually column 0 or 1)
    const courseCol = header.findIndex((h, i) => 
      i !== lecturerCol && h && (
        h.toLowerCase().includes('veranstaltung') ||
        h.toLowerCase().includes('kurs') ||
        h.toLowerCase().includes('vorlesung') ||
        i === 0
      )
    );
    
    if (courseCol === -1) {
      console.log(`  ⏭️  Tab "${tabName}": No course column found`);
      continue;
    }
    
    console.log(`  📄 Tab "${tabName}": Lecturer col=${lecturerCol}, Course col=${courseCol}`);
    
    // Process rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lecturer = row[lecturerCol];
      const courseName = row[courseCol];
      
      if (!lecturer || !courseName) continue;
      
      // Insert into DB
      const result = insertLecturerCourse(lecturer, courseName, cohort, sheetName);
      if (result.success) {
        imported++;
      } else if (result.conflict) {
        conflicts.push(result.conflict);
      }
    }
  }
  
  console.log(`  ✅ Imported ${imported} course assignments`);
  totalImported += imported;
  totalSheets++;
}

// Helper: Insert lecturer_course into DB
function insertLecturerCourse(lecturerName, courseName, cohort, source) {
  // Find lecturer by name (fuzzy match)
  const lecturerQuery = `
    SELECT id, name FROM lecturers 
    WHERE LOWER(REPLACE(REPLACE(name, 'Prof. Dr. ', ''), 'Prof. ', '')) 
    LIKE LOWER('%${lecturerName.replace(/Prof\. (Dr\. )?/i, '')}%')
    LIMIT 1
  `;
  
  let lecturerId;
  try {
    const result = execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/crm.db "${lecturerQuery}"`,
      { encoding: 'utf8' }
    ).trim();
    
    if (!result) {
      console.log(`    ⚠️  Lecturer not found: ${lecturerName}`);
      return { success: false };
    }
    
    lecturerId = result.split('|')[0];
  } catch (err) {
    console.error(`    ❌ DB query failed: ${err.message}`);
    return { success: false };
  }
  
  // Check if already exists
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
        conflict: `${lecturerName} → ${courseName} (${cohort}) already exists`
      };
    }
  } catch (err) {
    console.error(`    ❌ Exists check failed: ${err.message}`);
    return { success: false };
  }
  
  // Insert
  const insertQuery = `
    INSERT INTO lecturer_courses (lecturer_id, semester, course_name, subject, source)
    VALUES (${lecturerId}, '${cohort}', '${courseName.replace(/'/g, "''")}', NULL, '${source}')
  `;
  
  try {
    execSync(
      `sqlite3 ~/.openclaw/workspace/crm_sgl/crm.db "${insertQuery}"`,
      { encoding: 'utf8' }
    );
    return { success: true };
  } catch (err) {
    console.error(`    ❌ Insert failed: ${err.message}`);
    return { success: false };
  }
}

// Main: Process all folders
console.log('🔍 Fetching files from Drive folders...\n');

for (const [cohort, folderId] of Object.entries(FOLDERS)) {
  console.log(`\n📁 Folder: ${cohort} (${folderId})`);
  
  // List files in folder
  const output = gog(`drive ls --parent=${folderId} --account ${GOG_ACCOUNT} --json --max=100`);
  if (!output) {
    console.log(`  ❌ Failed to list files`);
    continue;
  }
  
  let files;
  try {
    files = JSON.parse(output);
  } catch (err) {
    console.log(`  ❌ Failed to parse file list`);
    continue;
  }
  
  // Filter Google Sheets
  const sheets = files.filter(f => 
    f.mimeType === 'application/vnd.google-apps.spreadsheet'
  );
  
  console.log(`  Found ${sheets.length} Google Sheets`);
  
  // Process each sheet
  for (const sheet of sheets) {
    importFromSheet(sheet.id, cohort, sheet.name);
  }
}

// Summary
console.log('\n=== Summary ===');
console.log(`Processed sheets: ${totalSheets}`);
console.log(`Imported courses: ${totalImported}`);
console.log(`Skipped: ${totalSkipped}`);
console.log(`Conflicts: ${conflicts.length}`);

if (conflicts.length > 0) {
  console.log('\n⚠️  Conflicts (already existed):');
  conflicts.slice(0, 10).forEach(c => console.log(`  - ${c}`));
  if (conflicts.length > 10) {
    console.log(`  ... and ${conflicts.length - 10} more`);
  }
}

console.log('\n✅ Import complete!');
