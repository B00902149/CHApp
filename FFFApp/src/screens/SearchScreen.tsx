import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { exerciseDB, Exercise } from '../services/exerciseDB';

// Constants / Configuration
/** Available filter categories shown as pills */
const FILTERS = [
  { id: 'all',                   label: 'All' },
  { id: 'strength',              label: 'Strength' },
  { id: 'cardio',                label: 'Cardio' },
  { id: 'stretching',            label: 'Stretching' },
  { id: 'plyometrics',           label: 'Plyometrics' },
  { id: 'powerlifting',          label: 'Powerlifting' },
  { id: 'olympic_weightlifting', label: 'Olympic' },
] as const;

/** Color mapping for difficulty levels */
const LEVEL_COLORS: Record<string, string> = {
  beginner:     '#26de81',
  intermediate: '#FF9F43',
  expert:       '#FF6B6B',
};

/** Color mapping for exercise categories (used for accents & tags) */
const CATEGORY_COLORS: Record<string, string> = {
  strength:             '#4A9EFF',
  cardio:               '#FF6B6B',
  stretching:           '#26de81',
  plyometrics:          '#FF9F43',
  powerlifting:         '#7B6FFF',
  olympic_weightlifting: '#FFD700',
};

// Main Component
export const SearchScreen = ({ navigation }: any) => {
  // Search & filter state
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Results & loading states
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);     // Initial data load
  const [searching, setSearching] = useState(false); // Debounced search in progress

  // Load all exercises once on mount (initial population)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const data = await exerciseDB.search('', 'all');
      setResults(data);
      setLoading(false);
    };
    init();
  }, []);

  // Debounced search + filter effect
  // Triggers whenever query or filter changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true);
      const data = await exerciseDB.search(query, filter);
      setResults(data);
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, filter]);

  // Render single exercise card
  const renderExercise = ({ item }: { item: Exercise }) => {
    const color = CATEGORY_COLORS[item.category] || '#4A9EFF';
    const levelColor = LEVEL_COLORS[item.level] || '#4A9EFF';
    const imageUrl = exerciseDB.getImageUrl(item, 0);

    return (
      <TouchableOpacity
        style={[styles.card, { borderTopColor: color }]}
        onPress={() => navigation.navigate('ExerciseDetail', { exercise: item })}
        activeOpacity={0.7}
      >
        {/* Exercise image or fallback emoji placeholder */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: color + '22' }]}>
            <Text style={styles.cardImageEmoji}>💪</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.cardMeta}>
            <Text style={[styles.cardCategory, { color }]}>{item.category}</Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={[styles.cardLevel, { color: levelColor }]}>{item.level}</Text>
          </View>

          <Text style={styles.cardMuscles} numberOfLines={1}>
            {item.primaryMuscles.join(', ')}
          </Text>
        </View>

        <Text style={[styles.cardArrow, { color }]}>›</Text>
      </TouchableOpacity>
    );
  };

  // Main render
  return (
    <View style={styles.container}>
      {/* Header with title and close button */}
      <View style={styles.header}>
        <Text style={styles.title}>EXERCISES</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.navigate('DashboardTab')}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Search input with clear button */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or muscle..."
          placeholderTextColor="#2a4a7f"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        {(query.length > 0 || searching) && (
          <TouchableOpacity onPress={() => setQuery('')}>
            {searching ? (
              <ActivityIndicator size="small" color="#4A9EFF" />
            ) : (
              <Text style={styles.clearBtn}>✕</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal filter pills */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.filterPill,
                filter === item.id && styles.filterPillActive,
              ]}
              onPress={() => setFilter(item.id)}
            >
              <Text
                style={
                  filter === item.id ? styles.filterTextActive : styles.filterText
                }
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results count or loading message */}
      <Text style={styles.resultsCount}>
        {loading ? 'Loading exercises...' : `${results.length} EXERCISES`}
      </Text>

      {/* Loading state or results list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A9EFF" />
          <Text style={styles.loadingText}>Loading 800+ exercises...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderExercise}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No exercises found</Text>
              <Text style={styles.emptyText}>
                Try a different search or filter
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { color: '#5a7fa8', marginTop: 12, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a3a6b', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f3c', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1a3a6b', gap: 10,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 6 },
  clearBtn: { color: '#5a7fa8', fontSize: 16, fontWeight: '700', padding: 4 },

  filterBar: { backgroundColor: '#0d1f3c', borderBottomWidth: 1, borderBottomColor: '#1a3a6b' },
  filterContent: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a3a6b' },
  filterPillActive: { backgroundColor: '#4A9EFF' },
  filterText: { color: '#5a7fa8', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  resultsCount: { color: '#2a4a7f', fontSize: 11, fontWeight: '700', letterSpacing: 2, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f3c', borderRadius: 16,
    marginBottom: 12, borderTopWidth: 3, elevation: 4,
    overflow: 'hidden',
  },
  cardImage: { width: 80, height: 80 },
  cardImagePlaceholder: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  cardImageEmoji: { fontSize: 32 },
  cardInfo: { flex: 1, padding: 12 },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  cardCategory: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardDot: { color: '#2a4a7f', fontSize: 14 },
  cardLevel: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardMuscles: { color: '#5a7fa8', fontSize: 12, textTransform: 'capitalize' },
  cardArrow: { fontSize: 28, fontWeight: '300', paddingRight: 14 },

  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: '#5a7fa8', fontSize: 14 },
});

export default SearchScreen;