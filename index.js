const maxDays = 30;



// Get the canvas element and its context
const ctx = document.getElementById('myChart').getContext('2d');



async function genReport() {
    const data = await fetch("/logs/wpt.json")
    const dataPoints = JSON.parse(await data.text())
    initChart(dataPoints)
}

function initChart(points) {
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
    const myChart = new Chart(ctx, {
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
            responsive: true,
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

genReport()