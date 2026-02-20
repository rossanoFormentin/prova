let calendar;
let allWorkDays = [];
let activeStatusFilter = null; // legenda/filtro attivo

// -------------------- Carica dati dal DB --------------------
async function loadCalendario() {
    const { data, error } = await supabaseClient
        .from("work_days")
        .select("*")
        .order("date");

    if (error) return console.error(error);

    allWorkDays = data;
    renderCalendar(allWorkDays);
    setupLegendFilter();
    updateNextWorkdayAlert(); // avviso appena caricato
}

// -------------------- Render calendario --------------------
function renderCalendar(workDays) {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    if (calendar) calendar.destroy();
    calendarEl.innerHTML = '';

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'it',
        height: 'auto',
        weekends: false,
        showNonCurrentDates: false,
        fixedWeekCount: false,

        headerToolbar: {
            left: 'myPrev',
            center: 'title',
            right: 'myNext today'
        },
        customButtons: {
            myPrev: { text: '← Mese precedente', click: () => calendar.prev() },
            myNext: { text: 'Mese successivo →', click: () => calendar.next() }
        },

        events: getFilteredEvents(),

        dayCellDidMount: function(info) {
            const numberLink = info.el.querySelector('.fc-daygrid-day-number a');
            if(numberLink){
                const span = document.createElement('span');
                span.textContent = numberLink.textContent;
                numberLink.replaceWith(span);
            }
        },

        eventContent: function(arg) {
            const status = arg.event.title;
            const giustificativo = arg.event.extendedProps.giustificativo;
            const showFlag = giustificativo && ['smart','ferie','supplementare'].includes(status);
            const allowed = ['smart','ferie','supplementare'];

            return {
                html: `
                    <div class="workday-card status-${status}" style="position:relative; cursor:pointer; padding:5px;">
                        <div class="wd-status">${getStatusLabel(status)}</div>
                        ${showFlag ? '<div class="wd-flag">✅ Giustificativo</div>' : ''}
                        ${allowed.includes(status) ? `<label style="position:absolute; top:5px; right:5px; font-size:12px;">
                            <input type="checkbox" class="toggle-giustificativo" data-event-id="${arg.event.id}" ${giustificativo ? 'checked' : ''}> G
                        </label>` : ''}
                    </div>
                `
            };
        },

        eventDidMount: function(info){
            const color = getBGColor(info.event.title);
            info.el.style.backgroundColor = color;
            info.el.style.border = "none";
            info.el.style.color = "#000";
            info.el.style.boxShadow = "none";

            // Aggiungi listener al checkbox solo se presente
            const checkbox = info.el.querySelector('.toggle-giustificativo');
            if(checkbox){
                checkbox.addEventListener('change', async function(){
                    const newValue = this.checked;
                    const eventId = this.dataset.eventId;
                    await toggleEventGiustificativo(eventId, newValue);
                });
            }
        },

        dayCellClassNames: function(arg) {
            const todayStr = new Date().toDateString();
            if(arg.date.toDateString() === todayStr){
                const todayEvent = workDays.find(d => d.date === arg.date.toISOString().slice(0,10));
                if(todayEvent){
                    return ['current-day-border', `current-day-${todayEvent.status}`];
                } else {
                    return ['current-day-border', 'current-day-default'];
                }
            }
            return [];
        }
    });

    calendar.render();
    updateLegendCounts();
}

// -------------------- Status label --------------------
function getStatusLabel(status){
    switch(status){
        case "presenza": return "Presenza";
        case "smart": return "Smart Working";
        case "ferie": return "Ferie";
        case "festivita": return "Festività";
        case "scoperto": return "Scoperto";
        case "supplementare": return "Supplementare";
        default: return status;
    }
}

// -------------------- Eventi filtrati secondo legenda --------------------
function getFilteredEvents() {
    let filtered = allWorkDays;

    if (activeStatusFilter) {
        filtered = filtered.filter(d => d.status === activeStatusFilter);
    }

    const bgEvents = filtered.map(d => ({
        start: d.date,
        display: 'background',
        color: getBGColor(d.status)
    }));

    const events = filtered.map(d => ({
        id: d.id,
        title: d.status,
        start: d.date,
        allDay: true,
        color: getColor(d.status),
        extendedProps: { note: d.note, giustificativo: d.giustificativo || false }
    }));

    return [...bgEvents, ...events];
}

