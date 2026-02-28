#!/usr/bin/env node
/**
 * Coverage threshold checker for CI
 * Fails the build if coverage is below thresholds
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const COVERAGE_FILE = join(process.cwd(), 'coverage', 'coverage-summary.json');

// Coverage thresholds (percentages)
const THRESHOLDS = {
  lines: 60,       // Start with achievable goals
  branches: 50,
  functions: 60,
  statements: 60,
};

function main() {
  // Check if coverage file exists
  if (!existsSync(COVERAGE_FILE)) {
    console.log('⚠️  No coverage report found. Skipping threshold check.');
    console.log(`   Expected file: ${COVERAGE_FILE}`);
    console.log('   Run "npm run test -- --coverage" to generate coverage.');
    process.exit(0); // Don't fail if no coverage yet
  }

  const coverage = JSON.parse(readFileSync(COVERAGE_FILE, 'utf-8'));
  const total = coverage.total;

  console.log('\n📊 Coverage Report\n');
  console.log('Metric      | Actual | Threshold | Status');
  console.log('------------|--------|-----------|-------');

  let failed = false;

  for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
    const actual = total[metric]?.pct ?? 0;
    const passed = actual >= threshold;
    const status = passed ? '✅' : '❌';
    
    console.log(
      `${metric.padEnd(11)} | ${actual.toFixed(1).padStart(5)}% | ${String(threshold).padStart(8)}% | ${status}`
    );
    
    if (!passed) {
      failed = true;
    }
  }

  console.log('');

  if (failed) {
    console.log('❌ Coverage is below thresholds. Please add more tests.\n');
    process.exit(1);
  } else {
    console.log('✅ All coverage thresholds passed!\n');
    process.exit(0);
  }
}

main();
