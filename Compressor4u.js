require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = 3000;

// Define the folder containing images
const inputFolder = path.join(__dirname, 'input_images'); // Correctly specify folder path
const outputFolder = path.join(__dirname, 'output_images');

// Ensure the output folder exists
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true }); // Create the folder if it doesn't exist
}

// Compress images in the folder
async function compressImages() {
  const files = fs.readdirSync(inputFolder); // Get the list of files in the input folder

  for (const file of files) {
    const inputPath = path.join(inputFolder, file);
    const outputPath = path.join(outputFolder, `compressed_${file}`);

    try {
      console.log(`Compressing image: ${file}`);
      await sharp(inputPath)
        .jpeg({ quality: 40 }) // Adjust quality as needed
        .toFile(outputPath);
      console.log(`Compressed image saved to: ${outputPath}`);
    } catch (error) {
      console.error(`Error compressing ${file}:`, error);
    }
  }
}

// Serve compressed images via the backend
app.use('/compressed_images', express.static(outputFolder));

// Endpoint to trigger compression
app.get('/compress', async (req, res) => {
  try {
    await compressImages();
    res.send('Images compressed and ready to view.');
  } catch (error) {
    res.status(500).send('Error compressing images.');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Place your images in the "input_images" folder and visit http://localhost:${PORT}/compress to process them.');
});
