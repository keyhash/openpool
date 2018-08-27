OpenPool
========

Open pool is a mining pool.

Roadmap
-------
 - [x] handle anonymous miner connections
 - [x] support multiple difficulties
 - [x] validate shares & process payments
 - [x] architecture ready for multiple coin support
 - [x] ban of undesirable miners
 - [x] trusted miners
 - [x] improve configuration, remove constants and make them configurable
 - [ ] better usage of multi-core systems
 - [ ] api
 - [ ] web with statistics
 - [ ] ansible deployment script
 - [ ] debian packaging

Installation
------------

### Hardware requirements

 * 2 CPU cores
 * AES-NI compatible processor
 * 4GB RAM
 * 100GB of disk space


Development
-----------

### Requirements
 * docker and docker-compose
 * node and npm

```
npm install
docker-compose up
```

Pool architecture
-----------------

 * pool - handles and interacts with the miners
 * payments - pays the miners when blocks are found

Frequently asked questions
--------------------------

 * [Why does the pool crash when a job is submitted?](#why-does-the-pool-crash-when-a-job-is-submitted)
 * [How does the pool work?](#how-does-the-pool-work)
 * [How can I check if my CPU has AES-NI instructions?](#how-can-i-check-if-my-cpu-has-aes-ni-instructions)
 * [How to enable the logger?](#how-to-enable-the-logger)
 * [What is PPLNS?](#what-is-pplns)
 * [What is PPS?](#what-is-pps)

### Why does the pool crash when a job is submitted?

Your processor probably does not have AES-NI instructions. This pool requires a processor with AES-NI instructions.

### How can I check if my CPU has AES-NI instructions?

If the following command returns `aes` then your CPU is compatible. An empty result indicates that your CPU is not supported.

`grep -o 'aes' /proc/cpuinfo | uniq`

### How does the pool work?

1. The pool requests a block template from the coin daemon.
2. The pool injects an unique extra nonce in the block template and computes the transaction Merkle tree.
3. The pool builds a blockhashing_blob based on the block template. The blockhashing_blob is sent to the  miners.
4. The miners attempt to find the nonce returned by the miner.
5. The pool builds the block using the block template and the nonce.
6. The block is submitted to the daemon.

### How to enable the logger?

Ensure that you set the environment variable `DEBUG="*" node index.js`

You can also enable specific logger, replace `*` with the name of the logger you are interested in.

### What is PPLNS?

PPLNS is short for “Pay Per Last N Shares”.

When using this payment model we no longer consider valid shares of one round, but we consider a number N of shares, no matter if they’re apart of the round or not.

Payments are only processed when a block is found.

This means that you continue receiving payments even after you stop mining.

### What is PPS?

PPS is also known as "Pay Per Share".

It is a more direct method where you get a standard payout rate for each share completed.

Shares are paid no matter if a block was found.

This pool does not support PPS yet.
