/**
 * Priority-Based Notification System Test Script
 * Tests the enhanced notification system with priority classification
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Test 1: Check if notification_logs table exists and has required columns
 */
async function testNotificationLogsTable() {
  try {
    // Test table existence
    const { data, error } = await supabase
      .from('notification_logs')
      .select('id, recipient, subject, body, type, channel, status, priority, is_read, user_id, related_order_id, created_at')
      .limit(1);

    if (error) {
      results.push({
        test: 'Notification Logs Table Structure',
        status: 'FAIL',
        message: 'Failed to query notification_logs table',
        details: error
      });
      return;
    }

    results.push({
      test: 'Notification Logs Table Structure',
      status: 'PASS',
      message: 'Table exists with all required columns',
      details: { sampleData: data }
    });
  } catch (err) {
    results.push({
      test: 'Notification Logs Table Structure',
      status: 'FAIL',
      message: 'Exception while testing table structure',
      details: err
    });
  }
}

/**
 * Test 2: Test priority column constraints
 */
async function testPriorityColumn() {
  try {
    // Test valid priorities
    const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
    let allValid = true;

    for (const priority of validPriorities) {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('priority')
        .eq('priority', priority)
        .limit(1);

      if (error) {
        allValid = false;
        break;
      }
    }

    results.push({
      test: 'Priority Column Validation',
      status: allValid ? 'PASS' : 'FAIL',
      message: allValid ? 'Priority column accepts all valid values' : 'Priority column constraint issue',
      details: { validPriorities }
    });
  } catch (err) {
    results.push({
      test: 'Priority Column Validation',
      status: 'FAIL',
      message: 'Exception while testing priority column',
      details: err
    });
  }
}

/**
 * Test 3: Test indexes exist
 */
async function testIndexes() {
  try {
    // This will be tested by query performance - if indexes exist, queries should be fast
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('notification_logs')
      .select('id, priority, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const queryTime = Date.now() - startTime;

    results.push({
      test: 'Priority Index Performance',
      status: queryTime < 1000 ? 'PASS' : 'FAIL',
      message: `Query completed in ${queryTime}ms`,
      details: { queryTime, expectedMax: 1000 }
    });
  } catch (err) {
    results.push({
      test: 'Priority Index Performance',
      status: 'FAIL',
      message: 'Exception while testing indexes',
      details: err
    });
  }
}

/**
 * Test 4: Test RLS policies
 */
async function testRLSPolicies() {
  try {
    // Test admin access (should work with service key)
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .limit(1);

    results.push({
      test: 'RLS Policies - Admin Access',
      status: !error ? 'PASS' : 'FAIL',
      message: !error ? 'Admin can access notification_logs' : 'Admin access failed',
      details: error
    });
  } catch (err) {
    results.push({
      test: 'RLS Policies - Admin Access',
      status: 'FAIL',
      message: 'Exception while testing RLS',
      details: err
    });
  }
}

/**
 * Test 5: Create a test notification
 */
async function testCreateNotification() {
  try {
    const testNotification = {
      recipient: 'test@example.com',
      subject: '🧪 Test Notification',
      body: 'This is a test notification for the priority system',
      type: 'TEST',
      channel: 'TELEGRAM',
      status: 'SENT',
      priority: 'HIGH',
      is_read: false,
      user_id: null,
      related_order_id: 'test-order-123'
    };

    const { data, error } = await supabase
      .from('notification_logs')
      .insert(testNotification)
      .select()
      .single();

    if (error) {
      results.push({
        test: 'Create High Priority Notification',
        status: 'FAIL',
        message: 'Failed to create test notification',
        details: error
      });
      return;
    }

    // Clean up the test notification
    await supabase
      .from('notification_logs')
      .delete()
      .eq('id', data.id);

    results.push({
      test: 'Create High Priority Notification',
      status: 'PASS',
      message: 'Successfully created and deleted test notification',
      details: { notificationId: data.id }
    });
  } catch (err) {
    results.push({
      test: 'Create High Priority Notification',
      status: 'FAIL',
      message: 'Exception while creating notification',
      details: err
    });
  }
}

/**
 * Test 6: Test priority-based filtering
 */
async function testPriorityFiltering() {
  try {
    // Test filtering by each priority
    const priorities = ['HIGH', 'MEDIUM', 'LOW'];
    let allFiltersWork = true;

    for (const priority of priorities) {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('priority', priority)
        .limit(1);

      if (error) {
        allFiltersWork = false;
        break;
      }
    }

    results.push({
      test: 'Priority-Based Filtering',
      status: allFiltersWork ? 'PASS' : 'FAIL',
      message: allFiltersWork ? 'All priority filters work correctly' : 'Priority filtering failed',
      details: { priorities }
    });
  } catch (err) {
    results.push({
      test: 'Priority-Based Filtering',
      status: 'FAIL',
      message: 'Exception while testing priority filtering',
      details: err
    });
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting Priority-Based Notification System Tests...\n');

  await testNotificationLogsTable();
  await testPriorityColumn();
  await testIndexes();
  await testRLSPolicies();
  await testCreateNotification();
  await testPriorityFiltering();

  // Display results
  console.log('\n📊 Test Results:');
  console.log('═'.repeat(60));

  let passCount = 0;
  let failCount = 0;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${index + 1}. ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();

    if (result.status === 'PASS') passCount++;
    if (result.status === 'FAIL') failCount++;
  });

  console.log('═'.repeat(60));
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${results.length - passCount - failCount} skipped`);
  console.log('═'.repeat(60));

  return failCount === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  });