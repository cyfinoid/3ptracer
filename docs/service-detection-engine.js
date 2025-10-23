// Centralized Service Detection Engine
class ServiceDetectionEngine {
    constructor() {
        this.servicePatterns = this.initializeServicePatterns();
        this.vendorPatterns = this.initializeVendorPatterns();
    }

    // Initialize service patterns in a cleaner structure
    initializeServicePatterns() {
        return {
            email: {
                'Google Workspace': {
                    patterns: ['googlemail.com', 'google.com', 'gmail.com'],
                    mxPatterns: ['google', 'gmail'],
                    spfPatterns: ['include:_spf.google.com', 'include:spf.google.com'],
                    description: 'Email hosting and productivity suite'
                },
                'Microsoft 365': {
                    patterns: ['outlook.com', 'hotmail.com', 'microsoft.com'],
                    mxPatterns: ['outlook', 'hotmail', 'microsoft'],
                    spfPatterns: ['include:spf.protection.outlook.com', 'include:outlook.com'],
                    description: 'Email hosting and productivity suite'
                },
                'Zoho Mail': {
                    patterns: ['zoho.com'],
                    mxPatterns: ['zoho'],
                    spfPatterns: ['include:zoho.com', 'include:spf.zoho.com'],
                    description: 'Business email hosting'
                },
                'ProtonMail': {
                    patterns: ['protonmail.ch'],
                    mxPatterns: ['protonmail'],
                    spfPatterns: ['include:_spf.protonmail.ch'],
                    description: 'Secure email service'
                },
                'SendGrid': {
                    patterns: ['sendgrid.net'],
                    spfPatterns: ['include:sendgrid.net'],
                    description: 'Email delivery service'
                },
                'Mailgun': {
                    patterns: ['mailgun.org'],
                    spfPatterns: ['include:mailgun.org'],
                    description: 'Email API service'
                },
                'Amazon SES': {
                    patterns: ['amazonses.com'],
                    spfPatterns: ['include:amazonses.com'],
                    description: 'Email sending service'
                },
                'Proofpoint': {
                    patterns: ['pphosted.com', 'proofpoint.com'],
                    spfPatterns: ['include:pphosted.com', 'include:spf.pphosted.com'],
                    description: 'Email security and protection service'
                },
                'Mimecast': {
                    patterns: ['mimecast.com'],
                    spfPatterns: ['include:spf.mimecast.com'],
                    description: 'Email security and archiving service'
                },
                'Barracuda': {
                    patterns: ['barracuda.com', 'barracudacentral.org'],
                    spfPatterns: ['include:spf.barracuda.com'],
                    description: 'Email security and filtering service'
                },
                'Sophos': {
                    patterns: ['sophos.com'],
                    spfPatterns: ['include:spf.sophos.com'],
                    description: 'Email security and anti-spam service'
                }
            },
            cloud: {
                'Amazon AWS': {
                    patterns: ['amazonaws.com', 'aws.amazon.com', 'cloudfront.net', 'awsapprunner.com'],
                    cnamePatterns: ['amazonaws.com', 'cloudfront.net', 'awsapprunner.com'],
                    txtPatterns: ['amazonses'],
                    description: 'Cloud computing platform'
                },
                'Microsoft Azure': {
                    patterns: ['azurewebsites.net', 'azure.com', 'windows.net'],
                    cnamePatterns: ['azurewebsites.net', 'windows.net'],
                    txtPatterns: ['MS='],
                    description: 'Cloud computing platform'
                },
                'Google Cloud Platform': {
                    patterns: ['googleusercontent.com', 'appspot.com', 'firebaseapp.com', 'web.app'],
                    cnamePatterns: ['googleusercontent.com', 'appspot.com', 'firebaseapp.com', 'web.app'],
                    description: 'Cloud computing platform'
                },
                'Cloudflare': {
                    patterns: ['cloudflare.com', 'pages.dev'],
                    cnamePatterns: ['pages.dev'],
                    nsPatterns: ['cloudflare'],
                    description: 'CDN, security services, and DNS management'
                },
                'Heroku': {
                    patterns: ['herokuapp.com'],
                    cnamePatterns: ['herokuapp.com'],
                    description: 'Application hosting platform'
                },
                'Vercel': {
                    patterns: ['vercel.app', 'vercel.com'],
                    cnamePatterns: ['vercel.app'],
                    description: 'Deployment platform'
                },
                'Netlify': {
                    patterns: ['netlify.app', 'netlify.com'],
                    cnamePatterns: ['netlify.app'],
                    description: 'Site hosting platform'
                },
                'DigitalOcean': {
                    patterns: ['ondigitalocean.app', 'digitalocean.com'],
                    cnamePatterns: ['ondigitalocean.app'],
                    description: 'Cloud infrastructure platform'
                },
                'Linode': {
                    patterns: ['linode.com', 'linodeobjects.com'],
                    cnamePatterns: ['linode.com'],
                    description: 'Cloud infrastructure platform'
                },
                'Hetzner': {
                    patterns: ['hetzner.cloud', 'hetzner.com'],
                    cnamePatterns: ['hetzner.cloud'],
                    description: 'Cloud infrastructure platform'
                },
                'GitHub Pages': {
                    patterns: ['github.io'],
                    cnamePatterns: ['github.io'],
                    description: 'Static site hosting'
                },
                'GitLab Pages': {
                    patterns: ['gitlab.io'],
                    cnamePatterns: ['gitlab.io'],
                    description: 'Static site hosting'
                },
                'Render': {
                    patterns: ['render.com', 'onrender.com'],
                    cnamePatterns: ['onrender.com'],
                    description: 'Cloud application platform'
                },
                'Fly.io': {
                    patterns: ['fly.dev', 'fly.io'],
                    cnamePatterns: ['fly.dev', 'fly.io'],
                    description: 'Application deployment platform'
                }
            },
            analytics: {
                'Google Analytics': {
                    patterns: ['google-analytics.com', 'googletagmanager.com'],
                    txtPatterns: ['google-site-verification'],
                    description: 'Web analytics tracking'
                },
                'Facebook Pixel': {
                    patterns: ['facebook.com'],
                    txtPatterns: ['facebook-domain-verification'],
                    description: 'Social media tracking'
                },
                'Adobe Analytics': {
                    patterns: ['adobe.com'],
                    txtPatterns: ['adobe-domain-verification', 'adobe-sign-verification'],
                    description: 'Adobe analytics and marketing tools'
                },
                'Mixpanel': {
                    patterns: ['mixpanel.com'],
                    txtPatterns: ['mixpanel-domain-verify'],
                    description: 'Product analytics platform'
                },
                'Hotjar': {
                    patterns: ['hotjar.com'],
                    txtPatterns: ['hotjar-site-verification'],
                    description: 'User behavior analytics and heatmaps'
                },
                'Segment': {
                    patterns: ['segment.com'],
                    txtPatterns: ['segment-site-verification'],
                    description: 'Customer data platform'
                }
            },
            security: {
                'Let\'s Encrypt': {
                    patterns: ['letsencrypt.org'],
                    txtPatterns: ['letsencrypt'],
                    description: 'SSL certificate provider'
                },
                'Cloudflare': {
                    patterns: ['cloudflare.com'],
                    txtPatterns: ['cloudflare-verify'],
                    description: 'Security and performance services'
                },
                'HackerOne': {
                    patterns: ['hackerone.com'],
                    txtPatterns: ['hackerone-verification'],
                    description: 'Bug bounty and vulnerability disclosure platform'
                },
                'Keybase': {
                    patterns: ['keybase.io'],
                    txtPatterns: ['keybase-site-verification'],
                    description: 'Identity verification and secure messaging'
                }
            },
            marketing: {
                'HubSpot': {
                    patterns: ['hubspot.com', 'hs-sites.com'],
                    txtPatterns: ['hubspot-developer-verification', 'hs-site-verification'],
                    description: 'Marketing automation and CRM platform'
                },
                'Salesforce': {
                    patterns: ['salesforce.com', 'force.com'],
                    txtPatterns: ['salesforce-site-verification', 'pardot-domain-verification'],
                    description: 'CRM and marketing automation'
                },
                'Mailchimp': {
                    patterns: ['mailchimp.com'],
                    txtPatterns: ['mailchimp-domain-verification'],
                    description: 'Email marketing platform'
                },
                'Intercom': {
                    patterns: ['intercom.io'],
                    txtPatterns: ['intercom-domain-verify'],
                    description: 'Customer messaging platform'
                },
                'Zendesk': {
                    patterns: ['zendesk.com'],
                    txtPatterns: ['zendesk-verification'],
                    description: 'Customer support platform'
                },
                'Typeform': {
                    patterns: ['typeform.com'],
                    txtPatterns: ['typeform-verify'],
                    description: 'Online form and survey builder'
                }
            },
            social: {
                'Twitter': {
                    patterns: ['twitter.com'],
                    txtPatterns: ['twitter-domain-verification'],
                    description: 'Social media platform verification'
                },
                'LinkedIn': {
                    patterns: ['linkedin.com'],
                    txtPatterns: ['linkedin-domain-verification'],
                    description: 'Professional networking platform verification'
                },
                'Pinterest': {
                    patterns: ['pinterest.com'],
                    txtPatterns: ['pinterest-site-verification'],
                    description: 'Visual discovery platform verification'
                },
                'Instagram': {
                    patterns: ['instagram.com'],
                    txtPatterns: ['instagram-domain-verification'],
                    description: 'Social media platform verification'
                },
                'TikTok': {
                    patterns: ['tiktok.com'],
                    txtPatterns: ['tiktok-domain-verification'],
                    description: 'Short-form video platform verification'
                },
                'YouTube': {
                    patterns: ['youtube.com'],
                    txtPatterns: ['youtube-domain-verification'],
                    description: 'Video platform verification'
                },
                'Bluesky': {
                    patterns: ['bsky.app', 'atproto.com'],
                    txtPatterns: ['_atproto'],
                    description: 'Decentralized social network (AT Protocol)'
                },
                'Mastodon': {
                    patterns: ['mastodon.social', 'joinmastodon.org'],
                    txtPatterns: ['mastodon-verification'],
                    description: 'Decentralized social network verification'
                }
            },
            payments: {
                'Stripe': {
                    patterns: ['stripe.com'],
                    txtPatterns: ['stripe-verification'],
                    description: 'Payment processing platform'
                },
                'PayPal': {
                    patterns: ['paypal.com'],
                    txtPatterns: ['paypal-domain-verification'],
                    description: 'Digital payment platform'
                },
                'Square': {
                    patterns: ['squareup.com'],
                    txtPatterns: ['square-site-verification'],
                    description: 'Payment processing and business tools'
                },
                'Shopify': {
                    patterns: ['shopify.com', 'myshopify.com'],
                    txtPatterns: ['shopify-domain-verification'],
                    description: 'E-commerce platform'
                }
            },
            monitoring: {
                'Pingdom': {
                    patterns: ['pingdom.com'],
                    txtPatterns: ['pingdom-verification'],
                    description: 'Website monitoring and performance'
                },
                'New Relic': {
                    patterns: ['newrelic.com'],
                    txtPatterns: ['newrelic-domain-verification'],
                    description: 'Application performance monitoring'
                },
                'StatusPage': {
                    patterns: ['statuspage.io'],
                    txtPatterns: ['statuspage-domain-verification'],
                    description: 'Status page and incident communication'
                },
                'DataDog': {
                    patterns: ['datadoghq.com'],
                    txtPatterns: ['datadog-domain-verification'],
                    description: 'Infrastructure monitoring and analytics'
                }
            },
            productivity: {
                'Slack': {
                    patterns: ['slack.com'],
                    txtPatterns: ['slack-domain-verification'],
                    description: 'Team communication platform'
                },
                'Microsoft 365': {
                    patterns: ['office.com', 'office365.com'],
                    txtPatterns: ['ms-office-verification', 'office365-domain-verification'],
                    description: 'Office productivity suite'
                },
                'Google Workspace': {
                    patterns: ['google.com', 'googledomains.com'],
                    txtPatterns: ['google-site-verification', 'googleapps-domain-verification'],
                    description: 'Productivity and collaboration suite'
                },
                'Zoom': {
                    patterns: ['zoom.us'],
                    txtPatterns: ['zoom-domain-verification'],
                    description: 'Video conferencing platform'
                },
                'Atlassian': {
                    patterns: ['atlassian.com'],
                    txtPatterns: ['atlassian-domain-verification'],
                    description: 'Development and collaboration tools'
                }
            },
            content: {
                'WordPress.com': {
                    patterns: ['wordpress.com'],
                    txtPatterns: ['wordpress-verification'],
                    description: 'Content management system'
                },
                'Ghost': {
                    patterns: ['ghost.io', 'ghost.org'],
                    txtPatterns: ['ghost-site-verification'],
                    description: 'Publishing platform'
                },
                'Medium': {
                    patterns: ['medium.com'],
                    txtPatterns: ['medium-domain-verification'],
                    description: 'Online publishing platform'
                },
                'Webflow': {
                    patterns: ['webflow.io'],
                    txtPatterns: ['webflow-domain-verification'],
                    description: 'Website design and hosting platform'
                }
            },
            communication: {
                'XMPP/Jabber Service': {
                    patterns: ['jabber.org', 'xmpp.org', 'conversations.im', 'prosody.im', 'ejabberd.im'],
                    cnamePatterns: ['jabber', 'xmpp', 'chat', 'im'],
                    txtPatterns: ['xmpp-verification', 'jabber-verification'],
                    description: 'XMPP/Jabber instant messaging service'
                },
                'Conversations.im': {
                    patterns: ['conversations.im'],
                    cnamePatterns: ['conversations'],
                    txtPatterns: ['conversations-verification'],
                    description: 'Popular XMPP service provider'
                },
                'Matrix Protocol': {
                    patterns: ['matrix.org'],
                    cnamePatterns: ['matrix'],
                    txtPatterns: ['matrix-verification'],
                    description: 'Matrix decentralized communication protocol'
                },
                'Discord': {
                    patterns: ['discord.com', 'discordapp.com'],
                    txtPatterns: ['discord-domain-verification'],
                    description: 'Voice and text communication platform'
                },
                'Telegram': {
                    patterns: ['telegram.org'],
                    txtPatterns: ['telegram-domain-verification'],
                    description: 'Instant messaging platform'
                }
            },
            web3: {
                'ENS (Ethereum Name Service)': {
                    patterns: ['ens.domains'],
                    txtPatterns: ['ens-domain-verification', '_ens'],
                    description: 'Ethereum domain name system'
                },
                'Unstoppable Domains': {
                    patterns: ['unstoppabledomains.com'],
                    txtPatterns: ['unstoppable-domain-verification'],
                    description: 'Blockchain-based domain system'
                },
                'IPFS': {
                    patterns: ['ipfs.io'],
                    txtPatterns: ['_ipfs', 'ipfs-hash'],
                    description: 'InterPlanetary File System content addressing'
                },
                'Arweave': {
                    patterns: ['arweave.org'],
                    txtPatterns: ['_arweave', 'arweave-verification'],
                    description: 'Permanent data storage network'
                }
            },
            dns: {
                'GoDaddy DNS': {
                    patterns: ['godaddy.com'],
                    nsPatterns: ['godaddy.com', 'domaincontrol.com'],
                    description: 'Domain registration and DNS management'
                },
                'Namecheap DNS': {
                    patterns: ['namecheap.com'],
                    nsPatterns: ['namecheap.com'],
                    description: 'Domain registration and DNS management'
                },
                'Google Domains': {
                    patterns: ['domains.google'],
                    nsPatterns: ['domains.google'],
                    description: 'Domain registration and DNS management'
                },
                'AWS Route 53': {
                    patterns: ['amazonaws.com'],
                    nsPatterns: ['awsdns'],
                    description: 'Amazon DNS service'
                }
            }
        };
    }

