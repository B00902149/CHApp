import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Max consecutive failed logins before the form is locked
const MAX_ATTEMPTS = 3;

// Password validation rules — each has a label shown in the live checklist
const PASSWORD_RULES = [
  { label: 'At least 9 characters',          test: (p: string) => p.length >= 9 },
  { label: 'One uppercase letter',            test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',                      test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$etc)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// Returns true only if all password rules pass
const validatePassword = (p: string) => PASSWORD_RULES.every(r => r.test(p));

export const LoginScreen = ({ navigation }: any) => {
  const { login: saveAuth } = useAuth(); // saves token + user to auth context after login
  const scrollRef = useRef<ScrollView>(null);

  // Toggles between Login and Sign Up views
  const [isSignUp, setIsSignUp] = useState(false);

  // ── Form field state ──────────────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname]     = useState('');
  const [username, setUsername]   = useState('');
  const [country, setCountry]     = useState('');
  const [mobile, setMobile]       = useState('');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showPassword, setShowPassword]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false); // triggers live rule checklist

  // ── Login error / lockout state ───────────────────────────────────────────
  const [loginError, setLoginError] = useState('');
  const [attempts, setAttempts]     = useState(0);   // tracks consecutive failed login attempts
  const [locked, setLocked]         = useState(false); // locks form after MAX_ATTEMPTS failures

  // ── Forgot password modal state ───────────────────────────────────────────
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail]       = useState('');
  const [resetSent, setResetSent]         = useState(false);   // shows success message after sending
  const [resetLoading, setResetLoading]   = useState(false);

  // Clears all form fields and resets error/lockout state (used when switching modes)
  const resetFields = () => {
    setEmail(''); setPassword(''); setFirstName(''); setSurname('');
    setUsername(''); setCountry(''); setMobile('');
    setLoginError(''); setAttempts(0); setLocked(false);
  };

  // Submits login credentials; increments attempt counter on failure and locks after MAX_ATTEMPTS
  const handleLogin = async () => {
    if (locked) return;
    if (!email || !password) { setLoginError('Please enter your email and password.'); return; }
    setLoading(true);
    setLoginError('');
    try {
      const data = await authAPI.login(email, password);
      if (data?.token && data?.user) {
        setAttempts(0);
        await saveAuth(data.token, data.user); // persists auth and navigates away
      } else {
        setLoginError('Server response was incomplete.');
      }
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setLoginError('Too many failed attempts. Please reset your password.');
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        setLoginError(`Incorrect email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Validates required fields and password strength before registering a new account
  const handleSignUp = async () => {
    if (!firstName || !surname || !email || !username || !password || !country) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert('Weak Password', 'Please meet all password requirements.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register(email, username, password, firstName, surname, country, mobile);
      Alert.alert('Success', 'Account created! Please log in.');
      setIsSignUp(false); // switch back to login view
      resetFields();
    } catch (err: any) {
      Alert.alert('Error', err?.error || err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Sends a password reset email — always shows success to avoid revealing whether the email exists
  const handleForgotPassword = async () => {
    if (!resetEmail) { Alert.alert('Error', 'Please enter your email address.'); return; }
    setResetLoading(true);
    try {
      await authAPI.forgotPassword(resetEmail);
    } catch (_) {
      // Fail silently — don't reveal whether the email address is registered
    } finally {
      setResetLoading(false);
      setResetSent(true); // always show the success message
    }
  };

  // Show live password rule checklist only during sign up when password field is active or has content
  const showRules = isSignUp && (passwordFocused || password.length > 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── App Logo + Tagline ── */}
        <View style={styles.header}>
          <Image source={require('../../assets/mainlogo.png')} style={styles.logo} resizeMode="cover" />
          <Text style={styles.tagline}>One Hub. Infinite Possibilities.</Text>
        </View>

        <View style={styles.form}>

          {/* ── Sign Up Only: First Name + Surname (side by side) ── */}
          {isSignUp && (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="First Name *"
                placeholderTextColor={colors.text.secondary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                editable={!loading}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Surname *"
                placeholderTextColor={colors.text.secondary}
                value={surname}
                onChangeText={setSurname}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          )}

          {/* Email — clears error on change; disabled when locked out */}
          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor={colors.text.secondary}
            value={email}
            onChangeText={v => { setEmail(v); setLoginError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading && !locked}
          />

          {/* ── Sign Up Only: Username ── */}
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Username *"
              placeholderTextColor={colors.text.secondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />
          )}

          {/* Password with show/hide toggle — locked state dims the row */}
          <View style={[styles.passwordRow, locked && styles.inputLocked]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password *"
              placeholderTextColor={colors.text.secondary}
              value={password}
              onChangeText={v => { setPassword(v); setLoginError(''); }}
              secureTextEntry={!showPassword}
              editable={!loading && !locked}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Login error / lockout message */}
          {!!loginError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          )}

          {/* Live password rule checklist — shown in sign up mode when typing */}
          {showRules && (
            <View style={styles.rulesCard}>
              {PASSWORD_RULES.map((rule, i) => {
                const passed = rule.test(password);
                return (
                  <View key={i} style={styles.ruleRow}>
                    {/* Green tick when rule passes, grey circle when not */}
                    <Text style={[styles.ruleIcon, passed && styles.ruleIconPass]}>{passed ? '✓' : '○'}</Text>
                    <Text style={[styles.ruleText, passed && styles.ruleTextPass]}>{rule.label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Sign Up Only: Country + Mobile + required note ── */}
          {isSignUp && (
            <>
              {/* Scrolls to end after focus so the input isn't hidden by the keyboard */}
              <TextInput
                style={styles.input}
                placeholder="Country *"
                placeholderTextColor={colors.text.secondary}
                value={country}
                onChangeText={setCountry}
                autoCapitalize="words"
                editable={!loading}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
              />
              <TextInput
                style={styles.input}
                placeholder="Mobile Number (optional)"
                placeholderTextColor={colors.text.secondary}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                editable={!loading}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
              />
              <Text style={styles.requiredNote}>* Required fields</Text>
            </>
          )}

          {/* Primary action button — Log In or Sign Up depending on mode */}
          <TouchableOpacity
            style={[styles.button, (loading || locked) && styles.buttonDisabled]}
            onPress={isSignUp ? handleSignUp : handleLogin}
            disabled={loading || locked}
          >
            {loading
              ? <ActivityIndicator color={colors.text.white} />
              : <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
            }
          </TouchableOpacity>

          {/* Forgot password link — only shown on login view */}
          {!isSignUp && (
            <TouchableOpacity
              onPress={() => { setForgotVisible(true); setResetSent(false); setResetEmail(''); }}
              disabled={loading}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Toggle between Login and Sign Up */}
          <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); resetFields(); }} disabled={loading}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Forgot Password Bottom Sheet Modal ── */}
      <Modal visible={forgotVisible} transparent animationType="slide" onRequestClose={() => setForgotVisible(false)}>
        {/* Tapping outside the sheet dismisses it */}
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setForgotVisible(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>RESET PASSWORD</Text>

            {/* After sending: show confirmation message */}
            {resetSent ? (
              <>
                <Text style={styles.resetSuccessIcon}>📧</Text>
                <Text style={styles.resetSuccessText}>
                  If an account exists for that email, a reset link has been sent.
                </Text>
                <TouchableOpacity style={styles.button} onPress={() => setForgotVisible(false)}>
                  <Text style={styles.buttonText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Before sending: show email input and send button */
              <>
                <Text style={styles.resetHint}>Enter your email and we'll send you a reset link.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.text.secondary}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.button, resetLoading && styles.buttonDisabled]}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Send Reset Link</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setForgotVisible(false)}>
                  <Text style={[styles.forgotText, { textAlign: 'center' }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: colors.primary.dark, padding: spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center' },
  logo: { width: '100%', height: 120, marginBottom: 24 },
  tagline: { color: '#fff', fontSize: 14, letterSpacing: 1.5, textAlign: 'center', marginBottom: 32, fontStyle: 'italic' },
  form: { marginBottom: spacing.xl },
  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: borderRadius.small,
    padding: spacing.md, marginBottom: spacing.md, fontSize: 16, color: colors.text.primary,
  },
  inputLocked: { opacity: 0.5 },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.small, marginBottom: spacing.md,
  },
  passwordInput: { flex: 1, padding: spacing.md, fontSize: 16, color: colors.text.primary },
  eyeBtn: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },

  // Error / lockout message box
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF6B6B22', borderRadius: 10,
    padding: 12, marginBottom: spacing.md,
    borderLeftWidth: 3, borderLeftColor: '#FF6B6B', gap: 8,
  },
  errorIcon: { fontSize: 16 },
  errorText: { flex: 1, color: '#FF6B6B', fontSize: 13, fontWeight: '600' },

  // Live password rule checklist
  rulesCard: {
    backgroundColor: '#0d1f3c', borderRadius: 12,
    padding: 14, marginBottom: spacing.md,
    borderLeftWidth: 3, borderLeftColor: '#4A9EFF',
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ruleIcon: { color: '#2a4a7f', fontSize: 14, fontWeight: '800', marginRight: 10, width: 16 },
  ruleIconPass: { color: '#26de81' },
  ruleText: { color: '#5a7fa8', fontSize: 13 },
  ruleTextPass: { color: '#26de81' },

  requiredNote: { color: '#5a7fa8', fontSize: 12, marginBottom: spacing.md, marginTop: -8 },

  button: {
    backgroundColor: colors.accent.blue, borderRadius: borderRadius.small,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
    minHeight: 50, justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.text.white, fontSize: 16, fontWeight: 'bold' },
  forgotText: { color: '#8ab4f8', textAlign: 'center', marginTop: spacing.md, fontSize: 14 },
  switchText: { color: colors.text.white, textAlign: 'center', marginTop: spacing.sm, fontSize: 14 },

  // Forgot password bottom sheet modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.primary.dark, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 44,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#1a3a6b', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#5a7fa8', fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginBottom: 16 },
  resetHint: { color: '#8ab4f8', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  resetSuccessIcon: { fontSize: 48, textAlign: 'center', marginVertical: 16 },
  resetSuccessText: { color: '#26de81', fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
});