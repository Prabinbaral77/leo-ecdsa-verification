
import { ethers } from 'ethers';
import { Message } from '../../artifacts/js/types/connection';
import { getMessageLeo } from '../../artifacts/js/js2leo/connection';
import { js2leo as js2leoCommon, LeoU128 } from '@doko-js/core';
import { leo2js as leo2jsCommon } from '@doko-js/core';

function serializeMessageToBytes(message: Message): Uint8Array {
  // Implement your serialization logic
  // Example:
  const msg = getMessageLeo(message)
  console.log(msg.sn, "---------------", message);
  
  const snBytes = new Uint8Array([message.sn]);
  const payloadBytes = ethers.toBeArray(message.payload);
  
  const combined = new Uint8Array(snBytes.length + payloadBytes.length);
  combined.set(snBytes, 0);
  combined.set(payloadBytes, snBytes.length);
  
  return combined;
}


export function signMessageECDSA(
  message: Message,
  screening_passed: boolean,
  privateKey: string
): number[] {
  const wallet = new ethers.Wallet(privateKey);
  const messageBytes = serializeMessageToBytes(message);
  const messageHash = ethers.keccak256(messageBytes);
  const messageHashBytes = ethers.getBytes(messageHash);
  const signature = wallet.signingKey.sign(messageHashBytes);
  
  const r = ethers.getBytes(signature.r);
  const s = ethers.getBytes(signature.s);
  const v = signature.v;
  
  return [...Array.from(r), ...Array.from(s), v];
}

// export function aleoSignMessageECDSA(
//   message: Message,
//   privateKey: string
// ): number[] {
  
//   // Create wallet from private key
//   const wallet = new ethers.Wallet(privateKey);
  
//   // Serialize message to bytes
//   const messageBytes = serializeMessageToBytes(message);
  
//   // Hash with Keccak256 (Leo will do the same during verification)
//   const messageHash = ethers.keccak256(messageBytes);
  
//   // Sign the hash
//   const messageHashBytes = ethers.getBytes(messageHash);
//   const signature = wallet.signingKey.sign(messageHashBytes);
  
//   // Convert to [u8; 65] format: r (32) + s (32) + v (1)
//   const r = ethers.getBytes(signature.r);
//   const s = ethers.getBytes(signature.s);
//   const v = signature.v;
  
//   // Validate lengths
//   if (r.length !== 32 || s.length !== 32) {
//     throw new Error(`Invalid signature component lengths: r=${r.length}, s=${s.length}`);
//   }
  
//   const evmSignature = [
//     ...Array.from(r),
//     ...Array.from(s),
//     v
//   ];
  
//   if (evmSignature.length !== 65) {
//     throw new Error(`Invalid signature length: ${evmSignature.length}`);
//   }
  
//   return evmSignature;
// }

function serializeMessage(message: Message): Uint8Array {
  const buffer = new ArrayBuffer(24); // 8 bytes (u64) + 16 bytes (u128)
  const view = new DataView(buffer);
  
  // Write sn as u64 (little-endian)
  view.setBigUint64(0, BigInt(message.sn), true);
  
  // Write payload as u128 (little-endian) - split into two u64s
  const payloadLow = message.payload & BigInt('0xFFFFFFFFFFFFFFFF');
  const payloadHigh = message.payload >> BigInt(64);
  view.setBigUint64(8, payloadLow, true);
  view.setBigUint64(16, payloadHigh, true);
  
  return new Uint8Array(buffer);
}

export async function createSignature(
  message: Message,
  privateKey: string
): Promise<{ signature: Uint8Array, signer: Uint8Array }> {
  const wallet = new ethers.Wallet(privateKey);
  
  // Serialize the message
  const messageBytes = serializeMessage(message);
  
  // Hash with Keccak256
  const messageHash = ethers.keccak256(messageBytes);
  
  // Sign the hash
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  
  // Parse signature into r, s, v format (65 bytes total)
  const sig = ethers.Signature.from(signature);
  const signatureBytes = new Uint8Array(65);
  
  // r (32 bytes)
  signatureBytes.set(ethers.getBytes(sig.r), 0);
  // s (32 bytes)
  signatureBytes.set(ethers.getBytes(sig.s), 32);
  // v (1 byte) - Recovery ID
  signatureBytes[64] = sig.v - 27; // Convert to 0 or 1
  
  // Get compressed public key (33 bytes)
  const publicKey = wallet.signingKey.compressedPublicKey;
  const publicKeyBytes = ethers.getBytes(publicKey);
  
  return {
    signature: signatureBytes,
    signer: publicKeyBytes
  };
}