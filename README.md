# ECDSA — Local Testing Guide

This README explains how to set up a local Aleo devnet with `snarkOS` and run ecdsa tests using `dokojs`. It assumes you are on macOS or Linux.

## 1) Install Leo CLI

Build Leo from source:

```bash
git clone https://github.com/ProvableHQ/leo.git
cd leo
git checkout v3.3.1
cargo install --path .
```

---

## 2) Install `snarkOS`

Clone the staging branch and install:

```bash
git clone https://github.com/ProvableHQ/snarkOS.git
cd snarkOS
git checkout v4.3.1

# Optional helper for Ubuntu users
./build_ubuntu.sh

# Install the snarkos binary
cargo install --path=. --features test_network
```

---

## 3) Install `dokojs` from source

```bash
# In any workspace directory outside verulend, and this is the fork that contains fixes for latest changes in leo and snarkos
git clone https://github.com/Sandip801/doko-js.git --branch verulink/testing --single-branch
cd doko-js

# Install workspace deps
pnpm install

# Build the monorepo and install the CLI
npm run build
npm run install:cli
```

### Link local packages for development

From the `doko-js` repo, link the two packages Verulend uses:

```bash
# Link @doko-js/core
cd packages/core
yarn link

# Link @doko-js/wasm
cd ../wasm
yarn link

# Link @doko-js/cli
cd ../cli
yarn link
```

---

## 4) Prepare ECDSA and wire up the links

Clone sample ecdsa and attach the local links:

```bash
# Clone your ecdsa test repo
git clone https://github.com/Prabinbaral77/LEO-ECDSA.git

# Install ecdsa test deps
npm install
# Link dokojs packages into Verulend
yarn link @doko-js/core
yarn link @doko-js/wasm
yarn link @doko-js/cli


```

> The linking makes ecdsa use the locally built `@doko-js/core`, `@doko-js/wasm` and `@doko-js/cli`.

---

## 5) Start a local Aleo devnet with `snarkOS`

From your `snarkOS` checkout:

Go to snarkOS folder:
run``` ./scripts/devnet.sh```

This script initializes a local devnet for testing. Keep this running in its own terminal and only start testing after 20 blocks to ensure we are on consensus v11.

---

## 6) Compile Ecdsa test contracts with `dokojs`


```bash
# Generate artifacts (Leo and TS types) for programs
dokojs compile
```

`dokojs compile` produces the `artifacts` structure used by tests. See the dokojs README for the compile step. ([GitHub][4])

---

## 7) Run tests

Use Jest with `--runInBand` so tests run serially against the local node:


```bash
# Example: run a single test file
npm run test -- --runInBand ./test/connection.test.ts
```
---

## 8) Can we pass msg like below direcly to ECDSA
``` 
struct Message {
        src_chain_id: u128,
        src_address: [u8; 32],
        conn_sn: field,
        dst_chain_id: u128,
        dst_address: [u8; 32],
        payload: field
}
ECDSA::verify_keccak256(signature, signers, message);
```
If not what might be the other possiblility to send message to ECDSA::verify_keccak256
or can we send like this as well ?
```
let message_hash: field = Keccak256::hash_to_field(message);
let yay1: bool = ECDSA::verify_keccak256(signs.signature_1, signers.signer_1, message_hash);