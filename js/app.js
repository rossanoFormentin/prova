// Sostituisci con i tuoi dati reali dalla dashboard (Settings -> API)
const SUPABASE_URL ="https://jreqfjmjfjlolrafmlqv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZXFmam1qZmpsb2xyYWZtbHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4OTkyMDQsImV4cCI6MjA1ODQ3NTIwNH0.VdPNIQPHl9r3Uy3s8OhsWM54DsKkiCOmDx1B5P2KipU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mini router: carica pagine dinamiche nella app-content
const routes = {
    //servizi: 'servizi.html',     
    //altro: 'altro.html', 
    calendario: 'calendario.html'        
};

// Selettori DOM
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userDisplay = document.getElementById('user-display');

// 1. Gestione Accesso (Login)
document.getElementById('btnLogin').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Accesso negato',
            text: 'Credenziali non valide. Riprova.',
            confirmButtonColor: '#3ecf8e', // Il tuo verde Supabase
            background: '#ffffff',
            customClass: {
                popup: 'my-swal-popup'
            }
        });
        btn.innerText = originalText;
        btn.disabled = false;
    }
    else checkUser();
};

// 2. Controllo Sessione (Al caricamento pagina)
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        userDisplay.innerText = user.email;
    
        document.body.classList.remove("auth-layout");
    
    
    } else {
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    
        document.body.classList.add("auth-layout");
    }
}

// 4. Logout
document.getElementById('btnLogout').onclick = async () => {
    await supabaseClient.auth.signOut();
    checkUser();
};

// --- LOGICA DI NAVIGAZIONE ---

async function loadPage(page) {
    const url = routes[page];
    const contentDiv = document.getElementById('dynamic-content');

    if (!url) {
        contentDiv.innerHTML = `<p>Pagina non trovata: ${page}</p>`;
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore nel caricamento");
        const html = await response.text();
        contentDiv.innerHTML = html;

        // Opzionale: Evidenzia il bottone attivo
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // ✅ QUI NASCE IL CALENDARIO
        if (page === "calendario") {
            setTimeout(loadCalendario, 0);
        }

    } catch (err) {
        contentDiv.innerHTML = `<p>Errore nel caricamento della pagina.</p>`;
    }
}

// Delegazione degli eventi per i bottoni della sidebar
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-btn') || e.target.closest('.nav-btn')) {
        const btn = e.target.classList.contains('nav-btn') ? e.target : e.target.closest('.nav-btn');
        const page = btn.dataset.page;
        loadPage(page);
    }
});

let calendar; // globale

function initCalendar(workDays) {

    const events = workDays.map(day => ({
        id: day.id,
        title: day.status,
        start: day.date,
        allDay: true,
        color: getColor(day.status),
        extendedProps: {
            note: day.note,
            giustificativo: day.giustificativo
        }
    }));

    const calendarEl = document.getElementById("calendar");

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "it",
        height: "auto",
        selectable: true,
        events,

        // CLICK SU GIORNO VUOTO
        dateClick(info) {
            openDayModal(info.dateStr);
        },

        // CLICK SU EVENTO ESISTENTE
        eventClick(info) {
            openDayModal(info.event.startStr, info.event);
        }
    });

    calendar.render();
}

async function loadCalendario() {

    const {data,error}=await supabaseClient.from("work_days").select("*");

    if (error) {
        console.error(error);
        return;
    }

    initCalendar(data);
}

function getColor(status) {
    switch (status) {
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
            <label style="margin-top:10px">
                <input type="checkbox" id="giustificativo"> Giustificativo
            </label>
        `,
        showCancelButton: true,
        confirmButtonText: "Salva",
        didOpen: () => {
            if (event) {
                document.getElementById("status").value = event.title;
                document.getElementById("note").value =
                    event.extendedProps.note || "";
                document.getElementById("giustificativo").checked =
                    event.extendedProps.giustificativo || false;
            }
        }
    });

    if (!result.isConfirmed) return;

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
        .upsert({
            date,
            status,
            note,
            giustificativo
        }, {
            onConflict: "date"
        })
        .select()
        .single();

    if (error) {
        console.error(error);
        Swal.fire("Errore salvataggio");
        return;
    }

    updateCalendarEvent(data);
}

function updateCalendarEvent(day) {

    const existing = calendar.getEvents()
        .find(e => e.startStr === day.date);

    if (existing) {
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


// Esegui il controllo sessione all'avvio del browser
checkUser();