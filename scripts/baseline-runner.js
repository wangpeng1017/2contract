#!/usr/bin/env node

/**
 * Baseline Test Runner (extended)
 * - 汇总本地无外部依赖的测试脚本，生成基线报告（JSON + Markdown）
 * - 追加 type-check 与 lint 摘要（不阻断，仅记录）
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const REPORT_DIR = PROJECT_ROOT;
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_JSON = path.join(REPORT_DIR, `baseline-report-${TS}.json`);
const REPORT_MD = path.join(REPORT_DIR, `baseline-report-${TS}.md`);

// 候选测试脚本（纯本地）
const TEST_SCRIPTS = [
  'simple-test.js',
  'test-replace-fix-verification.js',
  'test-replace-diagnostics.js',
];

function getCmd(bin) {
  if (process.platform === 'win32') {
    return bin + '.cmd';
  }
  return bin;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      shell: false,
      ...opts,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      const duration = Date.now() - start;
      resolve({ code, duration, stdout, stderr });
    });
  });
}

function runNpm(args) {
  return run(getCmd('npm'), args, { shell: process.platform === 'win32' });
}

function runNodeScript(scriptPath) {
  return run(process.execPath, [scriptPath]);
}

async function main() {
  const results = [];

  // 过滤不存在的脚本
  const scriptsToRun = TEST_SCRIPTS.filter((p) => fs.existsSync(path.join(PROJECT_ROOT, p)));

  if (scriptsToRun.length === 0) {
    console.log('未找到可执行的基线脚本，跳过。');
    process.exit(0);
  }

  console.log('🧪 运行基线测试套件（本地脚本）');
  console.log('='.repeat(60));

  for (const rel of scriptsToRun) {
    const abs = path.join(PROJECT_ROOT, rel);
    console.log(`\n▶️  执行: ${rel}`);
    const r = await runNodeScript(abs);

    const passed = r.code === 0;
    console.log(`   结果: ${passed ? '✅ 通过' : '❌ 失败'} (${r.duration}ms, exit=${r.code})`);

    results.push({
      kind: 'script',
      name: rel,
      path: rel,
      exitCode: r.code,
      durationMs: r.duration,
      passed,
      stdoutPreview: r.stdout.slice(0, 8000),
      stderrPreview: r.stderr.slice(0, 8000),
    });
  }

  // 追加 type-check 与 lint（不阻断）
  console.log('\n🔎 收集 type-check 与 lint 摘要（不阻断）');
  const typeCheck = await runNpm(['run', 'type-check']);
  const lint = await runNpm(['run', 'lint']);

  const summary = {
    scripts: {
      total: results.length,
      passed: results.filter((x) => x.passed).length,
      failed: results.filter((x) => !x.passed).length,
    },
    typeCheck: { exitCode: typeCheck.code, durationMs: typeCheck.duration },
    lint: { exitCode: lint.code, durationMs: lint.duration },
    ts: TS,
  };

  const report = { summary, results, extra: {
    typeCheck: {
      stdoutPreview: typeCheck.stdout.slice(0, 8000),
      stderrPreview: typeCheck.stderr.slice(0, 8000),
    },
    lint: {
      stdoutPreview: lint.stdout.slice(0, 8000),
      stderrPreview: lint.stderr.slice(0, 8000),
    },
  }};

  // 写 JSON 报告
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), 'utf8');

  // 写 Markdown 报告
  const md = [
    `# 基线测试报告 (${TS})`,
    '',
    `- 脚本总数: ${summary.scripts.total}`,
    `- 通过: ${summary.scripts.passed}`,
    `- 失败: ${summary.scripts.failed}`,
    `- type-check: exit=${summary.typeCheck.exitCode}, ${summary.typeCheck.durationMs}ms`,
    `- lint: exit=${summary.lint.exitCode}, ${summary.lint.durationMs}ms`,
    '',
    '## 脚本详情',
    ...results.map((r) => {
      return [
        `### ${r.name}`,
        '',
        `- 结果: ${r.passed ? '✅ 通过' : '❌ 失败'}`,
        `- 时长: ${r.durationMs}ms`,
        `- 退出码: ${r.exitCode}`,
        '',
        '<details><summary>stdout</summary>',
        '',
        '```',
        r.stdoutPreview || '(empty)',
        '```',
        '',
        '</details>',
        '',
        r.stderrPreview
          ? ['<details><summary>stderr</summary>', '', '```', r.stderrPreview, '```', '', '</details>'].join('\n')
          : '',
        '',
      ].join('\n');
    }),
    '',
    '## type-check 摘要',
    '<details><summary>输出</summary>',
    '',
    '```',
    report.extra.typeCheck.stdoutPreview || '(empty)',
    '```',
    '',
    '</details>',
    '',
    '## lint 摘要',
    '<details><summary>输出</summary>',
    '',
    '```',
    report.extra.lint.stdoutPreview || '(empty)',
    '```',
    '',
    '</details>',
  ].join('\n');

  fs.writeFileSync(REPORT_MD, md, 'utf8');

  console.log('\n📄 报告已生成:');
  console.log(' - JSON: ' + REPORT_JSON);
  console.log(' - MD:   ' + REPORT_MD);

  // 退出码：仍以脚本失败为准（type-check/lint 只记录，不阻断）
  const failed = summary.scripts.failed > 0 ? 1 : 0;
  process.exit(failed);
}

main().catch((err) => {
  console.error('基线测试执行失败:', err);
  process.exit(1);
});

