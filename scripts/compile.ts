import solc from 'solc';
import fs from 'fs';
import path from 'path';

// Read the contract source code
const contractPath = path.join(process.cwd(), 'src/services/bsc', 'MemeToken.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Prepare the input for the compiler
const input = {
  language: 'Solidity',
  sources: {
    'MemeToken.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

// Compile the contract
console.log('🔨 Compiling MemeToken contract...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const hasErrors = output.errors.some((error: any) => error.severity === 'error');
  if (hasErrors) {
    console.error('❌ Compilation errors:');
    output.errors.forEach((error: any) => console.error(error.formattedMessage));
    process.exit(1);
  }
}

const contract = output.contracts['MemeToken.sol']['MemeToken'];
const bytecode = '0x' + contract.evm.bytecode.object;
const abi = contract.abi;

console.log('✅ Contract compiled successfully!');
console.log(`📝 Bytecode length: ${bytecode.length} characters`);
console.log(`🔧 Compiler version: ${solc.version()}`);

// Create a compiled output file
const compiledDir = path.join(process.cwd(), 'src/services/bsc');
if (!fs.existsSync(compiledDir)) {
  fs.mkdirSync(compiledDir, { recursive: true });
}

const outputPath = path.join(compiledDir, 'MemeToken.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      abi,
      bytecode,
      compiler: solc.version(),
    },
    null,
    2
  )
);

console.log(`💾 Saved compiled contract to ${outputPath}`);
