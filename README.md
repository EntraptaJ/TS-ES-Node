# TS-ES-Node

This is an experimental Node.JS ESModule loader hook to transpile TypeScript into ES on the fly during runtime into the VM

```
npm install
npm run try
```

This is only tested to work on Node v13.5.0. I will test other versions soon, likely setup proper automated testing.

## Plans

I want to cache the .ts file imports somewhat.
See if it is possible to get HMR working
Setup Jest Testing
Setup GitHub actions to publish to Github Package Registry along with automated testing.
