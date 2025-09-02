import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { isTablet } from '../utils/responsive';

// Import screens (we'll create these next)
import LoadingScreen from '../screens/LoadingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import SalesScreen from '../screens/sales/SalesScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import PayrollScreen from '../screens/payroll/PayrollScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Navigation type definitions
export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Sales: undefined;
  Inventory: undefined;
  Customers: undefined;
  Products: undefined;
  Payroll: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Tab Bar Icons (we'll use simple text for now, can replace with icons later)
const getTabBarIcon = (routeName: string, focused: boolean, theme: any) => {
  const iconMap: Record<string, string> = {
    Dashboard: '📊',
    Sales: '💼',
    Inventory: '📦',
    Customers: '👥',
    Products: '🏷️',
    Payroll: '💰',
    Settings: '⚙️',
  };

  return iconMap[routeName] || '•';
};

// Auth Navigator
const AuthNavigator = () => {
  const { theme } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// Main Tab Navigator
const MainNavigator = () => {
  const { theme } = useTheme();
  const { hasPermission } = useAuth();

  // Filter tabs based on user permissions
  const getFilteredTabs = () => {
    const tabs = [
      { name: 'Dashboard', component: DashboardScreen, permission: null },
      { name: 'Sales', component: SalesScreen, permission: 'erp' as const },
      { name: 'Inventory', component: InventoryScreen, permission: 'erp' as const },
      { name: 'Customers', component: CustomersScreen, permission: 'erp' as const },
      { name: 'Products', component: ProductsScreen, permission: 'erp' as const },
      { name: 'Payroll', component: PayrollScreen, permission: 'payroll' as const },
      { name: 'Settings', component: SettingsScreen, permission: null },
    ];

    return tabs.filter(tab => 
      !tab.permission || hasPermission(tab.permission)
    );
  };

  const filteredTabs = getFilteredTabs();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: isTablet() ? 70 : 60,
          paddingBottom: isTablet() ? 10 : 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: isTablet() ? 14 : 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused }) => ({
          children: getTabBarIcon(route.name, focused, theme),
        }),
        tabBarIconStyle: {
          fontSize: isTablet() ? 24 : 20,
        },
      })}
    >
      {filteredTabs.map((tab) => (
        <MainTab.Screen
          key={tab.name}
          name={tab.name as keyof MainTabParamList}
          component={tab.component}
          options={{
            title: tab.name,
          }}
        />
      ))}
    </MainTab.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: theme === theme, // This will be properly set based on theme
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.onBackground,
          border: theme.colors.outline,
          notification: theme.colors.error,
        },
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {isLoading ? (
          <RootStack.Screen name="Loading" component={LoadingScreen} />
        ) : isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;