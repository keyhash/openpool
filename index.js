const Glue = require('glue')
const Ini = require('ini')
const Fs = require('fs')

const options = {
  relativeTo: __dirname
}

const settings = require('yargs')
  .default('config', './config.ini')
  .alias('config', 'c')
  .config('config', path => Ini.parse(Fs.readFileSync(path, 'utf-8')))
  .argv

;[
  `./manifest/pool`,
  `./manifest/payments`,
  `./manifest/front-end`,
  `./manifest/back-end`
].map(async manifest => {
  await bootstrap(require(manifest)(settings))
})

async function bootstrap (manifest) {
  const worker = await Glue.compose(manifest, options)
  await worker.start()
}
