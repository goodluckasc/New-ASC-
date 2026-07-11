import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { Add, Edit, Delete, Upload, Download } from '@mui/icons-material';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import VehicleForm from './VehicleForm';
import type { Vehicle, Customer, JobCard } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

export default function VehicleList() {
  const { enqueueSnackbar } = useSnackbar();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [jobCardsLoading, setJobCardsLoading] = useState(false);

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));
  const customerMobileMap = new Map(customers.map((c) => [c.id, c.mobile]));
  const customerAddressMap = new Map(customers.map((c) => [c.id, c.address || '']));

  useEffect(() => {
    const unsubVehicles = onSnapshot(
      collection(db, 'vehicles'),
      (snapshot) => {
        setVehicles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
    });
    return () => {
      unsubVehicles();
      unsubCustomers();
    };
  }, []);

  useEffect(() => {
    if (!selectedVehicleId) {
      setJobCards([]);
      return;
    }
    setJobCardsLoading(true);
    const q = query(collection(db, 'jobCards'), where('vehicleId', '==', selectedVehicleId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setJobCards(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobCard)));
        setJobCardsLoading(false);
      },
      () => setJobCardsLoading(false),
    );
    return unsub;
  }, [selectedVehicleId]);

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = vehicles.map((v) => ({
      'Chassis No': v.chassisNumber || '',
      'DC No': v.dcNo || '',
      'DC Date': formatDate(v.dcDate),
      'Reg. No': v.registrationNumber,
      'Model': v.model || '',
      'Customer Name': customerMap.get(v.customerId) || '',
      'Mobile No': customerMobileMap.get(v.customerId) || '',
      'Address': customerAddressMap.get(v.customerId) || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicles');
    XLSX.writeFile(wb, `vehicles-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    enqueueSnackbar('Vehicles exported successfully', { variant: 'success' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      const mobileToCustomer = new Map<string, Customer>();
      for (const c of customers) {
        if (c.mobile) mobileToCustomer.set(c.mobile, c);
      }

      const batch = writeBatch(db);
      const newCustomers = new Map<string, string>();
      const vehicleCounts = new Map<string, number>();
      let imported = 0;

      for (const row of rows) {
        const regNo = row['Reg. No'] || row['Registration Number'] || row['registrationNumber'] || '';
        if (!regNo.trim()) continue;

        const customerName = row['Customer Name'] || row['customerName'] || '';
        const customerMobile = row['Mobile No'] || row['mobile'] || '';
        const address = row['Address'] || row['address'] || '';
        let customerId: string;

        const cachedId = customerMobile ? newCustomers.get(customerMobile) : null;
        const existing = customerMobile ? mobileToCustomer.get(customerMobile) : null;

        if (cachedId) {
          customerId = cachedId;
          vehicleCounts.set(customerId, (vehicleCounts.get(customerId) || 0) + 1);
        } else if (existing) {
          customerId = existing.id;
          vehicleCounts.set(customerId, (vehicleCounts.get(customerId) || 0) + 1);
        } else {
          const customerRef = doc(collection(db, 'customers'));
          customerId = customerRef.id;
          batch.set(customerRef, {
            name: customerName,
            mobile: customerMobile || '',
            address,
            vehicleCount: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          if (customerMobile) newCustomers.set(customerMobile, customerId);
        }

        const vehicleRef = doc(collection(db, 'vehicles'));
        batch.set(vehicleRef, {
          customerId,
          registrationNumber: regNo,
          model: row['Model'] || row['model'] || '',
          chassisNumber: row['Chassis No'] || row['Chassis Number'] || row['chassisNumber'] || '',
          dcNo: row['DC No'] || row['dcNo'] || '',
          dcDate: row['DC Date'] || row['dcDate'] || '',
          createdAt: serverTimestamp(),
        });
        imported++;
      }

      for (const [cid, count] of vehicleCounts) {
        batch.update(doc(db, 'customers', cid), { vehicleCount: increment(count) });
      }

      await batch.commit();
      enqueueSnackbar(`${imported} vehicles imported successfully`, { variant: 'success' });
    } catch (err) {
      console.error('Import failed:', err);
      enqueueSnackbar('Failed to import vehicles. Check file format.', { variant: 'error' });
    }
    e.target.value = '';
  };

  const handleAdd = () => {
    setEditVehicle(null);
    setFormOpen(true);
  };

  const handleEdit = (row: Vehicle) => {
    setEditVehicle(row);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'vehicles', deleteTarget.id));
      await updateDoc(doc(db, 'customers', deleteTarget.customerId), {
        vehicleCount: increment(-1),
      });
      enqueueSnackbar('Vehicle deleted successfully', { variant: 'success' });
      if (selectedVehicleId === deleteTarget.id) setSelectedVehicleId(null);
    } catch {
      enqueueSnackbar('Failed to delete vehicle', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Vehicle & { sl: number }>[] = [
    {
      id: 'sl',
      label: 'SL',
      render: (r) => r.sl,
    },
    {
      id: 'chassisNumber',
      label: 'Chassis No',
      render: (r) => r.chassisNumber || '-',
    },
    {
      id: 'dcNo',
      label: 'DC No',
      render: (r) => r.dcNo || '-',
    },
    {
      id: 'dcDate',
      label: 'DC Date',
      render: (r) => formatDate(r.dcDate),
    },
    {
      id: 'registrationNumber',
      label: 'Reg. No',
      render: (r) => r.registrationNumber,
    },
    {
      id: 'model',
      label: 'Model',
      render: (r) => r.model || '-',
    },
    {
      id: 'customerName',
      label: 'Customer Name',
      render: (r) => customerMap.get(r.customerId) || '-',
    },
    {
      id: 'customerMobile',
      label: 'Mobile No',
      render: (r) => customerMobileMap.get(r.customerId) || '-',
    },
    {
      id: 'customerAddress',
      label: 'Address',
      render: (r) => customerAddressMap.get(r.customerId) || '-',
    },
  ];

  const actions: Action<Vehicle>[] = [
    { label: 'Edit', icon: <Edit />, onClick: handleEdit },
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Customers & Vehicles
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Upload />} onClick={() => importInputRef.current?.click()}>
            Import
          </Button>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
            Export
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            Add
          </Button>
        </Stack>
        <input ref={importInputRef} type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleImport} />
      </Box>

      <DataTable
        columns={columns}
        data={vehicles.map((v, i) => ({ ...v, sl: i + 1 }))}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
        onRowClick={(r) => setSelectedVehicleId(selectedVehicleId === r.id ? null : r.id)}
      />

      {selectedVehicleId && (
        <Paper
          elevation={0}
          sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Service History
            </Typography>
            <Chip label={`${jobCards.length} job card(s)`} size="small" color="primary" />
          </Box>
          <Box sx={{ p: 2 }}>
            {jobCardsLoading ? (
              <Typography color="text.secondary">Loading service history...</Typography>
            ) : jobCards.length === 0 ? (
              <Typography color="text.secondary">No service history found for this vehicle.</Typography>
            ) : (
              jobCards.map((jc) => (
                <Paper key={jc.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 600 }}>{jc.jobCardNumber}</Typography>
                    <Chip
                      label={jc.status}
                      size="small"
                      color={
                        jc.status === 'Delivered'
                          ? 'success'
                          : jc.status === 'Cancelled'
                            ? 'error'
                            : 'warning'
                      }
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Date: {formatDate(jc.date)} | Odometer: {jc.odometerReading} | Total: ৳
                    {jc.grandTotal?.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {jc.complaintDescription}
                  </Typography>
                </Paper>
              ))
            )}
          </Box>
        </Paper>
      )}

      <VehicleForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        vehicle={editVehicle}
        onSave={() => {
          enqueueSnackbar(editVehicle ? 'Vehicle updated successfully' : 'Vehicle added successfully', {
            variant: 'success',
          });
        }}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Vehicle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete vehicle{' '}
            <strong>{deleteTarget?.registrationNumber}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
