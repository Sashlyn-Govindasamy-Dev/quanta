import { useState, useCallback, useEffect, useRef } from 'react'
import { exportData, getSetting, setSetting } from '../db.js'
import { showToast } from '../components/Toast.jsx'

const SETTING_KEY = 'autoBackupFolderName'
const HANDLE_KEY = 'autoBackupDirHandle'
const LAST_BACKUP_KEY = 'lastAutoBackup'
const AUTOSAVE_FILENAME = 'quanta-autosave.json'

// File System Access API — lets us write to a user-chosen folder silently after first pick
export function useAutoBackup() {
  const [folderName, setFolderName] = useState(null)
  const [dirHandle, setDirHandle] = useState(null)
  const [lastBackup, setLastBackup] = useState(null)
  const [supported] = useState(() => 'showDirectoryPicker' in window)
  const permissionWarnedRef = useRef(false)

  // Load saved folder handle + metadata from IndexedDB on mount.
  // Directory handles are structured-cloneable, so they survive app restarts —
  // this means auto-backup keeps working across sessions without re-picking.
  useEffect(() => {
    async function load() {
      const name = await getSetting(SETTING_KEY)
      const last = await getSetting(LAST_BACKUP_KEY)
      if (name) setFolderName(name)
      if (last) setLastBackup(new Date(last))

      const savedHandle = await getSetting(HANDLE_KEY)
      if (savedHandle) {
        try {
          const perm = await savedHandle.queryPermission({ mode: 'readwrite' })
          // 'granted' → ready to go. 'prompt' → we still keep the handle;
          // the first user-initiated action will re-request permission.
          if (perm === 'granted' || perm === 'prompt') setDirHandle(savedHandle)
        } catch {
          // Handle became invalid (folder moved/deleted) — user can re-pick
        }
      }
    }
    load()
  }, [])

  // Pick a folder — called once by the user from Settings
  const pickFolder = useCallback(async () => {
    if (!supported) return false
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      setDirHandle(handle)
      setFolderName(handle.name)
      await setSetting(SETTING_KEY, handle.name)
      await setSetting(HANDLE_KEY, handle)
      permissionWarnedRef.current = false
      showToast(`Backup folder set: ${handle.name}`, 'success')
      return true
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Could not access folder', 'error')
      return false
    }
  }, [supported])

  // Ensure we have readwrite permission on the handle (may prompt the user once)
  const ensurePermission = useCallback(async (handle) => {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') return true
    const req = await handle.requestPermission({ mode: 'readwrite' })
    return req === 'granted'
  }, [])

  // Write a timestamped backup file to the chosen folder
  const writeBackup = useCallback(async (handle) => {
    const json = await exportData()
    const date = new Date().toISOString().slice(0, 10)
    const time = new Date().toTimeString().slice(0, 5).replace(':', '-')
    const filename = `quanta-backup-${date}-${time}.json`
    const fileHandle = await handle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(json)
    await writable.close()
    const now = new Date()
    setLastBackup(now)
    await setSetting(LAST_BACKUP_KEY, now.toISOString())
    return filename
  }, [])

  // Write/overwrite the single rolling autosave file — used on every note change.
  // One fixed filename means no file spam, always contains the latest state.
  const writeRollingBackup = useCallback(async (handle) => {
    const json = await exportData()
    const fileHandle = await handle.getFileHandle(AUTOSAVE_FILENAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(json)
    await writable.close()
    const now = new Date()
    setLastBackup(now)
    await setSetting(LAST_BACKUP_KEY, now.toISOString())
  }, [])

  // Called (debounced) after any note add/edit/review/capture/connection change
  const backupOnChange = useCallback(async () => {
    if (!dirHandle) return
    try {
      await writeRollingBackup(dirHandle)
      // Silent on success — no toast spam while you're working
    } catch (e) {
      if (!permissionWarnedRef.current) {
        permissionWarnedRef.current = true
        showToast('Auto-backup paused — click "Backup now" in Progress to re-enable', 'error')
      }
      console.warn('Backup-on-save skipped:', e.message)
    }
  }, [dirHandle, writeRollingBackup])

  // Auto-backup on app open — keeps the hourly timestamped snapshot behaviour
  const runAutoBackup = useCallback(async (notesCount) => {
    if (!dirHandle || !notesCount) return

    const last = await getSetting(LAST_BACKUP_KEY)
    if (last) {
      const hoursSince = (Date.now() - new Date(last).getTime()) / 3600000
      if (hoursSince < 1) return // Already backed up recently
    }

    try {
      await writeBackup(dirHandle)
      showToast(`Auto-backup saved to ${dirHandle.name}`, 'success')
    } catch (e) {
      // Permission may have lapsed — silently skip, don't annoy the user
      console.warn('Auto-backup skipped:', e.message)
    }
  }, [dirHandle, writeBackup])

  // Manual backup to chosen folder — also re-establishes permission if it lapsed
  const manualBackup = useCallback(async () => {
    let handle = dirHandle
    if (!handle) {
      const picked = await pickFolder()
      if (!picked) return
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quanta-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Backup saved — folder is now set for future auto-backups!')
      return
    }
    try {
      const ok = await ensurePermission(handle)
      if (!ok) { showToast('Permission denied — try re-selecting the folder', 'error'); return }
      permissionWarnedRef.current = false
      const filename = await writeBackup(handle)
      showToast(`Saved: ${filename}`)
    } catch (e) {
      showToast('Backup failed — try re-selecting the folder', 'error')
    }
  }, [dirHandle, pickFolder, writeBackup, ensurePermission])

  return {
    supported,
    folderName,
    lastBackup,
    pickFolder,
    manualBackup,
    runAutoBackup,
    backupOnChange,
    dirHandle
  }
}
