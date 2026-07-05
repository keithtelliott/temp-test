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
const resultStorageKey = "trackLapTimer.results";
const defaultRaces = [
  { id: "1600", name: "1600 Meter" },
  { id: "800", name: "800 Meter" },
  { id: "3200", name: "3200 Meter" },
];
let races = loadRaces();
let meets = loadMeets();
let results = loadResults();

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
      roster: [],
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
const addRunnerToMeetButton = document.getElementById("addRunnerToMeetButton");
const meetRosterList = document.getElementById("meetRosterList");
const meetAssignmentRunnerSelect = document.getElementById("meetAssignmentRunnerSelect");
const meetRaceSelect = document.getElementById("meetRaceSelect");
const meetHeatInput = document.getElementById("meetHeatInput");
const assignRunnerButton = document.getElementById("assignRunnerButton");
const meetAssignments = document.getElementById("meetAssignments");
const runnerButtonsContainer = document.getElementById("runnerButtons");
const timerChart = document.getElementById("timerChart");
const summaryStats = document.getElementById("summaryStats");
const summaryChart = document.getElementById("summaryChart");
const resultsMeetFilter = document.getElementById("resultsMeetFilter");
const resultsRaceFilter = document.getElementById("resultsRaceFilter");
const resultsHeatFilter = document.getElementById("resultsHeatFilter");
const resultsSessionFilter = document.getElementById("resultsSessionFilter");
const resultsActionMessage = document.getElementById("resultsActionMessage");
const resultsContext = document.getElementById("resultsContext");
const groupedResults = document.getElementById("groupedResults");
const exportResultsButton = document.getElementById("exportResultsButton");
const clearResultsScopeButton = document.getElementById("clearResultsScopeButton");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
let activeTab = "runners";
const ALL_RACES_OPTION = "__all_races__";
const ALL_HEATS_OPTION = "__all_heats__";
const ALL_SESSIONS_OPTION = "__all_sessions__";
const LATEST_SESSION_OPTION = "__latest_session__";
let resultsMeetFilterValue = activeMeetId;
let resultsRaceFilterValue = ALL_RACES_OPTION;
let resultsHeatFilterValue = ALL_HEATS_OPTION;
let resultsSessionFilterValue = LATEST_SESSION_OPTION;
let currentResultSessionId = null;

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

function createResultSessionId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getScopedResultsWithoutSessionFilter() {
  return results.filter((entry) => {
    const matchesMeet = !resultsMeetFilterValue || entry.meetId === resultsMeetFilterValue;
    const matchesRace = resultsRaceFilterValue === ALL_RACES_OPTION || entry.raceId === resultsRaceFilterValue;
    const matchesHeat =
      resultsHeatFilterValue === ALL_HEATS_OPTION || entry.heatNumber === Number.parseInt(resultsHeatFilterValue, 10);
    return matchesMeet && matchesRace && matchesHeat;
  });
}

function getLatestSessionIdForScope() {
  const scopedResults = getScopedResultsWithoutSessionFilter();

  if (scopedResults.length === 0) {
    return null;
  }

  const latestEntry = scopedResults.reduce((latest, entry) => {
    if (!latest) {
      return entry;
    }

    return new Date(entry.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? entry : latest;
  }, null);

  return latestEntry ? latestEntry.sessionId : null;
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
      .map((meet) => {
        const assignments = Array.isArray(meet.assignments)
          ? meet.assignments.filter(
              (assignment) =>
                assignment &&
                Number.isInteger(assignment.runnerId) &&
                typeof assignment.raceId === "string" &&
                Number.isInteger(assignment.heatNumber)
            )
          : [];
        const roster = Array.isArray(meet.roster)
          ? meet.roster.filter((runnerId) => Number.isInteger(runnerId))
          : [];
        const assignmentRoster = assignments.map((assignment) => assignment.runnerId).filter((runnerId) => Number.isInteger(runnerId));

        return {
          id: meet.id,
          name: meet.name,
          roster: [...new Set([...roster, ...assignmentRoster])],
          assignments,
        };
      });
  } catch {
    localStorage.removeItem(meetStorageKey);
    return [];
  }
}

