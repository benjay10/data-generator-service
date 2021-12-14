import * as conf      from "../config.js";
import * as mu        from "mu";
import { updateSudo } from "@lblod/mu-auth-sudo";

export async function insert(triples, graph, sudo) {
  for (let start = 0; start < triples.length; start += conf.MAX_TRIPLES_PER_QUERY) {
    const batch = triples.slice(start, start + conf.MAX_TRIPLES_PER_QUERY);
    const queryString = makeInsertQuery(batch, graph);
    if (sudo)
      return updateSudo(queryString);
    else
      return mu.update(queryString);
  }
}

export async function remove(pattern, sudo) {
  const graph = (sudo ? mu.sparqlEscapeUri(conf.DEFAULT_GRAPH) : "?g");

  const queryString = `${conf.PREFIXES}
    DELETE {
      GRAPH ${graph} {
        ${pattern}
      }
    }
    WHERE {
      GRAPH ${graph} {
        ${pattern}
      }
    }`;
  
  if (sudo)
    return updateSudo(queryString);
  else
    return mu.update(queryString);
}

export function clearGraph(graph, sudo) {
  //const queryString = `CLEAR GRAPH ${mu.sparqlEscapeUri(graph)}`;
  const queryString = `
    DELETE { GRAPH ${mu.sparqlEscapeUri(graph)} { ?s ?p ?o . } }
    WHERE  { GRAPH ${mu.sparqlEscapeUri(graph)} { ?s ?p ?o . } }`;
  updateSudo(queryString);
}

function makeInsertQuery(triples, graph) {
  return `
    ${conf.PREFIXES}
    INSERT DATA {
      GRAPH ${mu.sparqlEscapeUri(graph)} {
        ${triples.join("\n")}
      }
    }
  `;
}

