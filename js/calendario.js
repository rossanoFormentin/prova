

    let calendar;

    async function loadCalendario() {
        const { data, error } = await supabaseClient
            .from("work_days")
            .select("*")
            .order("date");

        if (error) return console.error(error);

        initCalendar(data);
    }

    function initCalendar(workDays) {
        const calendarEl = document.getElementById("calendar");
        if (!calendarEl) return;

        if (calendar) calendar.destroy();

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'listMonth',
            locale: 'it',
            height: 'auto',
            showNonCurrentDates: false,
            headerToolbar: {
                right: 'myPrev,myNext today',
                left: 'title'
            },
            customButtons: {
                myPrev: { text: '← Mese precedente', click: () => calendar.prev() },
                myNext: { text: 'Mese successivo →', click: () => calendar.next() }
            },
            events: workDays.map(d => ({
                id: d.id,
                title: d.status,
                start: d.date,
                allDay: true,
                color: getColor(d.status),
                extendedProps: {
                    note: d.note,
                    giustificativo: d.giustificativo
                }
            })),
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

    function getColor(status) {
        switch(status) {
            case "smart": return "#0d6efd";
            case "presenza": return "#198754";
            case "ferie": return "#ffc107";
            case "festivita": return "#6c757d";
            case "scoperto": return "#dc3545";
            case "supplementare": return "#6610f2";
            default: return "#adb5bd";
        }
    }

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
                <label><input type="checkbox" id="giustificativo"> Giustificativo</label>
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

    async function saveDay(date, status, note, giustificativo) {
        const { data, error } = await supabaseClient
            .from("work_days")
            .upsert({ date, status, note, giustificativo }, { onConflict: "date" })
            .select()
            .single();

        if(error) return console.error(error);

        updateCalendarEvent(data);
    }

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

    loadCalendario();
