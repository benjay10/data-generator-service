import * as mu from "mu";

let authorCounter = 0;

export function MuAuthor() {
  this.muuuid    = mu.uuid();
  this.uri       = `bks:author${authorCounter}`;
  this.firstName = `Author${authorCounter}`;
  this.lastName  = `Doe${authorCounter}`;
  authorCounter++;
}

MuAuthor.prototype.toTriples = function () {
  let triples = [
    `${this.uri} rdf:type       bks:Author .`,
    `${this.uri} mu:uuid        ${mu.sparqlEscapeString(this.muuuid)} .`,
    `${this.uri} foaf:firstName ${mu.sparqlEscapeString(this.firstName)} .`,
    `${this.uri} foaf:lastName  ${mu.sparqlEscapeString(this.lastName)} .`
  ];
  return triples.map(t => t.replaceAll(/\s+/g, " "));
};

export function clear() {
  authorCounter = 0;
}

