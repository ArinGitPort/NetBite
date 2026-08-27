import type { Session } from "@supabase/supabase-js";
import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import netbiteLogo from "../../../../assets/images/branding/netbite-menu-logo-mobile.png";
import { getNavigationForAccess } from "../../app/navigation";
import type { AdminAccess } from "../../lib/content-api";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/class-names";
import { Button } from "../ui/button";

function AccountControls({ session, access }: { session: Session; access: AdminAccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signOut = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    const result = await supabase.auth.signOut();
    if (result.error) {
      setError("Sign-out could not be completed. Check your connection and try again.");
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4 border-t border-line pt-5">
      <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 px-2">
        <div className="grid size-[42px] place-items-center rounded-control border border-line bg-raised font-mono text-sm" aria-hidden="true">{(session.user.email?.[0] ?? "N").toUpperCase()}</div>
        <div className="grid min-w-0 gap-1">
          <small className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-signal-green">{access.accessLevel === "administrator" ? "Administrator account" : "Instructor account"}</small>
          <strong className="truncate text-xs" title={session.user.email}>{session.user.email}</strong>
        </div>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void signOut()} tone="neutral"><LogOut />{busy ? "Signing out..." : "Sign out"}</Button>
      {error ? <p className="m-0 text-xs leading-5 text-[#ff9da1]" role="alert">{error}</p> : null}
    </div>
  );
}

export function PortalShell({ session, access }: { session: Session; access: AdminAccess }) {
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();
  const navigation = getNavigationForAccess(access.accessLevel);
  const current = navigation.find((item) => location.pathname.startsWith(item.path));
  const roleLabel = access.accessLevel === "administrator" ? "Administration" : "Instructor workspace";
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside
        aria-label={`${roleLabel} navigation`}
        className={cn("fixed inset-y-0 left-0 z-40 flex h-screen w-[280px] flex-col border-r border-line bg-sidebar/98 px-4 py-5 shadow-[22px_0_60px_rgb(0_0_0/45%)] transition-transform lg:sticky lg:top-0 lg:w-auto lg:translate-x-0 lg:shadow-none", mobileNav ? "translate-x-0" : "-translate-x-full")}
      >
        <div className="flex min-h-16 items-center gap-3 border-b border-line px-2 pb-5">
          <div className="grid size-11 place-items-center overflow-hidden rounded-control border border-line bg-raised"><img alt="" className="size-8 object-contain" src={netbiteLogo} /></div>
          <div className="grid gap-1"><strong className="text-sm">NETBITE</strong><span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">{roleLabel}</span></div>
          <Button aria-label="Close navigation" className="ml-auto lg:hidden" onClick={() => setMobileNav(false)} size="icon" tone="ghost"><X /></Button>
        </div>
        <nav className="mt-6 grid gap-1" aria-label={`${roleLabel} sections`}>
          {navigation.map((item) => (
            <NavLink
              key={item.id}
              className={({ isActive }) => cn("flex min-h-12 items-center gap-3 rounded-control border px-3 text-xs font-medium transition-colors", isActive ? "border-line bg-raised text-white" : "border-transparent text-muted hover:bg-raised hover:text-white")}
              onClick={() => setMobileNav(false)}
              to={item.path}
            >
              {({ isActive }) => <><item.icon className="size-[18px]" /><span>{item.label}</span>{isActive ? <ChevronRight className="ml-auto size-4" /> : null}</>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto"><AccountControls access={access} session={session} /></div>
      </aside>
      {mobileNav ? <button aria-label="Close navigation" className="fixed inset-0 z-30 border-0 bg-black/70 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileNav(false)} /> : null}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-[68px] items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur-xl sm:px-8">
          <Button aria-label="Open navigation" className="lg:hidden" onClick={() => setMobileNav(true)} size="icon" tone="ghost"><Menu /></Button>
          <div className="grid gap-1"><small className="font-mono text-[0.63rem] uppercase tracking-[0.1em] text-signal-orange">{roleLabel}</small><strong className="text-sm">{current?.label ?? roleLabel}</strong></div>
        </header>
        <main className="mx-auto w-full max-w-[1460px] px-3.5 py-7 sm:px-7 sm:py-8 lg:px-10 lg:py-9 lg:pb-[72px]"><Outlet /></main>
      </div>
    </div>
  );
}
