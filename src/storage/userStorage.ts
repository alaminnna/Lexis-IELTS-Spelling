import type { UserProfile } from "@/types/progress"
import { useAppStore } from "@/store/useAppStore"

export function getUserProfile(): UserProfile | null {
  return useAppStore.getState().envelope?.userProfile ?? null
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const store = useAppStore.getState()
  const env = store.envelope
  if (!env) return
  env.userProfile = { ...profile, updatedAt: new Date().toISOString() }
  useAppStore.setState({ envelope: { ...env } })
  await store.persist()
}

export async function updateUserProfile(patch: Partial<Pick<UserProfile, "name">>): Promise<void> {
  const store = useAppStore.getState()
  const env = store.envelope
  if (!env) return
  const name = patch.name?.trim()
  if (name !== undefined) {
    if (!name) throw new Error("Name is required")
    if (name.length > 60) throw new Error("Name must be 60 characters or less")
    env.userProfile.name = name
    env.userProfile.updatedAt = new Date().toISOString()
  }
  useAppStore.setState({ envelope: { ...env } })
  await store.persist()
}

export async function clearUserProfile(): Promise<void> {
  const store = useAppStore.getState()
  const env = store.envelope
  if (!env) return
  env.userProfile = { id: "local-user", name: "", onboardingCompleted: false, createdAt: new Date().toISOString(), updatedAt: null }
  useAppStore.setState({ envelope: { ...env } })
  await store.persist()
}
