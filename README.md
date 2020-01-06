# TS-ES-Node

This is an experimental Node.JS ESModule loader hook to transpile TypeScript into ESNext during module resolution

```
npm install
npm run try
```

This is only tested to work on Node v13.5.0. I will test other versions soon, likely setup proper automated testing.

## Usage in Projects

This is is only useful if your using ESNext modules in TypeScript and emitting as ESNext, and are using "type": "module" in your `package.json` if not then you likely want (ts-node)[https://github.com/TypeStrong/ts-node]

I have a package published to the NPM GitHub Package registry. [NPM Install Instructions](https://help.github.com/en/github/managing-packages-with-github-packages/configuring-npm-for-use-with-github-packages#installing-packages-from-other-organizations)

First you'll need to get my package

```
npm install -D @kristianfjones/ts-es-node
```

To use this to run your TypeScript ESNext Modules in Node.JS without having to compile first setup a NPM script similar to this

```JSON
  "scripts": {
    "dev": "node --experimental-loader @kristianfjones/ts-es-node  --es-module-specifier-resolution=node --experimental-modules  --experimental-vm-modules src/index.ts"
  }
```

## Plans

I want to cache the .ts file imports somewhat.

See if it is possible to get HMR working

Setup Jest Testing

Setup GitHub actions to publish to Github Package Registry along with automated testing.
