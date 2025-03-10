require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Define the folder paths
const inputFolder = path.join(__dirname, 'input_images'); // Correctly specify folder path
const outputFolder = path.join(__dirname, 'output_images');

// Ensure the output folder exists
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true }); // Create the folder if it doesn't exist
}

// Allowed file extensions
const validExtensions = ['.jpg', '.jpeg', '.png'];

// Compress images in the folder and convert to .webp
async function compressImages() {
  const files = fs.readdirSync(inputFolder).filter(file =>
    validExtensions.includes(path.extname(file).toLowerCase())
  );

  for (const file of files) {
    const inputPath = path.join(inputFolder, file);
    const outputFileName = path.basename(file, path.extname(file)) + '.webp'; // Change extension to .webp
    const outputPath = path.join(outputFolder, outputFileName);

    try {
      console.log(`Compressing and converting image: ${file}`);
      await sharp(inputPath)
        .webp({ quality: 40 }) // Convert to .webp with specified quality
        .toFile(outputPath);
      console.log(`Converted image saved to: ${outputPath}`);
    } catch (error) {
      console.error(`Error compressing and converting ${file}:`, error);
    }
  }
}

// Serve compressed images via the backend
app.use('/compressed_images', express.static(outputFolder));

// Endpoint to trigger compression
app.get('/compress', async (req, res) => {
  try {
    await compressImages();
    res.send('Images compressed and converted to .webp format. Check the "output_images" folder.');
  } catch (error) {
    res.status(500).send('Error compressing images.');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Place your images in the "input_images" folder and visit http://localhost:${PORT}/compress to process them.');
});
