import React, { useState, useEffect } from 'react';
import { View, Text, StatusBar, LogBox, Alert } from 'react-native';
import { PaperProvider, configureFonts, Button, TextInput } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';

// Firebase imports
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Ignore specific warnings for development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'RCTBridge required dispatch_sync',
]);

// Simple font configuration
const fontConfig = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

const fonts = configureFonts({ config: fontConfig });

const theme = {
  fonts,
  colors: {
    primary: '#1976d2',
    onPrimary: '#ffffff',
    primaryContainer: '#e3f2fd',
    onPrimaryContainer: '#1976d2',
    surface: '#ffffff',
    onSurface: '#212121',
    background: '#fafafa',
    onBackground: '#212121',
    error: '#f44336',
    onError: '#ffffff',
    errorContainer: '#ffebee',
    onErrorContainer: '#c62828',
    outline: '#e0e0e0',
    shadow: '#000000',
  },
};

const FirebaseLoginScreen: React.FC = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Firebase Authentication Ready');

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        setMessage(`✅ Logged in as: ${user.email}`);
      } else {
        setMessage('📝 Please sign in to continue');
      }
    });

    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage('❌ Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      setMessage('🔄 Authenticating with Firebase...');
      
      // Sign in with Firebase Auth
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      
      setMessage(`✅ Successfully authenticated: ${firebaseUser.email}`);
      
      // Test Firestore connection
      try {
        const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          setMessage(`🎉 User profile loaded: ${userData.displayName || userData.email}`);
        } else {
          setMessage(`⚠️ Authenticated but no user profile found in Firestore`);
        }
      } catch (firestoreError) {
        setMessage(`✅ Authenticated, but Firestore error: ${firestoreError.message}`);
      }
      
    } catch (error) {
      console.error('Firebase Auth Error:', error);
      setMessage(`❌ Authentication failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      setMessage('👋 Logged out successfully');
      setEmail('');
      setPassword('');
    } catch (error) {
      setMessage(`❌ Logout error: ${error.message}`);
    }
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#fff',
      padding: 20,
      justifyContent: 'center',
    }}>
      <Text style={{ 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: '#1976d2',
        textAlign: 'center',
        marginBottom: 10,
      }}>
        ABS OMS Mobile
      </Text>
      
      <Text style={{ 
        fontSize: 16, 
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
      }}>
        Firebase Authentication Test
      </Text>

      {!user ? (
        <View style={{ 
          backgroundColor: '#fff',
          padding: 20, 
          marginBottom: 20,
          borderRadius: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 15, textAlign: 'center' }}>
            Firebase Sign In
          </Text>
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ marginBottom: 15 }}
            mode="outlined"
            disabled={loading}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ marginBottom: 20 }}
            mode="outlined"
            disabled={loading}
          />

          <Button 
            mode="contained" 
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={{ marginBottom: 15 }}
          >
            Sign In with Firebase
          </Button>
          
        </View>
      ) : (
        <View style={{ 
          backgroundColor: '#e8f5e8',
          padding: 20, 
          marginBottom: 20,
          borderRadius: 8,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 15, textAlign: 'center' }}>
            Welcome!
          </Text>
          
          <Text style={{ fontSize: 16, marginBottom: 15, textAlign: 'center' }}>
            Email: {user.email}
          </Text>
          
          <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
            UID: {user.uid.substring(0, 8)}...
          </Text>
          
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            style={{ marginBottom: 15 }}
          >
            Sign Out
          </Button>
        </View>
      )}

      <Text style={{ 
        fontSize: 14, 
        color: message.startsWith('❌') ? '#f44336' : 
              message.startsWith('✅') ? '#4caf50' : 
              message.startsWith('🔄') ? '#ff9800' : '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 15,
      }}>
        {message}
      </Text>

      <Text style={{ 
        fontSize: 12, 
        color: '#999',
        textAlign: 'center',
      }}>
        💡 Use your existing Firebase credentials
        {'\n'}
        🔥 Firebase: {auth().app ? 'Connected' : 'Not Connected'}
      </Text>
    </View>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <FirebaseLoginScreen />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;