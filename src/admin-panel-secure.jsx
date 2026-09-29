import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  loadAdminData,
  loadAdminUsers,
  loadAuditLogs,
  loadSecurityEvents,
  reviewBusinessSubmission,
  reviewClaim,
  updateAdminRole,
  updateEventStatus,
  updateListingFlags,
} from './lib/admin-data'
import { getProfile, isAdminProfile, signInWithPassword, signOut } from './lib/auth'
import { supabase } from './lib/supabase'
import './styles.part3.css'
import './styles.admin.css'

const tabs = [
  { id: 'overview', label: 'Overview', permission: 'dashboard.read' },
  { id: 'submissions', label: 'Submissions', permission: 'submissions.review' },
  { id: 'claims', label: 'Claims', permission: 'claims.review' },
  { id: 'listings', label: 'Listings', permission: 'businesses.read' },
  { id: 'events', label: 'Events', permission: 'events.manage' },
  { id: 'users', label: 'Users', permission: 'users.read' },
  { id: 'audit', label: 'Audit logs', permission: 'audit.read' },
  { id: 'security', label: 'Security', permission: 'security.read' },
]

function AdminLogo({ light = false }) {
  return <a className={`logo ${light ? 'logo-light' : ''}`} href="/"><span className="logo-mark" aria-hidden="true"><i></i><i></i><i></i></span><span className="logo-copy"><strong>Upnorth.org</strong><small>EXPLORE · STAY · DO · BELONG</small></span></a>
}

function AdminShell({ children, user, onSignOut, activeTab, onTab, permissions = [] }) {
  const visibleTabs = tabs.filter((tab) => permissions.includes(tab.permission))
  return <div className="site-shell p3-shell admin-shell">
    <header className="site-header"><div className="header-inner"><AdminLogo /><nav className="admin-nav"><a href="/">View site</a>{user && <span>{user.email}</span>}</nav>{user && <button className="plan-button" type="button" onClick={onSignOut}>Sign out</button>}</div></header>
    {user && <div className="admin-workspace"><aside className="admin-sidebar" aria-label="Admin navigation"><span className="admin-sidebar-kicker">Operations</span>{visibleTabs.map((tab) => <button type="button" className={`admin-sidebar-link ${activeTab === tab.id ? 'is-active' : ''}`} key={tab.id} onClick={() => onTab(tab.id)}>{tab.label}</button>)}<span className="admin-sidebar-note">UI visibility is for convenience. Every action is checked again by the server and Supabase RLS.</span></aside>{children}</div>}
    {!user && children}
    <footer className="site-footer"><div className="footer-inner"><AdminLogo light /><div className="footer-links"><a href="/">Back to UpNorth.org</a><a href="/contact">Contact</a></div><div className="footer-script">The North<br />Woods Call</div></div></footer>
  </div>
}

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('')
    try { await signInWithPassword(email, password); window.location.href = '/admin' } catch { setError('Unable to sign in. Check your credentials and try again.') } finally { setLoading(false) }
  }
  return <AdminShell><main className="admin-main"><section className="admin-auth-card"><span className="admin-kicker">Private workspace</span><h1>Admin sign in</h1><p>Manage UpNorth.org content and operations.</p>{!supabase && <div className="admin-alert">Supabase is not configured in this environment.</div>}<form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>{error && <p className="admin-error">{error}</p>}<button className="detail-button" type="submit" disabled={loading || !supabase}>{loading ? 'Signing in…' : 'Sign in'}</button></form><small>Authentication is handled by Supabase Auth. Passwords are never stored by this application.</small></section></main></AdminShell>
}

function StatusPill({ status }) { return <span className={`admin-status admin-status-${status}`}>{status}</span> }
function EmptyState({ children = 'Nothing to show yet.' }) { return <div className="admin-empty">{children}</div> }

function SubmissionCard({ submission, onReview, busy, readOnly = false }) {
  return <article className="admin-record-card"><div className="admin-record-head"><div><span className="admin-kicker">{submission.submission_type === 'claim' ? 'Claim request' : 'New listing'}</span><h3>{submission.business_name}</h3></div><StatusPill status={submission.status} /></div><p>{submission.category} · {submission.subtype} · {submission.town}</p><p className="admin-record-description">{submission.description}</p><div className="admin-record-meta">{submission.contact_email || 'No contact email'}{submission.phone ? ` · ${submission.phone}` : ''}</div>{submission.status === 'pending' && !readOnly && <div className="admin-actions"><button type="button" className="admin-button admin-button-approve" disabled={busy} onClick={() => onReview(submission, 'approve')}>Approve</button><button type="button" className="admin-button admin-button-reject" disabled={busy} onClick={() => onReview(submission, 'reject')}>Reject</button></div>}</article>
}

