import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';

// Shape of a community post returned from the API
interface Post {
  _id: string;
  userId: string;
  username: string;
  category: string;
  content: string;
  likes: string[];   // array of user IDs who liked the post
  comments: any[];
  createdAt: string;
}

// Maps each post category to a display icon and accent colour
const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  'Help Request':  { icon: '🆘', color: '#7B6FFF' },
  'Testimony':     { icon: '✨', color: '#FFD700' },
  'Encouragement': { icon: '💪', color: '#26de81' },
  'Victory':       { icon: '🎉', color: '#FF9F43' },
  'default':       { icon: '📝', color: '#4A9EFF' },
};

// Converts an ISO date string into a human-readable relative time label
const getTimeAgo = (dateString: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60)     return 'just now';
  if (seconds < 3600)   return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)  return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  // Older than 7 days: show short date instead
  return new Date(dateString).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

export const CommunityScreen = ({ navigation }: any) => {
  const { user } = useAuth();

  const [posts, setPosts]               = useState<Post[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [activeFilter, setActiveFilter] = useState('All'); // currently selected category filter

  // 'All' shows everything; other values filter by category
  const filters = ['All', 'Help Request', 'Testimony', 'Encouragement', 'Victory'];

  // Load posts on first render
  useEffect(() => { loadPosts(); }, []);

  // Fetches the latest 20 posts from the API
  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await postsAPI.getPosts(20, 0);
      setPosts(data);
    } catch {
      Alert.alert('Error', 'Failed to load community posts');
    } finally {
      setLoading(false);
      setRefreshing(false); // also resets pull-to-refresh spinner
    }
  };

  // Toggles a like on a post and updates that post in local state
  const handleLike = async (postId: string) => {
    if (!user?.id) return;
    try {
      const updatedPost = await postsAPI.likePost(postId, user.id);
      // Replace only the liked post in the list, keep everything else unchanged
      setPosts(posts.map(p => p._id === postId ? updatedPost : p));
    } catch {
      console.error('Failed to like post');
    }
  };

  // Navigates to the CreatePost screen and prepends the new post to the feed on return
  const handleCreatePost = () => {
    navigation.navigate('CreatePost', {
      onPostCreated: (newPost: Post) => setPosts([newPost, ...posts]),
    });
  };

  // Filters posts client-side based on the active category tab
  const filteredPosts = activeFilter === 'All'
    ? posts
    : posts.filter(p => p.category === activeFilter);

  // Full-screen loader shown only on the initial load (not on pull-to-refresh)
  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A9EFF" />
        <Text style={styles.loadingText}>Loading community...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Header: Back / Title / New Post ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>COMMUNITY</Text>
        {/* "+" button opens the CreatePost screen */}
        <TouchableOpacity style={styles.createBtn} onPress={handleCreatePost}>
          <Text style={styles.createBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ── Faith Banner ── */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>💬</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Share Your Journey</Text>
          <Text style={styles.bannerSub}>Encourage one another and build each other up</Text>
        </View>
      </View>

      {/* ── Category Filter Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map(filter => {
          const cfg = CATEGORY_CONFIG[filter] || CATEGORY_CONFIG['default'];
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              // Active pill uses the category's accent colour (blue for 'All')
              style={[styles.filterPill, isActive && { backgroundColor: filter === 'All' ? '#4A9EFF' : cfg.color }]}
              onPress={() => setActiveFilter(filter)}
            >
              {filter !== 'All' && <Text style={styles.filterIcon}>{cfg.icon}</Text>}
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Post Feed ── */}
      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Pull-to-refresh reloads posts from the API
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadPosts(); }}
            tintColor="#4A9EFF"
            colors={['#4A9EFF']}
          />
        }
      >
        {filteredPosts.length === 0 ? (

          /* ── Empty State ── */
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'All' ? 'No Posts Yet' : `No ${activeFilter} posts yet`}
            </Text>
            <Text style={styles.emptyText}>Be the first to share with the community!</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleCreatePost}>
              <Text style={styles.emptyBtnText}>+ Create Post</Text>
            </TouchableOpacity>
          </View>

        ) : (

          /* ── Post Cards ── */
          filteredPosts.map(post => {
            const cfg     = CATEGORY_CONFIG[post.category] || CATEGORY_CONFIG['default'];
            const isLiked = user?.id ? post.likes.includes(user.id) : false;
            const initials = post.username.charAt(0).toUpperCase(); // avatar letter

            return (
              <View key={post._id} style={[styles.postCard, { borderTopColor: cfg.color }]}>

                {/* Post Header: avatar + username + category badge */}
                <View style={styles.postHeader}>
                  {/* Coloured circle avatar using first letter of username */}
                  <View style={[styles.avatar, { backgroundColor: cfg.color + '30' }]}>
                    <Text style={[styles.avatarText, { color: cfg.color }]}>{initials}</Text>
                  </View>
                  <View style={styles.postMeta}>
                    <Text style={styles.username}>{post.username}</Text>
                    <Text style={styles.timestamp}>{getTimeAgo(post.createdAt)}</Text>
                  </View>
                  {/* Category badge in top-right of card */}
                  <View style={[styles.categoryPill, { backgroundColor: cfg.color + '20' }]}>
                    <Text style={styles.categoryPillIcon}>{cfg.icon}</Text>
                    <Text style={[styles.categoryPillText, { color: cfg.color }]}>{post.category}</Text>
                  </View>
                </View>

                {/* Post body text */}
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Like + Comment action buttons */}
                <View style={styles.postActions}>
                  {/* Like button — turns red if current user has already liked */}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post._id)}>
                    <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
                    <Text style={[styles.actionText, isLiked && { color: '#FF6B6B' }]}>
                      {post.likes.length} {post.likes.length === 1 ? 'Like' : 'Likes'}
                    </Text>
                  </TouchableOpacity>

                  {/* Comment button — navigates to PostDetail screen */}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('PostDetail', {
                      post,
                      // Callback updates this post in the feed when comments change
                      onUpdate: (updated: Post) => setPosts(posts.map(p => p._id === updated._id ? updated : p)),
                    })}
                  >
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionText}>
                      {post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}

        {/* Bottom padding so last card isn't hidden behind tab bar */}
        <View style={{ height: 100 }} />
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
  createBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#4A9EFF', alignItems: 'center', justifyContent: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32 },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f3c', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  bannerIcon: { fontSize: 28, marginRight: 14 },
  bannerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  bannerSub: { color: '#5a7fa8', fontSize: 12 },

  filterBar: {
    backgroundColor: '#0d1f3c',
    borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
    maxHeight: 52,
  },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#1a3a6b',
    gap: 4,
  },
  filterIcon: { fontSize: 13 },
  filterText: { color: '#5a7fa8', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#fff' },

  feed: { flex: 1 },
  feedContent: { padding: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: '#5a7fa8', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#4A9EFF', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  postCard: {
    backgroundColor: '#0d1f3c', borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderTopWidth: 3, elevation: 4,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  postMeta: { flex: 1 },
  username: { color: '#fff', fontSize: 15, fontWeight: '700' },
  timestamp: { color: '#5a7fa8', fontSize: 12, marginTop: 2 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, gap: 4,
  },
  categoryPillIcon: { fontSize: 12 },
  categoryPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  postContent: { color: '#c8d8f0', fontSize: 15, lineHeight: 24, marginBottom: 14 },

  postActions: {
    flexDirection: 'row', gap: 20,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1a3a6b',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 16 },
  actionText: { color: '#5a7fa8', fontSize: 13, fontWeight: '600' },
});