// Funzione per leggere i giorni lavorativi
async function fetchWorkDays() {
    const tbody = document.getElementById('table-work-days');
    if (!tbody) return;

    const { data, error } = await supabaseClient
        .from('work_days')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    tbody.innerHTML = data.map(day => `
        <tr>
            <td><strong>${new Date(day.date).toLocaleDateString('it-IT')}</strong></td>
            <td><span class="badge status-${day.status}">${day.status.toUpperCase()}</span></td>
            <td>${day.giustificativo ? '✅ Sì' : '❌ No'}</td>
            <td class="text-muted small">${day.note || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteWorkDay(${day.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Funzione per salvare un nuovo giorno
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'formPresenza') {
        e.preventDefault();
        
        const payload = {
            date: document.getElementById('wd-date').value,
            status: document.getElementById('wd-status').value,
            giustificativo: document.getElementById('wd-giustificativo').checked,
            note: document.getElementById('wd-note').value
        };

        const { error } = await supabaseClient.from('work_days').insert([payload]);

        if (error) {
            Swal.fire('Errore', 'Data già presente o errore database', 'error');
        } else {
            Swal.fire('Salvato!', 'Giorno registrato con successo', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalPresenza')).hide();
            fetchWorkDays(); // Ricarica la tabella
        }
    }
});

// Funzione per eliminare un record
async function deleteWorkDay(id) {
    const { error } = await supabaseClient.from('work_days').delete().eq('id', id);
    if (!error) fetchWorkDays();
}