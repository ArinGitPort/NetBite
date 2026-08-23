import type { Session } from "@supabase/supabase-js";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  FileText,
  Eye,
  EyeOff,
  Image,
  LayoutDashboard,
  Library,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { configured, supabase } from "./lib/supabase";
import * as api from "./lib/content-api";
import type {
  AdminRole,
  AdminView,
  AssetRow,
  AuditRow,
  ChapterRow,
  FlashcardRow,
  LessonRow,
  QuizRow,
  ReleaseRow,
  SourceRow,
} from "./lib/content-api";
import netbiteLogo from "../../assets/images/branding/netbite-menu-logo-mobile.png";

const navigation: Array<{
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "curriculum", label: "Curriculum", icon: Library },
  { id: "assessments", label: "Assessments", icon: ClipboardCheck },
  { id: "sources", label: "Sources", icon: BookOpen },
  { id: "assets", label: "Media library", icon: Image },
  { id: "releases", label: "Publishing", icon: Rocket },
  { id: "audit", label: "Audit history", icon: FileClock },
];

export function resolveAdminView(hash = window.location.hash): AdminView {
  const candidate = hash.replace(/^#/, "") as AdminView;
  return navigation.some(({ id }) => id === candidate)
    ? candidate
    : "dashboard";
}

function Loading({
  label = "Loading instructor workspace",
}: {
  label?: string;
}) {
  return (
    <div className="center-state">
      <span className="loader" />
      <strong>{label}</strong>
    </div>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <FileText size={28} />
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "orange" | "red";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function DialogFrame({
  eyebrow,
  title,
  detail,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className="dialog-card"
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
      >
        <button
          aria-label="Close dialog"
          className="dialog-close"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{detail}</p>
        {children}
      </section>
    </div>
  );
}

function ConfirmAction({
  className,
  ariaLabel,
  disabled,
  triggerTitle,
  children,
  eyebrow = "CONFIRM ACTION",
  title,
  detail,
  confirmLabel,
  tone = "danger",
  onConfirm,
}: {
  className: string;
  ariaLabel?: string;
  disabled?: boolean;
  triggerTitle?: string;
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  detail: string;
  confirmLabel: string;
  tone?: "danger" | "warning";
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => {
    if (!busy) setOpen(false);
  }, [busy]);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (nextError) {
      setError((nextError as Error).message || "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        title={triggerTitle}
        type="button"
      >
        {children}
      </button>
      {open ? (
        <DialogFrame
          detail={detail}
          eyebrow={eyebrow}
          onClose={close}
          title={title}
        >
          {error ? <div className="feedback error" role="alert">{error}</div> : null}
          <div className="dialog-actions">
            <button className="button" disabled={busy} onClick={close} type="button">
              CANCEL
            </button>
            <button
              className={tone === "danger" ? "button dialog-danger" : "button secondary"}
              disabled={busy}
              onClick={() => void confirm()}
              type="button"
            >
              {busy ? "WORKING..." : confirmLabel}
            </button>
          </div>
        </DialogFrame>
      ) : null}
    </>
  );
}

function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signOut = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    const result = await supabase.auth.signOut();
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    }
  };
  return (
    <>
      <button
        className="sidebar-signout"
        disabled={busy}
        onClick={() => void signOut()}
        type="button"
      >
        <LogOut aria-hidden="true" />
        <span>{busy ? "Signing out..." : "Sign out"}</span>
      </button>
      {error ? <p className="sidebar-signout-error" role="alert">{error}</p> : null}
    </>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>();
  const [roleState, setRoleState] = useState<{
    userId: string;
    roles: AdminRole[];
  } | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setRoleState(null);
      return;
    }
    let active = true;
    void api
      .getRoles(userId)
      .then((roles) => {
        if (active) setRoleState({ userId, roles });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!configured) return <SetupRequired />;
  if (
    session === undefined ||
    (session && roleState?.userId !== session.user.id)
  )
    return <Loading />;
  if (!session) return <Login />;
  const roles = roleState?.roles ?? [];
  if (!roles.length)
    return (
      <Unauthorized
        email={session.user.email ?? "Signed-in account"}
        onLogout={() => void supabase?.auth.signOut()}
      />
    );
  return <AdminShell session={session} roles={roles} />;
}

function SetupRequired() {
  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <div className="brand-mark"><img alt="" src={netbiteLogo} /></div>
        <p>NETBITE / INSTRUCTOR SYSTEM</p>
        <h1>Curriculum administration with controlled publishing.</h1>
        <p className="lead">
          Configure the Supabase project URL and publishable key to open the
          protected workspace.
        </p>
      </section>
      <section className="auth-card">
        <Badge tone="orange">SETUP REQUIRED</Badge>
        <h2>Connect the admin portal</h2>
        <p>
          Create <code>admin/.env.local</code> or use the existing root
          environment file.
        </p>
        <pre>
          VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co{`\n`}
          VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
        </pre>
      </section>
    </main>
  );
}

function Login() {
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
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setError(result.error.message);
    setBusy(false);
  };
  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <span>NETBITE Instructor Console</span>
        <span className="auth-system-status">
          <i aria-hidden="true" /> System ready
        </span>
      </header>

      <div className="auth-login-shell">
        <section className="auth-brand auth-login-brand">
          <div className="auth-identity">
            <div className="brand-mark small"><img alt="" src={netbiteLogo} /></div>
            <div>
              <strong>NETBITE</strong>
              <span>Instructor Console</span>
            </div>
          </div>
          <h1>
            Publish accurate networking lessons without rebuilding the learner
            app.
          </h1>
          <p className="lead">
            Draft safely, validate every dependency, and release only approved
            material—straight to learners without another app submission.
          </p>
          <ul className="auth-benefits">
            <li><CheckCircle2 aria-hidden="true" /> Server-verified editor and publisher roles</li>
            <li><CheckCircle2 aria-hidden="true" /> Immutable, auditable release history</li>
            <li><CheckCircle2 aria-hidden="true" /> Offline-safe delivery to the Android learner app</li>
          </ul>

          <section className="auth-pipeline" aria-label="Release pipeline">
            <div className="auth-pipeline-heading">
              <strong>Release pipeline</strong>
              <span><i aria-hidden="true" /> Operational</span>
            </div>
            <ol>
              <li><span>1</span><strong>Content validation</strong><small>Dependency checks</small></li>
              <li><span>2</span><strong>Editorial review</strong><small>Role gated</small></li>
              <li><span>3</span><strong>Immutable release</strong><small>Versioned package</small></li>
              <li><span>4</span><strong>Android delivery</strong><small>Offline safe</small></li>
            </ol>
          </section>
        </section>

        <form className="auth-card auth-login-card" onSubmit={submit}>
          <Badge><LockKeyhole aria-hidden="true" size={13} /> Authorized staff only</Badge>
          <div>
            <h2>Sign in to the console</h2>
            <p>Use an account assigned an editor or publisher role.</p>
          </div>
          <Field label="Email address">
            <input
              autoComplete="email"
              placeholder="instructor@netbite.local"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password">
            <div className="password-field">
              <input
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
          </Field>
          {error ? <div className="feedback error" role="alert">{error}</div> : null}
          <button className="button auth-submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <footer className="auth-card-footer">
            <span><i aria-hidden="true" /> Secure Supabase session</span>
            <span>Role protected</span>
          </footer>
        </form>
      </div>
    </main>
  );
}

