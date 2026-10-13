# AttendX MVP

AttendX is an offline-first attendance tracker for Android and web, built with Expo + React Native + TypeScript.

## Included in this MVP
- Premium dark navy/purple UI
- Monthly calendar with date selection
- Today section showing only scheduled classes with one-tap Present / Absent
- Weekly timetable with editable class days and start/end times
- Mark each subject Present / Absent / Cancelled
- Add and delete subjects, with selectable class days and time slots
- Edit each subject timetable from Subjects
- Per-subject attendance target and overall target
- Attendance percentages and target projections
- Persistent local storage with AsyncStorage

## Requirements
- Node.js LTS
- VS Code
- Optional: Expo Go on an Android phone

## Run the project
1. Extract the ZIP.
2. Open the `AttendX` folder in VS Code.
3. Open Terminal > New Terminal.
4. Run:
   ```bash
   npm install
   npx expo start
   ```
5. For web, press `w` in the Expo terminal, or run `npx expo start --web`.
6. For Android, install Expo Go on your phone and scan the QR code. Your computer and phone should usually be on the same Wi-Fi network.

## Notes
- First launch starts with three sample subjects. You can delete them and add your own.
- In Calendar, choose a date and tap P, A, or — for each class. Tapping the same status again clears it.
- Each subject has editable weekly days and start/end times. The Today section shows subjects scheduled for the current weekday. The Calendar currently allows recording any subject on any date, which helps when extra or rescheduled classes occur.
- Data is stored locally in the browser/device. It does not sync between devices.
- Clearing browser site data or uninstalling the app can remove local data. Export/backup is a planned next step.
- This is an MVP, not a production release. Test on your device before relying on it for official attendance records.
