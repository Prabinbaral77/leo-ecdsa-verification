import { js2leo as js2leoCommon } from '@doko-js/core';
import { sign } from "aleo-signer"
import { hashStruct } from "./hash";
import { Message } from '../../artifacts/js/types/connection';
import { getMessageLeo } from '../../artifacts/js/js2leo/connection';

export const signMessage = (message: Message, screening_passed: boolean, privateKey: string) => {
  // console.log("message", getMessageLeo(message));
  const messageHash = hashStruct(getMessageLeo(message));
  // console.log("messageHash", messageHash)
  const signature = sign(privateKey, js2leoCommon.field(messageHash))
  // console.log("signature", signature)
  return signature
}