function ClaimCard({ claim, onReview, busy }) {
  return <article className="admin-record-card"><div className="admin-record-head"><div><span className="admin-kicker">Listing claim</span><h3>{claim.business_name}</h3></div><StatusPill status={claim.status} /></div><p>{claim.contact_email}</p><p className="admin-record-description">{claim.message || 'No additional message.'}</p>{claim.status === 'pending' && <div className="admin-actions"><button type="button" className="admin-button admin-button-approve" disabled={busy} onClick={() => onReview(claim, 'approve')}>Approve claim</button><button type="button" className="admin-button admin-button-reject" disabled={busy} onClick={() => onReview(claim, 'reject')}>Reject claim</button></div>}</article>
}

function SectionHeading({ title, description, onRefresh }) {
  return <div className="admin-section-heading"><div><h2>{title}</h2>{description && <span>{description}</span>}</div>{onRefresh && <button className="admin-button" type="button" onClick={onRefresh}>Refresh</button>}</div>
}

function Overview({ data, onTab }) {
  const stats = data?.stats || {}
  const cards = [['Businesses', stats.businesses || 0, 'listings'], ['Featured', stats.featuredBusinesses || 0, 'listings'], ['Events', stats.events || 0, 'events'], ['Towns', stats.towns || 0, 'overview'], ['Newsletter', stats.newsletterSubscribers || 0, 'overview'], ['Pending approvals', stats.pendingApprovals || 0, 'submissions']]
  return <><div className="admin-hero-row"><div><span className="admin-kicker">Secure operations</span><h1>Master admin panel</h1><p>Manage the regional directory with role-based access, server validation and an auditable workflow.</p></div><span className="admin-security-badge">RLS protected</span></div><div className="admin-stat-grid admin-stat-grid-six">{cards.map(([label, value, tab]) => <button type="button" className="admin-stat" key={label} onClick={() => onTab(tab)}><strong>{value}</strong><span>{label}</span></button>)}</div><section className="admin-section"><SectionHeading title="Pending moderation" description="Review requests before they become public." onRefresh={() => onTab('submissions')} /><div className="admin-record-grid">{data?.submissions?.filter((item) => item.status === 'pending').slice(0, 4).map((item) => <SubmissionCard key={item.id} submission={item} onReview={() => onTab('submissions')} busy={false} readOnly />)}{!data?.submissions?.some((item) => item.status === 'pending') && <EmptyState>No pending business submissions.</EmptyState>}</div></section><section className="admin-section admin-info-grid"><article className="admin-info-card"><span className="admin-kicker">Security boundary</span><h3>Server and database enforced</h3><p>The browser only requests actions. The Vercel admin endpoint verifies the Supabase session and role, validates the payload, and Supabase RLS remains the final database boundary.</p></article><article className="admin-info-card"><span className="admin-kicker">Current operator</span><h3>{data?.actor?.role || 'Unknown role'}</h3><p>Administrative actions are attributed to the authenticated profile and written to the audit trail when the security migration is applied.</p></article></section></>
}

