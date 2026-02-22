import { resolve } from 'node:path';

export default {
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@world': resolve(import.meta.dirname, '../../world'),
    },
  },
};
