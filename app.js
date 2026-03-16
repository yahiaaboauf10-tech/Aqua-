const characters = [
  {
    id: "manager",
    name: "Nia – Farm-Managerin",
    perk: "Erhält +15 Credits pro erfolgreichem Erntetag.",
    bonus: { economy: 15 }
  },
  {
    id: "bio",
    name: "Tariq – Bio-Ingenieur",
    perk: "Biofilter wirkt 25 % stärker.",
    bonus: { filterBoost: 1.25 }
  },
  {
    id: "chem",
    name: "Lea – Wasserchemikerin",
    perk: "pH- und Nitritwerte bleiben stabiler.",
    bonus: { chemistry: 0.8 }
  }
];

const facts = [
  "Aquaponik kombiniert Aquakultur (Fischzucht) und Hydrokultur (Pflanzenanbau ohne Erde).",
  "Fische produzieren Ammonium über Ausscheidungen – das ist die Grundlage des Nährstoffkreislaufs.",
  "Nitrifizierende Bakterien wandeln Ammonium zuerst in Nitrit und danach in Nitrat um.",
  "Pflanzen nehmen vor allem Nitrat auf und reinigen damit gleichzeitig das Wasser für die Fische.",
  "Ein stabiler pH-Wert (meist zwischen 6,8 und 7,2) hält Pflanzen, Fische und Bakterien im Gleichgewicht.",
  "Aquaponik spart oft deutlich Wasser gegenüber klassischem Feldanbau, weil Wasser im Kreislauf bleibt."
];

const tasks = [
  { id: "nitrate", text: "Halte Nitrat 3 Tage zwischen 25 und 45.", progress: 0, done: false },
  { id: "health", text: "Halte Fischgesundheit 4 Tage über 80 %.", progress: 0, done: false },
  { id: "harvest", text: "Erreiche 2 Erntetage mit Pflanzenwachstum über 90 %.", progress: 0, done: false }
];

const state = {
  day: 1,
  credits: 100,
  fishHealth: 78,
  plantGrowth: 42,
  ammonia: 26,
  nitrite: 20,
  nitrate: 30,
  ph: 7.0,
  oxygen: 71,
  waterLevel: 84,
  selectedCharacter: null,
  logs: ["Willkommen bei AquaLern Sim. Wähle einen Charakter und starte den Kreislauf!"],
  taskState: JSON.parse(JSON.stringify(tasks))
};

const ui = {
  characters: document.getElementById("characters"),
  stats: document.getElementById("stats"),
  tasks: document.getElementById("tasks"),
  factBox: document.getElementById("factBox"),
  log: document.getElementById("eventLog"),
  nextDayBtn: document.getElementById("nextDayBtn"),
  controls: [...document.querySelectorAll(".touch-controls button")],
  canvas: document.getElementById("simCanvas")
};

const ctx = ui.canvas.getContext("2d");
let t = 0;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function metricClass(value, goodMin, goodMax, warnMin, warnMax) {
  if (value >= goodMin && value <= goodMax) return "value-good";
  if (value >= warnMin && value <= warnMax) return "value-warn";
  return "value-bad";
}

function addLog(message) {
  state.logs.unshift(`Tag ${state.day}: ${message}`);
  state.logs = state.logs.slice(0, 30);
  renderLog();
}

function renderCharacters() {
  ui.characters.innerHTML = "";
  characters.forEach((char) => {
    const card = document.createElement("button");
    card.className = `character ${state.selectedCharacter?.id === char.id ? "selected" : ""}`;
    card.innerHTML = `<strong>${char.name}</strong><span>${char.perk}</span>`;
    card.addEventListener("click", () => {
      state.selectedCharacter = char;
      addLog(`Charakter ausgewählt: ${char.name}`);
      render();
    });
    ui.characters.appendChild(card);
  });
}

function renderStats() {
  const m = [
    ["Tag", state.day],
    ["Credits", `${Math.round(state.credits)} C`],
    ["Fischgesundheit", `${Math.round(state.fishHealth)} %`, metricClass(state.fishHealth, 75, 100, 60, 74)],
    ["Pflanzenwachstum", `${Math.round(state.plantGrowth)} %`, metricClass(state.plantGrowth, 65, 100, 45, 64)],
    ["Ammonium", `${Math.round(state.ammonia)} mg/L`, metricClass(state.ammonia, 10, 25, 6, 33)],
    ["Nitrit", `${Math.round(state.nitrite)} mg/L`, metricClass(state.nitrite, 5, 18, 2, 25)],
    ["Nitrat", `${Math.round(state.nitrate)} mg/L`, metricClass(state.nitrate, 25, 45, 18, 54)],
    ["pH", state.ph.toFixed(2), metricClass(state.ph, 6.8, 7.2, 6.4, 7.5)],
    ["Sauerstoff", `${Math.round(state.oxygen)} %`, metricClass(state.oxygen, 72, 100, 58, 71)],
    ["Wasserstand", `${Math.round(state.waterLevel)} %`, metricClass(state.waterLevel, 70, 100, 52, 69)]
  ];

  ui.stats.innerHTML = m
    .map(([label, value, cls]) => `<li>${label}: <strong class="${cls || ""}">${value}</strong></li>`)
    .join("");
}

