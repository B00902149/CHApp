/**
 * ExerciseScreen.js  —  Coaching Hub
 * Precisely matches app design language:
 *   - bg: #0A1628,  card: #0F1F35
 *   - Uppercase spaced section labels (WORKOUTS, MY PLAN…)
 *   - 3px coloured top-border accent on every card (like MyHealth)
 *   - Blue pill category chips (like Community)
 *   - List rows with left colour bar (like Exercise search screen)
 *   - Blue (#007BFF) CTA buttons, grey secondary text
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Dimensions,
  Animated, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:            '#0A1628',
  card:          '#0F2040',
  border:        'rgba(74,144,226,0.18)',
  blue:          '#007BFF',
  lightBlue:     '#4A90E2',
  white:         '#FFFFFF',
  textSec:       '#8899AA',
  green:         '#28A745',
  red:           '#DC3545',
  yellow:        '#FFC107',
  orange:        '#FF6B35',
  purple:        '#7B61FF',
};

const ACCENT = {
  wod:     ['#007BFF', '#4A90E2'],
  plan:    ['#7B61FF', '#4A90E2'],
  create:  ['#28A745', '#00C853'],
  browse:  ['#FFC107', '#FF6B35'],
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const WOD_POOL = [
  {
    id:'w1', name:'AMRAP Inferno', type:'AMRAP · 20 min',
    difficulty:'Hard', dc: C.red,
    exercises:[
      {name:'Box Jumps',reps:'15 reps'},{name:'Kettlebell Swings',reps:'20 reps'},
      {name:'Burpees',reps:'10 reps'},{name:'Wall Balls',reps:'15 reps'},
    ],
    calories:380, duration:20,
  },
  {
    id:'w2', name:'Strength Builder', type:'For Time',
    difficulty:'Medium', dc: C.yellow,
    exercises:[
      {name:'Back Squat',reps:'5×5'},{name:'Romanian Deadlift',reps:'4×8'},
      {name:'Pull-Ups',reps:'3×10'},{name:'Dumbbell Row',reps:'3×12 each'},
    ],
    calories:290, duration:45,
  },
  {
    id:'w3', name:'Cardio Shred', type:'EMOM · 30 min',
    difficulty:'Easy', dc: C.green,
    exercises:[
      {name:'Jump Rope',reps:'50 reps'},{name:'Mountain Climbers',reps:'30 reps'},
      {name:'High Knees',reps:'40 reps'},{name:'Jump Squats',reps:'20 reps'},
    ],
    calories:420, duration:30,
  },
];

const PLAN = {
  name:'Alpha Hypertrophy', weeks:12, currentWeek:4,
  nextSession:'Push Day A', sessionsPerWeek:5, completedThisWeek:3,
  coach:'Coach Rian',
};

const TEMPLATES = [
  {id:'t1',name:'Full Body Blast',   cat:'Strength',   exs:8,  dur:55, level:'Intermediate'},
  {id:'t2',name:'Upper Body Power',  cat:'Strength',   exs:6,  dur:40, level:'Advanced'},
  {id:'t3',name:'Core & Cardio',     cat:'Cardio',     exs:7,  dur:35, level:'Beginner'},
  {id:'t4',name:'Leg Day Destroyer', cat:'Strength',   exs:9,  dur:60, level:'Advanced'},
  {id:'t5',name:'HIIT Express',      cat:'HIIT',       exs:5,  dur:25, level:'Intermediate'},
  {id:'t6',name:'Mobility Flow',     cat:'Stretching', exs:10, dur:30, level:'Beginner'},
  {id:'t7',name:'Push Pull Legs',    cat:'Strength',   exs:12, dur:70, level:'Advanced'},
  {id:'t8',name:'Morning Activation',cat:'Stretching', exs:6,  dur:20, level:'Beginner'},
];

const CATS = ['All','Strength','Cardio','HIIT','Stretching','Plyometric'];
const lvlColor = l => l==='Beginner'?C.green:l==='Intermediate'?C.yellow:C.red;

// ─── Accent bar (3px top stripe, like MyHealth cards) ─────────────────────────
const Accent = ({colors}) => (
  <LinearGradient colors={colors} style={s.accentBar} start={{x:0,y:0}} end={{x:1,y:0}} />
);

// ─── WOD Card ─────────────────────────────────────────────────────────────────
function WODCard({wod, noPlan, onSubscribe, onStart}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1.015,duration:900,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:1,    duration:900,useNativeDriver:true}),
    ])).start();
  },[]);
  return (
    <View style={s.card}>
      <Accent colors={ACCENT.wod} />
      <View style={s.row}>
        <View style={{flex:1}}>
          <Text style={s.label}>TODAY'S WOD</Text>
          <Text style={s.bigTitle}>{wod.name}</Text>
          <Text style={s.blueSmall}>{wod.type}</Text>
        </View>
        <View style={[s.diffBadge,{borderColor:wod.dc}]}>
          <Text style={[s.diffText,{color:wod.dc}]}>{wod.difficulty}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsBar}>
        <View style={s.statItem}><Text style={s.statVal}>{wod.duration}</Text><Text style={s.statLbl}>min</Text></View>
        <View style={s.statDiv}/>
        <View style={s.statItem}><Text style={s.statVal}>{wod.calories}</Text><Text style={s.statLbl}>kcal</Text></View>
        <View style={s.statDiv}/>
        <View style={s.statItem}><Text style={s.statVal}>{wod.exercises.length}</Text><Text style={s.statLbl}>exercises</Text></View>
      </View>

      {/* Exercises */}
      <View style={{marginBottom:14}}>
        {wod.exercises.map((e,i)=>(
          <View key={i} style={s.exRow}>
            <View style={s.exDot}/>
            <Text style={s.exName}>{e.name}</Text>
            <Text style={s.exReps}>{e.reps}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Animated.View style={{transform:[{scale:pulse}]}}>
        <TouchableOpacity style={s.blueBtn} onPress={onStart} activeOpacity={0.85}>
          <Text style={s.blueBtnText}>START WORKOUT</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Upsell */}
      {noPlan && (
        <TouchableOpacity style={s.upsell} onPress={onSubscribe} activeOpacity={0.85}>
          <Text style={{fontSize:18}}>⚡</Text>
          <View style={{flex:1}}>
            <Text style={s.upsellTitle}>Get a structured plan</Text>
            <Text style={s.upsellSub}>Personalised WODs every day</Text>
          </View>
          <Text style={s.upsellArrow}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── My Plan Card ─────────────────────────────────────────────────────────────
function PlanCard({plan, onPress}) {
  const pct = plan.completedThisWeek / plan.sessionsPerWeek;
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <Accent colors={ACCENT.plan} />
      <View style={s.row}>
        <View style={{flex:1}}>
          <Text style={s.label}>MY PLAN</Text>
          <Text style={s.bigTitle}>{plan.name}</Text>
          <Text style={s.greySmall}>Week {plan.currentWeek} of {plan.weeks}  ·  {plan.coach}</Text>
        </View>
        <View style={s.weekBadge}><Text style={s.weekText}>W{plan.currentWeek}</Text></View>
      </View>

      <View style={{marginBottom:14}}>
        <View style={s.row}>
          <Text style={s.greySmall}>This week</Text>
          <Text style={s.whiteSmall}>{plan.completedThisWeek} / {plan.sessionsPerWeek} sessions</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill,{width:`${Math.round(pct*100)}%`}]} />
        </View>
      </View>

      <View style={s.row}>
        <View style={s.upNextBadge}><Text style={s.upNextText}>UP NEXT</Text></View>
        <Text style={[s.whiteSmall,{flex:1}]}>{plan.nextSession}</Text>
        <Text style={s.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Create Card ──────────────────────────────────────────────────────────────
function CreateCard({onPress}) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <Accent colors={ACCENT.create} />
      <View style={s.row}>
        <View style={{flex:1}}>
          <Text style={s.label}>BUILD YOUR OWN</Text>
          <Text style={s.bigTitle}>Create a Workout</Text>
          <Text style={s.greySmall}>Pick exercises from the full database</Text>
        </View>
        <View style={s.plusCircle}>
          <Text style={s.plusText}>＋</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Workouts Browse ──────────────────────────────────────────────────────────
function BrowseCard({templates, onSelect}) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const filtered = templates.filter(t =>
    (cat==='All'||t.cat===cat) &&
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <View style={s.card}>
      <Accent colors={ACCENT.browse} />
      <Text style={s.label}>WORKOUTS</Text>
      <Text style={[s.bigTitle,{marginBottom:12}]}>Browse Templates</Text>

      {/* Search */}
      <View style={s.searchBox}>
        <Text style={{fontSize:15}}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search workouts..."
          placeholderTextColor={C.textSec}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && <TouchableOpacity onPress={()=>setSearch('')}><Text style={{color:C.textSec,fontSize:14}}>✕</Text></TouchableOpacity>}
      </View>

      {/* Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}} contentContainerStyle={{paddingRight:4}}>
        {CATS.map(c=>(
          <TouchableOpacity key={c} style={[s.chip, cat===c&&s.chipOn]} onPress={()=>setCat(c)}>
            <Text style={[s.chipTxt, cat===c&&s.chipTxtOn]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[s.greySmall,{marginBottom:10}]}>{filtered.length} workouts</Text>

      {filtered.map(t=>(
        <TouchableOpacity key={t.id} style={s.templateRow} onPress={()=>onSelect(t)} activeOpacity={0.8}>
          <View style={[s.templateAccent,{backgroundColor:lvlColor(t.level)}]} />
          <View style={s.templateBody}>
            <View style={{flex:1}}>
              <Text style={s.templateName}>{t.name}</Text>
              <View style={s.row}>
                <Text style={s.blueSmall}>{t.cat}  </Text>
                <Text style={[s.blueSmall,{color:lvlColor(t.level)}]}>{t.level}</Text>
              </View>
              <Text style={s.greySmall}>⏱ {t.dur}m  ·  💪 {t.exs} exercises</Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </View>
        </TouchableOpacity>
      ))}
      {filtered.length===0&&(
        <View style={{alignItems:'center',paddingVertical:20}}>
          <Text style={s.whiteSmall}>No workouts found</Text>
          <Text style={s.greySmall}>Clear your search or filter</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ExerciseScreen({navigation}) {
  const [wod] = useState(()=>WOD_POOL[Math.floor(Math.random()*WOD_POOL.length)]);
  const [hasPlan] = useState(true); // set false to see no-plan state

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header — same layout as Community / My Health */}
      <View style={s.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>EXERCISE</Text>
        <View style={{width:60}}/>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Monthly summary strip */}
        <View style={s.summaryStrip}>
          {[{v:'12',l:'Workouts'},{v:'4,820',l:'Calories'},{v:'8h 40m',l:'Time'}].map((item,i,arr)=>(
            <React.Fragment key={item.l}>
              <View style={s.sumItem}>
                <Text style={s.sumVal}>{item.v}</Text>
                <Text style={s.greySmall}>{item.l}</Text>
              </View>
              {i<arr.length-1&&<View style={s.sumDiv}/>}
            </React.Fragment>
          ))}
        </View>

        {/* WOD */}
        <WODCard
          wod={wod}
          noPlan={!hasPlan}
          onSubscribe={()=>{}}
          onStart={()=>{}}
        />

        {/* Plan */}
        {hasPlan
          ? <PlanCard plan={PLAN} onPress={()=>{}} />
          : (
            <TouchableOpacity style={s.card} onPress={()=>{}} activeOpacity={0.85}>
              <Accent colors={ACCENT.plan} />
              <Text style={s.label}>MY PLAN</Text>
              <View style={{alignItems:'center',paddingVertical:20}}>
                <Text style={{fontSize:36,marginBottom:8}}>📋</Text>
                <Text style={s.bigTitle}>No plan subscribed</Text>
                <Text style={[s.greySmall,{textAlign:'center',marginBottom:16}]}>Browse structured plans for your goals</Text>
                <TouchableOpacity style={s.blueBtn}><Text style={s.blueBtnText}>Browse Plans</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        }

        {/* Create */}
        <CreateCard onPress={()=>navigation.navigate('CreateWorkoutScreen')} />

        {/* Browse */}
        <BrowseCard templates={TEMPLATES} onSelect={t=>{}} />

        <View style={{height:32}}/>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:       {flex:1, backgroundColor:C.bg},

  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingTop: Platform.OS==='ios'?54:36, paddingBottom:12, paddingHorizontal:16,
  },
  backTxt:      {color:C.blue, fontSize:15, fontWeight:'500'},
  headerTitle:  {color:C.white, fontSize:18, fontWeight:'700', letterSpacing:1.5},

  scroll:       {paddingHorizontal:16, paddingTop:8, paddingBottom:40},

  // Summary strip
  summaryStrip: {
    flexDirection:'row', backgroundColor:C.card,
    borderRadius:14, borderWidth:1, borderColor:C.border,
    padding:16, marginBottom:14,
  },
  sumItem:      {flex:1, alignItems:'center'},
  sumVal:       {color:C.lightBlue, fontSize:20, fontWeight:'700', marginBottom:2},
  sumDiv:       {width:1, backgroundColor:C.border, marginVertical:4},

  // Card
  card: {
    backgroundColor:C.card, borderRadius:14, borderWidth:1,
    borderColor:C.border, marginBottom:14, overflow:'hidden', padding:16,
  },
  accentBar:    {height:3, marginHorizontal:-16, marginTop:-16, marginBottom:14},

  // Typography
  label:        {color:C.textSec, fontSize:10, fontWeight:'600', letterSpacing:1.5, marginBottom:4},
  bigTitle:     {color:C.white, fontSize:20, fontWeight:'700', marginBottom:2},
  blueSmall:    {color:C.lightBlue, fontSize:12, fontWeight:'600'},
  greySmall:    {color:C.textSec, fontSize:12},
  whiteSmall:   {color:C.white, fontSize:13, fontWeight:'600'},
  arrow:        {color:C.textSec, fontSize:22},

  // Layout
  row:          {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10},

  diffBadge:    {borderWidth:1.5, borderRadius:8, paddingHorizontal:9, paddingVertical:3},
  diffText:     {fontSize:11, fontWeight:'700', letterSpacing:0.3},

  // Stats bar
  statsBar: {
    flexDirection:'row', backgroundColor:'rgba(255,255,255,0.04)',
    borderRadius:10, borderWidth:1, borderColor:C.border, padding:12, marginBottom:14,
  },
  statItem:     {flex:1, alignItems:'center'},
  statVal:      {color:C.white, fontSize:20, fontWeight:'700'},
  statLbl:      {color:C.textSec, fontSize:11, marginTop:2},
  statDiv:      {width:1, backgroundColor:C.border, marginVertical:4},

  // Exercise rows
  exRow:        {flexDirection:'row', alignItems:'center', gap:10, marginBottom:7},
  exDot:        {width:6,height:6,borderRadius:3,backgroundColor:C.lightBlue,flexShrink:0},
  exName:       {flex:1, color:'rgba(255,255,255,0.82)', fontSize:14},
  exReps:       {color:C.lightBlue, fontSize:13, fontWeight:'600'},

  // Buttons
  blueBtn:      {backgroundColor:C.blue, borderRadius:10, paddingVertical:13, alignItems:'center'},
  blueBtnText:  {color:C.white, fontWeight:'700', fontSize:15, letterSpacing:0.8},

  // Upsell
  upsell: {
    flexDirection:'row', alignItems:'center', marginTop:12, padding:12,
    backgroundColor:'rgba(255,193,7,0.1)', borderRadius:10,
    borderWidth:1, borderColor:'rgba(255,193,7,0.3)', gap:10,
  },
  upsellTitle:  {color:C.yellow, fontWeight:'700', fontSize:13},
  upsellSub:    {color:C.textSec, fontSize:11, marginTop:1},
  upsellArrow:  {color:C.yellow, fontSize:24},

  // Plan card
  weekBadge: {
    backgroundColor:'rgba(0,123,255,0.18)', borderRadius:8,
    paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:C.blue,
  },
  weekText:     {color:C.white, fontWeight:'700', fontSize:13},
  progressTrack:{height:5,backgroundColor:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'},
  progressFill: {height:'100%',borderRadius:3,backgroundColor:C.blue},
  upNextBadge:  {backgroundColor:'rgba(0,123,255,0.15)',borderRadius:6,paddingHorizontal:7,paddingVertical:3,marginRight:8},
  upNextText:   {color:C.blue,fontSize:10,fontWeight:'700',letterSpacing:0.8},

  // Create card
  plusCircle: {
    width:50,height:50,borderRadius:25,
    backgroundColor:'rgba(40,167,69,0.18)',
    borderWidth:1.5,borderColor:C.green,
    alignItems:'center',justifyContent:'center',
  },
  plusText:     {color:C.green, fontSize:26, lineHeight:32},

  // Search
  searchBox: {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor:'rgba(255,255,255,0.06)', borderRadius:10,
    borderWidth:1, borderColor:C.border,
    paddingHorizontal:12, paddingVertical:9, marginBottom:12,
  },
  searchInput:  {flex:1, color:C.white, fontSize:14, padding:0},

  // Chips — Community style
  chip: {
    marginRight:8, paddingHorizontal:14, paddingVertical:6,
    borderRadius:20, backgroundColor:'rgba(255,255,255,0.06)',
    borderWidth:1, borderColor:'rgba(74,144,226,0.25)',
  },
  chipOn:       {backgroundColor:C.blue, borderColor:C.blue},
  chipTxt:      {color:C.textSec, fontSize:13, fontWeight:'600'},
  chipTxtOn:    {color:C.white},

  // Template rows — Exercise search list style
  templateRow: {
    flexDirection:'row', backgroundColor:'rgba(255,255,255,0.04)',
    borderRadius:10, marginBottom:8, overflow:'hidden',
    borderWidth:1, borderColor:C.border,
  },
  templateAccent: {width:4, alignSelf:'stretch'},
  templateBody:   {flex:1, flexDirection:'row', alignItems:'center', padding:12, gap:8},
  templateName:   {color:C.white, fontSize:14, fontWeight:'600', marginBottom:3},
});