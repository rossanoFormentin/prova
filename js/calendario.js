// --- Inizializza Supabase ---
const SUPABASE_URL = 'https://usgwtkzznaewbtzmmhee.supabase.co';
const SUPABASE_KEY = 'INSERISCI_LA_TUA_API_KEY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let calendar;
let allWorkDays = [];

// --- Carica i dati dal DB ---
async function loadCalendario() {
    const { data, error } = await supabaseClient
        .from("work_days")
        .select("*")
        .order("date");

    if (error) return console.error(error);

    allWorkDays = data;
    renderCalendar(allWorkDays);
    setupFilters();
}

// --- Eventi filtrati in base ai checkbox ---
function getFilteredEvents() {
    const checkedStatuses = Array.from(document.querySelectorAll('#calendar-filters input:checked'))
        .map(cb => cb.value);

    const bgEvents = allWorkDays
        .filter(d => checkedStatuses.includes(d.status))
        .map(d => ({
            start: d.date,
            display: 'background',
            color: getBGColor(d.status)
        }));

    const events = allWorkDays
        .filter(d => checkedStatuses.includes(d.status))
        .map(d => ({
            id: d.id,
            title: d.status,
            start: d.date,
            allDay: true,
            color: getColor(d.status),
            extendedProps: { note: d.note, giustificativo: d.giustificativo }
        }));

    return [...bgEvents, ...events];
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
            left: 'title',
            right: 'myPrev,myNext today'
        },
        customButtons: {
            myPrev: { text: '← Mese precedente', click: () => calendar.prev() },
            myNext: { text: 'Mese successivo →', click: () => calendar.next() }
        },
        events: getFilteredEvents(),
        dateClick: info => openDayModal(info.dateStr),
        eventClick: info => openDayModal(info.event.startStr, info.event),
        eventDidMount: info => {
            let text = info.event.extendedProps.note || '';
            if (info.event.extendedProps.giustificativo) text = '✅ ' + text;
            if (text) info.el.setAttribute('title', text);
        }
    });

    calendar.render();
}

// --- Setup filtri dinamici ---
function setupFilters() {
    document.querySelectorAll('#calendar-filters input').forEach(cb => {
        cb.addEventListener('change', () => {
            calendar.removeAllEvents();
            calendar.addEventSource(getFilteredEvents());
        });
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

// --- Modal per aprire/modificare un giorno ---
async function openDayModal(date, event = null) {
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
async function saveDay(date, status, note, giustificativo) {
    const { data, error } = await supabaseClient
        .from("work_days")
        .upsert({ date, status, note, giustificativo }, { onConflict: "date" })
        .select()
        .single();

    if(error) return console.error(error);

    updateCalendarEvent(data);
}

// --- Aggiorna il calendario dopo salvataggio ---
function updateCalendarEvent(day){
    const existing = calendar.getEvents().find(e => e.startStr === day.date);
    if(existing){
        existing.setProp("title", day.status);
        existing.setProp("color", getColor(day.status));
        existing.setExtendedProp("note", day.note);
        existing.setExtendedProp("giustificativo", day.giustificativo);
    } else {
        calendar.addEvent({
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

// --- Avvia calendario ---
loadCalendario();