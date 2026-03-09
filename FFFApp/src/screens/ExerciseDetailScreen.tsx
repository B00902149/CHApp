import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { exerciseDB, Exercise } from '../services/exerciseDB';
import { useDailyQuote } from '../hooks/useDailyQuote';

// Accent colour per difficulty level
const LEVEL_COLORS: Record<string, string> = {
  beginner:     '#26de81',
  intermediate: '#FF9F43',
  expert:       '#FF6B6B',
};

// Accent colour per exercise category
const CATEGORY_COLORS: Record<string, string> = {
  strength:              '#4A9EFF',
  cardio:                '#FF6B6B',
  stretching:            '#26de81',
  plyometrics:           '#FF9F43',
  powerlifting:          '#7B6FFF',
  olympic_weightlifting: '#FFD700',
};

export const ExerciseDetailScreen = ({ route, navigation }: any) => {
  const { exercise }: { exercise: Exercise } = route.params;
  const { user } = useAuth();
  const quote = useDailyQuote();

  // Tracks which exercise image is shown (0 = start position, 1 = end position)
  const [activeImage, setActiveImage] = useState(0);

  // Derive accent colours from the exercise's category and level
  const accentColor = CATEGORY_COLORS[exercise.category] || '#4A9EFF';
  const levelColor  = LEVEL_COLORS[exercise.level]       || '#4A9EFF';

  // Build full image URLs — null if the exercise has no images
  const image0 = exercise.images?.[0] ? exerciseDB.getImageUrl(exercise, 0) : null;
  const image1 = exercise.images?.[1] ? exerciseDB.getImageUrl(exercise, 1) : null;

  // Prompts the user to go to the Exercise screen where they can add this exercise to a workout
  const handleAddToWorkout = () => {
    Alert.alert(
      'Add to Workout',
      `Add ${exercise.name} to a workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Exercise Screen', onPress: () => navigation.navigate('Exercise') }
      ]
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Header: Back / Title ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EXERCISE</Text>
        {/* Spacer keeps the title centred */}
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Image Viewer ── */}
        <View style={styles.imageContainer}>
          {image0 ? (
            // Switches between start (image0) and end (image1) position based on activeImage
            <Image
              source={{ uri: activeImage === 0 ? image0 : (image1 || image0) }}
              style={styles.mainImage}
              resizeMode="contain"
            />
          ) : (
            // Fallback shown when the exercise has no images
            <View style={[styles.imagePlaceholder, { backgroundColor: accentColor + '22' }]}>
              <Text style={styles.imagePlaceholderEmoji}>💪</Text>
            </View>
          )}

          {/* Dot indicators and Start/End toggle — only shown if a second image exists */}
          {image1 && (
            <View style={styles.imageToggle}>
              <TouchableOpacity
                style={[styles.imageDot, activeImage === 0 && { backgroundColor: accentColor }]}
                onPress={() => setActiveImage(0)}
              />
              <TouchableOpacity
                style={[styles.imageDot, activeImage === 1 && { backgroundColor: accentColor }]}
                onPress={() => setActiveImage(1)}
              />
            </View>
          )}
          {image1 && (
            <View style={styles.imageSwitcher}>
              <TouchableOpacity
                style={[styles.imageSwitchBtn, activeImage === 0 && { borderColor: accentColor }]}
                onPress={() => setActiveImage(0)}
              >
                <Text style={styles.imageSwitchLabel}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageSwitchBtn, activeImage === 1 && { borderColor: accentColor }]}
                onPress={() => setActiveImage(1)}
              >
                <Text style={styles.imageSwitchLabel}>End</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Name + Metadata Badges ── */}
        <View style={[styles.card, { borderTopColor: accentColor }]}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.badgeRow}>
            {/* Category badge */}
            <View style={[styles.badge, { backgroundColor: accentColor + '22' }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>{exercise.category}</Text>
            </View>
            {/* Difficulty level badge */}
            <View style={[styles.badge, { backgroundColor: levelColor + '22' }]}>
              <Text style={[styles.badgeText, { color: levelColor }]}>{exercise.level}</Text>
            </View>
            {/* Equipment badge — only shown if equipment is specified */}
            {exercise.equipment && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>🏋️ {exercise.equipment}</Text>
              </View>
            )}
            {/* Force direction badge (push / pull / static) — only shown if available */}
            {exercise.force && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {exercise.force === 'push' ? '⬆️' : exercise.force === 'pull' ? '⬇️' : '↔️'} {exercise.force}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Muscles Targeted ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MUSCLES</Text>
          {/* Primary muscles use the category accent colour */}
          <View style={styles.muscleSection}>
            <Text style={styles.muscleGroupLabel}>Primary</Text>
            <View style={styles.muscleChips}>
              {exercise.primaryMuscles.map(m => (
                <View key={m} style={[styles.muscleChip, { backgroundColor: accentColor + '22', borderColor: accentColor + '44' }]}>
                  <Text style={[styles.muscleChipText, { color: accentColor }]}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* Secondary muscles only shown if the exercise targets any */}
          {exercise.secondaryMuscles.length > 0 && (
            <View style={styles.muscleSection}>
              <Text style={styles.muscleGroupLabel}>Secondary</Text>
              <View style={styles.muscleChips}>
                {exercise.secondaryMuscles.map(m => (
                  <View key={m} style={styles.muscleChipSecondary}>
                    <Text style={styles.muscleChipTextSecondary}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── Step-by-step Instructions ── */}
        {exercise.instructions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>HOW TO PERFORM</Text>
            {exercise.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                {/* Numbered badge uses category accent colour */}
                <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Daily Inspiration Quote ── */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteRef}>— {quote.author}</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actions}>
          {/* Primary CTA — accent colour matches exercise category */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
            onPress={handleAddToWorkout}
          >
            <Text style={styles.primaryBtnText}>+ Add to Workout</Text>
          </TouchableOpacity>
          {/* Secondary back button with outline style */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: accentColor }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.secondaryBtnText, { color: accentColor }]}>← Back to Search</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  backBtn: { width: 60 },
  backText: { color: '#4A9EFF', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 2 },

  content: { paddingBottom: 20 },

  // Image viewer
  imageContainer: {
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
    alignItems: 'center', paddingVertical: 16,
  },
  mainImage: { width: '80%', height: 220 },
  imagePlaceholder: { width: '80%', height: 220, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  imagePlaceholderEmoji: { fontSize: 64 },
  imageToggle: { flexDirection: 'row', gap: 8, marginTop: 12 },
  imageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a3a6b' },
  imageSwitcher: { flexDirection: 'row', gap: 12, marginTop: 8 },
  imageSwitchBtn: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#1a3a6b' },
  imageSwitchLabel: { color: '#8ab4f8', fontSize: 12, fontWeight: '700' },

  // Shared card style
  card: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    margin: 16, marginBottom: 0, padding: 18,
    borderTopWidth: 3, borderTopColor: '#1a3a6b', elevation: 4,
  },
  cardLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 14 },

  // Name + metadata badges
  exerciseName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#1a3a6b' },
  badgeText: { color: '#8ab4f8', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  // Muscle chips
  muscleSection: { marginBottom: 12 },
  muscleGroupLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  muscleChipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  muscleChipSecondary: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#1a3a6b' },
  muscleChipTextSecondary: { color: '#5a7fa8', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  // Instruction steps
  stepRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  stepBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepText: { flex: 1, color: '#c8d8f0', fontSize: 14, lineHeight: 22 },

  // Daily quote card
  quoteCard: {
    flexDirection: 'row', backgroundColor: '#0d1f3c',
    margin: 16, marginBottom: 0, borderRadius: 16, padding: 18,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  quoteIcon: { fontSize: 24, marginRight: 14 },
  quoteText: { color: '#c8d8f0', fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  quoteRef: { color: '#4A9EFF', fontSize: 12, fontWeight: '600', textAlign: 'right' },

  // Action buttons
  actions: { margin: 16, gap: 12 },
  primaryBtn: { borderRadius: 16, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, backgroundColor: 'transparent' },
  secondaryBtnText: { fontSize: 16, fontWeight: '700' },
});