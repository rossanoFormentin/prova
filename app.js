// Sostituisci con i tuoi dati reali dalla dashboard (Settings -> API)
const SUPABASE_URL = 'https://tuo-progetto.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodW50bWtvbWRlaGx6aHd3bmJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNzQ4MjMsImV4cCI6MjA4NjY1MDgyM30.n0rOzElAyamuEhGdrhsvwgdYVo2BBYOFU21y9caZomE'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

    if (error) alert("Errore: " + error.message);
    else checkUser();
};

// 2. Controllo Sessione (Al caricamento pagina)
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        userDisplay.innerText = user.email;
    } else {
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
}

// 3. Recupero Dati Protetto (Dimostrazione RLS)
document.getElementById('btnFetch').onclick = async () => {
    const { data, error } = await supabase
        .from('profili')
        .select('*'); // Non serve filtrare per ID! Il DB lo fa per te grazie alle RLS.

    if (error) {
        console.error(error);
    } else {
        document.getElementById('db-content').innerHTML = 
            `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
};

// 4. Logout
document.getElementById('btnLogout').onclick = async () => {
    await supabase.auth.signOut();
    checkUser();
};

// Avvio: controlla se l'utente è già loggato
checkUser();