const maxDays = 30;
let currentChart

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

    const whitelist = await(await fetch('./wpt-whitelist')).text()

    whitelist.split("\n").forEach((item) => {
        if (item === "") return
        const DomItem = document.createElement('div')
        DomItem.classList.add('nav-item')
        DomItem.innerHTML = `<a class="nav-link" onclick="changeReport('${item}')">${item}</a>`
        navList.appendChild(DomItem)
    })

    if (report){
        return report
    }else {
        return "wpt"
    }
}

const ctx = document.getElementById('myChart').getContext('2d');

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
        labels: points.map(item => item.date), // Extract labels
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