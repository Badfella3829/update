const fs = require('fs');
const path = require('path');

// CSP Implementation Test for Node.js
async function runCSPTests() {
    console.log('🛡️ Running CSP Implementation Tests...\n');

    const results = {
        passed: 0,
        failed: 0,
        total: 4,
        details: []
    };

    // Test 1: CSP Meta Tag Present
    console.log('Testing: CSP Meta Tag Present');
    try {
        const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
        const html = fs.readFileSync(dashboardPath, 'utf8');

        const cspMetaTag = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);

        if (!cspMetaTag) {
            console.log('❌ FAILED: CSP meta tag not found in dashboard.html');
            results.failed++;
            results.details.push({
                test: 'CSP Meta Tag Present',
                passed: false,
                details: 'CSP meta tag not found in dashboard.html'
            });
        } else {
            console.log('✅ PASSED: CSP meta tag found in dashboard.html');
            results.passed++;
            results.details.push({
                test: 'CSP Meta Tag Present',
                passed: true,
                details: 'CSP meta tag found in dashboard.html'
            });
        }
    } catch (error) {
        console.log(`❌ ERROR: CSP meta tag test failed: ${error.message}`);
        results.failed++;
        results.details.push({
            test: 'CSP Meta Tag Present',
            passed: false,
            details: error.message
        });
    }
    console.log('');

    // Test 2: CSP Policy Validation
    console.log('Testing: CSP Policy Validation');
    try {
        const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
        const html = fs.readFileSync(dashboardPath, 'utf8');

        const cspMatch = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=("|')([\s\S]*?)\1[^>]*>/i);
        if (!cspMatch) {
            console.log('❌ FAILED: Could not extract CSP policy from meta tag');
            results.failed++;
            results.details.push({
                test: 'CSP Policy Validation',
                passed: false,
                details: 'Could not extract CSP policy from meta tag'
            });
        } else {
            const cspPolicy = cspMatch[2];

            // Required domains that should be allowed
            const requiredDomains = [
                'https://apis.google.com',
                'https://www.googleapis.com',
                'https://firestore.googleapis.com',
                'https://identitytoolkit.googleapis.com',
                'https://www.gstatic.com',
                'https://fonts.googleapis.com',
                'https://fonts.gstatic.com'
            ];

            const violations = [];

            // Check if required domains are in the policy
            for (const domain of requiredDomains) {
                if (!cspPolicy.includes(domain)) {
                    violations.push(`Missing ${domain}`);
                }
            }

            // Check for 'self' and 'unsafe-inline' where needed
            if (!cspPolicy.includes("'self'")) {
                violations.push("Missing 'self' directive");
            }

            if (!cspPolicy.includes("'unsafe-inline'")) {
                violations.push("Missing 'unsafe-inline' for inline scripts");
            }

            if (violations.length > 0) {
                console.log(`❌ FAILED: CSP policy validation failed: ${violations.join(', ')}`);
                results.failed++;
                results.details.push({
                    test: 'CSP Policy Validation',
                    passed: false,
                    details: `CSP policy validation failed: ${violations.join(', ')}`
                });
            } else {
                console.log('✅ PASSED: CSP policy includes all required domains and directives');
                results.passed++;
                results.details.push({
                    test: 'CSP Policy Validation',
                    passed: true,
                    details: 'CSP policy includes all required domains and directives'
                });
            }
        }
    } catch (error) {
        console.log(`❌ ERROR: CSP policy validation failed: ${error.message}`);
        results.failed++;
        results.details.push({
            test: 'CSP Policy Validation',
            passed: false,
            details: error.message
        });
    }
    console.log('');

    // Test 3: Required Scripts Present
    console.log('Testing: Required Scripts Present');
    try {
        const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
        const html = fs.readFileSync(dashboardPath, 'utf8');

        const requiredScripts = [
            'auth-guard.js',
            'firebase.js',
            'dashboard.js',
            'ux-enhancements.js',
            'notifications.js'
        ];

        const missingScripts = [];

        for (const script of requiredScripts) {
            if (!html.includes(script)) {
                missingScripts.push(script);
            }
        }

        if (missingScripts.length > 0) {
            console.log(`❌ FAILED: Missing required scripts: ${missingScripts.join(', ')}`);
            results.failed++;
            results.details.push({
                test: 'Required Scripts Present',
                passed: false,
                details: `Missing required scripts: ${missingScripts.join(', ')}`
            });
        } else {
            console.log('✅ PASSED: All required scripts are present in dashboard');
            results.passed++;
            results.details.push({
                test: 'Required Scripts Present',
                passed: true,
                details: 'All required scripts are present in dashboard'
            });
        }
    } catch (error) {
        console.log(`❌ ERROR: Required scripts test failed: ${error.message}`);
        results.failed++;
        results.details.push({
            test: 'Required Scripts Present',
            passed: false,
            details: error.message
        });
    }
    console.log('');

    // Test 4: CSP Policy Structure
    console.log('Testing: CSP Policy Structure');
    try {
        const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
        const html = fs.readFileSync(dashboardPath, 'utf8');

        const cspMatch = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=("|')([\s\S]*?)\1[^>]*>/i);
        if (!cspMatch) {
            console.log('❌ FAILED: Could not find CSP policy');
            results.failed++;
            results.details.push({
                test: 'CSP Policy Structure',
                passed: false,
                details: 'Could not find CSP policy'
            });
        } else {
            const cspPolicy = cspMatch[2];

            // Check for required directives
            const requiredDirectives = [
                'default-src',
                'script-src',
                'style-src',
                'font-src',
                'img-src'
            ];

            const missingDirectives = [];

            for (const directive of requiredDirectives) {
                if (!cspPolicy.includes(directive)) {
                    missingDirectives.push(directive);
                }
            }

            if (missingDirectives.length > 0) {
                console.log(`❌ FAILED: Missing CSP directives: ${missingDirectives.join(', ')}`);
                results.failed++;
                results.details.push({
                    test: 'CSP Policy Structure',
                    passed: false,
                    details: `Missing CSP directives: ${missingDirectives.join(', ')}`
                });
            } else {
                console.log('✅ PASSED: CSP policy has proper structure with all required directives');
                results.passed++;
                results.details.push({
                    test: 'CSP Policy Structure',
                    passed: true,
                    details: 'CSP policy has proper structure with all required directives'
                });
            }
        }
    } catch (error) {
        console.log(`❌ ERROR: CSP policy structure test failed: ${error.message}`);
        results.failed++;
        results.details.push({
            test: 'CSP Policy Structure',
            passed: false,
            details: error.message
        });
    }
    console.log('');

    // Summary
    console.log(`📊 Test Results: ${results.passed}/${results.total} passed`);

    if (results.failed > 0) {
        console.log('❌ Some CSP tests failed. Please review the implementation.');
        console.log('\nFailed Tests:');
        results.details.filter(test => !test.passed).forEach(test => {
            console.log(`- ${test.test}: ${test.details}`);
        });
    } else {
        console.log('✅ All CSP tests passed! Security implementation is working correctly.');
    }

    return results;
}

// Run the tests
runCSPTests().catch(console.error);
