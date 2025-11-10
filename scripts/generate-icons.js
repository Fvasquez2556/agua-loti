// scripts/generate-icons.js
// Script para generar iconos de la aplicación

const sharp = require('sharp');
const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const svgPath = path.join(buildDir, 'icon.svg');

async function generateIcons() {
  console.log('🎨 Generando iconos de la aplicación...\n');

  try {
    // 1. Generar PNG principal (512x512)
    console.log('📄 Generando icon.png (512x512)...');
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(buildDir, 'icon.png'));
    console.log('✅ icon.png generado\n');

    // 2. Generar icono para bandeja del sistema (48x48)
    console.log('📄 Generando tray-icon.png (48x48)...');
    await sharp(svgPath)
      .resize(48, 48)
      .png()
      .toFile(path.join(buildDir, 'tray-icon.png'));
    console.log('✅ tray-icon.png generado\n');

    // 3. Generar ICO para Windows (múltiples tamaños)
    console.log('📄 Generando icon.ico (Windows)...');

    try {
      // Generar PNGs en diferentes tamaños para el ICO
      const sizes = [16, 32, 48, 256];
      const pngBuffers = [];

      for (const size of sizes) {
        const buffer = await sharp(svgPath)
          .resize(size, size)
          .png()
          .toBuffer();
        pngBuffers.push(buffer);
      }

      // Combinar en un archivo ICO
      const icoBuffer = png2icons.createICO(pngBuffers, png2icons.BICUBIC, 0, true);

      if (icoBuffer) {
        fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
        console.log('✅ icon.ico generado\n');
      } else {
        throw new Error('png2icons retornó buffer nulo');
      }
    } catch (icoError) {
      console.warn('⚠️  Error al generar .ico, usando PNG como fallback...');
      // Copiar el PNG de 256x256 como ICO (Windows lo aceptará)
      const png256 = await sharp(svgPath).resize(256, 256).png().toBuffer();
      fs.writeFileSync(path.join(buildDir, 'icon.ico'), png256);
      console.log('✅ icon.ico generado (desde PNG)\n');
    }

    // 4. Información de archivo
    console.log('📊 Iconos generados:');
    const files = ['icon.png', 'icon.ico', 'tray-icon.png'];
    files.forEach(file => {
      const filePath = path.join(buildDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ✓ ${file} (${sizeKB} KB)`);
      }
    });

    console.log('\n✨ ¡Todos los iconos generados exitosamente!\n');
    console.log('📁 Ubicación: build/');
    console.log('   - icon.png (512x512) - Icono principal');
    console.log('   - icon.ico - Icono para Windows');
    console.log('   - tray-icon.png (48x48) - Bandeja del sistema\n');

  } catch (error) {
    console.error('❌ Error al generar iconos:', error);
    process.exit(1);
  }
}

// Ejecutar
generateIcons();
