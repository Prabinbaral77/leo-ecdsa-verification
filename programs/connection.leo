// The 'aleo-gmp connection' program.
import gmp_lib_v3.aleo;
//check pausability, access control
//TODO: add withdraw fees funciton. fee can only be paid in aleo

//TODO: signer sign message with actual payload not payload hash
program connection_v3.aleo {
    // This is the standard message format in SODAX.
    struct Message {
        // The unique identifier (chain ID) of the source chain 
        // from which the asset or message is being transferred.
        src_chain_id: u128,

        // The address on the source chain that initiates the transfer.
        src_address: [u8; 32],

        // The connection serial number — a unique sequence number used 
        // to track this specific cross-chain connection or message on the source chain.
        conn_sn: u128,

        // The unique identifier (chain ID) of the destination chain 
        // where the asset or message will be delivered.
        dst_chain_id: u128,

        // The recipient address on the destination chain that will receive the asset or message.
        dst_address: [u8; 32],

        // The actual data or payload being transferred.
        // Represented as a fixed-size array of 100 u128 to ensure deterministic size and integrity.
        payload: [u8; 32]
    }


    // validators/signers responsible for message verification or consensus.
    // Each validator is a 33-byte Eth address.
    // Unused entries = ZERO_ADDRESS_BYTES.
    struct Validators {
        validator_1: [u8; 33],
        validator_2: [u8; 33],
        validator_3: [u8; 33],
        validator_4: [u8; 33],
        validator_5: [u8; 33]
    }

    // A set of up to 5 65-byte signatures.
    // Typically used for multi-signature verification or threshold checks.
    // TODO AFTER DOKOJS UPDATE: remove this and add sigs[u8; 65*5]
    struct Signatures {
        signature_1: [u8; 65],
        signature_2: [u8; 65],
        signature_3: [u8; 65],
        signature_4: [u8; 65],
        signature_5: [u8; 65]
    }

    struct Receipts {
        // Source chainId from where message origin.
        src_chain_id: u128,
        // to track this specific cross-chain connection or message on the source chain.
        conn_sn: u128,
    }

    // Tracks the message is already verified or not in respective chainId
    mapping already_processed: Receipts => bool;

    // Tracks chain id of the aleo spoke chain 
    // Key is the boolean ie true to get chain id of current aleo spoke chain otherwise return NULL
    mapping chain_id: bool => u128;

    // Stores the owner of the program
    // if key is true return owner of the program. key is false return NULL
    mapping owner_conn: bool => address;

    // Stores the total number of signers/validators
    // if key is true return total signers/validators count. key is false return NULL
    mapping total_validators: bool => u8;

    // Stores the validators threshold
    // if key is true return threshold count. key is false return NULL
    mapping threshold: bool => u8;

    // Stores the send messages from connection contract
    // key is conn_sn and value is in standard Message
    mapping messages: u128 => Message;

    //Store the all valid validators
    // if key is true return valid signers otherwise return NULL
    //TODO: remove mapping
    // mapping validator_list: bool => Validators; 

    // To check weather the address is validator or not
    //key is [u8; 33] it return true if it is valid validator otherwise return false
    mapping is_validator: [u8; 33] => bool;

    const OWNER_INDEX_MAGIC_VALUE: bool = true;
    const VALIDATOR_INDEX_MAGIC_VALUE: bool = true;
    const CHAIN_ID_INDEX_MAGIC_VALUE: bool = true;
    const TOTAL_VALIDATOR_MAGIC_VALUE: bool = true;
    const THRESHOLD_INDEX_MAGIC_VALUE: bool = true;

    // The zero address for Aleo
    const ZERO_ADDRESS: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;

    //random adress bytes.cannot set zero due to error during ecdsa verification should be valid signer bytes. 
    // zero address bytes is not valid signer bytes
    //TODO: which address should we need to consider for zero address 
    const ZERO_ADDRESS_BYTES: [u8; 33] = [
        3u8, 131u8,  24u8, 83u8,  91u8,  84u8,  16u8,  93u8,
        74u8, 122u8, 174u8, 96u8, 192u8, 143u8, 196u8,  95u8,
        150u8, 135u8,  24u8, 27u8,  79u8, 223u8, 198u8,  37u8,
        189u8,  26u8, 117u8, 63u8, 167u8,  57u8, 127u8, 237u8,
        117u8
    ];

    //Zero byte signature is made by signing the msg using ecdsa with random private key
    //Message: src_chain_id: 0u128  srcAddress: EVM ZERO ADDRESS conn_sn: 0 dst_chain_id: 0u128 dst_address: ALEO ZERO ADDRESS and payload: 0
    //TODO: which signature should we need to consider for zero address signature
    const ZERO_ADDRESS_BYTES_SIGNATURE: [u8; 65] = [
        54u8, 92u8, 100u8, 231u8, 30u8, 26u8, 164u8, 104u8,
        205u8, 217u8, 37u8, 20u8, 116u8, 213u8, 183u8, 212u8,
        89u8, 121u8, 71u8, 35u8, 200u8, 168u8, 15u8, 6u8,
        223u8, 151u8, 173u8, 68u8, 49u8, 44u8, 200u8, 152u8,
        20u8, 131u8, 157u8, 191u8, 189u8, 57u8, 131u8, 159u8,
        200u8, 14u8, 188u8, 122u8, 176u8, 239u8, 170u8, 102u8,
        228u8, 75u8, 71u8, 4u8, 52u8, 138u8, 190u8, 140u8,
        66u8, 91u8, 99u8, 198u8, 201u8, 236u8, 221u8, 179u8,
        0u8
    ];
    // This is the constructor for the program.
    // The constructor allows you to manage program upgrades.
    // It is called when the program is deployed or upgraded.
    // It is currently configured to **prevent** upgrades.
    @noupgrade
    async constructor() {}

    //////////////////////////////
    /////// Initialization ///////
    //////////////////////////////

    /// Initialize the connection program
    /// Note: This function must be allowed to be called only once.
    async transition initialize(
        public chain_id_input: u128, 
        public owner_input: address, 
        public validators_input: Validators, 
        public threshold_input: u8
    ) -> Future{
        let unique_validators: u8 = get_unique_validator_count(validators_input);
        // Check for threshold
        assert(threshold_input >= 1u8 && threshold_input <= unique_validators);
        return finalize_initialize(chain_id_input, owner_input, validators_input, threshold_input, unique_validators);
    }

    async function finalize_initialize(
        public chain_id_input: u128, 
        public owner_input: address, 
        public validators_input: Validators, 
        public threshold_input: u8,
        public unique_validators: u8
    ) {
        // assert connection contract is not initialized before
        assert(!Mapping::contains(owner_conn, OWNER_INDEX_MAGIC_VALUE));

        //set chainId and owner_conn
        Mapping::set(chain_id, CHAIN_ID_INDEX_MAGIC_VALUE, chain_id_input);
        Mapping::set(owner_conn, OWNER_INDEX_MAGIC_VALUE, owner_input);
        //set signer list signerlist: [u8; 33] => bool
        // Mapping::set(validator_list, VALIDATOR_INDEX_MAGIC_VALUE, validators_input);
        Mapping::set(is_validator, validators_input.validator_1, true);
        Mapping::set(is_validator, validators_input.validator_2, true);
        Mapping::set(is_validator, validators_input.validator_3, true);
        Mapping::set(is_validator, validators_input.validator_4, true);
        Mapping::set(is_validator, validators_input.validator_5, true);
        Mapping::set(is_validator, ZERO_ADDRESS_BYTES, true);
        
        Mapping::set(total_validators, TOTAL_VALIDATOR_MAGIC_VALUE, unique_validators);
        Mapping::set(threshold, THRESHOLD_INDEX_MAGIC_VALUE, threshold_input);
    }


    /////////////////////////////
    /////// Send Message ///////
    //////////////////////////////

    // / Send the message in standard SODAX format
    // / Note: This function store message in send messages with key connection serial number.
    async transition send_message(
        public dest_chain_id: u128, 
        public dest_address: [u8; 32], 
        public conn_sn: u128, 
        public payload:[u8; 32] 
    ) -> Future{
        let serialized_src_address: [bool; 253] = Serialize::to_bits_raw(self.caller);
        let src_address: [u8; 32] = gmp_lib_v3.aleo/bit256_to_bytes32(gmp_lib_v3.aleo/bit253_to_256bits(serialized_src_address));
        return finalize_send_message(src_address, dest_chain_id, dest_address, conn_sn, payload);
    }

    async function finalize_send_message(
        src_address: [u8; 32], 
        dest_chain_id: u128, 
        dest_address: [u8; 32], 
        conn_sn: u128, 
        payload: [u8; 32]
    ) {
        assert(!Mapping::contains(messages, conn_sn));
        let src_chain_id = Mapping::get(chain_id, CHAIN_ID_INDEX_MAGIC_VALUE);
        Mapping::set(messages, conn_sn, Message {
            src_chain_id: src_chain_id,
            src_address: src_address,
            conn_sn: conn_sn,
            dst_chain_id: dest_chain_id,
            dst_address: dest_address,
            payload: payload,
       });
    }


    /////////////////////////////
    /////// Verify Message ///////
    //////////////////////////////

    /// Verify the message in standard SODAX format
    //// Each signature must correspond to the signer in the same index.
    /// Note: This function verify the messages with valid signature and connection serial number
    // TODO AFTER DOKOJS UPDATE : Payload arbitary size Leo v3.4.0 https://provable.com/blog/announcing-aleo-stack-v4-4-0#What's-new-in-Leo-v3.4.0
    async transition verify_message(
        public src_chain_id: u128, 
        public src_address: [u8; 32], 
        public dest_chain_id: u128,
        public conn_sn: u128, 
        public payload: [u8; 32], 
        public validators_input: Validators, 
        public sigs: Signatures
    ) -> Future{
        let serialized_dest_address: [bool; 253] = Serialize::to_bits_raw(self.caller);
        let dst_address: [u8; 32] = gmp_lib_v3.aleo/bit256_to_bytes32(gmp_lib_v3.aleo/bit253_to_256bits(serialized_dest_address));

        let input_message: Message = Message {
            src_chain_id: src_chain_id, //32 bytes
            src_address: src_address, 
            conn_sn: conn_sn, //32 bytes
            dst_chain_id: dest_chain_id, //32 bytes
            dst_address: dst_address,
            payload: payload
        };

        let serialized_src_chain_id: [bool; 128] = Serialize::to_bits_raw(src_chain_id);
        let src_chain_bytes: [u8; 32] = gmp_lib_v3.aleo/bit256_to_bytes32(gmp_lib_v3.aleo/bit128_to_256bits(serialized_src_chain_id));
        let serialized_conn_sn: [bool; 128] = Serialize::to_bits_raw(conn_sn);
        let conn_sn_bytes: [u8; 32] = gmp_lib_v3.aleo/bit256_to_bytes32(gmp_lib_v3.aleo/bit128_to_256bits(serialized_conn_sn));
        let serialized_dest_chain_id: [bool; 128] = Serialize::to_bits_raw(dest_chain_id);
        let dest_chain_bytes: [u8; 32] = gmp_lib_v3.aleo/bit256_to_bytes32(gmp_lib_v3.aleo/bit128_to_256bits(serialized_dest_chain_id));
        let aggregate_message_bytes: [u8; 192] = gmp_lib_v3.aleo/flatten_6x32_to_192(conn_sn_bytes, src_chain_bytes, dest_chain_bytes, src_address, dst_address, payload);

        let digest: [bool; 256] = Keccak256::hash_to_bits_raw(aggregate_message_bytes);
        let message_hash: [u8; 32] = Deserialize::from_bits_raw::[[u8; 32]](digest);
        return finalize_verify_message(src_chain_id, dest_chain_id, conn_sn, validators_input, sigs, message_hash);
    }

    async function finalize_verify_message(
        src_chain_id: u128, 
        dest_chain_id: u128,
        conn_sn: u128, 
        validators_input: Validators, 
        sigs: Signatures,
        message_digest: [u8; 32],
    ) {
        let message_receipt: Receipts = Receipts {
            src_chain_id: src_chain_id,
            conn_sn: conn_sn
        };
        let is_message_verified: bool = Mapping::get_or_use(already_processed, message_receipt, false);
        // message should not be already verified
        assert(!is_message_verified);

        let threshold_vote_count: u8 = Mapping::get(threshold, THRESHOLD_INDEX_MAGIC_VALUE);
        let unique_validators_count: u8 = get_unique_validator_count(validators_input);
        assert(unique_validators_count >= threshold_vote_count);
 

        let destChainId: u128 = Mapping::get(chain_id, CHAIN_ID_INDEX_MAGIC_VALUE);
        assert_eq(destChainId, dest_chain_id);
        let sig_1: [u8; 65] = sigs.signature_1;
        let sig_2: [u8; 65] = sigs.signature_2;
        let sig_3: [u8; 65] = sigs.signature_3;
        let sig_4: [u8; 65] = sigs.signature_4;
        let sig_5: [u8; 65] = sigs.signature_5;


        // Check if each signer is valid
        let is_valid_1: bool = validators_input.validator_1 != ZERO_ADDRESS_BYTES && sig_1 != ZERO_ADDRESS_BYTES_SIGNATURE;
        let is_valid_2: bool = validators_input.validator_2 != ZERO_ADDRESS_BYTES && sig_2 != ZERO_ADDRESS_BYTES_SIGNATURE;
        let is_valid_3: bool = validators_input.validator_3 != ZERO_ADDRESS_BYTES && sig_3 != ZERO_ADDRESS_BYTES_SIGNATURE;
        let is_valid_4: bool = validators_input.validator_4 != ZERO_ADDRESS_BYTES && sig_4 != ZERO_ADDRESS_BYTES_SIGNATURE;
        let is_valid_5: bool = validators_input.validator_5 != ZERO_ADDRESS_BYTES && sig_5 != ZERO_ADDRESS_BYTES_SIGNATURE;

        let total_vote_count: u8 = 0;

        assert(Mapping::contains(is_validator, validators_input.validator_1));
        total_vote_count += is_valid_1 ? ECDSA::verify_digest(sig_1, validators_input.validator_1, message_digest) as u8 : 0u8;

        assert(Mapping::contains(is_validator, validators_input.validator_2));
        total_vote_count += is_valid_2 ? ECDSA::verify_digest(sig_2, validators_input.validator_2, message_digest) as u8 : 0u8;

        assert(Mapping::contains(is_validator, validators_input.validator_3));
        total_vote_count += is_valid_3 ? ECDSA::verify_digest(sig_3, validators_input.validator_3, message_digest) as u8 : 0u8;

        assert(Mapping::contains(is_validator, validators_input.validator_4));
        total_vote_count += is_valid_4 ? ECDSA::verify_digest(sig_4, validators_input.validator_4, message_digest) as u8 : 0u8;
 
        assert(Mapping::contains(is_validator, validators_input.validator_5));
        total_vote_count += is_valid_5 ? ECDSA::verify_digest(sig_5, validators_input.validator_5, message_digest) as u8 : 0u8;
  
        // votes should crossed threshold limit
        assert(total_vote_count >= threshold_vote_count);

        // verify message
        Mapping::set(already_processed, message_receipt, true);
    }

    //////////////////////////////
    /////// Update Validators ///////
    //////////////////////////////

    /// Update validators with new threshold index
    /// Note: Only owner_conn can update validator and threshold index. all or none[replace mechanism].
    // TODO: send old validators[must be present] as well and remove validator_list mapping
    async transition update_validators(
        public old_validators: Validators,
        public new_validators: Validators, 
        public new_threshold: u8
    ) -> Future{
        let unique_validators: u8 = get_unique_validator_count(new_validators);
        // Check for threshold
        assert(new_threshold >= 1u8 && new_threshold <= unique_validators);
        return finalize_update_validators(self.caller, old_validators, new_validators, new_threshold, unique_validators);
    }

    async function finalize_update_validators(
        caller: address, 
        old_validators: Validators,
        new_validators: Validators, 
        new_threshold: u8, 
        unique_validators: u8
    ) {
        //only called by owner_conn
        assert_eq(Mapping::get(owner_conn, OWNER_INDEX_MAGIC_VALUE), caller);
        //remvoe old validators
        // let already_existed_validators: Validators = Mapping::get(validator_list, VALIDATOR_INDEX_MAGIC_VALUE);
        if(old_validators.validator_1 != ZERO_ADDRESS_BYTES) {
            assert(Mapping::contains(is_validator, old_validators.validator_1));
            Mapping::remove(is_validator, old_validators.validator_1);
        }

        if(old_validators.validator_2 != ZERO_ADDRESS_BYTES) {
            assert(Mapping::contains(is_validator, old_validators.validator_2));
            Mapping::remove(is_validator, old_validators.validator_2);
        }

        if(old_validators.validator_3 != ZERO_ADDRESS_BYTES) {
            assert(Mapping::contains(is_validator, old_validators.validator_3));
            Mapping::remove(is_validator, old_validators.validator_3);
        }

         if(old_validators.validator_4 != ZERO_ADDRESS_BYTES) {
            assert(Mapping::contains(is_validator, old_validators.validator_4));
            Mapping::remove(is_validator, old_validators.validator_4);
        }

         if(old_validators.validator_5 != ZERO_ADDRESS_BYTES) {
            assert(Mapping::contains(is_validator, old_validators.validator_5));
            Mapping::remove(is_validator, old_validators.validator_5);
        }
       
        //add new validators
        Mapping::set(is_validator, new_validators.validator_1, true);
        Mapping::set(is_validator, new_validators.validator_2, true);
        Mapping::set(is_validator, new_validators.validator_3, true);
        Mapping::set(is_validator, new_validators.validator_4, true);
        Mapping::set(is_validator, new_validators.validator_5, true);

        Mapping::set(total_validators, TOTAL_VALIDATOR_MAGIC_VALUE, unique_validators);
        Mapping::set(threshold, THRESHOLD_INDEX_MAGIC_VALUE, new_threshold);
    }


    //////////////////////////////
    /////// Update Threshold ///////
    //////////////////////////////

    // / Update validator threshold to verify message
    // / Note: Only owner_conn can update threshold
    async transition update_threshold(public new_threshold: u8) -> Future{
        assert(new_threshold >= 1u8);
        return finalize_update_threshold(self.caller, new_threshold);
    }

    async function finalize_update_threshold(caller: address, new_threshold: u8) {
        let current_owner: address = Mapping::get(owner_conn, OWNER_INDEX_MAGIC_VALUE);
        assert_eq(current_owner, caller);
        let total_existing_validators: u8 = Mapping::get(total_validators, TOTAL_VALIDATOR_MAGIC_VALUE);
        assert(total_existing_validators >= new_threshold );
        Mapping::set(threshold, THRESHOLD_INDEX_MAGIC_VALUE, new_threshold);
    }


    //////////////////////////////
    /////// Transfer Ownership ///////
    //////////////////////////////

    /// Update owner_conn of the connection contract
    /// Note: Only owner_conn can transfer ownership.
    async transition transfer_ownership(public new_owner: address) -> Future{
        assert_neq(new_owner, ZERO_ADDRESS);
        return finalize_transfer_ownership(self.caller, new_owner);
    }

    async function finalize_transfer_ownership(caller: address, new_owner: address) {
        assert_eq(Mapping::get(owner_conn, OWNER_INDEX_MAGIC_VALUE), caller);
        Mapping::set(owner_conn, OWNER_INDEX_MAGIC_VALUE, new_owner);
    }


    // Validates that the addresses are unique except for ZERO_ADDRESS_BYTES
    // Returns the count of the unique addresses
    //TODO: do testing for inline function
    inline get_unique_validator_count(validators_input: Validators) -> u8 {
        let unique_validators: u8 = 0u8;
        if (validators_input.validator_1 != ZERO_ADDRESS_BYTES) {
            assert_neq(validators_input.validator_1, validators_input.validator_2);
            assert_neq(validators_input.validator_1, validators_input.validator_3);
            assert_neq(validators_input.validator_1, validators_input.validator_4);
            assert_neq(validators_input.validator_1, validators_input.validator_5);
            unique_validators += 1u8;
        }

        if (validators_input.validator_2 != ZERO_ADDRESS_BYTES) {
            assert_neq(validators_input.validator_2, validators_input.validator_3);
            assert_neq(validators_input.validator_2, validators_input.validator_4);
            assert_neq(validators_input.validator_2, validators_input.validator_5);
            unique_validators += 1u8;
        }

        if (validators_input.validator_3 != ZERO_ADDRESS_BYTES) {
            assert_neq(validators_input.validator_3, validators_input.validator_4);
            assert_neq(validators_input.validator_3, validators_input.validator_5);
            unique_validators += 1u8;
        }

        if (validators_input.validator_4 != ZERO_ADDRESS_BYTES) {
            assert_neq(validators_input.validator_4, validators_input.validator_5);
            unique_validators += 1u8;
        }

        if (validators_input.validator_5 != ZERO_ADDRESS_BYTES) {
            unique_validators += 1u8;
        }

        return unique_validators;
    }

}
