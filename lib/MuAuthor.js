import * as mu   from "mu";
import * as conf from "../config.js";

let authorCounter = -1;

export function MuAuthor(uri, bookUris, sequence) {
  this.muuuid    = mu.uuid();
  this.firstName = `Author${sequence}`;
  this.lastName  = `Doe${sequence}`;
  this.bookUris  = bookUris || [];
  if (uri)
    if (uri.startsWith("http"))
      this.uri = mu.sparqlEscapeUri(uri);
    else
      this.uri = uri;
  else
    this.uri = `au:author${sequence}`;
}

MuAuthor.prototype.toTriples = function () {
  let triples = [
    `${this.uri} rdf:type       au:Author .`,
    `${this.uri} mu:uuid        ${mu.sparqlEscapeString(this.muuuid)} .`,
    `${this.uri} foaf:firstName ${mu.sparqlEscapeString(this.firstName)} .`,
    `${this.uri} foaf:lastName  ${mu.sparqlEscapeString(this.lastName)} .`
  ];
  if (this.bookUris)
    for (let uri of this.bookUris)
      triples.push(`${mu.sparqlEscapeUri(uri)} sch:author ${this.uri} .`);
  return triples.map(t => t.replaceAll(/\s+/g, " "));
};

export function clear() {
  authorCounter = 0;
}

export function makeAuthors(n, bookUri, authorUri) {
  let authors = [];
  for (let i = authorCounter; i < n + authorCounter; i++) {
    authors.push(new MuAuthor(authorUri, (bookUri ? [bookUri] : []), i));
  }
  authorCounter += n;
  return authors;
}

export function removeAuthorPattern(uri, relation, sudo) {
  const authorGraph = (sudo ? "?autorg" : mu.sparqlEscapeUri(conf.DEFAULT_GRAPH));
  const bookGraph   = (sudo ? "?authorf" : authorGraph);

  let bookpart = "";
  let refpart = "";
  
  switch (relation) {
    case "shallow":
      break;
    case "withreferences":
      refpart = `
        GRAPH ${bookGraph} {
          ?book sch:author ${mu.sparqlEscapeUri(uri)} .
        }`;
      break;
    case "withbooks":
      bookpart = `
        GRAPH ${bookGraph} {
          ?book sch:author ${mu.sparqlEscapeUri(uri)} .
          ?book ?q ?r .
        }`;
      break;
  }
  
  const queryString = `
    GRAPH ${authorGraph} {
      ${mu.sparqlEscapeUri(uri)} ?p ?o .
    }
    ${refpart}
    ${bookpart}`;

  return queryString;
}

export function getCounter() {
  return authorCounter;
}
export function setCounter(value) {
  authorCounter = value;
}

