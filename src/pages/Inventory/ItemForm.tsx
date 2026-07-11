import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  MenuItem,
  Autocomplete,
  Grid,


} from '@mui/material';
import { addDoc, collection, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { InventoryItem, Supplier } from '../../types';

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSave: () => void;
}

const units = ['Pcs', 'Box', 'Liter', 'Kg', 'Meter'];

function generateItemCode(): string {
  const now = new Date();
  const prefix = 'ITM';
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${dateStr}-${rand}`;
}

export default function ItemForm({ open, onClose, item, onSave }: ItemFormProps) {
  const isEdit = !!item;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    itemCode: item?.itemCode || generateItemCode(),
    barcode: item?.barcode || '',
    qrCode: item?.qrCode || '',
    partNumber: item?.partNumber || '',
    partName: item?.partName || '',
    category: item?.category || '',
    brand: item?.brand || '',
    unit: item?.unit || 'Pcs',
    purchasePrice: item?.purchasePrice?.toString() || '0',
    sellingPrice: item?.sellingPrice?.toString() || '0',
    minimumStock: item?.minimumStock?.toString() || '0',
    currentStock: item?.currentStock?.toString() || '0',
    availableStock: item?.availableStock?.toString() || '0',
    reservedStock: item?.reservedStock?.toString() || '0',
    issuedStock: item?.issuedStock?.toString() || '0',
    rackLocation: item?.rackLocation || '',
    supplierId: item?.supplierId || '',
  });
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const unsub = onSnapshot(collection(db, 'suppliers'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier));
        setSuppliers(list);
      });
      return unsub;
    }
  }, [open]);

  useEffect(() => {
    if (item && suppliers.length > 0) {
      const found = suppliers.find((s) => s.id === item.supplierId);
      setSelectedSupplier(found || null);
    }
  }, [item, suppliers]);

  useEffect(() => {
    const cur = Number(formData.currentStock) || 0;
    const res = Number(formData.reservedStock) || 0;
    setFormData((prev) => ({ ...prev, availableStock: String(Math.max(0, cur - res)) }));
  }, [formData.currentStock, formData.reservedStock]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.partName.trim()) newErrors.partName = 'Part name is required';
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.sellingPrice || Number(formData.sellingPrice) <= 0)
      newErrors.sellingPrice = 'Selling price must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data = {
        itemCode: formData.itemCode,
        barcode: formData.barcode || null,
        qrCode: formData.qrCode || null,
        partNumber: formData.partNumber || null,
        partName: formData.partName,
        category: formData.category || null,
        brand: formData.brand || null,
        unit: formData.unit,
        purchasePrice: Number(formData.purchasePrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        minimumStock: Number(formData.minimumStock) || 0,
        currentStock: Number(formData.currentStock) || 0,
        availableStock: Number(formData.availableStock) || 0,
        reservedStock: Number(formData.reservedStock) || 0,
        issuedStock: Number(formData.issuedStock) || 0,
        rackLocation: formData.rackLocation || null,
        supplier: selectedSupplier?.name || null,
        supplierId: selectedSupplier?.id || null,
      };

      if (isEdit && item) {
        await updateDoc(doc(db, 'inventory', item.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'inventory'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      onSave();
      onClose();
    } catch {
      setErrors((prev) => ({ ...prev, submit: 'Failed to save item' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Item' : 'Add Item'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Item Code" value={formData.itemCode} onChange={handleChange('itemCode')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Barcode" value={formData.barcode} onChange={handleChange('barcode')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="QR Code" value={formData.qrCode} onChange={handleChange('qrCode')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Part Number" value={formData.partNumber} onChange={handleChange('partNumber')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Part Name *"
                value={formData.partName}
                onChange={handleChange('partName')}
                error={!!errors.partName}
                helperText={errors.partName}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Category"
                value={formData.category}
                onChange={handleChange('category')}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Brand" value={formData.brand} onChange={handleChange('brand')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Unit *"
                value={formData.unit}
                onChange={handleChange('unit')}
                select
                fullWidth
                required
                error={!!errors.unit}
                helperText={errors.unit}
              >
                {units.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Purchase Price" type="number" value={formData.purchasePrice} onChange={handleChange('purchasePrice')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Selling Price *"
                type="number"
                value={formData.sellingPrice}
                onChange={handleChange('sellingPrice')}
                error={!!errors.sellingPrice}
                helperText={errors.sellingPrice}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Minimum Stock" type="number" value={formData.minimumStock} onChange={handleChange('minimumStock')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Current Stock" type="number" value={formData.currentStock} onChange={handleChange('currentStock')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Available Stock" type="number" value={formData.availableStock} onChange={handleChange('availableStock')} fullWidth slotProps={{ input: { readOnly: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Reserved Stock" type="number" value={formData.reservedStock} onChange={handleChange('reservedStock')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Issued Stock" type="number" value={formData.issuedStock} onChange={handleChange('issuedStock')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Rack Location" value={formData.rackLocation} onChange={handleChange('rackLocation')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(o) => `${o.name} (${o.mobile})`}
                value={selectedSupplier}
                onChange={(_, v) => setSelectedSupplier(v)}
                renderInput={(params) => <TextField {...params} label="Supplier" />}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
