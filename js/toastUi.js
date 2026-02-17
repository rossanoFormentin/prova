const Calendar = tui.Calendar;
const container = document.getElementById('calendar');

// Inizializzazione Calendario
const calendar = new Calendar(container, {
  defaultView: 'week', // o 'month'
  useFormPopup: true,  // Popup integrato per creare eventi
  useDetailPopup: true,
  gridSelection: true,
  timezone: { zones: [{ timezoneName: 'Europe/Rome', displayLabel: 'Roma' }] },
});

// --- FUNZIONE: Carica Eventi da Supabase ---
async function fetchAndRenderEvents() {
    const { data, error } = await _supabase
        .from('events')
        .select('*');

    if (error) return console.error('Errore caricamento:', error);

    // Mappatura dati per Toast UI
    const formatted = data.map(ev => ({
        id: ev.id,
        title: ev.title,
        start: ev.start_date,
        end: ev.end_date,
        category: ev.category
    }));

    calendar.createEvents(formatted);
}

// --- FUNZIONE: Salva nuovo evento ---
calendar.on('beforeCreateEvent', async (eventData) => {
    const newEvent = {
        title: eventData.title,
        start_date: eventData.start.toISOString(),
        end_date: eventData.end.toISOString(),
        category: eventData.isAllday ? 'allday' : 'time'
    };

    const { data, error } = await _supabase
        .from('events')
        .insert([newEvent])
        .select();

    if (!error) {
        calendar.createEvents([{ ...newEvent, id: data[0].id }]);
    }
});

// Avvio
fetchAndRenderEvents();