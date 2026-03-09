import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { profileAPI, uploadAPI, authAPI } from '../services/api';
import { pickImage, convertImageToBase64 } from '../utils/imagePicker';

// Emoji options shown in the avatar picker (used when no photo is set)
const AVATARS = ['👤', '😊', '💪', '🔥', '⚡', '🙏', '✨', '🎯', '🏃', '🏋️', '🤸', '🧘'];

// Selectable fitness goal options
const FITNESS_GOALS = ['Weight Loss', 'Muscle Gain', 'Maintenance', 'General Fitness', 'Athletic Performance'];

// Body measurement fields shown when gender is set to Male
const MALE_MEASUREMENTS = [
  { key: 'chest',       label: 'Chest',        icon: '📏' },
  { key: 'shoulders',   label: 'Shoulders',    icon: '📏' },
  { key: 'waist',       label: 'Waist',        icon: '📏' },
  { key: 'hips',        label: 'Hips',         icon: '📏' },
  { key: 'bicepLeft',   label: 'Bicep (L)',    icon: '💪' },
  { key: 'bicepRight',  label: 'Bicep (R)',    icon: '💪' },
  { key: 'thighLeft',   label: 'Thigh (L)',    icon: '📏' },
  { key: 'thighRight',  label: 'Thigh (R)',    icon: '📏' },
  { key: 'calfLeft',    label: 'Calf (L)',     icon: '📏' },
  { key: 'calfRight',   label: 'Calf (R)',     icon: '📏' },
  { key: 'neck',        label: 'Neck',         icon: '📏' },
  { key: 'forearm',     label: 'Forearm',      icon: '💪' },
];

// Body measurement fields shown when gender is set to Female
const FEMALE_MEASUREMENTS = [
  { key: 'bust',        label: 'Bust',         icon: '📏' },
  { key: 'underBust',   label: 'Under Bust',   icon: '📏' },
  { key: 'waist',       label: 'Waist',        icon: '📏' },
  { key: 'hips',        label: 'Hips',         icon: '📏' },
  { key: 'thighLeft',   label: 'Thigh (L)',    icon: '📏' },
  { key: 'thighRight',  label: 'Thigh (R)',    icon: '📏' },
  { key: 'calfLeft',    label: 'Calf (L)',     icon: '📏' },
  { key: 'calfRight',   label: 'Calf (R)',     icon: '📏' },
  { key: 'bicepLeft',   label: 'Bicep (L)',    icon: '💪' },
  { key: 'bicepRight',  label: 'Bicep (R)',    icon: '💪' },
  { key: 'neck',        label: 'Neck',         icon: '📏' },
  { key: 'shoulders',   label: 'Shoulders',    icon: '📏' },
];

