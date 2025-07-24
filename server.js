const http = require("http");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
require("dotenv").config();

const AWS = require("aws-sdk");

const PORT = 3000;

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const S3_BUCKET = process.env.S3_BUCKET_NAME;

const server = http.createServer((req, res) => {
  // All console.log statements removed for production

  // Handle favicon requests
  if (req.url === "/favicon.ico") {
    res.statusCode = 204; // No content
    res.end();
    return;
  }

  // S3 file upload endpoint
  if (req.method === "POST" && req.url === "/upload") {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error parsing form data" }));
        return;
      }
      // Support both array and single file
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No file uploaded" }));
        return;
      }
      const fileStream = fs.createReadStream(file.filepath);
      const s3Params = {
        Bucket: S3_BUCKET,
        Key: `${Date.now()}_${
          file.originalFilename || file.newFilename || file.name
        }`,
        Body: fileStream,
        ContentType: file.mimetype || file.type,
        // No ACL
      };
      s3.upload(s3Params, (err, data) => {
        if (err) {
          // console.error("S3 upload error:", err); // Log the actual S3 error
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "S3 upload failed", details: err.message })
          );
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ url: data.Location }));
        }
      });
    });
    return;
  }

  // Serve Google Script URL config to frontend
  if (req.method === "GET" && req.url === "/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ scriptURL: process.env.GOOGLE_SCRIPT_URL }));
    return;
  }

  // Normalize URL path
  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(__dirname, filePath);

  // Get file extension
  const extname = path.extname(filePath).toLowerCase();

  // Set content type based on file extension
  const contentType = MIME_TYPES[extname] || "application/octet-stream";

  // Read file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // File not found
        // console.error(`File not found: ${filePath}`);
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(
          "<h1>404 Not Found</h1><p>The requested resource was not found on this server.</p>"
        );
      } else {
        // Server error
        // console.error(`Server error: ${err.code}`);
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(
          "<h1>500 Internal Server Error</h1><p>An error occurred while processing your request.</p>"
        );
      }
    } else {
      // Success
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  // console.log(`Server running at http://localhost:${PORT}/`);
  // console.log(`Press Ctrl+C to stop the server`);
});
