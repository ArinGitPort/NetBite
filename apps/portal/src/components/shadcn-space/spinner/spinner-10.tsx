"use client";

import { memo, useId, useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/class-names";

type TextMorphProps = {
  words: string[];
  interval?: number;
  className?: string;
};

export function TextMorph({
  words,
  interval = 2000,
  className,
}: TextMorphProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!words.length) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [words, interval]);

  const chars = useMemo(() => {
    return Array.from(words[index] ?? "");
  }, [index, words]);

  if (!words.length) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={index}
        className={cn("flex gap-0.25 overflow-hidden", className)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.4 }}
      >
        {chars.map((char, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: 5, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -5, filter: "blur(5px)" }}
            transition={{
              delay: i * 0.03,
              duration: 0.3,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}

interface LiquidWaveSpinnerProps extends HTMLMotionProps<"div"> {
  size?: "sm" | "md" | "lg";
  hideText?: boolean;
  words?: string[];
}

const sizeConfig = {
  sm: {
    container: "w-full gap-3",
    svgWidth: 80,
    svgHeight: 80,
    fontSize: "text-xs",
  },
  md: {
    container: "w-full gap-6",
    svgWidth: 120,
    svgHeight: 120,
    fontSize: "text-sm",
  },
  lg: {
    container: "w-full gap-8",
    svgWidth: 180,
    svgHeight: 180,
    fontSize: "text-base",
  },
} as const;

const WAVE_PATH =
  "M 0 36.5 " +
  "C 67.43 36.5, 99.09 15.5, 160.53 15.5 C 221.98 15.5, 250.54 36.5, 300 36.5 " +
  "C 348.56 36.5, 397.30 7, 457.63 7 C 517.96 7, 539.66 36.5, 600 36.5 " +
  "C 667.43 36.5, 699.09 15.5, 760.53 15.5 C 821.98 15.5, 850.54 36.5, 900 36.5 " +
  "C 948.56 36.5, 997.30 7, 1057.63 7 C 1117.96 7, 1139.66 36.5, 1200 36.5 " +
  "L 1200 800 L 0 800 Z";

const LiquidWaveSpinner = memo(({
  size = "md",
  hideText,
  words = ["Loading portal ..."],
  className,
  ...props
}: LiquidWaveSpinnerProps) => {
  const config = sizeConfig[size] || sizeConfig.md;
  const containerRef = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const randomYDuration = useMemo(() => 5.5 + Math.random() * 1.5, []);
  const randomXDurationBg = useMemo(() => 3.5 + Math.random() * 1.0, []);
  const randomXDurationFg = useMemo(() => 2.5 + Math.random() * 1.0, []);
  const randomDelay = useMemo(() => Math.random() * 0.5, []);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "flex w-full flex-col items-center justify-center overflow-hidden rounded-panel bg-transparent",
        config.container,
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 500 240"
        width={config.svgWidth}
        height={config.svgHeight}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="249.5" cy="249.5" r="107.5" />
          </clipPath>
        </defs>

        <circle cx="249.5" cy="249.5" r="107.5" className="fill-raised stroke-line [stroke-width:2]" />

        <g clipPath={`url(#${clipId})`}>
          <motion.g
            initial={{ y: 330.6 }}
            animate={{ y: 170.1 }}
            transition={{
              duration: randomYDuration,
              delay: randomDelay,
              ease: "easeOut",
            }}
          >
            <motion.g
              initial={{ x: -600 }}
              animate={{ x: 0 }}
              transition={{
                duration: randomXDurationBg,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <path d={WAVE_PATH} className="fill-signal-green" style={{ opacity: 0.45 }} />
            </motion.g>
          </motion.g>

          <motion.g
            initial={{ y: 330.6 }}
            animate={{ y: 180.1 }}
            transition={{
              duration: randomYDuration,
              delay: randomDelay,
              ease: "easeOut",
            }}
          >
            <motion.g
              initial={{ x: 0 }}
              animate={{ x: -600 }}
              transition={{
                duration: randomXDurationFg,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <path d={WAVE_PATH} className="fill-signal-orange" />
            </motion.g>
          </motion.g>
        </g>
      </svg>

      <div className="flex select-none items-center gap-1 text-muted">
        {!hideText && (
          <TextMorph
            words={words}
            interval={2000}
            className={cn("font-mono font-medium uppercase tracking-[0.08em]", config.fontSize)}
          />
        )}
      </div>
    </motion.div>
  );
});

LiquidWaveSpinner.displayName = "LiquidWaveSpinner";

export default LiquidWaveSpinner;

export function InlineWaveSpinner({ label, decorative = false }: { label: string; decorative?: boolean }) {
  const clipId = useId();
  return (
    <motion.svg
      animate={{ rotate: 360 }}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className="size-4 shrink-0"
      role={decorative ? undefined : "status"}
      transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
      viewBox="0 0 24 24"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="9" />
        </clipPath>
      </defs>
      <circle
        className="fill-none stroke-current opacity-35"
        cx="12"
        cy="12"
        r="9"
        strokeWidth="1.8"
      />
      <g clipPath={`url(#${clipId})`}>
        <motion.path
          animate={{ x: [0, -12] }}
          className="fill-current"
          d="M-12 13 Q-6 9 0 13 T12 13 T24 13 T36 13 V26 H-12 Z"
          transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
        />
      </g>
    </motion.svg>
  );
}
