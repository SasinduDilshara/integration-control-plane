/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Tabs,
  Tab,
  Divider,
  FormControl,
  FormLabel,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  PageTitle,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  Grid,
  Avatar,
  ThemeSwitcher,
  PageContent,
} from '@wso2/oxygen-ui'
import {
  Save,
  Building2,
  Bell,
  Shield,
  Key,
  Trash2,
  Palette,
  Users,
  CreditCard,
} from '@wso2/oxygen-ui-icons-react'
import { useState, type JSX, type ReactNode } from 'react'

// Helper components
const SettingsCard = ({ title, children, variant = 'outlined', sx = {}, titleColor }: { title: string, children: ReactNode, variant?: any, sx?: any, titleColor?: string }) => (
  <Card variant={variant} sx={sx}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2, color: titleColor }}>{title}</Typography>
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</Box>
    </CardContent>
  </Card>
)

const SettingSwitch = ({ checked, onChange, label, description }: { checked: boolean, onChange: (e: any) => void, label: string, description: string }) => (
  <Box>
    <FormControlLabel control={<Switch checked={checked} onChange={onChange} />} label={label} />
    <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mt: -1 }}>{description}</Typography>
  </Box>
)

const SettingField = ({ label, value, onChange, fullWidth = true, multiline = false, rows, type = 'text', helperText }: any) => (
  <FormControl fullWidth={fullWidth}>
    <FormLabel>{label}</FormLabel>
    <TextField
      fullWidth={fullWidth}
      multiline={multiline}
      rows={rows}
      type={type}
      value={value}
      onChange={onChange}
      helperText={helperText}
    />
  </FormControl>
)

