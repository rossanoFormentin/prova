// Supabase client
const SUPABASE_URL ="https://jreqfjmjfjlolrafmlqv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZXFmam1qZmpsb2xyYWZtbHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4OTkyMDQsImV4cCI6MjA1ODQ3NTIwNH0.VdPNIQPHl9r3Uy3s8OhsWM54DsKkiCOmDx1B5P2KipU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ROUTES
const routes = {
    calendario: 'pages/calendario.html'
};

// ELEMENTI DOM
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userDisplay = document.getElementById('user-display');

// LOGIN
document.getElementById('btnLogin').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        Swal.fire({ icon: 'error', title: 'Accesso negato', text: 'Credenziali non valide' });
    } else {
        checkUser();
    }
};

// CHECK SESSIONE
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

// LOGOUT
document.getElementById('btnLogout').onclick = async () => {
    await supabaseClient.auth.signOut();
    checkUser();
};

// NAVIGAZIONE SPA
async function loadPage(page) {
    const url = routes[page];
    const contentDiv = document.getElementById('dynamic-content');

    if (!url) {
        contentDiv.innerHTML = `<p>Pagina non trovata: ${page}</p>`;
        return;
    }

    const response = await fetch(url);
    contentDiv.innerHTML = await response.text();

    // evidenzia bottone attivo
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    // Se pagina calendario, carica script
    if (page === "calendario") {
        if (!document.getElementById('calendario-script')) {
            const script = document.createElement('script');
            script.id = 'calendario-script';
            script.src = "js/calendario.js";
            document.body.appendChild(script);
        } else if (typeof loadCalendario === "function") {
            loadCalendario();
        }
    }

     // Se pagina toastUi, carica script
    if (page === "toastUi") {
        if (!document.getElementById('toastUi-script')) {
            const script = document.createElement('script');
            script.id = 'toastUi-script';
            script.src = "js/toastUi.js";
            document.body.appendChild(script);
        } else if (typeof loadCalendariotoastUi === "function") {
            loadCalendariotoastUi();
        }
    }
}

// Delegazione eventi sidebar
document.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn) loadPage(btn.dataset.page);
});

// Controllo sessione all'avvio
checkUser();