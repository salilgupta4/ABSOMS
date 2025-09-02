import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Badge } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/theme';
import { wp, hp } from '../../utils/responsive';

const InventoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createThemedStyles(theme);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([
    { id: '1', name: 'Laptop Dell XPS 13', sku: 'LAPTOP-001', stock: 25, minStock: 10, price: 1200 },
    { id: '2', name: 'Monitor 24\" LED', sku: 'MON-001', stock: 8, minStock: 15, price: 300 },
    { id: '3', name: 'Wireless Mouse', sku: 'MOUSE-001', stock: 45, minStock: 20, price: 25 },
    { id: '4', name: 'Keyboard Mechanical', sku: 'KEY-001', stock: 3, minStock: 10, price: 85 },
  ]);

  const [movements, setMovements] = useState([
    { id: '1', product: 'Laptop Dell XPS 13', type: 'Sale', quantity: -2, date: '2024-08-07' },
    { id: '2', product: 'Monitor 24\" LED', type: 'Purchase', quantity: +10, date: '2024-08-06' },
    { id: '3', product: 'Wireless Mouse', type: 'Sale', quantity: -5, date: '2024-08-05' },
  ]);

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  const renderProducts = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2) }}>
        <Text style={styles.heading3}>Products ({products.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('Add Product', 'Add new product functionality')}>
          + Add Product
        </Button>
      </View>
      
      {products.map((product) => (
        <Card 
          key={product.id} 
          style={[
            styles.card, 
            { 
              marginBottom: hp(1),
              borderLeftWidth: 4,
              borderLeftColor: product.stock <= product.minStock ? theme.colors.error : theme.colors.success,
            }
          ]}
        >
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(0.5) }}>
              <Text style={[styles.heading3, { flex: 1 }]}>{product.name}</Text>
              <Text style={[styles.heading3, { color: theme.colors.primary }]}>
                ${product.price}
              </Text>
            </View>
            <Text style={[styles.captionText, { marginBottom: hp(0.5) }]}>SKU: {product.sku}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{
                  color: product.stock <= product.minStock ? theme.colors.error : theme.colors.success,
                  fontWeight: '600'
                }}>
                  Stock: {product.stock}
                </Text>
                {product.stock <= product.minStock && (
                  <Badge style={{ marginLeft: wp(2), backgroundColor: theme.colors.error }}>
                    Low Stock
                  </Badge>
                )}
              </View>
              <Text style={styles.captionText}>Min: {product.minStock}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: hp(1) }}>
              <Button mode="outlined" onPress={() => Alert.alert('Adjust Stock', `Adjust stock for ${product.name}`)}>
                Adjust
              </Button>
              <Button mode="contained" onPress={() => Alert.alert('Edit Product', `Edit ${product.name}`)}>
                Edit
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderMovements = () => (
    <View style={{ flex: 1 }}>
      <Text style={[styles.heading3, { marginBottom: hp(2) }]}>
        Stock Movements ({movements.length})
      </Text>
      
      {movements.map((movement) => (
        <Card key={movement.id} style={[styles.card, { marginBottom: hp(1) }]}>
          <Card.Content>
            <Text style={[styles.heading3, { marginBottom: hp(0.5) }]}>
              {movement.product}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.captionText}>{movement.type}</Text>
              <Text style={{
                color: movement.quantity > 0 ? theme.colors.success : theme.colors.error,
                fontWeight: '600'
              }}>
                {movement.quantity > 0 ? '+' : ''}{movement.quantity}
              </Text>
            </View>
            <Text style={[styles.captionText, { marginTop: hp(0.5) }]}>{movement.date}</Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderAlerts = () => (
    <View style={{ flex: 1 }}>
      <Text style={[styles.heading3, { marginBottom: hp(2), color: theme.colors.error }]}>
        Low Stock Alerts ({lowStockProducts.length})
      </Text>
      
      {lowStockProducts.map((product) => (
        <Card 
          key={product.id} 
          style={[
            styles.card, 
            { 
              marginBottom: hp(1),
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.error,
            }
          ]}
        >
          <Card.Content>
            <Text style={[styles.heading3, { marginBottom: hp(0.5) }]}>
              {product.name}
            </Text>
            <Text style={{ color: theme.colors.error, fontWeight: '600', marginBottom: hp(1) }}>
              ⚠️ Only {product.stock} left (Min: {product.minStock})
            </Text>
            <Button
              mode="contained"
              onPress={() => Alert.alert('Reorder', `Create purchase order for ${product.name}`)}
              buttonColor={theme.colors.error}
            >
              Reorder Now
            </Button>
          </Card.Content>
        </Card>
      ))}
      
      {lowStockProducts.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: hp(5) }}>
          <Text style={{ fontSize: 16, color: theme.colors.success }}>✅ All products have sufficient stock</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={localStyles.content}>
        <Text style={[styles.heading1, { color: theme.colors.secondary, marginBottom: hp(3) }]}>
          Inventory Management
        </Text>
        
        {/* Tab Buttons */}
        <View style={localStyles.tabContainer}>
          <Button
            mode={activeTab === 'products' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('products')}
            style={[localStyles.tabButton, { marginRight: wp(1) }]}
          >
            Products
          </Button>
          <Button
            mode={activeTab === 'movements' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('movements')}
            style={[localStyles.tabButton, { marginRight: wp(1) }]}
          >
            Movements
          </Button>
          <Button
            mode={activeTab === 'alerts' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('alerts')}
            style={localStyles.tabButton}
          >
            Alerts
          </Button>
        </View>
        
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'movements' && renderMovements()}
        {activeTab === 'alerts' && renderAlerts()}
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

export default InventoryScreen;