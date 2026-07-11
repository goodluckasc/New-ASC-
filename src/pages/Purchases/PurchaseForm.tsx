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
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import {
  collection,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import type { InventoryItem, Supplier, PurchaseItem } from '../../types';

function generatePurchaseNumber(): string {
  const now = new Date();
  const dateStr = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `PO-${dateStr}-${rand}`;
}

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
}

let lineItemCounter = 0;

function createLineItem(): LineItem {
  lineItemCounter += 1;
  return { id: `line_${lineItemCounter}`, itemId: '', itemName: '', partNumber: '', quantity: 1, unitCost: 0 };
}

export default function PurchaseForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [purchaseNumber] = useState(generatePurchaseNumber());
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([createLineItem()]);
  const [discount, setDiscount] = useState(0);
  const [vat, setVat] = useState(0);
  const [paid, setPaid] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier)));
    });
    const unsubItems = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventoryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
    return () => {
      unsubSuppliers();
      unsubItems();
    };
  }, []);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const discountAmount = subtotal * (discount / 100);
  const vatAmount = (subtotal - discountAmount) * (vat / 100);
  const total = subtotal - discountAmount + vatAmount;
  const due = Math.max(0, total - paid);

  const handleAddLine = () => setLineItems((prev) => [...prev, createLineItem()]);

  const handleRemoveLine = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        const updated = { ...li, [field]: value };
        if (field === 'itemId') {
          const invItem = inventoryItems.find((i) => i.id === value);
          if (invItem) {
            updated.itemName = invItem.partName;
            updated.partNumber = invItem.partNumber || '';
            updated.unitCost = invItem.purchasePrice || 0;
          }
        }
        return updated;
      }),
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedSupplier) newErrors.supplier = 'Supplier is required';
    if (lineItems.length === 0 || lineItems.every((li) => !li.itemId)) {
      newErrors.items = 'At least one item is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!selectedSupplier) return;
    setSaving(true);
    try {
      const items: PurchaseItem[] = lineItems
        .filter((li) => li.itemId)
        .map((li) => ({
          id: li.id,
          itemId: li.itemId,
          itemName: li.itemName,
          partNumber: li.partNumber,
          quantity: li.quantity,
          unitCost: li.unitCost,
        }));

      await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(collection(db, 'purchases'));
        transaction.set(purchaseRef, {
          purchaseNumber,
          date,
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name,
          invoiceNumber: invoiceNumber || null,
          items,
          subtotal,
          discount,
          vat,
          total,
          paid,
          due,
          createdAt: serverTimestamp(),
        });

        for (const item of items) {
          const invRef = doc(db, 'inventory', item.itemId);
          const invSnap = await transaction.get(invRef);
          if (invSnap.exists()) {
            const data = invSnap.data();
            transaction.update(invRef, {
              currentStock: (data.currentStock || 0) + item.quantity,
              availableStock: Math.max(0, (data.currentStock || 0) + item.quantity - (data.reservedStock || 0)),
              updatedAt: serverTimestamp(),
            });
          }
        }

        const supRef = doc(db, 'suppliers', selectedSupplier.id);
        const supSnap = await transaction.get(supRef);
        if (supSnap.exists()) {
          const supData = supSnap.data();
          transaction.update(supRef, {
            currentDue: (supData.currentDue || 0) + due,
          });
        }
      });

      enqueueSnackbar('Purchase created successfully', { variant: 'success' });
      navigate('/purchases');
    } catch {
      enqueueSnackbar('Failed to create purchase', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>New Purchase</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={() => navigate('/purchases')}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save Purchase'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Purchase Details</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Purchase Number" value={purchaseNumber} fullWidth disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Invoice Number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} fullWidth />
              </Grid>
              <Grid size={12}>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(o) => `${o.name} (${o.mobile})`}
                  value={selectedSupplier}
                  onChange={(_, v) => {
                    setSelectedSupplier(v);
                    if (errors.supplier) setErrors((prev) => ({ ...prev, supplier: '' }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Supplier *"
                      error={!!errors.supplier}
                      helperText={errors.supplier}
                    />
                  )}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Items</Typography>
              <Button size="small" startIcon={<Add />} onClick={handleAddLine}>Add Item</Button>
            </Box>
            {errors.items && (
              <Typography color="error" variant="caption" sx={{ mb: 1, display: 'block' }}>
                {errors.items}
              </Typography>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200 }}>Item</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Quantity</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Unit Cost</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Subtotal</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((li) => {
                  const lineSubtotal = li.quantity * li.unitCost;
                  return (
                    <TableRow key={li.id}>
                      <TableCell>
                        <Autocomplete
                          options={inventoryItems}
                          getOptionLabel={(o) => `${o.partName} (${o.itemCode})`}
                          value={inventoryItems.find((i) => i.id === li.itemId) || null}
                          onChange={(_, v) => handleLineItemChange(li.id, 'itemId', v?.id || '')}
                          renderInput={(params) => <TextField {...params} size="small" placeholder="Search item..." />}
                          isOptionEqualToValue={(o, v) => o.id === v.id}
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={li.quantity}
                          onChange={(e) => handleLineItemChange(li.id, 'quantity', Number(e.target.value))}
                          sx={{ width: 80 }}
                          slotProps={{ htmlInput: { min: 1 } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={li.unitCost}
                          onChange={(e) => handleLineItemChange(li.id, 'unitCost', Number(e.target.value))}
                          sx={{ width: 100 }}
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>৳{lineSubtotal.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleRemoveLine(li.id)} disabled={lineItems.length <= 1}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
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
              <TextField type="number" size="small" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} sx={{ width: 100 }} slotProps={{ htmlInput: { min: 0, max: 100 } }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Discount Amount:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>-৳{discountAmount.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">VAT (%):</Typography>
              <TextField type="number" size="small" value={vat} onChange={(e) => setVat(Number(e.target.value))} sx={{ width: 100 }} slotProps={{ htmlInput: { min: 0, max: 100 } }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">VAT Amount:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>৳{vatAmount.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total:</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>৳{total.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Paid:</Typography>
              <TextField type="number" size="small" value={paid} onChange={(e) => setPaid(Number(e.target.value))} sx={{ width: 120 }} slotProps={{ htmlInput: { min: 0 } }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="error">Due:</Typography>
              <Typography variant="body2" color="error" sx={{ fontWeight: 700 }}>৳{due.toLocaleString()}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
