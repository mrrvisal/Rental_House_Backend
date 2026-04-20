const express = require("express");
const router = express.Router();
const {
  generateInvoicePDF,
  generateInvoiceURL,
} = require("../controllers/invoiceController");

router.get("/:room_id/pdf", generateInvoicePDF);
router.get("/:room_id/url", generateInvoiceURL);

module.exports = router;