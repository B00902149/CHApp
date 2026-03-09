// src/screens/HealthScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert,
  ScrollView, TouchableOpacity, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as HealthConnect from '../services/healthConnect';
import { useDailyQuote } from '../hooks/useDailyQuote';

// Shape of health data returned from Health Connect
type HealthData = {
  steps: number;
  heartRate: number | null;
  weight: string | null;
  sleep: string | null;
  calories: number;
};

// Config for each health metric tile — drives the grid layout and the manual entry modal
const TILES = [
  { key: 'weight',    label: 'WEIGHT',   icon: '⚖️',  color: '#4A9EFF', suffix: '',      placeholder: 'e.g. 82.5 kg' },
  { key: 'sleep',     label: 'SLEEP',    icon: '🌙',  color: '#7B6FFF', suffix: 'hrs',   placeholder: 'e.g. 7.5' },
  { key: 'heartRate', label: 'BPM',      icon: '❤️',  color: '#FF6B6B', suffix: 'bpm',   placeholder: 'e.g. 68' },
  { key: 'steps',     label: 'ACTIVITY', icon: '👟',  color: '#4ECDC4', suffix: 'steps', placeholder: 'e.g. 8500' },
  { key: 'calories',  label: 'CALORIES', icon: '🔥',  color: '#FF9F43', suffix: 'kcal',  placeholder: 'e.g. 1800' },
];

