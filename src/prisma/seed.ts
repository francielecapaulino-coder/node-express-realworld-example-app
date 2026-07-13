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

// index disambiguates the title (and therefore the derived slug,
// `${slugify(title)}-${id}`) when randPhrase() happens to generate the
// same phrase twice for the same user — plausible across 12 articles per
// user given its dictionary size, and would otherwise fail with a
// "title must be unique" 422.
export const generateArticle = async (id: number, index: number) =>
  createArticle(
    {
      title: `${randPhrase()} ${index}`,
      description: randParagraph(),
      body: randLines({ length: 10 }).join(' '),
      tagList: randWord({ length: 4 }),
    },
    id,
  );

export const generateComment = async (id: number, slug: string) =>
  addComment(randParagraph(), slug, id);

const main = async () => {
  // Users and articles are each created sequentially: their uniqueness
  // checks (email/username, article slug) are a separate read then a
  // write, not one atomic step, so firing them concurrently for values
  // that can collide (e.g. the same user's articles, whose slugs all
  // include that user's id) reliably races. Comments have no uniqueness
  // constraint at all, so those stay parallel across users.
  const users: RegisteredUser[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (let i = 0; i < 12; i++) {
    users.push(await generateUser());
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const user of users) {
    const articles = [];
    // eslint-disable-next-line no-restricted-syntax
    for (let i = 0; i < 12; i++) {
      articles.push(await generateArticle(user.id, i));
    }

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
