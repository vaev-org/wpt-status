// =================== STATE ===================
let currentView = 'chart';
let currentChart = null;
let currentReport = null;

// Heatmap state
let fullData = null;
let filteredData = null;
let heatmapCanvas, heatmapCtx;
let cellSize = 12;
let offsetX = 0, offsetY = 0;
let minThreshold = 1;
let selectedSuite = null;
let testSuites = [];
let heatmapInitialized = false;

// =================== VIEW SWITCHING ===================

function switchView(view) {
    currentView = view;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Show/hide views
    document.getElementById('chartArea').style.display = view === 'chart' ? 'flex' : 'none';
    document.getElementById('heatmapArea').style.display = view === 'heatmap' ? 'flex' : 'none';

    // Update sidebar
    if (view === 'chart') {
        populateChartSidebar();
    } else {
        if (!heatmapInitialized) {
            initHeatmap();
        } else {
            populateHeatmapSidebar();
            render();
        }
    }

    // Update URL
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('view', view);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
}

// =================== CHART VIEW ===================

function changeReport(target) {
    currentReport = target;
    genReport(target);
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('report', target);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);

    // Update selected state in sidebar
    document.querySelectorAll('#reports .nav-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.report === target);
    });
}
window.changeReport = changeReport;

async function populateChartSidebar() {
    const navList = document.getElementById('reports');
    navList.innerHTML = '';

    const whitelist = JSON.parse(await (await fetch('./logs/includedlist')).text());

    const summary = whitelist.find(item => item.name === "summary");
    const overallCompliance = summary ? Math.floor(summary.compliance) : 0;
    const overallColors = getComplianceColor(overallCompliance);

    const allItem = document.createElement('div');
    allItem.classList.add('nav-item');
    allItem.dataset.report = 'wpt';
    allItem.style.setProperty('--compliance', overallColors.val.toString());
    allItem.style.setProperty('--color1', overallColors.col1);
    allItem.style.setProperty('--color2', overallColors.col2);
    allItem.innerHTML = `
        <div class="circle tooltip">
            <div class="tooltiptext">${overallCompliance}%</div>
        </div>
        <span>All Tests</span>
    `;
    allItem.addEventListener('click', () => changeReport('wpt'));
    navList.appendChild(allItem);

    whitelist.forEach((item) => {
        if (item.name === "summary") return;

        let compliance = Math.floor(item.compliance);
        let displayedCompliance = compliance;
        const colors = getComplianceColor(compliance);

        const DomItem = document.createElement('div');
        DomItem.classList.add('nav-item');
        DomItem.dataset.report = item.name;
        DomItem.style.setProperty('--compliance', colors.val.toString());
        DomItem.style.setProperty('--color1', colors.col1);
        DomItem.style.setProperty('--color2', colors.col2);
        DomItem.innerHTML = `
            <div class="circle tooltip">
                <div class="tooltiptext">${displayedCompliance}%</div>
            </div>
            <span>${item.name}</span>
        `;
        DomItem.addEventListener('click', () => changeReport(item.name));
        navList.appendChild(DomItem);
    });

    // Update selected state
    document.querySelectorAll('#reports .nav-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.report === currentReport);
    });
}

async function genReport(report) {
    const data = await fetch(`./logs/${report.replaceAll('/', '_')}.json`);
    if (!data.ok) {
        alert("Report not available");
        return;
    }
    const dataPoints = JSON.parse(await data.text());
    const dateMap = dataPoints.reduce((acc, item) => {
        acc[item.date] = item;
        return acc;
    }, {});
    const dateList = Object.values(dateMap);
    initChart(dateList);
}

function initChart(points) {
    const canvas = document.getElementById('myChart');
    const ctx = canvas.getContext('2d');

    if (currentChart) {
        currentChart.destroy();
    }

    const data = {
        labels: points.map(item => item.date),
        datasets: [{
            label: 'Passing WPT',
            data: points.map(item => item.passing),
            backgroundColor: ['rgba(75, 192, 192, 0.2)'],
            borderColor: ['rgba(75, 192, 192, 1)'],
            fill: "start",
            borderWidth: 2,
            pointRadius: 0
        }, {
            label: 'Failing WPT',
            data: points.map(item => item.failing),
            backgroundColor: ['rgba(255, 99, 132, 0.2)'],
            borderColor: ['rgba(255, 99, 132, 1)'],
            fill: "-1",
            borderWidth: 2,
            pointRadius: 0
        }]
    };

    const footer = (tooltipItems) => {
        let sum = 0;
        tooltipItems.forEach(function (tooltipItem) {
            sum += tooltipItem.parsed.y;
        });
        return 'Total: ' + sum + " (" + (tooltipItems[0].parsed.y * 100 / sum).toFixed(2) + "% passed)";
    };

    currentChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: { display: true, text: 'Passing / Failing WPTs' }
                },
                x: {
                    title: { display: true, text: 'Date' }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            plugins: {
                tooltip: { callbacks: { footer: footer } }
            }
        }
    });
}

