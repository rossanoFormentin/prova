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

function sameDay(d1, d2) {
  return d1.toDateString() === d2.toDateString();
}

function meseCorrente() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}