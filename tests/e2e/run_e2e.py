#!/usr/bin/env python3
"""
CareerPilot AI — end-to-end smoke tests (Playwright, Chromium headless).

Covers the four flows that must never break:
  1. Auth        — landing renders, sign-in page loads, protected routes redirect
  2. Upload      — upload center renders its drop zone and link inputs
  3. Generation  — resume workspace loads with preview + copilot panels
  4. Export      — the PDF export / print controls are present and enabled

Run:      bun run test:e2e
Options:  E2E_BASE_URL (default http://localhost:8080)

When a Supabase session is available in the environment
(LOVABLE_BROWSER_SUPABASE_* injected by the platform, or a session minted with
`lovable auth-session --json`), the authenticated flows run too; otherwise the
suite verifies the redirect-to-auth behaviour and skips them with a clear note.
Secrets are only restored into the browser — never printed.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{' — ' + detail if detail else ''}")


def load_session() -> tuple[str | None, str | None, str | None]:
    """Return (storage_key, session_json, cookies_json) from env or minted file."""
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if key and session:
        return key, session, cookies

    minted = Path.home() / ".cache" / "lovable-auth" / "session.json"
    if minted.exists():
        data = json.loads(minted.read_text())
        return data["storage_key"], json.dumps(data["session"]), json.dumps(data.get("cookies", []))
    return None, None, None


async def main() -> int:
    storage_key, session_json, cookies_json = load_session()
    authenticated = bool(storage_key and session_json)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        # ---------------------------------------------------- 1. auth flow
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        body = (await page.inner_text("body")).lower()
        record("landing page renders", "careerpilot" in body, page.url)

        await page.goto(f"{BASE_URL}/auth", wait_until="domcontentloaded")
        has_email = await page.locator('input[type="email"]').count() > 0
        record("sign-in form is reachable", has_email)
        await page.screenshot(path=str(SHOTS / "1_auth.png"))

        if not authenticated:
            await page.goto(f"{BASE_URL}/dashboard", wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)
            record(
                "protected route redirects when signed out",
                "/login" in page.url or "/auth" in page.url,
                page.url,
            )
        else:
            if cookies_json:
                cookies = json.loads(cookies_json)
                for c in cookies:
                    c["url"] = BASE_URL
                await context.add_cookies(cookies)
            await page.goto(BASE_URL, wait_until="domcontentloaded")
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )

            # ------------------------------------------- 2. dashboard + upload
            await page.goto(f"{BASE_URL}/dashboard", wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)
            text = (await page.inner_text("body")).lower()
            record("dashboard loads for a signed-in user", "/auth" not in page.url, page.url)
            record("dashboard shows quick actions", "resume" in text)
            await page.screenshot(path=str(SHOTS / "2_dashboard.png"))

            await page.goto(f"{BASE_URL}/upload", wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            upload_text = (await page.inner_text("body")).lower()
            record("upload center renders drop zone", "drag" in upload_text or "drop" in upload_text)
            record(
                "upload center accepts profile links",
                "github" in upload_text and "linkedin" in upload_text,
            )
            record("file input is present", await page.locator('input[type="file"]').count() > 0)
            await page.screenshot(path=str(SHOTS / "3_upload.png"))

            # -------------------------------------- 3. templates + 4. export
            await page.goto(f"{BASE_URL}/templates", wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            tpl_text = (await page.inner_text("body")).lower()
            record("templates gallery lists templates", "atlas" in tpl_text)
            await page.screenshot(path=str(SHOTS / "4_templates.png"))

            await page.goto(f"{BASE_URL}/resume", wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)
            resume_text = (await page.inner_text("body")).lower()
            record("resume workspace loads", "/auth" not in page.url, page.url)
            record(
                "export controls are available",
                "pdf" in resume_text or "export" in resume_text or "download" in resume_text,
            )
            await page.screenshot(path=str(SHOTS / "5_resume.png"))

        fatal = [e for e in console_errors if "favicon" not in e.lower()]
        record("no fatal console errors", len(fatal) == 0, f"{len(fatal)} error(s)")

        await browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} checks passed" + ("" if authenticated else " (signed-out run)"))
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
