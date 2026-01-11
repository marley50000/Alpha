from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    page.goto("http://localhost:8000")

    # Wait for the status element to indicate that the detector is ready
    status_element = page.locator("#status")
    expect(status_element).to_have_text("AprilTag detector ready.")

    # Check for the report element
    report_element = page.locator("#report")
    expect(report_element).to_be_visible()

    page.screenshot(path="screenshot.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
