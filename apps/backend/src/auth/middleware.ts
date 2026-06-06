import { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from './better-auth';
import { UserRole } from './roles';
import { prisma } from '../db/client';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    classId?: string | null;
    institution?: string | null;
    planType?: string | null;
  };
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
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

    const session = await auth.api.getSession({
      headers,
    });
    
    if (!session || !session.user) {
      reply.status(401).header('content-type', 'application/json; charset=utf-8').send(JSON.stringify({
        error: 'Unauthorized'
      }));
      return;
    }
    
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!dbUser) {
      reply.status(401).header('content-type', 'application/json; charset=utf-8').send(JSON.stringify({
        error: 'Unauthorized'
      }));
      return;
    }
    
    (req as AuthenticatedRequest).user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role || 'STUDENT_COLLEGE',
      classId: dbUser.classId || null,
      institution: dbUser.institution || null,
      planType: dbUser.planType || null,
    };
  } catch (error) {
    reply.status(401).header('content-type', 'application/json; charset=utf-8').send(JSON.stringify({
      error: 'Unauthorized'
    }));
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply);
    if (reply.sent) return;

    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !allowedRoles.includes(authReq.user.role as UserRole)) {
      reply.status(403).header('content-type', 'application/json; charset=utf-8').send(JSON.stringify({
        error: 'Forbidden: Insufficient permissions'
      }));
    }
  };
}
