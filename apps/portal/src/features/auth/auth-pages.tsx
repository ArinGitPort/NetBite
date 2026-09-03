import { CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { StatusBadge as Badge } from "@/components/ui/admin-primitives";
import { BrandLockup, BrandMark } from "@/components/ui/brand-lockup";
import { Button as UiButton } from "@/components/ui/button";
import { Feedback as UiFeedback } from "@/components/ui/feedback";
import { InputField } from "@/components/ui/form-field";
import { InlineWaveSpinner } from "@/components/shadcn-space/spinner/spinner-10";
import { StrokeText } from "@/components/ui/stroke-text";
import { ThemeMenu } from "@/components/ui/theme-menu";
import { LoginAmbient } from "@/features/auth/login-ambient";
import { supabase } from "@/lib/supabase";

export function SetupRequired() {
  const development = import.meta.env.DEV;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
      <section className="flex flex-col justify-center bg-[radial-gradient(circle_at_15%_25%,rgb(224_79_86/14%),transparent_35%)] p-10 lg:p-[clamp(40px,8vw,120px)]">
        <BrandMark className="size-[58px]" />
        <p className="mb-3 mt-7 font-mono text-xs tracking-[0.14em] text-signal-orange">
          NETBITE / INSTRUCTOR SYSTEM
        </p>
        <h1 className="max-w-3xl text-[clamp(2.4rem,5vw,5rem)] font-bold leading-[1.04] tracking-[-0.035em]">
          Curriculum administration with controlled publishing.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          The instructor portal is temporarily unavailable.
        </p>
      </section>
      <section className="m-auto grid w-[min(440px,calc(100%-40px))] gap-4 rounded-panel border border-line bg-surface p-8 shadow-panel">
        <Badge tone="orange">SERVICE UNAVAILABLE</Badge>
        <h2 className="mt-1 text-2xl font-bold">
          Admin services are not connected
        </h2>
        <p className="leading-7 text-muted">
          {development
            ? "Add the two VITE_SUPABASE values documented in apps/portal/.env.example, then restart the development server."
            : "Try again later or contact the NetBite project owner."}
        </p>
      </section>
    </main>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error(
                "Sign-in timed out. Check your connection and try again.",
              ),
            ),
          10_000,
        );
      });
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        timeout,
      ]);
      if (result.error) {
        const normalized = result.error.message.toLowerCase();
        setError(
          normalized.includes("invalid login")
            ? "The email address or password is incorrect."
            : normalized.includes("email not confirmed")
              ? "Confirm this email address before signing in."
              : "Sign-in could not be completed. Try again.",
        );
      }
    } catch (nextError) {
      setError(
        (nextError as Error).message.includes("timed out")
          ? "Sign-in timed out. Check your connection and try again."
          : "Sign-in could not be completed. Try again.",
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setBusy(false);
    }
  };
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <LoginAmbient />
      <header className="relative z-20 flex min-h-16 items-center border-b border-line bg-canvas/75 px-5 backdrop-blur-xl sm:px-10">
        <BrandLockup />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted sm:inline">Portal appearance</span>
          <ThemeMenu />
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-64px)] w-[min(1070px,calc(100%-48px))] items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Badge tone="green">CURRICULUM CONTROL PLANE</Badge>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">ANDROID DELIVERY / OFFLINE READY</span>
          </div>
          <h1 className="max-w-[650px] text-[clamp(2.35rem,4.15vw,4.15rem)] font-bold leading-[1.04] tracking-[-0.045em]">
            <span className="block">Publish accurate</span>
            <StrokeText
              className="my-[0.035em] max-w-[650px] text-signal-red"
              text="networking lessons"
            />
            <span className="block">without rebuilding the learner app.</span>
          </h1>
          <p className="mt-4 max-w-[650px] text-base leading-8 text-muted">
            Prepare lessons, check related content, and publish approved
            materials to connected Android learners.
          </p>
          <ul className="mt-6 grid list-none gap-3 p-0 text-sm text-copy">
            <li className="flex items-center gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 text-signal-green"
              />{" "}
              Administrator access verified by NetBite
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 text-signal-green"
              />{" "}
              Locked history of published versions
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 text-signal-green"
              />{" "}
              Learning updates available offline after download
            </li>
          </ul>

          <section
            className="mt-8 rounded-panel border border-line bg-surface/75 p-5 shadow-panel backdrop-blur-xl transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-muted motion-reduce:transform-none"
            aria-label="Publishing workflow"
          >
            <div className="mb-4 flex items-center justify-between">
              <strong>Publishing workflow</strong>
            </div>
            <ol className="grid list-none gap-3 p-0 sm:grid-cols-2">
              <li className="grid grid-cols-[28px_1fr] gap-x-3">
                <span className="row-span-2 grid size-7 place-items-center rounded-full bg-signal-green-soft font-mono text-xs text-signal-green">
                  1
                </span>
                <strong className="text-sm">Prepare content</strong>
                <small className="text-muted">
                  Edit lessons and assessments
                </small>
              </li>
              <li className="grid grid-cols-[28px_1fr] gap-x-3">
                <span className="row-span-2 grid size-7 place-items-center rounded-full bg-signal-green-soft font-mono text-xs text-signal-green">
                  2
                </span>
                <strong className="text-sm">Check content</strong>
                <small className="text-muted">
                  Review required fields and links
                </small>
              </li>
              <li className="grid grid-cols-[28px_1fr] gap-x-3">
                <span className="row-span-2 grid size-7 place-items-center rounded-full bg-raised font-mono text-xs text-muted">
                  3
                </span>
                <strong className="text-sm">Publish version</strong>
                <small className="text-muted">Save one complete update</small>
              </li>
              <li className="grid grid-cols-[28px_1fr] gap-x-3">
                <span className="row-span-2 grid size-7 place-items-center rounded-full bg-raised font-mono text-xs text-muted">
                  4
                </span>
                <strong className="text-sm">Android delivery</strong>
                <small className="text-muted">Available after download</small>
              </li>
            </ol>
          </section>
        </section>

        <form
          className="relative grid w-full gap-5 overflow-hidden rounded-panel border border-line bg-surface/90 p-5 shadow-[0_28px_90px_rgb(0_0_0/22%)] backdrop-blur-2xl sm:p-8"
          onSubmit={submit}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-signal-red to-transparent" />
          <Badge>
            <LockKeyhole aria-hidden="true" size={13} /> Authorized staff only
          </Badge>
          <div>
            <h2 className="mb-2 mt-1 text-2xl font-bold">
              Sign in to the console
            </h2>
            <p className="m-0 leading-7 text-muted">
              Use an account approved for NetBite portal access.
            </p>
          </div>
          <InputField
            autoComplete="email"
            label="Email address"
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
            placeholder="instructor@netbite.local"
            required
            type="email"
            value={email}
          />
          <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
            <span>Password</span>
            <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-control border border-line bg-canvas focus-within:border-signal-orange focus-within:ring-2 focus-within:ring-signal-orange/15">
              <input
                autoComplete="current-password"
                className="min-h-11 min-w-0 border-0 bg-transparent px-3 py-2.5 text-copy outline-none placeholder:text-muted"
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError("");
                }}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="inline-flex min-h-11 items-center gap-2 px-3 text-xs text-muted hover:text-copy"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
          </label>
          {error ? <UiFeedback tone="error">{error}</UiFeedback> : null}
          <UiButton
            className="w-full"
            disabled={busy}
            tone="primary"
            type="submit"
          >
            {busy ? (
              <>
                <InlineWaveSpinner label="Signing in" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </UiButton>
          <footer className="mt-1 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <i
                aria-hidden="true"
                className="size-1.5 rounded-full bg-signal-green"
              />{" "}
              Protected portal session
            </span>
            <span>Access verified after sign-in</span>
          </footer>
        </form>
      </div>
    </main>
  );
}

export function Unauthorized({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="grid w-full max-w-md gap-4 rounded-panel border border-line bg-surface p-8 shadow-panel">
        <Badge tone="red">ACCESS NOT ASSIGNED</Badge>
        <h2 className="text-2xl font-bold">
          This account does not have portal access
        </h2>
        <p className="m-0 text-muted">{email}</p>
        <p className="leading-7 text-muted">
          A NetBite administrator must approve instructor access, or the project
          owner must assign administrator access.
        </p>
        <UiButton onClick={onLogout} tone="secondary">
          SIGN OUT
        </UiButton>
      </div>
    </main>
  );
}
