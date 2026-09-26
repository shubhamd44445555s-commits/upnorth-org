import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { loadAdminData, reviewBusinessSubmission, reviewClaim, updateListingFlags } from './lib/admin-data'
import { getProfile, isAdminProfile, signInWithPassword, signOut } from './lib/auth'
import { supabase } from './lib/supabase'
import './styles.admin.css'

function AdminLogo({ light = false }) {
  return <a className={`logo ${light ? 'logo-light' : ''}`} href="/"><span className="logo-mark" aria-hidden="true"><i></i><i></i><i></i></span><span className="logo-copy"><strong>Upnorth.org</strong><small>EXPLORE · STAY · DO · BELONG</small></span></a>
}

function AdminShell({ children, user, onSignOut }) {
  return <div className="site-shell p3-shell admin-shell"><header className="site-header"><div className="header-inner"><AdminLogo /><nav className="admin-nav"><a href="/">View site</a>{user && <span>{user.email}</span>}</nav>{user && <button className="plan-button" type="button" onClick={onSignOut}>Sign out</button>}</div></header>{children}<footer className="site-footer"><div className="footer-inner"><AdminLogo light /><div className="footer-links"><a href="/">Back to UpNorth.org</a><a href="/contact">Contact</a></div><div className="footer-script">The North<br />Woods Call</div></div></footer></div>
}

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithPassword(email, password)
      window.location.href = '/admin'
    } catch (authError) {
      setError(authError.message || 'Unable to sign in. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }
  return <AdminShell><main className="admin-main"><section className="admin-auth-card"><span className="admin-kicker">Private workspace</span><h1>Admin sign in</h1><p>Manage published listings, business submissions, claims, and events from one place.</p>{!supabase && <div className="admin-alert">Supabase is not configured in this environment.</div>}<form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>{error && <p className="admin-error">{error}</p>}<button className="detail-button" type="submit" disabled={loading || !supabase}>{loading ? 'Signing in…' : 'Sign in'}</button></form><small>Admin users are provisioned in Supabase Auth and granted a role in the profiles table.</small></section></main></AdminShell>
}

function StatusPill({ status }) {
  return <span className={`admin-status admin-status-${status}`}>{status}</span>
}

function SubmissionCard({ submission, onReview, busy }) {
  return <article className="admin-record-card"><div className="admin-record-head"><div><span className="admin-kicker">{submission.submission_type === 'claim' ? 'Claim request' : 'New listing'}</span><h3>{submission.business_name}</h3></div><StatusPill status={submission.status} /></div><p>{submission.category} · {submission.subtype} · {submission.town}</p><p className="admin-record-description">{submission.description}</p><div className="admin-record-meta">{submission.contact_email || 'No contact email'}{submission.phone ? ` · ${submission.phone}` : ''}</div>{submission.status === 'pending' && <div className="admin-actions"><button type="button" className="admin-button admin-button-approve" disabled={busy} onClick={() => onReview(submission, 'approve')}>Approve</button><button type="button" className="admin-button admin-button-reject" disabled={busy} onClick={() => onReview(submission, 'reject')}>Reject</button></div>}</article>
}

function ClaimCard({ claim, onReview, busy }) {
  return <article className="admin-record-card"><div className="admin-record-head"><div><span className="admin-kicker">Listing claim</span><h3>{claim.business_name}</h3></div><StatusPill status={claim.status} /></div><p>{claim.contact_email}</p><p className="admin-record-description">{claim.message || 'No additional message.'}</p>{claim.status === 'pending' && <div className="admin-actions"><button type="button" className="admin-button admin-button-approve" disabled={busy} onClick={() => onReview(claim, 'approve')}>Approve claim</button><button type="button" className="admin-button admin-button-reject" disabled={busy} onClick={() => onReview(claim, 'reject')}>Reject claim</button></div>}</article>
}

export function AdminPage() {
  const [stage, setStage] = useState('loading')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('submissions')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const refresh = async () => {
    setError('')
    try { setData(await loadAdminData()) } catch (loadError) { setError(loadError.message || 'Could not load admin data.') }
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
        setUser(sessionData.session.user)
        setProfile(currentProfile)
        if (!isAdminProfile(currentProfile)) { setStage('unauthorized'); return }
        await refresh()
        if (mounted) setStage('ready')
      } catch (loadError) { if (mounted) { setError(loadError.message || 'Could not verify admin access.'); setStage('error') } }
    }
    boot()
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => { if (!session) window.location.href = '/login' }) || { data: { subscription: null } }
    return () => { mounted = false; listener?.subscription?.unsubscribe() }
  }, [])

  const pendingSubmissions = useMemo(() => data?.submissions.filter((item) => item.status === 'pending') || [], [data])
  const pendingClaims = useMemo(() => data?.claims.filter((item) => item.status === 'pending') || [], [data])
  const handleSubmissionReview = async (submission, decision) => {
    setBusyId(submission.id); setError('')
    try { await reviewBusinessSubmission(submission, decision, user.id); await refresh() } catch (reviewError) { setError(reviewError.message || 'Review failed.') } finally { setBusyId('') }
  }
  const handleClaimReview = async (claim, decision) => {
    setBusyId(claim.id); setError('')
    try { await reviewClaim(claim, decision, user.id); await refresh() } catch (reviewError) { setError(reviewError.message || 'Claim review failed.') } finally { setBusyId('') }
  }
  const handleFlags = async (listing, flags) => {
    setBusyId(listing.id); setError('')
    try { await updateListingFlags(listing, flags, user.id); await refresh() } catch (updateError) { setError(updateError.message || 'Listing update failed.') } finally { setBusyId('') }
  }
  const logout = async () => { await signOut(); window.location.href = '/login' }

  if (stage === 'loading') return <AdminShell><main className="admin-main"><div className="admin-state">Checking admin access…</div></main></AdminShell>
  if (stage === 'unconfigured') return <AdminShell><main className="admin-main"><div className="admin-state"><h1>Supabase is not configured</h1><p>Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables, then reload.</p></div></main></AdminShell>
  if (stage === 'signed-out') return <AdminShell><main className="admin-main"><div className="admin-state"><h1>Sign in required</h1><p>Use the admin login to open this workspace.</p><a className="detail-button" href="/login">Go to login</a></div></main></AdminShell>
  if (stage === 'unauthorized') return <AdminShell user={user} onSignOut={logout}><main className="admin-main"><div className="admin-state"><h1>Access not granted</h1><p>{profile?.email || user?.email} does not have an admin or editor role in profiles.</p><button className="detail-button" type="button" onClick={logout}>Sign out</button></div></main></AdminShell>
  if (stage === 'error') return <AdminShell user={user} onSignOut={logout}><main className="admin-main"><div className="admin-state"><h1>Admin workspace unavailable</h1><p>{error}</p><button className="detail-button" type="button" onClick={() => window.location.reload()}>Try again</button></div></main></AdminShell>

  return <AdminShell user={user} onSignOut={logout}><main className="admin-main"><div className="admin-content"><div className="admin-title-row"><div><span className="admin-kicker">UpNorth.org operations</span><h1>Admin dashboard</h1><p>Review local businesses, claims, listings, and events.</p></div><button className="admin-button" type="button" onClick={refresh}>Refresh</button></div>{error && <div className="admin-alert admin-alert-error">{error}</div>}<div className="admin-stat-grid"><button type="button" className={`admin-stat ${tab === 'submissions' ? 'is-active' : ''}`} onClick={() => setTab('submissions')}><strong>{pendingSubmissions.length}</strong><span>Pending submissions</span></button><button type="button" className={`admin-stat ${tab === 'claims' ? 'is-active' : ''}`} onClick={() => setTab('claims')}><strong>{pendingClaims.length}</strong><span>Pending claims</span></button><button type="button" className={`admin-stat ${tab === 'listings' ? 'is-active' : ''}`} onClick={() => setTab('listings')}><strong>{data?.listings.length || 0}</strong><span>Total listings</span></button><button type="button" className={`admin-stat ${tab === 'events' ? 'is-active' : ''}`} onClick={() => setTab('events')}><strong>{data?.events.length || 0}</strong><span>Events</span></button></div>{tab === 'submissions' && <section className="admin-section"><div className="admin-section-heading"><h2>Business submissions</h2><span>Approve creates a published listing.</span></div><div className="admin-record-grid">{data?.submissions.length ? data.submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} onReview={handleSubmissionReview} busy={busyId === submission.id} />) : <div className="admin-empty">No submissions yet.</div>}</div></section>}{tab === 'claims' && <section className="admin-section"><div className="admin-section-heading"><h2>Business claims</h2><span>Claims are matched to an existing listing.</span></div><div className="admin-record-grid">{data?.claims.length || data?.submissions.some((item) => item.submission_type === 'claim') ? <>{data.claims.map((claim) => <ClaimCard key={claim.id} claim={claim} onReview={handleClaimReview} busy={busyId === claim.id} />)}{data.submissions.filter((item) => item.submission_type === 'claim').map((submission) => <SubmissionCard key={submission.id} submission={submission} onReview={handleSubmissionReview} busy={busyId === submission.id} />)}</> : <div className="admin-empty">No claims yet.</div>}</div></section>}{tab === 'listings' && <section className="admin-section"><div className="admin-section-heading"><h2>Listings</h2><span>Moderate visibility and promotion flags.</span></div><div className="admin-list-table">{data?.listings.map((listing) => <article className="admin-list-row" key={listing.id}><div><strong>{listing.name}</strong><span>{listing.town} · {listing.category} · <StatusPill status={listing.status} /></span></div><div className="admin-row-actions"><button type="button" className="admin-button" disabled={busyId === listing.id} onClick={() => handleFlags(listing, { status: listing.status === 'published' ? 'draft' : 'published' })}>{listing.status === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" className="admin-button" disabled={busyId === listing.id} onClick={() => handleFlags(listing, { is_featured: !listing.is_featured, is_enhanced: listing.is_enhanced })}>{listing.is_featured ? 'Remove featured' : 'Make featured'}</button></div></article>)}</div></section>}{tab === 'events' && <section className="admin-section"><div className="admin-section-heading"><h2>Events</h2><span>Published events are visible on the public calendar.</span></div><div className="admin-list-table">{data?.events.map((event) => <article className="admin-list-row" key={event.id}><div><strong>{event.title}</strong><span>{event.venue} · {event.town} · <StatusPill status={event.status} /></span></div><div className="admin-row-actions"><button type="button" className="admin-button" disabled={busyId === event.id} onClick={async () => { setBusyId(event.id); try { const { error: updateError } = await supabase.from('events').update({ status: event.status === 'published' ? 'draft' : 'published' }).eq('id', event.id); if (updateError) throw updateError; await refresh() } catch (eventError) { setError(eventError.message) } finally { setBusyId('') } }}>{event.status === 'published' ? 'Unpublish' : 'Publish'}</button></div></article>)}</div></section>}</div></main></AdminShell>
}

createRoot(document.getElementById('root')).render(window.location.pathname === '/login' ? <AuthPage /> : <AdminPage />)