function Unauthorized({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => void;
}) {
  return (
    <main className="center-page">
      <div className="auth-card">
        <Badge tone="red">ACCESS NOT ASSIGNED</Badge>
        <h2>This account is not an instructor</h2>
        <p>{email}</p>
        <p>
          A Supabase project owner must assign the <code>editor</code> or{" "}
          <code>publisher</code> role. The portal cannot grant itself access.
        </p>
        <button className="button secondary" onClick={onLogout}>
          SIGN OUT
        </button>
      </div>
    </main>
  );
}

function AdminShell({
  session,
  roles,
}: {
  session: Session;
  roles: AdminRole[];
}) {
  const [view, setView] = useState<AdminView>(resolveAdminView);
  const [mobileNav, setMobileNav] = useState(false);
  const canPublish = roles.includes("publisher");
  useEffect(() => {
    const syncViewFromLocation = () => setView(resolveAdminView());
    window.addEventListener("hashchange", syncViewFromLocation);
    window.addEventListener("popstate", syncViewFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncViewFromLocation);
      window.removeEventListener("popstate", syncViewFromLocation);
    };
  }, []);
  const navigate = (next: AdminView) => {
    setView(next);
    setMobileNav(false);
    const destination =
      next === "dashboard"
        ? `${window.location.pathname}${window.location.search}`
        : `${window.location.pathname}${window.location.search}#${next}`;
    window.history.pushState({ adminView: next }, "", destination);
    window.scrollTo({ top: 0 });
  };
  return (
    <div className="admin-shell">
      <aside
        aria-label="Instructor console navigation"
        className={mobileNav ? "sidebar open" : "sidebar"}
      >
        <div className="sidebar-brand">
          <div className="brand-mark small"><img alt="" src={netbiteLogo} /></div>
          <div>
            <strong>NETBITE</strong>
            <span>INSTRUCTOR CONSOLE</span>
          </div>
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Admin sections">
          {navigation.map((item) => (
            <button
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => navigate(item.id)}
            >
              <item.icon />
              <span>{item.label}</span>
              {view === item.id ? <ChevronRight /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-account">
            <div className="sidebar-avatar" aria-hidden="true">
              {(session.user.email?.[0] ?? "I").toUpperCase()}
            </div>
            <div className="sidebar-account-copy">
              <small>INSTRUCTOR ACCOUNT</small>
              <strong title={session.user.email}>{session.user.email}</strong>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>
      {mobileNav ? (
        <button
          aria-label="Close navigation"
          className="mobile-nav-scrim"
          onClick={() => setMobileNav(false)}
        />
      ) : null}
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu />
          </button>
          <div>
            <small>CONTENT OPERATIONS</small>
            <strong>{navigation.find(({ id }) => id === view)?.label}</strong>
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            <span>SUPABASE CONNECTED</span>
          </div>
        </header>
        <main className="content">
          {view === "dashboard" ? (
            <Dashboard onNavigate={navigate} />
          ) : view === "curriculum" ? (
            <Curriculum userId={session.user.id} />
          ) : view === "assessments" ? (
            <Assessments userId={session.user.id} />
          ) : view === "sources" ? (
            <Sources userId={session.user.id} />
          ) : view === "assets" ? (
            <Assets userId={session.user.id} />
          ) : view === "releases" ? (
            <Releases canPublish={canPublish} />
          ) : (
            <Audit />
          )}
        </main>
      </div>
    </div>
  );
}

function PageIntro({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action}
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof api.getCurriculum>>>();
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([api.getCurriculum(), api.getReleases()])
      .then(([nextData, nextReleases]) => {
        setData(nextData);
        setReleases(nextReleases);
      })
      .catch((next) => setError(next.message));
  }, []);
  if (!data && !error) return <Loading />;
  if (error)
    return (
      <Empty
        title="Content tables are not ready"
        detail={`${error}. Apply the CMS migration and seed the bundled curriculum.`}
      />
    );
  const supplemental = data!.lessons.filter(
    ({ requirement, archived }) => requirement === "supplemental" && !archived,
  ).length;
  return (
    <>
      <PageIntro
        eyebrow="PUBLISHING CONTROL"
        title="Curriculum overview"
        detail="Review the current authoring state before releasing learning materials to Android devices."
        action={
          <button
            className="button primary"
            onClick={() => onNavigate("releases")}
          >
            <Rocket />
            OPEN PUBLISHING
          </button>
        }
      />
      <div className="metric-grid">
        <Metric
          label="Courses"
          value={data!.courses.length}
          note="Fixed structure"
        />
        <Metric
          label="Chapters"
          value={data!.chapters.length}
          note="12 Foundations + 11 Operations"
        />
        <Metric
          label="Active lessons"
          value={data!.lessons.filter(({ archived }) => !archived).length}
          note={`${supplemental} supplemental`}
        />
        <Metric
          label="Published releases"
          value={releases.length}
          note={
            releases[0]
              ? `Latest: v${releases[0].release_version}`
              : "No remote release"
          }
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">AUTHORING PIPELINE</p>
              <h2>Content readiness</h2>
            </div>
            <Badge tone="green">OFFLINE FALLBACK SAFE</Badge>
          </div>
          <div className="pipeline">
            <PipelineStep
              number="01"
              title="Edit drafts"
              detail="Revise lessons and assessments without affecting learners."
            />
            <PipelineStep
              number="02"
              title="Validate"
              detail="Check identifiers, mappings, required fields, and assets."
            />
            <PipelineStep
              number="03"
              title="Publish"
              detail="Create an immutable release and activate it atomically."
            />
            <PipelineStep
              number="04"
              title="Android delivery"
              detail="Connected devices validate and cache the release in SQLite."
            />
          </div>
        </section>
        <section className="panel">
          <p className="eyebrow">LATEST RELEASE</p>
          {releases[0] ? (
            <>
              <h2>Release {releases[0].release_version}</h2>
              <p>{releases[0].changelog}</p>
              <dl className="details">
                <div>
                  <dt>Published</dt>
                  <dd>{new Date(releases[0].published_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Minimum app</dt>
                  <dd>{releases[0].minimum_app_version}</dd>
                </div>
                <div>
                  <dt>Checksum</dt>
                  <dd className="mono">
                    {releases[0].checksum.slice(0, 18)}...
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <Empty
              title="No release published"
              detail="Seed and validate the bundled curriculum, then create the first release."
            />
          )}
        </section>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function PipelineStep({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="pipeline-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function Curriculum({ userId }: { userId: string }) {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof api.getCurriculum>>>();
  const [chapterId, setChapterId] = useState("1");
  const [lessonId, setLessonId] = useState<string>();
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [stableId, setStableId] = useState("");
  const load = useCallback(
    () =>
      api.getCurriculum().then((next) => {
        setData(next);
        if (!next.chapters.some(({ id }) => id === chapterId))
          setChapterId(next.chapters[0]?.id ?? "1");
      }),
    [chapterId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const chapter = data?.chapters.find(({ id }) => id === chapterId);
  const lessons = useMemo(
    () =>
      data?.lessons.filter(
        (lesson) =>
          lesson.chapter_id === chapterId &&
          lesson.draft.title.toLowerCase().includes(search.toLowerCase()),
      ) ?? [],
    [data, chapterId, search],
  );
  const selected = data?.lessons.find(({ id }) => id === lessonId);
  const updateSelected = (row: LessonRow) =>
    setData((current) =>
      current
        ? {
            ...current,
            lessons: current.lessons.map((lesson) =>
              lesson.id === row.id ? row : lesson,
            ),
          }
        : current,
    );
  const moveSelected = async (direction: -1 | 1) => {
    if (!data || !selected) return;
    const ordered = data.lessons
      .filter((lesson) => lesson.chapter_id === chapterId && !lesson.archived)
      .sort((left, right) => left.position - right.position);
    const index = ordered.findIndex(({ id }) => id === selected.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await api.reorderLessons(chapterId, ordered.map(({ id }) => id));
      await load();
      setNotice("Lesson order updated.");
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  const create = async () => {
    if (!data || busy) return;
    if (!stableId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stableId))
      return setNotice(
        "Use a lowercase stable ID such as network-service-review.",
      );
    setBusy(true);
    try {
      const position =
        Math.max(
          0,
          ...data.lessons
            .filter((item) => item.chapter_id === chapterId)
            .map(({ position }) => position),
        ) + 1;
      const illustration =
        data.lessons.find((item) => item.chapter_id === chapterId)?.draft
          .illustration ?? "network";
      await api.createLesson(
        chapterId,
        stableId,
        position,
        illustration,
        userId,
      );
      await load();
      setLessonId(stableId);
      setStableId("");
      setCreateOpen(false);
      setNotice("Supplemental lesson draft created.");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data) return <Loading />;
  return (
    <>
      <PageIntro
        eyebrow="CURRICULUM"
        title="Lesson authoring"
        detail="Edit content inside the fixed NetBite course structure. New lessons are supplemental and never revoke existing completion."
        action={
          <button
            className="button primary"
            onClick={() => setCreateOpen(true)}
            disabled={busy}
          >
            <Plus />
            NEW LESSON
          </button>
        }
      />
      {createOpen ? (
        <DialogFrame
          detail="New lessons are supplemental and stay inside the currently selected chapter. Use a permanent lowercase ID because learner progress refers to it."
          eyebrow="NEW SUPPLEMENTAL LESSON"
          onClose={() => {
            if (!busy) setCreateOpen(false);
          }}
          title="Create a lesson draft"
        >
          <form
            className="dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <Field
              label="Stable lesson ID"
              hint="Lowercase letters and numbers separated by hyphens. Example: network-service-review."
            >
              <input
                autoFocus
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="network-service-review"
                required
                value={stableId}
                onChange={(event) => setStableId(event.target.value)}
              />
            </Field>
            <div className="dialog-actions">
              <button className="button" disabled={busy} onClick={() => setCreateOpen(false)} type="button">
                CANCEL
              </button>
              <button className="button primary" disabled={busy} type="submit">
                {busy ? "CREATING..." : "CREATE DRAFT"}
              </button>
            </div>
          </form>
        </DialogFrame>
      ) : null}
      {notice ? <div className="feedback">{notice}</div> : null}
      <div className="authoring-layout">
        <aside className="tree-panel">
          <h2>Courses and chapters</h2>
          {data.courses.map((course) => (
            <div key={course.id} className="course-tree">
              <strong>{String(course.definition.title ?? course.id)}</strong>
              {data.chapters
                .filter((item) => item.course_id === course.id)
                .map((item) => (
                  <button
                    key={item.id}
                    className={
                      item.id === chapterId ? "tree-item active" : "tree-item"
                    }
                    onClick={() => {
                      setChapterId(item.id);
                      setLessonId(undefined);
                    }}
                  >
                    <span>
                      {String(
                        item.definition.numberLabel ?? item.position,
                      ).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>
                        {String(item.definition.title ?? item.id)}
                      </strong>
                      <small>
                        {
                          data.lessons.filter(
                            (lesson) =>
                              lesson.chapter_id === item.id && !lesson.archived,
                          ).length
                        }{" "}
                        lessons
                      </small>
                    </div>
                  </button>
                ))}
            </div>
          ))}
        </aside>
        <section className="lesson-list">
          <div className="list-heading">
            <div>
              <p className="eyebrow">
                CHAPTER{" "}
                {String(chapter?.definition.numberLabel ?? chapter?.position)}
              </p>
              <h2>{String(chapter?.definition.title ?? "Select a chapter")}</h2>
            </div>
            <div className="search">
              <Search />
              <input
                aria-label="Search lessons"
                placeholder="Search lessons"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              className={
                lesson.id === lessonId
                  ? "lesson-row active"
                  : lesson.archived
                    ? "lesson-row archived"
                    : "lesson-row"
              }
              onClick={() => setLessonId(lesson.id)}
            >
              <span className="order">
                {String(lesson.position).padStart(2, "0")}
              </span>
              <div>
                <strong>{lesson.draft.title}</strong>
                <small>{lesson.id}</small>
              </div>
              <Badge
                tone={
                  lesson.archived
                    ? "red"
                    : lesson.requirement === "supplemental"
                      ? "orange"
                      : "green"
                }
              >
                {lesson.archived ? "ARCHIVED" : lesson.requirement}
              </Badge>
              <ChevronRight />
            </button>
          ))}
          {!lessons.length ? (
            <Empty
              title="No matching lessons"
              detail="Clear the search or create a supplemental lesson."
            />
          ) : null}
        </section>
        <section className="editor-panel">
          {selected ? (
            <LessonEditor
              row={selected}
              userId={userId}
              onChange={updateSelected}
              onMove={moveSelected}
              onSaved={(message) => {
                setNotice(message);
                void load();
              }}
            />
          ) : (
            <Empty
              title="Select a lesson"
              detail="Choose a lesson to edit its structured content and Android preview."
            />
          )}
        </section>
      </div>
    </>
  );
}

function LessonEditor({
  row,
  userId,
  onChange,
  onMove,
  onSaved,
}: {
  row: LessonRow;
  userId: string;
  onChange: (row: LessonRow) => void;
  onMove: (direction: -1 | 1) => void;
  onSaved: (message: string) => void;
}) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const draft = row.draft;
  const change = (patch: Partial<typeof draft>) =>
    onChange({ ...row, draft: { ...draft, ...patch } });
  const save = async () => {
    setBusy(true);
    try {
      await api.saveLesson(row, userId);
      onSaved(
        "Lesson draft saved. It is not visible to learners until publication.",
      );
    } catch (error) {
      onSaved((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    setBusy(true);
    try {
      await api.setLessonArchived(row.id, !row.archived, userId);
      onSaved(row.archived ? "Lesson restored." : "Lesson archived.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="editor-header">
        <div>
          <p className="eyebrow">{row.requirement.toUpperCase()} LESSON</p>
          <h2>{draft.title}</h2>
          <small className="mono">{row.id}</small>
        </div>
        <div className="segmented">
          <button
            className={tab === "edit" ? "active" : ""}
            onClick={() => setTab("edit")}
          >
            EDIT
          </button>
          <button
            className={tab === "preview" ? "active" : ""}
            onClick={() => setTab("preview")}
          >
            PREVIEW
          </button>
        </div>
      </div>
      {tab === "preview" ? (
        <MobilePreview row={row} />
      ) : (
        <div className="editor-form">
          <Field label="Lesson title">
            <input
              value={draft.title}
              onChange={(event) => change({ title: event.target.value })}
            />
          </Field>
          <div className="field-grid">
            <Field label="Eyebrow">
              <input
                value={draft.eyebrow}
                onChange={(event) => change({ eyebrow: event.target.value })}
              />
            </Field>
            <Field
              label="Illustration ID"
              hint="Must already exist in the Android application."
            >
              <input
                value={draft.illustration}
                onChange={(event) =>
                  change({ illustration: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Plain-English explanation">
            <textarea
              rows={7}
              value={draft.body}
              onChange={(event) => change({ body: event.target.value })}
            />
          </Field>
          <div className="section-editor">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">STRUCTURED EXPLANATION</p>
                <h3>Lesson sections</h3>
              </div>
              <button
                className="button tertiary"
                onClick={() =>
                  change({
                    sections: [
                      ...(draft.sections ?? []),
                      { heading: "NEW SECTION", body: "" },
                    ],
                  })
                }
              >
                <Plus />
                ADD SECTION
              </button>
            </div>
            {(draft.sections ?? []).map((section, index) => (
              <div className="section-row" key={`${row.id}-${index}`}>
                <input
                  aria-label={`Section ${index + 1} heading`}
                  value={section.heading}
                  onChange={(event) =>
                    change({
                      sections: draft.sections?.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, heading: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <textarea
                  aria-label={`Section ${index + 1} body`}
                  rows={3}
                  value={section.body}
                  onChange={(event) =>
                    change({
                      sections: draft.sections?.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, body: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <button
                  className="icon-button danger"
                  aria-label={`Remove section ${index + 1}`}
                  onClick={() =>
                    change({
                      sections: draft.sections?.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
          <Field label="Takeaway">
            <textarea
              rows={3}
              value={draft.takeaway}
              onChange={(event) => change({ takeaway: event.target.value })}
            />
          </Field>
          <div className="editor-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void save()}
            >
              <Save />
              {busy ? "SAVING..." : "SAVE DRAFT"}
            </button>
            <div className="row-actions">
              <button className="button tertiary" disabled={busy || row.archived} onClick={() => void onMove(-1)}>
                <ArrowUp /> MOVE EARLIER
              </button>
              <button className="button tertiary" disabled={busy || row.archived} onClick={() => void onMove(1)}>
                <ArrowDown /> MOVE LATER
              </button>
            </div>
            <ConfirmAction
              ariaLabel={row.archived ? "Restore lesson" : "Archive lesson"}
              className="button danger-outline"
              confirmLabel={row.archived ? "RESTORE LESSON" : "ARCHIVE LESSON"}
              detail={
                row.archived
                  ? "The draft will return to the active authoring list. Existing published releases are unchanged."
                  : "The draft will leave the active authoring list. Existing published releases remain immutable."
              }
              disabled={busy}
              eyebrow={row.archived ? "RESTORE DRAFT" : "ARCHIVE DRAFT"}
              onConfirm={archive}
              title={`${row.archived ? "Restore" : "Archive"} ${draft.title}?`}
              tone="warning"
            >
              <Archive />
              {row.archived ? "RESTORE LESSON" : "ARCHIVE LESSON"}
            </ConfirmAction>
          </div>
        </div>
      )}
    </>
  );
}
function MobilePreview({ row }: { row: LessonRow }) {
  return (
    <div className="preview-stage">
      <div className="phone">
        <div className="phone-header">
          <ArrowLeft />
          CLOSE <span>1 / 1</span>
        </div>
        <div className="phone-content">
          <p className="eyebrow">{row.draft.eyebrow}</p>
          <h2>{row.draft.title.toUpperCase()}</h2>
          {row.requirement === "supplemental" ? (
            <Badge tone="orange">NEW / SUPPLEMENTAL</Badge>
          ) : null}
          <p>{row.draft.body}</p>
          {row.draft.sections?.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </section>
          ))}
          <div className="takeaway">
            <strong>REMEMBER THIS</strong>
            <p>{row.draft.takeaway}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Assessments({ userId }: { userId: string }) {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof api.getCurriculum>>>();
  const [chapterId, setChapterId] = useState("1");
  const [mode, setMode] = useState<"quiz" | "flashcards">("quiz");
  const [view, setView] = useState<"focused" | "all">("focused");
  const [selectedId, setSelectedId] = useState("");
  const [selectedItemDirty, setSelectedItemDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const load = () => api.getCurriculum().then(setData);
  useEffect(() => {
    void load();
  }, []);
  const assessmentRows = useMemo<Array<QuizRow | FlashcardRow>>(() => {
    if (!data) return [];
    const rows = mode === "quiz" ? data.quiz : data.flashcards;
    return rows.filter((item) => item.chapter_id === chapterId);
  }, [chapterId, data, mode]);
  useEffect(() => {
    setSelectedId((current) =>
      assessmentRows.some(({ id }) => id === current)
        ? current
        : (assessmentRows[0]?.id ?? ""),
    );
    setSelectedItemDirty(false);
  }, [assessmentRows]);
  if (!data) return <Loading />;
  const lessons = data.lessons.filter(
    (item) =>
      item.chapter_id === chapterId &&
      item.requirement === "core" &&
      !item.archived,
  );
  const selectedChapter = data.chapters.find(({ id }) => id === chapterId);
  const selectedAssessment =
    assessmentRows.find(({ id }) => id === selectedId) ?? assessmentRows[0];
  return (
    <>
      <PageIntro
        eyebrow="ASSESSMENT AUTHORING"
        title="Quiz and active-recall content"
        detail="Assessment edits are validated against stable lesson IDs before publication."
      />
      {notice ? <div className="feedback">{notice}</div> : null}
      <div className="toolbar">
        <select
          aria-label="Chapter"
          disabled={selectedItemDirty}
          value={chapterId}
          onChange={(event) => setChapterId(event.target.value)}
        >
          {data.chapters.map((chapter) => (
            <option value={chapter.id} key={chapter.id}>
              {String(chapter.definition.numberLabel)} —{" "}
              {String(chapter.definition.title)}
            </option>
          ))}
        </select>
        <div className="segmented">
          <button
            className={mode === "quiz" ? "active" : ""}
            disabled={selectedItemDirty}
            onClick={() => setMode("quiz")}
          >
            QUIZ
          </button>
          <button
            className={mode === "flashcards" ? "active" : ""}
            disabled={selectedItemDirty}
            onClick={() => setMode("flashcards")}
          >
            FLASHCARDS
          </button>
        </div>
        <div className="segmented assessment-view-toggle" aria-label="Editor view">
          <button
            className={view === "focused" ? "active" : ""}
            disabled={selectedItemDirty}
            onClick={() => setView("focused")}
            type="button"
          >
            FOCUSED
          </button>
          <button
            className={view === "all" ? "active" : ""}
            disabled={selectedItemDirty}
            onClick={() => setView("all")}
            type="button"
          >
            ALL ITEMS
          </button>
        </div>
        <button
          className="button primary"
          disabled={!lessons[0] || selectedItemDirty}
          onClick={() =>
            void (
              mode === "quiz"
                ? api.createQuiz(
                    chapterId,
                    lessons[0].id,
                    data.quiz.filter((item) => item.chapter_id === chapterId)
                      .length + 1,
                    userId,
                  )
                : api.createFlashcard(
                    chapterId,
                    lessons[0].id,
                    data.flashcards.filter(
                      (item) => item.chapter_id === chapterId,
                    ).length + 1,
                    userId,
                  )
            ).then(load)
          }
        >
          <Plus />
          ADD {mode === "quiz" ? "QUESTION" : "CARD"}
        </button>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {String(selectedChapter?.definition.numberLabel)}
            </p>
            <h2>{String(selectedChapter?.definition.title)}</h2>
          </div>
          <Badge>{assessmentRows.length} ITEMS</Badge>
        </div>
        {assessmentRows.length === 0 ? (
          <Empty
            title={`No ${mode === "quiz" ? "quiz questions" : "flashcards"}`}
            detail="Add the first item for this chapter to begin authoring."
          />
        ) : view === "focused" ? (
          <div className="assessment-workspace">
            <aside className="assessment-navigator" aria-label={`${mode} items`}>
              <div className="assessment-navigator-heading">
                <strong>{mode === "quiz" ? "QUESTIONS" : "CARDS"}</strong>
                <span>{assessmentRows.length}</span>
              </div>
              <div className="assessment-navigator-list">
                {assessmentRows.map((row) => {
                  const prompt = row.draft.prompt;
                  const lessonTitle = lessons.find(({ id }) => id === row.lesson_id)?.draft.title;
                  const selected = row.id === selectedId;
                  return (
                    <button
                      aria-current={selected ? "true" : undefined}
                      className={`assessment-navigator-item${selected ? " active" : ""}`}
                      disabled={selectedItemDirty && !selected}
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      title={selectedItemDirty && !selected ? "Save the current item before switching." : prompt}
                      type="button"
                    >
                      <span>{mode === "quiz" ? "Q" : "C"}{String(row.position).padStart(2, "0")}</span>
                      <strong>{prompt || `Untitled ${mode === "quiz" ? "question" : "card"}`}</strong>
                      <small>{lessonTitle ?? "Lesson mapping unavailable"}</small>
                    </button>
                  );
                })}
              </div>
              {selectedItemDirty ? (
                <p className="assessment-unsaved" role="status">
                  UNSAVED CHANGES / SAVE BEFORE SWITCHING
                </p>
              ) : null}
            </aside>
            <div className="assessment-editor-pane">
              {mode === "quiz" ? (
                <QuizEditor
                  key={selectedId}
                  row={selectedAssessment as QuizRow}
                  lessons={lessons}
                  userId={userId}
                  onDirtyChange={setSelectedItemDirty}
                  onDone={(message) => {
                    setNotice(message);
                    void load();
                  }}
                />
              ) : (
                <FlashcardEditor
                  key={selectedId}
                  row={selectedAssessment as FlashcardRow}
                  lessons={lessons}
                  userId={userId}
                  onDirtyChange={setSelectedItemDirty}
                  onDone={(message) => {
                    setNotice(message);
                    void load();
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="assessment-list">
            {mode === "quiz"
              ? (assessmentRows as QuizRow[]).map((row) => (
                  <QuizEditor key={row.id} row={row} lessons={lessons} userId={userId} onDone={(message) => { setNotice(message); void load(); }} />
                ))
              : (assessmentRows as FlashcardRow[]).map((row) => (
                  <FlashcardEditor key={row.id} row={row} lessons={lessons} userId={userId} onDone={(message) => { setNotice(message); void load(); }} />
                ))}
          </div>
        )}
      </section>
    </>
  );
}
function QuizEditor({
  row,
  lessons,
  userId,
  onDone,
  onDirtyChange,
}: {
  row: QuizRow;
  lessons: LessonRow[];
  userId: string;
  onDone: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState(row);
  const dirty = JSON.stringify(value) !== JSON.stringify(row);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  return (
    <article className="assessment-card">
      <div className="card-number">
        Q{String(row.position).padStart(2, "0")}
      </div>
      <div className="assessment-item-toolbar">
        <div>
          <strong>EDITING QUESTION {String(row.position).padStart(2, "0")}</strong>
          <span className={dirty ? "is-dirty" : ""}>
            {dirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
          </span>
        </div>
        <div className="assessment-item-actions">
          <button
            className="button primary"
            disabled={!dirty}
            onClick={() =>
              void api
                .saveQuiz(value, userId)
                .then(() => onDone("Quiz question saved."))
            }
          >
            <Save />
            SAVE CHANGES
          </button>
          <ConfirmAction
            className="button danger-outline"
            ariaLabel="Delete quiz question"
            confirmLabel="DELETE QUESTION"
            detail="This removes the draft question from the authoring workspace. Published releases remain unchanged."
            onConfirm={() =>
              api
                .deleteAssessment("content_quiz_questions", row.id)
                .then(() => onDone("Question deleted."))
            }
            title="Delete this quiz question?"
          >
            <Trash2 />
            DELETE QUESTION
          </ConfirmAction>
        </div>
      </div>
      <div className="assessment-fields">
        <Field label="Scenario question">
          <textarea
            rows={2}
            value={value.draft.prompt}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, prompt: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Mapped lesson">
          <select
            value={value.lesson_id}
            onChange={(event) =>
              setValue({
                ...value,
                lesson_id: event.target.value,
                draft: { ...value.draft, lessonId: event.target.value },
              })
            }
          >
            {lessons.map((lesson) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.draft.title}
              </option>
            ))}
          </select>
        </Field>
        {value.draft.answers.map((answer, index) => (
          <Field
            key={index}
            label={`Answer ${index + 1}${index === value.draft.correctAnswerIndex ? " / Correct" : ""}`}
          >
            <div className="answer-row">
              <input
                type="radio"
                checked={index === value.draft.correctAnswerIndex}
                onChange={() =>
                  setValue({
                    ...value,
                    draft: { ...value.draft, correctAnswerIndex: index },
                  })
                }
              />
              <input
                value={answer}
                onChange={(event) =>
                  setValue({
                    ...value,
                    draft: {
                      ...value.draft,
                      answers: value.draft.answers.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    },
                  })
                }
              />
            </div>
          </Field>
        ))}
        <Field label="Feedback">
          <textarea
            rows={2}
            value={value.draft.explanation}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, explanation: event.target.value },
              })
            }
          />
        </Field>
      </div>
    </article>
  );
}
function FlashcardEditor({
  row,
  lessons,
  userId,
  onDone,
  onDirtyChange,
}: {
  row: FlashcardRow;
  lessons: LessonRow[];
  userId: string;
  onDone: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState(row);
  const dirty = JSON.stringify(value) !== JSON.stringify(row);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  return (
    <article className="assessment-card">
      <div className="card-number">
        C{String(row.position).padStart(2, "0")}
      </div>
      <div className="assessment-item-toolbar">
        <div>
          <strong>EDITING CARD {String(row.position).padStart(2, "0")}</strong>
          <span className={dirty ? "is-dirty" : ""}>
            {dirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
          </span>
        </div>
        <div className="assessment-item-actions">
          <button
            className="button primary"
            disabled={!dirty}
            onClick={() =>
              void api
                .saveFlashcard(value, userId)
                .then(() => onDone("Flashcard saved."))
            }
          >
            <Save />
            SAVE CHANGES
          </button>
          <ConfirmAction
            className="button danger-outline"
            ariaLabel="Delete flashcard"
            confirmLabel="DELETE FLASHCARD"
            detail="This removes the draft flashcard from the authoring workspace. Published releases remain unchanged."
            onConfirm={() =>
              api
                .deleteAssessment("content_flashcards", row.id)
                .then(() => onDone("Flashcard deleted."))
            }
            title="Delete this flashcard?"
          >
            <Trash2 />
            DELETE CARD
          </ConfirmAction>
        </div>
      </div>
      <div className="assessment-fields">
        <Field label="Recall question">
          <textarea
            rows={2}
            value={value.draft.prompt}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, prompt: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Mapped lesson">
          <select
            value={value.lesson_id}
            onChange={(event) =>
              setValue({
                ...value,
                lesson_id: event.target.value,
                draft: { ...value.draft, lessonId: event.target.value },
              })
            }
          >
            {lessons.map((lesson) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.draft.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Answer">
          <textarea
            rows={2}
            value={value.draft.answer}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, answer: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Why it matters">
          <textarea
            rows={2}
            value={value.draft.explanation}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, explanation: event.target.value },
              })
            }
          />
        </Field>
      </div>
    </article>
  );
}

function Sources({ userId }: { userId: string }) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [form, setForm] = useState<Partial<SourceRow>>({
    label: "",
    url: "https://",
    notes: "",
  });
  const [notice, setNotice] = useState("");
  const load = () => Promise.all([api.getSources(), api.getCurriculum()]).then(([nextRows, curriculum]) => { setRows(nextRows); setLessons(curriculum.lessons.filter(({ archived }) => !archived)); });
  useEffect(() => {
    void load();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.saveSource(form, userId);
      setForm({ label: "", url: "https://", notes: "" });
      setNotice("Source saved.");
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  return (
    <>
      <PageIntro
        eyebrow="TECHNICAL INTEGRITY"
        title="Source references"
        detail="Record the primary RFC, IEEE/IANA, or official vendor material supporting authored claims."
      />
      {notice ? <div className="feedback">{notice}</div> : null}
      <div className="two-column">
        <form className="panel form-stack" onSubmit={submit}>
          <h2>{form.id ? "Edit source" : "Add source"}</h2>
          <Field label="Related lesson" hint="Optional. Assigning a lesson lets the Android app place this reference with the correct material.">
            <select value={form.lesson_id ?? ""} onChange={(event) => setForm({ ...form, lesson_id: event.target.value || undefined })}>
              <option value="">General curriculum source</option>
              {lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.draft.title}</option>)}
            </select>
          </Field>
          <Field label="Source label">
            <input
              required
              value={form.label ?? ""}
              onChange={(event) =>
                setForm({ ...form, label: event.target.value })
              }
            />
          </Field>
          <Field label="HTTPS URL">
            <input
              required
              type="url"
              value={form.url ?? ""}
              onChange={(event) =>
                setForm({ ...form, url: event.target.value })
              }
            />
          </Field>
          <Field label="Authoring note">
            <textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </Field>
          <button className="button primary">
            <Save />
            SAVE SOURCE
          </button>
        </form>
        <section className="panel">
          <h2>Reference library</h2>
          {rows.map((row) => (
            <article className="source-row" key={row.id}>
              <div>
                <strong>{row.label}</strong>
                <a href={row.url} target="_blank" rel="noreferrer">
                  {row.url}
                </a>
                <p>{row.notes}</p>
              </div>
              <div className="row-actions">
                <button
                  className="button tertiary"
                  onClick={() => setForm(row)}
                >
                  EDIT
                </button>
                <ConfirmAction
                  className="icon-button danger"
                  ariaLabel="Delete source"
                  confirmLabel="DELETE SOURCE"
                  detail="This removes the reference from the draft library. Published curriculum packages remain unchanged."
                  onConfirm={() => api.deleteSource(row.id).then(load)}
                  title="Delete this source?"
                >
                  <X />
                </ConfirmAction>
              </div>
            </article>
          ))}
          {!rows.length ? (
            <Empty
              title="No source records"
              detail="Add the official references used to verify a lesson."
            />
          ) : null}
        </section>
      </div>
    </>
  );
}

function Assets({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [file, setFile] = useState<File>();
  const [altText, setAltText] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => Promise.all([api.getAssets(), api.getCurriculum()]).then(([nextRows, curriculum]) => { setRows(nextRows); setLessons(curriculum.lessons.filter(({ archived }) => !archived)); });
  useEffect(() => {
    void load();
  }, []);
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || altText.trim().length < 5)
      return setNotice(
        "Choose an image and write meaningful alternative text.",
      );
    if (file.size > 5 * 1024 * 1024) return setNotice("The image must be 5 MB or smaller.");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setNotice("Use a PNG, JPEG, or WebP image.");
    setBusy(true);
    try {
      const dimensions = await imageDimensions(file);
      if (dimensions.width > 4096 || dimensions.height > 4096) throw new Error("Image dimensions must not exceed 4096 × 4096 pixels.");
      await api.uploadAsset(file, altText, dimensions, userId, lessonId || undefined);
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
        detail="Uploaded images support recognition. Networking values and calculated facts remain code-rendered in the Android app."
      />
      {notice ? <div className="feedback">{notice}</div> : null}
      <div className="two-column">
        <form className="panel form-stack" onSubmit={upload}>
          <h2>Upload supporting image</h2>
          <Field label="Related lesson" hint="Optional. Choose where this supporting image belongs.">
            <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
              <option value="">General curriculum asset</option>
              {lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.draft.title}</option>)}
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
          <button className="button primary" disabled={busy}>
            <Upload />
            {busy ? "UPLOADING..." : "UPLOAD DRAFT IMAGE"}
          </button>
        </form>
        <section className="panel">
          <h2>Media records</h2>
          <div className="asset-grid">
            {rows.map((asset) => (
              <article className="asset-card" key={asset.id}>
                <div className="asset-placeholder">
                  {asset.preview_url ? <img src={asset.preview_url} alt={asset.alt_text} /> : <Image />}
                </div>
                <div>
                  <Badge tone={asset.published ? "green" : "orange"}>
                    {asset.published ? "PUBLISHED" : "DRAFT"}
                  </Badge>
                  <strong>{asset.alt_text}</strong>
                  <small>
                    {asset.width} × {asset.height} /{" "}
                    {Math.round(asset.byte_size / 1024)} KB
                  </small>
                </div>
                <ConfirmAction
                  className="icon-button danger"
                  ariaLabel="Delete image"
                  confirmLabel="DELETE IMAGE"
                  detail="This permanently removes the unpublished image from draft storage."
                  disabled={asset.published}
                  onConfirm={() => api.deleteAsset(asset).then(load)}
                  title="Delete this draft image?"
                  triggerTitle={
                    asset.published
                      ? "Published assets are immutable"
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

function Releases({ canPublish }: { canPublish: boolean }) {
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [validation, setValidation] =
    useState<Awaited<ReturnType<typeof api.validateRelease>>>();
  const [changelog, setChangelog] = useState("");
  const [minimum, setMinimum] = useState("1.0.0");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api.getReleases().then(setRows);
  useEffect(() => {
    void load();
  }, []);
  const validate = async () => {
    setBusy(true);
    try {
      const result = await api.validateRelease();
      setValidation(result);
      setNotice(
        result.valid
          ? "Draft passed publication validation."
          : `${result.issues.length} issue(s) must be corrected.`,
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!canPublish || !validation?.valid) return;
    setBusy(true);
    try {
      const result = await api.publishRelease(changelog, minimum);
      setNotice(`Release ${result.releaseVersion} published.`);
      setChangelog("");
      setValidation(undefined);
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
        eyebrow="CONTROLLED DELIVERY"
        title="Validate and publish"
        detail="Learners receive only complete, immutable releases. Draft saves never change the Android curriculum."
      />
      {notice ? <div className="feedback">{notice}</div> : null}
      <div className="release-layout">
        <section className="panel publish-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PUBLICATION CHECK</p>
              <h2>Prepare the next release</h2>
            </div>
            <Badge
              tone={
                validation?.valid ? "green" : validation ? "red" : "neutral"
              }
            >
              {validation?.valid
                ? "VALID"
                : validation
                  ? "ACTION NEEDED"
                  : "NOT CHECKED"}
            </Badge>
          </div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void validate()}
          >
            <RefreshCw />
            VALIDATE CURRENT DRAFT
          </button>
          {validation ? (
            <div className="validation-results">
              {Object.entries(validation.totals).map(([label, value]) => (
                <span key={label}>
                  <strong>{value}</strong>
                  {label}
                </span>
              ))}
              {validation.issues.map((issue) => (
                <div className="issue" key={`${issue.path}-${issue.message}`}>
                  <strong>{issue.path}</strong>
                  <p>{issue.message}</p>
                </div>
              ))}
            </div>
          ) : null}
          <Field label="Release changelog">
            <textarea
              rows={4}
              value={changelog}
              onChange={(event) => setChangelog(event.target.value)}
              placeholder="Explain what learners and instructors should know about this release."
            />
          </Field>
          <Field label="Minimum Android app version">
            <input
              value={minimum}
              pattern="\d+\.\d+\.\d+"
              onChange={(event) => setMinimum(event.target.value)}
            />
          </Field>
          {!canPublish ? (
            <div className="feedback warning">
              Publisher permission is required. Editors can validate but cannot
              release content.
            </div>
          ) : null}
          <ConfirmAction
            className="button primary"
            confirmLabel="PUBLISH RELEASE"
            detail="This creates an immutable curriculum release and makes it available to connected Android devices. Drafts remain editable for the next release."
            disabled={
              busy ||
              !canPublish ||
              !validation?.valid ||
              changelog.trim().length < 3
            }
            eyebrow="IMMUTABLE DELIVERY"
            onConfirm={publish}
            title="Publish this curriculum release?"
            tone="warning"
          >
            <Rocket />
            PUBLISH IMMUTABLE RELEASE
          </ConfirmAction>
        </section>
        <section className="panel">
          <h2>Release history</h2>
          {rows.map((row, index) => (
            <article className="release-row" key={row.id}>
              <div className="release-version">V{row.release_version}</div>
              <div>
                <div className="row-title">
                  <strong>{row.changelog}</strong>
                  {index === 0 ? (
                    <Badge tone="green">ACTIVE</Badge>
                  ) : row.rollback_of ? (
                    <Badge tone="orange">ROLLBACK</Badge>
                  ) : null}
                </div>
                <p>
                  {new Date(row.published_at).toLocaleString()} / App{" "}
                  {row.minimum_app_version}+
                </p>
                <small className="mono">SHA-256 {row.checksum}</small>
              </div>
              {canPublish && index > 0 ? (
                <ConfirmAction
                  className="button tertiary"
                  confirmLabel="PUBLISH ROLLBACK"
                  detail={`Release ${row.release_version} will be republished as a new immutable release. Historical releases will not be edited or deleted.`}
                  eyebrow="ROLLBACK RELEASE"
                  onConfirm={() =>
                    api.rollbackRelease(row.id).then(() => {
                      setNotice("Rollback release published.");
                      return load();
                    })
                  }
                  title={`Return learners to release ${row.release_version}?`}
                  tone="warning"
                >
                  ROLL BACK TO THIS
                </ConfirmAction>
              ) : null}
            </article>
          ))}
          {!rows.length ? (
            <Empty
              title="No remote releases"
              detail="Validate and publish the seeded curriculum to create version one."
            />
          ) : null}
        </section>
      </div>
    </>
  );
}

function Audit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  useEffect(() => {
    void api.getAuditLog().then(setRows);
  }, []);
  return (
    <>
      <PageIntro
        eyebrow="ACCOUNTABILITY"
        title="Audit history"
        detail="Draft changes, publishing, and rollback operations are retained as append-only administrative evidence."
      />
      <section className="panel">
        <div className="audit-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div className="audit-icon">
                <Sparkles />
              </div>
              <div>
                <strong>
                  {row.action.toUpperCase()} / {row.entity_type}
                </strong>
                <p>{row.entity_id}</p>
                <small>{new Date(row.created_at).toLocaleString()}</small>
              </div>
              <pre>{JSON.stringify(row.detail, null, 2)}</pre>
            </article>
          ))}
        </div>
        {!rows.length ? (
          <Empty
            title="No administrative events"
            detail="Publishing and rollback records will appear here."
          />
        ) : null}
      </section>
    </>
  );
}
