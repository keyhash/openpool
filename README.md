OpenPool
========

Open pool is a mining pool.

Installation
------------

### Hardware requirements

 * 2 CPU cores
 * AES-NI compatible processor
 * 4GB RAM
 * 100GB of disk space

Frequently asked questions
--------------------------

 * [Why does the pool crash when a job is submitted?](#why-does-the-pool-crash-when-a-job-is-submitted)
 * [How does the pool work?](#how-does-the-pool-work)
 * [How can I check if my CPU has AES-NI instructions?](#how-can-i-check-if-my-cpu-has-aes-ni-instructions)

 

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
