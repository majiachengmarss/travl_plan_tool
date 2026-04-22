const { chromium } = require('playwright');

(async () => {
    console.log('Testing Create Trip Wizard UI...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    console.log('✅ Wizard Page Loaded');
    
    // Screenshot Step 1
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot_wizard_step1.png', fullPage: true });

    // Fill Step 1
    await page.fill('input[placeholder="如：成都、上海、东京"]', '成都');
    await page.click('button:has-text("下一步")');
    console.log('✅ Navigated to Step 2');

    // Screenshot Step 2
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot_wizard_step2.png', fullPage: true });

    // Fill Step 2
    await page.fill('input[placeholder="酒店名称 (可选)"]', '亚朵酒店春熙路店');
    await page.click('button:has-text("添加事件")');
    await page.fill('input[placeholder="事件/景点 (可选)"]', '大熊猫繁育研究基地');
    
    await page.click('button:has-text("下一步")');
    console.log('✅ Navigated to Step 3');

    // Screenshot Step 3
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot_wizard_step3.png', fullPage: true });

    console.log('Test completed successfully.');
    await browser.close();
})();
