export function TopologyDeviceSection({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return <details className="group border-b border-line pb-3" open={open}><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-bold text-copy after:content-['+'] group-open:after:content-['−']">{title}</summary><div className="grid gap-3 pt-2">{children}</div></details>;
}
