import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { nutritionAPI } from '../services/api';
import { useDailyQuote } from '../hooks/useDailyQuote';

interface DayData {
  date: string;
  dayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Weekly Nutrition Overview Screen
export const WeeklyNutritionScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const quote = useDailyQuote(); // inspirational/motivational quote hook

  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [weekTotal, setWeekTotal] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Load data once on mount
  useEffect(() => {
    loadWeeklyData();
  }, []);

  /**
   * Fetches nutrition data for the last 7 days (including today)
   * Aggregates totals and prepares display-ready data
   */
  const loadWeeklyData = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const days: DayData[] = [];
      const today = new Date();

      // Collect last 7 days (most recent first)
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });

        try {
          const nutrition = await nutritionAPI.getNutrition(user.id, dateStr);

          // Sum macros across all meals
          let totalProtein = 0,
            totalCarbs = 0,
            totalFat = 0;

          ;['breakfast', 'lunch', 'dinner', 'snacks'].forEach((meal) => {
            (nutrition[meal] || []).forEach((item: any) => {
              totalProtein += item.protein || 0;
              totalCarbs += item.carbs || 0;
              totalFat += item.fat || 0;
            });
          });

          days.push({
            date: dateStr,
            dayName,
            calories: nutrition.totalCalories || 0,
            protein: Math.round(totalProtein),
            carbs: Math.round(totalCarbs),
            fat: Math.round(totalFat),
          });
        } catch {
          // Graceful fallback when data is missing for a day
          days.push({
            date: dateStr,
            dayName,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          });
        }
      }

      // Reverse so today is first (index 0)
      const orderedDays = days.reverse();
      setWeekData(orderedDays);

      // Calculate weekly totals
      const totals = orderedDays.reduce(
        (acc, day) => ({
          calories: acc.calories + day.calories,
          protein: acc.protein + day.protein,
          carbs: acc.carbs + day.carbs,
          fat: acc.fat + day.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      setWeekTotal(totals);
    } catch (error) {
      console.error('Load weekly data error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A9EFF" />
        <Text style={styles.loadingText}>Loading weekly data...</Text>
      </View>
    );
  }

  const today = weekData[0];
  const avgCalories = Math.round(weekTotal.calories / 7);
  const maxCalories = Math.max(...weekData.map((d) => d.calories), 1);

  const macros = [
    {
      label: 'Protein',
      value: weekTotal.protein,
      color: '#4A9EFF',
      pct: Math.round((weekTotal.protein * 4 / (weekTotal.calories || 1)) * 100),
    },
    {
      label: 'Carbs',
      value: weekTotal.carbs,
      color: '#4A9EFF',
      pct: Math.round((weekTotal.carbs * 4 / (weekTotal.calories || 1)) * 100),
    },
    {
      label: 'Fat',
      value: weekTotal.fat,
      color: '#4A9EFF',
      pct: Math.round((weekTotal.fat * 9 / (weekTotal.calories || 1)) * 100),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>WEEKLY NUTRITION</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly Macros Overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>WEEKLY MACROS</Text>

          {/* Quick macro tiles */}
          <View style={styles.macroTotals}>
            {macros.map((m) => (
              <View key={m.label} style={styles.macroTile}>
                <Text style={styles.macroTileValue}>{m.value}g</Text>
                <Text style={styles.macroTileLabel}>{m.label}</Text>
                <Text style={styles.macroTilePct}>{m.pct}%</Text>
              </View>
            ))}
          </View>

          {/* Macro progress bars */}
          {macros.map((m) => (
            <View key={m.label} style={styles.macroBarRow}>
              <Text style={styles.macroBarLabel}>{m.label}</Text>
              <View style={styles.macroBarTrack}>
                <View
                  style={[
                    styles.macroBarFill,
                    { width: `${Math.min(m.pct, 100)}%`, backgroundColor: m.color },
                  ]}
                />
              </View>
              <Text style={styles.macroBarValue}>{m.value}g</Text>
            </View>
          ))}
        </View>

        {/* Today's summary card */}
        {today && (
          <View style={[styles.card, { borderTopColor: '#4A9EFF' }]}>
            <Text style={styles.cardTitle}>TODAY'S BREAKDOWN</Text>
            <View style={styles.todayGrid}>
              {[
                { label: 'Calories', value: `${today.calories}`, color: '#4A9EFF' },
                { label: 'Protein', value: `${today.protein}g`, color: '#4A9EFF' },
                { label: 'Carbs', value: `${today.carbs}g`, color: '#4A9EFF' },
                { label: 'Fat', value: `${today.fat}g`, color: '#4A9EFF' },
              ].map((item) => (
                <View key={item.label} style={styles.todayTile}>
                  <Text style={[styles.todayValue, { color: item.color }]}>
                    {item.value}
                  </Text>
                  <Text style={styles.todayLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 7-day list — today always visible, others collapsible */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DAILY BREAKDOWN</Text>

          {weekData.map((day, i) => {
            const isToday = i === 0;
            const isExpanded = expandedDay === i;
            const dateLabel = new Date(day.date).toLocaleDateString('en-GB', {
              month: 'short',
              day: 'numeric',
            });

            if (isToday) {
              return (
                <View key={i} style={[styles.dayRow, styles.dayRowToday]}>
                  <View style={styles.dayLeft}>
                    <Text style={styles.dayNameToday}>{day.dayName} · Today</Text>
                    <Text style={styles.dayDate}>{dateLabel}</Text>
                  </View>
                  <View style={styles.dayStats}>
                    <Text style={styles.dayStat}>{day.calories} cal</Text>
                    <Text style={styles.dayMacro}>P {day.protein}g</Text>
                    <Text style={styles.dayMacro}>C {day.carbs}g</Text>
                    <Text style={styles.dayMacro}>F {day.fat}g</Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={i}>
                <TouchableOpacity
                  style={styles.dayRow}
                  onPress={() => setExpandedDay(isExpanded ? null : i)}
                >
                  <View style={styles.dayLeft}>
                    <Text style={styles.dayName}>{day.dayName}</Text>
                    <Text style={styles.dayDate}>{dateLabel}</Text>
                  </View>
                  <View style={styles.dayRight}>
                    <Text style={styles.dayCals}>{day.calories} cal</Text>
                    <Text style={styles.dayArrow}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.dayExpanded}>
                    {[
                      { label: 'Protein', value: `${day.protein}g` },
                      { label: 'Carbs', value: `${day.carbs}g` },
                      { label: 'Fat', value: `${day.fat}g` },
                    ].map((m) => (
                      <View key={m.label} style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>{m.label}</Text>
                        <Text style={styles.expandedValue}>{m.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Simple bar chart — daily calories */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DAILY CALORIES</Text>
          <View style={styles.chart}>
            {weekData.map((day, i) => {
              const barHeight = Math.max((day.calories / maxCalories) * 120, day.calories > 0 ? 8 : 0);
              const isToday = i === 0;

              return (
                <View key={i} style={styles.barWrap}>
                  <Text style={styles.barVal}>{day.calories > 0 ? day.calories : ''}</Text>
                  <View
                    style={[
                      styles.bar,
                      { height: barHeight, backgroundColor: isToday ? '#4A9EFF' : '#1a3a6b' },
                    ]}
                  />
                  <Text style={[styles.barDay, isToday && { color: '#4A9EFF' }]}>
                    {day.dayName}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary statistics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TOTALS & AVERAGES</Text>
          <View style={styles.summaryGrid}>
            {[
              { label: 'Total kcal\nConsumed', value: weekTotal.calories.toLocaleString(), icon: '🔥' },
              { label: 'Daily\nAverage', value: avgCalories.toLocaleString(), icon: '📊' },
              { label: 'Total\nProtein', value: `${weekTotal.protein}g`, icon: '💪' },
              {
                label: 'Days\nLogged',
                value: weekData.filter((d) => d.calories > 0).length.toString(),
                icon: '📅',
              },
            ].map((item) => (
              <View key={item.label} style={styles.summaryTile}>
                <Text style={styles.summaryIcon}>{item.icon}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Motivational / faith-based quote card */}
        <View style={styles.faithCard}>
          <Text style={styles.faithIcon}>🙏</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.faithText}>"{quote.text}"</Text>
            <Text style={styles.faithRef}>— {quote.author}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1628' },
  loadingText: { color: '#8ab4f8', marginTop: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  backBtn: { width: 60 },
  backText: { color: '#4A9EFF', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2 },

  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderTopWidth: 3, borderTopColor: '#4A9EFF', elevation: 4,
  },
  cardTitle: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 16 },

  // Weekly Macros
  macroTotals: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  macroTile: { flex: 1, alignItems: 'center' },
  macroTileValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  macroTileLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', marginTop: 2 },
  macroTilePct: { color: '#4A9EFF', fontSize: 11, fontWeight: '700', marginTop: 2 },

  macroBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  macroBarLabel: { color: '#5a7fa8', fontSize: 12, fontWeight: '700', width: 55 },
  macroBarTrack: { flex: 1, height: 8, backgroundColor: '#1a3a6b', borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  macroBarFill: { height: '100%', borderRadius: 4 },
  macroBarValue: { color: '#fff', fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right' },

  // Today
  todayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  todayTile: { width: '47%', backgroundColor: '#0a1628', borderRadius: 12, padding: 14, alignItems: 'center' },
  todayValue: { fontSize: 22, fontWeight: '800' },
  todayLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

  // Daily Breakdown
  dayRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  dayRowToday: { backgroundColor: '#0a1628', borderRadius: 12, padding: 12, marginBottom: 4 },
  dayLeft: {},
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayName: { color: '#8ab4f8', fontSize: 14, fontWeight: '700' },
  dayNameToday: { color: '#4A9EFF', fontSize: 14, fontWeight: '800' },
  dayDate: { color: '#2a4a7f', fontSize: 11, marginTop: 2 },
  dayCals: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dayArrow: { color: '#4A9EFF', fontSize: 12 },
  dayStats: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dayStat: { color: '#fff', fontSize: 13, fontWeight: '800' },
  dayMacro: { color: '#5a7fa8', fontSize: 11, fontWeight: '600' },

  dayExpanded: { backgroundColor: '#0a1628', borderRadius: 10, padding: 12, marginBottom: 4 },
  expandedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  expandedLabel: { color: '#5a7fa8', fontSize: 13, fontWeight: '600' },
  expandedValue: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Chart
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { color: '#5a7fa8', fontSize: 9, fontWeight: '600', marginBottom: 4 },
  bar: { width: '70%', borderRadius: 4, minHeight: 4 },
  barDay: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', marginTop: 6 },

  // Totals
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryTile: { width: '47%', backgroundColor: '#0a1628', borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryIcon: { fontSize: 24, marginBottom: 6 },
  summaryValue: { color: '#4A9EFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },

  // Faith
  faithCard: {
    flexDirection: 'row', backgroundColor: '#0d1f3c',
    borderRadius: 16, padding: 18,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  faithIcon: { fontSize: 28, marginRight: 14 },
  faithText: { color: '#c8d8f0', fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  faithRef: { color: '#4A9EFF', fontSize: 12, fontWeight: '600', textAlign: 'right' },
});