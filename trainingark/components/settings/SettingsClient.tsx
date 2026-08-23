'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession, signOut } from 'next-auth/react'
import { MAX_ARKITEKT_BIO_LENGTH } from '@/lib/arkitektProfile'
import styles from './SettingsClient.module.css'

const MIN_PASSWORD_LENGTH = 8

interface SettingsClientProps {
  email: string
  name: string
  bio: string
}

export function SettingsClient({ email, name, bio }: SettingsClientProps) {
  const { update } = useSession()

  const [displayName, setDisplayName] = useState(name)
  const [profileBio, setProfileBio] = useState(bio)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [showDelete, setShowDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const passwordsMatch = newPassword === confirmPassword
  const passwordLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH
  const canSubmitPassword =
    !passwordBusy && currentPassword.length > 0 && passwordLongEnough && passwordsMatch

  // The delete button stays inert until the typed text is the account's exact
  // email — a deliberate speed bump, not a formality.
  const confirmMatches = confirmText.trim() === email

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (nameBusy) return
    setNameBusy(true)
    setNameError(null)
    setNameSaved(false)

    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName, bio: profileBio }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNameError(body.error ?? 'Could not update your display name.')
        return
      }

      // Sessions are JWTs — without this the sidebar and avatar keep showing the
      // old name until the next sign-in.
      await update({ name: body.name })
      setDisplayName(body.name)
      setProfileBio(body.bio ?? '')
      setNameSaved(true)
    } catch (err) {
      console.error('Display name update failed:', err)
      setNameError('Something went wrong. Try again.')
    } finally {
      setNameBusy(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitPassword) return
    setPasswordBusy(true)
    setPasswordError(null)
    setPasswordSaved(false)

    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPasswordError(body.error ?? 'Could not change your password.')
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
    } catch (err) {
      console.error('Password change failed:', err)
      setPasswordError('Something went wrong. Try again.')
    } finally {
      setPasswordBusy(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirmMatches || deleteBusy) return
    setDeleteBusy(true)
    setDeleteError(null)

    try {
      const res = await fetch('/api/user', { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // The account is gone; the JWT in the cookie is not, so sign out
      // explicitly rather than leaving a session pointing at a deleted user.
      await signOut({ callbackUrl: '/' })
    } catch (err) {
      console.error('Account deletion failed:', err)
      setDeleteError('Could not delete your account. Try again.')
      setDeleteBusy(false)
    }
  }

  function closeDeleteModal() {
    if (deleteBusy) return
    setShowDelete(false)
    setConfirmText('')
    setDeleteError(null)
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.heading}>Profile</h2>
        <p className={styles.hint}>
          Your display name and bio appear on your public Arkitekt profile. Your email is how you
          sign in and is never shown publicly.
        </p>

        <form className={styles.form} onSubmit={handleNameSubmit}>
          <div>
            <label className={styles.fieldLabel} htmlFor="settings-email">Email</label>
            <input id="settings-email" className={styles.input} value={email} disabled readOnly />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              className={styles.input}
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setNameSaved(false) }}
              placeholder="Arkitekt"
              maxLength={40}
              required
            />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="settings-bio">Bio</label>
            <textarea
              id="settings-bio"
              className={styles.textarea}
              value={profileBio}
              onChange={e => { setProfileBio(e.target.value); setNameSaved(false) }}
              placeholder="What kinds of cEDH scenarios do you build?"
              maxLength={MAX_ARKITEKT_BIO_LENGTH}
              rows={4}
            />
            <span className={styles.characterCount}>
              {profileBio.length}/{MAX_ARKITEKT_BIO_LENGTH}
            </span>
          </div>

          {nameError && <p className={styles.error}>{nameError}</p>}
          {nameSaved && <p className={styles.success}>Profile updated.</p>}

          <button className={styles.submitBtn} type="submit" disabled={nameBusy}>
            {nameBusy ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Password</h2>
        <p className={styles.hint}>
          Changing your password does not sign you out of this device, but you will need the new
          one the next time you sign in.
        </p>

        <form className={styles.form} onSubmit={handlePasswordSubmit}>
          <div>
            <label className={styles.fieldLabel} htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setPasswordSaved(false) }}
              required
            />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="new-password">New password</label>
            <input
              id="new-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordSaved(false) }}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordSaved(false) }}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>

          {newPassword.length > 0 && !passwordLongEnough && (
            <p className={styles.error}>New password must be at least {MIN_PASSWORD_LENGTH} characters.</p>
          )}
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className={styles.error}>New password and confirmation do not match.</p>
          )}
          {passwordError && <p className={styles.error}>{passwordError}</p>}
          {passwordSaved && <p className={styles.success}>Password changed.</p>}

          <button className={styles.submitBtn} type="submit" disabled={!canSubmitPassword}>
            {passwordBusy ? 'Changing...' : 'Change password'}
          </button>
        </form>
      </section>

      <section className={styles.danger}>
        <h2 className={styles.dangerHeading}>Danger zone</h2>
        <p className={styles.hint}>
          Deleting your account permanently removes it along with every scenario you have
          authored, published or not. This cannot be undone.
        </p>
        <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
          Delete account
        </button>
      </section>

      {showDelete && createPortal(
        <div className={styles.backdrop} onClick={closeDeleteModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Delete account</span>
              <button className={styles.modalClose} onClick={closeDeleteModal}>×</button>
            </div>

            <p className={styles.modalText}>This will permanently delete:</p>
            <ul className={styles.modalList}>
              <li>your account and sign-in credentials</li>
              <li>every scenario you have authored, including published ones</li>
              <li>all play history recorded against those scenarios</li>
            </ul>

            <p className={styles.modalText}>
              Type <span className={styles.confirmTarget}>{email}</span> to confirm.
            </p>

            <input
              className={styles.input}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={email}
              autoComplete="off"
              autoFocus
            />

            {deleteError && <p className={styles.error}>{deleteError}</p>}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeDeleteModal} disabled={deleteBusy}>
                Cancel
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={() => { void handleDeleteAccount() }}
                disabled={!confirmMatches || deleteBusy}
                title={confirmMatches ? 'Delete this account permanently' : 'Type your email to enable'}
              >
                {deleteBusy ? 'Deleting...' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
