let startTime = null;
let timerInterval = null;
let elapsedTime = 0;
let nextRunnerId = 1;
const runners = [];

const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");
const runnerNameInput = document.getElementById("runnerNameInput");
const addRunnerButton = document.getElementById("addRunnerButton");
const runnerButtonsContainer = document.getElementById("runnerButtons");
const resultsBody = document.getElementById("resultsBody");
const summaryStats = document.getElementById("summaryStats");
const summaryChart = document.getElementById("summaryChart");

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

function updateTimer() {
  const now = Date.now();
  elapsedTime = now - startTime;
  timerDisplay.textContent = formatTime(elapsedTime);
}

function renderRunnerButtons() {
  runnerButtonsContainer.innerHTML = "";

  if (runners.length === 0) {
    runnerButtonsContainer.innerHTML = '<p class="empty-state">Add a runner to begin recording laps.</p>';
    return;
  }

  runners.forEach((runner) => {
    const card = document.createElement("div");
    card.className = "runner-card";
    if (runner.finished) {
      card.classList.add("finished");
    }

    const lapButton = document.createElement("button");
    lapButton.className = "runner-button lap-button";
    lapButton.type = "button";
    lapButton.textContent = "Lap";
    lapButton.disabled = runner.finished;
    lapButton.addEventListener("click", () => recordLap(runner.id));

    const finishButton = document.createElement("button");
    finishButton.className = "runner-button finish-button";
    finishButton.type = "button";
    finishButton.textContent = runner.finished ? "Finished" : "Finish";
    finishButton.disabled = runner.finished || startTime === null;
    finishButton.addEventListener("click", () => finishRunner(runner.id));

    const label = document.createElement("div");
    label.className = "runner-label";
    label.textContent = runner.name;

    card.appendChild(label);
    card.appendChild(lapButton);
    card.appendChild(finishButton);
    runnerButtonsContainer.appendChild(card);
  });
}

function renderResults() {
  resultsBody.innerHTML = "";

  runners.forEach((runner) => {
    runner.laps.forEach((lap) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${runner.name}</td>
        <td>${lap.number}</td>
        <td>${formatTime(lap.lapTime)}</td>
        <td>${formatTime(lap.totalTime)}</td>
      `;
      resultsBody.appendChild(row);
    });
  });

  renderSummary();
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
    laps: [],
    finished: false,
    finishTime: null,
  });

  runnerNameInput.value = "";
  renderRunnerButtons();
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
  startTime = Date.now() - elapsedTime;

  if (timerInterval === null) {
    timerInterval = setInterval(updateTimer, 10);
  }
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

runnerNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addRunner(runnerNameInput.value);
  }
});

renderRunnerButtons();
renderResults();
