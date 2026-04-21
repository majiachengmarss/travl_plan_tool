const { chromium } = require('playwright');

(async () => {
    console.log('Launching browser for React frontend test...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    const url = 'http://localhost:3000?id=beijing';
    console.log(`Navigating to ${url}...`);
    
    // Load page
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Check data loading
    console.log('Waiting for JSON data to render...');
    await page.waitForSelector('text=北京旅行攻略', { timeout: 10000 });
    
    // Check Day 0 title
    await page.waitForSelector('h2:has-text("Day 00")');
    console.log('✅ Day 1 Rendered');

    // Check Timeline rendering
    const timelineItems = await page.locator('.tracking-wider').count();
    console.log(`✅ Found ${timelineItems} timeline items on Day 1`);
    
    // Take screenshot of Day 1
    console.log('Taking screenshot of React Day 1...');
    await page.screenshot({ path: 'screenshot_react_day1.png', fullPage: true });

    // Switch to Day 3
    console.log('Switching to Day 3...');
    await page.click('button:has-text("5.3 周日")');
    await page.waitForTimeout(500); // Give React time to re-render

    const day3Title = await page.locator('h2:has-text("Day 03")').count();
    if (day3Title > 0) {
        console.log('✅ Successfully switched to Day 3');
    } else {
        console.log('❌ Failed to switch to Day 3');
    }

    // Take screenshot of Day 3
    console.log('Taking screenshot of React Day 3...');
    await page.screenshot({ path: 'screenshot_react_day3.png', fullPage: true });

    console.log('Test completed. Browser will close in 3 seconds.');
    await page.waitForTimeout(3000);
    await browser.close();
})();
