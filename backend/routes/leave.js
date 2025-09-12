const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');

// Apply for leave
router.post('/apply', async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, reason } = req.body;

    // Check leave balance
    const employee = await Employee.findById(employeeId);
    const leaveBalance = employee.leaveBalance[type];

    if (!leaveBalance || leaveBalance <= 0) {
      return res.status(400).json({ error: 'Insufficient leave balance' });
    }

    // Create leave request
    const leave = new Leave({
      employee: employeeId,
      type,
      startDate,
      endDate,
      reason
    });

    await leave.save();

    res.json({
      success: true,
      leave
    });
  } catch (error) {
    console.error('Leave application error:', error);
    res.status(500).json({ error: 'Error applying for leave' });
  }
});

// Get leave balance
router.get('/balance/:employeeId', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    res.json({
      success: true,
      leaveBalance: employee.leaveBalance
    });
  } catch (error) {
    console.error('Leave balance error:', error);
    res.status(500).json({ error: 'Error fetching leave balance' });
  }
});

// Get leave history
router.get('/history/:employeeId', async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.params.employeeId })
      .sort({ startDate: -1 });
    
    res.json({
      success: true,
      leaves
    });
  } catch (error) {
    console.error('Leave history error:', error);
    res.status(500).json({ error: 'Error fetching leave history' });
  }
});

// Approve/reject leave
router.put('/:leaveId/status', async (req, res) => {
  try {
    const { status, approvedBy } = req.body;
    const leave = await Leave.findById(req.params.leaveId);

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    leave.status = status;
    leave.approvedBy = approvedBy;
    leave.approvedAt = new Date();

    if (status === 'approved') {
      // Update leave balance
      const employee = await Employee.findById(leave.employee);
      const days = Math.ceil((leave.endDate - leave.startDate) / (1000 * 60 * 60 * 24));
      employee.leaveBalance[leave.type] -= days;
      await employee.save();
    }

    await leave.save();

    res.json({
      success: true,
      leave
    });
  } catch (error) {
    console.error('Leave status update error:', error);
    res.status(500).json({ error: 'Error updating leave status' });
  }
});

// Get pending leaves (for HR)
router.get('/pending', async (req, res) => {
  try {
    const leaves = await Leave.find({ status: 'pending' })
      .populate('employee', 'firstName lastName department')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      leaves
    });
  } catch (error) {
    console.error('Pending leaves error:', error);
    res.status(500).json({ error: 'Error fetching pending leaves' });
  }
});

module.exports = router; 