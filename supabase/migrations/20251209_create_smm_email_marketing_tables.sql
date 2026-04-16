-- ============================================================================
-- SMM Email Marketing System - Database Schema
-- ============================================================================
-- Date: December 9, 2025
-- Purpose: Create all tables for the Social Media Marketing (SMM) email system
-- Tag: SMM (all tables prefixed with SMM_)
-- ============================================================================
-- This migration creates the complete email marketing system including:
-- - Contact management
-- - Template system (pre-built templates)
-- - Campaign management (up to 20 recipients per campaign)
-- - Email sending and tracking
-- - Smart bounce handling with review system
-- ============================================================================

-- ============================================================================
-- 1. CONTACT MANAGEMENT
-- ============================================================================

-- SMM Contacts Table
CREATE TABLE IF NOT EXISTS public.SMM_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'active', -- active, unsubscribed, bounced
  source VARCHAR(100), -- manual, import, form, etc.
  tags TEXT[], -- Array of tags for segmentation
  custom_fields JSONB, -- Flexible custom fields
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT SMM_contacts_email_company_unique UNIQUE(company_id, email)
);

-- Indexes for SMM_contacts
CREATE INDEX IF NOT EXISTS idx_SMM_contacts_company_id ON public.SMM_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_SMM_contacts_email ON public.SMM_contacts(email);
CREATE INDEX IF NOT EXISTS idx_SMM_contacts_status ON public.SMM_contacts(status);
CREATE INDEX IF NOT EXISTS idx_SMM_contacts_tags ON public.SMM_contacts USING GIN(tags);

-- ============================================================================
-- 2. TEMPLATE SYSTEM (Pre-built Templates)
-- ============================================================================

-- SMM Templates Table
CREATE TABLE IF NOT EXISTS public.SMM_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- welcome, promotional, transactional, etc.
  html_content TEXT NOT NULL,
  editable_fields JSONB NOT NULL, -- Array of editable field definitions
  merge_variables TEXT[], -- Available merge tags like {{FirstName}}, {{CompanyName}}
  thumbnail_url VARCHAR(500), -- Preview image URL
  is_system_template BOOLEAN DEFAULT false, -- System templates vs user templates
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Indexes for SMM_templates
CREATE INDEX IF NOT EXISTS idx_SMM_templates_company_id ON public.SMM_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_SMM_templates_category ON public.SMM_templates(category);
CREATE INDEX IF NOT EXISTS idx_SMM_templates_is_active ON public.SMM_templates(is_active);

-- ============================================================================
-- 3. CAMPAIGN MANAGEMENT
-- ============================================================================

-- SMM Campaigns Table
CREATE TABLE IF NOT EXISTS public.SMM_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.SMM_templates(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  reply_to_email VARCHAR(255),
  preheader_text VARCHAR(255),
  template_content JSONB NOT NULL, -- Editable field values
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, cancelled
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0
);

-- Indexes for SMM_campaigns
CREATE INDEX IF NOT EXISTS idx_SMM_campaigns_company_id ON public.SMM_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_SMM_campaigns_template_id ON public.SMM_campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_SMM_campaigns_status ON public.SMM_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_SMM_campaigns_scheduled_at ON public.SMM_campaigns(scheduled_at);

-- SMM Campaign Recipients (up to 20 per campaign)
CREATE TABLE IF NOT EXISTS public.SMM_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.SMM_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.SMM_contacts(id) ON DELETE CASCADE,
  custom_greeting TEXT, -- Personalized greeting for this recipient
  recipient_order INTEGER, -- Order in campaign (1-20)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT SMM_campaign_recipients_campaign_contact_unique UNIQUE(campaign_id, contact_id)
);

-- Indexes for SMM_campaign_recipients
CREATE INDEX IF NOT EXISTS idx_SMM_campaign_recipients_campaign_id ON public.SMM_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_SMM_campaign_recipients_contact_id ON public.SMM_campaign_recipients(contact_id);

