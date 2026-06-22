let startTime = null;
let timerInterval = null;
let elapsedTime = 0;
let nextRunnerId = 1;
let activeRaceId = "1600";
let activeHeatNumber = 1;
const timerHeats = [1, 2];
const runners = [];
const runnerStorageKey = "trackLapTimer.runners";
const raceStorageKey = "trackLapTimer.races";
const defaultRaces = [
  { id: "1600", name: "1600 Meter" },
  { id: "800", name: "800 Meter" },
  { id: "3200", name: "3200 Meter" },
];
let races = loadRaces();

if (races.length === 0) {
  races = defaultRaces.slice();
}

if (races.length > 0) {
  activeRaceId = races[0].id;
}

const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");
const raceSelect = document.getElementById("raceSelect");
const runnerNameInput = document.getElementById("runnerNameInput");
const addRunnerButton = document.getElementById("addRunnerButton");
const runnerList = document.getElementById("runnerList");
const raceNameInput = document.getElementById("raceNameInput");
const addRaceButton = document.getElementById("addRaceButton");
const raceList = document.getElementById("raceList");
const meetRunnerSelect = document.getElementById("meetRunnerSelect");
const meetRaceSelect = document.getElementById("meetRaceSelect");
const meetHeatInput = document.getElementById("meetHeatInput");
const assignRunnerButton = document.getElementById("assignRunnerButton");
const meetAssignments = document.getElementById("meetAssignments");
const runnerButtonsContainer = document.getElementById("runnerButtons");
const resultsBody = document.getElementById("resultsBody");
const summaryStats = document.getElementById("summaryStats");
const summaryChart = document.getElementById("summaryChart");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
let activeTab = "runners";

function formatTime(milliseconds) {
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((milliseconds % 1000) / 10);

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0") +
    "." +
    String(hundredths).padStart(2, "0")
  );
}

function loadRaces() {
  const savedRaces = localStorage.getItem(raceStorageKey);

  if (!savedRaces) {
    return [];
  }

  try {
    const parsedRaces = JSON.parse(savedRaces);

    if (!Array.isArray(parsedRaces)) {
      return [];
    }

    return parsedRaces.filter((race) => race && typeof race.id === "string" && typeof race.name === "string");
  } catch {
    localStorage.removeItem(raceStorageKey);
    return [];
  }
}

function saveRaces() {
  localStorage.setItem(raceStorageKey, JSON.stringify(races));
}

function saveRunners() {
  const roster = runners.map((runner) => ({
    id: runner.id,
    name: runner.name,
    raceId: runner.raceId,
    heatNumber: runner.heatNumber,
  }));

  localStorage.setItem(runnerStorageKey, JSON.stringify(roster));
}

function loadRunners() {
  const savedRunners = localStorage.getItem(runnerStorageKey);

  if (!savedRunners) {
    return;
  }

  try {
    const parsedRunners = JSON.parse(savedRunners);

    if (!Array.isArray(parsedRunners)) {
      return;
    }

    parsedRunners.forEach((savedRunner) => {
      if (!savedRunner || typeof savedRunner.name !== "string") {
        return;
      }

      const runnerId = Number.isInteger(savedRunner.id) ? savedRunner.id : nextRunnerId;
      const raceId = races.some((race) => race.id === savedRunner.raceId) ? savedRunner.raceId : null;
      runners.push({
        id: runnerId,
        name: savedRunner.name,
        raceId,
        heatNumber: Number.isInteger(savedRunner.heatNumber) ? savedRunner.heatNumber : null,
        laps: [],
        finished: false,
        finishTime: null,
      });
      nextRunnerId = Math.max(nextRunnerId, runnerId + 1);
    });
  } catch {
    localStorage.removeItem(runnerStorageKey);
  }
}

function updateTimer() {
  const now = Date.now();
  elapsedTime = now - startTime;
  timerDisplay.textContent = formatTime(elapsedTime);
}

function getActiveRaceHeatKey(raceId, heatNumber) {
  return `${raceId}::${heatNumber}`;
}

function parseRaceHeatKey(value) {
  const [raceId, heatValue] = value.split("::");
  const heatNumber = Number.parseInt(heatValue, 10);

  if (!raceId || !Number.isInteger(heatNumber)) {
    return null;
  }

  return { raceId, heatNumber };
}

