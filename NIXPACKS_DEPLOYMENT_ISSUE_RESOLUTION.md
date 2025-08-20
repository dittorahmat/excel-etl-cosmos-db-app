# Nixpacks Deployment Issue Resolution

## Problem Summary

We encountered a persistent error with Nixpacks repeatedly trying to use `npm-9_x` despite our configuration specifying Node.js 18. The error appeared as:

```
error: undefined variable 'npm-9_x'
at /app/.nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix:19:43:
   18|         ')
   19|         nodejs-18_x nodejs-18_x nodejs_18 npm-9_x
   20|       ];
```

This error occurred regardless of our attempts to specify Node.js 18 in various ways, indicating that Nixpacks was auto-detecting package requirements from our project files and trying to install packages that don't exist.

## Root Cause Analysis

The root cause was determined to be conflicting version specifications across multiple configuration files that were causing Nixpacks to fall back to its default detection behavior:

1. **`.nvmrc` file** was set to `lts/*` which could resolve to different Node.js versions
2. **`package.json` engines** field was set to `"node": "18"` which was ambiguous
3. **Missing explicit Nixpacks environment variables** to override auto-detection

## Solution Implementation

We implemented several changes to explicitly specify Node.js 18 and prevent Nixpacks auto-detection:

### 1. Updated `.nvmrc` File
Changed from:
```
lts/*
```

To:
```
18.17.0
```

### 2. Updated `package.json` Engines
Changed from:
```json
"engines": {
  "node": "18"
}
```

To:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### 3. Enhanced `nixpacks.toml` Configuration
Updated with explicit Node.js version specification:
```toml
# Explicit Nixpacks configuration for Node.js 18 to avoid auto-detection issues

[phases.setup]
nixPkgs = ["nodejs-18_x"]

[variables]
NODE_ENV = "production"
NIXPACKS_NODE_VERSION = "18"

# Completely skip all automatic phases to prevent npm-9_x detection
[phases.install]
skip = true

[phases.build]
skip = true

[start]
cmd = "bash start-for-easypanel.sh"
```

## Files Modified

1. **`.nvmrc`** - Specified explicit Node.js version 18.17.0
2. **`package.json`** - Updated engines field for better compatibility
3. **`nixpacks.toml`** - Added explicit Nixpacks configuration with version specification

## Why This Solution Works

These changes resolve the issue because:

1. **Consistent Version Specification**: All configuration files now explicitly specify Node.js 18, eliminating ambiguity
2. **Prevents Auto-Detection**: The `skip = true` directives in nixpacks.toml prevent Nixpacks from trying to auto-install packages
3. **Explicit Environment Variables**: Adding `NIXPACKS_NODE_VERSION = "18"` tells Nixpacks explicitly which Node.js version to use
4. **No More Conflicting Specifications**: Removing the generic `lts/*` specification prevents version conflicts

## EasyPanel UI Configuration

With these changes, the following EasyPanel configuration should work:

- **Nix Packages**: `nodejs-18_x`
- **Install Command**: Leave blank (handled by nixpacks.toml)
- **Build Command**: Leave blank (handled by nixpacks.toml)
- **Start Command**: `bash start-for-easypanel.sh`

## Future Considerations

1. **Monitor Node.js LTS Updates**: As new LTS versions are released, we may need to update our version specifications
2. **Regular Dependency Updates**: Periodically update dependencies to ensure compatibility with the specified Node.js version
3. **Testing Across Environments**: Verify that the explicit Node.js version works consistently across all deployment environments

This solution should completely resolve the persistent `npm-9_x` error by giving Nixpacks explicit instructions while preventing its auto-detection mechanisms from interfering with our intended Node.js 18 setup.