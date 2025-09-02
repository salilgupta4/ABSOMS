import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, Switch, List } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/theme';
import { wp, hp } from '../../utils/responsive';

const SettingsScreen: React.FC = () => {
  const { user, signOut, syncState } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = createThemedStyles(theme);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <View style={localStyles.content}>
        {/* User Info */}
        <Card style={[styles.card, localStyles.section]}>
          <Card.Content>
            <Text style={styles.heading3}>User Information</Text>
            <Text style={styles.bodyText}>Name: {user?.name}</Text>
            <Text style={styles.bodyText}>Email: {user?.email}</Text>
            <Text style={styles.bodyText}>Role: {user?.role}</Text>
          </Card.Content>
        </Card>

        {/* App Settings */}
        <Card style={[styles.card, localStyles.section]}>
          <Card.Content>
            <Text style={styles.heading3}>App Settings</Text>
            
            <List.Item
              title="Dark Mode"
              description="Toggle between light and dark theme"
              right={() => (
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Sync Status */}
        {syncState && (
          <Card style={[styles.card, localStyles.section]}>
            <Card.Content>
              <Text style={styles.heading3}>Sync Status</Text>
              <Text style={styles.bodyText}>
                Status: {syncState.isOnline ? 'Online' : 'Offline'}
              </Text>
              <Text style={styles.bodyText}>
                Last Sync: {new Date(syncState.lastSyncTime).toLocaleString()}
              </Text>
              <Text style={styles.bodyText}>
                Pending Operations: {syncState.pendingOperations}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Sign Out */}
        <Card style={[styles.card, localStyles.section]}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleSignOut}
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  content: {
    flex: 1,
    padding: wp(4),
  },
  section: {
    marginBottom: hp(2),
  },
});

export default SettingsScreen;