# Track Lap Timer

A simple web app for track coaches to count and time laps during races.

## Features

- Shared race timer for all runners
- Add runner names dynamically
- One button per runner to record laps quickly
- Show lap number, lap time, and total time for each runner
- Reset race data and timer

## Usage

1. Enter a runner name and click `Add Runner`.
2. Click `Start Race` to begin the shared timer.
3. For each runner:
   - Tap `Lap` button to record each lap.
   - Tap `Finish` button to record when the runner completes the race.
4. Use `Stop` to pause the timer and `Reset` to clear all race data.

## Notes

- Runner names remain after reset so the same roster can be used again.
- Lap times are calculated from the runner's previous lap or race start.
- Each runner finishes independently; the shared timer continues until stopped.
- Once a runner is marked finished, no further laps can be recorded for that runner.
- Finish time is captured from the shared race clock at the moment of finish.

## Future Ideas

- Save race results
- Export to CSV
- Support heats
- Support relay teams
- Highlight fastest lap
- Undo last tap