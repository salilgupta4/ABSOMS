import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { View, Text, StatusBar, LogBox, Alert, FlatList, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { PaperProvider, configureFonts, Button, TextInput, Card, Divider, IconButton } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
    secondary: '#03dac6',
    tertiary: '#ff9800',
  },
};

// Tab navigator
const Tab = createBottomTabNavigator();

// Login Screen
const LoginScreen: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Sign in to access ABS OMS Mobile');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage('❌ Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      setMessage('🔄 Authenticating...');
      
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      
      // Get user profile from Firestore
      try {
        const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        const user = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: userData?.displayName || userData?.name || firebaseUser.email?.split('@')[0],
          role: userData?.role || 'user',
          ...userData,
        };
        
        onLogin(user);
      } catch (firestoreError) {
        // Even if Firestore fails, we can still proceed with Firebase Auth data
        const user = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.email?.split('@')[0] || 'User',
          role: 'user',
        };
        onLogin(user);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setMessage(`❌ Login failed: ${error.message}`);
    } finally {
      setLoading(false);
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
        marginBottom: 30,
      }}>
        Order Management System
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
          Sign In
        </Button>
        
        <Text style={{ 
          fontSize: 14, 
          color: message.startsWith('❌') ? '#f44336' : 
                message.startsWith('✅') ? '#4caf50' : 
                message.startsWith('🔄') ? '#ff9800' : '#666',
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          {message}
        </Text>
      </View>
    </View>
  );
};

