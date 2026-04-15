const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "rental-system" }, (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url); // 👉 THIS is image URL
      })
      .end(fileBuffer);
  });
};

module.exports = uploadToCloudinary;
