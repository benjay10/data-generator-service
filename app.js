// see https://github.com/mu-semtech/mu-javascript-template for more info
import { app }      from "mu";
import * as mu      from "mu";
import * as express from "express";
import * as bks     from "./lib/MuBook.js";
import * as au      from "./lib/MuAuthor.js";
import * as mf      from "./lib/MuFile.js";
import * as qs      from "./lib/Queries.js";
import * as bat     from "./lib/Batching.js";

app.use(express.json({type: "application/json"}));

app.get("/generate", async (req, res) => {
  // Checking query parameters and setting default values
  const batches       = Number(req.query.batches)            || 1;
  const itemsPerBatch = Number(req.query["items-per-batch"]) || 10;
  const pausePerBatch = Number(req.query["pause-per-batch"]) || 0;
  const targetGraph   = req.query["target-graph"]            || conf.DEFAULT_GRAPH;
  const withFiles     = req.query["with-files"] == "true" ? true : false;
  const sudo          = req.query["target-graph"] ? true : false;
  let fileSize;
  if (["small", "medium", "large", "extra"].some((i) => i == req.query["file-size"])) {
    fileSize = req.query["file-size"];
  } else {
    fileSize = "small";
  }
  const options = { batches, itemsPerBatch, pausePerBatch, targetGraph, withFiles, sudo, fileSize };

  await bat.initialiseCounters();

  //Push batches onto a global queue
  for (let batchNum = 0; batchNum < options.batches; batchNum++) {
    bat.batchQueue.push({ batchMuUuid: mu.uuid(), batchNum, ...options });
  }
  bat.startBatches();

  bat.saveCounters();

  res.status(201).json({...req.query, status: "Batches scheduled" });
});

app.get("/createBooks", async (req, res) => {
  const authorUri     = req.query["author-uri"];
  const itemsPerBatch = Number(req.query.items)   || 1;
  const targetGraph   = req.query["target-graph"] || conf.DEFAULT_GRAPH;
  const withFiles     = req.query["with-files"] == "true" ? true : false;
  const sudo          = req.query["target-graph"] ? true : false;
  let fileSize;
  if (["small", "medium", "large", "extra"].some((i) => i == req.query["file-size"])) {
    fileSize = req.query["file-size"];
  } else {
    fileSize = "small";
  }
  const options = { batches: 1, itemsPerBatch, pausePerBatch: 0, targetGraph, withFiles, sudo, fileSize, authorUri };

  await bat.initialiseCounters();

  bat.batchQueue.push({ batchMuUuid: mu.uuid(), batchNum: 0, ...options });
  bat.startBatches();

  await bat.saveCounters();

  res.status(201).json({...req.query, status: "Book creation scheduled"});
});

app.get("/createAuthor", async (req, res) => {
  const bookUri     = req.query["book-uri"];
  const authorUri   = req.query["author-uri"];
  const items       = Number(req.query.items)   || 1;
  const targetGraph = req.query["target-graph"] || conf.DEFAULT_GRAPH;
  const sudo        = req.query["target-graph"] ? true : false;

  bat.initialiseCounters();
  
  if (bookUri && authorUri) {
    res.status(409).send({status: "Conflict: you can not give both book-uri and author-uri options."});
    return;
  }
  if (authorUri && req.query.items) {
    res.status(409).send({status: "Conflict: you can not give both items and author-uri options."});
    return;
  }

  const authors = au.makeAuthors(items, bookUri, authorUri);
  const triples = authors.map(a => a.toTriples()).flat();
  await qs.insert(triples, targetGraph, sudo);
  
  res.status(201).json({...req.query, status: "Author inserted"});
});

app.get("/createFiles", async (req, res) => {
  const items       = Number(req.query["items"]) || 1;
  const targetGraph = req.query["target-graph"] || conf.DEFAULT_GRAPH;
  const sudo        = req.query["target-graph"] ? true : false;
  let fileSize;
  if (["small", "medium", "large", "extra"].some((i) => i == req.query["file-size"])) {
    fileSize = req.query["file-size"];
  } else {
    fileSize = "small";
  }

  let files = [];
  for (let i = 0; i < items; i++) {
    let f = new mf.MuFile(fileSize);
    f.save();
    files.push(f);
  }
  const triples = files.map(f => f.toTriples()).flat();
  await qs.insert(triples, targetGraph, sudo);
  
  res.status(201).json({...req.query, status: "Files saved and inserted"});
});

