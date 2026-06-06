export enum UserRole {
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT_COLLEGE = 'STUDENT_COLLEGE',
  INDIVIDUAL = 'INDIVIDUAL'
}

export function isInstructor(role: string): boolean {
  return role === UserRole.INSTRUCTOR || role === UserRole.ADMIN;
}

export function isAdmin(role: string): boolean {
  return role === UserRole.ADMIN;
}

export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}
