import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/theme';
import { wp, hp } from '../../utils/responsive';

const ProductsScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createThemedStyles(theme);

  return (
    <View style={styles.container}>
      <View style={localStyles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.heading2}>Products Module</Text>
            <Text style={[styles.bodyText, { marginVertical: hp(2) }]}>
              Manage your product catalog with pricing and specifications.
            </Text>
            <Button mode="contained" onPress={() => {/* TODO: Implement */}}>
              View Products
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
    justifyContent: 'center',
  },
});

export default ProductsScreen;