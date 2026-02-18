document.addEventListener("DOMContentLoaded", () => {

    const CalendarToastUi = tui.Calendar;
    const container = document.getElementById('calendarToastUi');

    const calendarToastUi = new CalendarToastUi(container, {
        defaultView: 'week',
        useFormPopup: true,
        useDetailPopup: true,
        gridSelection: true,
        timezone: {
            zones: [{ timezoneName: 'Europe/Rome', displayLabel: 'Roma' }]
        }
    });

    // ---------------- Carica eventi ----------------
    async function fetchAndRenderEvents() {
        const { data, error } = await supabaseClient
            .from('events')
            .select('*');

        if (error) {
            console.error(error);
            return;
        }

        const formatted = data.map(ev => ({
            id: String(ev.id),
            title: ev.title,
            start: ev.start_date,
            end: ev.end_date,
            category: ev.category || 'time'
        }));

        calendarToastUi.createEvents(formatted);
    }

    // ---------------- Salvataggio evento ----------------
    calendarToastUi.on('beforeCreateEvent', async (eventData) => {

        const newEvent = {
            title: eventData.title,
            start_date: eventData.start.toISOString(),
            end_date: eventData.end.toISOString(),
            category: eventData.isAllday ? 'allday' : 'time'
        };

        const { data, error } = await supabaseClient
            .from('events')
            .insert([newEvent])
            .select()
            .single();

        if (!error) {
            calendarToastUi.createEvents([{
                id: String(data.id),
                title: data.title,
                start: data.start_date,
                end: data.end_date,
                category: data.category
            }]);
        }
    });

    // AVVIO
    fetchAndRenderEvents();

});