// =================== HEATMAP VIEW ===================

async function initHeatmap() {
    try {
        const [reportResponse, suitesResponse] = await Promise.all([
            fetch('./logs/interdependence/report.json'),
            fetch('./logs/includedlist')
        ]);

        if (!reportResponse.ok) {
            console.error('Failed to fetch data:', reportResponse.status);
            return;
        }

        fullData = JSON.parse(await reportResponse.text());
        console.log('Loaded data with', fullData.rows?.length, 'rows');

        if (suitesResponse.ok) {
            testSuites = JSON.parse(await suitesResponse.text());
            console.log('Loaded', testSuites.length, 'test suites');
        }

        setupHeatmapCanvas();
        setupHeatmapControls();
        populateHeatmapSidebar();
        applyFilters();
        heatmapInitialized = true;
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

function setupHeatmapCanvas() {
    heatmapCanvas = document.getElementById('heatmap');
    heatmapCtx = heatmapCanvas.getContext('2d');

    heatmapCanvas.addEventListener('mousemove', handleMouseMove);
    heatmapCanvas.addEventListener('click', handleClick);
    heatmapCanvas.addEventListener('wheel', handleWheel, { passive: false });
}

function setupHeatmapControls() {
    const searchInput = document.getElementById('searchInput');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const resetView = document.getElementById('resetView');

    searchInput.addEventListener('input', () => applyFilters());

    zoomIn.addEventListener('click', () => {
        cellSize = Math.min(cellSize + 2, 40);
        render();
    });

    zoomOut.addEventListener('click', () => {
        cellSize = Math.max(cellSize - 2, 4);
        render();
    });

    resetView.addEventListener('click', () => {
        cellSize = 12;
        offsetX = 0;
        offsetY = 0;
        render();
    });
}

function populateHeatmapSidebar() {
    const container = document.getElementById('reports');
    container.innerHTML = '';

    const summary = testSuites.find(s => s.name === 'summary');
    const overallCompliance = summary ? Math.floor(summary.compliance) : 0;
    const overallColors = getComplianceColor(overallCompliance);

    const allItem = document.createElement('div');
    allItem.className = 'nav-item' + (selectedSuite === null ? ' selected' : '');
    allItem.style.setProperty('--compliance', overallColors.val.toString());
    allItem.style.setProperty('--color1', overallColors.col1);
    allItem.style.setProperty('--color2', overallColors.col2);
    allItem.innerHTML = `
        <div class="circle tooltip">
            <div class="tooltiptext">${overallCompliance}%</div>
        </div>
        <span>All Tests</span>
        <span class="count">${fullData?.tests?.length || 0}</span>
    `;
    allItem.addEventListener('click', () => selectSuite(null));
    container.appendChild(allItem);

    for (const suite of testSuites) {
        if (suite.name === 'summary') continue;

        const testCount = countTestsInSuite(suite.name);
        if (testCount === 0) continue;

        const compliance = Math.floor(suite.compliance);
        const colors = getComplianceColor(compliance);

        const item = document.createElement('div');
        item.className = 'nav-item' + (selectedSuite === suite.name ? ' selected' : '');
        item.dataset.suite = suite.name;
        item.innerHTML = `
            <div class="circle tooltip" style="--compliance: ${colors.val}; --color1: ${colors.col1}; --color2: ${colors.col2};">
                <div class="tooltiptext">${compliance}%</div>
            </div>
            <span>${suite.name.split('/').pop()}</span>
            <span class="count">${testCount}</span>
        `;
        item.addEventListener('click', () => selectSuite(suite.name));
        container.appendChild(item);
    }
}

function getTestsForSuite(suiteName) {
    if (!fullData || !fullData.tests) return [];
    const normalizedSuite = '/' + suiteName + '/';
    return fullData.tests.filter(t => t.startsWith(normalizedSuite));
}

function countTestsInSuite(suiteName) {
    return getTestsForSuite(suiteName).length;
}

function getComplianceColor(compliance) {
    if (compliance === 100) {
        return { col1: 'var(--blue)', col2: 'var(--blue)', val: compliance };
    } else if (compliance >= 50) {
        return { col1: 'var(--green)', col2: 'var(--orange)', val: compliance - 50 };
    } else {
        return { col1: 'var(--orange)', col2: 'var(--red)', val: compliance };
    }
}

function selectSuite(suiteName) {
    selectedSuite = suiteName;

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.suite === suiteName || (suiteName === null && !el.dataset.suite));
    });

    document.getElementById('searchInput').value = '';
    applyFilters();
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const searchTerms = searchInput.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (!fullData) return;

    let suiteTestIndices = null;
    if (selectedSuite && fullData.tests) {
        const normalizedSuite = '/' + selectedSuite + '/';
        suiteTestIndices = new Set();
        fullData.tests.forEach((path, idx) => {
            if (path.startsWith(normalizedSuite)) {
                suiteTestIndices.add(idx);
            }
        });
    }

    const includedIndices = [];
    const includedNames = [];

    for (let i = 0; i < fullData.rows.length; i++) {
        const name = fullData.rows[i];

        if (searchTerms.length > 0) {
            const matches = searchTerms.some(term => name.toLowerCase().includes(term));
            if (!matches) continue;
        }

        let hasRelevantData = false;
        for (let j = 0; j < fullData.content[i].length; j++) {
            const cell = fullData.content[i][j];
            let total;

            if (suiteTestIndices && cell.length >= 4) {
                const passingInSuite = (cell[2] || []).filter(idx => suiteTestIndices.has(idx)).length;
                const failingInSuite = (cell[3] || []).filter(idx => suiteTestIndices.has(idx)).length;
                total = passingInSuite + failingInSuite;
            } else {
                total = cell[1];
            }

            if (total >= minThreshold) {
                hasRelevantData = true;
                break;
            }
        }

        if (hasRelevantData || minThreshold === 0) {
            includedIndices.push(i);
            includedNames.push(name);
        }
    }

    const filteredContent = [];
    for (const i of includedIndices) {
        const row = [];
        for (const j of includedIndices) {
            const cell = fullData.content[i][j];

            if (suiteTestIndices && cell.length >= 4) {
                const passingInSuite = (cell[2] || []).filter(idx => suiteTestIndices.has(idx));
                const failingInSuite = (cell[3] || []).filter(idx => suiteTestIndices.has(idx));
                row.push([passingInSuite.length, passingInSuite.length + failingInSuite.length, passingInSuite, failingInSuite]);
            } else {
                row.push(cell);
            }
        }
        filteredContent.push(row);
    }

    filteredData = { rows: includedNames, content: filteredContent };

    updateStats();
    render();
}

