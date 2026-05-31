#!/usr/bin/env node

const { main } = require('../src/index');

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
