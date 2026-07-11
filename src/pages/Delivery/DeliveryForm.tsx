import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  Autocomplete,
  Grid,


  CircularProgress,
} from '@mui/material';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format, addDays, addMonths } from 'date-fns';
import type { JobCard, Vehicle } from '../../types';

function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${dateStr}-${rand}`;
}

export default function DeliveryForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [odometerOut, setOdometerOut] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobCards'), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobCard));
      setJobCards(all.filter((j) => j.status === 'Ready'));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (selectedJobCard) {
      const vehicle = vehicleMap.get(selectedJobCard.vehicleId);
      if (vehicle?.currentOdometer) {
        setOdometerOut(vehicle.currentOdometer);
      }
    }
  }, [selectedJobCard]);

  const handleSave = async () => {
    if (!selectedJobCard) {
      enqueueSnackbar('Please select a job card', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const lastServiceDate = today;

      const vehicle = vehicleMap.get(selectedJobCard.vehicleId);
      const vehicleBrand = vehicle?.brand || '';
      const vehicleModel = vehicle?.model || '';
      const vehicleRegNo = selectedJobCard.vehicleRegNo;

      const nextServiceDueDate = vehicle?.fuelType === 'Petrol'
        ? addMonths(lastServiceDate, 3)
        : addDays(lastServiceDate, 30);

      const deliveryData = {
        jobCardId: selectedJobCard.id,
        jobCardNumber: selectedJobCard.jobCardNumber,
        vehicleId: selectedJobCard.vehicleId,
        vehicleRegNo: vehicleRegNo,
        customerName: selectedJobCard.customerName,
        deliveryDate: new Date(deliveryDate),
        odometerOut: odometerOut || null,
        notes,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'deliveries'), deliveryData);

      await updateDoc(doc(db, 'jobCards', selectedJobCard.id), {
        status: 'Delivered',
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'vehicles', selectedJobCard.vehicleId), {
        lastServiceDate,
        nextServiceDueDate,
        currentOdometer: odometerOut || null,
        updatedAt: serverTimestamp(),
      });

      const invoiceNumber = generateInvoiceNumber();
      const invoiceData = {
        invoiceNumber,
        jobCardId: selectedJobCard.id,
        jobCardNumber: selectedJobCard.jobCardNumber,
        customerId: selectedJobCard.customerId,
        customerName: selectedJobCard.customerName,
        vehicleDetails: `${vehicleBrand} ${vehicleModel} (${vehicleRegNo})`,
        companyDetails: 'ASC Auto Service Center\n123, Main Road, Dhaka\nPhone: +880-1700-000000\nEmail: info@asc.com',
        labourItems: (selectedJobCard.labourItems || []).map(({ id: _id, ...rest }) => rest),
        partsItems: (selectedJobCard.partsItems || []).map(({ id: _id, ...rest }) => rest),
        discount: 0,
        vat: 5,
        subtotal: selectedJobCard.grandTotal || 0,
        grandTotal: selectedJobCard.grandTotal || 0,
        paidAmount: 0,
        dueAmount: selectedJobCard.grandTotal || 0,
        status: 'Unpaid',
        createdAt: serverTimestamp(),
      };

      const invoiceRef = await addDoc(collection(db, 'invoices'), invoiceData);

      await addDoc(collection(db, 'calls'), {
        customerId: selectedJobCard.customerId,
        customerName: selectedJobCard.customerName,
        mobile: '',
        vehicleId: selectedJobCard.vehicleId,
        vehicleRegNo: vehicleRegNo,
        lastServiceDate,
        daysSinceService: 0,
        status: 'Pending',
        notes: 'Auto-generated: 30-day service reminder',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'activityLog'), {
        userId: '',
        userName: 'System',
        action: 'Vehicle Delivered',
        module: 'Deliveries',
        description: `Vehicle ${vehicleRegNo} delivered (Job Card: ${selectedJobCard.jobCardNumber}). Invoice ${invoiceNumber} generated.`,
        timestamp: serverTimestamp(),
      });

      enqueueSnackbar('Delivery completed successfully. Invoice generated.', { variant: 'success', action: (
        <Button color="inherit" size="small" onClick={() => navigate(`/billing/${invoiceRef.id}`)}>
          Print Invoice
        </Button>
      )});

      navigate('/delivery');
    } catch {
      enqueueSnackbar('Failed to complete delivery', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>New Delivery</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={() => navigate('/delivery')}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Complete Delivery'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Delivery Details</Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Autocomplete
                  options={jobCards}
                  getOptionLabel={(o) => `${o.jobCardNumber} - ${o.customerName} (${o.vehicleRegNo})`}
                  value={selectedJobCard}
                  onChange={(_, v) => setSelectedJobCard(v)}
                  renderInput={(params) => <TextField {...params} label="Select Job Card (Ready) *" />}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Delivery Date *"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Odometer Out"
                  type="number"
                  value={odometerOut}
                  onChange={(e) => setOdometerOut(e.target.value ? Number(e.target.value) : '')}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {selectedJobCard && (
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Job Card Summary</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2"><strong>Job Card:</strong> {selectedJobCard.jobCardNumber}</Typography>
                <Typography variant="body2"><strong>Customer:</strong> {selectedJobCard.customerName}</Typography>
                <Typography variant="body2"><strong>Vehicle:</strong> {selectedJobCard.vehicleRegNo}</Typography>
                <Typography variant="body2"><strong>Complaint:</strong> {selectedJobCard.complaintDescription}</Typography>
                <Typography variant="body2"><strong>Technician:</strong> {selectedJobCard.assignedTechnician || '-'}</Typography>
                <Typography variant="body2"><strong>Total:</strong> ৳{selectedJobCard.grandTotal?.toLocaleString() || '0'}</Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}