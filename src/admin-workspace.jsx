import { useEffect, useMemo, useState } from 'react'
import {
  loadAdminData,
  loadAdminUsers,
  loadAiSettings,
  loadAuditLogs,
  loadArticles,
  loadChangeHistory,
  loadCategories,
  loadContactMessages,
  loadFeatureFlags,
  loadMedia,
  loadNewsletterSubscribers,
  loadSiteSettings,
  loadSecurityEvents,
  loadSystemStatus,
  loadTowns,
  inviteAdminUser,
  revokeAdminUserSessions,
  setAdminUserStatus,
  reviewBusinessSubmission,
  reviewClaim,
  updateAdminRole,
  updateEventStatus,
} from './lib/admin-data'
import { getProfile, isAdminProfile, signOut } from './lib/auth'
import { supabase } from './lib/supabase'
import { AiSettingsManager, ArticleManager, BusinessManager, ContactManager, Field, LockedTools, MediaManager, NewsletterManager, NewsletterSendManager, SiteContentManager, SystemManager, TaxonomyManager, TownManager } from './admin-tools'

const tabs = [
  ['overview', 'Overview', 'dashboard.read'], ['submissions', 'Submissions', 'submissions.review'], ['claims', 'Claims', 'claims.review'],
  ['listings', 'Businesses', 'businesses.read'], ['towns', 'Towns', 'towns.manage'], ['events', 'Events', 'events.manage'],
  ['newsletter', 'Newsletter', 'newsletter.read'], ['contact', 'Messages', 'contact.read'], ['media', 'Media', 'media.manage'],
  ['users', 'Users', 'users.read'], ['audit', 'Audit logs', 'audit.read'], ['history', 'Change history', 'audit.read'], ['security', 'Security', 'security.read'],
  ['system', 'AI & System', 'ai.read'], ['ai-settings', 'AI settings', 'ai.read'], ['content', 'Articles / CMS', 'articles.manage'], ['taxonomy', 'Categories / Places', 'categories.manage'], ['settings', 'Site Content & Design', 'settings.read'], ['locked', 'Billing controls', 'settings.read'],
]

function Logo({ light = false }) {
  return <a className={`logo ${light ? 'logo-light' : ''}`} href="/"><span className="logo-mark" aria-hidden="true"><i></i><i></i><i></i></span><span className="logo-copy"><strong>Upnorth.org</strong><small>EXPLORE · STAY · DO · BELONG</small></span></a>
}

function Frame({ children, user, active, onTab, permissions, onSignOut }) {
  const visible = tabs.filter(([, , permission]) => permissions.includes(permission))
  return <div className="site-shell p3-shell admin-shell"><header className="site-header"><div className="header-inner"><Logo /><div className="admin-nav"><a href="/">View site</a><span>{user?.email}</span><button className="plan-button" type="button" onClick={onSignOut}>Sign out</button></div></div></header><div className="admin-workspace"><aside className="admin-sidebar"><span className="admin-sidebar-kicker">Operations center</span>{visible.map(([id, label]) => <button className={`admin-sidebar-link ${active === id ? 'is-active' : ''}`} type="button" key={id} onClick={() => onTab(id)}>{label}</button>)}<span className="admin-sidebar-note">Every action is checked server-side and against Supabase RLS. Hidden buttons are not the security boundary.</span></aside>{children}</div><footer className="site-footer"><div className="footer-inner"><Logo light /><div className="footer-links"><a href="/">Back to UpNorth.org</a><a href="/contact">Contact</a></div><div className="footer-script">The North<br />Woods Call</div></div></footer></div>
}

function PanelHeading({ eyebrow, title, description, action }) {
  return <div className="admin-tool-header"><div><span className="admin-kicker">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>
}

function barWidthStyle(value, max) {
  return { width: `${max ? Math.round((value / max) * 100) : 0}%` }
}

function barHeightStyle(value, max) {
  return { height: `${Math.max(value ? 8 : 2, max ? Math.round((value / max) * 100) : 2)}%` }
}

