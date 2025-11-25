import testnet_compliant_token2.aleo;

// The 'circle_bridge' program.
program compliant_token2_bridge.aleo {
    @custom
    async constructor() {
        if (self.edition > 0) {
            assert_eq(ADMIN_ADDRESS, self.program_owner);
        }
    }

    mapping nullifier: [u8; 32] => bool;

    record BridgedUsdc {
        owner: address,
        amount: u128,
    }

    const ETH_PUBLIC_KEY: [u8; 20] = [27, 227, 26, 148, 54, 26, 57, 27, 186, 251, 42, 76, 205, 112, 79, 87, 220, 4, 212, 187];
    const MAGIC_VALUE: [u8; 4] = [43, 204, 92, 231];
    const SUPPORTED_VERSION: [u8; 4] = [0, 0, 0, 1];
    const DOMAIN: [u8;4] = [0, 0, 39, 18];
    const REMOTE_TOKEN_CONTRACT_ADDRESS: [u8; 32] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 184, 106, 51, 230, 248, 236, 97, 204, 98, 241, 176, 203, 42, 214, 223, 227, 193, 14, 139];
    const MINIMUM_BURN_AMOUNT: u128 = 1000000u128;
    const EMERGENCY_PAUSE_ADDRESS: address = aleo1kypwp5m7qtk9mwazgcpg0tq8aal23mnrvwfvug65qgcg9xvsrqgspyjm6n;
    const ADMIN_ADDRESS: address = aleo1kypwp5m7qtk9mwazgcpg0tq8aal23mnrvwfvug65qgcg9xvsrqgspyjm6n;
    
    // These constants are used to interact with the Circle freeze list program.
    const MAX_TREE_DEPTH: u32 = 15u32;
    const CURRENT_FREEZE_LIST_ROOT_INDEX: u8 = 1u8;
    const PREVIOUS_FREEZE_LIST_ROOT_INDEX: u8 = 2u8;
    const BLOCK_HEIGHT_WINDOW_INDEX: bool = true;
    const ROOT_UPDATED_HEIGHT_INDEX: bool = true;

    mapping paused: bool => bool;
    mapping emergency_paused: bool => bool;

    mapping circle_attester: bool => [u8; 20];

    // This method extracts the recipient address, amount, and nonce field from the payload and verifies the ECDSA signature.
    // A freeze list check is also performed before minting the tokens to the recipient address.
    async transition mint(deposit_input: [u8; 240], sig: [u8; 65], digest: [u8; 32], receiver_merkle_proofs: [MerkleProof; 2]) -> (testnet_compliant_token2.aleo/ComplianceRecord, testnet_compliant_token2.aleo/Token, Future) {
        // Ensure the deposit input starts with the expected magic value.
        let magic_value: [u8; 4] = [deposit_input[0], deposit_input[1], deposit_input[2], deposit_input[3]];
        assert(magic_value == MAGIC_VALUE);

        // // Ensure the deposit input is of the supported version.
        let version: [u8; 4] = [deposit_input[4], deposit_input[5], deposit_input[6], deposit_input[7]];
        assert(version == SUPPORTED_VERSION);

        // Extract the amount from the deposit input bytes.
        let amount_bytes: [u8; 16] = [0u8; 16];
        for i in 0u8..16u8{
            amount_bytes[i] = deposit_input[24u8 + i];
        }
        let amount: u128 = convert_bytes_to_u128(amount_bytes);
        assert(amount > 0u128);

        // Ensure the domain is correct.
        let domain: [u8; 4] = [deposit_input[40], deposit_input[41], deposit_input[42], deposit_input[43]];
        assert(domain == DOMAIN);

        // Ensure the remote token contract address is correct.
        let remote_token_contract_address: [u8; 32] = [0u8; 32];
        for i in 0u8..32u8{
            remote_token_contract_address[i] = deposit_input[44u8 + i];
        }
        assert(remote_token_contract_address == REMOTE_TOKEN_CONTRACT_ADDRESS);

        // Ensure the local token contract address is not the zero address.
        let local_token_contract_address: [u8; 32] = [0u8; 32];
        for i in 0u8..32u8{
            local_token_contract_address[i] = deposit_input[108u8 + i];
        }
        assert (local_token_contract_address != [0u8; 32]);
        // Confirm with Circle if we should verify that the local token contract address matches this program's token contract address.

        // Ensure the local recipient address is not the zero address.
        let local_recipient_address: [u8; 32] = [0u8; 32];
        for i in 0u8..32u8{
            local_recipient_address[i] = deposit_input[76u8 + i];
        }
        assert (local_recipient_address != [0u8; 32]);
        // Convert the local recipient address bytes to an Aleo address type.
        let recipient_address: address = convert_bytes_to_address(local_recipient_address);

        // Verify that the recipient is not frozen in the Circle freeze list.
        let root: field = verify_non_inclusion(recipient_address, receiver_merkle_proofs);

        // Extract the nonce from the deposit input bytes.
        let nonce: [u8; 32] = [0u8; 32];
        for i in 0u8..32u8{
            nonce[i] = deposit_input[204u8 + i];
        }
       
        // Hash the deposit input to compare against the provided digest.
        let deposit_hash_bits = Keccak256::hash_native_raw(deposit_input);
        let deposit_hash = Deserialize::from_bits_raw::[[u8; 32]](deposit_hash_bits);
        assert(deposit_hash == digest);

        // Call the mint private function from the Bridged USDC program.
        let (compliance_record, usdc_record, token_future): (testnet_compliant_token2.aleo/ComplianceRecord, testnet_compliant_token2.aleo/Token, Future) = testnet_compliant_token2.aleo/mint_private(recipient_address, amount);
        let verify_future: Future = finalize_verify_ecdsa(sig, deposit_hash, nonce, root, token_future);
        return (compliance_record, usdc_record, verify_future);
    }

    // This function performs the signature verification, freeze list check, and nullifier check.
    async function finalize_verify_ecdsa(sig: [u8; 65], deposit_hash: [u8; 32], nonce: [u8; 32], root: field, token_future: Future) {
        // Check that the Admin has not paused the bridge.
        let is_paused: bool = paused.get_or_use(true, false);
        assert_eq(is_paused, false);

        // Check that the Merkle root is valid.
        let current_root: field = testnet_freezelist2.aleo/freeze_list_root.get(CURRENT_FREEZE_LIST_ROOT_INDEX);
        let window: u32 = testnet_freezelist2.aleo/block_height_window.get(BLOCK_HEIGHT_WINDOW_INDEX);

        if (current_root != root) {
            let previous_root: field = testnet_freezelist2.aleo/freeze_list_root.get(PREVIOUS_FREEZE_LIST_ROOT_INDEX);
            assert_eq(root, previous_root);
            let updated_height: u32 = testnet_freezelist2.aleo/root_updated_height.get(ROOT_UPDATED_HEIGHT_INDEX);
            assert(updated_height + window > block.height);
        }

        // Check that the emergency pause address has not paused the bridge.
        let is_emergency_paused: bool = emergency_paused.get_or_use(true, false);
        assert_eq(is_emergency_paused, false);
        
        // Check that the Circle attester is set.  If not, use the default ETH public key.
        let circle_attester_key: [u8; 20] = circle_attester.get_or_use(true, ETH_PUBLIC_KEY);
        
        // Verify the ECDSA signature using the provided message and public key.
        let is_valid: bool = ECDSA::verify_digest_eth(sig, circle_attester_key, deposit_hash);
        assert(is_valid);

        // Verify that the nullifier has not been used.
        let contains_bool: bool = nullifier.contains(nonce);
        assert(contains_bool == false);
        nullifier.set(nonce, true);
        token_future.await();
    }

    // Burn transactions will be fully public.  The native domain and native recipient fields are required for Circle compliance.
    async transition burn(public amount: u128, public native_domain: u32, public native_recipient: [u8; 32]) -> Future {
        let sender = self.caller;
        // Circle will inform us of what this amount should be prior to deployment.
        assert(amount > MINIMUM_BURN_AMOUNT);
        // This will make an external call to the burn_public transition in the bridged_usdc.aleo program.
        // Only the bridge program will be able to call this method on the bridged_usdc.aleo program.
        let burn_future: Future = testnet_compliant_token2.aleo/burn_public(sender, amount);
        return async {
            // Check that the Admin has not paused the bridge.
            let is_paused: bool = paused.get_or_use(true, false);
            assert_eq(is_paused, false);
            // Check that the emergency pause address has not paused the bridge.
            let is_emergency_paused: bool = emergency_paused.get_or_use(true, false);
            assert_eq(is_emergency_paused, false);

            // Check that the address is not on the freeze list.
            let is_sender_frozen: bool = testnet_freezelist2.aleo/freeze_list.get_or_use(sender, false);
            assert_eq(is_sender_frozen, false);
            burn_future.await();
        };
    }

    async transition set_pause_status(new_status: bool) -> Future {
        assert_eq(self.caller, ADMIN_ADDRESS);
        return async {
            paused.set(true, new_status);
        };
    }

    async transition set_emergency_pause_status(new_status: bool) -> Future {
        assert_eq(self.caller, EMERGENCY_PAUSE_ADDRESS);
        return async {
            emergency_paused.set(true, new_status);
        };
    }

    async transition set_circle_attester(new_attester: [u8; 20]) -> Future {
        assert_eq(self.caller, ADMIN_ADDRESS);
        return async {
            circle_attester.set(true, new_attester);
        };
    }

    inline convert_bytes_to_u128(amount: [u8; 16]) -> u128 {
        let sum: u128 = 0;
        for i in 0u8..16u8 {
            sum = sum + (amount[i] as u128) * (2u128.pow(8u32 * (15u32 - (i as u32))) as u128);
        }
        return sum;
    }

    inline convert_bytes_to_address(address_bytes: [u8; 32]) -> address {
        let address_bits = Serialize::to_bits_raw(address_bytes);
        let sliced_bits = [false; 253];
        for i in 0u8..253u8 {
            sliced_bits[i] = address_bits[i];
        }
        let recipient_address: address = Deserialize::from_bits_raw::[address](sliced_bits);
        return recipient_address;
    }

    transition address_to_bytes_raw(a: address) -> [u8; 32] {
        let bits = Serialize::to_bits_raw(a);
        let padded_bits = [false; 256];
        for i in 0u8..253u8 {
            padded_bits[i] = bits[i];
        }
        return Deserialize::from_bits_raw::[[u8; 32]](padded_bits);
    }

    // Calculates the hash of two sibling nodes in a Merkle tree.
    // The order of the siblings depends on the index bit (0 = left, 1 = right).
    // Uses Poseidon hash to compute the result.
    inline calculate_hash_for_nodes(sibling1: field, sibling2: field, indexbit: u32) -> field {
        let poseidon_params: [field; 3] = indexbit == 0u32 ? [0field, sibling1, sibling2] : [0field, sibling2, sibling1];
        return Poseidon4::hash_to_field(poseidon_params);
    }

    inline calculate_hash_for_leaves(sibling1: field, sibling2: field, indexbit: u32) -> field {
        let poseidon_params: [field; 3] = indexbit == 0u32 ? [1field, sibling1, sibling2] : [1field, sibling2, sibling1];
        return Poseidon4::hash_to_field(poseidon_params);
    }

    // Calculates the Merkle root and the depth of a Merkle proof path.
    // Iteratively hashes the sibling path based on the leaf index to reconstruct the root.
    // Stops when a zero field is encountered in the siblings array, indicating the end of the valid path.
    // Returns the calculated root and the actual depth reached.
    inline calculate_root_depth_siblings(merkle_proof: MerkleProof) -> (public field, public u32) {
        let root: field = calculate_hash_for_leaves(merkle_proof.siblings[0u8], merkle_proof.siblings[1u8],  merkle_proof.leaf_index % 2u32);
        for i: u32 in 2u32..MAX_TREE_DEPTH + 1u32 {
            if (merkle_proof.siblings[i] == 0field) {
                return (root, i - 1u32);
            }
            root = calculate_hash_for_nodes(root, merkle_proof.siblings[i], (merkle_proof.leaf_index / (2u32**(i-1u32))) % 2u32);
        }
        return (root, MAX_TREE_DEPTH);
    }

    // Verifies non-inclusion of an address in a Merkle tree sorted in ascending order by address (as field).
    // Accepts two Merkle proofs representing the neighboring leaves around the missing address.
    // Returns the common Merkle root if the address is proven to be outside the tree.
    // If the tree is not sorted correctly, this function may return incorrect results.
    inline verify_non_inclusion(addr: address, merkle_proofs: [MerkleProof;2]) -> field {
        let (root1, depth1): (field, u32)= calculate_root_depth_siblings(merkle_proofs[0u32]);
        let (root2, depth2): (field, u32) = calculate_root_depth_siblings(merkle_proofs[1u32]);

        // Ensure the roots from the merkle proofs are the same
        assert_eq(root1, root2);
        
        let addr_field: field = addr as field;
        if (merkle_proofs[0u32].leaf_index == merkle_proofs[1u32].leaf_index) {
            // Ensure that if the address is the most left leaf, it is less than the first sibling
            if (merkle_proofs[0u32].leaf_index == 0u32) {
                assert(addr_field < merkle_proofs[0u32].siblings[0u32]);
            } else {
                // Ensure that if the address is the most right leaf
                let last_index_leaf: u32 = 2u32 ** depth1 - 1u32;
                assert_eq(merkle_proofs[0u32].leaf_index, last_index_leaf);
                // Ensure that the address is bigger than the first sibling
                assert(addr_field > merkle_proofs[0u32].siblings[0u32]);
            }
        } else {
            // Ensure the address is in between the provided leaves
            assert(addr_field > merkle_proofs[0u32].siblings[0u32]);
            assert(addr_field < merkle_proofs[1u32].siblings[0u32]);
            // Ensure that the leaf indexes are not greater than the last possible leaf index
            let last_index_leaf: u32 = 2u32 ** depth1 - 1u32;
            assert(merkle_proofs[1u32].leaf_index <= last_index_leaf);
            // Ensure the leaves are adjacent
            assert_eq(merkle_proofs[0u32].leaf_index + 1u32, merkle_proofs[1u32].leaf_index);
        }
        
        return root1;
    }
}