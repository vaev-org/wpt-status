const maxDays = 30;
let currentChart

function getLastNElements(array, n) {
    if (!Array.isArray(array)) {
        return "Input is not an array.";
    }

    if (n <= 0) {
        return []; // Return an empty array if n is non-positive.
    }

    if (n >= array.length) {
        return array.slice(); // Return a copy of the entire array if n is greater than or equal to the array length.
    }

    return array.slice(-n);
}


function changeReport(target) {
    genReport(target)
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('report', target)
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`)
}
window.changeReport = changeReport

async function initNav(){
    const urlParams = new URLSearchParams(window.location.search)
    const report = urlParams.get('report')

    const navList = document.getElementById('reports')

    const whitelist = JSON.parse(await(await fetch('./logs/includedlist')).text())

    whitelist.forEach((item) => {
        let compliance= item.compliance;
        let col1
        let col2

        if (compliance === 100){
            col1 = "var(--blue)"
            col2 = "var(--blue)"
        }else if(compliance >= 50){
            col1 = "var(--green)"
            col2 = "var(--orange)"
            compliance = compliance - 50
        }else{
            col1 = "var(--orange)"
            col2 = "var(--red)"
        }

        const DomItem = document.createElement('div')
        DomItem.classList.add('nav-item')
        DomItem.style.setProperty('--compliance', compliance.toString());
        DomItem.style.setProperty('--color1', col1);
        DomItem.style.setProperty('--color2', col2);
        DomItem.innerHTML = `<a class="nav-link inline" onclick="changeReport('${item.name}')"><div class="circle tooltip"><div class="tooltiptext">${item.compliance}%</div></div> ${item.name}</a>`
        navList.appendChild(DomItem)
    })

    if (report){
        return report
    }else {
        return "wpt"
    }
}


const canvas = document.getElementById('myChart');
const ctx = canvas.getContext('2d');

if (window.getComputedStyle(canvas).getPropertyValue('--mobile') === '1') {
    canvas.width = 320
    canvas.height = 260
}

async function genReport(report) {
    const data = await fetch(`./logs/${report.replaceAll('/','_')}.json`)
    if (! data.ok){
        alert("Report not available")
        return
    }
    const dataPoints = JSON.parse(await data.text())
    // mapping the list by date
    const dateMap = dataPoints.reduce((acc, item) => {
        acc[item.date] = item
        return acc
    }, {})
    const dateList = Object.values(dateMap)
    initChart(dateList)


}

function initChart(points) {
    if(currentChart){
        currentChart.destroy()
    }

    const data = {
        labels: getLastNElements(points.map(item => item.date),maxDays), // Extract labels
        datasets: [{
            label: 'Passing WPT',
            data: points.map(item => item.passing),
            backgroundColor: [
                'rgba(75, 192, 192, 0.2)'
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)'
            ],
            fill:"start",
            borderWidth: 2
        },
        {
            label: 'Failing WPT',
            data: points.map(item => item.failing),
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)'
            ],
            fill:"-1",
            borderWidth: 2
        }]
    }

    const footer = (tooltipItems) => {
        let sum = 0;

        tooltipItems.forEach(function(tooltipItem) {
            sum += tooltipItem.parsed.y;
        });
        return 'Total: ' + sum + " (" +  (tooltipItems[0].parsed.y*100/sum).toFixed(2) + "% passed)"
    };

    // Create the chart
    currentChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Passing / Failing WPTs'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
            },
            responsive: false,
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        footer: footer,
                    }
                }
            }
        }
    });

}
const report = await initNav()
genReport(report)


// these are the circles showing how much each report is passing
function loadInfoPoints(points) {
    for (point of points){

    }
    document.documentElement.style
        .setProperty('--pourcent', pourcent);


    if(pourcent <=50){
        document.documentElement.style
            .setProperty('--couleur1', 'orange');

        document.documentElement.style
            .setProperty('--couleur2', 'red');
    }

    else if(50<pourcent && pourcent <= 99.9){
        document.documentElement.style
            .setProperty('--couleur1', '#00FF00');

        document.documentElement.style
            .setProperty('--couleur2', 'orange');

        pourcent = pourcent-50;

        document.documentElement.style
            .setProperty('--pourcent', pourcent);

    }

    else{
        document.documentElement.style
            .setProperty('--couleur1', 'blue');

        document.documentElement.style
            .setProperty('--couleur2', 'blue');
    }
}