    // Initialize vendor patterns for ASN classification
    initializeVendorPatterns() {
        return {
            'Amazon AWS': /amazon|aws/i,
            'Microsoft Azure': /microsoft|azure/i,
            'Google Cloud Platform': /google|gcp/i,
            'Cloudflare': /cloudflare/i,
            'DigitalOcean': /digitalocean/i,
            'Linode': /linode/i,
            'Vultr': /vultr/i,
            'OVHcloud': /ovh/i,
            'Hetzner': /hetzner/i
        };
    }

    // Main service detection method - replaces all scattered detection methods
    detectServices(records, domainBeingAnalyzed = null) {
        const detectedServices = new Map();

        if (!records || typeof records !== 'object') {
            return [];
        }

        // Process each record type for service detection
        this.processRecordType(records.MX, 'mxPatterns', 'MX', detectedServices);
        this.processRecordType(records.SPF, 'spfPatterns', 'SPF', detectedServices);
        this.processRecordType(records.CNAME, 'cnamePatterns', 'CNAME', detectedServices);
        this.processRecordType(records.NS, 'nsPatterns', 'NS', detectedServices);

        // Process CAA records to detect certificate authority trust relationships
        if (records.CAA && domainBeingAnalyzed) {
            this.processCAARecords(records.CAA, detectedServices, domainBeingAnalyzed);
        }

        // Process SRV records to detect service dependencies
        if (records.SRV && domainBeingAnalyzed) {
            this.processSRVRecords(records.SRV, detectedServices, domainBeingAnalyzed);
        }

        // Process TXT records for service detection (but exclude DNS policy records)
        if (records.TXT) {
            const filteredTXT = records.TXT.filter(record => {
                const data = record.data.toLowerCase();
                return !data.includes('v=dmarc1') && !data.includes('v=spf1');
            });
            this.processRecordType(filteredTXT, 'txtPatterns', 'TXT', detectedServices);
        }

        // Process DMARC records to detect third-party reporting services
        if (records.DMARC && domainBeingAnalyzed) {
            this.processDMARCRecords(records.DMARC, detectedServices, domainBeingAnalyzed);
        }

        // Process DKIM records to detect third-party email services
        if (records.DKIM && domainBeingAnalyzed) {
            this.processDKIMRecords(records.DKIM, detectedServices, domainBeingAnalyzed);
        }

        // Note: DMARC and SPF policy records are now handled separately as DNS records

        return Array.from(detectedServices.values());
    }

