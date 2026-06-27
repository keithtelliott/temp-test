let startTime = null;
let timerInterval = null;
let elapsedTime = 0;
let nextRunnerId = 1;
let activeRaceId = "1600";
let activeHeatNumber = 1;
let activeMeetId = "default-meet";
const timerHeats = [1, 2];
const runners = [];
const runnerStorageKey = "trackLapTimer.runners";
const raceStorageKey = "trackLapTimer.races";
const meetStorageKey = "trackLapTimer.meets";
const defaultRaces = [
  { id: "1600", name: "1600 Meter" },
  { id: "800", name: "800 Meter" },
  { id: "3200", name: "3200 Meter" },
];
let races = loadRaces();
let meets = loadMeets();

if (races.length === 0) {
  races = defaultRaces.slice();
}

if (races.length > 0) {
  activeRaceId = races[0].id;
}

if (meets.length === 0) {
  meets = [
    {
      id: activeMeetId,
      name: "Default Meet",
      assignments: [],
    },
  ];
}

if (!meets.some((meet) => meet.id === activeMeetId)) {
  activeMeetId = meets[0].id;
}

const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");
const timerMeetSelect = document.getElementById("timerMeetSelect");
const timerRaceSelect = document.getElementById("timerRaceSelect");
const runnerNameInput = document.getElementById("runnerNameInput");
const addRunnerButton = document.getElementById("addRunnerButton");
const runnerList = document.getElementById("runnerList");
const raceNameInput = document.getElementById("raceNameInput");
const addRaceButton = document.getElementById("addRaceButton");
const raceList = document.getElementById("raceList");
const meetNameInput = document.getElementById("meetNameInput");
const addMeetButton = document.getElementById("addMeetButton");
const meetList = document.getElementById("meetList");
const meetSelect = document.getElementById("meetSelect");
const meetRunnerSelect = document.getElementById("meetRunnerSelect");
const meetRaceSelect = document.getElementById("meetRaceSelect");
const meetHeatInput = document.getElementById("meetHeatInput");
const assignRunnerButton = document.getElementById("assignRunnerButton");
const meetAssignments = document.getElementById("meetAssignments");
const runnerButtonsContainer = document.getElementById("runnerButtons");
const timerChart = document.getElementById("timerChart");
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

function loadMeets() {
  const savedMeets = localStorage.getItem(meetStorageKey);

  if (!savedMeets) {
    return [];
  }

  try {
    const parsedMeets = JSON.parse(savedMeets);

    if (!Array.isArray(parsedMeets)) {
      return [];
    }

    return parsedMeets
      .filter((meet) => meet && typeof meet.id === "string" && typeof meet.name === "string")
      .map((meet) => ({
        id: meet.id,
        name: meet.name,
        assignments: Array.isArray(meet.assignments)
          ? meet.assignments.filter(
              (assignment) =>
                assignment &&
                Number.isInteger(assignment.runnerId) &&
                typeof assignment.raceId === "string" &&
                Number.isInteger(assignment.heatNumber)
            )
          : [],
      }));
  } catch {
    localStorage.removeItem(meetStorageKey);
    return [];
  }
}

function saveRaces() {
  localStorage.setItem(raceStorageKey, JSON.stringify(races));
}

function saveMeets() {
  localStorage.setItem(meetStorageKey, JSON.stringify(meets));
}

function getMeetById(meetId) {
  return meets.find((meet) => meet.id === meetId) || null;
}

function getActiveMeet() {
  return getMeetById(activeMeetId) || meets[0] || null;
}

function getRunnerAssignment(runnerId, meetId = activeMeetId) {
  const meet = getMeetById(meetId);
  const assignment = meet ? meet.assignments.find((entry) => entry.runnerId === runnerId) : null;

  if (assignment) {
    return assignment;
  }

  const runner = runners.find((entry) => entry.id === runnerId);

  if (runner && runner.raceId !== null && runner.heatNumber !== null) {
    return {
      runnerId,
      raceId: runner.raceId,
      heatNumber: runner.heatNumber,
      legacy: true,
    };
  }

  return null;
}