export function AdminPage() {
  const [stage, setStage] = useState('loading')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [viewData, setViewData] = useState({ audit: [], security: [], users: [] })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const permissions = data?.actor?.permissions || []
  const can = (permission) => permissions.includes(permission)

  const refresh = async () => { setError(''); try { setData(await loadAdminData()) } catch (loadError) { setError(loadError.message || 'Could not load admin data.') } }
  const loadTab = async (tab) => {
    setActiveTab(tab); setError('')
    try {
      if (tab === 'audit') { const audit = await loadAuditLogs(); setViewData((current) => ({ ...current, audit })) }
      if (tab === 'security') { const security = await loadSecurityEvents(); setViewData((current) => ({ ...current, security })) }
      if (tab === 'users') { const users = await loadAdminUsers(); setViewData((current) => ({ ...current, users })) }
    } catch (loadError) { setError(loadError.message || 'Could not load this admin view.') }
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
        const adminData = await loadAdminData()
        if (mounted) { setData(adminData); setStage('ready') }
      } catch (loadError) { if (mounted) { setError(loadError.message || 'Could not verify admin access.'); setStage('error') } }
    }
    boot()
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => { if (!session) window.location.href = '/login' }) || { data: { subscription: null } }
    return () => { mounted = false; listener?.subscription?.unsubscribe() }
  }, [])

  const pendingSubmissions = useMemo(() => data?.submissions?.filter((item) => item.status === 'pending') || [], [data])
  const pendingClaims = useMemo(() => data?.claims?.filter((item) => item.status === 'pending') || [], [data])
  const handleSubmissionReview = async (submission, decision) => { setBusyId(submission.id); setError(''); try { await reviewBusinessSubmission(submission, decision, user.id); await refresh() } catch (reviewError) { setError(reviewError.message || 'Review failed.') } finally { setBusyId('') } }
  const handleClaimReview = async (claim, decision) => { setBusyId(claim.id); setError(''); try { await reviewClaim(claim, decision, user.id); await refresh() } catch (reviewError) { setError(reviewError.message || 'Claim review failed.') } finally { setBusyId('') } }
  const handleFlags = async (listing, flags) => { setBusyId(listing.id); setError(''); try { await updateListingFlags(listing, flags, user.id); await refresh() } catch (updateError) { setError(updateError.message || 'Listing update failed.') } finally { setBusyId('') } }
  const handleEventStatus = async (event) => { setBusyId(event.id); setError(''); try { await updateEventStatus(event, event.status === 'published' ? 'draft' : 'published'); await refresh() } catch (updateError) { setError(updateError.message || 'Event update failed.') } finally { setBusyId('') } }
  const handleRole = async (entry, role) => { setBusyId(entry.id); setError(''); try { await updateAdminRole(entry.id, role); await loadTab('users') } catch (updateError) { setError(updateError.message || 'Role update failed.') } finally { setBusyId('') } }
  const logout = async () => { await signOut(); window.location.href = '/login' }

  if (stage === 'loading') return <AdminShell><main className="admin-main"><div className="admin-state">Checking admin access…</div></main></AdminShell>
  if (stage === 'unconfigured') return <AdminShell><main className="admin-main"><div className="admin-state"><h1>Supabase is not configured</h1><p>Add the Supabase public environment variables, then reload.</p></div></main></AdminShell>
  if (stage === 'signed-out') return <AdminShell><main className="admin-main"><div className="admin-state"><h1>Sign in required</h1><p>Use the admin login to open this workspace.</p><a className="detail-button" href="/login">Go to login</a></div></main></AdminShell>
  if (stage === 'unauthorized') return <AdminShell user={user} onSignOut={logout}><main className="admin-main"><div className="admin-state"><h1>Access not granted</h1><p>{profile?.email || user?.email} does not have an authorized admin role.</p><button className="detail-button" type="button" onClick={logout}>Sign out</button></div></main></AdminShell>
  if (stage === 'error') return <AdminShell user={user} onSignOut={logout}><main className="admin-main"><div className="admin-state"><h1>Admin workspace unavailable</h1><p>{error || 'The workspace could not be loaded.'}</p><button className="detail-button" type="button" onClick={() => window.location.reload()}>Try again</button></div></main></AdminShell>

  return <AdminShell user={user} onSignOut={logout} activeTab={activeTab} onTab={loadTab} permissions={permissions}><main className="admin-main"><div className="admin-content">{error && <div className="admin-alert admin-alert-error">{error}</div>}{activeTab === 'overview' && <Overview data={data} onTab={loadTab} />}{activeTab === 'submissions' && can('submissions.review') && <section className="admin-section admin-panel-section"><SectionHeading title="Business submissions" description={`${pendingSubmissions.length} pending request${pendingSubmissions.length === 1 ? '' : 's'}.`} onRefresh={refresh} /><div className="admin-record-grid">{data?.submissions?.length ? data.submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} onReview={handleSubmissionReview} busy={busyId === submission.id} />) : <EmptyState>No submissions yet.</EmptyState>}</div></section>}{activeTab === 'claims' && can('claims.review') && <section className="admin-section admin-panel-section"><SectionHeading title="Business claims" description={`${pendingClaims.length} pending claim${pendingClaims.length === 1 ? '' : 's'}.`} onRefresh={refresh} /><div className="admin-record-grid">{data?.claims?.length ? data.claims.map((claim) => <ClaimCard key={claim.id} claim={claim} onReview={handleClaimReview} busy={busyId === claim.id} />) : <EmptyState>No claims yet.</EmptyState>}</div></section>}{activeTab === 'listings' && can('businesses.read') && <section className="admin-section admin-panel-section"><SectionHeading title="Listings" description="Visibility changes are validated by the server and RLS." onRefresh={refresh} /><div className="admin-list-table">{data?.listings?.map((listing) => <article className="admin-list-row" key={listing.id}><div><strong>{listing.name}</strong><span>{listing.town} · {listing.category} · <StatusPill status={listing.status} /></span></div>{can('businesses.manage') && <div className="admin-row-actions"><button type="button" className="admin-button" disabled={busyId === listing.id} onClick={() => handleFlags(listing, { status: listing.status === 'published' ? 'draft' : 'published' })}>{listing.status === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" className="admin-button" disabled={busyId === listing.id} onClick={() => handleFlags(listing, { is_featured: !listing.is_featured })}>{listing.is_featured ? 'Remove featured' : 'Make featured'}</button></div>}</article>)}</div></section>}{activeTab === 'events' && can('events.manage') && <section className="admin-section admin-panel-section"><SectionHeading title="Events" description="Publish only verified event information." onRefresh={refresh} /><div className="admin-list-table">{data?.events?.map((event) => <article className="admin-list-row" key={event.id}><div><strong>{event.title}</strong><span>{event.venue} · {event.town} · <StatusPill status={event.status} /></span></div><div className="admin-row-actions"><button type="button" className="admin-button" disabled={busyId === event.id} onClick={() => handleEventStatus(event)}>{event.status === 'published' ? 'Unpublish' : 'Publish'}</button></div></article>)}</div></section>}{activeTab === 'users' && can('users.read') && <section className="admin-section admin-panel-section"><SectionHeading title="Users and roles" description="Role changes require the server-side admins.manage permission." onRefresh={() => loadTab('users')} /><div className="admin-list-table">{viewData.users.map((entry) => <article className="admin-list-row" key={entry.id}><div><strong>{entry.email}</strong><span>{entry.id}</span></div>{profile?.role === 'super_admin' ? <select className="admin-role-select" value={entry.role} disabled={busyId === entry.id || entry.id === user.id} onChange={(event) => handleRole(entry, event.target.value)}><option value="super_admin">Super admin</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="moderator">Moderator</option><option value="business_manager">Business manager</option><option value="viewer">Viewer</option><option value="business_owner">Business owner</option></select> : <StatusPill status={entry.role} />}</article>)}</div>{profile?.role !== 'super_admin' && <p className="admin-security-note">Only a super administrator can change administrator roles. Self-escalation is blocked.</p>}</section>}{activeTab === 'audit' && can('audit.read') && <section className="admin-section admin-panel-section"><SectionHeading title="Audit logs" description="Append-oriented record of administrative actions." onRefresh={() => loadTab('audit')} /><div className="admin-log-table">{viewData.audit.length ? viewData.audit.map((entry) => <article className="admin-log-row" key={entry.id}><div><strong>{entry.action}</strong><span>{entry.entity_type} · {entry.entity_id}</span></div><time>{new Date(entry.created_at).toLocaleString()}</time></article>) : <EmptyState>No audit records available. Apply the secure admin migration to enable the extended trail.</EmptyState>}</div></section>}{activeTab === 'security' && can('security.read') && <section className="admin-section admin-panel-section"><SectionHeading title="Security events" description="Authentication and administrative security signals." onRefresh={() => loadTab('security')} /><div className="admin-log-table">{viewData.security.length ? viewData.security.map((entry) => <article className="admin-log-row" key={entry.id}><div><strong>{entry.event_type}</strong><span>{entry.success ? 'Successful' : 'Failed'} · {entry.ip_address || 'IP unavailable'}</span></div><time>{new Date(entry.created_at).toLocaleString()}</time></article>) : <EmptyState>No security events available. Apply the secure admin migration to enable this feed.</EmptyState>}</div><p className="admin-security-note">Active Supabase Auth sessions and MFA status are not inferred from frontend state. They require provider-level session/MFA configuration before being shown as production facts.</p></section>}</div></main></AdminShell>
}

createRoot(document.getElementById('root')).render(window.location.pathname === '/login' ? <AuthPage /> : <AdminPage />)
