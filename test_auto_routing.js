const { chromium } = require('playwright');

(async () => {
    console.log('Testing adding itinerary node and auto routing...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    await page.goto('http://localhost:3000?id=beijing', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=北京旅行攻略', { timeout: 10000 });
    
    // Click edit button
    await page.click('button:has-text("编辑行程")');
    console.log('✅ Entered edit mode');
    
    // Click add node button
    await page.click('button:has-text("添加行程节点")');
    console.log('✅ Clicked add node button');
    
    // Wait for the input to appear
    await page.waitForSelector('input[placeholder="输入地点搜索..."]');
    
    // Type in search
    await page.fill('input[placeholder="输入地点搜索..."]', '奥林匹克森林公园');
    await page.waitForTimeout(2000); // Wait for suggestions

    // Assuming the suggestion drops down, click on the first match if any
    // "奥林匹克森林公园" from amap suggestion
    // Just click "确认添加" since onLocationAdd might have been triggered by selection
    // Wait, the user needs to select from the dropdown. 
    // AMap AutoComplete adds `.amap-sug-result` div.
    const sugSelector = '.amap-sug-result .auto-item';
    await page.waitForSelector(sugSelector, { timeout: 5000 }).catch(() => console.log('No suggestion box'));
    const items = await page.locator(sugSelector).count();
    if (items > 0) {
        await page.click(`${sugSelector}:first-child`);
        console.log('✅ Selected from AutoComplete');
    }
    
    await page.waitForTimeout(500);

    await page.click('button:has-text("确认添加")');
    console.log('✅ Clicked confirm add');
    
    await page.waitForTimeout(3000); // wait for route to render

    // Take screenshot
    console.log('Taking screenshot of map with new route...');
    await page.screenshot({ path: 'screenshot_route_added.png', fullPage: true });
    
    console.log('Test completed successfully.');
    await page.waitForTimeout(2000);
    await browser.close();
})();