function loadResults() {
  const savedResults = localStorage.getItem(resultStorageKey);

  if (!savedResults) {
    return [];
  }

  try {
    const parsedResults = JSON.parse(savedResults);

    if (!Array.isArray(parsedResults)) {
      return [];
    }

    return parsedResults
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.meetId === "string" &&
          typeof entry.raceId === "string" &&
          Number.isInteger(entry.heatNumber) &&
          Number.isInteger(entry.runnerId) &&
          typeof entry.runnerName === "string" &&
          Number.isInteger(entry.lapNumber) &&
          Number.isInteger(entry.lapTime) &&
          Number.isInteger(entry.totalTime) &&
          typeof entry.recordedAt === "string"
      )
      .map((entry) => ({
        id: entry.id,
        meetId: entry.meetId,
        raceId: entry.raceId,
        heatNumber: entry.heatNumber,
        sessionId:
          typeof entry.sessionId === "string" && entry.sessionId
            ? entry.sessionId
            : `legacy-${entry.meetId}-${entry.raceId}-${entry.heatNumber}`,
        runnerId: entry.runnerId,
        runnerName: entry.runnerName,
        lapNumber: entry.lapNumber,
        lapTime: entry.lapTime,
        totalTime: entry.totalTime,
        recordedAt: entry.recordedAt,
        isFinishLap: Boolean(entry.isFinishLap),
      }));
  } catch {
    localStorage.removeItem(resultStorageKey);
    return [];
  }
}

function saveRaces() {
  localStorage.setItem(raceStorageKey, JSON.stringify(races));
}

function saveMeets() {
  localStorage.setItem(meetStorageKey, JSON.stringify(meets));
}

function saveResults() {
  localStorage.setItem(resultStorageKey, JSON.stringify(results));
}

function getRaceNameById(raceId) {
  const race = races.find((entry) => entry.id === raceId);
  return race ? race.name : "Unknown Race";
}

function getMeetNameById(meetId) {
  const meet = getMeetById(meetId);
  return meet ? meet.name : "Unknown Meet";
}

function appendResultRecord({
  meetId,
  raceId,
  heatNumber,
  sessionId,
  runnerId,
  runnerName,
  lapNumber,
  lapTime,
  totalTime,
  isFinishLap = false,
}) {
  if (
    typeof meetId !== "string" ||
    typeof raceId !== "string" ||
    !Number.isInteger(heatNumber) ||
    typeof sessionId !== "string" ||
    !Number.isInteger(runnerId) ||
    typeof runnerName !== "string" ||
    !Number.isInteger(lapNumber) ||
    !Number.isInteger(lapTime) ||
    !Number.isInteger(totalTime)
  ) {
    return;
  }

  const timestamp = new Date().toISOString();
  results.push({
    id: `${timestamp}-${runnerId}-${lapNumber}`,
    meetId,
    raceId,
    heatNumber,
    sessionId,
    runnerId,
    runnerName,
    lapNumber,
    lapTime,
    totalTime,
    recordedAt: timestamp,
    isFinishLap,
  });
  saveResults();
}

function getResultsInScope() {
  const latestSessionId = getLatestSessionIdForScope();

  return getScopedResultsWithoutSessionFilter()
    .filter((entry) => {
      if (resultsSessionFilterValue === ALL_SESSIONS_OPTION) {
        return true;
      }

      if (resultsSessionFilterValue === LATEST_SESSION_OPTION) {
        return latestSessionId !== null && entry.sessionId === latestSessionId;
      }

      return entry.sessionId === resultsSessionFilterValue;
    })
    .sort((a, b) => {
      if (a.raceId !== b.raceId) {
        return getRaceNameById(a.raceId).localeCompare(getRaceNameById(b.raceId));
      }

      if (a.heatNumber !== b.heatNumber) {
        return a.heatNumber - b.heatNumber;
      }

      if (a.runnerName !== b.runnerName) {
        return a.runnerName.localeCompare(b.runnerName);
      }

      return a.lapNumber - b.lapNumber;
    });
}

