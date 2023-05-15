/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
const admin = require("firebase-admin");
const Papa = require("papaparse"); // CSV parser

// The Firebase Admin SDK to access Firestore.
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

exports.importCSVToFirestore = onObjectFinalized(async (event) => {
  const fileBucket = event.data.bucket; // The Storage bucket that contains the file.
  const filePath = event.data.name; // File path in the bucket.
  const contentType = event.data.contentType; // File content type.
  const metageneration = event.data.metageneration; // Number of times metadata has been generated. New objects have a value of 1.

  // Exit if this is triggered on a file that is not a csv file.
  if (!contentType || !contentType.startsWith("text/csv")) {
    logger.info("This is not a csv file.");
    return null;
  }

  // Get the file name.
  const fileName = filePath.split("/").pop();
  if (!fileName) {
    logger.info("Missing file name.");
    return null;
  }

  logger.info("File Name: ", fileName);
  logger.info("Metadata count: ", metageneration);

  // Download file from bucket to a temporary path
  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  await bucket.file(filePath).download({ destination: tempFilePath });
  logger.info("File downloaded locally to", tempFilePath);

  importCsv(tempFilePath);

  // Delete the temporary file.
  fs.unlinkSync(tempFilePath);
  logger.info("Temporary file removed.", tempFilePath);

  return null;
});

async function importCsv(file: string) {
  // Parse the CSV file.
  // const csvData = fs.readFileSync(tempFilePath, 'utf8');
  // const parsedData = Papa.parse(csvData, {header: true}).data;
  Papa.parse(file, {
    header: true,
    preview: 5,
    step: function (row: { data: any }) {
      console.log("Row:", row.data);
    },
  });

  logger.info("CSV parsed successfully!");

  // // Upload the CSV data to Firestore.
  // for (const data of parsedData) {
  //     await db.collection('data').add(data);
  // }
  // logger.info('Data uploaded to Firestore successfully!');

  // // Get the column names
  // const columnNames = await reader.next();

  // // Import the data in chunks
  // for await (const row of reader) {
  //   // Create a document
  //   const document = collection.doc();

  //   // Set the document data
  //   for (let i = 0; i < columnNames.length; i++) {
  //     document.set(columnNames[i], row[i]);
  //   }

  //   // Write the document
  //   await document.write();
  // }
}
