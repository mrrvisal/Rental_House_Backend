const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);
const protectedRouter = express.Router();
protectedRouter.use("/rooms", require("./routes/rooms"));
protectedRouter.use("/tenants", require("./routes/tenants"));
protectedRouter.use("/records", require("./routes/records"));
protectedRouter.use("/invoices", require("./routes/invoices"));
app.use("/api/admin", protectedRouter);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Rental House Management System API is running",
    version: "1.0.0",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