function setRunnerAssignment(runnerId, raceId, heatNumber, meetId = activeMeetId) {
  const meet = getMeetById(meetId);

  if (!meet) {
    return;
  }

  const normalizedHeatNumber = Number.isInteger(heatNumber) && heatNumber > 0 ? heatNumber : 1;
  const nextAssignment = {
    runnerId,
    raceId,
    heatNumber: normalizedHeatNumber,
  };
  const existingIndex = meet.assignments.findIndex((entry) => entry.runnerId === runnerId);

  if (existingIndex === -1) {
    meet.assignments.push(nextAssignment);
  } else {
    meet.assignments[existingIndex] = nextAssignment;
  }

  saveMeets();
}

function setActiveMeet(meetId) {
  const nextMeet = getMeetById(meetId);

  if (!nextMeet) {
    return;
  }

  activeMeetId = nextMeet.id;
  renderMeetOptions();
  renderMeetList();
  renderTimerOptions();
  renderMeetAssignments();
  renderRunnerButtons();
  renderResults();
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
  const assignment = getRunnerAssignment(runner.id);
  const isAssignedToActiveRaceHeat =
    assignment !== null && assignment.raceId === activeRaceId && assignment.heatNumber === activeHeatNumber;
  const isUnassigned = assignment === null;

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
  lapButton.disabled = runner.finished || (!isAssignedToActiveRaceHeat && !isUnassigned);
  lapButton.addEventListener("click", () => recordLap(runner.id));

  const finishButton = document.createElement("button");
  finishButton.className = "runner-button finish-button";
  finishButton.type = "button";
  finishButton.textContent = runner.finished ? "Finished" : "Finish";
  finishButton.disabled = runner.finished || (!isAssignedToActiveRaceHeat && !isUnassigned);
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
    runnerButtonsContainer.innerHTML = '<p class="empty-state">Add runners in the Runners tab.</p>';
    return;
  }

  if (!getActiveMeet()) {
    runnerButtonsContainer.innerHTML = '<p class="empty-state">Add or select a meet in the Timer tab.</p>';
    return;
  }

  runners.forEach((runner) => {
    runnerButtonsContainer.appendChild(createRunnerCard(runner));
  });

  renderTimerChart();
}

function renderTimerOptions() {
  const activeMeet = getActiveMeet();
  const meetOptions = meets
    .map((meet) => `<option value="${meet.id}">${meet.name}</option>`)
    .join("");

  timerMeetSelect.innerHTML = meetOptions || '<option value="">No meets available</option>';
  timerMeetSelect.disabled = meets.length === 0;
  timerMeetSelect.value = activeMeet ? activeMeet.id : "";

  const timerAssignments = activeMeet
    ? activeMeet.assignments
        .map((assignment) => {
          const race = races.find((entry) => entry.id === assignment.raceId);
          if (!race) {
            return null;
          }

          return {
            value: getActiveRaceHeatKey(race.id, assignment.heatNumber),
            label: `${race.name} Heat ${assignment.heatNumber}`,
            raceId: race.id,
            heatNumber: assignment.heatNumber,
            raceName: race.name,
          };
        })
        .filter(Boolean)
    : [];

  const optionSource = timerAssignments.length > 0
    ? timerAssignments
    : races.flatMap((race) =>
        timerHeats.map((heatNumber) => ({
          value: getActiveRaceHeatKey(race.id, heatNumber),
          label: `${race.name} Heat ${heatNumber}`,
          raceId: race.id,
          heatNumber,
          raceName: race.name,
        }))
      );

  timerRaceSelect.innerHTML = optionSource.length
    ? optionSource.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")
    : '<option value="">No races available</option>';

  timerRaceSelect.disabled = optionSource.length === 0;

  const currentValue = getActiveRaceHeatKey(activeRaceId, activeHeatNumber);
  const hasCurrentValue = optionSource.some((option) => option.value === currentValue);
  const fallbackValue = optionSource[0] ? optionSource[0].value : "";
  timerRaceSelect.value = hasCurrentValue ? currentValue : fallbackValue;

  const parsed = parseRaceHeatKey(timerRaceSelect.value);
  if (parsed) {
    activeRaceId = parsed.raceId;
    activeHeatNumber = parsed.heatNumber;
  }

  startButton.disabled = optionSource.length === 0;
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

function renderMeetList() {
  meetList.innerHTML = "";

  if (meets.length === 0) {
    meetList.innerHTML = '<p class="empty-state">Add a meet to organize assignments by name.</p>';
    return;
  }

  meets.forEach((meet) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "runner-list-item meet-list-item";
    if (meet.id === activeMeetId) {
      item.classList.add("active");
    }

    const assignmentCount = meet.assignments.length;
    item.innerHTML = `
      <span>${meet.name}</span>
      <small>${assignmentCount} assignment${assignmentCount === 1 ? "" : "s"}</small>
    `;

    item.addEventListener("click", () => setActiveMeet(meet.id));
    meetList.appendChild(item);
  });
}

