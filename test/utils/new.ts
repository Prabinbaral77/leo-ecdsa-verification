import { js2leo as js2leoCommon, leo2js, leo2js as leo2jsCommon } from '@doko-js/core';
import { ethers } from 'ethers';
import { Message } from '../../artifacts/js/types/connection';
import { getMessageLeo } from '../../artifacts/js/js2leo/connection';

// Serialize Message struct to bytes matching Leo's memory layout
function serializeMessageToBytes(message: Message): Uint8Array {
  // Get the Leo-formatted message
  const leoMessage = getMessageLeo(message);
  const structString = js2leoCommon.json(leoMessage)
  console.log(leoMessage, "Leomessage ");
  console.log(structString, "structString ");

  
  // Create a buffer for the serialized data
  // Message = { sn: u64, payload: u128 } = 8 bytes + 16 bytes = 24 bytes total
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  
  // Serialize sn (u64 - 8 bytes, little-endian)
  const sn = BigInt(leo2jsCommon.u8(leoMessage.sn));
  view.setBigUint64(0, sn, true); // true = little-endian
  
  // Serialize payload (u128 - 16 bytes, little-endian)
  const payload = BigInt(leo2jsCommon.field(leoMessage.payload));
  
  // Split u128 into two u64 parts (low and high)
  const payloadLow = payload & BigInt('0xFFFFFFFFFFFFFFFF');
  const payloadHigh = payload >> BigInt(64);
  
  view.setBigUint64(8, payloadLow, true);   // bytes 8-15
  view.setBigUint64(16, payloadHigh, true); // bytes 16-23
  
  const bytesData =  new Uint8Array(buffer);
  console.log(bytesData);
  
  return bytesData;
}



// Updated sign function for ECDSA
export const signMessage = async (
  message: Message,
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
  const messageBytes = serializeMessageToBytes(message);
  
  // Hash with Keccak256
  const messageHash = ethers.keccak256(messageBytes);
  
  // Sign the hash
  const signatureString = await wallet.signMessage(ethers.getBytes(messageHash));
  
  // Parse signature
  const sig = ethers.Signature.from(signatureString);
  
  // Create 65-byte signature (r, s, v)
  const signatureBytes = new Uint8Array(65);
  signatureBytes.set(ethers.getBytes(sig.r), 0);   // r: 32 bytes
  signatureBytes.set(ethers.getBytes(sig.s), 32);  // s: 32 bytes
  signatureBytes[64] = sig.v - 27;                  // v: 1 byte (recovery id)
  
  // Get compressed public key (33 bytes)
  const publicKeyBytes = ethers.getBytes(wallet.signingKey.compressedPublicKey);
  
  return {
    signature: Array.from(signatureBytes),
    publicKey: Array.from(publicKeyBytes),
    messageHash
  };
};

// Export both for flexibility
export { serializeMessageToBytes };