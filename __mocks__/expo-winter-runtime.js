// Node.js already provides TextDecoder, URL, structuredClone etc. natively.
// Stubbing expo's winter runtime prevents jest 30's stricter module scope
// enforcement from rejecting lazy require() calls inside global getters.
