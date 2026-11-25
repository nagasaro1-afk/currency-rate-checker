let rates = {};
const $ = id => document.getElementById(id);

async function load() {
    try{
        const d = await (await fetch('https://open.er-api.com/v6/latest/' + ($('base').value || 'USD'))).json();
        if ( d.result != 'success') throw d['error-type'];
        rates = d.rates;
        if (!$('base').value) $('base').innerHTML = Object.keys(rates).map(c => `<option>${c}`).join('');
        $('base').value = d.base_code;
        $('msg').textContent = 'Updated: ' + d.time_last_update_utc;
        Show();
    } catch (e) {
        $('msg').textContent = ' Could not load rates: ' + e;  
    }
}

function show() {
    const rows = Object.entries(rates)
    .filter(([c]) => c.includes($('q').value.toUpperCase()))
    .sort((a, b) => (b[1] - a[1]) * $('sort').value)
    .map(([c, r]) => `<tr><td>${c}<td>${r}<td>${(r * $('amt').value).toFixed(2)}`)
    .join('');
$('t').innerHTML = '<tr><th>Currency<th>Rate<th>Value' + rows;
}

$('amt').oninput = $('q').oninput = $('sort').onchange = show;
$('base').onchange = load;
load();