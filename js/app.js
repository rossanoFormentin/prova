// -------------------- CONFIG SUPABASE --------------------
const SUPABASE_URL = "https://jreqfjmjfjlolrafmlqv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZXFmam1qZmpsb2xyYWZtbHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4OTkyMDQsImV4cCI6MjA1ODQ3NTIwNH0.VdPNIQPHl9r3Uy3s8OhsWM54DsKkiCOmDx1B5P2KipU";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// -------------------- ROUTES SPA --------------------
const routes = {
    calendario: 'pages/calendario.html'
};

// -------------------- LOGOUT AUTOMATICO --------------------
const LOGOUT_TIMEOUT = 1 * 60 * 1000; // 1 minuti in ms
let logoutTimer = null;

// -------------------- ELEMENTI DOM --------------------
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userDisplay = document.getElementById('user-display');

// -------------------- LOGIN --------------------
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

// -------------------- LOGOUT MANUALE --------------------
document.getElementById('btnLogout').onclick = async () => {
    await supabaseClient.auth.signOut();
    showLogin();
};

// -------------------- CHECK SESSIONE --------------------
async function checkUser() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (session && session.user) {
        showApp(session.user);
    } else {
        showLogin();
    }
}

// -------------------- MOSTRA LOGIN --------------------
function showLogin() {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    document.body.classList.add("auth-layout");

    if(logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
    }
}

// -------------------- MOSTRA APP --------------------
function showApp(user) {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    document.body.classList.remove("auth-layout");
    userDisplay.innerText = user.email;

    startLogoutTimer();
}

// -------------------- LOGOUT AUTOMATICO --------------------
function startLogoutTimer() {
    if(logoutTimer) clearTimeout(logoutTimer);

    logoutTimer = setTimeout(async () => {
        await supabaseClient.auth.signOut();
        showLogin();
        Swal.fire({ icon: 'info', title: 'Sessione scaduta', text: 'Devi accedere di nuovo.' });
    }, LOGOUT_TIMEOUT);
}

// -------------------- RESET TIMER SU INTERAZIONE --------------------
['click','keydown','mousemove','scroll'].forEach(ev => {
    document.addEventListener(ev, () => {
        if(appSection && !appSection.classList.contains('hidden')){
            startLogoutTimer();
        }
    });
});

// -------------------- NAVIGAZIONE SPA --------------------
async function loadPage(page) {
    const url = routes[page];
    const contentDiv = document.getElementById('dynamic-content');

    if (!url) {
        contentDiv.innerHTML = `<p>Pagina non trovata: ${page}</p>`;
        return;
    }

    const response = await fetch(url);
    contentDiv.innerHTML = await response.text();

    // Evidenzia bottone attivo
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    // Carica script della pagina calendario
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
}

// -------------------- DELEGA EVENTI SIDEBAR --------------------
document.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn) loadPage(btn.dataset.page);
});

// -------------------- AVVIO --------------------
checkUser();
