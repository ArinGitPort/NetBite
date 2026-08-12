from __future__ import annotations

import base64
import html
import shutil
import subprocess
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib.patches import Patch


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "deliverables" / "activity3"
ARCHIVE = OUT / "archive" / "pre-professional-redesign"
REPORT_HTML = OUT / "Week3_Activity_Lazatin_Allen.source.html"
REPORT_PDF = OUT / "Week3_Activity_Lazatin_Allen.pdf"
GANTT_PDF = OUT / "Week3_Gantt_Lazatin_Allen.pdf"
GANTT_PNG = OUT / "Week3_Gantt_Lazatin_Allen.png"
PHASE_PNG = OUT / "Week3_Executive_Timeline.png"
LOGO = ROOT / "assets" / "images" / "branding" / "netbite-menu-logo-mobile.png"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")

STUDENT = "Allen Lazatin"
SECTION = "ITE-231"
PREPARED = date(2026, 7, 29)
PROJECT_START = date(2026, 7, 13)
PROJECT_END = date(2026, 11, 20)

COLORS = {
    "ink": "#272329",
    "muted": "#6D666D",
    "red": "#C9484D",
    "orange": "#D18B5A",
    "sage": "#6F9489",
    "blue": "#6689A3",
    "violet": "#8D78A0",
    "plum": "#34212C",
    "paper": "#FBF9F7",
    "line": "#D8D1D5",
    "soft": "#F1ECEF",
    "green_soft": "#E7EFEC",
    "orange_soft": "#F7EDE6",
    "red_soft": "#F6E7E8",
}

PHASES = {
    "1": ("Project Initiation and Requirements", COLORS["red"]),
    "2": ("Research and Curriculum Planning", COLORS["orange"]),
    "3": ("UX, Architecture, and Technical Design", COLORS["sage"]),
    "4": ("Core Platform and Network Foundations", COLORS["blue"]),
    "5": ("Network Operations and Guided Simulators", COLORS["violet"]),
    "6": ("Accounts, Offline Progress, and Support", "#9A7B67"),
    "7": ("Integration and Quality Assurance", "#577D76"),
    "8": ("Documentation, Release, and Presentation", "#A55D61"),
}


def d(value: str) -> date:
    return date.fromisoformat(value)


def working_days(start: date, end: date) -> int:
    current = start
    total = 0
    while current <= end:
        if current.weekday() < 5:
            total += 1
        current += timedelta(days=1)
    return total


@dataclass(frozen=True)
class Task:
    wbs: str
    title: str
    start: date
    end: date
    dependency: str
    output: str
    workstream: str

    @property
    def phase_id(self) -> str:
        return self.wbs.split(".")[0]

    @property
    def duration(self) -> int:
        return working_days(self.start, self.end)

    @property
    def status(self) -> str:
        if self.end < PREPARED:
            return "Completed"
        if self.start <= PREPARED <= self.end:
            return "In progress"
        return "Planned"


TASKS = [
    Task("1.1", "Define project concept and success criteria", d("2026-07-13"), d("2026-07-14"), "—", "Approved concept brief", "Project management"),
    Task("1.2", "Analyze the learner problem and target users", d("2026-07-13"), d("2026-07-16"), "1.1", "Problem and user profile", "Requirements"),
    Task("1.3", "Set objectives, scope, and simulation boundaries", d("2026-07-15"), d("2026-07-21"), "1.1–1.2", "Proposal and scope baseline", "Project management"),
    Task("1.4", "Document functional and quality requirements", d("2026-07-20"), d("2026-07-31"), "1.3", "Requirements traceability list", "Requirements"),
    Task("2.1", "Collect authoritative networking references", d("2026-07-20"), d("2026-08-07"), "1.3", "RFC, IEEE, and Cisco source register", "Content research"),
    Task("2.2", "Design the Network Foundations curriculum", d("2026-07-22"), d("2026-08-07"), "1.3, 2.1", "Course 1 lesson and assessment map", "Instructional design"),
    Task("2.3", "Define teaching, assessment, and active-recall standards", d("2026-07-27"), d("2026-08-14"), "2.1–2.2", "Content and assessment standards", "Instructional design"),
    Task("3.1", "Define application architecture and state boundaries", d("2026-07-27"), d("2026-08-07"), "1.4", "Architecture and domain design", "Software design"),
    Task("3.2", "Design navigation and information architecture", d("2026-07-27"), d("2026-08-07"), "1.4", "Screen map and navigation rules", "UX design"),
    Task("3.3", "Create responsive visual and typography system", d("2026-07-27"), d("2026-08-14"), "1.2, 3.2", "Mobile design system", "UI design"),
    Task("3.4", "Specify deterministic simulation interfaces", d("2026-08-03"), d("2026-08-14"), "3.1, 2.2", "Simulation architecture specification", "Simulation design"),
    Task("3.5", "Plan offline storage, migrations, and cloud isolation", d("2026-08-10"), d("2026-08-21"), "3.1", "Persistence and recovery design", "Data design"),
    Task("4.1", "Build application shell, menu, and learning path", d("2026-08-03"), d("2026-08-14"), "3.1–3.3", "Navigable mobile application shell", "Application development"),
    Task("4.2", "Implement lessons, quizzes, flashcards, and progress", d("2026-08-10"), d("2026-08-21"), "4.1, 2.3", "Reusable learning workflow", "Learning platform"),
    Task("4.3", "Develop Foundations Chapters 1–4", d("2026-08-10"), d("2026-08-28"), "2.2, 4.2", "Networks through IPv4 modules", "Content and development"),
    Task("4.4", "Develop Foundations Chapters 5–8", d("2026-08-24"), d("2026-09-18"), "4.3", "Subnetting through ICMP modules", "Content and development"),
    Task("4.5", "Develop Foundations Chapters 9–12", d("2026-09-07"), d("2026-10-02"), "4.4", "Routing through inter-VLAN modules", "Content and development"),
    Task("4.6", "Build Foundation labs and Network Sandbox", d("2026-08-24"), d("2026-10-09"), "3.4, 4.3", "Guided labs and bounded sandbox", "Simulation development"),
    Task("5.1", "Add Course Library and readiness diagnostic", d("2026-09-07"), d("2026-09-18"), "4.2", "Course selection and prerequisite flow", "Learning platform"),
    Task("5.2", "Develop transport, DHCP, DNS, ACL, and NAT modules", d("2026-09-14"), d("2026-10-02"), "5.1, 2.3", "Operations service and policy modules", "Content and development"),
    Task("5.3", "Develop IPv6, STP, and EtherChannel modules", d("2026-09-28"), d("2026-10-16"), "5.2", "IPv6 and resilient switching modules", "Content and development"),
    Task("5.4", "Develop route-source and OSPF modules", d("2026-10-05"), d("2026-10-23"), "5.2", "Dynamic routing modules", "Content and development"),
    Task("5.5", "Build Operations simulators and capstone", d("2026-09-21"), d("2026-10-30"), "3.4, 5.2–5.4", "State-driven guided simulations", "Simulation development"),
    Task("6.1", "Implement guest mode and offline progress", d("2026-08-10"), d("2026-08-28"), "3.5, 4.1", "Reliable local-first learning", "Data and reliability"),
    Task("6.2", "Add accounts and cloud progress synchronization", d("2026-09-14"), d("2026-10-09"), "6.1", "Optional account backup and merge", "Cloud integration"),
    Task("6.3", "Add Pro demonstration and entitlement controls", d("2026-10-05"), d("2026-10-16"), "6.2", "Test-access and entitlement flow", "Account features"),
    Task("6.4", "Add adaptive review, saved items, and diagnostics", d("2026-10-12"), d("2026-10-30"), "4.2, 6.1", "Learning support toolkit", "Learning platform"),
    Task("7.1", "Write unit tests with feature development", d("2026-08-10"), d("2026-10-30"), "3.1", "Protocol and state-engine test suite", "Quality assurance"),
    Task("7.2", "Run integration and regression testing", d("2026-09-21"), d("2026-11-06"), "4.3, 7.1", "Cross-feature regression evidence", "Quality assurance"),
    Task("7.3", "Validate responsive UX and accessibility", d("2026-10-12"), d("2026-11-06"), "3.3, 4.6", "Mobile/tablet accessibility report", "UX quality"),
    Task("7.4", "Validate emulator, web, offline, and demo recovery", d("2026-10-19"), d("2026-11-06"), "6.1–6.2", "Demonstration reliability checklist", "Release reliability"),
    Task("7.5", "Resolve priority defects and freeze release candidate", d("2026-11-02"), d("2026-11-13"), "7.2–7.4", "Validated release candidate", "Quality assurance"),
    Task("8.1", "Complete user, technical, and source documentation", d("2026-10-19"), d("2026-11-13"), "4.5, 5.5", "Submission-ready documentation", "Documentation"),
    Task("8.2", "Prepare presentation and demonstration materials", d("2026-11-02"), d("2026-11-13"), "7.4, 8.1", "Slides, script, and demo evidence", "Presentation"),
    Task("8.3", "Produce final builds and submission archive", d("2026-11-09"), d("2026-11-18"), "7.5, 8.1", "Final build and verified archive", "Release management"),
    Task("8.4", "Submit and present the completed system", d("2026-11-20"), d("2026-11-20"), "8.2–8.3", "Final presentation and system handoff", "Presentation"),
]