    // Process DNS policy records (SPF, DMARC, etc.) separately from services
    processDNSRecords(records) {
        const dnsRecords = [];
        
        if (!records || typeof records !== 'object') {
            return dnsRecords;
        }

        // Process SPF records
        if (records.SPF) {
            for (const record of records.SPF) {
                const spfData = record.data;
                if (spfData.toLowerCase().includes('v=spf1')) {
                    dnsRecords.push({
                        type: 'SPF',
                        name: 'Sender Policy Framework',
                        description: 'Email authentication policy to prevent spoofing',
                        data: spfData,
                        record: record,
                        category: 'email-security'
                    });
                }
            }
        }

        // Process DMARC records
        if (records.DMARC) {
            for (const record of records.DMARC) {
                const dmarcData = record.data.toLowerCase();
                if (dmarcData.includes('v=dmarc1')) {
                    const dmarcInfo = this.parseDMARC(dmarcData);
                    dnsRecords.push({
                        type: 'DMARC',
                        name: 'Domain-based Message Authentication, Reporting & Conformance',
                        description: 'Email authentication and reporting policy',
                        data: record.data,
                        record: record,
                        category: 'email-security',
                        parsed: dmarcInfo
                    });
                }
            }
        }

        // Process DKIM records
        if (records.DKIM) {
            for (const record of records.DKIM) {
                const dkimInfo = record.parsedInfo || {};
                const serviceName = dkimInfo.possibleService ? 
                    dkimInfo.possibleService.name : 'Unknown Email Service';
                
                dnsRecords.push({
                    type: 'DKIM',
                    name: 'DomainKeys Identified Mail',
                    description: `Email authentication via cryptographic signatures (Selector: ${record.selector})`,
                    data: record.data,
                    record: record,
                    category: 'email-security',
                    parsed: {
                        selector: record.selector,
                        service: serviceName,
                        keyType: dkimInfo.keyType || 'RSA',
                        confidence: dkimInfo.possibleService?.confidence || 'unknown',
                        publicKeyPreview: dkimInfo.publicKey || 'Not found'
                    }
                });
            }
        }

        // Process other important TXT records (excluding SPF, DMARC, and DKIM)
        if (records.TXT) {
            for (const record of records.TXT) {
                const txtData = record.data.toLowerCase();
                
                // Skip SPF, DMARC, and DKIM records (already processed above)
                if (txtData.includes('v=spf1') || txtData.includes('v=dmarc1') || txtData.includes('v=dkim1')) {
                    continue;
                }
                
                // Look for other important DNS records
                if (txtData.includes('_domainkey')) {
                    dnsRecords.push({
                        type: 'DKIM-Key',
                        name: 'DKIM Public Key',
                        description: 'Public key for DKIM email authentication',
                        data: record.data,
                        record: record,
                        category: 'email-security'
                    });
                } else if (txtData.includes('-site-verification') || txtData.includes('-domain-verification')) {
                    // Generic site verification records
                    const serviceName = this.extractServiceFromVerification(record.data);
                    dnsRecords.push({
                        type: 'Site-Verification',
                        name: 'Domain Verification Record',
                        description: `Domain ownership verification for ${serviceName || 'third-party service'}`,
                        data: record.data,
                        record: record,
                        category: 'verification'
                    });
                } else if (txtData.includes('verification') || txtData.includes('verify')) {
                    // Other verification patterns
                    const serviceName = this.extractServiceFromVerification(record.data);
                    dnsRecords.push({
                        type: 'Verification',
                        name: 'Service Verification Record',
                        description: `Service verification for ${serviceName || 'unknown service'}`,
                        data: record.data,
                        record: record,
                        category: 'verification'
                    });
                } else if (txtData.startsWith('v=') && !txtData.includes('spf') && !txtData.includes('dmarc') && !txtData.includes('dkim')) {
                    // Generic versioned protocol records
                    dnsRecords.push({
                        type: 'Protocol-Record',
                        name: 'Versioned Protocol Record',
                        description: 'Structured protocol or service configuration record',
                        data: record.data,
                        record: record,
                        category: 'protocol'
                    });
                }
            }
        }

        // Process CAA records
        if (records.CAA) {
            for (const record of records.CAA) {
                const caaInfo = this.parseCAARecord(record.data) || {};
                const caName = this.identifyKnownCA(caaInfo.value) || caaInfo.value;
                
                dnsRecords.push({
                    type: 'CAA',
                    name: 'Certificate Authority Authorization',
                    description: `Certificate issuance authorization - ${caaInfo.tag === 'issue' ? 'Standard' : caaInfo.tag === 'issuewild' ? 'Wildcard' : 'Reporting'} record`,
                    data: record.data,
                    record: record,
                    category: 'certificate-security',
                    parsed: {
                        flags: caaInfo.flags || 0,
                        tag: caaInfo.tag || 'unknown',
                        authority: caName,
                        isKnownCA: !!this.identifyKnownCA(caaInfo.value)
                    }
                });
            }
        }

        // Process SRV records
        if (records.SRV) {
            for (const record of records.SRV) {
                const srvInfo = record.parsedInfo || {};
                
                dnsRecords.push({
                    type: 'SRV',
                    name: 'Service Discovery Record',
                    description: `Service discovery - ${srvInfo.description || 'Service location record'}`,
                    data: record.data,
                    record: record,
                    category: 'service-discovery',
                    parsed: {
                        service: srvInfo.service || 'unknown',
                        target: srvInfo.target || 'unknown',
                        port: srvInfo.port || 0,
                        priority: srvInfo.priority || 0,
                        weight: srvInfo.weight || 0,
                        serviceType: srvInfo.serviceType?.name || 'Unknown Service'
                    }
                });
            }
        }

        return dnsRecords;
    }

