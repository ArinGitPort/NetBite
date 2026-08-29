import {
  ChevronDown,
  Image as ImageIcon,
  Monitor,
  Network,
  Router,
  Server,
  X,
} from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type {
  WorkshopLessonBlock,
  WorkshopTopology,
  WorkshopTopologyDevice,
} from "@netbite/workshops/contracts";
import {
  calculateWorkshopTopologyGeometry,
  normalizeWorkshopTopology,
} from "@netbite/workshops/topology-authoring";
import type { WorkshopTopologyRow } from "../../lib/content-api";

function DeviceIcon({ type }: { type: WorkshopTopologyDevice["type"] }) {
  if (type === "router") return <Router aria-hidden="true" />;
  if (type === "server") return <Server aria-hidden="true" />;
  if (type === "switch") return <Network aria-hidden="true" />;
  return <Monitor aria-hidden="true" />;
}

function TopologyPreview({ topology }: { topology: WorkshopTopology }) {
  const normalized = useMemo(
    () => normalizeWorkshopTopology(topology),
    [topology],
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    fontScale: 1,
  });
  const [nodeSizes, setNodeSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      const rootFontSize =
        Number.parseFloat(
          window.getComputedStyle(document.documentElement).fontSize,
        ) || 16;
      const nextViewport = {
        width: bounds.width,
        height: bounds.height,
        fontScale: Math.max(1, rootFontSize / 16),
      };
      setViewport((current) =>
        current.width === nextViewport.width &&
        current.height === nextViewport.height &&
        current.fontScale === nextViewport.fontScale
          ? current
          : nextViewport,
      );
      const nextNodeSizes = Object.fromEntries(
        normalized.devices.map((device) => {
          const rect = canvas
            .querySelector<HTMLElement>(
              `[data-preview-device-id="${CSS.escape(device.id)}"]`,
            )
            ?.getBoundingClientRect();
          return [
            device.id,
            { width: rect?.width ?? 72, height: rect?.height ?? 54 },
          ];
        }),
      );
      setNodeSizes((current) =>
        Object.keys(nextNodeSizes).length === Object.keys(current).length &&
        Object.entries(nextNodeSizes).every(
          ([id, size]) =>
            current[id]?.width === size.width &&
            current[id]?.height === size.height,
        )
          ? current
          : nextNodeSizes,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [normalized.devices]);
  const geometry = useMemo(
    () =>
      calculateWorkshopTopologyGeometry(
        normalized,
        viewport,
        normalized.devices.map((device) => ({
          deviceId: device.id,
          x: device.x * viewport.width,
          y: device.y * viewport.height,
          width: nodeSizes[device.id]?.width ?? 72,
          height: nodeSizes[device.id]?.height ?? 54,
        })),
      ),
    [nodeSizes, normalized, viewport],
  );
  const labels = geometry.flatMap((cable) => [
    ...cable.endpointLabels,
    cable.contextLabel,
  ]);
  return (
    <figure
      className="m-0 grid gap-2"
      aria-label={topology.accessibilityDescription}
    >
      <figcaption className="font-semibold text-copy">
        {topology.title}
      </figcaption>
      <div
        ref={canvasRef}
        className="relative h-64 overflow-hidden rounded-control border border-line bg-canvas bg-[image:var(--nb-grid)] bg-[size:20px_20px]"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full [&_line]:stroke-signal-green [&_line]:[stroke-width:1.5]"
          preserveAspectRatio="none"
          viewBox={`0 0 ${Math.max(1, viewport.width)} ${Math.max(1, viewport.height)}`}
        >
          {geometry.map((cable) => {
            const link = normalized.links.find(
              (candidate) => candidate.id === cable.linkId,
            );
            return (
              <line
                className={
                  link?.state === "down" ? "stroke-signal-red!" : undefined
                }
                key={cable.linkId}
                x1={cable.start.x}
                x2={cable.end.x}
                y1={cable.start.y}
                y2={cable.end.y}
              />
            );
          })}
        </svg>
        {normalized.devices.map((device) => (
          <div
            data-preview-device-id={device.id}
            className="absolute z-[1] grid w-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center gap-1 rounded-control border border-line bg-raised px-2 py-2 text-center"
            key={device.id}
            style={{ left: `${device.x * 100}%`, top: `${device.y * 100}%` }}
          >
            <span className="text-signal-green [&_svg]:size-5">
              <DeviceIcon type={device.type} />
            </span>
            <strong className="max-w-full truncate text-[0.62rem]">
              {device.name}
            </strong>
          </div>
        ))}
        {labels.map((label) => (
          <span
            className={`absolute z-[2] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[3px] border py-1 font-mono text-[0.52rem] font-semibold text-white shadow-[0_1px_4px_rgba(0,0,0,.7)] ${label.kind === "endpoint" ? "px-1" : "px-2"} ${label.tone === "warning" ? "border-signal-orange bg-[#2b1c12]" : "border-[#6f6673] bg-[#171419]"}`}
            key={label.id}
            style={{
              left: label.x,
              top: label.y,
              minWidth: label.width,
              minHeight: label.height,
            }}
          >
            {label.text}
          </span>
        ))}
      </div>
      <p className="m-0 text-[0.65rem] leading-5 text-muted">
        {topology.devices.length} devices · {topology.links.length} connections
      </p>
    </figure>
  );
}

