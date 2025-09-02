import React, { useState } from 'react';
import { View, Text, StatusBar, LogBox } from 'react-native';
import { PaperProvider, configureFonts, Button, TextInput } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';

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

const WorkingLoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Enter your credentials to test login');

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      setMessage('❌ Please enter both email and password');
      return;
    }
    
    // Simulate login process
    setMessage('🔄 Attempting to login...');
    
    // Simple validation - you can replace this with actual Firebase auth later
    setTimeout(() => {
      if (email.toLowerCase().includes('@') && password.length >= 6) {
        setMessage('✅ Login successful! (Demo mode - Firebase will be connected next)');
      } else {
        setMessage('❌ Invalid email or password (email must contain @ and password must be 6+ chars)');
      }
    }, 1000);
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#fff',
      padding: 20,
      justifyContent: 'center',
    }}>
      <Text style={{ 
        fontSize: 28, 
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
        marginBottom: 40,
      }}>
        Working Login System
      </Text>

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
          Sign In
        </Text>
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ marginBottom: 15 }}
          mode="outlined"
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ marginBottom: 20 }}
          mode="outlined"
        />

        <Button 
          mode="contained" 
          onPress={handleLogin}
          style={{ marginBottom: 15 }}
        >
          Sign In
        </Button>
        
        <Text style={{ 
          fontSize: 14, 
          color: '#666',
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          {message}
        </Text>
      </View>

      <Text style={{ 
        fontSize: 12, 
        color: '#999',
        textAlign: 'center',
      }}>
        💡 Try: test@example.com / password123
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
          <WorkingLoginScreen />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;