const landingView = document.getElementById('landingView');
const dashboardView = document.getElementById('dashboardView');
const deviceGrid = document.getElementById('deviceGrid');
const deviceCount = document.getElementById('deviceCount');
const activeDeviceName = document.getElementById('activeDeviceName');
const activeDeviceMeta = document.getElementById('activeDeviceMeta');
const deviceStatusPill = document.getElementById('deviceStatusPill');
const backToDevices = document.getElementById('backToDevices');
const toggleBtn = document.getElementById('toggleSim');
const ctx = document.getElementById('voltageChart').getContext('2d');

const NOMINAL_VOLTAGE = 12.0;
const NOMINAL_CAPACITY_AH = 100;
const DEFAULT_CHARGE_CURRENT_A = 10;

const devices = [
  { id: 'node-01', name: 'Device Alpha', location: 'Rooftop Array', status: 'Online', voltageRange: [12.0, 13.1], currentRange: [0.4, 2.8], tempRange: [23, 34], capacity: 92, history: [] },
  { id: 'node-02', name: 'Device Beta', location: 'Storage Room', status: 'Online', voltageRange: [11.8, 12.9], currentRange: [0.3, 2.4], tempRange: [24, 35], capacity: 76, history: [] },
  { id: 'node-03', name: 'Device Gamma', location: 'Lab Floor 2', status: 'Maintenance', voltageRange: [11.6, 12.6], currentRange: [0.2, 1.8], tempRange: [25, 38], capacity: 63, history: [] },
  { id: 'node-04', name: 'Device Delta', location: 'Control Room', status: 'Online', voltageRange: [12.1, 13.2], currentRange: [0.5, 3.2], tempRange: [22, 33], capacity: 88, history: [] },
  { id: 'node-05', name: 'Device Epsilon', location: 'Workshop Bay', status: 'Warning', voltageRange: [11.4, 12.4], currentRange: [0.2, 2.1], tempRange: [26, 40], capacity: 54, history: [] },
  { id: 'node-06', name: 'Device Zeta', location: 'Outdoor Rack', status: 'Online', voltageRange: [12.0, 13.0], currentRange: [0.4, 2.6], tempRange: [21, 32], capacity: 81, history: [] },
];