MILESTONES = [
    ("M1", "Proposal and scope approved", d("2026-07-21"), "Approved proposal and scope statement", "Objectives, audience, and exclusions are reviewable", "Phase 1"),
    ("M2", "Requirements and curriculum baseline", d("2026-08-07"), "Requirements register and Course 1 map", "Every core requirement maps to a planned feature", "Phases 1–2"),
    ("M3", "Architecture and UX baseline", d("2026-08-14"), "Architecture, navigation, and design system", "Primary mobile flow and data boundaries are documented", "Phase 3"),
    ("M4", "Learning-platform vertical slice", d("2026-08-21"), "Lesson-to-progress workflow", "One lesson, assessment, and saved-progress flow works", "Phase 4"),
    ("M5", "Foundations introductory modules", d("2026-08-28"), "Chapters 1–4 and local persistence", "Lessons and checks run on the target emulator", "Phases 4 and 6"),
    ("M6", "Network Foundations content complete", d("2026-10-02"), "All 12 Foundation chapters", "Lessons, quizzes, flashcards, and source records resolve", "Phase 4"),
    ("M7", "Foundation simulations complete", d("2026-10-09"), "Guided labs and Network Sandbox", "Required modeled outcomes and failures pass tests", "Phase 4"),
    ("M8", "Network Operations modules complete", d("2026-10-23"), "All Operations lessons and assessments", "Course dependencies and assessments validate", "Phase 5"),
    ("M9", "Operations simulators and capstone complete", d("2026-10-30"), "Guided simulators and integrated capstone", "State-driven objectives, repair, and persistence work", "Phase 5"),
    ("M10", "Integrated testing complete", d("2026-11-06"), "Regression, usability, and demo test evidence", "Critical flows pass mobile, tablet, web, and offline checks", "Phase 7"),
    ("M11", "Release candidate and documentation approved", d("2026-11-13"), "Stable build and final documentation", "Priority defects are closed and files are reviewable", "Phases 7–8"),
    ("M12", "Final system submitted and presented", d("2026-11-20"), "Build, archive, presentation, and handoff", "Submission opens and the prepared demonstration completes", "Phase 8"),
]


