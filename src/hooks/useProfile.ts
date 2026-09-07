import { useAppStore } from "@/store/useAppStore"

export function useProfile() {
  const profile = useAppStore(s => s.envelope?.userProfile ?? null)
  const onboardingCompleted = profile?.onboardingCompleted ?? false
  const name = profile?.name ?? ""
  const updateName = useAppStore(s => s.updateUserProfile)
  const completeOnboarding = useAppStore(s => s.completeOnboarding)
  return { profile, name, onboardingCompleted, updateName, completeOnboarding }
}
