import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  StyleSheet, Alert, Platform, useWindowDimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

type Subject = {
  id: string; name: string; code: string; target: number; color: string;
  days: number[]; // 0=Sun ... 6=Sat
  startTime: string;
  endTime: string;
};
type AttendanceStatus = "present" | "absent" | "cancelled" | "unmarked";
type AttendanceMap = Record<string, Record<string, "present" | "absent" | "cancelled">>;

const STORE_KEY = "attendx-v1";
const COLORS = ["#8B5CF6", "#22C55E", "#38BDF8", "#F97316", "#EC4899", "#EAB308"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const prettyDate = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialSubjects: Subject[] = [
  { id: "sub-1", name: "Data Structures", code: "CS301", target: 75, color: COLORS[0], days: [1, 3, 5], startTime: "09:00", endTime: "10:00" },
  { id: "sub-2", name: "Database Management", code: "CS302", target: 75, color: COLORS[2], days: [2, 4], startTime: "10:00", endTime: "11:00" },
  { id: "sub-3", name: "Operating Systems", code: "CS303", target: 80, color: COLORS[1], days: [1, 2, 4], startTime: "11:00", endTime: "12:00" }
];

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: string }) {
  return <View style={styles.statCard}>
    <Text style={styles.muted}>{label}</Text>
    <Text style={[styles.statValue, { color: accent || "#F8FAFC" }]}>{value}</Text>
    <Text style={styles.smallMuted}>{hint}</Text>
  </View>;
}
function ActionButton({ label, onPress, kind = "primary" }: { label: string; onPress: () => void; kind?: "primary" | "secondary" | "danger" }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, kind === "primary" ? styles.primaryButton : kind === "danger" ? styles.dangerButton : styles.secondaryButton, pressed && { opacity: 0.75 }]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}
function Tag({ label, color }: { label: string; color: string }) {
  return <View style={[styles.tag, { borderColor: color + "88", backgroundColor: color + "20" }]}><Text style={{ color, fontSize: 11, fontWeight: "700" }}>{label}</Text></View>;
}

