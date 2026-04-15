const db = require('../config/db');

// GET all tenants
const getTenants = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, r.name AS room_name
      FROM tenants t
      LEFT JOIN rooms r ON r.id = t.room_id
      ORDER BY t.id ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create tenant
const createTenant = async (req, res) => {
  try {
    const { name, phone, room_id } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Tenant name is required' });

    // Check if room already has a tenant
    if (room_id) {
      const [existing] = await db.query('SELECT id FROM tenants WHERE room_id = ?', [room_id]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Room already has a tenant' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO tenants (name, phone, room_id) VALUES (?, ?, ?)',
      [name, phone || null, room_id || null]
    );

    // Update room status to occupied if room_id provided
    if (room_id) {
      await db.query("UPDATE rooms SET status = 'occupied' WHERE id = ?", [room_id]);
    }

    res.status(201).json({ success: true, message: 'Tenant created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT update tenant
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, room_id } = req.body;

    // Get old room_id
    const [old] = await db.query('SELECT room_id FROM tenants WHERE id = ?', [id]);
    if (old.length === 0) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const oldRoomId = old[0].room_id;

    await db.query(
      'UPDATE tenants SET name = ?, phone = ?, room_id = ? WHERE id = ?',
      [name, phone || null, room_id || null, id]
    );

    // Update old room to available
    if (oldRoomId && oldRoomId !== room_id) {
      await db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [oldRoomId]);
    }

    // Update new room to occupied
    if (room_id) {
      await db.query("UPDATE rooms SET status = 'occupied' WHERE id = ?", [room_id]);
    }

    res.json({ success: true, message: 'Tenant updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE tenant
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await db.query('SELECT room_id FROM tenants WHERE id = ?', [id]);
    if (old.length === 0) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const oldRoomId = old[0].room_id;
    await db.query('DELETE FROM tenants WHERE id = ?', [id]);

    // Set room back to available
    if (oldRoomId) {
      await db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [oldRoomId]);
    }

    res.json({ success: true, message: 'Tenant deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getTenants, createTenant, updateTenant, deleteTenant };
