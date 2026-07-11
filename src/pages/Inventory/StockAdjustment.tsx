import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import { Add } from '@mui/icons-material';
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
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import type { StockAdjustment, StockAdjustmentType, InventoryItem } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

const adjustmentTypes: StockAdjustmentType[] = ['Damage', 'Lost', 'Manual', 'Expired'];

export default function StockAdjustment() {
  const { enqueueSnackbar } = useSnackbar();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('Manual');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubAdj = onSnapshot(
      collection(db, 'stockAdjustments'),
      (snapshot) => {
        setAdjustments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StockAdjustment)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    const unsubItems = onSnapshot(collection(db, 'inventory'), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
    return () => {
      unsubAdj();
      unsubItems();
    };
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedItem) newErrors.item = 'Please select an item';
    if (!quantity || quantity === 0) newErrors.quantity = 'Quantity is required';
    else if (quantity < 0) newErrors.quantity = 'Quantity must be positive';
    else if (selectedItem && quantity > selectedItem.currentStock) {
      newErrors.quantity = `Cannot adjust more than current stock (${selectedItem.currentStock})`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!selectedItem) return;
    setSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'inventory', selectedItem.id);
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) throw new Error('Item not found');

        const currentStock = itemSnap.data().currentStock || 0;
        const newStock = currentStock - quantity;

        if (newStock < 0) {
          throw new Error('Insufficient stock');
        }

        transaction.update(itemRef, {
          currentStock: newStock,
          availableStock: Math.max(0, newStock - (itemSnap.data().reservedStock || 0)),
          updatedAt: serverTimestamp(),
        });

        const adjRef = doc(collection(db, 'stockAdjustments'));
        transaction.set(adjRef, {
          itemId: selectedItem.id,
          itemName: selectedItem.partName,
          type: adjustmentType,
          quantity,
          reason: reason || null,
          createdAt: serverTimestamp(),
        });

        const logRef = doc(collection(db, 'activityLogs'));
        transaction.set(logRef, {
          userId: '',
          userName: 'System',
          action: 'Stock Adjustment',
          module: 'inventory',
          description: `${adjustmentType}: ${quantity} x ${selectedItem.partName}`,
          timestamp: serverTimestamp(),
        });
      });

      enqueueSnackbar('Stock adjustment completed', { variant: 'success' });
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to adjust stock';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setAdjustmentType('Manual');
    setQuantity(0);
    setReason('');
    setErrors({});
  };

  const columns: Column<StockAdjustment>[] = [
    { id: 'date', label: 'Date', render: (r) => formatDate(r.createdAt) },
    { id: 'itemName', label: 'Item', render: (r) => r.itemName },
    { id: 'type', label: 'Type', render: (r) => r.type },
    { id: 'quantity', label: 'Quantity', align: 'right', render: (r) => r.quantity },
    { id: 'reason', label: 'Reason', render: (r) => r.reason || '-' },
  ];

  const actions: Action<StockAdjustment>[] = [];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Stock Adjustments</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          New Adjustment
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={adjustments}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
      />

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>New Stock Adjustment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Autocomplete
              options={items}
              getOptionLabel={(o) => `${o.partName} (${o.itemCode}) - Stock: ${o.currentStock}`}
              value={selectedItem}
              onChange={(_, v) => {
                setSelectedItem(v);
                if (errors.item) setErrors((prev) => ({ ...prev, item: '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Item *"
                  error={!!errors.item}
                  helperText={errors.item}
                />
              )}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            <TextField
              label="Adjustment Type"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as StockAdjustmentType)}
              select
              fullWidth
            >
              {adjustmentTypes.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Quantity *"
              type="number"
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: '' }));
              }}
              error={!!errors.quantity}
              helperText={errors.quantity}
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            {selectedItem && (
              <Typography variant="body2" color="text.secondary">
                Current stock: <strong>{selectedItem.currentStock}</strong>
                {' | '}After adjustment: <strong>{Math.max(0, selectedItem.currentStock - quantity)}</strong>
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
