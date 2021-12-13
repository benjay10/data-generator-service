import * as mu     from "mu";
import * as mufile from "../lib/MuFile.js";
import * as au     from "../lib/MuAuthor.js";

export function Book(sequence, file) {
  this.id            = sequence;
  this.muuuid        = mu.uuid();
  this.headline      = `Book${sequence}`;
  this.uri           = `bks:book${sequence}`;
  this.numberOfPages = Math.floor(Math.random() * 1000);
  this.isbn          = Math.floor(Math.random() * 899999999) + 100000000;
  this.description   = mufile.generateRandomContent(50);
  this.file          = file;
  this.authors       = [];

  let amountOfAuthors = sequence % 5 === 0 ? 3 : 1;
  console.log("AMOUNT OF AUTHORS = ", amountOfAuthors);
  for (let i = 0; i < amountOfAuthors; i++)
    this.authors.push(new au.Author());
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
    //Add a reference to the virtual file
    triples.push(`${this.uri} sch:associatedMedia ${mu.sparqlEscapeString(this.file.vmuuuid)} .`);
    //Add the triples of the file itself
    triples = triples.concat(this.file.toTriples()).flat();
  }
  for (let auth of this.authors) {
    //Add a reference to the author
    triples.push(`${this.uri} sch:author ${mu.sparqlEscapeString(auth.muuuid)} .`);
    //Add the triples of the author
    triples = triples.concat(auth.toTriples());
  }
  
  return triples.map(t => t.replaceAll(/\s+/g, " "));
};

let counter = 0;

//Reset the numbering of the Books
export function clear() {
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

