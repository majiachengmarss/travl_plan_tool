const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 你的高德 Web 服务 API Key
const AMAP_KEY = '166024ccfc790fbdddda3fb8c3de0027';

// 托管静态文件
app.use(express.static(__dirname));

// 天气 API 代理
app.get('/api/weather', async (req, res) => {
    try {
        const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=110000&key=${AMAP_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
});

// 路径规划 API 代理
app.get('/api/direction/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { origin, destination, city } = req.query;
        
        let apiType = type === 'subway' ? 'transit/integrated' : (type === 'walk' ? 'walking' : 'driving');
        let url = `https://restapi.amap.com/v3/direction/${apiType}?origin=${origin}&destination=${destination}&key=${AMAP_KEY}`;
        
        if (apiType === 'transit/integrated') {
            url += `&city=${city || '110000'}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch direction' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'beijing-travel-guide.html'));
});

app.listen(PORT, () => {
    console.log(`
🚀 服务已启动！
--------------------------------------------
本地访问地址: http://localhost:${PORT}
--------------------------------------------
    `);
});
