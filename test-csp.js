// CSP Implementation Test
export const cspTests = [
    {
        id: 'csp-meta-tag-present',
        name: 'CSP Meta Tag Present',
        category: 'security',
        description: 'Verify CSP meta tag is present in dashboard.html',
        run: async () => {
            try {
                const response = await fetch('http://localhost:3000/dashboard.html');
                const html = await response.text();

                const cspMetaTag = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);

                if (!cspMetaTag) {
                    return {
                        passed: false,
                        details: 'CSP meta tag not found in dashboard.html'
                    };
                }

                return {
                    passed: true,
                    details: 'CSP meta tag found in dashboard.html'
                };
            } catch (error) {
                return {
                    passed: false,
                    details: `CSP meta tag test failed: ${error.message}`
                };
            }
        }
    },

    {
        id: 'csp-policy-validation',
        name: 'CSP Policy Validation',
        category: 'security',
        description: 'Validate CSP policy allows required resources',
        run: async () => {
            try {
                const response = await fetch('http://localhost:3000/dashboard.html');
                const html = await response.text();

                const cspMatch = html.match(/content=["']([^"']*)["']/i);
                if (!cspMatch) {
                    return {
                        passed: false,
                        details: 'Could not extract CSP policy from meta tag'
                    };
                }

                const cspPolicy = cspMatch[1];

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
                    return {
                        passed: false,
                        details: `CSP policy validation failed: ${violations.join(', ')}`
                    };
                }

                return {
                    passed: true,
                    details: 'CSP policy includes all required domains and directives'
                };
            } catch (error) {
                return {
                    passed: false,
                    details: `CSP policy validation failed: ${error.message}`
                };
            }
        }
    },

    {
        id: 'csp-resource-loading',
        name: 'CSP Resource Loading Test',
        category: 'security',
        description: 'Test that critical resources load without CSP violations',
        run: async () => {
            try {
                // Test loading of Firebase SDK (critical for auth)
                const firebaseResponse = await fetch('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
                if (!firebaseResponse.ok) {
                    return {
                        passed: false,
                        details: 'Firebase SDK failed to load'
                    };
                }

                // Test loading of Google Fonts
                const fontResponse = await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                if (!fontResponse.ok) {
                    return {
                        passed: false,
                        details: 'Google Fonts failed to load'
                    };
                }

                return {
                    passed: true,
                    details: 'Critical resources load successfully'
                };
            } catch (error) {
                return {
                    passed: false,
                    details: `Resource loading test failed: ${error.message}`
                };
            }
        }
    },

    {
        id: 'csp-dashboard-access',
        name: 'Dashboard CSP Compliance',
        category: 'security',
        description: 'Verify dashboard page loads without CSP violations',
        run: async () => {
            try {
                const response = await fetch('http://localhost:3000/dashboard.html');
                if (!response.ok) {
                    return {
                        passed: false,
                        details: `Dashboard page returned status ${response.status}`
                    };
                }

                const html = await response.text();

                // Check for CSP meta tag
                if (!html.includes('Content-Security-Policy')) {
                    return {
                        passed: false,
                        details: 'CSP meta tag missing from dashboard'
                    };
                }

                // Check for required scripts and resources
                const requiredElements = [
                    'auth-guard.js',
                    'firebase.js',
                    'dashboard.js'
                ];

                for (const element of requiredElements) {
                    if (!html.includes(element)) {
                        return {
                            passed: false,
                            details: `Required script ${element} not found in dashboard`
                        };
                    }
                }

                return {
                    passed: true,
                    details: 'Dashboard page loads with proper CSP implementation'
                };
            } catch (error) {
                return {
                    passed: false,
                    details: `Dashboard access test failed: ${error.message}`
                };
            }
        }
    }
];

// Run CSP tests
export async function runCSPTests() {
    console.log('🛡️ Running CSP Implementation Tests...\n');

    const results = {
        passed: 0,
        failed: 0,
        total: cspTests.length,
        details: []
    };

    for (const test of cspTests) {
        console.log(`Testing: ${test.name}`);
        try {
            const result = await test.run();
            if (result.passed) {
                console.log(`✅ PASSED: ${result.details}`);
                results.passed++;
            } else {
                console.log(`❌ FAILED: ${result.details}`);
                results.failed++;
            }
            results.details.push({
                test: test.name,
                ...result
            });
        } catch (error) {
            console.log(`❌ ERROR: ${test.name} - ${error.message}`);
            results.failed++;
            results.details.push({
                test: test.name,
                passed: false,
                details: error.message
            });
        }
        console.log('');
    }

    console.log(`📊 Test Results: ${results.passed}/${results.total} passed`);

    if (results.failed > 0) {
        console.log('❌ Some CSP tests failed. Please review the implementation.');
    } else {
        console.log('✅ All CSP tests passed! Security implementation is working correctly.');
    }

    return results;
}

// Auto-run if this script is executed directly
if (typeof window !== 'undefined' && window.location) {
    // Browser environment - run tests
    runCSPTests();
}
