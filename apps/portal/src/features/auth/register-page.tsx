import { ArrowLeft, Check, Eye, EyeOff, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { BrandLockup } from "@/components/ui/brand-lockup";
import { Button as UiButton } from "@/components/ui/button";
import { Feedback as UiFeedback } from "@/components/ui/feedback";
import { InputField } from "@/components/ui/form-field";
import { ThemeMenu } from "@/components/ui/theme-menu";
import { InlineWaveSpinner } from "@/components/shadcn-space/spinner/spinner-10";
import { LoginAmbient } from "@/features/auth/login-ambient";
import { createInstructorAccount } from "@/lib/api/instructor-registration-service";

const steps = [
  { number: "01", title: "Create an account", detail: "Enter your teaching details and choose a password." },
  { number: "02", title: "Verify your email", detail: "Open the confirmation link if one is sent to you." },
  { number: "03", title: "Administrator review", detail: "Your request is submitted after you sign in. Access begins only after approval." },
];

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: "Not set", hint: "Use at least 8 characters.", color: "bg-line", text: "text-muted" };

  const uniqueCharacters = new Set(password.toLowerCase()).size;
  if (password.length < 8 || uniqueCharacters < 5) {
    return {
      score: 1,
      label: "Weak",
      hint: password.length < 8 ? "Use at least 8 characters." : "Avoid repeated characters; try a longer phrase.",
      color: "bg-signal-red",
      text: "text-signal-red",
    };
  }

  const characterTypes = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((pattern) => pattern.test(password)).length;
  if (password.length >= 16 || (password.length >= 12 && characterTypes >= 3)) {
    return { score: 3, label: "Strong", hint: "Good length. Avoid reusing this password elsewhere.", color: "bg-signal-green", text: "text-signal-green" };
  }

  return { score: 2, label: "Fair", hint: "Try 12 or more characters for a stronger password.", color: "bg-signal-orange", text: "text-signal-orange" };
}

