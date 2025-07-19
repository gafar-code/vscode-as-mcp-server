const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const test = process.argv.includes('--test');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'warning',
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin
    ]
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

async function testBuild() {
  const ctx = await esbuild.context({
    entryPoints: ['src/**/*.ts'],
    bundle: true,
    format: 'cjs',
    minify: false,
    sourcemap: true,
    sourcesContent: false,
    platform: 'node',
    outdir: 'out',
    logLevel: 'warning',
    external: ['vscode'],
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin
    ]
  });
  await ctx.rebuild();
  await ctx.dispose();
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location == null) return;
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  }
};

if (test) {
  testBuild().catch(e => {
    console.error(e);
    process.exit(1);
  });
} else {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
