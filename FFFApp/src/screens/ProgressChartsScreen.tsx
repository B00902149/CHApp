import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, Modal, TextInput,
  Image, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { profileAPI } from '../services/api';
import { pickImage, convertImageToBase64 } from '../utils/imagePicker';

// Used to calculate chart point positions relative to screen width
const screenWidth = Dimensions.get('window').width;

// Measurement fields shown in the new entry modal — differ by gender
const MALE_MEASUREMENTS = [
  { key: 'chest',      label: 'Chest' },
  { key: 'shoulders',  label: 'Shoulders' },
  { key: 'waist',      label: 'Waist' },
  { key: 'hips',       label: 'Hips' },
  { key: 'bicepLeft',  label: 'Bicep (L)' },
  { key: 'bicepRight', label: 'Bicep (R)' },
  { key: 'thighLeft',  label: 'Thigh (L)' },
  { key: 'thighRight', label: 'Thigh (R)' },
  { key: 'calfLeft',   label: 'Calf (L)' },
  { key: 'calfRight',  label: 'Calf (R)' },
  { key: 'neck',       label: 'Neck' },
  { key: 'forearm',    label: 'Forearm' },
];

const FEMALE_MEASUREMENTS = [
  { key: 'bust',       label: 'Bust' },
  { key: 'underBust',  label: 'Under Bust' },
  { key: 'waist',      label: 'Waist' },
  { key: 'hips',       label: 'Hips' },
  { key: 'thighLeft',  label: 'Thigh (L)' },
  { key: 'thighRight', label: 'Thigh (R)' },
  { key: 'calfLeft',   label: 'Calf (L)' },
  { key: 'calfRight',  label: 'Calf (R)' },
  { key: 'bicepLeft',  label: 'Bicep (L)' },
  { key: 'bicepRight', label: 'Bicep (R)' },
  { key: 'neck',       label: 'Neck' },
  { key: 'shoulders',  label: 'Shoulders' },
];

// Converts camelCase measurement keys to readable labels for the timeline
// e.g. "bicepLeft" → "Bicep (L)"
const formatKey = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace('Left', '(L)').replace('Right', '(R)').trim();