// Password validation rules — each has a label and a test function
const PASSWORD_RULES = [
  { label: 'At least 9 characters',  test: (p: string) => p.length >= 9 },
  { label: 'One uppercase letter',   test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',             test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const EditProfileScreen = ({ route, navigation }: any) => {
  const { profile } = route.params || {};

  // ── Profile field state (pre-filled from existing profile) ────────────────
  const [avatar, setAvatar]               = useState(profile?.avatar || '👤');
  const [profilePicture, setProfilePicture] = useState(profile?.profilePicture || null);
  const [bio, setBio]                     = useState(profile?.bio || '');
  const [fitnessGoal, setFitnessGoal]     = useState(profile?.fitnessGoal || 'General Fitness');
  const [currentWeight, setCurrentWeight] = useState(profile?.currentWeight?.toString() || '');
  const [targetWeight, setTargetWeight]   = useState(profile?.targetWeight?.toString() || '');
  const [height, setHeight]               = useState(profile?.height?.toString() || '');
  const [weightUnit, setWeightUnit]       = useState(profile?.weightUnit || 'kg');
  const [heightUnit, setHeightUnit]       = useState(profile?.heightUnit || 'cm');
  const [loading, setLoading]             = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false); // separate from main loading so spinner is localised

  // ── Body measurement state ────────────────────────────────────────────────
  const [gender, setGender]           = useState<'male' | 'female'>(profile?.gender || 'male');
  const [measureUnit, setMeasureUnit] = useState<'cm' | 'inches'>('cm');
  // Key-value map of measurement name → value string, e.g. { waist: '80', chest: '100' }
  const [measurements, setMeasurements] = useState<Record<string, string>>(
    profile?.measurements || {}
  );

  // ── Change password modal state ───────────────────────────────────────────
  const [passwordVisible, setPasswordVisible]   = useState(false);
  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showCurrentPw, setShowCurrentPw]       = useState(false); // toggles password visibility
  const [showNewPw, setShowNewPw]               = useState(false);
  const [showConfirmPw, setShowConfirmPw]       = useState(false);
  const [passwordLoading, setPasswordLoading]   = useState(false);
  const [passwordError, setPasswordError]       = useState('');

  // Switches measurement fields based on selected gender
  const activeMeasurements = gender === 'male' ? MALE_MEASUREMENTS : FEMALE_MEASUREMENTS;

  // ── Image Handlers ────────────────────────────────────────────────────────

  // Picks an image from camera or gallery, converts to base64, and uploads it
  const handlePickImage = async (fromCamera: boolean) => {
    try {
      const uri = await pickImage(fromCamera);
      if (uri) {
        setUploadingPhoto(true);
        const base64 = await convertImageToBase64(uri);
        if (base64) {
          const updatedUser = await uploadAPI.uploadProfilePicture(profile._id, base64);
          setProfilePicture(base64); // show new photo immediately without re-fetching
          Alert.alert('Success', 'Profile picture uploaded!');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Prompts for confirmation before removing the profile picture from the server
  const handleRemovePhoto = async () => {
    Alert.alert('Remove Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            setUploadingPhoto(true);
            const updatedUser = await uploadAPI.removeProfilePicture(profile._id);
            setProfilePicture(null); // revert to emoji avatar
          } catch {
            Alert.alert('Error', 'Failed to remove photo');
          } finally {
            setUploadingPhoto(false);
          }
        }
      }
    ]);
  };

  // Shows an action sheet with camera / gallery / remove options
  const showImageOptions = () => {
    Alert.alert('Profile Picture', 'Choose an option', [
      { text: 'Take Photo',           onPress: () => handlePickImage(true) },
      { text: 'Choose from Gallery',  onPress: () => handlePickImage(false) },
      // Only show Remove option if a photo is currently set
      ...(profilePicture ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: handleRemovePhoto }] : []),
      { text: 'Cancel', style: 'cancel' as const }
    ]);
  };

  // ── Save Profile ──────────────────────────────────────────────────────────

  // Builds the update payload and sends it to the API
  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = {
        avatar, bio: bio.trim(), fitnessGoal,
        currentWeight: currentWeight ? parseFloat(currentWeight) : null,
        targetWeight:  targetWeight  ? parseFloat(targetWeight)  : null,
        height:        height        ? parseFloat(height)        : null,
        weightUnit, heightUnit,
        gender,
        measurements,
        measureUnit,
      };
      const updatedProfile = await profileAPI.updateProfile(profile._id, updates);
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // ── Change Password ───────────────────────────────────────────────────────

  // Validates all password rules before submitting to the auth API
  const handleChangePassword = async () => {
    setPasswordError('');
    if (!currentPassword)                               { setPasswordError('Please enter your current password.'); return; }
    if (!PASSWORD_RULES.every(r => r.test(newPassword))) { setPasswordError('New password does not meet requirements.'); return; }
    if (newPassword !== confirmPassword)                 { setPasswordError('Passwords do not match.'); return; }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword(profile._id, currentPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully!');
      setPasswordVisible(false);
      // Clear all password fields after success
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.error || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Header: Cancel / Title / Save ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && { opacity: 0.4 }]}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Profile Picture ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFILE PICTURE</Text>
          <View style={styles.photoContainer}>
            {/* Tapping the circle opens the image options action sheet */}
            <TouchableOpacity style={styles.photoCircle} onPress={showImageOptions} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <ActivityIndicator size="large" color="#4A9EFF" />
              ) : profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.profileImage} />
              ) : (
                // Fall back to emoji avatar if no photo is set
                <Text style={styles.photoPlaceholder}>{avatar}</Text>
              )}
            </TouchableOpacity>
            {/* Individual shortcut buttons for Camera / Gallery / Remove */}
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={() => handlePickImage(true)} disabled={uploadingPhoto}>
                <Text style={styles.photoButtonIcon}>📷</Text>
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={() => handlePickImage(false)} disabled={uploadingPhoto}>
                <Text style={styles.photoButtonIcon}>🖼️</Text>
                <Text style={styles.photoButtonText}>Gallery</Text>
              </TouchableOpacity>
              {/* Remove button only shown when a photo exists */}
              {profilePicture && (
                <TouchableOpacity style={[styles.photoButton, styles.removeButton]} onPress={handleRemovePhoto} disabled={uploadingPhoto}>
                  <Text style={styles.photoButtonIcon}>🗑️</Text>
                  <Text style={styles.photoButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── Avatar Emoji Picker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AVATAR EMOJI</Text>
          <Text style={styles.sectionSubtitle}>Shown when no photo is set</Text>
          <View style={styles.avatarsGrid}>
            {AVATARS.map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.avatarOption, avatar === item && styles.avatarOptionSelected]}
                onPress={() => setAvatar(item)}
              >
                <Text style={styles.avatarOptionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Bio / Testimony ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BIO / TESTIMONY</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share your fitness journey and faith..."
            placeholderTextColor="#5a7fa8"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{bio.length}/500</Text>
        </View>

        {/* ── Fitness Goal ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FITNESS GOAL</Text>
          <View style={styles.goalsGrid}>
            {FITNESS_GOALS.map(goal => (
              <TouchableOpacity
                key={goal}
                style={[styles.goalOption, fitnessGoal === goal && styles.goalOptionSelected]}
                onPress={() => setFitnessGoal(goal)}
              >
                <Text style={[styles.goalOptionText, fitnessGoal === goal && styles.goalOptionTextSelected]}>
                  {goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Weight (current + target, with kg/lbs toggle) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEIGHT</Text>
          <View style={styles.unitToggle}>
            {['kg', 'lbs'].map(u => (
              <TouchableOpacity key={u} style={[styles.unitButton, weightUnit === u && styles.unitButtonActive]} onPress={() => setWeightUnit(u)}>
                <Text style={[styles.unitButtonText, weightUnit === u && styles.unitButtonTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#5a7fa8" value={currentWeight} onChangeText={setCurrentWeight} keyboardType="decimal-pad" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#5a7fa8" value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" />
            </View>
          </View>
        </View>

        {/* ── Height (with cm/inches toggle) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HEIGHT</Text>
          <View style={styles.unitToggle}>
            {['cm', 'inches'].map(u => (
              <TouchableOpacity key={u} style={[styles.unitButton, heightUnit === u && styles.unitButtonActive]} onPress={() => setHeightUnit(u)}>
                <Text style={[styles.unitButtonText, heightUnit === u && styles.unitButtonTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="0" placeholderTextColor="#5a7fa8" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
        </View>

        {/* ── Body Measurements ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BODY MEASUREMENTS</Text>

          {/* Gender toggle — switches which measurement fields are shown */}
          <View style={styles.genderToggle}>
            <TouchableOpacity style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]} onPress={() => setGender('male')}>
              <Text style={[styles.genderButtonText, gender === 'male' && styles.genderButtonTextActive]}>♂ Male</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]} onPress={() => setGender('female')}>
              <Text style={[styles.genderButtonText, gender === 'female' && styles.genderButtonTextActive]}>♀ Female</Text>
            </TouchableOpacity>
          </View>

          {/* Measurement unit toggle (cm / inches) */}
          <View style={[styles.unitToggle, { marginBottom: spacing.lg }]}>
            {['cm', 'inches'].map(u => (
              <TouchableOpacity key={u} style={[styles.unitButton, measureUnit === u && styles.unitButtonActive]} onPress={() => setMeasureUnit(u as 'cm' | 'inches')}>
                <Text style={[styles.unitButtonText, measureUnit === u && styles.unitButtonTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 2-column grid of measurement inputs — fields depend on selected gender */}
          <View style={styles.measureGrid}>
            {activeMeasurements.map(m => (
              <View key={m.key} style={styles.measureField}>
                <Text style={styles.measureLabel}>{m.icon} {m.label}</Text>
                <View style={styles.measureInputRow}>
                  <TextInput
                    style={styles.measureInput}
                    placeholder="0"
                    placeholderTextColor="#2a4a7f"
                    value={measurements[m.key] || ''}
                    // Merges the updated field into the measurements object without overwriting others
                    onChangeText={v => setMeasurements(prev => ({ ...prev, [m.key]: v }))}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.measureUnit}>{measureUnit}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Security: Change Password ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY</Text>
          <TouchableOpacity style={styles.securityRow} onPress={() => setPasswordVisible(true)}>
            <Text style={styles.securityIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityRowText}>Change Password</Text>
              <Text style={styles.securityRowSub}>Update your account password</Text>
            </View>
            <Text style={styles.securityChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding so last section clears the keyboard */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Full-screen loading overlay shown while saving the profile */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A9EFF" />
        </View>
      )}

      {/* ── Change Password Bottom Sheet Modal ── */}
      <Modal visible={passwordVisible} transparent animationType="slide" onRequestClose={() => setPasswordVisible(false)}>
        {/* Tapping the dark overlay dismisses the modal */}
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPasswordVisible(false)}>
          {/* Inner card is not tappable so it doesn't dismiss when tapped */}
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>CHANGE PASSWORD</Text>

            {/* Current password input with show/hide toggle */}
            <Text style={styles.pwLabel}>Current Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={styles.pwInput}
                placeholder="Enter current password"
                placeholderTextColor="#5a7fa8"
                value={currentPassword}
                onChangeText={v => { setCurrentPassword(v); setPasswordError(''); }}
                secureTextEntry={!showCurrentPw}
              />
              <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)} style={styles.eyeBtn}>
                <Text>{showCurrentPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* New password input with show/hide toggle */}
            <Text style={styles.pwLabel}>New Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={styles.pwInput}
                placeholder="Enter new password"
                placeholderTextColor="#5a7fa8"
                value={newPassword}
                onChangeText={v => { setNewPassword(v); setPasswordError(''); }}
                secureTextEntry={!showNewPw}
              />
              <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)} style={styles.eyeBtn}>
                <Text>{showNewPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Live password rule checklist — only shown once typing starts */}
            {newPassword.length > 0 && (
              <View style={styles.rulesCard}>
                {PASSWORD_RULES.map((rule, i) => {
                  const passed = rule.test(newPassword);
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      {/* Green tick if rule passes, grey circle if not */}
                      <Text style={{ color: passed ? '#26de81' : '#2a4a7f', marginRight: 8, fontWeight: '800' }}>{passed ? '✓' : '○'}</Text>
                      <Text style={{ color: passed ? '#26de81' : '#5a7fa8', fontSize: 12 }}>{rule.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Confirm password input with show/hide toggle */}
            <Text style={styles.pwLabel}>Confirm New Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={styles.pwInput}
                placeholder="Confirm new password"
                placeholderTextColor="#5a7fa8"
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); setPasswordError(''); }}
                secureTextEntry={!showConfirmPw}
              />
              <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)} style={styles.eyeBtn}>
                <Text>{showConfirmPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Error message shown if validation fails or API returns an error */}
            {!!passwordError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {passwordError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.pwSaveButton, passwordLoading && { opacity: 0.5 }]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.pwSaveButtonText}>Update Password</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setPasswordVisible(false)}>
              <Text style={{ color: '#5a7fa8', textAlign: 'center', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 50, paddingBottom: spacing.md,
    backgroundColor: '#0d1f3c',
    borderBottomWidth: 1, borderBottomColor: '#1a3a6b',
  },
  cancelButton: { fontSize: 16, color: '#8ab4f8' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  saveButton: { fontSize: 16, color: '#4A9EFF', fontWeight: '700' },

  content: { flex: 1 },

  section: {
    padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: '#0d1f3c',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 2,
    color: '#5a7fa8', marginBottom: spacing.md,
  },
  sectionSubtitle: { fontSize: 13, color: '#5a7fa8', marginBottom: spacing.md },

  // Profile photo
  photoContainer: { alignItems: 'center' },
  photoCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#0d1f3c', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg, borderWidth: 3, borderColor: '#4A9EFF', overflow: 'hidden',
  },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { fontSize: 52 },
  photoButtons: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  photoButton: {
    alignItems: 'center', padding: spacing.md,
    backgroundColor: '#0d1f3c', borderRadius: borderRadius.small, minWidth: 80,
    borderWidth: 1, borderColor: '#1a3a6b',
  },
  removeButton: { borderColor: '#FF6B6B44' },
  photoButtonIcon: { fontSize: 22, marginBottom: 4 },
  photoButtonText: { fontSize: 12, color: '#8ab4f8', fontWeight: '600' },

  // Emoji avatar picker grid
  avatarsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  avatarOption: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#0d1f3c', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarOptionSelected: { borderColor: '#4A9EFF', backgroundColor: '#4A9EFF22' },
  avatarOptionText: { fontSize: 28 },

  // Bio text area
  textArea: {
    backgroundColor: '#0d1f3c', borderRadius: borderRadius.small,
    padding: spacing.md, fontSize: 15, minHeight: 100,
    textAlignVertical: 'top', color: '#fff',
    borderWidth: 1, borderColor: '#1a3a6b',
  },
  characterCount: { fontSize: 12, color: '#5a7fa8', textAlign: 'right', marginTop: 6 },

  // Fitness goal selector
  goalsGrid: { gap: spacing.sm },
  goalOption: {
    backgroundColor: '#0d1f3c', padding: spacing.md,
    borderRadius: borderRadius.small, borderWidth: 2, borderColor: '#1a3a6b',
  },
  goalOptionSelected: { borderColor: '#4A9EFF', backgroundColor: '#4A9EFF15' },
  goalOptionText: { fontSize: 15, color: '#8ab4f8', textAlign: 'center' },
  goalOptionTextSelected: { fontWeight: '700', color: '#4A9EFF' },

  // Shared unit toggle (kg/lbs, cm/inches)
  unitToggle: {
    flexDirection: 'row', marginBottom: spacing.md,
    backgroundColor: '#0d1f3c', borderRadius: borderRadius.small,
    padding: 4, borderWidth: 1, borderColor: '#1a3a6b',
  },
  unitButton: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.small },
  unitButtonActive: { backgroundColor: '#4A9EFF' },
  unitButtonText: { fontSize: 14, fontWeight: '600', color: '#5a7fa8' },
  unitButtonTextActive: { color: '#fff' },

  // Numeric inputs (weight, height)
  inputRow: { flexDirection: 'row', gap: spacing.md },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 13, color: '#5a7fa8', marginBottom: 6 },
  input: {
    backgroundColor: '#0d1f3c', borderRadius: borderRadius.small,
    padding: spacing.md, fontSize: 16, color: '#fff',
    borderWidth: 1, borderColor: '#1a3a6b',
  },

  // Gender toggle (Male / Female)
  genderToggle: {
    flexDirection: 'row', marginBottom: spacing.md,
    backgroundColor: '#0d1f3c', borderRadius: borderRadius.small,
    padding: 4, borderWidth: 1, borderColor: '#1a3a6b',
  },
  genderButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: borderRadius.small },
  genderButtonActive: { backgroundColor: '#4A9EFF' },
  genderButtonText: { fontSize: 15, fontWeight: '700', color: '#5a7fa8' },
  genderButtonTextActive: { color: '#fff' },

  // 2-column measurement input grid
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  measureField: { width: '47%' },
  measureLabel: { fontSize: 12, color: '#8ab4f8', marginBottom: 6, fontWeight: '600' },
  measureInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f3c', borderRadius: borderRadius.small,
    borderWidth: 1, borderColor: '#1a3a6b', overflow: 'hidden',
  },
  measureInput: { flex: 1, padding: 10, fontSize: 15, color: '#fff' },
  measureUnit: { paddingHorizontal: 10, color: '#5a7fa8', fontSize: 12, fontWeight: '600' },

  // Security / change password row
  securityRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f3c', borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: '#1a3a6b', gap: 12,
  },
  securityIcon: { fontSize: 22 },
  securityRowText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  securityRowSub: { fontSize: 12, color: '#5a7fa8', marginTop: 2 },
  securityChevron: { fontSize: 22, color: '#5a7fa8' },

  // Full-screen semi-transparent overlay shown during save
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Change password bottom sheet modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0a1628', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 44,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#1a3a6b',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 2,
    color: '#5a7fa8', textAlign: 'center', marginBottom: 20,
  },
  pwLabel: { fontSize: 13, color: '#8ab4f8', marginBottom: 6, marginTop: 12, fontWeight: '600' },
  pwRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f3c', borderRadius: borderRadius.small,
    borderWidth: 1, borderColor: '#1a3a6b',
  },
  pwInput: { flex: 1, padding: spacing.md, fontSize: 15, color: '#fff' },
  eyeBtn: { paddingHorizontal: 14 },
  rulesCard: {
    backgroundColor: '#0d1f3c', borderRadius: 10, padding: 12, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  errorBox: {
    backgroundColor: '#FF6B6B22', borderRadius: 10, padding: 12, marginTop: 12,
    borderLeftWidth: 3, borderLeftColor: '#FF6B6B',
  },
  errorText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },
  pwSaveButton: {
    backgroundColor: '#4A9EFF', borderRadius: borderRadius.small,
    padding: spacing.md, alignItems: 'center', marginTop: 20, minHeight: 50, justifyContent: 'center',
  },
  pwSaveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});