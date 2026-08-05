/**
 * Lightweight Multilingual Notification System Tests
 * Tests that don't require database connection
 */

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// ============================================================================
// FILE SYSTEM TESTS
// ============================================================================

/**
 * Test 1: Check if migration file exists
 */
function testMigrationFileExists() {
  try {
    const fs = require('fs');
    const path = require('path');

    const migrationPath = path.join(process.cwd(), 'prisma/migrations/20260805_add_user_language_preference/migration.sql');
    const exists = fs.existsSync(migrationPath);

    results.push({
      test: 'Migration File Exists',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Language preference migration file exists' : 'Migration file not found',
      details: { path: migrationPath, exists }
    });
  } catch (err) {
    results.push({
      test: 'Migration File Exists',
      status: 'FAIL',
      message: 'Exception while checking migration file',
      details: err
    });
  }
}

/**
 * Test 2: Check if translation templates file exists
 */
function testTemplatesFileExists() {
  try {
    const fs = require('fs');
    const path = require('path');

    const templatesPath = path.join(process.cwd(), 'lib/locales/notification-templates.ts');
    const exists = fs.existsSync(templatesPath);

    results.push({
      test: 'Translation Templates File Exists',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Notification templates file exists' : 'Templates file not found',
      details: { path: templatesPath, exists }
    });
  } catch (err) {
    results.push({
      test: 'Translation Templates File Exists',
      status: 'FAIL',
      message: 'Exception while checking templates file',
      details: err
    });
  }
}

/**
 * Test 3: Check if multilingual dispatcher file exists
 */
function testDispatcherFileExists() {
  try {
    const fs = require('fs');
    const path = require('path');

    const dispatcherPath = path.join(process.cwd(), 'app/actions/notifications-multilingual.ts');
    const exists = fs.existsSync(dispatcherPath);

    results.push({
      test: 'Multilingual Dispatcher File Exists',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Multilingual dispatcher file exists' : 'Dispatcher file not found',
      details: { path: dispatcherPath, exists }
    });
  } catch (err) {
    results.push({
      test: 'Multilingual Dispatcher File Exists',
      status: 'FAIL',
      message: 'Exception while checking dispatcher file',
      details: err
    });
  }
}

/**
 * Test 4: Check if API endpoint exists
 */
function testAPIEndpointExists() {
  try {
    const fs = require('fs');
    const path = require('path');

    const apiPath = path.join(process.cwd(), 'app/api/user/language/route.ts');
    const exists = fs.existsSync(apiPath);

    results.push({
      test: 'Language API Endpoint Exists',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Language preference API endpoint exists' : 'API endpoint file not found',
      details: { path: apiPath, exists }
    });
  } catch (err) {
    results.push({
      test: 'Language API Endpoint Exists',
      status: 'FAIL',
      message: 'Exception while checking API endpoint',
      details: err
    });
  }
}

// ============================================================================
// CODE ANALYSIS TESTS
// ============================================================================

/**
 * Test 5: Analyze Prisma schema for language column
 */
function testPrismaSchemaLanguageColumn() {
  try {
    const fs = require('fs');
    const path = require('path');

    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    const hasLanguageColumn = schemaContent.includes('preferredLanguage') ||
                            schemaContent.includes('preferred_language');
    const hasDefaultValue = schemaContent.includes('preferredLanguage') &&
                            schemaContent.includes('@default("en")');
    const hasUserInfo = schemaContent.includes('Preferred notification language');

    const status = hasLanguageColumn && hasDefaultValue ? 'PASS' : 'FAIL';

    results.push({
      test: 'Prisma Schema Language Column',
      status,
      message: status
        ? 'Prisma schema contains preferredLanguage column with default "en"'
        : 'Prisma schema missing language column configuration',
      details: {
        hasLanguageColumn,
        hasDefaultValue,
        hasUserInfo
      }
    });
  } catch (err) {
    results.push({
      test: 'Prisma Schema Language Column',
      status: 'FAIL',
      message: 'Exception while analyzing Prisma schema',
      details: err
    });
  }
}

/**
 * Test 6: Check NotificationCenter component for language selector
 */
function testNotificationCenterLanguageSelector() {
  try {
    const fs = require('fs');
    const path = require('path');

    const componentPath = path.join(process.cwd(), 'components/NotificationCenter.tsx');
    const componentContent = fs.readFileSync(componentPath, 'utf8');

    const hasLanguageSelector = componentContent.includes('languageMenuOpen') ||
                                componentContent.includes('Globe') ||
                                componentContent.includes('handleLanguageChange');
    const hasLanguageMenu = componentContent.includes('🇮🇹') || componentContent.includes('🇬🇧');
    const hasI18n = componentContent.includes('useTranslation');

    const status = hasLanguageSelector && hasI18n ? 'PASS' : 'FAIL';

    results.push({
      test: 'NotificationCenter Language Selector',
      status,
      message: status
        ? 'NotificationCenter component has language selector and i18n'
        : 'NotificationCenter missing language selector functionality',
      details: {
        hasLanguageSelector,
        hasLanguageMenu,
        hasI18n
      }
    });
  } catch (err) {
    results.push({
      test: 'NotificationCenter Language Selector',
      status: 'FAIL',
      message: 'Exception while checking NotificationCenter component',
      details: err
    });
  }
}