    // Process DKIM records to detect third-party email services
    processDKIMRecords(dkimRecords, detectedServices, domainBeingAnalyzed) {
        console.log(`🔍 Processing ${dkimRecords.length} DKIM records for domain: ${domainBeingAnalyzed}`);
        
        for (const record of dkimRecords) {
            const dkimInfo = record.parsedInfo || {};
            const possibleService = dkimInfo.possibleService;
            
            console.log(`📧 Checking DKIM record with selector '${record.selector}':`, possibleService);
            
            if (possibleService) {
                // This DKIM record indicates a third-party email service
                const serviceName = `${possibleService.name} (Email Service)`;
                const isHighConfidence = possibleService.confidence === 'high';
                const serviceDescription = isHighConfidence ? 
                    `Confirmed third-party email service - DKIM selector indicates ${possibleService.name}` :
                    `Possible third-party email service - DKIM selector suggests ${possibleService.name}`;
                
                console.log(`🚨 Found third-party email service: ${serviceName} (confidence: ${possibleService.confidence})`);
                
                this.addOrUpdateService(
                    detectedServices, 
                    serviceName, 
                    {
                        description: serviceDescription,
                        selector: record.selector,
                        keyType: dkimInfo.keyType || 'RSA',
                        confidence: possibleService.confidence,
                        isThirdParty: true,
                        isEmailService: true,
                        securityImplication: 'Email authentication handled by external service'
                    }, 
                    'email', 
                    record, 
                    'DKIM'
                );
            } else {
                // Unknown DKIM selector - could be custom or unrecognized service
                const serviceName = `Unknown Email Service (${record.selector})`;
                const serviceDescription = `DKIM record found with unrecognized selector - could indicate custom email setup or unknown third-party service`;
                
                console.log(`⚠️ Found unrecognized DKIM selector: ${record.selector}`);
                
                this.addOrUpdateService(
                    detectedServices, 
                    serviceName, 
                    {
                        description: serviceDescription,
                        selector: record.selector,
                        keyType: dkimInfo.keyType || 'RSA',
                        confidence: 'unknown',
                        isThirdParty: false, // Don't flag as third-party unless we know for sure
                        isEmailService: true,
                        securityImplication: 'Custom or unrecognized email authentication setup'
                    }, 
                    'email', 
                    record, 
                    'DKIM'
                );
            }
        }
    }

    // Process a specific record type against patterns
    processRecordType(records, patternType, recordType, detectedServices) {
        if (!records || !Array.isArray(records)) return;

        for (const record of records) {
            const recordData = record.data.toLowerCase();
            
            // Check all service categories
            for (const [category, services] of Object.entries(this.servicePatterns)) {
                for (const [serviceName, serviceConfig] of Object.entries(services)) {
                    if (this.matchesPattern(recordData, serviceConfig[patternType])) {
                        this.addOrUpdateService(detectedServices, serviceName, serviceConfig, category, record, recordType);
                    }
                }
            }
        }
    }

    // Check if record data matches any pattern
    matchesPattern(recordData, patterns) {
        if (!patterns || !Array.isArray(patterns)) return false;
        return patterns.some(pattern => recordData.includes(pattern.toLowerCase()));
    }

    // Add or update service in the detected services map
    addOrUpdateService(detectedServices, serviceName, serviceConfig, category, record, recordType) {
        const recordWithSubdomain = {
            ...record,
            subdomain: record.subdomain || record.name || 'unknown'
        };

        if (detectedServices.has(serviceName)) {
            const existingService = detectedServices.get(serviceName);
            existingService.records.push(recordWithSubdomain);
            if (!existingService.recordTypes.includes(recordType)) {
                existingService.recordTypes.push(recordType);
            }
        } else {
            detectedServices.set(serviceName, {
                name: serviceName,
                category: category,
                description: serviceConfig.description,
                records: [recordWithSubdomain],
                recordTypes: [recordType]
            });
        }
    }

    // Process DMARC records with special parsing
    processDMARCRecords(dmarcRecords, detectedServices, domainBeingAnalyzed) {
        console.log(`🔍 Processing ${dmarcRecords.length} DMARC records for domain: ${domainBeingAnalyzed}`);
        
        for (const record of dmarcRecords) {
            const dmarcData = record.data.toLowerCase();
            console.log(`📧 Checking DMARC record: ${dmarcData}`);
            
            if (dmarcData.includes('v=dmarc1')) {
                const dmarcInfo = this.parseDMARC(dmarcData);
                if (dmarcInfo) {
                    // Don't add DMARC as a service anymore - it goes to DNS records
                    // this.addOrUpdateService(detectedServices, 'DMARC', dmarcInfo, 'security', record, 'DMARC');
                }
                
                // Extract and detect third-party DMARC reporting services
                this.detectDMARCReportingServices(dmarcData, detectedServices, domainBeingAnalyzed, record);
            }
        }
    }

