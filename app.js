window.renderApp = function() {
    if (!tripData || !tripData.days) return;

    // Update Header
    document.title = tripData.meta.title + " | " + tripData.meta.subtitle;
    document.querySelector('.hero-subtitle').textContent = tripData.meta.subtitle;

    // Render Navigation
    renderNav();

    // Render Main Content
    renderDays();

    // Initialize Maps
    initMaps();
};

function renderNav() {
    const navInner = document.querySelector('.nav-inner');
    navInner.innerHTML = '';
    tripData.days.forEach((day, index) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn' + (index === 0 ? ' active' : '');
        btn.onclick = () => window.showDay(index);
        btn.textContent = day.shortTitle;
        navInner.appendChild(btn);
    });
}

function renderDays() {
    const container = document.getElementById('app-container');
    container.innerHTML = ''; // Clear loading spinner

    tripData.days.forEach((day, index) => {
        const section = document.createElement('section');
        section.className = 'day-section' + (index === 0 ? ' active' : '');
        section.id = day.id;

        // Day Header
        let html = `
            <div class="day-header">
                <span class="day-number">Day 0${index + 1} · ${day.dateStr}</span>
                <span class="day-tips">${day.tips}</span>
            </div>
            <div class="map-frame" style="margin-bottom: 2rem;">
                <div class="map-legend">
                    <div class="legend-item"><div class="legend-line subway"></div><span>公交/地铁</span></div>
                    <div class="legend-item"><div class="legend-line taxi"></div><span>打车</span></div>
                    <div class="legend-item"><div class="legend-line walk"></div><span>步行</span></div>
                </div>
                <div id="map-${day.id}" class="amap-container"></div>
            </div>
            <div class="sidebar" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div>
        `;

        if (day.concert) {
            html += `
                    <div class="card concert-card" style="margin-bottom: 1.5rem;">
                        <div class="card-label">特定行程</div>
                        <span class="concert-badge">${day.concert.status}</span>
                        <h3 class="concert-title">${day.concert.title}</h3>
                        <div class="concert-meta">
                            <span>📍 ${day.concert.location}</span>
                            <span>⏰ ${day.concert.time}</span>
                            <span>${day.concert.endTime}</span>
                        </div>
                    </div>
            `;
        }

        // Timeline
        html += `
                    <div class="card" style="margin-bottom: 1.5rem;">
                        <div class="card-label">行程安排</div>
                        <div class="timeline">
        `;
        
        day.timeline.forEach((item) => {
            const clickable = item.spot && tripData.spots[item.spot] ? ' clickable' : '';
            const onClick = clickable ? ` onclick="openSpotModal('${item.spot}')"` : '';
            html += `
                            <div class="timeline-item${clickable}"${onClick}>
                                <div class="timeline-time">${item.time}</div>
                                <div class="timeline-content">${item.event}</div>
                            </div>
            `;
        });

        html += `
                        </div>
                    </div>
        `;

        // Tickets
        if (day.tickets && day.tickets.length > 0) {
            html += `
                    <div class="card">
                        <div class="card-label">门票信息</div>
                        <div class="price-grid">
            `;
            day.tickets.forEach(ticket => {
                const priceClass = ticket.isBooked ? ' price-booked' : (ticket.price.includes('免费') ? ' price-free' : '');
                html += `
                            <div class="price-tag">
                                <span class="price-name">${ticket.name}</span>
                                <span class="price-value${priceClass}">${ticket.price}</span>
                            </div>
                `;
            });
            html += `
                        </div>
                    </div>
            `;
        }

        html += `
                </div>
                <div>
                    <div class="card">
                        <div class="card-label">交通指南 (开发中...)</div>
                        <div style="font-size:0.85rem; color:var(--stone);">
                            交互式编辑及智能路径规划(TSP)即将在此处上线。目前为数据解耦重构阶段，即将接入高德API计算最佳游览顺序。
                        </div>
                    </div>
                    <div class="card tip-card" style="margin-top: 1.5rem;">
                        <div class="card-label">提示</div>
                        <p class="tip-text">${day.tipsBox}</p>
                    </div>
                </div>
            </div>
        `;

        section.innerHTML = html;
        container.appendChild(section);
    });
}

window.showDay = function(index) {
    document.querySelectorAll('.day-section').forEach((el, i) => el.classList.toggle('active', i === index));
    document.querySelectorAll('.nav-btn').forEach((el, i) => el.classList.toggle('active', i === index));

    // Reset and Fit maps
    if (Object.keys(maps).length > 0) {
        setTimeout(() => Object.values(maps).forEach(map => { map.resize(); map.setFitView(); }), 100);
    }
}

// Map Initialization
function initMaps() {
    let loadedCount = 0;
    const totalConfigs = tripData.days.length;

    tripData.days.forEach(day => {
        maps[day.id] = new window.AMap.Map(`map-${day.id}`, {
            zoom: day.mapZoom || 13,
            center: day.mapCenter || [116.40, 39.90],
            zooms: [11, 15],
            mapStyle: 'amap://styles/light'
        });

        // Add dummy markers for now to prove map works
        const marker = new window.AMap.Marker({
            position: day.mapCenter || [116.40, 39.90],
            title: day.shortTitle
        });
        maps[day.id].add(marker);
    });
    
    // We will bring back fetchRealRoute in the next step when we implement interactive transports
}

function openSpotModal(spotName) {
    alert("景点详情 [" + spotName + "] 即将由 JSON 数据渲染！");
}

function closeSpotModal() {
    //
}