function createRunnerCard(runner) {
  const card = document.createElement("div");
  card.className = "runner-card";
  const isAssignedToActiveRaceHeat = runner.raceId === activeRaceId && runner.heatNumber === activeHeatNumber;
  const isUnassigned = runner.raceId === null || runner.heatNumber === null;

  if (!isAssignedToActiveRaceHeat && !isUnassigned) {
    card.classList.add("inactive");
  }
  if (runner.finished) {
    card.classList.add("finished");
  }

  const label = document.createElement("div");
  label.className = "runner-label";
  label.textContent = runner.name;

  const actions = document.createElement("div");
  actions.className = "runner-card-actions";

  const lapButton = document.createElement("button");
  lapButton.className = "runner-button lap-button";
  lapButton.type = "button";
  lapButton.textContent = "Lap";
  lapButton.disabled = runner.finished || startTime === null || (!isAssignedToActiveRaceHeat && !isUnassigned);
  lapButton.addEventListener("click", () => recordLap(runner.id));

  const finishButton = document.createElement("button");
  finishButton.className = "runner-button finish-button";
  finishButton.type = "button";
  finishButton.textContent = runner.finished ? "Finished" : "Finish";
  finishButton.disabled = runner.finished || startTime === null || (!isAssignedToActiveRaceHeat && !isUnassigned);
  finishButton.addEventListener("click", () => finishRunner(runner.id));

  card.appendChild(label);
  actions.appendChild(lapButton);
  actions.appendChild(finishButton);
  card.appendChild(actions);

  return card;
}

function renderRunnerList() {
  runnerList.innerHTML = "";

  if (runners.length === 0) {
    runnerList.innerHTML = '<p class="empty-state">Add a runner above to build the roster.</p>';
    return;
  }

  runners.forEach((runner) => {
    const item = document.createElement("div");
    item.className = "runner-list-item";
    item.textContent = runner.name;
    runnerList.appendChild(item);
  });
}

function renderRunnerButtons() {
  runnerButtonsContainer.innerHTML = "";

  if (runners.length === 0) {
    runnerButtonsContainer.innerHTML = '<p class="empty-state">Add runners in the Meet tab.</p>';
    return;
  }

  runners.forEach((runner) => {
    runnerButtonsContainer.appendChild(createRunnerCard(runner));
  });
}

function renderTimerOptions() {
  const previousValue = raceSelect.value;
  const options = races
    .flatMap((race) =>
      timerHeats.map((heatNumber) => {
        const value = getActiveRaceHeatKey(race.id, heatNumber);
        return `<option value="${value}">${race.name} Heat ${heatNumber}</option>`;
      })
    )
    .join("");

  raceSelect.innerHTML = options;

  const fallbackValue = getActiveRaceHeatKey(races[0].id, timerHeats[0]);
  const hasPreviousValue = Array.from(raceSelect.options).some((option) => option.value === previousValue);
  raceSelect.value = hasPreviousValue ? previousValue : fallbackValue;
  const parsed = parseRaceHeatKey(raceSelect.value);
  if (parsed) {
    activeRaceId = parsed.raceId;
    activeHeatNumber = parsed.heatNumber;
  }
}

function renderRaceList() {
  raceList.innerHTML = "";

  if (races.length === 0) {
    raceList.innerHTML = '<p class="empty-state">Add a race to begin building the meet.</p>';
    return;
  }

  races.forEach((race) => {
    const card = document.createElement("div");
    card.className = "runner-list-item race-list-item";
    card.textContent = race.name;
    raceList.appendChild(card);
  });
}

function renderMeetOptions() {
  meetRunnerSelect.innerHTML = runners.length
    ? runners.map((runner) => `<option value="${runner.id}">${runner.name}</option>`).join("")
    : '<option value="">No runners available</option>';

  meetRunnerSelect.disabled = runners.length === 0;
  assignRunnerButton.disabled = runners.length === 0 || races.length === 0;

  meetRaceSelect.innerHTML = races.length
    ? races.map((race) => `<option value="${race.id}">${race.name}</option>`).join("")
    : '<option value="">No races available</option>';

  meetRaceSelect.disabled = races.length === 0;
  meetHeatInput.disabled = races.length === 0;
}

function renderMeetAssignments() {
  meetAssignments.innerHTML = "";

  const assignedRunners = runners.filter((runner) => runner.raceId);

  if (assignedRunners.length === 0) {
    meetAssignments.innerHTML = '<p class="empty-state">Assign runners to a race and heat here.</p>';
    return;
  }

  const groupedAssignments = new Map();

  assignedRunners.forEach((runner) => {
    const race = races.find((entry) => entry.id === runner.raceId);
    const raceName = race ? race.name : "Unknown Race";
    const heatNumber = runner.heatNumber ?? 1;
    const key = `${raceName}::${heatNumber}`;

    if (!groupedAssignments.has(key)) {
      groupedAssignments.set(key, { raceName, heatNumber, runners: [] });
    }

    groupedAssignments.get(key).runners.push(runner.name);
  });

  groupedAssignments.forEach((group) => {
    const card = document.createElement("div");
    card.className = "race-summary-card";

    const details = document.createElement("div");
    details.innerHTML = `<strong>${group.raceName} - Heat ${group.heatNumber}</strong><div>${group.runners.join(", ")}</div>`;

    const count = document.createElement("div");
    count.className = "race-summary-count";
    count.textContent = group.runners.length;

    card.appendChild(details);
    card.appendChild(count);
    meetAssignments.appendChild(card);
  });
}