RISKS = [
    ("R1", "Scope grows beyond the semester capacity", 3, 3, "New feature work is added without removing or moving another task.", "Use release boundaries, dependency gates, and a ranked backlog.", "Protect core learning flows and defer nonessential expansion.", "Project management"),
    ("R2", "A development task exceeds its estimate", 2, 3, "A milestone is more than three working days late.", "Use small components, weekly reviews, and visible dependencies.", "Re-sequence work and prioritize demonstrable core functions.", "Schedule control"),
    ("R3", "A lesson or simulator is technically inaccurate", 2, 3, "Behavior conflicts with an RFC, IEEE source, or tested engine.", "Verify claims against primary or official documentation.", "Correct the model, update linked content, and rerun tests.", "Content quality"),
    ("R4", "The mini-simulator becomes too broad to validate", 2, 3, "A lab needs arbitrary commands, timing, or unsupported protocols.", "Use fixed topologies and documented deterministic boundaries.", "Reduce the activity to its learning objective and disclose limits.", "Simulation design"),
    ("R5", "Expo or a dependency update breaks the build", 2, 3, "TypeScript, Expo Doctor, bundling, or exports begin failing.", "Pin SDK-compatible versions and retain the lockfile.", "Restore the last validated versions and isolate the update.", "Application development"),
    ("R6", "Mobile layouts clip or hide required information", 2, 3, "Text, controls, addresses, or tables overflow supported widths.", "Use shared typography, measured layouts, and vertical reflow.", "Recompose dense content without shrinking below the standard.", "UI and accessibility"),
    ("R7", "Local progress becomes incompatible after a schema change", 1, 3, "Hydration fails or valid progress disappears after an update.", "Use versioned stores, migrations, validation, and recovery copies.", "Restore compatible records and reset only confirmed corruption.", "Data reliability"),
    ("R8", "Supabase or internet access fails during demonstration", 2, 2, "Authentication or synchronization cannot reach the service.", "Keep guest learning offline-first and prepare local demo access.", "Continue locally and demonstrate cloud status separately.", "Cloud and demo reliability"),
    ("R9", "A target device or emulator is unavailable", 2, 2, "The emulator, ADB tunnel, or physical device cannot launch.", "Maintain Android and web demo paths with a preflight script.", "Use the verified web fallback and preserved presentation data.", "Release reliability"),
    ("R10", "Project files or documentation are lost", 1, 3, "A local artifact has no current recoverable copy.", "Use version control, named archives, and verified deliverables.", "Restore the newest validated copy and rebuild only the gap.", "Documentation"),
]


def archive_existing() -> None:
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    for path in (REPORT_PDF, OUT / "NetBite_Gantt_Chart.pdf"):
        if path.exists():
            target = ARCHIVE / path.name
            if not target.exists():
                shutil.copy2(path, target)


def make_gantt() -> None:
    fig = plt.figure(figsize=(16.54, 11.69), dpi=180)
    fig.patch.set_facecolor(COLORS["paper"])
    grid = fig.add_gridspec(1, 2, width_ratios=[1.12, 1.38], wspace=0.015)
    table_ax = fig.add_subplot(grid[0, 0])
    ax = fig.add_subplot(grid[0, 1])
    table_ax.set_facecolor(COLORS["paper"])
    ax.set_facecolor(COLORS["paper"])

    rows: list[tuple[str, object]] = [("milestones", None)]
    for phase_id in PHASES:
        rows.append(("phase", phase_id))
        rows.extend(("task", task) for task in TASKS if task.phase_id == phase_id)
    positions = list(range(len(rows)))[::-1]
    status_alpha = {"Completed": 1.0, "In progress": 0.82, "Planned": 0.58}
    for y, (row_type, value) in zip(positions, rows):
        if row_type == "milestones":
            for milestone_id, _, target, *_ in MILESTONES:
                ax.scatter(mdates.date2num(target), y, marker="D", s=19,
                           color=COLORS["orange"], edgecolor=COLORS["ink"], linewidth=0.35, zorder=7)
                ax.text(mdates.date2num(target), y + 0.34, milestone_id, fontsize=4.8,
                        color=COLORS["ink"], ha="center", va="bottom")
            continue
        if row_type == "phase":
            phase_id = str(value)
            phase_tasks = [task for task in TASKS if task.phase_id == phase_id]
            start = min(task.start for task in phase_tasks)
            end = max(task.end for task in phase_tasks)
            color = PHASES[phase_id][1]
            ax.axhspan(y - 0.42, y + 0.42, color=color, alpha=0.14, linewidth=0)
            ax.barh(y, (end - start).days + 1, left=mdates.date2num(start), height=0.18,
                    color=color, edgecolor="none", alpha=0.9)
            continue
        task = value
        phase_color = PHASES[task.phase_id][1]
        ax.barh(y, (task.end - task.start).days + 1, left=mdates.date2num(task.start), height=0.62,
                color=phase_color, edgecolor=COLORS["ink"], linewidth=0.35, alpha=status_alpha[task.status])
        if task.status == "Completed":
            ax.scatter(mdates.date2num(task.end), y, marker="o", s=13, color=COLORS["sage"], zorder=5)

    table_ax.set_xlim(0, 1)
    table_ax.set_ylim(-1.1, len(rows) - 0.15)
    table_ax.axis("off")
    columns = [(0.012, "WBS"), (0.083, "TASK / PHASE"), (0.61, "START"),
               (0.705, "FINISH"), (0.805, "DUR."), (0.875, "DEP.")]
    table_ax.add_patch(plt.Rectangle((0, len(rows) - 0.02), 1, 0.76,
                                     transform=table_ax.transData, color=COLORS["plum"], clip_on=False))
    for x, heading in columns:
        table_ax.text(x, len(rows) + 0.35, heading, fontsize=5.4, color="white",
                      fontweight="bold", va="center")
    for y, (row_type, value) in zip(positions, rows):
        if row_type == "milestones":
            table_ax.add_patch(plt.Rectangle((0, y - 0.42), 1, 0.84, color=COLORS["orange_soft"], linewidth=0))
            table_ax.text(0.012, y, "◆", color=COLORS["orange"], fontsize=6.2, va="center")
            table_ax.text(0.083, y, "MILESTONE TARGETS (M1–M12)", color=COLORS["ink"], fontsize=5.9,
                          fontweight="bold", va="center")
            continue
        if row_type == "phase":
            phase_id = str(value)
            name, color = PHASES[phase_id]
            phase_tasks = [task for task in TASKS if task.phase_id == phase_id]
            start = min(task.start for task in phase_tasks)
            end = max(task.end for task in phase_tasks)
            table_ax.add_patch(plt.Rectangle((0, y - 0.42), 1, 0.84, color=color, alpha=0.18, linewidth=0))
            table_ax.add_patch(plt.Rectangle((0, y - 0.42), 0.012, 0.84, color=color, linewidth=0))
            table_ax.text(0.025, y, f"PHASE {phase_id}", fontsize=5.6, color=COLORS["ink"], fontweight="bold", va="center")
            table_ax.text(0.14, y, name.upper(), fontsize=5.6, color=COLORS["ink"], fontweight="bold", va="center")
            table_ax.text(0.61, y, start.strftime("%b %d"), fontsize=5.2, color=COLORS["muted"], va="center")
            table_ax.text(0.705, y, end.strftime("%b %d"), fontsize=5.2, color=COLORS["muted"], va="center")
            continue
        task = value
        table_ax.axhline(y - 0.49, color=COLORS["line"], linewidth=0.35)
        table_ax.text(0.012, y, task.wbs, fontsize=5.35, color=COLORS["ink"], fontweight="bold", va="center")
        table_ax.text(0.083, y, task.title, fontsize=5.25, color=COLORS["ink"], va="center")
        table_ax.text(0.61, y, task.start.strftime("%b %d"), fontsize=5.15, color=COLORS["ink"], va="center")
        table_ax.text(0.705, y, task.end.strftime("%b %d"), fontsize=5.15, color=COLORS["ink"], va="center")
        table_ax.text(0.805, y, f"{task.duration}d", fontsize=5.15, color=COLORS["ink"], va="center")
        table_ax.text(0.875, y, task.dependency, fontsize=4.95, color=COLORS["muted"], va="center")

    ax.set_xlim(mdates.date2num(PROJECT_START - timedelta(days=2)), mdates.date2num(PROJECT_END + timedelta(days=5)))
    ax.set_ylim(-1.1, len(rows) - 0.15)
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO, interval=1))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    ax.tick_params(axis="x", labelsize=6.0, rotation=45, colors=COLORS["muted"])
    ax.set_yticks([])
    ax.grid(axis="x", color=COLORS["line"], linewidth=0.55)
    ax.axvline(mdates.date2num(PREPARED), color=COLORS["red"], linewidth=1.4, linestyle="--", zorder=6)
    ax.text(mdates.date2num(PREPARED) + 0.5, len(rows) - 0.4, "STATUS DATE / JUL 29", fontsize=6.3,
            color=COLORS["red"], fontweight="bold", rotation=90, va="top")
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.suptitle("NetBite Detailed Project Gantt Chart", x=0.035, y=0.969, ha="left",
                 fontsize=18, fontweight="bold", color=COLORS["ink"])
    fig.text(0.035, 0.942, "July 13–November 20, 2026  •  working-day durations  •  explicit dependencies and milestone targets",
             fontsize=8.4, color=COLORS["muted"], ha="left")
    legend = [Patch(facecolor=color, label=f"Phase {key}: {name}") for key, (name, color) in PHASES.items()]
    legend += [Patch(facecolor=COLORS["ink"], alpha=1.0, label="Completed"),
               Patch(facecolor=COLORS["ink"], alpha=0.82, label="In progress"),
               Patch(facecolor=COLORS["ink"], alpha=0.58, label="Planned"),
               Patch(facecolor=COLORS["orange"], label="Milestone")]
    fig.legend(handles=legend, loc="lower center", bbox_to_anchor=(0.5, 0.026), ncol=4, frameon=False, fontsize=6.0)
    fig.text(0.035, 0.012, f"Prepared by {STUDENT}  •  {SECTION}  •  Status date {PREPARED.strftime('%B %d, %Y')}", fontsize=7, color=COLORS["muted"])
    plt.subplots_adjust(left=0.035, right=0.985, top=0.91, bottom=0.115)
    fig.savefig(GANTT_PDF, format="pdf", facecolor=fig.get_facecolor())
    fig.savefig(GANTT_PNG, format="png", facecolor=fig.get_facecolor())
    plt.close(fig)


