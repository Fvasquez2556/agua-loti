// backend/createAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config({ path: "../.env" }); // ✅ Ruta explícita


async function createAdmin() {
await mongoose.connect(process.env.MONGO_URI);
  console.log("Conectado a la base de datos MongoDB.");
  
  const passwordHash = await bcrypt.hash("admin123", 10);

  const adminUser = new User({
    username: "admin",
    password: passwordHash,
    role: "admin",
  });

  await adminUser.save();
  console.log("✅ Usuario admin creado con éxito.");
  mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error("❌ Error al crear usuario:", err);
});
