import { useState, type ReactNode } from 'react';
import {
  Box, Tabs, Tab, Typography, Paper, Button, TextField, Grid,
  Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
  TablePagination, Chip, Stack, IconButton, Tooltip,
} from '@mui/material';
import { PictureAsPdf, TableChart, GridOn, Print, Refresh } from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
}

const tabs = [
  'Daily Report', 'Monthly Report', 'Labour Report', 'Parts Sales',
  'Service Report', 'Technician Report', 'Customer Report', 'Vehicle History',
  'Due Report', 'Collection Report', 'Call Report', 'Follow-up Report',
  'Inventory Report', 'Profit & Loss',
];

const M = {
  d: { opened: 12, completed: 8, revenue: 285000, parts: 142 },
  m: { jobs: 58, completed: 42, cancelled: 3, revenue: 1580000, labour: 620000, parts: 960000, expenses: 350000, profit: 1230000 },
  l: [
    { t: 'Rahim Khan', j: 18, i: 185000, a: 10278 },
    { t: 'Karim Ali', j: 15, i: 142000, a: 9467 },
    { t: 'Jamal Hossain', j: 12, i: 98000, a: 8167 },
    { t: 'Faruk Ahmed', j: 10, i: 85000, a: 8500 },
    { t: 'Salam Uddin', j: 8, i: 72000, a: 9000 },
  ],
  p: [
    { n: 'Engine Oil 5W-30', pn: 'EO-5030', q: 45, up: 1200, t: 54000 },
    { n: 'Oil Filter', pn: 'OF-100', q: 38, up: 450, t: 17100 },
    { n: 'Air Filter', pn: 'AF-200', q: 25, up: 650, t: 16250 },
    { n: 'Brake Pad Set', pn: 'BP-300', q: 18, up: 2800, t: 50400 },
    { n: 'Spark Plug', pn: 'SP-400', q: 32, up: 350, t: 11200 },
    { n: 'Battery 60Ah', pn: 'BT-60', q: 8, up: 6500, t: 52000 },
  ],
  s: [
    { ty: 'Full Service', c: 22, r: 440000 },
    { ty: 'Oil Change', c: 35, r: 175000 },
    { ty: 'Brake Service', c: 15, r: 180000 },
    { ty: 'AC Service', c: 12, r: 144000 },
    { ty: 'Engine Repair', c: 8, r: 320000 },
    { ty: 'Tyre Replacement', c: 20, r: 240000 },
  ],
  tc: [
    { n: 'Rahim Khan', t: 18, d: 16, r: 89, re: 285000 },
    { n: 'Karim Ali', t: 15, d: 14, r: 93, re: 222000 },
    { n: 'Jamal Hossain', t: 13, d: 11, r: 85, re: 178000 },
    { n: 'Faruk Ahmed', t: 11, d: 10, r: 91, re: 145000 },
    { n: 'Salam Uddin', t: 9, d: 8, r: 89, re: 112000 },
  ],
  cu: [
    { n: 'Md. Karim Hossain', m: '01711-111111', v: 3, sv: 125000 },
    { n: 'Fatima Begum', m: '01722-222222', v: 2, sv: 89000 },
    { n: 'Rafiq Uddin Ahmed', m: '01733-333333', v: 4, sv: 210000 },
    { n: 'Shahidul Islam', m: '01744-444444', v: 1, sv: 45000 },
    { n: 'Nasrin Akhter', m: '01755-555555', v: 2, sv: 67000 },
    { n: 'Kamal Hossain', m: '01766-666666', v: 3, sv: 156000 },
  ],
  vh: [
    { r: 'Dhaka-12-3456', b: 'Toyota', mo: 'Allion', d: '12-Jun-2026', ty: 'Full Service', am: 35000, te: 'Rahim Khan' },
    { r: 'Dhaka-12-3456', b: 'Toyota', mo: 'Allion', d: '15-May-2026', ty: 'Oil Change', am: 8500, te: 'Karim Ali' },
    { r: 'Dhaka-34-7890', b: 'Honda', mo: 'Civic', d: '10-Jun-2026', ty: 'AC Service', am: 15000, te: 'Faruk Ahmed' },
  ],
  due: [
    { i: 'INV-0089', c: 'Md. Karim', v: 'Dhaka-12-3456', t: 45000, du: 15000, da: 5 },
    { i: 'INV-0085', c: 'Fatima Begum', v: 'Dhaka-34-7890', t: 32000, du: 32000, da: 12 },
    { i: 'INV-0082', c: 'Rafiq Ahmed', v: 'Dhaka-56-1234', t: 78000, du: 25000, da: 3 },
  ],
  col: [
    { d: '01-Jun-2026', c: 'Md. Karim', i: 'INV-0085', a: 32000, m: 'Cash', b: 'Admin' },
    { d: '03-Jun-2026', c: 'Fatima Begum', i: 'INV-0083', a: 45000, m: 'Mobile Banking', b: 'Admin' },
    { d: '05-Jun-2026', c: 'Rafiq Ahmed', i: 'INV-0081', a: 28000, m: 'Card', b: 'Accounts' },
  ],
  call: { calls: 120, connected: 85, no: 20, busy: 15, coming: 25, fu: 18, done: 12, ni: 30, cr: 21 },
  fu: { total: 45, done: 28, cancel: 5, pending: 12, rate: 62 },
  inv: [
    { n: 'Engine Oil 5W-30', pn: 'EO-5030', ca: 'Lubricants', s: 85, mn: 20, c: 800, se: 1200, v: 68000 },
    { n: 'Oil Filter', pn: 'OF-100', ca: 'Filters', s: 42, mn: 15, c: 250, se: 450, v: 10500 },
    { n: 'Brake Pad Set', pn: 'BP-300', ca: 'Brakes', s: 18, mn: 10, c: 1800, se: 2800, v: 32400 },
    { n: 'Battery 60Ah', pn: 'BT-60', ca: 'Electrical', s: 8, mn: 5, c: 4200, se: 6500, v: 33600 },
    { n: 'Spark Plug', pn: 'SP-400', ca: 'Ignition', s: 120, mn: 30, c: 200, se: 350, v: 24000 },
  ],
  pnl: { rev: 1580000, lab: 620000, parts: 960000, exp: 485000, cogs: 320000, sal: 85000, rent: 45000, oth: 35000, profit: 1095000, margin: 69.3 },
};

