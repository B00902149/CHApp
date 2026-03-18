// src/screens/NutritionGoalsScreen.tsx
// MFP-style goals screen:
//   • User sets a calorie target
//   • Each macro has a % that can be stepped up/down
//   • Percentages must always sum to 100% — adjusting one redistributes the others
//   • Grams and kcal are derived automatically (never typed manually)
//   • Goals persist in AsyncStorage

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Shared types + storage helpers (imported by NutritionScreen) ─────────────

export const GOALS_STORAGE_KEY = '@nutrition_goals';

export type NutritionGoals = {
  calories: number;
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
};

export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein:  150,
  carbs:    200,
  fat:       67,
};

export const loadNutritionGoals = async (): Promise<NutritionGoals> => {
  try {
    const saved = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    if (saved) return { ...DEFAULT_GOALS, ...JSON.parse(saved) };
  } catch (_) {}
  return DEFAULT_GOALS;
};

export const saveNutritionGoals = async (goals: NutritionGoals): Promise<void> => {
  await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;
type MacroKey = 'protein' | 'carbs' | 'fat';

const gramsFromPct = (calories: number, pct: number, macro: MacroKey): number =>
  Math.round((calories * (pct / 100)) / KCAL_PER_GRAM[macro]);

const pctFromGoals = (goals: NutritionGoals) => {
  const total = goals.calories || 1;
  const proteinPct = Math.round((goals.protein * KCAL_PER_GRAM.protein / total) * 100);
  const fatPct     = Math.round((goals.fat     * KCAL_PER_GRAM.fat     / total) * 100);
  const carbsPct   = 100 - proteinPct - fatPct;
  return { protein: proteinPct, carbs: Math.max(0, carbsPct), fat: fatPct };
};

const MACROS: { key: MacroKey; label: string; icon: string; color: string }[] = [
  { key: 'carbs',   label: 'Carbs', icon: '🥣', color: '#4ECDC4' },
  { key: 'protein', label: 'Protein',       icon: '🍗', color: '#4A9EFF' },
  { key: 'fat',     label: 'Fat',           icon: '🥑', color: '#7B6FFF' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export const NutritionGoalsScreen = ({ navigation }: any) => {
  const [calorieInput, setCalorieInput] = useState(String(DEFAULT_GOALS.calories));
  const [pct, setPct] = useState({ protein: 30, carbs: 40, fat: 30 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNutritionGoals().then((saved) => {
      setCalorieInput(String(saved.calories));
      setPct(pctFromGoals(saved));
    });
  }, []);

  const calories = Math.max(0, Number(calorieInput) || 0);

  const grams = {
    protein: gramsFromPct(calories, pct.protein, 'protein'),
    carbs:   gramsFromPct(calories, pct.carbs,   'carbs'),
    fat:     gramsFromPct(calories, pct.fat,      'fat'),
  };

  const kcal = {
    protein: grams.protein * KCAL_PER_GRAM.protein,
    carbs:   grams.carbs   * KCAL_PER_GRAM.carbs,
    fat:     grams.fat     * KCAL_PER_GRAM.fat,
  };

  const pctTotal = pct.protein + pct.carbs + pct.fat;

  const stepPct = (key: MacroKey, delta: number) => {
    const newVal = Math.min(100, Math.max(0, pct[key] + delta));
    const diff   = newVal - pct[key];
    if (diff === 0) return;

    const others     = (['protein', 'carbs', 'fat'] as const).filter(k => k !== key);
    const totalOther = others.reduce((s, k) => s + pct[k], 0);
    if (totalOther === 0) return;

    const newPct = { ...pct, [key]: newVal };

    // Distribute the compensating change proportionally across the other two
    others.forEach((k, i) => {
      if (i === others.length - 1) {
        // Last one takes the remainder to guarantee exact 100%
        const soFar = others.slice(0, i).reduce((s, ok) => s + newPct[ok], 0);
        newPct[k] = Math.max(0, 100 - newVal - soFar);
      } else {
        const share = pct[k] / totalOther;
        newPct[k] = Math.max(0, Math.round(pct[k] - diff * share));
      }
    });

    // Correct any remaining rounding drift by nudging carbs
    const sum = newPct.protein + newPct.carbs + newPct.fat;
    if (sum !== 100) newPct.carbs = Math.max(0, newPct.carbs + (100 - sum));

    setPct({ protein: newPct.protein, carbs: newPct.carbs, fat: newPct.fat });
  };

  const handleSave = async () => {
    const cal = Number(calorieInput);
    if (isNaN(cal) || cal < 500 || cal > 10000) {
      Alert.alert('Invalid Calories', 'Please enter a value between 500 and 10,000 kcal.');
      return;
    }
    if (pctTotal !== 100) {
      Alert.alert('Percentages must sum to 100%', `Currently at ${pctTotal}%.`);
      return;
    }
    try {
      setSaving(true);
      await saveNutritionGoals({ calories: Math.round(cal), ...grams });
      Alert.alert('Saved! 🎯', 'Your nutrition goals have been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (_) {
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset to Defaults', 'Reset all goals to default values?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive', onPress: () => {
          setCalorieInput(String(DEFAULT_GOALS.calories));
          setPct({ protein: 30, carbs: 40, fat: 30 });
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>CALORIE & MACRO GOALS</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Calorie target ── */}
          <Text style={styles.sectionTitle}>Default Goal</Text>
          <View style={styles.card}>
            <View style={styles.simpleRow}>
              <Text style={styles.rowLabel}>Calories</Text>
              <TextInput
                style={styles.calorieInput}
                value={calorieInput}
                onChangeText={setCalorieInput}
                keyboardType="numeric"
                selectTextOnFocus
                maxLength={5}
              />
            </View>
          </View>

          {/* ── Macro % rows ── */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Macros</Text>
          <View style={styles.card}>
            {MACROS.map((macro, idx) => (
              <View key={macro.key}>
                <View style={styles.macroRow}>

                  {/* Label + grams */}
                  <View style={styles.macroLeft}>
                    <Text style={styles.macroIcon}>{macro.icon}</Text>
                    <View>
                      <Text style={styles.macroLabel}>{macro.label}</Text>
                      <Text style={styles.macroGrams}>{grams[macro.key]}g</Text>
                    </View>
                  </View>

                  {/* % stepper */}
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepPct(macro.key, -1)}>
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.pctValue, { color: macro.color }]}>
                      {pct[macro.key]}%
                    </Text>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepPct(macro.key, 1)}>
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* kcal */}
                  <Text style={[styles.macroKcal, { color: macro.color }]}>
                    {kcal[macro.key]} kcal
                  </Text>
                </View>
                {idx < MACROS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          {/* ── % total ── */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { color: pctTotal === 100 ? '#26de81' : '#FF6B6B' }]}>
              {pctTotal}%{pctTotal !== 100
                ? `  (${pctTotal > 100 ? '+' : ''}${pctTotal - 100} to fix)`
                : '  ✓'}
            </Text>
          </View>

          {/* ── Save ── */}
          <TouchableOpacity
            style={[styles.saveButton, (saving || pctTotal !== 100) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || pctTotal !== 100}
          >
            <Text style={styles.saveText}>{saving ? 'Saving...' : '💾  Save Goals'}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

export default NutritionGoalsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  backBtn: { width: 60 },
  backText: { color: '#4A9EFF', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  resetBtn: { width: 60, alignItems: 'flex-end' },
  resetText: { color: '#FF6B6B', fontSize: 14, fontWeight: '600' },

  content: { padding: 20 },

  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 10 },

  card: { backgroundColor: '#0d1f3c', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 4 },

  simpleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  rowLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  calorieInput: {
    color: '#4A9EFF', fontSize: 20, fontWeight: '800',
    textAlign: 'right', minWidth: 80,
  },

  macroRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  macroLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  macroIcon: { fontSize: 20, marginRight: 10 },
  macroLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  macroGrams: { color: '#5a7fa8', fontSize: 12, marginTop: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#1a3a6b', alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: '#4A9EFF', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  pctValue: { fontSize: 16, fontWeight: '800', width: 46, textAlign: 'center' },

  macroKcal: { fontSize: 12, fontWeight: '700', width: 64, textAlign: 'right' },

  divider: { height: 1, backgroundColor: '#1a3a6b' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18,
    backgroundColor: '#0d1f3c', borderRadius: 14, marginTop: 2, marginBottom: 24,
  },
  totalLabel: { color: '#5a7fa8', fontSize: 14, fontWeight: '700' },
  totalValue: { fontSize: 15, fontWeight: '800' },

  saveButton: { backgroundColor: '#4A9EFF', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});