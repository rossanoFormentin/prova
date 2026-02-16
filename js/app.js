// Sostituisci con i tuoi dati reali dalla dashboard (Settings -> API)
const SUPABASE_URL = 'https://usgwtkzznaewbtzmmhee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZ3d0a3p6bmFld2J0em1taGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODI0NTgsImV4cCI6MjA4NjY1ODQ1OH0.70lSCBlRVivTi6Cz9BbALRb-eYOEIfYXE6YqyZPuTG4'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mini router: carica pagine dinamiche nella app-content
const routes = {
    servizi: 'prova.html',      // pagina servizi
    altro: 'altro.html',        // altra pagina
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
    
        loadPage('servizi'); // carica la home page servizi di default
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

// 5.Caricamento Dinamico pagina html
async function loadSubPageServizi() {
    try {
        const response = await fetch('prova.html');
        const html = await response.text();
        document.getElementById('dynamic-content').innerHTML = html;
    } catch (err) {
        console.error("Errore nel caricamento della pagina:", err);
    }
}

// Avvio: controlla se l'utente è già loggato
checkUser();



// Funzione generica per caricare qualsiasi pagina
async function loadPage(page) {
    const url = routes[page];
    if (!url) {
        document.getElementById('dynamic-content').innerHTML = `<p>Pagina non trovata: ${page}</p>`;
        return;
    }

    try {
        const response = await fetch(url);
        const html = await response.text();
        document.getElementById('dynamic-content').innerHTML = html;
    } catch (err) {
        console.error("Errore nel caricamento della pagina:", err);
        document.getElementById('dynamic-content').innerHTML = `<p>Errore nel caricamento della pagina.</p>`;
    }
}

// Listener pulsanti sidebar
document.querySelectorAll('.app-sidebar button').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        loadPage(page);
    });
});

window.loadSubPageServizi = function() {
  const content = document.getElementById("dynamic-content");

  // Inserisce il contenuto del calendario
  content.innerHTML = `
    <h3>Calendario Presenze</h3>
    <div id="calendar-container">
      <input type="text" id="monthPicker" class="form-control mb-3" placeholder="Seleziona mese">
      <div id="calendar"></div>
    </div>
  `;

  // Carica dinamicamente il file prova.js
  const script = document.createElement("script");
  script.src = "js/prova.js";
  script.onload = () => console.log("prova.js caricato correttamente");
  content.appendChild(script);
};

window.loadSubPageAltro = function() {
  const content = document.getElementById("dynamic-content");
  content.innerHTML = `<h3>Altro</h3><p>Contenuto extra...</p>`;
};

