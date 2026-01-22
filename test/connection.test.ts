import { ExecutionMode } from "@doko-js/core";
import { createRandomMessage } from "./utils/createMessage";
import { any2AleoArr } from "./utils/getPaddedAddress";
import { ALEO_ZERO_ADDRESS, aleoChainId, evmAddress, HubAddress, HubChainId, signer_2_pk, signer_3_pk, signer_4_pk, validator_1_pk, zero_address_bytes, zero_address_signature } from "./utils/testnet.data";
import { Message, Receipts, Signatures, Validators } from "../artifacts/js/types/connection_v3";
import { addressToBits, bitsToBytes32, hexTo32Bytes } from "./utils/getBytes";
import  secp256k1 from "secp256k1"
import { getBytes, toBeArray } from "ethers";
import {  convertAleoAddressToBytes, convertEthAddressToBytes, serializeMessageEthers } from "./utils/bitManipulation";
import { Connection_v3Contract } from "../artifacts/js/connection_v3";
import { Gmp_lib_v3Contract } from "../artifacts/js/gmp_lib_v3";

const mode = ExecutionMode.SnarkExecute;

const connectionContract = new Connection_v3Contract({mode})
const libContract = new Gmp_lib_v3Contract({mode})

const TIMEOUT = 200_000
const ethChainId = HubChainId;
const payload = [
  192, 194, 149,  11, 151,  95, 236, 185,
  194,  69,   8,  52,  82,  71,   5, 194,
   27, 217,  19,  97,  24, 107,  37, 179,
  214, 185,  81, 125, 142, 206, 100,  56
]
const signer_1_private_key = hexTo32Bytes(validator_1_pk)
const signer1 =  secp256k1.publicKeyCreate(signer_1_private_key)
const signer_2_private_key = hexTo32Bytes(signer_2_pk)
const signer2 =  secp256k1.publicKeyCreate(signer_2_private_key);
const signer_3_private_key = hexTo32Bytes(signer_3_pk)
const signer3 =  secp256k1.publicKeyCreate(signer_3_private_key);
const signer_4_private_key = hexTo32Bytes(signer_4_pk)
const signer4 =  secp256k1.publicKeyCreate(signer_4_private_key);


// let privKey: Buffer;
// do {
//   privKey = randomBytes(32);        // random 32 bytes
// } while (!secp256k1.privateKeyVerify(privKey));

// console.log("Private Key:", privKey.toString("hex"));