const data = {
  labels: [],
  datasets: [{
    label: 'Tegangan (V)',
    data: [],
    borderColor: '#0d6efd',
    backgroundColor: 'rgba(13,110,253,0.08)',
    tension: 0.25,
    fill: true,
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

let activeDevice = null;
let simInterval = null;
let simRunning = false;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function formatHours(hours) {
  if (!isFinite(hours) || hours <= 0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function getStatusTone(status) {
  if (status === 'Online') return 'status-online';
  if (status === 'Warning') return 'status-warning';
  return 'status-muted';
}

function renderDeviceCards() {
  deviceCount.textContent = String(devices.length);
  deviceGrid.innerHTML = devices.map((device) => {
    const lastReading = device.history[device.history.length - 1];
    const capacity = lastReading ? lastReading.capacity : device.capacity;
    const voltage = lastReading ? lastReading.voltage : randomBetween(device.voltageRange[0], device.voltageRange[1]);
    return `
      <div class="col-md-6 col-lg-4">
        <button class="device-card card text-start w-100" type="button" data-device="${device.id}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <div class="eyebrow mb-1">${device.location}</div>
                <h3 class="h5 mb-1">${device.name}</h3>
                <div class="text-muted small">${device.id}</div>
              </div>
              <span class="status-pill ${getStatusTone(device.status)}">${device.status}</span>
            </div>
            <div class="row g-2 small mb-3">
              <div class="col-6"><div class="device-stat"><span>Tegangan</span><strong>${voltage.toFixed(2)} V</strong></div></div>
              <div class="col-6"><div class="device-stat"><span>Capacity</span><strong>${capacity} %</strong></div></div>
            </div>
            <div class="progress mb-2" style="height:8px;">
              <div class="progress-bar" style="width:${Math.max(0, Math.min(100, capacity))}%"></div>
            </div>
            <div class="small text-muted">Klik untuk membuka dashboard detail device ini.</div>
          </div>
        </button>
      </div>
    `;
  }).join('');
}

function showLanding() {
  landingView.classList.remove('d-none');
  dashboardView.classList.add('d-none');
  backToDevices.classList.add('d-none');
  toggleBtn.classList.add('d-none');
  stopSimulation();
}

function showDashboard() {
  landingView.classList.add('d-none');
  dashboardView.classList.remove('d-none');
  backToDevices.classList.remove('d-none');
  toggleBtn.classList.remove('d-none');
}

function resetChart() {
  data.labels = [];
  data.datasets[0].data = [];
  chart.update();
}

function renderHistory(device) {
  data.labels = device.history.map((item) => item.label);
  data.datasets[0].data = device.history.map((item) => item.voltage);
  chart.update();

  const log = document.getElementById('log');
  log.innerHTML = '';
  [...device.history].slice(-50).reverse().forEach((item) => {
    const entry = document.createElement('div');
    entry.textContent = `${item.label} — V:${item.voltage.toFixed(2)}V  I:${item.current.toFixed(2)}A  T:${item.temp.toFixed(1)}°C  Capacity:${item.capacity}%`;
    log.appendChild(entry);
  });
}

function updateMetrics(reading) {
  document.getElementById('voltage').textContent = reading.voltage.toFixed(2) + ' V';
  document.getElementById('current').textContent = reading.current.toFixed(2) + ' A';
  document.getElementById('temp').textContent = reading.temp.toFixed(1) + ' °C';

  const capText = document.getElementById('capacityText');
  const capBar = document.getElementById('capacityBar');
  capText.textContent = reading.capacity + ' %';
  capBar.style.width = Math.max(0, Math.min(100, reading.capacity)) + '%';

  const totalWh = NOMINAL_VOLTAGE * NOMINAL_CAPACITY_AH;
  const remainingWh = totalWh * (reading.capacity / 100);
  const powerW = reading.voltage * reading.current;
  let hoursRemaining = Infinity;
  if (powerW > 0.1) {
    hoursRemaining = remainingWh / powerW;
  }

  const ahNeeded = NOMINAL_CAPACITY_AH * (1 - reading.capacity / 100);
  const hoursToFull = ahNeeded / DEFAULT_CHARGE_CURRENT_A;

  document.getElementById('timeRemaining').textContent = 'Est. remaining: ' + formatHours(hoursRemaining);
  document.getElementById('timeToFull').textContent = 'Est. to full (10A): ' + formatHours(hoursToFull);
}

function syncDashboardHeader(device) {
  activeDeviceName.textContent = device.name;
  activeDeviceMeta.textContent = `${device.location} · ${device.id}`;
  deviceStatusPill.textContent = device.status;
  deviceStatusPill.className = `status-pill ${getStatusTone(device.status)}`;
}

function createReading(device) {
  const voltage = randomBetween(device.voltageRange[0], device.voltageRange[1]);
  const current = randomBetween(device.currentRange[0], device.currentRange[1]);
  const temp = randomBetween(device.tempRange[0], device.tempRange[1]);
  const capacityDrop = randomBetween(0, 2);
  const capacity = Math.max(0, Math.min(100, Math.round(device.capacity - capacityDrop + randomBetween(-1, 1))));
  return {
    label: new Date().toLocaleTimeString(),
    voltage,
    current,
    temp,
    capacity,
  };
}

function recordReading(device, reading) {
  device.history.push(reading);
  if (device.history.length > 30) {
    device.history.shift();
  }
  renderHistory(device);
  updateMetrics(reading);
  syncDashboardHeader(device);
}

function openDevice(deviceId) {
  const device = devices.find((item) => item.id === deviceId);
  if (!device) {
    return;
  }

  activeDevice = device;
  showDashboard();
  syncDashboardHeader(device);
  resetChart();
  renderHistory(device);

  if (device.history.length === 0) {
    recordReading(device, createReading(device));
  } else {
    updateMetrics(device.history[device.history.length - 1]);
  }
}

function step() {
  if (!activeDevice) {
    return;
  }
  recordReading(activeDevice, createReading(activeDevice));
}

function startSimulation() {
  if (!activeDevice) {
    return;
  }
  simRunning = true;
  toggleBtn.textContent = 'Hentikan Simulasi';
  clearInterval(simInterval);
  simInterval = setInterval(step, 2000);
  step();
}

function stopSimulation() {
  simRunning = false;
  toggleBtn.textContent = 'Mulai Simulasi';
  clearInterval(simInterval);
  simInterval = null;
}

deviceGrid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-device]');
  if (!card) {
    return;
  }
  openDevice(card.getAttribute('data-device'));
  if (simRunning) {
    clearInterval(simInterval);
    simInterval = setInterval(step, 2000);
  }
});

backToDevices.addEventListener('click', () => {
  activeDevice = null;
  showLanding();
  renderDeviceCards();
});

toggleBtn.addEventListener('click', () => {
  if (!activeDevice) {
    return;
  }
  if (simRunning) {
    stopSimulation();
  } else {
    startSimulation();
  }
});

renderDeviceCards();
showLanding();

window.dashboard = {
  pushReading: (payload) => {
    const device = activeDevice || devices[0];
    if (!device) {
      return;
    }
    if (!activeDevice) {
      openDevice(device.id);
    }
    const capacity = (payload.capacity !== undefined) ? payload.capacity : payload.soc;
    const reading = {
      label: new Date().toLocaleTimeString(),
      voltage: payload.voltage,
      current: payload.current,
      temp: payload.temp,
      capacity,
    };
    recordReading(device, reading);
  }
};
