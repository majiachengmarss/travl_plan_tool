const { chromium } = require('playwright');

(async () => {
    console.log('Testing transport card click isolation...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    await page.goto('http://localhost:3000?id=beijing', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=北京旅行攻略', { timeout: 10000 });
    
    console.log('✅ Page Loaded');
    await page.waitForTimeout(3000); // wait for map rendering

    console.log('Taking screenshot of initial map state (All routes)...');
    await page.screenshot({ path: 'screenshot_all_routes.png', fullPage: true });

    // Click the first transport card
    // We added cursor-pointer class, let's find the first transport card
    console.log('Clicking the first transport card...');
    const firstCard = page.locator('.cursor-pointer').first();
    await firstCard.click();
    
    await page.waitForTimeout(1000); // wait for map to re-render
    console.log('Taking screenshot of isolated route map state...');
    await page.screenshot({ path: 'screenshot_isolated_route.png', fullPage: true });

    // Click again to deselect
    console.log('Clicking the first transport card again to deselect...');
    await firstCard.click();

    await page.waitForTimeout(1000); // wait for map to re-render
    console.log('Taking screenshot of restored map state...');
    await page.screenshot({ path: 'screenshot_restored_routes.png', fullPage: true });

    console.log('Test completed successfully.');
    await page.waitForTimeout(2000);
    await browser.close();
})();
