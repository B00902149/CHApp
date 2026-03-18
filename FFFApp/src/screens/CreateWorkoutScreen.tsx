import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList,
  TouchableOpacity, TextInput, StyleSheet,
  Platform, StatusBar, Alert, ActivityIndicator, Image,
} from 'react-native';
import { exerciseDB, Exercise } from '../services/exerciseDB';
import { workoutStorage } from '../services/workoutStorage';

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
};

const LEVEL_COLORS: Record<string, string> = {
  beginner:     '#26de81',
  intermediate: '#FF9F43',
  expert:       '#FF6B6B',
};

const CATEGORY_COLORS: Record<string, string> = {
  strength:              '#4A9EFF',
  cardio:                '#FF6B6B',
  stretching:            '#26de81',
  plyometrics:           '#FF9F43',
  powerlifting:          '#7B6FFF',
  olympic_weightlifting: '#FFD700',
};

const FILTERS = [
  { id:'all',                   label:'All'        },
  { id:'strength',              label:'Strength'   },
  { id:'cardio',                label:'Cardio'     },
  { id:'stretching',            label:'Stretching' },
  { id:'plyometrics',           label:'Plyometrics'},
  { id:'powerlifting',          label:'Powerlifting'},
  { id:'olympic_weightlifting', label:'Olympic'    },
];

