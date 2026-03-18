/**
 * ExerciseScreen.tsx — Coaching Hub
 * Layout order:
 *   1. Summary strip
 *   2. Today's WOD
 *   3. My Plan
 *   4. My Workouts (from AsyncStorage)
 *   5. Create a Workout CTA
 *   6. Workout Templates (browse + search)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Animated, Modal,
  Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { workoutStorage, workoutHistory, SavedWorkout } from '../services/workoutStorage';
import { planStorage, SubscribedPlan, getTodaySession, getDifficultyColor, getSessionsPerWeek } from '../services/planStorage';

// ─── Week Calendar Modal styles ───────────────────────────────────────────────
const wc = StyleSheet.create({
  overlay:    { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  sheet:      { backgroundColor:'#0d1f3c', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40 },
  handle:     { width:40, height:4, backgroundColor:'#1a3a6b', borderRadius:2, alignSelf:'center', marginBottom:20 },
  sheetLabel: { color:'#5a7fa8', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:6 },
  sheetTitle: { fontSize:22, fontWeight:'900', marginBottom:4 },
  sheetMeta:  { color:'#5a7fa8', fontSize:13, marginBottom:20 },
  grid:       { gap:8, marginBottom:20 },
  dayCell:    { borderWidth:1.5, borderColor:'#1a3a6b', borderRadius:12, padding:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  dayLabel:   { color:'#5a7fa8', fontSize:13, fontWeight:'800', minWidth:90 },
  sessionName:{ color:'#FFFFFF', fontSize:14, fontWeight:'700', flex:1, textAlign:'right' },
  restLabel:  { color:'#2a4a7f', fontSize:13, flex:1, textAlign:'right' },
  closeBtn:   { borderWidth:1, borderColor:'#1a3a6b', borderRadius:12, paddingVertical:13, alignItems:'center' },
  closeBtnTxt:{ color:'#5a7fa8', fontWeight:'600', fontSize:15 },
});


// ─── Tokens ───────────────────────────────────────────────────────────────────
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

const ACCENT = {
  wod:    ['#4A9EFF', '#8ab4f8'] as [string,string],
  plan:   ['#7B6FFF', '#4A9EFF'] as [string,string],
  myW:    ['#FF9F43', '#FF6B6B'] as [string,string],
  create: ['#26de81', '#4A9EFF'] as [string,string],
  browse: ['#FF9F43', '#FF6B35'] as [string,string],
};

// ─── Mock data ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {id:'t1', name:'Full Body Blast',    cat:'Strength',   exs:8,  dur:55, level:'Intermediate'},
  {id:'t2', name:'Upper Body Power',   cat:'Strength',   exs:6,  dur:40, level:'Advanced'},
  {id:'t3', name:'Core & Cardio',      cat:'Cardio',     exs:7,  dur:35, level:'Beginner'},
  {id:'t4', name:'Leg Day Destroyer',  cat:'Strength',   exs:9,  dur:60, level:'Advanced'},
  {id:'t5', name:'HIIT Express',       cat:'HIIT',       exs:5,  dur:25, level:'Intermediate'},
  {id:'t6', name:'Mobility Flow',      cat:'Stretching', exs:10, dur:30, level:'Beginner'},
  {id:'t7', name:'Push Pull Legs',     cat:'Strength',   exs:12, dur:70, level:'Advanced'},
  {id:'t8', name:'Morning Activation', cat:'Stretching', exs:6,  dur:20, level:'Beginner'},
];

const TEMPLATE_CATS = ['All','Strength','Cardio','HIIT','Stretching'];
const lvlColor = (l: string) => l==='Beginner' ? C.green : l==='Intermediate' ? C.yellow : C.red;

// ─── Accent bar ────────────────────────────────────────────────────────────────
const Accent = ({ colors }: { colors: [string,string] }) => (
  <LinearGradient colors={colors} style={s.accentBar} start={{x:0,y:0}} end={{x:1,y:0}} />
);

// ─── Day keys / labels ────────────────────────────────────────────────────────
const DAY_KEYS_EX  = ['mon','tue','wed','thu','fri','sat','sun'] as const;
const DAY_LABELS_EX = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Returns 0=Mon … 6=Sun
const todayDayIndex = () => {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;
};

// ─── Week Calendar Modal ───────────────────────────────────────────────────────
function WeekCalendarModal({ plan, visible, onClose }: {
  plan: SubscribedPlan; visible: boolean; onClose: () => void;
}) {
  const todayIdx = todayDayIndex();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={wc.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={wc.sheet} activeOpacity={1}>
          <View style={wc.handle} />
          <Text style={wc.sheetLabel}>WEEKLY SCHEDULE</Text>
          <Text style={[wc.sheetTitle, {color: plan.color}]}>{plan.name}</Text>
          <Text style={wc.sheetMeta}>{plan.coach.avatar}  {plan.coach.name}  ·  Week {plan.currentWeek} of {plan.durationWeeks}</Text>

          <View style={wc.grid}>
            {DAY_KEYS_EX.map((key, i) => {
              const session  = plan.schedule[key];
              const isToday  = i === todayIdx;
              return (
                <View key={key} style={[wc.dayCell, isToday && {borderColor: plan.color, backgroundColor: plan.color + '18'}]}>
                  <Text style={[wc.dayLabel, isToday && {color: plan.color}]}>
                    {DAY_LABELS_EX[i]}{isToday ? ' ·  TODAY' : ''}
                  </Text>
                  {session ? (
                    <Text style={[wc.sessionName, isToday && {color: plan.color}]}>{session}</Text>
                  ) : (
                    <Text style={wc.restLabel}>Rest 🛌</Text>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={wc.closeBtn} onPress={onClose}>
            <Text style={wc.closeBtnTxt}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── 1. Today's Session Card ──────────────────────────────────────────────────
function TodaySessionCard({ plan, onBrowse, onStart }: {
  plan: SubscribedPlan | null;
  onBrowse: () => void;
  onStart: (sessionName: string) => void;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue:1.015, duration:900, useNativeDriver:true }),
      Animated.timing(pulse, { toValue:1,     duration:900, useNativeDriver:true }),
    ])).start();
  }, []);

  // No plan — show subscribe CTA
  if (!plan) {
    return (
      <View style={s.card}>
        <Accent colors={ACCENT.wod} />
        <Text style={s.label}>TODAY'S SESSION</Text>
        <Text style={s.bigTitle}>No Plan Active</Text>
        <Text style={[s.greySmall, {marginBottom:16}]}>
          Subscribe to a coach programme to get your daily workout here.
        </Text>
        <TouchableOpacity style={s.blueBtn} onPress={onBrowse} activeOpacity={0.85}>
          <Text style={s.blueBtnText}>Browse Plans →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const todayIdx   = todayDayIndex();
  const todayKey   = DAY_KEYS_EX[todayIdx];
  const session    = plan.schedule[todayKey];

  // Tomorrow preview
  const tomorrowIdx     = (todayIdx + 1) % 7;
  const tomorrowKey     = DAY_KEYS_EX[tomorrowIdx];
  const tomorrowSession = plan.schedule[tomorrowKey];

  // Rest day
  if (!session) {
    return (
      <View style={[s.card, {borderLeftWidth:4, borderLeftColor:plan.color}]}>
        <Accent colors={[plan.color, ACCENT.wod[1]]} />
        <View style={s.rowSB}>
          <View style={{flex:1}}>
            <Text style={s.label}>TODAY'S SESSION  ·  {DAY_LABELS_EX[todayIdx].toUpperCase()}</Text>
            <Text style={s.bigTitle}>Rest Day 🛌</Text>
            <Text style={s.greySmall}>{plan.name}</Text>
          </View>
        </View>
        <View style={[s.restBox]}>
          <Text style={s.restBoxTxt}>Recovery is part of the programme. Rest up!</Text>
        </View>
        {tomorrowSession && (
          <View style={s.tomorrowRow}>
            <Text style={s.tomorrowLabel}>TOMORROW</Text>
            <Text style={[s.tomorrowSession, {color: plan.color}]}>{tomorrowSession}</Text>
          </View>
        )}
        <TouchableOpacity style={s.calBtn} onPress={() => setCalOpen(true)}>
          <Text style={s.calBtnTxt}>📅  View Week Schedule</Text>
        </TouchableOpacity>
        {calOpen && <WeekCalendarModal plan={plan} visible={calOpen} onClose={() => setCalOpen(false)} />}
      </View>
    );
  }

  // Active session day
  return (
    <View style={[s.card, {borderLeftWidth:4, borderLeftColor:plan.color}]}>
      <Accent colors={[plan.color, ACCENT.wod[1]]} />

      {/* Header */}
      <View style={s.rowSB}>
        <View style={{flex:1}}>
          <Text style={s.label}>TODAY'S SESSION  ·  {DAY_LABELS_EX[todayIdx].toUpperCase()}</Text>
          <Text style={s.bigTitle}>{session}</Text>
          <Text style={s.greySmall}>{plan.name}  ·  {plan.coach.avatar} {plan.coach.name}</Text>
        </View>
        <View style={[s.weekBadge, {borderColor: plan.color}]}>
          <Text style={[s.weekText, {color: plan.color}]}>W{plan.currentWeek}</Text>
        </View>
      </View>

      {/* Plan meta */}
      <View style={[s.rowSB, {marginTop:12, marginBottom:14}]}>
        <View style={s.metaChipEx}>
          <Text style={s.metaChipExTxt}>{plan.difficulty}</Text>
        </View>
        <View style={s.metaChipEx}>
          <Text style={s.metaChipExTxt}>{plan.equipment === 'Gym' ? '🏋️' : plan.equipment === 'Home' ? '🏠' : '🔄'}  {plan.equipment}</Text>
        </View>
        <TouchableOpacity style={[s.metaChipEx, {borderColor: plan.color}]} onPress={() => setCalOpen(true)}>
          <Text style={[s.metaChipExTxt, {color: plan.color}]}>📅  Week View</Text>
        </TouchableOpacity>
      </View>

      {/* Start button */}
      <Animated.View style={{transform:[{scale:pulse}]}}>
        <TouchableOpacity style={[s.blueBtn, {backgroundColor: plan.color}]} onPress={() => onStart(session)} activeOpacity={0.85}>
          <Text style={s.blueBtnText}>▶  START {session.toUpperCase()}</Text>
        </TouchableOpacity>
      </Animated.View>

      {calOpen && <WeekCalendarModal plan={plan} visible={calOpen} onClose={() => setCalOpen(false)} />}
    </View>
  );
}

