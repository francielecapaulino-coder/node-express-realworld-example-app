import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Conduit API - Node/Express RealWorld Example',
      version: '1.0.0',
      description: `
 Backend implementation of the RealWorld API spec using Node.js, Express, TypeScript, and Prisma.
 
 This API follows the RealWorld specification for a medium.com-like social blogging platform.
 
 ### Authentication
 The API uses JWT tokens for authentication. Include the token in the Authorization header:
 
 \`Authorization: Token <JWT_TOKEN>\`
 
 or
 
 \`Authorization: Bearer <JWT_TOKEN>\`
 
 ### Error Format
 All error responses follow this format:
 
 \`\`\`json
 {
   "errors": {
     "field": ["error message"]
   }
 }
 \`\`\`
 
 ### Response Envelopes
 API responses use RealWorld envelopes:
 
 - \`{ article }\` - Single article
 - \`{ articles, articlesCount }\` - List of articles  
 - \`{ user }\` - Single user
 - \`{ comment }\` - Single comment
 - \`{ comments }\` - List of comments
 - \`{ tags }\` - List of tags
 - \`{ profile }\` - User profile
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development API server',
      },
    ],
    components: {
      securitySchemes: {
        TokenAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'JWT Token authentication. Use "Token <jwt>" format.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email (unique)',
            },
            username: {
              type: 'string',
              description: 'Username (unique, alphanumeric + hyphens)',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password (min 8 characters)',
            },
            image: {
              type: 'string',
              format: 'uri',
              description: 'URL to user image profile',
              nullable: true,
            },
            bio: {
              type: 'string',
              description: 'User biography',
              nullable: true,
            },
          },
          required: ['email', 'username', 'password'],
        },
        UserResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/UserData',
            },
          },
        },
        UserData: {
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'JWT authentication token',
                },
              },
            },
          ],
          required: ['email', 'username', 'token'],
        },
        Article: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Article title',
            },
            description: {
              type: 'string',
              description: 'Article description/summary',
            },
            body: {
              type: 'string',
              description: 'Article content in Markdown',
            },
            tagList: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of article tags',
            },
          },
          required: ['title', 'description', 'body'],
        },
        ArticleResponse: {
          type: 'object',
          properties: {
            article: {
              $ref: '#/components/schemas/ArticleData',
            },
          },
        },
        ArticleData: {
          allOf: [
            { $ref: '#/components/schemas/Article' },
            {
              type: 'object',
              properties: {
                slug: {
                  type: 'string',
                  description: 'URL-friendly article identifier',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Article creation timestamp',
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Article last update timestamp',
                },
                favorited: {
                  type: 'boolean',
                  description: 'Whether current user favorited this article',
                },
                favoritesCount: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Number of users who favorited this article',
                },
                bookmarked: {
                  type: 'boolean',
                  description: 'Whether current user bookmarked this article',
                },
                bookmarksCount: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Number of users who bookmarked this article',
                },
                author: {
                  $ref: '#/components/schemas/Profile',
                },
              },
            },
          ],
        },
        ArticlesResponse: {
          type: 'object',
          properties: {
            articles: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ArticleData',
              },
            },
            articlesCount: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of articles matching the query',
            },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username',
            },
            bio: {
              type: 'string',
              description: 'User biography',
              nullable: true,
            },
            image: {
              type: 'string',
              format: 'uri',
              description: 'URL to user image profile',
              nullable: true,
            },
            following: {
              type: 'boolean',
              description: 'Whether current user follows this profile',
            },
          },
          required: ['username'],
        },
        ProfileResponse: {
          type: 'object',
          properties: {
            profile: {
              $ref: '#/components/schemas/Profile',
            },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Comment ID',
            },
            body: {
              type: 'string',
              description: 'Comment content',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Comment creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Comment last update timestamp',
            },
            author: {
              $ref: '#/components/schemas/Profile',
            },
          },
        },
        CommentResponse: {
          type: 'object',
          properties: {
            comment: {
              $ref: '#/components/schemas/Comment',
            },
          },
        },
        CommentsResponse: {
          type: 'object',
          properties: {
            comments: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Comment',
              },
            },
          },
        },
        TagsResponse: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
        authRequired: {
          type: 'object',
          properties: {
            security: [{ TokenAuth: [] }],
          },
        },
      },
    },
  },
  apis: [
    './src/app/routes/**/*.ts',
    './src/app/routes/auth/auth.controller.ts',
    './src/app/routes/article/article.controller.ts', 
    './src/app/routes/profile/profile.controller.ts',
    './src/app/routes/tag/tag.controller.ts',
    './src/main.ts',
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI route
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Conduit API Documentation',
  }));

  // JSON spec route
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export { specs };