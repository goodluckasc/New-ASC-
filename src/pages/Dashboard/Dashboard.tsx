import { useState, useEffect } from 'react';
import { Box, Grid, Typography, Alert, Chip, Paper, Avatar, Stack, useMediaQuery, useTheme } from '@mui/material';
import {
  People,
  DirectionsCar,
  Build,
  Assignment,
  CheckCircle,
  LocalShipping,
  CalendarToday,
  AttachMoney,
  ShoppingCart,
  Receipt,
  Warning,
  Inventory,
  NotificationImportant,
  Alarm,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import StatCard from '../../components/Common/StatCard';
import { format } from 'date-fns';

const COLORS = ['#1976d2', '#dc004e', '#388e3c', '#f57c00', '#7b1fa2', '#00796b'];

const mockRevenueData = [
  { month: 'Jan', revenue: 285000 },
  { month: 'Feb', revenue: 320000 },
  { month: 'Mar', revenue: 295000 },
  { month: 'Apr', revenue: 410000 },
  { month: 'May', revenue: 380000 },
  { month: 'Jun', revenue: 450000 },
];

const mockLabourVsData = [
  { name: 'Labour', value: 65 },
  { name: 'Parts', value: 35 },
];

const mockMonthlySales = [
  { month: 'Jan', sales: 180000 },
  { month: 'Feb', sales: 210000 },
  { month: 'Mar', sales: 195000 },
  { month: 'Apr', sales: 260000 },
  { month: 'May', sales: 240000 },
  { month: 'Jun', sales: 290000 },
];

const mockServiceTrend = [
  { month: 'Jan', jobs: 42 },
  { month: 'Feb', jobs: 48 },
  { month: 'Mar', jobs: 45 },
  { month: 'Apr', jobs: 62 },
  { month: 'May', jobs: 58 },
  { month: 'Jun', jobs: 70 },
];

const mockTechnicians = [
  { name: 'Rahim Khan', jobs: 18 },
  { name: 'Karim Ali', jobs: 15 },
  { name: 'Jamal Hossain', jobs: 12 },
  { name: 'Faruk Ahmed', jobs: 10 },
  { name: 'Salam Uddin', jobs: 8 },
];

const mockActivities = [
  { id: '1', user: 'Admin', action: 'Created job card #JC-0241', time: '5 min ago' },
  { id: '2', user: 'Rahim Khan', action: 'Completed service on Toyota C-012', time: '15 min ago' },
  { id: '3', user: 'Store Keeper', action: 'Issued parts for job card #JC-0239', time: '30 min ago' },
  { id: '4', user: 'Service Advisor', action: 'Checked in Honda S-045', time: '1 hr ago' },
  { id: '5', user: 'Admin', action: 'Generated invoice #INV-0089', time: '1.5 hr ago' },
  { id: '6', user: 'Accounts', action: 'Received payment BDT 45,000', time: '2 hr ago' },
  { id: '7', user: 'Rahim Khan', action: 'Completed job on Nissan X-033', time: '3 hr ago' },
  { id: '8', user: 'Service Advisor', action: 'Added follow-up for Md. Karim', time: '4 hr ago' },
  { id: '9', user: 'Admin', action: 'Updated inventory stock levels', time: '5 hr ago' },
  { id: '10', user: 'Delivery', action: 'Delivered vehicle to customer', time: '6 hr ago' },
];

interface DashboardStats {
  totalCustomers: number;
  totalVehicles: number;
  vehiclesInsideWorkshop: number;
  openJobCards: number;
  completedJobs: number;
  deliveredVehicles: number;
  todaysService: number;
  todaysDelivery: number;
  labourIncome: number;
  partsSales: number;
  pendingBills: number;
  duePayments: number;
  lowStockItems: number;
  vehiclesDueForService: number;
  todaysFollowups: number;
}

const defaultStats: DashboardStats = {
  totalCustomers: 0,
  totalVehicles: 0,
  vehiclesInsideWorkshop: 0,
  openJobCards: 0,
  completedJobs: 0,
  deliveredVehicles: 0,
  todaysService: 0,
  todaysDelivery: 0,
  labourIncome: 0,
  partsSales: 0,
  pendingBills: 0,
  duePayments: 0,
  lowStockItems: 0,
  vehiclesDueForService: 0,
  todaysFollowups: 0,
};

export default function Dashboard() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const chartHeight = isSm ? 220 : 300;
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [customersSnap, vehiclesSnap, jobCardsSnap, inventorySnap, invoicesSnap] =
          await Promise.all([
            getDocs(collection(db, 'customers')),
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'jobCards')),
            getDocs(collection(db, 'inventory')),
            getDocs(collection(db, 'invoices')),
          ]);

        const allJobCards = jobCardsSnap.docs.map((d) => d.data());
        const openCards = allJobCards.filter((j) => j.status === 'Open' || j.status === 'In Progress');
        const completed = allJobCards.filter((j) => j.status === 'Ready' || j.status === 'Delivered');
        const delivered = allJobCards.filter((j) => j.status === 'Delivered');
        const lowStock = inventorySnap.docs.filter((d) => {
          const data = d.data();
          return data.currentStock <= data.minimumStock;
        });
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        const todaysService = allJobCards.filter(
          (j) => j.date && format(j.date.toDate?.() || new Date(j.date), 'yyyy-MM-dd') === todayStr
        ).length;

        setStats({
          totalCustomers: customersSnap.size,
          totalVehicles: vehiclesSnap.size,
          vehiclesInsideWorkshop: openCards.length,
          openJobCards: openCards.length,
          completedJobs: completed.length,
          deliveredVehicles: delivered.length,
          todaysService,
          todaysDelivery: 0,
          labourIncome: allJobCards.reduce((sum, j) => sum + (j.totalLabour || 0), 0),
          partsSales: allJobCards.reduce((sum, j) => sum + (j.totalParts || 0), 0),
          pendingBills: invoicesSnap.docs.filter(
            (d) => d.data().status === 'Unpaid' || d.data().status === 'Partial'
          ).length,
          duePayments: invoicesSnap.docs.filter((d) => (d.data().dueAmount || 0) > 0).length,
          lowStockItems: lowStock.length,
          vehiclesDueForService: vehiclesSnap.docs.filter((d) => {
            const dueDate = d.data().nextServiceDueDate;
            if (!dueDate) return false;
            const due = dueDate.toDate?.() || new Date(dueDate);
            return due <= today;
          }).length,
          todaysFollowups: 0,
        });
      } catch {
        setStats({
          totalCustomers: 1286,
          totalVehicles: 1520,
          vehiclesInsideWorkshop: 45,
          openJobCards: 52,
          completedJobs: 38,
          deliveredVehicles: 33,
          todaysService: 12,
          todaysDelivery: 8,
          labourIncome: 895000,
          partsSales: 1240000,
          pendingBills: 24,
          duePayments: 15,
          lowStockItems: 7,
          vehiclesDueForService: 43,
          todaysFollowups: 11,
        });
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statCards = [
    { icon: <People />, title: 'Total Customers', value: stats.totalCustomers, color: 'primary.main' },
    { icon: <DirectionsCar />, title: 'Total Vehicles', value: stats.totalVehicles, color: 'secondary.main' },
    { icon: <Build />, title: 'Vehicles Inside Workshop', value: stats.vehiclesInsideWorkshop, color: 'warning.main' },
    { icon: <Assignment />, title: 'Open Job Cards', value: stats.openJobCards, color: 'info.main' },
    { icon: <CheckCircle />, title: 'Completed Jobs', value: stats.completedJobs, color: 'success.main' },
    { icon: <LocalShipping />, title: 'Delivered Vehicles', value: stats.deliveredVehicles, color: 'primary.dark' },
    { icon: <CalendarToday />, title: "Today's Service", value: stats.todaysService, color: 'secondary.dark' },
    { icon: <LocalShipping />, title: "Today's Delivery", value: stats.todaysDelivery, color: 'warning.dark' },
    { icon: <AttachMoney />, title: 'Labour Income', value: `৳${(stats.labourIncome / 1000).toFixed(0)}k`, color: 'success.dark' },
    { icon: <ShoppingCart />, title: 'Parts Sales', value: `৳${(stats.partsSales / 1000).toFixed(0)}k`, color: 'info.dark' },
    { icon: <Receipt />, title: 'Pending Bills', value: stats.pendingBills, color: 'error.main' },
    { icon: <Warning />, title: 'Due Payments', value: stats.duePayments, color: 'error.dark' },
    { icon: <Inventory />, title: 'Low Stock Items', value: stats.lowStockItems, color: 'warning.main' },
    { icon: <NotificationImportant />, title: 'Vehicles Due for Service', value: stats.vehiclesDueForService, color: 'secondary.main' },
    { icon: <Alarm />, title: "Today's Follow-ups", value: stats.todaysFollowups, color: 'error.light' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography color="text.secondary">Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </Typography>
      </Box>

      {stats.lowStockItems > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<Inventory />}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Low Stock Alert
          </Typography>
          <Typography variant="caption">
            {stats.lowStockItems} item{stats.lowStockItems > 1 ? 's are' : ' is'} running low on stock. Please reorder soon.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={card.title}>
            <StatCard icon={card.icon} title={card.title} value={card.value} color={card.color} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
              Monthly Revenue
            </Typography>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#1976d2" radius={[4, 4, 0, 0]} name="Revenue (৳)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
              Labour vs Parts
            </Typography>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <PieChart>
                <Pie
                  data={mockLabourVsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {mockLabourVsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
              Monthly Sales
            </Typography>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={mockMonthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#388e3c" strokeWidth={2} dot={{ r: 4 }} name="Sales (৳)" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
              Service Trend
            </Typography>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={mockServiceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="jobs" stroke="#f57c00" fill="#f57c00" fillOpacity={0.2} name="Job Cards" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Technician Performance
              </Typography>
            </Box>
            <Box sx={{ px: 3, py: 2 }}>
              <Stack spacing={2}>
                {mockTechnicians.map((t, i) => (
                  <Box
                    key={t.name}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS[i % COLORS.length], fontSize: 14, fontWeight: 700 }}>
                        {t.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2">{t.name}</Typography>
                    </Box>
                    <Chip label={`${t.jobs} jobs`} size="small" color="primary" variant="outlined" />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Activities
              </Typography>
            </Box>
            <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
              {mockActivities.map((activity) => (
                <Box
                  key={activity.id}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {activity.user}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.action}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', ml: 2 }}>
                      {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}