-- ============================================================================
-- 4. EMAIL SENDING & TRACKING
-- ============================================================================

-- SMM Email Sends (Individual email tracking)
CREATE TABLE IF NOT EXISTS public.SMM_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.SMM_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.SMM_contacts(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.SMM_campaign_recipients(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
  smtp_server VARCHAR(100), -- Which SMTP server was used (mail1, mail2, etc.)
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  message_id VARCHAR(255), -- SMTP message ID
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for SMM_sends
CREATE INDEX IF NOT EXISTS idx_SMM_sends_campaign_id ON public.SMM_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_SMM_sends_contact_id ON public.SMM_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_SMM_sends_status ON public.SMM_sends(status);
CREATE INDEX IF NOT EXISTS idx_SMM_sends_sent_at ON public.SMM_sends(sent_at);

-- SMM Email Opens (Open tracking)
CREATE TABLE IF NOT EXISTS public.SMM_opens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  send_id UUID NOT NULL REFERENCES public.SMM_sends(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- desktop, mobile, tablet
  location VARCHAR(100)
);

-- Indexes for SMM_opens
CREATE INDEX IF NOT EXISTS idx_SMM_opens_send_id ON public.SMM_opens(send_id);
CREATE INDEX IF NOT EXISTS idx_SMM_opens_opened_at ON public.SMM_opens(opened_at);

-- SMM Email Clicks (Click tracking)
CREATE TABLE IF NOT EXISTS public.SMM_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  send_id UUID NOT NULL REFERENCES public.SMM_sends(id) ON DELETE CASCADE,
  link_url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50)
);

-- Indexes for SMM_clicks
CREATE INDEX IF NOT EXISTS idx_SMM_clicks_send_id ON public.SMM_clicks(send_id);
CREATE INDEX IF NOT EXISTS idx_SMM_clicks_clicked_at ON public.SMM_clicks(clicked_at);

-- ============================================================================
-- 5. BOUNCE HANDLING & FAILED ADDRESSES
-- ============================================================================

-- SMM Bounces Table
CREATE TABLE IF NOT EXISTS public.SMM_bounces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  send_id UUID NOT NULL REFERENCES public.SMM_sends(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.SMM_contacts(id) ON DELETE CASCADE,
  bounce_type VARCHAR(50) NOT NULL, -- network_failure, soft_bounce, hard_bounce
  bounce_reason TEXT,
  bounce_code VARCHAR(50), -- SMTP error code
  bounced_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  is_resolved BOOLEAN DEFAULT false
);

-- Indexes for SMM_bounces
CREATE INDEX IF NOT EXISTS idx_SMM_bounces_send_id ON public.SMM_bounces(send_id);
CREATE INDEX IF NOT EXISTS idx_SMM_bounces_contact_id ON public.SMM_bounces(contact_id);
CREATE INDEX IF NOT EXISTS idx_SMM_bounces_bounce_type ON public.SMM_bounces(bounce_type);
CREATE INDEX IF NOT EXISTS idx_SMM_bounces_bounced_at ON public.SMM_bounces(bounced_at);

-- SMM Failed Addresses (Review List - 30 day retention)
CREATE TABLE IF NOT EXISTS public.SMM_failed_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  contact_id UUID REFERENCES public.SMM_contacts(id) ON DELETE SET NULL,
  failure_reason TEXT,
  failure_type VARCHAR(50) NOT NULL, -- network_failure, soft_bounce, hard_bounce
  failure_count INTEGER DEFAULT 1,
  first_failure_at TIMESTAMPTZ DEFAULT NOW(),
  last_failure_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending_review', -- pending_review, approved_deletion, restored, auto_deleted
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  deletion_reason TEXT,
  deleted_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT SMM_failed_addresses_company_email_unique UNIQUE(company_id, email)
);

