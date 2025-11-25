import {
  Message,
  MessageLeo,
  Signers,
  SignersLeo,
  Signatures,
  SignaturesLeo,
  Receipts,
  ReceiptsLeo
} from "../types/connection";
import {
  leo2js,
  tx,
  parseJSONLikeString
} from "@doko-js/core";
import {
  PrivateKey,
  Account,
  RecordCiphertext
} from "@provablehq/sdk"


export function getMessage(message: MessageLeo): Message {
  const result: Message = {
    sn: leo2js.u8(message.sn),
    payload: leo2js.field(message.payload),
  }
  return result;
}

export function getSigners(signers: SignersLeo): Signers {
  const result: Signers = {
    signer_1: leo2js.array(signers.signer_1, leo2js.u8),
  }
  return result;
}

export function getSignatures(signatures: SignaturesLeo): Signatures {
  const result: Signatures = {
    signature_1: leo2js.array(signatures.signature_1, leo2js.u8),
  }
  return result;
}

export function getReceipts(receipts: ReceiptsLeo): Receipts {
  const result: Receipts = {
    sn: leo2js.u8(receipts.sn),
    payload: leo2js.field(receipts.payload),
  }
  return result;
}