// ─── 2. My Plan Card ──────────────────────────────────────────────────────────
function PlanCard({ plans, onPress, onBrowse }: {
  plans: SubscribedPlan[];
  onPress: () => void;
  onBrowse: () => void;
}) {
  // Show the first subscribed plan as primary; rest shown as "+N more"
  const primary = plans[0];
  const extra   = plans.length - 1;

  if (!primary) {
    return (
      <TouchableOpacity style={s.card} onPress={onBrowse} activeOpacity={0.85}>
        <Accent colors={ACCENT.plan} />
        <Text style={s.label}>MY PLAN</Text>
        <Text style={s.bigTitle}>No Active Plan</Text>
        <Text style={s.greySmall}>Subscribe to a coach programme to track your progress</Text>
        <View style={[s.upNextBadge, {marginTop:14, alignSelf:'flex-start'}]}>
          <Text style={s.upNextText}>BROWSE PLANS →</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const todaySession = getTodaySession(primary);
  const spw          = getSessionsPerWeek(primary);
  const totalSessions = primary.durationWeeks * spw;
  const pct           = Math.min(1, primary.completedSessions / totalSessions);

  return (
    <TouchableOpacity style={[s.card, {borderLeftWidth:4, borderLeftColor:primary.color}]} onPress={onPress} activeOpacity={0.85}>
      <Accent colors={[primary.color, ACCENT.plan[1]]} />
      <View style={s.rowSB}>
        <View style={{flex:1}}>
          <Text style={s.label}>MY PLAN{extra > 0 ? `  ·  +${extra} more` : ''}</Text>
          <Text style={s.bigTitle}>{primary.name}</Text>
          <Text style={s.greySmall}>Week {primary.currentWeek} of {primary.durationWeeks}  ·  {primary.coach.name}</Text>
        </View>
        <View style={[s.weekBadge, {borderColor:primary.color}]}>
          <Text style={[s.weekText, {color:primary.color}]}>W{primary.currentWeek}</Text>
        </View>
      </View>

      <View style={{marginBottom:14}}>
        <View style={[s.rowSB, {marginBottom:6}]}>
          <Text style={s.greySmall}>Overall progress</Text>
          <Text style={s.whiteSmall}>{primary.completedSessions} sessions</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, {width:`${Math.round(pct*100)}%` as any, backgroundColor:primary.color}]} />
        </View>
      </View>

      <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
        <View style={s.upNextBadge}><Text style={s.upNextText}>TODAY</Text></View>
        <Text style={[s.whiteSmall, {flex:1}]}>{todaySession || 'Rest Day 🛌'}</Text>
        <Text style={s.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── 3. My Workouts Section ───────────────────────────────────────────────────
function MyWorkoutsSection({
  workouts, onCreate, onSeeAll,
}: {
  workouts: SavedWorkout[];
  onCreate: () => void;
  onSeeAll: () => void;
}) {
  // Show at most 2 preview rows, rest accessible via See All
  const preview = workouts.slice(0, 2);

  return (
    <View style={s.card}>
      <Accent colors={ACCENT.myW} />

      {/* Header row */}
      <View style={[s.rowSB, {marginBottom:14}]}>
        <View>
          <Text style={s.label}>MY WORKOUTS</Text>
          <Text style={s.bigTitle}>Custom Workouts</Text>
        </View>
        <TouchableOpacity style={s.smBtn} onPress={onCreate}>
          <Text style={s.smBtnText}>＋ New</Text>
        </TouchableOpacity>
      </View>

      {workouts.length === 0 ? (
        <View style={s.emptyMyW}>
          <Text style={{fontSize:36, marginBottom:10}}>🏋️</Text>
          <Text style={s.whiteSmall}>No custom workouts yet</Text>
          <Text style={[s.greySmall, {textAlign:'center', marginTop:4, marginBottom:16}]}>
            Tap "＋ New" to build your first workout
          </Text>
          <TouchableOpacity style={s.blueBtn} onPress={onCreate}>
            <Text style={s.blueBtnText}>Create Workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {preview.map(w => {
            const color = CATEGORY_COLORS[w.exercises[0]?.exercise?.category || 'strength'] || C.blue;
            return (
              <TouchableOpacity
                key={w.id}
                style={[s.myWRow, {borderLeftColor: color}]}
                onPress={onSeeAll}
                activeOpacity={0.8}
              >
                <View style={{flex:1}}>
                  <Text style={s.myWName}>{w.name}</Text>
                  <Text style={s.myWMeta}>
                    💪 {w.exercises.length} exercises  ·  📋 {w.totalSets} sets  ·  ⏱ ~{w.estimatedTime}m
                  </Text>
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            );
          })}

          {/* See All button — always visible when workouts exist */}
          <TouchableOpacity style={s.seeAllBtn} onPress={onSeeAll} activeOpacity={0.8}>
            <Text style={s.seeAllTxt}>
              {workouts.length > 2
                ? `See All ${workouts.length} Workouts →`
                : 'Manage Workouts →'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── 4. Create Card ───────────────────────────────────────────────────────────
function CreateCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <Accent colors={ACCENT.create} />
      <View style={s.rowSB}>
        <View style={{flex:1}}>
          <Text style={s.label}>BUILD YOUR OWN</Text>
          <Text style={s.bigTitle}>Create a Workout</Text>
          <Text style={s.greySmall}>Pick exercises from 800+ in the database</Text>
        </View>
        <View style={s.plusCircle}>
          <Text style={s.plusText}>＋</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── 5. Templates Section ─────────────────────────────────────────────────────
function TemplatesSection({ onSelect }: { onSelect: (t: any) => void }) {
  const [open, setOpen] = useState(false);

  // Show first 3 as a preview; full browse on dedicated screen later
  const preview = TEMPLATES.slice(0, 3);

  return (
    <View style={s.card}>
      <Accent colors={ACCENT.browse} />

      {/* Accordion header — always visible */}
      <TouchableOpacity style={s.rowSB} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View>
          <Text style={s.label}>WORKOUT TEMPLATES</Text>
          <Text style={s.bigTitle}>Browse Templates</Text>
          <Text style={s.greySmall}>{TEMPLATES.length} ready-made workouts</Text>
        </View>
        <View style={[s.chevronBox, open && {backgroundColor: C.blue + '33'}]}>
          <Text style={[s.chevronTxt, open && {color: C.blue}]}>{open ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expandable content */}
      {open && (
        <View style={{marginTop:14}}>
          {preview.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[s.templateRow, {borderLeftColor: lvlColor(t.level)}]}
              onPress={() => onSelect(t)}
              activeOpacity={0.8}
            >
              <View style={{flex:1}}>
                <Text style={s.myWName}>{t.name}</Text>
                <View style={{flexDirection:'row', gap:8, marginBottom:3}}>
                  <Text style={s.blueSmall}>{t.cat}</Text>
                  <Text style={[s.blueSmall, {color: lvlColor(t.level)}]}>{t.level}</Text>
                </View>
                <Text style={s.greySmall}>⏱ {t.dur}m  ·  💪 {t.exs} exercises</Text>
              </View>
              <Text style={s.arrow}>›</Text>
            </TouchableOpacity>
          ))}

          {/* See all link */}
          <TouchableOpacity style={s.seeAllBtn} onPress={() => {}} activeOpacity={0.8}>
            <Text style={s.seeAllTxt}>See All {TEMPLATES.length} Templates →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExerciseScreen({ navigation }: any) {
  const [myWorkouts,     setMyWorkouts]     = useState<SavedWorkout[]>([]);
  const [myPlans,        setMyPlans]        = useState<SubscribedPlan[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      workoutStorage.getAll().then(setMyWorkouts);
      planStorage.getSubscribed().then(setMyPlans);
      workoutHistory.getAll().then(h => setCompletedCount(h.length));
    }, [])
  );

  const handleDelete = async (id: string) => {
    await workoutStorage.delete(id);
    setMyWorkouts(prev => prev.filter(w => w.id !== id));
  };

  const handleSelectWorkout = (w: SavedWorkout) => {
    Alert.alert(
      w.name,
      `${w.exercises.length} exercises  ·  ~${w.estimatedTime} min\n\nStart this workout?`,
      [
        {text:'Not now', style:'cancel'},
        {text:'Start', onPress:() => {
          // Transform SavedWorkout → shape ExerciseProgressScreen expects
          const adapted = {
            _id:     w.id,
            title:   w.name,
            isLocal: true,  // tells ExerciseProgressScreen to skip workoutAPI.updateSet
            exercises: w.exercises.map(e => ({
              name: e.exercise.name,
              sets: Array.from({ length: e.sets }, () => ({
                reps:      parseInt(e.reps) || 10,
                weight:    0,
                completed: false,
              })),
            })),
          };
          navigation.navigate('ExerciseProgress', { workout: adapted });
        }},
      ]
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>EXERCISE</Text>
        <View style={{width:60}}/>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Summary strip */}
        <View style={s.summaryStrip}>
          {[
            {v: String(myWorkouts.length),  l:'My Workouts'},
            {v: String(completedCount),      l:'Completed'},
            {v:'0',                          l:'kcal Burned'},
          ].map((item, i, arr) => (
            <React.Fragment key={item.l}>
              <View style={s.sumItem}>
                <Text style={s.sumVal}>{item.v}</Text>
                <Text style={s.greySmall}>{item.l}</Text>
              </View>
              {i < arr.length-1 && <View style={s.sumDiv}/>}
            </React.Fragment>
          ))}
        </View>

        {/* 1. Today's Session */}
        <TodaySessionCard
          plan={myPlans[0] ?? null}
          onBrowse={() => navigation.navigate('PlansScreen')}
          onStart={(sessionName) => {
            Alert.alert(
              sessionName,
              'Exercises for this session haven\'t been assigned by your coach yet. Check back soon!',
              [{ text: 'Got it' }]
            );
          }}
        />

        {/* 2. My Plan */}
        <PlanCard
          plans={myPlans}
          onPress={() => navigation.navigate('MyPlansScreen')}
          onBrowse={() => navigation.navigate('PlansScreen')}
        />

        {/* 3. My Workouts */}
        <MyWorkoutsSection
          workouts={myWorkouts}
          onCreate={() => navigation.navigate('CreateWorkoutScreen')}
          onSeeAll={() => navigation.navigate('MyWorkoutsScreen')}
        />

        {/* 4. Create a Workout */}
        <CreateCard onPress={() => navigation.navigate('CreateWorkoutScreen')} />

        {/* 5. Templates */}
        <TemplatesSection onSelect={t => {}} />

        <View style={{height:32}}/>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {flex:1, backgroundColor:C.bg},

  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom:12, paddingHorizontal:16,
    backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border,
  },
  backTxt:     {color:C.blue, fontSize:15, fontWeight:'500'},
  headerTitle: {color:C.white, fontSize:18, fontWeight:'700', letterSpacing:1.5},

  scroll: {paddingHorizontal:16, paddingTop:12, paddingBottom:40},

  // Summary strip
  summaryStrip: {
    flexDirection:'row', backgroundColor:C.card,
    borderRadius:14, borderWidth:1, borderColor:C.border,
    padding:16, marginBottom:14,
  },
  sumItem: {flex:1, alignItems:'center'},
  sumVal:  {color:C.blue, fontSize:20, fontWeight:'700', marginBottom:2},
  sumDiv:  {width:1, backgroundColor:C.border, marginVertical:4},

  // Card base
  card: {
    backgroundColor:C.card, borderRadius:14, borderWidth:1,
    borderColor:C.border, marginBottom:14, overflow:'hidden', padding:16,
  },
  accentBar: {height:3, marginHorizontal:-16, marginTop:-16, marginBottom:14},

  // Typography
  label:     {color:C.textSec, fontSize:10, fontWeight:'700', letterSpacing:1.5, marginBottom:4},
  bigTitle:  {color:C.white, fontSize:20, fontWeight:'800', marginBottom:2},
  blueSmall: {color:C.blue, fontSize:12, fontWeight:'600'},
  greySmall: {color:C.textSec, fontSize:12},
  whiteSmall:{color:C.white, fontSize:13, fontWeight:'600'},
  arrow:     {color:C.textSec, fontSize:22},

  rowSB: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10},

  // WOD
  diffBadge: {borderWidth:1.5, borderRadius:8, paddingHorizontal:9, paddingVertical:3},
  diffText:  {fontSize:11, fontWeight:'700', letterSpacing:0.3},
  statsBar: {
    flexDirection:'row', backgroundColor:'rgba(255,255,255,0.04)',
    borderRadius:10, borderWidth:1, borderColor:C.border, padding:12, marginBottom:14,
  },
  statItem: {flex:1, alignItems:'center'},
  statVal:  {color:C.white, fontSize:20, fontWeight:'700'},
  statLbl:  {color:C.textSec, fontSize:11, marginTop:2},
  statDiv:  {width:1, backgroundColor:C.border, marginVertical:4},
  exRow:    {flexDirection:'row', alignItems:'center', gap:10, marginBottom:7},
  exDot:    {width:6, height:6, borderRadius:3, backgroundColor:C.blue, flexShrink:0},
  exName:   {flex:1, color:'rgba(255,255,255,0.82)', fontSize:14},
  exReps:   {color:C.blue, fontSize:13, fontWeight:'600'},

  // Buttons
  blueBtn:     {backgroundColor:C.blue, borderRadius:10, paddingVertical:13, alignItems:'center'},
  blueBtnText: {color:C.white, fontWeight:'700', fontSize:15, letterSpacing:0.8},
  smBtn:       {backgroundColor:'rgba(74,158,255,0.2)', borderRadius:8, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:C.blue},
  smBtnText:   {color:C.blue, fontWeight:'700', fontSize:13},

  // Plan card
  weekBadge:    {backgroundColor:'rgba(74,158,255,0.18)', borderRadius:8, paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:C.blue},
  weekText:     {color:C.white, fontWeight:'700', fontSize:13},
  progressTrack:{height:5, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden'},
  progressFill: {height:'100%', borderRadius:3, backgroundColor:C.blue},
  upNextBadge:  {backgroundColor:'rgba(74,158,255,0.15)', borderRadius:6, paddingHorizontal:7, paddingVertical:3},
  upNextText:   {color:C.blue, fontSize:10, fontWeight:'700', letterSpacing:0.8},

  // My Workouts
  emptyMyW:      {alignItems:'center', paddingVertical:16},
  myWRow: {
    backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10,
    borderLeftWidth:4,
    borderTopWidth:1, borderRightWidth:1, borderBottomWidth:1,
    borderTopColor:C.border, borderRightColor:C.border, borderBottomColor:C.border,
    padding:12, marginBottom:10,
    flexDirection:'row', alignItems:'center',
  },
  myWName:       {color:C.white, fontSize:15, fontWeight:'700', marginBottom:4},
  myWMeta:       {color:C.blue, fontSize:12, fontWeight:'600', marginBottom:2},
  deleteBtn:     {padding:8},
  restBox:       { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:12, marginTop:12, marginBottom:12 },
  restBoxTxt:    { color:C.textSec, fontSize:13, lineHeight:20 },
  tomorrowRow:   { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  tomorrowLabel: { color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5 },
  tomorrowSession:{ color:C.white, fontSize:14, fontWeight:'700' },
  calBtn:        { borderWidth:1, borderColor:C.border, borderRadius:10, paddingVertical:10, alignItems:'center' },
  calBtnTxt:     { color:C.textSec, fontSize:13, fontWeight:'600' },
  metaChipEx:    { borderWidth:1, borderColor:C.border, borderRadius:20, paddingHorizontal:10, paddingVertical:5 },
  metaChipExTxt: { color:C.textSec, fontSize:12, fontWeight:'600' },
  chevronBox:  { width:36, height:36, borderRadius:10, backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  chevronTxt:  { color:C.textSec, fontSize:14, fontWeight:'700' },
  seeAllBtn:     { marginTop:10, borderWidth:1.5, borderColor:C.blue, borderRadius:10, paddingVertical:12, alignItems:'center', backgroundColor:'rgba(74,158,255,0.08)' },
  seeAllTxt:     { color:C.blue, fontWeight:'700', fontSize:14 },
  deleteBtnText: {fontSize:16},

  // Create card
  plusCircle: {
    width:50, height:50, borderRadius:25,
    backgroundColor:'rgba(38,222,129,0.15)',
    borderWidth:1.5, borderColor:C.green,
    alignItems:'center', justifyContent:'center',
  },
  plusText: {color:C.green, fontSize:26, lineHeight:32},

  // Templates
  templateRow: {
    backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10,
    borderLeftWidth:4,
    borderTopWidth:1, borderRightWidth:1, borderBottomWidth:1,
    borderTopColor:C.border, borderRightColor:C.border, borderBottomColor:C.border,
    padding:12, marginBottom:8,
    flexDirection:'row', alignItems:'center',
  },

  // Search & chips
  searchBox: {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor:'rgba(255,255,255,0.06)', borderRadius:10,
    borderWidth:1, borderColor:C.border,
    paddingHorizontal:12, paddingVertical:9, marginBottom:12,
  },
  searchInput: {flex:1, color:C.white, fontSize:14, padding:0},
  chip:    {paddingHorizontal:14, paddingVertical:6, borderRadius:20, backgroundColor:'rgba(74,158,255,0.15)', borderWidth:1, borderColor:'rgba(74,158,255,0.4)'},
  chipOn:  {backgroundColor:C.blue, borderColor:C.blue},
  chipTxt: {color:C.white, fontSize:13, fontWeight:'600'},
  chipTxtOn:{color:C.white},

  // TodaySessionCard extras
  restBox:        { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:12, marginTop:12, marginBottom:12 },
  restBoxTxt:     { color:'#5a7fa8', fontSize:13, lineHeight:20 },
  tomorrowRow:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  tomorrowLabel:  { color:'#5a7fa8', fontSize:10, fontWeight:'800', letterSpacing:1.5 },
  tomorrowSession:{ color:'#FFFFFF', fontSize:14, fontWeight:'700' },
  calBtn:         { borderWidth:1, borderColor:'#1a3a6b', borderRadius:10, paddingVertical:10, alignItems:'center' },
  calBtnTxt:      { color:'#5a7fa8', fontSize:13, fontWeight:'600' },
  metaChipEx:     { borderWidth:1, borderColor:'#1a3a6b', borderRadius:20, paddingHorizontal:10, paddingVertical:5 },
  metaChipExTxt:  { color:'#5a7fa8', fontSize:12, fontWeight:'600' },
});