// -------------------- Setup legenda cliccabile --------------------
function setupLegendFilter() {
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const status = item.dataset.status;
            activeStatusFilter = (activeStatusFilter === status) ? null : status;
            calendar.removeAllEvents();
            calendar.addEventSource(getFilteredEvents());
            highlightLegend();
        });
    });

    const resetBtn = document.getElementById('reset-legend');
    if(resetBtn){
        resetBtn.addEventListener('click', () => {
            activeStatusFilter = null;
            calendar.removeAllEvents();
            calendar.addEventSource(getFilteredEvents());
            highlightLegend();
        });
    }
}

function highlightLegend(){
    document.querySelectorAll('.legend-item').forEach(item => {
        item.style.border = (item.dataset.status === activeStatusFilter) ? '2px solid black' : 'none';
    });
}

// -------------------- Colori --------------------
function getBGColor(status) {
    switch(status){
        case "presenza": return "#d1e7dd";
        case "smart": return "#cfe2ff";
        case "ferie": return "#fff3cd";
        case "festivita": return "#e2e3e5";
        case "scoperto": return "#f8d7da";
        case "supplementare": return "#e5dbff";
        default: return "";
    }
}

function getColor(status) {
    switch(status){
        case "presenza": return "#198754";
        case "smart": return "#0d6efd";
        case "ferie": return "#ffc107";
        case "festivita": return "#6c757d";
        case "scoperto": return "#dc3545";
        case "supplementare": return "#6610f2";
        default: return "#adb5bd";
    }
}

// -------------------- Toggle giustificativo evento --------------------
async function toggleEventGiustificativo(eventId, newValue){
    const event = calendar.getEventById(eventId);
    if(!event) return;

    event.setExtendedProp('giustificativo', newValue);

    const el = event.el;
    if(el){
        const showFlag = newValue && ['smart','ferie','supplementare'].includes(event.title);
        el.querySelector('.wd-flag')?.remove();
        if(showFlag){
            const div = document.createElement('div');
            div.className = 'wd-flag';
            div.textContent = '✅ Giustificativo';
            el.querySelector('.workday-card').appendChild(div);
        }
    }

    const idx = allWorkDays.findIndex(d => d.id?.toString() === eventId.toString());
    if(idx >= 0) allWorkDays[idx].giustificativo = newValue;

    updateNextWorkdayAlert();

    await supabaseClient
        .from("work_days")
        .update({ giustificativo: newValue })
        .eq('id', eventId);
}

// -------------------- Prossimo giorno lavorativo --------------------
function getNextWorkday(date) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    while(next.getDay() === 0 || next.getDay() === 6){
        next.setDate(next.getDate() + 1);
    }
    return next;
}

// -------------------- Avviso giorno successivo --------------------
function updateNextWorkdayAlert(){
    const alertEl = document.getElementById('next-workday-alert');
    if(!alertEl) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);
    const todayEvent = allWorkDays.find(d => d.date === todayStr);

    if(!todayEvent || !todayEvent.giustificativo){
        alertEl.textContent = '';
        return;
    }

    const nextWorkday = getNextWorkday(today);
    const nextStr = nextWorkday.toISOString().slice(0,10);
    const nextEvent = allWorkDays.find(d => d.date === nextStr);

    if(nextEvent &&
       ['smart','ferie','supplementare'].includes(nextEvent.status) &&
       !nextEvent.giustificativo) {
        alertEl.textContent = `Attenzione: oggi (${todayStr}) hai il giustificativo e il prossimo giorno lavorativo (${nextStr}) è previsto ${getStatusLabel(nextEvent.status)} senza giustificativo.`;
    } else {
        alertEl.textContent = '';
    }
}