function renderResults() {
  resultsBody.innerHTML = "";

  runners.forEach((runner) => {
    runner.laps.forEach((lap) => {
      const row = document.createElement("tr");
      const race = races.find((entry) => entry.id === runner.raceId);
      row.innerHTML = `
        <td>${runner.name}</td>
        <td>${race ? race.name : "Unassigned"}</td>
        <td>${runner.heatNumber ?? "Unassigned"}</td>
        <td>${lap.number}</td>
        <td>${formatTime(lap.lapTime)}</td>
        <td>${formatTime(lap.totalTime)}</td>
      `;
      resultsBody.appendChild(row);
    });
  });

  renderSummary();
}

function setActiveTab(tabName) {
  activeTab = tabName;

  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function renderSummary() {
  const chartRunners = runners.filter((runner) => runner.laps.length > 0);

  if (chartRunners.length === 0) {
    summaryStats.innerHTML = '<p class="summary-empty">No lap data yet.</p>';
    summaryChart.innerHTML = '';
    return;
  }

  const allLapTimes = chartRunners.flatMap((runner) => runner.laps.map((lap) => lap.lapTime));
  const totalLapCount = allLapTimes.length;
  const fastestLap = Math.min(...allLapTimes);
  const averageLap = Math.round(allLapTimes.reduce((sum, lapTime) => sum + lapTime, 0) / totalLapCount);
  const finishedRunners = chartRunners.filter((runner) => runner.finished);
  const winner = finishedRunners.length
    ? finishedRunners.reduce((best, runner) => {
        const runnerTime = runner.finishTime ?? (runner.laps.length ? runner.laps[runner.laps.length - 1].totalTime : Infinity);
        return runnerTime < (best.finishTime ?? best.laps[best.laps.length - 1].totalTime) ? runner : best;
      })
    : null;

  summaryStats.innerHTML = `
    <div class="summary-item"><strong>Runners with Laps:</strong> ${chartRunners.length}</div>
    <div class="summary-item"><strong>Total Laps:</strong> ${totalLapCount}</div>
    <div class="summary-item"><strong>Fastest Lap:</strong> ${formatTime(fastestLap)}</div>
    <div class="summary-item"><strong>Average Lap:</strong> ${formatTime(averageLap)}</div>
    ${winner ? `<div class="summary-item"><strong>Winner:</strong> ${winner.name}</div>` : ''}
  `;

  const maxLapTime = Math.max(...allLapTimes);
  const ticks = [maxLapTime, maxLapTime * 0.75, maxLapTime * 0.5, maxLapTime * 0.25, 0];

  summaryChart.innerHTML = `
    <div class="chart-wrapper">
      <div class="chart-y-axis">
        ${ticks
          .map((tick) => `<div class="chart-tick">${formatTime(Math.round(tick))}</div>`)
          .join('')}
      </div>
      <div class="chart-grid">
        ${chartRunners
          .map((runner) => {
            return `
              <div class="runner-column">
                <div class="runner-bars">
                  ${runner.laps
                    .map((lap) => {
                      const height = maxLapTime > 0 ? Math.round((lap.lapTime / maxLapTime) * 100) : 0;
                      return `
                        <div class="lap-bar" style="height: ${height}%;">
                          <span class="lap-number">L${lap.number}</span>
                          <span class="lap-value">${formatTime(lap.lapTime)}</span>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
                <div class="runner-name">${runner.name}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function addRunner(name) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    runnerNameInput.focus();
    return;
  }

  runners.push({
    id: nextRunnerId++,
    name: trimmedName,
    raceId: null,
    heatNumber: null,
    laps: [],
    finished: false,
    finishTime: null,
  });

  saveRunners();

  runnerNameInput.value = "";
  renderRunnerList();
  renderRunnerButtons();
  renderMeetOptions();
  renderMeetAssignments();
  renderResults();
}

function recordLap(runnerId) {
  if (startTime === null) {
    return;
  }

  const runner = runners.find((entry) => entry.id === runnerId);
  if (!runner || runner.finished) {
    return;
  }

  if (runner.raceId === null || runner.heatNumber === null) {
    runner.raceId = activeRaceId;
    runner.heatNumber = activeHeatNumber;
    saveRunners();
  }

  if (runner.raceId !== activeRaceId || runner.heatNumber !== activeHeatNumber) {
    return;
  }

  const totalTime = elapsedTime;
  const previousTotal = runner.laps.length > 0 ? runner.laps[runner.laps.length - 1].totalTime : 0;
  const lapTime = totalTime - previousTotal;

  runner.laps.push({
    number: runner.laps.length + 1,
    lapTime,
    totalTime,
  });

  renderRunnerButtons();
  renderResults();
}

function finishRunner(runnerId) {
  if (startTime === null) {
    return;
  }

  const runner = runners.find((entry) => entry.id === runnerId);
  if (!runner || runner.finished) {
    return;
  }

  if (runner.raceId === null || runner.heatNumber === null) {
    runner.raceId = activeRaceId;
    runner.heatNumber = activeHeatNumber;
    saveRunners();
  }

  if (runner.raceId !== activeRaceId || runner.heatNumber !== activeHeatNumber) {
    return;
  }

  const totalTime = elapsedTime;
  const previousTotal = runner.laps.length > 0 ? runner.laps[runner.laps.length - 1].totalTime : 0;

  // Record the final lap if there's time elapsed since the last recorded lap
  if (totalTime > previousTotal) {
    const lapTime = totalTime - previousTotal;
    runner.laps.push({
      number: runner.laps.length + 1,
      lapTime,
      totalTime,
    });
  }

  runner.finished = true;
  runner.finishTime = elapsedTime;

  // Check if all runners are finished
  const allFinished = runners.every((r) => r.finished);
  if (allFinished) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  renderRunnerButtons();
  renderResults();
}

startButton.addEventListener("click", function () {
  const selectedRaceHeat = parseRaceHeatKey(raceSelect.value);

  if (selectedRaceHeat) {
    activeRaceId = selectedRaceHeat.raceId;
    activeHeatNumber = selectedRaceHeat.heatNumber;
  }

  startTime = Date.now() - elapsedTime;

  if (timerInterval === null) {
    timerInterval = setInterval(updateTimer, 10);
  }

  renderRunnerButtons();
});

stopButton.addEventListener("click", function () {
  clearInterval(timerInterval);
  timerInterval = null;
});

resetButton.addEventListener("click", function () {
  clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  elapsedTime = 0;
  timerDisplay.textContent = "00:00.00";

  runners.forEach((runner) => {
    runner.laps = [];
    runner.finished = false;
    runner.finishTime = null;
  });

  renderRunnerButtons();
  renderResults();
});

addRunnerButton.addEventListener("click", function () {
  addRunner(runnerNameInput.value);
});

addRaceButton.addEventListener("click", function () {
  const trimmedName = raceNameInput.value.trim();

  if (!trimmedName) {
    raceNameInput.focus();
    return;
  }

  const raceId = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (races.some((race) => race.id === raceId)) {
    raceNameInput.focus();
    return;
  }

  races.push({ id: raceId, name: trimmedName });
  saveRaces();
  raceNameInput.value = "";
  renderRaceList();
  renderRaceOptions();
  renderTimerOptions();
  renderMeetOptions();
});

assignRunnerButton.addEventListener("click", function () {
  const runnerId = Number.parseInt(meetRunnerSelect.value, 10);
  const selectedRaceId = meetRaceSelect.value;
  const selectedHeatNumber = Number.parseInt(meetHeatInput.value, 10) || 1;
  const runner = runners.find((entry) => entry.id === runnerId);

  if (!runner || !races.some((race) => race.id === selectedRaceId)) {
    return;
  }

  runner.raceId = selectedRaceId;
  runner.heatNumber = selectedHeatNumber;
  saveRunners();
  renderRunnerList();
  renderRunnerButtons();
  renderMeetOptions();
  renderMeetAssignments();
  renderResults();
});

tabButtons.forEach((button) => {
  button.addEventListener("click", function () {
    setActiveTab(button.dataset.tab);
  });
});

runnerNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addRunner(runnerNameInput.value);
  }
});

raceNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addRaceButton.click();
  }
});

function renderRaceOptions() {
  const options = races
  .map((race) => `<option value="${race.id}">${race.name}</option>`)
  .join("");

  meetRaceSelect.innerHTML = options;
}

raceSelect.addEventListener("change", function () {
  const selectedRaceHeat = parseRaceHeatKey(raceSelect.value);

  if (selectedRaceHeat) {
    activeRaceId = selectedRaceHeat.raceId;
    activeHeatNumber = selectedRaceHeat.heatNumber;
  }

  renderRunnerButtons();
});

loadRunners();
renderRaceOptions();
renderTimerOptions();
renderRaceList();
renderRunnerList();
renderMeetOptions();
renderMeetAssignments();
setActiveTab(activeTab);
renderRunnerButtons();
renderResults();
