import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TextField,
  InputAdornment,
  Paper,
} from '@mui/material';
import { Add, Edit, Delete, Upload, Download } from '@mui/icons-material';
import { collection, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import ItemForm from './ItemForm';
import type { InventoryItem } from '../../types';

function getStockStatus(item: InventoryItem): { label: string; color: string } {
  if (item.currentStock <= 0) return { label: 'Out of Stock', color: '#d32f2f' };
  if (item.currentStock <= item.minimumStock) return { label: 'Low Stock', color: '#f57c00' };
  return { label: 'In Stock', color: '#388e3c' };
}

export default function ItemList() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return [...cats] as string[];
  }, [items]);

  const filteredData = useMemo(() => {
    return items.filter((item) => {
      if (filterCategory && item.category !== filterCategory) return false;
      if (filterStatus) {
        const status = getStockStatus(item).label;
        if (status !== filterStatus) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.itemCode.toLowerCase().includes(term) ||
          item.partName.toLowerCase().includes(term) ||
          (item.partNumber || '').toLowerCase().includes(term) ||
          (item.barcode || '').toLowerCase().includes(term);
        if (!match) return false;
      }
      if (barcodeSearch.trim()) {
        const bc = barcodeSearch.trim();
        if (item.barcode !== bc) return false;
      }
      return true;
    });
  }, [items, filterCategory, filterStatus, searchTerm, barcodeSearch]);

  const totalStockValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.currentStock * item.purchasePrice, 0);
  }, [items]);

  const handleAdd = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const handleEdit = (row: InventoryItem) => {
    setEditItem(row);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'inventory', deleteTarget.id));
      enqueueSnackbar('Item deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete item', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = items.map((item) => ({
      'Item Code': item.itemCode,
      'Part Name': item.partName,
      'Part Number': item.partNumber || '',
      'Category': item.category || '',
      'Brand': item.brand || '',
      'Unit': item.unit || '',
      'Purchase Price': item.purchasePrice,
      'Selling Price': item.sellingPrice,
      'Current Stock': item.currentStock,
      'Minimum Stock': item.minimumStock,
      'Rack Location': item.rackLocation || '',
      'Barcode': item.barcode || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    enqueueSnackbar('Inventory exported successfully', { variant: 'success' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
      let imported = 0;
      for (const row of rows) {
        const partName = row['Part Name'] || row['partName'] || row['part_name'] || '';
        if (!partName.trim()) continue;
        await addDoc(collection(db, 'inventory'), {
          itemCode: row['Item Code'] || row['itemCode'] || `IMP-${Date.now()}-${imported}`,
          partName,
          partNumber: row['Part Number'] || row['partNumber'] || '',
          category: row['Category'] || row['category'] || '',
          brand: row['Brand'] || row['brand'] || '',
          unit: row['Unit'] || row['unit'] || 'pcs',
          purchasePrice: Number(row['Purchase Price'] || row['purchasePrice'] || 0),
          sellingPrice: Number(row['Selling Price'] || row['sellingPrice'] || 0),
          currentStock: Number(row['Current Stock'] || row['currentStock'] || 0),
          minimumStock: Number(row['Minimum Stock'] || row['minimumStock'] || 0),
          availableStock: Number(row['Current Stock'] || row['currentStock'] || 0),
          reservedStock: 0,
          issuedStock: 0,
          rackLocation: row['Rack Location'] || row['rackLocation'] || '',
          barcode: row['Barcode'] || row['barcode'] || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        imported++;
      }
      enqueueSnackbar(`${imported} items imported successfully`, { variant: 'success' });
    } catch (err) {
      console.error('Import failed:', err);
      enqueueSnackbar('Failed to import items. Check file format.', { variant: 'error' });
    }
    e.target.value = '';
  };

  const columns: Column<InventoryItem>[] = [
    { id: 'itemCode', label: 'Item Code', width: 120, render: (r) => <Typography sx={{ fontWeight: 600 }}>{r.itemCode}</Typography> },
    { id: 'partName', label: 'Part Name', render: (r) => r.partName },
    { id: 'partNumber', label: 'Part Number', render: (r) => r.partNumber || '-' },
    { id: 'category', label: 'Category', render: (r) => r.category || '-' },
    { id: 'brand', label: 'Brand', render: (r) => r.brand || '-' },
    { id: 'currentStock', label: 'Stock', align: 'right', render: (r) => r.currentStock },
    { id: 'sellingPrice', label: 'Selling Price', align: 'right', render: (r) => `৳${r.sellingPrice?.toLocaleString() || '0'}` },
    { id: 'minimumStock', label: 'Min Stock', align: 'right', render: (r) => r.minimumStock },
    {
      id: 'status',
      label: 'Status',
      render: (r) => {
        const s = getStockStatus(r);
        return <Chip label={s.label} size="small" sx={{ color: '#fff', backgroundColor: s.color, fontWeight: 600, fontSize: 11 }} />;
      },
    },
  ];

  const actions: Action<InventoryItem>[] = [
    { label: 'Edit', icon: <Edit />, onClick: handleEdit },
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Inventory</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Upload />} onClick={() => importInputRef.current?.click()}>
            Import
          </Button>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
            Export
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            Add Item
          </Button>
        </Stack>
        <input ref={importInputRef} type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleImport} />
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Total Inventory Value</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>৳{totalStockValue.toLocaleString()}</Typography>
      </Paper>

      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{ input: {
            startAdornment: <InputAdornment position="start"><Add /></InputAdornment>,
          } }}
          sx={{ minWidth: 250 }}
        />
        <TextField
          size="small"
          placeholder="Scan barcode..."
          value={barcodeSearch}
          onChange={(e) => setBarcodeSearch(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Stock Status</InputLabel>
          <Select value={filterStatus} label="Stock Status" onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="In Stock">In Stock</MenuItem>
            <MenuItem value="Low Stock">Low Stock</MenuItem>
            <MenuItem value="Out of Stock">Out of Stock</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
      />

      <ItemForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editItem}
        onSave={() => {
          enqueueSnackbar(editItem ? 'Item updated successfully' : 'Item added successfully', { variant: 'success' });
        }}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.partName}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
