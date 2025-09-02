import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Badge } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { createThemedStyles } from '../../utils/theme';
import { wp, hp } from '../../utils/responsive';

const PayrollScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createThemedStyles(theme);
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2) }}>
        <Text style={styles.heading3}>Employees ({employees.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('Add Employee', 'Add new employee functionality')}>
          + Add Employee
        </Button>
      </View>
      
      {employees.map((employee) => (
        <Card 
          key={employee.id} 
          style={[
            styles.card, 
            { 
              marginBottom: hp(1),
              borderLeftWidth: 4,
              borderLeftColor: employee.status === 'Active' ? theme.colors.success : theme.colors.warning,
            }
          ]}
        >
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(0.5) }}>
              <Text style={styles.heading3}>{employee.name}</Text>
              <Badge 
                style={{ 
                  backgroundColor: employee.status === 'Active' ? theme.colors.success : theme.colors.warning 
                }}
              >
                {employee.status}
              </Badge>
            </View>
            <Text style={[styles.captionText, { marginBottom: hp(0.5) }]}>{employee.position}</Text>
            <Text style={[styles.heading3, { color: theme.colors.primary }]}>
              ${employee.salary.toLocaleString()}/month
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: hp(1) }}>
              <Button mode="outlined" onPress={() => Alert.alert('View Details', `View details for ${employee.name}`)}>
                Details
              </Button>
              <Button mode="contained" onPress={() => Alert.alert('Payslip', `Generate payslip for ${employee.name}`)}>
                Payslip
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderPayroll = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2) }}>
        <Text style={styles.heading3}>Payroll Records ({payrollRecords.length})</Text>
        <Button mode="contained" onPress={() => Alert.alert('Process Payroll', 'Process payroll for current month')}>
          Process Payroll
        </Button>
      </View>
      
      {payrollRecords.map((record) => (
        <Card key={record.id} style={[styles.card, { marginBottom: hp(1) }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(0.5) }}>
              <Text style={styles.heading3}>{record.employee}</Text>
              <Badge 
                style={{ 
                  backgroundColor: record.status === 'Paid' ? theme.colors.success : theme.colors.warning 
                }}
              >
                {record.status}
              </Badge>
            </View>
            <Text style={[styles.captionText, { marginBottom: hp(0.5) }]}>{record.period}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.bodyText}>Gross: ${record.grossPay.toLocaleString()}</Text>
              <Text style={[styles.heading3, { color: theme.colors.primary }]}>
                Net: ${record.netPay.toLocaleString()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: hp(1) }}>
              <Button mode="outlined" onPress={() => Alert.alert('View Payslip', `View payslip for ${record.employee}`)}>
                View Payslip
              </Button>
              {record.status === 'Pending' && (
                <Button mode="contained" onPress={() => Alert.alert('Process Payment', `Process payment for ${record.employee}`)}>
                  Pay Now
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderLeave = () => (
    <View style={{ flex: 1 }}>
      <Text style={[styles.heading3, { marginBottom: hp(2) }]}>
        Leave Requests ({leaveRequests.length})
      </Text>
      
      {leaveRequests.map((leave) => (
        <Card 
          key={leave.id} 
          style={[
            styles.card, 
            { 
              marginBottom: hp(1),
              borderLeftWidth: 4,
              borderLeftColor: leave.status === 'Approved' ? theme.colors.success : 
                             leave.status === 'Pending' ? theme.colors.warning : theme.colors.error,
            }
          ]}
        >
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(0.5) }}>
              <Text style={styles.heading3}>{leave.employee}</Text>
              <Badge 
                style={{ 
                  backgroundColor: leave.status === 'Approved' ? theme.colors.success : 
                                   leave.status === 'Pending' ? theme.colors.warning : theme.colors.error 
                }}
              >
                {leave.status}
              </Badge>
            </View>
            <Text style={[styles.captionText, { marginBottom: hp(0.5) }]}>{leave.type}</Text>
            <Text style={styles.bodyText}>
              {leave.startDate} ({leave.days} day{leave.days > 1 ? 's' : ''})
            </Text>
            {leave.status === 'Pending' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: hp(1) }}>
                <Button 
                  mode="contained" 
                  onPress={() => Alert.alert('Approve', `Approve leave request for ${leave.employee}`)}
                  buttonColor={theme.colors.success}
                >
                  Approve
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => Alert.alert('Reject', `Reject leave request for ${leave.employee}`)}
                  textColor={theme.colors.error}
                >
                  Reject
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={localStyles.content}>
        <Text style={[styles.heading1, { color: theme.colors.tertiary, marginBottom: hp(3) }]}>
          Payroll Management
        </Text>
        
        {/* Tab Buttons */}
        <View style={localStyles.tabContainer}>
          <Button
            mode={activeTab === 'employees' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('employees')}
            style={[localStyles.tabButton, { marginRight: wp(1) }]}
          >
            Employees
          </Button>
          <Button
            mode={activeTab === 'payroll' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('payroll')}
            style={[localStyles.tabButton, { marginRight: wp(1) }]}
          >
            Payroll
          </Button>
          <Button
            mode={activeTab === 'leave' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('leave')}
            style={localStyles.tabButton}
          >
            Leave
          </Button>
        </View>
        
        {activeTab === 'employees' && renderEmployees()}
        {activeTab === 'payroll' && renderPayroll()}
        {activeTab === 'leave' && renderLeave()}
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

export default PayrollScreen;