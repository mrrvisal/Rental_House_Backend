# Rental House Backend

## Local Development

```bash
npm install
npm run dev
```

## Docker Build & Run

```bash
# Build
docker build -t rental-backend .

# Run (expose port 4000)
docker run -p 4000:4000 \\
  -e DB_HOST=your_tidb_host \\
  -e DB_PORT=4000 \\
  -e DB_USER=your_user \\
  -e DB_PASSWORD=your_pass \\
  -e DB_NAME=your_db \\
  -e DB_CA_PATH=/etc/ssl/cert.pem \\
  -e FIREBASE_SERVICE_ACCOUNT=$(base64 -w 0 firebase-key.json) \\
  -e CLOUD_NAME=your_cloudinary_name \\
  -e CLOUD_API_KEY=your_key \\
  -e CLOUD_API_SECRET=your_secret \\
  rental-backend
```

## Health Check

http://localhost:4000/

## Deploy Notes

- Uses TiDB Cloud MySQL-compatible DB (SSL required)
- Firebase Storage for file uploads
- Cloudinary for image processing
- Multi-stage Docker build optimized for production
