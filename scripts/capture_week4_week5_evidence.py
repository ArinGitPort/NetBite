"""Capture Week 4/5 evidence from the exported NetBite web app.

Run after: npx expo export --platform web --output-dir .tmp/week5-web
"""

from __future__ import annotations

import http.server
import os
from pathlib import Path
import threading
import time

from PIL import Image, ImageDraw, ImageFont
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / ".tmp" / "week5-web"
CRUD = ROOT / "deliverables" / "week4-crud"
API = ROOT / "deliverables" / "week5-api"
PORT = 4173


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        requested = WEB / self.path.lstrip("/").split("?", 1)[0]
        if self.path != "/" and not requested.exists():
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, *_args):
        return


def wait_text(driver, text, timeout=20):
    folded = text.lower()
    return WebDriverWait(driver, timeout).until(
        lambda browser: next((node for node in browser.find_elements(By.XPATH, f"//*[contains(translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), {folded!r})]") if node.is_displayed()), None)
    )


def click_text(driver, text, timeout=20):
    folded = text.lower()
    node = WebDriverWait(driver, timeout).until(
        lambda browser: next((item for item in browser.find_elements(By.XPATH, f"//*[translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = {folded!r}]") if item.is_displayed()), None)
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", node)
    driver.execute_script("arguments[0].click();", node)
    return node


def viewport(driver, path):
    driver.save_screenshot(str(path))


def element_shot(driver, text, path, ancestor=0):
    node = wait_text(driver, text)
    for _ in range(ancestor):
        node = node.find_element(By.XPATH, "..")
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", node)
    time.sleep(0.25)
    node.screenshot(str(path))


def source_screenshot():
    lines = [
        "const response = await fetch(",
        "  `https://datatracker.ietf.org/doc/${name}/doc.json`,",
        "  { method: 'GET', headers: { Accept: 'application/json' }, signal },",
        ");",
        "if (!response.ok) handleHttpError(response.status);",
        "const metadata = parseRfcMetadataResponse(await response.json());",
        "cacheMetadata(metadata); // SQLite-backed offline cache",
    ]
    width, height = 1400, 560
    image = Image.new("RGB", (width, height), "#151216")
    draw = ImageDraw.Draw(image)
    mono_path = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "consola.ttf"
    bold_path = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "consolab.ttf"
    mono = ImageFont.truetype(str(mono_path), 30)
    bold = ImageFont.truetype(str(bold_path), 38)
    draw.rectangle((32, 32, width - 32, height - 32), outline="#3A3F3D", width=2)
    draw.rectangle((32, 32, 42, height - 32), fill="#C04848")
    draw.text((72, 68), "IETF DATATRACKER / HTTP GET IMPLEMENTATION", font=bold, fill="#DDD8DA")
    draw.text((72, 125), "src/core/standards/ietf-api.ts", font=mono, fill="#D18B5A")
    y = 190
    for line in lines:
        draw.text((72, y), line, font=mono, fill="#C9C5C7")
        y += 48
    image.save(API / "Request-implementation.png")


def capture():
    if not WEB.exists():
        raise SystemExit("Missing .tmp/week5-web. Export the web app first.")
    CRUD.mkdir(parents=True, exist_ok=True)
    API.mkdir(parents=True, exist_ok=True)
    source_screenshot()

    os.chdir(WEB)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), SpaHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--window-size=500,1050")
    options.add_argument(f"--user-data-dir={ROOT / '.tmp' / 'week-evidence-chrome'}")
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(500, 1050)
    try:
        driver.get(f"http://127.0.0.1:{PORT}/standards")
        wait_text(driver, "NETWORK STANDARDS", 30)
        wait_text(driver, "LIVE / VALIDATED", 30)
        record_title = wait_text(driver, "An Ethernet Address Resolution Protocol")
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", record_title)
        viewport(driver, API / "Retrieved-RFC.png")

        driver.execute_cdp_cmd("Network.enable", {})
        driver.execute_cdp_cmd("Network.setCacheDisabled", {"cacheDisabled": True})
        driver.execute_cdp_cmd("Network.emulateNetworkConditions", {"offline": False, "latency": 3000, "downloadThroughput": 50000, "uploadThroughput": 50000})
        click_text(driver, "Refresh official data")
        wait_text(driver, "LOADING")
        element_shot(driver, "HTTP GET", API / "Loading-state.png", ancestor=1)
        driver.execute_cdp_cmd("Network.emulateNetworkConditions", {"offline": False, "latency": 0, "downloadThroughput": -1, "uploadThroughput": -1})
        wait_text(driver, "LIVE / VALIDATED", 30)

        click_text(driver, "JSON RESPONSE")
        wait_text(driver, '"name": "rfc826"')
        element_shot(driver, '"name": "rfc826"', API / "JSON-response.png", ancestor=1)

        driver.execute_cdp_cmd("Network.emulateNetworkConditions", {"offline": True, "latency": 0, "downloadThroughput": 0, "uploadThroughput": 0})
        click_text(driver, "Refresh official data")
        wait_text(driver, "OFFLINE FALLBACK", 15)
        element_shot(driver, "OFFLINE FALLBACK", API / "Error-or-cache-state.png", ancestor=1)
        driver.execute_cdp_cmd("Network.emulateNetworkConditions", {"offline": False, "latency": 0, "downloadThroughput": -1, "uploadThroughput": -1})

        driver.execute_script("localStorage.clear(); localStorage.setItem('netbite-local-test-pro-v1', 'enabled'); localStorage.setItem('netbite-account-entry-v1', 'complete');")
        driver.get(f"http://127.0.0.1:{PORT}/sandbox")
        wait_text(driver, "NETWORK SANDBOX", 30)
        if "FIRST SANDBOX SESSION" in driver.find_element(By.TAG_NAME, "body").text:
            click_text(driver, "Build it myself")
            click_text(driver, "Skip guide")
        click_text(driver, "ADD")
        click_text(driver, "PC")
        wait_text(driver, "DEVICE CREATED")
        element_shot(driver, "DEVICE CREATED", CRUD / "Create.png", ancestor=1)

        click_text(driver, "CONFIGURE")
        wait_text(driver, "DEVICE RECORD")
        element_shot(driver, "DEVICE RECORD", CRUD / "Read.png", ancestor=1)

        name_input = WebDriverWait(driver, 10).until(lambda browser: browser.find_element(By.CSS_SELECTOR, "input[aria-label='NAME']"))
        name_input.clear()
        name_input.send_keys("OFFICE-PC")
        click_text(driver, "Save name")
        wait_text(driver, "DEVICE UPDATED")
        element_shot(driver, "DEVICE UPDATED", CRUD / "Update.png", ancestor=1)

        click_text(driver, "Remove device")
        wait_text(driver, "Delete OFFICE-PC?")
        viewport(driver, CRUD / "Delete-confirmation.png")
        click_text(driver, "Keep working")

        driver.refresh()
        wait_text(driver, "NETWORK SANDBOX", 30)
        saved_device = WebDriverWait(driver, 15).until(lambda browser: browser.find_element(By.CSS_SELECTOR, "[aria-label^='OFFICE-PC,']"))
        driver.execute_script("arguments[0].click();", saved_device)
        click_text(driver, "CONFIGURE")
        wait_text(driver, "READ / STORED LOCALLY")
        element_shot(driver, "READ / STORED LOCALLY", CRUD / "Persistence.png", ancestor=2)
    finally:
        driver.quit()
        server.shutdown()


if __name__ == "__main__":
    capture()
