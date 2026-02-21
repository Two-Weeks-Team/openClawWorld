import { defineConfig } from 'orval';

export default defineConfig({
  openClawWorld: {
    input: {
      target: './packages/server/src/generated/openapi.json',
    },
    output: {
      target: './packages/plugin/src/generated/endpoints.ts',
      client: 'fetch',
      mode: 'single',
      baseUrl: '',
      override: {
        mutator: {
          path: './packages/plugin/src/custom-fetch.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
