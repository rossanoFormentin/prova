// inizializzazione calendario: viene chiamata solo dopo che la pagina è caricata
function initCalendar() {
  const calendarEl = document.getElementById("fullcalendar");
  if (!calendarEl) return;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'it',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    dateClick: function(info){
      loadDayDetail(info.dateStr);
    }
  });

  calendar.render();
}

// mostra i dettagli di un giorno selezionato
async function loadDayDetail(dateStr) {
  const detailEl = document.getElementById("day-detail");
  if(!detailEl) return;

  // reset contenuto
  detailEl.innerHTML = "Caricamento...";

  try {
    // recupera dati da Supabase
    const { data, error } = await supabaseClient
      .from("work_days")
      .select("*")
      .eq("date", dateStr)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      detailEl.innerHTML = `
        <p><b>Data:</b> ${dateStr}</p>
        <p><b>Status:</b> ${data.status || 'Non definito'}</p>
        <p><b>Note:</b> ${data.note || '-'}</p>
        <p><b>Giustificativo:</b> ${data.giustificativo ? 'Sì' : 'No'}</p>
      `;
    } else {
      detailEl.innerHTML = `<p>Nessun dato registrato per il giorno selezionato.</p>`;
    }
  } catch(err) {
    console.error(err);
    detailEl.innerHTML = `<p class="text-danger">Errore nel caricamento dei dati.</p>`;
  }
}

// chiamata per inizializzare quando la pagina viene caricata dinamicamente
if (typeof initCalendar === "function") initCalendar();