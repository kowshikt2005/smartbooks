const fs = require('fs');
const path = require('path');

// Read the migration files and output the SQL
console.log('='.repeat(80));
console.log('DATABASE MIGRATION COMMANDS');
console.log('='.repeat(80));
console.log('');
console.log('Copy and paste these SQL commands into your Supabase SQL Editor:');
console.log('');

console.log('-- STEP 1: Schema Migration');
console.log('-- Copy and run this first:');
console.log('');

try {
  const schemaSQL = fs.readFileSync(
    path.join(__dirname, 'src/lib/database/migrations/003_new_customer_schema.sql'), 
    'utf8'
  );
  console.log(schemaSQL);
} catch (error) {
  console.error('Error reading schema file:', error.message);
}

console.log('');
console.log('-- STEP 2: Seed Data Migration');
console.log('-- Copy and run this second:');
console.log('');

try {
  const seedSQL = fs.readFileSync(
    path.join(__dirname, 'src/lib/database/migrations/004_seed_new_customer_data.sql'), 
    'utf8'
  );
  console.log(seedSQL);
} catch (error) {
  console.error('Error reading seed file:', error.message);
}

console.log('');
console.log('='.repeat(80));
console.log('After running both SQL scripts, start your app with: npm run dev');
console.log('='.repeat(80));