// ─── Builder Row ──────────────────────────────────────────────────────────────
function BuilderRow({
  item, index, onRemove, onUpdate,
}: {
  item: any; index: number; onRemove: () => void; onUpdate: (u: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const color = CATEGORY_COLORS[item.exercise.category] || C.blue;

  return (
    <View style={[styles.builderRow, { borderTopColor: color }]}>
      <TouchableOpacity style={styles.builderRowHead} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={[styles.indexBadge, { backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[styles.indexText, { color }]}>{index + 1}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={styles.builderName}>{item.exercise.name}</Text>
          <Text style={styles.builderMeta}>
            {item.exercise.primaryMuscles[0]}  ·  {item.sets}×{item.reps}  ·  {item.rest}s rest
          </Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.builderExpanded}>
          <View style={styles.paramRow}>
            <View style={styles.param}>
              <Text style={styles.paramLabel}>Sets</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => onUpdate({ sets: Math.max(1, item.sets - 1) })}>
                  <Text style={styles.stepBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{item.sets}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => onUpdate({ sets: Math.min(10, item.sets + 1) })}>
                  <Text style={styles.stepBtnTxt}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.param}>
              <Text style={styles.paramLabel}>Reps</Text>
              <TextInput
                style={styles.paramInput}
                value={item.reps}
                onChangeText={v => onUpdate({ reps: v })}
                placeholder="10"
                placeholderTextColor={C.textSec}
              />
            </View>
            <View style={styles.param}>
              <Text style={styles.paramLabel}>Rest (s)</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => onUpdate({ rest: Math.max(0, item.rest - 15) })}>
                  <Text style={styles.stepBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{item.rest}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => onUpdate({ rest: item.rest + 15 })}>
                  <Text style={styles.stepBtnTxt}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Notes (e.g. pause at bottom)..."
            placeholderTextColor={C.textSec}
            value={item.notes || ''}
            onChangeText={v => onUpdate({ notes: v })}
            multiline
          />
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateWorkoutScreen({ route, navigation }: any) {
  const editWorkout = route?.params?.editWorkout ?? null;
  const isEditing   = !!editWorkout;

  // Pre-fill from existing workout when editing
  const [name,      setName]      = useState(isEditing ? editWorkout.name : '');
  const [built,     setBuilt]     = useState<any[]>(
    isEditing
      ? editWorkout.exercises.map((e: any) => ({
          exercise: e.exercise,
          sets:     e.sets,
          reps:     e.reps,
          rest:     e.rest,
          notes:    e.notes || '',
        }))
      : []
  );
  const [tab,       setTab]       = useState<'build' | 'browse'>('build');
  const [saving,    setSaving]    = useState(false);

  const [query,     setQuery]     = useState('');
  const [filter,    setFilter]    = useState('all');
  const [results,   setResults]   = useState<Exercise[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await exerciseDB.search('', 'all');
      setResults(data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      const data = await exerciseDB.search(query, filter);
      setResults(data);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query, filter]);

  const addEx = (ex: Exercise) => {
    if (built.find(b => b.exercise.id === ex.id)) {
      Alert.alert('Already added', `${ex.name} is already in your workout.`);
      return;
    }
    setBuilt(prev => [...prev, { exercise: ex, sets: 3, reps: '10', rest: 60, notes: '' }]);
    setTab('build');
  };

  const removeEx = (id: string) => setBuilt(prev => prev.filter(b => b.exercise.id !== id));
  const updateEx = (id: string, upd: any) =>
    setBuilt(prev => prev.map(b => b.exercise.id === id ? { ...b, ...upd } : b));

  const totalSets = built.reduce((n, b) => n + b.sets, 0);
  const estTime   = Math.round(built.reduce((n, b) =>
    n + (b.sets * (parseFloat(b.reps) || 10) * 3 + b.sets * b.rest) / 60, 0));

  // ── Save / Update to AsyncStorage ──────────────────────────────────────────
  const save = async () => {
    if (!name.trim())  { Alert.alert('Name required', 'Give your workout a name.'); return; }
    if (!built.length) { Alert.alert('No exercises', 'Add at least one exercise.'); return; }

    setSaving(true);
    try {
      const payload = {
        name,
        exercises: built.map(b => ({
          exercise: {
            id:             b.exercise.id,
            name:           b.exercise.name,
            category:       b.exercise.category,
            primaryMuscles: b.exercise.primaryMuscles,
            level:          b.exercise.level,
          },
          sets:  b.sets,
          reps:  b.reps,
          rest:  b.rest,
          notes: b.notes,
        })),
        totalSets,
        estimatedTime: estTime,
      };

      if (isEditing) {
        // Replace old entry: delete then re-save preserving original id/date would
        // require a full update method — simplest is delete + save with new id
        await workoutStorage.delete(editWorkout.id);
      }
      await workoutStorage.save(payload);

      const msg = isEditing
        ? `"${name}" has been updated.`
        : `"${name}" has been saved to My Workouts.`;
      Alert.alert(isEditing ? 'Updated! ✏️' : 'Saved! 🎉', msg, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderExercise = ({ item }: { item: Exercise }) => {
    const color      = CATEGORY_COLORS[item.category] || C.blue;
    const levelColor = LEVEL_COLORS[item.level] || C.blue;
    const imageUrl   = exerciseDB.getImageUrl(item, 0);
    const added      = built.some(b => b.exercise.id === item.id);

    return (
      <TouchableOpacity
        style={[styles.exCard, { borderTopColor: color }, added && styles.exCardAdded]}
        onPress={() => addEx(item)}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.exCardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.exCardImagePlaceholder, { backgroundColor: color + '22' }]}>
            <Text style={{ fontSize:28 }}>💪</Text>
          </View>
        )}
        <View style={styles.exCardInfo}>
          <Text style={styles.exCardName} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:3 }}>
            <Text style={[styles.exCardTag, { color }]}>{item.category}</Text>
            <Text style={{ color:C.textMid, fontSize:14 }}>·</Text>
            <Text style={[styles.exCardTag, { color: levelColor }]}>{item.level}</Text>
          </View>
          <Text style={styles.exCardMuscles} numberOfLines={1}>{item.primaryMuscles.join(', ')}</Text>
        </View>
        {added
          ? <Text style={[styles.exCardAction, { color: C.green }]}>✓</Text>
          : <Text style={[styles.exCardAction, { color }]}>＋</Text>
        }
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width:64 }}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'EDIT WORKOUT' : 'CREATE WORKOUT'}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveTxt}>{saving ? '...' : isEditing ? 'UPDATE' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Name */}
      <View style={styles.nameWrap}>
        <TextInput
          style={styles.nameInput}
          placeholder="Workout name..."
          placeholderTextColor={C.textSec}
          value={name}
          onChangeText={setName}
          maxLength={40}
        />
        {built.length > 0 && (
          <View style={styles.summaryRow}>
            {[`💪 ${built.length} exercises`, `📋 ${totalSets} sets`, `⏱ ~${estTime}m`].map(tag => (
              <View key={tag} style={styles.summaryPill}>
                <Text style={styles.summaryPillTxt}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'build' && styles.tabActive]} onPress={() => setTab('build')}>
          <Text style={[styles.tabTxt, tab === 'build' && styles.tabTxtActive]}>
            My Workout{built.length ? ` (${built.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'browse' && styles.tabActive]} onPress={() => setTab('browse')}>
          <Text style={[styles.tabTxt, tab === 'browse' && styles.tabTxtActive]}>Browse Exercises</Text>
        </TouchableOpacity>
      </View>

      {/* BUILD */}
      {tab === 'build' && (
        <ScrollView style={{ flex:1 }} contentContainerStyle={styles.buildContent} showsVerticalScrollIndicator={false}>
          {built.length === 0 ? (
            <View style={styles.emptyBuild}>
              <Text style={{ fontSize:48, marginBottom:12 }}>🏗</Text>
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptySubtitle}>Browse 800+ exercises to build your workout</Text>
              <TouchableOpacity style={[styles.blueBtn, { marginTop:20 }]} onPress={() => setTab('browse')}>
                <Text style={styles.blueBtnTxt}>Browse Exercises →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {built.map((item, i) => (
                <BuilderRow
                  key={item.exercise.id}
                  item={item}
                  index={i}
                  onRemove={() => removeEx(item.exercise.id)}
                  onUpdate={upd => updateEx(item.exercise.id, upd)}
                />
              ))}
              <TouchableOpacity style={styles.addMoreBtn} onPress={() => setTab('browse')}>
                <Text style={styles.addMoreTxt}>＋  Add More Exercises</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blueBtn} onPress={save} disabled={saving}>
                <Text style={styles.blueBtnTxt}>{saving ? 'Saving...' : 'SAVE WORKOUT'}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* BROWSE */}
      {tab === 'browse' && (
        <View style={{ flex:1 }}>
          <View style={styles.searchBar}>
            <Text style={{ fontSize:18 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or muscle..."
              placeholderTextColor={C.textMid}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {(query.length > 0 || searching) && (
              <TouchableOpacity onPress={() => setQuery('')}>
                {searching
                  ? <ActivityIndicator size="small" color={C.blue} />
                  : <Text style={{ color:C.textSec, fontSize:16, fontWeight:'700', padding:4 }}>✕</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, filter === f.id && styles.filterPillActive]}
                  onPress={() => setFilter(f.id)}
                >
                  <Text style={filter === f.id ? styles.filterTextActive : styles.filterText}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.resultsCount}>
            {loading ? 'Loading...' : `${results.length} EXERCISES  ·  TAP TO ADD`}
          </Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={C.blue} />
              <Text style={{ color:C.textSec, marginTop:12, fontSize:14 }}>Loading 800+ exercises...</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderExercise}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding:16, paddingBottom:60 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex:1, backgroundColor:C.bg },
  centered: { flex:1, justifyContent:'center', alignItems:'center', paddingTop:60 },

  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom:12, paddingHorizontal:16,
    backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border,
  },
  backTxt:     { color:C.blue, fontSize:15, fontWeight:'500' },
  headerTitle: { color:C.white, fontSize:18, fontWeight:'700', letterSpacing:1.5 },
  saveBtn:     { backgroundColor:C.blue, borderRadius:10, paddingHorizontal:16, paddingVertical:7 },
  saveTxt:     { color:C.white, fontWeight:'700', fontSize:13, letterSpacing:1 },

  nameWrap: {
    backgroundColor:C.card, paddingHorizontal:16, paddingVertical:12,
    borderBottomWidth:1, borderBottomColor:C.border,
  },
  nameInput: {
    fontSize:18, fontWeight:'700', color:C.white,
    paddingVertical:4, borderBottomWidth:2, borderBottomColor:C.blue,
  },
  summaryRow:     { flexDirection:'row', gap:8, marginTop:10, flexWrap:'wrap' },
  summaryPill:    { backgroundColor:'rgba(74,158,255,0.15)', borderRadius:20, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'rgba(74,158,255,0.3)' },
  summaryPillTxt: { color:C.blue, fontSize:12, fontWeight:'600' },

  tabBar:       { flexDirection:'row', backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border },
  tab:          { flex:1, paddingVertical:13, alignItems:'center' },
  tabActive:    { borderBottomWidth:2, borderBottomColor:C.blue },
  tabTxt:       { fontSize:14, fontWeight:'600', color:C.textSec },
  tabTxtActive: { color:C.white },

  buildContent:  { padding:16, paddingBottom:40 },
  emptyBuild:    { alignItems:'center', paddingVertical:60 },
  emptyTitle:    { color:C.white, fontSize:17, fontWeight:'700', marginBottom:6 },
  emptySubtitle: { color:C.textSec, fontSize:13, textAlign:'center', paddingHorizontal:30 },

  blueBtn:    { backgroundColor:C.blue, borderRadius:10, paddingVertical:14, alignItems:'center' },
  blueBtnTxt: { color:C.white, fontWeight:'700', fontSize:15, letterSpacing:0.8 },

  builderRow: {
    backgroundColor:C.card, borderRadius:12, marginBottom:10, overflow:'hidden',
    borderTopWidth:3, borderLeftWidth:1, borderRightWidth:1, borderBottomWidth:1,
    borderLeftColor:C.border, borderRightColor:C.border, borderBottomColor:C.border,
  },
  builderRowHead:  { flexDirection:'row', alignItems:'center', padding:12, gap:10 },
  indexBadge:      { width:28, height:28, borderRadius:8, borderWidth:1, alignItems:'center', justifyContent:'center' },
  indexText:       { fontWeight:'700', fontSize:13 },
  builderName:     { color:C.white, fontSize:14, fontWeight:'600' },
  builderMeta:     { color:C.textSec, fontSize:11, marginTop:2, textTransform:'capitalize' },
  removeBtn:       { width:26, height:26, borderRadius:6, backgroundColor:'rgba(255,107,107,0.15)', alignItems:'center', justifyContent:'center' },
  removeTxt:       { color:C.red, fontSize:12, fontWeight:'700' },
  chevron:         { color:C.textSec, fontSize:12, marginLeft:4 },
  builderExpanded: { borderTopWidth:1, borderTopColor:C.border, padding:12, backgroundColor:'rgba(255,255,255,0.02)' },
  paramRow:        { flexDirection:'row', gap:10, marginBottom:12 },
  param:           { flex:1, alignItems:'center', gap:6 },
  paramLabel:      { color:C.textSec, fontSize:11, fontWeight:'600', letterSpacing:0.5 },
  stepper:         { flexDirection:'row', alignItems:'center', gap:6 },
  stepBtn:         { width:28, height:28, borderRadius:8, backgroundColor:'rgba(74,158,255,0.15)', alignItems:'center', justifyContent:'center' },
  stepBtnTxt:      { color:C.blue, fontSize:16, fontWeight:'700', lineHeight:20 },
  stepVal:         { color:C.white, fontSize:16, fontWeight:'700', minWidth:24, textAlign:'center' },
  paramInput:      { borderWidth:1.5, borderColor:'rgba(74,158,255,0.3)', borderRadius:8, paddingHorizontal:10, paddingVertical:4, fontSize:15, fontWeight:'700', color:C.white, textAlign:'center', width:56 },
  notesInput:      { borderWidth:1, borderColor:C.border, borderRadius:8, padding:10, fontSize:13, color:C.white, minHeight:36, backgroundColor:'rgba(255,255,255,0.03)' },
  addMoreBtn:      { borderWidth:1.5, borderColor:C.blue, borderRadius:10, paddingVertical:12, alignItems:'center', marginBottom:12, borderStyle:'dashed' },
  addMoreTxt:      { color:C.blue, fontWeight:'700', fontSize:14 },

  searchBar:       { flexDirection:'row', alignItems:'center', backgroundColor:C.card, paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border, gap:10 },
  searchInput:     { flex:1, color:C.white, fontSize:16, paddingVertical:6 },
  filterBar:       { backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border },
  filterContent:   { flexDirection:'row', paddingHorizontal:16, paddingVertical:12, gap:8 },
  filterPill:      { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:C.border },
  filterPillActive:{ backgroundColor:C.blue },
  filterText:      { color:C.textSec, fontSize:13, fontWeight:'700' },
  filterTextActive:{ color:C.white, fontSize:13, fontWeight:'700' },
  resultsCount:    { color:C.textMid, fontSize:11, fontWeight:'700', letterSpacing:2, paddingHorizontal:16, paddingTop:12, paddingBottom:4 },

  exCard:                 { flexDirection:'row', alignItems:'center', backgroundColor:C.card, borderRadius:16, marginBottom:12, borderTopWidth:3, elevation:4, overflow:'hidden' },
  exCardAdded:            { opacity:0.55 },
  exCardImage:            { width:80, height:80 },
  exCardImagePlaceholder: { width:80, height:80, alignItems:'center', justifyContent:'center' },
  exCardInfo:             { flex:1, padding:12 },
  exCardName:             { color:C.white, fontSize:15, fontWeight:'800', marginBottom:4 },
  exCardTag:              { fontSize:11, fontWeight:'700', textTransform:'capitalize' },
  exCardMuscles:          { color:C.textSec, fontSize:12, textTransform:'capitalize' },
  exCardAction:           { fontSize:24, fontWeight:'700', paddingRight:14 },
});