def phase_ranges():
    result = []
    for phase_id, (name, color) in PHASES.items():
        tasks = [task for task in TASKS if task.phase_id == phase_id]
        result.append((phase_id, name, min(t.start for t in tasks), max(t.end for t in tasks), color, len(tasks)))
    return result


def make_phase_timeline() -> None:
    phases = phase_ranges()
    fig, ax = plt.subplots(figsize=(10.4, 4.3), dpi=180)
    fig.patch.set_facecolor(COLORS["paper"])
    ax.set_facecolor(COLORS["paper"])
    positions = list(range(len(phases)))[::-1]
    for y, (_, _, start, end, color, _) in zip(positions, phases):
        ax.barh(y, (end - start).days + 1, left=mdates.date2num(start), height=0.58, color=color, edgecolor=COLORS["ink"], linewidth=0.4)
    ax.set_yticks(positions)
    ax.set_yticklabels([f"Phase {pid} / {name}" for pid, name, *_ in phases], fontsize=7.6)
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO, interval=2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    ax.tick_params(axis="x", labelsize=7, rotation=30)
    ax.tick_params(axis="y", length=0)
    ax.grid(axis="x", color=COLORS["line"], linewidth=0.6)
    ax.axvline(mdates.date2num(PREPARED), color=COLORS["red"], linewidth=1.3, linestyle="--")
    for spine in ax.spines.values():
        spine.set_visible(False)
    plt.subplots_adjust(left=0.37, right=0.98, top=0.96, bottom=0.19)
    fig.savefig(PHASE_PNG, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close(fig)


def image_data(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def esc(value) -> str:
    return html.escape(str(value), quote=True)


def header(page: int, section: str) -> str:
    return f'<div class="running-head"><span>NETBITE / ACTIVITY 3</span><span>{esc(section)}</span></div><div class="running-foot"><span>{SECTION} • {PREPARED.strftime("%B %d, %Y")}</span><span>{page:02d}</span></div>'


def sheet(page: int, section: str, body: str, extra: str = "") -> str:
    return f'<section class="sheet {extra}" data-page="{page}">{header(page, section)}<main>{body}</main></section>'


def section_title(number: str, title: str, subtitle: str) -> str:
    return f'<div class="section-label">{number}</div><h1>{esc(title)}</h1><p class="subtitle">{esc(subtitle)}</p><div class="rule"></div>'


def task_table(tasks: list[Task]) -> str:
    rows = []
    for task in tasks:
        color = PHASES[task.phase_id][1]
        rows.append(f"""
        <tr>
          <td><span class="wbs" style="border-color:{color}">{task.wbs}</span></td>
          <td><strong>{esc(task.title)}</strong><small>{esc(PHASES[task.phase_id][0])}</small></td>
          <td>{task.start.strftime('%b %d')}<br>{task.end.strftime('%b %d')}</td>
          <td class="center">{task.duration}d</td>
          <td>{esc(task.dependency)}</td>
          <td>{esc(task.output)}</td>
          <td><span class="status {task.status.lower().replace(' ', '-')}">{task.status}</span></td>
          <td>{esc(task.workstream)}</td>
        </tr>""")
    return """<table class="schedule"><thead><tr><th>WBS</th><th>Task / phase</th><th>Start / end</th><th>Dur.</th><th>Depends on</th><th>Expected output</th><th>Status</th><th>Workstream</th></tr></thead><tbody>""" + "".join(rows) + "</tbody></table>"


def milestone_table(items) -> str:
    rows = "".join(f"<tr><td><strong>{mid}</strong></td><td><strong>{esc(title)}</strong></td><td>{target.strftime('%b %d, %Y')}</td><td>{esc(output)}</td><td>{esc(criteria)}</td><td>{esc(phase)}</td></tr>" for mid, title, target, output, criteria, phase in items)
    return '<table class="milestones"><thead><tr><th>ID</th><th>Milestone</th><th>Target</th><th>Expected deliverable</th><th>Acceptance criteria</th><th>Phase</th></tr></thead><tbody>' + rows + '</tbody></table>'


def risk_cards(items) -> str:
    cards = []
    for rid, title, likelihood, impact, trigger, prevention, response, workstream in items:
        score = likelihood * impact
        priority = "HIGH" if score >= 6 else "MEDIUM" if score >= 3 else "LOW"
        cards.append(f"""<article class="risk-card">
          <div class="risk-head"><span>{rid} / {esc(title)}</span><span class="risk-score score-{priority.lower()}">{priority} • {score}/9</span></div>
          <div class="risk-grid"><div><b>Likelihood / impact</b><br>{likelihood}/3 • {impact}/3</div><div><b>Responsible workstream</b><br>{esc(workstream)}</div></div>
          <p><b>Early warning:</b> {esc(trigger)}</p><p><b>Prevention:</b> {esc(prevention)}</p><p><b>Contingency:</b> {esc(response)}</p>
        </article>""")
    return "".join(cards)


def build_html() -> str:
    logo = image_data(LOGO)
    phase_image = image_data(PHASE_PNG)
    pages = []
    pages.append(sheet(1, "COVER", f"""
      <div class="cover-mark"><img src="{logo}" alt="NetBite logo"></div>
      <div class="cover-kicker">ACTIVITY 3 / WEEK 3</div>
      <h2 class="cover-title">Project Timeline<br>& Development Plan</h2>
      <p class="cover-summary">A detailed implementation baseline covering project phases, tasks and subtasks, dates, working-day durations, milestones, deliverables, risks, and Week 3 progress.</p>
      <div class="cover-meta"><div><span>PROJECT</span><b>NetBite</b></div><div><span>STUDENT</span><b>{STUDENT}</b></div><div><span>SECTION</span><b>{SECTION}</b></div><div><span>STATUS DATE</span><b>{PREPARED.strftime('%B %d, %Y')}</b></div></div>
      <div class="cover-range">PLANNING HORIZON / {PROJECT_START.strftime('%B %d')}–{PROJECT_END.strftime('%B %d, %Y')}</div>
    """, "cover"))

    pages.append(sheet(2, "PLAN OVERVIEW", section_title("00", "Executive Project Overview", "Purpose, product scope, and planning method") + """
      <div class="lead">NetBite is a mobile-first networking education game that combines concise lessons with guided, state-driven practice. The project is designed for beginners who need to see why a networking decision occurs before they are asked to configure or troubleshoot it.</div>
      <div class="two-col"><div><h3>Project outcome</h3><ul><li>A structured Network Foundations course.</li><li>A Network Operations course for later operational skills.</li><li>Guided mini-simulators and a bounded Network Sandbox.</li><li>Offline-first progress with optional accounts and cloud backup.</li><li>Accessible Android delivery with web available for testing and demonstration fallback.</li></ul></div><div><h3>Planning principles</h3><ul><li>Requirements and technical evidence precede implementation.</li><li>Reusable learning and simulation components reduce duplicate work.</li><li>Content review overlaps development so errors are found early.</li><li>Automated tests begin with the domain engines, not after UI completion.</li><li>The final period protects integration, documentation, and presentation readiness.</li></ul></div></div>
      <div class="callout"><b>Professional planning rule</b><p>The WBS, Gantt chart, milestones, and risk register are generated from one schedule source. A date or task change is therefore reflected consistently throughout the package.</p></div>
      <h3>Project boundaries</h3><p>NetBite models configuration and networking decisions deterministically. It does not claim to reproduce production equipment, vendor operating systems, real packet timing, radio behavior, or unrestricted enterprise topology emulation.</p>
    """))

    pages.append(sheet(3, "SCHEDULE BASIS", section_title("00.1", "Scheduling Assumptions", "How to read dates, durations, dependencies, and status") + f"""
      <div class="metric-row"><div><span>BASELINE START</span><b>{PROJECT_START.strftime('%b %d, %Y')}</b></div><div><span>FINAL COMPLETION</span><b>{PROJECT_END.strftime('%b %d, %Y')}</b></div><div><span>STATUS DATE</span><b>{PREPARED.strftime('%b %d, %Y')}</b></div><div><span>DETAILED TASKS</span><b>{len(TASKS)}</b></div></div>
      <h3>Calendar and duration</h3><p>Start and end dates are inclusive. Duration is calculated in working days and excludes Saturdays and Sundays. The chart still displays the full calendar so overlaps and presentation deadlines remain visible.</p>
      <h3>Status logic</h3><div class="legend-row"><span class="legend complete">Completed</span><span>Ended before July 29</span><span class="legend active">In progress</span><span>Active on July 29</span><span class="legend planned">Planned</span><span>Starts after July 29</span></div>
      <h3>Dependencies and overlap</h3><p>A dependency identifies the task or decision that must be sufficiently complete before the next activity can proceed. Overlap is intentional where work can be performed safely in parallel—for example, source validation continues while lessons are implemented, and automated tests grow alongside each protocol engine.</p>
      <h3>Ownership</h3><p>NetBite is presented as an individual project. Allen Lazatin remains accountable for the full plan. “Workstream” identifies the kind of responsibility being performed, not a separate or invented team member.</p>
      <div class="callout orange"><b>Change control</b><p>If the adviser changes the final calendar or required scope, update the affected WBS tasks, check downstream dependencies, revise milestone dates, and record the reason. Do not silently compress testing or presentation preparation.</p></div>
    """))

    phase_descriptions = [
        ("1", "Turn the proposed idea into an approved problem statement, measurable objectives, boundaries, and traceable requirements."),
        ("2", "Establish trustworthy technical sources, curriculum sequence, and beginner-focused teaching and assessment rules."),
        ("3", "Define architecture, state ownership, navigation, responsive presentation, simulation interfaces, and recovery behavior before high-risk implementation."),
        ("4", "Build the reusable learning platform, all Network Foundations content, its guided laboratories, and the free-play sandbox."),
        ("5", "Add the advanced course in dependency order and validate each guided simulator before treating its module as complete."),
        ("6", "Protect local learning first, then add optional cloud identity, synchronization, test entitlement, adaptive review, and diagnostics."),
        ("7", "Test domain behavior, integration, mobile layouts, accessibility, offline operation, and demonstration recovery before release freeze."),
        ("8", "Complete documentation and presentation evidence, produce final exports, archive the submission, and perform the final handoff."),
    ]
    for page_no, chunk, label in [(4, phase_descriptions[:4], "01.1"), (5, phase_descriptions[4:], "01.2")]:
        cards = []
        for pid, description in chunk:
            name, color = PHASES[pid]
            tasks = [task for task in TASKS if task.phase_id == pid]
            start, end = min(t.start for t in tasks), max(t.end for t in tasks)
            cards.append(f'<article class="phase-card" style="border-left-color:{color}"><div><span>PHASE {pid}</span><h3>{esc(name)}</h3></div><div class="phase-dates">{start.strftime("%b %d")}–{end.strftime("%b %d")}<br>{sum(t.duration for t in tasks)} task-days</div><p>{esc(description)}</p><small><b>Primary output:</b> {esc(tasks[-1].output)}</small></article>')
        pages.append(sheet(page_no, "PROJECT TIMELINE", section_title(label, "Project Timeline by Phase", "Purpose, date range, and expected phase output") + "".join(cards)))

    pages.append(sheet(6, "EXECUTIVE GANTT", section_title("01.3", "Executive Gantt Overview", "Phase-level schedule and overlap") + f'<img class="phase-chart" src="{phase_image}" alt="Phase-level Gantt chart"><div class="callout"><b>Status line</b><p>The red dashed line marks July 29, 2026. Initiation is largely complete while requirements, research, architecture, navigation, and visual-design work are active. Implementation and validation remain planned in the baseline.</p></div><h3>Why activities overlap</h3><p>Curriculum research continues while reusable components are built. Tests start with implementation, and documentation begins before final coding ends. The overlap shortens the schedule without making later work independent of its required design or evidence.</p><div class="file-note">The separately supplied <b>Week3_Gantt_Lazatin_Allen.pdf</b> contains all {len(TASKS)} tasks, dependencies, weekly dates, durations, phase colors, and status information at A3 landscape size.</div>'))

    for index in range(4):
        start = index * 9
        chunk = TASKS[start:start + 9]
        pages.append(sheet(7 + index, "DETAILED WBS", section_title(f"01.{4 + index}", "Detailed Work Breakdown Structure", f"Tasks {start + 1}–{start + len(chunk)} of {len(TASKS)}") + task_table(chunk)))

    pages.append(sheet(11, "MILESTONES", section_title("02.1", "Milestones and Deliverables", "Decision points M1–M6") + '<div class="lead small">A milestone is complete only when its output is reviewable and its acceptance criteria are satisfied. Finishing code without the related content, test, or documentation evidence does not complete the milestone.</div>' + milestone_table(MILESTONES[:6])))
    pages.append(sheet(12, "MILESTONES", section_title("02.2", "Milestones and Deliverables", "Decision points M7–M12") + milestone_table(MILESTONES[6:]) + '<div class="callout"><b>Milestone control</b><p>If a milestone slips, review its dependent WBS tasks first. Revise the plan transparently rather than marking incomplete outputs as complete.</p></div>'))

    pages.append(sheet(13, "RISK PLAN", section_title("03.1", "Risk Assessment and Contingency Plan", "Priority risks R1–R5") + '<div class="risk-scale"><b>Scoring:</b> likelihood 1–3 × impact 1–3. High = 6–9, Medium = 3–4, Low = 1–2.</div>' + risk_cards(RISKS[:5])))
    pages.append(sheet(14, "RISK PLAN", section_title("03.2", "Risk Assessment and Contingency Plan", "Priority risks R6–R10") + risk_cards(RISKS[5:])))

    pages.append(sheet(15, "WEEK 3 PROGRESS", section_title("04", "Week 3 Progress and Next Priorities", "What existed at the July 29 planning checkpoint") + """
      <div class="two-col"><div><h3>Completed or established</h3><ul><li>NetBite concept, target learner, and educational problem.</li><li>Objectives, first-release boundaries, and deterministic simulation direction.</li><li>React Native and Expo as the mobile implementation stack.</li><li>Initial curriculum, source-research approach, and learning loop.</li><li>Retro-industrial visual direction and mobile readability goals.</li><li>This detailed schedule, milestone register, and contingency plan.</li></ul></div><div><h3>Evidence available</h3><ul><li>Project and system documentation in the shared repository.</li><li>A functioning application repository that validates stack feasibility.</li><li>Initial branded assets and reusable device artwork.</li><li>Structured lesson, practice, quiz, and flashcard concepts.</li><li>A bounded simulation approach that can be unit-tested.</li></ul></div></div>
      <h3>Immediate next priorities</h3><ol><li>Finish the requirements and source baseline.</li><li>Finalize architecture, navigation, persistence, and responsive UI standards.</li><li>Complete one vertical learning slice before parallel expansion.</li><li>Build pure simulation rules and tests before complex lab presentation.</li><li>Review milestone dates and risks at the end of each week.</li></ol>
      <div class="approval"><div><span>Prepared by</span><b>Allen Lazatin</b></div><div><span>Section</span><b>ITE-231</b></div><div><span>Status date</span><b>July 29, 2026</b></div></div>
      <div class="end-mark">END OF ACTIVITY 3 DEVELOPMENT PLAN</div>
    """))

    css = f"""
    @page {{ size: A4 portrait; margin: 0; }}
    * {{ box-sizing: border-box; }}
    html, body {{ margin: 0; padding: 0; background: #d6d1d4; color: {COLORS['ink']}; font-family: Arial, Helvetica, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }}
    .sheet {{ width: 210mm; height: 297mm; margin: 8mm auto; background: {COLORS['paper']}; position: relative; overflow: hidden; page-break-after: always; padding: 23mm 15mm 18mm; }}
    .sheet:last-child {{ page-break-after: auto; }}
    .running-head {{ position: absolute; left: 15mm; right: 15mm; top: 9mm; display: flex; justify-content: space-between; border-bottom: .35mm solid {COLORS['line']}; padding-bottom: 2mm; color: {COLORS['red']}; font-size: 7.5pt; font-weight: 700; letter-spacing: 1px; }}
    .running-foot {{ position: absolute; left: 15mm; right: 15mm; bottom: 7mm; display: flex; justify-content: space-between; border-top: .3mm solid {COLORS['line']}; padding-top: 2mm; color: {COLORS['muted']}; font-size: 7pt; }}
    main {{ height: 100%; }}
    h1 {{ font-size: 22pt; line-height: 1.08; margin: 1.5mm 0 1mm; color: {COLORS['ink']}; }}
    h3 {{ color: {COLORS['plum']}; font-size: 11pt; margin: 5mm 0 2mm; }}
    p, li {{ font-size: 9.2pt; line-height: 1.48; }}
    ul, ol {{ margin: 2mm 0 0; padding-left: 5mm; }}
    li {{ margin-bottom: 1.8mm; }}
    .section-label {{ color: {COLORS['red']}; font-size: 8pt; font-weight: 800; letter-spacing: 1.5px; }}
    .subtitle {{ margin: 0; color: {COLORS['muted']}; font-size: 9pt; }}
    .rule {{ height: .35mm; background: {COLORS['line']}; margin: 4mm 0 5mm; }}
    .lead {{ font-size: 11pt; line-height: 1.55; color: {COLORS['plum']}; border-left: 1.2mm solid {COLORS['orange']}; padding: 3mm 4mm; background: {COLORS['orange_soft']}; }}
    .lead.small {{ font-size: 9.2pt; }}
    .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }}
    .callout {{ margin-top: 5mm; padding: 3.5mm 4mm; border: .35mm solid {COLORS['sage']}; background: {COLORS['green_soft']}; }}
    .callout.orange {{ border-color: {COLORS['orange']}; background: {COLORS['orange_soft']}; }}
    .callout b {{ color: {COLORS['plum']}; font-size: 8pt; letter-spacing: .8px; text-transform: uppercase; }}
    .callout p {{ margin: 1.5mm 0 0; }}
    .metric-row {{ display: grid; grid-template-columns: repeat(4,1fr); gap: 2mm; }}
    .metric-row div {{ border: .35mm solid {COLORS['line']}; padding: 3mm; min-height: 18mm; }}
    .metric-row span, .cover-meta span, .approval span {{ display: block; color: {COLORS['muted']}; font-size: 6.6pt; font-weight: 700; letter-spacing: .7px; margin-bottom: 1.5mm; }}
    .metric-row b {{ font-size: 10pt; }}
    .legend-row {{ display: grid; grid-template-columns: auto 1fr auto 1fr auto 1fr; align-items: center; gap: 2mm; font-size: 8pt; }}
    .legend {{ padding: 2mm; border: .35mm solid {COLORS['line']}; font-weight: 700; text-align: center; }}
    .legend.complete {{ background: {COLORS['green_soft']}; }} .legend.active {{ background: {COLORS['orange_soft']}; }} .legend.planned {{ background: {COLORS['soft']}; }}
    .phase-card {{ border: .35mm solid {COLORS['line']}; border-left: 1.4mm solid; padding: 3.6mm 4mm; margin-bottom: 4mm; display: grid; grid-template-columns: 1fr auto; column-gap: 4mm; }}
    .phase-card span {{ color: {COLORS['red']}; font-size: 7pt; font-weight: 800; letter-spacing: 1px; }}
    .phase-card h3 {{ margin: 1mm 0 0; font-size: 12pt; }}
    .phase-card p {{ grid-column: 1 / -1; margin: 2.5mm 0 2mm; }}
    .phase-card small {{ grid-column: 1 / -1; font-size: 8pt; color: {COLORS['muted']}; }}
    .phase-dates {{ text-align: right; font-size: 8pt; color: {COLORS['muted']}; line-height: 1.4; }}
    .phase-chart {{ width: 100%; height: 110mm; object-fit: contain; border: .35mm solid {COLORS['line']}; }}
    .file-note {{ margin-top: 5mm; font-size: 8.5pt; color: {COLORS['muted']}; }}
    table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
    th {{ background: {COLORS['plum']}; color: white; font-size: 6.3pt; text-transform: uppercase; letter-spacing: .3px; padding: 2.2mm 1.2mm; text-align: left; }}
    td {{ border: .25mm solid {COLORS['line']}; padding: 2.1mm 1.2mm; font-size: 6.7pt; line-height: 1.28; vertical-align: top; overflow-wrap: anywhere; }}
    tbody tr:nth-child(even) td {{ background: {COLORS['soft']}; }}
    td small {{ display: block; margin-top: 1mm; color: {COLORS['muted']}; font-size: 5.8pt; }}
    .schedule th:nth-child(1) {{ width: 6%; }} .schedule th:nth-child(2) {{ width: 22%; }} .schedule th:nth-child(3) {{ width: 10%; }} .schedule th:nth-child(4) {{ width: 5%; }} .schedule th:nth-child(5) {{ width: 8%; }} .schedule th:nth-child(6) {{ width: 21%; }} .schedule th:nth-child(7) {{ width: 10%; }} .schedule th:nth-child(8) {{ width: 18%; }}
    .wbs {{ border-left: 1mm solid; padding-left: 1mm; font-weight: 800; }} .center {{ text-align: center; }}
    .status {{ display: inline-block; border: .25mm solid {COLORS['line']}; padding: 1mm; font-weight: 700; font-size: 5.7pt; }}
    .status.completed {{ background: {COLORS['green_soft']}; }} .status.in-progress {{ background: {COLORS['orange_soft']}; }} .status.planned {{ background: {COLORS['soft']}; }}
    .milestones th:nth-child(1) {{ width: 6%; }} .milestones th:nth-child(2) {{ width: 18%; }} .milestones th:nth-child(3) {{ width: 12%; }} .milestones th:nth-child(4) {{ width: 22%; }} .milestones th:nth-child(5) {{ width: 32%; }} .milestones th:nth-child(6) {{ width: 10%; }}
    .milestones td {{ font-size: 7.2pt; padding: 2.7mm 1.5mm; }}
    .risk-scale {{ font-size: 8pt; margin-bottom: 3mm; padding: 2.5mm; background: {COLORS['soft']}; }}
    .risk-card {{ border: .35mm solid {COLORS['line']}; margin-bottom: 3mm; padding: 3mm 3.5mm; }}
    .risk-head {{ display: flex; justify-content: space-between; align-items: start; gap: 4mm; font-size: 8.5pt; font-weight: 700; color: {COLORS['plum']}; }}
    .risk-score {{ white-space: nowrap; padding: 1mm 1.5mm; font-size: 6pt; border: .25mm solid {COLORS['line']}; }}
    .score-high {{ background: {COLORS['red_soft']}; color: {COLORS['red']}; }} .score-medium {{ background: {COLORS['orange_soft']}; }} .score-low {{ background: {COLORS['green_soft']}; }}
    .risk-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 2mm; font-size: 7pt; color: {COLORS['muted']}; }}
    .risk-card p {{ font-size: 7.1pt; margin: 1.5mm 0 0; line-height: 1.35; }}
    .approval {{ margin-top: 7mm; display: grid; grid-template-columns: repeat(3,1fr); gap: 3mm; }}
    .approval div {{ border-top: .35mm solid {COLORS['ink']}; padding-top: 2mm; }}
    .end-mark {{ margin-top: 12mm; text-align: center; color: {COLORS['red']}; font-size: 7.5pt; font-weight: 800; letter-spacing: 1.2px; }}
    .cover main {{ display: flex; flex-direction: column; justify-content: center; }}
    .cover .running-head {{ display: none; }}
    .cover-mark img {{ width: 37mm; height: 37mm; object-fit: contain; }}
    .cover-kicker {{ margin-top: 10mm; color: {COLORS['red']}; font-size: 10pt; font-weight: 800; letter-spacing: 2px; }}
    .cover-title {{ font-size: 34pt; line-height: 1.04; margin: 4mm 0 5mm; color: {COLORS['ink']}; }}
    .cover-summary {{ width: 150mm; font-size: 11pt; color: {COLORS['muted']}; line-height: 1.55; }}
    .cover-meta {{ margin-top: 12mm; display: grid; grid-template-columns: 1.1fr 1.4fr .8fr 1fr; gap: 5mm; border-top: .45mm solid {COLORS['line']}; padding-top: 5mm; }}
    .cover-meta b {{ font-size: 9pt; }}
    .cover-range {{ margin-top: 13mm; padding: 3.5mm; border: .35mm solid {COLORS['orange']}; color: {COLORS['plum']}; font-size: 8pt; font-weight: 700; letter-spacing: .8px; text-align: center; }}
    @media print {{ html, body {{ background: white; }} .sheet {{ margin: 0; }} }}
    """
    script = """<script>const p=new URLSearchParams(location.search).get('page');if(p){document.querySelectorAll('.sheet').forEach(s=>s.style.display=s.dataset.page===p?'block':'none');document.body.style.background='white';}</script>"""
    return f'<!doctype html><html><head><meta charset="utf-8"><title>NetBite Activity 3 — Allen Lazatin</title><style>{css}</style></head><body>{"".join(pages)}{script}</body></html>'


def render_report() -> None:
    REPORT_HTML.write_text(build_html(), encoding="utf-8")
    if not CHROME.exists():
        raise RuntimeError(f"Chrome was not found at {CHROME}")
    profile = OUT / ".chrome-activity3"
    if profile.exists():
        shutil.rmtree(profile)
    command = [
        str(CHROME), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        f"--user-data-dir={profile}", f"--print-to-pdf={REPORT_PDF}", REPORT_HTML.as_uri(),
    ]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    shutil.rmtree(profile, ignore_errors=True)


def validate() -> None:
    if len(TASKS) != 36:
        raise RuntimeError(f"Expected 36 detailed tasks, found {len(TASKS)}")
    if len(MILESTONES) != 12 or len(RISKS) < 10:
        raise RuntimeError("Milestone or risk register is incomplete")
    ids = [task.wbs for task in TASKS]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Duplicate WBS identifiers")
    for task in TASKS:
        if task.start > task.end or task.duration < 1:
            raise RuntimeError(f"Invalid duration for {task.wbs}")
        if task.start < PROJECT_START or task.end > PROJECT_END:
            raise RuntimeError(f"Task {task.wbs} falls outside the project baseline")
    source = REPORT_HTML.read_text(encoding="utf-8")
    required = ["Project Timeline by Phase", "Detailed Work Breakdown Structure", "Milestones and Deliverables", "Risk Assessment and Contingency Plan", "Week 3 Progress"]
    for value in required:
        if value not in source:
            raise RuntimeError(f"Report is missing required content: {value}")
    for path in (REPORT_PDF, GANTT_PDF, GANTT_PNG, PHASE_PNG):
        if not path.exists() or path.stat().st_size < 20_000:
            raise RuntimeError(f"Missing or unexpectedly small output: {path}")
    # Chrome PDFs contain one /Type /Page marker per page plus a /Pages container.
    pdf_bytes = REPORT_PDF.read_bytes()
    page_markers = pdf_bytes.count(b"/Type /Page") - pdf_bytes.count(b"/Type /Pages")
    if page_markers and page_markers != 15:
        raise RuntimeError(f"Expected 15 A4 report pages, found {page_markers}")
    print(f"Created {REPORT_PDF} ({REPORT_PDF.stat().st_size:,} bytes)")
    print(f"Created {GANTT_PDF} ({GANTT_PDF.stat().st_size:,} bytes)")
    print(f"Validated tasks={len(TASKS)}, milestones={len(MILESTONES)}, risks={len(RISKS)}, report_pages={page_markers or 'unknown'}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    archive_existing()
    make_gantt()
    make_phase_timeline()
    render_report()
    validate()


if __name__ == "__main__":
    main()
