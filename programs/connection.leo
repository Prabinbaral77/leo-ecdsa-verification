// The 'aleo-gmp connection' program.
program connection.aleo {

    struct Message {
        sn: u8,
        payload: field,
    }
    
    struct Validators {
        validator_1: [u8; 33]
    }

  
    struct Signers {
        signer_1: [u8; 33]
    }

    // A set of up to 5 65-byte signatures.
    // Typically used for multi-signature verification or threshold checks.
    // Each signature must correspond to the signer in the same index.
    // Unused entries = [0u8; 65].
    struct Signatures {
        signature_1: [u8; 65]
    }

    struct Receipts {
        sn: u8,
        payload: field
    }

    // Tracks the message is already verified or not in respective chainId
    mapping already_processed: Receipts => bool;

    // Tracks chain id of the supported spoke chain
    // Key is the boolean ie true to get chain id of current spoke chain
    mapping chain_id: bool => u128;

    // Stores the owner of the program
    // if key is true return owner of the program. key is false return NULL
    mapping owner_connection: bool => address;

    // Stores the total number of validators
    // if key is true return total validators count. key is false return NULL
    mapping total_validators: bool => u8;

    // Stores the validators threshold
    // if key is true return threshold count. key is false return NULL
    mapping threshold: bool => u8;

     // Stores the send messages from connection contract
    // key is field(which is hash of different attribute) and value is in standard Message
    mapping messages: field => Message;

    mapping yes_count: u8 => bool;


    const OWNER_INDEX: bool = true;
    const SERIAL_NO_INDEX: bool = true;
    const CHAIN_ID_INDEX: bool = true;
    const TOTAL_VALIDATORS_INDEX: bool = true;
    const THRESHOLD_INDEX: bool = true;

    // The zero address for Aleo
    const ZERO_ADDRESS: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
    const ZERO_ADDRESS_BYTES: [u8; 33] = [
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8
    ];
    const ZERO_ADDRESS_BYTES_SIGNATURE: [u8; 65] = [
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8,
        0u8, 0u8, 0u8, 0u8, 0u8
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
    async transition initialize(public chainId: u128, public owner: address) -> Future{
        return finalize_initialize(chainId, owner);
    }

    async function finalize_initialize(chainId: u128, owner: address) {
        // assert connection contract is not initialized before
        assert(!Mapping::contains(owner_connection, OWNER_INDEX));

        //set chainId and owner
        Mapping::set(chain_id, CHAIN_ID_INDEX, chainId);
        Mapping::set(owner_connection, OWNER_INDEX, owner);
    }



    /////////////////////////////
    /////// Verify Message ///////
    //////////////////////////////

    /// Verify the message in standard SODAX format
    /// Note: This function verify the messages with valid signature and connection serial number
    async transition verify_message(sn: u8, signers: Signers, signs: Signatures) -> Future{
        return finalize_verify_message( sn,  signers, signs);
    }

    async function finalize_verify_message( sn: u8, signers: Signers, signs: Signatures) {
        let yay_count: u8 = 0u8;
        let nay_count: u8 = 0u8;


        // let message_hash: field = Keccak256::hash_to_field(sn);

        // Check if each signer is valid
        let is_valid_1: bool = signers.signer_1 != ZERO_ADDRESS_BYTES && signs.signature_1 != ZERO_ADDRESS_BYTES_SIGNATURE;

        // let bits: [bool; 8] = Serialize::to_bits_raw(sn);
        // assert(Mapping::contains(validators, signers.signer_1));
        let yay1: bool = ECDSA::verify_keccak256(signs.signature_1, signers.signer_1, sn);
        yay_count = yay1 && is_valid_1 ? yay_count + 1u8 : yay_count;
        // Mapping::set(yes_count, sn, yay1);

        // let threshold_vote_count: u8 = Mapping::get(threshold, THRESHOLD_INDEX);
        // votes should crossed threshold limit
        assert(yay_count >= 1u8);

        // verify message
        // Mapping::set(already_processed, message_receipt, true);
    }

}
