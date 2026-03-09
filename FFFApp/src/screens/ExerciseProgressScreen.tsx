import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { workoutAPI } from '../services/api';

// ── Rest Timer Component ──────────────────────────────────────────────────────

// Preset rest durations in seconds
const REST_OPTIONS = [30, 60, 90, 120, 180];

const RestTimer = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [selected, setSelected] = useState(60);          // currently highlighted preset
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // null = timer not started
  const intervalRef = useRef<any>(null);                  // ref holds the setInterval ID for cleanup

  // Starts the countdown from the given number of seconds
  const start = (seconds: number) => {
    setSelected(seconds);
    setTimeLeft(seconds);
    clearInterval(intervalRef.current); // clear any previous timer before starting a new one
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Stops the countdown and resets timeLeft to null (idle state)
  const stop = () => { clearInterval(intervalRef.current); setTimeLeft(null); };

  // Stop and clean up when modal is closed
  useEffect(() => {
    if (!visible) stop();
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  // Formats seconds as M:SS (e.g. 90 → "1:30")
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const isRunning = timeLeft !== null && timeLeft > 0;
  const isDone    = timeLeft === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tapping the dark overlay closes the modal */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>REST TIMER</Text>

          {/* Circular countdown display — turns green when done */}
          <View style={[styles.timerCircle, isDone && styles.timerCircleDone]}>
            <Text style={[styles.timerCountdown, isDone && { color: '#26de81' }]}>
              {/* Show live countdown if running, otherwise show selected preset time */}
              {timeLeft !== null ? fmt(timeLeft) : fmt(selected)}
            </Text>
            {isDone && <Text style={styles.timerDoneLabel}>Done! 🏁</Text>}
          </View>

          {/* Preset duration buttons — disabled while timer is running */}
          <View style={styles.presets}>
            {REST_OPTIONS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.preset, selected === s && !isRunning && styles.presetActive]}
                onPress={() => !isRunning && start(s)}
              >
                <Text style={[styles.presetText, selected === s && !isRunning && styles.presetTextActive]}>
                  {s < 60 ? `${s}s` : `${s / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start / Stop toggle button */}
          <View style={styles.sheetControls}>
            {isRunning
              ? <TouchableOpacity style={styles.stopBtn} onPress={stop}>
                  <Text style={styles.stopBtnText}>⏹  Stop</Text>
                </TouchableOpacity>
              : <TouchableOpacity style={styles.startBtn} onPress={() => start(selected)}>
                  <Text style={styles.startBtnText}>▶  Start {fmt(selected)}</Text>
                </TouchableOpacity>
            }
            <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Edit Set Modal Component ──────────────────────────────────────────────────

const EditSetModal = ({ visible, set, setIndex, exerciseName, onSave, onClose }: {
  visible: boolean;
  set: any;
  setIndex: number;
  exerciseName: string;
  onSave: (r: number, w: number) => void;
  onClose: () => void;
}) => {
  const [reps, setReps]     = useState('');
  const [weight, setWeight] = useState('');

  // Pre-fill inputs with the current set values when the modal opens
  useEffect(() => {
    if (set) { setReps(String(set.reps)); setWeight(String(set.weight)); }
  }, [set]);

  // Increments or decrements a string number value, clamped at 0
  // decimals=true uses 2.5kg steps for weight; false uses 1-rep steps
  const adj = (val: string, delta: number, decimals = false) => {
    const n = decimals ? parseFloat(val || '0') : parseInt(val || '0');
    const result = Math.max(0, n + delta);
    return String(result);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tapping the overlay dismisses without saving */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>EDIT SET {setIndex + 1}</Text>
          <Text style={styles.editSubtitle}>{exerciseName}</Text>

          <View style={styles.editRow}>
            {/* Reps spinner: increments by 1 */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>REPS</Text>
              <View style={styles.spinnerRow}>
                <TouchableOpacity style={styles.spinBtn} onPress={() => setReps(adj(reps, -1))}>
                  <Text style={styles.spinBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.spinInput}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <TouchableOpacity style={styles.spinBtn} onPress={() => setReps(adj(reps, 1))}>
                  <Text style={styles.spinBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight spinner: increments by 2.5kg */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>WEIGHT (kg)</Text>
              <View style={styles.spinnerRow}>
                <TouchableOpacity style={styles.spinBtn} onPress={() => setWeight(adj(weight, -2.5, true))}>
                  <Text style={styles.spinBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.spinInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity style={styles.spinBtn} onPress={() => setWeight(adj(weight, 2.5, true))}>
                  <Text style={styles.spinBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Passes parsed numbers back to parent; defaults to 0 if input is invalid */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => onSave(parseInt(reps) || 0, parseFloat(weight) || 0)}
          >
            <Text style={styles.saveBtnText}>✓  Save Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
            <Text style={styles.dismissText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export const ExerciseProgressScreen = ({ route, navigation }: any) => {
  const { workout } = route.params || {};

  // Local copy of workout so set completions and edits update the UI immediately
  const [currentWorkout, setCurrentWorkout] = useState(workout);
  const [timerVisible, setTimerVisible]     = useState(false);
  const [editVisible, setEditVisible]       = useState(false);
  // Tracks which exercise and set is being edited (used to pass correct data to EditSetModal)
  const [editTarget, setEditTarget] = useState<{ exIdx: number; setIdx: number } | null>(null);

  // Guard: if workout data is missing, bail out immediately
  useEffect(() => {
    if (!workout) { Alert.alert('Error', 'No workout data found'); navigation.goBack(); }
  }, []);

  // Toggles a set's completed state both in the API and in local state
  const handleSetComplete = async (exIdx: number, setIdx: number) => {
    try {
      const wasCompleted = currentWorkout.exercises[exIdx].sets[setIdx].completed;
      await workoutAPI.updateSet(currentWorkout._id, exIdx, setIdx, !wasCompleted);
      // Spread to create a new object reference so React re-renders
      const updated = { ...currentWorkout };
      updated.exercises[exIdx].sets[setIdx].completed = !wasCompleted;
      setCurrentWorkout({ ...updated });
    } catch {
      Alert.alert('Error', 'Failed to update set');
    }
  };

  // Applies reps/weight edits from EditSetModal to local state (no API call — saved on completion)
  const handleEditSave = (reps: number, weight: number) => {
    if (!editTarget) return;
    const updated = { ...currentWorkout };
    updated.exercises[editTarget.exIdx].sets[editTarget.setIdx].reps   = reps;
    updated.exercises[editTarget.exIdx].sets[editTarget.setIdx].weight = weight;
    setCurrentWorkout({ ...updated });
    setEditVisible(false);
    setEditTarget(null);
  };

  // Checks if all sets are done; warns the user if not, then navigates to the complete screen
  const handleComplete = () => {
    const allDone = currentWorkout.exercises.every((ex: any) => ex.sets.every((s: any) => s.completed));
    if (!allDone) {
      Alert.alert('Incomplete', 'Not all sets complete. Finish anyway?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Finish Anyway', onPress: navigateToComplete },
      ]);
    } else {
      navigateToComplete();
    }
  };

  const navigateToComplete = () => {
    navigation.navigate('CompleteWorkout', { workout: currentWorkout });
  };

  // Progress calculations for the header bar
  const totalSets     = currentWorkout?.exercises?.reduce((t: number, ex: any) => t + ex.sets.length, 0) || 0;
  const completedSets = currentWorkout?.exercises?.reduce((t: number, ex: any) =>
    t + ex.sets.filter((s: any) => s.completed).length, 0) || 0;
  const progressPct   = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  if (!currentWorkout) return null;

  return (
    <View style={styles.container}>

      {/* ── Header: Back / Workout Title ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{currentWorkout.title}</Text>
        {/* Spacer keeps the title centred */}
        <View style={{ width: 60 }} />
      </View>

      {/* ── Progress Bar Header ── */}
      <View style={styles.progressHeader}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>PROGRESS</Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>
        <Text style={styles.setsCount}>{completedSets} / {totalSets} sets</Text>
        {/* Filled portion width is set dynamically as a percentage string */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Exercise Cards ── */}
        {currentWorkout.exercises.map((exercise: any, exIdx: number) => {
          const exCompleted = exercise.sets.filter((s: any) => s.completed).length;
          const allDone     = exCompleted === exercise.sets.length; // true when every set is ticked

          return (
            // Card border turns green when all sets for this exercise are completed
            <View key={exIdx} style={[styles.exerciseCard, allDone && styles.exerciseCardDone]}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {/* Badge shows "X/Y sets" — background turns green when complete */}
                <View style={[styles.exerciseBadge, allDone && styles.exerciseBadgeDone]}>
                  <Text style={styles.exerciseBadgeText}>{exCompleted}/{exercise.sets.length}</Text>
                </View>
              </View>

              {/* ── Set Rows ── */}
              {exercise.sets.map((set: any, setIdx: number) => (
                // Row background turns dark green when the set is marked complete
                <View key={setIdx} style={[styles.setRow, set.completed && styles.setRowDone]}>
                  {/* Tapping the left side also toggles completion */}
                  <TouchableOpacity style={styles.setLeft} onPress={() => handleSetComplete(exIdx, setIdx)} activeOpacity={0.7}>
                    <Text style={[styles.setNumber, set.completed && styles.setTextDone]}>Set {setIdx + 1}</Text>
                    <Text style={[styles.setDetails, set.completed && styles.setTextDone]}>
                      {set.reps} reps{set.weight > 0 ? ` @ ${set.weight}kg` : ''}
                    </Text>
                  </TouchableOpacity>
                  {/* Three-dot button opens the inline edit modal for this set */}
                  <TouchableOpacity
                    style={styles.editIconBtn}
                    onPress={() => { setEditTarget({ exIdx, setIdx }); setEditVisible(true); }}
                  >
                    <Text style={styles.editIconText}>···</Text>
                  </TouchableOpacity>
                  {/* Checkbox toggles set completion */}
                  <TouchableOpacity
                    style={[styles.checkbox, set.completed && styles.checkboxDone]}
                    onPress={() => handleSetComplete(exIdx, setIdx)}
                  >
                    {set.completed && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                </View>
              ))}

              {/* Rest timer button shown below the last set of each exercise */}
              <TouchableOpacity style={styles.restInlineBtn} onPress={() => setTimerVisible(true)}>
                <Text style={styles.restInlineIcon}>🕐</Text>
                <Text style={styles.restInlineText}>Start Rest Timer</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* ── Complete Workout Button — turns green when 100% done ── */}
        <TouchableOpacity
          style={[styles.completeBtn, progressPct === 100 && styles.completeBtnReady]}
          onPress={handleComplete}
        >
          <Text style={styles.completeBtnText}>
            {progressPct === 100 ? '🏆  Complete Workout' : '✓  Finish Workout'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <RestTimer visible={timerVisible} onClose={() => setTimerVisible(false)} />
      <EditSetModal
        visible={editVisible}
        // Safely reads the set data for whichever set is being edited
        set={editTarget ? currentWorkout.exercises[editTarget.exIdx]?.sets[editTarget.setIdx] : null}
        setIndex={editTarget?.setIdx ?? 0}
        exerciseName={editTarget ? currentWorkout.exercises[editTarget.exIdx]?.name : ''}
        onSave={handleEditSave}
        onClose={() => { setEditVisible(false); setEditTarget(null); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  backBtn: { width: 60 },
  backText: { color: '#4A9EFF', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },

  // Progress bar section below the header
  progressHeader: { backgroundColor: '#0d1f3c', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a3a6b' },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  progressLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  progressPct: { color: '#4A9EFF', fontSize: 18, fontWeight: '800' },
  setsCount: { color: '#5a7fa8', fontSize: 12, marginBottom: 8 },
  progressTrack: { height: 6, backgroundColor: '#1a3a6b', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A9EFF', borderRadius: 3 },

  content: { padding: 16 },

  // Exercise card
  exerciseCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16, padding: 16,
    marginBottom: 14, borderTopWidth: 3, borderTopColor: '#1a3a6b', elevation: 4,
  },
  exerciseCardDone: { borderTopColor: '#26de81' },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseName: { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 },
  exerciseBadge: { backgroundColor: '#1a3a6b', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  exerciseBadgeDone: { backgroundColor: '#26de81' },
  exerciseBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Set row
  setRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0a1628', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8,
  },
  setRowDone: { backgroundColor: '#0d2a1a' },
  setLeft: { flex: 1 },
  setNumber: { color: '#fff', fontSize: 14, fontWeight: '700' },
  setDetails: { color: '#5a7fa8', fontSize: 13, marginTop: 2 },
  setTextDone: { color: '#26de81' },
  editIconBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  editIconText: { color: '#2a4a7f', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#2a4a7f', alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: '#26de81', borderColor: '#26de81' },
  checkmark: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Rest timer trigger (below each exercise's sets)
  restInlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 6, paddingVertical: 8, gap: 6,
    borderTopWidth: 1, borderTopColor: '#1a3a6b',
  },
  restInlineIcon: { fontSize: 16 },
  restInlineText: { color: '#2a4a7f', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  completeBtn: { backgroundColor: '#4A9EFF', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 8 },
  completeBtnReady: { backgroundColor: '#26de81' },
  completeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Shared bottom sheet modal styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0d1f3c', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  handle: { width: 40, height: 4, backgroundColor: '#1a3a6b', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: '#5a7fa8', fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  sheetControls: { gap: 10 },
  startBtn: { backgroundColor: '#7B6FFF', borderRadius: 14, padding: 14, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stopBtn: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FF6B6B', backgroundColor: '#FF6B6B22' },
  stopBtnText: { color: '#FF6B6B', fontSize: 16, fontWeight: '800' },
  dismissBtn: { padding: 14, alignItems: 'center' },
  dismissText: { color: '#5a7fa8', fontSize: 15, fontWeight: '600' },

  // Rest timer circle
  timerCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#7B6FFF',
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  timerCircleDone: { borderColor: '#26de81' },
  timerCountdown: { color: '#fff', fontSize: 36, fontWeight: '800' },
  timerDoneLabel: { color: '#26de81', fontSize: 13, fontWeight: '700', marginTop: 4 },
  presets: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a3a6b' },
  presetActive: { backgroundColor: '#7B6FFF' },
  presetText: { color: '#5a7fa8', fontSize: 13, fontWeight: '700' },
  presetTextActive: { color: '#fff' },

  // Edit set modal
  editSubtitle: { color: '#8ab4f8', fontSize: 13, textAlign: 'center', marginBottom: 20, marginTop: -12 },
  editRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  editField: { flex: 1 },
  editLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', marginBottom: 10 },
  spinnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spinBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1a3a6b', alignItems: 'center', justifyContent: 'center' },
  spinBtnText: { color: '#4A9EFF', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  spinInput: { flex: 1, backgroundColor: '#0a1628', color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#1a3a6b' },
  saveBtn: { backgroundColor: '#4A9EFF', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});