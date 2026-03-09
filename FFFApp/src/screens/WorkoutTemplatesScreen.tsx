import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { workoutAPI } from '../services/api';
import { useDailyQuote } from '../hooks/useDailyQuote';

// ────────────────────────────────────────────────
// Workout Templates Screen
// Displays user-saved workout templates with options to use or delete
// ────────────────────────────────────────────────

export const WorkoutTemplatesScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const quote = useDailyQuote(); // motivational quote shown at bottom

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load templates once on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  /**
   * Fetches all saved workout templates for the current user
   */
  const loadTemplates = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const data = await workoutAPI.getTemplates(user.id);
      setTemplates(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirms and starts a new workout session from the selected template
   */
  const handleUseTemplate = async (templateId: string, templateName: string) => {
    Alert.alert('Use Template', `Start a workout using "${templateName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Workout',
        onPress: async () => {
          try {
            const workout = await workoutAPI.createFromTemplate(templateId);
            navigation.navigate('ExerciseProgress', {
              workout,
              onComplete: () => loadTemplates(), // refresh list after completion
            });
          } catch {
            Alert.alert('Error', 'Failed to create workout from template');
          }
        },
      },
    ]);
  };

  /**
   * Confirms and permanently deletes the selected template
   */
  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    Alert.alert(
      'Delete Template',
      `Delete "${templateName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workoutAPI.deleteTemplate(templateId);
              loadTemplates(); // refresh list
            } catch {
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A9EFF" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>TEMPLATES</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick explanation card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>How Templates Work</Text>
            <Text style={styles.infoText}>
              Save your favourite workouts as templates to reuse anytime. After completing a workout, save it from the completion screen.
            </Text>
          </View>
        </View>

        {/* No templates → empty state with call-to-action */}
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptyText}>
              Complete a workout and save it as a template to get started!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.emptyBtnText}>→ Browse Workouts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* List of saved templates */
          templates.map((template, idx) => {
            // Calculate total number of sets across all exercises
            const totalSets = template.exercises.reduce(
              (t: number, ex: any) => t + ex.sets.length,
              0
            );

            // Cycle through accent colors for visual distinction
            const colors = ['#4A9EFF', '#4ECDC4', '#7B6FFF', '#FF9F43', '#26de81', '#FF6B6B'];
            const accent = colors[idx % colors.length];

            return (
              <View
                key={template._id}
                style={[styles.templateCard, { borderTopColor: accent }]}
              >
                {/* Template header with name, icon, stats */}
                <View style={styles.templateHeader}>
                  <View style={[styles.templateIconBadge, { backgroundColor: accent + '22' }]}>
                    <Text style={styles.templateEmoji}>💪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.templateName}>{template.templateName}</Text>
                    <Text style={styles.templateSubtitle}>{template.title}</Text>
                    <View style={styles.templateMeta}>
                      <Text style={[styles.metaBadge, { color: accent }]}>
                        {template.exercises.length} exercises
                      </Text>
                      <Text style={[styles.metaBadge, { color: accent }]}>
                        {totalSets} sets
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Preview of first 3 exercises */}
                <View style={styles.exercisesList}>
                  {template.exercises.slice(0, 3).map((exercise: any, i: number) => (
                    <View key={i} style={styles.exerciseRow}>
                      <Text style={[styles.exerciseDot, { color: accent }]}>·</Text>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseSets}>
                        {exercise.sets.length} × {exercise.sets[0]?.reps || 0} reps
                      </Text>
                    </View>
                  ))}
                  {template.exercises.length > 3 && (
                    <Text style={styles.moreText}>
                      +{template.exercises.length - 3} more exercise
                      {template.exercises.length - 3 !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>

                {/* Primary actions: Use or Delete */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.useBtn, { backgroundColor: accent }]}
                    onPress={() => handleUseTemplate(template._id, template.templateName)}
                  >
                    <Text style={styles.useBtnText}>▶  Use Template</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteTemplate(template._id, template.templateName)}
                  >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Motivational / faith-based quote at bottom */}
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

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1628',
  },
  loadingText: { color: '#8ab4f8', marginTop: 12 },
header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  backBtn: { width: 60 },
  backText: { color: '#4A9EFF', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 2 },

  content: { padding: 16 },

  // Info
  infoCard: {
    flexDirection: 'row', backgroundColor: '#0d1f3c',
    borderRadius: 16, padding: 18, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  infoIcon: { fontSize: 24, marginRight: 14 },
  infoTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  infoText: { color: '#8ab4f8', fontSize: 13, lineHeight: 20 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: '#5a7fa8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#0d1f3c', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: '#4A9EFF',
  },
  emptyBtnText: { color: '#4A9EFF', fontSize: 15, fontWeight: '700' },

  // Template Card
  templateCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderTopWidth: 3, elevation: 4,
  },
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  templateIconBadge: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  templateEmoji: { fontSize: 24 },
  templateName: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 2 },
  templateSubtitle: { color: '#5a7fa8', fontSize: 13, marginBottom: 8 },
  templateMeta: { flexDirection: 'row', gap: 10 },
  metaBadge: { fontSize: 12, fontWeight: '700' },

  // Exercises
  exercisesList: {
    backgroundColor: '#0a1628', borderRadius: 12,
    padding: 12, marginBottom: 14,
  },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  exerciseDot: { fontSize: 20, marginRight: 8, lineHeight: 20 },
  exerciseName: { flex: 1, color: '#8ab4f8', fontSize: 13, fontWeight: '600' },
  exerciseSets: { color: '#5a7fa8', fontSize: 12 },
  moreText: { color: '#2a4a7f', fontSize: 12, fontStyle: 'italic', marginTop: 4 },

  // Actions
  actions: { flexDirection: 'row', gap: 10 },
  useBtn: { flex: 1, borderRadius: 12, padding: 13, alignItems: 'center' },
  useBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  deleteBtn: {
    width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#FF6B6B33',
  },
  deleteBtnText: { fontSize: 20 },

  // Faith
  faithCard: {
    flexDirection: 'row', backgroundColor: '#0d1f3c',
    borderRadius: 16, padding: 18,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  faithIcon: { fontSize: 28, marginRight: 14 },
  faithText: { color: '#c8d8f0', fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  faithRef: { color: '#4A9EFF', fontSize: 12, fontWeight: '600', textAlign: 'right' }
});

export default WorkoutTemplatesScreen;