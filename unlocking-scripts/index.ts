import { opcodes, script } from "bitcoinjs-lib";

// example 1:
// locking script
const example_one_lockingScript = script.compile([opcodes.OP_ADD, script.number.encode(5), opcodes.OP_EQUAL]);

// unlocking script to spend a transaction, where the sum of two nums is equal to 5
const example_one_unlockingScript = script.compile([script.number.encode(1), script.number.encode(4)]);
