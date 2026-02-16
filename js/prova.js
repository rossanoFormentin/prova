<script type="module">
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL ="https://jreqfjmjfjlolrafmlqv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZXFmam1qZmpsb2xyYWZtbHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4OTkyMDQsImV4cCI6MjA1ODQ3NTIwNH0.VdPNIQPHl9r3Uy3s8OhsWM54DsKkiCOmDx1B5P2KipU";
 
// controllaConsuntivazione();
 
 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const today = new Date();

// Imposta il selettore al mese corrente
document.getElementById("monthPicker").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;


let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1); 


const months = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const calendarDiv = document.getElementById("calendar");
const initialValues = {};

// Formattazione date
function formatDateLocal(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function formatDateDDMMYYYY(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Generazione calendario
generateCalendar();
async function generateCalendar(){
  let start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  let end = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0);

  const allDays = [];
  let current = new Date(start);
  while(current <= end){
    if(current.getDay()!==0 && current.getDay()!==6) allDays.push(new Date(current));
    current.setDate(current.getDate()+1);
  }

  const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
  let html = `<div class="month open" id="month-${key}">`;
  html += `<div class="month-header">
              <h2>${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}</h2>
              <div class="badges-container">
                <span class="badge smart" title="Smart Working">0</span>
                <span class="badge supplementare" title="Smart Working Supplementare">0</span>
                <span class="badge presenza" title="Presenza">0</span>
                <span class="badge ferie" title="Ferie">0</span>
                <span class="badge festivita" title="Festività">0</span>
                <span class="badge scoperto" title="Scoperto">0</span>
              </div>
           </div><div class="month-content">`;

  allDays.forEach(day=>{
    const dayStr = formatDateLocal(day);
    const weekday = day.toLocaleDateString("it-IT",{weekday:"short"});
    const isToday = dayStr === formatDateLocal(today);
    const isPast = day < today && !isToday;

    html+=`
      <div class="day-row ${isToday ? "today" : ""} ${isPast ? "disabled" : ""}" id="row-${dayStr}">
        <div class="giorno">${weekday} ${formatDateDDMMYYYY(day)}</div>
        <select id="status-${dayStr}" onchange="onChangeDay('${dayStr}')" ${isPast ? "disabled" : ""}>
          <option value="">--</option>
          <option value="smart">Smart Working</option>
          <option value="presenza">Presenza</option>
          <option value="supplementare">Smart Working Supplementare</option>
          <option value="ferie">Ferie</option>
          <option value="festivita">Festività</option>
          <option value="scoperto">Scoperto</option>
        </select>
        <input type="text" id="note-${dayStr}" placeholder="Note..." oninput="onChangeDay('${dayStr}')" ${isPast ? "disabled" : ""} />
        <label id="label-giust-${dayStr}" style="display:inline-flex; align-items:center; margin-left:4px;">
          <input type="checkbox" id="giust-${dayStr}" onchange="onChangeDay('${dayStr}')" ${isPast ? "disabled" : ""}>&nbsp;Giustificativo
        </label>
        <button class="save-btn" onclick="saveDay('${dayStr}')" ${isPast ? "disabled" : ""}>💾</button>
        <button class="delete-btn" onclick="deleteDay('${dayStr}')" ${isPast ? "disabled" : ""}>❌</button>
      </div>`;
  });

  html += `</div></div>`;
  calendarDiv.innerHTML = html;
  await loadDays();
  updateAllBadges();
  aggiornaMenu();
  document.getElementById("calendarTitle").textContent = `${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
}

// Caricamento dati
async function loadDays(){
  const {data,error}=await supabase.from("work_days").select("*");
  if(error){ console.error(error); return; }
  data.forEach(row=>{
    const {date,status,note,giustificativo}=row;
    const statusSelect=document.getElementById(`status-${date}`);
    const noteField=document.getElementById(`note-${date}`);
    const rowDiv=document.getElementById(`row-${date}`);
    const giustBox=document.getElementById(`giust-${date}`);
    const giustLabel=document.getElementById(`label-giust-${date}`);

    if(statusSelect) statusSelect.value=status;
    if(noteField) noteField.value=note||"";
    if(rowDiv && status) rowDiv.classList.add(status);
    if(giustBox) giustBox.checked=giustificativo||false;

    initialValues[`status-${date}`]=status;
    initialValues[`note-${date}`]=note||"";
    initialValues[`giust-${date}`]=giustificativo||false;
	
	// **Aggiorna lo stato del checkbox anche al caricamento**
    updateGiustificativo(date);
	
  });
}

// Gestione modifiche
function markUnsaved(dayStr){
  const statusSelect = document.getElementById(`status-${dayStr}`);
  const noteField = document.getElementById(`note-${dayStr}`);
  const giustBox = document.getElementById(`giust-${dayStr}`);
  const row = document.getElementById(`row-${dayStr}`);

  const changed = (statusSelect.value !== initialValues[`status-${dayStr}`]) ||
                  (noteField.value !== initialValues[`note-${dayStr}`]) ||
                  (giustBox && giustBox.checked !== initialValues[`giust-${dayStr}`]);
  if(changed) row.classList.add("unsaved");
  else row.classList.remove("unsaved");
}

window.onChangeDay = function(dayStr){
  markUnsaved(dayStr);
  updateGiustificativo(dayStr);
  updateColor(dayStr);
  updateMonthBadge(dayStr);
  aggiornaMenu(); // Aggiorna menu live
  
};

// Salvataggio
/*window.saveDay=async function(dayStr){
  const status=document.getElementById(`status-${dayStr}`).value;
  const note=document.getElementById(`note-${dayStr}`).value;
  const giust=document.getElementById(`giust-${dayStr}`)?.checked || false;

  const {data:existing}=await supabase.from("work_days").select("*").eq("date",dayStr).maybeSingle();

  if(existing){
    await supabase.from("work_days").update({status,note,giustificativo:giust}).eq("date",dayStr);
  } else {
    await supabase.from("work_days").insert({date:dayStr,status,note,giustificativo:giust});
  }

  initialValues[`status-${dayStr}`]=status;
  initialValues[`note-${dayStr}`]=note;
  initialValues[`giust-${dayStr}`]=giust;

  document.getElementById(`row-${dayStr}`).classList.remove("unsaved");
  updateColor(dayStr);
  updateMonthBadge(dayStr);
  aggiornaMenu(); // Aggiorna menu live
};
*/

window.saveDay = async function(dayStr){
  const status = document.getElementById(`status-${dayStr}`).value;
  const note = document.getElementById(`note-${dayStr}`).value;
  const giust = document.getElementById(`giust-${dayStr}`)?.checked || false;

  if(status === ""){
    // Se non c'è status, elimina eventuale record esistente
    await supabase.from("work_days").delete().eq("date", dayStr);
    document.getElementById(`row-${dayStr}`).classList.remove("unsaved");
    updateMonthBadge(dayStr);
    aggiornaMenu();
    return;
  }

  const {data: existing} = await supabase.from("work_days").select("*").eq("date", dayStr).maybeSingle();

  if(status === "smart" && !canAddSmart(dayStr)){
    alert("Hai già raggiunto 10 giorni di Smart Working per questo mese.");
    document.getElementById(`status-${dayStr}`).value = "";
    return;
  }

  if(existing){
    await supabase.from("work_days").update({status,note,giustificativo:giust}).eq("date", dayStr);
  } else {
    await supabase.from("work_days").insert({date:dayStr,status,note,giustificativo:giust});
  }

  initialValues[`status-${dayStr}`] = status;
  initialValues[`note-${dayStr}`] = note;
  initialValues[`giust-${dayStr}`] = giust;

  document.getElementById(`row-${dayStr}`).classList.remove("unsaved");
  updateColor(dayStr);
  updateMonthBadge(dayStr);
  aggiornaMenu();
};

function canAddSmart(dayStr){
  const date = new Date(dayStr);
  const monthDiv = document.getElementById(`month-${date.getFullYear()}-${date.getMonth()}`);
  if(!monthDiv) return true;
  const rows = monthDiv.querySelectorAll(".day-row select");
  let count = 0;
  rows.forEach(sel => { if(sel.value === "smart") count++; });
  return count <= 10; // <=10 perché il nuovo giorno sarà il 10° consentito
}


// Cancellazione
window.deleteDay=async function(dayStr){
  const statusSelect = document.getElementById(`status-${dayStr}`);
  const noteField = document.getElementById(`note-${dayStr}`);
  const giustBox = document.getElementById(`giust-${dayStr}`);
  const row = document.getElementById(`row-${dayStr}`);
  if(!row) return;

  statusSelect.value = initialValues[`status-${dayStr}`] || "";
  noteField.value = initialValues[`note-${dayStr}`] || "";
  if(giustBox) giustBox.checked = initialValues[`giust-${dayStr}`] || false;

  updateColor(dayStr);
  updateGiustificativo(dayStr);
  row.classList.remove("unsaved");

  await supabase.from("work_days").delete().eq("date",dayStr);
  updateMonthBadge(dayStr);
  aggiornaMenu(); // Aggiorna menu live
};

// Aggiorna colore riga
window.updateColor=function(dayStr){
  const status = document.getElementById(`status-${dayStr}`).value;
  const row = document.getElementById(`row-${dayStr}`);
  row.classList.remove("smart","presenza","supplementare","ferie","festivita","scoperto");
  if(status) row.classList.add(status);
};

// Controllo giustificativo
function updateGiustificativo(dayStr){
  const statusSelect = document.getElementById(`status-${dayStr}`);
  const giustBox = document.getElementById(`giust-${dayStr}`);
  const giustLabel = document.getElementById(`label-giust-${dayStr}`);
  const rowDiv = document.getElementById(`row-${dayStr}`);
  if(!statusSelect || !giustBox || !giustLabel || !rowDiv) return;

  const isPast = rowDiv.classList.contains("disabled");
  const disable = isPast || statusSelect.value==="presenza" || statusSelect.value==="festivita" || statusSelect.value==="scoperto" || statusSelect.value==="";
  giustBox.disabled = disable;
  if(disable) giustBox.checked=false;
}

// Toggle mese
window.toggleMonth=function(id){
  const monthDiv=document.getElementById(id);
  monthDiv.classList.toggle("open");
};

// Aggiornamento badge mese
function updateMonthBadge(dayStr){
  const date = new Date(dayStr);
  const monthDiv = document.getElementById(`month-${date.getFullYear()}-${date.getMonth()}`);
  const badges = monthDiv.querySelectorAll(".badge");
  const rows = monthDiv.querySelectorAll(".day-row select");
  const counts={smart:0,presenza:0,supplementare:0,ferie:0,festivita:0,scoperto:0};
  rows.forEach(sel=>{ if(sel.value && counts[sel.value]!==undefined) counts[sel.value]++; });
  badges.forEach(b=>{ if(b.classList.contains("smart")) b.textContent=counts.smart;
                     if(b.classList.contains("presenza")) b.textContent=counts.presenza;
                     if(b.classList.contains("supplementare")) b.textContent=counts.supplementare;
                     if(b.classList.contains("ferie")) b.textContent=counts.ferie; 
					  if(b.classList.contains("festivita")) b.textContent=counts.festivita; 
					  if(b.classList.contains("scoperto")) b.textContent=counts.scoperto; 
					 
					 });
}

function updateAllBadges(){
  const monthDivs = document.querySelectorAll(".month");
  monthDivs.forEach(mDiv=>{
    const rows = mDiv.querySelectorAll(".day-row select");
    const badges = mDiv.querySelectorAll(".badge");
    const counts={smart:0,presenza:0,supplementare:0,ferie:0,festivita:0,scoperto:0};
    rows.forEach(sel=>{ if(sel.value && counts[sel.value]!==undefined) counts[sel.value]++; });
    badges.forEach(b=>{ if(b.classList.contains("smart")) b.textContent=counts.smart;
                       if(b.classList.contains("presenza")) b.textContent=counts.presenza;
                       if(b.classList.contains("supplementare")) b.textContent=counts.supplementare;
                       if(b.classList.contains("ferie")) b.textContent=counts.ferie; 
					   if(b.classList.contains("festivita")) b.textContent=counts.festivita; 
					   if(b.classList.contains("scoperto")) b.textContent=counts.scoperto; 
					   });
  });
}

// ================= MENU LIVE ===================

// Trova il prossimo giorno lavorativo (esclude sabato, domenica e festività)
function getNextWorkingDay(date) {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6); // 0 = domenica, 6 = sabato
  return next;
}

async function aggiornaMenu() {
  const today = new Date();
  const todayStr = formatDateLocal(today);

  // 🔹 Trova il prossimo giorno lavorativo
  const nextDay = getNextWorkingDay(today);
  const nextDayStr = formatDateLocal(nextDay);

  try {
    // Recupera SOLO i record di oggi e del prossimo giorno lavorativo
    const { data, error } = await supabase
      .from("work_days")
      .select("date, status, giustificativo")
      .in("date", [todayStr, nextDayStr]);

    if (error) throw error;

    // Mappa i risultati per data
    const map = {};
    data.forEach(r => { map[r.date] = r; });

    // --- OGGI ---
    const statusOggi = map[todayStr]?.status || "";
    const giustOggi = map[todayStr]?.giustificativo || false;
    document.getElementById("presenzeOggi").innerHTML = generaBadge(statusOggi, giustOggi, "oggi");

    // --- PROSSIMO GIORNO LAVORATIVO ---
    const statusNext = map[nextDayStr]?.status || "";
    const giustNext = map[nextDayStr]?.giustificativo || false;

    // Mostra anche la data del giorno lavorativo successivo (es. "martedì 22/10")
    const nextLabel = `Prossimo giorno lavorativo: ${nextDay.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`;
	document.getElementById("presenzeProssimoGiornoLavorativo").innerHTML = generaBadge(statusNext, giustNext, nextLabel);

  } catch (err) {
    console.error("Errore in aggiornaMenu:", err);
    document.getElementById("presenzeOggi").innerHTML = "oggi: <span class='badge bg-danger'>Nessuna presenza per oggi</span>";
    document.getElementById("presenzeProssimoGiornoLavorativo").innerHTML = "Prossimo giorno lavorativo: <span class='badge bg-danger'>Nessuna presenza per il prossimo giorno lavorativo</span>";
  }
}


function generaBadge(status, giust, label) {



    if(!status) return `${label}: <span class="fw-bold badge bg-danger"">Presenza da dichiarare</span>`;
    let statoText="";
    if(status==="smart") statoText="Smart working";
    else if(status==="supplementare") statoText="Smart working supplementare";
    else if(status==="presenza") statoText="In sede";
    else if(status==="ferie") statoText="Ferie";
	else if(status==="festivita") statoText="Festività";
	else if(status==="scoperto") statoText="Giorno scoperto da smart";

    let giustText="";
    if((status==="smart"||status==="supplementare") && giust) giustText=`<span class="fw-bold badge bg-success">Giustificativo richiesto</span>`;
    if((status==="smart"||status==="supplementare") && !giust) giustText=`<span class="fw-bold badge bg-danger">Richiedere giustificativo</span>`;

    return `${label} <span class="fw-bold badge bg-primary me-1">${statoText}</span>${giustText}`;
}

// PULSANTI NAVIGAZIONE
document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  generateCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  generateCalendar();
});