function OverviewBars({ title, description, items }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return <article className="admin-chart-card"><div className="admin-chart-heading"><div><span className="admin-kicker">Live directory data</span><h2>{title}</h2><p>{description}</p></div><span className="admin-chart-mark">{items.reduce((total, item) => total + item.value, 0)} total</span></div>{items.length ? <div className="admin-bar-list">{items.map((item) => <div className="admin-bar-row" key={item.label}><div className="admin-bar-label"><span>{item.label}</span><strong>{item.value}</strong></div><div className="admin-bar-track"><span className="admin-bar-fill" style={barWidthStyle(item.value, max)} /></div></div>)}</div> : <div className="admin-chart-empty">No records available yet.</div>}</article>
}

function OverviewActivity({ points = [] }) {
  const max = Math.max(...points.map((point) => point.value), 1)
  return <article className="admin-chart-card admin-activity-card"><div className="admin-chart-heading"><div><span className="admin-kicker">Last 7 days</span><h2>Workspace activity</h2><p>New listings, submissions, claims, and events from Supabase.</p></div><span className="admin-chart-mark">{points.reduce((total, point) => total + point.value, 0)} actions</span></div>{points.length ? <div className="admin-activity-chart" aria-label="Activity over the last seven days">{points.map((point) => <div className="admin-activity-column" key={point.date}><div className="admin-activity-value">{point.value}</div><div className="admin-activity-track"><span className="admin-activity-fill" style={barHeightStyle(point.value, max)} /></div><span>{point.label}</span></div>)}</div> : <div className="admin-chart-empty">No activity data available yet.</div>}</article>
}

function Overview({ data, onTab }) {
  const stats = data?.stats || {}
  const categoryLabels = { stay: 'Places to stay', 'eat-drink': 'Eat & drink', 'things-to-do': 'Things to do', 'real-estate': 'Real estate' }
  const categoryItems = Object.entries(stats.listingCategories || {}).filter(([key]) => key !== 'unknown').map(([key, value]) => ({ label: categoryLabels[key] || key, value }))
  const statusItems = [['Published businesses', stats.publishedBusinesses || 0], ['Draft businesses', stats.draftBusinesses || 0], ['Featured businesses', stats.featuredBusinesses || 0], ['Enhanced businesses', stats.enhancedBusinesses || 0]].map(([label, value]) => ({ label, value }))
  const cards = [['Businesses', stats.businesses || 0, 'listings'], ['Featured', stats.featuredBusinesses || 0, 'listings'], ['Events', stats.events || 0, 'events'], ['Towns', stats.towns || 0, 'towns'], ['Newsletter', stats.newsletterSubscribers || 0, 'newsletter'], ['Pending approvals', stats.pendingApprovals || 0, 'submissions']]
  return <div className="admin-content"><div className="admin-hero-row"><div><span className="admin-kicker">Secure operations</span><h1>Master admin panel</h1><p>One workspace for your directory, content, audience, assets, and security signals.</p></div><span className="admin-security-badge">RLS protected</span></div><div className="admin-stat-grid admin-stat-grid-six">{cards.map(([label, value, tab]) => <button className="admin-stat" type="button" key={label} onClick={() => onTab(tab)}><strong>{value}</strong><span>{label}</span></button>)}</div><section className="admin-analytics-grid admin-section"><OverviewBars title="Directory mix" description="Businesses grouped by their live category." items={categoryItems} /><OverviewActivity points={stats.activityLast7Days || []} /></section><section className="admin-section"><div className="admin-section-heading"><div><h2>Publishing health</h2><span>Actual record status from the current workspace.</span></div><span className="admin-live-label">Live data</span></div><div className="admin-mini-metrics">{statusItems.map((item) => <div className="admin-mini-metric" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><div className="admin-mini-meter"><i style={barWidthStyle(item.value, stats.businesses || 1)} /></div></div>)}</div></section><section className="admin-section"><div className="admin-section-heading"><div><h2>Pending moderation</h2><span>Review requests before they become public.</span></div><button className="admin-button" type="button" onClick={() => onTab('submissions')}>Open queue</button></div><div className="admin-record-grid">{data?.submissions?.filter((item) => item.status === 'pending').slice(0, 4).map((item) => <article className="admin-record-card" key={item.id}><span className="admin-kicker">New listing</span><h3>{item.business_name}</h3><p>{item.category} · {item.town}</p><span className="admin-status admin-status-pending">Pending review</span></article>)}{!data?.submissions?.some((item) => item.status === 'pending') && <div className="admin-tool-empty">No pending business submissions.</div>}</div></section><section className="admin-info-grid admin-section"><article className="admin-info-card"><span className="admin-kicker">Security boundary</span><h3>Server and database enforced</h3><p>Admin requests verify the Supabase session, role, permission, input shape, audit trail, and RLS policy before changing data.</p></article><article className="admin-info-card"><span className="admin-kicker">Current operator</span><h3>{data?.actor?.role || 'Loading role'}</h3><p>Use the Users, Audit logs, Change history, and Security areas to review access and administrative activity.</p></article></section></div>
}