function getMeetById(meetId) {
  return meets.find((meet) => meet.id === meetId) || null;
}

function getActiveMeet() {
  return getMeetById(activeMeetId) || meets[0] || null;
}

function getMeetRoster(meetId = activeMeetId) {
  const meet = getMeetById(meetId);

  if (!meet) {
    return [];
  }

  return meet.roster
    .map((runnerId) => runners.find((runner) => runner.id === runnerId))
    .filter(Boolean);
}

function isRunnerInMeet(runnerId, meetId = activeMeetId) {
  const meet = getMeetById(meetId);

  return meet ? meet.roster.includes(runnerId) : false;
}

function addRunnerToMeet(runnerId, meetId = activeMeetId) {
  const meet = getMeetById(meetId);

  if (!meet || !Number.isInteger(runnerId)) {
    return false;
  }

  if (!meet.roster.includes(runnerId)) {
    meet.roster.push(runnerId);
    saveMeets();
    return true;
  }

  return false;
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

  addRunnerToMeet(runnerId, meetId);

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
  resultsMeetFilterValue = nextMeet.id;
  resultsRaceFilterValue = ALL_RACES_OPTION;
  resultsHeatFilterValue = ALL_HEATS_OPTION;
  resultsSessionFilterValue = LATEST_SESSION_OPTION;
  renderMeetOptions();
  renderMeetList();
  renderMeetRoster();
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

  const runnersForActiveHeat = runners.filter((runner) => {
    const assignment = getRunnerAssignment(runner.id);

    return (
      assignment !== null &&
      assignment.raceId === activeRaceId &&
      assignment.heatNumber === activeHeatNumber
    );
  });

  if (runnersForActiveHeat.length === 0) {
    runnerButtonsContainer.innerHTML = '<p class="empty-state">No runners are assigned to this meet and race heat yet.</p>';
    renderTimerChart();
    return;
  }

  runnersForActiveHeat.forEach((runner) => {
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
    ? Array.from(
        new Map(
          activeMeet.assignments
            .map((assignment) => {
              const race = races.find((entry) => entry.id === assignment.raceId);
              if (!race) {
                return null;
              }

              const value = getActiveRaceHeatKey(race.id, assignment.heatNumber);

              return [
                value,
                {
                  value,
                  label: `${race.name} Heat ${assignment.heatNumber}`,
                  raceId: race.id,
                  heatNumber: assignment.heatNumber,
                  raceName: race.name,
                },
              ];
            })
            .filter(Boolean)
        ).values()
      )
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

    const rosterCount = Array.isArray(meet.roster) ? meet.roster.length : 0;
    const assignmentCount = meet.assignments.length;
    item.innerHTML = `
      <span>${meet.name}</span>
      <small>${rosterCount} rostered, ${assignmentCount} placement${assignmentCount === 1 ? "" : "s"}</small>
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
  addRunnerToMeetButton.disabled = runners.length === 0 || meets.length === 0;

  const rosteredRunners = activeMeet ? getMeetRoster(activeMeet.id) : [];
  meetAssignmentRunnerSelect.innerHTML = rosteredRunners.length
    ? rosteredRunners.map((runner) => `<option value="${runner.id}">${runner.name}</option>`).join("")
    : '<option value="">No rostered runners</option>';

  meetAssignmentRunnerSelect.disabled = rosteredRunners.length === 0;
  assignRunnerButton.disabled = rosteredRunners.length === 0 || races.length === 0 || meets.length === 0;

  meetRaceSelect.innerHTML = races.length
    ? races.map((race) => `<option value="${race.id}">${race.name}</option>`).join("")
    : '<option value="">No races available</option>';

  meetRaceSelect.disabled = races.length === 0;
  meetHeatInput.disabled = races.length === 0 || meets.length === 0;
}

function renderMeetRoster() {
  meetRosterList.innerHTML = "";

  const activeMeet = getActiveMeet();
  const rosteredRunners = activeMeet ? getMeetRoster(activeMeet.id) : [];

  if (rosteredRunners.length === 0) {
    meetRosterList.innerHTML = '<p class="empty-state meet-roster-empty">Add runners to this meet to build the roster.</p>';
    return;
  }

  rosteredRunners.forEach((runner) => {
    const chip = document.createElement("div");
    chip.className = "meet-roster-item";
    chip.textContent = runner.name;
    meetRosterList.appendChild(chip);
  });
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

function renderResultsFilters() {
  const meetOptions = meets.length
    ? meets.map((meet) => `<option value="${meet.id}">${meet.name}</option>`).join("")
    : '<option value="">No meets available</option>';

  resultsMeetFilter.innerHTML = meetOptions;

  if (!meets.some((meet) => meet.id === resultsMeetFilterValue)) {
    resultsMeetFilterValue = getActiveMeet() ? getActiveMeet().id : (meets[0] ? meets[0].id : "");
  }

  resultsMeetFilter.value = resultsMeetFilterValue;
  resultsMeetFilter.disabled = meets.length === 0;

  const scopedRaceIds = new Set(
    results
      .filter((entry) => !resultsMeetFilterValue || entry.meetId === resultsMeetFilterValue)
      .map((entry) => entry.raceId)
  );

  races.forEach((race) => {
    scopedRaceIds.add(race.id);
  });

  const sortedRaceIds = Array.from(scopedRaceIds).sort((a, b) => getRaceNameById(a).localeCompare(getRaceNameById(b)));

  const raceOptions = [
    `<option value="${ALL_RACES_OPTION}">All Races</option>`,
    ...sortedRaceIds.map((raceId) => `<option value="${raceId}">${getRaceNameById(raceId)}</option>`),
  ];

  resultsRaceFilter.innerHTML = raceOptions.join("");
  if (!Array.from(scopedRaceIds).includes(resultsRaceFilterValue)) {
    resultsRaceFilterValue = ALL_RACES_OPTION;
  }
  resultsRaceFilter.value = resultsRaceFilterValue;

  const scopedHeats = Array.from(
    new Set(
      results
        .filter((entry) => {
          const matchesMeet = !resultsMeetFilterValue || entry.meetId === resultsMeetFilterValue;
          const matchesRace = resultsRaceFilterValue === ALL_RACES_OPTION || entry.raceId === resultsRaceFilterValue;
          return matchesMeet && matchesRace;
        })
        .map((entry) => entry.heatNumber)
    )
  ).sort((a, b) => a - b);

  const heatOptions = [
    `<option value="${ALL_HEATS_OPTION}">All Heats</option>`,
    ...scopedHeats.map((heat) => `<option value="${heat}">Heat ${heat}</option>`),
  ];

  resultsHeatFilter.innerHTML = heatOptions.join("");
  if (resultsHeatFilterValue !== ALL_HEATS_OPTION && !scopedHeats.includes(Number.parseInt(resultsHeatFilterValue, 10))) {
    resultsHeatFilterValue = ALL_HEATS_OPTION;
  }
  resultsHeatFilter.value = resultsHeatFilterValue;

  const scopedResults = getScopedResultsWithoutSessionFilter();
  const scopedSessionIds = Array.from(new Set(scopedResults.map((entry) => entry.sessionId)));
  const sortedSessionIds = scopedSessionIds.sort((a, b) => {
    const aRecordedAt = scopedResults.find((entry) => entry.sessionId === a)?.recordedAt;
    const bRecordedAt = scopedResults.find((entry) => entry.sessionId === b)?.recordedAt;
    return new Date(bRecordedAt || 0).getTime() - new Date(aRecordedAt || 0).getTime();
  });

  const sessionOptions = [
    `<option value="${LATEST_SESSION_OPTION}">Latest Run</option>`,
    `<option value="${ALL_SESSIONS_OPTION}">All Runs</option>`,
    ...sortedSessionIds.map((sessionId) => {
      const sessionEntry = scopedResults.find((entry) => entry.sessionId === sessionId);
      const timestamp = sessionEntry ? new Date(sessionEntry.recordedAt) : null;
      const runLabel = timestamp ? timestamp.toLocaleString() : sessionId;
      return `<option value="${sessionId}">${runLabel}</option>`;
    }),
  ];

  resultsSessionFilter.innerHTML = sessionOptions.join("");
  if (
    resultsSessionFilterValue !== LATEST_SESSION_OPTION &&
    resultsSessionFilterValue !== ALL_SESSIONS_OPTION &&
    !sortedSessionIds.includes(resultsSessionFilterValue)
  ) {
    resultsSessionFilterValue = LATEST_SESSION_OPTION;
  }
  resultsSessionFilter.value = resultsSessionFilterValue;
  resultsSessionFilter.disabled = sortedSessionIds.length === 0;
}

function renderResultsContext(filteredResults) {
  if (!resultsMeetFilterValue) {
    resultsContext.innerHTML = '<p class="summary-empty">Add a meet to start capturing results.</p>';
    return;
  }

  const meetName = getMeetNameById(resultsMeetFilterValue);
  const raceLabel =
    resultsRaceFilterValue === ALL_RACES_OPTION ? "All Races" : getRaceNameById(resultsRaceFilterValue);
  const heatLabel =
    resultsHeatFilterValue === ALL_HEATS_OPTION ? "All Heats" : `Heat ${resultsHeatFilterValue}`;
  const runLabel =
    resultsSessionFilterValue === LATEST_SESSION_OPTION
      ? "Latest Run"
      : resultsSessionFilterValue === ALL_SESSIONS_OPTION
        ? "All Runs"
        : "Selected Run";

  resultsContext.innerHTML = `
    <div class="results-chip"><strong>Meet:</strong> ${meetName}</div>
    <div class="results-chip"><strong>Race:</strong> ${raceLabel}</div>
    <div class="results-chip"><strong>Heat:</strong> ${heatLabel}</div>
    <div class="results-chip"><strong>Run:</strong> ${runLabel}</div>
    <div class="results-chip"><strong>Laps:</strong> ${filteredResults.length}</div>
  `;
}

function renderResultsSummary(filteredResults) {
  if (filteredResults.length === 0) {
    summaryStats.innerHTML = '<p class="summary-empty">No saved laps in this scope yet.</p>';
    summaryChart.innerHTML = '<p class="summary-empty">No lap data to chart in this scope.</p>';
    return;
  }

  const fastestLap = Math.min(...filteredResults.map((entry) => entry.lapTime));
  const averageLap = Math.round(
    filteredResults.reduce((sum, entry) => sum + entry.lapTime, 0) / filteredResults.length
  );
  const runnerGroups = new Map();

  filteredResults.forEach((entry) => {
    if (!runnerGroups.has(entry.runnerId)) {
      runnerGroups.set(entry.runnerId, {
        runnerName: entry.runnerName,
        laps: [],
      });
    }

    runnerGroups.get(entry.runnerId).laps.push(entry);
  });

  const runnersWithLaps = runnerGroups.size;
  const finishEntries = filteredResults.filter((entry) => entry.isFinishLap);
  const winnerCandidate = finishEntries.reduce((best, entry) => {
    if (!best || entry.totalTime < best.finishTime) {
      return { runnerName: entry.runnerName, finishTime: entry.totalTime };
    }

    return best;
  }, null);

  summaryStats.innerHTML = `
    <div class="summary-item"><strong>Runners with Laps:</strong> ${runnersWithLaps}</div>
    <div class="summary-item"><strong>Total Laps:</strong> ${filteredResults.length}</div>
    <div class="summary-item"><strong>Fastest Lap:</strong> ${formatTime(fastestLap)}</div>
    <div class="summary-item"><strong>Average Lap:</strong> ${formatTime(averageLap)}</div>
    ${winnerCandidate ? `<div class="summary-item"><strong>Fastest Finish:</strong> ${winnerCandidate.runnerName} (${formatTime(winnerCandidate.finishTime)})</div>` : '<div class="summary-item"><strong>Fastest Finish:</strong> No finished runners in this scope.</div>'}
  `;

  const maxLapTime = Math.max(...filteredResults.map((entry) => entry.lapTime));
  const ticks = [maxLapTime, maxLapTime * 0.75, maxLapTime * 0.5, maxLapTime * 0.25, 0];
  const runnerCharts = Array.from(runnerGroups.values());

  summaryChart.innerHTML = `
    <div class="chart-wrapper">
      <div class="chart-y-axis">
        ${ticks.map((tick) => `<div class="chart-tick">${formatTime(Math.round(tick))}</div>`).join("")}
      </div>
      <div class="chart-grid">
        ${runnerCharts
          .map((runner) => `
            <div class="runner-column">
              <div class="runner-bars">
                ${runner.laps
                  .slice()
                  .sort((a, b) => a.lapNumber - b.lapNumber)
                  .map((lap) => {
                    const height = maxLapTime > 0 ? Math.round((lap.lapTime / maxLapTime) * 100) : 0;
                    return `
                      <div class="lap-bar" style="height: ${height}%">
                        <span class="lap-number">L${lap.lapNumber}</span>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
              <div class="runner-name">${runner.runnerName}</div>
            </div>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function renderGroupedResults(filteredResults) {
  groupedResults.innerHTML = "";

  if (filteredResults.length === 0) {
    groupedResults.innerHTML = '<p class="empty-state">No saved laps for this meet/race/heat scope yet.</p>';
    return;
  }

  const raceGroups = new Map();

  filteredResults.forEach((entry) => {
    const raceKey = entry.raceId;
    const heatKey = String(entry.heatNumber);

    if (!raceGroups.has(raceKey)) {
      raceGroups.set(raceKey, new Map());
    }

    const heatMap = raceGroups.get(raceKey);
    if (!heatMap.has(heatKey)) {
      heatMap.set(heatKey, []);
    }

    heatMap.get(heatKey).push(entry);
  });

  Array.from(raceGroups.entries())
    .sort((a, b) => getRaceNameById(a[0]).localeCompare(getRaceNameById(b[0])))
    .forEach(([raceId, heatMap]) => {
      const raceSection = document.createElement("article");
      raceSection.className = "results-race-group";
      raceSection.innerHTML = `<h3>${getRaceNameById(raceId)}</h3>`;

      Array.from(heatMap.entries())
        .sort((a, b) => Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10))
        .forEach(([heatNumber, entries]) => {
          const heatSection = document.createElement("section");
          heatSection.className = "results-heat-group";
          heatSection.innerHTML = `
            <h4>Heat ${heatNumber}</h4>
            <table>
              <thead>
                <tr>
                  <th>Runner</th>
                  <th>Lap</th>
                  <th>Lap Time</th>
                  <th>Total Time</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                ${entries
                  .slice()
                  .sort((a, b) => {
                    if (a.runnerName !== b.runnerName) {
                      return a.runnerName.localeCompare(b.runnerName);
                    }
                    return a.lapNumber - b.lapNumber;
                  })
                  .map(
                    (entry) => `
                      <tr>
                        <td>${entry.runnerName}</td>
                        <td>${entry.lapNumber}${entry.isFinishLap ? " (finish)" : ""}</td>
                        <td>${formatTime(entry.lapTime)}</td>
                        <td>${formatTime(entry.totalTime)}</td>
                        <td>${new Date(entry.recordedAt).toLocaleTimeString()}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          `;

          raceSection.appendChild(heatSection);
        });

      groupedResults.appendChild(raceSection);
    });
}

function renderResults() {
  renderResultsFilters();
  const filteredResults = getResultsInScope();
  const hasResults = filteredResults.length > 0;
  exportResultsButton.disabled = !hasResults;
  clearResultsScopeButton.disabled = !hasResults;

  if (hasResults) {
    resultsActionMessage.textContent = "";
  }

  renderResultsContext(filteredResults);
  renderResultsSummary(filteredResults);
  renderGroupedResults(filteredResults);
}

function getResultsScopeLabel() {
  const meetLabel = resultsMeetFilterValue ? getMeetNameById(resultsMeetFilterValue) : "all-meets";
  const raceLabel =
    resultsRaceFilterValue === ALL_RACES_OPTION ? "all-races" : getRaceNameById(resultsRaceFilterValue);
  const heatLabel = resultsHeatFilterValue === ALL_HEATS_OPTION ? "all-heats" : `heat-${resultsHeatFilterValue}`;
  const runLabel =
    resultsSessionFilterValue === LATEST_SESSION_OPTION
      ? "latest-run"
      : resultsSessionFilterValue === ALL_SESSIONS_OPTION
        ? "all-runs"
        : "selected-run";

  return `${meetLabel}-${raceLabel}-${heatLabel}-${runLabel}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");

  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function exportResultsScope() {
  const scopedResults = getResultsInScope();

  if (scopedResults.length === 0) {
    resultsActionMessage.textContent = "No saved laps in this scope to export.";
    return;
  }

  const header = ["meet", "race", "heat", "runner", "lap", "lap_time", "total_time", "recorded_at"];
  const rows = scopedResults.map((entry) => [
    getMeetNameById(entry.meetId),
    getRaceNameById(entry.raceId),
    entry.heatNumber,
    entry.runnerName,
    entry.lapNumber,
    formatTime(entry.lapTime),
    formatTime(entry.totalTime),
    entry.recordedAt,
  ]);

  const csvLines = [header, ...rows].map((line) => line.map(escapeCsvValue).join(","));
  const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const fileName = `results-${getResultsScopeLabel()}.csv`;
  const url = URL.createObjectURL(csvBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  resultsActionMessage.textContent = `Exported ${scopedResults.length} lap${scopedResults.length === 1 ? "" : "s"} for this scope.`;
}

function clearResultsScope() {
  const scopedResults = getResultsInScope();

  if (scopedResults.length === 0) {
    resultsActionMessage.textContent = "No saved laps in this scope to clear.";
    return;
  }

  const meetLabel = resultsMeetFilterValue ? getMeetNameById(resultsMeetFilterValue) : "All Meets";
  const raceLabel = resultsRaceFilterValue === ALL_RACES_OPTION ? "All Races" : getRaceNameById(resultsRaceFilterValue);
  const heatLabel = resultsHeatFilterValue === ALL_HEATS_OPTION ? "All Heats" : `Heat ${resultsHeatFilterValue}`;
  const runLabel =
    resultsSessionFilterValue === LATEST_SESSION_OPTION
      ? "Latest Run"
      : resultsSessionFilterValue === ALL_SESSIONS_OPTION
        ? "All Runs"
        : "Selected Run";

  const confirmed = window.confirm(
    `Delete ${scopedResults.length} saved lap${scopedResults.length === 1 ? "" : "s"} for ${meetLabel} / ${raceLabel} / ${heatLabel} / ${runLabel}?`
  );

  if (!confirmed) {
    resultsActionMessage.textContent = "Clear cancelled.";
    return;
  }

  const scopedIds = new Set(scopedResults.map((entry) => entry.id));
  results = results.filter((entry) => !scopedIds.has(entry.id));
  saveResults();
  resultsActionMessage.textContent = `Cleared ${scopedResults.length} lap${scopedResults.length === 1 ? "" : "s"} from this scope.`;
  renderResults();
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

  meets.push({ id: meetId, name: trimmedName, roster: [], assignments: [] });
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

  const latestLap = runner.laps[runner.laps.length - 1];
  if (!currentResultSessionId) {
    currentResultSessionId = createResultSessionId();
  }

  appendResultRecord({
    meetId: activeMeetId,
    raceId: activeAssignment.raceId,
    heatNumber: activeAssignment.heatNumber,
    sessionId: currentResultSessionId,
    runnerId: runner.id,
    runnerName: runner.name,
    lapNumber: latestLap.number,
    lapTime: latestLap.lapTime,
    totalTime: latestLap.totalTime,
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

    const latestLap = runner.laps[runner.laps.length - 1];
    if (!currentResultSessionId) {
      currentResultSessionId = createResultSessionId();
    }

    appendResultRecord({
      meetId: activeMeetId,
      raceId: activeAssignment.raceId,
      heatNumber: activeAssignment.heatNumber,
      sessionId: currentResultSessionId,
      runnerId: runner.id,
      runnerName: runner.name,
      lapNumber: latestLap.number,
      lapTime: latestLap.lapTime,
      totalTime: latestLap.totalTime,
      isFinishLap: true,
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

  if (startTime === null && elapsedTime === 0) {
    currentResultSessionId = createResultSessionId();
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
  currentResultSessionId = null;
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

addRunnerToMeetButton.addEventListener("click", function () {
  const runnerId = Number.parseInt(meetRunnerSelect.value, 10);

  if (!Number.isInteger(runnerId) || !getActiveMeet()) {
    return;
  }

  addRunnerToMeet(runnerId);
  renderMeetOptions();
  renderMeetRoster();
  renderMeetList();
});

assignRunnerButton.addEventListener("click", function () {
  const runnerId = Number.parseInt(meetAssignmentRunnerSelect.value, 10);
  const selectedRaceId = meetRaceSelect.value;
  const selectedHeatNumber = Number.parseInt(meetHeatInput.value, 10) || 1;
  const runner = runners.find((entry) => entry.id === runnerId);

  if (!runner || !races.some((race) => race.id === selectedRaceId) || !getActiveMeet() || !isRunnerInMeet(runner.id)) {
    return;
  }

  setRunnerAssignment(runner.id, selectedRaceId, selectedHeatNumber);
  renderRunnerButtons();
  renderMeetOptions();
  renderMeetRoster();
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

resultsMeetFilter.addEventListener("change", function () {
  resultsMeetFilterValue = resultsMeetFilter.value;
  resultsRaceFilterValue = ALL_RACES_OPTION;
  resultsHeatFilterValue = ALL_HEATS_OPTION;
  resultsSessionFilterValue = LATEST_SESSION_OPTION;
  renderResults();
});

resultsRaceFilter.addEventListener("change", function () {
  resultsRaceFilterValue = resultsRaceFilter.value;
  resultsHeatFilterValue = ALL_HEATS_OPTION;
  resultsSessionFilterValue = LATEST_SESSION_OPTION;
  renderResults();
});

resultsHeatFilter.addEventListener("change", function () {
  resultsHeatFilterValue = resultsHeatFilter.value;
  resultsSessionFilterValue = LATEST_SESSION_OPTION;
  renderResults();
});

resultsSessionFilter.addEventListener("change", function () {
  resultsSessionFilterValue = resultsSessionFilter.value;
  renderResults();
});

exportResultsButton.addEventListener("click", function () {
  exportResultsScope();
});

clearResultsScopeButton.addEventListener("click", function () {
  clearResultsScope();
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
renderMeetRoster();
renderMeetAssignments();
setActiveTab(activeTab);
renderRunnerButtons();
renderResults();
