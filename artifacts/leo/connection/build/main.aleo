program connection.aleo;

struct Message:
    sn as u8;
    payload as field;

struct Signers:
    signer_1 as [u8; 33u32];

struct Signatures:
    signature_1 as [u8; 65u32];

struct Receipts:
    sn as u8;
    payload as field;

mapping already_processed:
    key as Receipts.public;
    value as boolean.public;

mapping chain_id:
    key as boolean.public;
    value as u128.public;

mapping owner_connection:
    key as boolean.public;
    value as address.public;

mapping total_validators:
    key as boolean.public;
    value as u8.public;

mapping threshold:
    key as boolean.public;
    value as u8.public;

mapping messages:
    key as field.public;
    value as Message.public;

mapping yes_count:
    key as u8.public;
    value as boolean.public;

function initialize:
    input r0 as u128.public;
    input r1 as address.public;
    async initialize r0 r1 into r2;
    output r2 as connection.aleo/initialize.future;

finalize initialize:
    input r0 as u128.public;
    input r1 as address.public;
    contains owner_connection[true] into r2;
    not r2 into r3;
    assert.eq r3 true;
    set r0 into chain_id[true];
    set r1 into owner_connection[true];

function verify_message:
    input r0 as u8.private;
    input r1 as Signers.private;
    input r2 as Signatures.private;
    async verify_message r0 r1 r2 into r3;
    output r3 as connection.aleo/verify_message.future;

finalize verify_message:
    input r0 as u8.public;
    input r1 as Signers.public;
    input r2 as Signatures.public;
    serialize.bits.raw r0 (u8) into r3 ([boolean; 8u32]);
    ecdsa.verify.keccak256 r2.signature_1 r1.signer_1 r3 into r4;
    set r4 into yes_count[r0];

constructor:
    assert.eq edition 0u16;
