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

// --- Funzione per mappare eventi filtrati ---
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
    // distruggi calendario esistente se presente
    if (calendar) {
        calendar.destroy();
        document.getElementById("calendar").innerHTML = '';
    }

    calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
        initialView: 'dayGridMonth',    // default griglia mensile
        locale: 'it',
        height: 'auto',
        weekends: false,                // nasconde sabato e domenica
        showNonCurrentDates: false,     // solo giorni del mese corrente
        fixedWeekCount: false,
        headerToolbar: {
            left: 'myPrev,myNext today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        customButtons: {
            myPrev: { text: '← Indietro', click: () => calendar.prev() },
            myNext: { text: 'Avanti →', click: () => calendar.next() }
        },
        events: getFilteredEvents(),
        eventDidMount: info => {
            if(info.event.extendedProps.note || info.event.extendedProps.giustificativo) {
                info.el.setAttribute("title",
                    `Note: ${info.event.extendedProps.note || ""}\n` +
                    `Giustificativo: ${info.event.extendedProps.giustificativo ? "Sì" : "No"}`
                );
            }
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

// --- Colorazioni sfondo per status ---
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

// --- Colori eventi visibili ---
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

// --- Esegui caricamento calendario ---
loadCalendario();