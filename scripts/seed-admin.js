/**
 * Admin Seed Script
 * 
 * Usage:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Click "Generate New Private Key" - save as serviceAccountKey.json in project root
 * 3. Run: node scripts/seed-admin.js
 * 
 * This script creates the admin user in Firebase Authentication
 * and sets the role in Firestore.
 */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function seedAdmin() {
  const email = 'admin@asc.com';
  const password = '123456';
  const displayName = 'System Admin';

  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('Admin user already exists in Authentication');
    } catch (e) {
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        disabled: false,
      });
      console.log('Admin user created in Authentication:', userRecord.uid);
    }

    await db.collection('users').doc(userRecord.uid).set({
      displayName,
      email,
      role: 'Admin',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('Admin role set in Firestore');
    console.log('Login credentials:');
    console.log('  Email:    admin@asc.com');
    console.log('  Password: 123456');
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

seedAdmin();