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

    // Distrugge il calendario precedente
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

        // Rimuove il link dei numeri
        dayCellDidMount: function(info) {
            const numberLink = info.el.querySelector('.fc-daygrid-day-number a');
            if(numberLink){
                const span = document.createElement('span');
                span.textContent = numberLink.textContent;
                numberLink.replaceWith(span);
            }
        },

        // Solo eventi normali aprono il modale
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

            // Tooltip
            let text = info.event.extendedProps.note || '';
            if(info.event.extendedProps.giustificativo &&
                ['smart','ferie','supplementare'].includes(info.event.title)) {
                text = '✅ Giustificativo' + (text ? ' - ' + text : '');
            }
            if(text) info.el.setAttribute('title', text);
        },

        // Mantieni lo stile per il giorno corrente
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
        },

        // Aggiorna legenda quando cambio mese
        datesSet: function(info) {
            highlightLegend();
        }
    });

    calendar.render();
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

// -------------------- Conteggio eventi per legenda --------------------
function countEventsByStatus() {
    const counts = {};
    const start = calendar.view.currentStart;
    const end = calendar.view.currentEnd;

    const filtered = getFilteredEvents().filter(e =>
        e.display !== 'background' &&
        new Date(e.start) >= start &&
        new Date(e.start) < end
    );

    filtered.forEach(e => {
        const status = e.title;
        counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
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

// -------------------- Aggiorna legenda con numeri --------------------
function highlightLegend(){
    const counts = countEventsByStatus();

    document.querySelectorAll('.legend-item').forEach(item => {
        const status = item.dataset.status;
        const count = counts[status] || 0;

        item.textContent = `${getStatusLabel(status)} (${count})`;
        item.style.border = (status === activeStatusFilter) ? '2px solid black' : 'none';
    });
}

// -------------------- Colori sfondo e eventi --------------------
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
                document.getElementById("note").value =
                    event.extendedProps.note || '';
                document.getElementById("giustificativo").checked =
                    event.extendedProps.giustificativo || false;
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

// -------------------- Mostra/nascondi giustificativo --------------------
function toggleGiustificativo() {
    const status = document.getElementById("status").value;
    const row = document.getElementById("row-giustificativo");
    if (!row) return;

    const allowed = ['smart','ferie','supplementare'];

    if (allowed.includes(status)) {
        row.style.display = "table-row";
    } else {
        row.style.display = "none";
        document.getElementById("giustificativo").checked = false;
    }
}

// -------------------- Salvataggio e aggiornamento evento --------------------
async function saveDay(date, status, note, giustificativo){
    // controllo limite smart
    if(status === 'smart') {
        let count = countSmartInMonth(new Date(date));

        // se sto modificando un giorno già smart, non conto il duplicato
        const existing = allWorkDays.find(d => d.date === date);
        if(existing && existing.status === 'smart') {
            count--; 
        }

        if(count >= 10) {
            Swal.fire({
                icon: 'error',
                title: 'Limite Smart Raggiunto',
                text: 'Non puoi avere più di 10 giorni di Smart Working in questo mese.'
            });
            return; // blocca il salvataggio
        }
    }

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
    } catch(err) {
        console.error(err);
    }
}
/*async function saveDay(date, status, note, giustificativo){
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
    } catch(err) {
        console.error(err);
    }
}*/

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
            extendedProps: {
                note: day.note,
                giustificativo: day.giustificativo
            }
        });
    }

    // Aggiorna legenda dopo salvataggio
    highlightLegend();
}

function countSmartInMonth(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return allWorkDays.filter(d => 
        d.status === 'smart' &&
        new Date(d.date) >= start &&
        new Date(d.date) <= end
    ).length;
}

function checkTomorrowGiustificativo() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0,10);

    const todayStr = today.toISOString().slice(0,10);
    const todayEvent = allWorkDays.find(d => d.date === todayStr);

    if(!todayEvent || !todayEvent.giustificativo) return; // nessun giustificativo oggi, esci

    const tomorrowEvent = allWorkDays.find(d => d.date === tomorrowStr);
    if(tomorrowEvent && ['smart','ferie','supplementare'].includes(tomorrowEvent.status)) {
        Swal.fire({
            icon: 'info',
            title: 'Attenzione Giustificativo',
            text: `Oggi (${todayStr}) hai il giustificativo, e domani (${tomorrowStr}) è previsto ${getStatusLabel(tomorrowEvent.status)}.`,
            confirmButtonText: 'Ok'
        });
    }
}

// -------------------- Avvia calendario --------------------
//loadCalendario();
loadCalendario().then(() => {
    checkTomorrowGiustificativo();
});