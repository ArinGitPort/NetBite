import {
  type CSSProperties,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface StrokeTextProps {
  text: string;
  className?: string;
  drawDuration?: number;
  fillDelay?: number;
  fontSize?: number;
  fontWeight?: CSSProperties["fontWeight"];
  letterSpacing?: number;
  strokeWidth?: number;
}

interface TextBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function StrokeText({
  text,
  className = "",
  drawDuration = 1.15,
  fillDelay = 0.08,
  fontSize = 100,
  fontWeight = 700,
  letterSpacing = -4,
  strokeWidth = 1.5,
}: StrokeTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const wipeRef = useRef<SVGRectElement>(null);
  const [bounds, setBounds] = useState<TextBounds>();
  const rawId = useId();
  const clipId = `stroke-text-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const characters = useMemo(() => Array.from(text), [text]);
  const dashLength = Math.max(fontSize * 8, 240);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const textStyle = useMemo<CSSProperties>(
    () => ({
      fontFamily: "inherit",
      fontSize,
      fontWeight,
      letterSpacing,
    }),
    [fontSize, fontWeight, letterSpacing],
  );

  useLayoutEffect(() => {
    let cancelled = false;

    const measure = () => {
      if (cancelled || !textRef.current) return;
      try {
        const box = textRef.current.getBBox();
        if (!box.width || !box.height) return;
        const padding = Math.max(strokeWidth * 2, fontSize * 0.04);
        setBounds({
          x: box.x - padding,
          y: box.y - padding,
          width: box.width + padding * 2,
          height: box.height + padding * 2,
        });
      } catch {
        // SVG measurement is unavailable in non-visual renderers.
      }
    };

    measure();
    void document.fonts?.ready.then(measure).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [fontSize, fontWeight, letterSpacing, strokeWidth, text]);

  useEffect(() => {
    const root = rootRef.current;
    const wipe = wipeRef.current;
    if (!root || !wipe || !bounds) return;

    const strokes = root.querySelectorAll<SVGTSpanElement>("[data-stroke-character]");
    if (reducedMotion) return;

    let cancelled = false;
    let context: { revert: () => void } | undefined;
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      context = gsap.context(() => {
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          .to(strokes, {
            duration: drawDuration,
            ease: "power2.out",
            stagger: 0.035,
            strokeDashoffset: 0,
          })
          .to(
            wipe,
            {
              attr: { width: bounds.width },
              duration: Math.max(0.4, drawDuration * 0.55),
              ease: "power2.inOut",
            },
            drawDuration + fillDelay,
          );
      }, root);
    });

    return () => {
      cancelled = true;
      context?.revert();
    };
  }, [bounds, drawDuration, fillDelay, reducedMotion]);

  const fallbackBounds: TextBounds = {
    x: 0,
    y: -fontSize,
    width: Math.max(text.length * fontSize * 0.58, fontSize),
    height: fontSize * 1.15,
  };
  const viewBounds = bounds ?? fallbackBounds;

  return (
    <span
      aria-label={text}
      className={`block leading-none ${className}`.trim()}
      ref={rootRef}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="block h-auto w-full overflow-visible"
        preserveAspectRatio="xMinYMid meet"
        viewBox={`${viewBounds.x} ${viewBounds.y} ${viewBounds.width} ${viewBounds.height}`}
      >
        <defs>
          <clipPath clipPathUnits="userSpaceOnUse" id={clipId}>
            <rect
              height={viewBounds.height}
              ref={wipeRef}
              width={reducedMotion ? viewBounds.width : 0}
              x={viewBounds.x}
              y={viewBounds.y}
            />
          </clipPath>
        </defs>
        <text
          className="select-none"
          fill="none"
          ref={textRef}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          style={textStyle}
          x="0"
          y="0"
        >
          {characters.map((character, index) => (
            <tspan
              data-stroke-character
              key={`${character}-${index}`}
              strokeDasharray={dashLength}
              strokeDashoffset={reducedMotion ? 0 : dashLength}
            >
              {character}
            </tspan>
          ))}
        </text>
        <text
          className="select-none"
          clipPath={`url(#${clipId})`}
          fill="currentColor"
          style={textStyle}
          x="0"
          y="0"
        >
          {text}
        </text>
      </svg>
    </span>
  );
}
