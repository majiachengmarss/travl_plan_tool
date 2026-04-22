const { chromium } = require('playwright');

(async () => {
    console.log('Testing Dashboard & Settings Modal...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    console.log('✅ Dashboard Page Loaded');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot_dashboard.png', fullPage: true });

    // Click Settings Icon
    // It's the top right button inside the header
    console.log('Clicking Settings Button...');
    await page.locator('header button').click();
    await page.waitForTimeout(500); // wait for modal animation

    console.log('Taking screenshot of Settings Modal...');
    await page.screenshot({ path: 'screenshot_settings_modal.png', fullPage: true });

    // Close Settings
    await page.locator('button:has-text("保存配置")').click();
    await page.waitForTimeout(500);

    // Click on Beijing Demo to see if it routes
    console.log('Clicking Beijing Demo...');
    await page.locator('text=北京 4天3晚 精华游').click();
    await page.waitForSelector('text=加载行程中...', { state: 'detached', timeout: 5000 }).catch(() => {});
    await page.waitForSelector('h2:has-text("Day 00")', { timeout: 10000 });

    console.log('✅ Successfully routed to Itinerary View');
    
    console.log('Test completed successfully.');
    await browser.close();
})();
