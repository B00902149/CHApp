/**
 * PlansScreen.tsx — Coaching Hub
 * Browse all available plans. Filter by difficulty / equipment.
 * Subscribe / unsubscribe. Subscribed plans appear in MyPlansScreen.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  AVAILABLE_PLANS, planStorage, SubscribedPlan,
  getDifficultyColor, getEquipmentIcon, getSessionsPerWeek, getTodaySession,
  Plan, Difficulty, Equipment,
} from '../services/planStorage';

const C = {
  bg:'#0a1628', card:'#0d1f3c', border:'#1a3a6b',
  blue:'#4A9EFF', white:'#FFFFFF', textSec:'#5a7fa8',
  textMid:'#2a4a7f', green:'#26de81', red:'#FF6B6B', yellow:'#FF9F43', purple:'#7B6FFF',
};

const DIFF_FILTERS: (Difficulty | 'All')[] = ['All','Beginner','Intermediate','Advanced'];
const EQ_FILTERS:   (Equipment  | 'All')[] = ['All','Gym','Home','Both'];

// ── Plan Detail Modal ─────────────────────────────────────────────────────────
function PlanDetailModal({ plan, subscribed, visible, onClose, onSubscribe, onUnsubscribe }: {
  plan: Plan | null; subscribed: boolean; visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}) {
  if (!plan) return null;
  const dc   = getDifficultyColor(plan.difficulty);
  const days: [string, string][] = [
    ['Mon', plan.schedule.mon], ['Tue', plan.schedule.tue], ['Wed', plan.schedule.wed],
    ['Thu', plan.schedule.thu], ['Fri', plan.schedule.fri], ['Sat', plan.schedule.sat],
    ['Sun', plan.schedule.sun],
  ] as any;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={ms.sheet} activeOpacity={1}>
          <View style={ms.handle} />

          {/* Coach */}
          <View style={ms.coachRow}>
            <Text style={ms.coachAvatar}>{plan.coach.avatar}</Text>
            <View>
              <Text style={ms.coachLabel}>COACH</Text>
              <Text style={ms.coachName}>{plan.coach.name}</Text>
            </View>
            {subscribed && (
              <View style={ms.subscribedBadge}>
                <Text style={ms.subscribedBadgeTxt}>✓ Subscribed</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[ms.planTitle, {color: plan.color}]}>{plan.name}</Text>
          <Text style={ms.planDesc}>{plan.description}</Text>

          {/* Stats row */}
          <View style={ms.statsRow}>
            {[
              {v: `${plan.durationWeeks}w`,              l: 'Duration'},
              {v: `${getSessionsPerWeek(plan)}/wk`,      l: 'Sessions'},
              {v: getEquipmentIcon(plan.equipment),       l: plan.equipment},
            ].map((st, i, arr) => (
              <React.Fragment key={st.l}>
                <View style={ms.statItem}>
                  <Text style={ms.statVal}>{st.v}</Text>
                  <Text style={ms.statLbl}>{st.l}</Text>
                </View>
                {i < arr.length - 1 && <View style={ms.statDiv} />}
              </React.Fragment>
            ))}
          </View>

          {/* Difficulty */}
          <View style={[ms.diffRow, {borderColor: dc}]}>
            <Text style={[ms.diffTxt, {color: dc}]}>⚡ {plan.difficulty}</Text>
          </View>

          {/* Weekly schedule */}
          <Text style={ms.scheduleLabel}>WEEKLY SCHEDULE</Text>
          <View style={ms.scheduleGrid}>
            {days.map(([day, session]) => (
              <View key={day} style={[ms.dayCell, session ? {borderColor: plan.color} : {opacity: 0.4}]}>
                <Text style={[ms.dayName, session && {color: plan.color}]}>{day}</Text>
                <Text style={ms.daySession} numberOfLines={2}>{session || 'Rest'}</Text>
              </View>
            ))}
          </View>

          {/* Tags */}
          <View style={ms.tagsRow}>
            {plan.tags.map(t => (
              <View key={t} style={[ms.tag, {borderColor: plan.color + '66'}]}>
                <Text style={[ms.tagTxt, {color: plan.color}]}>{t}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          {subscribed ? (
            <TouchableOpacity style={ms.unsubBtn} onPress={onUnsubscribe}>
              <Text style={ms.unsubBtnTxt}>Unsubscribe from Plan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[ms.subBtn, {backgroundColor: plan.color}]} onPress={onSubscribe}>
              <Text style={ms.subBtnTxt}>Subscribe to Plan</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
            <Text style={ms.cancelBtnTxt}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PlansScreen({ navigation }: any) {
  const [subscribed,   setSubscribed]   = useState<SubscribedPlan[]>([]);
  const [diffFilter,   setDiffFilter]   = useState<Difficulty | 'All'>('All');
  const [eqFilter,     setEqFilter]     = useState<Equipment  | 'All'>('All');
  const [selected,     setSelected]     = useState<Plan | null>(null);

  useFocusEffect(useCallback(() => {
    planStorage.getSubscribed().then(setSubscribed);
  }, []));

  const isSubscribed = (id: string) => subscribed.some(p => p.id === id);

  const filtered = AVAILABLE_PLANS.filter(p => {
    if (diffFilter !== 'All' && p.difficulty !== diffFilter) return false;
    if (eqFilter   !== 'All' && p.equipment  !== eqFilter)   return false;
    return true;
  });

  const handleSubscribe = async () => {
    if (!selected) return;
    try {
      await planStorage.subscribe(selected);
      const updated = await planStorage.getSubscribed();
      setSubscribed(updated);
      setSelected(null);
      Alert.alert('Subscribed! 🎉', `"${selected.name}" has been added to My Plans.`);
    } catch {
      Alert.alert('Already subscribed', 'You\'re already on this plan.');
    }
  };

  const handleUnsubscribe = () => {
    if (!selected) return;
    Alert.alert(
      'Unsubscribe',
      `Remove "${selected.name}" from your plans? Your progress will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unsubscribe', style: 'destructive', onPress: async () => {
          await planStorage.unsubscribe(selected.id);
          setSubscribed(prev => prev.filter(p => p.id !== selected.id));
          setSelected(null);
        }},
      ]
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{width:64}}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>BROWSE PLANS</Text>
        <View style={{width:64}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Subtitle */}
        <Text style={s.subtitle}>
          Coach-curated training programmes. Subscribe to track your progress.
        </Text>

        {/* Difficulty filter */}
        <Text style={s.filterLabel}>DIFFICULTY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {DIFF_FILTERS.map(f => {
            const on  = diffFilter === f;
            const col = f === 'All' ? C.blue : getDifficultyColor(f as Difficulty);
            return (
              <TouchableOpacity key={f} style={[s.chip, on && {backgroundColor: col + '33', borderColor: col}]} onPress={() => setDiffFilter(f)}>
                <Text style={[s.chipTxt, on && {color: col}]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Equipment filter */}
        <Text style={s.filterLabel}>EQUIPMENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {EQ_FILTERS.map(f => {
            const on  = eqFilter === f;
            return (
              <TouchableOpacity key={f} style={[s.chip, on && {backgroundColor: C.blue + '33', borderColor: C.blue}]} onPress={() => setEqFilter(f)}>
                <Text style={[s.chipTxt, on && {color: C.blue}]}>
                  {f !== 'All' ? getEquipmentIcon(f as Equipment) + '  ' : ''}{f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Plan cards */}
        <Text style={s.filterLabel}>{filtered.length} PLANS</Text>
        {filtered.map(plan => {
          const dc   = getDifficultyColor(plan.difficulty);
          const sub  = isSubscribed(plan.id);
          const spw  = getSessionsPerWeek(plan);
          const today = getTodaySession(plan);
          return (
            <TouchableOpacity key={plan.id} style={[s.planCard, {borderLeftColor: plan.color}]} onPress={() => setSelected(plan)} activeOpacity={0.85}>
              <LinearGradient colors={[plan.color + '22', 'transparent']} style={s.cardGrad} start={{x:0,y:0}} end={{x:1,y:0}} />

              {/* Top row */}
              <View style={s.planCardTop}>
                <View style={{flex:1}}>
                  <Text style={s.coachSmall}>{plan.coach.avatar}  {plan.coach.name}</Text>
                  <Text style={[s.planName, {color: plan.color}]}>{plan.name}</Text>
                </View>
                {sub && (
                  <View style={[s.subBadge, {borderColor: plan.color, backgroundColor: plan.color + '22'}]}>
                    <Text style={[s.subBadgeTxt, {color: plan.color}]}>✓ Active</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <Text style={s.planDesc} numberOfLines={2}>{plan.description}</Text>

              {/* Meta chips */}
              <View style={s.metaRow}>
                <View style={[s.metaChip, {borderColor: dc}]}>
                  <Text style={[s.metaChipTxt, {color: dc}]}>{plan.difficulty}</Text>
                </View>
                <View style={s.metaChip}>
                  <Text style={s.metaChipTxt}>{getEquipmentIcon(plan.equipment)} {plan.equipment}</Text>
                </View>
                <View style={s.metaChip}>
                  <Text style={s.metaChipTxt}>📅 {plan.durationWeeks} weeks</Text>
                </View>
                <View style={s.metaChip}>
                  <Text style={s.metaChipTxt}>💪 {spw}×/wk</Text>
                </View>
              </View>

              {/* Today's session hint */}
              {today && (
                <View style={[s.todayRow, {borderColor: plan.color + '55'}]}>
                  <Text style={s.todayLabel}>TODAY</Text>
                  <Text style={[s.todaySession, {color: plan.color}]}>{today}</Text>
                </View>
              )}

              <Text style={s.tapHint}>Tap to view full schedule →</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{height:40}} />
      </ScrollView>

      <PlanDetailModal
        plan={selected}
        subscribed={selected ? isSubscribed(selected.id) : false}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onSubscribe={handleSubscribe}
        onUnsubscribe={handleUnsubscribe}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {flex:1, backgroundColor:C.bg},
  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingTop: Platform.OS==='ios' ? 54 : 36,
    paddingBottom:12, paddingHorizontal:16,
    backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border,
  },
  backTxt:     {color:C.blue, fontSize:15, fontWeight:'500'},
  headerTitle: {color:C.white, fontSize:18, fontWeight:'700', letterSpacing:1.5},
  scroll:      {padding:16},
  subtitle:    {color:C.textSec, fontSize:14, lineHeight:20, marginBottom:20},

  filterLabel: {color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:8},
  filterRow:   {gap:8, marginBottom:16, paddingRight:16},
  chip:        {paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:C.border, backgroundColor:'transparent'},
  chipTxt:     {color:C.textSec, fontSize:13, fontWeight:'600'},

  planCard:    {
    backgroundColor:C.card, borderRadius:16, marginBottom:14,
    borderLeftWidth:4, borderTopWidth:1, borderRightWidth:1, borderBottomWidth:1,
    borderTopColor:C.border, borderRightColor:C.border, borderBottomColor:C.border,
    padding:16, overflow:'hidden',
  },
  cardGrad:    {position:'absolute', top:0, left:0, right:0, bottom:0},
  planCardTop: {flexDirection:'row', alignItems:'flex-start', marginBottom:6},
  coachSmall:  {color:C.textSec, fontSize:11, fontWeight:'600', marginBottom:4},
  planName:    {fontSize:18, fontWeight:'800'},
  subBadge:    {borderWidth:1.5, borderRadius:8, paddingHorizontal:8, paddingVertical:4, marginLeft:8},
  subBadgeTxt: {fontSize:11, fontWeight:'800'},
  planDesc:    {color:'rgba(255,255,255,0.6)', fontSize:13, lineHeight:18, marginBottom:12},
  metaRow:     {flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:10},
  metaChip:    {borderWidth:1, borderColor:C.border, borderRadius:20, paddingHorizontal:8, paddingVertical:3},
  metaChipTxt: {color:C.textSec, fontSize:11, fontWeight:'600'},
  todayRow:    {flexDirection:'row', alignItems:'center', gap:8, borderWidth:1, borderRadius:8, paddingHorizontal:10, paddingVertical:6, marginBottom:8},
  todayLabel:  {color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1},
  todaySession:{fontSize:13, fontWeight:'700'},
  tapHint:     {color:C.textMid, fontSize:11},
});

const ms = StyleSheet.create({
  overlay: {flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end'},
  sheet:   {backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40, maxHeight:'92%'},
  handle:  {width:40, height:4, backgroundColor:C.border, borderRadius:2, alignSelf:'center', marginBottom:20},

  coachRow:         {flexDirection:'row', alignItems:'center', gap:10, marginBottom:12},
  coachAvatar:      {fontSize:32},
  coachLabel:       {color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1},
  coachName:        {color:C.white, fontSize:14, fontWeight:'700'},
  subscribedBadge:  {marginLeft:'auto' as any, backgroundColor:'rgba(38,222,129,0.15)', borderWidth:1, borderColor:'#26de81', borderRadius:8, paddingHorizontal:10, paddingVertical:4},
  subscribedBadgeTxt:{color:'#26de81', fontSize:12, fontWeight:'700'},

  planTitle:  {fontSize:26, fontWeight:'900', marginBottom:8},
  planDesc:   {color:'rgba(255,255,255,0.65)', fontSize:14, lineHeight:21, marginBottom:16},

  statsRow:   {flexDirection:'row', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:14, marginBottom:12},
  statItem:   {flex:1, alignItems:'center'},
  statVal:    {color:C.white, fontSize:20, fontWeight:'800'},
  statLbl:    {color:C.textSec, fontSize:11, marginTop:3},
  statDiv:    {width:1, backgroundColor:C.border, marginVertical:4},

  diffRow:    {alignSelf:'flex-start', borderWidth:1.5, borderRadius:8, paddingHorizontal:10, paddingVertical:5, marginBottom:16},
  diffTxt:    {fontSize:13, fontWeight:'700'},

  scheduleLabel: {color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:10},
  scheduleGrid:  {flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:16},
  dayCell:       {width:'13%' as any, borderWidth:1.5, borderColor:C.border, borderRadius:8, padding:6, alignItems:'center', minWidth:42},
  dayName:       {color:C.textSec, fontSize:10, fontWeight:'800', marginBottom:4},
  daySession:    {color:'rgba(255,255,255,0.7)', fontSize:9, textAlign:'center', lineHeight:12},

  tagsRow:    {flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:20},
  tag:        {borderWidth:1, borderRadius:20, paddingHorizontal:10, paddingVertical:4},
  tagTxt:     {fontSize:12, fontWeight:'600'},

  subBtn:     {borderRadius:14, paddingVertical:15, alignItems:'center', marginBottom:10},
  subBtnTxt:  {color:C.white, fontWeight:'800', fontSize:16},
  unsubBtn:   {borderWidth:1.5, borderColor:C.red, borderRadius:14, paddingVertical:14, alignItems:'center', marginBottom:10},
  unsubBtnTxt:{color:C.red, fontWeight:'700', fontSize:15},
  cancelBtn:  {paddingVertical:12, alignItems:'center'},
  cancelBtnTxt:{color:C.textSec, fontWeight:'600', fontSize:15},
});