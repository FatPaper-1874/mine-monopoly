# @mine-monopoly/env

Environment variables management with type validation for MineMonopoly project (Node.js **only**).

> **⚠️ Important**: This package is for **Node.js environments only** (server-side). For client-side code (browser/Vite), use `import.meta.env` with `VITE_` prefixed variables instead.

## Features

- Type-safe environment variable access via function calls
- Automatic validation with helpful error messages
- Automatic type conversion (port numbers to `number`)
- Zero-dependency (except `dotenv` for .env file loading)

## Installation

This package is part of the MineMonopoly monorego and is automatically linked via pnpm workspaces.

## Usage

### Basic API

```typescript
import { env } from "@mine-monopoly/env";

// Read environment variables (returns string by default)
const domain = env("FATPAPER_DOMAIN");        // string: "localhost"
const protocol = env("PROTOCOL");             // string: "http"
const dbHost = env("MYSQL_HOST");             // string: "localhost"

// Port numbers are automatically converted to number
const serverPort = env("SERVER_PORT");        // number: 81
const mysqlPort = env("MYSQL_PORT");          // number: 3307
const icePort = env("ICE_SERVER_PORT");       // number: 82

// Use default values for optional variables
const bucketName = env("TC_BUCKET_NAME", ""); // string: "" (empty default)

// Explicit type annotation (when needed)
const port = env<number>("SERVER_PORT");      // number: 81
```

### Computed Properties at Application Level

Since this package no longer includes computed properties, each application computes them as needed:

**Server-side (Node.js):**
```typescript
// In apps/server/app.ts or apps/server/global.config.ts
import { env } from "@mine-monopoly/env";

export const __MONOPOLYSERVER__ = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
```

**Client-side (Browser/Vite):**
```typescript
// In apps/client/global.config.ts or apps/admin/src/utils/axios/index.ts

export const __MONOPOLYSERVER__ = `${import.meta.env.VITE_PROTOCOL}://${import.meta.env.VITE_FATPAPER_DOMAIN}:${import.meta.env.VITE_SERVER_PORT}`;
```

> **Note**: Client-side environment variables must be prefixed with `VITE_` to be exposed by Vite.

## Environment Variables

### Required Variables

#### Server

- `FATPAPER_DOMAIN` - Server domain (default: "localhost")
- `PROTOCOL` - Protocol: "http" or "https" (default: "http")
- `SERVER_PORT` - Main server port (default: 81) → automatically converted to `number`
- `ICE_SERVER_PORT` - ICE server port for WebRTC (default: 82) → automatically converted to `number`
- `MONOPOLY_ADMIN_PORT` - Admin panel port (default: 80) → automatically converted to `number`
- `MYSQL_PORT` - MySQL port (default: 3307) → automatically converted to `number`
- `MYSQL_HOST` - MySQL host (default: "localhost")
- `MYSQL_DATABASE` - MySQL database name (default: "monopoly")
- `MYSQL_USERNAME` - MySQL username (default: "root")
- `MYSQL_PASSWORD` - MySQL password (default: "root")
- `NODE_ENV` - Environment: "development" or "production" (default: "development")

### Client-side (Vite) - Prefix with `VITE_`

For client-side applications (browser), use `VITE_` prefixed variables in `.env`:

- `VITE_PROTOCOL` - Protocol: "http" or "https"
- `VITE_FATPAPER_DOMAIN` - Server domain
- `VITE_SERVER_PORT` - Main server port
- `VITE_ICE_SERVER_PORT` - ICE server port
- `VITE_TC_ID` - Tencent Cloud Secret ID (optional)
- `VITE_TC_KEY` - Tencent Cloud Secret Key (optional)
- `VITE_TC_BUCKET_NAME` - COS bucket name (optional)
- `VITE_TC_REGION` - COS region (optional)

### Optional Variables

#### Tencent Cloud COS (optional)

- `TC_BUCKET_NAME` - COS bucket name
- `TC_REGION` - COS region (e.g., "ap-beijing")
- `TC_ID` - Tencent Cloud Secret ID
- `TC_KEY` - Tencent Cloud Secret Key

## API Reference

### `env<T>(key: string, defaultValue?: T): T`

The core function for reading environment variables.

**Parameters:**
- `key` - Environment variable name (must be uppercase, e.g., `'SERVER_PORT'`)
- `defaultValue` - Optional default value if the variable is not defined

**Returns:**
- The environment variable value with automatic type conversion

**Type Conversion:**
- Port numbers (keys containing `'PORT'` or `'MYSQL_PORT'`) → `number`
- Other variables → `string`
- Use `env<Type>()` to explicitly specify the return type

**Throws:**
- `Error` if the variable is undefined and no default value is provided

## Validation

The package automatically validates environment variables:

- **Port validation**: Checks that ports are valid numbers in range 1-65535
- **Protocol validation**: Ensures protocol is "http" or "https"
- **Required variables**: Throws helpful error messages if required variables are missing

Example error:

```
[@mine-monopoly/env] 环境变量 "SERVER_PORT" 未定义。
请检查 .env 文件中是否配置了 SERVER_PORT。
```

## Type Safety

Port variables (containing "PORT" or "MYSQL_PORT") are automatically converted to `number`:

```typescript
const port = env("SERVER_PORT");  // Type: number (inferred)
```

For explicit type safety, provide the generic type parameter:

```typescript
const port = env<number>("SERVER_PORT");  // Type: number (explicit)
```

## Development

### Server-side (Node.js)

1. Copy `.env.example` to `.env` in the project root
2. Configure your environment variables
3. Import and use: `import { env } from "@mine-monopoly/env"`

### Client-side (Browser/Vite)

1. Use `VITE_` prefixed variables in `.env` (see Client-side section above)
2. Access via `import.meta.env`: `const port = import.meta.env.VITE_SERVER_PORT`
3. **Do not import** `@mine-monopoly/env` in client code

## Migration from Old API

The old API using object property access has been removed:

```typescript
// ❌ OLD API (removed)
import { env, getServerConfig } from "@mine-monopoly/env";
const config = getServerConfig();
const host = config.monopolyServerHost;
const port = env.SERVER_PORT;

// ✅ NEW API (current)
import { env } from "@mine-monopoly/env";
const host = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
const port = env("SERVER_PORT");
```

### Key Changes

1. **Object access → Function calls**: Use `env("KEY")` instead of `env.KEY`
2. **Removed computed properties**: Compute them at application level
3. **Automatic type conversion**: Port numbers are now `number` by default
4. **Explicit types when needed**: Use `env<Type>()` for clarity
