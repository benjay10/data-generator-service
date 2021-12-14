import * as bks  from "./MuBook.js";
import * as au   from "./MuAuthor.js";
import * as qs   from "./Queries.js";
import * as conf from "../config.js";
import * as mu   from "mu";
import { querySudo, updateSudo } from "@lblod/mu-auth-sudo";

export let batchQueue = [];
let timer = undefined;

export async function startBatches() {
  if (!batchQueue.length > 0 || timer)
    return;
  return processBatch();
}

async function processBatch() {
  const batch = batchQueue.shift();
  const { batchMuUuid, batchNum, batches, itemsPerBatch, pausePerBatch, targetGraph, withFiles, sudo, fileSize, authorUri } = batch;

  console.log(`Starting batch ${batchNum + 1}, of total ${batches}.`);

  const startBookRange = bks.getCounter();

  //Create books
  const books = bks.makeBooks(itemsPerBatch, withFiles, fileSize, authorUri);
  const booksInTriples = books.map(book => book.toTriples()).flat();

  const endBookRange = bks.getCounter();
  await saveBatch(batchMuUuid, startBookRange, endBookRange);
  
  await qs.insert(booksInTriples, targetGraph, sudo);

  if (batchQueue.length > 0) {
    timer = setTimeout(processBatch, pausePerBatch);
  } else {
    timer = undefined;
  }
}

export async function initialiseCounters() {
  if (bks.getCounter() >= 0 && au.getCounter() >= 0)
    return;

  console.log("NEED TO INITIALISE THE COUNTERS");

  const queryString = `${conf.PREFIXES}
    SELECT ?bookCounter ?authorCounter {
      GRAPH ${mu.sparqlEscapeUri(conf.MANAGEMENT_GRAPH)} {
        ext:bookCount   ext:value ?bookCounter .
        ext:authorCount ext:value ?authorCounter .
      }
    }`;

  const results = await querySudo(queryString);
  const bindings = results.results.bindings;
  bks.setCounter(bindings.bookCounter  ? Number(bindings.bookCounter.value)   : 0);
  au.setCounter(bindings.authorCounter ? Number(bindings.authorCounter.value) : 0);

  console.log("COUNTERS INITIALISED WITH", bks.getCounter(), au.getCounter());
}

export async function saveCounters() {
  const queryString = `${conf.PREFIXES}
    DELETE {
      GRAPH ${mu.sparqlEscapeUri(conf.MANAGEMENT_GRAPH)} {
        ext:bookCount   ext:value ?bookCounter .
        ext:authorCount ext:value ?authorCounter .
      }
    }
    INSERT {
      GRAPH ${mu.sparqlEscapeUri(conf.MANAGEMENT_GRAPH)} {
        ext:bookCount   ext:value ${mu.sparqlEscapeInt(bks.getCounter())} .
        ext:authorCount ext:value ${mu.sparqlEscapeInt(au.getCounter())} .
      }
    }
    WHERE {
      GRAPH ${mu.sparqlEscapeUri(conf.MANAGEMENT_GRAPH)} {
        ext:bookCount   ext:value ?bookCounter .
        ext:authorCount ext:value ?authorCounter .
      }
    }`;

  await updateSudo(queryString);
}

export async function saveBatch(batchMuUuid, startBookRange, endBookRange) {
  const queryString = `${conf.PREFIXES}
    INSERT DATA {
      GRAPH ${mu.sparqlEscapeUri(conf.MANAGEMENT_GRAPH)} {
        ext:batch${batchMuUuid} ext:startBookRange ${mu.sparqlEscapeInt(startBookRange)} ;
                                ext:endBookRange   ${mu.sparqlEscapeInt(endBookRange)} .
      }
    }`;
  await updateSudo(queryString);
}

export async function getBatch(batchUri) {
  const queryString = `${conf.PREFIXES}
    SELECT ?startBookRange ?endBookRange {
      GRAPH ${mu.sparqlEscapeUri(conf.MANAGEMENT_GRAPH)} {
        ${mu.sparqlEscapeUri(batchUri)}
          ext:startBookRange ?startBookRange ;
          ext:endBookRange   ?endBookRange .
      }
    }`;
  const results = await querySudo(queryString);
  if (results.results.bindings.length > 0)
    return {
      startBookRange: results.results.bindings[0].startBookRange.value,
      endBookRange:   results.results.bindings[0].endBookRange.value
    };
}

