const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  getRecordsByRoom,
  createRecord,
  getDashboard,
  getLastRecord,
} = require("../controllers/recordController");

// Multer config
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.get("/dashboard", getDashboard);
router.get("/:room_id", getRecordsByRoom);
router.get("/:room_id/last", getLastRecord);
router.post(
  "/",
  upload.fields([
    { name: "electric_image", maxCount: 1 },
    { name: "water_image", maxCount: 1 },
  ]),
  createRecord,
);

module.exports = router;
