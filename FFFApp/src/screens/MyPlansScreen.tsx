/**
 * MyPlansScreen.tsx — Coaching Hub
 * Shows the user's subscribed plans with progress tracking.
 * Each plan shows current week, sessions this week, today's session, and weekly schedule.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  planStorage, SubscribedPlan,
  getDifficultyColor, getEquipmentIcon, getSessionsPerWeek, getTodaySession,
} from '../services/planStorage';

const C = {
  bg:'#0a1628', card:'#0d1f3c', border:'#1a3a6b',
  blue:'#4A9EFF', white:'#FFFFFF', textSec:'#5a7fa8',
  textMid:'#2a4a7f', green:'#26de81', red:'#FF6B6B', yellow:'#FF9F43', purple:'#7B6FFF',
};

const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
const DAY_LABELS = ['M','T','W','T','F','S','S'];

export default function MyPlansScreen({ navigation }: any) {
  const [plans, setPlans] = useState<SubscribedPlan[]>([]);

  useFocusEffect(useCallback(() => {
    planStorage.getSubscribed().then(setPlans);
  }, []));

  const handleUnsubscribe = (plan: SubscribedPlan) => {
    Alert.alert(
      'Unsubscribe',
      `Remove "${plan.name}" from your plans? Your progress will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unsubscribe', style: 'destructive', onPress: async () => {
          await planStorage.unsubscribe(plan.id);
          setPlans(prev => prev.filter(p => p.id !== plan.id));
        }},
      ]
    );
  };

  const todayIndex = new Date().getDay(); // 0=Sun
  const todayKey = DAY_KEYS[todayIndex === 0 ? 6 : todayIndex - 1]; // convert to mon-first

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{width:64}}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>MY PLANS</Text>
        <TouchableOpacity
          style={s.browseBtn}
          onPress={() => navigation.navigate('PlansScreen')}
        >
          <Text style={s.browseBtnTxt}>Browse</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={s.emptyTitle}>No active plans</Text>
            <Text style={s.emptySub}>
              Subscribe to a coach-curated plan to track your programme progress here.
            </Text>
            <TouchableOpacity style={s.blueBtn} onPress={() => navigation.navigate('PlansScreen')}>
              <Text style={s.blueBtnTxt}>Browse Plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map(plan => {
            const dc          = getDifficultyColor(plan.difficulty);
            const spw         = getSessionsPerWeek(plan);
            const todaySession = getTodaySession(plan);
            const totalSessions = plan.durationWeeks * spw;
            const pct         = Math.min(1, plan.completedSessions / totalSessions);
            const weekPct     = Math.min(1, plan.currentWeek / plan.durationWeeks);

            return (
              <View key={plan.id} style={[s.planCard, {borderLeftColor: plan.color}]}>
                <LinearGradient
                  colors={[plan.color + '22', 'transparent']}
                  style={s.cardGrad} start={{x:0,y:0}} end={{x:1,y:0}}
                />

                {/* Header */}
                <View style={s.cardHeader}>
                  <View style={{flex:1}}>
                    <Text style={s.coachSmall}>{plan.coach.avatar}  {plan.coach.name}</Text>
                    <Text style={[s.planName, {color: plan.color}]}>{plan.name}</Text>
                  </View>
                  <View style={[s.weekBadge, {borderColor: plan.color, backgroundColor: plan.color + '22'}]}>
                    <Text style={[s.weekBadgeTxt, {color: plan.color}]}>W{plan.currentWeek}</Text>
                  </View>
                </View>

                {/* Meta row */}
                <View style={s.metaRow}>
                  <View style={[s.metaChip, {borderColor: dc}]}>
                    <Text style={[s.metaChipTxt, {color: dc}]}>{plan.difficulty}</Text>
                  </View>
                  <View style={s.metaChip}>
                    <Text style={s.metaChipTxt}>{getEquipmentIcon(plan.equipment)} {plan.equipment}</Text>
                  </View>
                  <View style={s.metaChip}>
                    <Text style={s.metaChipTxt}>Week {plan.currentWeek} of {plan.durationWeeks}</Text>
                  </View>
                </View>

                {/* Overall progress bar */}
                <View style={s.progressSection}>
                  <View style={s.progressLabelRow}>
                    <Text style={s.progressLabel}>OVERALL PROGRESS</Text>
                    <Text style={s.progressPct}>{Math.round(pct * 100)}%  ·  {plan.completedSessions} sessions done</Text>
                  </View>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, {width: `${Math.round(pct * 100)}%` as any, backgroundColor: plan.color}]} />
                  </View>
                </View>

                {/* Today's session */}
                {todaySession ? (
                  <View style={[s.todayCard, {borderColor: plan.color + '66', backgroundColor: plan.color + '11'}]}>
                    <View style={{flex:1}}>
                      <Text style={s.todayLabel}>TODAY'S SESSION</Text>
                      <Text style={[s.todaySession, {color: plan.color}]}>{todaySession}</Text>
                    </View>
                    <Text style={s.arrow}>›</Text>
                  </View>
                ) : (
                  <View style={[s.todayCard, {borderColor: C.border, opacity: 0.6}]}>
                    <Text style={s.restDay}>🛌  Rest Day — recover well</Text>
                  </View>
                )}

                {/* Weekly schedule mini-grid */}
                <Text style={s.schedLabel}>THIS WEEK</Text>
                <View style={s.dayRow}>
                  {DAY_KEYS.map((key, i) => {
                    const session  = plan.schedule[key];
                    const isToday  = key === todayKey;
                    return (
                      <View
                        key={key}
                        style={[
                          s.dayDot,
                          session  ? {backgroundColor: plan.color + '33', borderColor: plan.color} : {borderColor: C.border},
                          isToday  && {borderWidth: 2, borderColor: plan.color},
                        ]}
                      >
                        <Text style={[s.dayLetter, isToday && {color: plan.color}]}>{DAY_LABELS[i]}</Text>
                        <Text style={s.dayDotIcon}>{session ? '💪' : '—'}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Unsubscribe */}
                <TouchableOpacity style={s.unsubBtn} onPress={() => handleUnsubscribe(plan)}>
                  <Text style={s.unsubBtnTxt}>Unsubscribe</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Browse more CTA if already subscribed to something */}
        {plans.length > 0 && (
          <TouchableOpacity style={s.browseMoreBtn} onPress={() => navigation.navigate('PlansScreen')}>
            <Text style={s.browseMoreTxt}>＋  Browse More Plans</Text>
          </TouchableOpacity>
        )}

        <View style={{height:40}} />
      </ScrollView>
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
  backTxt:      {color:C.blue, fontSize:15, fontWeight:'500'},
  headerTitle:  {color:C.white, fontSize:18, fontWeight:'700', letterSpacing:1.5},
  browseBtn:    {backgroundColor:'rgba(74,158,255,0.2)', borderRadius:8, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:C.blue},
  browseBtnTxt: {color:C.blue, fontWeight:'700', fontSize:13},

  scroll: {padding:16},

  empty:      {alignItems:'center', paddingTop:80},
  emptyEmoji: {fontSize:56, marginBottom:16},
  emptyTitle: {color:C.white, fontSize:20, fontWeight:'700', marginBottom:8},
  emptySub:   {color:C.textSec, fontSize:14, textAlign:'center', lineHeight:20, marginBottom:28, paddingHorizontal:24},
  blueBtn:    {backgroundColor:C.blue, borderRadius:12, paddingVertical:13, paddingHorizontal:28},
  blueBtnTxt: {color:C.white, fontWeight:'700', fontSize:15},

  planCard: {
    backgroundColor:C.card, borderRadius:16, marginBottom:16,
    borderLeftWidth:4, borderTopWidth:1, borderRightWidth:1, borderBottomWidth:1,
    borderTopColor:C.border, borderRightColor:C.border, borderBottomColor:C.border,
    padding:16, overflow:'hidden',
  },
  cardGrad:   {position:'absolute', top:0, left:0, right:0, bottom:0},
  cardHeader: {flexDirection:'row', alignItems:'flex-start', marginBottom:10},
  coachSmall: {color:C.textSec, fontSize:11, fontWeight:'600', marginBottom:4},
  planName:   {fontSize:20, fontWeight:'900'},
  weekBadge:  {borderWidth:1.5, borderRadius:8, paddingHorizontal:10, paddingVertical:4, marginLeft:8},
  weekBadgeTxt:{fontSize:14, fontWeight:'800'},

  metaRow:    {flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14},
  metaChip:   {borderWidth:1, borderColor:C.border, borderRadius:20, paddingHorizontal:8, paddingVertical:3},
  metaChipTxt:{color:C.textSec, fontSize:11, fontWeight:'600'},

  progressSection:  {marginBottom:14},
  progressLabelRow: {flexDirection:'row', justifyContent:'space-between', marginBottom:6},
  progressLabel:    {color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5},
  progressPct:      {color:C.textSec, fontSize:11},
  progressTrack:    {height:6, backgroundColor:C.border, borderRadius:3, overflow:'hidden'},
  progressFill:     {height:'100%', borderRadius:3},

  todayCard:    {flexDirection:'row', alignItems:'center', borderWidth:1.5, borderRadius:10, padding:12, marginBottom:14},
  todayLabel:   {color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:3},
  todaySession: {fontSize:15, fontWeight:'800'},
  restDay:      {color:C.textSec, fontSize:14, fontWeight:'600'},
  arrow:        {color:C.textSec, fontSize:20},

  schedLabel: {color:C.textSec, fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:8},
  dayRow:     {flexDirection:'row', gap:4, marginBottom:14},
  dayDot:     {flex:1, borderWidth:1, borderRadius:8, paddingVertical:8, alignItems:'center', gap:3},
  dayLetter:  {color:C.textSec, fontSize:10, fontWeight:'700'},
  dayDotIcon: {fontSize:12},

  unsubBtn:    {borderWidth:1, borderColor:'rgba(255,107,107,0.4)', borderRadius:10, paddingVertical:9, alignItems:'center', backgroundColor:'rgba(255,107,107,0.06)'},
  unsubBtnTxt: {color:C.red, fontSize:13, fontWeight:'700'},

  browseMoreBtn: {borderWidth:1.5, borderColor:C.blue, borderRadius:12, paddingVertical:14, alignItems:'center', marginTop:4, backgroundColor:'rgba(74,158,255,0.08)'},
  browseMoreTxt: {color:C.blue, fontWeight:'700', fontSize:15},
});