document.addEventListener("DOMContentLoaded", () => {
  const dayDetailDiv = document.getElementById("day-detail");

  const calendarEl = document.getElementById("fullcalendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'it',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    selectable: true,
    navLinks: true,
    events: async function(fetchInfo, successCallback, failureCallback) {
      try {
        const { data, error } = await supabaseClient.from("work_days")
          .select("*")
          .gte("date", fetchInfo.startStr)
          .lte("date", fetchInfo.endStr);
        if (error) throw error;

        const events = data.map(d => {
          let color = '';
          if(d.status==='smart') color='#0d6efd';
          else if(d.status==='presenza') color='#198754';
          else if(d.status==='supplementare') color='#ffc107';
          else if(d.status==='ferie') color='#dc3545';
          else if(d.status==='festivita') color='#6c757d';
          else if(d.status==='scoperto') color='#fd7e14';
          return {
            title: d.status.charAt(0).toUpperCase()+d.status.slice(1),
            start: d.date,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { note: d.note, giustificativo: d.giustificativo }
          };
        });
        successCallback(events);
      } catch(err) {
        console.error(err);
        failureCallback(err);
      }
    },
    dateClick: function(info) {
      const dateStr = info.dateStr;
      loadDayDetail(dateStr);
    },
    eventClick: function(info) {
      const dateStr = info.event.startStr;
      loadDayDetail(dateStr);
    }
  });

  calendar.render();

  async function loadDayDetail(dateStr){
    // Legge i dati dal DB
    let status="", note="", giustificativo=false;
    try {
      const {data} = await supabaseClient.from("work_days").select("*").eq("date", dateStr).maybeSingle();
      if(data){ status=data.status||""; note=data.note||""; giustificativo=data.giustificativo||false; }
    } catch(err){ console.error(err); }

    dayDetailDiv.innerHTML = `
      <h5>${dateStr}</h5>
      <div class="mb-2">
        <label>Status</label>
        <select id="status-${dateStr}" class="form-control">
          <option value="">--</option>
          <option value="smart" ${status==="smart"?"selected":""}>Smart Working</option>
          <option value="presenza" ${status==="presenza"?"selected":""}>Presenza</option>
          <option value="supplementare" ${status==="supplementare"?"selected":""}>Smart Working Supplementare</option>
          <option value="ferie" ${status==="ferie"?"selected":""}>Ferie</option>
          <option value="festivita" ${status==="festivita"?"selected":""}>Festività</option>
          <option value="scoperto" ${status==="scoperto"?"selected":""}>Scoperto</option>
        </select>
      </div>
      <div class="mb-2">
        <label>Note</label>
        <textarea id="note-${dateStr}" class="form-control">${note}</textarea>
      </div>
      <div class="form-check mb-2">
        <input type="checkbox" class="form-check-input" id="giust-${dateStr}" ${giustificativo?"checked":""}>
        <label class="form-check-label" for="giust-${dateStr}">Giustificativo richiesto</label>
      </div>
      <button class="btn btn-primary" onclick="saveDay('${dateStr}')">Salva</button>
      <button class="btn btn-danger" onclick="deleteDay('${dateStr}')">Cancella</button>
    `;
  }

  window.saveDay = async function(dayStr){
    const status = document.getElementById(`status-${dayStr}`).value;
    const note = document.getElementById(`note-${dayStr}`).value;
    const giust = document.getElementById(`giust-${dayStr}`).checked;

    if(status===""){
      await supabaseClient.from("work_days").delete().eq("date", dayStr);
    } else {
      const {data:existing} = await supabaseClient.from("work_days").select("*").eq("date", dayStr).maybeSingle();
      if(existing){
        await supabaseClient.from("work_days").update({status,note,giustificativo:giust}).eq("date", dayStr);
      } else {
        await supabaseClient.from("work_days").insert({date:dayStr,status,note,giustificativo:giust});
      }
    }
    calendar.refetchEvents();
    alert("Dati salvati!");
  };

  window.deleteDay = async function(dayStr){
    await supabaseClient.from("work_days").delete().eq("date", dayStr);
    calendar.refetchEvents();
    dayDetailDiv.innerHTML = "Seleziona un giorno per vedere i dettagli.";
  };
});