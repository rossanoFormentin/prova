let calendar;
let allWorkDays = [];
let activeStatusFilter = null; // legenda/filtro attivo

// --- Carica i dati dal DB ---
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

// --- Render calendario ---
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
            myPrev: { text: '← Mese precedente', click: () => calendar.prev(), classNames: ['fc-myPrev-button']},
            myNext: { text: 'Mese successivo →', click: () => calendar.next(), classNames: ['fc-myNext-button']  }
        },
        events: getFilteredEvents(),
        dateClick: info => openDayModal(info.dateStr),
        eventClick: info => openDayModal(info.event.startStr, info.event),

        eventContent: function(arg){

            const status = arg.event.title;
            const note = arg.event.extendedProps.note || '';
            const giustificativo = arg.event.extendedProps.giustificativo;

            const showFlag =
                giustificativo &&
                ['smart','ferie','supplementare'].includes(status);

            return {
                html: `
                    <div class="workday-card status-${status}">
                        <div class="wd-status">${getStatusLabel(status)}</div>
                        ${showFlag ? '<div class="wd-flag">✅ Giustificativo</div>' : ''}
                        ${note ? `<div class="wd-note">${note}</div>` : ''}
                    </div>
                `
            };
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
        },


        eventDidMount: function(info){

            const color = getBGColor(info.event.title);

            info.el.style.backgroundColor = color;
            info.el.style.border = "none";
            info.el.style.color = "#000";
            info.el.style.boxShadow = "none";

            // tooltip
            let text = info.event.extendedProps.note || '';

            if(info.event.extendedProps.giustificativo &&
            ['smart','ferie','supplementare'].includes(info.event.title)){
                text = '✅ Giustificativo' + (text ? ' - ' + text : '');
            }

            if(text) info.el.setAttribute('title', text);
        }



    });

    calendar.render();
}

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

// --- Eventi filtrati secondo legenda ---
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

// --- Setup legenda cliccabile come filtro ---
function setupLegendFilter() {
    // Filtra cliccando sulla legenda
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const status = item.dataset.status;
            if(activeStatusFilter === status){
                activeStatusFilter = null; // reset filtro
            } else {
                activeStatusFilter = status;
            }
            calendar.removeAllEvents();
            calendar.addEventSource(getFilteredEvents());
            highlightLegend();
        });
    });

    // Bottone “Mostra tutti”
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

// Evidenzia legenda selezionata
function highlightLegend(){
    document.querySelectorAll('.legend-item').forEach(item => {
        if(item.dataset.status === activeStatusFilter){
            item.style.border = '2px solid black';
        } else {
            item.style.border = 'none';
        }
    });
}

// --- Colori sfondo ---
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



// --- Colori eventi ---
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

// --- Modal per modificare giorno ---
async function openDayModal(date, event=null){
    const result = await Swal.fire({
        title: `Giorno ${date}`,
        html: `
            <select id="status" class="swal2-input">
                <option value="presenza">Presenza</option>
                <option value="smart">Smart Working</option>
                <option value="ferie">Ferie</option>
                <option value="festivita">Festività</option>
                <option value="supplementare">Supplementare</option>
                <option value="scoperto">Scoperto</option>
            </select>
            <input id="note" class="swal2-input" placeholder="Note">
            <label style="margin-top:5px">
                <input type="checkbox" id="giustificativo"> Giustificativo
            </label>
        `,
        showCancelButton: true,
        confirmButtonText: "Salva",
        didOpen: () => {
            if(event){
                document.getElementById("status").value = event.title;
                document.getElementById("note").value = event.extendedProps.note || '';
                document.getElementById("giustificativo").checked = event.extendedProps.giustificativo || false;
            }
        }
    });

    if(!result.isConfirmed) return;

    saveDay(
        date,
        document.getElementById("status").value,
        document.getElementById("note").value,
        document.getElementById("giustificativo").checked
    );
}

// --- Salva giorno nel DB ---
async function saveDay(date, status, note, giustificativo){
    const { data, error } = await supabaseClient
        .from("work_days")
        .upsert({ date, status, note, giustificativo }, { onConflict: "date" })
        .select()
        .single();

    if(error) return console.error(error);

    updateCalendarEvent(data);
}

// --- Aggiorna calendario ---
// --- Aggiorna evento nel calendario senza duplicati ---
function updateCalendarEvent(day) {
    // Trova evento esistente
    const existing = calendar.getEvents().find(e => e.startStr === day.date);

    if (existing) {
        // Rimuove l’evento esistente per far rieseguire eventContent
        existing.remove();
    }

    // Aggiunge evento aggiornato con stesso ID
    calendar.addEvent({
        id: day.id,  // mantiene lo stesso ID per evitare duplicati
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




// --- Avvia calendario ---
loadCalendario();