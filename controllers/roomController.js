const db = require('../config/db');

// GET all rooms with tenant info
const getRooms = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, t.name AS tenant_name, t.phone AS tenant_phone, t.id AS tenant_id
      FROM rooms r
      LEFT JOIN tenants t ON t.room_id = r.id
      ORDER BY r.id ASC
    `);
    // console.log(rows);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create room
const createRoom = async (req, res) => {
  try {
    const { name, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Room name is required' });

    const [result] = await db.query(
      'INSERT INTO rooms (name, status) VALUES (?, ?)',
      [name, status || 'available']
    );
    res.status(201).json({ success: true, message: 'Room created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT update room
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const [result] = await db.query(
      'UPDATE rooms SET name = ?, status = ? WHERE id = ?',
      [name, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, message: 'Room updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE room
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM rooms WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getRooms, createRoom, updateRoom, deleteRoom };
