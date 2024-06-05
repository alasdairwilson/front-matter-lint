import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import frontMatter from 'front-matter';
import { load, YAMLException } from 'js-yaml';
import chalk from 'chalk';

const directoryPath = process.argv[2] || '.';
let hasErrors = false;
const errorSummary = [];

function checkFrontMatter(filePath) {
  try {
    const fileContents = readFileSync(filePath, 'utf8');
    const parsed = frontMatter(fileContents, { allowUnsafe: true });
    load(parsed.attributes);
    console.log((`✅ ${filePath}` + chalk.green(` passed.`)));
    return true;
  } catch (e) {
    hasErrors = true;
    const errorMessage = chalk.red(`❌ Invalid front matter in ${filePath}: ${e.message}`);
    console.error(errorMessage);

    let context = '';
    if (e instanceof YAMLException && e.mark) {
      const { line, column, position } = e.mark;
      const start = Math.max(0, position - 20);
      const end = Math.min(fileContents.length, position + 20);
      context = fileContents.slice(start, end).replace(/\n/g, '\\n');
      console.error(chalk.yellow(`   at line ${line + 1}, column ${column + 1}`));
      console.error(chalk.yellow(`   Context: "${context}"`));
    }

    errorSummary.push({ filePath, message: e.message, context });
    return false;
  }
}

function walkDirectory(directory) {
  const files = readdirSync(directory);

  for (const file of files) {
    const fullPath = join(directory, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkDirectory(fullPath);
    } else if (extname(fullPath) === '.md') {
      checkFrontMatter(fullPath);
    }
  }
}

walkDirectory(directoryPath);

if (hasErrors) {
  console.log(chalk.red('\nSome errors were encountered:'));
  errorSummary.forEach((error, index) => {
    console.log(chalk.red(`\nError ${index + 1}:`));
    console.log(chalk.red(`File: ${error.filePath}`));
    console.log(chalk.red(`Reason: ${error.message}`));
    if (error.context) {
      console.log(chalk.yellow(`${error.context}`));
    }
  });
  process.exitCode = 1;
} else {
  console.log(chalk.green('All front matter passed.'));
}
