import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView, Modal
} from 'react-native';
import { workoutAPI } from '../services/api';
import { useDailyQuote } from '../hooks/useDailyQuote';

// Maps star rating (1–5) to a motivational label shown below the stars
const RATING_LABELS: Record<number, string> = {
  1: 'Rough session 😅',
  2: 'Keep pushing! 💪',
  3: 'Solid effort 👍',
  4: 'Great workout! 🔥',
  5: 'Absolutely crushed it! 🏆',
};

export const CompleteWorkoutScreen = ({ route, navigation }: any) => {
  const { workout } = route.params || {};

  const [rating, setRating]                       = useState(0);
  const [comment, setComment]                     = useState('');
  const [loading, setLoading]                     = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false); // controls save-template bottom sheet
  const [templateName, setTemplateName]           = useState('');

  // Pulls a motivational quote from the API (or cache) via custom hook
  const { quote, loading: quoteLoading } = useDailyQuote();

  // Calculate total sets and how many the user actually completed
  const totalSets     = workout?.exercises?.reduce((t: number, ex: any) => t + ex.sets.length, 0) || 0;
  const completedSets = workout?.exercises?.reduce((t: number, ex: any) =>
    t + ex.sets.filter((s: any) => s.completed).length, 0) || 0;

  // Submits the workout rating + notes to the API, then prompts to save as template
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please rate your workout before completing');
      return;
    }
    setLoading(true);
    try {
      await workoutAPI.completeWorkout(workout._id, rating, comment);
      setLoading(false);
      // Offer template save after successful completion
      Alert.alert(
        'Workout Complete! 🎉',
        'Great job! Would you like to save this as a template?',
        [
          { text: 'No Thanks', style: 'cancel', onPress: () => { navigation.popToTop(); } },
          { text: 'Save Template', onPress: () => { setTemplateName(workout.title); setShowTemplateModal(true); } },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to complete workout');
      setLoading(false);
    }
  };

  // Saves the completed workout as a reusable template with the given name
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { Alert.alert('Error', 'Please enter a template name'); return; }
    try {
      await workoutAPI.saveAsTemplate(workout._id, templateName.trim());
      setShowTemplateModal(false);
      Alert.alert('Saved! 💪', 'Template saved! Access it anytime from the Templates screen.', [
        { text: 'OK', onPress: () => { navigation.popToTop(); } }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save template');
      setShowTemplateModal(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Celebration Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🏆</Text>
          <Text style={styles.headerTitle}>Workout Complete!</Text>
          <Text style={styles.headerSub}>{workout?.title}</Text>
        </View>

        {/* ── Stats Summary Card: exercises / sets done / skipped ── */}
        <View style={styles.statsCard}>
          <Text style={styles.cardLabel}>SUMMARY</Text>
          <View style={styles.statsRow}>
            {[
              { value: workout?.exercises?.length || 0, label: 'Exercises' },
              { value: completedSets,                   label: 'Sets Done' },
              { value: totalSets - completedSets,       label: 'Skipped' },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                {/* Vertical divider between stats, but not after the last one */}
                {i < 2 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Star Rating Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>RATE YOUR WORKOUT</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                {/* Filled gold star if at or below current rating, empty otherwise */}
                <Text style={[styles.star, star <= rating && styles.starFilled]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Motivational label appears once user picks a rating */}
          {rating > 0 && <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>}
        </View>

        {/* ── Optional Notes Input ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="How did you feel? Any personal records?"
            placeholderTextColor="#2a4a7f"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Daily Inspiration Quote ── */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteLabel}>DAILY INSPIRATION</Text>
            {quoteLoading ? (
              <Text style={styles.quoteText}>Loading quote...</Text>
            ) : quote ? (
              <>
                <Text style={styles.quoteText}>"{quote.quote}"</Text>
                {quote.author ? <Text style={styles.quoteAuthor}>— {quote.author}</Text> : null}
              </>
            ) : (
              // Fallback quote shown if the API returns nothing
              <Text style={styles.quoteText}>"Discipline is doing what needs to be done, even when you don't want to."</Text>
            )}
          </View>
        </View>

        {/* ── Complete Workout Button ── */}
        <TouchableOpacity
          style={[styles.completeBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.completeBtnText}>
            {loading ? 'Saving...' : '✓  Complete Workout'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Save as Template Bottom Sheet Modal ── */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>💾  Save as Template</Text>
            <Text style={styles.modalSub}>Enter a name for this workout template:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Template name"
              placeholderTextColor="#2a4a7f"
              value={templateName}
              onChangeText={setTemplateName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              {/* Cancel skips saving but still navigates back */}
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowTemplateModal(false); navigation.popToTop(); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveTemplate}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  content: { padding: 16, paddingTop: 60 },

  header: { alignItems: 'center', marginBottom: 20 },
  headerEmoji: { fontSize: 64, marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  headerSub: { color: '#5a7fa8', fontSize: 15, fontWeight: '600' },

  statsCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderTopWidth: 3, borderTopColor: '#26de81', elevation: 4,
  },
  cardLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#4A9EFF', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statDivider: { width: 1, height: 40, backgroundColor: '#1a3a6b' },

  card: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderTopWidth: 3, borderTopColor: '#4A9EFF', elevation: 4,
  },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  starBtn: { padding: 4 },
  star: { fontSize: 44, color: '#1a3a6b' },
  starFilled: { color: '#FFD700' },
  ratingLabel: { color: '#FFD700', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  textInput: {
    backgroundColor: '#0a1628', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#fff',
    minHeight: 100, borderWidth: 1, borderColor: '#1a3a6b',
  },

  // Daily quote card
  quoteCard: {
    flexDirection: 'row', backgroundColor: '#0d1f3c',
    borderRadius: 16, padding: 18, marginBottom: 20,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  quoteIcon: { fontSize: 28, marginRight: 14 },
  quoteLabel: { color: '#5a7fa8', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  quoteText: { color: '#c8d8f0', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  quoteAuthor: { color: '#4A9EFF', fontSize: 12, fontWeight: '700', marginTop: 6 },

  completeBtn: {
    backgroundColor: '#26de81', borderRadius: 14,
    padding: 16, alignItems: 'center', elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  completeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Template save modal (slides up from bottom)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0d1f3c', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, borderTopWidth: 1, borderTopColor: '#1a3a6b',
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalSub: { color: '#5a7fa8', fontSize: 14, marginBottom: 20 },
  modalInput: {
    backgroundColor: '#0a1628', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#fff',
    borderWidth: 1, borderColor: '#1a3a6b', marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#1a3a6b' },
  modalCancelText: { color: '#8ab4f8', fontWeight: '700', fontSize: 16 },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#4A9EFF' },
  modalSaveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});