import re

with open('/Users/lixiaoman/Desktop/AI_project/旅行规划/beijing-travel-guide.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'// 显示景点内部游览路线（使用精心设计的原始坐标）(.*?)if \(details && details\.route\)', re.DOTALL)

new_code = """// 显示景点内部游览路线（尝试使用真实的步行路径规划）
                if (coords.route && coords.route.length > 1) {
                    spotMapRoute = new AMap.Polyline({
                        path: [],
                        strokeColor: '#c2410c',
                        strokeWeight: 5,
                        strokeOpacity: 0.85,
                        strokeDasharray: [8, 4],
                        lineJoin: 'round',
                        lineCap: 'round',
                        borderWeight: 2,
                        borderColor: 'rgba(255,255,255,0.8)',
                        borderOpacity: 0.9,
                        zIndex: 10
                    });
                    spotMiniMap.add(spotMapRoute);

                    // 异步获取每两个点之间的真实步行路线
                    (async () => {
                        let fullPath = [];
                        for (let i = 0; i < coords.route.length - 1; i++) {
                            let from = coords.route[i];
                            let to = coords.route[i+1];
                            let originStr = `${from[0]},${from[1]}`;
                            let destStr = `${to[0]},${to[1]}`;
                            let url = `https://restapi.amap.com/v3/direction/walking?origin=${originStr}&destination=${destStr}&key=166024ccfc790fbdddda3fb8c3de0027`;
                            
                            try {
                                const response = await fetch(url);
                                const data = await response.json();
                                if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
                                    const bestPath = data.route.paths[0];
                                    bestPath.steps.forEach(step => {
                                        step.polyline.split(';').forEach(point => {
                                            let pts = point.split(',');
                                            fullPath.push(new AMap.LngLat(parseFloat(pts[0]), parseFloat(pts[1])));
                                        });
                                    });
                                } else {
                                    fullPath.push(new AMap.LngLat(from[0], from[1]));
                                    fullPath.push(new AMap.LngLat(to[0], to[1]));
                                }
                            } catch (e) {
                                fullPath.push(new AMap.LngLat(from[0], from[1]));
                                fullPath.push(new AMap.LngLat(to[0], to[1]));
                            }
                            // 动态更新路线，让用户看到加载过程
                            spotMapRoute.setPath(fullPath);
                        }
                    })();

                    // 如果有详细的景点步骤，添加编号标记和标签
                    if (details && details.route) {"""

if pattern.search(content):
    new_content = pattern.sub(new_code, content)
    with open('/Users/lixiaoman/Desktop/AI_project/旅行规划/beijing-travel-guide.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    print("Pattern not found")
