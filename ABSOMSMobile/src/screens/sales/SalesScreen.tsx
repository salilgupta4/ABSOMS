import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/theme';
import { wp, hp } from '../../utils/responsive';

const SalesScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createThemedStyles(theme);
  const [activeTab, setActiveTab] = useState('quotes');
  const [quotes, setQuotes] = useState([
    { id: '1', customer: 'ABC Corp', total: 15000, status: 'Draft', date: '2024-08-07' },
    { id: '2', customer: 'XYZ Ltd', total: 25000, status: 'Sent', date: '2024-08-06' },
    { id: '3', customer: 'Tech Solutions', total: 12000, status: 'Approved', date: '2024-08-05' },
  ]);
  const [orders, setOrders] = useState([
    { id: '1', customer: 'ABC Corp', total: 15000, status: 'Processing', date: '2024-08-07' },
    { id: '2', customer: 'Global Inc', total: 35000, status: 'Shipped', date: '2024-08-06' },
  ]);

  const renderQuotes = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2) }}>
        <Text style={styles.heading3}>Quotes ({quotes.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('New Quote', 'Create new quote functionality')}>
          + New Quote
        </Button>
      </View>
      
      {quotes.map((quote) => (
        <Card key={quote.id} style={[styles.card, { marginBottom: hp(1) }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(0.5) }}>
              <Text style={styles.heading3}>{quote.customer}</Text>
              <Text style={[styles.heading3, { color: theme.colors.primary }]}>
                ${quote.total.toLocaleString()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.captionText}>{quote.date}</Text>
              <Text style={{
                color: quote.status === 'Approved' ? theme.colors.success :
                       quote.status === 'Sent' ? theme.colors.warning : theme.colors.onSurfaceVariant,
                fontWeight: '600'
              }}>
                {quote.status}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: hp(1) }}>
              <Button mode="outlined" onPress={() => Alert.alert('View', `Viewing quote ${quote.id}`)}>
                View
              </Button>
              <Button mode="contained" onPress={() => Alert.alert('Edit', `Editing quote ${quote.id}`)}>
                Edit
              </Button>
              <Button mode="text" onPress={() => Alert.alert('Convert', `Convert quote ${quote.id} to order`)}>
                Convert
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderOrders = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2) }}>
        <Text style={styles.heading3}>Sales Orders ({orders.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('New Order', 'Create new sales order')}>
          + New Order
        </Button>
      </View>
      
      {orders.map((order) => (
        <Card key={order.id} style={[styles.card, { marginBottom: hp(1) }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(0.5) }}>
              <Text style={styles.heading3}>{order.customer}</Text>
              <Text style={[styles.heading3, { color: theme.colors.success }]}>
                ${order.total.toLocaleString()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.captionText}>{order.date}</Text>
              <Text style={{
                color: order.status === 'Shipped' ? theme.colors.success : theme.colors.warning,
                fontWeight: '600'
              }}>
                {order.status}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: hp(1) }}>
              <Button mode="outlined" onPress={() => Alert.alert('Track', `Tracking order ${order.id}`)}>
                Track
              </Button>
              <Button mode="contained" onPress={() => Alert.alert('Deliver', `Create delivery for order ${order.id}`)}>
                Deliver
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={localStyles.content}>
        <Text style={[styles.heading1, { color: theme.colors.primary, marginBottom: hp(3) }]}>
          Sales Management
        </Text>
        
        {/* Tab Buttons */}
        <View style={localStyles.tabContainer}>
          <Button
            mode={activeTab === 'quotes' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('quotes')}
            style={[localStyles.tabButton, { marginRight: wp(2) }]}
          >
            Quotes
          </Button>
          <Button
            mode={activeTab === 'orders' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('orders')}
            style={localStyles.tabButton}
          >
            Orders
          </Button>
        </View>
        
        {activeTab === 'quotes' ? renderQuotes() : renderOrders()}
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  content: {
    padding: wp(4),
    minHeight: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: hp(2),
  },
  tabButton: {
    flex: 1,
  },
});

export default SalesScreen;