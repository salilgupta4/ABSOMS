import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Badge, Surface } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/theme';
import { wp, hp, getLayoutConfig, isTablet } from '../../utils/responsive';
import { dataService } from '../../services/dataService';
import { syncService } from '../../services/syncService';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalQuotes: number;
  totalSalesOrders: number;
  pendingOrders: number;
  lowStockItems: number;
}

const DashboardScreen: React.FC = () => {
  const { user, syncState, hasPermission } = useAuth();
  const { theme } = useTheme();
  const styles = createThemedStyles(theme);
  const layoutConfig = getLayoutConfig();

  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    totalQuotes: 0,
    totalSalesOrders: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (hasPermission('erp')) {
        // Load basic counts
        const [customers, products, quotes, salesOrders] = await Promise.all([
          dataService.getCustomers({ limit: 1 }),
          dataService.getProducts({ limit: 1 }),
          dataService.getQuotes({ limit: 1 }),
          dataService.getSalesOrders({ limit: 1 }),
        ]);

        // Get pending orders
        const pendingOrders = await dataService.getSalesOrders({
          where: [{ column: 'status', operator: '!=', value: 'Closed' }],
          limit: 1,
        });

        setStats({
          totalCustomers: customers.total,
          totalProducts: products.total,
          totalQuotes: quotes.total,
          totalSalesOrders: salesOrders.total,
          pendingOrders: pendingOrders.total,
          lowStockItems: 0, // TODO: Implement low stock calculation
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger sync
      await syncService.syncAll({ forceSync: true });
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualSync = async () => {
    try {
      await syncService.syncAll({ forceSync: true });
    } catch (error) {
      console.error('Manual sync error:', error);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    subtitle?: string;
    color?: string;
  }> = ({ title, value, subtitle, color }) => (
    <Card style={[localStyles.statCard, { minWidth: isTablet() ? wp(28) : wp(42) }]}>
      <Card.Content style={localStyles.statCardContent}>
        <Text style={styles.captionText}>{title}</Text>
        <Text style={[styles.heading2, { color: color || theme.colors.primary }]}>
          {value.toLocaleString()}
        </Text>
        {subtitle && (
          <Text style={[styles.captionText, { opacity: 0.7 }]}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={localStyles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={localStyles.header}>
        <View>
          <Text style={styles.heading2}>Welcome back,</Text>
          <Text style={styles.heading1}>{user?.name}</Text>
        </View>
        
        {/* Sync Status */}
        {syncState && (
          <Surface style={localStyles.syncStatus}>
            <View style={localStyles.syncStatusContent}>
              <Badge
                style={{
                  backgroundColor: syncState.isOnline
                    ? theme.colors.success
                    : theme.colors.error,
                }}
              >
                {syncState.isOnline ? 'Online' : 'Offline'}
              </Badge>
              {syncState.isSyncing && (
                <Text style={[styles.captionText, { marginTop: 4 }]}>
                  Syncing...
                </Text>
              )}
              {syncState.pendingOperations > 0 && (
                <Text style={[styles.captionText, { marginTop: 4 }]}>
                  {syncState.pendingOperations} pending
                </Text>
              )}
            </View>
          </Surface>
        )}
      </View>

      {/* Quick Actions */}
      <Card style={localStyles.quickActionsCard}>
        <Card.Content>
          <Text style={[styles.heading3, localStyles.sectionTitle]}>
            Quick Actions
          </Text>
          <View style={localStyles.quickActions}>
            <Button
              mode="contained"
              onPress={handleManualSync}
              style={localStyles.quickActionButton}
              disabled={syncState?.isSyncing}
            >
              Sync Data
            </Button>
            {hasPermission('erp') && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => {/* Navigate to quotes */}}
                  style={localStyles.quickActionButton}
                >
                  New Quote
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {/* Navigate to customers */}}
                  style={localStyles.quickActionButton}
                >
                  Add Customer
                </Button>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Statistics */}
      {hasPermission('erp') && (
        <Card style={localStyles.statsCard}>
          <Card.Content>
            <Text style={[styles.heading3, localStyles.sectionTitle]}>
              Business Overview
            </Text>
            <View style={localStyles.statsGrid}>
              <StatCard
                title="Customers"
                value={stats.totalCustomers}
                color={theme.colors.primary}
              />
              <StatCard
                title="Products"
                value={stats.totalProducts}
                color={theme.colors.secondary}
              />
              <StatCard
                title="Quotes"
                value={stats.totalQuotes}
                color={theme.colors.tertiary}
              />
              <StatCard
                title="Sales Orders"
                value={stats.totalSalesOrders}
                color={theme.colors.success}
              />
              <StatCard
                title="Pending Orders"
                value={stats.pendingOrders}
                subtitle="Need attention"
                color={theme.colors.warning}
              />
              <StatCard
                title="Low Stock"
                value={stats.lowStockItems}
                subtitle="Items"
                color={theme.colors.error}
              />
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Payroll Access */}
      {hasPermission('payroll') && (
        <Card style={localStyles.payrollCard}>
          <Card.Content>
            <Text style={[styles.heading3, localStyles.sectionTitle]}>
              Payroll
            </Text>
            <Text style={styles.bodyText}>
              Access employee information, manage payroll, and generate reports.
            </Text>
            <Button
              mode="contained"
              onPress={() => {/* Navigate to payroll */}}
              style={localStyles.payrollButton}
            >
              Open Payroll
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const localStyles = StyleSheet.create({
  content: {
    padding: wp(4),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(3),
  },
  syncStatus: {
    padding: wp(2),
    borderRadius: 8,
    elevation: 1,
  },
  syncStatusContent: {
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: hp(2),
  },
  quickActionsCard: {
    marginBottom: hp(2),
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  quickActionButton: {
    marginRight: wp(2),
    marginBottom: wp(2),
  },
  statsCard: {
    marginBottom: hp(2),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  statCard: {
    marginBottom: wp(2),
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  payrollCard: {
    marginBottom: hp(2),
  },
  payrollButton: {
    marginTop: hp(2),
  },
});

export default DashboardScreen;