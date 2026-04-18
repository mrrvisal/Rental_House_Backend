const db = require("../config/db");

async function test() {
  try {
    const [rows1] = await db.query("SELECT COUNT(*) as cnt FROM rooms");
    console.log("Total rooms:", rows1[0].cnt);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const [rows2] = await db.query(
      `SELECT COUNT(DISTINCT r.id) as cnt FROM rooms r 
       LEFT JOIN monthly_records mr ON mr.room_id = r.id AND mr.month = ?`,
      [currentMonth],
    );
    console.log("Dashboard rooms:", rows2[0].cnt);

    const [rows3] = await db.query("SELECT * FROM rooms LIMIT 5");
    console.log(
      "Sample rooms:",
      rows3.map((r) => ({ id: r.id, name: r.name, status: r.status })),
    );
  } catch (e) {
    console.error(e);
  } finally {
    db.end();
  }
}

test();
