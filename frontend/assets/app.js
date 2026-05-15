const ctx = document.getElementById('voltageChart').getContext('2d');

const data = {
  labels: [],
  datasets: [{
    label: 'Tegangan (V)',
    data: [],
    borderColor: '#0d6efd',
    backgroundColor: 'rgba(13,110,253,0.08)',
    tension: 0.25,
  }]
};

const config = {
  type: 'line',
  data,
  options: {
    responsive: true,
    animation: false,
    scales: {
      x: { display: true },
      y: { suggestedMin: 0, suggestedMax: 16 }
    }
  }
};

const chart = new Chart(ctx, config);

function addSamplePoint(v, t){
  const label = new Date().toLocaleTimeString();
  data.labels.push(label);
  data.datasets[0].data.push(v);
  if(data.labels.length>30){ data.labels.shift(); data.datasets[0].data.shift(); }
  chart.update();
  const log = document.getElementById('log');
  const entry = document.createElement('div');
  const capacityVal = (t.capacity !== undefined) ? t.capacity : (t.soc !== undefined ? t.soc : '--');
  entry.textContent = `${label} — V:${v.toFixed(2)}V  I:${t.current.toFixed(2)}A  T:${t.temp.toFixed(1)}°C  Capacity:${capacityVal}%`;
  log.prepend(entry);
  while(log.children.length>50) log.removeChild(log.lastChild);
}

// Nominal battery parameters for estimates (user-configurable)
const NOMINAL_VOLTAGE = 12.0; // V
const NOMINAL_CAPACITY_AH = 100; // Ah (default)
const DEFAULT_CHARGE_CURRENT_A = 10; // A (assumed charger)

function formatHours(hours){
  if(!isFinite(hours) || hours<=0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h)*60);
  return `${h}h ${m}m`;
}

function updateMetrics(v, t){
  const current = t.current;
  const temp = t.temp;
  const capacity = (t.capacity !== undefined) ? t.capacity : (t.soc !== undefined ? t.soc : 0);

  document.getElementById('voltage').textContent = v.toFixed(2) + ' V';
  document.getElementById('current').textContent = current.toFixed(2) + ' A';
  document.getElementById('temp').textContent = temp.toFixed(1) + ' °C';

  // Update capacity UI
  const capText = document.getElementById('capacityText');
  const capBar = document.getElementById('capacityBar');
  capText.textContent = capacity + ' %';
  capBar.style.width = Math.max(0, Math.min(100, capacity)) + '%';

  // Estimates
  const totalWh = NOMINAL_VOLTAGE * NOMINAL_CAPACITY_AH; // Wh
  const remainingWh = totalWh * (capacity/100);
  const powerW = v * current; // approximate
  let hoursRemaining = Infinity;
  if(powerW > 0.1){ hoursRemaining = remainingWh / powerW; }

  // Time to full with assumed charger current
  const ahNeeded = NOMINAL_CAPACITY_AH * (1 - capacity/100);
  const hoursToFull = ahNeeded / DEFAULT_CHARGE_CURRENT_A;

  document.getElementById('timeRemaining').textContent = 'Est. remaining: ' + formatHours(hoursRemaining);
  document.getElementById('timeToFull').textContent = 'Est. to full (10A): ' + formatHours(hoursToFull);
}

// Simulation
let simInterval = null;
let simRunning = false;
const toggleBtn = document.getElementById('toggleSim');

function randomBetween(a,b){ return a + Math.random()*(b-a); }

function step(){
  const v = randomBetween(11.5,13.2);
  const current = randomBetween(0.2,3.5);
  const temp = randomBetween(22,36);
  const soc = Math.max(0, Math.min(100, Math.round(randomBetween(30,95))));
  const meta = { current, temp, capacity: soc };
  addSamplePoint(v, meta);
  updateMetrics(v, meta);
}

toggleBtn.addEventListener('click', ()=>{
  simRunning = !simRunning;
  if(simRunning){
    toggleBtn.textContent = 'Hentikan Simulasi';
    simInterval = setInterval(step, 2000);
    step();
  } else {
    toggleBtn.textContent = 'Mulai Simulasi';
    clearInterval(simInterval);
    simInterval = null;
  }
});

// Expose a simple API for real data integration later
window.dashboard = {
  pushReading: (payload)=>{
    // payload: { voltage, current, temp, capacity } or { voltage, current, temp, soc }
    const capacity = (payload.capacity !== undefined) ? payload.capacity : payload.soc;
    const meta = { current: payload.current, temp: payload.temp, capacity };
    addSamplePoint(payload.voltage, meta);
    updateMetrics(payload.voltage, meta);
  }
};
