/**
 * useSkills — React hook for managing skills via GraphQL.
 *
 * Provides queries for installed and registry skills,
 * and mutations for install/uninstall/update/activate/toggle.
 */

import { useState, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  GET_INSTALLED_SKILLS,
  GET_REGISTRY_SKILLS,
  INSTALL_SKILL,
  UNINSTALL_SKILL,
  UPDATE_SKILL,
  ACTIVATE_SKILL,
  TOGGLE_SKILL_ENABLED,
  TOGGLE_SKILL_PINNED,
  SYNC_REGISTRIES,
  SYNC_LOCAL_SKILLS,
} from '@vienna/graphql/client';
import { emitClaudeSettingsChanged } from '../../renderer/hooks/claude-settings-signal';

export function useSkills() {
  const {
    data: installedData,
    loading: installedLoading,
    refetch: refetchInstalled,
  } = useQuery(GET_INSTALLED_SKILLS);

  const {
    data: registryData,
    loading: registryLoading,
    refetch: refetchRegistry,
  } = useQuery(GET_REGISTRY_SKILLS);

  const [installMutation] = useMutation(INSTALL_SKILL, {
    refetchQueries: [{ query: GET_INSTALLED_SKILLS }],
  });

  const [uninstallMutation] = useMutation(UNINSTALL_SKILL, {
    refetchQueries: [{ query: GET_INSTALLED_SKILLS }],
  });

  const [updateMutation] = useMutation(UPDATE_SKILL, {
    refetchQueries: [{ query: GET_INSTALLED_SKILLS }],
  });

  const [activateMutation] = useMutation(ACTIVATE_SKILL);

  const [toggleEnabledMutation] = useMutation(TOGGLE_SKILL_ENABLED, {
    refetchQueries: [{ query: GET_INSTALLED_SKILLS }],
  });

  const [togglePinnedMutation] = useMutation(TOGGLE_SKILL_PINNED, {
    refetchQueries: [{ query: GET_INSTALLED_SKILLS }],
  });

  const [syncRegistriesMutation, { loading: syncingRegistries }] = useMutation(SYNC_REGISTRIES);

  const [syncLocalSkillsMutation] = useMutation(SYNC_LOCAL_SKILLS, {
    refetchQueries: [{ query: GET_INSTALLED_SKILLS }],
  });

  // Per-skill loading state (tracks which skill ID is being mutated)
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const installedSkills = installedData?.installedSkills ?? [];
  const registrySkills = registryData?.registrySkills ?? [];

  const install = useCallback(async (skillId: string, destination?: string) => {
    setInstallingId(skillId);
    try {
      const result = await installMutation({ variables: { skillId, destination } });
      emitClaudeSettingsChanged();
      return result.data?.installSkill?.skill ?? null;
    } finally {
      setInstallingId(null);
    }
  }, [installMutation]);

  const uninstall = useCallback(async (skillId: string) => {
    setUninstallingId(skillId);
    try {
      const result = await uninstallMutation({ variables: { skillId } });
      emitClaudeSettingsChanged();
      return result.data?.uninstallSkill?.success ?? false;
    } finally {
      setUninstallingId(null);
    }
  }, [uninstallMutation]);

  const update = useCallback(async (skillId: string) => {
    setUpdatingId(skillId);
    try {
      const result = await updateMutation({ variables: { skillId } });
      return result.data?.updateSkill?.skill ?? null;
    } finally {
      setUpdatingId(null);
    }
  }, [updateMutation]);

  const activate = useCallback(async (skillId: string) => {
    const result = await activateMutation({ variables: { skillId } });
    return result.data?.activateSkill?.body ?? null;
  }, [activateMutation]);

  const toggleEnabled = useCallback(async (skillId: string, enabled: boolean) => {
    await toggleEnabledMutation({ variables: { skillId, enabled } });
  }, [toggleEnabledMutation]);

  const togglePinned = useCallback(async (skillId: string, pinned: boolean) => {
    await togglePinnedMutation({ variables: { skillId, pinned } });
  }, [togglePinnedMutation]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchInstalled(), refetchRegistry()]);
  }, [refetchInstalled, refetchRegistry]);

  const syncRegistries = useCallback(async () => {
    await syncRegistriesMutation();
    await refetch();
  }, [syncRegistriesMutation, refetch]);

  const syncLocalSkills = useCallback(async () => {
    await syncLocalSkillsMutation();
  }, [syncLocalSkillsMutation]);

  return {
    installedSkills,
    registrySkills,
    loading: installedLoading || registryLoading,
    installingId,
    uninstallingId,
    updatingId,
    syncingRegistries,
    install,
    uninstall,
    update,
    activate,
    toggleEnabled,
    togglePinned,
    refetch,
    syncRegistries,
    syncLocalSkills,
  };
}
