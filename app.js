// see https://github.com/mu-semtech/mu-javascript-template for more info
import { app }      from "mu";
import * as express from "express";
import * as bks     from "./lib/MuBook.js";
import * as qs      from "./lib/Queries.js";

app.use(express.json({type: "application/json"}));

app.get("/generate", async (req, res) => {
  // Checking query parameters and setting default values
  const batches       = Number(req.query.batches)            || 1;
  const itemsPerBatch = Number(req.query["items-per-batch"]) || 10;
  const pausePerBatch = Number(req.query["pause-per-batch"]) || 0;
  const targetGraph   = req.query["target-graph"]            || "http://mu.semte.ch/application";
  const withFiles     = req.query["with-files"] == "true" ? true : false;
  const sudo          = req.query["target-graph"] ? true : false;
  if (["small", "medium", "large", "extra"].some((i) => i == req.query["file-size"])) {
    const fileSize = req.query["file-size"];
  } else {
    const fileSize = "small";
  }

  for (let batchNum = 0; batchNum < batches; batchNum++) {
    //TODO: Create files for every book if necessary
    //TODO: Create books with files
    //TODO: Save books with files
    //Create books
    console.log(`Starting batch ${batchNum}, of total ${batches}.`);
    const books = bks.makeBooks(itemsPerBatch);
    const booksInTriples = books.map(book => book.toTriples()).flat();
    qs.insert(booksInTriples, targetGraph, sudo);
  }

  res.status(201).json(req.query);
});

app.get("/clear", async (req, res) => {
  const targetGraph = req.query["target-graph"] || "http://mu.semte.ch/application";
  const sudo        = req.query["target-graph"] ? true : false;

  qs.clearGraph(targetGraph, sudo);
  res.status(201).json({status: "success"});
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
//                id=234232           // removes a whole batch
// DELETE /book?
//               id=61032423098423    // removes a specific book
// DELETE /author?
//                 id=61032423098423    // removes a specific author
//               $ with-books=[true|false]
// DELETE /graph?
//                name=http%3A%2F%2Fmu.semte.ch%2Fbookstore%2F

// POST /reset  //This will reset counters and other things. Using generators after this could generate data that is already in a database.

