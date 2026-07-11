import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  Grid,
  Paper,
  Autocomplete,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
} from '@mui/material';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import type { JobCard, LabourItem, PartItem } from '../../types';

function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${dateStr}-${rand}`;
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [invoiceNumber] = useState(generateInvoiceNumber());
  const [saving, setSaving] = useState(false);

  const [companyDetails, setCompanyDetails] = useState('ASC Auto Service Center\n123, Main Road, Dhaka\nPhone: +880-1700-000000\nEmail: info@asc.com');
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);
  const [partsItems, setPartsItems] = useState<PartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [vat, setVat] = useState(5);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobCards'), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobCard));
      setJobCards(all.filter((j) => j.status !== 'Delivered' && j.status !== 'Cancelled'));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (selectedJobCard) {
      setLabourItems(selectedJobCard.labourItems || []);
      setPartsItems(selectedJobCard.partsItems || []);
    }
  }, [selectedJobCard]);

  const subtotal = [...labourItems, ...partsItems].reduce(
    (sum, item) => sum + ('amount' in item ? (item as LabourItem).amount : (item as PartItem).total),
    0,
  );
  const discountAmount = subtotal * (discount / 100);
  const vatAmount = (subtotal - discountAmount) * (vat / 100);
  const grandTotal = subtotal - discountAmount + vatAmount;
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const getStatus = () => {
    if (paidAmount >= grandTotal) return 'Paid' as const;
    if (paidAmount > 0) return 'Partial' as const;
    return 'Unpaid' as const;
  };

  const handleLabourChange = (index: number, field: keyof LabourItem, value: number) => {
    setLabourItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'rate' || field === 'discount') {
        item.amount = (item.quantity || 0) * (item.rate || 0) - (item.discount || 0);
      }
      updated[index] = item;
      return updated;
    });
  };

  const handlePartChange = (index: number, field: keyof PartItem, value: number) => {
    setPartsItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'sellingPrice' || field === 'discount') {
        item.total = (item.quantity || 0) * (item.sellingPrice || 0) - (item.discount || 0);
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedJobCard) {
      enqueueSnackbar('Please select a job card', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const invoiceData = {
        invoiceNumber,
        jobCardId: selectedJobCard.id,
        jobCardNumber: selectedJobCard.jobCardNumber,
        customerId: selectedJobCard.customerId,
        customerName: selectedJobCard.customerName,
        vehicleDetails: `${selectedJobCard.vehicleRegNo}`,
        companyDetails,
        labourItems: labourItems.map(({ id: _id, ...rest }) => rest),
        partsItems: partsItems.map(({ id: _id, ...rest }) => rest),
        discount,
        vat,
        subtotal,
        grandTotal,
        paidAmount,
        dueAmount,
        status: getStatus(),
        createdAt: serverTimestamp(),
      };

      const invoiceDoc = await addDoc(collection(db, 'invoices'), invoiceData);

      await updateDoc(doc(db, 'jobCards', selectedJobCard.id), {
        status: 'Delivered',
        updatedAt: serverTimestamp(),
      });

      enqueueSnackbar('Invoice created successfully', { variant: 'success' });
      navigate(`/billing/${invoiceDoc.id}`);
    } catch {
      enqueueSnackbar('Failed to create invoice', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Generate Invoice</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={() => navigate('/billing')}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save Invoice'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Invoice Details</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Invoice Number" value={invoiceNumber} fullWidth disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Date" value={format(new Date(), 'dd/MM/yyyy')} fullWidth disabled />
              </Grid>
              <Grid size={12}>
                <Autocomplete
                  options={jobCards}
                  getOptionLabel={(o) => `${o.jobCardNumber} - ${o.customerName} (${o.vehicleRegNo})`}
                  value={selectedJobCard}
                  onChange={(_, v) => setSelectedJobCard(v)}
                  renderInput={(params) => <TextField {...params} label="Select Job Card *" />}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField label="Company Details" multiline rows={4} value={companyDetails} onChange={(e) => setCompanyDetails(e.target.value)} fullWidth />
              </Grid>
            </Grid>
          </Paper>

          {selectedJobCard && (
            <>
              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Customer & Vehicle</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Customer Name" value={selectedJobCard.customerName} fullWidth disabled />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Vehicle Registration" value={selectedJobCard.vehicleRegNo} fullWidth disabled />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Odometer" value={selectedJobCard.odometerReading || '-'} fullWidth disabled />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Complaint" value={selectedJobCard.complaintDescription || '-'} fullWidth disabled />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Technician" value={selectedJobCard.assignedTechnician || '-'} fullWidth disabled />
                  </Grid>
                </Grid>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Labour Charges</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Discount</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {labourItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.labourName}</TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={item.quantity} onChange={(e) => handleLabourChange(index, 'quantity', Number(e.target.value))} sx={{ width: 70 }} />
                        </TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={item.rate} onChange={(e) => handleLabourChange(index, 'rate', Number(e.target.value))} sx={{ width: 90 }} />
                        </TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={item.discount} onChange={(e) => handleLabourChange(index, 'discount', Number(e.target.value))} sx={{ width: 80 }} />
                        </TableCell>
                        <TableCell align="right">৳{item.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Parts Charges</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Part #</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Discount</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partsItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.partNumber || '-'}</TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={item.quantity} onChange={(e) => handlePartChange(index, 'quantity', Number(e.target.value))} sx={{ width: 70 }} />
                        </TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={item.sellingPrice} onChange={(e) => handlePartChange(index, 'sellingPrice', Number(e.target.value))} sx={{ width: 90 }} />
                        </TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={item.discount} onChange={(e) => handlePartChange(index, 'discount', Number(e.target.value))} sx={{ width: 80 }} />
                        </TableCell>
                        <TableCell align="right">৳{item.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Totals</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Subtotal:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>৳{subtotal.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Discount (%):</Typography>
              <TextField type="number" size="small" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} sx={{ width: 100 }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Discount Amount:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>-৳{discountAmount.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">VAT (%):</Typography>
              <TextField type="number" size="small" value={vat} onChange={(e) => setVat(Number(e.target.value))} sx={{ width: 100 }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">VAT Amount:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>৳{vatAmount.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand Total:</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>৳{grandTotal.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Paid Amount:</Typography>
              <TextField type="number" size="small" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} sx={{ width: 120 }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="error">Due Amount:</Typography>
              <Typography variant="body2" color="error" sx={{ fontWeight: 700 }}>৳{dueAmount.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Status:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }} color={status === 'Paid' ? 'success.main' : status === 'Partial' ? 'warning.main' : 'error.main'}>
                {getStatus()}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}