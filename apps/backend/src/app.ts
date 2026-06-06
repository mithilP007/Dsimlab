import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fs from 'fs';
import path from 'path';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { auth } from './auth/better-auth';
import { prisma } from './db/client';
import { logger } from './utils/logger';
import { AppError } from './utils/errors';
import { config } from './config';

// Route Imports
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { simulationRoutes } from './routes/simulation.routes';
import { seoRoutes } from './routes/seo.routes';
import { googleAdsRoutes } from './routes/google-ads.routes';
import { metaAdsRoutes } from './routes/meta-ads.routes';
import { metricsRoutes } from './routes/metrics.routes';
import { eventsRoutes } from './routes/events.routes';
import { scoringRoutes } from './routes/scoring.routes';
import { classRoutes } from './routes/class.routes';
import { scenarioRoutes } from './routes/scenario.routes';
import { certificateRoutes } from './routes/certificate.routes';
import { reportRoutes } from './routes/report.routes';
import { auditRoutes } from './routes/audit.routes';
import { requireAuth, AuthenticatedRequest } from './auth/middleware';
import { apiContractRoutes } from './routes/api-contract.routes';

export const app = Fastify({
  logger: false, // We use custom Pino logger
});

// Configure CORS
app.register(cors, {
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

// Register Helmet
app.register(helmet, {
  contentSecurityPolicy: false,
});

// Register Global Rate Limiting
app.register(rateLimit, {
  max: config.RATE_LIMIT_MAX || 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
});

// Register Swagger
app.register(swagger, {
  openapi: {
    info: {
      title: 'Digital Marketing Simulation Lab API',
      description: 'API documentation for Digital Marketing Simulation Lab backend',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
        },
      },
    },
    paths: {
      '/api/auth/sign-up/email': {
        post: {
          summary: 'Sign up a new user using email and password',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string', minLength: 1 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Successful registration',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          email: { type: 'string' },
                          role: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/sign-in/email': {
        post: {
          summary: 'Sign in an existing user using email and password',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Successful sign-in',
              headers: {
                'Set-Cookie': {
                  schema: { type: 'string' },
                  description: 'Better Auth session cookie',
                },
              },
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          email: { type: 'string' },
                          role: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

// Register Swagger UI
app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Export OpenAPI JSON to root of backend on startup
app.ready().then(() => {
  try {
    const openapiObject = (app as any).swagger();
    const outputPath = path.join(__dirname, '../openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(openapiObject, null, 2), 'utf8');
    logger.info(`OpenAPI JSON exported successfully to ${outputPath}`);
  } catch (err) {
    logger.error(err, 'Failed to export OpenAPI JSON');
  }
});

// Custom register routes matching frontend API requirements
app.post('/api/auth/register/individual', async (request, reply) => {
  const body = request.body as any;
  const webRequest = new Request(`${request.protocol}://${request.hostname}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      name: body.name,
      role: 'INDIVIDUAL',
    }),
  });
  const webResponse = await auth.handler(webRequest);
  webResponse.headers.forEach((value, key) => { reply.header(key, value); });
  reply.status(webResponse.status);
  return reply.send(await webResponse.text());
});

app.post('/api/auth/register/student', async (request, reply) => {
  const body = request.body as any;
  // Look up class by join code first
  const targetClass = await prisma.class.findUnique({
    where: { inviteCode: body.classJoinCode },
  });
  if (!targetClass) {
    reply.status(400);
    return reply.send({ success: false, error: 'Invalid class join code.' });
  }

  const webRequest = new Request(`${request.protocol}://${request.hostname}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      name: body.name,
      role: 'STUDENT_COLLEGE',
      classId: targetClass.id,
    }),
  });
  const webResponse = await auth.handler(webRequest);
  webResponse.headers.forEach((value, key) => { reply.header(key, value); });
  reply.status(webResponse.status);
  return reply.send(await webResponse.text());
});

// Better Auth Web Request Integration
app.all('/api/auth/*', {
  config: {
    rateLimit: {
      max: config.RATE_LIMIT_AUTH_MAX || 20,
      timeWindow: '1 minute'
    }
  }
}, async (req, reply) => {
  const method = req.method;
  const protocol = req.protocol;
  const host = req.hostname;
  const path = req.raw.url || '';
  const url = `${protocol}://${host}${path}`;

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, val]) => {
    if (val) {
      if (Array.isArray(val)) {
        val.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, val);
      }
    }
  });

  let body: string | undefined = undefined;
  if (method !== 'GET' && method !== 'HEAD' && req.body) {
    body = JSON.stringify(req.body);
  }

  const webRequest = new Request(url, {
    method,
    headers,
    body,
  });

  const webResponse = await auth.handler(webRequest);

  // Copy response headers
  webResponse.headers.forEach((value, key) => {
    reply.header(key, value);
  });

  reply.status(webResponse.status);
  return reply.send(await webResponse.text());
});

// GET /api/me profile endpoint (part of the frontend API contract)
app.get('/api/me', {
  preHandler: [requireAuth],
  config: {
    rateLimit: {
      max: config.RATE_LIMIT_AUTH_MAX || 20,
      timeWindow: '1 minute'
    }
  },
  schema: {
    description: 'Get details of the currently authenticated user session',
    tags: ['Auth'],
    security: [{ cookieAuth: [] }],
    response: {
      200: {
        description: 'Success response containing authenticated user details',
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          institution: { type: 'string', nullable: true },
          planType: { type: 'string', nullable: true }
        }
      },
      401: {
        description: 'Unauthorized request',
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  const authReq = request as AuthenticatedRequest;
  const user = authReq.user!;
  return reply.status(200).send({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    institution: user.institution || null,
    planType: user.planType || null,
  });
});

// Mount Routes
app.register(healthRoutes, { prefix: '/health' });
app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(userRoutes, { prefix: '/api/v1/users' });
app.register(simulationRoutes, { prefix: '/api/v1/simulation' });
app.register(seoRoutes, { prefix: '/api/v1/seo' });
app.register(googleAdsRoutes, { prefix: '/api/v1/google-ads' });
app.register(metaAdsRoutes, { prefix: '/api/v1/meta-ads' });
app.register(metricsRoutes, { prefix: '/api/v1/metrics' });
app.register(eventsRoutes, { prefix: '/api/v1/events' });
app.register(scoringRoutes, { prefix: '/api/v1/scoring' });
app.register(classRoutes, { prefix: '/api/v1/class' });
app.register(scenarioRoutes, { prefix: '/api/v1/scenario' });
app.register(certificateRoutes, { prefix: '/api/v1/certificate' });
app.register(reportRoutes, { prefix: '/api/v1/report' });
app.register(auditRoutes, { prefix: '/api/v1/audit' });
app.register(apiContractRoutes);

// Global Error Handler
app.setErrorHandler((error, request, reply) => {
  const statusCode = error.validation ? 400 : (error instanceof AppError ? error.statusCode : 500);
  const code = error.validation ? 'VALIDATION_ERROR' : ((error as any).code || 'INTERNAL_ERROR');
  const message = error.validation
    ? error.message
    : (error instanceof AppError || config.NODE_ENV !== 'production' ? error.message : 'An unexpected error occurred.');

  if (statusCode === 500 && !error.validation && !(error instanceof AppError)) {
    logger.error({ err: error, path: request.url }, 'Unhandled internal server error');
  } else {
    logger.warn({ err: error, path: request.url }, error.message);
  }

  const payload = {
    success: false,
    error: message,
    message: message,
    code,
    statusCode,
  };

  // Pre-serialize payload as string to bypass Fastify/AJV route-level response schema stripping
  reply
    .status(statusCode)
    .header('content-type', 'application/json; charset=utf-8')
    .send(JSON.stringify(payload));
});
