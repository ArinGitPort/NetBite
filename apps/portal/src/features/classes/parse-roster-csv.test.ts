import { describe, expect, it } from 'vitest';

import { parseRosterCsv } from '@/features/classes/parse-roster-csv';

describe('roster CSV preview', () => {
  it('accepts a named email column and quoted CRLF rows', () => {
    expect(parseRosterCsv('Name,Email,Notes\r\n"Student, One",first@example.com,"A, B"\r\nStudent Two,second@example.com,')).toEqual([
      { email: 'first@example.com' }, { email: 'second@example.com' },
    ]);
  });

  it('accepts a single-column CSV and leaves invalid rows for server reporting', () => {
    expect(parseRosterCsv('first@example.com\nnot-an-email')).toEqual([{ email: 'first@example.com' }, { email: 'not-an-email' }]);
  });

  it('rejects unclosed quotes and oversized imports', () => {
    expect(() => parseRosterCsv('Email\n"unfinished')).toThrow(/unclosed/i);
    expect(() => parseRosterCsv('Email\n"first@example.com"extra')).toThrow(/closing quote/i);
    expect(() => parseRosterCsv(Array.from({ length: 201 }, (_, index) => `student${index}@example.com`).join('\n'))).toThrow(/200 rows/i);
  });
});
