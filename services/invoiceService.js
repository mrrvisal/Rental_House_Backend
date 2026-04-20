const puppeteer = require("puppeteer");

let browser;

// 🚀 reuse browser + cleanup
const getBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    // Cleanup on exit
    process.on("exit", async () => {
      if (browser) await browser.close();
    });
    process.on("SIGTERM", async () => {
      if (browser) await browser.close();
    });
    process.on("SIGINT", async () => {
      if (browser) await browser.close();
    });
  }
  return browser;
};

// ✅ Generate expire date safely
const getExpireDate = (month, day) => {
  if (!month || !day) return "";

  try {
    const recordDate = new Date(
      `${month}-${String(day).padStart(2, "0")}T00:00:00`,
    );

    if (isNaN(recordDate.getTime())) return "";

    const expireDate = new Date(recordDate.getTime() + 6 * 24 * 60 * 60 * 1000);

    return `${expireDate.getFullYear()}-${String(
      expireDate.getMonth() + 1,
    ).padStart(2, "0")} - ថ្ងៃ ${expireDate.getDate()}`;
  } catch {
    return "";
  }
};

// ✅ Generate HTML
const generateHTML = (invoice) => {
  const expireDateStr = getExpireDate(invoice.month, invoice.day);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Invoice</title>

    <style>
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #333;
        line-height: 1.4;
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
      <p><b>ថ្ងៃផុតកំណត់:</b> ${expireDateStr}</p>

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
            <td>${Number(invoice.water_price).toLocaleString()}៛</td>
            <td>${Number(invoice.water_total).toLocaleString()}៛</td>
          </tr>

          <tr>
            <td>ភ្លើង</td>
            <td>${invoice.electric_usage} kWh</td>
            <td>${Number(invoice.electric_price).toLocaleString()}៛</td>
            <td>${Number(invoice.electric_total).toLocaleString()}៛</td>
          </tr>
        </tbody>

        <tfoot>
          <tr class="total">
            <td colspan="3" class="title">តម្លៃសរុប</td>
            <td>${Number(invoice.total_cost).toLocaleString()}៛</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </body>
  </html>
  `;
};

// ✅ Generate PDF buffer
const generatePDF = async (invoice) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(30000);

    const html = generateHTML(invoice);

    await page.setContent(html, { waitUntil: "load", timeout: 10000 });

    await new Promise((r) => setTimeout(r, 1500)); // Brief render delay

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    if (!pdf || pdf.length === 0) throw new Error("Empty PDF generated");

    return pdf;
  } catch (error) {
    console.error("PDF generation failed:", error.message);
    throw error;
  } finally {
    try {
      await page.close();
    } catch (e) {
      // ignore
    }
  }
};

module.exports = { generatePDF };
