async function fetchSpotRoute(points) {
    let fullPath = [];
    for (let i = 0; i < points.length - 1; i++) {
        let from = points[i];
        let to = points[i+1];
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
    }
    return fullPath;
}
