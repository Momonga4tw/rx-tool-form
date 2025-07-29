const http = require("http");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
require("dotenv").config();

// Security: Validate required environment variables
const requiredEnvVars = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "S3_BUCKET_NAME",
  "GOOGLE_SCRIPT_URL",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  process.exit(1);
}

const AWS = require("aws-sdk");

const PORT = 3000;

// Security: Configurable rate limiting
const rateLimitMap = new Map();

// Rate limiting configuration from environment variables
const RATE_LIMIT_ENABLED =
  process.env.RATE_LIMIT_ENABLED === "true" ||
  process.env.RATE_LIMIT_ENABLED === "1";
const RATE_LIMIT_WINDOW =
  parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000; // 15 minutes default
const RATE_LIMIT_MAX_REQUESTS =
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50; // Max 50 requests per window default

function isRateLimited(ip) {
  // Skip rate limiting if disabled
  if (!RATE_LIMIT_ENABLED) {
    return false;
  }

  const now = Date.now();
  const clientData = rateLimitMap.get(ip) || {
    count: 0,
    resetTime: now + RATE_LIMIT_WINDOW,
  };

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    clientData.count++;
  }

  rateLimitMap.set(ip, clientData);
  return clientData.count > RATE_LIMIT_MAX_REQUESTS;
}

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