export const ProgressChartsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [profile, setProfile]   = useState<any>(null);
  const [entries, setEntries]   = useState<any[]>([]); // all progress entries, newest first

  // ── New Entry Modal State ──────────────────────────────────────────────────
  const [modalVisible, setModalVisible]         = useState(false);
  const [entryWeight, setEntryWeight]           = useState('');
  const [entryMeasurements, setEntryMeasurements] = useState<Record<string, string>>({}); // key → value string
  const [entryPhoto, setEntryPhoto]             = useState<string | null>(null); // base64 string or null
  const [entryNote, setEntryNote]               = useState('');
  const [savingEntry, setSavingEntry]           = useState(false);
  const [uploadingPhoto, setUploadingPhoto]     = useState(false); // separate spinner for photo only

  // Reload whenever the screen comes into focus
  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Fetches the user's profile and reads progressEntries from it
  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const profileData = await profileAPI.getProfile(user.id);
      setProfile(profileData);
      // progressEntries is stored as an array on the profile document
      setEntries(profileData?.progressEntries || []);
    } catch (error) {
      console.error('Load progress error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Presents a camera/gallery picker, converts the selected image to base64, and stores it
  const handlePickPhoto = async () => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: async () => {
        setUploadingPhoto(true);
        try {
          const uri = await pickImage(true); // true = use camera
          if (uri) { const b64 = await convertImageToBase64(uri); setEntryPhoto(b64); }
        } finally { setUploadingPhoto(false); }
      }},
      { text: 'Gallery', onPress: async () => {
        setUploadingPhoto(true);
        try {
          const uri = await pickImage(false); // false = use gallery
          if (uri) { const b64 = await convertImageToBase64(uri); setEntryPhoto(b64); }
        } finally { setUploadingPhoto(false); }
      }},
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  // Validates, builds the new entry object, prepends it to the list, and saves to the backend
  const handleSaveEntry = async () => {
    // Require at least a weight or one measurement value
    if (!entryWeight && Object.keys(entryMeasurements).filter(k => entryMeasurements[k]).length === 0) {
      Alert.alert('Error', 'Please enter at least a weight or one measurement.');
      return;
    }
    setSavingEntry(true);
    try {
      const newEntry = {
        id: Date.now().toString(), // simple unique ID using timestamp
        date: new Date().toISOString(),
        weight: entryWeight ? parseFloat(entryWeight) : null,
        measurements: entryMeasurements,
        photo: entryPhoto,
        note: entryNote,
        weightUnit: profile?.weightUnit || 'kg',
        measureUnit: profile?.measureUnit || 'cm',
      };

      // Prepend new entry so the list is newest-first
      const updatedEntries = [newEntry, ...entries];
      // progressEntries is persisted as part of the profile document
      await profileAPI.updateProfile(user.id, { progressEntries: updatedEntries });
      setEntries(updatedEntries);
      setModalVisible(false);
      resetModal();
    } catch {
      Alert.alert('Error', 'Failed to save entry.');
    } finally {
      setSavingEntry(false);
    }
  };

  // Clears all modal input fields ready for the next entry
  const resetModal = () => {
    setEntryWeight(''); setEntryMeasurements({});
    setEntryPhoto(null); setEntryNote('');
  };

  // Confirms then removes the entry by filtering it from the local array and saving to the backend
  const handleDeleteEntry = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = entries.filter(e => e.id !== id);
        await profileAPI.updateProfile(user.id, { progressEntries: updated });
        setEntries(updated);
      }}
    ]);
  };

  // Chooses the correct measurement set based on the user's gender (defaults to male)
  const activeMeasurements = profile?.gender === 'female' ? FEMALE_MEASUREMENTS : MALE_MEASUREMENTS;

  // Take the 10 most recent entries that have a weight value, then reverse for chronological order
  const weightEntries = entries.filter(e => e.weight).slice(0, 10).reverse();

  // Renders a simple scatter/dot chart for weight progression
  const renderWeightChart = () => {
    if (weightEntries.length < 2) return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>WEIGHT PROGRESS</Text>
        <Text style={styles.emptyText}>Add at least 2 weight entries to see your chart.</Text>
      </View>
    );

    const weights    = weightEntries.map(e => e.weight);
    const maxW       = Math.max(...weights);
    const minW       = Math.min(...weights);
    const range      = maxW - minW || 1; // avoid division by zero if all values are equal
    // Add 20% padding above and below the data range so dots aren't clipped at the edges
    const paddedMax  = maxW + range * 0.2;
    const paddedMin  = minW - range * 0.2;
    const paddedRange = paddedMax - paddedMin;

    const chartHeight = 140;
    const chartWidth  = screenWidth - 100; // accounts for y-axis and card padding
    const pointWidth  = chartWidth / (weightEntries.length - 1); // horizontal gap between dots

    const current = weights[weights.length - 1];
    const start   = weights[0];
    const change  = current - start; // positive = weight gain, negative = loss

    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>WEIGHT PROGRESS</Text>
        <View style={styles.chartRow}>
          {/* Y-axis labels: top, mid, bottom of the padded range */}
          <View style={[styles.yAxis, { height: chartHeight }]}>
            <Text style={styles.axisLabel}>{paddedMax.toFixed(1)}</Text>
            <Text style={styles.axisLabel}>{((paddedMax + paddedMin) / 2).toFixed(1)}</Text>
            <Text style={styles.axisLabel}>{paddedMin.toFixed(1)}</Text>
          </View>
          <View style={[styles.chartArea, { width: chartWidth, height: chartHeight }]}>
            {/* Horizontal grid lines at equal vertical intervals */}
            {[0, 1, 2, 3].map(i => <View key={i} style={[styles.gridLine, { top: (chartHeight / 3) * i }]} />)}
            {/* Dots: the most recent entry is larger with a white fill */}
            {weightEntries.map((entry, index) => {
              // Normalise weight to 0–1 range, then invert (y=0 is top in RN layout)
              const norm   = (entry.weight - paddedMin) / paddedRange;
              const y      = chartHeight - norm * chartHeight;
              const x      = index * pointWidth;
              const isLast = index === weightEntries.length - 1;
              return (
                <View key={index} style={{
                  position: 'absolute',
                  // Clamp so dots don't overflow the chart area
                  left: Math.max(0, Math.min(chartWidth - 10, x - 5)),
                  top:  Math.max(0, Math.min(chartHeight - 10, y - 5)),
                  width:  isLast ? 12 : 8,
                  height: isLast ? 12 : 8,
                  borderRadius: isLast ? 6 : 4,
                  backgroundColor: isLast ? '#fff' : '#4A9EFF',
                  borderWidth: isLast ? 2 : 0,
                  borderColor: '#4A9EFF',
                }} />
              );
            })}
          </View>
        </View>
        {/* Summary stats below the chart */}
        <View style={styles.statsRow}>
          {[
            { label: 'Current', value: `${current.toFixed(1)}${profile?.weightUnit || 'kg'}`, color: '#4A9EFF' },
            // Green for weight loss, red for gain
            { label: 'Change',  value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}`, color: change < 0 ? '#26de81' : '#FF6B6B' },
            { label: 'Entries', value: `${weightEntries.length}`, color: '#FFD700' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {/* Vertical divider between stats, skipped after the last one */}
              {i < 2 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#4A9EFF" />
      <Text style={styles.loadingText}>Loading progress...</Text>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ── Header: Back / Title / New Entry button ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MY PROGRESS</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Weight Progress Chart ── */}
        {renderWeightChart()}

        {/* ── Entry Timeline ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ENTRY HISTORY</Text>

          {entries.length === 0 ? (
            /* Empty state with CTA to log the first entry */
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyText}>Tap "+ New" to log your first progress entry.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.emptyBtnText}>+ Add First Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            entries.map((entry, index) => (
              // Bottom border removed from the last entry to avoid double-border at card edge
              <View key={entry.id} style={[styles.timelineEntry, index === entries.length - 1 && { borderBottomWidth: 0 }]}>

                {/* Entry header: date badge + delete button */}
                <View style={styles.entryHeader}>
                  <View style={styles.entryDateBadge}>
                    <Text style={styles.entryDateText}>
                      {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}>
                    <Text style={styles.deleteBtn}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {/* Progress photo — only shown if one was attached */}
                {entry.photo && (
                  <Image source={{ uri: entry.photo }} style={styles.entryPhoto} />
                )}

                {/* Weight row — only shown if a weight was logged */}
                {entry.weight && (
                  <View style={styles.entryWeightRow}>
                    <Text style={styles.entryWeightIcon}>⚖️</Text>
                    <Text style={styles.entryWeightValue}>{entry.weight} {entry.weightUnit || 'kg'}</Text>
                  </View>
                )}

                {/* Measurement chips — only shown if at least one has a value */}
                {entry.measurements && Object.keys(entry.measurements).filter(k => entry.measurements[k]).length > 0 && (
                  <View style={styles.entryMeasureGrid}>
                    {Object.entries(entry.measurements)
                      .filter(([_, v]) => v) // skip empty values
                      .map(([key, val]) => (
                        <View key={key} style={styles.entryMeasureChip}>
                          <Text style={styles.entryMeasureVal}>{val as string}</Text>
                          <Text style={styles.entryMeasureUnit}>{entry.measureUnit || 'cm'}</Text>
                          <Text style={styles.entryMeasureKey}>{formatKey(key)}</Text>
                        </View>
                      ))}
                  </View>
                )}

                {/* Optional note — only shown if one was entered */}
                {entry.note ? <Text style={styles.entryNote}>"{entry.note}"</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── New Entry Modal (bottom sheet) ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setModalVisible(false); resetModal(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>NEW PROGRESS ENTRY</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Weight input */}
                <Text style={styles.modalSection}>⚖️  WEIGHT</Text>
                <View style={styles.weightInputRow}>
                  <TextInput
                    style={styles.weightInput}
                    placeholder="0.0"
                    placeholderTextColor="#2a4a7f"
                    value={entryWeight}
                    onChangeText={setEntryWeight}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.weightUnit}>{profile?.weightUnit || 'kg'}</Text>
                </View>

                {/* Photo picker — shows spinner while uploading, preview once selected */}
                <Text style={styles.modalSection}>📸  PROGRESS PHOTO</Text>
                <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#4A9EFF" />
                  ) : entryPhoto ? (
                    <Image source={{ uri: entryPhoto }} style={styles.photoPreview} />
                  ) : (
                    <Text style={styles.photoPickerText}>Tap to add photo</Text>
                  )}
                </TouchableOpacity>
                {/* Remove photo link — only shown when a photo has been selected */}
                {entryPhoto && (
                  <TouchableOpacity onPress={() => setEntryPhoto(null)} style={{ alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: '#FF6B6B', fontSize: 13 }}>Remove photo</Text>
                  </TouchableOpacity>
                )}

                {/* Measurement inputs — uses activeMeasurements based on gender */}
                <Text style={styles.modalSection}>📏  MEASUREMENTS ({profile?.measureUnit || 'cm'})</Text>
                <View style={styles.modalMeasureGrid}>
                  {activeMeasurements.map(m => (
                    <View key={m.key} style={styles.modalMeasureField}>
                      <Text style={styles.modalMeasureLabel}>{m.label}</Text>
                      <View style={styles.modalMeasureInputRow}>
                        {/* Merges new value into existing measurements object */}
                        <TextInput
                          style={styles.modalMeasureInput}
                          placeholder="0"
                          placeholderTextColor="#2a4a7f"
                          value={entryMeasurements[m.key] || ''}
                          onChangeText={v => setEntryMeasurements(prev => ({ ...prev, [m.key]: v }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  ))}
                </View>

                {/* Optional note */}
                <Text style={styles.modalSection}>📝  NOTE (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="How are you feeling? Any milestones?"
                  placeholderTextColor="#2a4a7f"
                  value={entryNote}
                  onChangeText={setEntryNote}
                  multiline
                  maxLength={200}
                />

                {/* Save button — dims while saving */}
                <TouchableOpacity
                  style={[styles.saveEntryBtn, savingEntry && { opacity: 0.5 }]}
                  onPress={handleSaveEntry}
                  disabled={savingEntry}
                >
                  {savingEntry
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveEntryBtnText}>Save Entry</Text>
                  }
                </TouchableOpacity>

                {/* Cancel — closes modal and resets all fields */}
                <TouchableOpacity style={{ alignItems: 'center', marginBottom: 20 }} onPress={() => { setModalVisible(false); resetModal(); }}>
                  <Text style={{ color: '#5a7fa8', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addBtn: { backgroundColor: '#4A9EFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  content: { padding: 16 },

  card: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderTopWidth: 3, borderTopColor: '#4A9EFF', elevation: 4,
  },
  cardLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 16 },

  // Weight chart
  chartRow: { flexDirection: 'row', marginBottom: 12 },
  yAxis: { width: 38, justifyContent: 'space-between', paddingRight: 6 },
  axisLabel: { color: '#2a4a7f', fontSize: 9, fontWeight: '600', textAlign: 'right' },
  chartArea: { flex: 1, backgroundColor: '#0a1628', borderRadius: 8, overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#1a3a6b' },
  statsRow: { flexDirection: 'row', backgroundColor: '#0a1628', borderRadius: 12, padding: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: '#1a3a6b', marginHorizontal: 8 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: '#5a7fa8', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#4A9EFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Timeline entry
  timelineEntry: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a3a6b' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  entryDateBadge: { backgroundColor: '#1a3a6b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  entryDateText: { color: '#4A9EFF', fontSize: 12, fontWeight: '700' },
  deleteBtn: { fontSize: 18 },
  entryPhoto: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10, resizeMode: 'cover' },
  entryWeightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  entryWeightIcon: { fontSize: 18 },
  entryWeightValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  entryMeasureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  entryMeasureChip: {
    backgroundColor: '#0a1628', borderRadius: 10, padding: 8,
    alignItems: 'center', minWidth: 70,
    borderTopWidth: 2, borderTopColor: '#26de81',
  },
  entryMeasureVal: { color: '#fff', fontSize: 15, fontWeight: '800' },
  entryMeasureUnit: { color: '#5a7fa8', fontSize: 9, fontWeight: '600' },
  entryMeasureKey: { color: '#26de81', fontSize: 9, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  entryNote: { color: '#8ab4f8', fontSize: 13, fontStyle: 'italic', marginTop: 6 },

  // New entry modal (bottom sheet)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0a1628', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#1a3a6b', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#5a7fa8', fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  modalSection: { color: '#8ab4f8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, marginTop: 16 },

  weightInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f3c', borderRadius: 12,
    borderWidth: 1, borderColor: '#1a3a6b', overflow: 'hidden',
  },
  weightInput: { flex: 1, padding: 14, fontSize: 20, color: '#fff', fontWeight: '700' },
  weightUnit: { paddingHorizontal: 16, color: '#5a7fa8', fontSize: 14, fontWeight: '700' },

  photoPickerBtn: {
    backgroundColor: '#0d1f3c', borderRadius: 12,
    borderWidth: 1, borderColor: '#1a3a6b', borderStyle: 'dashed',
    height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden',
  },
  photoPickerText: { color: '#2a4a7f', fontSize: 14, fontWeight: '600' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  modalMeasureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modalMeasureField: { width: '47%' },
  modalMeasureLabel: { color: '#8ab4f8', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  modalMeasureInputRow: { backgroundColor: '#0d1f3c', borderRadius: 10, borderWidth: 1, borderColor: '#1a3a6b' },
  modalMeasureInput: { padding: 10, fontSize: 15, color: '#fff' },

  noteInput: {
    backgroundColor: '#0d1f3c', borderRadius: 12,
    borderWidth: 1, borderColor: '#1a3a6b',
    padding: 14, fontSize: 14, color: '#fff', minHeight: 80, textAlignVertical: 'top',
  },

  saveEntryBtn: {
    backgroundColor: '#4A9EFF', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 12,
  },
  saveEntryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});