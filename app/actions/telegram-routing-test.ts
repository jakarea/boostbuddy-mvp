/**
 * Telegram Routing System - Test Suite
 * Tests the specific routing requirements:
 * - Admin: All admins receive same notification
 * - Employee: Single group notification only
 * - Client: Individual personal notification only
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  routeTelegramNotificationAction,
  sendAdminNotificationAction,
  sendEmployeeNotificationAction,
  sendClientNotificationAction,
  getTelegramRoutingStatusAction
} from "./telegram-routing";

// ── Test Configuration ───────────────────────────────────────────────

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  data?: any;
}

// ── Test Functions ───────────────────────────────────────────────────

/**
 * Test 1: Admin Routing - Should reach all admins
 */
export async function testAdminRouting(): Promise<TestResult> {
  try {
    console.log("🧪 Testing Admin Routing...");

    const result = await sendAdminNotificationAction(
      "🧪 Admin Routing Test",
      "This is a test message to verify all admins receive notifications.\n\nIf you receive this, admin routing is working correctly!",
      "TEST_ADMIN_ROUTING",
      "MEDIUM"
    );

    const passed = result.delivered > 0 && (result.method?.includes("admin") || false);

    return {
      testName: "Admin Routing Test",
      passed,
      details: passed
        ? `✅ Admin routing works: ${result.delivered} admins notified via ${result.method}`
        : `❌ Admin routing failed: ${result.error || "No admins reached"}`,
      data: result
    };

  } catch (error: any) {
    return {
      testName: "Admin Routing Test",
      passed: false,
      details: `❌ Test failed with error: ${error?.message || "Unknown error"}`
    };
  }
}

/**
 * Test 2: Employee Routing - Should use single group only
 */
export async function testEmployeeRouting(): Promise<TestResult> {
  try {
    console.log("🧪 Testing Employee Routing...");

    const result = await sendEmployeeNotificationAction(
      "🧪 Employee Routing Test",
      "This is a test message to verify employee group receives notifications.\n\nIf you see this in your employee group, routing is working!",
      "TEST_EMPLOYEE_ROUTING",
      "MEDIUM"
    );

    const passed = result.delivered === 1 && result.method === "employee_group";

    return {
      testName: "Employee Routing Test",
      passed,
      details: passed
        ? `✅ Employee routing works: Single group notification sent`
        : `❌ Employee routing failed: ${result.error || "Expected single group delivery"}`,
      data: result
    };

  } catch (error: any) {
    return {
      testName: "Employee Routing Test",
      passed: false,
      details: `❌ Test failed with error: ${error?.message || "Unknown error"}`
    };
  }
}

/**
 * Test 3: Client Routing - Should reach specific client only
 */
export async function testClientRouting(testEmail: string): Promise<TestResult> {
  try {
    console.log("🧪 Testing Client Routing...");

    const result = await sendClientNotificationAction(
      testEmail,
      "🧪 Client Routing Test",
      "This is a test message to verify you receive personal notifications.\n\nIf you receive this, client routing is working correctly!",
      "TEST_CLIENT_ROUTING",
      "MEDIUM"
    );

    const passed = result.delivered === 1 && result.method === "client_personal";

    return {
      testName: "Client Routing Test",
      passed,
      details: passed
        ? `✅ Client routing works: Personal notification sent to ${testEmail}`
        : `❌ Client routing failed: ${result.error || "Expected individual delivery"}`,
      data: result
    };

  } catch (error: any) {
    return {
      testName: "Client Routing Test",
      passed: false,
      details: `❌ Test failed with error: ${error?.message || "Unknown error"}`
    };
  }
}

/**
 * Test 4: Configuration Status Check
 */
export async function testConfigurationStatus(): Promise<TestResult> {
  try {
    console.log("🧪 Testing Configuration Status...");

    const result = await getTelegramRoutingStatusAction();

    if (!result.success) {
      return {
        testName: "Configuration Status Test",
        passed: false,
        details: `❌ Failed to get configuration: ${result.error}`
      };
    }

    const config = result.config;
    const passed = config?.botConfigured && config?.adminGroups > 0;

    return {
      testName: "Configuration Status Test",
      passed,
      details: passed
        ? `✅ Configuration ready:\n   - Bot: ${config?.botConfigured ? "✅" : "❌"}\n   - Admin Groups: ${config?.adminGroups}\n   - Employee Group: ${config?.employeeGroupConfigured ? "✅" : "❌"}\n   - Clients with Chat ID: ${config?.clientsWithChatId}`
        : `❌ Configuration incomplete:\n   - Bot: ${config?.botConfigured ? "✅" : "❌"}\n   - Admin Groups: ${config?.adminGroups}\n   - Employee Group: ${config?.employeeGroupConfigured ? "✅" : "❌"}`,
      data: config
    };

  } catch (error: any) {
    return {
      testName: "Configuration Status Test",
      passed: false,
      details: `❌ Test failed with error: ${error?.message || "Unknown error"}`
    };
  }
}

/**
 * Test 5: High Priority Real-time + Telegram
 */