-- Indexes for SMM_failed_addresses
CREATE INDEX IF NOT EXISTS idx_SMM_failed_addresses_company_id ON public.SMM_failed_addresses(company_id);
CREATE INDEX IF NOT EXISTS idx_SMM_failed_addresses_email ON public.SMM_failed_addresses(email);
CREATE INDEX IF NOT EXISTS idx_SMM_failed_addresses_status ON public.SMM_failed_addresses(status);
CREATE INDEX IF NOT EXISTS idx_SMM_failed_addresses_first_failure_at ON public.SMM_failed_addresses(first_failure_at);
CREATE INDEX IF NOT EXISTS idx_SMM_failed_addresses_last_failure_at ON public.SMM_failed_addresses(last_failure_at);

-- ============================================================================
-- 6. UNSUBSCRIBE MANAGEMENT
-- ============================================================================

-- SMM Unsubscribes Table
CREATE TABLE IF NOT EXISTS public.SMM_unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.SMM_contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.SMM_campaigns(id) ON DELETE SET NULL,
  send_id UUID REFERENCES public.SMM_sends(id) ON DELETE SET NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT SMM_unsubscribes_company_contact_unique UNIQUE(company_id, contact_id)
);

-- Indexes for SMM_unsubscribes
CREATE INDEX IF NOT EXISTS idx_SMM_unsubscribes_company_id ON public.SMM_unsubscribes(company_id);
CREATE INDEX IF NOT EXISTS idx_SMM_unsubscribes_contact_id ON public.SMM_unsubscribes(contact_id);
CREATE INDEX IF NOT EXISTS idx_SMM_unsubscribes_unsubscribed_at ON public.SMM_unsubscribes(unsubscribed_at);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all SMM tables
ALTER TABLE public.SMM_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_bounces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_failed_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SMM_unsubscribes ENABLE ROW LEVEL SECURITY;

-- SMM_contacts Policies
CREATE POLICY "SMM_contacts_select_own_company"
  ON public.SMM_contacts FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_contacts_insert_own_company"
  ON public.SMM_contacts FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_contacts_update_own_company"
  ON public.SMM_contacts FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_contacts_delete_own_company"
  ON public.SMM_contacts FOR DELETE
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

-- SMM_templates Policies
CREATE POLICY "SMM_templates_select_own_company_or_system"
  ON public.SMM_templates FOR SELECT
  USING (
    is_system_template = true 
    OR company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_templates_insert_own_company"
  ON public.SMM_templates FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_templates_update_own_company"
  ON public.SMM_templates FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

-- SMM_campaigns Policies
CREATE POLICY "SMM_campaigns_select_own_company"
  ON public.SMM_campaigns FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_campaigns_insert_own_company"
  ON public.SMM_campaigns FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_campaigns_update_own_company"
  ON public.SMM_campaigns FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

-- SMM_campaign_recipients Policies (via campaign)
CREATE POLICY "SMM_campaign_recipients_select_own_company"
  ON public.SMM_campaign_recipients FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.SMM_campaigns 
      WHERE company_id IN (
        SELECT id FROM public.profiles 
        WHERE id = auth.uid() 
        OR id IN (
          SELECT company_id FROM public.installer_company_assignments 
          WHERE installer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "SMM_campaign_recipients_insert_own_company"
  ON public.SMM_campaign_recipients FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.SMM_campaigns 
      WHERE company_id IN (
        SELECT id FROM public.profiles 
        WHERE id = auth.uid() 
        OR id IN (
          SELECT company_id FROM public.installer_company_assignments 
          WHERE installer_id = auth.uid()
        )
      )
    )
  );

-- SMM_sends Policies (via campaign)
CREATE POLICY "SMM_sends_select_own_company"
  ON public.SMM_sends FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.SMM_campaigns 
      WHERE company_id IN (
        SELECT id FROM public.profiles 
        WHERE id = auth.uid() 
        OR id IN (
          SELECT company_id FROM public.installer_company_assignments 
          WHERE installer_id = auth.uid()
        )
      )
    )
  );

