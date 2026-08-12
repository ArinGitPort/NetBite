"""Generate the Week 4 CRUD and Week 5 API submission PDFs."""

from __future__ import annotations

import base64
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp" / "week4-week5-reports"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")


def image_uri(path: Path) -> str:
    mime = "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #ebe8e5; color: #252126; font-family: Arial, sans-serif; }
.page { width: 210mm; min-height: 297mm; padding: 17mm 17mm 15mm; background: #fbfaf8; page-break-after: always; position: relative; }
.page:last-child { page-break-after: auto; }
.kicker { color: #bd4248; font-size: 10pt; font-weight: 700; letter-spacing: 1.7px; text-transform: uppercase; }
h1 { margin: 8mm 0 4mm; font-size: 30pt; line-height: 1.05; color: #201d21; }
h2 { margin: 4mm 0 2mm; font-size: 20pt; line-height: 1.15; }
h3 { margin: 0 0 2mm; font-size: 12pt; color: #bd4248; text-transform: uppercase; letter-spacing: .8px; }
p, li, td, th { font-size: 10.5pt; line-height: 1.45; }
.lead { font-size: 14pt; line-height: 1.5; color: #5a555b; max-width: 155mm; }
.meta { margin-top: 18mm; width: 100%; border-collapse: collapse; }
.meta td { border-top: 1px solid #d4cfd2; padding: 4mm 2mm; }
.meta td:first-child { width: 40mm; color: #777078; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 1px; }
.rail { width: 22mm; height: 3px; background: #bd4248; margin-top: 5mm; }
.section-head { border-bottom: 1px solid #d4cfd2; padding-bottom: 4mm; margin-bottom: 6mm; }
.card { border: 1px solid #d4cfd2; padding: 5mm; background: white; margin-bottom: 4mm; }
.accent { border-left: 4px solid #d18b5a; }
.green { border-left: 4px solid #71958b; }
table.data { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.data th { background: #2a252b; color: white; text-align: left; padding: 3mm; font-size: 8.5pt; }
table.data td { border: 1px solid #d4cfd2; vertical-align: top; padding: 3mm; font-size: 9pt; }
.shot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.shot { border: 1px solid #d4cfd2; background: #171418; padding: 2mm; }
.shot img { display: block; width: 100%; max-height: 171mm; object-fit: contain; object-position: top; }
.shot.small img { max-height: 105mm; }
.caption { background: #fbfaf8; color: #4e494f; padding: 2.5mm; font-size: 8.5pt; line-height: 1.35; }
.code { background: #171418; color: #ddd8da; border-left: 4px solid #c04848; padding: 5mm; font: 10pt/1.5 Consolas, monospace; white-space: pre-wrap; }
.checklist { columns: 2; column-gap: 10mm; }
.checklist li { break-inside: avoid; margin-bottom: 2mm; }
.footer { position: absolute; left: 17mm; right: 17mm; bottom: 8mm; border-top: 1px solid #d4cfd2; padding-top: 2mm; color: #777078; font-size: 8pt; display: flex; justify-content: space-between; }
.status { display: inline-block; padding: 1.5mm 2.5mm; border: 1px solid #71958b; color: #416b61; font-size: 8.5pt; font-weight: 700; letter-spacing: .7px; }
"""


def footer(week: str, page: int) -> str:
    return f'<div class="footer"><span>NETBITE / {week} / ITE-231</span><span>ALLEN LAZATIN / {page}</span></div>'


def page(content: str, week: str, number: int) -> str:
    return f'<section class="page">{content}{footer(week, number)}</section>'


def week4_html(folder: Path) -> str:
    images = {name: image_uri(folder / name) for name in ["Create.png", "Read.png", "Update.png", "Delete-confirmation.png", "Persistence.png"]}
    pages = [
        page("""
          <div class="kicker">Week 4 Activity / CRUD Functionality</div><div class="rail"></div>
          <h1>Sandbox Device<br>CRUD Implementation</h1>
          <p class="lead">A complete offline Create, Read, Update, and Delete workflow integrated into NetBite’s existing Network Sandbox.</p>
          <table class="meta"><tr><td>Student</td><td><b>Allen Lazatin</b></td></tr><tr><td>Section</td><td>ITE-231</td></tr><tr><td>Project</td><td>NetBite — Mobile Networking Education Game</td></tr><tr><td>Data entity</td><td>Sandbox Device</td></tr><tr><td>Storage</td><td>Expo SQLite-backed local persistence</td></tr><tr><td>Prepared</td><td>August 12, 2026</td></tr></table>
          <div style="margin-top:18mm" class="card green"><h3>Outcome</h3><p>Users can add, inspect, rename, configure, and safely delete PCs, switches, and routers. Every successful mutation is autosaved locally and remains available without internet access.</p></div>
        """, "WEEK 4 CRUD", 1),
        page("""
          <div class="section-head"><div class="kicker">01 / Implementation</div><h2>Entity and CRUD Mapping</h2></div>
          <div class="card accent"><h3>Sandbox Device</h3><p>Each record contains a stable ID, editable display name, type, interfaces, addressing, gateway, VLAN configuration, routes, and attached-connection count. Renaming changes only the display name, protecting cable endpoints and simulator references.</p></div>
          <table class="data"><thead><tr><th style="width:20%">Operation</th><th style="width:34%">User action</th><th>Stored result and feedback</th></tr></thead><tbody>
          <tr><td><b>Create</b></td><td>ADD → PC, switch, or router</td><td>Creates a device with stable ID and interfaces. Shows <b>DEVICE CREATED / SAVED LOCALLY</b>.</td></tr>
          <tr><td><b>Read</b></td><td>Select device → CONFIGURE</td><td>DEVICE RECORD displays identity, type, interfaces, connections, addressing, VLANs, and routes.</td></tr>
          <tr><td><b>Update</b></td><td>Edit name or networking fields</td><td>Updates the existing record without changing its ID. Specific saved feedback is shown.</td></tr>
          <tr><td><b>Delete</b></td><td>REMOVE DEVICE → DELETE DEVICE</td><td>Named confirmation reports attached cables before deleting the device and links.</td></tr></tbody></table>
          <h2 style="font-size:16pt;margin-top:8mm">Validation</h2><ul><li>Name is trimmed and limited to 1–24 characters.</li><li>Allowed characters: letters, numbers, spaces, hyphens, and underscores.</li><li>Case-insensitive duplicate names are rejected without mutation.</li><li>Malformed network values do not alter saved state.</li><li>Valid but logically incorrect network settings remain editable for learning.</li></ul>
        """, "WEEK 4 CRUD", 2),
        page(f"""
          <div class="section-head"><div class="kicker">02 / Evidence</div><h2>Create and Read</h2></div>
          <div class="shot-grid"><div class="shot"><img src="{images['Create.png']}"><div class="caption"><b>CREATE</b><br>The Add control creates a new PC record and confirms local saving.</div></div><div class="shot"><img src="{images['Read.png']}"><div class="caption"><b>READ</b><br>The Device Record exposes the saved identity, type, interface count, and connections.</div></div></div>
          <div class="card green" style="margin-top:7mm"><h3>Readability decision</h3><p>The record uses labels above values and a vertical mobile layout. Empty fields are shown as <b>NOT CONFIGURED</b> rather than looking disabled.</p></div>
        """, "WEEK 4 CRUD", 3),
        page(f"""
          <div class="section-head"><div class="kicker">03 / Evidence</div><h2>Update and Safe Delete</h2></div>
          <div class="shot-grid"><div class="shot"><img src="{images['Update.png']}"><div class="caption"><b>UPDATE</b><br>OFFICE-PC is saved on the existing record while its stable ID remains PC-3.</div></div><div class="shot"><img src="{images['Delete-confirmation.png']}"><div class="caption"><b>DELETE</b><br>The destructive modal names OFFICE-PC and reports zero attached cables before deletion.</div></div></div>
          <div class="card accent" style="margin-top:7mm"><h3>Error prevention</h3><p>Delete never happens on the first tap. The safer <b>KEEP WORKING</b> action remains available, while the destructive action is clearly labeled and visually separated.</p></div>
        """, "WEEK 4 CRUD", 4),
        page(f"""
          <div class="section-head"><div class="kicker">04 / Persistence and Verification</div><h2>Saved Across Restart</h2></div>
          <div class="shot small"><img src="{images['Persistence.png']}"><div class="caption"><b>PERSISTENCE</b><br>After browser refresh, OFFICE-PC and its stable PC-3 record are restored from local storage.</div></div>
          <div class="card green" style="margin-top:6mm"><h3>Storage design</h3><p>The Zustand Sandbox store is persisted under <code>netbite-sandbox-state-v1</code> through Expo SQLite key-value storage. Topology and configuration work fully offline. Undo/Redo history remains session-local.</p></div>
          <h2 style="font-size:16pt">Verification completed</h2><ul class="checklist"><li>Create device and interfaces</li><li>Read complete device record</li><li>Rename and trim input</li><li>Reject duplicate names</li><li>Reject invalid characters</li><li>Update addressing and interface state</li><li>Confirm destructive deletion</li><li>Remove attached links</li><li>Undo and Redo</li><li>Hydrate persisted workspace</li></ul>
          <p><span class="status">FUNCTIONAL / OFFLINE READY</span></p>
        """, "WEEK 4 CRUD", 5),
    ]
    return "<html><head><meta charset='utf-8'><style>" + CSS + "</style></head><body>" + "".join(pages) + "</body></html>"


def week5_html(folder: Path) -> str:
    images = {name: image_uri(folder / name) for name in ["Request-implementation.png", "Loading-state.png", "Retrieved-RFC.png", "JSON-response.png", "Error-or-cache-state.png"]}
    pages = [
        page("""
          <div class="kicker">Week 5 Activity / API Integration & HTTP Requests</div><div class="rail"></div>
          <h1>Network Standards<br>IETF API Integration</h1>
          <p class="lead">Official RFC metadata retrieved from the public IETF Datatracker API, validated as JSON, displayed meaningfully, and cached for offline use.</p>
          <table class="meta"><tr><td>Student</td><td><b>Allen Lazatin</b></td></tr><tr><td>Section</td><td>ITE-231</td></tr><tr><td>Project</td><td>NetBite — Mobile Networking Education Game</td></tr><tr><td>API</td><td>IETF Datatracker document metadata</td></tr><tr><td>Method</td><td>HTTP GET</td></tr><tr><td>Authentication</td><td>None required</td></tr><tr><td>Prepared</td><td>August 12, 2026</td></tr></table>
          <div style="margin-top:15mm" class="card green"><h3>Feature added</h3><p>NETWORK STANDARDS connects curriculum topics to official RFC records and remains useful during network failure by showing the last validated cached response.</p></div>
        """, "WEEK 5 API", 1),
        page("""
          <div class="section-head"><div class="kicker">01 / API Design</div><h2>Endpoint, Method, and Purpose</h2></div>
          <h3>Endpoint</h3><div class="code">GET https://datatracker.ietf.org/doc/{document-name}/doc.json
Accept: application/json</div>
          <div class="card accent" style="margin-top:6mm"><h3>Example request</h3><p><code>GET https://datatracker.ietf.org/doc/rfc826/doc.json</code></p><p>The request retrieves metadata for the Address Resolution Protocol RFC.</p></div>
          <h2 style="font-size:16pt">Why GET—and no POST</h2><p>The feature reads public standards metadata. NetBite does not create or modify IETF documents, and this public endpoint is read-only. Therefore GET satisfies the functional requirement; POST is not applicable under the assignment’s conditional wording.</p>
          <h2 style="font-size:16pt">Processing flow</h2><ol><li>Select a curated RFC.</li><li>Send a bounded GET request.</li><li>Check the HTTP status.</li><li>Parse and validate JSON fields.</li><li>Display readable metadata and the raw response.</li><li>Cache only valid records in SQLite-backed storage.</li></ol>
        """, "WEEK 5 API", 2),
        page(f"""
          <div class="section-head"><div class="kicker">02 / Request Evidence</div><h2>Implementation and Loading State</h2></div>
          <div class="shot"><img src="{images['Request-implementation.png']}"><div class="caption"><b>REQUEST IMPLEMENTATION</b><br>Fetch uses GET, an Accept header, AbortController, structured parsing, and cache storage.</div></div>
          <div class="shot small" style="margin-top:6mm"><img src="{images['Loading-state.png']}"><div class="caption"><b>LOADING STATE</b><br>The selected endpoint remains visible while the request is running, and controls expose a busy state.</div></div>
          <div class="card green" style="margin-top:6mm"><h3>Bounded request</h3><p>An eight-second timeout prevents the interface from waiting forever. Timeout, DNS/offline failure, 404, server failure, invalid JSON, and missing required fields produce different recovery messages.</p></div>
        """, "WEEK 5 API", 3),
        page(f"""
          <div class="section-head"><div class="kicker">03 / Retrieved Data</div><h2>Parsed RFC and JSON Response</h2></div>
          <div class="shot-grid"><div class="shot"><img src="{images['Retrieved-RFC.png']}"><div class="caption"><b>RETRIEVED RFC</b><br>Official RFC 826 title, state, standard level, pages, history, authors, and retrieval time.</div></div><div class="shot"><img src="{images['JSON-response.png']}"><div class="caption"><b>JSON RESPONSE</b><br>The validated source response remains inspectable in a collapsible panel.</div></div></div>
          <p style="margin-top:6mm">The app also displays the abstract and an official IETF document link. Technical text is selectable and reflows on mobile rather than being embedded in an image.</p>
        """, "WEEK 5 API", 4),
        page(f"""
          <div class="section-head"><div class="kicker">04 / Reliability</div><h2>Error Handling and Offline Cache</h2></div>
          <div class="shot small"><img src="{images['Error-or-cache-state.png']}"><div class="caption"><b>OFFLINE FALLBACK</b><br>A failed refresh explains the connectivity problem while preserving the last valid cached RFC.</div></div>
          <table class="data" style="margin-top:6mm"><thead><tr><th>Condition</th><th>NetBite response</th></tr></thead><tbody><tr><td>Timeout</td><td>Stops after eight seconds and offers Retry.</td></tr><tr><td>Offline / DNS</td><td>Shows a clear connection error and valid cache when available.</td></tr><tr><td>HTTP 404</td><td>Reports that the requested RFC was not found.</td></tr><tr><td>Malformed JSON</td><td>Rejects the response; never replaces valid cache.</td></tr><tr><td>Incomplete metadata</td><td>Rejects records missing required identity, title, state, abstract, pages, author list, or revision list.</td></tr></tbody></table>
          <h2 style="font-size:16pt">Verification completed</h2><p>Mocked tests cover success, GET construction, parsing, timeout, network failure, 404, HTTP error, invalid JSON, incomplete data, cache validation, and offline fallback. Web production export and one live RFC 826 request also pass.</p>
          <p><span class="status">VALIDATED / CACHE ENABLED</span></p>
        """, "WEEK 5 API", 5),
    ]
    return "<html><head><meta charset='utf-8'><style>" + CSS + "</style></head><body>" + "".join(pages) + "</body></html>"


def print_pdf(html: str, output: Path):
    TMP.mkdir(parents=True, exist_ok=True)
    source = TMP / f"{output.stem}.html"
    source.write_text(html, encoding="utf-8")
    subprocess.run([
        str(CHROME), "--headless=new", "--disable-gpu", "--no-sandbox", "--allow-file-access-from-files",
        "--no-pdf-header-footer", f"--print-to-pdf={output}", source.as_uri(),
    ], check=True, capture_output=True)
    if not output.exists() or output.stat().st_size < 20_000:
        raise RuntimeError(f"PDF generation failed: {output}")


def main():
    crud = ROOT / "deliverables" / "week4-crud"
    api = ROOT / "deliverables" / "week5-api"
    print_pdf(week4_html(crud), crud / "Week4_CRUD_Lazatin_Allen.pdf")
    print_pdf(week5_html(api), api / "Week5_API_Lazatin_Allen.pdf")
    print("Generated Week 4 and Week 5 reports.")


if __name__ == "__main__":
    main()
