import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';

dotenv.config({});

import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import masterDataRoute from "./routes/master.route.js";
import healthRoute from './routes/health.route.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed frontend origins
const allowedOrigins = [
  'https://job-portal-dev-myapp-frontend-gamma.apps.ocp.smartek.ae',
  'https://job-portal-frontend-gamma.apps.ocp.smartek.ae',
  'http://localhost:8080',
  'http://localhost:5173',
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log(" Incoming Origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(" CORS rejected origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// CORS middleware (must come before all routes)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle pre-flight requests

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check test route
app.get('/ping', (req, res) => {
  res.json({ msg: 'pong' });
});

//  API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);
app.use("/api/v1/master", masterDataRoute);
app.use('/api', healthRoute); // endpoints: /api/health, /api/ready, /api/startup

// Global Error Handler (important for CORS errors)
app.use((err, req, res, next) => {
  console.error(" Global Error:", err.message);

  // Add CORS headers even on error responses
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");

  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
app.listen(PORT, () => {
  connectDB();
  console.log(` Server running on port ${PORT}`);
});
