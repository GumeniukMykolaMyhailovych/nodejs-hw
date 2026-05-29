import fs from 'fs/promises';

export const readTemplate = async (
  templatePath,
) => {
  return await fs.readFile(
    templatePath,
    'utf-8',
  );
};