function renderTasks() {
  ui.tasks.innerHTML = state.taskState
    .map((task) => {
      const status = task.done ? "✅" : `(${task.progress})`;
      return `<li>${status} ${task.text}</li>`;
    })
    .join("");
}

function renderFact() {
  ui.factBox.textContent = facts[(state.day - 1) % facts.length];
}

function renderLog() {
  ui.log.innerHTML = state.logs.map((entry) => `<div class="log-item">${entry}</div>`).join("");
}

function applyCharacterModifier(kind, value) {
  if (!state.selectedCharacter) return value;
  if (kind === "filter") {
    return value * (state.selectedCharacter.bonus.filterBoost || 1);
  }
  if (kind === "chem") {
    return value * (state.selectedCharacter.bonus.chemistry || 1);
  }
  return value;
}

function gameAction(action) {
  switch (action) {
    case "feed":
      state.ammonia += 4;
      state.fishHealth += 3;
      state.credits -= 4;
      addLog("Fütterung erhöht Fischenergie, aber steigert Ammonium.");
      break;
    case "plant":
      state.plantGrowth += 6;
      state.nitrate -= 5;
      state.credits -= 6;
      addLog("Neue Setzlinge eingesetzt – sie verbrauchen Nitrat.");
      break;
    case "filter": {
      const boost = applyCharacterModifier("filter", 8);
      state.ammonia -= boost;
      state.nitrite -= boost * 0.7;
      state.nitrate += boost * 0.5;
      state.credits -= 5;
      addLog("Biofilter gewartet: Nitrifikation läuft effizienter.");
      break;
    }
    case "water":
      state.ammonia -= 7;
      state.nitrite -= 5;
      state.nitrate -= 3;
      state.ph = (state.ph + 7.0) / 2;
      state.waterLevel += 12;
      state.credits -= 9;
      addLog("Teilwasserwechsel durchgeführt.");
      break;
    case "quiz": {
      const question = facts[Math.floor(Math.random() * facts.length)];
      state.credits += 8;
      addLog(`Quiz gelöst: ${question}`);
      break;
    }
    default:
      break;
  }
  normalize();
  render();
}

function updateTasks() {
  for (const task of state.taskState) {
    if (task.done) continue;
    if (task.id === "nitrate") {
      task.progress = state.nitrate >= 25 && state.nitrate <= 45 ? task.progress + 1 : 0;
      if (task.progress >= 3) {
        task.done = true;
        state.credits += 30;
        addLog("Mission erfüllt: Nitratmanagement! +30 Credits");
      }
    }
    if (task.id === "health") {
      task.progress = state.fishHealth > 80 ? task.progress + 1 : 0;
      if (task.progress >= 4) {
        task.done = true;
        state.credits += 40;
        addLog("Mission erfüllt: Gesunder Fischbestand! +40 Credits");
      }
    }
    if (task.id === "harvest") {
      task.progress = state.plantGrowth > 90 ? task.progress + 1 : task.progress;
      if (task.progress >= 2) {
        task.done = true;
        state.credits += 45;
        addLog("Mission erfüllt: Erntemeister! +45 Credits");
      }
    }
  }
}

