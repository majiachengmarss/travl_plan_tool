const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('Launching browser...');
    // headless: false so the user can see it if they want, but here we just want an automated check.
    // We'll keep it headless to take screenshots safely in terminal environments.
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    const filePath = `http://localhost:3000`;
    console.log(`Navigating to ${filePath}...`);
    await page.goto(filePath, { waitUntil: 'networkidle' });
    
    // Check Weather
    console.log('Waiting for weather data...');
    // the weather element starts with "🌤️ 晴转多云", we expect it to change or exist
    await page.waitForTimeout(2000); // Give API time to respond
    const weatherText = await page.locator('.hero-weather').innerText();
    console.log(`Current Weather API Response: ${weatherText.replace(/\\n/g, ' ')}`);

    // Take screenshot of day 1
    console.log('Taking screenshot of Day 1...');
    await page.screenshot({ path: 'screenshot_day1.png', fullPage: true });

    // Switch to Day 3
    console.log('Switching to Day 3...');
    await page.click('button:has-text("5.2 周六")');
    await page.waitForTimeout(1000); // wait for map to fit view
    console.log('Taking screenshot of Day 3...');
    await page.screenshot({ path: 'screenshot_day3.png', fullPage: true });

    // Switch back to Day 1
    console.log('Switching back to Day 1...');
    await page.click('button:has-text("4.30 周四")');
    await page.waitForTimeout(500);

    // Click on a spot to open modal (天坛公园)
    console.log('Opening spot modal for 天坛公园...');
    await page.click('text=天坛公园（祈年殿/回音壁/圜丘）');
    await page.waitForTimeout(3000); // give it more time to load all segments

    // Take screenshot of the modal
    console.log('Taking screenshot of Spot Modal (天坛公园)...');
    await page.screenshot({ path: 'screenshot_temple_of_heaven.png' });

    // Close modal
    await page.click('.spot-modal-close');
    await page.waitForTimeout(500);

    console.log('Test completed successfully. Check screenshot_day1.png, screenshot_day3.png, and screenshot_modal.png in your project folder.');
    
    // leave the browser open for 3 seconds so user can see it
    await page.waitForTimeout(3000);
    await browser.close();
})();