app.get("/clear", async (req, res) => {
  const targetGraph = req.query["target-graph"] || conf.DEFAULT_GRAPH;
  const sudo        = req.query["target-graph"] ? true : false;

  qs.clearGraph(targetGraph, sudo);
  res.status(201).json({status: "success"});
});

app.get("/deleteAuthor", async (req, res) => {
  const authorUri = req.query["author-uri"];
  const relation  = req.query.relation || "shallow";
  const sudo      = req.query.sudo == "true" ? true : false;

  if (!authorUri)
    res.status(400).json({status: "Invalid request: no author-uri given to delete."});

  const removePattern = au.removeAuthorPattern(authorUri, relation, sudo);
  await qs.remove(removePattern, sudo);

  res.status(201).json({...req.query, status: "Author removed"});
});

app.get("/deleteFile", async (req, res) => {
  const fileUri  = req.query["file-uri"];
  const relation = req.query.relation || "shallow";
  const sudo     = req.query.sudo == "true" ? true : false;

  if (!fileUri)
    res.status(400).json({status: "Invalid request: no file-uri given to delete."});

  //Remove physical file
  const filePUri = qs.getPuriForVuri(fileUri);
  await mf.removeFileFromPUri(filePUri);
  //Remove file triples
  const removePattern = mf.removeFilePattern(fileUri, relation,  sudo);
  await qs.remove(removePattern, sudo);

  res.status(201).json({...req.query, status: "File removed"});
});

app.get("/deleteBook", async (req, res) => {
  const bookUri  = req.query["book-uri"];
  const relation = req.query.relation || "shallow";
  const sudo     = req.query.sudo == "true" ? true : false;

  if (!bookUri)
    res.status(400).json({status: "Invalid request: no book-uri given to delete."});

  if (relation === "withfile") {
    const filePuri = qs.getPuriForBookUri(bookUri);
    await mf.removeFileFromPUri(filePuri);
  }
  const removePattern = bks.removeBookPattern(bookUri, relation, sudo);
  await qs.remove(removePattern, sudo);

  res.status(201).json({...req.query, status: "Book removed"});
});

app.get("/deleteBatch", async (req, res) => {
  const batchUri = req.query["batch-uri"];
  const sudo     = req.query.sudo == "true" ? true : false;

  if (!batchUri)
    res.status(400).json({status: "Invalid request: no batch-uri given to delete."});
  
  //Get the batch ranges
  const { startBookRange, endBookRange } = await bat.getBatch(batchUri);
  //Create a remove query, including files and authors, using VALUES
  await qs.removeBatch(startBookRange, endBookRange, sudo);
});

// POST /generate?
//                 batches=5
//               & items-per-batch=100
//               & pause-per-batch=1000     //this will be a pause in ms, 0 means no pause.
//               & target-graph=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2F
//               & with-files=[true|false]
//               & file-size=[small|medium|large|extra]  //optional, default: small

// POST /create-books?
//                     author-uri=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fauthor1%2F  //optional
//                   & items=100
//                   & target-graph=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2F
//                   & with-files=[true|false]
//                   & file-size=[small|medium|large|extra]  //optional, default: small

// POST /create-author?
//                      book-uri=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fbook123%2F  //optional, add new author to this book
//                    & author-uri=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fauthor1%2F  //optional, create info about author, already added to some books
//                    & items=100
//                    & target-graph=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2F

// POST /create-files?
//                     items=10
//                   & file-size=[small|medium|large|extra]  //optional, default: small

// DELETE /batch?
//                uri="http..."  // removes a whole batch
// DELETE /book?
//               uri="http..."  // removes a specific book
//             & relation=[shallow|withfile]
// DELETE /file?
//               uri="http..."  // removes a specific file
//             & relation=[shallow|withreference]
// DELETE /author?
//                 uri=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fauthor1%2F
//               & relation=[shallow|withreferences|withbooks]
//               & sudo=[true|false]
// DELETE /graph?
//                uri=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2F

// POST /reset  //This will reset counters and other things. Using generators after this could generate data that is already in a database.

