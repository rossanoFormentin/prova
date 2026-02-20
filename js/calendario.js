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

        // Rimuove il link dei numeri ma NON aggiunge click sulla cella
        dayCellDidMount: function(info) {
            const numberLink = info.el.querySelector('.fc-daygrid-day-number a');
            if(numberLink){
                const span = document.createElement('span');
                span.textContent = numberLink.textContent;
                numberLink.replaceWith(span);
            }
        },

        // Solo eventi normali (non background) aprono il modale
        eventClick: function(info) {
            if(info.event.display !== 'background') {
                openDayModal(info.event.startStr, info.event);
            }
        },

        // Rimuovi dateClick per evitare modale sulle celle vuote
        // dateClick: function(info){},

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

    const templateHtml = `
            <div class="form-row">
                <div class="form-label">Stato:</div>
                <div class="form-input">
                    <select id="status" class="swal2-input">
                        <option value="presenza">Presenza</option>
                        <option value="smart">Smart Working</option>
                        <option value="ferie">Ferie</option>
                        <option value="festivita">Festività</option>
                        <option value="supplementare">Supplementare</option>
                        <option value="scoperto">Scoperto</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-label">Note:</div>
                <div class="form-input">
                    <input id="note" class="swal2-input" placeholder="Note">
                </div>
            </div>
            <div class="form-row">
                <div class="form-label">Giustificativo:</div>
                <div class="form-input">
                    <input type="checkbox" id="giustificativo">
                </div>
            </div>
        `;

    const templateHtml2 =`<form>
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
        html: templateHtml2,
        showCancelButton: true,
        confirmButtonText: "Salva",
        
        /*didOpen: () => {
            if(event){
                document.getElementById("status").value = event.title;
                document.getElementById("note").value = event.extendedProps.note || '';
                document.getElementById("giustificativo").checked = event.extendedProps.giustificativo || false;
            }
        }*/

        didOpen: () => {

            const statusSelect = document.getElementById("status");

            if(event){
                statusSelect.value = event.title;
                document.getElementById("note").value =
                    event.extendedProps.note || '';
                document.getElementById("giustificativo").checked =
                    event.extendedProps.giustificativo || false;
            }

            // listener cambio stato
            statusSelect.addEventListener("change", toggleGiustificativo);

            // controllo iniziale
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

function toggleGiustificativo() {
    const status = document.getElementById("status").value;
    const row = document.getElementById("row-giustificativo");

    if (!row) return;

    if (status === "presenza") {
        row.style.display = "none";

        // opzionale: deseleziona automaticamente
        document.getElementById("giustificativo").checked = false;
    } else {
        row.style.display = "table-row";
    }
}


// -------------------- Salvataggio e aggiornamento evento --------------------
async function saveDay(date, status, note, giustificativo){
    try {
        const { data, error } = await supabaseClient
            .from("work_days")
            .upsert({ date, status, note, giustificativo }, { onConflict: "date" })
            .select()
            .single();

        if(error) return console.error(error);

        // Aggiorna array locale
        const idx = allWorkDays.findIndex(d => d.date === data.date);
        if(idx >= 0) allWorkDays[idx] = data;
        else allWorkDays.push(data);

        // Aggiorna evento in FullCalendar
        updateCalendarEvent(data);

    } catch(err) {
        console.error(err);
    }
}



function updateCalendarEvent(day) {
    // Cerca evento per ID (meglio usare id del DB)
    let existing = calendar.getEventById(day.id?.toString());

    if (existing) {
        existing.setProp("title", day.status);
        existing.setProp("color", getColor(day.status));
        existing.setExtendedProp("note", day.note);
        existing.setExtendedProp("giustificativo", day.giustificativo);

        // Aggiorna HTML
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
        // Evento nuovo
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
}




// -------------------- Avvia calendario --------------------
loadCalendario();