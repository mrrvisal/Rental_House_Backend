const db = require("../config/db");
const path = require("path");

// GET records by room_id (last 2 months)
const getRecordsByRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM monthly_records WHERE room_id = ? ORDER BY month DESC, day DESC LIMIT 2`,
      [room_id],
    );

    // Calculate derived fields
    const enriched = rows.map((r) => ({
      ...r,
      electric_usage: parseFloat(r.new_electric) - parseFloat(r.old_electric),
      electric_total:
        (parseFloat(r.new_electric) - parseFloat(r.old_electric)) *
        parseFloat(r.electric_price),
      water_usage: parseFloat(r.new_water) - parseFloat(r.old_water),
      water_total:
        (parseFloat(r.new_water) - parseFloat(r.old_water)) *
        parseFloat(r.water_price),
      total_cost:
        (parseFloat(r.new_electric) - parseFloat(r.old_electric)) *
          parseFloat(r.electric_price) +
        (parseFloat(r.new_water) - parseFloat(r.old_water)) *
          parseFloat(r.water_price),
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all rooms with current month summary
const getDashboard = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [rows] = await db.query(
      `SELECT r.id, r.name, r.status,
              t.name AS tenant_name,
              mr.month, mr.day,
              mr.old_electric, mr.new_electric, mr.electric_price,
              mr.old_water, mr.new_water, mr.water_price
       FROM rooms r
       LEFT JOIN tenants t ON t.room_id = r.id
       LEFT JOIN (
         SELECT * FROM monthly_records mr0 WHERE (mr0.month, mr0.day) = (
           SELECT month, day FROM monthly_records mr1 WHERE mr1.room_id = mr0.room_id 
           ORDER BY month DESC, day DESC LIMIT 1
         )
       ) mr ON mr.room_id = r.id
       ORDER BY r.id ASC`,
    );
    // console.log(rows);

    const enriched = rows.map((r) => {
      const electricUsage =
        parseFloat(r.new_electric || 0) - parseFloat(r.old_electric || 0);
      const waterUsage =
        parseFloat(r.new_water || 0) - parseFloat(r.old_water || 0);
      const totalCost =
        electricUsage * parseFloat(r.electric_price || 0) +
        waterUsage * parseFloat(r.water_price || 0);
      return {
        ...r,
        electric_usage: electricUsage,
        water_usage: waterUsage,
        total_cost: totalCost,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create new monthly record
const createRecord = async (req, res) => {
  try {
    const {
      room_id,
      month,
      day,
      new_electric,
      electric_price,
      new_water,
      water_price,
    } = req.body;

    if (
      !room_id ||
      !month ||
      !day ||
      new_electric === undefined ||
      new_water === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (add 'day')",
      });
    }

    const dayNum = parseInt(day);
    if (dayNum < 1 || dayNum > 31) {
      return res
        .status(400)
        .json({ success: false, message: "Day must be 1-31" });
    }

    // Check duplicate
    const [existing] = await db.query(
      "SELECT id FROM monthly_records WHERE room_id = ? AND month = ? AND day = ?",
      [room_id, month, parseInt(req.body.day || 1)],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Record for this month and day already exists",
      });
    }

    // Get last record to auto-fill old values (latest)
    const [lastRecords] = await db.query(
      "SELECT * FROM monthly_records WHERE room_id = ? ORDER BY created_at DESC LIMIT 1",
      [room_id],
    );

    let old_electric = 0;
    let old_water = 0;
    let old_electric_image = null;
    let old_water_image = null;

    if (lastRecords.length > 0) {
      old_electric = parseFloat(lastRecords[0].new_electric);
      old_water = parseFloat(lastRecords[0].new_water);
      old_electric_image = lastRecords[0].electric_image;
      old_water_image = lastRecords[0].water_image;
    }

    // Upload to Cloudinary
    const uploadToCloudinary = require("../utils/uploadToCloudinary");

    let electric_image = null;
    if (req.files?.electric_image?.[0]) {
      electric_image = await uploadToCloudinary(
        req.files.electric_image[0].buffer,
      );
    }

    let water_image = null;
    if (req.files?.water_image?.[0]) {
      water_image = await uploadToCloudinary(req.files.water_image[0].buffer);
    }

    const [result] = await db.query(
      `INSERT INTO monthly_records
        (room_id, month, day, old_electric, new_electric, electric_price, old_water, new_water, water_price, old_electric_image, electric_image, old_water_image, water_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        room_id,
        month,
        dayNum,
        old_electric,
        new_electric,
        electric_price || 0,
        old_water,
        new_water,
        water_price || 0,
        old_electric_image,
        electric_image,
        old_water_image,
        water_image,
      ],
    );

    // Keep all records for history/comparison (images preserved)
    console.log("All historical records preserved for comparison");

    res
      .status(201)
      .json({ success: true, message: "Record created", id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET last month new values (for auto-fill)
const getLastRecord = async (req, res) => {
  try {
    const { room_id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM monthly_records WHERE room_id = ? ORDER BY month DESC LIMIT 1",
      [room_id],
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRecordsByRoom,
  createRecord,
  getDashboard,
  getLastRecord,
};
