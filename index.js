const Glue = require('glue')
const Ini = require('ini')
const Fs = require('fs')

const options = {
  relativeTo: __dirname
}

const settings = require('yargs')
  .default('config', './config.ini')
  .config('config', path => Ini.parse(Fs.readFileSync(path, 'utf-8')))
  .argv

bootstrap(require(`./manifest/pool`)(settings))
bootstrap(require(`./manifest/payments`)(settings))
bootstrap(require(`./manifest/front-end`)(settings))
bootstrap(require(`./manifest/back-end`)(settings))

async function bootstrap (manifest) {
  const worker = await Glue.compose(manifest, options)
  await worker.start()
}
