import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { nutritionAPI } from '../services/api';
import { useDailyQuote } from '../hooks/useDailyQuote';

// Shape of an individual logged food item
interface FoodItem {
  _id?: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// Shape of a meal section (breakfast, lunch, dinner, snacks)
interface Meal {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  items: FoodItem[];
  color: string;
  icon: string;
}

export const NutritionScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const quote = useDailyQuote();

  const [currentDate, setCurrentDate]     = useState(new Date()); // date shown in the date navigator
  const [nutritionData, setNutritionData] = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false); // pull-to-refresh spinner state

  // Reload nutrition data whenever the selected date changes
  useEffect(() => { loadNutritionData(); }, [currentDate]);

  // Fetches the nutrition log for the currently selected date
  const loadNutritionData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const data = await nutritionAPI.getNutrition(user.id, dateString);
      setNutritionData(data);
    } catch (error: any) {
      Alert.alert('Error', error.error || error.message || 'Failed to load nutrition data');
    } finally {
      setLoading(false);
      setRefreshing(false); // reset pull-to-refresh spinner
    }
  };

  // Moves the selected date forward or backward by the given number of days
  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  // Returns "Today", "Yesterday", "Tomorrow", or a short date string
  const formatDate = (date: Date) => {
    const today     = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const isSame = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    if (isSame(date, today))     return 'Today';
    if (isSame(date, yesterday)) return 'Yesterday';
    if (isSame(date, tomorrow))  return 'Tomorrow';
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Prompts for confirmation then removes a food item from the given meal
  const handleRemoveFood = async (mealType: string, foodId: string) => {
    if (!user?.id) return;
    Alert.alert('Remove Food', 'Remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const dateString = currentDate.toISOString().split('T')[0];
            const updatedData = await nutritionAPI.removeFood(user.id, dateString, mealType, foodId);
            setNutritionData(updatedData); // update UI with the server response
          } catch { Alert.alert('Error', 'Failed to remove food item'); }
        }
      }
    ]);
  };

  // Opens the AddFood screen and passes a callback to add the returned food item to this screen
  const openAddFood = (mealType: string) => {
    navigation.navigate('AddFood', {
      mealType,
      onFoodAdded: async (mealType: string, foodItem: FoodItem) => {
        if (!user?.id) return;
        try {
          const dateString = currentDate.toISOString().split('T')[0];
          const updatedData = await nutritionAPI.addFood(user.id, dateString, mealType, foodItem);
          setNutritionData(updatedData); // update UI immediately with the server response
        } catch { Alert.alert('Error', 'Failed to add food item'); }
      }
    });
  };

  // Full-screen loader shown only on the very first load (before any data is available)
  if (loading && !nutritionData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9F43" />
        <Text style={styles.loadingText}>Loading nutrition...</Text>
      </View>
    );
  }

  // Derived values for the calorie summary card
  const totalCalories = nutritionData?.totalCalories || 0;
  const calorieGoal   = nutritionData?.calorieGoal   || 2000; // default goal if not set in profile
  const progress      = Math.min((totalCalories / calorieGoal) * 100, 100); // capped at 100%
  const overGoal      = totalCalories > calorieGoal; // drives red vs green colour throughout

  // Meal sections — items fall back to empty array if not yet logged for this date
  const meals: Meal[] = [
    { name: 'Breakfast', type: 'breakfast', items: nutritionData?.breakfast || [], color: '#4A9EFF', icon: '🌅' },
    { name: 'Lunch',     type: 'lunch',     items: nutritionData?.lunch     || [], color: '#4A9EFF', icon: '☀️' },
    { name: 'Dinner',    type: 'dinner',    items: nutritionData?.dinner    || [], color: '#4A9EFF', icon: '🌙' },
    { name: 'Snacks',    type: 'snacks',    items: nutritionData?.snacks    || [], color: '#4A9EFF', icon: '🍎' },
  ];

  return (
    <View style={styles.container}>

      {/* ── Header: Back / Title / Weekly Stats ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>NUTRITION</Text>
        <TouchableOpacity
          style={styles.statsBtn}
          onPress={() => navigation.navigate('WeeklyNutrition')}
        >
          <Text style={styles.statsBtnText}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* ── Date Navigator: ‹ Date Label › ── */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Pull-to-refresh reloads the current day's nutrition data
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadNutritionData(); }}
            tintColor="#FF9F43"
            colors={['#FF9F43']}
          />
        }
      >

        {/* ── Calorie Summary Card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.sectionLabel}>CALORIES</Text>
              <View style={styles.calorieDisplay}>
                {/* Number turns red when over goal, green when under */}
                <Text style={[styles.calorieNumber, { color: overGoal ? '#FF6B6B' : '#26de81' }]}>
                  {totalCalories}
                </Text>
                <Text style={styles.calorieGoal}>/ {calorieGoal}</Text>
              </View>
            </View>
            {/* Right side shows remaining or exceeded amount */}
            <View style={styles.calorieMeta}>
              <Text style={[styles.remainingValue, { color: overGoal ? '#FF6B6B' : '#26de81' }]}>
                {overGoal ? '+' : ''}{Math.abs(calorieGoal - totalCalories)}
              </Text>
              <Text style={styles.remainingLabel}>{overGoal ? 'over' : 'left'}</Text>
            </View>
          </View>

          {/* Progress bar — turns red when over goal; capped at 100% visually */}
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: overGoal ? '#FF6B6B' : '#4A9EFF' }
            ]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(progress)}% of daily goal</Text>
        </View>

        {/* ── Macro Summary Card (Protein / Carbs / Fat) ── */}
        <View style={styles.macroCard}>
          {[
            { label: 'Protein', value: nutritionData?.totalProtein || 0, unit: 'g', color: '#FFFFFF' },
            { label: 'Carbs',   value: nutritionData?.totalCarbs   || 0, unit: 'g', color: '#FFFFFF' },
            { label: 'Fat',     value: nutritionData?.totalFat     || 0, unit: 'g', color: '#FFFFFF' },
          ].map(macro => (
            <View key={macro.label} style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: macro.color }]}>{macro.value}{macro.unit}</Text>
              <Text style={styles.macroLabel}>{macro.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Meal Cards ── */}
        {meals.map((meal) => {
          // Sum calories across all items in this meal
          const mealCals = meal.items.reduce((sum, item) => sum + item.calories, 0);

          return (
            <View key={meal.type} style={[styles.mealCard, { borderTopColor: meal.color }]}>

              {/* Meal header: icon + name + calorie total + add button */}
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealIcon}>{meal.icon}</Text>
                  <View>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={[styles.mealCals, { color: meal.color }]}>{mealCals} cal</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: meal.color }]}
                  onPress={() => openAddFood(meal.type)}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Food item rows — tapping a row triggers the remove confirmation */}
              {meal.items.length > 0 ? (
                meal.items.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.foodRow}
                    onPress={() => handleRemoveFood(meal.type, item._id!)}
                  >
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      {/* Macro line only shown if at least one macro value exists */}
                      {(item.protein || item.carbs || item.fat) && (
                        <Text style={styles.foodMacros}>
                          P: {item.protein || 0}g · C: {item.carbs || 0}g · F: {item.fat || 0}g
                        </Text>
                      )}
                    </View>
                    <Text style={styles.foodCals}>{item.calories} cal</Text>
                  </TouchableOpacity>
                ))
              ) : (
                // Placeholder shown when no food has been logged for this meal
                <Text style={styles.emptyText}>Tap + to add food</Text>
              )}
            </View>
          );
        })}

        {/* ── Daily Inspiration Quote ── */}
        <View style={styles.faithCard}>
          <Text style={styles.faithIcon}>🙏</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.faithTitle}>Daily Inspiration</Text>
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
  title: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  statsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#4A9EFF', alignItems: 'center', justifyContent: 'center',
  },
  statsBtnText: { fontSize: 20 },

  // Date navigation bar
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0d1f3c', paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  dateArrow: { padding: 8 },
  dateArrowText: { color: '#4A9EFF', fontSize: 28, fontWeight: '300' },
  dateText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  content: { padding: 16, paddingBottom: 40 },

  // Calorie summary card
  summaryCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderTopWidth: 3, borderTopColor: '#4A9EFF', elevation: 4,
  },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  sectionLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  calorieDisplay: { flexDirection: 'row', alignItems: 'baseline' },
  calorieNumber: { fontSize: 42, fontWeight: '800' },
  calorieGoal: { color: '#5a7fa8', fontSize: 18, marginLeft: 6 },
  calorieMeta: { alignItems: 'flex-end' },
  remainingValue: { fontSize: 24, fontWeight: '800' },
  remainingLabel: { color: '#5a7fa8', fontSize: 12, fontWeight: '600' },
  progressTrack: {
    height: 8, backgroundColor: '#1a3a6b',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct: { color: '#5a7fa8', fontSize: 12, fontWeight: '600' },

  // Macro summary card
  macroCard: {
    flexDirection: 'row', backgroundColor: '#0d1f3c',
    borderRadius: 16, padding: 18, marginBottom: 14,
    justifyContent: 'space-around', elevation: 4,
  },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 22, fontWeight: '800' },
  macroLabel: { color: '#4A9EFF', fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

  // Meal cards
  mealCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderTopWidth: 3, elevation: 4,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center' },
  mealIcon: { fontSize: 24, marginRight: 12 },
  mealName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  mealCals: { fontSize: 12, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },

  // Food item rows
  foodRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  foodInfo: { flex: 1, marginRight: 12 },
  foodName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  foodMacros: { color: '#5a7fa8', fontSize: 11, marginTop: 2 },
  foodCals: { color: '#4A9EFF', fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#2a4a7f', fontStyle: 'italic', fontSize: 13, paddingVertical: 8 },

  // Daily quote card
  faithCard: {
    flexDirection: 'row', backgroundColor: '#0d1f3c',
    borderRadius: 16, padding: 18,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  faithIcon: { fontSize: 28, marginRight: 14 },
  faithTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  faithText: { color: '#c8d8f0', fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  faithRef: { color: '#4A9EFF', fontSize: 12, fontWeight: '600', textAlign: 'right' },
});