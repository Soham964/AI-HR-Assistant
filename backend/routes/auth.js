const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

// Register new employee
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, department, role, firebaseUid } = req.body;
    console.log('Register request received:', { email, firstName, lastName, department, role, firebaseUid });

    // Check if employee already exists
    let employee = await Employee.findOne({ email });
    if (employee) {
      console.log('Registration: Employee already exists for email:', email);
      // If an employee with this email exists but doesn't have a firebaseUid, link it
      if (!employee.firebaseUid && firebaseUid) {
        employee.firebaseUid = firebaseUid;
        await employee.save();
        console.log(`Registration: Existing employee ${email} linked with firebaseUid: ${firebaseUid}`);
        return res.json({
          success: true,
          message: 'Employee already exists, Firebase UID linked.',
          employee: {
            id: employee._id,
            email: employee.email,
            firstName: employee.firstName,
            lastName: employee.lastName,
            department: employee.department,
            role: employee.role,
            firebaseUid: employee.firebaseUid
          }
        });
      }
      return res.status(400).json({ error: 'Employee already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new employee
    employee = new Employee({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      department,
      role: role || 'employee',
      firebaseUid: firebaseUid || null
    });

    await employee.save();
    console.log('Registration: New employee saved:', employee);

    // Create JWT token (legacy, frontend should primarily use Firebase ID token)
    const token = jwt.sign(
      { id: employee._id, role: employee.role, firebaseUid: employee.firebaseUid },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      employee: {
        id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department,
        role: employee.role,
        firebaseUid: employee.firebaseUid
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error registering employee' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, firebaseUid } = req.body;
    console.log('Login request received:', { email, firebaseUid });

    // Check if employee exists
    const employee = await Employee.findOne({ email });
    if (!employee) {
      console.log('Login: Employee not found for email:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    console.log('Login: Employee found:', employee);

    // Verify password
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      console.log('Login: Invalid password for email:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    console.log('Login: Password matched for email:', email);

    // If firebaseUid is provided in the request, and the employee doesn't have one, update it
    if (firebaseUid && !employee.firebaseUid) {
      employee.firebaseUid = firebaseUid;
      await employee.save();
      console.log(`Login: Employee ${employee.email} updated with firebaseUid: ${firebaseUid}`);
    } else if (firebaseUid && employee.firebaseUid && employee.firebaseUid !== firebaseUid) {
      console.warn(`Login: Inconsistency detected for email ${email}. Provided firebaseUid ${firebaseUid} does not match existing ${employee.firebaseUid}`);
      // This means a user with the same email is trying to login with a different firebaseUid
      // Depending on policy, you might want to prevent login or force a merge.
      // For now, we allow login but log the inconsistency.
    }

    // Create JWT token (legacy, frontend should primarily use Firebase ID token)
    const token = jwt.sign(
      { id: employee._id, role: employee.role, firebaseUid: employee.firebaseUid },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    console.log('Login: JWT token generated.');

    res.json({
      success: true,
      token,
      employee: {
        id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department,
        role: employee.role,
        firebaseUid: employee.firebaseUid
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    // req.user will contain the decoded Firebase ID token and employee details from our middleware
    if (!req.user || !req.user.id) { // req.user.id is the MongoDB _id from auth middleware
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const employee = await Employee.findById(req.user.id).select('-password');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      success: true,
      employee: {
        id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department,
        role: employee.role,
        firebaseUid: employee.firebaseUid
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

module.exports = router; 