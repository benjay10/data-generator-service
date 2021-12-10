import * as bks from "./MuBook.js";
import * as qs  from "./Queries.js";

export let batchQueue = [];
let timer = undefined;

export async function startBatches() {
  if (!batchQueue.length > 0 || timer)
    return;
  return processBatch();
}

async function processBatch() {
  const batch = batchQueue.shift();
  const { batchNum, batches, itemsPerBatch, pausePerBatch, targetGraph, withFiles, sudo, fileSize } = batch;

  //Create books
  console.log(`Starting batch ${batchNum + 1}, of total ${batches}.`);
  const books = bks.makeBooks(itemsPerBatch, withFiles, fileSize);
  const booksInTriples = books.map(book => book.toTriples()).flat();
  await qs.insert(booksInTriples, targetGraph, sudo);

  if (batchQueue.length > 0) {
    timer = setTimeout(processBatch, pausePerBatch);
  } else {
    timer = undefined;
  }
}

