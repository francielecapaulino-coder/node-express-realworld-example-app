import {
  randEmail,
  randFullName,
  randLines,
  randParagraph,
  randPassword, randPhrase,
  randWord
} from '@ngneat/falso';
import { RegisteredUser } from '../app/routes/auth/registered-user.model';
import { createUser } from '../app/routes/auth/auth.service';
import { createArticle } from '../app/routes/article/article.service';
import { addComment } from '../app/routes/comment/comment.service';
import prisma from './prisma-client';

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Refusing to run the seed script with NODE_ENV=production — it creates fake accounts and content and is only meant for local/dev databases.',
  );
}

export const generateUser = async (): Promise<RegisteredUser> =>
  createUser({
    username: randFullName(),
    email: randEmail(),
    password: randPassword(),
    image: 'https://api.realworld.io/images/demo-avatar.png',
    demo: true,
  });

export const generateArticle = async (id: number) =>
  createArticle(
    {
      title: randPhrase(),
      description: randParagraph(),
      body: randLines({ length: 10 }).join(' '),
      tagList: randWord({ length: 4 }),
    },
    id,
  );

export const generateComment = async (id: number, slug: string) =>
  addComment(randParagraph(), slug, id);

const main = async () => {
  const users = await Promise.all(Array.from({ length: 12 }, () => generateUser()));

  // eslint-disable-next-line no-restricted-syntax
  for (const user of users) {
    const articles = await Promise.all(Array.from({ length: 12 }, () => generateArticle(user.id)));

    // eslint-disable-next-line no-restricted-syntax
    for (const article of articles) {
      await Promise.all(users.map((userItem) => generateComment(userItem.id, article.slug)));
    }
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
