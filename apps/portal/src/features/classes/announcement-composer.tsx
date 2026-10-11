import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { LoadingButtonContent } from "@/components/ui/loading-content";
import { getWorkshopAnnouncements, postWorkshopAnnouncement, type WorkshopAnnouncement } from "@/lib/api/workshop-service";

export function AnnouncementComposer({ classId, onNotice }: { classId: string; onNotice: (message: string) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [history, setHistory] = useState<WorkshopAnnouncement[]>([]);
  useEffect(() => {
    let active = true;
    void getWorkshopAnnouncements(classId).then((rows) => { if (active) setHistory(rows); }).catch(() => undefined);
    return () => { active = false; };
  }, [classId]);
  const send = async () => {
    if (sending || title.trim().length < 2 || body.trim().length < 2) return;
    setSending(true); setError(undefined);
    try {
      await postWorkshopAnnouncement(classId, title, body);
      setTitle(""); setBody(""); setOpen(false);
      onNotice("Announcement delivered to enrolled students' inboxes.");
      try { setHistory(await getWorkshopAnnouncements(classId)); }
      catch { onNotice("Announcement posted. Refresh this page to see it in history."); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The announcement could not be posted."); }
    finally { setSending(false); }
  };
  return <section className="border-t border-line py-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-1"><h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><Megaphone aria-hidden="true" className="size-4 text-signal-green" />Class announcements</h3><p className="m-0 text-xs text-muted">Messages appear in each currently enrolled learner's inbox.</p></div>
      <Button onClick={() => setOpen((value) => !value)} tone="secondary">{open ? "CANCEL" : "WRITE ANNOUNCEMENT"}</Button>
    </div>
    {open ? <div className="mt-4 grid gap-3 rounded-control border border-line bg-raised p-4">
      <label className="grid gap-1 text-xs font-semibold">Title<input className="min-h-11 rounded-control border border-line bg-canvas px-3 text-copy" maxLength={120} onChange={(event) => setTitle(event.target.value)} value={title} /></label>
      <label className="grid gap-1 text-xs font-semibold">Message<textarea className="min-h-32 rounded-control border border-line bg-canvas p-3 text-copy" maxLength={2000} onChange={(event) => setBody(event.target.value)} value={body} /></label>
      {error ? <p className="m-0 text-sm text-signal-red" role="alert">{error}</p> : null}
      <div><Button disabled={sending || title.trim().length < 2 || body.trim().length < 2} onClick={() => void send()} tone="primary">{sending ? <LoadingButtonContent label="POSTING..." /> : "POST TO CLASS"}</Button></div>
    </div> : null}
    {history.length ? <div className="mt-4 grid gap-2">{history.map((item) => <article className="grid gap-1 rounded-control bg-raised px-4 py-3" key={item.id}><strong className="text-sm">{item.title}</strong><p className="m-0 whitespace-pre-wrap text-xs leading-5 text-muted">{item.body}</p><time className="text-[0.65rem] text-muted" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></article>)}</div> : null}
  </section>;
}