function ReviewQueue({ kind, items, onReview }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const isClaim = kind === 'claims'
  const review = async (item, decision) => { setBusy(item.id); setError(''); try { if (isClaim) await reviewClaim(item, decision); else await reviewBusinessSubmission(item, decision); await onReview() } catch (reviewError) { setError(reviewError.message || 'Review failed.') } finally { setBusy('') } }
  return <div className="admin-content"><PanelHeading eyebrow="Moderation" title={isClaim ? 'Business claims' : 'Business submissions'} description="Approve or reject requests with an auditable decision." />{error && <div className="admin-alert admin-alert-error">{error}</div>}<div className="admin-record-grid">{items.length ? items.map((item) => <article className="admin-record-card" key={item.id}><div className="admin-record-head"><div><span className="admin-kicker">{isClaim ? 'Listing claim' : 'New listing'}</span><h3>{item.business_name}</h3></div><span className={`admin-status admin-status-${item.status}`}>{item.status}</span></div><p>{isClaim ? item.contact_email : `${item.category} · ${item.subtype} · ${item.town}`}</p><p className="admin-record-description">{item.description || item.message || 'No description supplied.'}</p>{item.status === 'pending' && <div className="admin-actions"><button className="admin-button admin-button-approve" type="button" disabled={busy === item.id} onClick={() => review(item, 'approve')}>{busy === item.id ? 'Saving…' : 'Approve'}</button><button className="admin-button admin-button-reject" type="button" disabled={busy === item.id} onClick={() => review(item, 'reject')}>Reject</button></div>}</article>) : <div className="admin-tool-empty">No records in this queue.</div>}</div></div>
}

function EventsManager({ events = [], onRefresh, canManage }) {
  const [error, setError] = useState('')
  const update = async (event) => { setError(''); try { await updateEventStatus(event, event.status === 'published' ? 'draft' : 'published'); await onRefresh() } catch (updateError) { setError(updateError.message || 'Could not update the event.') } }
  return <div className="admin-content"><PanelHeading eyebrow="Calendar" title="Events" description="Publish or unpublish event records. Full event editing can be added without changing this workflow." />{error && <div className="admin-alert admin-alert-error">{error}</div>}<div className="admin-tool-table">{events.length ? events.map((event) => <article className="admin-tool-row" key={event.id}><div><strong>{event.title}</strong><span>{event.venue} · {event.town} · {event.date}</span></div>{canManage && <button className="admin-button" type="button" onClick={() => update(event)}>{event.status === 'published' ? 'Unpublish' : 'Publish'}</button>}</article>) : <div className="admin-tool-empty">No events found.</div>}</div></div>
}

