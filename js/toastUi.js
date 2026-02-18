let calendarToastUi = null;

function loadCalendariotoastUi() {

    const container = document.getElementById('calendarToastUi');
    if (!container) {
        console.warn("Container ToastUI non trovato");
        return;
    }

    const CalendarToastUi = tui.Calendar;

    // evita doppia inizializzazione
    if (calendarToastUi) {
        calendarToastUi.destroy();
    }

    calendarToastUi = new CalendarToastUi(container, {
        defaultView: 'week',
        useFormPopup: true,
        useDetailPopup: true,
        gridSelection: true,
        timezone: {
            zones: [{ timezoneName: 'Europe/Rome', displayLabel: 'Roma' }]
        }
    });

    fetchAndRenderEvents();
}

// ---------------- EVENTI ----------------
async function fetchAndRenderEvents() {

    const { data, error } = await supabaseClient
        .from('events')
        .select('*');

    if (error) return console.error(error);

    calendarToastUi.clear();

    calendarToastUi.createEvents(
        data.map(ev => ({
            id: String(ev.id),
            title: ev.title,
            start: ev.start_date,
            end: ev.end_date,
            category: ev.category || 'time'
        }))
    );
}