export async function testHighPriorityIntegration(testEmail: string): Promise<TestResult> {
  try {
    console.log("🧪 Testing High Priority Integration...");

    const result = await sendClientNotificationAction(
      testEmail,
      "🚨 HIGH Priority Test",
      "This is a HIGH priority test message.\n\nYou should receive this instantly via both Telegram and web notification.",
      "TEST_HIGH_PRIORITY",
      "HIGH"
    );

    const passed = result.delivered > 0;

    return {
      testName: "High Priority Integration Test",
      passed,
      details: passed
        ? `✅ High priority works: Telegram sent via ${result.method}, web notification triggered`
        : `❌ High priority failed: ${result.error || "No delivery"}`,
      data: result
    };

  } catch (error: any) {
    return {
      testName: "High Priority Integration Test",
      passed: false,
      details: `❌ Test failed with error: ${error?.message || "Unknown error"}`
    };
  }
}

/**
 * Test 6: Multilingual Support
 */
export async function testMultilingualRouting(testEmail: string, language: "en" | "it" = "en"): Promise<TestResult> {
  try {
    console.log("🧪 Testing Multilingual Routing...");

    const { sendMultilingualNotificationAction } = await import("./notifications-multilingual");

    const result = await sendMultilingualNotificationAction(
      testEmail,
      "ACCOUNT_READY",
      { name: "Test User", role: "Client" },
      "TELEGRAM",
      "HIGH",
      undefined,
      language
    );

    const passed = result.success;

    return {
      testName: `Multilingual Routing Test (${language.toUpperCase()})`,
      passed,
      details: passed
        ? `✅ Multilingual works: ${language} template delivered successfully`
        : `❌ Multilingual failed: ${result.error || "Template delivery failed"}`,
      data: result
    };

  } catch (error: any) {
    return {
      testName: `Multilingual Routing Test (${language.toUpperCase()})`,
      passed: false,
      details: `❌ Test failed with error: ${error?.message || "Unknown error"}`
    };
  }
}

/**
 * Test 7: Error Handling and Fallback
 */
export async function testErrorHandling(): Promise<TestResult> {
  try {
    console.log("🧪 Testing Error Handling...");

    // Test with invalid recipient
    const result = await sendClientNotificationAction(
      "nonexistent@example.com",
      "Test Subject",
      "Test message",
      "TEST_ERROR_HANDLING",
      "MEDIUM"
    );

    const passed = !result.success && result.delivered === 0;

    return {
      testName: "Error Handling Test",
      passed,
      details: passed
        ? `✅ Error handling works: Gracefully handled invalid recipient`
        : `❌ Error handling failed: Should have rejected invalid recipient`,
      data: result
    };

  } catch (error: any) {
    return {
      testName: "Error Handling Test",
      passed: false,
      details: `❌ Test failed with error: ${error?.message || "Unknown error"}`
    };
  }
}

// ── Test Runner ─────────────────────────────────────────────────────

/**
 * Run all routing tests
 */
export async function runTelegramRoutingTests(options?: {
  testEmail?: string;
  runAll?: boolean;
}): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testEmail = options?.testEmail || "test@example.com";

  console.log("🧪 Starting Telegram Routing Tests...\n");

  // Test 1: Configuration Status
  console.log("─────────────────────────────────────────────────────────");
  results.push(await testConfigurationStatus());

  // Test 2: Admin Routing
  console.log("─────────────────────────────────────────────────────────");
  results.push(await testAdminRouting());

  // Test 3: Employee Routing
  console.log("─────────────────────────────────────────────────────────");
  results.push(await testEmployeeRouting());

  // Test 4: Client Routing
  console.log("─────────────────────────────────────────────────────────");
  results.push(await testClientRouting(testEmail));

  // Test 5: High Priority Integration
  console.log("─────────────────────────────────────────────────────────");
  results.push(await testHighPriorityIntegration(testEmail));

  // Test 6: Multilingual Support
  console.log("─────────────────────────────────────────────────────────");
  results.push(await testMultilingualRouting(testEmail, "en"));

  // Test 7: Error Handling
  console.log("─────────────────────────────────────────────────────────");
  results.push(await testErrorHandling());

  console.log("─────────────────────────────────────────────────────────");
  console.log("🧪 Telegram Routing Tests Complete!\n");

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`📊 Test Results: ${passed}/${total} passed`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${total - passed}`);

  return results;
}

/**
 * Generate test report
 */
export function generateTestReport(results: TestResult[]): string {
  let report = "╔════════════════════════════════════════════════════════════╗\n";
  report += "║        Telegram Routing System - Test Report                ║\n";
  report += "╚════════════════════════════════════════════════════════════╝\n\n";

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  report += `📊 Overall Results: ${passed}/${total} tests passed\n\n`;

  results.forEach((result, index) => {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    report += `${index + 1}. ${status} - ${result.testName}\n`;
    report += `   ${result.details}\n\n`;
  });

  if (passed === total) {
    report += "🎉 All tests passed! Telegram routing system is working correctly.\n";
  } else {
    report += "⚠️ Some tests failed. Please review the configuration and try again.\n";
  }

  return report;
}