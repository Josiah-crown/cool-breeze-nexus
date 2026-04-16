import React from 'react';

const PharmacyEmailTemplate: React.FC = () => {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '600px', 
      margin: '0 auto', 
      backgroundColor: '#ffffff',
      padding: '0'
    }}>
      {/* Email Container - Email-safe structure */}
      <table 
        role="presentation" 
        cellSpacing="0" 
        cellPadding="0" 
        border={0} 
        width="100%"
        style={{ backgroundColor: '#f5f5f5', padding: '20px 0' }}
      >
        <tr>
          <td align="center">
            <table 
              role="presentation" 
              cellSpacing="0" 
              cellPadding="0" 
              border={0} 
              width="600"
              style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}
            >
              {/* Header with Logo */}
              <tr>
                <td style={{ 
                  backgroundImage: 'url(https://crowntechnologies.online/Email_template_Header.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  padding: '0'
                }}>
                  {/* Nested table for overlay effect - 80% opaque */}
                  <table role="presentation" cellSpacing="0" cellPadding="0" border={0} width="100%">
                    <tr>
                      <td style={{ 
                        backgroundColor: 'rgba(48, 51, 41, 0.8)',
                        padding: '30px 40px',
                        textAlign: 'center'
                      }}>
                        <img 
                          src="https://crowntechnologies.online/3.png"
                          alt="Crown Technologies Logo" 
                          style={{ 
                            maxWidth: '200px', 
                            height: 'auto',
                            display: 'block',
                            margin: '0 auto'
                          }} 
                        />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              {/* Hero Section */}
              <tr>
                <td style={{ 
                  backgroundImage: 'url(https://crowntechnologies.online/pharmacy-hero-image.jpg)', // Suggested: Clean pharmacy interior, white sterile environment, or modern medication storage
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  padding: '0'
                }}>
                  {/* Nested table for overlay effect */}
                  <table role="presentation" cellSpacing="0" cellPadding="0" border={0} width="100%">
                    <tr>
                      <td style={{ 
                        backgroundColor: 'rgba(143, 184, 61, 0.7)',
                        padding: '50px 40px',
                        textAlign: 'center'
                      }}>
                        <h1 style={{ 
                          color: '#ffffff', 
                          fontSize: '32px', 
                          fontWeight: 'bold',
                          margin: '0 0 15px 0',
                          lineHeight: '1.2'
                        }}>
                          The HVAC Maintenance and Monitoring Solution
                        </h1>
                        <p style={{ 
                          color: '#ffffff', 
                          fontSize: '18px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              {/* Greeting Section - PERSONALIZED */}
              <tr>
                <td style={{ padding: '40px 40px 20px 40px' }}>
                  <p style={{ 
                    color: '#303329', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 20px 0'
                  }}>
                    Hi {'{{FirstName}}'}, {/* PERSONALIZATION ADDED */}
                  </p>
                  <p style={{ 
                    color: '#303329', 
                    fontSize: '24px', 
                    fontWeight: 'bold',
                    lineHeight: '1.6',
                    margin: '0 0 20px 0'
                  }}>
                    HVAC Maintenance and Monitoring
                  </p>
                  <p style={{ 
                    color: '#303329', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 20px 0'
                  }}>
                   At {'{{CompanyName}}'}, You understand the importance of maintaining consistent temperature conditions and humidity levels. Our product will augment your existing BMS system, allowing you to pinpoint the HVAC device which is out of parameters and causing temperature and humidity fluctuations.
                  </p>
                </td>
              </tr>

              {/* Hygienic Pharmacy Image Section */}
              <tr>
                <td style={{ padding: '0 40px 30px 40px', textAlign: 'center' }}>
                  <img 
                    src="https://crowntechnologies.online/pharmacy-hygienic-image.jpg" 
                    alt="Modern, hygienic pharmacy storage area with clean white refrigerators and organized medication storage"
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      borderRadius: '8px',
                      display: 'block',
                      margin: '0 auto',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  {/* Image suggestions - Replace the URL above with one of these hygienic pharmacy images:
                    - Clean, modern pharmacy interior with white storage units
                    - Professional pharmacy refrigerator with organized medication shelves
                    - Sterile-looking pharmacy storage room with proper lighting
                    - Close-up of temperature-controlled medication storage
                    - Modern pharmacy counter with clean, organized appearance
                    
                    Recommended sources:
                    - Unsplash: Search "pharmacy interior", "medical storage", "pharmacy refrigerator"
                    - Pexels: Search "pharmacy", "medical storage", "clean medical facility"
                    - Stock photo sites: Keywords "hygienic pharmacy", "pharmacy storage", "medical compliance"
                    
                    Image characteristics for hygienic feel:
                    - Colors: White, light blue, soft greens (clean/sterile feel)
                    - Lighting: Bright, even lighting
                    - Style: Clean, modern, professional
                    - Focus: Organization, cleanliness, technology, compliance
                  */}
                </td>
              </tr>

              {/* The Hidden Cost Section */}
              <tr>
                <td style={{ padding: '0 40px 30px 40px' }}>
                  <h2 style={{ 
                    color: '#303329', 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    margin: '0 0 15px 0'
                  }}>
                    Untracked HVAC equipment's Hidden Costs
                  </h2>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 15px 0'
                  }}>
                    When storage temperatures exceed SAHPRA limits, DISASTER!:
                  </p>
                  
                  {/* Cost List */}
                  <table role="presentation" cellSpacing="0" cellPadding="0" border={0} width="100%">
                    <tr>
                      <td style={{ padding: '8px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          • Stock Write off
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          • SAHPRA penalties
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          • Patient safety risks
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          • Eventual reputation damage
                        </p>
                      </td>
                    </tr>
                  </table>
                  <p style={{ 
                    color: '#303329', 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    lineHeight: '1.6',
                    margin: '20px 0 0 0'
                  }}>
                    OUR monitoring system is designed to minimise these risks!
                  </p>
                </td>
              </tr>

              {/* Introducing Section */}
              <tr>
                <td style={{ 
                  backgroundColor: '#f9f9f9',
                  padding: '40px'
                }}>
                  <h2 style={{ 
                    color: '#303329', 
                    fontSize: '24px', 
                    fontWeight: 'bold',
                    margin: '0 0 20px 0'
                  }}>
                    🏥 Introducing CrownIOT, HVAC Pro-active monitoring
                  </h2>
                  
                  {/* Features List */}
                  <table role="presentation" cellSpacing="0" cellPadding="0" border={0} width="100%">
                    <tr>
                      <td style={{ padding: '12px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          <strong>✓ Better Analytics</strong><br />
                          <span style={{ color: '#666666' }}>Continuous monitoring of every individual cooler</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          <strong>✓ Alert System</strong><br />
                          <span style={{ color: '#666666' }}>Receive notifications of device failure</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          <strong>✓ Compliance Reporting Per Device</strong><br />
                          <span style={{ color: '#666666' }}>Generate reports of temperature, electricity usage and incident logs</span>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: '12px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          <strong>✓ Cloud-Based Dashboard</strong><br />
                          <span style={{ color: '#666666' }}>Access real-time monitoring data for individual HVAC units</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          <strong>✓ Easy Installation & Maintenance</strong><br />
                          <span style={{ color: '#666666' }}>Wireless sensors installed in minutes. Maintenance included in SLA</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 0' }}>
                        <p style={{ 
                          color: '#303329', 
                          fontSize: '16px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          <strong>✓ Tailor made solutions</strong><br />
                          <span style={{ color: '#666666' }}>Have specific needs? Bespoke solutions available on request</span>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              {/* Stats Section */}
              <tr>
                <td style={{ padding: '40px' }}>
                  <table role="presentation" cellSpacing="0" cellPadding="0" border={0} width="100%">
                    <tr>
                      <td width="33%" style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                        <p style={{ 
                          color: '#8FB83D', 
                          fontSize: '32px', 
                          fontWeight: 'bold',
                          margin: '0 0 5px 0'
                        }}>
                          Analytics
                        </p>
                        <p style={{ 
                          color: '#666666', 
                          fontSize: '14px', 
                          margin: '0',
                          lineHeight: '1.4'
                        }}>
                          No more guesswork
                        </p>
                      </td>
                      <td width="33%" style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                        <p style={{ 
                          color: '#8FB83D', 
                          fontSize: '32px', 
                          fontWeight: 'bold',
                          margin: '0 0 5px 0'
                        }}>
                          24/7
                        </p>
                        <p style={{ 
                          color: '#666666', 
                          fontSize: '14px', 
                          margin: '0',
                          lineHeight: '1.4'
                        }}>
                          Peace of mind
                        </p>
                      </td>
                      <td width="33%" style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                        <p style={{ 
                          color: '#8FB83D', 
                          fontSize: '32px', 
                          fontWeight: 'bold',
                          margin: '0 0 5px 0'
                        }}>
                          Alerts
                        </p>
                        <p style={{ 
                          color: '#666666', 
                          fontSize: '14px', 
                          margin: '0',
                          lineHeight: '1.4'
                        }}>
                          Real time
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              {/* What Changes Section */}
              <tr>
                <td style={{ padding: '0 40px 30px 40px' }}>
                  <h3 style={{ 
                    color: '#303329', 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    margin: '0 0 15px 0'
                  }}>
                    Here's what changes for your pharmacy:
                  </h3>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 15px 0'
                  }}>
                    When Temperature paramaters are exceeded, pinpoint the failing device from your computer, reduce guesswork!.
                  </p>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 15px 0'
                  }}>
                     Our monitoring system is designed to pick up a trend towards failure, allowing us to schedule repairs at the next service, reducing repair costs significantly.
                  </p>
                  <p style={{ 
                    color: '#303329', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0',
                    fontStyle: 'italic'
                  }}>
                    HVAC breakdown reduced by 90%!
                  </p>
                </td>
              </tr>

              {/* CTA Section */}
              <tr>
                <td style={{ padding: '0 40px 40px 40px' }}>
                  <h3 style={{ 
                    color: '#303329', 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    margin: '0 0 15px 0'
                  }}>
                    Ready to protect your pharmacy and ensure SAHPRA compliance?
                  </h3>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 25px 0'
                  }}>
                    Schedule a 5-Minute Discovery Call<br />
                    <span style={{ fontSize: '14px', color: '#999999' }}>No obligation. No pressure. Just a conversation about your pharmacy's storage monitoring needs and how we can help ensure compliance and patient safety.</span>
                  </p>
                  
                  {/* CTA Button */}
                  <table 
                    role="presentation" 
                    cellSpacing="0" 
                    cellPadding="0" 
                    border={0}
                    style={{ margin: '0 auto' }}
                  >
                    <tr>
                      <td style={{ 
                        backgroundColor: '#8FB83D',
                        borderRadius: '6px',
                        padding: '0'
                      }}>
                        <a 
                          href="mailto:Josiah@crowntechnologies.co.za?subject=Pharmacy%20Monitoring%20Discovery%20Call&body=Hi%20Josiah,%0D%0A%0D%0AI%20would%20like%20to%20schedule%20a%20brief%20discovery%20call%20to%20discuss%20our%20pharmacy's%20temperature%20monitoring%20needs%20and%20explore%20how%20your%20SAHPRA-compliant%20monitoring%20solutions%20could%20help%20ensure%20medication%20safety%20and%20regulatory%20compliance.%0D%0A%0D%0AI%20am%20available%20for%20a%20call%20[date+time]%0D%0A%0D%0AThank%20you%20in%20advance.%0D%0A%0D%0ABest%20regards,%0D%0A[Your%20Name]%0D%0A[Your%20Pharmacy%20Name]%0D%0A[Your%20Phone%20Number]"
                          style={{ 
                            display: 'inline-block', 
                            padding: '16px 32px', 
                            color: '#ffffff', 
                            textDecoration: 'none', 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            borderRadius: '6px' }}
                        >
                          Schedule a 5-Minute Discovery Call
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              {/* Footer */}
              <tr>
                <td style={{ 
                  backgroundImage: 'url(https://crowntechnologies.online/Email_template_Footer.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  padding: '0'
                }}>
                  {/* Nested table for overlay effect - 80% opaque */}
                  <table role="presentation" cellSpacing="0" cellPadding="0" border={0} width="100%">
                    <tr>
                      <td style={{ 
                        backgroundColor: 'rgba(48, 51, 41, 0.8)',
                        padding: '30px 40px',
                        textAlign: 'center'
                      }}>
                  <p style={{ 
                    color: '#ffffff', 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    margin: '0 0 10px 0'
                  }}>
                    Crown Technologies
                  </p>
                  <p style={{ 
                    color: '#cccccc', 
                    fontSize: '14px', 
                    margin: '0 0 5px 0'
                  }}>
                    Pharmacy-Grade Environmental Monitoring & Compliance Solutions
                  </p>
                  <p style={{ 
                    color: '#cccccc', 
                    fontSize: '14px', 
                    margin: '0 0 20px 0'
                  }}>
                    Serving Pharmacies Across South Africa - SAHPRA Compliant Solutions
                  </p>
                  
                  {/* Contact Info */}
                  <table 
                    role="presentation" 
                    cellSpacing="0" 
                    cellPadding="0" 
                    border={0}
                    style={{ margin: '0 auto 20px auto' }}
                  >
                    <tr>
                      <td style={{ padding: '5px 0', textAlign: 'center' }}>
                        <p style={{ 
                          color: '#cccccc', 
                          fontSize: '14px', 
                          margin: '0'
                        }}>
                           <a href="mailto:info@crowntechnologies.co.za" style={{ color: '#8FB83D', textDecoration: 'none' }}>info@crowntechnologies.co.za</a>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '5px 0', textAlign: 'center' }}>
                        <p style={{ 
                          color: '#cccccc', 
                          fontSize: '14px', 
                          margin: '0'
                        }}>
                           +27 69 843 3669
                           
                        </p>
                        <p style={{ 
                          color: '#cccccc', 
                          fontSize: '14px', 
                          margin: '0'
                        }}>
                          
                           +27 86 112 7696
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '5px 0', textAlign: 'center' }}>
                        <p style={{ 
                          color: '#cccccc', 
                          fontSize: '14px', 
                          margin: '0'
                        }}>
                           <a href="https://crowntechnologies.co.za" style={{ color: '#8FB83D', textDecoration: 'none' }}>www.crowntechnologies.co.za</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  {/* Social Links */}
