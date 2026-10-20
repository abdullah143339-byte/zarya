const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_HOST = process.env.APP_URL || 'https://zarya-backend-2-production.up.railway.app';
const BASE = NEW_HOST.replace(/\/$/, '');

function fixString(v) {
  if (typeof v !== 'string' || !v) return v;
  return v.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, BASE);
}

function fixJson(v) {
  if (v === undefined || v === null) return v;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return fixString(v); }
  }
  const str = JSON.stringify(v);
  if (!str.includes('localhost')) return v;
  const fixed = str.replace(/http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, BASE);
  try { return JSON.parse(fixed); } catch { return v; }
}

function patchStr(model, id, data) {
  return prisma[model].update({ where: { id }, data });
}

async function main() {
  let counts = { users: 0, profiles: 0, posts: 0, messages: 0, stories: 0 };

  const users = await prisma.user.findMany({ select: { id: true, avatar: true, coverImage: true } });
  for (const u of users) {
    const avatar = fixString(u.avatar);
    const coverImage = fixString(u.coverImage);
    if (avatar !== u.avatar || coverImage !== u.coverImage) {
      await patchStr('user', u.id, { avatar, coverImage });
      counts.users++;
    }
  }

  const profiles = await prisma.profile.findMany({ select: { id: true, resumeUrl: true } });
  for (const p of profiles) {
    const resumeUrl = fixString(p.resumeUrl);
    if (resumeUrl !== p.resumeUrl) {
      await patchStr('profile', p.id, { resumeUrl });
      counts.profiles++;
    }
  }

  const posts = await prisma.post.findMany({ select: { id: true, media: true } });
  for (const p of posts) {
    const media = fixJson(p.media);
    if (JSON.stringify(media) !== JSON.stringify(p.media)) {
      await patchStr('post', p.id, { media });
      counts.posts++;
    }
  }

  const messages = await prisma.message.findMany({ select: { id: true, media: true } });
  for (const m of messages) {
    const media = fixJson(m.media);
    if (JSON.stringify(media) !== JSON.stringify(m.media)) {
      await patchStr('message', m.id, { media });
      counts.messages++;
    }
  }

  const stories = await prisma.story.findMany({ select: { id: true, media: true } });
  for (const s of stories) {
    const media = fixJson(s.media);
    if (JSON.stringify(media) !== JSON.stringify(s.media)) {
      await patchStr('story', s.id, { media });
      counts.stories++;
    }
  }

  console.log(`FIX_URLS ${JSON.stringify(counts)} base=${BASE}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('FIX_URLS_ERROR:', e.message); process.exit(1); });