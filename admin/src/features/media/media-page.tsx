import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  FileText,
  Image,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import * as api from "../../lib/content-api";
import type {
  AssetRow,
  ChapterRow,
  FlashcardRow,
  LessonRow,
  QuizRow,
  ReleaseRow,
  SafeAuditEntry,
  SourceRow,
} from "../../lib/content-api";
import {
  ConfirmAction,
  EmptyState as Empty,
  Field,
  PageIntro,
  StatusBadge as Badge,
} from "../../components/ui/admin-primitives";

export function Assets() {
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [file, setFile] = useState<File>();
  const [altText, setAltText] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () =>
    Promise.all([api.getAssets(), api.getCurriculum()]).then(
      ([nextRows, curriculum]) => {
        setRows(nextRows);
        setLessons(curriculum.lessons.filter(({ archived }) => !archived));
      },
    );
  useEffect(() => {
    void load();
  }, []);
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || altText.trim().length < 5)
      return setNotice(
        "Choose an image and write meaningful alternative text.",
      );
    if (file.size > 5 * 1024 * 1024)
      return setNotice("The image must be 5 MB or smaller.");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      return setNotice("Use a PNG, JPEG, or WebP image.");
    setBusy(true);
    try {
      const dimensions = await imageDimensions(file);
      if (dimensions.width > 4096 || dimensions.height > 4096)
        throw new Error("Image dimensions must not exceed 4096 × 4096 pixels.");
      await api.uploadAsset(file, altText, dimensions, lessonId || undefined);
      setFile(undefined);
      setAltText("");
      setNotice("Image uploaded to the private draft library.");
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageIntro
        eyebrow="SUPPORTING MEDIA"
        title="Accessible image library"
        detail="Uploaded images support recognition. Networking values and calculated facts remain displayed directly in the Android app."
      />
      {notice ? (
        <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-[#abd2c8]">
          {notice}
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <form
          className="grid gap-4 rounded-panel border border-line bg-surface p-6 shadow-panel"
          onSubmit={upload}
        >
          <h2>Upload supporting image</h2>
          <Field
            label="Related lesson"
            hint="Optional. Choose where this supporting image belongs."
          >
            <select
              value={lessonId}
              onChange={(event) => setLessonId(event.target.value)}
            >
              <option value="">General curriculum asset</option>
              {lessons.map((lesson) => (
                <option value={lesson.id} key={lesson.id}>
                  {lesson.draft.title}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Image file"
            hint="PNG, JPEG, or WebP. Maximum 5 MB and 4096 × 4096."
          >
            <input
              accept="image/png,image/jpeg,image/webp"
              required
              type="file"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </Field>
          <Field
            label="Alternative text"
            hint="Describe the meaningful visual information, not the filename."
          >
            <textarea
              required
              minLength={5}
              maxLength={500}
              rows={4}
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </Field>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
            disabled={busy}
          >
            <Upload />
            {busy ? "UPLOADING..." : "UPLOAD DRAFT IMAGE"}
          </button>
        </form>
        <section className="rounded-panel border border-line bg-surface p-6 shadow-panel">
          <h2>Media records</h2>
          <div className="grid gap-3">
            {rows.map((asset) => (
              <article
                className="grid grid-cols-[74px_minmax(0,1fr)_44px] items-center gap-3 rounded-control border border-line bg-canvas p-3 max-sm:grid-cols-[60px_minmax(0,1fr)]"
                key={asset.id}
              >
                <div className="grid size-[70px] place-items-center overflow-hidden rounded-control bg-raised text-muted [&_img]:size-full [&_img]:object-cover">
                  {asset.preview_url ? (
                    <img src={asset.preview_url} alt={asset.alt_text} />
                  ) : (
                    <Image />
                  )}
                </div>
                <div className="grid min-w-0 gap-1">
                  <Badge tone={asset.published ? "green" : "orange"}>
                    {asset.published ? "PUBLISHED" : "DRAFT"}
                  </Badge>
                  <strong className="block break-words">
                    {asset.alt_text}
                  </strong>
                  <small className="block text-muted">
                    {asset.width} × {asset.height} /{" "}
                    {Math.round(asset.byte_size / 1024)} KB
                  </small>
                </div>
                <ConfirmAction
                  className="grid size-11 place-items-center rounded-control border border-signal-red/60 bg-signal-red-soft text-[#ff858a] hover:border-signal-red [&_svg]:size-[18px]"
                  ariaLabel="Delete image"
                  confirmLabel="DELETE IMAGE"
                  detail="This permanently removes the unpublished image from draft storage."
                  disabled={asset.published}
                  onConfirm={() => api.deleteAsset(asset).then(load)}
                  title="Delete this draft image?"
                  triggerTitle={
                    asset.published
                      ? "Published images cannot be changed"
                      : "Delete draft image"
                  }
                >
                  <X />
                </ConfirmAction>
              </article>
            ))}
          </div>
          {!rows.length ? (
            <Empty
              title="No supporting images"
              detail="Upload an accessible image for a lesson draft."
            />
          ) : null}
        </section>
      </div>
    </>
  );
}
function imageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () =>
      reject(new Error("The selected image could not be read."));
    image.src = URL.createObjectURL(file);
  });
}