<table 
  role="presentation" 
  cellSpacing="0" 
  cellPadding="0" 
  border={0}
  style={{ margin: '0 auto 20px auto' }}
>
  <tr>
    <td style={{ padding: '0 8px' }}>
      <a 
        href="https://www.linkedin.com/company/crown-technologies-za/posts/?feedView=all" 
        style={{ 
          color: '#8FB83D',
          textDecoration: 'none',
          fontSize: '14px'
        }}
      >
        LinkedIn
      </a>
    </td>
    <td style={{ padding: '0 8px' }}>
      <span style={{ color: '#666666' }}>|</span>
    </td>
    <td style={{ padding: '0 8px' }}>
      <a 
        href="https://www.facebook.com/crowntechsa" 
        style={{ 
          color: '#8FB83D',
          textDecoration: 'none',
          fontSize: '14px'
        }}
      >
        Facebook
      </a>
    </td>
    <td style={{ padding: '0 8px' }}>
      <span style={{ color: '#666666' }}>|</span>
    </td>
    <td style={{ padding: '0 8px' }}>
      <a 
        href="https://www.instagram.com/crowntechnologiesonline/" 
        style={{ 
          color: '#8FB83D',
          textDecoration: 'none',
          fontSize: '14px'
        }}
      >
        Instagram
      </a>
    </td>
    <td style={{ padding: '0 8px' }}>
      <span style={{ color: '#666666' }}>|</span>
    </td>
    <td style={{ padding: '0 8px' }}>
      <a 
        href="https://www.youtube.com/@crowntechnologiesZA" 
        style={{ 
          color: '#8FB83D',
          textDecoration: 'none',
          fontSize: '14px'
        }}
      >
        YouTube
      </a>
    </td>
  </tr>
</table>
{/* Unsubscribe and Copyright - ADDED */}
<p style={{ 
  color: '#999999', 
  fontSize: '12px', 
  margin: '20px 0 0 0',
  lineHeight: '1.6'
}}>
  © 2026 Crown Technologies. All rights reserved.<br />
  <a 
    href="mailto:info@crowntechnologies.co.za?subject=Unsubscribe%20Request" 
    style={{ 
      color: '#8FB83D', 
      textDecoration: 'underline' 
    }}
  >
    Unsubscribe from future emails
  </a>
</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  );
};

export default PharmacyEmailTemplate;
