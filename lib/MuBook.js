import * as mu     from "mu";
import * as mufile from "../lib/MuFile.js";
import * as au     from "../lib/MuAuthor.js";

export function MuBook(sequence, file, authorUri) {
  this.id               = sequence;
  this.muuuid           = mu.uuid();
  this.headline         = `Book${sequence}`;
  this.uri              = `bks:book${sequence}`;
  this.numberOfPages    = Math.floor(Math.random() * 1000);
  this.isbn             = Math.floor(Math.random() * 899999999) + 100000000;
  this.description      = mufile.generateRandomContent(50);
  this.file             = file;
  this.authors          = [];
  this.predefinedAuthor = (authorUri ? mu.sparqlEscapeUri(authorUri) : undefined);

  if (! this.predefinedAuthor) {
    let amountOfAuthors = sequence % 5 === 0 ? 3 : 1;
    console.log("AMOUNT OF AUTHORS = ", amountOfAuthors);
    for (let i = 0; i < amountOfAuthors; i++)
      this.authors.push(new au.MuAuthor());
  }
}

MuBook.prototype.toTriples = function () {
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
    triples.push(`${this.uri} sch:associatedMedia ${this.file.vuri} .`);
    //Add the triples of the file itself
    triples = triples.concat(this.file.toTriples()).flat();
  }
  //If author is predifined, add their uri to the triples
  if (this.predefinedAuthor)
    triples.push(`${this.uri} sch:author ${this.predefinedAuthor} .`);
  for (let auth of this.authors) {
    //Add a reference to the author
    triples.push(`${this.uri} sch:author ${auth.uri} .`);
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
export function makeBooks(n, withFiles, fileSize, authorUri) {
  console.log("Making books", n, withFiles, fileSize, authorUri);
  let books = [];
  for (let i = counter; i < counter + n; i++) {
    let f;
    if (withFiles) {
      f = new mufile.MuFile(fileSize);
      f.save();
    }
    books.push(new MuBook(i, f, authorUri));
  }
  counter += n;
  return books;
}

