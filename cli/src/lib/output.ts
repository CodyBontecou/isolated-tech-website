import chalk from 'chalk';

export interface OutputOptions {
  json: boolean;
}

let globalJsonMode = false;

export function setJsonMode(enabled: boolean): void {
  globalJsonMode = enabled;
}

export function isJsonMode(): boolean {
  return globalJsonMode;
}

/**
 * Output data - JSON if --json flag, otherwise pretty-printed
 */
export function output(data: unknown): void {
  if (globalJsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    prettyPrint(data);
  }
}

/**
 * Output success message
 */
export function success(message: string, data?: Record<string, unknown>): void {
  if (globalJsonMode) {
    console.log(JSON.stringify({ success: true, message, ...data }, null, 2));
  } else {
    console.log(chalk.green('✓'), message);
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        console.log(chalk.gray(`  ${key}:`), value);
      });
    }
  }
}

/**
 * Output error message
 */
export function error(
  code: string,
  message: string,
  fix?: string
): void {
  if (globalJsonMode) {
    console.log(JSON.stringify({ 
      success: false, 
      error: code, 
      message,
      ...(fix && { fix })
    }, null, 2));
  } else {
    console.error(chalk.red('✗'), message);
    if (fix) {
      console.error(chalk.yellow('  →'), fix);
    }
  }
}

/**
 * Output warning message
 */
export function warn(message: string): void {
  if (globalJsonMode) {
    // Warnings go to stderr in JSON mode to not pollute output
    console.error(JSON.stringify({ warning: message }));
  } else {
    console.log(chalk.yellow('⚠'), message);
  }
}

/**
 * Output info message (only in non-JSON mode)
 */
export function info(message: string): void {
  if (!globalJsonMode) {
    console.log(chalk.blue('ℹ'), message);
  }
}

/**
 * Pretty print an object for human consumption
 */
function prettyPrint(data: unknown, indent = 0): void {
  const pad = '  '.repeat(indent);
  
  if (data === null || data === undefined) {
    console.log(pad + chalk.gray('null'));
    return;
  }
  
  if (typeof data !== 'object') {
    console.log(pad + String(data));
    return;
  }
  
  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      if (typeof item === 'object' && item !== null) {
        console.log(pad + chalk.gray(`[${i}]`));
        prettyPrint(item, indent + 1);
      } else {
        console.log(pad + chalk.gray('-'), item);
      }
    });
    return;
  }
  
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      console.log(pad + chalk.cyan(key) + ':');
      prettyPrint(value, indent + 1);
    } else if (typeof value === 'boolean') {
      console.log(pad + chalk.cyan(key) + ':', value ? chalk.green('yes') : chalk.red('no'));
    } else {
      console.log(pad + chalk.cyan(key) + ':', value);
    }
  });
}

/**
 * Create a header banner
 */
export function banner(title: string): void {
  if (globalJsonMode) return;
  
  console.log();
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.gray('  ' + '─'.repeat(title.length + 2)));
  console.log();
}

/**
 * Print a key-value pair
 */
export function kv(key: string, value: unknown): void {
  if (globalJsonMode) return;
  console.log(chalk.gray(`  ${key}:`), value);
}
