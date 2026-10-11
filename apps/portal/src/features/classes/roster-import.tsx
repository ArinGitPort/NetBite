import { Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/dialog';
import { parseRosterCsv } from '@/features/classes/parse-roster-csv';
import { processWorkshopRoster, type RosterImportRow } from '@/lib/api/workshop-service';

export function RosterImport({ classId, onImported }: { classId: string; onImported: (count: number) => void }) {
  const [source, setSource] = useState<Array<{ email: string }>>([]);
  const [preview, setPreview] = useState<RosterImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const selectFile = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); setError(undefined); setPreview([]);
    try {
      if (file.size > 50_000) throw new Error('Use a CSV file smaller than 50 KB.');
      const rows = parseRosterCsv(await file.text());
      setSource(rows);
      setPreview(await processWorkshopRoster(classId, rows));
    } catch (reason) { setSource([]); setError(reason instanceof Error ? reason.message : 'The CSV file could not be checked.'); }
    finally { setBusy(false); }
  };
  const eligible = preview.filter((row) => row.status === 'ready').length;
  const importRows = async () => {
    try {
      const results = await processWorkshopRoster(classId, source, true);
      setPreview(results);
      onImported(results.filter((row) => row.status === 'enrolled').length);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The roster could not be imported.';
      setError(message); throw new Error(message);
    }
  };
  return <section className="border-t border-line py-5">
    <div className="grid gap-1"><h3 className="m-0 text-sm font-semibold">Import existing students</h3><p className="m-0 text-xs leading-5 text-muted">Upload a CSV with an Email column. Only matching NetBite accounts can be enrolled; everyone else can still join with the class code.</p></div>
    <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-line bg-raised px-3 text-xs font-semibold hover:bg-canvas"><Upload aria-hidden="true" className="size-4" />{busy ? 'CHECKING ROSTER...' : 'CHOOSE CSV'}<input accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(event) => void selectFile(event.target.files?.[0])} type="file" /></label>
    {error ? <p className="mt-2 text-xs text-signal-red" role="alert">{error}</p> : null}
    {preview.length ? <div className="mt-4 grid gap-3">
      <p className="m-0 text-xs text-muted" aria-live="polite">{eligible} ready · {preview.filter((row) => row.status === 'already-enrolled').length} already enrolled · {preview.filter((row) => row.status === 'unmatched').length} unmatched · {preview.filter((row) => row.status === 'invalid').length} invalid · {preview.filter((row) => row.status === 'duplicate').length} duplicate</p>
      <div className="max-h-64 overflow-auto rounded-control border border-line"><table className="w-full border-collapse text-left text-xs"><thead className="sticky top-0 bg-raised"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Result</th></tr></thead><tbody>{preview.map((row) => <tr className="border-t border-line" key={row.row}><td className="px-3 py-2">{row.row}</td><td className="break-all px-3 py-2">{row.email || '—'}</td><td className="px-3 py-2 capitalize">{row.status.replace('-', ' ')}</td></tr>)}</tbody></table></div>
      {eligible ? <div><ConfirmationDialog busyLabel="ENROLLING..." confirmLabel={`ENROLL ${eligible} STUDENT${eligible === 1 ? '' : 'S'}`} description={`Enroll the ${eligible} matched account${eligible === 1 ? '' : 's'} in this class? The server will recheck every row before making changes.`} intent="warning" onConfirm={importRows} title="Import this roster?" trigger={<Button tone="primary">IMPORT ELIGIBLE STUDENTS</Button>} /></div> : null}
    </div> : null}
  </section>;
}
