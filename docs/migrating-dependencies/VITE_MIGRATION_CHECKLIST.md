# Vite Migration Checklist (5.x to 7.x)

## Pre-Update Checks

### 1. Node.js Version
- [x] Current version: 22.18.0 (compatible with Vite 6+)

### 2. Configuration Review
- [ ] Check `vite.config.ts` for deprecated APIs
- [ ] Review `splitVendorChunkPlugin` usage
- [ ] Check `transformIndexHtml` hook usage
- [ ] Verify CSS preprocessor options (Sass legacy API)
- [ ] Review SSR transformation settings

### 3. Plugin Compatibility
- [ ] `@vitejs/plugin-react` - Check version compatibility
- [ ] `vite-plugin-html` - Check version compatibility
- [ ] `vite-tsconfig-paths` - Check version compatibility
- [ ] Custom plugins - Check for deprecated APIs

### 4. Environment Variables
- [ ] Check `import.meta.env` usage
- [ ] Review environment variable handling in config

## Update Process

### Step 1: Update Vite to Version 6 (Intermediate Step)
```bash
npm install vite@^6.0.0 @vitejs/plugin-react@^4.0.0 vite-plugin-html@^4.0.0 vite-tsconfig-paths@^5.0.0
```

### Step 2: Address Vite 6 Breaking Changes
- [ ] Update browser targets if needed
- [ ] Remove Sass legacy API usage if any
- [ ] Replace deprecated `splitVendorChunkPlugin`
- [ ] Update `transformIndexHtml` hook usage
- [ ] Check CSS preprocessor configurations

### Step 3: Test Vite 6
- [ ] Run development server: `npm run dev:client`
- [ ] Build project: `npm run build:client`
- [ ] Test preview server: `npm run preview`
- [ ] Verify all functionality works correctly

### Step 4: Update to Vite 7
```bash
npm install vite@^7.1.3 @vitejs/plugin-react@^4.0.0 vite-plugin-html@^4.0.0 vite-tsconfig-paths@^5.0.0
```

### Step 5: Address Vite 7 Breaking Changes
- [ ] Update Node.js version requirements (already met)
- [ ] Remove SSR transform line offset preservation if used
- [ ] Update Sass API usage
- [ ] Remove deprecated APIs
- [ ] Check SSR transformation settings
- [ ] Review build target settings

### Step 6: Test Vite 7
- [ ] Run development server: `npm run dev:client`
- [ ] Build project: `npm run build:client`
- [ ] Test preview server: `npm run preview`
- [ ] Verify all functionality works correctly

## Post-Update Verification

### 1. Development Environment
- [ ] Hot Module Replacement works correctly
- [ ] Proxy settings work for API calls
- [ ] Environment variables are correctly loaded
- [ ] All aliases resolve correctly

### 2. Build Process
- [ ] Build completes without errors
- [ ] Output files are correctly structured
- [ ] Asset paths are correct
- [ ] Bundle sizes are reasonable

### 3. Production Preview
- [ ] Preview server starts correctly
- [ ] All routes work correctly
- [ ] Static assets load properly
- [ ] API proxy works in preview

### 4. Application Functionality
- [ ] React components render correctly
- [ ] All UI interactions work
- [ ] File upload functionality works
- [ ] Data processing works correctly

## Rollback Plan
If issues are encountered:
1. Revert package.json changes
2. Run `npm install` to restore previous versions
3. Restore from backup tag if needed