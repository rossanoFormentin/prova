document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const calendarDiv = document.getElementById("calendar");
  const months = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const initialValues = {};

  // ------------------- Flatpickr -------------------
  const monthPickerEl = document.getElementById("monthPicker");
  flatpickr(monthPickerEl, {
    plugins: [new monthSelectPlugin({
      shorthand: true,
      dateFormat: "Y-m",
      altFormat: "F Y"
    })],
    defaultDate: today,
    onChange: function(selectedDates, dateStr) {
      if(!dateStr) return;
      const [year, month] = dateStr.split("-").map(Number);
      currentMonth = new Date(year, month-1, 1);
      generateCalendar();
    }
  });
  monthPickerEl._flatpickr.setDate(today, true);

  // ------------------- Pulsanti navigazione -------------------
  document.getElementById("prevMonth")?.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    generateCalendar();
    monthPickerEl._flatpickr.setDate(currentMonth, true);
  });

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    generateCalendar();
    monthPickerEl._flatpickr.setDate(currentMonth, true);
  });

  document.getElementById("actualMonth")?.addEventListener("click", () => {
    currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    generateCalendar();
    monthPickerEl._flatpickr.setDate(currentMonth, true);
  });

  // ------------------- Funzioni -------------------
  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatDateLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatDateDDMMYYYY(d) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function generateCalendar() {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0);
    const allDays = [];
    let current = new Date(start);
    while(current <= end){
      if(current.getDay() !== 0 && current.getDay() !== 6) allDays.push(new Date(current));
      current.setDate(current.getDate()+1);
    }

    const todayNoTime = stripTime(today);
    let html = `<div class="month open" id="month-${currentMonth.getFullYear()}-${currentMonth.getMonth()}">
                  <div class="month-header">
                    <h2>${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}</h2>
                  </div>
                  <div class="month-content">`;

    allDays.forEach(day=>{
      const dayStr = formatDateLocal(day);
      const dayNoTime = stripTime(day);
      const isPast = dayNoTime < todayNoTime;

      html += `<div class="day-row ${isPast?"disabled":""}" id="row-${dayStr}">
                <div>${formatDateDDMMYYYY(day)}</div>
                <select id="status-${dayStr}" ${isPast?"disabled":""} onchange="onChangeDay('${dayStr}')">
                  <option value="">--</option>
                  <option value="smart">Smart Working</option>
                  <option value="presenza">Presenza</option>
                  <option value="supplementare">Smart Working Supplementare</option>
                  <option value="ferie">Ferie</option>
                  <option value="festivita">Festività</option>
                  <option value="scoperto">Scoperto</option>
                </select>
              </div>`;
    });

    html += `</div></div>`;
    calendarDiv.innerHTML = html;

    // Dopo rigenerazione, ricarico dati e badge
    loadDays();
    updateAllBadges();
    aggiornaMenu();
  }

  // ------------------- Load dati -------------------
  async function loadDays(){
    const {data,error} = await supabaseClient.from("work_days").select("*");
    if(error){ console.error(error); return; }

    data.forEach(row=>{
      const {date,status,note,giustificativo} = row;
      const statusSelect = document.getElementById(`status-${date}`);
      const rowDiv = document.getElementById(`row-${date}`);
      const giustBox = document.getElementById(`giust-${date}`);

      if(statusSelect) statusSelect.value = status;
      if(rowDiv && status) rowDiv.classList.add(status);
      if(giustBox) giustBox.checked = giustificativo || false;

      initialValues[`status-${date}`] = status;
      initialValues[`note-${date}`] = note || "";
      initialValues[`giust-${date}`] = giustificativo || false;

      updateGiustificativo(date);
    });
  }

  // ------------------- Gestione modifiche -------------------
  window.onChangeDay = function(dayStr){
    markUnsaved(dayStr);
    updateGiustificativo(dayStr);
    updateColor(dayStr);
    updateMonthBadge(dayStr);
    aggiornaMenu();
  }

  function markUnsaved(dayStr){
    const statusSelect = document.getElementById(`status-${dayStr}`);
    const row = document.getElementById(`row-${dayStr}`);
    if(!row || !statusSelect) return;

    const changed = statusSelect.value !== initialValues[`status-${dayStr}`];
    if(changed) row.classList.add("unsaved");
    else row.classList.remove("unsaved");
  }

  window.updateColor = function(dayStr){
    const status = document.getElementById(`status-${dayStr}`)?.value;
    const row = document.getElementById(`row-${dayStr}`);
    if(!row) return;
    row.classList.remove("smart","presenza","supplementare","ferie","festivita","scoperto");
    if(status) row.classList.add(status);
  }

  function updateGiustificativo(dayStr){
    const statusSelect = document.getElementById(`status-${dayStr}`);
    const giustBox = document.getElementById(`giust-${dayStr}`);
    const rowDiv = document.getElementById(`row-${dayStr}`);
    if(!statusSelect || !giustBox || !rowDiv) return;

    const isPast = rowDiv.classList.contains("disabled");
    const disable = isPast || ["presenza","festivita","scoperto",""].includes(statusSelect.value);
    giustBox.disabled = disable;
    if(disable) giustBox.checked = false;
  }

  function updateMonthBadge(dayStr){
    const date = new Date(dayStr);
    const monthDiv = document.getElementById(`month-${date.getFullYear()}-${date.getMonth()}`);
    if(!monthDiv) return;

    const badges = monthDiv.querySelectorAll(".badge");
    const rows = monthDiv.querySelectorAll(".day-row select");
    const counts = {smart:0,presenza:0,supplementare:0,ferie:0,festivita:0,scoperto:0};

    rows.forEach(sel=>{
      if(sel.value && counts[sel.value] !== undefined) counts[sel.value]++;
    });

    badges.forEach(b=>{
      if(counts[b.className.split(" ")[1]] !== undefined) b.textContent = counts[b.className.split(" ")[1]];
    });
  }

  function updateAllBadges(){
    const monthDivs = document.querySelectorAll(".month");
    monthDivs.forEach(mDiv=>{
      const rows = mDiv.querySelectorAll(".day-row select");
      const badges = mDiv.querySelectorAll(".badge");
      const counts = {smart:0,presenza:0,supplementare:0,ferie:0,festivita:0,scoperto:0};
      rows.forEach(sel=>{ if(sel.value && counts[sel.value]!==undefined) counts[sel.value]++; });
      badges.forEach(b=>{
        if(counts[b.className.split(" ")[1]] !== undefined) b.textContent = counts[b.className.split(" ")[1]];
      });
    });
  }

  // ------------------- Menu Live -------------------
  function getNextWorkingDay(date) {
    const next = new Date(date);
    do {
      next.setDate(next.getDate() + 1);
    } while([0,6].includes(next.getDay()));
    return next;
  }

  async function aggiornaMenu() {
    const todayStr = formatDateLocal(today);
    const nextDay = getNextWorkingDay(today);
    const nextDayStr = formatDateLocal(nextDay);

    try {
      const { data, error } = await supabaseClient
        .from("work_days")
        .select("date, status, giustificativo")
        .in("date", [todayStr, nextDayStr]);
      if(error) throw error;

      const map = {};
      data.forEach(r => map[r.date] = r);

      const statusOggi = map[todayStr]?.status || "";
      const giustOggi = map[todayStr]?.giustificativo || false;
      document.getElementById("presenzeOggi").innerHTML = generaBadge(statusOggi, giustOggi, "oggi");

      const statusNext = map[nextDayStr]?.status || "";
      const giustNext = map[nextDayStr]?.giustificativo || false;
      const nextLabel = `Prossimo giorno lavorativo: ${nextDay.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`;
      document.getElementById("presenzeProssimoGiornoLavorativo").innerHTML = generaBadge(statusNext, giustNext, nextLabel);
    } catch(err){
      console.error(err);
    }
  }

  function generaBadge(status, giust, label){
    if(!status) return `${label}: <span class="fw-bold badge bg-danger">Presenza da dichiarare</span>`;
    const texts = {
      smart:"Smart working",
      supplementare:"Smart working supplementare",
      presenza:"In sede",
      ferie:"Ferie",
      festivita:"Festività",
      scoperto:"Giorno scoperto da smart"
    };
    let giustText = "";
    if(["smart","supplementare"].includes(status)) giustText = giust
      ? `<span class="fw-bold badge bg-success">Giustificativo richiesto</span>`
      : `<span class="fw-bold badge bg-danger">Richiedere giustificativo</span>`;
    return `${label} <span class="fw-bold badge bg-primary me-1">${texts[status]}</span>${giustText}`;
  }

  // ------------------- Avvio -------------------
  generateCalendar();
});