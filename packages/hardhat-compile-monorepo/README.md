# @efebia/hardhat-compile-monorepo

Hardhat plugin that compiles Solidity contracts from multiple monorepo packages in a single `hardhat compile` run.

## Install

```bash
npm install @efebia/hardhat-compile-monorepo
```

## Usage

Import the plugin in your Hardhat config:

```ts
// hardhat.config.ts
import '@efebia/hardhat-compile-monorepo';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  compileMonorepo: {
    // Packages whose Solidity files should be included in compilation.
    // Each entry must be resolvable via require() from the Hardhat project root.
    paths: ['@my-org/contracts-core', '@my-org/contracts-utils'],
  },
};

export default config;
```

Running `npx hardhat compile` will:
1. Resolve each package in `paths` and copy stub `.sol` import files into a temporary directory inside `sources`
2. Run the standard Hardhat compile task
3. Clean up the temporary directory (unless `keep: true`)

## Configuration

All options go under the `compileMonorepo` key in `hardhat.config`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paths` | `string[]` | `[]` | Packages or `.sol` file paths to include. Must be `require()`-resolvable. |
| `path` | `string` | `'@efebia/hardhat-compile-monorepo'` | Subdirectory inside `sources` used as the temporary output directory. |
| `keep` | `boolean` | `false` | Keep the temporary directory after compilation (useful for debugging). |

## How it works

For each entry in `paths`:
- If the entry has no file extension, it is treated as an npm package. The plugin resolves the package, reads its `files` field from `package.json`, and includes all matching `.sol` files.
- If the entry has a `.sol` extension, it is treated as a direct file import.

Stub `.sol` files are generated with a single `import` statement pointing to the original source, then fed to the Hardhat compiler. The temporary directory is tracked with a hidden marker file so the plugin never accidentally deletes user-owned directories.

## License

MIT
