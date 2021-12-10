import * as mu   from "mu";
import * as file from "../lib/MuFile.js";

export function Book(sequence, createAuthor = false) {
  this.id            = sequence;
  this.muuuid        = mu.uuid();
  this.headline      = `Book${sequence}`;
  this.uri           = `bks:book${sequence}`;
  this.numberOfPages = Math.floor(Math.random() * 1000);
  this.isbn          = Math.floor(Math.random() * 899999999) + 100000000;
  this.description   = file.generateRandomContent(50);
  
  //if (createAuthor) {
  //  this.author = new MuAuthor();
  //}
}

Book.prototype.toTriples = function () {
  const triples = [
    `${this.uri} rdf:type          bks:Book .`,
    `${this.uri} mu:uuid           ${mu.sparqlEscapeString(this.muuuid)} .`,
    `${this.uri} sch:headline      ${mu.sparqlEscapeString(this.headline)} .`,
    `${this.uri} sch:abstract      ${mu.sparqlEscapeString(this.description)} .`,
    `${this.uri} sch:numberOfPages ${mu.sparqlEscapeInt(this.numberOfPages)} .`,
    `${this.uri} sch:isbn          ${mu.sparqlEscapeString(this.isbn.toString())} .`
  ];
  return triples.map(t => t.replaceAll(/\s+/g, " "));
}

let counter = 0;

//Reset the numbering of the Books
function clear() {
  counter = 0;
}

//Make a number of random books
export function makeBooks(n) {
  let books = [];
  for (let i = counter; i < counter + n; i++) {
    books.push(new Book(i));
  }
  counter += n;
  return books;
}

