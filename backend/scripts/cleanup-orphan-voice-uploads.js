require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../src/config/database');
const { Attachment } = require('../src/models');

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const APPLY = process.argv.includes('--apply');

const getFileName = (value) => {
  try {
    return path.posix.basename(new URL(String(value)).pathname);
  } catch {
    return '';
  }
};

async function run() {
  const voiceRoot = path.resolve(process.cwd(), 'uploads', 'chat-voices');
  if (!fs.existsSync(voiceRoot)) {
    console.log('Voice upload directory does not exist; nothing to clean.');
    return;
  }

  const realRoot = await fs.promises.realpath(voiceRoot);
  const referencedRows = await Attachment.findAll({
    attributes: ['file_url'],
    where: { file_url: { [Op.like]: '%/uploads/chat-voices/%' } },
    raw: true,
  });
  const referenced = new Set(referencedRows.map((item) => getFileName(item.file_url)).filter(Boolean));
  const entries = await fs.promises.readdir(realRoot, { withFileTypes: true });
  const cutoff = Date.now() - MAX_AGE_MS;
  let candidates = 0;
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !/^[0-9a-f-]+\.m4a$/i.test(entry.name) || referenced.has(entry.name)) continue;
    const candidate = path.resolve(realRoot, entry.name);
    if (!candidate.startsWith(`${realRoot}${path.sep}`)) continue;
    const stats = await fs.promises.lstat(candidate);
    if (stats.isSymbolicLink() || stats.mtimeMs > cutoff) continue;
    candidates += 1;
    if (APPLY) {
      await fs.promises.unlink(candidate);
      removed += 1;
    }
  }

  console.log(APPLY
    ? `Removed ${removed} orphan voice upload(s).`
    : `Dry run: ${candidates} orphan voice upload(s) eligible. Run with --apply to remove.`);
}

run()
  .catch((error) => {
    console.error(`Voice upload cleanup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