    // Parse DMARC record
    parseDMARC(dmarcData) {
        const policy = this.extractDMARCPolicy(dmarcData);
        const reporting = this.extractDMARCReporting(dmarcData);
        
        return {
            description: `Email authentication policy: ${policy}${reporting ? `, Reporting: ${reporting}` : ''}`,
            policy: policy,
            reporting: reporting,
            raw: dmarcData
        };
    }

    // Extract DMARC policy
    extractDMARCPolicy(dmarcData) {
        const policyMatch = dmarcData.match(/p=([^;]+)/i);
        if (policyMatch) {
            const policy = policyMatch[1].toLowerCase();
            switch (policy) {
                case 'none': return 'Monitor only (none)';
                case 'quarantine': return 'Quarantine suspicious emails';
                case 'reject': return 'Reject unauthorized emails';
                default: return `Policy: ${policy}`;
            }
        }
        return 'No policy specified';
    }

    // Extract DMARC reporting information
    extractDMARCReporting(dmarcData) {
        const reporting = [];
        
        const ruaMatch = dmarcData.match(/rua=mailto:([^;]+)/i);
        if (ruaMatch) reporting.push(`Aggregate reports: ${ruaMatch[1]}`);
        
        const rufMatch = dmarcData.match(/ruf=mailto:([^;]+)/i);
        if (rufMatch) reporting.push(`Forensic reports: ${rufMatch[1]}`);
        
        const pctMatch = dmarcData.match(/pct=([^;]+)/i);
        if (pctMatch) reporting.push(`${pctMatch[1]}% of emails`);
        
        return reporting.length > 0 ? reporting.join(', ') : 'No reporting configured';
    }

    // Detect third-party DMARC reporting services
    detectDMARCReportingServices(dmarcData, detectedServices, domainBeingAnalyzed, record) {
        console.log(`🔍 Processing DMARC record for domain: ${domainBeingAnalyzed}`);
        console.log(`📧 DMARC data: ${dmarcData}`);
        
        // Extract RUA (aggregate reports) and RUF (forensic reports) emails
        const reportingEmails = [];
        
        const ruaMatch = dmarcData.match(/rua=mailto:([^;,\s]+)/gi);
        if (ruaMatch) {
            ruaMatch.forEach(match => {
                const email = match.replace(/rua=mailto:/i, '');
                reportingEmails.push({ email, type: 'aggregate' });
            });
        }
        
        const rufMatch = dmarcData.match(/ruf=mailto:([^;,\s]+)/gi);
        if (rufMatch) {
            rufMatch.forEach(match => {
                const email = match.replace(/ruf=mailto:/i, '');
                reportingEmails.push({ email, type: 'forensic' });
            });
        }
        
        console.log(`📬 Extracted ${reportingEmails.length} reporting emails:`, reportingEmails);
        
        // Check each reporting email to see if it's external
        reportingEmails.forEach(({ email, type }) => {
            const emailDomain = email.split('@')[1];
            console.log(`🔍 Checking email: ${email}, domain: ${emailDomain}, analyzing: ${domainBeingAnalyzed}`);
            
            if (emailDomain && emailDomain !== domainBeingAnalyzed) {
                // ANY external domain is a third-party dependency - flag it prominently
                const knownServiceName = this.identifyKnownDMARCService(emailDomain);
                const isKnownService = knownServiceName !== null;
                
                // Create clear service name that emphasizes third-party nature
                const serviceName = isKnownService 
                    ? `${knownServiceName} (3rd Party DMARC)` 
                    : `Third-Party DMARC Service (${emailDomain})`;
                
                const serviceDescription = isKnownService
                    ? `Known DMARC ${type} reporting service - External dependency`
                    : `Unknown DMARC ${type} reporting service - EXTERNAL DEPENDENCY ALERT`;
                
                console.log(`🚨 Found third-party DMARC dependency: ${serviceName} (${email})`);
                
                this.addOrUpdateService(
                    detectedServices, 
                    serviceName, 
                    {
                        description: serviceDescription,
                        reportingEmail: email,
                        reportingType: type,
                        domain: emailDomain,
                        isThirdParty: true,
                        isKnownService: isKnownService,
                        securityImplication: 'Email authentication reports sent to external service'
                    }, 
                    'security', 
                    record, 
                    'DMARC'
                );
            } else {
                console.log(`ℹ️ Internal email found: ${email} (same domain as ${domainBeingAnalyzed})`);
            }
        });
    }

    // Identify known DMARC reporting services by domain (returns null if unknown)
    identifyKnownDMARCService(domain) {
        const dmarcServices = {
            'dmarcian.com': 'Dmarcian',
            'valimail.com': 'Valimail',
            'ondmarc.redsift.com': 'OnDMARC',
            'dmarc.postmarkapp.com': 'Postmark DMARC',
            'reports.dmarc.cyber.gov.au': 'Australian Cyber Security Centre',
            'dmarc-reports.cloudflare.com': 'Cloudflare DMARC',
            'dmarc.microsoft.com': 'Microsoft DMARC',
            'google.com': 'Google DMARC',
            'reports.uri.us': 'URI DMARC',
            'agari.com': 'Agari',
            'fraudmarc.com': 'FraudMARC',
            'returnpath.com': 'Return Path',
            'proofpoint.com': 'Proofpoint'
        };
        
        // Check for exact domain match
        if (dmarcServices[domain]) {
            return dmarcServices[domain];
        }
        
        // Check for subdomain matches
        for (const [serviceDomain, serviceName] of Object.entries(dmarcServices)) {
            if (domain.endsWith(serviceDomain)) {
                return serviceName;
            }
        }
        
        // Return null for unknown services (don't create generic names)
        return null;
    }

    // Process CAA records to detect certificate authority trust relationships
    processCAARecords(caaRecords, detectedServices, domainBeingAnalyzed) {
        console.log(`🔍 Processing ${caaRecords.length} CAA records for domain: ${domainBeingAnalyzed}`);
        
        for (const record of caaRecords) {
            const caaData = record.data;
            console.log(`🔒 Checking CAA record: ${caaData}`);
            
            // Parse CAA record: flags tag value
            const caaInfo = this.parseCAARecord(caaData);
            if (caaInfo && caaInfo.tag === 'issue' || caaInfo.tag === 'issuewild') {
                // This CAA record indicates a trusted certificate authority
                const caName = this.identifyKnownCA(caaInfo.value);
                const isKnownCA = caName !== null;
                
                // Create clear service name that emphasizes trust relationship
                const serviceName = isKnownCA 
                    ? `${caName} (Trusted Certificate Authority)` 
                    : `Certificate Authority (${caaInfo.value})`;
                
                const serviceDescription = isKnownCA
                    ? `Authorized certificate authority - Domain trusts ${caName} to issue ${caaInfo.tag === 'issuewild' ? 'wildcard ' : ''}certificates`
                    : `Authorized certificate authority - Domain trusts ${caaInfo.value} to issue ${caaInfo.tag === 'issuewild' ? 'wildcard ' : ''}certificates`;
                
                console.log(`🚨 Found certificate authority trust relationship: ${serviceName}`);
                
                this.addOrUpdateService(
                    detectedServices, 
                    serviceName, 
                    {
                        description: serviceDescription,
                        certificateAuthority: caaInfo.value,
                        flags: caaInfo.flags,
                        tag: caaInfo.tag,
                        isKnownCA: isKnownCA,
                        isTrustRelationship: true,
                        securityImplication: `Domain explicitly trusts this CA to issue ${caaInfo.tag === 'issuewild' ? 'wildcard ' : ''}SSL certificates`
                    }, 
                    'security', 
                    record, 
                    'CAA'
                );
            } else if (caaInfo && caaInfo.tag === 'iodef') {
                // CAA violation reporting endpoint
                const serviceName = `CAA Violation Reporting (${caaInfo.value})`;
                const serviceDescription = `Certificate authority violation reporting - Security incidents reported to ${caaInfo.value}`;
                
                console.log(`📧 Found CAA violation reporting: ${serviceName}`);
                
                this.addOrUpdateService(
                    detectedServices, 
                    serviceName, 
                    {
                        description: serviceDescription,
                        reportingEndpoint: caaInfo.value,
                        flags: caaInfo.flags,
                        tag: caaInfo.tag,
                        isReportingService: true,
                        securityImplication: 'Certificate authority violations will be reported to this endpoint'
                    }, 
                    'security', 
                    record, 
                    'CAA'
                );
            }
        }
    }