export default function App() {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [records, setRecords] = useState<AttendanceMap>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [overallTarget, setOverallTarget] = useState("75");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newTarget, setNewTarget] = useState("75");
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [showAdd, setShowAdd] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"dashboard" | "today" | "timetable" | "calendar" | "subjects">("dashboard");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.subjects)) setSubjects(parsed.subjects.map((subject: Partial<Subject>, index: number) => ({
            ...subject,
            id: subject.id || makeId(),
            name: subject.name || "New subject",
            code: subject.code || "NEW",
            target: subject.target || 75,
            color: subject.color || COLORS[index % COLORS.length],
            days: Array.isArray(subject.days) ? subject.days : [1, 2, 3, 4, 5],
            startTime: subject.startTime || "09:00",
            endTime: subject.endTime || "10:00"
          } as Subject)));
          if (parsed.records && typeof parsed.records === "object") setRecords(parsed.records);
          if (parsed.overallTarget) setOverallTarget(String(parsed.overallTarget));
        }
      } catch (e) {
        console.warn("Could not load AttendX data", e);
      } finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify({ subjects, records, overallTarget }))
      .catch((e) => console.warn("Could not save AttendX data", e));
  }, [subjects, records, overallTarget, loaded]);

  const allStats = useMemo(() => {
    let present = 0, absent = 0, held = 0;
    Object.values(records).forEach(day => Object.values(day).forEach(status => {
      if (status === "present") { present++; held++; }
      if (status === "absent") { absent++; held++; }
    }));
    return { present, absent, held, pct: held ? (present / held) * 100 : 0 };
  }, [records]);

  const statsFor = (subjectId: string) => {
    let present = 0, absent = 0;
    Object.values(records).forEach(day => {
      const status = day[subjectId];
      if (status === "present") present++;
      if (status === "absent") absent++;
    });
    const held = present + absent;
    const pct = held ? present / held * 100 : 0;
    const target = subjects.find(s => s.id === subjectId)?.target ?? 75;
    const need = pct >= target ? 0 : held === 0 ? 1 : Math.max(0, Math.ceil((target * held - 100 * present) / (100 - target)));
    const canMiss = pct >= target ? Math.max(0, Math.floor((100 * present / target) - held)) : 0;
    return { present, absent, held, pct, target, need, canMiss };
  };

  const markAttendance = (subjectId: string, status: "present" | "absent" | "cancelled", forDate: Date = selectedDate) => {
    const key = dateKey(forDate);
    setRecords(prev => {
      const day = { ...(prev[key] || {}) };
      if (day[subjectId] === status) delete day[subjectId];
      else day[subjectId] = status;
      const next = { ...prev };
      if (Object.keys(day).length) next[key] = day;
      else delete next[key];
      return next;
    });
  };

  const addSubject = () => {
    const name = newName.trim();
    if (!name) { showMessage("Subject name required", "Enter a subject name before adding it."); return; }
    const target = Number(newTarget);
    if (!Number.isFinite(target) || target < 1 || target > 100) { showMessage("Invalid target", "Attendance target must be between 1 and 100."); return; }
    if (newDays.length === 0) { showMessage("Choose class days", "Select at least one day for this subject's timetable."); return; }
    const subject: Subject = { id: makeId(), name, code: newCode.trim() || "NEW", target, color: COLORS[subjects.length % COLORS.length], days: newDays, startTime: newStartTime, endTime: newEndTime };
    setSubjects(prev => [...prev, subject]);
    setNewName(""); setNewCode(""); setNewTarget("75"); setNewDays([1,2,3,4,5]); setNewStartTime("09:00"); setNewEndTime("10:00"); setShowAdd(false);
  };

  const updateSubjectTarget = (id: string, rawValue: string) => {
    const value = Number(rawValue);
    if (rawValue.trim() === "" || !Number.isFinite(value)) return;
    const target = Math.min(100, Math.max(1, value));
    setSubjects(prev => prev.map(subject => subject.id === id ? { ...subject, target } : subject));
  };

  const updateSubject = (id: string, patch: Partial<Subject>) => {
    setSubjects(prev => prev.map(subject => subject.id === id ? { ...subject, ...patch } : subject));
  };
  const toggleSubjectDay = (id: string, day: number) => {
    const subject = subjects.find(item => item.id === id);
    if (!subject) return;
    const days = subject.days.includes(day) ? subject.days.filter(d => d !== day) : [...subject.days, day].sort();
    updateSubject(id, { days });
  };

  const deleteSubject = (id: string) => {
    showConfirm("Delete subject?", "This removes the subject and its attendance records.", () => {
      setSubjects(prev => prev.filter(s => s.id !== id));
      setRecords(prev => {
        const next: AttendanceMap = {};
        Object.entries(prev).forEach(([date, day]) => {
          const copy = { ...day }; delete copy[id];
          if (Object.keys(copy).length) next[date] = copy;
        });
        return next;
      });
    });
  };

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  }
  function showConfirm(title: string, message: string, yes: () => void) {
    if (Platform.OS === "web") { if (window.confirm(`${title}\n\n${message}`)) yes(); }
    else Alert.alert(title, message, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: yes }]);
  }

  const buildCalendar = () => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (number | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    return cells;
  };

  const daySubjects = subjects.filter(s => s.days.includes(selectedDate.getDay()));
  const allDaySubjects = daySubjects.length ? daySubjects : subjects;
  const dayRecords = records[dateKey(selectedDate)] || {};
  const markedOnDate = Object.values(dayRecords).filter(s => s === "present" || s === "absent").length;
  const overallGoal = Math.min(100, Math.max(1, Number(overallTarget) || 75));
  const overallNeed = allStats.pct >= overallGoal ? 0 : allStats.held === 0 ? 1 : Math.ceil((overallGoal * allStats.held - 100 * allStats.present) / (100 - overallGoal));
  const overallCanMiss = allStats.held && allStats.pct >= overallGoal ? Math.max(0, Math.floor((100 * allStats.present / overallGoal) - allStats.held)) : 0;

  const Header = () => <View style={styles.header}>
    <View style={styles.brandRow}>
      <View style={styles.logo}><Text style={styles.logoText}>A</Text></View>
      <View><Text style={styles.brand}>Attend<Text style={{ color: "#A78BFA" }}>X</Text></Text><Text style={styles.brandSub}>YOUR ATTENDANCE, IN CONTROL</Text></View>
    </View>
    <View style={styles.headerRight}><Tag label="OFFLINE MODE" color="#34D399" /><Text style={styles.avatar}>S</Text></View>
  </View>;

  const Nav = () => <View style={styles.nav}>
    {(["dashboard", "today", "timetable", "calendar", "subjects"] as const).map(item =>
      <Pressable key={item} onPress={() => setTab(item)} style={[styles.navItem, tab === item && styles.navItemActive]}>
        <Text style={[styles.navText, tab === item && styles.navTextActive]}>{item === "dashboard" ? "◈  Overview" : item === "today" ? "✓  Today" : item === "timetable" ? "▤  Timetable" : item === "calendar" ? "▦  Calendar" : "＋  Subjects"}</Text>
      </Pressable>
    )}
  </View>;

  const SubjectCard = ({ subject }: { subject: Subject }) => {
    const st = statsFor(subject.id);
    const low = st.held > 0 && st.pct < st.target;
    return <View style={styles.subjectCard}>
      <View style={styles.subjectHead}>
        <View style={[styles.subjectIcon, { backgroundColor: subject.color + "22" }]}><Text style={{ color: subject.color, fontWeight: "900" }}>{subject.code.slice(0, 2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.subjectName}>{subject.name}</Text><Text style={styles.smallMuted}>{subject.code} · Target {subject.target}%</Text></View>
        <Tag label={low ? "SHORTAGE RISK" : st.held ? "ON TRACK" : "NO DATA"} color={low ? "#FB7185" : st.held ? "#34D399" : "#94A3B8"} />
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, st.pct)}%`, backgroundColor: low ? "#FB7185" : subject.color }]} /></View>
      <View style={styles.metricRow}>
        <View><Text style={styles.metricBig}>{st.pct.toFixed(1)}%</Text><Text style={styles.smallMuted}>Attendance</Text></View>
        <View><Text style={styles.metric}>{st.present}/{st.held}</Text><Text style={styles.smallMuted}>Present / Held</Text></View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.metric, { color: low ? "#FDA4AF" : "#C4B5FD" }]}>{low ? `${st.need} to target` : `${st.canMiss} safe absences*`}</Text>
          <Text style={styles.smallMuted}>*At current totals</Text>
        </View>
      </View>
    </View>;
  };

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light" />
    <Header />
    <ScrollView contentContainerStyle={[styles.page, { paddingHorizontal: wide ? 34 : 16 }]}>
      <View style={styles.welcomeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>STUDENT WORKSPACE</Text>
          <Text style={styles.pageTitle}>{tab === "dashboard" ? "Your attendance overview" : tab === "today" ? "Today's classes" : tab === "timetable" ? "Your weekly timetable" : tab === "calendar" ? "Attendance calendar" : "Manage subjects"}</Text>
          <Text style={styles.pageSub}>{tab === "dashboard" ? "Stay ahead of your attendance goals." : tab === "today" ? "Mark each scheduled class present or absent." : tab === "timetable" ? "Set class days and times for your college schedule." : tab === "calendar" ? "Choose any date, then mark each class." : "Add subjects, set targets and build your timetable."}</Text>
        </View>
        <Text style={styles.todayPill}>{prettyDate(new Date())}</Text>
      </View>
      <Nav />

      {tab === "dashboard" && <>
        <View style={[styles.statsGrid, wide && styles.statsGridWide]}>
          <StatCard label="OVERALL ATTENDANCE" value={`${allStats.pct.toFixed(1)}%`} hint={`${allStats.present} present · ${allStats.held} classes held`} accent={allStats.held && allStats.pct < overallGoal ? "#FDA4AF" : "#C4B5FD"} />
          <StatCard label="CLASSES ATTENDED" value={String(allStats.present)} hint={`${allStats.absent} recorded absences`} accent="#86EFAC" />
          <StatCard label="OVERALL TARGET" value={`${overallGoal}%`} hint={overallNeed ? `Attend next ${overallNeed} classes to reach target` : `${overallCanMiss} possible absences at current totals`} accent="#7DD3FC" />
        </View>
        <View style={styles.panel}>
          <View style={styles.panelHead}><View><Text style={styles.panelTitle}>Overall target</Text><Text style={styles.smallMuted}>Change your college's attendance requirement</Text></View></View>
          <View style={styles.inlineForm}>
            <TextInput value={overallTarget} onChangeText={setOverallTarget} keyboardType="numeric" placeholder="75" placeholderTextColor="#64748B" style={[styles.input, { width: 90 }]} />
            <Text style={styles.bodyText}>%</Text>
            <Text style={styles.smallMuted}>Target can be 1–100%</Text>
          </View>
        </View>
        <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Subject performance</Text><Pressable onPress={() => setTab("subjects")}><Text style={styles.link}>Manage subjects →</Text></Pressable></View>
        <View style={[styles.subjectGrid, wide && styles.subjectGridWide]}>{subjects.map(s => <SubjectCard key={s.id} subject={s} />)}</View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Quick attendance</Text>
          <Text style={styles.bodyText}>Selected date: {prettyDate(selectedDate)}</Text>
          <ActionButton label="Open calendar & mark classes →" onPress={() => setTab("calendar")} />
        </View>
      </>}

      {tab === "today" && <View style={styles.panel}>
        <View style={styles.panelHead}><View><Text style={styles.panelTitle}>{prettyDate(new Date())}</Text><Text style={styles.smallMuted}>Today's timetable, based on your saved subject schedules</Text></View><Tag label={`${subjects.filter(s => s.days.includes(new Date().getDay())).length} CLASSES`} color="#A78BFA" /></View>
        {subjects.filter(s => s.days.includes(new Date().getDay())).sort((a,b) => a.startTime.localeCompare(b.startTime)).length === 0 ? <View style={styles.emptyState}><Text style={styles.subjectName}>No classes scheduled today</Text><Text style={styles.bodyText}>Open Timetable or Subjects to add the days and times for your classes.</Text><ActionButton label="Set up timetable →" onPress={() => setTab("timetable")} /></View> : subjects.filter(s => s.days.includes(new Date().getDay())).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(subject => {
          const status = (records[dateKey(new Date())] || {})[subject.id] || "unmarked";
          return <View key={subject.id} style={styles.todayClassCard}>
            <View style={[styles.classTimeRail, { backgroundColor: subject.color }]} />
            <View style={{ flex: 1, gap: 5 }}><Text style={styles.subjectName}>{subject.name}</Text><Text style={styles.smallMuted}>{subject.code} · {subject.startTime}–{subject.endTime}</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><Tag label={status === "present" ? "PRESENT" : status === "absent" ? "ABSENT" : status === "cancelled" ? "CANCELLED" : "NOT MARKED"} color={status === "present" ? "#34D399" : status === "absent" ? "#FB7185" : "#94A3B8"} /></View></View>
            <View style={styles.todayActions}><Pressable onPress={() => markAttendance(subject.id, "present", new Date())} style={[styles.todayAction, status === "present" && styles.presentActive]}><Text style={[styles.todayActionText, status === "present" && styles.statusActiveText]}>Present</Text></Pressable><Pressable onPress={() => markAttendance(subject.id, "absent", new Date())} style={[styles.todayAction, status === "absent" && styles.absentActive]}><Text style={[styles.todayActionText, status === "absent" && styles.statusActiveText]}>Absent</Text></Pressable></View>
          </View>;
        })}
        <Text style={styles.smallMuted}>Tap the selected status again in the calendar to clear it. Cancelled classes are not counted as held classes.</Text>
      </View>}

      {tab === "timetable" && <>
        <View style={styles.panel}><View style={styles.panelHead}><View><Text style={styles.panelTitle}>Weekly timetable</Text><Text style={styles.smallMuted}>Edit each subject's class days and time below.</Text></View><ActionButton label="+ Add subject" onPress={() => { setTab("subjects"); setShowAdd(true); }} /></View>
          {subjects.length === 0 ? <Text style={styles.bodyText}>No subjects added yet. Add a subject to build your timetable.</Text> : WEEKDAYS.slice(1).concat(WEEKDAYS[0]).map((dayName, ix) => {
            const dayIndex = (ix + 1) % 7;
            const dayItems = subjects.filter(subject => subject.days.includes(dayIndex)).sort((a,b) => a.startTime.localeCompare(b.startTime));
            return <View key={dayName} style={styles.timetableDay}><Text style={styles.timetableDayTitle}>{dayName}</Text><View style={{ flex: 1, gap: 8 }}>{dayItems.length ? dayItems.map(subject => <View key={subject.id} style={styles.timetableItem}><View style={[styles.miniDot, { backgroundColor: subject.color }]} /><View style={{ flex: 1 }}><Text style={styles.subjectName}>{subject.name}</Text><Text style={styles.smallMuted}>{subject.code}</Text></View><Text style={styles.timeText}>{subject.startTime}–{subject.endTime}</Text></View>) : <Text style={styles.smallMuted}>No classes</Text>}</View></View>;
          })}
        </View>
        <View style={styles.panel}><Text style={styles.panelTitle}>Customize schedule</Text><Text style={styles.bodyText}>In Subjects, add a course with its days and class time. You can also edit the days and time of existing subjects here.</Text><ActionButton label="Manage subjects & times →" onPress={() => setTab("subjects")} /></View>
      </>}

      {tab === "calendar" && <>
        <View style={[styles.twoCol, wide && styles.twoColWide]}>
          <View style={[styles.panel, { flex: 1.05 }]}>
            <View style={styles.monthHeader}>
              <Pressable style={styles.monthArrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Text style={styles.monthArrowText}>‹</Text></Pressable>
              <Text style={styles.monthTitle}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
              <Pressable style={styles.monthArrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Text style={styles.monthArrowText}>›</Text></Pressable>
            </View>
            <View style={styles.calendarGrid}>{WEEKDAYS.map(d => <Text key={d} style={styles.weekday}>{d}</Text>)}
              {buildCalendar().map((day, i) => {
                if (!day) return <View key={`blank-${i}`} style={styles.calendarCell} />;
                const date = new Date(month.getFullYear(), month.getMonth(), day);
                const key = dateKey(date);
                const dayRec = records[key] || {};
                const vals = Object.values(dayRec);
                const hasPresent = vals.includes("present");
                const hasAbsent = vals.includes("absent");
                const isSelected = dateKey(selectedDate) === key;
                const isToday = dateKey(new Date()) === key;
                return <Pressable key={key} onPress={() => setSelectedDate(date)} style={[styles.calendarCell, isSelected && styles.calendarSelected, isToday && !isSelected && styles.calendarToday]}>
                  <Text style={[styles.dayNum, isSelected && styles.selectedDayNum]}>{day}</Text>
                  <View style={styles.dots}>{hasPresent && <View style={[styles.dot, { backgroundColor: "#34D399" }]} />}{hasAbsent && <View style={[styles.dot, { backgroundColor: "#FB7185" }]} />}</View>
                </Pressable>;
              })}
            </View>
            <View style={styles.legendRow}><Text style={styles.legend}><Text style={{ color: "#34D399" }}>●</Text> Present recorded</Text><Text style={styles.legend}><Text style={{ color: "#FB7185" }}>●</Text> Absence recorded</Text></View>
            <ActionButton label="Jump to today" kind="secondary" onPress={() => { const now = new Date(); setSelectedDate(now); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }} />
          </View>
          <View style={[styles.panel, { flex: 1 }]}>
            <Text style={styles.panelTitle}>{prettyDate(selectedDate)}</Text>
            <Text style={styles.smallMuted}>Classes for this date. Tap a status to mark or undo it.</Text>
            <View style={styles.daySummary}><Text style={styles.daySummaryNum}>{markedOnDate}</Text><Text style={styles.smallMuted}>classes marked present/absent</Text></View>
            {allDaySubjects.length === 0 ? <Text style={styles.bodyText}>No subjects yet. Add a subject first.</Text> : allDaySubjects.map(subject => {
              const status: AttendanceStatus = dayRecords[subject.id] || "unmarked";
              return <View key={subject.id} style={styles.attendanceRow}>
                <View style={[styles.miniDot, { backgroundColor: subject.color }]} />
                <View style={{ flex: 1 }}><Text style={styles.subjectName}>{subject.name}</Text><Text style={styles.smallMuted}>{subject.code}</Text></View>
                <View style={styles.statusButtons}>
                  <Pressable onPress={() => markAttendance(subject.id, "present")} style={[styles.statusButton, status === "present" && styles.presentActive]}><Text style={[styles.statusText, status === "present" && styles.statusActiveText]}>P</Text></Pressable>
                  <Pressable onPress={() => markAttendance(subject.id, "absent")} style={[styles.statusButton, status === "absent" && styles.absentActive]}><Text style={[styles.statusText, status === "absent" && styles.statusActiveText]}>A</Text></Pressable>
                  <Pressable onPress={() => markAttendance(subject.id, "cancelled")} style={[styles.statusButton, status === "cancelled" && styles.cancelActive]}><Text style={[styles.statusText, status === "cancelled" && styles.statusActiveText]}>—</Text></Pressable>
                </View>
              </View>;
            })}
            <Text style={styles.smallMuted}>P = Present · A = Absent · — = Cancelled / no class. Tap the selected status again to clear it.</Text>
          </View>
        </View>
      </>}

      {tab === "subjects" && <>
        <View style={styles.panel}>
          <View style={styles.panelHead}><View><Text style={styles.panelTitle}>Your subjects</Text><Text style={styles.smallMuted}>{subjects.length} subjects configured</Text></View><ActionButton label={showAdd ? "Close" : "+ Add subject"} onPress={() => setShowAdd(v => !v)} /></View>
          {showAdd && <View style={styles.addForm}>
            <Text style={styles.label}>Subject name *</Text>
            <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Computer Networks" placeholderTextColor="#64748B" style={styles.input} />
            <Text style={styles.label}>Subject code</Text>
            <TextInput value={newCode} onChangeText={setNewCode} placeholder="e.g. CS304" placeholderTextColor="#64748B" style={styles.input} />
            <Text style={styles.label}>Attendance target (%)</Text>
            <TextInput value={newTarget} onChangeText={setNewTarget} keyboardType="numeric" placeholder="75" placeholderTextColor="#64748B" style={styles.input} />
            <Text style={styles.label}>Class days (select all that apply)</Text>
            <View style={styles.weekRow}>{WEEKDAYS.map((day, index) => <Pressable key={day} onPress={() => setNewDays(prev => prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index].sort())} style={[styles.weekChip, newDays.includes(index) && styles.dayChipActive]}><Text style={[styles.weekChipText, newDays.includes(index) && styles.dayChipTextActive]}>{day}</Text></Pressable>)}</View>
            <Text style={styles.label}>Start time (24-hour format, HH:MM)</Text>
            <TextInput value={newStartTime} onChangeText={setNewStartTime} placeholder="09:00" placeholderTextColor="#64748B" style={styles.input} />
            <Text style={styles.label}>End time (24-hour format, HH:MM)</Text>
            <TextInput value={newEndTime} onChangeText={setNewEndTime} placeholder="10:00" placeholderTextColor="#64748B" style={styles.input} />
            <ActionButton label="Save subject & timetable" onPress={addSubject} />
          </View>}
        </View>
        <View style={[styles.subjectGrid, wide && styles.subjectGridWide]}>{subjects.map(subject => <View key={subject.id} style={styles.subjectCard}>
          <View style={styles.subjectHead}>
            <View style={[styles.subjectIcon, { backgroundColor: subject.color + "22" }]}><Text style={{ color: subject.color, fontWeight: "900" }}>{subject.code.slice(0, 2).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.subjectName}>{subject.name}</Text><Text style={styles.smallMuted}>{subject.code}</Text></View>
            <Pressable onPress={() => deleteSubject(subject.id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
          </View>
          <View style={styles.targetRow}>
            <Text style={styles.bodyText}>Attendance target (%)</Text>
            <TextInput
              value={String(subject.target)}
              onChangeText={(value) => updateSubjectTarget(subject.id, value)}
              keyboardType="numeric"
              style={[styles.input, { width: 76, paddingVertical: 7, textAlign: "center" }]}
              accessibilityLabel={`${subject.name} attendance target percentage`}
            />
          </View>
          <Text style={styles.label}>Class days (tap to toggle)</Text>
          <View style={styles.weekRow}>{WEEKDAYS.map((d, i) => <Pressable key={d} onPress={() => toggleSubjectDay(subject.id, i)} style={[styles.weekChip, subject.days.includes(i) && { backgroundColor: subject.color + "30", borderColor: subject.color }]}><Text style={[styles.weekChipText, subject.days.includes(i) && { color: subject.color }]}>{d[0]}</Text></Pressable>)}</View>
          <View style={styles.timeEditRow}><View style={{ flex: 1, gap: 5 }}><Text style={styles.label}>Start time</Text><TextInput value={subject.startTime} onChangeText={value => updateSubject(subject.id, { startTime: value })} placeholder="09:00" placeholderTextColor="#64748B" style={styles.input} /></View><View style={{ flex: 1, gap: 5 }}><Text style={styles.label}>End time</Text><TextInput value={subject.endTime} onChangeText={value => updateSubject(subject.id, { endTime: value })} placeholder="10:00" placeholderTextColor="#64748B" style={styles.input} /></View></View>
          <Text style={styles.smallMuted}>The Today section uses these days and times. Edit time in 24-hour HH:MM format.</Text>
        </View>)}</View>
      </>}
      <View style={styles.footer}><Text style={styles.footerBrand}>AttendX</Text><Text style={styles.smallMuted}>Offline-first student attendance · Your data stays on this device</Text><Text style={styles.smallMuted}>Tip: export/backup is not included in this first MVP, so avoid clearing app/browser data.</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080D1A" },
  header: { minHeight: 74, paddingHorizontal: 20, paddingVertical: 13, backgroundColor: "#0B1020", borderBottomWidth: 1, borderBottomColor: "#202945", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  logo: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center", shadowColor: "#8B5CF6", shadowOpacity: 0.4, shadowRadius: 12 },
  logoText: { color: "white", fontSize: 22, fontWeight: "900" },
  brand: { color: "#F8FAFC", fontSize: 21, fontWeight: "900", letterSpacing: -0.6 },
  brandSub: { color: "#64748B", fontSize: 8, letterSpacing: 1.3, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 35, height: 35, borderRadius: 18, overflow: "hidden", textAlign: "center", textAlignVertical: "center", paddingTop: Platform.OS === "android" ? 8 : 0, color: "#DDD6FE", backgroundColor: "#312E81", fontWeight: "800" },
  page: { paddingTop: 24, paddingBottom: 40, gap: 18, maxWidth: 1400, width: "100%", alignSelf: "center" },
  welcomeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  eyebrow: { color: "#A78BFA", fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 6 },
  pageTitle: { color: "#F8FAFC", fontSize: 25, fontWeight: "800", letterSpacing: -0.6 },
  pageSub: { color: "#94A3B8", fontSize: 13, marginTop: 5 },
  todayPill: { color: "#C4B5FD", backgroundColor: "#17152D", borderWidth: 1, borderColor: "#373064", borderRadius: 99, paddingVertical: 9, paddingHorizontal: 13, fontSize: 11, overflow: "hidden" },
  nav: { flexDirection: "row", gap: 6, padding: 5, borderRadius: 14, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#202945", alignSelf: "flex-start", flexWrap: "wrap" },
  navItem: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  navItemActive: { backgroundColor: "#312E81" },
  navText: { color: "#94A3B8", fontWeight: "700", fontSize: 12 },
  navTextActive: { color: "#EDE9FE" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statsGridWide: { flexWrap: "nowrap" },
  statCard: { flexGrow: 1, flexBasis: 145, backgroundColor: "#11182B", borderColor: "#252D48", borderWidth: 1, borderRadius: 17, padding: 16, gap: 8 },
  muted: { color: "#94A3B8", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  statValue: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  smallMuted: { color: "#718096", fontSize: 11, lineHeight: 16 },
  panel: { backgroundColor: "#101729", borderColor: "#252D48", borderWidth: 1, borderRadius: 18, padding: 17, gap: 14 },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  panelTitle: { color: "#F1F5F9", fontSize: 16, fontWeight: "800" },
  bodyText: { color: "#CBD5E1", fontSize: 12, lineHeight: 19 },
  inlineForm: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  input: { backgroundColor: "#0B1020", borderColor: "#303A59", borderWidth: 1, borderRadius: 10, color: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 11, fontSize: 13 },
  button: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10 },
  primaryButton: { backgroundColor: "#6D4AFF" },
  secondaryButton: { backgroundColor: "#1B2540", borderWidth: 1, borderColor: "#35415F" },
  dangerButton: { backgroundColor: "#7F1D32" },
  buttonText: { color: "#F8FAFC", fontSize: 12, fontWeight: "800" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { color: "#F8FAFC", fontSize: 17, fontWeight: "800" },
  link: { color: "#C4B5FD", fontSize: 12, fontWeight: "700" },
  subjectGrid: { gap: 12 },
  subjectGridWide: { flexDirection: "row", flexWrap: "wrap" },
  subjectCard: { flex: 1, minWidth: 270, backgroundColor: "#101729", borderColor: "#252D48", borderWidth: 1, borderRadius: 17, padding: 15, gap: 13 },
  subjectHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  subjectIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  subjectName: { color: "#F1F5F9", fontSize: 13, fontWeight: "800" },
  tag: { borderWidth: 1, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 8, alignSelf: "flex-start" },
  progressTrack: { height: 7, backgroundColor: "#252D48", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: 7, borderRadius: 99 },
  metricRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  metricBig: { color: "#F8FAFC", fontSize: 21, fontWeight: "900" },
  metric: { color: "#E2E8F0", fontSize: 12, fontWeight: "800" },
  twoCol: { gap: 14 },
  twoColWide: { flexDirection: "row", alignItems: "flex-start" },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthArrow: { width: 34, height: 34, alignItems: "center", justifyContent: "center", backgroundColor: "#1B2540", borderRadius: 10 },
  monthArrowText: { color: "#E2E8F0", fontSize: 24, lineHeight: 27 },
  monthTitle: { color: "#F8FAFC", fontSize: 16, fontWeight: "800" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.2857%", color: "#718096", textAlign: "center", paddingVertical: 10, fontSize: 10, fontWeight: "800" },
  calendarCell: { width: "14.2857%", minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 10, marginVertical: 2, borderWidth: 1, borderColor: "transparent" },
  calendarSelected: { backgroundColor: "#6D4AFF", borderColor: "#A78BFA" },
  calendarToday: { borderColor: "#8B5CF6" },
  dayNum: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  selectedDayNum: { color: "#FFFFFF" },
  dots: { flexDirection: "row", gap: 3, minHeight: 7, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legend: { color: "#94A3B8", fontSize: 10 },
  daySummary: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0B1020", padding: 12, borderRadius: 12 },
  daySummaryNum: { color: "#C4B5FD", fontSize: 22, fontWeight: "900" },
  attendanceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#252D48" },
  miniDot: { width: 8, height: 8, borderRadius: 5 },
  statusButtons: { flexDirection: "row", gap: 5 },
  statusButton: { width: 31, height: 31, borderRadius: 9, backgroundColor: "#1B2540", borderWidth: 1, borderColor: "#35415F", alignItems: "center", justifyContent: "center" },
  presentActive: { backgroundColor: "#14532D", borderColor: "#22C55E" },
  absentActive: { backgroundColor: "#881337", borderColor: "#FB7185" },
  cancelActive: { backgroundColor: "#334155", borderColor: "#94A3B8" },
  statusText: { color: "#94A3B8", fontSize: 11, fontWeight: "900" },
  statusActiveText: { color: "#FFFFFF" },
  addForm: { gap: 9, paddingTop: 8 },
  label: { color: "#CBD5E1", fontSize: 11, fontWeight: "700" },
  deleteText: { color: "#FDA4AF", fontSize: 11, fontWeight: "800" },
  emptyState: { paddingVertical: 20, gap: 10, alignItems: "flex-start" },
  todayClassCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 13, backgroundColor: "#0B1020", borderWidth: 1, borderColor: "#252D48", marginTop: 10 },
  classTimeRail: { width: 4, alignSelf: "stretch", borderRadius: 5 },
  todayActions: { gap: 6 },
  todayAction: { minWidth: 67, alignItems: "center", paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: "#1B2540", borderWidth: 1, borderColor: "#35415F" },
  todayActionText: { color: "#CBD5E1", fontSize: 10, fontWeight: "800" },
  timetableDay: { flexDirection: "row", gap: 15, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#252D48" },
  timetableDayTitle: { width: 42, color: "#C4B5FD", fontSize: 12, fontWeight: "900", paddingTop: 3 },
  timetableItem: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 10, backgroundColor: "#0B1020" },
  timeText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  timeEditRow: { flexDirection: "row", gap: 10 },
  dayChipActive: { backgroundColor: "#312E81", borderColor: "#A78BFA" },
  dayChipTextActive: { color: "#EDE9FE" },
  targetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  targetValue: { color: "#C4B5FD", fontWeight: "900", fontSize: 14 },
  weekRow: { flexDirection: "row", gap: 6 },
  weekChip: { width: 27, height: 27, borderRadius: 8, borderWidth: 1, borderColor: "#35415F", backgroundColor: "#0B1020", alignItems: "center", justifyContent: "center" },
  weekChipText: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  footer: { borderTopWidth: 1, borderTopColor: "#202945", paddingTop: 18, gap: 5, alignItems: "center", marginTop: 6 },
  footerBrand: { color: "#A78BFA", fontSize: 14, fontWeight: "900", letterSpacing: 1 }
});