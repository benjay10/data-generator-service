# data-generator-service

This is a service that can generate semi-random data to test some basic capabilities of data related services. E.g. testing throughput, testing if data ends up in the correct places, testing synchronisation correctness with or without files, ...

## Get started

This services uses the mu-javascript template. Run it directly in a Docker setup mounting the source code folder containing the `app.js` to the `/app` folder of the mu-javascript template, or use the dockerfile to build your own image.

Also mount a storage folder for files on the path `/share`.

## Configuration

This service aims to provide sensible defaults and given that this service only produces throw-away data, you probably don't want to spend time configuring things. Some configuration can be set in the `config.js` file, if needed.

## API

This section explains the API details of this service. Options are given as URL query parameters, not as POST data: e.g. the first POST request below could be written as `http://<host>/generate?batches=5&items-per-batch=100&pause-per-batch=1000&...`.

### POST /generate

Query parameter   | Values | Explanation
------------------|--------|------------
`batches`         | Integer, default: 5 | Number of batches (groups of data) to insert at the "same time" (aka as fast as possible).
`items-per-batch` | Integer, default: 10 | How many conceptual individuals to insert per batch. These individuals are books with some properties, and with related files and authors.
`pause-per-batch` | Integer, default: 100 (in ms) | The time to pause between batches, in ms. 0 means no pause, but still separate batches.
`target-graph`    | URL encoded (or not) URI, default: `http%3A%2F%2Fmu.semte.ch%2Fgraphs%2Fapplication` | Graph in wich to insert the data. Supplying no graph is without mu-auth-sudo, but supplying a graph always uses mu-auth-sudo, because you want to bypass the graph dispatching mechanism.
`with-files`      | `true`, `false`, default: `false` | Set to true if you also want a file associated per individual and stored to the mounted volume.
`file-size`       | `small`, `medium`, `large`, `extra`, default: `small` | The approximate filesize of the associated files, ranging from a couple of bytes to 100MB.

### POST /create-books

Query parameter | Values | Explanation
----------------|--------|------------
`items`         | Integer, default: `10` | Amount of books you want for this batch.
`target-graph`  | URL encoded URI (or not), default: `http%3A%2F%2Fmu.semte.ch%2Fgraphs%2Fapplication` | URL encoded graph in wich to insert the data. Supplying no graph is without mu-auth-sudo, but supplying a graph always uses mu-auth-sudo, because you want to bypass the graph dispatching mechanism.
`with-files`    | `true`, `false`, default `false` | Set to true if you also want a file associated per individual and stored to the mounted volume.
`file-size`     | `small`, `medium`, `large`, `extra`, default: `small` | The approximate filesize of the associated files, ranging from a couple of bytes to 100MB.
`author-uri`    | e.g. `http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fauthor1%2F` | OPTIONAL. Author URI that you want to create books for. Without URI, create new books with new authors.

### POST /create-book-resources

Use mu-cl-resources to create books instead of direct queries. This limits some capabilities and books are created one at a time. Creating books like this will take a lot more time than with queries.

Query parameter | Values | Explanation
----------------|--------|------------
`items`         | Integer, default: `10` | Amount of books you want for this batch.
`with-files`    | `true`, `false`, default `false` | Set to true if you also want a file associated per individual and stored to the mounted volume.
`file-size`     | `small`, `medium`, `large`, `extra`, default: `small` | The approximate filesize of the associated files, ranging from a couple of bytes to 100MB.

### POST /create-author

