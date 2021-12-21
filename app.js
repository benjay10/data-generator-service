// see https://github.com/mu-semtech/mu-javascript-template for more info
import { app }      from "mu";
import * as mu      from "mu";
import * as express from "express";
import * as bks     from "./lib/MuBook.js";
import * as au      from "./lib/MuAuthor.js";
import * as mf      from "./lib/MuFile.js";
import * as qs      from "./lib/Queries.js";
import * as bat     from "./lib/Batching.js";
import * as conf    from "./config.js";

app.use(express.json({type: "application/json"}));

app.post("/generate", async (req, res) => {
  try {
    //Checking query parameters and setting default values
    const batches       = Number(req.query.batches)            || 5;
    const itemsPerBatch = Number(req.query["items-per-batch"]) || 10;
    const pausePerBatch = Number(req.query["pause-per-batch"]) || 100;
    const targetGraph   = req.query["target-graph"]            || conf.DEFAULT_GRAPH;
    const withFiles     = req.query["with-files"] == "true" ? true : false;
    const sudo          = req.query["target-graph"] ? true : false;
    let fileSize;
    if (["small", "medium", "large", "extra"].some((i) => i == req.query["file-size"])) {
      fileSize = req.query["file-size"];
    } else {
      fileSize = "small";
    }
    const options = { batches, itemsPerBatch, pausePerBatch, targetGraph, useResources: false, withFiles, sudo, fileSize };

    //Get counters for certain things from a management graph in the triplestore
    await bat.initialiseCounters();

    //Push batches onto a global queue and start them
    for (let batchNum = 0; batchNum < options.batches; batchNum++) {
      bat.batchQueue.push({ batchMuUuid: mu.uuid(), batchNum, ...options });
    }
    bat.startBatches();

    //Update the counters in the triplestore
    bat.saveCounters();

    res.status(201).json({...req.query, status: "Batches scheduled" });
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.post("/create-books", async (req, res) => {
  try {
    const authorUri     = req.query["author-uri"];
    const itemsPerBatch = Number(req.query.items)   || 10;
    const targetGraph   = req.query["target-graph"] || conf.DEFAULT_GRAPH;
    const useResources  = req.query["use-resources"] == "true" ? true : false;
    const withFiles     = req.query["with-files"] == "true" ? true : false;
    const sudo          = req.query["target-graph"] ? true : false;
    let fileSize;
    if (["small", "medium", "large", "extra"].some((i) => i == req.query["file-size"])) {
      fileSize = req.query["file-size"];
    } else {
      fileSize = "small";
    }
    const options = { batches: 1, itemsPerBatch, pausePerBatch: 0, targetGraph, useResources, withFiles, sudo, fileSize, authorUri };

    await bat.initialiseCounters();

    //Push only a single job to the batch queue
    bat.batchQueue.push({ batchMuUuid: mu.uuid(), batchNum: 0, ...options });
    bat.startBatches();

    await bat.saveCounters();

    res.status(201).json({...req.query, status: "Book creation scheduled"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.post("/create-author", async (req, res) => {
  try {
    const bookUri     = req.query["book-uri"];
    const authorUri   = req.query["author-uri"];
    const items       = Number(req.query.items)   || 1;
    const targetGraph = req.query["target-graph"] || conf.DEFAULT_GRAPH;
    const sudo        = req.query["target-graph"] ? true : false;

    await bat.initialiseCounters();
    
    //Request invalid in certain situations
    if (bookUri && authorUri) {
      res.status(409).send({status: "Conflict: you can not give both book-uri and author-uri options."});
      return;
    }
    if (authorUri && req.query.items) {
      res.status(409).send({status: "Conflict: you can not give both items and author-uri options."});
      return;
    }

    //Create authors manually (not in batches) and insert them
    const authors = au.makeAuthors(items, bookUri, authorUri);
    const triples = authors.map(a => a.toTriples()).flat();
    await qs.insert(triples, targetGraph, sudo);
    
    res.status(201).json({...req.query, status: "Author inserted"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.post("/create-files", async (req, res) => {
  try {
    const items       = Number(req.query["items"]) || 1;
    const targetGraph = req.query["target-graph"] || conf.DEFAULT_GRAPH;
    const sudo        = req.query["target-graph"] ? true : false;
    let fileSize;
    if (["small", "medium", "large", "extra"].some((i) => i == req.query["file-size"])) {
      fileSize = req.query["file-size"];
    } else {
      fileSize = "small";
    }

    //Create files not in batches and save and insert them
    let files = mf.makeFiles(items, fileSize);
    const triples = files.map(f => f.toTriples()).flat();
    await qs.insert(triples, targetGraph, sudo);
    
    res.status(201).json({...req.query, status: "Files saved and inserted"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.delete("/graph", async (req, res) => {
  try {
    const targetGraph = req.query["uri"] || conf.DEFAULT_GRAPH;
    const sudo        = req.query["uri"] ? true : false;

    await qs.clearGraph(targetGraph, sudo);
    res.status(201).json({...req.query, status: "Graph removed"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.delete("/author", async (req, res) => {
  try {
    const authorUri = req.query["author-uri"];
    const relation  = req.query.relation || "shallow";
    const sudo      = req.query.sudo == "true" ? true : false;

    //If no author, nothing can happen
    if (!authorUri)
      res.status(400).json({status: "Invalid request: no author-uri given to delete."});

    //Construct a pattern for the author to be removed and use in query to execute
    const removePattern = au.removeAuthorPattern(authorUri, relation, sudo);
    await qs.remove(removePattern, sudo);

    res.status(201).json({...req.query, status: "Author removed"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.delete("/file", async (req, res) => {
  try {
    const fileUri  = req.query["file-uri"];
    const relation = req.query.relation || "shallow";
    const sudo     = req.query.sudo == "true" ? true : false;

    if (!fileUri)
      res.status(400).json({status: "Invalid request: no file-uri given to delete."});

    //Remove physical file
    const filePUri = await qs.getPuriForVuri(fileUri);
    if (filePuri)
      await mf.removeFileFromPUri(filePUri);
    //Remove file triples
    const removePattern = mf.removeFilePattern(fileUri, relation, sudo);
    await qs.remove(removePattern, sudo);

    res.status(201).json({...req.query, status: "File removed"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.delete("/book", async (req, res) => {
  try {
    const bookUri  = req.query["book-uri"];
    const relation = req.query.relation || "shallow";
    const sudo     = req.query.sudo == "true" ? true : false;

    if (!bookUri)
      res.status(400).json({status: "Invalid request: no book-uri given to delete."});

    //Remove file when asked for
    if (relation === "withfile") {
      const filePuri = await qs.getPuriForBookUri(bookUri);
      if (filePuri)
        await mf.removeFileFromPUri(filePuri);
    }
    //Remove book (and possibly file-) triples
    const removePattern = bks.removeBookPattern(bookUri, relation, sudo);
    await qs.remove(removePattern, sudo);

    res.status(201).json({...req.query, status: "Book removed"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
});

app.delete("/batch", async (req, res) => {
  try {
    const batchUri = req.query["batch-uri"];
    const sudo     = req.query.sudo == "true" ? true : false;

    if (!batchUri)
      res.status(400).json({status: "Invalid request: no batch-uri given to delete."});
    
    //Get the batch ranges
    const { startBookRange, endBookRange } = await bat.getBatch(batchUri);
    //Create a remove query, including files and authors, using VALUES
    await qs.removeBatch(startBookRange, endBookRange, sudo);

    res.status(201).json({...req.query, status: "Batch removed"});
  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error!\n" + err.stack.toString());
  }
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
//                   & resources=[true|false]                //use mu-cl-resources, default: false

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

