const { chromium } = require('playwright');

(async () => {
    console.log('Testing full trip generation via UI...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    
    // Set API key via localstorage
    await page.evaluate(() => {
        const settings = {
            llmApiKey: 'sk-spbbzhps70wjx4ds4m9k1cbtpoajs1cs703n4cgjvc4vtwqc',
            llmModel: 'mimo-v2-pro',
            amapWebKey: '',
            amapJsKey: '',
            amapSecurityCode: ''
        };
        localStorage.setItem('app_settings', JSON.stringify(settings));
    });

    // Clear cache/reload to get new JS
    await page.reload({ waitUntil: 'networkidle' });

    // Click "New Trip"
    await page.click('button:has-text("新建行程")');
    await page.waitForSelector('#city-input');
    await page.fill('#city-input', '高平');
    await page.waitForTimeout(1000);
    // Select the first suggestion
    const sugSelector = '.amap-sug-result .auto-item';
    await page.waitForSelector(sugSelector, { timeout: 5000 }).catch(() => console.log('No suggestion box'));
    const items = await page.locator(sugSelector).count();
    if (items > 0) {
        await page.click(`${sugSelector}:first-child`);
    }

    await page.click('button:has-text("下一步")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("下一步")');
    await page.waitForTimeout(500);

    // Make sure we have the key selected
    await page.selectOption('select', 'mimo-v2-pro'); // choose mimo just in case
    
    console.log('Clicking generate...');
    page.on('dialog', async dialog => {
        console.log("DIALOG:", dialog.message());
        await dialog.dismiss();
    });

    await page.click('button:has-text("开始智能生成")');
    
    // Wait for either success or failure
    await page.waitForTimeout(20000);
    
    await browser.close();
})();
