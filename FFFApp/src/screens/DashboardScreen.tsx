import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { nutritionAPI, profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { workoutHistory } from '../services/workoutStorage';
import { planStorage, SubscribedPlan, getTodaySession } from '../services/planStorage';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const quote    = useDailyQuote();

  const [loading,        setLoading]        = useState(false);
  const [plan,           setPlan]           = useState<SubscribedPlan | null>(null);
  const [workoutDone,    setWorkoutDone]    = useState(false);
  const [calories,       setCalories]       = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadDay();
    }, [user?.id])
  );

  const loadDay = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [plans, history] = await Promise.all([
        planStorage.getSubscribed(),
        workoutHistory.getAll(),
      ]);

      setPlan(plans[0] ?? null);
      setWorkoutDone(history.some(h => h.completedAt.startsWith(today)));

      if (user?.id) {
        const nutritionData = await nutritionAPI.getNutrition(user.id, today).catch(() => null);
        setCalories(nutritionData?.totalCalories ?? null);
      }
    } catch {
      // keep previous values
    } finally {
      setLoading(false);
    }
  };

  const todaySession = plan ? getTodaySession(plan) : null;

  const tiles = [
    { id:1, title:'My Health',  icon:'❤️',  screen:'Health',    color:'#FF6B6B' },
    { id:2, title:'Exercise',   icon:'💪',  screen:'Exercise',  color:'#4ECDC4' },
    { id:3, title:'Nutrition',  icon:'🍎',  screen:'Nutrition', color:'#FF9F43' },
    { id:4, title:'Community',  icon:'👥',  screen:'Community', color:'#4A9EFF' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.greetingName}>{user?.username || 'Athlete'} 👋</Text>
        </View>

        {/* Daily Quote */}
        <View style={styles.verseCard}>
          <Text style={styles.verseLabel}>💬  DAILY QUOTE</Text>
          <Text style={styles.verseText}>"{quote.text}"</Text>
          <Text style={styles.verseReference}>— {quote.author}</Text>
        </View>

        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>TODAY'S SUMMARY</Text>
            <Text style={styles.summaryDate}>
              {new Date().toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#4A9EFF" style={{ paddingVertical: 20 }} />
          ) : (
            <View style={styles.actionRows}>

              {/* ── Workout row ── */}
              <TouchableOpacity
                style={[styles.actionRow, styles.actionRowBorder]}
                activeOpacity={0.75}
                onPress={() => {
                  if (workoutDone) {
                    // Completed → My Workouts > Completed tab
                    navigation.navigate('MyWorkoutsScreen', { tab: 'completed' });
                  } else {
                    // Everything else → Exercise screen
                    navigation.navigate('Exercise');
                  }
                }}
              >
                <View style={styles.actionRowLeft}>
                  <Text style={styles.actionRowEmoji}>
                    {!plan ? '💪' : todaySession ? '💪' : '💤'}
                  </Text>
                  <View style={{flex:1}}>
                    <Text style={styles.actionRowLabel}>WORKOUT</Text>
                    <Text style={styles.actionRowValue} numberOfLines={1}>
                      {workoutDone
                        ? (todaySession ?? 'Workout')
                        : !plan
                          ? 'No plan active'
                          : todaySession
                            ? todaySession
                            : 'Active rest day'}
                    </Text>
                  </View>
                </View>

                {/* Right icon */}
                {workoutDone ? (
                  // Green tick — completed
                  <View style={styles.doneCircle}>
                    <Text style={styles.doneCircleTxt}>✓</Text>
                  </View>
                ) : !plan ? (
                  // No plan — plus to go create/browse
                  <View style={styles.addCircleBlue}>
                    <Text style={styles.addCircleBlueTxt}>＋</Text>
                  </View>
                ) : todaySession ? (
                  // Plan + session today — play button
                  <View style={styles.playCircle}>
                    <Text style={styles.playCircleTxt}>▶</Text>
                  </View>
                ) : (
                  // Plan + rest day — zzz indicator
                  <View style={styles.restCircle}>
                    <Text style={styles.restCircleTxt}>💤</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Nutrition row ── */}
              <View style={[styles.actionRow, styles.actionRowBorder]}>
                <View style={styles.actionRowLeft}>
                  <Text style={styles.actionRowEmoji}>🍎</Text>
                  <View>
                    <Text style={styles.actionRowLabel}>NUTRITION</Text>
                    <Text style={styles.actionRowValue}>
                      {calories !== null ? `${calories} kcal logged` : 'Not logged yet'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.addCircle}
                  onPress={() => navigation.navigate('Nutrition')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addCircleTxt}>＋</Text>
                </TouchableOpacity>
              </View>



            </View>
          )}
        </View>

        {/* Feature Tiles */}
        <View style={styles.grid}>
          {tiles.map(tile => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tile, { borderTopColor: tile.color }]}
              onPress={() => navigation.navigate(tile.screen)}
              activeOpacity={0.7}
            >
              <Text style={styles.tileIcon}>{tile.icon}</Text>
              <Text style={styles.tileTitle}>{tile.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Charts */}
        <TouchableOpacity
          style={styles.progressCard}
          onPress={() => navigation.navigate('ProgressCharts')}
          activeOpacity={0.7}
        >
          <Text style={styles.progressIcon}>📈</Text>
          <View style={styles.progressContent}>
            <Text style={styles.progressTitle}>My Progress</Text>
            <Text style={styles.progressSubtitle}>View your weight progress, stats & more</Text>
          </View>
          <Text style={styles.progressArrow}>›</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  content:   { padding: 16, paddingBottom: 40 },

  greeting:     { marginBottom: 20, paddingTop: 8 },
  greetingText: { color: '#5a7fa8', fontSize: 14, letterSpacing: 0.5 },
  greetingName: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 2 },

  verseCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16, padding: 18, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  verseLabel:     { color: '#4A9EFF', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  verseText:      { color: '#c8d8f0', fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  verseReference: { color: '#4A9EFF', fontSize: 12, fontWeight: '600', textAlign: 'right' },

  // Summary card
  summaryCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16, marginBottom: 14,
    borderTopWidth: 3, borderTopColor: '#7B6FFF', overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
  },
  summaryTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  summaryDate:  { color: '#5a7fa8', fontSize: 12 },

  // Action rows
  actionRows: {},
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(26,58,107,0.7)' },
  actionRowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  actionRowEmoji:  { fontSize: 24, width: 30, textAlign: 'center' },
  actionRowLabel:  { color: '#5a7fa8', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 3 },
  actionRowValue:  { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Action buttons
  playCircle:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(74,158,255,0.2)', borderWidth: 1.5, borderColor: '#4A9EFF', alignItems: 'center', justifyContent: 'center' },
  playCircleTxt: { color: '#4A9EFF', fontSize: 14, marginLeft: 2 },

  doneCircle:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(38,222,129,0.15)', borderWidth: 1.5, borderColor: '#26de81', alignItems: 'center', justifyContent: 'center' },
  doneCircleTxt: { color: '#26de81', fontSize: 18, fontWeight: '800' },

  ghostCircle:    { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#1a3a6b', alignItems: 'center', justifyContent: 'center' },
  ghostCircleTxt: { color: '#5a7fa8', fontSize: 20 },

  addCircleBlue:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(74,158,255,0.15)', borderWidth: 1.5, borderColor: '#4A9EFF', alignItems: 'center', justifyContent: 'center' },
  addCircleBlueTxt: { color: '#4A9EFF', fontSize: 22, fontWeight: '300', lineHeight: 26 },

  restCircle:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(90,127,168,0.15)', borderWidth: 1, borderColor: '#5a7fa8', alignItems: 'center', justifyContent: 'center' },
  restCircleTxt: { fontSize: 18 },

  addCircle:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,159,67,0.15)', borderWidth: 1.5, borderColor: '#FF9F43', alignItems: 'center', justifyContent: 'center' },
  addCircleTxt: { color: '#FF9F43', fontSize: 22, fontWeight: '300', lineHeight: 26 },

  pencilCircle:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(74,158,255,0.1)', borderWidth: 1.5, borderColor: '#4A9EFF', alignItems: 'center', justifyContent: 'center' },
  pencilCircleTxt: { fontSize: 16 },

  // Feature tiles
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  tile: {
    width: '48%', backgroundColor: '#0d1f3c', borderRadius: 16, padding: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderTopWidth: 3, elevation: 4, minHeight: 120,
  },
  tileIcon:  { fontSize: 36, marginBottom: 10 },
  tileTitle: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  progressCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1f3c',
    borderRadius: 16, padding: 18, marginBottom: 14,
    borderTopWidth: 3, borderTopColor: '#26de81', elevation: 4,
  },
  progressIcon:     { fontSize: 28, marginRight: 14 },
  progressContent:  { flex: 1 },
  progressTitle:    { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  progressSubtitle: { color: '#5a7fa8', fontSize: 12 },
  progressArrow:    { fontSize: 32, color: '#4A9EFF' },
});