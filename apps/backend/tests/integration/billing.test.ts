import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/db/client';
import { billingService } from '../../src/services/billing/billing.service';
import { limitsService } from '../../src/services/billing/limits.service';
import { ValidationError } from '../../src/utils/errors';

describe('Billing & Plan Enforcement Integration Tests', () => {
  let studentId: string;
  let instructorId: string;
  let basicPlanId: string;
  let freePlanId: string;
  let testScenarioId: string;
  let testClassId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Clean tables
    await prisma.billingEvent.deleteMany({});
    await prisma.couponUsage.deleteMany({});
    await prisma.coupon.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.certificate.deleteMany({});
    await prisma.simulationState.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});

    // Seed pricing plans
    const freePlan = await prisma.plan.create({
      data: {
        name: 'Free Trial',
        code: 'free',
        priceMonthly: 0,
        priceYearly: 0,
        simulationLimit: 1,
        studentLimit: 5,
        instructorLimit: 0,
        certificateLimit: 0,
        reportExportLimit: 1,
        storageLimitMb: 50,
        features: JSON.stringify(['1 Run', 'Basic Support'])
      }
    });
    freePlanId = freePlan.id;

    const basicPlan = await prisma.plan.create({
      data: {
        name: 'Individual Basic',
        code: 'individual_basic',
        priceMonthly: 1500,
        priceYearly: 15000,
        simulationLimit: 5,
        studentLimit: 0,
        instructorLimit: 0,
        certificateLimit: 5,
        reportExportLimit: 5,
        storageLimitMb: 100,
        features: JSON.stringify(['5 Runs', 'Bronze Certificates'])
      }
    });
    basicPlanId = basicPlan.id;

    // Seed test scenario (needed for class creation constraints)
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Limits Test Scenario Template',
        description: 'CRM simulation brief for testing limits',
        industry: 'CRM B2B Software',
        budgetPerRound: 5000.0,
        baselineOrganicTraffic: 1500,
        targetKPI: 'revenue'
      }
    });
    testScenarioId = scenario.id;

    // Create test user (Student)
    const student = await prisma.user.create({
      data: {
        email: 'billing-student@simplab.com',
        name: 'Billing Student',
        role: 'INDIVIDUAL',
        emailVerified: true
      }
    });
    studentId = student.id;

    // Create test instructor
    const instructor = await prisma.user.create({
      data: {
        email: 'billing-instructor@simplab.com',
        name: 'Billing Instructor',
        role: 'INSTRUCTOR',
        emailVerified: true
      }
    });
    instructorId = instructor.id;

    // Create a default test class for simulation linking
    const defaultClass = await prisma.class.create({
      data: {
        name: 'Default Test Class',
        inviteCode: 'DEFAULT',
        instructorId: instructorId,
        scenarioId: testScenarioId
      }
    });
    testClassId = defaultClass.id;
  });

  afterAll(async () => {
    await prisma.billingEvent.deleteMany({});
    await prisma.couponUsage.deleteMany({});
    await prisma.coupon.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.certificate.deleteMany({});
    await prisma.simulationState.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.scenario.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Coupon Validation System', () => {
    it('should allow creating a coupon and validating it successfully', async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: 'TESTPERCENT30',
          discountType: 'percentage',
          discountValue: 30,
          isActive: true
        }
      });

      const validated = await billingService.validateCoupon('TESTPERCENT30');
      expect(validated.code).toBe('TESTPERCENT30');
      expect(validated.discountType).toBe('percentage');
      expect(validated.discountValue).toBe(30);
    });

    it('should throw an error for expired or max redemptions coupons', async () => {
      await prisma.coupon.create({
        data: {
          code: 'EXPIREDCOUPON',
          discountType: 'flat',
          discountValue: 100,
          isActive: true,
          expirationDate: new Date(Date.now() - 10000) // 10 seconds ago
        }
      });

      await expect(billingService.validateCoupon('EXPIREDCOUPON')).rejects.toThrow(ValidationError);
    });
  });

  describe('Checkout & Payment Sandbox Verification', () => {
    it('should allow instant activation for free trial plan without orders', async () => {
      const res = await billingService.createSubscriptionOrder(studentId, 'free', 'monthly');
      expect(res.freeActivation).toBe(true);
      expect(res.subscriptionId).toBeDefined();

      const sub = await prisma.subscription.findUnique({
        where: { id: res.subscriptionId }
      });
      expect(sub?.status).toBe('active');
      expect(sub?.billingCycle).toBe('trial');

      const user = await prisma.user.findUnique({ where: { id: studentId } });
      expect(user?.planType).toBe('free');
    });

    it('should generate order checkout details and pending state for paid plans', async () => {
      const res = await billingService.createSubscriptionOrder(studentId, 'individual_basic', 'monthly', 'TESTPERCENT30');
      expect(res.freeActivation).toBe(false);
      expect(res.gatewayOrderId).toBeDefined();
      expect(res.amount).toBe(1050); // 1500 - 30% discount = 1050

      const pendingSub = await prisma.subscription.findFirst({
        where: { userId: studentId, status: 'pending' }
      });
      expect(pendingSub).not.toBeNull();
      expect(pendingSub?.planId).toBe(basicPlanId);
    });

    it('should successfully capture payment and activate subscription on verify signature', async () => {
      const pendingSub = await prisma.subscription.findFirst({
        where: { userId: studentId, status: 'pending' }
      });
      expect(pendingSub).not.toBeNull();

      const verifyRes = await billingService.verifySubscriptionPayment(
        studentId,
        'pay_mock_12345',
        pendingSub!.gatewaySubscriptionId!, // gatewaySubscriptionId temporarily stores order ID in pending state
        'sig_mock_12345',
        'TESTPERCENT30'
      );
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.subscription.status).toBe('active');

      const activeSub = await prisma.subscription.findUnique({
        where: { id: pendingSub!.id }
      });
      expect(activeSub?.status).toBe('active');

      // Verify invoice exists
      const invoice = await prisma.invoice.findFirst({
        where: { subscriptionId: pendingSub!.id }
      });
      expect(invoice).not.toBeNull();
      expect(invoice?.amount).toBe(1050);
      expect(invoice?.status).toBe('paid');

      // Verify user has upgraded
      const user = await prisma.user.findUnique({ where: { id: studentId } });
      expect(user?.planType).toBe('individual_basic');
    });
  });

  describe('Plan Limits Enforcement Engine', () => {
    it('should enforce simulation limits correctly', async () => {
      // Create user on Free Trial plan (1 simulation limit)
      const testStudent = await prisma.user.create({
        data: {
          email: 'limit-test@simplab.com',
          name: 'Limit Test Student',
          role: 'INDIVIDUAL',
          emailVerified: true
        }
      });

      await prisma.subscription.create({
        data: {
          userId: testStudent.id,
          planId: freePlanId,
          status: 'active',
          billingCycle: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 86400000),
          gatewaySubscriptionId: 'sub_test_limits_sim'
        }
      });

      // Initially checks should pass since runs count is 0
      await expect(limitsService.checkSimulationLimit(testStudent.id)).resolves.not.toThrow();

      // Create 1 simulation state
      await prisma.simulationState.create({
        data: {
          userId: testStudent.id,
          classId: testClassId,
          currentRound: 1,
          status: 'DECISION_OPEN'
        }
      });

      // Max simulations limit is 1. The check should now throw ValidationError on another run request
      await expect(limitsService.checkSimulationLimit(testStudent.id)).rejects.toThrow(ValidationError);
    });

    it('should enforce student roster limits correctly for instructors', async () => {
      // Create instructor on Free Trial (limit: 5 students)
      const testInstructor = await prisma.user.create({
        data: {
          email: 'limit-inst@simplab.com',
          name: 'Limit Test Instructor',
          role: 'INSTRUCTOR',
          emailVerified: true
        }
      });

      await prisma.subscription.create({
        data: {
          userId: testInstructor.id,
          planId: freePlanId,
          status: 'active',
          billingCycle: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 86400000),
          gatewaySubscriptionId: 'sub_test_limits_student'
        }
      });

      const instructorClass = await prisma.class.create({
        data: {
          name: 'Instructor Limits Class',
          inviteCode: 'LIMITS_INST',
          instructorId: testInstructor.id,
          scenarioId: testScenarioId
        }
      });

      // Enrolling 4 students should pass (less than the limit of 5)
      for (let i = 0; i < 4; i++) {
        await prisma.user.create({
          data: {
            email: `limit-student-${i}@simplab.com`,
            name: `Student ${i}`,
            classId: instructorClass.id,
            emailVerified: true
          }
        });
      }

      await expect(limitsService.checkStudentLimit(testInstructor.id)).resolves.not.toThrow();

      // Enrolling the 5th student (reaches the limit)
      await prisma.user.create({
        data: {
          email: 'limit-student-5@simplab.com',
          name: 'Student 5',
          classId: instructorClass.id,
          emailVerified: true
        }
      });

      // Now it should throw ValidationError because we cannot enroll any more students
      await expect(limitsService.checkStudentLimit(testInstructor.id)).rejects.toThrow(ValidationError);
    });

    it('should enforce certificate claim limits', async () => {
      // Free trial has 0 certificate claims limit
      const testStudent = await prisma.user.create({
        data: {
          email: 'limit-cert@simplab.com',
          name: 'Limit Cert Student',
          role: 'INDIVIDUAL',
          emailVerified: true
        }
      });

      await prisma.subscription.create({
        data: {
          userId: testStudent.id,
          planId: freePlanId,
          status: 'active',
          billingCycle: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 86400000),
          gatewaySubscriptionId: 'sub_test_limits_cert'
        }
      });

      // Claiming certificate on free trial should fail immediately
      await expect(limitsService.checkCertificateLimit(testStudent.id)).rejects.toThrow(ValidationError);
    });

    it('should enforce report export limits', async () => {
      // Free trial has 1 report export limit
      const testStudent = await prisma.user.create({
        data: {
          email: 'limit-export@simplab.com',
          name: 'Limit Export Student',
          role: 'INDIVIDUAL',
          emailVerified: true
        }
      });

      await prisma.subscription.create({
        data: {
          userId: testStudent.id,
          planId: freePlanId,
          status: 'active',
          billingCycle: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 86400000),
          gatewaySubscriptionId: 'sub_test_limits_export'
        }
      });

      // 1. Initial check (exports = 0, limit = 1) -> should resolve
      await expect(limitsService.checkExportLimit(testStudent.id)).resolves.not.toThrow();

      // 2. Perform 1st export action (log it)
      await prisma.auditLog.create({
        data: {
          userId: testStudent.id,
          action: 'EXPORT_REPORT',
          details: 'Exported report 1'
        }
      });

      // 3. Second check (exports = 1, limit = 1) -> should throw since count is now at the limit
      await expect(limitsService.checkExportLimit(testStudent.id)).rejects.toThrow(ValidationError);
    });
  });
});