function simulateDay() {
  if (!state.selectedCharacter) {
    addLog("Bitte zuerst einen Charakter wählen.");
    return render();
  }

  state.day += 1;

  const chemDrift = applyCharacterModifier("chem", 1);
  state.ammonia += 2.5 * chemDrift;
  state.nitrite += 2.2 * chemDrift;
  state.nitrate += 2.8;
  state.oxygen -= 3 + Math.random() * 2;
  state.waterLevel -= 4 + Math.random() * 2;
  state.ph += (Math.random() - 0.5) * 0.2 * chemDrift;

  if (state.ammonia > 32 || state.nitrite > 24 || state.oxygen < 55) {
    state.fishHealth -= 7;
    addLog("Warnung: Wasserwerte belasten die Fische.");
  } else {
    state.fishHealth += 2;
  }

  if (state.nitrate >= 20 && state.nitrate <= 50 && state.ph >= 6.6 && state.ph <= 7.3) {
    state.plantGrowth += 7;
    state.credits += 9 + (state.selectedCharacter.bonus.economy || 0);
    addLog("Pflanzen wachsen gut – stabiler Kreislauf!");
  } else {
    state.plantGrowth += 2;
  }

  if (state.plantGrowth >= 100) {
    state.plantGrowth = 35;
    state.credits += 25;
    addLog("Ernte verkauft! +25 Credits");
  }

  if (Math.random() > 0.83) {
    const randomEvent = [
      "Sommerhitze senkt Sauerstoff – nutze den Biofilter öfter!",
      "Zusätzliche Schulklasse besucht die Farm: +12 Credits Fördergeld.",
      "Eine Pumpe läuft unruhig, Wasserstand sinkt schneller."
    ][Math.floor(Math.random() * 3)];
    if (randomEvent.includes("+12")) state.credits += 12;
    if (randomEvent.includes("Pumpe")) state.waterLevel -= 6;
    if (randomEvent.includes("Sauerstoff")) state.oxygen -= 5;
    addLog(`Ereignis: ${randomEvent}`);
  }

  updateTasks();
  normalize();
  render();
}

function normalize() {
  state.credits = clamp(state.credits, 0, 999);
  state.fishHealth = clamp(state.fishHealth, 0, 100);
  state.plantGrowth = clamp(state.plantGrowth, 0, 100);
  state.ammonia = clamp(state.ammonia, 0, 60);
  state.nitrite = clamp(state.nitrite, 0, 50);
  state.nitrate = clamp(state.nitrate, 0, 80);
  state.ph = clamp(state.ph, 5.8, 8.2);
  state.oxygen = clamp(state.oxygen, 0, 100);
  state.waterLevel = clamp(state.waterLevel, 0, 100);
}

function drawScene() {
  t += 0.016;
  ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);

  const grd = ctx.createLinearGradient(0, 0, 0, ui.canvas.height);
  grd.addColorStop(0, "#164d7a");
  grd.addColorStop(0.6, "#18535d");
  grd.addColorStop(1, "#235f3a");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

  for (let i = 0; i < 30; i += 1) {
    const x = (i * 83 + t * 35) % ui.canvas.width;
    const y = 30 + (i * 31) % 220;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#8ec0e5";
  ctx.fillRect(80, 330, 360, 120);
  ctx.fillStyle = "#3e7ea2";
  ctx.fillRect(90, 340, 340, 95);

  ctx.fillStyle = "#5f4d37";
  ctx.fillRect(510, 300, 370, 140);
  ctx.fillStyle = "#58a06b";
  const growthBars = Math.ceil(state.plantGrowth / 10);
  for (let i = 0; i < growthBars; i += 1) {
    ctx.fillRect(530 + i * 30, 300 - (20 + (i % 3) * 12), 10, 140);
  }

  const fishCount = Math.max(2, Math.round(state.fishHealth / 18));
  for (let i = 0; i < fishCount; i += 1) {
    const fx = 130 + ((i * 88 + t * 70 * (i % 2 ? 1 : -1)) % 280 + 280) % 280;
    const fy = 360 + Math.sin(t * 2 + i) * 20;
    drawFish(fx, fy, i % 2 === 0 ? "#f7665b" : "#56dbff");
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(16, 14, 290, 114);
  ctx.fillStyle = "#dcf2ff";
  ctx.font = "bold 20px Inter, sans-serif";
  ctx.fillText("Aquaponik-Kreislauf", 28, 40);
  ctx.font = "14px Inter, sans-serif";
  ctx.fillText("1. Fischbecken → 2. Biofilter → 3. Pflanzenbeet", 28, 64);
  ctx.fillText("4. Gereinigtes Wasser zurück ins Becken", 28, 84);
  ctx.fillText(`Tag ${state.day} · Credits ${Math.round(state.credits)}`, 28, 108);

  requestAnimationFrame(drawScene);
}

function drawFish(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-35, -10);
  ctx.lineTo(-35, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#032b42";
  ctx.beginPath();
  ctx.arc(8, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  renderCharacters();
  renderStats();
  renderTasks();
  renderFact();
  renderLog();
}

ui.nextDayBtn.addEventListener("click", simulateDay);
ui.controls.forEach((btn) => {
  btn.addEventListener("click", () => gameAction(btn.dataset.action));
});

render();
requestAnimationFrame(drawScene);