    // Parse CAA record data
    parseCAARecord(data) {
        // CAA record format: flags tag "value"
        const parts = data.trim().split(/\s+/);
        if (parts.length < 3) return null;
        
        const flags = parseInt(parts[0]) || 0;
        const tag = parts[1].toLowerCase();
        // Join remaining parts and remove quotes
        const value = parts.slice(2).join(' ').replace(/^["']|["']$/g, '');
        
        return {
            flags: flags,
            tag: tag,
            value: value
        };
    }

    // Identify known certificate authorities by domain
    identifyKnownCA(domain) {
        const knownCAs = {
            'letsencrypt.org': 'Let\'s Encrypt',
            'digicert.com': 'DigiCert',
            'sectigo.com': 'Sectigo',
            'comodo.com': 'Comodo',
            'godaddy.com': 'GoDaddy',
            'globalsign.com': 'GlobalSign',
            'entrust.com': 'Entrust',
            'thawte.com': 'Thawte',
            'verisign.com': 'VeriSign',
            'geotrust.com': 'GeoTrust',
            'rapidssl.com': 'RapidSSL',
            'ssl.com': 'SSL.com',
            'trustwave.com': 'Trustwave',
            'buypass.com': 'Buypass',
            'startssl.com': 'StartSSL',
            'wosign.com': 'WoSign',
            'certum.eu': 'Certum',
            'actalis.it': 'Actalis',
            'izenpe.com': 'Izenpe',
            'quovadis.com': 'QuoVadis',
            'amazon.com': 'Amazon Trust Services',
            'cloudflare.com': 'Cloudflare',
            'google.com': 'Google Trust Services',
            'microsoft.com': 'Microsoft',
            'apple.com': 'Apple'
        };
        
        // Check for exact domain match
        if (knownCAs[domain]) {
            return knownCAs[domain];
        }
        
        // Check for subdomain matches
        for (const [caDomain, caName] of Object.entries(knownCAs)) {
            if (domain.endsWith(caDomain)) {
                return caName;
            }
        }
        
        // Return null for unknown CAs (don't create generic names)
        return null;
    }

    // Extract service name from verification TXT records
    extractServiceFromVerification(data) {
        const lowerData = data.toLowerCase();
        
        // Common verification patterns
        const patterns = [
            { pattern: /google-site-verification/i, service: 'Google' },
            { pattern: /facebook-domain-verification/i, service: 'Facebook' },
            { pattern: /twitter-domain-verification/i, service: 'Twitter' },
            { pattern: /linkedin-domain-verification/i, service: 'LinkedIn' },
            { pattern: /pinterest-site-verification/i, service: 'Pinterest' },
            { pattern: /instagram-domain-verification/i, service: 'Instagram' },
            { pattern: /tiktok-domain-verification/i, service: 'TikTok' },
            { pattern: /youtube-domain-verification/i, service: 'YouTube' },
            { pattern: /_atproto/i, service: 'Bluesky' },
            { pattern: /mastodon-verification/i, service: 'Mastodon' },
            { pattern: /adobe-domain-verification/i, service: 'Adobe' },
            { pattern: /stripe-verification/i, service: 'Stripe' },
            { pattern: /paypal-domain-verification/i, service: 'PayPal' },
            { pattern: /shopify-domain-verification/i, service: 'Shopify' },
            { pattern: /hubspot.*verification/i, service: 'HubSpot' },
            { pattern: /salesforce.*verification/i, service: 'Salesforce' },
            { pattern: /mailchimp-domain-verification/i, service: 'Mailchimp' },
            { pattern: /slack-domain-verification/i, service: 'Slack' },
            { pattern: /zoom-domain-verification/i, service: 'Zoom' },
            { pattern: /atlassian-domain-verification/i, service: 'Atlassian' },
            { pattern: /pingdom-verification/i, service: 'Pingdom' },
            { pattern: /datadog-domain-verification/i, service: 'DataDog' },
            { pattern: /newrelic-domain-verification/i, service: 'New Relic' },
            { pattern: /ms.*verification|office.*verification/i, service: 'Microsoft' },
            { pattern: /cloudflare-verify/i, service: 'Cloudflare' },
            { pattern: /keybase.*verification/i, service: 'Keybase' },
            { pattern: /wordpress-verification/i, service: 'WordPress' },
            { pattern: /_ens|ens-domain-verification/i, service: 'ENS' },
            { pattern: /unstoppable-domain-verification/i, service: 'Unstoppable Domains' },
            { pattern: /_ipfs|ipfs-hash/i, service: 'IPFS' },
            { pattern: /_arweave|arweave-verification/i, service: 'Arweave' },
            { pattern: /xmpp-verification|jabber-verification/i, service: 'XMPP' },
            { pattern: /conversations-verification/i, service: 'Conversations.im' },
            { pattern: /matrix-verification/i, service: 'Matrix' },
            { pattern: /discord-domain-verification/i, service: 'Discord' },
            { pattern: /telegram-domain-verification/i, service: 'Telegram' }
        ];
        
        for (const { pattern, service } of patterns) {
            if (pattern.test(data)) {
                return service;
            }
        }
        
        // Try to extract service name from common patterns like "servicename-verification="
        const match = lowerData.match(/^([a-z0-9]+)[-_](?:site[-_]|domain[-_])?verif/);
        if (match && match[1] && match[1].length > 2) {
            return match[1].charAt(0).toUpperCase() + match[1].slice(1);
        }
        
        return null;
    }

    // Process SRV records to detect service dependencies
    processSRVRecords(srvRecords, detectedServices, domainBeingAnalyzed) {
        console.log(`🔍 Processing ${srvRecords.length} SRV records for domain: ${domainBeingAnalyzed}`);
        
        for (const record of srvRecords) {
            const srvInfo = record.parsedInfo;
            if (!srvInfo) continue;
            
            console.log(`🔧 Processing SRV service: ${srvInfo.service} → ${srvInfo.target}`);
            
            // Create service name based on the discovered service
            const serviceName = `${srvInfo.serviceType.name} Service (${srvInfo.service})`;
            const serviceDescription = `${srvInfo.description} - Target: ${srvInfo.target}:${srvInfo.port}`;
            
            console.log(`🚨 Found SRV service dependency: ${serviceName}`);
            
            this.addOrUpdateService(
                detectedServices, 
                serviceName, 
                {
                    description: serviceDescription,
                    target: srvInfo.target,
                    port: srvInfo.port,
                    priority: srvInfo.priority,
                    weight: srvInfo.weight,
                    servicePattern: srvInfo.service,
                    serviceCategory: srvInfo.serviceType.category,
                    isServiceDiscovery: true,
                    securityImplication: `Service accessible via SRV record discovery on ${srvInfo.target}:${srvInfo.port}`
                }, 
                'other', // As requested, classify SRV services under "Other services"
                record, 
                'SRV'
            );
        }
    }

    // Detect XMPP services from subdomain patterns
    detectXMPPServices(subdomainResults, detectedServices = null) {
        console.log(`🔍 Analyzing ${subdomainResults.length} subdomains for XMPP service patterns...`);
        
        // If no detectedServices map provided, create a temporary one and return results as array
        const isReturnArray = !detectedServices;
        if (!detectedServices) {
            detectedServices = new Map();
        }
        
        const xmppPatterns = [
            // Common XMPP subdomain patterns
            { pattern: /^(xmpp|jabber|chat|im|talk|conference|muc|pubsub)\./, service: 'XMPP Service' },
            { pattern: /\.(xmpp|jabber)\./, service: 'XMPP Service' },
            // Specific XMPP service patterns
            { pattern: /^(bosh|websocket)\./, service: 'XMPP Web/BOSH Gateway' },
            { pattern: /^(upload|proxy|voice|video)\./, service: 'XMPP Media Services' },
            // Known XMPP service providers
            { pattern: /^(conversations|prosody|ejabberd|openfire|tigase)\./, service: 'XMPP Server' },
            // XMPP-specific subdomains
            { pattern: /^(register|invite|admin|mod|moderator)\..*\.(im|chat|xmpp)$/, service: 'XMPP Management' },
            // Federation and transport subdomains
            { pattern: /^(s2s|transport|gateway|bridge)\./, service: 'XMPP Federation/Transport' },
        ];
        
        for (const subdomainResult of subdomainResults) {
            const subdomain = subdomainResult.subdomain;
            
            for (const { pattern, service } of xmppPatterns) {
                if (pattern.test(subdomain)) {
                    console.log(`🎯 Detected XMPP pattern in subdomain: ${subdomain} -> ${service}`);
                    
                    // Check if subdomain has actual IP resolution
                    const hasResolution = subdomainResult.ip || 
                                        (subdomainResult.ipAddresses && subdomainResult.ipAddresses.length > 0) ||
                                        (subdomainResult.records && subdomainResult.records.A && subdomainResult.records.A.length > 0);
                    
                    if (hasResolution) {
                        this.addOrUpdateService(
                            detectedServices,
                            `${service} (${subdomain})`,
                            {
                                description: `${service} detected via subdomain pattern analysis`,
                                subdomain: subdomain,
                                ip: subdomainResult.ip || subdomainResult.ipAddresses?.[0] || 'Resolved',
                                detectionMethod: 'subdomain-pattern',
                                isXMPPService: true,
                                securityImplication: 'Communication service - may handle sensitive messaging data'
                            },
                            'communication',
                            {
                                name: subdomain,
                                data: subdomainResult.ip || 'Pattern Detection',
                                subdomain: subdomain
                            },
                            'Subdomain-Pattern'
                        );
                    }
                }
            }
        }
        
        console.log(`✅ XMPP subdomain analysis complete`);
        
        // If called without detectedServices parameter, return array of detected services
        if (isReturnArray) {
            return Array.from(detectedServices.values());
        }
    }

    // Enhanced ASN-based vendor classification
    classifyVendor(asnInfo) {
        if (!asnInfo || !asnInfo.asn) {
            return { vendor: 'Unknown', category: 'infrastructure' };
        }
        
        const asn = asnInfo.asn.toLowerCase();
        
        // Check for known cloud providers
        if (asn.includes('amazon') || asn.includes('aws')) {
            return { 
                vendor: 'Amazon AWS', 
                category: 'cloud',
                asn: asnInfo.asn,
                location: asnInfo.location,
                city: asnInfo.city,
                isp: asnInfo.isp
            };
        } else if (asn.includes('digitalocean')) {
            return { 
                vendor: 'DigitalOcean', 
                category: 'cloud',
                asn: asnInfo.asn,
                location: asnInfo.location,
                city: asnInfo.city,
                isp: asnInfo.isp
            };
        } else if (asn.includes('linode')) {
            return { 
                vendor: 'Linode', 
                category: 'cloud',
                asn: asnInfo.asn,
                location: asnInfo.location,
                city: asnInfo.city,
                isp: asnInfo.isp
            };
        } else if (asn.includes('hetzner')) {
            return { 
                vendor: 'Hetzner', 
                category: 'cloud',
                asn: asnInfo.asn,
                location: asnInfo.location,
                city: asnInfo.city,
                isp: asnInfo.isp
            };
        } else {
            return { 
                vendor: asnInfo.asn || 'Unknown',
                category: 'infrastructure',
                asn: asnInfo.asn,
                location: asnInfo.location,
                city: asnInfo.city,
                isp: asnInfo.isp
            };
        }
    }

    // Security analysis methods
    detectDNSSecurityIssues(records) {
        const issues = [];
        
        if (!records.SPF || records.SPF.length === 0) {
            issues.push({
                type: 'missing_spf',
                risk: 'high',
                description: 'Missing SPF record - vulnerable to email spoofing',
                recommendation: 'Add SPF record to prevent email spoofing'
            });
        }
        
        if (!records.DMARC || records.DMARC.length === 0) {
            issues.push({
                type: 'missing_dmarc',
                risk: 'medium',
                description: 'Missing DMARC record - no email authentication policy',
                recommendation: 'Add DMARC record to protect against email spoofing'
            });
        }
        
        if (records.SPF) {
            for (const spfRecord of records.SPF) {
                const spfData = spfRecord.data.toLowerCase();
                if (spfData.includes('+all') || spfData.includes('?all')) {
                    issues.push({
                        type: 'weak_spf',
                        risk: 'medium',
                        description: 'Weak SPF record - too permissive',
                        recommendation: 'Use more restrictive SPF record (e.g., ~all instead of +all)',
                        record: spfData
                    });
                }
            }
        }
        
        return issues;
    }

    // Detect wildcard certificate security implications
    detectWildcardCertificateIssues(wildcardCertificates) {
        const issues = [];
        
        if (!wildcardCertificates || wildcardCertificates.length === 0) {
            return issues;
        }
        
        console.log(`🔍 Analyzing ${wildcardCertificates.length} wildcard certificates for security implications...`);
        
        // Group certificates by risk level and domain scope
        const topLevelWildcards = wildcardCertificates.filter(cert => 
            cert.domain.match(/^\*\.[^.]+\.[^.]+$/)
        );
        const subdomainWildcards = wildcardCertificates.filter(cert => 
            cert.domain.includes('*.') && !cert.domain.match(/^\*\.[^.]+\.[^.]+$/)
        );
        
        // Create grouped findings instead of individual ones
        if (topLevelWildcards.length > 0) {
            issues.push({
                type: 'wildcard_certificate',
                risk: 'high',
                description: `Top-level wildcard certificates detected (${topLevelWildcards.length}) - allow SSL for any subdomain`,
                recommendation: 'Consider using specific certificates for individual subdomains to limit attack surface',
                details: {
                    certificateCount: topLevelWildcards.length,
                    certificates: topLevelWildcards.map(cert => ({
                        domain: cert.domain,
                        issuer: cert.issuer,
                        source: cert.source,
                        validFrom: cert.notBefore,
                        validTo: cert.notAfter,
                        certificateId: cert.certificateId
                    }))
                },
                securityImplication: 'Top-level wildcard certificates can be misused if subdomain takeover occurs or if certificate is compromised'
            });
        }
        
        if (subdomainWildcards.length > 0) {
            issues.push({
                type: 'wildcard_certificate',
                risk: 'medium',
                description: `Subdomain wildcard certificates detected (${subdomainWildcards.length})`,
                recommendation: 'Ensure proper subdomain access controls are in place',
                details: {
                    certificateCount: subdomainWildcards.length,
                    certificates: subdomainWildcards.map(cert => ({
                        domain: cert.domain,
                        issuer: cert.issuer,
                        source: cert.source,
                        validFrom: cert.notBefore,
                        validTo: cert.notAfter,
                        certificateId: cert.certificateId
                    }))
                },
                securityImplication: 'Wildcard certificates can be misused if subdomain takeover occurs or if certificate is compromised'
            });
        }
        
        console.log(`✅ Created ${issues.length} grouped wildcard certificate findings for ${wildcardCertificates.length} certificates`);
        return issues;
    }

    detectEmailSecurityIssues(records) {
        const issues = [];
        
        if (records.DMARC) {
            for (const dmarcRecord of records.DMARC) {
                const dmarcData = dmarcRecord.data.toLowerCase();
                if (dmarcData.includes('p=none')) {
                    issues.push({
                        type: 'weak_dmarc',
                        risk: 'medium',
                        description: 'Weak DMARC policy - monitor only',
                        recommendation: 'Consider stronger DMARC policy (quarantine or reject)',
                        record: dmarcData
                    });
                }
            }
        }
        
        return issues;
    }

    detectInterestingInfrastructureFindings(records, subdomains) {
        const findings = [];
        
        const servicePatterns = ['ftp', 'telnet', 'ssh', 'smtp', 'pop3', 'imap', 'rdp', 'vnc'];
        const interestingPatterns = ['admin', 'login', 'test', 'dev', 'staging', 'backup', 'db', 'database', 'api', 'internal', 'private'];
        
        // Only analyze subdomains that have active IP addresses (not historical records)
        const activeSubdomains = subdomains.filter(subdomain => 
            subdomain.ip || 
            (subdomain.ipAddresses && subdomain.ipAddresses.length > 0)
        );
        
        for (const subdomain of activeSubdomains) {
            // Use standardized ipAddresses array
            const subdomainIP = subdomain.ipAddresses && subdomain.ipAddresses.length > 0 ? 
                subdomain.ipAddresses[0] : null;
            
            // Service-related subdomain detection (only for subdomains with IPs)
            if (subdomainIP) {
                for (const service of servicePatterns) {
                    const serviceRegex = new RegExp(`\\b${service}\\b`, 'i');
                    if (serviceRegex.test(subdomain.subdomain)) {
                        findings.push({
                            type: 'service_subdomain',
                            risk: 'info',
                            description: `Service-related subdomain: ${service.toUpperCase()}`,
                            recommendation: `Explore this subdomain for ${service.toUpperCase()} service insights`,
                            subdomain: subdomain.subdomain,
                            service: service,
                            ip: subdomainIP
                        });
                    }
                }
            }

            for (const pattern of interestingPatterns) {
                const fullDomain = subdomain.subdomain;
                
                if (fullDomain) {
                    // Extract subdomain part by removing domain.tld (last 2 parts)
                    const parts = fullDomain.split('.');
                    
                    if (parts.length > 2) {
                        // Get everything except the last 2 parts (domain + TLD)
                        const subdomainPart = parts.slice(0, -2).join('.');
                        
                        // Check pattern only in the actual subdomain part
                        const regex = new RegExp(`(^|\\.|-)${pattern}(\\.|$|-|$)`, 'i');
                        
                        if (regex.test(subdomainPart)) {
                            findings.push({
                                type: 'interesting_subdomain',
                                risk: 'info',
                                description: `Interesting subdomain pattern: ${pattern}`,
                                recommendation: 'Explore this subdomain for potential insights (pattern-based detection only)',
                                subdomain: fullDomain,
                                pattern: pattern,
                                ip: subdomainIP || 'Active subdomain'
                            });
                        }
                    }
                }
            }
            
        }
        
        console.log(`🔍 Interesting findings analysis: ${activeSubdomains.length} active subdomains analyzed, ${findings.length} findings discovered`);
        
        return findings;
    }

    detectCloudSecurityIssues(records, subdomains) {
        const issues = [];
        
        const cloudServices = ['s3', 'bucket', 'storage', 'cdn', 'static', 'assets', 'media', 'backup', 'archive', 'logs', 'temp', 'cache'];
        
        for (const subdomain of subdomains) {
            for (const service of cloudServices) {
                if (subdomain.subdomain.includes(service)) {
                    issues.push({
                        type: 'exposed_cloud_service',
                        risk: 'medium',
                        description: `Potential exposed cloud service: ${service}`,
                        recommendation: `Verify ${service} service security and access controls`,
                        subdomain: subdomain.subdomain
                    });
                }
            }
        }
        
        if (records.CNAME) {
            for (const cnameRecord of records.CNAME) {
                const cnameData = cnameRecord.data.toLowerCase();
                if (cnameData.includes('s3.amazonaws.com')) {
                    issues.push({
                        type: 's3_bucket_detected',
                        risk: 'medium',
                        description: 'S3 bucket detected - verify access controls',
                        recommendation: 'Check S3 bucket permissions and public access',
                        cname: cnameData
                    });
                }
            }
        }
        
        return issues;
    }

    detectTakeoverFromCNAME(cnameRecords) {
        const takeovers = [];
        const vulnerableServices = [
            'github.io', 'herokuapp.com', 'netlify.app', 'vercel.app', 'surge.sh',
            'readme.io', 'unbouncepages.com', 'firebaseapp.com', 'appspot.com',
            'cloudapp.net', 'azurewebsites.net', 'dokkuapp.com', 'bubble.io',
            'webflow.io', 'squarespace.com', 'wixsite.com', 'tumblr.com',
            'wordpress.com', 'blogspot.com'
        ];

        for (const record of cnameRecords) {
            const cnameTarget = record.data;
            for (const service of vulnerableServices) {
                if (cnameTarget.includes(service)) {
                    takeovers.push({
                        subdomain: record.name,
                        cname: cnameTarget,
                        service: service,
                        risk: 'medium',
                        description: `CNAME points to ${service} - potential takeover target`,
                        type: 'subdomain_takeover'
                    });
                }
            }
        }

        return takeovers;
    }
} 