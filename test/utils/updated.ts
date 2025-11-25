import { js2leo as js2leoCommon, leo2js as leo2jsCommon } from '@doko-js/core';
import { ethers } from 'ethers';
import { Message } from '../../artifacts/js/types/connection';
import { getMessageLeo } from '../../artifacts/js/js2leo/connection';

// function bigIntToBytes32LE(value: bigint): Uint8Array {
//   const bytes = new Uint8Array(32);
//   let temp = value;
  
//   for (let i = 0; i < 32; i++) {
//     bytes[i] = Number(temp & 0xFFn);
//     temp >>= 8n;
//   }
  
//   return bytes;
// }


function bigIntToBytes32LE(value: bigint): Uint8Array {
  let temp = BigInt(value);        // BigInt OK
  const out = new Uint8Array(32);

  const MASK = BigInt("255");      // instead of 0xFFn
  const ZERO = BigInt("0");

  for (let i = 31; i >= 0; i--) {
    out[i] = Number(temp & MASK);
    temp = temp >> BigInt("8");
  }

  return out;
}


function serializeMessageToBytes(message: Message): Uint8Array {
  const leoMessage = getMessageLeo(message);
  
  console.log('Leo Message:', leoMessage);
  
  // struct Message { sn: u8, payload: field }
  // Total: 1 byte + 32 bytes = 33 bytes
  const buffer = new ArrayBuffer(33);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  // Parse and write sn (u8 - 1 byte)
  const sn = leo2jsCommon.u8(leoMessage.sn);
  view.setUint8(0, sn);
  
  // Parse and write payload (field - 32 bytes)
  const payload = leo2jsCommon.field(leoMessage.payload);
  const payloadBytes = bigIntToBytes32LE(BigInt(payload));
  bytes.set(payloadBytes, 1);
  
  console.log('SN:', sn);
  console.log('Payload:', payload);
  console.log('Serialized bytes length:', bytes.length);
  console.log('Serialized bytes:', Array.from(bytes));
  console.log('Serialized hex:', Buffer.from(bytes).toString('hex'));
  
  return bytes;
}

function serializeU32ToBytes(value: number): Uint8Array {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, true); // true = little-endian
  return new Uint8Array(buffer);
}

export const signMessageu = async (
  message: number,
  screening_passed: boolean,
  privateKey: string
): Promise<{
  signature: number[];
  publicKey: number[];
  messageHash: string;
}> => {
  // Ensure private key has 0x prefix
  const formattedPrivateKey = privateKey.startsWith('0x') 
    ? privateKey 
    : `0x${privateKey}`;
  
  // Create wallet
  const wallet = new ethers.Wallet(formattedPrivateKey);
  
  // Serialize message to bytes
  const messageBytes = serializeU32ToBytes(message);
  
  console.log('Message bytes for hashing:', Array.from(messageBytes));
  
  // Hash with Keccak256
  const messageHash = ethers.keccak256(messageBytes);
  console.log('Message hash:', messageHash);
  
  // Sign the hash
  const signatureString = await wallet.signMessage(ethers.getBytes(messageHash));
  
  // Parse signature
  const sig = ethers.Signature.from(signatureString);
  
  // Create 65-byte signature (r, s, v)
  const signatureBytes = new Uint8Array(65);
  signatureBytes.set(ethers.getBytes(sig.r), 0);   // r: 32 bytes
  signatureBytes.set(ethers.getBytes(sig.s), 32);  // s: 32 bytes
  signatureBytes[64] = sig.v - 27;                  // v: 1 byte (recovery id)
  
  console.log('Signature:', Array.from(signatureBytes));
  
  // Get compressed public key (33 bytes)
  const publicKeyBytes = ethers.getBytes(wallet.signingKey.compressedPublicKey);
  console.log('Public key:', Array.from(publicKeyBytes));
  
  return {
    signature: Array.from(signatureBytes),
    publicKey: Array.from(publicKeyBytes),
    messageHash
  };
};

// Hash function
export const hashStruct = (message: Message): string => {
  const messageBytes = serializeMessageToBytes(message);
  const hash = ethers.keccak256(messageBytes);
  return hash;
};