export const HealthScreen = ({ navigation }: any) => {
  const quote = useDailyQuote();

  const [data, setData]                 = useState<HealthData | null>(null); // live data from Health Connect
  const [loading, setLoading]           = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTile, setSelectedTile] = useState<typeof TILES[0] | null>(null); // tile being manually edited
  const [inputValue, setInputValue]     = useState('');
  // Stores user-entered values keyed by tile key (e.g. { weight: '82.5 kg' })
  const [manualData, setManualData]     = useState<Record<string, string>>({});

  useEffect(() => {
    loadManualData();
    setupHealthConnect();
  }, []);

  // Loads previously saved manual entries from AsyncStorage
  const loadManualData = async () => {
    try {
      const saved = await AsyncStorage.getItem(MANUAL_DATA_KEY);
      if (saved) setManualData(JSON.parse(saved));
    } catch (e) {}
  };

  // Persists manual entries to AsyncStorage so they survive app restarts
  const saveManualData = async (updated: Record<string, string>) => {
    try {
      await AsyncStorage.setItem(MANUAL_DATA_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  // Initialises Health Connect, requests permissions, and fetches live health data
  const setupHealthConnect = async () => {
    setLoading(true);
    try {
      const initialized = await HealthConnect.initHealthConnect();
      if (!initialized) {
        // Device doesn't support Health Connect — tiles will fall back to manual entry
        setLoading(false);
        return;
      }
      await HealthConnect.requestHealthPermissions();
      const healthData = await HealthConnect.fetchHealthData();
      setData(healthData);
    } catch (error) {
      console.error('Health Connect error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Returns the display string for a tile:
  // 1. Live Health Connect value (if available and non-zero)
  // 2. Manual entry (if the user has logged one)
  // 3. '--' if no data exists
  const getValue = (key: string) => {
    if (data) {
      const val = data[key as keyof HealthData];
      if (val !== null && val !== undefined && val !== 0) {
        const tile = TILES.find(t => t.key === key);
        return tile?.suffix ? `${val} ${tile.suffix}` : String(val);
      }
    }
    if (manualData[key]) return manualData[key];
    return '--';
  };

  // Returns true if Health Connect has a real (non-zero) value for this metric
  const isFromHealthConnect = (key: string) => {
    if (!data) return false;
    const val = data[key as keyof HealthData];
    return val !== null && val !== undefined && val !== 0;
  };

  // Opens the manual entry modal for a tile — does nothing if the tile has live HC data
  const handleTilePress = (tile: typeof TILES[0]) => {
    if (isFromHealthConnect(tile.key)) return; // HC data takes priority; can't be overridden manually
    setSelectedTile(tile);
    setInputValue(manualData[tile.key] ?? ''); // pre-fill with existing manual value if present
    setModalVisible(true);
  };

  // Saves the manually entered value, appending the unit suffix if defined
  const handleSave = () => {
    if (!selectedTile || !inputValue.trim()) return;
    const display = selectedTile.suffix
      ? `${inputValue.trim()} ${selectedTile.suffix}`
      : inputValue.trim();
    // Merge into existing manual data without overwriting other keys
    setManualData(prev => ({ ...prev, [selectedTile.key]: display }));
    setModalVisible(false);
    setInputValue('');
  };

  // Full-screen loader shown while Health Connect initialises
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A9EFF" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Header: Back / Title ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MY HEALTH</Text>
        {/* Spacer keeps the title centred */}
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Daily Quote Card ── */}
        <View style={styles.verseCard}>
          <Text style={styles.verseText}>"{quote.text}"</Text>
          <Text style={styles.verseRef}>— {quote.author}</Text>
        </View>

        {/* ── Health Metric Tiles Grid (2-column wrap) ── */}
        <View style={styles.grid}>
          {TILES.map(tile => {
            const value  = getValue(tile.key);
            const fromHC = isFromHealthConnect(tile.key); // true = data comes from Health Connect

            return (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tile, { borderTopColor: tile.color }]}
                onPress={() => handleTilePress(tile)}
                // Tiles with live data aren't interactive (no opacity feedback)
                activeOpacity={fromHC ? 1 : 0.7}
              >
                <Text style={styles.tileIcon}>{tile.icon}</Text>
                {/* Value turns dim blue when no data is available */}
                <Text style={[styles.tileValue, value === '--' && styles.tileEmpty]}>
                  {value}
                </Text>
                <Text style={styles.tileLabel}>{tile.label}</Text>
                {/* Show "+ Add" or "✎ Edit" hint only on manually-editable tiles */}
                {!fromHC && (
                  <Text style={[styles.tapHint, { color: tile.color }]}>
                    {value === '--' ? '+ Add' : '✎ Edit'}
                  </Text>
                )}
                {/* Live badge shown on tiles sourced from Health Connect */}
                {fromHC && (
                  <Text style={styles.hcBadge}>⚡ Live</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Refresh Button — re-runs Health Connect fetch ── */}
        <TouchableOpacity style={styles.refreshButton} onPress={setupHealthConnect}>
          <Text style={styles.refreshText}>↻  Refresh Health Connect</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Live data from Health Connect · Tap tiles to add manually
        </Text>
      </ScrollView>

      {/* ── Manual Entry Modal (bottom sheet) ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {selectedTile && (
              <>
                <Text style={styles.modalIcon}>{selectedTile.icon}</Text>
                <Text style={styles.modalTitle}>Log {selectedTile.label}</Text>
                {/* Input border colour matches the tile's accent colour */}
                <TextInput
                  style={[styles.input, { borderColor: selectedTile.color }]}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={selectedTile.placeholder}
                  placeholderTextColor="#445"
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  {/* Save button colour matches the tile */}
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: selectedTile.color }]}
                    onPress={handleSave}
                  >
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default HealthScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1628' },
  loadingText: { color: '#fff', marginTop: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  backBtn: { width: 60 },
  backText: { color: '#4A9EFF', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 2 },

  scroll: { padding: 16, paddingBottom: 40 },

  verseCard: {
    backgroundColor: '#0d1f3c', borderRadius: 14, padding: 16,
    marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  verseText: { color: '#c8d8f0', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  verseRef: { color: '#4A9EFF', fontSize: 12, marginTop: 6, fontWeight: '600' },

  // 2-column tile grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    backgroundColor: '#0d1f3c', borderRadius: 16, width: '48%',
    padding: 18, marginBottom: 14, alignItems: 'center',
    borderTopWidth: 3, elevation: 4,
  },
  tileIcon: { fontSize: 28, marginBottom: 8 },
  tileValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  tileEmpty: { color: '#2a4a7f' },
  tileLabel: { color: '#5a7fa8', fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 1.5 },
  tapHint: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  hcBadge: { color: '#4ECDC4', fontSize: 10, marginTop: 6, fontWeight: '700', letterSpacing: 1 },

  refreshButton: {
    backgroundColor: '#1a3a6b', borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  refreshText: { color: '#4A9EFF', fontWeight: '700', fontSize: 15 },
  hint: { color: '#2a4a7f', textAlign: 'center', fontSize: 11, marginTop: 4 },

  // Manual entry bottom sheet modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0d1f3c', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#1a3a6b',
  },
  modalIcon: { fontSize: 40, marginBottom: 10 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  input: {
    width: '100%', backgroundColor: '#0a1628', borderWidth: 2,
    borderRadius: 12, padding: 14, color: '#fff',
    fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#1a3a6b' },
  cancelText: { color: '#8ab4f8', fontWeight: '700', fontSize: 16 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});