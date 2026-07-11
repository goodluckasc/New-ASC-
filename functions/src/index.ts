import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

export const autoServiceReminder = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('Asia/Dhaka')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = new Date(now.toMillis() - 30 * 24 * 60 * 60 * 1000);

    try {
      const vehiclesSnapshot = await db
        .collection('vehicles')
        .where('lastServiceDate', '<=', thirtyDaysAgo)
        .get();

      const customersCache: Record<string, any> = {};
      let addedCount = 0;

      for (const doc of vehiclesSnapshot.docs) {
        const vehicle = { id: doc.id, ...doc.data() } as any;
        const lastService = vehicle.lastServiceDate?.toDate?.() || new Date(vehicle.lastServiceDate);
        const daysSince = Math.floor((now.toMillis() - lastService.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince < 30) continue;

        const customerId = vehicle.customerId;
        if (!customersCache[customerId]) {
          const customerDoc = await db.collection('customers').doc(customerId).get();
          if (customerDoc.exists) {
            customersCache[customerId] = { id: customerDoc.id, ...customerDoc.data() };
          }
        }

        const customer = customersCache[customerId];
        if (!customer) continue;

        const existingCall = await db
          .collection('calls')
          .where('vehicleId', '==', vehicle.id)
          .where('status', '==', 'Pending')
          .limit(1)
          .get();

        if (!existingCall.empty) continue;

        await db.collection('calls').add({
          customerId: customer.id,
          customerName: customer.name,
          mobile: customer.mobile,
          vehicleId: vehicle.id,
          vehicleRegNo: vehicle.registrationNumber || '',
          lastServiceDate: vehicle.lastServiceDate || null,
          daysSinceService: daysSince,
          status: 'Pending',
          notes: 'Auto-generated from 30-day service reminder',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('notifications').add({
          type: 'service_reminder',
          title: 'Vehicle Due for Service',
          message: `${customer.name}'s ${vehicle.brand} ${vehicle.model} (${vehicle.registrationNumber}) is due for service. ${daysSince} days since last service.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        addedCount++;
      }
    } catch (error) {
      console.error('Error in autoServiceReminder:', error);
    }
  });

export const checkLowStock = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Asia/Dhaka')
  .onRun(async () => {
    try {
      const itemsSnapshot = await db
        .collection('inventory')
        .where('currentStock', '<=', admin.firestore.FieldValue.arrayUnion())
        .get();

      const lowStockItems = await db
        .collection('inventory')
        .where('currentStock', '<=', 0)
        .limit(1)
        .get();

      const minThresholdSnapshot = await db
        .collection('settings')
        .doc('notifications')
        .get();

      const threshold = minThresholdSnapshot.data()?.lowStockThreshold || 10;

      const items = await db
        .collection('inventory')
        .where('currentStock', '<=', threshold)
        .get();

      let lowStockCount = 0;

      for (const doc of items.docs) {
        const item = { id: doc.id, ...doc.data() } as any;
        if (item.currentStock >= item.minimumStock) continue;

        const existingNotification = await db
          .collection('notifications')
          .where('type', '==', 'low_stock')
          .where('read', '==', false)
          .where('message', '>=', item.partName)
          .where('message', '<=', item.partName + '\uf8ff')
          .limit(1)
          .get();

        if (!existingNotification.empty) continue;

        await db.collection('notifications').add({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${item.partName} (${item.partNumber || ''}) is low on stock. Current: ${item.currentStock}, Minimum: ${item.minimumStock}`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('purchaseSuggestions').add({
          itemId: doc.id,
          itemName: item.partName,
          partNumber: item.partNumber || '',
          suggestedQuantity: Math.max(item.minimumStock * 2 - item.currentStock, 1),
          currentStock: item.currentStock,
          minimumStock: item.minimumStock,
          status: 'Pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        lowStockCount++;
      }
    } catch (error) {
      console.error('Error in checkLowStock:', error);
    }
  });

export const onJobCardStatusUpdate = functions.firestore
  .document('jobCards/{jobCardId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as any;
    const after = change.after.data() as any;

    if (before.status !== 'Ready' && after.status === 'Ready') {
      await db.collection('notifications').add({
        type: 'jobcard_ready',
        title: 'Job Card Ready for Delivery',
        message: `Job Card ${after.jobCardNumber} for ${after.customerName} is ready for delivery.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (before.status !== 'Delivered' && after.status === 'Delivered') {
      const vehicleRef = db.collection('vehicles').doc(after.vehicleId);
      await vehicleRef.update({
        lastServiceDate: admin.firestore.FieldValue.serverTimestamp(),
        nextServiceDueDate: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ),
      });
    }
  });

export const onNewJobCard = functions.firestore
  .document('jobCards/{jobCardId}')
  .onCreate(async (snap, context) => {
    const jobCard = snap.data() as any;

    await db.collection('notifications').add({
      type: 'new_jobcard',
      title: 'New Job Card Created',
      message: `Job Card ${jobCard.jobCardNumber} for ${jobCard.customerName} has been created.`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (jobCard.partsItems && jobCard.partsItems.length > 0) {
      for (const part of jobCard.partsItems) {
        if (part.itemId) {
          const itemRef = db.collection('inventory').doc(part.itemId);
          const itemDoc = await itemRef.get();
          if (itemDoc.exists) {
            const itemData = itemDoc.data() as any;
            const newReserved = (itemData.reservedStock || 0) + part.quantity;
            await itemRef.update({
              reservedStock: newReserved,
              availableStock: (itemData.currentStock || 0) - newReserved,
            });
          }
        }
      }
    }
  });
