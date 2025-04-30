async function initNav(){
    const content = JSON.parse(await(await fetch('./logs/interdependence/report.json')).text())
    const N = content.rows.length
    const urlParams = new URLSearchParams(window.location.search)
    const propList = JSON.parse(urlParams.get('props'))

    console.log("prop list", propList)


    if (propList === null || propList === undefined){
        drawReport(content.rows, content.content)
    }else{
        const filtered = filterReport(propList, content)
        drawReport(filtered.rows, filtered.content)
    }


    //TODO better regex
}

function filterReport(props, report){
    let filtered = {"rows": [], "content": []}

    // retreiving the position of the props in the report
    let indexes = []
    for ( let i = 0; i < props.length; i++){
        indexes.push({"name": props[i], "index": i})
    }
    for (let i = 0; i < report.rows.length; i++){
        for (let j = 0; j < props.length; j++){
            if (props[j] === report.rows[i]){
                indexes[j].index = i // sry for this
            }
        }
    }

    // retrieving relevant rows
    let included = []
    for (let i = 0; i < report.content.length; i++){
        for (let j = 0; j < indexes.length; j++){
            if( report.content[i][indexes[j].index][1] !== 0 ){
                included.push({"name": report.rows[i], "index": i})
            }
        }
    }

    // extracting the meaningful content
    for (let i = 0; i < included.length; i++){
        let line = []
        for (let j = 0; j < included.length; j++){
            line.push(report.content[included[i].index][included[j].index])
        }
        filtered.rows.push(included[i].name)
        filtered.content.push(line)
    }

    return filtered
}

function drawReport(rows, content){
    const ArrayWrapper = document.getElementById('report')
    const N = rows.length

    ArrayWrapper.style.setProperty('--rows', N.toString())

    let html = ""
    for(let i = 0; i<N; i++){
        html += `<div class="name top"><div class="label">${rows[i]}</div></div>`
    }

    for(let j = 0; j<N; j++){
        for(let i = -1; i<N; i++){
            if (i === -1) {
                html += `<div class="name left">${rows[j]}</div>`
            } else {
                const elt = content[j][i]
                html += `<div class="item tooltip" style="${getColor(elt[0],elt[1])}">
<div class="tooltiptext">${rows[j]} 
${rows[i]}
${elt[0] + "/"  + elt[1]}
</div>
<div class="invisible">${rows[j]} ${rows[i]}</div>
</div>`
            }
        }
    }
    ArrayWrapper.innerHTML += html


}

function getColor(passing,total) {
    if(total === 0){
        return
    }

    let pourcent = Math.floor(passing/total*100);
    let col1;
    let col2;

    if(pourcent <=50){
        col1 = 'var(--orange)';

        col2 = 'var(--red)';
    }

    else if(50<pourcent && pourcent <= 99.9){
        col1 = '#00FF00';
        col2 = 'var(--orange)';

        pourcent = pourcent-50;
    }

    else{
        col1 = 'var(--blue)';
        col2 = 'var(--blue)';

    }

    return `--compliance: ${pourcent}; --color1: ${col1}; --color2: ${col2};`

}

initNav()