function updateStats() {
    const stats = document.getElementById('stats');
    if (filteredData) {
        stats.textContent = `Showing ${filteredData.rows.length} properties (${filteredData.rows.length * filteredData.rows.length} cells)`;
    }
}

function render() {
    if (!filteredData || !heatmapCtx || currentView !== 'heatmap') return;

    const container = document.getElementById('heatmapContainer');
    const N = filteredData.rows.length;
    const labelWidth = 120;
    const labelHeight = 100;

    heatmapCanvas.width = container.clientWidth;
    heatmapCanvas.height = container.clientHeight;

    heatmapCtx.fillStyle = '#f5f5f5';
    heatmapCtx.fillRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);

    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const x = labelWidth + i * cellSize + offsetX;
            const y = labelHeight + j * cellSize + offsetY;

            if (x + cellSize < labelWidth || x > heatmapCanvas.width) continue;
            if (y + cellSize < labelHeight || y > heatmapCanvas.height) continue;

            const [passing, total] = filteredData.content[j][i];
            heatmapCtx.fillStyle = getColor(passing, total);
            heatmapCtx.fillRect(Math.max(x, labelWidth), Math.max(y, labelHeight), cellSize, cellSize);
        }
    }

    heatmapCtx.fillStyle = '#fff';
    heatmapCtx.fillRect(0, 0, labelWidth, heatmapCanvas.height);
    heatmapCtx.fillRect(0, 0, heatmapCanvas.width, labelHeight);

    heatmapCtx.fillStyle = '#333';
    heatmapCtx.font = '10px sans-serif';
    heatmapCtx.textAlign = 'right';
    heatmapCtx.textBaseline = 'middle';

    for (let j = 0; j < N; j++) {
        const y = labelHeight + j * cellSize + cellSize / 2 + offsetY;
        if (y < labelHeight - 5 || y > heatmapCanvas.height) continue;

        const label = filteredData.rows[j];
        const displayLabel = label.length > 15 ? label.slice(0, 14) + '…' : label;
        heatmapCtx.fillText(displayLabel, labelWidth - 5, y);
    }

    heatmapCtx.save();
    heatmapCtx.textAlign = 'left';
    heatmapCtx.textBaseline = 'middle';

    for (let i = 0; i < N; i++) {
        const x = labelWidth + i * cellSize + cellSize / 2 + offsetX;
        if (x < labelWidth || x > heatmapCanvas.width) continue;

        heatmapCtx.save();
        heatmapCtx.translate(x, labelHeight - 5);
        heatmapCtx.rotate(-Math.PI / 3);

        const label = filteredData.rows[i];
        const displayLabel = label.length > 12 ? label.slice(0, 11) + '…' : label;
        heatmapCtx.fillText(displayLabel, 0, 0);
        heatmapCtx.restore();
    }
    heatmapCtx.restore();

    heatmapCtx.strokeStyle = '#ddd';
    heatmapCtx.beginPath();
    heatmapCtx.moveTo(labelWidth, 0);
    heatmapCtx.lineTo(labelWidth, heatmapCanvas.height);
    heatmapCtx.moveTo(0, labelHeight);
    heatmapCtx.lineTo(heatmapCanvas.width, labelHeight);
    heatmapCtx.stroke();
}

