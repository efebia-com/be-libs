# @efebia/yaml-to-ts

CLI tool that generates a TypeScript interface declaration from a YAML file.

## Install

```bash
npm install --save-dev @efebia/yaml-to-ts
# or globally
npm install -g @efebia/yaml-to-ts
```

## Usage

```bash
yaml-to-ts <input-file> [options]
```

### Example

Given `config.yaml`:

```yaml
server:
  host: localhost
  port: 3000
features:
  - name: darkMode
    enabled: true
```

Running:

```bash
yaml-to-ts config.yaml --interface-name Config --out-file config.d.ts
```

Produces `config.d.ts`:

```ts
export interface Config {
    server: {
        host: string;
        port: number;
    };
    features: {
        name: string;
        enabled: boolean;
    }[];
}
```

### Dry run (print to stdout)

```bash
yaml-to-ts config.yaml --dry-run
```

## Options

| Flag | Alias | Type | Default | Description |
|------|-------|------|---------|-------------|
| `<input-file>` | `-i` | `string` | — | **Required.** Path to the input YAML file |
| `--out-file` | `-o` | `string` | `./declaration.d.ts` | Output file path |
| `--interface-name` | `--int` | `string` | `Declaration` | Name of the generated TypeScript interface |
| `--prettier-file` | `-p` | `string` | — | Path to a Prettier config file for formatting the output |
| `--dry-run` | `-d` | `boolean` | `false` | Print the generated declaration to stdout instead of writing to disk |

## Type inference

Types are inferred from the YAML values:

- Strings → `string`
- Numbers → `number`
- Booleans → `boolean`
- Arrays → element type with `[]` suffix (inferred from the first element)
- Nested objects → nested interface shape

## License

ISC
