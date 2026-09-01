import { motion, useReducedMotion } from "motion/react";

const paths = [
  "M40 470 C230 360 330 520 520 405 S830 250 1160 355",
  "M150 165 C330 260 405 130 610 220 S905 410 1110 195",
];

const nodes = [
  { cx: 150, cy: 165, delay: 0 },
  { cx: 520, cy: 405, delay: 0.7 },
  { cx: 830, cy: 298, delay: 1.4 },
  { cx: 1110, cy: 195, delay: 2.1 },
];

export function LoginAmbient() {
  const reducedMotion = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        animate={reducedMotion ? undefined : { x: [0, 55, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        className="absolute -left-32 top-[8%] size-[34rem] rounded-full bg-signal-red opacity-[var(--nb-login-ambient-opacity)] blur-[120px]"
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        animate={reducedMotion ? undefined : { x: [0, -45, 0], y: [0, -35, 0], scale: [1, 1.12, 1] }}
        className="absolute -right-40 bottom-[-10%] size-[38rem] rounded-full bg-signal-green opacity-[var(--nb-login-ambient-opacity)] blur-[130px]"
        transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
      />
      <svg className="absolute inset-0 size-full opacity-[var(--nb-login-network-opacity)]" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 700">
        {paths.map((path, index) => (
          <motion.path
            animate={reducedMotion ? { opacity: 0.45, pathLength: 1 } : { opacity: [0.22, 0.7, 0.22], pathLength: [0.25, 1, 0.25] }}
            className={index ? "fill-none stroke-signal-green" : "fill-none stroke-signal-red"}
            d={path}
            initial={false}
            key={path}
            strokeDasharray="5 14"
            strokeWidth="1"
            transition={{ duration: 12 + index * 4, ease: "easeInOut", repeat: Infinity }}
          />
        ))}
        {nodes.map((node) => (
          <motion.circle
            animate={reducedMotion ? { opacity: 0.75, r: 4 } : { opacity: [0.35, 1, 0.35], r: [3, 5, 3] }}
            className="fill-canvas stroke-signal-green"
            cx={node.cx}
            cy={node.cy}
            initial={false}
            key={`${node.cx}-${node.cy}`}
            strokeWidth="2"
            transition={{ delay: node.delay, duration: 3.6, ease: "easeInOut", repeat: Infinity }}
          />
        ))}
      </svg>
    </div>
  );
}
