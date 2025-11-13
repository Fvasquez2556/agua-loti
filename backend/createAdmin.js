// backend/createAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("./models/User");

// Cargar .env desde la raíz del proyecto o la ruta configurada
const envPath = process.env.ENV_FILE_PATH || path.join(__dirname, "..", ".env");
require("dotenv").config({ path: envPath });

async function createAdmin() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/agua-loti";
  console.log(`Conectando a MongoDB: ${mongoUri}`);

  await mongoose.connect(mongoUri);
  console.log("✅ Conectado a la base de datos MongoDB.");

  // Verificar si el usuario admin ya existe
  const existingAdmin = await User.findOne({ username: "admin" });

  if (existingAdmin) {
    console.log("⚠️  El usuario admin ya existe.");
    console.log("   Username: admin");
    console.log("   Si olvidaste la contraseña, elimina el usuario primero.");
    mongoose.disconnect();
    return;
  }

  // Crear nuevo usuario admin
  const passwordHash = await bcrypt.hash("admin123", 10);

  const adminUser = new User({
    username: "admin",
    password: passwordHash,
    role: "admin",
  });

  await adminUser.save();
  console.log("✅ Usuario admin creado con éxito.");
  console.log("   Username: admin");
  console.log("   Password: admin123");
  console.log("");
  console.log("⚠️  IMPORTANTE: Cambia la contraseña después del primer login.");
  mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error("❌ Error al crear usuario:", err);
});
