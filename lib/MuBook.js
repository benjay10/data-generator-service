import * as mu     from "mu";
import * as mufile from "../lib/MuFile.js";

export function Book(sequence, file) {
  this.id            = sequence;
  this.muuuid        = mu.uuid();
  this.headline      = `Book${sequence}`;
  this.uri           = `bks:book${sequence}`;
  this.numberOfPages = Math.floor(Math.random() * 1000);
  this.isbn          = Math.floor(Math.random() * 899999999) + 100000000;
  this.description   = mufile.generateRandomContent(50);
  this.file          = file;
}

Book.prototype.toTriples = function () {
  let triples = [
    `${this.uri} rdf:type          bks:Book .`,
    `${this.uri} mu:uuid           ${mu.sparqlEscapeString(this.muuuid)} .`,
    `${this.uri} sch:headline      ${mu.sparqlEscapeString(this.headline)} .`,
    `${this.uri} sch:abstract      ${mu.sparqlEscapeString(this.description)} .`,
    `${this.uri} sch:numberOfPages ${mu.sparqlEscapeInt(this.numberOfPages)} .`,
    `${this.uri} sch:isbn          ${mu.sparqlEscapeString(this.isbn.toString())} .`
  ];
  if (this.file) {
    triples.push(`${this.uri} sch:associatedMedia ${mu.sparqlEscapeString(this.file.vmuuuid)} .`);
    triples = triples.concat(this.file.toTriples()).flat();
  }
  return triples.map(t => t.replaceAll(/\s+/g, " "));
};

let counter = 0;

//Reset the numbering of the Books
function clear() {
  counter = 0;
}

//Make a number of random books
export function makeBooks(n, withFiles, fileSize) {
  console.log("Making books", n, withFiles, fileSize);
  let books = [];
  for (let i = counter; i < counter + n; i++) {
    let f;
    if (withFiles) {
      f = new mufile.MuFile(fileSize);
      f.save();
    }
    books.push(new Book(i, f));
  }
  counter += n;
  return books;
}

