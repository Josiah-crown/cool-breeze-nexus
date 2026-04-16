import React from 'react';

const EmailTemplate: React.FC = () => {
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
                  backgroundImage: 'url(https://crowntechnologies.online/Emailtemplateimage.jpg)',
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
                          Take control of your business with live analytics
                        </h1>
                        <p style={{ 
                          color: '#ffffff', 
                          fontSize: '18px', 
                          margin: '0',
                          lineHeight: '1.6'
                        }}>
                          Imagine knowing about equipment problems before they become expensive emergencies. 24/7 monitoring that gives you complete peace of mind.
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
                    The Reactive Maintenance Issue
                  </p>
                  <p style={{ 
                    color: '#303329', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 20px 0'
                  }}>
                   At {'{{CompanyName}}'}, you know the stress of unexpected HVAC failures. The panicked 
Saturday afternoon when the cooling system or heatpump fails. The uncomfortable 
tenants or customers. The emergency repair bills that destroy your maintenance budget.                  
                  </p>
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
                    The Hidden Cost of Reactive Maintenance
                  </h2>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 15px 0'
                  }}>
                    When a motor fails unexpectedly, you're not just paying R6,255 for a replacement. You're paying for:
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
                          • Emergency callout fees
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
                          • Lost productivity and tenant complaints
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
                          • Complete system replacement instead of component repair
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
                          • Rushed decisions without proper planning
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
                    But what if your HVAC equipment could tell you before it breaks?
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
                    🛡️ Introducing Predictive HVAC Monitoring
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
                          <strong>✓ Real-Time Equipment Health</strong><br />
                          <span style={{ color: '#666666' }}>Monitor temperature, current, voltage, and operational status 24/7 from anywhere</span>
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
                          <strong>✓ Early Warning Alerts</strong><br />
                          <span style={{ color: '#666666' }}>Detect motor degradation, inefficient cooling, and component wear before catastrophic failure</span>
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
                          <strong>✓ Scheduled Component Repairs</strong><br />
                          <span style={{ color: '#666666' }}>Fix problems during planned maintenance visits—not emergency callouts</span>
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
                          <strong>✓ Historical Intelligence</strong><br />
                          <span style={{ color: '#666666' }}>Track equipment lifespan patterns to predict and prevent future failures</span>
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
                          <strong>✓ All with an inexpensive plug on device</strong><br />
                          <span style={{ color: '#666666' }}>No void warranties, no expensive installs, simply install during your next scheduled service</span>
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
                          Zero
                        </p>
                        <p style={{ 
                          color: '#666666', 
                          fontSize: '14px', 
                          margin: '0',
                          lineHeight: '1.4'
                        }}>
                          Unexpected Downtime Emergencies
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
                          Continuous Equipment Monitoring
                        </p>
                      </td>
                      <td width="33%" style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                        <p style={{ 
                          color: '#8FB83D', 
                          fontSize: '32px', 
                          fontWeight: 'bold',
                          margin: '0 0 5px 0'
                        }}>
                          Included
                        </p>
                        <p style={{ 
                          color: '#666666', 
                          fontSize: '14px', 
                          margin: '0',
                          lineHeight: '1.4'
                        }}>
                          In Your SLA for a small additional monthly fee
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
                    Here's what changes for you:
                  </h3>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 15px 0'
                  }}>
                    Instead of reactive firefighting, you get proactive maintenance. Your dashboard shows real-time equipment health. When a motor starts running hot or drawing unusual current, you get an alert—days or weeks before it fails.
                  </p>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 15px 0'
                  }}>
                    You schedule a repair during your next maintenance visit. The technician replaces a bearing or fan blade instead of the entire motor assembly. Cost: a fraction of emergency replacement. Downtime: zero.
                  </p>
                  <p style={{ 
                    color: '#303329', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0',
                    fontStyle: 'italic'
                  }}>
                    This isn't theory—it's how we work with commercial facilities across Johannesburg.
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
                    Want to see how this works for your facility?
                  </h3>
                  <p style={{ 
                    color: '#666666', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 25px 0'
                  }}>
                    Schedule a 5-Minute Discovery Call<br />
                    <span style={{ fontSize: '14px', color: '#999999' }}>No obligation. No pressure. Just a conversation about your HVAC challenges and how predictive monitoring could help.</span>
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
                          href="mailto:Josiah@crowntechnologies.co.za?subject=Request%20for%20Discovery%20Call&body=Hi%20Josiah,%0D%0A%0D%0AI%20would%20like%20to%20schedule%20a%20brief%20discovery%20call%20to%20discuss%20the%20HVAC%20challenges%20we%20are%20currently%20experiencing%20and%20explore%20how%20your%20predictive%20monitoring%20solutions%20could%20help%20address%20them.%0D%0A%0D%0AI%20am%20available%20for%20a%20call%20[date+time]%0D%0A%0D%0AThank%20you%20in%20advance.%0D%0A%0D%0ABest%20regards,%0D%0A[Your%20Name]%0D%0A[Your%20Company%20/%20Facility%20Name]%0D%0A[Your%20Phone%20Number]"
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

export default EmailTemplate;
