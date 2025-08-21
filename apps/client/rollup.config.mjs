import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/worker/game-process.ts',  // 你要打包的 TypeScript 文件
  output: {
    file: 'src/worker/game-process.js',  // 输出文件的路径
    format: 'cjs',  // 或者根据需求选择 'esm', 'umd', 'iife'
  },
  plugins: [
    typescript({
      tsconfig: 'src/worker/tsconfig.json'  // 使用 src/worker 目录下的 tsconfig.json
    })
  ]
};