function getColor(passing, total) {
    if (total === 0) return '#f5f5f5';

    const ratio = passing / total;

    if (ratio >= 1) {
        return '#4a90d9';
    } else if (ratio >= 0.5) {
        const t = (ratio - 0.5) * 2;
        const r = Math.round(255 * (1 - t) + 76 * t);
        const g = Math.round(165 * (1 - t) + 192 * t);
        const b = Math.round(0 * (1 - t) + 76 * t);
        return `rgb(${r},${g},${b})`;
    } else {
        const t = ratio * 2;
        const r = Math.round(220 * (1 - t) + 255 * t);
        const g = Math.round(53 * (1 - t) + 165 * t);
        const b = Math.round(69 * (1 - t) + 0 * t);
        return `rgb(${r},${g},${b})`;
    }
}

function formatTestName(testPath) {
    const parts = testPath.split('/');
    return parts[parts.length - 1];
}

function handleMouseMove(e) {
    const rect = heatmapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const labelWidth = 120;
    const labelHeight = 100;

    const col = Math.floor((x - labelWidth - offsetX) / cellSize);
    const row = Math.floor((y - labelHeight - offsetY) / cellSize);

    const tooltip = document.getElementById('tooltip');

    if (filteredData && row >= 0 && row < filteredData.rows.length &&
        col >= 0 && col < filteredData.rows.length &&
        x > labelWidth && y > labelHeight) {

        const cellData = filteredData.content[row][col];
        const passing = cellData[0];
        const total = cellData[1];
        const passingIndices = cellData[2] || [];
        const failingIndices = cellData[3] || [];
        const pct = total > 0 ? ((passing / total) * 100).toFixed(1) : 'N/A';

        let testsHtml = '';
        const maxToShow = 5;

        if (failingIndices.length > 0 && fullData.tests) {
            const failingToShow = failingIndices.slice(0, maxToShow);
            testsHtml += '<br><span style="color: var(--red);">Failing:</span><br>';
            testsHtml += failingToShow.map(idx => `  ${formatTestName(fullData.tests[idx])}`).join('<br>');
            if (failingIndices.length > maxToShow) {
                testsHtml += `<br>  <em>...and ${failingIndices.length - maxToShow} more</em>`;
            }
        }

        if (passingIndices.length > 0 && fullData.tests && failingIndices.length <= 2) {
            const passingToShow = passingIndices.slice(0, maxToShow);
            testsHtml += '<br><span style="color: var(--green);">Passing:</span><br>';
            testsHtml += passingToShow.map(idx => `  ${formatTestName(fullData.tests[idx])}`).join('<br>');
            if (passingIndices.length > maxToShow) {
                testsHtml += `<br>  <em>...and ${passingIndices.length - maxToShow} more</em>`;
            }
        }

        tooltip.innerHTML = `
            <strong>${filteredData.rows[row]}</strong> × <strong>${filteredData.rows[col]}</strong><br>
            ${passing} / ${total} (${pct}%)${testsHtml}
        `;
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY - 8) + 'px';
        tooltip.style.display = 'block';

        heatmapCanvas.style.cursor = 'pointer';
    } else {
        tooltip.style.display = 'none';
        heatmapCanvas.style.cursor = 'default';
    }
}