//npm run test -- --runInBand ./test/connection.test.ts
describe("Connection contract", () => {
  const [aleoUser1, aleoUser2] = connectionContract.getAccounts();
  const admin = aleoUser1;
  const OWNER_INDEX = true;
  const CHAIN_ID_INDEX = true;
  const TOTAL_VALIDATORS_INDEX = true;
  const THRESHOLD_INDEX = true;

  console.log(aleoUser1);
  
  // const params = [`[${keyLeo.toString()}]`];
  describe.skip("contract deployment and setup", () => {

    test("Deploy lib contract", async () => {
      const deployLibTx = await libContract.deploy();
      await deployLibTx.wait();
    }, TIMEOUT);

    test("Deploy connection contract", async () => {
      const deployConnectionTx = await connectionContract.deploy();
      await deployConnectionTx.wait();
    }, TIMEOUT);

    test.failing("Cannot Initialize contract with threshold less than 1", async() => {
      connectionContract.connect(admin);
       let validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
      let threshold_value: number = 0;
      let txn = await connectionContract.initialize(aleoChainId, admin, validators, threshold_value);
      await txn.wait();
    }, TIMEOUT)

    test.failing("Cannot Initialize contract with threshold more than unique validators", async() => {
      connectionContract.connect(admin);
       let validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
      let threshold_value: number = 5;
      let txn = await connectionContract.initialize(aleoChainId, admin, validators, threshold_value);
      await txn.wait();
    }, TIMEOUT)

    test("Initialize contract", async() => {
      connectionContract.connect(admin);
       let validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
      let threshold_value: number = 1;
      let txn = await connectionContract.initialize(aleoChainId, admin, validators, threshold_value);
      await txn.wait();
      expect(await connectionContract.chain_id(CHAIN_ID_INDEX)).toBe(aleoChainId);
      expect(await connectionContract.owner_conn(OWNER_INDEX)).toBe(admin);
      expect(await connectionContract.is_validator( Array.from(signer1))).toBe(true);
      expect(await connectionContract.is_validator( Array.from(signer2))).toBe(true);
      expect(await connectionContract.is_validator(zero_address_bytes)).toBe(true);

      expect(await connectionContract.total_validators(TOTAL_VALIDATORS_INDEX)).toBe(2);
      expect(await connectionContract.threshold(THRESHOLD_INDEX)).toBe(threshold_value);
    }, TIMEOUT)

    test("Cannot Initialize contract twice", async() => {
      connectionContract.connect(admin);
      expect(await connectionContract.owner_conn(OWNER_INDEX)).toBe(admin);
       let validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
      let threshold_value: number = 1;
      let txn = await connectionContract.initialize(aleoChainId, admin, validators, threshold_value);
      await expect(txn.wait()).rejects.toThrow(); 
    }, TIMEOUT)
  })

  describe("Send message", () => {
    let connectionSn = BigInt(12111);
    test("Send message", async() => {
      connectionContract.connect(aleoUser1);
      let txn = await connectionContract.send_message( ethChainId, convertEthAddressToBytes(HubAddress), connectionSn, payload);
      await txn.wait();
      const messages = await connectionContract.messages(connectionSn);
      console.log(messages);
    }, TIMEOUT)

    test("Should fail if same hash is send for conn sn", async() => {
      connectionContract.connect(aleoUser1);
      let txn = await connectionContract.send_message( ethChainId, convertEthAddressToBytes(HubAddress), connectionSn, payload);
      await expect(txn.wait()).rejects.toThrow();
    }, TIMEOUT)
  })

  describe("Verify message with threshold 1 should pass", () => {
    test("verify meesage with single threshold", async() => {
      let srcChainId = ethChainId;
      let destinationChainId = aleoChainId;
      connectionContract.connect(aleoUser1)
      let sn = BigInt(11);
      let message: Message = createRandomMessage(srcChainId, convertEthAddressToBytes(HubAddress), sn, destinationChainId, convertAleoAddressToBytes(aleoUser1), payload)
      // let msg1: Message = createRandomMessage(BigInt(0), "0x0000000000000000000000000000000000000000", BigInt(0), BigInt(0), "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc", BigInt(0))
      let receipts: Receipts = {
        src_chain_id: ethChainId,
        conn_sn: sn
      }

      const messageBytes: Uint8Array = serializeMessageEthers(message)
      console.log("message hash from ethersjs", messageBytes);
      
      const sigObj = secp256k1.ecdsaSign(messageBytes, signer_1_private_key)

      const requiredSignature = new Uint8Array(65);
      // Copy R||S (64 bytes)
      requiredSignature.set(sigObj.signature, 0);

      // Append recid (1 byte)
      requiredSignature[64] = sigObj.recid;
      // console.log(requiredSignature);
      
      const validator_info: Validators = {
        validator_1: Array.from(signer1),
        validator_2: zero_address_bytes,
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
 
      const signatures_info: Signatures = {
        signature_1: Array.from(requiredSignature),
        signature_2: zero_address_signature,
        signature_3: zero_address_signature,
        signature_4: zero_address_signature,
        signature_5: zero_address_signature,
      }
      // const data = secp256k1.ecdsaVerify(requiredSignature, messageBytes, signer2);
      expect(await connectionContract.already_processed(receipts, false)).toBe(false);
      const thresholdVote = await connectionContract.threshold(true)
      const txn = await connectionContract.verify_message(message.src_chain_id, message.src_address, message.dst_chain_id, message.conn_sn, message.payload, validator_info, signatures_info);
      await txn.wait();

      expect(await connectionContract.already_processed(receipts)).toBe(true);
    }, TIMEOUT)
  })

  describe("Update validators", () => {
    test("Update Validators", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);

      let old_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }

      let new_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: Array.from(signer3),
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
     
      let updatevalidatortxn = await connectionContract.update_validators(old_validators, new_validators,1);
      await updatevalidatortxn.wait();
      expect( await connectionContract.total_validators(true)).toBe(3)
      expect(await connectionContract.is_validator( Array.from(signer1))).toBe(true);
      expect(await connectionContract.is_validator( Array.from(signer2))).toBe(true);
      expect(await connectionContract.is_validator( Array.from(signer3))).toBe(true);
      expect(await connectionContract.is_validator(zero_address_bytes)).toBe(true);
      expect(await connectionContract.threshold(THRESHOLD_INDEX)).toBe(1);
    }, TIMEOUT)

     test.failing("Should fail if threshold value is less than 1", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);

      let old_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }

      let new_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: Array.from(signer3),
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
     
      let updatevalidatortxn = await connectionContract.update_validators(old_validators, new_validators,0);
      await updatevalidatortxn.wait();
    }, TIMEOUT)

    test.failing("Should fail if threshold value is greater than unique signers", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);

      let old_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }

      let new_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: Array.from(signer3),
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
     
      let updatevalidatortxn = await connectionContract.update_validators(old_validators, new_validators,5);
      await updatevalidatortxn.wait();
    }, TIMEOUT)

     test("Should fail if non owner tried to update validators", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(aleoUser2);

      let old_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }

      let new_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: Array.from(signer3),
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
     
      let updatevalidatortxn = await connectionContract.update_validators(old_validators, new_validators,1);
      await expect(updatevalidatortxn.wait()).rejects.toThrow(); 
    }, TIMEOUT)

     test("Should fail if old validators list is invalid", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);

      let old_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer4),
        validator_3: zero_address_bytes,
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }

      let new_validators: Validators = {
        validator_1: Array.from(signer1),
        validator_2: Array.from(signer2),
        validator_3: Array.from(signer3),
        validator_4: zero_address_bytes,
        validator_5: zero_address_bytes,
      }
     
      let updatevalidatortxn = await connectionContract.update_validators(old_validators, new_validators,1);
      await expect(updatevalidatortxn.wait()).rejects.toThrow();
    }, TIMEOUT)
  })

  describe("Update threshold index", () => {
    test("Update Threshold", async () => {
      const new_threshold = 2;
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);

      let updateThresholdTxn = await connectionContract.update_threshold(new_threshold);
      await updateThresholdTxn.wait();
      expect(await connectionContract.threshold(THRESHOLD_INDEX)).toBe(new_threshold);
    }, TIMEOUT)

    test.failing("Should failed if threshold is less than 1", async () => {
      const new_threshold = 0;
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);

      let updateThresholdTxn = await connectionContract.update_threshold(new_threshold);
      await updateThresholdTxn.wait(); 
    }, TIMEOUT)

    test("Should failed if threshold is greater than existing validator", async () => {
      const new_threshold = 10;
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);

      let updateThresholdTxn = await connectionContract.update_threshold(new_threshold);
      await expect(updateThresholdTxn.wait()).rejects.toThrow(); 
    }, TIMEOUT)

    test("Should failed if non owner tried to update threshold", async () => {
      const new_threshold = 1;
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(aleoUser2);

      let updateThresholdTxn = await connectionContract.update_threshold(new_threshold);
      await expect(updateThresholdTxn.wait()).rejects.toThrow(); 
    }, TIMEOUT)
  })


  describe("Ownership transfer", () => {
    test.failing("Should failed if new owner is zero address", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);
      let txn = await connectionContract.transfer_ownership(ALEO_ZERO_ADDRESS)
      await txn.wait(); 
    }, TIMEOUT)

    test("Should failed if non owner tried to change ownership", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(aleoUser2);
      let txn = await connectionContract.transfer_ownership(aleoUser2)
      await expect(txn.wait()).rejects.toThrow(); 
    }, TIMEOUT)

    test("Should transfer ownership from admin to aleouser2", async () => {
      const owneraddress = await connectionContract.owner_conn(OWNER_INDEX);
      connectionContract.connect(owneraddress);
      let txn = await connectionContract.transfer_ownership(aleoUser2)
      await txn.wait();
      expect(await connectionContract.owner_conn(OWNER_INDEX)).toBe(aleoUser2);
    }, TIMEOUT)
  })

  describe("Verify message", () => {
      test("Should failed if vote count is less than threshold index", async() => {
        let srcChainId = ethChainId;
        let destinationChainId = aleoChainId;
        let sn = BigInt(222222);
        connectionContract.connect(aleoUser1)
        let message: Message = createRandomMessage(srcChainId, convertEthAddressToBytes(HubAddress), sn, destinationChainId, convertAleoAddressToBytes(aleoUser1), payload)
        // let msg1: Message = createRandomMessage(BigInt(0), "0x0000000000000000000000000000000000000000", BigInt(0), BigInt(0), "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc", BigInt(0))
        let receipts: Receipts = {
          src_chain_id: ethChainId,
          conn_sn: sn
        }

        const messageBytes: Uint8Array = serializeMessageEthers(message)
        
        const sigObj = secp256k1.ecdsaSign(messageBytes, signer_1_private_key)

        const requiredSignature = new Uint8Array(65);
        // Copy R||S (64 bytes)
        requiredSignature.set(sigObj.signature, 0);

        // Append recid (1 byte)
        requiredSignature[64] = sigObj.recid;
        console.log(requiredSignature);
        
        let validators_info: Validators = {
          validator_1: Array.from(signer1),
          validator_2: Array.from(signer2),
          validator_3: Array.from(signer3),
          validator_4: zero_address_bytes,
          validator_5: zero_address_bytes,
      }
  
        const signatures_info: Signatures = {
          signature_1: Array.from(requiredSignature),
          signature_2: zero_address_signature,
          signature_3: zero_address_signature,
          signature_4: zero_address_signature,
          signature_5: zero_address_signature,
        }
        // const data = secp256k1.ecdsaVerify(requiredSignature, messageBytes, signer2);
        expect(await connectionContract.already_processed(receipts, false)).toBe(false);
        const thresholdVote = await connectionContract.threshold(true)
        const txn = await connectionContract.verify_message(message.src_chain_id, message.src_address, message.dst_chain_id, message.conn_sn, message.payload, validators_info, signatures_info);
        await expect(txn.wait()).rejects.toThrow(); 
      }, TIMEOUT)

      test("Should pass if vote count crossed threshold index(2)", async() => {
        let srcChainId = ethChainId;
        let destinationChainId = aleoChainId;
        connectionContract.connect(aleoUser1)
        let sn = BigInt(3333333);
        let message: Message = createRandomMessage(srcChainId, convertEthAddressToBytes(HubAddress), sn, destinationChainId, convertAleoAddressToBytes(aleoUser1), payload)
        let receipts: Receipts = {
          src_chain_id: ethChainId,
          conn_sn: sn
        }

        const messageBytes: Uint8Array = serializeMessageEthers(message)
        
        //signer 1 signs
        const sigObj_1 = secp256k1.ecdsaSign(messageBytes, signer_1_private_key)

        const requiredSignature_1 = new Uint8Array(65);
        // Copy R||S (64 bytes)
        requiredSignature_1.set(sigObj_1.signature, 0);

        // Append recid (1 byte)
        requiredSignature_1[64] = sigObj_1.recid;

        //signer 2 signs
        const sigObj_2 = secp256k1.ecdsaSign(messageBytes, signer_2_private_key)

        const requiredSignature_2 = new Uint8Array(65);
        // Copy R||S (64 bytes)
        requiredSignature_2.set(sigObj_2.signature, 0);

        // Append recid (1 byte)
        requiredSignature_2[64] = sigObj_2.recid;
        
        let validators_info: Validators = {
          validator_1: Array.from(signer2),
          validator_2: Array.from(signer1),
          validator_3: zero_address_bytes,
          validator_4: zero_address_bytes,
          validator_5: zero_address_bytes,
        }
  
        const signatures_info: Signatures = {
          signature_1: Array.from(requiredSignature_2),
          signature_2: Array.from(requiredSignature_1),
          signature_3: zero_address_signature,
          signature_4: zero_address_signature,
          signature_5: zero_address_signature,
        }
        // const data = secp256k1.ecdsaVerify(requiredSignature, messageBytes, signer2);
        expect(await connectionContract.already_processed(receipts, false)).toBe(false);
        const thresholdVote = await connectionContract.threshold(true)
        const txn = await connectionContract.verify_message(message.src_chain_id, message.src_address, message.dst_chain_id, message.conn_sn, message.payload, validators_info, signatures_info);
        await txn.wait();
        let isProcessed = await connectionContract.already_processed(receipts);
        expect(isProcessed).toBe(true);
      }, TIMEOUT)

      test("Should pass if zero address is passed first in validator list and zero address signature is passed first in signature list", async() => {
        let srcChainId = ethChainId;
        let destinationChainId = aleoChainId;
        connectionContract.connect(aleoUser1)
        let sn = BigInt(455454);
        let message: Message = createRandomMessage(srcChainId, convertEthAddressToBytes(HubAddress), sn, destinationChainId, convertAleoAddressToBytes(aleoUser1), payload)
        let receipts: Receipts = {
          src_chain_id: ethChainId,
          conn_sn: sn
        }

        const messageBytes: Uint8Array = serializeMessageEthers(message)
        
        //signer 1 signs
        const sigObj_1 = secp256k1.ecdsaSign(messageBytes, signer_1_private_key)

        const requiredSignature_1 = new Uint8Array(65);
        // Copy R||S (64 bytes)
        requiredSignature_1.set(sigObj_1.signature, 0);

        // Append recid (1 byte)
        requiredSignature_1[64] = sigObj_1.recid;

        //signer 2 signs
        const sigObj_2 = secp256k1.ecdsaSign(messageBytes, signer_2_private_key)

        const requiredSignature_2 = new Uint8Array(65);
        // Copy R||S (64 bytes)
        requiredSignature_2.set(sigObj_2.signature, 0);

        // Append recid (1 byte)
        requiredSignature_2[64] = sigObj_2.recid;
        
        let validators_info: Validators = {
          validator_1: zero_address_bytes,
          validator_2: zero_address_bytes,
          validator_3: zero_address_bytes,
          validator_4: Array.from(signer1),
          validator_5: Array.from(signer2),
        }
  
        const signatures_info: Signatures = {
          signature_1: zero_address_signature,
          signature_2: zero_address_signature,
          signature_3: zero_address_signature,
          signature_4: Array.from(requiredSignature_1),
          signature_5: Array.from(requiredSignature_2),
        }
        // const data = secp256k1.ecdsaVerify(requiredSignature, messageBytes, signer2);
        expect(await connectionContract.already_processed(receipts, false)).toBe(false);
        const thresholdVote = await connectionContract.threshold(true)
        const txn = await connectionContract.verify_message(message.src_chain_id, message.src_address, message.dst_chain_id, message.conn_sn, message.payload, validators_info, signatures_info);
        await txn.wait();
        let isProcessed = await connectionContract.already_processed(receipts);
        expect(isProcessed).toBe(true);
      }, TIMEOUT)

      test("Should failed if validator are signning on different message", async() => {
        let srcChainId = ethChainId;
        let destinationChainId = aleoChainId;
        connectionContract.connect(aleoUser1)
        let sn = BigInt(33333);
        let message: Message = createRandomMessage(srcChainId, convertEthAddressToBytes(HubAddress), sn, destinationChainId, convertAleoAddressToBytes(aleoUser1), payload)
        let receipts: Receipts = {
          src_chain_id: ethChainId,
          conn_sn: sn
        }

        const messageBytes: Uint8Array = serializeMessageEthers(message)
        
        //signer 1 signs
        const sigObj_1 = secp256k1.ecdsaSign(messageBytes, signer_1_private_key)

        const requiredSignature_1 = new Uint8Array(65);
        // Copy R||S (64 bytes)
        requiredSignature_1.set(sigObj_1.signature, 0);

        // Append recid (1 byte)
        requiredSignature_1[64] = sigObj_1.recid;

        //signer 2 signs
        const sigObj_2 = secp256k1.ecdsaSign(messageBytes, signer_2_private_key)

        const requiredSignature_2 = new Uint8Array(65);
        // Copy R||S (64 bytes)
        requiredSignature_2.set(sigObj_2.signature, 0);

        // Append recid (1 byte)
        requiredSignature_2[64] = sigObj_2.recid;
        
        let validators_info: Validators = {
          validator_1: Array.from(signer1),
          validator_2: Array.from(signer2),
          validator_3: Array.from(signer3),
          validator_4: zero_address_bytes,
          validator_5: zero_address_bytes,
        }
  
        const signatures_info: Signatures = {
          signature_1: Array.from(requiredSignature_1),
          signature_2: Array.from(requiredSignature_2),
          signature_3: zero_address_signature,
          signature_4: zero_address_signature,
          signature_5: zero_address_signature,
        }
        // const data = secp256k1.ecdsaVerify(requiredSignature, messageBytes, signer2);
        expect(await connectionContract.already_processed(receipts, false)).toBe(false);
        const thresholdVote = await connectionContract.threshold(true)
        const txn = await connectionContract.verify_message(message.src_chain_id, message.src_address, message.dst_chain_id, BigInt(1), message.payload, validators_info, signatures_info);
       await expect(txn.wait()).rejects.toThrow(); 
      }, TIMEOUT)
  })
})
