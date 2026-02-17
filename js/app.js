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
        // Carica script calendario dinamicamente
        const script = document.createElement('script');
        script.src = "js/calendario.js";
        document.body.appendChild(script);

        // Inizializza il calendario dopo che lo script è caricato
        script.onload = () => {
            loadCalendario();
        }
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


// Esegui il controllo sessione all'avvio del browser
checkUser();