const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); //Added For IP Whitelisting

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

const connectDB = require("./src/config/db");

const adminRoutes = require("./src/routes/admin.routes");
const staffRoutes = require("./src/routes/staff.routes");
const clientRoutes = require("./src/routes/client.routes");
const hoardingRoutes = require("./src/routes/hoarding.routes");
const proofRoutes = require("./src/routes/proof.routes");

const { notFound, errorHandler } = require("./src/middlewares/error.middleware");

dotenv.config();

const app = express();

connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ADINN Outdoor API running successfully"
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/hoardings", hoardingRoutes);
app.use("/api/proofs", proofRoutes);




app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});