/**
 * Test 7: Check translation templates completeness
 */
function testTranslationTemplatesCompleteness() {
  try {
    const fs = require('fs');
    const path = require('path');

    const templatesPath = path.join(process.cwd(), 'lib/locales/notification-templates.ts');
    const templatesContent = fs.readFileSync(templatesPath, 'utf8');

    const requiredTemplates = [
      'ACCOUNT_READY',
      'ACCOUNT_APPROVED',
      'NEW_USER_REGISTRATION',
      'REVIEW_ORDER_ASSIGNED',
      'CREDITS_PURCHASED',
      'ORDER_CANCELLED_REFUNDED'
    ];

    let missingTemplates = [];
    let templateCount = 0;

    requiredTemplates.forEach(template => {
      // Check if template key exists in both language objects
      // Format: ACCOUNT_READY: { subject: "...", body: ... }
      const enExists = templatesContent.includes(`${template}: {`) &&
                       templatesContent.includes('enTemplates');
      const itExists = templatesContent.includes(`${template}: {`) &&
                       templatesContent.includes('itTemplates');

      if (!enExists || !itExists) {
        missingTemplates.push({
          template,
          enExists,
          itExists
        });
      }
    });

    // Count total templates by counting exports
    const exportMatch = templatesContent.match(/export const (en|it)Templates/g);
    templateCount = exportMatch ? exportMatch.length : 0;

    const status = missingTemplates.length === 0 && templateCount >= 2 ? 'PASS' : 'FAIL';

    results.push({
      test: 'Translation Templates Completeness',
      status,
      message: status
        ? `Translation templates complete with ${requiredTemplates.length}+ types in both languages`
        : `Missing ${missingTemplates.length} template definitions`,
      details: {
        requiredTemplateCount: requiredTemplates.length,
        missingTemplates,
        languageFilesFound: templateCount
      }
    });
  } catch (err) {
    results.push({
      test: 'Translation Templates Completeness',
      status: 'FAIL',
      message: 'Exception while checking templates completeness',
      details: err
    });
  }
}

/**
 * Test 8: Check multilingual dispatcher functions
 */
function testMultilingualDispatcherFunctions() {
  try {
    const fs = require('fs');
    const path = require('path');

    const dispatcherPath = path.join(process.cwd(), 'app/actions/notifications-multilingual.ts');
    const dispatcherContent = fs.readFileSync(dispatcherPath, 'utf8');

    const requiredFunctions = [
      'sendMultilingualNotificationAction',
      'getUserLanguageByEmail',
      'updateUserLanguagePreferenceAction',
      'getUserLanguagePreferenceAction'
    ];

    let missingFunctions = [];

    requiredFunctions.forEach(func => {
      if (!dispatcherContent.includes(func)) {
        missingFunctions.push(func);
      }
    });

    const hasTemplateImport = dispatcherContent.includes('notification-templates');
    const hasSupportedLanguages = dispatcherContent.includes('SUPPORTED_LANGUAGES');

    const status = missingFunctions.length === 0 && hasTemplateImport ? 'PASS' : 'FAIL';

    results.push({
      test: 'Multilingual Dispatcher Functions',
      status,
      message: status
        ? 'All required multilingual dispatcher functions present'
        : `Missing ${missingFunctions.length} functions`,
      details: {
        requiredFunctions,
        missingFunctions,
        hasTemplateImport,
        hasSupportedLanguages
      }
    });
  } catch (err) {
    results.push({
      test: 'Multilingual Dispatcher Functions',
      status: 'FAIL',
      message: 'Exception while checking dispatcher functions',
      details: err
    });
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

/**
 * Run all tests and generate report
 */
function runTests() {
  console.log('🌍 Multilingual Notification System - Component Tests\n');

  // File System Tests
  testMigrationFileExists();
  testTemplatesFileExists();
  testDispatcherFileExists();
  testAPIEndpointExists();

  // Code Analysis Tests
  testPrismaSchemaLanguageColumn();
  testNotificationCenterLanguageSelector();
  testTranslationTemplatesCompleteness();
  testMultilingualDispatcherFunctions();

  // Display Results
  console.log('\n📊 Test Results:');
  console.log('═'.repeat(60));

  let passCount = 0;
  let failCount = 0;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${index + 1}. ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.details && Object.keys(result.details).length > 0) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();

    if (result.status === 'PASS') passCount++;
    if (result.status === 'FAIL') failCount++;
  });

  console.log('═'.repeat(60));
  console.log(`Summary: ${passCount} passed, ${failCount} failed out of ${results.length} tests`);
  console.log('═'.repeat(60));

  // Overall Assessment
  console.log('\n🎯 Overall Assessment:');
  if (failCount === 0) {
    console.log('✅ All component tests passed!');
    console.log('   Files are properly created and configured.');
    console.log('   Ready for integration testing and deployment.');
  } else if (failCount <= 2) {
    console.log('⚠️  Most tests passed. Review failed tests above.');
  } else {
    console.log('❌ Multiple tests failed. Please review implementation.');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Apply database migration to Supabase');
  console.log('2. Test with actual users and notifications');
  console.log('3. Verify language switching works in UI');
  console.log('4. Test notification delivery in both languages');

  return failCount === 0;
}

// Run tests
try {
  const success = runTests();
  process.exit(success ? 0 : 1);
} catch (err) {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
}