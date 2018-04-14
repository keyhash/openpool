const Glue = require('glue')
const Ini = require('ini')
const Fs = require('fs')

const options = {
  relativeTo: __dirname
}

const settings = Ini.parse(Fs.readFileSync('./config.ini', 'utf-8'))

bootstrap(require(`./manifest/pool`)(settings))
bootstrap(require(`./manifest/payments`)(settings))

async function bootstrap (manifest) {
  const worker = await Glue.compose(manifest, options)
  await worker.start()
}
