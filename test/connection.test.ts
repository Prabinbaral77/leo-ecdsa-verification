import { ExecutionMode } from "@doko-js/core";
import { createRandomMessage } from "./utils/createMessage";
import { aleoPaddedTo33, ethPaddedTo33 } from "./utils/getPaddedAddress";
import { validator_1, validator_1_pk } from "./utils/testnet.data";
import {  createSignature, signMessageECDSA } from "./utils/ecdsaSigning";
import { Receipts, Signatures, Signers } from "../artifacts/js/types/connection";
import { ConnectionContract } from "../artifacts/js/connection";
import { messageToU64x4 } from "./utils/hash";
import { signMessage } from "./utils/new";
import { signMessageu } from "./utils/updated";

const mode = ExecutionMode.SnarkExecute;

const connectionContract = new ConnectionContract({mode})
const TIMEOUT = 200_000
const aleoChainId = BigInt("123"); 
const ALEO_ZERO_ADDRESS = "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc";
const payload = BigInt(13567099);
const aleoAddress = BigInt("1197470102489602745811042362685620817855019264965533852603090875444599354527")  //aleouser1


//npm run test -- --runInBand ./test/connection.test.ts
describe("Connection contract", () => {
  const [aleoUser1, aleoUser2] = connectionContract.getAccounts();
  const admin = aleoUser1;
  const OWNER_INDEX = true;
  const CHAIN_ID_INDEX = true;
  const THRESHOLD_INDEX = true;

  describe("contract deployment and setup", () => {
    test("Deployment", async () => {
      const deployConnectionTx = await connectionContract.deploy();
      await deployConnectionTx.wait();
    }, TIMEOUT);

    test("Initialize contract", async() => {
      connectionContract.connect(admin);
      let txn = await connectionContract.initialize(aleoChainId, admin);
      await txn.wait();

      expect(await connectionContract.chain_id(CHAIN_ID_INDEX)).toBe(aleoChainId);
      expect(await connectionContract.owner_connection(OWNER_INDEX)).toBe(admin);
    }, TIMEOUT)
  })


  describe("Verify message", () => {
     test("verify meesage", async() => {
      let sn = 1;
      let message = createRandomMessage(sn, payload)
      let receipts: Receipts = {
        sn: sn,
        payload: payload
      }

        
    // Create signature
    const {signature, publicKey, messageHash} = await signMessageu(1, true, validator_1_pk);
    
    // Prepare inputs for Leo
    const signs: Signatures = {
      signature_1: Array.from(signature)
    };
    
    const signers: Signers = {
      signer_1: Array.from(publicKey)
    };
 console.log(messageHash);
 
    // console.log(ethPaddedTo33(validator_1));
    // console.log(signers);
    
      // const signatures_info: Signatures = {
      //   signature_1: signature
      // }
      
      // expect(await connectionContract.already_processed(receipts, false)).toBe(false);
      // const thresholdVote = await connectionContract.threshold(true)
      // console.log(thresholdVote);
      
      const txn = await connectionContract.verify_message( 1, signers, signs);
      const result = await txn.wait();
      
      // expect(await connectionContract.already_processed(receipts)).toBe(true);

    }, TIMEOUT)
  })

})