
-- Drop existing restrictive policies and create public ones since auth is disabled

-- email_templates
DROP POLICY IF EXISTS "Admins and editors can insert templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins and editors can update templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.email_templates;
DROP POLICY IF EXISTS "Team members can view templates" ON public.email_templates;

CREATE POLICY "Anyone can view templates" ON public.email_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert templates" ON public.email_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update templates" ON public.email_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete templates" ON public.email_templates FOR DELETE USING (true);

-- contacts
DROP POLICY IF EXISTS "Admins and editors can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins and editors can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Team members can view contacts" ON public.contacts;

CREATE POLICY "Anyone can view contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete contacts" ON public.contacts FOR DELETE USING (true);

-- campaigns
DROP POLICY IF EXISTS "Admins and editors can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins and editors can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Team members can view campaigns" ON public.campaigns;

CREATE POLICY "Anyone can view campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert campaigns" ON public.campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update campaigns" ON public.campaigns FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete campaigns" ON public.campaigns FOR DELETE USING (true);

-- campaign_recipients
DROP POLICY IF EXISTS "Admins and editors can insert campaign recipients" ON public.campaign_recipients;
DROP POLICY IF EXISTS "Admins and editors can update campaign recipients" ON public.campaign_recipients;
DROP POLICY IF EXISTS "Team members can view campaign recipients" ON public.campaign_recipients;

CREATE POLICY "Anyone can view campaign_recipients" ON public.campaign_recipients FOR SELECT USING (true);
CREATE POLICY "Anyone can insert campaign_recipients" ON public.campaign_recipients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update campaign_recipients" ON public.campaign_recipients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete campaign_recipients" ON public.campaign_recipients FOR DELETE USING (true);

-- smtp_settings
DROP POLICY IF EXISTS "Admins can delete smtp settings" ON public.smtp_settings;
DROP POLICY IF EXISTS "Admins can insert smtp settings" ON public.smtp_settings;
DROP POLICY IF EXISTS "Admins can update smtp settings" ON public.smtp_settings;
DROP POLICY IF EXISTS "Admins can view smtp settings" ON public.smtp_settings;

CREATE POLICY "Anyone can view smtp_settings" ON public.smtp_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert smtp_settings" ON public.smtp_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update smtp_settings" ON public.smtp_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete smtp_settings" ON public.smtp_settings FOR DELETE USING (true);
