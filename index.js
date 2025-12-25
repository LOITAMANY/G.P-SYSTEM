// backend/index.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =======================
// DATABASE (SQLite)
// =======================
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "database.sqlite"),
  logging: false, // prevents leaking info in logs
});

// =======================
// MODELS
// =======================
const Pool = sequelize.define("Pool", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

const Contribution = sequelize.define("Contribution", {
  user_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

Pool.hasMany(Contribution, { onDelete: "CASCADE" });
Contribution.belongsTo(Pool);

// =======================
// INITIALIZE DATABASE
// =======================
(async () => {
  try {
    await sequelize.sync();

    const pool = await Pool.findByPk(1);
    if (!pool) {
      await Pool.create({ name: "Elite Gaming Pool" });
    }

    console.log("Database ready");
  } catch (err) {
    console.error("Database error:", err);
  }
})();

// =======================
// ROUTES
// =======================
app.get("/api/pools", async (req, res) => {
  try {
    const pools = await Pool.findAll();
    res.json(pools);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pools" });
  }
});

app.post("/api/contributions/pay", async (req, res) => {
  const { poolId, user_name, phone, amount } = req.body;

  // 🔐 Input validation
  if (
    !poolId ||
    !user_name ||
    !phone ||
    !amount ||
    isNaN(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({ error: "Invalid or missing fields" });
  }

  try {
    const pool = await Pool.findByPk(poolId);

    if (!pool) {
      return res.status(404).json({ error: "Pool not found" });
    }

    await Contribution.create({
      user_name,
      phone,
      amount: parseInt(amount),
      PoolId: poolId,
    });

    pool.total_amount += parseInt(amount);
    await pool.save();

    res.json({ message: "Payment received successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// =======================
// SERVE FRONTEND
// =======================
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
