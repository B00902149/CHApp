/**
 * MyWorkoutsScreen.tsx — Coaching Hub
 * Active tab: View · Start · Edit (inline) · Delete
 * History tab: completed sessions with full breakdown
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert, Modal, TextInput, FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { workoutStorage, workoutHistory, SavedWorkout, CompletedWorkout } from '../services/workoutStorage';
import { exerciseDB, Exercise } from '../services/exerciseDB';

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0a1628',
  card:    '#0d1f3c',
  border:  '#1a3a6b',
  blue:    '#4A9EFF',
  white:   '#FFFFFF',
  textSec: '#5a7fa8',
  textMid: '#2a4a7f',
  green:   '#26de81',
  red:     '#FF6B6B',
  yellow:  '#FF9F43',
  purple:  '#7B6FFF',
};

const CATEGORY_COLORS: Record<string, string> = {
  strength:              '#4A9EFF',
  cardio:                '#FF6B6B',
  stretching:            '#26de81',
  plyometrics:           '#FF9F43',
  powerlifting:          '#7B6FFF',
  olympic_weightlifting: '#FFD700',
};

const RATING_LABELS: Record<number, string> = { 1:'😅', 2:'💪', 3:'👍', 4:'🔥', 5:'🏆' };

const catColor = (cat: string) => CATEGORY_COLORS[cat] || C.blue;
const fmtDate  = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

// ── Inline Edit Card ──────────────────────────────────────────────────────────
function EditCard({
  workout,
  onSave,
  onCancel,
}: {
  workout: SavedWorkout;
  onSave: (name: string, exercises: SavedWorkout['exercises']) => void;
  onCancel: () => void;
}) {
  const [name,      setName]      = useState(workout.name);
  const [exercises, setExercises] = useState(workout.exercises);

  // Exercise picker state
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [query,       setQuery]       = useState('');
  const [filter,      setFilter]      = useState('all');
  const [results,     setResults]     = useState<Exercise[]>([]);
  const [loadingEx,   setLoadingEx]   = useState(false);

  const openPicker = async () => {
    setPickerOpen(true);
    setLoadingEx(true);
    const data = await exerciseDB.search('', 'all');
    setResults(data);
    setLoadingEx(false);
  };

  const searchExercises = async (q: string, f: string) => {
    setLoadingEx(true);
    const data = await exerciseDB.search(q, f);
    setResults(data);
    setLoadingEx(false);
  };

  const addExercise = (ex: Exercise) => {
    if (exercises.find(e => e.exercise.id === ex.id)) return;
    setExercises(prev => [...prev, {
      exercise: { id: ex.id, name: ex.name, category: ex.category, primaryMuscles: ex.primaryMuscles, level: ex.level },
      sets: 3, reps: '10', rest: 60, notes: '',
    }]);
    setPickerOpen(false);
  };

  const removeExercise = (id: string) =>
    setExercises(prev => prev.filter(e => e.exercise.id !== id));

  const FILTER_OPTIONS = ['all','strength','cardio','stretching','plyometrics','powerlifting'];

  return (
    <View style={[s.card, { borderLeftColor: C.yellow, paddingBottom: 0 }]}>
      <LinearGradient colors={[C.yellow + '18', 'transparent']} style={s.cardGrad} start={{x:0,y:0}} end={{x:1,y:0}} />

      {/* Edit mode header */}
      <View style={es.editHeader}>
        <Text style={es.editLabel}>EDITING WORKOUT</Text>
        <View style={es.editHeaderBtns}>
          <TouchableOpacity style={es.cancelBtn} onPress={onCancel}>
            <Text style={es.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={es.saveBtn} onPress={() => {
            if (!name.trim()) { Alert.alert('Name required', 'Enter a workout name.'); return; }
            if (!exercises.length) { Alert.alert('No exercises', 'Add at least one exercise.'); return; }
            onSave(name, exercises);
          }}>
            <Text style={es.saveBtnTxt}>Save ✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rename field */}
      <TextInput
        style={es.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="Workout name..."
        placeholderTextColor={C.textMid}
        maxLength={40}
      />

      {/* Exercise list */}
      <Text style={es.sectionLabel}>EXERCISES  ·  {exercises.length}</Text>
      {exercises.map((e, i) => {
        const color = catColor(e.exercise.category);
        return (
          <View key={e.exercise.id} style={[es.exRow, { borderLeftColor: color }]}>
            <View style={[es.exNum, { backgroundColor: color + '22' }]}>
              <Text style={[es.exNumTxt, { color }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={es.exName}>{e.exercise.name}</Text>
              <Text style={es.exMeta}>{e.sets} sets · {e.reps} reps · {e.rest}s rest</Text>
            </View>
            <TouchableOpacity style={es.removeBtn} onPress={() => removeExercise(e.exercise.id)}>
              <Text style={es.removeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Add exercise button */}
      <TouchableOpacity style={es.addExBtn} onPress={openPicker}>
        <Text style={es.addExTxt}>＋  Add Exercise</Text>
      </TouchableOpacity>

      {/* Exercise picker modal */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={es.pickerOverlay}>
          <View style={es.pickerSheet}>
            <View style={es.pickerHeader}>
              <Text style={es.pickerTitle}>ADD EXERCISE</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text style={es.pickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={es.searchRow}>
              <Text style={{fontSize:16}}>🔍</Text>
              <TextInput
                style={es.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={C.textMid}
                value={query}
                onChangeText={q => { setQuery(q); searchExercises(q, filter); }}
                autoFocus
              />
              {!!query && (
                <TouchableOpacity onPress={() => { setQuery(''); searchExercises('', filter); }}>
                  <Text style={{color:C.textSec}}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}} contentContainerStyle={{gap:6,paddingHorizontal:16}}>
              {FILTER_OPTIONS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[es.filterChip, filter===f && es.filterChipOn]}
                  onPress={() => { setFilter(f); searchExercises(query, f); }}
                >
                  <Text style={[es.filterChipTxt, filter===f && {color:C.white}]}>
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingEx ? (
              <ActivityIndicator color={C.blue} style={{marginTop:40}} />
            ) : (
              <FlatList
                data={results}
                keyExtractor={item => item.id}
                contentContainerStyle={{padding:16, gap:8}}
                renderItem={({ item }) => {
                  const color    = catColor(item.category);
                  const added    = exercises.some(e => e.exercise.id === item.id);
                  return (
                    <TouchableOpacity
                      style={[es.pickerRow, { borderLeftColor: color }, added && {opacity:0.4}]}
                      onPress={() => !added && addExercise(item)}
                      disabled={added}
                    >
                      <View style={{flex:1}}>
                        <Text style={es.exName}>{item.name}</Text>
                        <Text style={[es.exMeta, {color}]}>{item.category}  ·  {item.primaryMuscles[0]}</Text>
                      </View>
                      <Text style={{color: added ? C.green : color, fontSize:20, fontWeight:'700'}}>
                        {added ? '✓' : '＋'}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ workout, visible, onClose, onStart }: {
  workout: SavedWorkout | null; visible: boolean;
  onClose: () => void; onStart: () => void;
}) {
  if (!workout) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={ms.sheet} activeOpacity={1}>
          <View style={ms.handle} />
          <Text style={ms.sheetLabel}>WORKOUT PREVIEW</Text>
          <Text style={ms.sheetTitle}>{workout.name}</Text>
          <Text style={ms.sheetMeta}>
            💪 {workout.exercises.length} exercises  ·  📋 {workout.totalSets} sets  ·  ⏱ ~{workout.estimatedTime}m
          </Text>
          <ScrollView style={ms.exList} showsVerticalScrollIndicator={false}>
            {workout.exercises.map((e, i) => {
              const color = catColor(e.exercise.category);
              return (
                <View key={i} style={[ms.exRow, { borderLeftColor: color }]}>
                  <View style={{flex:1}}>
                    <Text style={ms.exName}>{e.exercise.name}</Text>
                    <Text style={ms.exMeta}>{e.sets} sets × {e.reps} reps  ·  {e.rest}s rest</Text>
                  </View>
                  <View style={[ms.catChip, { backgroundColor: color+'22', borderColor: color }]}>
                    <Text style={[ms.catChipTxt, { color }]}>{e.exercise.category}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={ms.startBtn} onPress={onStart}>
            <Text style={ms.startBtnTxt}>▶  Start Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
            <Text style={ms.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── History Detail Modal ───────────────────────────────────────────────────────
function HistoryModal({ session, visible, onClose }: {
  session: CompletedWorkout | null; visible: boolean; onClose: () => void;
}) {
  if (!session) return null;
  const pct = session.totalSets > 0 ? Math.round((session.completedSets / session.totalSets) * 100) : 0;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[ms.sheet, { maxHeight:'88%' }]} activeOpacity={1}>
          <View style={ms.handle} />
          <Text style={ms.sheetLabel}>COMPLETED SESSION</Text>
          <Text style={ms.sheetTitle}>{session.name}</Text>
          <Text style={[ms.sheetMeta, { marginBottom:14 }]}>{fmtDate(session.completedAt)}</Text>
          <View style={ms.statStrip}>
            {[
              { v: session.completedSets, l:'Sets Done' },
              { v: `${pct}%`,             l:'Complete'  },
              { v: RATING_LABELS[session.rating]||'—', l:'Rating' },
            ].map((st, i, arr) => (
              <React.Fragment key={st.l}>
                <View style={ms.statItem}>
                  <Text style={ms.statVal}>{st.v}</Text>
                  <Text style={ms.statLbl}>{st.l}</Text>
                </View>
                {i < arr.length-1 && <View style={ms.statDiv}/>}
              </React.Fragment>
            ))}
          </View>
          {!!session.notes && (
            <View style={ms.notesBox}>
              <Text style={ms.notesLabel}>NOTES</Text>
              <Text style={ms.notesText}>{session.notes}</Text>
            </View>
          )}
          <Text style={[ms.sheetLabel,{marginBottom:8}]}>EXERCISES</Text>
          <ScrollView style={ms.exList} showsVerticalScrollIndicator={false}>
            {session.exercises.map((ex, ei) => {
              const done = ex.sets.filter(s => s.completed).length;
              return (
                <View key={ei} style={ms.histExCard}>
                  <View style={ms.histExHeader}>
                    <Text style={ms.exName}>{ex.name}</Text>
                    <Text style={[ms.catChipTxt,{color:done===ex.sets.length?C.green:C.yellow}]}>
                      {done}/{ex.sets.length} sets
                    </Text>
                  </View>
                  {ex.sets.map((s, si) => (
                    <View key={si} style={ms.setRow}>
                      <Text style={[ms.setTxt,s.completed&&{color:C.green}]}>Set {si+1}</Text>
                      <Text style={[ms.setDetail,s.completed&&{color:C.green}]}>
                        {s.reps} reps{s.weight>0?` @ ${s.weight}kg`:''}
                      </Text>
                      <Text style={{fontSize:14}}>{s.completed?'✅':'⬜'}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
            <Text style={ms.cancelBtnTxt}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function MyWorkoutsScreen({ route, navigation }: any) {
  const [tab,       setTab]       = useState<'active'|'completed'>(
    route?.params?.tab === 'completed' ? 'completed' : 'active'
  );
  const [templates, setTemplates] = useState<SavedWorkout[]>([]);
  const [history,   setHistory]   = useState<CompletedWorkout[]>([]);
  const [preview,   setPreview]   = useState<SavedWorkout | null>(null);
  const [detail,    setDetail]    = useState<CompletedWorkout | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // id of card in edit mode

  useFocusEffect(
    useCallback(() => {
      workoutStorage.getAll().then(setTemplates);
      workoutHistory.getAll().then(setHistory);
      // If navigated here with tab param, switch to it
      if (route?.params?.tab === 'completed') setTab('completed');
    }, [route?.params?.tab])
  );

  const startWorkout = (w: SavedWorkout) => {
    setPreview(null);
    navigation.navigate('ExerciseProgress', {
      workout: {
        _id: w.id, title: w.name, isLocal: true,
        exercises: w.exercises.map(e => ({
          name: e.exercise.name,
          sets: Array.from({ length: e.sets }, () => ({
            reps: parseInt(e.reps) || 10, weight: 0, completed: false,
          })),
        })),
      },
    });
  };

  const handleSaveEdit = async (id: string, name: string, exercises: SavedWorkout['exercises']) => {
    const all = await workoutStorage.getAll();
    const original = all.find(w => w.id === id);
    if (!original) return;

    const totalSets     = exercises.reduce((n, e) => n + e.sets, 0);
    const estimatedTime = Math.round(exercises.reduce((n, e) =>
      n + (e.sets * (parseFloat(e.reps) || 10) * 3 + e.sets * e.rest) / 60, 0));

    const updated: SavedWorkout = { ...original, name, exercises, totalSets, estimatedTime };
    await workoutStorage.update(updated);
    setTemplates(prev => prev.map(w => w.id === id ? updated : w));
    setEditingId(null);
  };

  const deleteTemplate = (id: string) => {
    Alert.alert('Delete Workout', 'Remove this workout template?', [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        await workoutStorage.delete(id);
        setTemplates(prev => prev.filter(w => w.id !== id));
      }},
    ]);
  };

  const deleteHistory = (id: string) => {
    Alert.alert('Delete Session', 'Remove this session from history?', [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        await workoutHistory.delete(id);
        setHistory(prev => prev.filter(h => h.id !== id));
      }},
    ]);
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{width:64}}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>MY WORKOUTS</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => navigation.navigate('CreateWorkoutScreen')}>
          <Text style={s.newBtnTxt}>＋ New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity style={[s.tab, tab==='active'&&s.tabActive]} onPress={() => setTab('active')}>
          <Text style={[s.tabTxt, tab==='active'&&s.tabTxtActive]}>
            Active{templates.length > 0 ? ` (${templates.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab==='completed'&&s.tabActive]} onPress={() => setTab('completed')}>
          <Text style={[s.tabTxt, tab==='completed'&&s.tabTxtActive]}>
            Completed{history.length > 0 ? ` (${history.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ACTIVE TAB ─────────────────────────────────────────────────────── */}
      {tab === 'active' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {templates.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🏗</Text>
              <Text style={s.emptyTitle}>No saved workouts yet</Text>
              <Text style={s.emptySub}>Build your first custom workout</Text>
              <TouchableOpacity style={s.blueBtn} onPress={() => navigation.navigate('CreateWorkoutScreen')}>
                <Text style={s.blueBtnTxt}>Create Workout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            templates.map(w => {
              // ── Edit mode ──────────────────────────────────────────────────
              if (editingId === w.id) {
                return (
                  <EditCard
                    key={w.id}
                    workout={w}
                    onSave={(name, exercises) => handleSaveEdit(w.id, name, exercises)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              // ── View mode ──────────────────────────────────────────────────
              const color = catColor(w.exercises[0]?.exercise?.category || 'strength');
              const date  = fmtDate(w.createdAt);
              return (
                <View key={w.id} style={[s.card, { borderLeftColor: color }]}>
                  <LinearGradient colors={[color+'18','transparent']} style={s.cardGrad} start={{x:0,y:0}} end={{x:1,y:0}}/>
                  <View style={{flex:1}}>
                    <Text style={s.cardTitle}>{w.name}</Text>
                    <Text style={s.cardMeta}>
                      💪 {w.exercises.length} exercises  ·  📋 {w.totalSets} sets  ·  ⏱ ~{w.estimatedTime}m
                    </Text>
                    <Text style={s.cardDate}>Created {date}</Text>

                    {/* Exercise pills */}
                    <View style={s.pillRow}>
                      {w.exercises.slice(0,3).map((e,i) => (
                        <View key={i} style={[s.pill,{borderColor:catColor(e.exercise.category)}]}>
                          <Text style={[s.pillTxt,{color:catColor(e.exercise.category)}]} numberOfLines={1}>
                            {e.exercise.name}
                          </Text>
                        </View>
                      ))}
                      {w.exercises.length > 3 && (
                        <View style={s.pill}><Text style={s.pillTxt}>+{w.exercises.length-3} more</Text></View>
                      )}
                    </View>

                    {/* Action buttons */}
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.actionBtn} onPress={() => setPreview(w)}>
                        <Text style={s.actionIcon}>👁</Text>
                        <Text style={s.actionLabel}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => startWorkout(w)}>
                        <Text style={s.actionIcon}>▶</Text>
                        <Text style={[s.actionLabel,{color:C.white}]}>Start</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, s.actionBtnEdit]} onPress={() => setEditingId(w.id)}>
                        <Text style={s.actionIcon}>✏️</Text>
                        <Text style={[s.actionLabel,{color:C.yellow}]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => deleteTemplate(w.id)}>
                        <Text style={s.actionIcon}>🗑</Text>
                        <Text style={[s.actionLabel,{color:C.red}]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
          <View style={{height:40}}/>
        </ScrollView>
      )}

      {/* ── HISTORY TAB ────────────────────────────────────────────────────── */}
      {tab === 'completed' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📋</Text>
              <Text style={s.emptyTitle}>No completed workouts yet</Text>
              <Text style={s.emptySub}>Complete a workout and it will appear here</Text>
            </View>
          ) : (
            history.map(h => {
              const pct   = h.totalSets > 0 ? Math.round((h.completedSets/h.totalSets)*100) : 0;
              const color = pct===100 ? C.green : pct>=50 ? C.yellow : C.red;
              return (
                <TouchableOpacity key={h.id} style={[s.card,{borderLeftColor:color}]} onPress={() => setDetail(h)} activeOpacity={0.8}>
                  <LinearGradient colors={[color+'18','transparent']} style={s.cardGrad} start={{x:0,y:0}} end={{x:1,y:0}}/>
                  <View style={{flex:1}}>

                    {/* Title row + completion badge */}
                    <View style={s.histCardTop}>
                      <Text style={s.cardTitle}>{h.name}</Text>
                      <View style={[s.pctBadge,{borderColor:color}]}>
                        <Text style={[s.pctBadgeTxt,{color}]}>{pct}%</Text>
                      </View>
                    </View>

                    {/* Date + sets meta */}
                    <Text style={s.cardDate}>{fmtDate(h.completedAt)}  ·  ✅ {h.completedSets}/{h.totalSets} sets</Text>

                    {/* Progress bar */}
                    <View style={[s.progTrack,{marginBottom:12}]}>
                      <View style={[s.progFill,{width:`${pct}%` as any, backgroundColor:color}]}/>
                    </View>

                    {/* Star rating — always shown */}
                    <View style={s.histRatingRow}>
                      {[1,2,3,4,5].map(star => (
                        <Text key={star} style={[s.histStar, star <= h.rating && s.histStarFilled]}>★</Text>
                      ))}
                      {h.rating > 0 && (
                        <Text style={s.histRatingLabel}>{RATING_LABELS[h.rating]}  {['','Rough','Keep pushing','Solid effort','Great workout','Crushed it!'][h.rating]}</Text>
                      )}
                    </View>

                    {/* Notes — shown if present */}
                    {!!h.notes && (
                      <View style={s.histNotesBox}>
                        <Text style={s.histNotesText}>💬  {h.notes}</Text>
                      </View>
                    )}

                    <Text style={[s.cardDate,{marginTop:8}]}>Tap to see full breakdown ›</Text>
                  </View>

                  <TouchableOpacity style={[s.deleteCircle,{alignSelf:'flex-start',marginLeft:8}]} onPress={() => deleteHistory(h.id)}>
                    <Text style={s.deleteCircleTxt}>🗑</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{height:40}}/>
        </ScrollView>
      )}

      <PreviewModal workout={preview} visible={!!preview} onClose={() => setPreview(null)} onStart={() => preview && startWorkout(preview)}/>
      <HistoryModal session={detail} visible={!!detail} onClose={() => setDetail(null)}/>
    </View>
  );
}

// ── Screen styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex:1, backgroundColor:C.bg },
  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingTop: Platform.OS==='ios' ? 54 : 36,
    paddingBottom:12, paddingHorizontal:16,
    backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border,
  },
  backTxt:     { color:C.blue, fontSize:15, fontWeight:'500' },
  headerTitle: { color:C.white, fontSize:18, fontWeight:'700', letterSpacing:1.5 },
  newBtn:      { backgroundColor:'rgba(74,158,255,0.2)', borderRadius:8, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:C.blue },
  newBtnTxt:   { color:C.blue, fontWeight:'700', fontSize:13 },
  tabBar:       { flexDirection:'row', backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border },
  tab:          { flex:1, paddingVertical:14, alignItems:'center' },
  tabActive:    { borderBottomWidth:2, borderBottomColor:C.blue },
  tabTxt:       { color:C.textSec, fontSize:14, fontWeight:'600' },
  tabTxtActive: { color:C.white, fontWeight:'700' },
  scroll: { padding:16 },
  empty:      { alignItems:'center', paddingTop:80 },
  emptyEmoji: { fontSize:56, marginBottom:16 },
  emptyTitle: { color:C.white, fontSize:18, fontWeight:'700', marginBottom:8 },
  emptySub:   { color:C.textSec, fontSize:14, textAlign:'center', marginBottom:24, paddingHorizontal:30 },
  blueBtn:    { backgroundColor:C.blue, borderRadius:12, paddingVertical:13, paddingHorizontal:28, alignItems:'center' },
  blueBtnTxt: { color:C.white, fontWeight:'700', fontSize:15 },
  card: {
    backgroundColor:C.card, borderRadius:16, marginBottom:12,
    borderLeftWidth:4, borderTopWidth:1, borderRightWidth:1, borderBottomWidth:1,
    borderTopColor:C.border, borderRightColor:C.border, borderBottomColor:C.border,
    padding:14, overflow:'hidden',
  },
  cardGrad:  { ...StyleSheet.absoluteFillObject },
  cardTitle: { color:C.white, fontSize:16, fontWeight:'800', marginBottom:4 },
  cardMeta:  { color:C.blue, fontSize:12, fontWeight:'600', marginBottom:3 },
  cardDate:  { color:C.textSec, fontSize:11, marginBottom:8 },
  pillRow: { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:4 },
  pill:    { borderWidth:1, borderColor:C.border, borderRadius:20, paddingHorizontal:8, paddingVertical:3 },
  pillTxt: { color:C.textSec, fontSize:11, fontWeight:'600' },
  actionRow:        { flexDirection:'row', gap:6, marginTop:12 },
  actionBtn:        { flex:1, alignItems:'center', paddingVertical:9, borderRadius:10, backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:C.border, gap:3 },
  actionBtnPrimary: { backgroundColor:'rgba(74,158,255,0.2)', borderColor:C.blue },
  actionBtnEdit:    { backgroundColor:'rgba(255,159,67,0.12)', borderColor:'rgba(255,159,67,0.4)' },
  actionBtnDanger:  { backgroundColor:'rgba(255,107,107,0.08)', borderColor:'rgba(255,107,107,0.3)' },
  actionIcon:  { fontSize:15 },
  actionLabel: { color:C.textSec, fontSize:11, fontWeight:'700' },
  histCardTop: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 },
  pctBadge:    { borderWidth:1.5, borderRadius:8, paddingHorizontal:8, paddingVertical:2 },
  pctBadgeTxt: { fontSize:12, fontWeight:'800' },
  progTrack:   { height:4, backgroundColor:C.border, borderRadius:2, overflow:'hidden', marginBottom:6 },
  progFill:    { height:'100%', borderRadius:2 },
  notesPreview:{ color:C.textSec, fontSize:12, fontStyle:'italic' },

  histRatingRow:   { flexDirection:'row', alignItems:'center', gap:4, marginBottom:8 },
  histStar:        { fontSize:18, color:C.border },
  histStarFilled:  { color:'#FFD700' },
  histRatingLabel: { color:C.textSec, fontSize:12, fontWeight:'600', marginLeft:4 },
  histNotesBox:    { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:8, borderLeftWidth:2, borderLeftColor:C.blue, padding:10, marginBottom:4 },
  histNotesText:   { color:'rgba(255,255,255,0.75)', fontSize:13, lineHeight:18, fontStyle:'italic' },
  deleteCircle:    { width:34, height:34, borderRadius:17, backgroundColor:'rgba(255,107,107,0.1)', borderWidth:1, borderColor:C.red, alignItems:'center', justifyContent:'center', marginLeft:8, alignSelf:'center' },
  deleteCircleTxt: { fontSize:15 },
});

// ── Edit card styles ───────────────────────────────────────────────────────────
const es = StyleSheet.create({
  editHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  editLabel:     { color:C.yellow, fontSize:10, fontWeight:'800', letterSpacing:1.5 },
  editHeaderBtns:{ flexDirection:'row', gap:8 },
  cancelBtn:     { paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:C.border },
  cancelBtnTxt:  { color:C.textSec, fontSize:13, fontWeight:'600' },
  saveBtn:       { paddingHorizontal:12, paddingVertical:6, borderRadius:8, backgroundColor:C.green },
  saveBtnTxt:    { color:C.white, fontSize:13, fontWeight:'700' },
  nameInput: {
    backgroundColor:'rgba(255,255,255,0.06)', borderRadius:10, borderWidth:1.5,
    borderColor:C.yellow, padding:12, fontSize:16, fontWeight:'700',
    color:C.white, marginBottom:16,
  },
  sectionLabel: { color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:10 },
  exRow: {
    flexDirection:'row', alignItems:'center', gap:10,
    backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10,
    borderLeftWidth:3, padding:10, marginBottom:8,
  },
  exNum:    { width:26, height:26, borderRadius:6, alignItems:'center', justifyContent:'center' },
  exNumTxt: { fontSize:13, fontWeight:'800' },
  exName:   { color:C.white, fontSize:14, fontWeight:'700', marginBottom:2 },
  exMeta:   { color:C.textSec, fontSize:11, textTransform:'capitalize' },
  removeBtn:  { width:28, height:28, borderRadius:6, backgroundColor:'rgba(255,107,107,0.15)', alignItems:'center', justifyContent:'center' },
  removeTxt:  { color:C.red, fontSize:13, fontWeight:'700' },
  addExBtn:   { borderWidth:1.5, borderColor:C.blue, borderRadius:10, borderStyle:'dashed', paddingVertical:12, alignItems:'center', marginTop:4, marginBottom:14 },
  addExTxt:   { color:C.blue, fontWeight:'700', fontSize:14 },
  pickerOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end' },
  pickerSheet:   { backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, height:'80%' },
  pickerHeader:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:20, borderBottomWidth:1, borderBottomColor:C.border },
  pickerTitle:   { color:C.textSec, fontSize:11, fontWeight:'800', letterSpacing:2 },
  pickerClose:   { color:C.textSec, fontSize:20, fontWeight:'700', padding:4 },
  searchRow:     { flexDirection:'row', alignItems:'center', gap:10, margin:16, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:10, borderWidth:1, borderColor:C.border, paddingHorizontal:12, paddingVertical:10 },
  searchInput:   { flex:1, color:C.white, fontSize:15 },
  filterChip:    { paddingHorizontal:12, paddingVertical:6, borderRadius:20, backgroundColor:C.border },
  filterChipOn:  { backgroundColor:C.blue },
  filterChipTxt: { color:C.textSec, fontSize:12, fontWeight:'700', textTransform:'capitalize' },
  pickerRow:     { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, borderLeftWidth:3, padding:12 },
});

// ── Modal styles ───────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end' },
  sheet:    { backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:36, maxHeight:'80%' },
  handle:   { width:40, height:4, backgroundColor:C.border, borderRadius:2, alignSelf:'center', marginBottom:20 },
  sheetLabel: { color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:6 },
  sheetTitle: { color:C.white, fontSize:22, fontWeight:'800', marginBottom:4 },
  sheetMeta:  { color:C.blue, fontSize:13, fontWeight:'600', marginBottom:16 },
  exList: { maxHeight:280, marginBottom:16 },
  exRow: { borderLeftWidth:3, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:10, marginBottom:8, flexDirection:'row', alignItems:'center' },
  exName:     { color:C.white, fontSize:14, fontWeight:'700', marginBottom:3 },
  exMeta:     { color:C.textSec, fontSize:12, textTransform:'capitalize' },
  catChip:    { borderWidth:1, borderRadius:20, paddingHorizontal:8, paddingVertical:3, marginLeft:8 },
  catChipTxt: { fontSize:11, fontWeight:'700', textTransform:'capitalize' },
  startBtn:    { backgroundColor:C.blue, borderRadius:14, padding:14, alignItems:'center', marginBottom:10 },
  startBtnTxt: { color:C.white, fontWeight:'800', fontSize:16 },
  cancelBtn:   { padding:14, alignItems:'center' },
  cancelBtnTxt:{ color:C.textSec, fontWeight:'600', fontSize:15 },
  statStrip: { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:14, marginBottom:14 },
  statItem:  { flex:1, alignItems:'center' },
  statVal:   { color:C.white, fontSize:22, fontWeight:'800' },
  statLbl:   { color:C.textSec, fontSize:11, marginTop:3 },
  statDiv:   { width:1, backgroundColor:C.border, marginVertical:4 },
  notesBox:   { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:12, marginBottom:14 },
  notesLabel: { color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:6 },
  notesText:  { color:C.white, fontSize:13, lineHeight:20 },
  histExCard:   { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:12, marginBottom:8 },
  histExHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  setRow:     { flexDirection:'row', alignItems:'center', paddingVertical:5, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.05)' },
  setTxt:     { color:C.textSec, fontSize:13, fontWeight:'700', width:50 },
  setDetail:  { color:C.textSec, fontSize:13, flex:1 },
});