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
  js2leo
} from "@doko-js/core";


export function getMessageLeo(message: Message): MessageLeo {
  const result: MessageLeo = {
    sn: js2leo.u8(message.sn),
    payload: js2leo.field(message.payload),
  }
  return result;
}

export function getSignersLeo(signers: Signers): SignersLeo {
  const result: SignersLeo = {
    signer_1: js2leo.array(signers.signer_1, js2leo.u8),
  }
  return result;
}

export function getSignaturesLeo(signatures: Signatures): SignaturesLeo {
  const result: SignaturesLeo = {
    signature_1: js2leo.array(signatures.signature_1, js2leo.u8),
  }
  return result;
}

export function getReceiptsLeo(receipts: Receipts): ReceiptsLeo {
  const result: ReceiptsLeo = {
    sn: js2leo.u8(receipts.sn),
    payload: js2leo.field(receipts.payload),
  }
  return result;
}