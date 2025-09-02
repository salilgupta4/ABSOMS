import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, Snackbar } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/theme';
import { wp, hp, getLayoutConfig } from '../../utils/responsive';

const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { signIn, isLoading } = useAuth();
  const styles = createThemedStyles(theme);
  const layoutConfig = getLayoutConfig();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      setShowError(true);
      return;
    }

    const result = await signIn(email.trim(), password);
    
    if (!result.success) {
      setError(result.error || 'Login failed');
      setShowError(true);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={localStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={localStyles.content}>
          {/* Logo/Title */}
          <View style={localStyles.header}>
            <Text style={[styles.heading1, localStyles.title]}>
              ABS OMS
            </Text>
            <Text style={[styles.bodyText, localStyles.subtitle]}>
              Mobile Access
            </Text>
          </View>

          {/* Login Form */}
          <Card style={[styles.card, localStyles.loginCard]}>
            <Card.Content>
              <Text style={[styles.heading3, localStyles.formTitle]}>
                Sign In
              </Text>

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={localStyles.input}
                mode="outlined"
                disabled={isLoading}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                style={localStyles.input}
                mode="outlined"
                disabled={isLoading}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={localStyles.loginButton}
                contentStyle={localStyles.loginButtonContent}
              >
                Sign In
              </Button>
            </Card.Content>
          </Card>

          {/* Footer */}
          <View style={localStyles.footer}>
            <Text style={[styles.captionText, localStyles.footerText]}>
              Access your business data anywhere, anytime
            </Text>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={4000}
        style={{ backgroundColor: theme.colors.errorContainer }}
      >
        <Text style={{ color: theme.colors.onErrorContainer }}>
          {error}
        </Text>
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const localStyles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(8),
    justifyContent: 'center',
    minHeight: hp(80),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(4),
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  loginCard: {
    marginVertical: hp(2),
    maxWidth: wp(90),
    alignSelf: 'center',
    width: '100%',
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: hp(2),
  },
  input: {
    marginBottom: hp(2),
  },
  loginButton: {
    marginTop: hp(1),
  },
  loginButtonContent: {
    paddingVertical: hp(0.5),
  },
  footer: {
    alignItems: 'center',
    marginTop: hp(4),
  },
  footerText: {
    textAlign: 'center',
  },
});

export default LoginScreen;