function UsersManager({ users, profile, user, onRefresh, canManageUsers = false, serviceConfigured = false }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('business_owner')
  const [inviteMessage, setInviteMessage] = useState('')
  const changeRole = async (entry, role) => { setBusy(entry.id); setError(''); try { await updateAdminRole(entry.id, role); await onRefresh() } catch (updateError) { setError(updateError.message || 'Role update failed.') } finally { setBusy('') } }
  const changeStatus = async (entry) => { setBusy(entry.id); setError(''); try { await setAdminUserStatus(entry.id, entry.status === 'suspended' ? 'active' : 'suspended'); await onRefresh() } catch (updateError) { setError(updateError.message || 'Status update failed.') } finally { setBusy('') } }
  const invite = async (event) => { event.preventDefault(); setBusy('invite'); setError(''); setInviteMessage(''); try { await inviteAdminUser(email, inviteRole); setInviteMessage(`Invitation sent to ${email}.`); setEmail('') } catch (inviteError) { setError(inviteError.message || 'Invitation failed. Configure the private Supabase service role key.') } finally { setBusy('') } }
  return <div className="admin-content"><PanelHeading eyebrow="Identity & access" title="Users and roles" description="Role changes, suspension, and invitations are server-authorized. Self-escalation is blocked." />{error && <div className="admin-alert admin-alert-error">{error}</div>}{inviteMessage && <div className="admin-alert admin-alert-success">{inviteMessage}</div>}{canManageUsers && !serviceConfigured && <div className="admin-tool-note">Invite and global session controls are pending the client’s private Supabase service-role setup.</div>}{canManageUsers && serviceConfigured && <form className="admin-tool-form admin-inline-form" onSubmit={invite}><Field label="Invite email"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label="Role"><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="business_owner">Business owner</option><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></Field><button className="admin-button admin-button-approve" disabled={busy === 'invite'}>{busy === 'invite' ? 'Inviting…' : 'Invite user'}</button></form>}<div className="admin-tool-table">{users.map((entry) => <article className="admin-tool-row" key={entry.id}><div><strong>{entry.email}</strong><span>{entry.id} · {entry.status || 'active'}</span></div><div className="admin-row-actions">{profile?.role === 'super_admin' ? <select className="admin-role-select" value={entry.role} disabled={busy === entry.id || entry.id === user.id} onChange={(event) => changeRole(entry, event.target.value)}><option value="super_admin">Super admin</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="moderator">Moderator</option><option value="business_manager">Business manager</option><option value="viewer">Viewer</option><option value="business_owner">Business owner</option></select> : <span className="admin-status">{entry.role}</span>}{canManageUsers && serviceConfigured && entry.id !== user.id && <><button className="admin-button" type="button" disabled={busy === entry.id} onClick={() => changeStatus(entry)}>{entry.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button><button className="admin-button" type="button" disabled={busy === entry.id} onClick={async () => { if (!window.confirm(`Revoke all sessions for ${entry.email}?`)) return; setBusy(entry.id); try { await revokeAdminUserSessions(entry.id); await onRefresh() } catch (revokeError) { setError(revokeError.message || 'Could not revoke sessions.') } finally { setBusy('') } }}>Revoke sessions</button></>}</div></article>)}</div></div>
}

function LogList({ title, eyebrow, rows, security = false, history = false }) {
  return <div className="admin-content"><PanelHeading eyebrow={eyebrow} title={title} description={history ? 'Every saved admin change keeps a protected before/after snapshot and changed-field list.' : 'Append-oriented records for operational review.'} /><div className="admin-log-table">{rows.length ? rows.map((entry) => <article className="admin-log-row" key={entry.id}><div><strong>{security ? entry.event_type : entry.action}</strong><span>{security ? `${entry.success ? 'Successful' : 'Failed'} · ${entry.ip_address || 'IP unavailable'}` : history ? `${entry.entity_type} · ${entry.entity_id} · ${entry.changed_fields?.length ? entry.changed_fields.join(', ') : 'record snapshot'} · by ${entry.actor_id || 'unknown actor'}` : `${entry.entity_type} · ${entry.entity_id}`}</span></div><time>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</time></article>) : <div className="admin-tool-empty">No records yet. Apply the change-history migration if this is a new environment.</div>}</div></div>
}

export default function AdminWorkspace() {
  const [stage, setStage] = useState('loading')
  const [active, setActive] = useState('overview')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [data, setData] = useState(null)
  const [view, setView] = useState({ users: [], audit: [], history: [], security: [], subscribers: [], messages: [], towns: [], media: [], system: {}, articles: [], categories: [], settings: [], flags: [], aiSettings: {} })
  const permissions = data?.actor?.permissions || []
  const can = (permission) => permissions.includes(permission)

  const refresh = async () => setData(await loadAdminData())
  const loadTab = async (tab) => {
    setActive(tab)
    try {
      if (tab === 'users') { const [users, system] = await Promise.all([loadAdminUsers(), loadSystemStatus()]); setView((current) => ({ ...current, users, system })) }
      if (tab === 'audit') { const audit = await loadAuditLogs(); setView((current) => ({ ...current, audit })) }
      if (tab === 'history') { const history = await loadChangeHistory(); setView((current) => ({ ...current, history })) }
      if (tab === 'security') { const security = await loadSecurityEvents(); setView((current) => ({ ...current, security })) }
      if (tab === 'newsletter') { const [subscribers, system] = await Promise.all([loadNewsletterSubscribers(), loadSystemStatus()]); setView((current) => ({ ...current, subscribers, system })) }
      if (tab === 'contact') { const messages = await loadContactMessages(); setView((current) => ({ ...current, messages })) }
      if (tab === 'towns') { const towns = await loadTowns(); setView((current) => ({ ...current, towns })) }
      if (tab === 'media') { const media = await loadMedia(); setView((current) => ({ ...current, media })) }
      if (tab === 'system') { const system = await loadSystemStatus(); setView((current) => ({ ...current, system })) }
      if (tab === 'content') { const articles = await loadArticles(); setView((current) => ({ ...current, articles })) }
      if (tab === 'taxonomy') { const categories = await loadCategories(); setView((current) => ({ ...current, categories })) }
      if (tab === 'settings') { const [settings, flags] = await Promise.all([loadSiteSettings(), loadFeatureFlags()]); setView((current) => ({ ...current, settings, flags })) }
      if (tab === 'ai-settings') { const aiSettings = await loadAiSettings(); setView((current) => ({ ...current, aiSettings })) }
    } catch (error) { setStage('error'); setView((current) => ({ ...current, error: error.message || 'Could not load this admin area.' })) }
  }

  useEffect(() => {
    let mounted = true
    const boot = async () => {
      if (!supabase) { setStage('unconfigured'); return }
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { setStage('signed-out'); return }
      try {
        const currentProfile = await getProfile(sessionData.session.user.id)
        if (!mounted) return
        setUser(sessionData.session.user); setProfile(currentProfile)
        if (!isAdminProfile(currentProfile)) { setStage('unauthorized'); return }
        setData(await loadAdminData()); setStage('ready')
      } catch (error) { if (mounted) { setStage('error'); setView((current) => ({ ...current, error: error.message || 'Could not load admin access.' })) } }
    }
    boot()
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => { if (!session) window.location.href = '/login' }) || { data: { subscription: null } }
    return () => { mounted = false; listener?.subscription?.unsubscribe() }
  }, [])

  const logout = async () => { await signOut(); window.location.href = '/login' }
  const main = useMemo(() => {
    if (active === 'overview') return <Overview data={data} onTab={loadTab} />
    if (active === 'submissions') return <ReviewQueue kind="submissions" items={data?.submissions || []} onReview={refresh} />
    if (active === 'claims') return <ReviewQueue kind="claims" items={data?.claims || []} onReview={refresh} />
    if (active === 'listings') return <div className="admin-content"><BusinessManager listings={data?.listings || []} towns={data?.towns || []} canManage={can('businesses.manage')} onRefresh={refresh} /></div>
    if (active === 'towns') return <div className="admin-content"><TownManager towns={view.towns.length ? view.towns : data?.towns || []} canManage={can('towns.manage')} onRefresh={() => loadTab('towns')} /></div>
    if (active === 'events') return <EventsManager events={data?.events || []} canManage={can('events.manage')} onRefresh={refresh} />
    if (active === 'newsletter') return <div className="admin-content"><NewsletterManager subscribers={view.subscribers} /><NewsletterSendManager canSend={can('newsletter.send')} configured={Boolean(view.system.resendConfigured)} /></div>
    if (active === 'contact') return <div className="admin-content"><ContactManager messages={view.messages} /></div>
    if (active === 'media') return <div className="admin-content"><MediaManager media={view.media} canManage={can('media.manage')} canAssignSiteContent={can('site_content.update')} onRefresh={() => loadTab('media')} /></div>
    if (active === 'users') return <UsersManager users={view.users} profile={profile} user={user} canManageUsers={can('users.manage')} serviceConfigured={Boolean(view.system.supabaseServiceRoleConfigured)} onRefresh={() => loadTab('users')} />
    if (active === 'audit') return <LogList title="Audit logs" eyebrow="Accountability" rows={view.audit} />
    if (active === 'history') return <LogList title="Change history" eyebrow="Version trail" rows={view.history} history />
    if (active === 'security') return <LogList title="Security events" eyebrow="Security signals" rows={view.security} security />
    if (active === 'system') return <div className="admin-content"><SystemManager status={view.system} /></div>
    if (active === 'ai-settings') return <div className="admin-content"><AiSettingsManager settings={view.aiSettings} canUpdate={can('ai.update')} onRefresh={() => loadTab('ai-settings')} /></div>
    if (active === 'content') return <div className="admin-content"><ArticleManager articles={view.articles} canManage={can('articles.manage')} onRefresh={() => loadTab('content')} /></div>
    if (active === 'taxonomy') return <div className="admin-content"><TaxonomyManager categories={view.categories} canManage={can('categories.manage')} onRefresh={() => loadTab('taxonomy')} /></div>
    if (active === 'settings') return <div className="admin-content"><SiteContentManager settings={view.settings} flags={view.flags} canUpdate={can('site_content.update')} onRefresh={() => loadTab('settings')} /></div>
    return <div className="admin-content"><LockedTools /></div>
  }, [active, data, profile, user, view, permissions])

  if (stage === 'loading') return <div className="site-shell p3-shell admin-shell"><main className="admin-main"><div className="admin-state">Checking admin access…</div></main></div>
  if (stage === 'signed-out') return <div className="site-shell p3-shell admin-shell"><main className="admin-main"><div className="admin-state"><h1>Sign in required</h1><p>Use the admin login to open this workspace.</p><a className="detail-button" href="/login">Go to login</a></div></main></div>
  if (stage === 'unconfigured') return <div className="site-shell p3-shell admin-shell"><main className="admin-main"><div className="admin-state"><h1>Supabase is not configured</h1><p>Add the public Supabase environment variables and reload.</p></div></main></div>
  if (stage === 'unauthorized') return <Frame user={user} active="" onTab={() => {}} permissions={[]} onSignOut={logout}><main className="admin-main"><div className="admin-state"><h1>Access not granted</h1><p>{user?.email} does not have an authorized admin role.</p><button className="detail-button" type="button" onClick={logout}>Sign out</button></div></main></Frame>
  if (stage === 'error') return <Frame user={user} active="" onTab={() => {}} permissions={[]} onSignOut={logout}><main className="admin-main"><div className="admin-state"><h1>Admin workspace unavailable</h1><p>{view.error || 'The workspace could not be loaded.'}</p><button className="detail-button" type="button" onClick={() => window.location.reload()}>Try again</button></div></main></Frame>
  return <Frame user={user} active={active} onTab={loadTab} permissions={permissions} onSignOut={logout}>{main}</Frame>
}
