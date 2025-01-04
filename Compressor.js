const environment = process.env.NODE_ENV || 'dev'; // Default to 'dev' if NODE_ENV is not set
require('dotenv').config({ path: `./Compressor.env.${environment}` });
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

// Load credentials from .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const endpoint = process.env.R2_ENDPOINT;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure AWS S3 client for R2
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(endpoint),
  accessKeyId,
  secretAccessKey,
  s3ForcePathStyle: true, // Required for R2
});

// Fetch image URLs from Supabase table
async function fetchImageUrls() {
  const { data, error } = await supabase
    .from('images') // Replace 'images' with your table name
    .select('id, image_url'); // Fetch the ID and image_url columns

  if (error) {
    console.error('Error fetching image URLs from Supabase:', error);
    throw error;
  }

  console.log(`Fetched ${data.length} image URLs from Supabase.`);
  return data; // Returns an array of { id, image_url }
}

// Download image from URL
async function fetchImage(url) {
  try {
    console.log(`Fetching image from: ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const tempPath = path.join(os.tmpdir(), path.basename(url)); // Temporary file path
    fs.writeFileSync(tempPath, response.data);
    console.log(`Image saved temporarily at: ${tempPath}`);
    return tempPath;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

// Compress image using Sharp
async function compressImage(inputPath) {
  try {
    const outputPath = path.join(os.tmpdir(), `compressed_${path.basename(inputPath)}`);
    await sharp(inputPath)
      .jpeg({ quality: 80 }) // Adjust quality as needed
      .toFile(outputPath);
    console.log(`Image compressed successfully: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

// Upload file to R2 bucket
async function uploadToR2(filePath) {
  try {
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: 'image/jpeg', // Adjust for your file type
    };

    const response = await s3.upload(params).promise();
    console.log(`File uploaded successfully to R2: ${response.Location}`);
    return response.Location;
  } catch (error) {
    console.error('Error uploading to R2 bucket:', error);
    throw error;
  }
}

// Update Supabase with the new R2 URL
async function updateSupabaseImageUrl(id, newUrl) {
  const { error } = await supabase
    .from('images') // Replace 'images' with your table name
    .update({ image_url: newUrl }) // Update the image_url column
    .eq('id', id); // Match the row by ID

  if (error) {
    console.error(`Error updating Supabase for ID ${id}:`, error);
    throw error;
  }

  console.log(`Updated Supabase with new URL for ID ${id}: ${newUrl}`);
}

// Main function
(async function () {
  try {
    // Step 1: Fetch image URLs from Supabase
    const imageRecords = await fetchImageUrls();

    for (const { id, image_url } of imageRecords) {
      try {
        // Step 2: Fetch the image from the URL
        const tempImagePath = await fetchImage(image_url);

        // Step 3: Compress the image
        const compressedImagePath = await compressImage(tempImagePath);

        // Step 4: Upload the compressed image to R2
        const uploadedImageUrl = await uploadToR2(compressedImagePath);

        // Step 5: Update Supabase with the new R2 URL
        await updateSupabaseImageUrl(id, uploadedImageUrl);

        // Step 6: Clean up temporary files
        fs.unlinkSync(tempImagePath);
        fs.unlinkSync(compressedImagePath);
        console.log('Temporary files cleaned up.');
      } catch (error) {
        console.error(`Failed processing for ID ${id}:`, error);
      }
    }
  } catch (error) {
    console.error('An error occurred during processing:', error);
  }
})();
