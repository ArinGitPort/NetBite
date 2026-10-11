export function parseRosterCsv(text: string): Array<{ email: string }> {
  if (text.length > 50_000) throw new Error('Use a CSV file smaller than 50 KB.');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (quoted) { quoted = false; closedQuote = true; }
      else if (cell.trim() || closedQuote) throw new Error('The CSV file has an unexpected quote.');
      else quoted = true;
    } else if (character === ',' && !quoted) {
      row.push(cell.trim()); cell = ''; closedQuote = false;
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim()); cell = ''; closedQuote = false;
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else if (closedQuote && !quoted) {
      if (!/\s/.test(character)) throw new Error('The CSV file has text after a closing quote.');
    } else cell += character;
  }
  if (quoted) throw new Error('The CSV file has an unclosed quoted value.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) throw new Error('The CSV file is empty.');
  const headerIndex = rows[0].findIndex((value) => /^(email|email address|e-mail)$/i.test(value));
  const data = headerIndex >= 0 ? rows.slice(1) : rows;
  const column = headerIndex >= 0 ? headerIndex : 0;
  if (!data.length) throw new Error('Add at least one email address below the CSV header.');
  if (data.length > 200) throw new Error('Import no more than 200 rows at a time.');
  return data.map((values) => ({ email: (values[column] ?? '').trim() }));
}