const SettingSelect = ({ label, value, onChange, options }: { label: string, value: string, onChange: (e: any) => void, options: { value: string, label: string }[] }) => (
  <FormControl fullWidth>
    <FormLabel>{label}</FormLabel>
    <Select value={value} onChange={onChange}>
      {options.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
    </Select>
  </FormControl>
)

export default function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState(0)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = () => setHasChanges(true)
  const handleSave = () => {
    console.log('Saving settings...')
    setHasChanges(false)
  }

  // State
  const [general, setGeneral] = useState({
    organizationName: 'Acme Corporation',
    displayName: 'ACME',
    description: 'Leading provider of innovative software solutions',
    website: 'https://acme.com',
    industry: 'technology',
    size: '50-200',
  })

  const [appearance, setAppearance] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'utc',
    dateFormat: 'MM/DD/YYYY',
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    slackNotifications: false,
    securityAlerts: true,
    billingAlerts: true,
    weeklyReports: false,
    productUpdates: true,
  })

  const [security, setSecurity] = useState({
    requireTwoFactor: true,
    sessionTimeout: '30',
    ipWhitelist: false,
    allowedDomains: '@acme.com',
  })

  // Tab Renderers
  const renderGeneral = () => (
    <SettingsCard title="Organization Information">
      <Box>
        <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>Organization Logo</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>AC</Avatar>
          <Box>
            <Button variant="outlined" size="small" sx={{ mb: 1 }}>Change Logo</Button>
            <Typography variant="caption" display="block" color="text.secondary">Recommended: Square image, at least 200x200px</Typography>
          </Box>
        </Box>
      </Box>
      <SettingField label="Organization Name" value={general.organizationName} onChange={(e: any) => { setGeneral({ ...general, organizationName: e.target.value }); handleChange() }} />
      <SettingField label="Display Name" value={general.displayName} onChange={(e: any) => { setGeneral({ ...general, displayName: e.target.value }); handleChange() }} />
      <SettingField label="Description" value={general.description} multiline rows={3} onChange={(e: any) => { setGeneral({ ...general, description: e.target.value }); handleChange() }} />
      <SettingField label="Website" value={general.website} type="url" onChange={(e: any) => { setGeneral({ ...general, website: e.target.value }); handleChange() }} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SettingSelect label="Industry" value={general.industry} onChange={(e) => { setGeneral({ ...general, industry: e.target.value }); handleChange() }}
            options={[
              { value: 'technology', label: 'Technology' }, { value: 'finance', label: 'Finance' },
              { value: 'healthcare', label: 'Healthcare' }, { value: 'education', label: 'Education' },
              { value: 'retail', label: 'Retail' }, { value: 'other', label: 'Other' }
            ]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SettingSelect label="Company Size" value={general.size} onChange={(e) => { setGeneral({ ...general, size: e.target.value }); handleChange() }}
            options={[
              { value: '1-10', label: '1-10 employees' }, { value: '11-50', label: '11-50 employees' },
              { value: '50-200', label: '50-200 employees' }, { value: '201-500', label: '201-500 employees' },
              { value: '500+', label: '500+ employees' }
            ]} />
        </Grid>
      </Grid>
    </SettingsCard>
  )

  const renderAppearance = () => (
    <SettingsCard title="Appearance Settings">
      <FormControl><FormLabel>Theme</FormLabel><ThemeSwitcher /></FormControl>
      <SettingSelect label="Language" value={appearance.language} onChange={(e) => { setAppearance({ ...appearance, language: e.target.value }); handleChange() }}
        options={[
          { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' },
          { value: 'de', label: 'German' }, { value: 'ja', label: 'Japanese' }, { value: 'zh', label: 'Chinese' }
        ]} />
      <SettingSelect label="Timezone" value={appearance.timezone} onChange={(e) => { setAppearance({ ...appearance, timezone: e.target.value }); handleChange() }}
        options={[
          { value: 'utc', label: 'UTC' }, { value: 'est', label: 'Eastern Time (EST)' },
          { value: 'pst', label: 'Pacific Time (PST)' }, { value: 'cet', label: 'Central European Time (CET)' },
          { value: 'jst', label: 'Japan Standard Time (JST)' }, { value: 'ist', label: 'India Standard Time (IST)' }
        ]} />
      <SettingSelect label="Date Format" value={appearance.dateFormat} onChange={(e) => { setAppearance({ ...appearance, dateFormat: e.target.value }); handleChange() }}
        options={[{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }]} />
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">These preferences will be applied across your organization for all members.</Typography>
      </Box>
    </SettingsCard>
  )

  const renderNotifications = () => (
    <SettingsCard title="Notification Settings">
      {[
        { k: 'emailNotifications', l: 'Email Notifications', d: 'Receive email notifications for organization events' },
        { k: 'slackNotifications', l: 'Slack Notifications', d: 'Send notifications to your Slack workspace' }
      ].map(n => <SettingSwitch key={n.k} checked={notifications[n.k as keyof typeof notifications]} label={n.l} description={n.d} onChange={(e) => { setNotifications({ ...notifications, [n.k]: e.target.checked }); handleChange() }} />)}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2">Notification Types</Typography>
      {[
        { k: 'securityAlerts', l: 'Security Alerts', d: 'Get notified about security events and suspicious activities' },
        { k: 'billingAlerts', l: 'Billing Alerts', d: 'Receive alerts about billing and subscription changes' },
        { k: 'weeklyReports', l: 'Weekly Reports', d: 'Get weekly summary reports of organization activity' },
        { k: 'productUpdates', l: 'Product Updates', d: 'Stay informed about new features and improvements' }
      ].map(n => <SettingSwitch key={n.k} checked={notifications[n.k as keyof typeof notifications]} label={n.l} description={n.d} onChange={(e) => { setNotifications({ ...notifications, [n.k]: e.target.checked }); handleChange() }} />)}
    </SettingsCard>
  )

  const renderSecurity = () => (
    <SettingsCard title="Security Settings">
      <SettingSwitch checked={security.requireTwoFactor} onChange={(e) => { setSecurity({ ...security, requireTwoFactor: e.target.checked }); handleChange() }} label="Require Two-Factor Authentication" description="Require all members to enable 2FA for enhanced security" />
      <SettingField label="Session Timeout (minutes)" type="number" value={security.sessionTimeout} helperText="Automatically log out users after this period of inactivity" onChange={(e: any) => { setSecurity({ ...security, sessionTimeout: e.target.value }); handleChange() }} />
      <SettingSwitch checked={security.ipWhitelist} onChange={(e) => { setSecurity({ ...security, ipWhitelist: e.target.checked }); handleChange() }} label="Enable IP Whitelist" description="Restrict access to specific IP addresses" />
      <SettingField label="Allowed Email Domains" value={security.allowedDomains} helperText="Comma-separated list of allowed email domains" onChange={(e: any) => { setSecurity({ ...security, allowedDomains: e.target.value }); handleChange() }} />
      <Alert severity="info"><Typography variant="body2">Strong security settings help protect your organization from unauthorized access.</Typography></Alert>
    </SettingsCard>
  )

  const renderMembers = () => (
    <SettingsCard title="Team Members">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Team Members</Typography>
        <Button variant="contained" size="small" startIcon={<Users size={18} />}>Invite Member</Button>
      </Box>
      <Divider sx={{ mb: 3 }} />
      <List>
        {[
          { name: 'John Doe', email: 'john.doe@acme.com', role: 'Owner', roleColor: 'primary', avatar: 'JD' },
          { name: 'Jane Smith', email: 'jane.smith@acme.com', role: 'Admin', roleColor: 'success', avatar: 'JS' },
          { name: 'Mike Brown', email: 'mike.brown@acme.com', role: 'Member', roleColor: 'default', avatar: 'MB' }
        ].map((m, i) => (
          <ListItem key={i} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 2 }}>{m.avatar}</Avatar>
            <ListItemText primary={m.name} secondary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}><Typography variant="body2">{m.email}</Typography><Chip label={m.role} size="small" color={m.roleColor as any} /></Box>} />
            <Button size="small" variant="outlined" color="error" disabled={m.role === 'Owner'}>Remove</Button>
          </ListItem>
        ))}
      </List>
    </SettingsCard>
  )

  const renderApiKeys = () => (
    <SettingsCard title="API Keys">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">API Keys</Typography>
        <Button variant="contained" size="small">Generate New Key</Button>
      </Box>
      <Divider sx={{ mb: 3 }} />
      <List>
        {[
          { type: 'Production', key: 'sk_prod_••••••••••••••••' },
          { type: 'Development', key: 'sk_dev_••••••••••••••••' }
        ].map((k, i) => (
          <ListItem key={i} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <ListItemText primary={`${k.type} API Key`} secondary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}><Typography variant="body2" fontFamily="monospace">{k.key}</Typography><Chip label="Active" size="small" color="success" /></Box>} />
            <Button size="small" variant="outlined" sx={{ mr: 1 }}>Copy</Button>
            <Button size="small" variant="outlined" color="error">Revoke</Button>
          </ListItem>
        ))}
      </List>
      <Alert severity="info" sx={{ mt: 3 }}><Typography variant="body2">Keep your API keys secure.</Typography></Alert>
    </SettingsCard>
  )

  const renderBilling = () => (
    <SettingsCard title="Billing & Subscription">
      <Box>
        <Typography variant="subtitle1" gutterBottom>Current Plan</Typography>
        <Box sx={{ p: 2, border: 1, borderColor: 'primary.main', borderRadius: 1, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box><Typography variant="h6">Enterprise Plan</Typography><Typography variant="body2" color="text.secondary">For large organizations with advanced needs</Typography></Box>
            <Typography variant="h5" color="primary">$99/month</Typography>
          </Box>
          <Box sx={{ mt: 2 }}><Chip label="Active" color="success" size="small" sx={{ mr: 1 }} /><Typography variant="caption" color="text.secondary">Next billing date: January 1, 2026</Typography></Box>
        </Box>
      </Box>
      <Box>
        <Typography variant="subtitle1" gutterBottom>Payment Method</Typography>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CreditCard size={24} />
            <Box><Typography variant="body1">•••• •••• •••• 4242</Typography><Typography variant="caption" color="text.secondary">Expires 12/2026</Typography></Box>
          </Box>
          <Button variant="outlined" size="small">Update</Button>
        </Box>
      </Box>
      <Box>
        <Typography variant="subtitle1" gutterBottom>Billing History</Typography>
        <List sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {['December', 'November', 'October'].map((m) => (
            <Box key={m}><ListItem><ListItemText primary={`${m} 2025`} secondary="$99.00 - Paid" /><Button size="small" variant="text">View Invoice</Button></ListItem><Divider /></Box>
          ))}
        </List>
      </Box>
      <Box><Button variant="outlined" color="warning">Change Plan</Button></Box>
    </SettingsCard>
  )

  const renderDanger = () => (
    <SettingsCard title="Danger Zone" variant="outlined" sx={{ borderColor: 'error.main' }} titleColor="error">
      <Alert severity="error"><Typography variant="body2">Actions in this section are permanent.</Typography></Alert>
      <Box><Typography variant="subtitle1" gutterBottom>Transfer Organization Ownership</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Transfer ownership to another member</Typography><Button variant="outlined" color="warning">Transfer Ownership</Button></Box>
      <Divider />
      <Box><Typography variant="subtitle1" gutterBottom>Delete Organization</Typography><Alert severity="warning" sx={{ mb: 2 }}><Typography variant="body2"><strong>Warning:</strong> This will delete all data.</Typography></Alert><Button variant="contained" color="error" startIcon={<Trash2 size={18} />}>Delete Organization</Button></Box>
    </SettingsCard>
  )

  const tabs = [
    { icon: <Building2 size={18} />, label: 'General', render: renderGeneral },
    { icon: <Palette size={18} />, label: 'Appearance', render: renderAppearance },
    { icon: <Bell size={18} />, label: 'Notifications', render: renderNotifications },
    { icon: <Shield size={18} />, label: 'Security', render: renderSecurity },
    { icon: <Users size={18} />, label: 'Members', render: renderMembers },
    { icon: <Key size={18} />, label: 'API Keys', render: renderApiKeys },
    { icon: <CreditCard size={18} />, label: 'Billing', render: renderBilling },
    { icon: <Trash2 size={18} />, label: 'Danger Zone', render: renderDanger },
  ]

  return (
    <PageContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box sx={{ flexGrow: 1 }}>
          <PageTitle>
            <PageTitle.Header>Organization Settings</PageTitle.Header>
            <PageTitle.SubHeader>Manage your organization preferences and configuration</PageTitle.SubHeader>
          </PageTitle>
        </Box>
        {hasChanges && <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSave}>Save Changes</Button>}
      </Box>

      {hasChanges && <Alert severity="warning" sx={{ mb: 3 }}>You have unsaved changes. Make sure to save before leaving this page.</Alert>}

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Card variant="outlined" sx={{ width: 280, height: 'fit-content' }}>
          <CardContent sx={{ p: 3 }}>
            <Tabs orientation="vertical" value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              {tabs.map((t, i) => <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />)}
            </Tabs>
          </CardContent>
        </Card>
        <Box sx={{ flexGrow: 1 }}>
          {tabs[activeTab].render()}
        </Box>
      </Box>
    </PageContent>
  )
}
