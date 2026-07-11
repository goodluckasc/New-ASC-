import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh, Phone, WhatsApp } from '@mui/icons-material';
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format, differenceInDays } from 'date-fns';
import DataTable, { type Column } from '../../components/Common/DataTable';
import CallForm from './CallForm';
import type { Call, CallStatus, Vehicle } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

const statusColors: Record<CallStatus, string> = {
  Pending: '#1976d2',
  Called: '#388e3c',
  Busy: '#f57c00',
  'No Answer': '#d32f2f',
  'Customer Coming': '#7b1fa2',
  'Follow-up Required': '#fbc02d',
  Completed: '#9e9e9e',
  'Not Interested': '#424242',
};

export default function CallList() {
  const { enqueueSnackbar } = useSnackbar();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, _setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'calls'),
      (snapshot) => {
        setCalls(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Call)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const vehiclesSnap = await getDocs(collection(db, 'vehicles'));
      const vehicles = vehiclesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
      const today = new Date();
      let added = 0;

      for (const vehicle of vehicles) {
        if (!vehicle.nextServiceDueDate) continue;
        const dueDate = vehicle.nextServiceDueDate instanceof Date
          ? vehicle.nextServiceDueDate
          : typeof vehicle.nextServiceDueDate === 'object' && vehicle.nextServiceDueDate !== null && 'toDate' in vehicle.nextServiceDueDate
            ? (vehicle.nextServiceDueDate as { toDate: () => Date }).toDate()
            : new Date(vehicle.nextServiceDueDate as string);
        const daysSince = differenceInDays(today, dueDate);

        if (daysSince >= 0) {
          const existingQ = query(collection(db, 'calls'));
          const existing = await getDocs(existingQ);
          const exists = existing.docs.some(
            (d) => d.data().vehicleId === vehicle.id && d.data().status === 'Pending'
          );
          if (!exists) {
            const customerSnap = await getDocs(query(collection(db, 'customers')));
            const customer = customerSnap.docs.find((d) => d.id === vehicle.customerId);
            await addDoc(collection(db, 'calls'), {
              customerId: vehicle.customerId,
              customerName: customer?.data().name || 'Unknown',
              mobile: customer?.data().mobile || '',
              vehicleId: vehicle.id,
              vehicleRegNo: vehicle.registrationNumber,
              lastServiceDate: vehicle.lastServiceDate || null,
              daysSinceService: daysSince,
              status: 'Pending',
              notes: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            added++;
          }
        }
      }
      enqueueSnackbar(`Call list refreshed. ${added} new call(s) added.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to refresh call list', { variant: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (callId: string, newStatus: CallStatus) => {
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'calls', callId), { status: newStatus, updatedAt: serverTimestamp() });
      enqueueSnackbar('Status updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update status', { variant: 'error' });
    }
  };

  const filteredData = calls.filter((c) => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matches =
        c.customerName.toLowerCase().includes(term) ||
        (c.mobile || '').toLowerCase().includes(term) ||
        (c.vehicleRegNo || '').toLowerCase().includes(term);
      if (!matches) return false;
    }
    return true;
  });

  const columns: Column<Call>[] = [
    { id: 'customerName', label: 'Customer', width: 160, render: (r) => <Typography sx={{ fontWeight: 600 }}>{r.customerName}</Typography> },
    { id: 'mobile', label: 'Mobile', width: 130, render: (r) => r.mobile || '-' },
    { id: 'vehicleRegNo', label: 'Vehicle', width: 130, render: (r) => r.vehicleRegNo || '-' },
    { id: 'lastServiceDate', label: 'Last Service', width: 110, render: (r) => formatDate(r.lastServiceDate) },
    { id: 'daysSinceService', label: 'Days Since', width: 100, align: 'right', render: (r) => (
      <Typography sx={{ fontWeight: 600 }} color={(r.daysSinceService ?? 0) > 30 ? 'error.main' : 'text.primary'}>
        {r.daysSinceService ?? '-'}
      </Typography>
    )},
    {
      id: 'status',
      label: 'Status',
      width: 160,
      render: (r) => (
        <FormControl size="small" sx={{ minWidth: 140 }} onClick={(e) => e.stopPropagation()}>
          <Select
            value={r.status}
            onChange={(e) => handleStatusChange(r.id, e.target.value as CallStatus)}
            sx={{
              fontSize: 12,
              fontWeight: 600,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: statusColors[r.status] },
              backgroundColor: statusColors[r.status],
              color: '#fff',
              '& .MuiSvgIcon-root': { color: '#fff' },
              '& .MuiSelect-icon': { color: '#fff' },
            }}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Called">Called</MenuItem>
            <MenuItem value="Busy">Busy</MenuItem>
            <MenuItem value="No Answer">No Answer</MenuItem>
            <MenuItem value="Customer Coming">Customer Coming</MenuItem>
            <MenuItem value="Follow-up Required">Follow-up Required</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Not Interested">Not Interested</MenuItem>
          </Select>
        </FormControl>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 100,
      sortable: false,
      render: (r) => (
        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          {r.mobile && (
            <>
              <Tooltip title="Call">
                <IconButton size="small" component="a" href={`tel:${r.mobile}`}>
                  <Phone fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="WhatsApp">
                <IconButton size="small" component="a" href={`https://wa.me/${r.mobile.replace(/[^0-9]/g, '')}`} target="_blank">
                  <WhatsApp fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Calls</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Call List'}
        </Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Called">Called</MenuItem>
            <MenuItem value="Busy">Busy</MenuItem>
            <MenuItem value="No Answer">No Answer</MenuItem>
            <MenuItem value="Customer Coming">Customer Coming</MenuItem>
            <MenuItem value="Follow-up Required">Follow-up Required</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Not Interested">Not Interested</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        getId={(r) => r.id}
        onRowClick={(r) => { setSelectedCall(r); setFormOpen(true); }}
      />

      {selectedCall && (
        <CallForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setSelectedCall(null); }}
          call={selectedCall}
        />
      )}
    </Box>
  );
}