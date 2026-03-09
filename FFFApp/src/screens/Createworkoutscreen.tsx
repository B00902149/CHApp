/**
 * CreateWorkoutScreen.js  —  Coaching Hub
 * Matches app design exactly:
 *   - Dark navy bg, card-based layout
 *   - Two tabs: "My Workout" builder + "Browse Exercises" from DB
 *   - Exercise rows same style as Search / Exercise screens
 *   - Sets/reps/rest controls match ExerciseDemo screen pattern
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, FlatList,
  TouchableOpacity, TextInput, StyleSheet,
  Platform, StatusBar, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const C = {
  bg:        '#0A1628',
  card:      '#0F2040',
  border:    'rgba(74,144,226,0.18)',
  blue:      '#007BFF',
  lightBlue: '#4A90E2',
  white:     '#FFFFFF',
  textSec:   '#8899AA',
  green:     '#28A745',
  red:       '#DC3545',
  yellow:    '#FFC107',
};

// ─── Full exercise DB ──────────────────────────────────────────────────────────
const EXERCISES = [
  {id:'e1', name:'Bench Press',           muscle:'Chest',     equip:'Barbell',    type:'Strength',    level:'Intermediate'},
  {id:'e2', name:'Incline DB Press',      muscle:'Chest',     equip:'Dumbbell',   type:'Strength',    level:'Intermediate'},
  {id:'e3', name:'Cable Fly',             muscle:'Chest',     equip:'Cable',      type:'Isolation',   level:'Beginner'},
  {id:'e4', name:'Push-Up',               muscle:'Chest',     equip:'Bodyweight', type:'Strength',    level:'Beginner'},
  {id:'e5', name:'Dips',                  muscle:'Chest',     equip:'Bodyweight', type:'Strength',    level:'Intermediate'},
  {id:'e6', name:'Pull-Up',               muscle:'Back',      equip:'Bodyweight', type:'Strength',    level:'Intermediate'},
  {id:'e7', name:'Barbell Row',           muscle:'Back',      equip:'Barbell',    type:'Strength',    level:'Intermediate'},
  {id:'e8', name:'Lat Pulldown',          muscle:'Back',      equip:'Cable',      type:'Strength',    level:'Beginner'},
  {id:'e9', name:'Seated Cable Row',      muscle:'Back',      equip:'Cable',      type:'Isolation',   level:'Beginner'},
  {id:'e10',name:'Dumbbell Row',          muscle:'Back',      equip:'Dumbbell',   type:'Strength',    level:'Beginner'},
  {id:'e11',name:'Back Squat',            muscle:'Legs',      equip:'Barbell',    type:'Strength',    level:'Intermediate'},
  {id:'e12',name:'Romanian Deadlift',     muscle:'Legs',      equip:'Barbell',    type:'Strength',    level:'Intermediate'},
  {id:'e13',name:'Leg Press',             muscle:'Legs',      equip:'Machine',    type:'Strength',    level:'Beginner'},
  {id:'e14',name:'Leg Curl',              muscle:'Legs',      equip:'Machine',    type:'Isolation',   level:'Beginner'},
  {id:'e15',name:'Bulgarian Split Squat', muscle:'Legs',      equip:'Dumbbell',   type:'Strength',    level:'Advanced'},
  {id:'e16',name:'Box Jump',              muscle:'Legs',      equip:'Bodyweight', type:'Plyometric',  level:'Intermediate'},
  {id:'e17',name:'Overhead Press',        muscle:'Shoulders', equip:'Barbell',    type:'Strength',    level:'Intermediate'},
  {id:'e18',name:'Lateral Raise',         muscle:'Shoulders', equip:'Dumbbell',   type:'Isolation',   level:'Beginner'},
  {id:'e19',name:'Face Pull',             muscle:'Shoulders', equip:'Cable',      type:'Isolation',   level:'Beginner'},
  {id:'e20',name:'Arnold Press',          muscle:'Shoulders', equip:'Dumbbell',   type:'Strength',    level:'Intermediate'},
  {id:'e21',name:'Barbell Curl',          muscle:'Arms',      equip:'Barbell',    type:'Isolation',   level:'Beginner'},
  {id:'e22',name:'Tricep Pushdown',       muscle:'Arms',      equip:'Cable',      type:'Isolation',   level:'Beginner'},
  {id:'e23',name:'Hammer Curl',           muscle:'Arms',      equip:'Dumbbell',   type:'Isolation',   level:'Beginner'},
  {id:'e24',name:'Skull Crushers',        muscle:'Arms',      equip:'Barbell',    type:'Isolation',   level:'Intermediate'},
  {id:'e25',name:'Plank',                 muscle:'Core',      equip:'Bodyweight', type:'Isometric',   level:'Beginner'},
  {id:'e26',name:'Ab Wheel Rollout',      muscle:'Core',      equip:'Equipment',  type:'Strength',    level:'Advanced'},
  {id:'e27',name:'Hanging Leg Raise',     muscle:'Core',      equip:'Bodyweight', type:'Strength',    level:'Intermediate'},
  {id:'e28',name:'Cable Crunch',          muscle:'Core',      equip:'Cable',      type:'Isolation',   level:'Beginner'},
  {id:'e29',name:'Burpee',                muscle:'Full Body', equip:'Bodyweight', type:'Cardio',      level:'Intermediate'},
  {id:'e30',name:'Kettlebell Swing',      muscle:'Full Body', equip:'Kettlebell', type:'Cardio',      level:'Intermediate'},
  {id:'e31',name:'Jump Rope',             muscle:'Full Body', equip:'Equipment',  type:'Cardio',      level:'Beginner'},
  {id:'e32',name:'Mountain Climbers',     muscle:'Core',      equip:'Bodyweight', type:'Cardio',      level:'Beginner'},
];

const MUSCLES = ['All','Chest','Back','Legs','Shoulders','Arms','Core','Full Body'];
const EQUIPS  = ['All','Barbell','Dumbbell','Bodyweight','Cable','Machine','Kettlebell'];
const lvlColor = l => l==='Beginner'?C.green:l==='Intermediate'?C.yellow:C.red;

// ─── Exercise row in builder ───────────────────────────────────────────────────
function BuilderRow({item, index, onRemove, onUpdate}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.builderRow}>
      {/* Header */}
      <TouchableOpacity style={s.builderRowHead} onPress={()=>setOpen(o=>!o)} activeOpacity={0.8}>
        <View style={s.indexBadge}><Text style={s.indexText}>{index+1}</Text></View>
        <View style={{flex:1}}>
          <Text style={s.builderName}>{item.exercise.name}</Text>
          <Text style={s.builderMeta}>{item.exercise.muscle}  ·  {item.sets}×{item.reps}  ·  {item.rest}s rest</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={s.removeBtn}>
          <Text style={s.removeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={s.chevron}>{open?'▲':'▼'}</Text>
      </TouchableOpacity>

      {/* Expanded controls — same pattern as ExerciseDemo sets */}
      {open && (
        <View style={s.builderExpanded}>
          <View style={s.paramRow}>
            {/* Sets */}
            <View style={s.param}>
              <Text style={s.paramLabel}>Sets</Text>
              <View style={s.stepper}>
                <TouchableOpacity style={s.stepBtn} onPress={()=>onUpdate({sets:Math.max(1,item.sets-1)})}>
                  <Text style={s.stepBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepVal}>{item.sets}</Text>
                <TouchableOpacity style={s.stepBtn} onPress={()=>onUpdate({sets:Math.min(10,item.sets+1)})}>
                  <Text style={s.stepBtnTxt}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Reps */}
            <View style={s.param}>
              <Text style={s.paramLabel}>Reps</Text>
              <TextInput
                style={s.paramInput}
                value={item.reps}
                onChangeText={v=>onUpdate({reps:v})}
                keyboardType="default"
                placeholder="10"
                placeholderTextColor={C.textSec}
              />
            </View>
            {/* Rest */}
            <View style={s.param}>
              <Text style={s.paramLabel}>Rest (s)</Text>
              <View style={s.stepper}>
                <TouchableOpacity style={s.stepBtn} onPress={()=>onUpdate({rest:Math.max(0,item.rest-15)})}>
                  <Text style={s.stepBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepVal}>{item.rest}</Text>
                <TouchableOpacity style={s.stepBtn} onPress={()=>onUpdate({rest:item.rest+15})}>
                  <Text style={s.stepBtnTxt}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TextInput
            style={s.notesInput}
            placeholder="Notes (e.g. pause at bottom, grip cue)..."
            placeholderTextColor={C.textSec}
            value={item.notes||''}
            onChangeText={v=>onUpdate({notes:v})}
            multiline
          />
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CreateWorkoutScreen({navigation}) {
  const [name,    setName]    = useState('');
  const [built,   setBuilt]   = useState([]);
  const [tab,     setTab]     = useState('build');  // 'build' | 'browse'
  const [search,  setSearch]  = useState('');
  const [muscle,  setMuscle]  = useState('All');
  const [equip,   setEquip]   = useState('All');

  const filtered = EXERCISES.filter(e =>
    (muscle==='All'||e.muscle===muscle) &&
    (equip==='All'||e.equip===equip) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const addEx = (ex) => {
    if (built.find(b=>b.exercise.id===ex.id)) {
      Alert.alert('Already added',`${ex.name} is already in your workout.`);
      return;
    }
    setBuilt(prev=>[...prev,{exercise:ex,sets:3,reps:'10',rest:60,notes:''}]);
    setTab('build');
  };

  const removeEx = id => setBuilt(prev=>prev.filter(b=>b.exercise.id!==id));
  const updateEx = (id,upd) => setBuilt(prev=>prev.map(b=>b.exercise.id===id?{...b,...upd}:b));

  const totalSets = built.reduce((n,b)=>n+b.sets,0);
  const estTime   = Math.round(built.reduce((n,b)=>n+(b.sets*(parseFloat(b.reps)||10)*3+b.sets*b.rest)/60,0));

  const save = () => {
    if (!name.trim()) { Alert.alert('Name required','Give your workout a name.'); return; }
    if (!built.length){ Alert.alert('No exercises','Add at least one exercise.'); return; }
    Alert.alert('Saved! 🎉',`"${name}" has been added to your workouts.`,[
      {text:'Done', onPress:()=>navigation.goBack()},
    ]);
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={{width:64}}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>CREATE WORKOUT</Text>
        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveTxt}>SAVE</Text>
        </TouchableOpacity>
      </View>

      {/* Name input */}
      <View style={s.nameWrap}>
        <TextInput
          style={s.nameInput}
          placeholder="Workout name..."
          placeholderTextColor={C.textSec}
          value={name}
          onChangeText={setName}
          maxLength={40}
        />
        {built.length>0&&(
          <View style={s.summaryRow}>
            {[`💪 ${built.length}`,`📋 ${totalSets} sets`,`⏱ ~${estTime}m`].map(tag=>(
              <View key={tag} style={s.summaryPill}>
                <Text style={s.summaryPillTxt}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        <TouchableOpacity style={[s.tab,tab==='build'&&s.tabActive]} onPress={()=>setTab('build')}>
          <Text style={[s.tabTxt,tab==='build'&&s.tabTxtActive]}>
            My Workout{built.length?` (${built.length})`:''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab,tab==='browse'&&s.tabActive]} onPress={()=>setTab('browse')}>
          <Text style={[s.tabTxt,tab==='browse'&&s.tabTxtActive]}>Browse Exercises</Text>
        </TouchableOpacity>
      </View>

      {/* ── BUILD TAB ── */}
      {tab==='build'&&(
        <ScrollView style={{flex:1}} contentContainerStyle={s.buildContent} showsVerticalScrollIndicator={false}>
          {built.length===0
            ?(
              <View style={s.emptyBuild}>
                <Text style={{fontSize:48,marginBottom:12}}>🏗</Text>
                <Text style={s.emptyTitle}>No exercises yet</Text>
                <Text style={s.emptySubtitle}>Tap "Browse Exercises" to add moves</Text>
                <TouchableOpacity style={[s.blueBtn,{marginTop:20}]} onPress={()=>setTab('browse')}>
                  <Text style={s.blueBtnTxt}>Browse Exercises →</Text>
                </TouchableOpacity>
              </View>
            )
            :(
              <>
                {built.map((item,i)=>(
                  <BuilderRow
                    key={item.exercise.id}
                    item={item}
                    index={i}
                    onRemove={()=>removeEx(item.exercise.id)}
                    onUpdate={upd=>updateEx(item.exercise.id,upd)}
                  />
                ))}
                <TouchableOpacity style={s.addMoreBtn} onPress={()=>setTab('browse')}>
                  <Text style={s.addMoreTxt}>＋  Add More Exercises</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.blueBtn} onPress={save}>
                  <Text style={s.blueBtnTxt}>SAVE WORKOUT</Text>
                </TouchableOpacity>
              </>
            )
          }
        </ScrollView>
      )}

      {/* ── BROWSE TAB ── */}
      {tab==='browse'&&(
        <View style={{flex:1}}>
          {/* Search */}
          <View style={s.searchWrap}>
            <View style={s.searchBox}>
              <Text style={{fontSize:16}}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search by name or muscle..."
                placeholderTextColor={C.textSec}
                value={search}
                onChangeText={setSearch}
              />
              {!!search&&<TouchableOpacity onPress={()=>setSearch('')}><Text style={{color:C.textSec,fontSize:14}}>✕</Text></TouchableOpacity>}
            </View>
          </View>

          {/* Muscle filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{paddingHorizontal:16,paddingRight:24}}>
            {MUSCLES.map(m=>(
              <TouchableOpacity key={m} style={[s.chip,muscle===m&&s.chipOn]} onPress={()=>setMuscle(m)}>
                <Text style={[s.chipTxt,muscle===m&&s.chipTxtOn]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Equipment filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.filterRow,{marginTop:-4}]} contentContainerStyle={{paddingHorizontal:16,paddingRight:24}}>
            {EQUIPS.map(e=>(
              <TouchableOpacity key={e} style={[s.chipSm,equip===e&&s.chipSmOn]} onPress={()=>setEquip(e)}>
                <Text style={[s.chipSmTxt,equip===e&&s.chipSmTxtOn]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.resultCount}>{filtered.length} exercises</Text>

          <FlatList
            data={filtered}
            keyExtractor={i=>i.id}
            contentContainerStyle={{paddingHorizontal:16,paddingBottom:40}}
            renderItem={({item})=>{
              const added = built.some(b=>b.exercise.id===item.id);
              return (
                <TouchableOpacity
                  style={[s.exListRow, added&&s.exListRowAdded]}
                  onPress={()=>addEx(item)}
                  activeOpacity={0.8}
                >
                  {/* Left accent bar — like Search screen rows */}
                  <View style={[s.exListAccent,{backgroundColor:lvlColor(item.level)}]}/>
                  <View style={s.exListBody}>
                    <View style={{flex:1}}>
                      <Text style={s.exListName}>{item.name}</Text>
                      <View style={{flexDirection:'row',gap:8,marginTop:2}}>
                        <Text style={s.blueXS}>{item.type}</Text>
                        <Text style={[s.blueXS,{color:lvlColor(item.level)}]}>{item.level}</Text>
                      </View>
                      <Text style={s.greyXS}>{item.muscle}  ·  {item.equip}</Text>
                    </View>
                    <View style={[s.addBtn,added&&s.addBtnAdded]}>
                      <Text style={[s.addBtnTxt,added&&{color:C.green}]}>{added?'✓':'＋'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{alignItems:'center',paddingVertical:40}}>
                <Text style={{color:C.white,fontWeight:'600',fontSize:15}}>No exercises found</Text>
                <Text style={{color:C.textSec,fontSize:13,marginTop:4}}>Try clearing filters</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:     {flex:1,backgroundColor:C.bg},

  header: {
    flexDirection:'row',alignItems:'center',justifyContent:'space-between',
    paddingTop:Platform.OS==='ios'?54:36,paddingBottom:12,paddingHorizontal:16,
  },
  backTxt:    {color:C.blue,fontSize:15,fontWeight:'500'},
  headerTitle:{color:C.white,fontSize:18,fontWeight:'700',letterSpacing:1.5},
  saveBtn:    {backgroundColor:C.blue,borderRadius:10,paddingHorizontal:16,paddingVertical:7},
  saveTxt:    {color:C.white,fontWeight:'700',fontSize:13,letterSpacing:1},

  // Name area
  nameWrap: {
    backgroundColor:C.card,paddingHorizontal:16,paddingVertical:12,
    borderBottomWidth:1,borderBottomColor:C.border,
  },
  nameInput: {
    fontSize:18,fontWeight:'700',color:C.white,
    paddingVertical:4,borderBottomWidth:2,borderBottomColor:C.blue,
  },
  summaryRow:     {flexDirection:'row',gap:8,marginTop:10,flexWrap:'wrap'},
  summaryPill:    {backgroundColor:'rgba(0,123,255,0.15)',borderRadius:20,paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:'rgba(0,123,255,0.25)'},
  summaryPillTxt: {color:C.lightBlue,fontSize:12,fontWeight:'600'},

  // Tabs — match Community screen
  tabBar:     {flexDirection:'row',backgroundColor:C.card,borderBottomWidth:1,borderBottomColor:C.border},
  tab:        {flex:1,paddingVertical:13,alignItems:'center'},
  tabActive:  {borderBottomWidth:2,borderBottomColor:C.blue},
  tabTxt:     {fontSize:14,fontWeight:'600',color:C.textSec},
  tabTxtOn:   {},
  tabTxtActive:{color:C.white},

  // Build tab
  buildContent: {padding:16,paddingBottom:40},
  emptyBuild:   {alignItems:'center',paddingVertical:60},
  emptyTitle:   {color:C.white,fontSize:17,fontWeight:'700'},
  emptySubtitle:{color:C.textSec,fontSize:13,textAlign:'center',marginTop:6,paddingHorizontal:30},

  blueBtn:    {backgroundColor:C.blue,borderRadius:10,paddingVertical:14,alignItems:'center'},
  blueBtnTxt: {color:C.white,fontWeight:'700',fontSize:15,letterSpacing:0.8},

  // Builder row — matches ExerciseDemo set rows
  builderRow: {
    backgroundColor:C.card,borderRadius:12,marginBottom:10,
    overflow:'hidden',borderWidth:1,borderColor:C.border,
  },
  builderRowHead: {flexDirection:'row',alignItems:'center',padding:12,gap:10},
  indexBadge:     {width:28,height:28,borderRadius:8,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},
  indexText:      {color:C.white,fontWeight:'700',fontSize:13},
  builderName:    {color:C.white,fontSize:14,fontWeight:'600'},
  builderMeta:    {color:C.textSec,fontSize:11,marginTop:2},
  removeBtn:      {width:26,height:26,borderRadius:6,backgroundColor:'rgba(220,53,69,0.15)',alignItems:'center',justifyContent:'center'},
  removeTxt:      {color:C.red,fontSize:12,fontWeight:'700'},
  chevron:        {color:C.textSec,fontSize:12,marginLeft:4},

  builderExpanded:{borderTopWidth:1,borderTopColor:C.border,padding:12,backgroundColor:'rgba(255,255,255,0.02)'},
  paramRow:       {flexDirection:'row',gap:10,marginBottom:12},
  param:          {flex:1,alignItems:'center',gap:6},
  paramLabel:     {color:C.textSec,fontSize:11,fontWeight:'600',letterSpacing:0.5},
  stepper:        {flexDirection:'row',alignItems:'center',gap:6},
  stepBtn:        {width:28,height:28,borderRadius:8,backgroundColor:'rgba(0,123,255,0.15)',alignItems:'center',justifyContent:'center'},
  stepBtnTxt:     {color:C.lightBlue,fontSize:16,fontWeight:'700',lineHeight:20},
  stepVal:        {color:C.white,fontSize:16,fontWeight:'700',minWidth:24,textAlign:'center'},
  paramInput: {
    borderWidth:1.5,borderColor:'rgba(0,123,255,0.3)',borderRadius:8,
    paddingHorizontal:10,paddingVertical:4,fontSize:15,fontWeight:'700',
    color:C.white,textAlign:'center',width:56,
  },
  notesInput: {
    borderWidth:1,borderColor:C.border,borderRadius:8,padding:10,
    fontSize:13,color:C.white,minHeight:36,
    backgroundColor:'rgba(255,255,255,0.04)',
  },

  addMoreBtn: {
    borderWidth:1.5,borderColor:C.blue,borderRadius:10,
    paddingVertical:12,alignItems:'center',marginBottom:12,
    borderStyle:'dashed',
  },
  addMoreTxt: {color:C.blue,fontWeight:'700',fontSize:14},

  // Browse tab
  searchWrap:   {backgroundColor:C.card,paddingHorizontal:16,paddingVertical:10},
  searchBox: {
    flexDirection:'row',alignItems:'center',gap:8,
    backgroundColor:'rgba(255,255,255,0.06)',borderRadius:10,
    borderWidth:1,borderColor:C.border,paddingHorizontal:12,paddingVertical:9,
  },
  searchInput:  {flex:1,color:C.white,fontSize:14,padding:0},

  filterRow:    {backgroundColor:C.card,paddingVertical:8},
  chip: {
    marginRight:8,paddingHorizontal:14,paddingVertical:6,
    borderRadius:20,backgroundColor:'rgba(255,255,255,0.06)',
    borderWidth:1,borderColor:'rgba(74,144,226,0.25)',
  },
  chipOn:       {backgroundColor:C.blue,borderColor:C.blue},
  chipTxt:      {color:C.textSec,fontSize:13,fontWeight:'600'},
  chipTxtOn:    {color:C.white},

  chipSm:       {marginRight:6,paddingHorizontal:10,paddingVertical:4,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,0.12)'},
  chipSmOn:     {borderColor:C.lightBlue,backgroundColor:'rgba(74,144,226,0.12)'},
  chipSmTxt:    {color:C.textSec,fontSize:11,fontWeight:'600'},
  chipSmTxtOn:  {color:C.lightBlue},

  resultCount:  {color:C.textSec,fontSize:12,fontWeight:'600',paddingHorizontal:16,paddingVertical:6},

  // Exercise list rows — same as Search/Exercise screen
  exListRow: {
    flexDirection:'row',backgroundColor:C.card,borderRadius:10,
    marginBottom:8,overflow:'hidden',borderWidth:1,borderColor:C.border,
  },
  exListRowAdded: {borderColor:C.green,backgroundColor:'rgba(40,167,69,0.06)'},
  exListAccent:   {width:4,alignSelf:'stretch'},
  exListBody:     {flex:1,flexDirection:'row',alignItems:'center',padding:12,gap:10},
  exListName:     {color:C.white,fontSize:14,fontWeight:'600'},
  blueXS:         {color:C.lightBlue,fontSize:12,fontWeight:'600'},
  greyXS:         {color:C.textSec,fontSize:11,marginTop:2},
  addBtn: {
    width:30,height:30,borderRadius:8,
    backgroundColor:'rgba(0,123,255,0.15)',
    borderWidth:1.5,borderColor:C.blue,
    alignItems:'center',justifyContent:'center',
  },
  addBtnAdded:    {backgroundColor:'rgba(40,167,69,0.15)',borderColor:C.green},
  addBtnTxt:      {color:C.blue,fontSize:18,fontWeight:'700',lineHeight:22},
});