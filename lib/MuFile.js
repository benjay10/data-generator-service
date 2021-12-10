import * as conf  from "../config.js";
import * as mu    from "mu";
import fs         from "fs";
import { Buffer } from "buffer";

export function MuFile(size) {
  this.sizeIndicator = size;
  this.vmuuuid       = mu.uuid();
  this.pmuuuid       = mu.uuid();
  this.vuri          = conf.FILE_PREFIX.concat(this.vmuuuid);
  this.puri          = "share://".concat(this.pmuuuid);
  this.filename      = generateRandomContent(3);
  this.format        = "text/plain";
  this.content       = "placeholder"; //generateRandomContentOnSize(size);  //generate on the spot later
  this.size          = 123;           //Buffer.from(this.content).byteLength; //calculate when saving file
  this.extension     = "txt";
  this.created       = new Date();
}

MuFile.prototype.toTriples = function () {
  const triples = [
    `${mu.sparqlEscapeUri(this.vuri)} rdf:type          nfo:FileDataObject .`,
    `${mu.sparqlEscapeUri(this.vuri)} mu:muuuid         ${mu.sparqlEscapeString(this.vmuuuid)} .`,
    `${mu.sparqlEscapeUri(this.vuri)} nfo:fileName      ${mu.sparqlEscapeString(this.filename)} .`,
    `${mu.sparqlEscapeUri(this.vuri)} dct:format        ${mu.sparqlEscapeString(this.format)} .`,
    `${mu.sparqlEscapeUri(this.vuri)} nfo:fileSize      ${mu.sparqlEscapeInt(this.size)} .`,
    `${mu.sparqlEscapeUri(this.vuri)} dbp:fileExtension ${mu.sparqlEscapeString(this.extension)} .`,
    `${mu.sparqlEscapeUri(this.vuri)} dct:created       ${mu.sparqlEscapeDateTime(this.created)} .`,
    `${mu.sparqlEscapeUri(this.puri)} rdf:type          nfo:FileDataObject .`,
    `${mu.sparqlEscapeUri(this.puri)} mu:muuuid         ${mu.sparqlEscapeString(this.pmuuuid)} .`,
    `${mu.sparqlEscapeUri(this.puri)} nfo:fileName      ${mu.sparqlEscapeString(this.filename)} .`,
    `${mu.sparqlEscapeUri(this.puri)} dct:format        ${mu.sparqlEscapeString(this.format)} .`,
    `${mu.sparqlEscapeUri(this.puri)} nfo:fileSize      ${mu.sparqlEscapeInt(this.size)} .`,
    `${mu.sparqlEscapeUri(this.puri)} dbp:fileExtension ${mu.sparqlEscapeString(this.extension)} .`,
    `${mu.sparqlEscapeUri(this.puri)} dct:created       ${mu.sparqlEscapeDateTime(this.created)} .`,
    `${mu.sparqlEscapeUri(this.puri)} nie:dataSource    ${mu.sparqlEscapeUri(this.vuri)} .`
  ];
  return triples.map(t => t.replaceAll(/\s+/g, " "));
};

MuFile.prototype.save = async function () {
  console.log("SAVING A FILE ", conf.SHARE_PATH.concat(this.pmuuuid));
  const buff = generateRandomContentOnSize(this.sizeIndicator);
  this.size = Buffer.from(buff).byteLength;
  return fs.writeFileSync(conf.SHARE_PATH.concat(this.pmuuuid), buff);
};

export function generateRandomContent(nwords) {
  let word, wordlength, content;
  content        = [];
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.;,?";
  let charlength = characters.length;
  
  for (let i = 0; i < nwords; i++) {
    wordlength = Math.random() * 20;
    word       = [];
    for (let j = 0; j < wordlength; j++) {
      word.push(characters.charAt(Math.floor(Math.random() * charlength)));
    }
    content.push(word.join(""));
  }
    
  return content.join(" ");
}

export function generateRandomContentOnSize(size) {
  let words;
  switch (size) {
    case "small":
      words = 30;
      break;
    case "medium":
      words = 100000;
      break;
    case "large":
      words = 1000000;
      break;
    case "extra":
      words = 10000000;
      break;
    default:
      words = 30;
      break;
  }
  return generateRandomContent(words);
}