document.getElementById("actualMonth").addEventListener("click", () => {
  // Imposta currentMonth al mese e anno di oggi
  currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  generateCalendar(); // rigenera il calendario
});

// Gestione scelta mese dal selettore
document.getElementById("monthPicker").addEventListener("change", (e) => {
  const [year, month] = e.target.value.split("-").map(Number);
  currentMonth = new Date(year, month - 1, 1);
  generateCalendar();
});

// Inizializza il selettore mese con Flatpickr
  flatpickr("#monthPicker", {
    plugins: [
      new monthSelectPlugin({
        shorthand: true,      // Mesi abbreviati
        dateFormat: "Y-m",    // Formato interno: 2025-10
        altFormat: "F Y"      // Visualizzazione: Ottobre 2025
      })
    ],
    defaultDate: new Date(),
    onChange: function(selectedDates, dateStr) {
      if(!dateStr) return;
      const [year, month] = dateStr.split("-").map(Number);
      currentMonth = new Date(year, month - 1, 1);
      generateCalendar();
    }
  });
  
  
/* parte consuntivazione */

/*
function sameDay(d1, d2) {
  return d1.toDateString() === d2.toDateString();
}

function meseCorrente() {
  const d = new Date();
  const mesi = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  const nomeMese = mesi[d.getMonth()];
  return `${nomeMese} ${d.getFullYear()}`;
}

async function controllaConsuntivazione() {
  const status = document.getElementById('statusConsuntivazione');
  const mese = meseCorrente();
  const oggi = new Date();
  const consuntivazioneDate = getConsuntivazioneDate(oggi);

  const formatted = consuntivazioneDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  status.innerHTML = `📅 La prossima consuntivazione per il mese di <b>${mese}</b> sarà <b>${formatted}</b>.`;
  

  const { data: existing, error } = await supabase
    .from('consuntivazioni')
    .select('*')
    .eq('mese_riferimento', mese);

  if (error) {
    console.error('Errore Supabase:', error);
    return;
  }

  if (existing.length > 0) {
    status.innerHTML += `<br>✅ Hai già completato la consuntivazione di questo mese.`;
    return;
  }

  if (sameDay(oggi, consuntivazioneDate)) {
    const conferma = confirm(
      `⚠️ Oggi (${formatted}) è il giorno della consuntivazione!\nVuoi segnarla come completata?`
    );

    if (conferma) {
      const { error: insertError } = await supabase
        .from('consuntivazioni')
        .insert([{ mese_riferimento: mese }]);

      if (insertError) {
        alert('Errore nel salvataggio su Supabase.');
        console.error(insertError);
      } else {
        alert('✅ Consuntivazione segnata come completata!');
        status.innerHTML += `<br>✅ Consuntivazione completata.`;
      }
    }
  }
}

function getConsuntivazioneDate(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0);

  let workingDaysCount = 0;
  let checkDate = new Date(lastDay);

  while (workingDaysCount < 2) {
    checkDate.setDate(checkDate.getDate() - 1);
    const day = checkDate.getDay(); // 0=Dom, 6=Sab
    if (day !== 0 && day !== 6) {
      workingDaysCount++;
    }
  }

  return checkDate;
}
*/

/* fine parte consuntivazione */

</script>
