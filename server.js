const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 你的高德 Web 服务 API Key
const AMAP_KEY = '166024ccfc790fbdddda3fb8c3de0027';

// 天气 API 代理
app.get('/api/weather', async (req, res) => {
    try {
        const key = req.query.amap_key || AMAP_KEY;
        const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=110000&key=${key}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
});

// POI 搜索 API 代理 (将地名转换为经纬度，替代原先不精确的地理编码)
app.get('/api/geocode', async (req, res) => {
    try {
        const { address, city, amap_key } = req.query;
        const key = amap_key || AMAP_KEY;
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }
        
        let url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(address)}&key=${key}&citylimit=true`;
        if (city) {
            url += `&city=${encodeURIComponent(city)}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === '1' && data.pois && data.pois.length > 0) {
            const locationStr = data.pois[0].location; // e.g. "116.481488,39.990464"
            if (!locationStr || locationStr.length === 0) {
                return res.status(404).json({ error: 'Location coordinates missing' });
            }
            const [lng, lat] = locationStr.split(',').map(Number);
            res.json({ location: [lng, lat] });
        } else {
            res.status(404).json({ error: 'Location not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch geocode' });
    }
});

// 路径规划 API 代理
app.get('/api/direction/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { origin, destination, city, amap_key } = req.query;
        const key = amap_key || AMAP_KEY;
        
        let apiType = type === 'subway' ? 'transit/integrated' : (type === 'walk' ? 'walking' : 'driving');
        let url = `https://restapi.amap.com/v3/direction/${apiType}?origin=${origin}&destination=${destination}&key=${key}`;
        
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

// 静态数据接口
app.get('/api/itinerary/:id', (req, res) => {
    const filePath = path.join(__dirname, 'data', `${req.params.id}.json`);
    res.sendFile(filePath, err => {
        if (err) res.status(404).json({ error: 'Itinerary not found' });
    });
});

// 托管前端构建文件 (必须在所有 API 路由之后定义)
app.use(express.static(path.join(__dirname, 'frontend/dist'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// 单页应用 (SPA) Fallback
app.use((req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
🚀 服务已启动！
--------------------------------------------
本地访问地址: http://localhost:${PORT}
--------------------------------------------
    `);
});