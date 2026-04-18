const express = require("express");
const router = express.Router();
const { generateInvoicePDF } = require("../controllers/invoiceController");

router.get("/:room_id/pdf", generateInvoicePDF);

module.exports = router;