Query parameter | Values | Explanation
----------------|--------|------------
`book-uri`      | URL encoded (or not) URI | URI of the book to create some new authors for. E.g. `http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fbook123%2F`. Do not use together with `author-uri`. A number of authors will be added to this book.
`author-uri`    | URL encoded (or not) URI | URI of the author to be created, and some info to be added that was missing of previously deleted (with `shallow`). E.g. `http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fauthor1%2F`. Do not use together with `book-uri` and not with `items`, as those are impossible combinations.
`items`         | Integer, default: 1 | Amount of authors to create.
`target-graph`  | URL encoded URI (or not), default: `http%3A%2F%2Fmu.semte.ch%2Fgraphs%2Fapplication` | URL encoded graph in wich to insert the data. Supplying no graph is without mu-auth-sudo, but supplying a graph always uses mu-auth-sudo, because you want to bypass the graph dispatching mechanism.

### POST /create-author-resources

Create authors using mu-cl-resources.

Query parameter | Values | Explanation
----------------|--------|------------
`items`         | Integer, default: 1 | Amount of authors to create.

### POST /create-files

Query parameter | Values | Explanation
----------------|--------|------------
`items`         | Integer, default: 10 | Amount of random files to generate.
`file-size`     | `small`, `medium`, `large`, `extra`, default: `small` | The approximate filesize of the associated files, ranging from a couple of bytes to 100MB.

### POST /create-file-resources

Create files using a file service.

Query parameter | Values | Explanation
----------------|--------|------------
`items`         | Integer, default: 10 | Amount of random files to generate.
`file-size`     | `small`, `medium`, `large`, `extra`, default: `small` | The approximate filesize of the associated files, ranging from a couple of bytes to 100MB.

### DELETE /batch

Query parameter | Values | Explanation
----------------|--------|------------
`uri`           | URL encoded (or not) URI | URI of the batch to remove.

### DELETE /book

Query parameter | Values | Explanation
----------------|--------|------------
`uri`           | URL encoded (or not) URI | URI of the specific book to remove
`relation`      | `shallow`, `withfile`, default: `shallow` | The level of things to delete. `shallow` only removes the book and leaves the file and authors in the database. `withfile` also removes the files.

### DELETE /book-resource

Query parameter | Values | Explanation
----------------|--------|------------
`uuid`          | UUID   | UUID of the specific book to remove
`relation`      | `shallow`, `withfile`, default: `shallow` | The level of things to delete. `shallow` only removes the book and leaves the file and authors in the database. `withfile` also removes the files.

### DELETE /file

Query parameter | Values | Explanation
----------------|--------|------------
`uri`           | URL encoded (or not) URI | URI of the specific book to remove
| URI of the specific file to remove. Use the virtual file URI that is also referenced by the book.
`relation`      | `shallow`, `withreference`, default: `shallow` | The level of things to delete. `shallow` only removes the file and leaves everything else. `withreference` also removes the reference on the book.

### DELETE /author

Query parameter | Values | Explanation
----------------|--------|------------
`uri`           | URL encoded (or not) URI | URI of the specific author to remove. E.g. `http%3A%2F%2Fmu.semte.ch%2Fbookstore%2Fauthor1%2F`
`relation`      | `shallow`, `withreferences`, `withbooks`, default: `shallow` | The level of things to delete. `shallow` only removes the author and leaves their books. `withreferences` also removes the reference to the author from the books. `withbooks` also removes the books associated with this author.
`sudo`          | `true`, `false`, default: `false` | Set to true to use mu-auth-sudo.

### DELETE /author-resource

Delete an author using mu-cl-resources.

Query parameter | Values | Explanation
----------------|--------|------------
`author-uuid`   | UUID   | UUID of the specific author to remove. E.g. `61C1D74433AEF3DAC9EBDB7B`
`relation`      | `shallow`, `withreferences`, `withbooks`, default: `shallow` | The level of things to delete. `shallow` only removes the author and leaves their books. `withreferences` also removes the reference to the author from the books. `withbooks` also removes the books associated with this author.

### DELETE /graph

Query parameter | Values | Explanation
----------------|--------|------------
`uri`           | URL encoded (or not) URI | URI of the graph to be cleared. E.g. `http%3A%2F%2Fmu.semte.ch%2graphs%2Fapplication`

