import { createProgram } from './program.ts';

const program = createProgram();
program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