function handleClick(e) {
    const rect = heatmapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const labelWidth = 120;
    const labelHeight = 100;

    const col = Math.floor((x - labelWidth - offsetX) / cellSize);
    const row = Math.floor((y - labelHeight - offsetY) / cellSize);

    if (filteredData && row >= 0 && row < filteredData.rows.length &&
        col >= 0 && col < filteredData.rows.length) {

        const prop1 = filteredData.rows[row];
        const prop2 = filteredData.rows[col];
        const cellData = filteredData.content[row][col];
        const passing = cellData[0];
        const total = cellData[1];
        const passingIndices = cellData[2] || [];
        const failingIndices = cellData[3] || [];

        openDetailPanel(prop1, prop2, passing, total, passingIndices, failingIndices);
    }
}

function openDetailPanel(prop1, prop2, passing, total, passingIndices, failingIndices) {
    const panel = document.getElementById('detailPanel');
    const title = document.getElementById('detailTitle');
    const content = document.getElementById('detailContent');
    const pct = total > 0 ? ((passing / total) * 100).toFixed(1) : 'N/A';

    title.textContent = `${prop1} × ${prop2}`;

    let html = `<div class="detail-summary">${passing} / ${total} passing (${pct}%)</div>`;

    if (failingIndices.length > 0 && fullData.tests) {
        html += '<div class="detail-section"><h4>Failing</h4><ul class="detail-test-list">';
        for (const idx of failingIndices) {
            const testPath = fullData.tests[idx];
            const wptUrl = `https://wpt.fyi/results${testPath}`;
            html += `<li><span class="status-dot fail"></span><a href="${wptUrl}" target="_blank" rel="noopener">${formatTestName(testPath)}</a></li>`;
        }
        html += '</ul></div>';
    }

    if (passingIndices.length > 0 && fullData.tests) {
        html += '<div class="detail-section"><h4>Passing</h4><ul class="detail-test-list">';
        for (const idx of passingIndices) {
            const testPath = fullData.tests[idx];
            const wptUrl = `https://wpt.fyi/results${testPath}`;
            html += `<li><span class="status-dot pass"></span><a href="${wptUrl}" target="_blank" rel="noopener">${formatTestName(testPath)}</a></li>`;
        }
        html += '</ul></div>';
    }

    if (total === 0) {
        html += '<div class="detail-section"><p style="color: #888; font-size: 0.85rem;">No tests for this property pair.</p></div>';
    }

    content.innerHTML = html;
    panel.classList.add('open');
}

function closeDetailPanel() {
    document.getElementById('detailPanel').classList.remove('open');
}

function handleWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey || e.shiftKey) {
        const delta = e.deltaY > 0 ? -2 : 2;
        cellSize = Math.max(4, Math.min(40, cellSize + delta));
    } else {
        offsetX -= e.deltaX || 0;
        offsetY -= e.deltaY || 0;

        if (filteredData) {
            const maxOffsetX = 0;
            const maxOffsetY = 0;
            const minOffsetX = Math.min(0, heatmapCanvas.width - 120 - filteredData.rows.length * cellSize);
            const minOffsetY = Math.min(0, heatmapCanvas.height - 100 - filteredData.rows.length * cellSize);

            offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
            offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));
        }
    }

    render();
}

// =================== INITIALIZATION ===================

async function init() {
    // Burger menu
    const burgerBtn = document.getElementById('burgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }

    burgerBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Detail panel close
    document.getElementById('detailClose').addEventListener('click', closeDetailPanel);

    // Setup tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Check URL for initial view
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view') || 'chart';
    const initialReport = urlParams.get('report') || 'wpt';

    currentReport = initialReport;

    // Initialize chart view first (default)
    await populateChartSidebar();
    changeReport(currentReport);

    // Switch to heatmap if requested
    if (initialView === 'heatmap') {
        switchView('heatmap');
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (currentView === 'heatmap') {
            render();
        }
    });
}

init();
