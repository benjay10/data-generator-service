import * as mu     from "mu";
import * as conf   from "../config.js";
import FormData    from "form-data";
import fetch       from "node-fetch";
import { Headers } from 'node-fetch';

async function saveResource(resource, type) {

  console.log("Will be saving resource:", JSON.stringify(resource));

  const request = await fetch(conf.RESOURCE_HOST.concat(type), {
    method: "POST",
    body: JSON.stringify(resource),
    headers: { "Content-Type": "application/vnd.api+json" }
  });

  if (! request.ok)
    throw new Error(`A JSON:API request to the resources failed: ${request.status}: ${request.statusText}`);

  return await request.json();
}

async function addRelationships(sourceType, sourceUid, targetType, data) {
  //const url = `${conf.RESOURCE_HOST}${sourceType}/${sourceUid}/relationships/${targetType}`;
  const url = `${conf.RESOURCE_HOST}${sourceType}/${sourceUid}/links/${targetType}`;
  const request = await fetch(url, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/vnd.api+json" }
  });

  if (! request.ok)
    throw new Error(`A JSON:API request to update the relationships of resources failed: ${request.status}: ${request.statusText}`);

  //No actual json is returned with this type of request
  //return await request.json();
}

export async function saveBooks(books) {
  for (const book of books)
    await saveBook(book);
};

async function saveBook(book) {
  const bookResource = book.toResource();
  const authorResources = book.authors.map(a => a.toResource());

  //Save authors
  let authorResults = [];
  for (const author of authorResources) {
    const json = { data: author };
    authorResults.push(await saveResource(json, "authors"));
  }

  //Save file
  let fileResult;
  if (book.file)
    fileResult = await saveFile(book.file);

  //Get relationships data
  const authorResourcesShort = authorResults.map(a => {
    return { type: "authors", id: a.data.id };
  });
  const fileResourceShort = (fileResult ? { type: "file", id: fileResult.data.id } : []);

  const bookResource2 = {
    data: {
      ...bookResource,
      relationships: {
        authors: { data: authorResourcesShort },
        file: { data: fileResourceShort }
      }
    }
  };

  const bookResult = await saveResource(bookResource2, "books");

  //You could choose to add the relationship with the authors as a separate request with the following line, if you comment the relationships for authors in bookResoure2.
  //const authorRelationResult = await addRelationships("books", bookResult.data.id, "authors", { data: authorResourcesShort });

  return bookResult;
}

export async function saveAuthors(authors) {
  for (const author of authors)
    await saveAuthor(author);
}

async function saveAuthor(author) {
  return saveResource({ data: author.toResource() }, "authors");
}

export async function saveFiles(files) {
  for (const file of files)
    await saveFile(file);
}

async function saveFile(file) {
  const filecontent = file.getContent();

  //Use a form to append the file for upload
  let form = new FormData();
  form.append("file", Buffer.from(filecontent), {
    filename: file.filename,
    contentType: "text/plain"
  });

  //Creating some weird header the file service requires (for some reason)
  let headers = new Headers();
  headers.append("X-Rewrite-URL", "http://generator/");

  //Using fetch to send the form data with the file
  const fileResult = await fetch(conf.FILESERVICE_URL, { method: 'POST', body: form, headers });

  //Return the result data for further use
  return await fileResult.json();
}

