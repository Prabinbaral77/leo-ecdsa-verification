import {
  tx
} from "@doko-js/core";
import * as records from "../types/connection";


export type ConnectionInitializeTransition = tx.ExecutionReceipt < [tx.Transition < [tx.FutureOutput], 'connection', 'initialize' > , ] >
  export type ConnectionVerify_messageTransition = tx.ExecutionReceipt < [tx.Transition < [tx.FutureOutput], 'connection', 'verify_message' > , ] >