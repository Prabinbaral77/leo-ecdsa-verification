import {
  z
} from "zod";
import {
  leoAddressSchema,
  leoPrivateKeySchema,
  leoViewKeySchema,
  leoTxIdSchema,
  leoScalarSchema,
  leoFieldSchema,
  leoBooleanSchema,
  leoU8Schema,
  leoU16Schema,
  leoU32Schema,
  leoU64Schema,
  leoU128Schema,
  leoGroupSchema,
  leoRecordSchema,
  leoTxSchema,
  leoSignatureSchema,
  LeoArray,
  LeoAddress,
  ExternalRecord,
  tx
} from "@doko-js/core";

export interface Message {
  sn: number;
  payload: bigint;
}

export const leoMessageSchema = z.object({
  sn: leoU8Schema,
  payload: leoFieldSchema,
});
export type MessageLeo = z.infer < typeof leoMessageSchema > ;

export interface Signers {
  signer_1: Array < number > ;
}

export const leoSignersSchema = z.object({
  signer_1: z.array(leoU8Schema).length(33),
});
export type SignersLeo = z.infer < typeof leoSignersSchema > ;

export interface Signatures {
  signature_1: Array < number > ;
}

export const leoSignaturesSchema = z.object({
  signature_1: z.array(leoU8Schema).length(65),
});
export type SignaturesLeo = z.infer < typeof leoSignaturesSchema > ;

export interface Receipts {
  sn: number;
  payload: bigint;
}

export const leoReceiptsSchema = z.object({
  sn: leoU8Schema,
  payload: leoFieldSchema,
});
export type ReceiptsLeo = z.infer < typeof leoReceiptsSchema > ;