function fmt(n: number) { return `৳${n.toLocaleString()}`; }

function StatBox({ label, value, color = 'primary.main' }: { label: string; value: string | number; color?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, textAlign: 'center', border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }} color={color}>{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1, mb: 3 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>{children}</Stack>
    </Paper>
  );
}

function RptTable({ cols, rows }: { cols: string[]; rows: (ReactNode)[][] }) {
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const p = rows.slice(page * rpp, page * rpp + rpp);
  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {cols.map((c) => <TableCell key={c} sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }}>{c}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {p.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols.length} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No data found</Typography></TableCell>
              </TableRow>
            ) : p.map((row, i) => (
              <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={rows.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rpp} onRowsPerPageChange={(e) => { setRpp(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
    </>
  );
}

function ExportBar({ cols, rows, fn, title }: { cols: string[]; rows: (string | number)[][]; fn: string; title: string }) {
  const sRows = rows.map((r) => r.map((c) => String(c)));
  if (sRows.length === 0) return null;
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="PDF"><IconButton size="small" color="error" onClick={() => { const doc = new jsPDF(); doc.text(title, 14, 15); (doc as unknown as { autoTable: (o: Record<string, unknown>) => void }).autoTable({ head: [cols], body: sRows, startY: 22, styles: { fontSize: 8 }, headStyles: { fillColor: [25, 118, 210] } }); doc.save(`${fn}.pdf`); }}><PictureAsPdf /></IconButton></Tooltip>
      <Tooltip title="Excel"><IconButton size="small" color="success" onClick={() => { const ws = XLSX.utils.aoa_to_sheet([cols, ...sRows]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Report'); XLSX.writeFile(wb, `${fn}.xlsx`); }}><TableChart /></IconButton></Tooltip>
      <Tooltip title="CSV"><IconButton size="small" onClick={() => { const csv = [cols.join(','), ...sRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${fn}.csv`; a.click(); }}><GridOn /></IconButton></Tooltip>
      <Tooltip title="Print"><IconButton size="small" onClick={() => window.print()}><Print /></IconButton></Tooltip>
    </Stack>
  );
}

export default function Reports() {
  const [tab, setTab] = useState(0);
  const today = format(new Date(), 'yyyy-MM-dd');
  const [sd, setSd] = useState(today);
  const [ed, setEd] = useState(today);
  const [mo, setMo] = useState(format(new Date(), 'yyyy-MM'));
  const [reg, setReg] = useState('');

  function sec(title: string, cols: string[], rows: (string | number | ReactNode)[][]) {
    const sr = rows.map((r) => r.map((c) => String(c)));
    const fn = title.toLowerCase().replace(/\s+/g, '-');
    return (
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
          <ExportBar cols={cols} rows={sr} fn={fn} title={title} />
        </Stack>
        <RptTable cols={cols} rows={rows} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>Reports</Typography>
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ '& .MuiTab-root': { textTransform: 'none', minWidth: 100, fontSize: 13 } }}>
          {tabs.map((t) => <Tab key={t} label={t} />)}
        </Tabs>
      </Paper>

      {/* 0 - Daily */}
      <TabPanel value={tab} index={0}>
        <FilterBar><TextField label="Date" type="date" size="small" value={sd} onChange={(e) => setSd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><Button variant="contained" startIcon={<Refresh />}>Generate Report</Button></FilterBar>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Daily Report - {sd}</Typography>
          <ExportBar cols={['Metric', 'Value']} rows={[['Opened', M.d.opened], ['Completed', M.d.completed], ['Revenue', fmt(M.d.revenue)], ['Parts Sold', M.d.parts]]} fn="daily-report" title="Daily Report" />
        </Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Job Cards Opened" value={M.d.opened} color="info.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Completed" value={M.d.completed} color="success.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Revenue Collected" value={fmt(M.d.revenue)} color="primary.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Parts Sold" value={M.d.parts} color="warning.main" /></Grid>
        </Grid>
      </TabPanel>

      {/* 1 - Monthly */}
      <TabPanel value={tab} index={1}>
        <FilterBar>
          <TextField label="Month" type="month" size="small" value={mo} onChange={(e) => setMo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><Button variant="contained" startIcon={<Refresh />}>Generate Report</Button>
        </FilterBar>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Monthly Summary - {mo}</Typography>
          <ExportBar cols={['Metric', 'Value']} rows={[['Jobs', M.m.jobs], ['Completed', M.m.completed], ['Cancelled', M.m.cancelled], ['Revenue', fmt(M.m.revenue)], ['Profit', fmt(M.m.profit)]]} fn="monthly" title="Monthly Report" />
        </Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Jobs" value={M.m.jobs} color="info.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Completed" value={M.m.completed} color="success.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Cancelled" value={M.m.cancelled} color="error.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Revenue" value={fmt(M.m.revenue)} color="primary.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Labour Income" value={fmt(M.m.labour)} color="secondary.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Parts Income" value={fmt(M.m.parts)} color="warning.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Expenses" value={fmt(M.m.expenses)} color="error.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Net Profit" value={fmt(M.m.profit)} color="success.main" /></Grid>
        </Grid>
      </TabPanel>

      {/* 2 - Labour */}
      <TabPanel value={tab} index={2}>
        <FilterBar>
          <TextField label="From" type="date" size="small" value={sd} onChange={(e) => setSd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="To" type="date" size="small" value={ed} onChange={(e) => setEd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<Refresh />}>Generate Report</Button>
        </FilterBar>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 3 }}><StatBox label="Total Labour Income" value={fmt(M.l.reduce((s, r) => s + r.i, 0))} color="primary.main" /></Grid>
        </Grid>
        {sec('Labour Income by Technician', ['Technician', 'Jobs', 'Income', 'Avg/Job'], M.l.map((r) => [r.t, r.j, fmt(r.i), fmt(r.a)]))}
      </TabPanel>

      {/* 3 - Parts */}
      <TabPanel value={tab} index={3}>
        <FilterBar>
          <TextField label="From" type="date" size="small" value={sd} onChange={(e) => setSd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="To" type="date" size="small" value={ed} onChange={(e) => setEd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<Refresh />}>Generate Report</Button>
        </FilterBar>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Qty Sold" value={M.p.reduce((s, r) => s + r.q, 0)} color="primary.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Revenue" value={fmt(M.p.reduce((s, r) => s + r.t, 0))} color="success.main" /></Grid>
        </Grid>
        {sec('Parts Sales', ['Part Name', 'Part #', 'Qty', 'Unit Price', 'Total'], M.p.map((r) => [r.n, r.pn, r.q, fmt(r.up), fmt(r.t)]))}
      </TabPanel>

      {/* 4 - Service */}
      <TabPanel value={tab} index={4}>
        <FilterBar>
          <TextField label="From" type="date" size="small" value={sd} onChange={(e) => setSd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="To" type="date" size="small" value={ed} onChange={(e) => setEd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<Refresh />}>Generate Report</Button>
        </FilterBar>
        {sec('Service Types Summary', ['Service Type', 'Jobs', 'Total Revenue'], M.s.map((r) => [r.ty, r.c, fmt(r.r)]))}
      </TabPanel>

      {/* 5 - Technician */}
      <TabPanel value={tab} index={5}>
        <FilterBar>
          <TextField label="From" type="date" size="small" value={sd} onChange={(e) => setSd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="To" type="date" size="small" value={ed} onChange={(e) => setEd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<Refresh />}>Generate Report</Button>
        </FilterBar>
        {sec('Technician Performance', ['Technician', 'Total Jobs', 'Completed', 'Rate', 'Revenue'], M.tc.map((r) => [r.n, r.t, r.d, <Chip key={r.n} label={`${r.r}%`} size="small" color={r.r >= 90 ? 'success' : 'warning'} />, fmt(r.re)]))}
      </TabPanel>

      {/* 6 - Customer */}
      <TabPanel value={tab} index={6}>
        {sec('Customer List', ['Name', 'Mobile', 'Vehicles', 'Total Service Value'], M.cu.map((r) => [r.n, r.m, r.v, fmt(r.sv)]))}
      </TabPanel>

      {/* 7 - Vehicle History */}
      <TabPanel value={tab} index={7}>
        <FilterBar>
          <TextField label="Vehicle Registration" size="small" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="e.g. Dhaka-12-3456" sx={{ minWidth: 250 }} />
          <Button variant="contained" startIcon={<Refresh />}>Search</Button>
        </FilterBar>
        {sec('Service History', ['Reg No', 'Brand', 'Model', 'Date', 'Type', 'Amount', 'Technician'], M.vh.map((r) => [r.r, r.b, r.mo, r.d, r.ty, fmt(r.am), r.te]))}
      </TabPanel>

      {/* 8 - Due */}
      <TabPanel value={tab} index={8}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Outstanding Payments</Typography>
          <ExportBar cols={['Invoice', 'Customer', 'Vehicle', 'Total', 'Due', 'Overdue']} rows={M.due.map((r) => [r.i, r.c, r.v, fmt(r.t), fmt(r.du), `${r.da}d`])} fn="due-report" title="Due Report" />
        </Stack>
        <RptTable cols={['Invoice #', 'Customer', 'Vehicle', 'Total', 'Due Amount', 'Overdue']} rows={M.due.map((r) => [r.i, r.c, r.v, fmt(r.t),         <Typography key={r.i} color="error.main" sx={{ fontWeight: 600 }}>{fmt(r.du)}</Typography>, <Chip key={r.i} label={`${r.da}d`} size="small" color={r.da > 10 ? 'error' : 'warning'} />])} />
      </TabPanel>

      {/* 9 - Collection */}
      <TabPanel value={tab} index={9}>
        <FilterBar>
          <TextField label="From" type="date" size="small" value={sd} onChange={(e) => setSd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="To" type="date" size="small" value={ed} onChange={(e) => setEd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<Refresh />}>Generate Report</Button>
        </FilterBar>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Collected" value={fmt(M.col.reduce((s, r) => s + r.a, 0))} color="success.main" /></Grid>
        </Grid>
        {sec('Collections', ['Date', 'Customer', 'Invoice', 'Amount', 'Method', 'Collected By'], M.col.map((r) => [r.d, r.c, r.i, fmt(r.a), r.m, r.b]))}
      </TabPanel>

      {/* 10 - Call */}
      <TabPanel value={tab} index={10}>
        <FilterBar>
          <TextField label="From" type="date" size="small" value={sd} onChange={(e) => setSd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="To" type="date" size="small" value={ed} onChange={(e) => setEd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<Refresh />}>Generate Report</Button>
        </FilterBar>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Calls" value={M.call.calls} color="info.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Connected" value={M.call.connected} color="success.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Customer Coming" value={M.call.coming} color="primary.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Completed" value={M.call.done} color="success.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Follow-up Required" value={M.call.fu} color="warning.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Not Interested" value={M.call.ni} color="error.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Conversion Rate" value={`${M.call.cr}%`} color="secondary.main" /></Grid>
        </Grid>
      </TabPanel>

      {/* 11 - Follow-up */}
      <TabPanel value={tab} index={11}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Follow-ups" value={M.fu.total} color="info.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Completed" value={M.fu.done} color="success.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Cancelled" value={M.fu.cancel} color="error.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Pending" value={M.fu.pending} color="warning.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Completion Rate" value={`${M.fu.rate}%`} color="secondary.main" /></Grid>
        </Grid>
      </TabPanel>

      {/* 12 - Inventory */}
      <TabPanel value={tab} index={12}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Stock Units" value={M.inv.reduce((s, r) => s + r.s, 0)} color="primary.main" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatBox label="Total Stock Value" value={fmt(M.inv.reduce((s, r) => s + r.v, 0))} color="success.main" /></Grid>
        </Grid>
        {sec('Inventory Stock', ['Part Name', 'Part #', 'Category', 'Stock', 'Min', 'Cost Price', 'Sell Price', 'Stock Value'], M.inv.map((r) => [r.n, r.pn, r.ca, r.s, r.mn, fmt(r.c), fmt(r.se), fmt(r.v)]))}
      </TabPanel>

      {/* 13 - P&L */}
      <TabPanel value={tab} index={13}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Profit & Loss Statement</Typography>
          <ExportBar cols={['Category', 'Amount']} rows={[['Revenue', fmt(M.pnl.rev)], ['Labour', fmt(M.pnl.lab)], ['Parts', fmt(M.pnl.parts)], ['Expenses', fmt(M.pnl.exp)], ['Profit', fmt(M.pnl.profit)], ['Margin', `${M.pnl.margin}%`]]} fn="profit-loss" title="Profit & Loss" />
        </Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Income</Typography>
              {[{ l: 'Labour Income', v: fmt(M.pnl.lab) }, { l: 'Parts Sales', v: fmt(M.pnl.parts) }, { l: 'Total Revenue', v: fmt(M.pnl.rev) }].map((i) => (
                <Stack key={i.l} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: i.l === 'Total Revenue' ? 700 : 400 }}>{i.l}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: i.l === 'Total Revenue' ? 700 : 400 }} color="success.main">{i.v}</Typography>
                </Stack>
              ))}
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="error.main" gutterBottom>Expenses</Typography>
              {[{ l: 'COGS', v: fmt(M.pnl.cogs) }, { l: 'Salaries', v: fmt(M.pnl.sal) }, { l: 'Rent & Utilities', v: fmt(M.pnl.rent) }, { l: 'Other', v: fmt(M.pnl.oth) }, { l: 'Total Expenses', v: fmt(M.pnl.exp) }].map((i) => (
                <Stack key={i.l} direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: i.l === 'Total Expenses' ? 700 : 400 }}>{i.l}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: i.l === 'Total Expenses' ? 700 : 400 }} color="error.main">{i.v}</Typography>
                </Stack>
              ))}
            </Paper>
          </Grid>
          <Grid size={12}>
            <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: 2, borderColor: 'success.main', borderRadius: 1, mt: 2 }}>
              <Typography variant="body2" color="text.secondary">Net Profit</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }} color="success.main">{fmt(M.pnl.profit)}</Typography>
              <Typography variant="body1" color="text.secondary">Profit Margin: {M.pnl.margin}%</Typography>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}