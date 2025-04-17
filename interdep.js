
async function initNav(){
    const content = JSON.parse(await(await fetch('./logs/interdependence/report.json')).text())
    const N = content.rows.length
    const ArrayWrapper = document.getElementById('report')
    ArrayWrapper.style.setProperty('--rows', N.toString())

    let html = ""
    for(let i = 0; i<N; i++){
        html += `<div class="name top"><div class="label">${content.rows[i]}</div></div>`
    }

    for(let j = 0; j<N; j++){
        for(let i = -1; i<N; i++){
            if (i === -1) {
                html += `<div class="name left">${content.rows[j]}</div>`
            } else {
                const elt = content.content[j][i]
                html += `<div class="item tooltip" style="${getColor(elt[0],elt[1])}">
<div class="tooltiptext">${content.rows[j]} 
${content.rows[i]}
${elt[0] + "/"  + elt[1]}
</div>
<div class="invisible">${content.rows[j]} ${content.rows[i]}</div>
</div>`
            }
        }
    }
    ArrayWrapper.innerHTML += html

    //TODO better regex
    //TODO filtering
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