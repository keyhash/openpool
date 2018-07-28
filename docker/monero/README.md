Two Nodes Monero Testnet
------------------------

Addresses
---------

Node 1: 9wviCeWe2D8XS82k2ovp5EUYLzBt9pYNW2LXUFsZiv8S3Mt21FZ5qQaAroko1enzw3eGr9qC7X1D7Geoo2RrAotYPwq9Gm8
Node 2: 9wq792k9sxVZiLn66S3Qzv8QfmtcwkdXgM5cWGsXAPxoQeMQ79md51PLPCijvzk1iHbuHi91pws5B7iajTX9KTtJ4bh2tCh

RPC
---

- Daemon RPC 1 at port 28081
- Daemon RPC 2 at port 28081

- Wallet RPC 1 at port 28082, executed with --rpc-login monerorpc:rpcpassword
- Wallet RPC 2 at port 38082, executed with --rpc-login monerorpc:rpcpassword

Mining
------
Mining is disabled on both daemons.

Build & Run
-----------

Build:
```sh
make build-test-net
```

Run:
```sh
make test-net
```

The aforementioned RPC ports will be accessible from the host.

Sending funds from wallet 2
---------------------------

```sh
/usr/bin/monero-wallet-cli --testnet --wallet-file /data/wallet-2/wallet.bin
(password is empty)
transfer 9wviCeWe2D8XS82k2ovp5EUYLzBt9pYNW2LXUFsZiv8S3Mt21FZ5qQaAroko1enzw3eGr9qC7X1D7Geoo2RrAotYPwq9Gm8 0.34
```

For help: https://getmonero.org/knowledge-base/user-guides/monero-wallet-cli


Credits
-------

https://github.com/analogic/monero-private-testnet
https://github.com/coinfoundry/monero-private-testnet
