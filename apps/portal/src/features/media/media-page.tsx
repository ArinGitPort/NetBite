import { Image, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import * as curriculumApi from "@/lib/api/curriculum-service";
import * as mediaApi from "@/lib/api/media-service";
import type { AssetRow, LessonRow } from "@/lib/api/types";
import {
  EmptyState as Empty,
  Field,
  PageIntro,
} from "@/components/ui/admin-primitives";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { ConfirmAction, Dialog } from "@/components/ui/dialog";
import { InlineWaveSpinner } from "@/components/shadcn-space/spinner/spinner-10";
import {
  LoadingButtonContent,
  LoadingContent,
} from "@/components/ui/loading-content";
import { SelectField } from "@/components/ui/select";

export function Assets() {
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [file, setFile] = useState<File>();
  const [altText, setAltText] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filePreview, setFilePreview] = useState<string>();
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetRow>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const load = () =>
    Promise.all([mediaApi.getAssets(), curriculumApi.getCurriculum()])
      .then(([nextRows, curriculum]) => {
        setRows(nextRows);
        setLessons(curriculum.lessons.filter(({ archived }) => !archived));
      })
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!file) {
      setFilePreview(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const clearFile = () => {
    setFilePreviewOpen(false);
    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
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
      await mediaApi.uploadAsset(
        file,
        altText,
        dimensions,
        lessonId || undefined,
      );
      clearFile();
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
        <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-signal-green">
          {notice}
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <form
          className="grid gap-4 rounded-panel border border-line bg-surface p-5 shadow-panel"
          onSubmit={upload}
        >
          <h2 className="text-lg">Upload supporting image</h2>
          <Field
            label="Related lesson"
            hint="Optional. Choose where this supporting image belongs."
          >
            <SelectField
              ariaLabel="Related lesson"
              onValueChange={setLessonId}
              options={lessons.map((lesson) => ({
                value: lesson.id,
                label: lesson.draft.title,
              }))}
              placeholder="General curriculum asset"
              value={lessonId}
            />
          </Field>
          <Field
            label="Image file"
            hint="PNG, JPEG, or WebP. Maximum 5 MB and 4096 × 4096."
          >
            <input
              accept="image/png,image/jpeg,image/webp"
              ref={fileInputRef}
              required
              type="file"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </Field>
          {file ? (
            <Attachment className="w-full" state={busy ? "uploading" : "idle"}>
              <AttachmentTrigger
                aria-label={`Preview ${file.name}`}
                disabled={busy || !filePreview}
                onClick={() => setFilePreviewOpen(true)}
              />
              <AttachmentMedia variant={busy ? "icon" : "image"}>
                {busy ? (
                  <InlineWaveSpinner decorative label={`Uploading ${file.name}`} />
                ) : filePreview ? (
                  <img alt="" src={filePreview} />
                ) : (
                  <Image />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{file.name}</AttachmentTitle>
                <AttachmentDescription>
                  {busy
                    ? "Uploading"
                    : `${formatMimeType(file.type)} · ${formatBytes(file.size)}`}
                </AttachmentDescription>
              </AttachmentContent>
              {!busy ? (
                <AttachmentActions>
                  <AttachmentAction
                    aria-label={`Remove ${file.name}`}
                    onClick={clearFile}
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              ) : null}
            </Attachment>
          ) : null}
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
          <Button disabled={busy} tone="primary" type="submit">
            {busy ? (
              <LoadingButtonContent label="UPLOADING..." />
            ) : (
              <>
                <Upload />
                UPLOAD DRAFT IMAGE
              </>
            )}
          </Button>
        </form>
        <section className="rounded-panel border border-line bg-surface p-5 shadow-panel">
          <h2 className="text-lg">Media records</h2>
          {loading ? (
            <LoadingContent label="Loading media records" variant="section" />
          ) : (
            <div className="grid gap-3 pt-4">
              {rows.map((asset) => (
                <Attachment className="w-full" key={asset.id}>
                  <AttachmentTrigger
                    aria-label={`Preview ${asset.alt_text}`}
                    disabled={!asset.preview_url}
                    onClick={() => setPreviewAsset(asset)}
                  />
                  <AttachmentMedia variant="image">
                    {asset.preview_url ? (
                      <img alt="" src={asset.preview_url} />
                    ) : (
                      <Image />
                    )}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{asset.alt_text}</AttachmentTitle>
                    <AttachmentDescription>
                      {asset.published ? "Published" : "Draft"} ·{" "}
                      {formatMimeType(asset.mime_type)} ·{" "}
                      {formatBytes(asset.byte_size)} · {asset.width} ×{" "}
                      {asset.height}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <ConfirmAction
                      ariaLabel="Delete image"
                      className="grid size-8 place-items-center rounded-control border border-transparent text-muted transition-colors hover:border-signal-red/50 hover:bg-signal-red-soft hover:text-signal-red disabled:opacity-50 [&_svg]:size-4"
                      confirmLabel="DELETE IMAGE"
                      detail="This permanently removes the unpublished image from draft storage."
                      disabled={asset.published}
                      onConfirm={() => mediaApi.deleteAsset(asset).then(load)}
                      title="Delete this draft image?"
                      triggerTitle={
                        asset.published
                          ? "Published images cannot be changed"
                          : "Delete draft image"
                      }
                    >
                      <X />
                    </ConfirmAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </div>
          )}
          {!loading && !rows.length ? (
            <Empty
              title="No supporting images"
              detail="Upload an accessible image for a lesson draft."
            />
          ) : null}
        </section>
      </div>
      <Dialog
        description={
          previewAsset
            ? `${formatMimeType(previewAsset.mime_type)} · ${formatBytes(previewAsset.byte_size)} · ${previewAsset.width} × ${previewAsset.height}`
            : undefined
        }
        onOpenChange={(open) => {
          if (!open) setPreviewAsset(undefined);
        }}
        open={Boolean(previewAsset)}
        title={previewAsset?.alt_text ?? "Image preview"}
      >
        {previewAsset?.preview_url ? (
          <figure className="m-0 grid gap-3">
            <div className="grid min-h-48 place-items-center overflow-hidden rounded-control border border-line bg-canvas p-2">
              <img
                alt={previewAsset.alt_text}
                className="max-h-[70vh] max-w-full object-contain"
                src={previewAsset.preview_url}
              />
            </div>
            <figcaption className="text-xs text-muted">
              {previewAsset.published ? "Published curriculum media" : "Private draft media"}
            </figcaption>
          </figure>
        ) : null}
      </Dialog>
      <Dialog
        description={
          file
            ? `${formatMimeType(file.type)} · ${formatBytes(file.size)}`
            : undefined
        }
        onOpenChange={setFilePreviewOpen}
        open={filePreviewOpen && Boolean(filePreview)}
        title={file?.name ?? "Selected image preview"}
      >
        {filePreview ? (
          <div className="grid min-h-48 place-items-center overflow-hidden rounded-control border border-line bg-canvas p-2">
            <img
              alt={altText.trim() || file?.name || "Selected image"}
              className="max-h-[70vh] max-w-full object-contain"
              src={filePreview}
            />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function formatMimeType(mimeType: string) {
  return mimeType.split("/").at(-1)?.toUpperCase() || "IMAGE";
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
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
