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

export async function getPuriForVuri(vuri) {
  const queryString = `${conf.PREFIXES}
    SELECT ?puri {
      GRAPH ?g {
        ${mu.sparqlEscapeUri(vuri)} nie:dataSource ?puri .
      }
    }`;
  const results = await querySudo(queryString);
  if (results.results.bindings.length > 0)
    return results.results.bindings[0].puri.value;
}

export async function getPuriForBookUri(bookUri) {
  const queryString = `${conf.PREFIXES}
    SELECT ?puri {
      ${mu.sparqlEscapeUri(bookUri)} sch:associatedMedia ?vuri .
      ?puri nie:dataSource ?vuri .
    }`;
  const results = await querySudo(queryString);
  if (results.results.bindings.length > 0)
    return results.results.bindings[0].puri.value;
}

export async function removeBatch(startBookRange, endBookRange, sudo) {
  const defGraph    = mu.sparqlEscapeUri(conf.DEFAULT_GRAPH);
  const bookGraph   = (sudo ? "?bookg"   : defGraph);
  const fileGraph   = (sudo ? "?fileg"   : defGraph);
  const authorGraph = (sudo ? "?authorg" : defGraph);
  const bookUris = [];
  for (let i = startBookRange; i < endBookRange; i++)
    bookUris.push(`bks:book${i}`);

  const queryString = `${conf.PREFIXES}
    DELETE {
      GRAPH ${bookGraph} {
        ?bookUri ?p ?o ;
                 sch:author ?authorUri .
        ?bookUri sch:associatedMedia ?fileUri .
      }
      GRAPH ${fileGraph} {
        ?fileUri ?q ?r .
        ?puri nie:dataSource ?fileUri .
        ?puri ?v ?w .
      }
      GRAPH ${authorGraph} {
        ?authorUri ?x ?y .
      }
    }
    WHERE {
      GRAPH ${bookGraph} {
        ?bookUri ?p ?o ;
                 sch:author ?authorUri .
        OPTIONAL { ?bookUri sch:associatedMedia ?fileUri . }
        VALUES ?bookUri {
          ${bookUris.join(" ")}
        }
      }
      GRAPH ${fileGraph} {
        OPTIONAL {
          ?fileUri ?q ?r .
          ?puri nie:dataSource ?fileUri .
          ?puri ?v ?w .
        }
      }
      GRAPH ${authorGraph} {
        ?authorUri ?x ?y .
      }
    }
  `;

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

