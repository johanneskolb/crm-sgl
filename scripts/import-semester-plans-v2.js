#!/usr/bin/env node

/**
 * Import all semester plan sheets (HD21A21, HD22A21, HD23A23, HD24B21, HD25A23)
 * Direct Sheet IDs from Drive search results
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Direct Sheet IDs from previous search
const SHEETS = [
  {
    id: '1DPLGh3HbRmAhwc1H-LgQP0OgGF7KLIxDN7YhZ0aUWx8',
    name: 'HD21A21 - 6. Semester 23/24',
    cohort: 'HD21A21'
  },
  {
    id: '15yXW0syz1KFTNMRp-ZOlktdYU3ma1MRZLsKnzQzR808',
    name: 'HD21A21 - 5. Semester 23/24',
    cohort: 'HD21A21'
  },
  {
    id: '1YZ1B9Vr6vczXVXjnSasMmg7fvhjvrkQVXChzYqpKOwU',
    name: 'HD22A21 - 3. Semester 23/24',
    cohort: 'HD22A21'
  },
  // Need to find HD23A23, HD24B21, HD25A23
];

// OAuth account
const GOG_ACCOUNT = 'kolb.hannes@gmail.com';

// Keyring password
process.env.GOG_KEYRING_PASSWORD = fs.readFileSync(
  '/home/clawdy/.config/gogcli/.keyring_pass',
  'utf8'
).trim();

console.log('=== Import Semester Plans - Direct Sheet IDs ===\n');
console.log('⚠️  WARNING: Only 3 sheets found (HD21A21 x2, HD22A21 x1)');
console.log('⚠️  Missing: HD23A23, HD24B21, HD25A23');
console.log('⚠️  Will search for additional sheets now...\n');

// Helper: Run gog command
function gog(cmd) {
  try {
    const output = execSync(`gog ${cmd}`, { 
      encoding: 'utf8', 
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GOG_KEYRING_PASSWORD: process.env.GOG_KEYRING_PASSWORD }
    });
    return output;
  } catch (err) {
    console.error(`❌ gog command failed: ${cmd}`);
    if (err.stderr) console.error(err.stderr);
    return null;
  }
}

// Helper: Search for missing sheets
function searchSheets() {
  console.log('🔍 Searching for all HD semester sheets...\n');
  
  // Try different search patterns
  const patterns = ['HD23', 'HD24', 'HD25'];
  const foundSheets = [];
  
  for (const pattern of patterns) {
    const output = gog(`--account ${GOG_ACCOUNT} drive search "${pattern}" --json --max=50`);
    if (!output) continue;
    
    try {
      const data = JSON.parse(output);
      if (data.files) {
        const sheets = data.files.filter(f => 
          f.mimeType === 'application/vnd.google-apps.spreadsheet' &&
          f.name.match(/HD(23|24|25)/)
        );
        foundSheets.push(...sheets);
      }
    } catch (err) {
      console.error(`❌ Failed to parse search results for ${pattern}`);
    }
  }
  
  return foundSheets;
}

// Search for additional sheets
const additionalSheets = searchSheets();

if (additionalSheets.length > 0) {
  console.log(`✅ Found ${additionalSheets.length} additional sheets:\n`);
  additionalSheets.forEach(s => {
    const cohort = s.name.match(/HD\d{2}[AB]\d{2}/)?.[0] || 'UNKNOWN';
    console.log(`  - ${s.name} (${cohort})`);
    SHEETS.push({ id: s.id, name: s.name, cohort });
  });
  console.log('');
} else {
  console.log('⚠️  No additional sheets found via search\n');
}

// Stats
let totalImported = 0;
let totalSkipped = 0;
const conflicts = [];
const errors = [];

// Helper: Import courses from sheet
function importFromSheet(sheetId, cohort, sheetName) {
  console.log(`\n📋 Processing: ${sheetName}`);
  
  // Download sheet data
  const output = gog(`--account ${GOG_ACCOUNT} sheets read ${sheetId} --json`);
  if (!output) {
    console.log(`  ⏭️  Skipped (read failed)`);
    totalSkipped++;
    errors.push(`Read failed: ${sheetName}`);
    return;
  }
  
  let data;
  try {
    data = JSON.parse(output);
  } catch (err) {
    console.log(`  ⏭️  Skipped (parse failed)`);
    totalSkipped++;
    errors.push(`Parse failed: ${sheetName}`);
    return;
  }
  
  // Handle multiple sheets/tabs
  const sheets = Array.isArray(data) ? data : [data];
  let imported = 0;
  
  for (const sheet of sheets) {
    const tabName = sheet.title || sheet.name || 'Sheet1';
    const rows = sheet.data || sheet.values || [];
    
    if (rows.length < 2) {
      console.log(`  ⏭️  Tab "${tabName}": No data`);
      continue;
    }
    
    // Find columns
    const header = rows[0].map(h => (h || '').toLowerCase());
    const lecturerCol = header.findIndex(h => 
      h.includes('dozent') || h.includes('lehrbeauftragte') || h.includes('lecturer')
    );
    const courseCol = header.findIndex(h => 
      h.includes('veranstaltung') || h.includes('kurs') || h.includes('vorlesung') || h.includes('course')
    );
    
    if (lecturerCol === -1) {
      console.log(`  ⏭️  Tab "${tabName}": No lecturer column`);
      continue;
    }
    
    if (courseCol === -1) {
      console.log(`  ⏭️  Tab "${tabName}": No course column`);
      continue;
    }
    
    console.log(`  📄 Tab "${tabName}": Processing ${rows.length - 1} rows`);
    
    // Process rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lecturer = row[lecturerCol];
      const courseName = row[courseCol];
      
      if (!lecturer || !courseName) continue;
      
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
}

// Helper: Insert lecturer_course into DB
function insertLecturerCourse(lecturerName, courseName, cohort, source) {
  // Clean lecturer name
  const cleanName = lecturerName.replace(/Prof\. (Dr\. )?/gi, '').trim();
  
  // Find lecturer
  const lecturerQuery = `
    SELECT id, name FROM lecturers 
    WHERE LOWER(REPLACE(REPLACE(REPLACE(name, 'Prof. Dr. ', ''), 'Prof. ', ''), 'Dr. ', ''))
    LIKE LOWER('%${cleanName.replace(/'/g, "''")}%')
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
    console.error(`    ❌ Lecturer query failed: ${err.message}`);
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
        conflict: `${lecturerName} → ${courseName} (${cohort})`
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

// Process all sheets
console.log('📊 Processing sheets...\n');

for (const sheet of SHEETS) {
  importFromSheet(sheet.id, sheet.cohort, sheet.name);
}

// Summary
console.log('\n=== Summary ===');
console.log(`Processed sheets: ${SHEETS.length}`);
console.log(`Imported courses: ${totalImported}`);
console.log(`Skipped: ${totalSkipped}`);
console.log(`Conflicts: ${conflicts.length}`);
console.log(`Errors: ${errors.length}`);

if (conflicts.length > 0 && conflicts.length <= 10) {
  console.log('\n⚠️  Conflicts (already existed):');
  conflicts.forEach(c => console.log(`  - ${c}`));
} else if (conflicts.length > 10) {
  console.log(`\n⚠️  ${conflicts.length} conflicts (too many to list)`);
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(e => console.log(`  - ${e}`));
}

console.log('\n✅ Import complete!');
