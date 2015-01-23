# beneb.info

Personal blog.

## develop

```sh
npm install && bower install
```

then:

```sh
npm run develop
```

runs a server on port `8082`, and watches for changes.

## generate a build

```sh
npm run compile
```

clean the build directory and generate a fresh copy.

## publishing to github pages

```sh
git subtree push --prefix build origin gh-pages
```
