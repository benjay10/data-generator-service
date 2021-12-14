import * as mu from "mu";

let authorCounter = -1;

export function MuAuthor(uri, bookUris) {
  this.muuuid    = mu.uuid();
  this.firstName = `Author${authorCounter}`;
  this.lastName  = `Doe${authorCounter}`;
  this.bookUris  = bookUris || [];
  if (uri)
    if (uri.startsWith("http"))
      this.uri = mu.sparqlEscapeUri(uri);
    else
      this.uri = uri;
  else
    this.uri = `au:author${authorCounter}`;
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
  for (let i = 0; i < n; i++) {
    authors.push(new MuAuthor(authorUri, (bookUri ? [bookUri] : [])));
  }
  authorCounter += n;
  return authors;
}

export function removeAuthorPattern(uri, relation, sudo) {
  const authorGraph = (sudo ? mu.sparqlEscapeUri(conf.DEFAULT_GRAPH) : "?authorg");
  const bookGraph   = (sudo ? authorGraph : "?authorf");

  let bookpart = "";
  let refpart = "";
  
  switch (relation) {
    case "shallow":
      break;
    case "withreferences":
      refpart = `
        GRAPH ${bookGraph} {
          ?book sch:author ${uri} .
        }`;
      break;
    case "withbooks":
      bookpart = `
        GRAPH ${bookGraph} {
          ?book sch:author ${uri} .
          ?book ?q ?r .
        }`;
      break;
  }
  
  const queryString = `
    GRAPH ${authorGraph} {
      ${uri} ?p ?o .
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

