import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { nutritionAPI, profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDailyQuote } from '../hooks/useDailyQuote';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const quote = useDailyQuote(); // pulls today's inspirational quote (cached per day)

  const [loading, setLoading] = useState(false);
  // Aggregated stats shown in the Today's Summary card
  const [todaySummary, setTodaySummary] = useState({ workouts: 0, calories: 0, posts: 0 });

  // Load summary data on first render
  useEffect(() => {
    loadTodaySummary();
  }, []);

  // Fetches today's nutrition and overall profile stats in parallel
  const loadTodaySummary = async () => {
    try {
      if (!user?.id) return;
      setLoading(true);
      const today = new Date().toISOString().split('T')[0]; // format: YYYY-MM-DD

      // Run both API calls simultaneously to avoid sequential waiting
      const [nutritionData, statsData] = await Promise.all([
        nutritionAPI.getNutrition(user.id, today).catch(() => null), // null if no log exists for today
        profileAPI.getStats(user.id).catch(() => null)
      ]);

      setTodaySummary({
        workouts: statsData?.workoutCount || 0,
        calories: nutritionData?.totalCalories || 0,
        posts:    statsData?.postCount || 0
      });
    } catch (error) {} finally { setLoading(false); }
  };

  // Navigation tiles for the four main feature areas
  const tiles = [
    { id: 1, title: 'My Health',  icon: '❤️',  screen: 'Health',    color: '#FF6B6B' },
    { id: 2, title: 'Exercise',   icon: '💪',  screen: 'Exercise',  color: '#4ECDC4' },
    { id: 3, title: 'Nutrition',  icon: '🍎',  screen: 'Nutrition', color: '#FF9F43' },
    { id: 4, title: 'Community',  icon: '👥',  screen: 'Community', color: '#4A9EFF' },
  ];

  // Stats displayed in the Today's Summary card — each is tappable and navigates to its screen
  const summaryItems = [
    { value: todaySummary.workouts, label: 'Workouts', screen: 'Exercise',  color: '#4ECDC4' },
    { value: todaySummary.calories, label: 'Calories', screen: 'Nutrition', color: '#FF9F43' },
    { value: todaySummary.posts,    label: 'Posts',    screen: 'Community', color: '#4A9EFF' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Personalised Greeting ── */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Welcome back,</Text>
          {/* Falls back to 'Athlete' if username isn't loaded yet */}
          <Text style={styles.greetingName}>{user?.username || 'Athlete'} 👋</Text>
        </View>

        {/* ── Daily Quote Card ── */}
        <View style={styles.verseCard}>
          <Text style={styles.verseLabel}>💬  DAILY QUOTE</Text>
          <Text style={styles.verseText}>"{quote.text}"</Text>
          <Text style={styles.verseReference}>— {quote.author}</Text>
        </View>

        {/* ── Today's Summary Card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>TODAY'S SUMMARY</Text>
            {/* Displays today's date in short format, e.g. "Mon 3 Mar" */}
            <Text style={styles.summaryDate}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          {/* Show spinner while data loads, then render the stats grid */}
          {loading ? (
            <ActivityIndicator size="small" color="#4A9EFF" style={{ paddingVertical: 16 }} />
          ) : (
            <View style={styles.summaryGrid}>
              {summaryItems.map((item, i) => (
                <React.Fragment key={item.label}>
                  {/* Each stat navigates to its related screen when tapped */}
                  <TouchableOpacity
                    style={styles.summaryItem}
                    onPress={() => navigation.navigate(item.screen)}
                  >
                    <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                  </TouchableOpacity>
                  {/* Vertical divider between stats, skipped after the last item */}
                  {i < summaryItems.length - 1 && <View style={styles.summaryDivider} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {/* ── Main Feature Tiles (2-column grid) ── */}
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tile, { borderTopColor: tile.color }]} // each tile has its own accent colour
              onPress={() => navigation.navigate(tile.screen)}
              activeOpacity={0.7}
            >
              <Text style={styles.tileIcon}>{tile.icon}</Text>
              <Text style={styles.tileTitle}>{tile.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Progress Charts Banner ── */}
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
  content: { padding: 16, paddingBottom: 40 },

  greeting: { marginBottom: 20, paddingTop: 8 },
  greetingText: { color: '#5a7fa8', fontSize: 14, letterSpacing: 0.5 },
  greetingName: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 2 },

  verseCard: {
    backgroundColor: '#0d1f3c',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#4A9EFF',
  },
  verseLabel: { color: '#4A9EFF', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  verseText: { color: '#c8d8f0', fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  verseReference: { color: '#4A9EFF', fontSize: 12, fontWeight: '600', textAlign: 'right' },

  summaryCard: {
    backgroundColor: '#0d1f3c',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderTopWidth: 3,
    borderTopColor: '#7B6FFF',
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  summaryDate: { color: '#5a7fa8', fontSize: 12 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#1a3a6b' },

  // 2-column tile grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  tile: {
    width: '48%',
    backgroundColor: '#0d1f3c',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderTopWidth: 3,
    elevation: 4,
    minHeight: 120,
  },
  tileIcon: { fontSize: 36, marginBottom: 10 },
  tileTitle: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  // Progress Charts banner card
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1f3c',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderTopWidth: 3,
    borderTopColor: '#26de81',
    elevation: 4,
  },
  progressIcon: { fontSize: 28, marginRight: 14 },
  progressContent: { flex: 1 },
  progressTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  progressSubtitle: { color: '#5a7fa8', fontSize: 12 },
  progressArrow: { fontSize: 32, color: '#4A9EFF' },

  // Unused quote card styles (kept for reference / future use)
  quoteCard: {
    backgroundColor: '#0d1f3c',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: '#FFD700',
  },
  quoteIcon: { fontSize: 24, marginBottom: 12 },
  quote: {
    color: '#c8d8f0',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  quoteDots: { flexDirection: 'row', gap: 6 },
  quoteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1a3a6b' },
  quoteDotActive: { backgroundColor: '#FFD700', width: 20 },
});