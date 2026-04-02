const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function parseMarkdown(content) {
  const themes = [];
  let currentTheme = null;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Theme header: # Title
    const headerMatch = trimmed.match(/^#\s+(.+)$/);
    if (headerMatch) {
      const name = headerMatch[1].replace(/\\/g, '').trim();
      if (!name) continue; // skip empty headers
      currentTheme = { name, phrases: [] };
      themes.push(currentTheme);
      continue;
    }

    // Table row: | Greek | Russian |
    if (currentTheme && trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length < 2) continue;

      const [greek, russian] = cells;

      // Skip header rows and separator rows
      if (greek === 'Ελληνικά' || greek === 'Перевод') continue;
      if (/^[-:\s]+$/.test(greek)) continue;
      if (!greek || !russian) continue;

      // Clean up markdown formatting (italic markers)
      const cleanGreek = greek.replace(/^\*+|\*+$/g, '').trim();
      const cleanRussian = russian.replace(/^\*+|\*+$/g, '').trim();

      if (cleanGreek && cleanRussian) {
        currentTheme.phrases.push({ greek: cleanGreek, russian: cleanRussian });
      }
    }
  }

  // Filter out themes with no phrases
  return themes.filter(t => t.phrases.length > 0);
}

async function importThemes() {
  const filePath = path.join(__dirname, '..', 'Частые темы.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const themes = parseMarkdown(content);

  console.log(`Parsed ${themes.length} themes:`);
  themes.forEach((t, i) => console.log(`  ${i + 1}. ${t.name} (${t.phrases.length} phrases)`));

  const totalPhrases = themes.reduce((sum, t) => sum + t.phrases.length, 0);
  console.log(`Total phrases: ${totalPhrases}`);

  // Clear existing data (order matters for FK constraints)
  console.log('\nClearing existing data...');
  await supabase.from('ThemeProgress').delete().neq('id', 0);
  await supabase.from('ThemePhrases').delete().neq('id', 0);
  await supabase.from('Themes').delete().neq('id', 0);
  console.log('Done.');

  // Insert themes and phrases
  for (let i = 0; i < themes.length; i++) {
    const theme = themes[i];

    const { data: inserted, error: themeError } = await supabase
      .from('Themes')
      .insert({ Name: theme.name, OrderIndex: i })
      .select()
      .single();

    if (themeError) {
      console.error(`Error inserting theme "${theme.name}":`, themeError);
      continue;
    }

    const phrasesToInsert = theme.phrases.map((p, j) => ({
      ThemeId: inserted.id,
      Greek: p.greek,
      Russian: p.russian,
      OrderIndex: j,
    }));

    const { error: phrasesError } = await supabase
      .from('ThemePhrases')
      .insert(phrasesToInsert);

    if (phrasesError) {
      console.error(`Error inserting phrases for "${theme.name}":`, phrasesError);
    } else {
      console.log(`✓ ${theme.name}: ${theme.phrases.length} phrases`);
    }
  }

  console.log('\nImport complete!');
}

importThemes().catch(console.error);