-- SMM_opens, SMM_clicks, SMM_bounces Policies (via send)
CREATE POLICY "SMM_opens_select_own_company"
  ON public.SMM_opens FOR SELECT
  USING (
    send_id IN (
      SELECT id FROM public.SMM_sends 
      WHERE campaign_id IN (
        SELECT id FROM public.SMM_campaigns 
        WHERE company_id IN (
          SELECT id FROM public.profiles 
          WHERE id = auth.uid() 
          OR id IN (
            SELECT company_id FROM public.installer_company_assignments 
            WHERE installer_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "SMM_clicks_select_own_company"
  ON public.SMM_clicks FOR SELECT
  USING (
    send_id IN (
      SELECT id FROM public.SMM_sends 
      WHERE campaign_id IN (
        SELECT id FROM public.SMM_campaigns 
        WHERE company_id IN (
          SELECT id FROM public.profiles 
          WHERE id = auth.uid() 
          OR id IN (
            SELECT company_id FROM public.installer_company_assignments 
            WHERE installer_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "SMM_bounces_select_own_company"
  ON public.SMM_bounces FOR SELECT
  USING (
    send_id IN (
      SELECT id FROM public.SMM_sends 
      WHERE campaign_id IN (
        SELECT id FROM public.SMM_campaigns 
        WHERE company_id IN (
          SELECT id FROM public.profiles 
          WHERE id = auth.uid() 
          OR id IN (
            SELECT company_id FROM public.installer_company_assignments 
            WHERE installer_id = auth.uid()
          )
        )
      )
    )
  );

-- SMM_failed_addresses Policies
CREATE POLICY "SMM_failed_addresses_select_own_company"
  ON public.SMM_failed_addresses FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_failed_addresses_update_own_company"
  ON public.SMM_failed_addresses FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

-- SMM_unsubscribes Policies
CREATE POLICY "SMM_unsubscribes_select_own_company"
  ON public.SMM_unsubscribes FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "SMM_unsubscribes_insert_own_company"
  ON public.SMM_unsubscribes FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      OR id IN (
        SELECT company_id FROM public.installer_company_assignments 
        WHERE installer_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_SMM_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER SMM_contacts_updated_at
  BEFORE UPDATE ON public.SMM_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_SMM_updated_at();

CREATE TRIGGER SMM_templates_updated_at
  BEFORE UPDATE ON public.SMM_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_SMM_updated_at();

CREATE TRIGGER SMM_campaigns_updated_at
  BEFORE UPDATE ON public.SMM_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_SMM_updated_at();

CREATE TRIGGER SMM_sends_updated_at
  BEFORE UPDATE ON public.SMM_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_SMM_updated_at();

-- ============================================================================
-- 9. FUNCTION TO AUTO-UPDATE CONTACT STATUS ON UNSUBSCRIBE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.SMM_handle_unsubscribe()
RETURNS TRIGGER AS $$
BEGIN
  -- Update contact status to unsubscribed
  UPDATE public.SMM_contacts
  SET status = 'unsubscribed',
      unsubscribed_at = NEW.unsubscribed_at
  WHERE id = NEW.contact_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER SMM_unsubscribe_trigger
  AFTER INSERT ON public.SMM_unsubscribes
  FOR EACH ROW
  EXECUTE FUNCTION public.SMM_handle_unsubscribe();

-- ============================================================================
-- 10. FUNCTION TO AUTO-CLEANUP FAILED ADDRESSES AFTER 30 DAYS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.SMM_cleanup_old_failed_addresses()
RETURNS void AS $$
BEGIN
  -- Mark addresses older than 30 days for auto-deletion (if not already reviewed)
  UPDATE public.SMM_failed_addresses
  SET status = 'auto_deleted',
      deleted_at = NOW()
  WHERE status = 'pending_review'
    AND first_failure_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All SMM email marketing tables created with:
-- - Proper indexes for performance
-- - Row Level Security (RLS) policies
-- - Foreign key constraints
-- - Auto-update triggers
-- - Multi-tenant support (company_id)
-- ============================================================================



