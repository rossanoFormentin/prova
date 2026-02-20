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
        },

        // Aggiorna contatori ogni volta che cambiamo mese
        datesSet: function(info){
            updateLegendCounts(info.start, info.end);
        }
    });

    calendar.render();
    // inizializza contatori per il mese corrente
    const view = calendar.view;
    updateLegendCounts(view.activeStart, view.activeEnd);
}

// -------------------- Aggiorna conteggi legenda per mese --------------------
function updateLegendCounts(startDate, endDate) {
    const counts = {};
    ['presenza','smart','ferie','festivita','scoperto','supplementare'].forEach(status => {
        counts[status] = allWorkDays.filter(d => {
            const day = new Date(d.date);
            return d.status === status && day >= startDate && day < endDate;
        }).length;

        const el = document.querySelector(`.legend-item[data-status="${status}"] .count`);
        if(el) el.textContent = counts[status];
    });
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

// -------------------- Eventi filtrati --------------------
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