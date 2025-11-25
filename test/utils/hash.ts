import { js2leo as js2leoCommon, LeoU128 } from '@doko-js/core';
import { leo2js as leo2jsCommon } from '@doko-js/core';

import { hash } from "aleo-hasher";

export const hashStruct = (struct: any): bigint => {
  const structString = js2leoCommon.json(struct)
  // console.log(structString);
  const structHash = hash("keccak256", structString, "field");
  const hashBigInt = leo2jsCommon.field(structHash);
  return hashBigInt
}

import { ethers } from "ethers";

export function messageToU64x4(msg: { sn: number; payload: bigint }): bigint[] {
  // Step 1: pack sn (1 byte) + payload (32 bytes)
  const snBytes = new Uint8Array([msg.sn]);
  const payloadBytes = ethers.toBeArray(msg.payload); // 32 bytes field

  // Create a 32-byte buffer
  const buf = new Uint8Array(32);
  buf.set(snBytes, 0);
  buf.set(payloadBytes, 1);

  // Step 2: Split into 4 chunks of 8 bytes
  const out: bigint[] = [];

  for (let i = 0; i < 4; i++) {
    const slice = buf.slice(i * 8, (i + 1) * 8);

    // Step 3: Convert 8 bytes → u64 (big-endian)
    const val = BigInt("0x" + Buffer.from(slice).toString("hex"));
    out.push(val);
  }

  return out;   // this is your [u64; 4]
}

