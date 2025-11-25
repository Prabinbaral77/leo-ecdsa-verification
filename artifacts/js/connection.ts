import {
  Signers,
  Signatures,
  Receipts,
  Message
} from "./types/connection";
import {
  getSignersLeo,
  getSignaturesLeo,
  getReceiptsLeo,
  getMessageLeo
} from "./js2leo/connection";
import {
  getSigners,
  getSignatures,
  getReceipts,
  getMessage
} from "./leo2js/connection";
import {
  ContractConfig,
  zkGetMapping,
  LeoAddress,
  LeoRecord,
  js2leo,
  leo2js,
  ExternalRecord,
  ExecutionMode,
  ExecutionContext,
  CreateExecutionContext,
  TransactionResponse
} from "@doko-js/core";
import {
  BaseContract
} from "../../contract/base-contract";
import {
  Transaction
} from "@provablehq/sdk";
import * as receipt from "./transitions/connection";

export class ConnectionContract extends BaseContract {

  constructor(config: Partial < ContractConfig > = {
    mode: ExecutionMode.LeoRun
  }) {
    super({
      ...config,
      appName: 'connection',
      fee: '0.01',
      contractPath: 'artifacts/leo/connection',
      isImportedAleo: false
    });
  }
  async initialize(r0: bigint, r1: LeoAddress): Promise < TransactionResponse < Transaction & receipt.ConnectionInitializeTransition, [] >> {
    const r0Leo = js2leo.u128(r0);
    const r1Leo = js2leo.address(r1);

    const params = [r0Leo, r1Leo]
    const result = await this.ctx.execute('initialize', params);
    return result
  }

  async verify_message(r0: number, r1: Signers, r2: Signatures): Promise < TransactionResponse < Transaction & receipt.ConnectionVerify_messageTransition, [] >> {
    const r0Leo = js2leo.u8(r0);
    const r1Leo = js2leo.json(getSignersLeo(r1));
    const r2Leo = js2leo.json(getSignaturesLeo(r2));

    const params = [r0Leo, r1Leo, r2Leo]
    const result = await this.ctx.execute('verify_message', params);
    return result
  }

  async already_processed(key: Receipts, defaultValue ? : boolean): Promise < boolean > {
    const keyLeo = js2leo.json(getReceiptsLeo(key));

    const params = [keyLeo]
    const result = await zkGetMapping(
      this.config,
      'already_processed',
      params[0],
    );

    if (result != null)
      return leo2js.boolean(result);
    else {
      if (defaultValue != undefined) return defaultValue;
      throw new Error(`already_processed returned invalid value[input: ${key}, output: ${result}`);
    }
  }

  async chain_id(key: boolean, defaultValue ? : bigint): Promise < bigint > {
    const keyLeo = js2leo.boolean(key);

    const params = [keyLeo]
    const result = await zkGetMapping(
      this.config,
      'chain_id',
      params[0],
    );

    if (result != null)
      return leo2js.u128(result);
    else {
      if (defaultValue != undefined) return defaultValue;
      throw new Error(`chain_id returned invalid value[input: ${key}, output: ${result}`);
    }
  }

  async owner_connection(key: boolean, defaultValue ? : LeoAddress): Promise < LeoAddress > {
    const keyLeo = js2leo.boolean(key);

    const params = [keyLeo]
    const result = await zkGetMapping(
      this.config,
      'owner_connection',
      params[0],
    );

    if (result != null)
      return leo2js.address(result);
    else {
      if (defaultValue != undefined) return defaultValue;
      throw new Error(`owner_connection returned invalid value[input: ${key}, output: ${result}`);
    }
  }

  async total_validators(key: boolean, defaultValue ? : number): Promise < number > {
    const keyLeo = js2leo.boolean(key);

    const params = [keyLeo]
    const result = await zkGetMapping(
      this.config,
      'total_validators',
      params[0],
    );

    if (result != null)
      return leo2js.u8(result);
    else {
      if (defaultValue != undefined) return defaultValue;
      throw new Error(`total_validators returned invalid value[input: ${key}, output: ${result}`);
    }
  }

  async threshold(key: boolean, defaultValue ? : number): Promise < number > {
    const keyLeo = js2leo.boolean(key);

    const params = [keyLeo]
    const result = await zkGetMapping(
      this.config,
      'threshold',
      params[0],
    );

    if (result != null)
      return leo2js.u8(result);
    else {
      if (defaultValue != undefined) return defaultValue;
      throw new Error(`threshold returned invalid value[input: ${key}, output: ${result}`);
    }
  }

  async messages(key: bigint, defaultValue ? : Message): Promise < Message > {
    const keyLeo = js2leo.field(key);

    const params = [keyLeo]
    const result = await zkGetMapping(
      this.config,
      'messages',
      params[0],
    );

    if (result != null)
      return getMessage(result);
    else {
      if (defaultValue != undefined) return defaultValue;
      throw new Error(`messages returned invalid value[input: ${key}, output: ${result}`);
    }
  }

  async yes_count(key: number, defaultValue ? : boolean): Promise < boolean > {
    const keyLeo = js2leo.u8(key);

    const params = [keyLeo]
    const result = await zkGetMapping(
      this.config,
      'yes_count',
      params[0],
    );

    if (result != null)
      return leo2js.boolean(result);
    else {
      if (defaultValue != undefined) return defaultValue;
      throw new Error(`yes_count returned invalid value[input: ${key}, output: ${result}`);
    }
  }


}