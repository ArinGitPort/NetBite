from __future__ import annotations

import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "deliverables" / "netbite-ui-presentation" / "screens"
BASE_URL = "http://localhost:8090"


def wait_for_text(driver: webdriver.Chrome, text: str, seconds: int = 20) -> None:
    WebDriverWait(driver, seconds).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(translate(., 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '{text.upper()}')]"))
    )


def dismiss_optional(driver: webdriver.Chrome, labels: list[str]) -> None:
    for label in labels:
        for button in driver.find_elements(By.CSS_SELECTOR, "[role='button']"):
            if label.upper() in button.text.upper() and button.is_displayed():
                driver.execute_script("arguments[0].click();", button)
                time.sleep(1)
                return


def capture(driver: webdriver.Chrome, route: str, expected: str, name: str) -> None:
    driver.get(f"{BASE_URL}{route}")
    wait_for_text(driver, expected)
    time.sleep(1.5)
    driver.save_screenshot(str(OUTPUT / name))


def scroll_to_text(driver: webdriver.Chrome, text: str) -> None:
    element = WebDriverWait(driver, 12).until(lambda item: item.execute_script(
        "const wanted=arguments[0].toUpperCase();"
        "return [...document.querySelectorAll('*')].filter(e => (e.innerText||'').trim().toUpperCase()===wanted)"
        ".sort((a,b)=>a.getBoundingClientRect().height-b.getBoundingClientRect().height)[0] || null;",
        text,
    ))
    driver.execute_script("arguments[0].scrollIntoView({block: 'start'});", element)
    time.sleep(1)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    options = Options()
    options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    options.add_argument("--headless=new")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--force-device-scale-factor=1")
    options.add_argument("--window-size=430,932")
    options.add_argument("--disable-gpu")
    driver = webdriver.Chrome(options=options)
    try:
        driver.set_window_size(430, 932)
        driver.get(BASE_URL)
        WebDriverWait(driver, 25).until(lambda item: item.execute_script("return document.readyState") == "complete")
        driver.execute_script("localStorage.clear()")

        capture(driver, "/auth/welcome", "CONTINUE AS GUEST", "01-account-welcome.png")

        driver.execute_script("localStorage.setItem('netbite-account-entry-v1', 'complete')")
        driver.execute_script("localStorage.setItem('netbite-local-test-pro-v1', 'enabled')")
        driver.get(f"{BASE_URL}/")
        wait_for_text(driver, "START LEARNING")
        dismiss_optional(driver, ["SKIP GUIDE"])
        driver.save_screenshot(str(OUTPUT / "02-main-menu.png"))

        driver.get(f"{BASE_URL}/learn")
        wait_for_text(driver, "CHAPTER 01")
        dismiss_optional(driver, ["SKIP GUIDE"])
        driver.save_screenshot(str(OUTPUT / "03-learning-path.png"))

        driver.get(f"{BASE_URL}/lesson/arp-request")
        wait_for_text(driver, "ARP")
        scroll_to_text(driver, "OUTER ETHERNET FRAME")
        driver.save_screenshot(str(OUTPUT / "04-arp-lesson.png"))

        driver.get(f"{BASE_URL}/sandbox")
        wait_for_text(driver, "NETWORK SANDBOX")
        dismiss_optional(driver, ["EXPLORE ROUTED NETWORK"])
        dismiss_optional(driver, ["SKIP GUIDE", "SKIP", "CLOSE"])
        time.sleep(1.5)
        driver.save_screenshot(str(OUTPUT / "05-network-sandbox.png"))
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