const server = http.createServer((req, res) => {
  // Security: Check rate limiting
  const clientIP =
    req.connection.remoteAddress || req.socket.remoteAddress || "unknown";
  if (isRateLimited(clientIP)) {
    res.writeHead(429, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." })
    );
    return;
  }

  // Security: Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "font-src 'self' https://cdn.jsdelivr.net; " +
      "object-src 'none'; " +
      "media-src 'self'; " +
      "frame-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
  );

  // Handle favicon requests
  if (req.url === "/favicon.ico") {
    res.statusCode = 204; // No content
    res.end();
    return;
  }

  // S3 file upload endpoint
  if (req.method === "POST" && req.url === "/upload") {
    const form = new formidable.IncomingForm();

    // Security: Set file size limit (10MB)
    form.maxFileSize = 10 * 1024 * 1024;
    form.maxFieldsSize = 10 * 1024 * 1024;

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

      // Security: Validate file type
      const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error:
              "Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.",
          })
        );
        return;
      }

      // Security: Validate file size
      if (file.size > 10 * 1024 * 1024) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "File size too large. Maximum 10MB allowed.",
          })
        );
        return;
      }

      // Security: Sanitize filename
      const sanitizeFilename = (filename) => {
        return filename
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .replace(/\.+/g, ".")
          .substring(0, 100);
      };

      const originalFilename =
        file.originalFilename || file.newFilename || file.name || "upload";
      const sanitizedFilename = sanitizeFilename(originalFilename);
      const fileStream = fs.createReadStream(file.filepath);
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${Date.now()}_${sanitizedFilename}`,
        Body: fileStream,
        ContentType: file.mimetype || file.type,
        ServerSideEncryption: "AES256", // Security: Encrypt files at rest
        // No public ACL - files are private by default
      };
      s3.upload(s3Params, (err, data) => {
        if (err) {
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

  // Secure endpoint to serve the application script (obfuscated path)
  if (req.method === "GET" && req.url === "/api/app.js") {
    try {
      const jsPath = path.join(__dirname, "script.js");
      if (!fs.existsSync(jsPath)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Script not found" }));
        return;
      }

      // Add cache headers for performance
      const jsContent = fs.readFileSync(jsPath, "utf8");
      res.writeHead(200, {
        "Content-Type": "text/javascript",
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
        "X-Content-Type-Options": "nosniff",
      });
      res.end(jsContent);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to load script" }));
    }
    return;
  }

  // API endpoint to serve Excel data securely (hides Excel structure)
  if (req.method === "GET" && req.url === "/api/excel-data") {
    try {
      const XLSX = require("xlsx");
      const filePath = path.join(
        __dirname,
        "RX_Combined_MR_Doctor_Template.xlsx"
      );

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Excel file not found" }));
        return;
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // Extract only WSFA codes (hide other sensitive data structure)
      const codes = [
        ...new Set(data.map((row) => row["WSFA CODE"]).filter(Boolean)),
      ];

      // Store full data on server for form submission (not sent to client)
      global.excelDataCache = data;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          codes: codes.sort(),
          count: codes.length,
        })
      );
    } catch (error) {
      console.error("Excel error:", error.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Failed to process Excel file",
          details: error.message,
        })
      );
    }
    return;
  }

  // Proxy endpoint for Google Sheets submission (hides actual Google Script URL)
  if (req.method === "POST" && req.url === "/submit-form") {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields) => {
      if (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error parsing form data" }));
        return;
      }

      if (!process.env.GOOGLE_SCRIPT_URL) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            result: "error",
            message: "Google Script URL not configured",
          })
        );
        return;
      }

      try {
        const https = require("https");
        const { URL } = require("url");
        const querystring = require("querystring");

        // Security: Validate and sanitize form data
        const allowedFields = [
          "timestamp",
          "wsfaCode",
          "hcpName",
          "smName",
          "rsmName",
          "asmName",
          "rxDate",
          "rxFile",
        ];
        const formData = {};

        Object.keys(fields).forEach((key) => {
          if (allowedFields.includes(key)) {
            let value = Array.isArray(fields[key])
              ? fields[key][0]
              : fields[key];

            // Sanitize string values
            if (typeof value === "string") {
              value = value.trim().substring(0, 1000); // Limit length
            }

            formData[key] = value;
          }
        });

        // Security: Server-side data enrichment (hide Excel logic from client)
        if (formData.wsfaCode && global.excelDataCache) {
          const selectedRow = global.excelDataCache.find(
            (row) =>
              String(row["WSFA CODE"] || "").trim() ===
              String(formData.wsfaCode || "").trim()
          );

          if (selectedRow) {
            // Add server-side found data
            formData.hcpName = selectedRow["HCP Name"] || "";
            formData.smName = selectedRow["SM Name"] || "";
            formData.rsmName = selectedRow["RSM NAME"] || "";
            formData.asmName = selectedRow["ASM NAME"] || "";
          }
        }

        const postData = querystring.stringify(formData);
        const scriptUrl = new URL(process.env.GOOGLE_SCRIPT_URL);

        const options = {
          hostname: scriptUrl.hostname,
          path: scriptUrl.pathname + scriptUrl.search,
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(postData),
          },
        };

        const request = https.request(options, (response) => {
          let data = "";

          // Log response status for debugging
          console.log(
            `Google Apps Script response status: ${response.statusCode}`
          );

          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            // Check if response is JSON or HTML
            let responseData;
            try {
              // Try to parse as JSON first
              JSON.parse(data);
              responseData = data;
            } catch (e) {
              // If not JSON, it might be HTML error page
              console.error(
                "Non-JSON response from Google Apps Script:",
                data.substring(0, 200)
              );

              if (
                data.toLowerCase().includes("<html>") ||
                data.toLowerCase().includes("<!doctype")
              ) {
                // Google Apps Script returned HTML error page
                responseData = JSON.stringify({
                  result: "error",
                  message:
                    "Google Apps Script configuration error. Please check your script deployment.",
                });
              } else {
                // Other non-JSON response
                responseData = JSON.stringify({
                  result: "error",
                  message: "Invalid response from Google Apps Script",
                });
              }
            }

            res.writeHead(200, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(responseData);
          });
        });

        request.on("error", (error) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              result: "error",
              message: "Failed to connect to Google Apps Script",
            })
          );
        });

        request.write(postData);
        request.end();
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            result: "error",
            message: "Server error occurred: " + error.message,
          })
        );
      }
    });
    return;
  }

  // Security: Block access to sensitive files and directories
  const blockedFiles = [
    "/server.js", // Block server source code
    "/script.js", // Block the original script file
    "/script-secure.js",
    "/webpack.config.js",
    "/.env",
    "/package.json",
    "/package-lock.json",
    "/RX_Combined_MR_Doctor_Template.xlsx",
    "/google-apps-script.js",
    "/SECURITY.md",
    "/DEPLOYMENT_GUIDE.md",
    "/README.md",
    "/test-security.js",
    "/node_modules", // Block node_modules directory
    "/.git", // Block git directory
    "/dist", // Block build directory
  ];

  // Block dangerous file extensions
  const blockedExtensions = [
    ".env",
    ".log",
    ".bak",
    ".tmp",
    ".config",
    ".key",
    ".pem",
  ];

  // Check if file extension is blocked
  const fileExtension = path.extname(req.url.toLowerCase());
  if (blockedExtensions.includes(fileExtension)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Access denied" }));
    return;
  }

  // Check if file/directory is blocked
  if (
    blockedFiles.includes(req.url) ||
    blockedFiles.some((blocked) => req.url.startsWith(blocked))
  ) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Access denied" }));
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

        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(
          "<h1>404 Not Found</h1><p>The requested resource was not found on this server.</p>"
        );
      } else {
        // Server error

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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `🔒 Rate Limiting: ${RATE_LIMIT_ENABLED ? "ENABLED" : "DISABLED"}`
  );
  if (RATE_LIMIT_ENABLED) {
    console.log(
      `   📊 Max Requests: ${RATE_LIMIT_MAX_REQUESTS} per ${
        RATE_LIMIT_WINDOW / 1000 / 60
      } minutes`
    );
  }
});
