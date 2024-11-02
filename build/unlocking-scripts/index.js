"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
// example 1:
// locking script
const example_one_lockingScript = bitcoinjs_lib_1.script.compile([bitcoinjs_lib_1.opcodes.OP_ADD, bitcoinjs_lib_1.script.number.encode(5), bitcoinjs_lib_1.opcodes.OP_EQUAL]);
// unlocking script to spend a transaction, where the sum of two nums is equal to 5
const example_one_unlockingScript = bitcoinjs_lib_1.script.compile([bitcoinjs_lib_1.script.number.encode(1), bitcoinjs_lib_1.script.number.encode(4)]);
