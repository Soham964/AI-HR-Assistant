const admin = require('firebase-admin');
const Employee = require('../models/Employee'); // Import the Employee model

// Initialize Firebase Admin SDK (ensure this is done only once)
try {
  console.log('Attempting to initialize Firebase Admin SDK...');
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.log('FIREBASE_SERVICE_ACCOUNT_KEY length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length);
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is NOT set in environment variables.');
  }
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT_KEY in .env file:', error.message);
  // Exit process or handle error appropriately if Firebase Admin SDK cannot be initialized
  process.exit(1); // Exit if Firebase Admin SDK cannot be initialized
}

// Middleware for Firebase authentication
const firebaseAuth = async function(req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Firebase decoded token:', decodedToken);
    
    let employee;
    try {
      // Try to find employee in MongoDB with timeout
      employee = await Employee.findOne({ firebaseUid: decodedToken.uid }).maxTimeMS(5000);
      console.log(`[Auth Middleware] Lookup by firebaseUid (${decodedToken.uid}):`, employee ? 'Found' : 'Not Found');

      if (!employee) {
        console.log(`[Auth Middleware] Employee not found by firebaseUid, attempting lookup by email (${decodedToken.email})...`);
        // If employee not found by firebaseUid, try finding by email and link if firebaseUid is missing
        employee = await Employee.findOne({ email: decodedToken.email }).maxTimeMS(5000);
        console.log(`[Auth Middleware] Lookup by email (${decodedToken.email}):`, employee ? 'Found' : 'Not Found');

        if (employee) {
          if (!employee.firebaseUid) {
            employee.firebaseUid = decodedToken.uid;
            await employee.save();
            console.log(`[Auth Middleware] Employee ${employee.email} linked with new firebaseUid: ${decodedToken.uid}`);
          } else if (employee.firebaseUid !== decodedToken.uid) {
            // This case implies an inconsistency - same email but different Firebase UID already linked.
            console.warn(`[Auth Middleware] Attempted to link email ${decodedToken.email} with a new firebaseUid (${decodedToken.uid}), but it's already linked to ${employee.firebaseUid}.`);
            return res.status(409).json({ error: 'Email already linked to a different Firebase account.' });
          }
        }
      }
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError.message);
      // If MongoDB is not available, create a temporary employee object for development
      console.log('[Auth Middleware] MongoDB unavailable, using temporary employee data for development');
      employee = {
        _id: 'dev-employee-id',
        email: decodedToken.email,
        firstName: decodedToken.name ? decodedToken.name.split(' ')[0] : 'User',
        lastName: decodedToken.name ? decodedToken.name.split(' ').slice(1).join(' ') : 'Test',
        role: 'employee',
        department: 'Development',
        firebaseUid: decodedToken.uid
      };
    }

    // If no employee found and MongoDB is working, create new employee
    if (!employee) {
      console.log(`[Auth Middleware] Employee not found by firebaseUid or email. Creating new employee for ${decodedToken.email}...`);
      
      // Extracting name components, handling cases where they might be missing
      const nameParts = decodedToken.name ? decodedToken.name.split(' ') : [];
      const firstName = nameParts.length > 0 ? nameParts[0] : 'Unknown';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
      const defaultRole = 'employee'; // Default role for newly created users
      const defaultDepartment = 'General'; // Default department for newly created users

      // IMPORTANT: For new employees created via Firebase login, a temporary password is needed
      // This password is NOT used for Firebase authentication but is required by Mongoose schema
      // In a real application, you might use a secure random string or hash it.
      const tempPassword = 'temp-password-123'; 

      const newEmployee = new Employee({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        password: tempPassword, // Provide a default password as required by schema
        firstName: firstName,
        lastName: lastName,
        role: defaultRole,
        department: defaultDepartment, // Provide a default department as required by schema
      });
      
      try {
        employee = await newEmployee.save();
        console.log(`[Auth Middleware] New employee created: ${employee.email} with role ${employee.role} in department ${employee.department}`);
      } catch (saveError) {
        console.error('Error saving new employee:', saveError.message);
        // Fallback to temporary employee object
        employee = {
          _id: 'dev-employee-id',
          email: decodedToken.email,
          firstName: firstName,
          lastName: lastName,
          role: defaultRole,
          department: defaultDepartment,
          firebaseUid: decodedToken.uid
        };
      }
    }

    // Attach the employee's MongoDB _id and role to req.user
    req.user = {
      id: employee._id, // MongoDB _id
      role: employee.role, // Role from your database
      firebaseUid: decodedToken.uid, // Keep Firebase UID as well
      email: decodedToken.email // Keep email as well
    };
    console.log('req.user after authentication:', req.user);
    
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or finding employee:', error);
    res.status(401).json({ error: 'Firebase ID token is not valid, expired, or user data is inconsistent' });
  }
};

module.exports = firebaseAuth; 