function renderMeetOptions() {
  const activeMeet = getActiveMeet();

  meetSelect.innerHTML = meets.length
    ? meets.map((meet) => `<option value="${meet.id}">${meet.name}</option>`).join("")
    : '<option value="">No meets available</option>';
  meetSelect.disabled = meets.length === 0;
  meetSelect.value = activeMeet ? activeMeet.id : "";

  meetRunnerSelect.innerHTML = runners.length
    ? runners.map((runner) => `<option value="${runner.id}">${runner.name}</option>`).join("")
    : '<option value="">No runners available</option>';

  meetRunnerSelect.disabled = runners.length === 0;
  assignRunnerButton.disabled = runners.length === 0 || races.length === 0 || meets.length === 0;

  meetRaceSelect.innerHTML = races.length
    ? races.map((race) => `<option value="${race.id}">${race.name}</option>`).join("")
    : '<option value="">No races available</option>';

  meetRaceSelect.disabled = races.length === 0;
  meetHeatInput.disabled = races.length === 0 || meets.length === 0;
}

function renderMeetAssignments() {
  meetAssignments.innerHTML = "";

  const activeMeet = getActiveMeet();
  const assignedRunners = runners
    .map((runner) => ({ runner, assignment: getRunnerAssignment(runner.id) }))
    .filter(({ assignment }) => assignment !== null);

  if (assignedRunners.length === 0) {
    meetAssignments.innerHTML = '<p class="empty-state">Assign runners to a race and heat in the active meet.</p>';
    return;
  }

  const groupedAssignments = new Map();

  assignedRunners.forEach(({ runner, assignment }) => {
    const race = races.find((entry) => entry.id === assignment.raceId);
    const raceName = race ? race.name : "Unknown Race";
    const heatNumber = assignment.heatNumber ?? 1;
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

  if (activeMeet) {
    const heading = document.createElement("p");
    heading.className = "section-copy active-meet-note";
    heading.textContent = `Active meet: ${activeMeet.name}`;
    meetAssignments.prepend(heading);
  }
}

function renderResults() {
  resultsBody.innerHTML = "";

  runners.forEach((runner) => {
    const assignment = getRunnerAssignment(runner.id);

    if (!assignment) {
      return;
    }

    runner.laps.forEach((lap) => {
      const row = document.createElement("tr");
      const race = races.find((entry) => entry.id === assignment.raceId);
      row.innerHTML = `
        <td>${runner.name}</td>
        <td>${race ? race.name : "Unassigned"}</td>
        <td>${assignment.heatNumber ?? "Unassigned"}</td>
        <td>${lap.number}</td>
        <td>${formatTime(lap.lapTime)}</td>
        <td>${formatTime(lap.totalTime)}</td>
      `;
      resultsBody.appendChild(row);
    });
  });

  renderSummary();
  renderTimerChart();
}

function renderTimerChart() {
  if (!timerChart) return;

  const chartRunners = runners.filter((runner) => {
    const assignment = getRunnerAssignment(runner.id);
    return (
      assignment !== null &&
      assignment.raceId === activeRaceId &&
      assignment.heatNumber === activeHeatNumber &&
      runner.laps.length > 0
    );
  });

  if (chartRunners.length === 0) {
    timerChart.innerHTML = '<p class="summary-empty">No lap data for this heat yet.</p>';
    return;
  }

  const allLapTimes = chartRunners.flatMap((runner) => runner.laps.map((lap) => lap.lapTime));
  const maxLapTime = Math.max(...allLapTimes);
  const ticks = [maxLapTime, maxLapTime * 0.75, maxLapTime * 0.5, maxLapTime * 0.25, 0];

  timerChart.innerHTML = `
    <div class="summary-title">Lap Time Chart</div>
    <div class="chart-wrapper">
      <div class="chart-y-axis">
        ${ticks.map((tick) => `<div class="chart-tick">${formatTime(Math.round(tick))}</div>`).join('')}
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
                        <div class="lap-bar" style="height: ${height}%; width: 20px;">
                          <span class="lap-number">L${lap.number}</span>
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
  const chartRunners = runners.filter((runner) => runner.laps.length > 0 && getRunnerAssignment(runner.id) !== null);

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
    <div class="summary-item"><strong>Meet:</strong> ${getActiveMeet() ? getActiveMeet().name : "Unassigned"}</div>
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

function addMeet(name) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    meetNameInput.focus();
    return;
  }

  const meetId = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (meets.some((meet) => meet.id === meetId)) {
    meetNameInput.focus();
    return;
  }

  meets.push({ id: meetId, name: trimmedName, assignments: [] });
  saveMeets();
  meetNameInput.value = "";
  setActiveMeet(meetId);
  renderMeetList();
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

  const assignment = getRunnerAssignment(runner.id);

  if (assignment === null) {
    setRunnerAssignment(runner.id, activeRaceId, activeHeatNumber);
  }

  const activeAssignment = getRunnerAssignment(runner.id);

  if (!activeAssignment || activeAssignment.raceId !== activeRaceId || activeAssignment.heatNumber !== activeHeatNumber) {
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

  const assignment = getRunnerAssignment(runner.id);

  if (assignment === null) {
    setRunnerAssignment(runner.id, activeRaceId, activeHeatNumber);
  }

  const activeAssignment = getRunnerAssignment(runner.id);

  if (!activeAssignment || activeAssignment.raceId !== activeRaceId || activeAssignment.heatNumber !== activeHeatNumber) {
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

  const activeHeatHasRemainingRunners = runners.some((entry) => {
    const entryAssignment = getRunnerAssignment(entry.id);

    return (
      entryAssignment !== null &&
      entryAssignment.raceId === activeRaceId &&
      entryAssignment.heatNumber === activeHeatNumber &&
      !entry.finished
    );
  });

  if (!activeHeatHasRemainingRunners) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  renderRunnerButtons();
  renderResults();
}

startButton.addEventListener("click", function () {
  const selectedRaceHeat = parseRaceHeatKey(timerRaceSelect.value);

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

addMeetButton.addEventListener("click", function () {
  addMeet(meetNameInput.value);
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

timerMeetSelect.addEventListener("change", function () {
  setActiveMeet(timerMeetSelect.value);
});

timerRaceSelect.addEventListener("change", function () {
  const selectedRaceHeat = parseRaceHeatKey(timerRaceSelect.value);

  if (selectedRaceHeat) {
    activeRaceId = selectedRaceHeat.raceId;
    activeHeatNumber = selectedRaceHeat.heatNumber;
  }

  renderRunnerButtons();
});

assignRunnerButton.addEventListener("click", function () {
  const runnerId = Number.parseInt(meetRunnerSelect.value, 10);
  const selectedRaceId = meetRaceSelect.value;
  const selectedHeatNumber = Number.parseInt(meetHeatInput.value, 10) || 1;
  const runner = runners.find((entry) => entry.id === runnerId);

  if (!runner || !races.some((race) => race.id === selectedRaceId) || !getActiveMeet()) {
    return;
  }

  setRunnerAssignment(runner.id, selectedRaceId, selectedHeatNumber);
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

meetSelect.addEventListener("change", function () {
  setActiveMeet(meetSelect.value);
});

runnerNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addRunner(runnerNameInput.value);
  }
});

meetNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addMeet(meetNameInput.value);
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

loadRunners();
renderRaceOptions();
renderTimerOptions();
renderRaceList();
renderMeetList();
renderRunnerList();
renderMeetOptions();
renderMeetAssignments();
setActiveTab(activeTab);
renderRunnerButtons();
renderResults();
