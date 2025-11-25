import { Address } from "@provablehq/sdk";
import { getBytes } from "ethers";
import { ALEO_ZERO_ADDRESS } from "./testnet.data";
import { ethers } from 'ethers';
/**
 * Convert any blockchain address to a fixed [u8; 32] number array.
 * Right-aligned, zero-padded if needed.
 */

export function any2AleoArr(address: string) {
  let bytes: number[];
  const clean = address.trim();

  // 👉 If hex (EVM)
  if (clean.startsWith("0x")) {
    const safe = safeHex(clean); // fix odd-length hex
    bytes = Array.from(getBytes(safe));
  } else {
    // 👉 Aleo Bech32
    console.log("Bech32 decode:");
    const leoaddress = Address.from_string(address);
    bytes = Array.from(leoaddress.toBytesLe());
  }

  // 👉 pad to 32 bytes
  const padded = new Uint8Array(32);
  const start = 32 - Math.min(32, bytes.length);
  padded.set(bytes.slice(-32), start);

  return Array.from(padded);
}

function safeHex(hex: string) {
  hex = hex.toLowerCase();
  if (hex.startsWith("0x")) hex = hex.slice(2);
  if (hex.length % 2 === 1) hex = "0" + hex;
  return "0x" + hex;
}

// console.log(any2AleoArr("aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px"));
// console.log(any2AleoArr("0x17897c00b80a7fbbcc208d051ce894aa37c364ff9"));

export function aleoPaddedTo33(address: string) {
  const leoaddress = Address.from_string(address);
  let bytes = Array.from(leoaddress.toBytesLe() as number[]);
  
  const padded = new Uint8Array(33);
  const start = 33 - Math.min(33, bytes.length);
  padded.set(bytes.slice(-32), start);

  return Array.from(padded);
}
// console.log(aleoPaddedTo33(ALEO_ZERO_ADDRESS));


export function ethPaddedTo33(address: string) {
   const publicKeyBytes = ethers.getBytes(address);
  console.log(publicKeyBytes);
  
  const padded = new Uint8Array(33);
  const start = 33 - Math.min(33, publicKeyBytes.length);
  padded.set(publicKeyBytes.slice(-32), start);

  return Array.from(padded);
}

// console.log(ethPaddedTo33("0x1787c00b80a7fbbcc208d051ce894aa37c364ff9"));


export function stringto65(signature: string) {
const u8 = new Uint8Array(65);                 // create fixed-length 65-byte array
  const bytes = Buffer.from(signature, "ascii");       // convert ASCII to bytes
  u8.set(bytes.subarray(0, 65));                // copy first 65 bytes (truncate if longer)
  return Array.from(u8); 
}

// console.log(stringto65("sign1rwru9lzjajtalhhtajk6mlrdg46ma3cjw6hja4acu7ttasgfzqp5dnz56p58g3sm0l434c3gf7hynwysm3gprp3cs8efayr56g6wcqur22qjwn4zc0pzv87twjygsz9m7ekljmuw4jpzf68rwuq99r0tp735vs6220q7tp60nr7llkwstcvu49wdhydx5x2s3sftjsk"));

export function aleoZeroAdressSignature(address: string) {
  const leoaddress = Address.from_string(address);
  let bytes = Array.from(leoaddress.toBytesLe() as number[]);
  
  const padded = new Uint8Array(65);
  const start = 33 - Math.min(65, bytes.length);
  padded.set(bytes.slice(-62), start);

  return Array.from(padded);
}