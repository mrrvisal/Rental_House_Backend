const db = require("../config/db");
const { bucket } = require("../config/firebase");
const { generatePDF } = require("../services/invoiceService");

// 🔥 Shared query
const getInvoiceData = async (room_id) => {
  const [rows] = await db.query(
    `
    SELECT 
      r.id as room_id,
      r.name as room_name,
      t.name as tenant_name,
      t.phone as tenant_phone,
      mr.month,
      mr.day,
      mr.electric_price,
      mr.water_price,

      COALESCE(mr.new_electric,0) - COALESCE(mr.old_electric,0) as electric_usage,
      (COALESCE(mr.new_electric,0) - COALESCE(mr.old_electric,0)) * COALESCE(mr.electric_price,0) as electric_total,

      COALESCE(mr.new_water,0) - COALESCE(mr.old_water,0) as water_usage,
      (COALESCE(mr.new_water,0) - COALESCE(mr.old_water,0)) * COALESCE(mr.water_price,0) as water_total,

      (
        (COALESCE(mr.new_electric,0) - COALESCE(mr.old_electric,0)) * COALESCE(mr.electric_price,0)
        +
        (COALESCE(mr.new_water,0) - COALESCE(mr.old_water,0)) * COALESCE(mr.water_price,0)
      ) as total_cost

    FROM rooms r
    LEFT JOIN tenants t ON t.room_id = r.id
    LEFT JOIN (
      SELECT * FROM monthly_records 
      WHERE room_id = ?
      ORDER BY month DESC, day DESC
      LIMIT 1
    ) mr ON mr.room_id = r.id
    WHERE r.id = ?
    `,
    [room_id, room_id],
  );

  return rows[0];
};

// ✅ Download PDF
const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await getInvoiceData(req.params.room_id);

    if (!invoice) {
      return res.status(404).json({ message: "No invoice found" });
    }

    const pdf = await generatePDF(invoice);

    console.log("PDF generated successfully:", pdf.length, "bytes");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdf.length,
      "Content-Disposition": `attachment; filename=invoice_${req.params.room_id}.pdf`,
    });

    res.end(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Upload to Firebase
const generateInvoiceURL = async (req, res) => {
  try {
    const invoice = await getInvoiceData(req.params.room_id);

    if (!invoice) {
      return res.status(404).json({ message: "No invoice found" });
    }

    const pdf = await generatePDF(invoice);

    const filePath = `invoices/invoice_${invoice.room_name}.pdf`;
    const file = bucket.file(filePath);

    await file.save(pdf, {
      metadata: { contentType: "application/pdf" },
    });

    // 🔥 Signed URL (secure)
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { generateInvoicePDF, generateInvoiceURL };