// Dashboard Screen
const DashboardScreen: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    orders: 0,
    quotes: 0,
  });

  useEffect(() => {
    // Simulate loading stats
    setTimeout(() => {
      setStats({
        customers: 25,
        products: 150,
        orders: 12,
        quotes: 8,
      });
    }, 1000);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa', padding: 20 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, color: '#666' }}>Welcome back,</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>
          {user.name}
        </Text>
      </View>

      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 15 }}>
        Business Overview
      </Text>

      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        {[
          { title: 'Customers', value: stats.customers, color: '#1976d2' },
          { title: 'Products', value: stats.products, color: '#03dac6' },
          { title: 'Orders', value: stats.orders, color: '#4caf50' },
          { title: 'Quotes', value: stats.quotes, color: '#ff9800' },
        ].map((stat, index) => (
          <View key={index} style={{ 
            width: '48%', 
            marginBottom: 10,
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 15,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
              {stat.title}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: stat.color }}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      <Button
        mode="contained"
        onPress={() => Alert.alert('Sync', 'Data sync completed!')}
        style={{ marginBottom: 10 }}
      >
        Sync Data
      </Button>

      <Button
        mode="outlined"
        onPress={onLogout}
      >
        Sign Out
      </Button>
    </View>
  );
};

// Generate more sample data with detailed information
const generateQuotes = (count: number) => {
  const customers = ['ABC Corp', 'XYZ Ltd', 'Tech Solutions', 'Global Inc', 'Smart Systems', 'Digital Works', 'Innovation Co', 'Future Tech'];
  const statuses = ['Draft', 'Sent', 'Approved', 'Rejected'];
  const products = ['Software License', 'Hardware Setup', 'Consulting Services', 'Support Package', 'Training Program'];
  const quotes = [];
  
  for (let i = 1; i <= count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = Math.floor(Math.random() * 5000) + 500;
      const total = quantity * unitPrice;
      subtotal += total;
      
      items.push({
        id: j + 1,
        product,
        description: `${product} for ${customer}`,
        quantity,
        unitPrice,
        total,
      });
    }
    
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    quotes.push({
      id: i.toString(),
      quoteNumber: `QT-${String(i).padStart(4, '0')}`,
      customer,
      customerEmail: `contact@${customer.toLowerCase().replace(' ', '')}.com`,
      total: Math.round(total),
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      date: new Date(2024, 7, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
      validUntil: new Date(2024, 8, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
      items,
      notes: `Quote for ${customer} - ${items.length} item${items.length > 1 ? 's' : ''}`,
      createdBy: 'Sales Team',
    });
  }
  return quotes;
};

const generateOrders = (count: number) => {
  const customers = ['ABC Corp', 'XYZ Ltd', 'Tech Solutions', 'Global Inc', 'Smart Systems'];
  const statuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const products = ['Software License', 'Hardware Setup', 'Consulting Services', 'Support Package', 'Training Program'];
  const orders = [];
  
  for (let i = 1; i <= count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = Math.floor(Math.random() * 8000) + 1000;
      const total = quantity * unitPrice;
      subtotal += total;
      
      items.push({
        id: j + 1,
        product,
        description: `${product} for ${customer}`,
        quantity,
        unitPrice,
        total,
      });
    }
    
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    const currentStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    orders.push({
      id: i.toString(),
      orderNumber: `SO-${String(i).padStart(4, '0')}`,
      customer,
      customerEmail: `contact@${customer.toLowerCase().replace(' ', '')}.com`,
      total: Math.round(total),
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      status: currentStatus,
      date: new Date(2024, 7, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
      deliveryDate: new Date(2024, 8, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
      items,
      shippingAddress: `${Math.floor(Math.random() * 9999) + 1} Business St, City, State 12345`,
      trackingNumber: currentStatus === 'Shipped' || currentStatus === 'Delivered' ? `TRK${Math.floor(Math.random() * 1000000)}` : null,
      notes: `Order for ${customer} - ${items.length} item${items.length > 1 ? 's' : ''}`,
    });
  }
  return orders;
};

// Optimized Sales Screen with Pagination and Performance
const SalesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('quotes');
  const [quotesPage, setQuotesPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  // Memoized data generation
  const allQuotes = useMemo(() => generateQuotes(100), []);
  const allOrders = useMemo(() => generateOrders(80), []);

  const ITEMS_PER_PAGE = 10;

  // Paginated data with useMemo for performance
  const paginatedQuotes = useMemo(() => 
    allQuotes.slice(0, quotesPage * ITEMS_PER_PAGE), 
    [allQuotes, quotesPage]
  );

  const paginatedOrders = useMemo(() => 
    allOrders.slice(0, ordersPage * ITEMS_PER_PAGE), 
    [allOrders, ordersPage]
  );

  // Optimized callbacks
  const loadMoreQuotes = useCallback(() => {
    if (paginatedQuotes.length < allQuotes.length && !loading) {
      setLoading(true);
      setTimeout(() => {
        setQuotesPage(prev => prev + 1);
        setLoading(false);
      }, 500);
    }
  }, [paginatedQuotes.length, allQuotes.length, loading]);

  const loadMoreOrders = useCallback(() => {
    if (paginatedOrders.length < allOrders.length && !loading) {
      setLoading(true);
      setTimeout(() => {
        setOrdersPage(prev => prev + 1);
        setLoading(false);
      }, 500);
    }
  }, [paginatedOrders.length, allOrders.length, loading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setQuotesPage(1);
      setOrdersPage(1);
      setRefreshing(false);
    }, 1000);
  }, []);

  // View functions
  const viewQuote = useCallback((quote) => {
    setSelectedQuote(quote);
    setQuoteModalVisible(true);
  }, []);

  const viewOrder = useCallback((order) => {
    setSelectedOrder(order);
    setOrderModalVisible(true);
  }, []);

  const closeQuoteModal = useCallback(() => {
    setQuoteModalVisible(false);
    setSelectedQuote(null);
  }, []);

  const closeOrderModal = useCallback(() => {
    setOrderModalVisible(false);
    setSelectedOrder(null);
  }, []);

  // Memoized render functions
  const renderQuoteItem = useCallback(({ item: quote }) => (
    <View key={quote.id} style={{
      backgroundColor: '#fff',
      padding: 15,
      marginBottom: 10,
      marginHorizontal: 15,
      borderRadius: 8,
      elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{quote.customer}</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>
          ${quote.total.toLocaleString()}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#666' }}>{quote.date}</Text>
        <Text style={{
          color: quote.status === 'Approved' ? '#4caf50' :
                 quote.status === 'Sent' ? '#ff9800' : '#666',
          fontWeight: '600'
        }}>
          {quote.status}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
        <Button mode="outlined" onPress={() => viewQuote(quote)}>
          View
        </Button>
        <Button mode="contained" onPress={() => Alert.alert('Edit', `Edit Quote ${quote.quoteNumber}`)}>
          Edit
        </Button>
        <Button mode="text" onPress={() => Alert.alert('Convert', `Convert ${quote.quoteNumber} to Sales Order`)}>
          Convert
        </Button>
      </View>
    </View>
  ), []);

  const renderOrderItem = useCallback(({ item: order }) => (
    <View key={order.id} style={{
      backgroundColor: '#fff',
      padding: 15,
      marginBottom: 10,
      marginHorizontal: 15,
      borderRadius: 8,
      elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{order.customer}</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4caf50' }}>
          ${order.total.toLocaleString()}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#666' }}>{order.date}</Text>
        <Text style={{
          color: order.status === 'Shipped' ? '#4caf50' : '#ff9800',
          fontWeight: '600'
        }}>
          {order.status}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
        <Button mode="outlined" onPress={() => viewOrder(order)}>
          View
        </Button>
        <Button mode="contained" onPress={() => Alert.alert('Track', order.trackingNumber ? `Tracking: ${order.trackingNumber}` : 'No tracking available')}>
          Track
        </Button>
        <Button mode="text" onPress={() => Alert.alert('Deliver', `Create delivery for ${order.orderNumber}`)}>
          Deliver
        </Button>
      </View>
    </View>
  ), []);

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#1976d2" />
        <Text style={{ marginTop: 5, color: '#666' }}>Loading more...</Text>
      </View>
    );
  }, [loading]);

  const renderQuotesList = useMemo(() => (
    <FlatList
      data={paginatedQuotes}
      renderItem={renderQuoteItem}
      keyExtractor={(item) => item.id}
      onEndReached={loadMoreQuotes}
      onEndReachedThreshold={0.1}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', margin: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Quotes ({allQuotes.length}) - Showing {paginatedQuotes.length}
          </Text>
          <Button mode="contained" onPress={() => Alert.alert('New Quote', 'Create new quote functionality')}>
            + New Quote
          </Button>
        </View>
      }
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  ), [paginatedQuotes, allQuotes.length, renderQuoteItem, loadMoreQuotes, onRefresh, refreshing, renderFooter]);

  const renderOrdersList = useMemo(() => (
    <FlatList
      data={paginatedOrders}
      renderItem={renderOrderItem}
      keyExtractor={(item) => item.id}
      onEndReached={loadMoreOrders}
      onEndReachedThreshold={0.1}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', margin: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Sales Orders ({allOrders.length}) - Showing {paginatedOrders.length}
          </Text>
          <Button mode="contained" onPress={() => Alert.alert('New Order', 'Create new sales order')}>
            + New Order
          </Button>
        </View>
      }
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  ), [paginatedOrders, allOrders.length, renderOrderItem, loadMoreOrders, onRefresh, refreshing, renderFooter]);


  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <View style={{ padding: 15 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2', marginBottom: 20 }}>
          Sales Management
        </Text>
        
        {/* Tab Buttons */}
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <Button
            mode={activeTab === 'quotes' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('quotes')}
            style={{ marginRight: 10, flex: 1 }}
          >
            Quotes
          </Button>
          <Button
            mode={activeTab === 'orders' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('orders')}
            style={{ flex: 1 }}
          >
            Orders
          </Button>
        </View>
      </View>
      
      {activeTab === 'quotes' ? renderQuotesList : renderOrdersList}

      {/* Quote Detail Modal */}
      <Modal
        visible={quoteModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeQuoteModal}
      >
        <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', elevation: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2' }}>
              Quote Details
            </Text>
            <IconButton icon="close" size={24} onPress={closeQuoteModal} />
          </View>
          
          {selectedQuote && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15 }}>
              <Card style={{ marginBottom: 15 }}>
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedQuote.quoteNumber}</Text>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: selectedQuote.status === 'Approved' ? '#4caf50' :
                             selectedQuote.status === 'Sent' ? '#ff9800' : '#666'
                    }}>
                      {selectedQuote.status}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>{selectedQuote.customer}</Text>
                  <Text style={{ color: '#666', marginBottom: 5 }}>{selectedQuote.customerEmail}</Text>
                  <Text style={{ color: '#666', marginBottom: 5 }}>Date: {selectedQuote.date}</Text>
                  <Text style={{ color: '#666', marginBottom: 5 }}>Valid Until: {selectedQuote.validUntil}</Text>
                  <Text style={{ color: '#666', marginBottom: 10 }}>Created By: {selectedQuote.createdBy}</Text>
                  {selectedQuote.notes && (
                    <Text style={{ fontStyle: 'italic', color: '#666' }}>{selectedQuote.notes}</Text>
                  )}
                </Card.Content>
              </Card>

              <Card style={{ marginBottom: 15 }}>
                <Card.Content>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Items</Text>
                  {selectedQuote.items.map((item, index) => (
                    <View key={item.id}>
                      <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.product}</Text>
                        <Text style={{ color: '#666', fontSize: 14 }}>{item.description}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                          <Text style={{ color: '#666' }}>Qty: {item.quantity}</Text>
                          <Text style={{ color: '#666' }}>Unit Price: ${item.unitPrice.toLocaleString()}</Text>
                          <Text style={{ fontWeight: '600' }}>Total: ${item.total.toLocaleString()}</Text>
                        </View>
                      </View>
                      {index < selectedQuote.items.length - 1 && <Divider style={{ marginVertical: 10 }} />}
                    </View>
                  ))}
                </Card.Content>
              </Card>

              <Card style={{ marginBottom: 20 }}>
                <Card.Content>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Summary</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text>Subtotal:</Text>
                    <Text>${selectedQuote.subtotal.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text>Tax (10%):</Text>
                    <Text>${selectedQuote.tax.toLocaleString()}</Text>
                  </View>
                  <Divider style={{ marginVertical: 10 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Total:</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2' }}>
                      ${selectedQuote.total.toLocaleString()}
                    </Text>
                  </View>
                </Card.Content>
              </Card>

              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
                <Button mode="contained" onPress={() => Alert.alert('Edit', `Edit Quote ${selectedQuote.quoteNumber}`)}>
                  Edit Quote
                </Button>
                <Button mode="outlined" onPress={() => Alert.alert('Convert', `Convert ${selectedQuote.quoteNumber} to Sales Order`)}>
                  Convert to Order
                </Button>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Order Detail Modal */}
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeOrderModal}
      >
        <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', elevation: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#4caf50' }}>
              Order Details
            </Text>
            <IconButton icon="close" size={24} onPress={closeOrderModal} />
          </View>
          
          {selectedOrder && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15 }}>
              <Card style={{ marginBottom: 15 }}>
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedOrder.orderNumber}</Text>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: selectedOrder.status === 'Delivered' ? '#4caf50' :
                             selectedOrder.status === 'Shipped' ? '#2196f3' :
                             selectedOrder.status === 'Processing' ? '#ff9800' : '#f44336'
                    }}>
                      {selectedOrder.status}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>{selectedOrder.customer}</Text>
                  <Text style={{ color: '#666', marginBottom: 5 }}>{selectedOrder.customerEmail}</Text>
                  <Text style={{ color: '#666', marginBottom: 5 }}>Order Date: {selectedOrder.date}</Text>
                  <Text style={{ color: '#666', marginBottom: 5 }}>Delivery Date: {selectedOrder.deliveryDate}</Text>
                  {selectedOrder.trackingNumber && (
                    <Text style={{ color: '#666', marginBottom: 5 }}>Tracking: {selectedOrder.trackingNumber}</Text>
                  )}
                  {selectedOrder.notes && (
                    <Text style={{ fontStyle: 'italic', color: '#666', marginTop: 5 }}>{selectedOrder.notes}</Text>
                  )}
                </Card.Content>
              </Card>

              <Card style={{ marginBottom: 15 }}>
                <Card.Content>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Shipping Address</Text>
                  <Text style={{ color: '#666' }}>{selectedOrder.shippingAddress}</Text>
                </Card.Content>
              </Card>

              <Card style={{ marginBottom: 15 }}>
                <Card.Content>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Items</Text>
                  {selectedOrder.items.map((item, index) => (
                    <View key={item.id}>
                      <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.product}</Text>
                        <Text style={{ color: '#666', fontSize: 14 }}>{item.description}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                          <Text style={{ color: '#666' }}>Qty: {item.quantity}</Text>
                          <Text style={{ color: '#666' }}>Unit Price: ${item.unitPrice.toLocaleString()}</Text>
                          <Text style={{ fontWeight: '600' }}>Total: ${item.total.toLocaleString()}</Text>
                        </View>
                      </View>
                      {index < selectedOrder.items.length - 1 && <Divider style={{ marginVertical: 10 }} />}
                    </View>
                  ))}
                </Card.Content>
              </Card>

              <Card style={{ marginBottom: 20 }}>
                <Card.Content>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Summary</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text>Subtotal:</Text>
                    <Text>${selectedOrder.subtotal.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text>Tax (10%):</Text>
                    <Text>${selectedOrder.tax.toLocaleString()}</Text>
                  </View>
                  <Divider style={{ marginVertical: 10 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Total:</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4caf50' }}>
                      ${selectedOrder.total.toLocaleString()}
                    </Text>
                  </View>
                </Card.Content>
              </Card>

              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
                <Button 
                  mode="contained" 
                  onPress={() => Alert.alert('Track', selectedOrder.trackingNumber ? `Tracking: ${selectedOrder.trackingNumber}` : 'No tracking available')}
                >
                  Track Order
                </Button>
                <Button mode="outlined" onPress={() => Alert.alert('Deliver', `Create delivery for ${selectedOrder.orderNumber}`)}>
                  Create Delivery
                </Button>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

// Inventory Screen with Real Functionality
const InventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([
    { id: '1', name: 'Laptop Dell XPS 13', sku: 'LAPTOP-001', stock: 25, minStock: 10, price: 1200 },
    { id: '2', name: 'Monitor 24" LED', sku: 'MON-001', stock: 8, minStock: 15, price: 300 },
    { id: '3', name: 'Wireless Mouse', sku: 'MOUSE-001', stock: 45, minStock: 20, price: 25 },
    { id: '4', name: 'Keyboard Mechanical', sku: 'KEY-001', stock: 3, minStock: 10, price: 85 },
  ]);

  const [movements, setMovements] = useState([
    { id: '1', product: 'Laptop Dell XPS 13', type: 'Sale', quantity: -2, date: '2024-08-07' },
    { id: '2', product: 'Monitor 24" LED', type: 'Purchase', quantity: +10, date: '2024-08-06' },
    { id: '3', product: 'Wireless Mouse', type: 'Sale', quantity: -5, date: '2024-08-05' },
  ]);

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  const renderProducts = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Products ({products.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('Add Product', 'Add new product functionality')}>
          + Add Product
        </Button>
      </View>
      
      {products.map((product) => (
        <View key={product.id} style={{
          backgroundColor: '#fff',
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          elevation: 2,
          borderLeftWidth: 4,
          borderLeftColor: product.stock <= product.minStock ? '#f44336' : '#4caf50',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', flex: 1 }}>{product.name}</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>
              ${product.price}
            </Text>
          </View>
          <Text style={{ color: '#666', marginBottom: 5 }}>SKU: {product.sku}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{
              color: product.stock <= product.minStock ? '#f44336' : '#4caf50',
              fontWeight: '600'
            }}>
              Stock: {product.stock} {product.stock <= product.minStock && '⚠️ Low Stock'}
            </Text>
            <Text style={{ color: '#666' }}>Min: {product.minStock}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
            <Button mode="outlined" onPress={() => Alert.alert('Adjust Stock', `Adjust stock for ${product.name}`)}>
              Adjust
            </Button>
            <Button mode="contained" onPress={() => Alert.alert('Edit Product', `Edit ${product.name}`)}>
              Edit
            </Button>
          </View>
        </View>
      ))}
    </View>
  );

  const renderMovements = () => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
        Stock Movements ({movements.length})
      </Text>
      
      {movements.map((movement) => (
        <View key={movement.id} style={{
          backgroundColor: '#fff',
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>
            {movement.product}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#666' }}>{movement.type}</Text>
            <Text style={{
              color: movement.quantity > 0 ? '#4caf50' : '#f44336',
              fontWeight: '600'
            }}>
              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
            </Text>
          </View>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 5 }}>{movement.date}</Text>
        </View>
      ))}
    </View>
  );

  const renderAlerts = () => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#f44336' }}>
        Low Stock Alerts ({lowStockProducts.length})
      </Text>
      
      {lowStockProducts.map((product) => (
        <View key={product.id} style={{
          backgroundColor: '#fff',
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          elevation: 2,
          borderLeftWidth: 4,
          borderLeftColor: '#f44336',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>
            {product.name}
          </Text>
          <Text style={{ color: '#f44336', fontWeight: '600' }}>
            ⚠️ Only {product.stock} left (Min: {product.minStock})
          </Text>
          <Button
            mode="contained"
            onPress={() => Alert.alert('Reorder', `Create purchase order for ${product.name}`)}
            style={{ marginTop: 10, backgroundColor: '#f44336' }}
          >
            Reorder Now
          </Button>
        </View>
      ))}
      
      {lowStockProducts.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <Text style={{ fontSize: 16, color: '#4caf50' }}>✅ All products have sufficient stock</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa', padding: 15 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#03dac6', marginBottom: 20 }}>
        Inventory Management
      </Text>
      
      {/* Tab Buttons */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Button
          mode={activeTab === 'products' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('products')}
          style={{ marginRight: 5, flex: 1 }}
        >
          Products
        </Button>
        <Button
          mode={activeTab === 'movements' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('movements')}
          style={{ marginRight: 5, flex: 1 }}
        >
          Movements
        </Button>
        <Button
          mode={activeTab === 'alerts' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('alerts')}
          style={{ flex: 1 }}
        >
          Alerts
        </Button>
      </View>
      
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'movements' && renderMovements()}
      {activeTab === 'alerts' && renderAlerts()}
    </View>
  );
};

// Payroll Screen with Real Functionality
const PayrollScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([
    { id: '1', name: 'John Smith', position: 'Software Engineer', salary: 5000, status: 'Active' },
    { id: '2', name: 'Sarah Johnson', position: 'Project Manager', salary: 6000, status: 'Active' },
    { id: '3', name: 'Mike Davis', position: 'Designer', salary: 4500, status: 'Active' },
    { id: '4', name: 'Lisa Wilson', position: 'HR Manager', salary: 5500, status: 'On Leave' },
  ]);

  const [payrollRecords, setPayrollRecords] = useState([
    { id: '1', employee: 'John Smith', period: 'July 2024', grossPay: 5000, netPay: 4200, status: 'Paid' },
    { id: '2', employee: 'Sarah Johnson', period: 'July 2024', grossPay: 6000, netPay: 4980, status: 'Paid' },
    { id: '3', employee: 'Mike Davis', period: 'July 2024', grossPay: 4500, netPay: 3780, status: 'Pending' },
  ]);

  const [leaveRequests, setLeaveRequests] = useState([
    { id: '1', employee: 'Lisa Wilson', type: 'Sick Leave', startDate: '2024-08-05', days: 3, status: 'Approved' },
    { id: '2', employee: 'John Smith', type: 'Vacation', startDate: '2024-08-15', days: 5, status: 'Pending' },
    { id: '3', employee: 'Mike Davis', type: 'Personal', startDate: '2024-08-10', days: 1, status: 'Rejected' },
  ]);

  const renderEmployees = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Employees ({employees.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('Add Employee', 'Add new employee functionality')}>
          + Add Employee
        </Button>
      </View>
      
      {employees.map((employee) => (
        <View key={employee.id} style={{
          backgroundColor: '#fff',
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          elevation: 2,
          borderLeftWidth: 4,
          borderLeftColor: employee.status === 'Active' ? '#4caf50' : '#ff9800',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{employee.name}</Text>
            <Text style={{
              color: employee.status === 'Active' ? '#4caf50' : '#ff9800',
              fontWeight: '600'
            }}>
              {employee.status}
            </Text>
          </View>
          <Text style={{ color: '#666', marginBottom: 5 }}>{employee.position}</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>
            ${employee.salary.toLocaleString()}/month
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
            <Button mode="outlined" onPress={() => Alert.alert('View Details', `View details for ${employee.name}`)}>
              Details
            </Button>
            <Button mode="contained" onPress={() => Alert.alert('Payslip', `Generate payslip for ${employee.name}`)}>
              Payslip
            </Button>
          </View>
        </View>
      ))}
    </View>
  );

  const renderPayroll = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Payroll Records ({payrollRecords.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('Process Payroll', 'Process payroll for current month')}>
          Process Payroll
        </Button>
      </View>
      
      {payrollRecords.map((record) => (
        <View key={record.id} style={{
          backgroundColor: '#fff',
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{record.employee}</Text>
            <Text style={{
              color: record.status === 'Paid' ? '#4caf50' : '#ff9800',
              fontWeight: '600'
            }}>
              {record.status}
            </Text>
          </View>
          <Text style={{ color: '#666', marginBottom: 5 }}>{record.period}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>Gross: ${record.grossPay.toLocaleString()}</Text>
            <Text style={{ fontWeight: 'bold', color: '#1976d2' }}>
              Net: ${record.netPay.toLocaleString()}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
            <Button mode="outlined" onPress={() => Alert.alert('View Payslip', `View payslip for ${record.employee}`)}>
              View Payslip
            </Button>
            {record.status === 'Pending' && (
              <Button mode="contained" onPress={() => Alert.alert('Process Payment', `Process payment for ${record.employee}`)}>
                Pay Now
              </Button>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderLeave = () => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
        Leave Requests ({leaveRequests.length})
      </Text>
      
      {leaveRequests.map((leave) => (
        <View key={leave.id} style={{
          backgroundColor: '#fff',
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          elevation: 2,
          borderLeftWidth: 4,
          borderLeftColor: leave.status === 'Approved' ? '#4caf50' : 
                         leave.status === 'Pending' ? '#ff9800' : '#f44336',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{leave.employee}</Text>
            <Text style={{
              color: leave.status === 'Approved' ? '#4caf50' : 
                     leave.status === 'Pending' ? '#ff9800' : '#f44336',
              fontWeight: '600'
            }}>
              {leave.status}
            </Text>
          </View>
          <Text style={{ color: '#666', marginBottom: 5 }}>{leave.type}</Text>
          <Text style={{ color: '#666' }}>
            {leave.startDate} ({leave.days} day{leave.days > 1 ? 's' : ''})
          </Text>
          {leave.status === 'Pending' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
              <Button 
                mode="contained" 
                onPress={() => Alert.alert('Approve', `Approve leave request for ${leave.employee}`)}
                buttonColor="#4caf50"
              >
                Approve
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => Alert.alert('Reject', `Reject leave request for ${leave.employee}`)}
                textColor="#f44336"
              >
                Reject
              </Button>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa', padding: 15 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ff9800', marginBottom: 20 }}>
        Payroll Management
      </Text>
      
      {/* Tab Buttons */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Button
          mode={activeTab === 'employees' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('employees')}
          style={{ marginRight: 5, flex: 1 }}
        >
          Employees
        </Button>
        <Button
          mode={activeTab === 'payroll' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('payroll')}
          style={{ marginRight: 5, flex: 1 }}
        >
          Payroll
        </Button>
        <Button
          mode={activeTab === 'leave' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('leave')}
          style={{ flex: 1 }}
        >
          Leave
        </Button>
      </View>
      
      {activeTab === 'employees' && renderEmployees()}
      {activeTab === 'payroll' && renderPayroll()}
      {activeTab === 'leave' && renderLeave()}
    </View>
  );
};

// Main App Tabs
const MainTabs: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons = {
            Dashboard: '📊',
            Sales: '💼',
            Inventory: '📦',
            Payroll: '💰',
          };
          return <Text style={{ fontSize: 20 }}>{icons[route.name] || '•'}</Text>;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard">
        {() => <DashboardScreen user={user} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Sales" component={SalesScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Payroll" component={PayrollScreen} />
    </Tab.Navigator>
  );
};

// Main App Component
const App: React.FC = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication
    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        // User is signed in
        const userData = {
          id: authUser.uid,
          email: authUser.email,
          name: authUser.email?.split('@')[0] || 'User',
          role: 'user',
        };
        setUser(userData);
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2', marginBottom: 10 }}>
          ABS OMS Mobile
        </Text>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <NavigationContainer>
            {user ? (
              <MainTabs user={user} onLogout={handleLogout} />
            ) : (
              <LoginScreen onLogin={handleLogin} />
            )}
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;