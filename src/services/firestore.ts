import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type QueryConstraint,
  type DocumentData,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from '../config/firebase';

function getCollectionRef(name: string): CollectionReference {
  return collection(db, name);
}

export async function getCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const q = query(getCollectionRef(collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
}

export async function getDocument<T = DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as unknown as T;
}

export async function addDocument<T extends Record<string, unknown>>(
  collectionName: string,
  data: T
) {
  const ref = await addDoc(getCollectionRef(collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
) {
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName: string, docId: string) {
  await deleteDoc(doc(db, collectionName, docId));
}

export async function getAutoId(
  collectionName: string,
  prefix: string
): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const q = query(
    getCollectionRef(collectionName),
    where('createdAt', '>=', new Date(yyyy, today.getMonth(), today.getDate())),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  let nextNum = 1;
  if (!snapshot.empty) {
    const last = snapshot.docs[0].data() as Record<string, unknown>;
    const lastId = String(last.jobCardNumber || last.invoiceNumber || last.purchaseNumber || '');
    const match = lastId.match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `${prefix}-${dateStr}-${String(nextNum).padStart(4, '0')}`;
}

export async function getDashboardStats() {
  const [customersSnap, vehiclesSnap, jobCardsSnap, inventorySnap, invoicesSnap] =
    await Promise.all([
      getDocs(getCollectionRef('customers')),
      getDocs(getCollectionRef('vehicles')),
      getDocs(getCollectionRef('jobCards')),
      getDocs(getCollectionRef('inventory')),
      getDocs(getCollectionRef('invoices')),
    ]);

  const allJobCards = jobCardsSnap.docs.map((d) => d.data());
  const openCards = allJobCards.filter(
    (j) => j.status === 'Open' || j.status === 'In Progress' || j.status === 'Waiting Parts'
  );
  const completed = allJobCards.filter(
    (j) => j.status === 'Ready' || j.status === 'Delivered'
  );
  const delivered = allJobCards.filter((j) => j.status === 'Delivered');
  const lowStock = inventorySnap.docs.filter((d) => {
    const data = d.data();
    return (data.currentStock || 0) <= (data.minimumStock || 0);
  });

  const pendingBills = invoicesSnap.docs.filter(
    (d) => d.data().status === 'Unpaid' || d.data().status === 'Partial'
  ).length;
  const duePayments = invoicesSnap.docs.filter((d) => (d.data().dueAmount || 0) > 0).length;

  return {
    totalCustomers: customersSnap.size,
    totalVehicles: vehiclesSnap.size,
    vehiclesInsideWorkshop: openCards.length,
    openJobCards: openCards.length,
    completedJobs: completed.length,
    deliveredVehicles: delivered.length,
    labourIncome: allJobCards.reduce((sum, j) => sum + (j.totalLabour || 0), 0),
    partsSales: allJobCards.reduce((sum, j) => sum + (j.totalParts || 0), 0),
    pendingBills,
    duePayments,
    lowStockItems: lowStock.length,
  };
}

export async function logActivity(
  userId: string,
  userName: string,
  action: string,
  module: string,
  description: string
) {
  await addDoc(getCollectionRef('activityLogs'), {
    userId,
    userName,
    action,
    module,
    description,
    timestamp: serverTimestamp(),
  } as unknown as Record<string, unknown>);
}

export async function createNotification(
  type: string,
  title: string,
  message: string
) {
  await addDoc(getCollectionRef('notifications'), {
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
  } as unknown as Record<string, unknown>);
}

export function formatDate(date: Timestamp | string | Date | undefined | null): string {
  if (!date) return '';
  const d = date instanceof Timestamp ? date.toDate() : typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '৳0';
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}