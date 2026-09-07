// Fix album data for gallery 29 (Hochzeitsfotos Fotohahn)
// Run: node scripts/fix-albums.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://db.fotohahn.ch';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY5Nzk4MCwiZXhwIjo0OTI5MzcxNTgwLCJyb2xlIjoiYW5vbiJ9.jW01UhBOuPYmOA497gUagDCnRJYutEKYvBzT0uc50sY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login as Daniel
const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
  email: 'info@fotohahn.ch',
  password: process.argv[2] || '',
});

if (authErr) {
  console.error('❌ Login fehlgeschlagen:', authErr.message);
  console.log('Usage: node scripts/fix-albums.mjs <password>');
  process.exit(1);
}

console.log('✅ Eingeloggt als:', authData.user.email);

const GALLERY_ID = 29;

// Step 1: Delete all existing albums
const { error: delErr } = await supabase.from('albums').delete().eq('gallery_id', GALLERY_ID);
if (delErr) { console.error('❌ Delete error:', delErr); process.exit(1); }
console.log('✅ Alte Alben gelöscht');

// Step 2: Insert correct albums matching image album_index values
const correctAlbums = [
  { gallery_id: GALLERY_ID, name: 'Engagement-Fotoshooting', sort_order: 0, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'Getting Ready', sort_order: 1, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'First Look', sort_order: 2, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'Brautpaarshooting', sort_order: 3, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'Ankunft Gäste', sort_order: 4, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'Trauung', sort_order: 5, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'Apéro, Gratulationen & Gruppenfotos', sort_order: 6, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'Abendprogramm', sort_order: 7, toggles: {} },
  { gallery_id: GALLERY_ID, name: 'Fotobox', sort_order: 8, toggles: {} },
];

const { data: inserted, error: insErr } = await supabase.from('albums').insert(correctAlbums).select();
if (insErr) { console.error('❌ Insert error:', insErr); process.exit(1); }

console.log(`✅ ${inserted.length} Alben korrekt eingefügt:`);
inserted.forEach(a => console.log(`   ${a.sort_order}: ${a.name}`));

// Verify image counts
console.log('\n📊 Bilder-Verteilung:');
for (let i = 0; i <= 8; i++) {
  const { count } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })
    .eq('gallery_id', GALLERY_ID)
    .eq('album_index', i);
  console.log(`   Album ${i} (${correctAlbums[i].name}): ${count} Bilder`);
}

console.log('\n✅ Fertig! Bitte Seite neu laden (Cmd+Shift+R)');
await supabase.auth.signOut();
