import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Grid,


  IconButton,
  Paper,
  Autocomplete,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Add, Remove, CloudUpload } from '@mui/icons-material';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import type { Customer, Vehicle, InventoryItem, LabourItem, PartItem, JobCard, JobCardPriority, JobCardStatus } from '../../types';

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

function generateJobCardNumber(): string {
  const now = new Date();
  const dateStr = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `JC-${dateStr}-${rand}`;
}

const emptyLabour: LabourItem = { id: '', labourName: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 };
const emptyPart: PartItem = { id: '', itemId: '', itemName: '', partNumber: '', quantity: 1, sellingPrice: 0, discount: 0, total: 0 };

export default function JobCardForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [jobCardNumber] = useState(generateJobCardNumber());
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [odometerReading, setOdometerReading] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [priority, setPriority] = useState<JobCardPriority>('Medium');
  const [status, setStatus] = useState<JobCardStatus>('Open');
  const [notes, setNotes] = useState('');

  const [labourItems, setLabourItems] = useState<LabourItem[]>([{ ...emptyLabour, id: generateId() }]);
  const [partsItems, setPartsItems] = useState<PartItem[]>([{ ...emptyPart, id: generateId() }]);

  const [attachments, setAttachments] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);

  useEffect(() => {
    const unsubCust = onSnapshot(collection(db, 'customers'), (snap) =>
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)))
    );
    const unsubVeh = onSnapshot(collection(db, 'vehicles'), (snap) =>
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)))
    );
    const unsubInv = onSnapshot(collection(db, 'inventory'), (snap) =>
      setInventoryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem)))
    );
    const unsubTech = onSnapshot(collection(db, 'technicians'), (snap) =>
      setTechnicians(snap.docs.map((d) => d.data().name as string))
    );

    if (isEdit && id) {
      const unsubJc = onSnapshot(doc(db, 'jobCards', id), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as JobCard;
        setDate(formatDateInput(data.date));
        setSelectedVehicle(vehicles.find((v) => v.id === data.vehicleId) || null);
        setOdometerReading(String(data.odometerReading || ''));
        setComplaintDescription(data.complaintDescription || '');
        setInspectionNotes(data.inspectionNotes || '');
        setEstimatedDelivery(formatDateInput(data.estimatedDelivery));
        setAssignedTechnician(data.assignedTechnician || '');
        setPriority(data.priority || 'Medium');
        setStatus(data.status || 'Open');
        setNotes(data.notes || '');
        if (data.labourItems?.length) setLabourItems(data.labourItems.map((l: LabourItem) => ({ ...l, id: l.id || generateId() })));
        if (data.partsItems?.length) setPartsItems(data.partsItems.map((p: PartItem) => ({ ...p, id: p.id || generateId() })));
        setExistingAttachments(data.attachments || []);
        setExistingPhotos(data.photos || []);
      });
      return () => unsubJc();
    }

    return () => {
      unsubCust();
      unsubVeh();
      unsubInv();
      unsubTech();
    };
  }, [id, isEdit]);

  useEffect(() => {
    if (selectedVehicle) {
      setSelectedCustomer(customers.find((c) => c.id === selectedVehicle.customerId) || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedVehicle, customers]);

  function formatDateInput(val: unknown): string {
    if (!val) return '';
    if (val instanceof Date) return format(val, 'yyyy-MM-dd');
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return format((val as { toDate: () => Date }).toDate(), 'yyyy-MM-dd');
    }
    return String(val).slice(0, 10);
  }

  const handleLabourChange = (index: number, field: keyof LabourItem, value: string | number) => {
    setLabourItems((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        const changed = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate' || field === 'discount') {
          const qty = changed.quantity || 0;
          const rate = changed.rate || 0;
          const disc = changed.discount || 0;
          changed.amount = qty * rate - disc;
        }
        return changed;
      });
      return updated;
    });
  };

  const removeLabour = (index: number) => {
    if (labourItems.length === 1) return;
    setLabourItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addLabour = () => {
    setLabourItems((prev) => [...prev, { ...emptyLabour, id: generateId() }]);
  };

  const handlePartChange = (index: number, field: keyof PartItem, value: string | number) => {
    setPartsItems((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        const changed = { ...item, [field]: value };
        if (field === 'itemId' && typeof value === 'string') {
          const invItem = inventoryItems.find((inv) => inv.id === value);
          if (invItem) {
            changed.itemName = invItem.partName;
            changed.partNumber = invItem.partNumber || '';
            changed.sellingPrice = invItem.sellingPrice;
          }
        }
        if (field === 'quantity' || field === 'sellingPrice' || field === 'discount') {
          const qty = changed.quantity || 0;
          const price = changed.sellingPrice || 0;
          const disc = changed.discount || 0;
          changed.total = qty * price - disc;
        }
        return changed;
      });
      return updated;
    });
  };

  const addPart = () => {
    setPartsItems((prev) => [...prev, { ...emptyPart, id: generateId() }]);
  };

  const removePart = (index: number) => {
    if (partsItems.length === 1) return;
    setPartsItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalLabour = labourItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalParts = partsItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const grandTotal = totalLabour + totalParts;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'attachments' | 'photos') => {
    const files = Array.from(e.target.files || []);
    if (type === 'attachments') setAttachments((prev) => [...prev, ...files]);
    else setPhotos((prev) => [...prev, ...files]);
  };

  const uploadFiles = async (files: File[], pathPrefix: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const fileRef = ref(storage, `${pathPrefix}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      urls.push(url);
    }
    return urls;
  };

  const handleSave = async () => {
    if (!selectedVehicle || !selectedCustomer) {
      enqueueSnackbar('Please select a vehicle', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const attachmentUrls = attachments.length ? await uploadFiles(attachments, `jobCards/${jobCardNumber}/attachments`) : [];
      const photoUrls = photos.length ? await uploadFiles(photos, `jobCards/${jobCardNumber}/photos`) : [];

      const payload = {
        jobCardNumber,
        date: new Date(date),
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        vehicleId: selectedVehicle.id,
        vehicleRegNo: selectedVehicle.registrationNumber,
        odometerReading: Number(odometerReading) || 0,
        complaintDescription,
        inspectionNotes,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        assignedTechnician,
        priority,
        status,
        notes,
        labourItems: labourItems.map(({ id: _id, ...rest }) => rest),
        partsItems: partsItems.map(({ id: _id, ...rest }) => rest),
        totalLabour,
        totalParts,
        grandTotal,
        attachments: [...existingAttachments, ...attachmentUrls],
        photos: [...existingPhotos, ...photoUrls],
        updatedAt: serverTimestamp(),
      };

      if (isEdit && id) {
        await updateDoc(doc(db, 'jobCards', id), payload);
        enqueueSnackbar('Job card updated successfully', { variant: 'success' });
      } else {
        await addDoc(collection(db, 'jobCards'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        enqueueSnackbar('Job card created successfully', { variant: 'success' });
      }
      navigate('/jobcards');
    } catch (err) {
      console.error('Failed to save job card:', err);
      enqueueSnackbar('Failed to save job card', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{isEdit ? 'Edit Job Card' : 'New Job Card'}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={() => navigate('/jobcards')}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Basic Information</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Job Card Number" value={jobCardNumber} fullWidth disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={12}>
                <Autocomplete
                  options={vehicles}
                  getOptionLabel={(o) => `${o.registrationNumber} - ${o.brand} ${o.model} (${o.chassisNumber || ''})`}
                  value={selectedVehicle}
                  onChange={(_, v) => setSelectedVehicle(v)}
                  renderInput={(params) => <TextField {...params} label="Vehicle *" />}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Odometer Reading" type="number" value={odometerReading} onChange={(e) => setOdometerReading(e.target.value)} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Estimated Delivery"
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField label="Complaint Description" multiline rows={3} value={complaintDescription} onChange={(e) => setComplaintDescription(e.target.value)} fullWidth />
              </Grid>
              <Grid size={12}>
                <TextField label="Inspection Notes" multiline rows={3} value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} fullWidth />
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Labour Items</Typography>
            {labourItems.map((item, index) => (
              <Box key={item.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, position: 'relative' }}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField label="Labour Name" size="small" value={item.labourName} onChange={(e) => handleLabourChange(index, 'labourName', e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField label="Description" size="small" value={item.description} onChange={(e) => handleLabourChange(index, 'description', e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 1 }}>
                    <TextField label="Qty" type="number" size="small" value={item.quantity} onChange={(e) => handleLabourChange(index, 'quantity', Number(e.target.value))} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField label="Rate" type="number" size="small" value={item.rate} onChange={(e) => handleLabourChange(index, 'rate', Number(e.target.value))} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 1.5 }}>
                    <TextField label="Disc." type="number" size="small" value={item.discount} onChange={(e) => handleLabourChange(index, 'discount', Number(e.target.value))} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 4, sm: 1 }}>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>৳{item.amount}</Typography>
                  </Grid>
                  <Grid size="auto">
                    <IconButton color="error" size="small" onClick={() => removeLabour(index)} disabled={labourItems.length === 1}>
                      <Remove />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            ))}
            <Button startIcon={<Add />} onClick={addLabour} size="small">Add Labour Item</Button>
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total Labour: ৳{totalLabour.toLocaleString()}</Typography>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Parts Items</Typography>
            {partsItems.map((item, index) => {
              const invItem = inventoryItems.find((inv) => inv.id === item.itemId);
              const lowStock = invItem && item.quantity > invItem.availableStock;
              return (
                <Box
                  key={item.id}
                  sx={{ mb: 3, p: 2, border: 1, borderColor: lowStock ? 'error.main' : 'divider', borderRadius: 1, position: 'relative' }}
                >
                  <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <Autocomplete
                        options={inventoryItems}
                        getOptionLabel={(o) => `${o.partName} (${o.partNumber || ''})`}
                        value={inventoryItems.find((inv) => inv.id === item.itemId) || null}
                        onChange={(_, v) => handlePartChange(index, 'itemId', v?.id || '')}
                        renderInput={(params) => (
                          <TextField {...params} label="Item Search" size="small" error={lowStock} helperText={lowStock ? `Stock: ${invItem?.availableStock}` : ''} />
                        )}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 1.5 }}>
                      <TextField label="Part #" size="small" value={item.partNumber} onChange={(e) => handlePartChange(index, 'partNumber', e.target.value)} fullWidth />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 1 }}>
                      <TextField label="Qty" type="number" size="small" value={item.quantity} onChange={(e) => handlePartChange(index, 'quantity', Number(e.target.value))} fullWidth error={lowStock} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }}>
                      <TextField label="Price" type="number" size="small" value={item.sellingPrice} onChange={(e) => handlePartChange(index, 'sellingPrice', Number(e.target.value))} fullWidth />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 1.5 }}>
                      <TextField label="Disc." type="number" size="small" value={item.discount} onChange={(e) => handlePartChange(index, 'discount', Number(e.target.value))} fullWidth />
                    </Grid>
                    <Grid size={{ xs: 4, sm: 1 }}>
                      <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>৳{item.total}</Typography>
                    </Grid>
                    <Grid size="auto">
                      <IconButton color="error" size="small" onClick={() => removePart(index)} disabled={partsItems.length === 1}>
                        <Remove />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
            <Button startIcon={<Add />} onClick={addPart} size="small">Add Part Item</Button>
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total Parts: ৳{totalParts.toLocaleString()}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Assignment</Typography>
            <TextField
              label="Assigned Technician"
              select
              value={assignedTechnician}
              onChange={(e) => setAssignedTechnician(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            >
              <MenuItem value="">None</MenuItem>
              {technicians.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Priority"
              select
              value={priority}
              onChange={(e) => setPriority(e.target.value as JobCardPriority)}
              fullWidth
              sx={{ mb: 2 }}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Urgent">Urgent</MenuItem>
            </TextField>
            <TextField
              label="Status"
              select
              value={status}
              onChange={(e) => setStatus(e.target.value as JobCardStatus)}
              fullWidth
            >
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="Waiting Parts">Waiting Parts</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Ready">Ready</MenuItem>
              <MenuItem value="Delivered">Delivered</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Notes & Files</Typography>
            <TextField label="Notes" multiline rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth sx={{ mb: 2 }} />

            <Button variant="outlined" component="label" startIcon={<CloudUpload />} fullWidth sx={{ mb: 1 }}>
              Upload Attachments
              <input type="file" hidden multiple onChange={(e) => handleFileChange(e, 'attachments')} />
            </Button>
            {existingAttachments.length > 0 && (
              <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {existingAttachments.map((_url, i) => (
                  <Chip key={i} label={`File ${i + 1}`} size="small" />
                ))}
              </Box>
            )}

            <Button variant="outlined" component="label" startIcon={<CloudUpload />} fullWidth>
              Upload Photos
              <input type="file" hidden multiple accept="image/*" onChange={(e) => handleFileChange(e, 'photos')} />
            </Button>
            {existingPhotos.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {existingPhotos.map((_url, i) => (
                  <Chip key={i} label={`Photo ${i + 1}`} size="small" />
                ))}
              </Box>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Summary</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Labour Total:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>৳{totalLabour.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Parts Total:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>৳{totalParts.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand Total:</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>৳{grandTotal.toLocaleString()}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}