// -------------------- Aggiorna conteggi legenda --------------------
function updateLegendCounts() {
    const counts = {};
    ['presenza','smart','ferie','festivita','scoperto','supplementare'].forEach(status => {
        counts[status] = allWorkDays.filter(d => d.status === status).length;
        const el = document.querySelector(`.legend-item[data-status="${status}"] .count`);
        if(el) el.textContent = counts[status];
    });
}

// -------------------- Avvia calendario --------------------
loadCalendario();

/*
let calendar;
let allWorkDays = [];
let activeStatusFilter = null; // legenda/filtro attivo

// -------------------- Carica dati dal DB --------------------
async function loadCalendario() {
    const { data, error } = await supabaseClient
        .from("work_days")
        .select("*")
        .order("date");

    if (error) return console.error(error);

    allWorkDays = data;
    renderCalendar(allWorkDays);
    setupLegendFilter();
}

// -------------------- Render calendario --------------------
function renderCalendar(workDays) {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    if (calendar) calendar.destroy();
    calendarEl.innerHTML = '';

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'it',
        height: 'auto',
        weekends: false,
        showNonCurrentDates: false,
        fixedWeekCount: false,

        headerToolbar: {
            left: 'myPrev',
            center: 'title',
            right: 'myNext today'
        },
        customButtons: {
            myPrev: { text: '← Mese precedente', click: () => calendar.prev() },
            myNext: { text: 'Mese successivo →', click: () => calendar.next() }
        },

        events: getFilteredEvents(),

        dayCellDidMount: function(info) {
            const numberLink = info.el.querySelector('.fc-daygrid-day-number a');
            if(numberLink){
                const span = document.createElement('span');
                span.textContent = numberLink.textContent;
                numberLink.replaceWith(span);
            }
        },

        eventClick: function(info) {
            if(info.event.display !== 'background') {
                openDayModal(info.event.startStr, info.event);
            }
        },

        eventContent: function(arg) {
            const status = arg.event.title;
            const note = arg.event.extendedProps.note || '';
            const giustificativo = arg.event.extendedProps.giustificativo;
            const showFlag = giustificativo && ['smart','ferie','supplementare'].includes(status);

            return {
                html: `
                    <div class="workday-card status-${status}" style="height:100%; width:100%; cursor:pointer;">
                        <div class="wd-status">${getStatusLabel(status)}</div>
                        ${showFlag ? '<div class="wd-flag">✅ Giustificativo</div>' : ''}
                        ${note ? `<div class="wd-note">${note}</div>` : ''}
                    </div>
                `
            };
        },

        eventDidMount: function(info){
            const color = getBGColor(info.event.title);
            info.el.style.backgroundColor = color;
            info.el.style.border = "none";
            info.el.style.color = "#000";
            info.el.style.boxShadow = "none";

            let text = info.event.extendedProps.note || '';
            if(info.event.extendedProps.giustificativo &&
                ['smart','ferie','supplementare'].includes(info.event.title)) {
                text = '✅ Giustificativo' + (text ? ' - ' + text : '');
            }
            if(text) info.el.setAttribute('title', text);
        },

        dayCellClassNames: function(arg) {
            const todayStr = new Date().toDateString();
            if(arg.date.toDateString() === todayStr){
                const todayEvent = workDays.find(d => d.date === arg.date.toISOString().slice(0,10));
                if(todayEvent){
                    return ['current-day-border', `current-day-${todayEvent.status}`];
                } else {
                    return ['current-day-border', 'current-day-default'];
                }
            }
            return [];
        }
    });

    calendar.render();
    updateLegendCounts();
}

// -------------------- Status label --------------------
function getStatusLabel(status){
    switch(status){
        case "presenza": return "Presenza";
        case "smart": return "Smart Working";
        case "ferie": return "Ferie";
        case "festivita": return "Festività";
        case "scoperto": return "Scoperto";
        case "supplementare": return "Supplementare";
        default: return status;
    }
}

// -------------------- Eventi filtrati secondo legenda --------------------
function getFilteredEvents() {
    let filtered = allWorkDays;

    if (activeStatusFilter) {
        filtered = filtered.filter(d => d.status === activeStatusFilter);
    }

    const bgEvents = filtered.map(d => ({
        start: d.date,
        display: 'background',
        color: getBGColor(d.status)
    }));

    const events = filtered.map(d => ({
        id: d.id,
        title: d.status,
        start: d.date,
        allDay: true,
        color: getColor(d.status),
        extendedProps: { note: d.note, giustificativo: d.giustificativo }
    }));

    return [...bgEvents, ...events];
}

// -------------------- Setup legenda cliccabile --------------------
function setupLegendFilter() {
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const status = item.dataset.status;
            activeStatusFilter = (activeStatusFilter === status) ? null : status;
            calendar.removeAllEvents();
            calendar.addEventSource(getFilteredEvents());
            highlightLegend();
        });
    });

    const resetBtn = document.getElementById('reset-legend');
    if(resetBtn){
        resetBtn.addEventListener('click', () => {
            activeStatusFilter = null;
            calendar.removeAllEvents();
            calendar.addEventSource(getFilteredEvents());
            highlightLegend();
        });
    }
}

function highlightLegend(){
    document.querySelectorAll('.legend-item').forEach(item => {
        item.style.border = (item.dataset.status === activeStatusFilter) ? '2px solid black' : 'none';
    });
}

// -------------------- Colori --------------------
function getBGColor(status) {
    switch(status){
        case "presenza": return "#d1e7dd";
        case "smart": return "#cfe2ff";
        case "ferie": return "#fff3cd";
        case "festivita": return "#e2e3e5";
        case "scoperto": return "#f8d7da";
        case "supplementare": return "#e5dbff";
        default: return "";
    }
}

function getColor(status) {
    switch(status){
        case "presenza": return "#198754";
        case "smart": return "#0d6efd";
        case "ferie": return "#ffc107";
        case "festivita": return "#6c757d";
        case "scoperto": return "#dc3545";
        case "supplementare": return "#6610f2";
        default: return "#adb5bd";
    }
}

// -------------------- Modal e salvataggio --------------------
async function openDayModal(date, event=null){
    const templateHtml =`<form>
    <table class="form-table">
        <tr>
            <td><label for="stato">Stato:</label></td>
            <td>
                <select id="status" class="swal2-input">
                        <option value="presenza">Presenza</option>
                        <option value="smart">Smart Working</option>
                        <option value="ferie">Ferie</option>
                        <option value="festivita">Festività</option>
                        <option value="supplementare">Supplementare</option>
                        <option value="scoperto">Scoperto</option>
                </select>
            </td>
        </tr>
        <tr>
            <td><label for="note">Note:</label></td>
            <td><input type="text" id="note" name="note"></td>
        </tr>
        <tr id="row-giustificativo">
            <td><label for="giustificativo">Giustificativo:</label></td>
            <td><input type="checkbox" id="giustificativo" name="giustificativo"></td>
        </tr>
    </table>
</form>`;

    const result = await Swal.fire({
        title: `Giorno ${date}`,
        html: templateHtml,
        showCancelButton: true,
        confirmButtonText: "Salva",
        didOpen: () => {
            const statusSelect = document.getElementById("status");
            if(event){
                statusSelect.value = event.title;
                document.getElementById("note").value = event.extendedProps.note || '';
                document.getElementById("giustificativo").checked = event.extendedProps.giustificativo || false;
            }
            statusSelect.addEventListener("change", toggleGiustificativo);
            toggleGiustificativo();
        }
    });

    if(!result.isConfirmed) return;

    await saveDay(
        date,
        document.getElementById("status").value,
        document.getElementById("note").value,
        document.getElementById("giustificativo").checked
    );
}

// -------------------- Toggle giustificativo --------------------
function toggleGiustificativo() {
    const status = document.getElementById("status").value;
    const row = document.getElementById("row-giustificativo");
    const allowed = ['smart','ferie','supplementare'];
    row.style.display = allowed.includes(status) ? "table-row" : "none";
    if(!allowed.includes(status)) document.getElementById("giustificativo").checked = false;
}

// -------------------- Salvataggio --------------------
async function saveDay(date, status, note, giustificativo){

    // Limite 10 giorni smart
    if(status === 'smart') {
        let count = countSmartInMonth(new Date(date));
        const existing = allWorkDays.find(d => d.date === date);
        if(existing && existing.status === 'smart') count--;
        if(count >= 10){
            Swal.fire({ icon: 'error', title: 'Limite Smart Raggiunto', text: 'Non puoi avere più di 10 giorni di Smart Working in questo mese.'});
            return;
        }
    }

    // Salvataggio reale
    try {
        const { data, error } = await supabaseClient
            .from("work_days")
            .upsert({ date, status, note, giustificativo }, { onConflict: "date" })
            .select()
            .single();

        if(error) return console.error(error);

        const idx = allWorkDays.findIndex(d => d.date === data.date);
        if(idx >= 0) allWorkDays[idx] = data;
        else allWorkDays.push(data);

        updateCalendarEvent(data);
        updateLegendCounts();
    } catch(err) {
        console.error(err);
    }
}

// -------------------- Aggiorna evento --------------------
function updateCalendarEvent(day) {
    let existing = calendar.getEventById(day.id?.toString());

    if (existing) {
        existing.setProp("title", day.status);
        existing.setProp("color", getColor(day.status));
        existing.setExtendedProp("note", day.note);
        existing.setExtendedProp("giustificativo", day.giustificativo);

        const el = existing.el;
        if(el){
            const showFlag = day.giustificativo && ['smart','ferie','supplementare'].includes(day.status);
            el.innerHTML = `
                <div class="workday-card status-${day.status}">
                    <div class="wd-status">${getStatusLabel(day.status)}</div>
                    ${showFlag ? '<div class="wd-flag">✅ Giustificativo</div>' : ''}
                    ${day.note ? `<div class="wd-note">${day.note}</div>` : ''}
                </div>
            `;
        }
    } else {
        calendar.addEvent({
            id: day.id?.toString(),
            title: day.status,
            start: day.date,
            allDay: true,
            color: getColor(day.status),
            extendedProps: { note: day.note, giustificativo: day.giustificativo }
        });
    }
}

// -------------------- Conteggio smart nel mese --------------------
function countSmartInMonth(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return allWorkDays.filter(d => d.status === 'smart' && new Date(d.date) >= start && new Date(d.date) <= end).length;
}

// -------------------- Aggiorna conteggi legenda --------------------
function updateLegendCounts() {
    const counts = {};
    ['presenza','smart','ferie','festivita','scoperto','supplementare'].forEach(status => {
        counts[status] = allWorkDays.filter(d => d.status === status).length;
        const el = document.querySelector(`.legend-item[data-status="${status}"] .count`);
        if(el) el.textContent = counts[status];
    });
}

// -------------------- Prossimo giorno lavorativo --------------------
function getNextWorkday(date) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    while(next.getDay() === 0 || next.getDay() === 6){
        next.setDate(next.getDate() + 1);
    }
    return next;
}

// -------------------- Avviso giustificativo oggi e giorno lavorativo successivo --------------------
function checkNextWorkdayGiustificativo() {
    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);
    const todayEvent = allWorkDays.find(d => d.date === todayStr);

    if(!todayEvent || !todayEvent.giustificativo) return;

    const nextWorkday = getNextWorkday(today);
    const nextStr = nextWorkday.toISOString().slice(0,10);
    const nextEvent = allWorkDays.find(d => d.date === nextStr);

    if(nextEvent && ['smart','ferie','supplementare'].includes(nextEvent.status)) {
        Swal.fire({
            icon: 'info',
            title: 'Attenzione Giustificativo',
            text: `Oggi (${todayStr}) hai il giustificativo, e il prossimo giorno lavorativo (${nextStr}) è previsto ${getStatusLabel(nextEvent.status)}.`,
            confirmButtonText: 'Ok'
        });
    }
}

// -------------------- Avvia calendario --------------------
loadCalendario().then(() => {
    checkNextWorkdayGiustificativo();
});
*/