export function Register() {
  const [displayName, setDisplayName] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const strength = passwordStrength(password);

  const clearError = () => {
    if (error) setError("");
    if (invalidField) setInvalidField("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const focus = (name: string) => {
      setInvalidField(name);
      (form.elements.namedItem(name) as HTMLInputElement | null)?.focus();
    };
    const name = displayName.trim();
    const school = institution.trim();
    if (name.length < 2 || name.length > 80) {
      setError("Enter your name using 2 to 80 characters.");
      focus("displayName");
      return;
    }
    if (school.length < 2 || school.length > 160) {
      setError("Enter your school or organization using 2 to 160 characters.");
      focus("institution");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      focus("password");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match. Please enter them again.");
      focus("confirmation");
      return;
    }

    setBusy(true);
    setError("");
    setInvalidField("");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("timed out")), 15_000);
      });
      const { error: authError } = await Promise.race([
        createInstructorAccount({
          email: email.trim(),
          password,
          displayName: name,
          institution: school,
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        }),
        timeout,
      ]);
      if (authError) {
        setError(authError.code === "weak_password"
          ? "That password is too easy to guess. Choose a stronger one."
          : "Your account could not be created. Try again, or sign in if you already have an account.");
      } else {
        setSubmittedEmail(email.trim());
        setPassword("");
        setConfirmation("");
      }
    } catch (nextError) {
      setError((nextError as Error).message === "timed out"
        ? "Registration timed out. Check your connection and try again."
        : "Your account could not be created. Check your connection and try again.");
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setBusy(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <LoginAmbient />
      <header className="relative z-20 flex min-h-16 items-center gap-4 border-b border-line bg-canvas/75 px-5 backdrop-blur-xl sm:px-10">
        <BrandLockup href="#/login" />
        <nav aria-label="Account navigation" className="ml-auto flex items-center gap-3">
          <a className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-copy underline-offset-4 hover:text-signal-orange hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange" href="#/login">
            <ArrowLeft aria-hidden="true" className="size-4" /> Sign in
          </a>
          <ThemeMenu />
        </nav>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-64px)] w-[min(1080px,calc(100%-36px))] items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16 lg:py-16">
        {submittedEmail ? (
          <section aria-labelledby="registration-complete-title" className="rounded-panel border border-line bg-surface/95 p-6 shadow-panel sm:p-9">
            <span className="grid size-12 place-items-center rounded-full bg-signal-green-soft text-signal-green"><Mail aria-hidden="true" className="size-6" /></span>
            <p className="mb-2 mt-6 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-signal-green">Next step</p>
            <h1 id="registration-complete-title" className="m-0 text-3xl font-bold tracking-tight">Check your inbox</h1>
            <p className="mt-4 leading-7 text-muted">
              If this email can be registered, check <strong className="text-copy">{submittedEmail}</strong> for a confirmation link. Then sign in to submit your instructor request for administrator review.
            </p>
            <p className="text-sm leading-6 text-muted">Already confirmed or no email required? You can sign in now.</p>
            <a className="mt-5 inline-flex min-h-11 items-center justify-center rounded-control border border-copy bg-copy px-5 text-xs font-semibold text-canvas hover:bg-copy/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange" href="#/login">Go to sign in</a>
          </section>
        ) : (
          <form aria-labelledby="registration-form-title" className="relative grid w-full gap-5 overflow-hidden rounded-panel border border-line bg-surface/95 p-5 shadow-[0_28px_90px_rgb(0_0_0/22%)] backdrop-blur-2xl sm:p-8" onSubmit={submit}>
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-signal-red to-transparent" />
            <div>
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-signal-orange">Instructor registration</p>
              <h1 id="registration-form-title" className="m-0 text-[clamp(1.7rem,3vw,2.2rem)] font-bold tracking-tight">Create your account</h1>
              <p className="mb-0 mt-2 text-sm leading-6 text-muted">Use an email address you can access. All fields are required.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField autoComplete="name" aria-invalid={invalidField === "displayName"} label="Full name" maxLength={80} minLength={2} name="displayName" onChange={(event) => { setDisplayName(event.target.value); clearError(); }} placeholder="Your full name" required value={displayName} />
              <InputField autoComplete="organization" aria-invalid={invalidField === "institution"} label="School or organization" maxLength={160} minLength={2} name="institution" onChange={(event) => { setInstitution(event.target.value); clearError(); }} placeholder="Where you teach" required value={institution} />
            </div>
            <InputField autoComplete="email" label="Email address" name="email" onChange={(event) => { setEmail(event.target.value); clearError(); }} placeholder="name@school.edu" required type="email" value={email} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid content-start gap-1.5 text-[0.68rem] font-semibold text-copy">
                <label htmlFor="registration-password">Password</label>
                <span className="grid grid-cols-[1fr_auto] overflow-hidden rounded-control border border-line bg-canvas focus-within:border-signal-orange focus-within:ring-2 focus-within:ring-signal-orange/15">
                  <input aria-describedby="registration-password-hint" aria-invalid={invalidField === "password"} autoComplete="new-password" className="min-h-11 min-w-0 border-0 bg-transparent px-3 py-2.5 text-[0.8rem] text-copy outline-none placeholder:text-muted" id="registration-password" minLength={8} name="password" onChange={(event) => { setPassword(event.target.value); clearError(); }} placeholder="Create password" required type={showPasswords ? "text" : "password"} value={password} />
                  <button aria-label={showPasswords ? "Hide passwords" : "Show passwords"} aria-pressed={showPasswords} className="inline-flex min-h-11 items-center gap-1.5 px-3 text-xs text-muted hover:text-copy" onClick={() => setShowPasswords((visible) => !visible)} type="button">
                    {showPasswords ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                    <span className="sr-only sm:not-sr-only">{showPasswords ? "Hide" : "Show"}</span>
                  </button>
                </span>
                <div className="mt-1 grid gap-1.5 font-normal">
                  <div className="flex items-center justify-between gap-2 text-[0.66rem] leading-5">
                    <span className="text-muted">Password strength</span>
                    <span className={strength.text}>{strength.label}</span>
                  </div>
                  <div aria-label="Password strength" aria-valuemax={3} aria-valuemin={0} aria-valuenow={strength.score} aria-valuetext={strength.label} className="grid grid-cols-3 gap-1" role="meter">
                    {[1, 2, 3].map((level) => (
                      <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-line/70" key={level}>
                        <span className={`block h-full origin-left rounded-full transition-[background-color,transform] duration-300 ease-out motion-reduce:transition-none ${strength.color} ${strength.score >= level ? "scale-x-100" : "scale-x-0"}`} />
                      </span>
                    ))}
                  </div>
                  <small id="registration-password-hint" className="leading-5 text-muted">{strength.hint}</small>
                </div>
              </div>
              <InputField aria-invalid={invalidField === "confirmation"} autoComplete="new-password" label="Confirm password" name="confirmation" onChange={(event) => { setConfirmation(event.target.value); clearError(); }} placeholder="Repeat password" required type={showPasswords ? "text" : "password"} value={confirmation} />
            </div>
            {error ? <UiFeedback tone="error">{error}</UiFeedback> : null}
            <p className="m-0 text-xs leading-5 text-muted">After signing in, your instructor request goes to a NetBite administrator. Teaching access starts after approval.</p>
            <UiButton className="w-full" disabled={busy} tone="primary" type="submit">
              {busy ? <><InlineWaveSpinner label="Creating account" /> Creating account...</> : "Create account"}
            </UiButton>
            <p className="m-0 border-t border-line pt-4 text-center text-xs text-muted">Already have an account? <a className="font-semibold text-signal-orange underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange" href="#/login">Sign in</a></p>
          </form>
        )}

        <aside aria-label="What happens after registration" className="lg:pl-2">
          <p className="mb-4 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-signal-orange">Instructor access</p>
          <h2 className="max-w-md text-[clamp(2rem,3.5vw,3.25rem)] font-bold leading-[1.1] tracking-tight">Teach with NetBite.</h2>
          <p className="max-w-md text-sm leading-7 text-muted">A teaching account lets you prepare lessons, create assessments, and manage classes once a NetBite administrator approves your request.</p>
          <ol className="mt-8 grid list-none gap-0 border-t border-line p-0">
            {steps.map((step) => (
              <li className="grid grid-cols-[40px_1fr] gap-3 border-b border-line py-4" key={step.number}>
                <span aria-hidden="true" className="font-mono text-xs font-semibold text-signal-orange">{step.number}</span>
                <div><strong className="text-sm text-copy">{step.title}</strong><p className="mb-0 mt-1 text-xs leading-5 text-muted">{step.detail}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-5 inline-flex items-start gap-2 text-xs leading-6 text-muted"><Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-signal-green" /> Creating an account does not grant instructor access automatically.</p>
        </aside>
      </div>
    </main>
  );
}
