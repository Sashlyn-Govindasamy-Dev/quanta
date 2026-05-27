import { useState, useCallback, useEffect } from 'react'
import { exportData, getSetting, setSetting } from '../db.js'
import { showToast } from '../components/Toast.jsx'

const SETTING_KEY = 'autoBackupFolderName'
const LAST_BACKUP_KEY = 'lastAutoBackup'

// File System Access API — lets us write to a user-chosen folder silently after first pick
export function useAutoBackup() {
  const [folderName, setFolderName] = useState(null)
  const [dirHandle, setDirHandle] = useState(null)
  const [lastBackup, setLastBackup] = useState(null)
  const [supported] = useState(() => 'showDirectoryPicker' in window)

  // Load saved folder name and last backup time from IndexedDB on mount
  useEffect(() => {
    async function load() {
      const name = await getSetting(SETTING_KEY)
      const last = await getSetting(LAST_BACKUP_KEY)
      if (name) setFolderName(name)
      if (last) setLastBackup(new Date(last))
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
      showToast(`Backup folder set: ${handle.name}`, 'success')
      return true
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Could not access folder', 'error')
      return false
    }
  }, [supported])

  // Write a backup file to the chosen folder
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

  // Auto-backup on app open — runs once when notes are loaded
  // Only backs up if more than 1 hour has passed since last backup
  const runAutoBackup = useCallback(async (notesCount) => {
    if (!dirHandle || !notesCount) return

    const last = await getSetting(LAST_BACKUP_KEY)
    if (last) {
      const hoursSince = (Date.now() - new Date(last).getTime()) / 3600000
      if (hoursSince < 1) return // Already backed up recently
    }

    try {
      const filename = await writeBackup(dirHandle)
      showToast(`Auto-backup saved to ${dirHandle.name}`, 'success')
    } catch (e) {
      // Permission may have lapsed — silently skip, don't annoy the user
      console.warn('Auto-backup skipped:', e.message)
    }
  }, [dirHandle, writeBackup])

  // Manual backup to chosen folder
  const manualBackup = useCallback(async () => {
    let handle = dirHandle
    if (!handle) {
      const picked = await pickFolder()
      if (!picked) return
      // After picking, dirHandle is set via state — re-read from window
      // We trigger a manual download fallback for this first time
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
      const filename = await writeBackup(handle)
      showToast(`Saved: ${filename}`)
    } catch (e) {
      showToast('Backup failed — try re-selecting the folder', 'error')
    }
  }, [dirHandle, pickFolder, writeBackup])

  return {
    supported,
    folderName,
    lastBackup,
    pickFolder,
    manualBackup,
    runAutoBackup,
    dirHandle
  }
}