function CommandBlockPreview({ block }: { block: WorkshopLessonBlock }) {
  const [expanded, setExpanded] = useState(false);
  const groups = block.commandGroups ?? [];
  const lineCount = groups.reduce(
    (total, group) => total + group.commands.length,
    0,
  );
  return (
    <section className="rounded-control border border-line bg-canvas">
      <button
        aria-expanded={expanded}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="grid gap-1">
          <strong className="font-mono text-[0.65rem] tracking-[0.12em] text-signal-orange">
            {(block.title || "CONFIGURATION COMMANDS").toUpperCase()}
          </strong>
          <span className="text-[0.65rem] text-muted">
            {groups.length} device groups · {lineCount} command lines
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-copy">
          {expanded ? "HIDE COMMANDS" : "SHOW COMMANDS"}
          <ChevronDown
            className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {expanded ? (
        <div className="grid gap-4 border-t border-line p-4">
          {block.introduction ? (
            <p className="m-0 text-xs leading-5 text-muted">
              {block.introduction}
            </p>
          ) : null}
          {groups.map((group) => (
            <section className="grid gap-2" key={group.id}>
              <strong className="text-xs text-copy">{group.title}</strong>
              <pre className="m-0 overflow-x-auto whitespace-pre-wrap rounded-control bg-raised p-3 font-mono text-[0.68rem] leading-5 text-copy">
                {group.commands.join("\n")}
              </pre>
              {group.explanation ? (
                <p className="m-0 text-xs leading-5 text-muted">
                  {group.explanation}
                </p>
              ) : null}
            </section>
          ))}
          <p className="m-0 border-t border-line pt-3 text-[0.65rem] leading-5 text-muted">
            Read-only reference. NetBite does not execute these commands.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function LessonBlockPreview({
  block,
  topologies,
}: {
  block: WorkshopLessonBlock;
  topologies: WorkshopTopologyRow[];
}) {
  if (block.type === "heading") {
    return (
      <h3 className="m-0 border-b border-line pb-2 text-base text-signal-orange">
        {block.text || "Section title"}
      </h3>
    );
  }
  if (block.type === "paragraph") {
    return (
      <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-copy">
        {block.text || "Body text will appear here."}
      </p>
    );
  }
  if (block.type === "callout" || block.type === "example") {
    const example = block.type === "example";
    return (
      <aside
        className={`grid gap-1 border-l-2 p-4 ${
          example
            ? "border-signal-green bg-signal-green-soft"
            : "border-signal-orange bg-signal-orange-soft"
        }`}
      >
        <strong
          className={`font-mono text-[0.65rem] tracking-[0.12em] ${
            example ? "text-signal-green" : "text-signal-orange"
          }`}
        >
          {example ? "WORKED EXAMPLE" : "IMPORTANT NOTE"}
        </strong>
        <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-copy">
          {block.text ||
            (example
              ? "The worked example will appear here."
              : "The important note will appear here.")}
        </p>
      </aside>
    );
  }
  if (block.type === "image") {
    return block.imageUrl ? (
      <figure className="m-0 grid gap-2">
        <img
          alt={block.altText || "Supporting lesson image"}
          className="max-h-64 w-full rounded-control border border-line object-contain"
          src={block.imageUrl}
        />
        {block.altText ? (
          <figcaption className="text-[0.65rem] leading-5 text-muted">
            {block.altText}
          </figcaption>
        ) : null}
      </figure>
    ) : (
      <div className="grid min-h-32 place-items-center content-center gap-2 rounded-control border border-dashed border-line text-center text-muted">
        <ImageIcon aria-hidden="true" className="size-5" />
        <span className="text-xs">Supporting image will appear here.</span>
      </div>
    );
  }

  if (block.type === "commands") {
    return <CommandBlockPreview block={block} />;
  }

  const row = topologies.find(
    (topology) => topology.stable_id === block.topologyId,
  );
  const topology = row?.definition as unknown as WorkshopTopology | undefined;
  return topology ? (
    <TopologyPreview topology={topology} />
  ) : (
    <div className="grid min-h-32 place-items-center content-center gap-2 rounded-control border border-dashed border-line text-center text-muted">
      <Network aria-hidden="true" className="size-5" />
      <span className="text-xs">Choose a topology to preview it here.</span>
    </div>
  );
}

export function LessonMobilePreview({
  collectionTitle,
  title,
  summary,
  blocks,
  topologies,
}: {
  collectionTitle: string;
  title: string;
  summary: string;
  blocks: WorkshopLessonBlock[];
  topologies: WorkshopTopologyRow[];
}) {
  return (
    <section
      className="grid min-h-[620px] place-items-start justify-center bg-canvas p-5 max-sm:p-3"
      data-testid="workshop-lesson-mobile-preview"
    >
      <div className="h-[680px] w-full max-w-[390px] overflow-hidden rounded-[30px] border-8 border-raised bg-canvas shadow-panel">
        <div className="themed-scrollbar h-full overflow-y-auto bg-canvas">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-line bg-canvas/95 px-5 backdrop-blur">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-signal-red">
            <X aria-hidden="true" className="size-5" />
            CLOSE
          </span>
          <span className="font-mono text-[0.62rem] tracking-[0.12em] text-muted">
            LESSON PREVIEW
          </span>
        </header>
        <div className="grid gap-5 p-5">
          <div className="grid gap-2 border-b border-line pb-5">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-signal-orange">
              {collectionTitle || "Lesson collection"}
            </span>
            <h2 className="m-0 text-xl uppercase leading-7 text-copy">
              {title || "Untitled lesson"}
            </h2>
            <p className="m-0 text-sm leading-6 text-muted">
              {summary || "Add a short description for students."}
            </p>
          </div>
          {blocks.length ? (
            blocks.map((block) => (
              <LessonBlockPreview
                block={block}
                key={block.id}
                topologies={topologies}
              />
            ))
          ) : (
            <div className="grid min-h-40 place-items-center content-center gap-2 rounded-control border border-dashed border-line px-5 text-center">
              <Network aria-hidden="true" className="size-6 text-muted" />
              <strong className="text-sm">No lesson content yet</strong>
              <p className="m-0 text-xs leading-5 text-muted">
                Return to Edit and add content blocks to preview the lesson.
              </p>
            </div>
          )}
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] tracking-[0.1em] text-muted">
            PREVIEW ONLY · CURRENT UNSAVED DRAFT
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
