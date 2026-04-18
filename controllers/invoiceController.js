const db = require("../config/db");
const puppeteer = require("puppeteer");

const generateInvoicePDF = async (req, res) => {
  let browser;

  try {
    const { room_id } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        r.id as room_id,
        r.name as room_name,
        t.name as tenant_name,
        t.phone as tenant_phone,
        mr.id as invoice_id,
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
    // console.log(rows);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No invoice data found",
      });
    }

    const invoice = rows[0];
    const safeRoom = (invoice.room_name || "room").replace(/\s+/g, "_");

    // Compute proper expire date: record date + 6 days
    let expireDateStr = `${invoice.month || ""} - ថ្ងៃ ${invoice.day + 6}`;
    if (invoice.month && invoice.day) {
      try {
        const recordDate = new Date(`${invoice.month}-${invoice.day}`);
        if (!isNaN(recordDate.getTime())) {
          const expireDate = new Date(
            recordDate.getTime() + 6 * 24 * 60 * 60 * 1000,
          );
          const expireMonth = String(expireDate.getMonth() + 1).padStart(
            2,
            "0",
          );
          const expireDay = expireDate.getDate();
          const expireYear = expireDate.getFullYear();
          expireDateStr = `${expireYear}-${expireMonth} - ថ្ងៃ ${expireDay}`;
        }
      } catch (e) {
        console.warn("Expire date computation failed:", e);
      }
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice</title>
      <style>
        body {
          font-family: Arial, "Noto Sans Khmer", sans-serif;
          font-size: 12px;
          color: #333;
        }
        .page { padding: 20mm; }
        .header { text-align:center; border-bottom:2px solid #007bff; margin-bottom:20px; }
        .header h1 { color:#007bff; }
        table { width:100%; border-collapse:collapse; }
        th, td { border:1px solid #ddd; padding:8px; }
        th { background:#f8f9fa; }
        .total { background:#007bff; color:white; font-weight:bold; }
        .total .title { text-align:center; }
      </style>
    </head>
    <body>
      <div class="page">

        <div class="header">
          <h1>វិក្កយបត្រ</h1>
          <p>បន្ទប់: ${invoice.room_name}</p>
        </div>

        <p><b>អ្នកជួល:</b> ${invoice.tenant_name || "N/A"} (${invoice.tenant_phone || ""})</p>
        <p><b>កាលបរិច្ឆេទ:</b> ${invoice.month || ""} - ថ្ងៃ ${invoice.day || ""}</p>
        <p><b>ថ្ងៃផុតកំណត់:</b> ${expireDateStr} </p>
        <table>
          <thead>
            <tr>
              <th>ប្រព័ន្ធ</th>
              <th>ការប្រើប្រាស់</th>
              <th>តម្លៃ</th>
              <th>សរុប</th>
            </tr>
          </thead>

          <tbody>
          <tr>
            <td>ទឹក</td>
            <td>${invoice.water_usage} m³</td>
            <td>${Number(invoice.water_price).toLocaleString()}៛/m³</td>
            <td>${Number(invoice.water_total).toLocaleString()}៛</td>
          </tr>

            <tr>
              <td>ភ្លើង</td>
              <td>${invoice.electric_usage} kWh</td>
              <td>${Number(invoice.electric_price).toLocaleString()}៛/kWh</td>
              <td>${Number(invoice.electric_total).toLocaleString()}៛</td>
            </tr>

          </tbody>

          <tfoot>
            <tr class="total">
              <td colspan="3" class="title">តម្លៃសរុប</td>
              <td>${Number(invoice.total_cost).toLocaleString()} ៛</td>
            </tr>
          </tfoot>
        </table>

      </div>
    </body>
    </html>
    `;

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // ✅ FIX: correct font waiting
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts?.ready);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice_${safeRoom}_${invoice.month || "current"}_${invoice.day || 1}.pdf"`,
    });

    res.end(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { generateInvoicePDF };
